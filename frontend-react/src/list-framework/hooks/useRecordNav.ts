import { useState, useMemo, useCallback } from 'react'
import { computeRecordPosition, findIndexById, hasNextRecord, hasPrevRecord } from '@core/recordNav'

interface RecordNavOptions {
  items: any[]
  page: number
  perPage: number
  total: number
  currentId: number | null
  load: (page: number) => Promise<void>
  openRecord: (row: any) => void
  canLeave?: () => boolean | Promise<boolean>
}

interface RecordNavReturn {
  position: number | null
  totalCount: number
  hasPrev: boolean
  hasNext: boolean
  busy: boolean
  goPrev: () => void
  goNext: () => void
}

/**
 * Навігація «попередній / наступний запис» у модалці (react-admin:
 * PrevNextButtons). Ходить по items поточної сторінки, а на межі — підгружає
 * сусідню сторінку через load() і відкриває крайній запис із неї.
 * Позиційна математика — в ядрі (@core/recordNav), спільна з Vue.
 */
export function useRecordNav({
  items,
  page,
  perPage,
  total,
  currentId,
  load,
  openRecord,
  canLeave,
}: RecordNavOptions): RecordNavReturn {
  const [busy, setBusy] = useState(false)

  const indexOnPage = useMemo(() => findIndexById(items, currentId), [items, currentId])
  const position = useMemo(() => computeRecordPosition(indexOnPage, page, perPage), [indexOnPage, page, perPage])

  const hasPrev = hasPrevRecord(position)
  const hasNext = hasNextRecord(position, total)

  const step = useCallback(
    async (delta: number) => {
      if (busy) return
      if (canLeave && !(await canLeave())) return

      const i = indexOnPage
      if (i === -1) return

      const target = i + delta
      if (target >= 0 && target < items.length) {
        openRecord(items[target])
        return
      }

      // Межа сторінки — підгружаємо сусідню
      setBusy(true)
      try {
        await load(page + delta)
        const row = delta > 0 ? items[0] : items[items.length - 1]
        if (row) openRecord(row)
      } finally {
        setBusy(false)
      }
    },
    [busy, canLeave, indexOnPage, items, page, load, openRecord]
  )

  const goPrev = useCallback(() => {
    if (hasPrev) step(-1)
  }, [hasPrev, step])

  const goNext = useCallback(() => {
    if (hasNext) step(1)
  }, [hasNext, step])

  return {
    position,
    totalCount: total,
    hasPrev,
    hasNext,
    busy,
    goPrev,
    goNext,
  }
}
