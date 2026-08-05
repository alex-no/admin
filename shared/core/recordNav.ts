/** Позиція запису на сторінці за ключем рядка (типово 'id'). -1, якщо не знайдено. */
export function findIndexById(items: any[], id: any, rowKey = 'id'): number {
  return items.findIndex((r) => r[rowKey] === id)
}

/** Абсолютна позиція запису серед усіх сторінок (1-based) або null, якщо не на цій сторінці. */
export function computeRecordPosition(indexOnPage: number, page: number, perPage: number): number | null {
  return indexOnPage === -1 ? null : (page - 1) * perPage + indexOnPage + 1
}

export function hasPrevRecord(position: number | null): boolean {
  return position !== null && position > 1
}

export function hasNextRecord(position: number | null, total: number): boolean {
  return position !== null && position < total
}
