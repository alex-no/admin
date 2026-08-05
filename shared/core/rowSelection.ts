/**
 * Чисті предикати й редʼюсери для виділення рядків (react-admin: bulk
 * selection + SelectAllButton). Стан (Set обраних id) лишається за фронтендом —
 * тут лише "яким має стати новий Set/значення", без ref/useState.
 */

export function isAllOnPageSelected(items: any[], selectedIds: Set<any>, rowKey = 'id'): boolean {
  return items.length > 0 && items.every((row) => selectedIds.has(row[rowKey]))
}

export function computeSelectedCount(selectAllMatching: boolean, total: number, selectedIds: Set<any>): number {
  return selectAllMatching ? total : selectedIds.size
}

/** Пропонувати «виділити всі N» тільки якщо за фільтром є більше, ніж на сторінці. */
export function canSelectAllMatching(
  allOnPageSelected: boolean,
  selectAllMatching: boolean,
  total: number,
  itemsLength: number
): boolean {
  return allOnPageSelected && !selectAllMatching && total > itemsLength
}

/** Наступний Set після кліку "виділити все на сторінці". */
export function toggleAllOnPage(items: any[], selectedIds: Set<any>, rowKey = 'id'): Set<any> {
  if (isAllOnPageSelected(items, selectedIds, rowKey)) return new Set()
  return new Set(items.map((row) => row[rowKey]))
}

/** Наступний Set після кліку по одному рядку. */
export function toggleRowSelection<T>(selectedIds: Set<T>, id: T): Set<T> {
  const next = new Set(selectedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
