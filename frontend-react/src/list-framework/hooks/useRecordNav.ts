import { useState, useMemo, useCallback } from 'react'

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

  const indexOnPage = useMemo(
    () => items.findIndex((r) => r.id === currentId),
    [items, currentId]
  )

  const position = useMemo(
    () => (indexOnPage === -1 ? null : (page - 1) * perPage + indexOnPage + 1),
    [indexOnPage, page, perPage]
  )

  const hasPrev = position !== null && position > 1
  const hasNext = position !== null && position < total

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
