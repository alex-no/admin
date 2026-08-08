import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPut } from '@/utils/api'
import { notify } from '@/hooks/useNotify'

interface Permission {
  id: number
  slug: string
  name: string
  module: string | null
  description: string | null
  is_system: boolean
}

export default function PermissionList() {
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingDescription, setEditingDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    apiGet('/admin/permissions')
      .then(res => setPermissions(res.permissions ?? []))
      .catch(err => setError(err instanceof Error ? err.message : t('roles.connectionError')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    if (editingId !== null) textareaRef.current?.focus()
  }, [editingId])

  const startEdit = (perm: Permission) => {
    setEditingId(perm.id)
    setEditingDescription(perm.description ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingDescription('')
  }

  const saveDescription = async (perm: Permission) => {
    setSaving(true)
    try {
      await apiPut(`/admin/permissions/${perm.id}`, { description: editingDescription })
      setPermissions(list =>
        list.map(p => (p.id === perm.id ? { ...p, description: editingDescription } : p))
      )
      cancelEdit()
    } catch (err) {
      notify(err instanceof Error ? err.message : t('roles.saveError'), { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">{t('permissionList.title')}</h4>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          <div className="card">
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '60px' }}>{t('roles.colId')}</th>
                    <th style={{ width: '200px' }}>{t('roles.colSlug')}</th>
                    <th style={{ width: '250px' }}>{t('roles.nameLabel')}</th>
                    <th style={{ width: '120px' }}>{t('permissionList.colModule')}</th>
                    <th>{t('common.description')}</th>
                    <th style={{ width: '80px' }} className="text-center">{t('permissionList.colSystem')}</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(perm => (
                    <tr key={perm.id}>
                      <td className="text-muted">{perm.id}</td>
                      <td><code className="small">{perm.slug}</code></td>
                      <td>{perm.name}</td>
                      <td>
                        {perm.module
                          ? <span className="badge bg-secondary">{perm.module}</span>
                          : <span className="text-muted small">—</span>}
                      </td>
                      <td>
                        {editingId === perm.id ? (
                          <div className="d-flex gap-2">
                            <textarea
                              ref={textareaRef}
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onKeyUp={(e) => { if (e.key === 'Escape') cancelEdit() }}
                              className="form-control form-control-sm"
                              rows={3}
                            />
                            <div className="d-flex flex-column gap-1">
                              <button
                                className="btn btn-sm btn-success"
                                disabled={saving}
                                title={t('common.save')}
                                onClick={() => saveDescription(perm)}
                              >
                                <i className="bi bi-check-lg" />
                              </button>
                              <button className="btn btn-sm btn-secondary" title={t('common.cancel')} onClick={cancelEdit}>
                                <i className="bi bi-x-lg" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="text-muted small"
                            style={{ cursor: 'pointer', whiteSpace: 'pre-wrap' }}
                            title={t('permissionList.editHint')}
                            onDoubleClick={() => startEdit(perm)}
                          >
                            {perm.description || '—'}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        {perm.is_system
                          ? <span className="text-success" title={t('permissionList.systemRecordTitle')}><i className="bi bi-shield-lock-fill" /></span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 text-muted small">
            <i className="bi bi-info-circle me-1" />
            {t('permissionList.totalRecords', { count: permissions.length })}
          </div>
        </>
      )}
    </div>
  )
}
