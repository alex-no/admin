import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BaseModal from '@/components/BaseModal'
import { notify } from '@/hooks/useNotify'
import { authHeaders } from '@/utils/api'
import { parseCsv, autoMapImportColumns, buildImportRows, rowsToCsv, downloadCsv } from '@core'
import type { ColumnConfig } from '../types'

interface ImportFailure {
  row: number
  errors: Record<string, string>
}

interface ImportResult {
  created: number
  failed: (ImportFailure & { csvLine: number })[]
}

interface CsvImportModalProps {
  visible: boolean
  onClose: () => void
  apiImport: string
  /** Той самий набір полів, що й у формі "Додати" (createColumns у DataTable.tsx) */
  columns: ColumnConfig[]
  onImported: (result: ImportResult) => void
}

type Step = 'upload' | 'map' | 'preview' | 'result'

/**
 * Майстер CSV-імпорту: upload → map → preview → result. Дзеркало Vue-версії
 * frontend/src/components/CsvImportModal.vue — парсинг/зіставлення/приведення
 * типів спільні (@core/csv), бекенд той самий ендпоінт.
 */
export default function CsvImportModal({ visible, onClose, apiImport, columns, onImported }: CsvImportModalProps) {
  const { t } = useTranslation()

  const translateLabel = (label?: string): string => {
    if (!label) return ''
    if (label.includes('.')) {
      const translated = t(label)
      return translated !== label ? translated : label
    }
    return label
  }

  const [step, setStep] = useState<Step>('upload')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, string | null>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult>({ created: 0, failed: [] })

  const reset = () => {
    setStep('upload')
    setParseError(null)
    setParsedHeaders([])
    setParsedRows([])
    setMapping({})
    setResult({ created: 0, failed: [] })
  }

  // Закрити хрестиком/бекдропом/Escape теж має скинути майстер — інакше наступне
  // відкриття покаже попередній файл чи результат. Дзеркало Vue: watch(visible).
  const handleClose = () => {
    onClose()
    reset()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // дозволяє обрати той самий файл повторно
    if (!file) return

    setParseError(null)
    try {
      const text = await file.text()
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0 || rows.length === 0) {
        setParseError(t('import.emptyFile'))
        return
      }
      setParsedHeaders(headers)
      setParsedRows(rows)
      setMapping(autoMapImportColumns(headers, columns, (col) => translateLabel(col.label)))
      setStep('map')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('import.parseError'))
    }
  }

  const hasMapping = Object.values(mapping).some((v) => v !== null)

  const mappedColumns = (() => {
    const usedKeys = new Set(Object.values(mapping).filter(Boolean) as string[])
    return columns.filter((c) => usedKeys.has(c.key))
  })()

  const previewRows = buildImportRows(parsedRows, mapping, columns)

  const formatPreviewValue = (v: any): string => {
    if (v === null || v === undefined || v === '') return '—'
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'boolean') return v ? t('common.yes') : t('common.no')
    return String(v)
  }

  // Індекс у previewRows — індекс у масиві rows, що йде в тілі запиту. Бекенд
  // повертає той самий індекс (0-based); у файлі це на 2 більше: рядок 1 —
  // заголовок, рядок 2 — перший рядок даних (індекс 0).
  const csvLineFor = (rowIndex: number) => rowIndex + 2

  const formatRowErrors = (errors: Record<string, string>) => Object.values(errors ?? {}).join('; ')

  const submitImport = async () => {
    setImporting(true)
    try {
      const res = await fetch(apiImport, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ rows: previewRows }),
      })
      const json: any = await res.json().catch(() => ({}))
      if (!res.ok || json?.status === 'error') {
        throw new Error(json?.message ?? `${t('import.importError')} (HTTP ${res.status})`)
      }

      const next: ImportResult = {
        created: json.created ?? 0,
        failed: (json.failed ?? []).map((f: ImportFailure) => ({ ...f, csvLine: csvLineFor(f.row) })),
      }
      setResult(next)
      setStep('result')

      if (next.created > 0) {
        notify(t('import.resultSummary', { created: next.created, total: next.created + next.failed.length }), { type: 'success' })
        onImported(next)
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : t('import.importError'), { type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const downloadFailedRows = () => {
    const headers = [...mappedColumns.map((c) => translateLabel(c.label)), t('import.error')]
    const csvRows = result.failed.map((f) => {
      const row = previewRows[f.row] ?? {}
      return [...mappedColumns.map((c) => row[c.key]), formatRowErrors(f.errors)]
    })
    downloadCsv(`import-errors-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(headers, csvRows))
  }

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      storageKey="csv-import-modal"
      defaultWidth={820}
      minWidth={600}
      maxWidth={1200}
      defaultHeight={560}
      minHeight={360}
      maxHeight={800}
      closeOnBackdrop={false}
      title={<h5 className="mb-0">{t('import.title')}</h5>}
      footer={
        <>
          {(step === 'map' || step === 'preview') && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary me-auto"
              onClick={() => setStep(step === 'map' ? 'upload' : 'map')}
            >
              {t('import.back')}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleClose}>
            {step === 'result' ? t('common.close') : t('common.cancel')}
          </button>
          {step === 'map' && (
            <button type="button" className="btn btn-sm btn-primary" disabled={!hasMapping} onClick={() => setStep('preview')}>
              {t('import.next')}
            </button>
          )}
          {step === 'preview' && (
            <button type="button" className="btn btn-sm btn-primary" disabled={importing} onClick={submitImport}>
              {importing && <span className="spinner-border spinner-border-sm me-1" />}{t('import.startImport')}
            </button>
          )}
          {step === 'result' && (
            <button type="button" className="btn btn-sm btn-primary" onClick={reset}>
              {t('import.importAnother')}
            </button>
          )}
        </>
      }
    >
      {step === 'upload' && (
        <div>
          <p className="text-muted small">{t('import.uploadHint')}</p>
          <input type="file" accept=".csv,text/csv" className="form-control" onChange={handleFileSelected} />
          {parseError && <div className="alert alert-danger mt-3 mb-0">{parseError}</div>}
        </div>
      )}

      {step === 'map' && (
        <div>
          <p className="text-muted small">{t('import.mapHint', { count: parsedRows.length })}</p>
          <div className="table-responsive" style={{ maxHeight: 400 }}>
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>{t('import.csvColumn')}</th>
                  <th>{t('import.targetField')}</th>
                </tr>
              </thead>
              <tbody>
                {parsedHeaders.map((header, idx) => (
                  <tr key={idx}>
                    <td><code>{header}</code></td>
                    <td>
                      <select
                        value={mapping[idx] ?? ''}
                        onChange={(e) => setMapping((m) => ({ ...m, [idx]: e.target.value || null }))}
                        className="form-select form-select-sm"
                      >
                        <option value="">{t('import.ignoreColumn')}</option>
                        {columns.map((col) => (
                          <option key={col.key} value={col.key}>{translateLabel(col.label)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <p className="text-muted small">{t('import.previewHint', { count: previewRows.length })}</p>
          <div className="table-responsive" style={{ maxHeight: 400 }}>
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  {mappedColumns.map((col) => <th key={col.key}>{translateLabel(col.label)}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {mappedColumns.map((col) => <td key={col.key}>{formatPreviewValue(row[col.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'result' && (
        <div>
          <div className={`alert mb-3 ${result.failed.length ? 'alert-warning' : 'alert-success'}`}>
            {t('import.resultSummary', { created: result.created, total: result.created + result.failed.length })}
          </div>
          {result.failed.length > 0 && (
            <div>
              <div className="table-responsive" style={{ maxHeight: 320 }}>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('import.error')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.failed.map((f) => (
                      <tr key={f.row}>
                        <td>{f.csvLine}</td>
                        <td className="text-danger small">{formatRowErrors(f.errors)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={downloadFailedRows}>
                <i className="bi bi-download me-1" />{t('import.downloadFailed')}
              </button>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  )
}
