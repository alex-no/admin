import type { SortItem } from './types'

/**
 * Наступний стан мультисортування після кліку по колонці `key`.
 *
 * Без модифікатора (additive = false) — сортує лише по цій колонці: якщо це
 * єдина вже активна колонка сортування, перемикає asc → desc → без сортування;
 * клік по будь-якій іншій колонці завжди скидає до одноколонкового asc.
 *
 * З ctrl/cmd (additive = true) — додає колонку до вже вибраного сортування,
 * або перемикає її напрямок/прибирає, якщо вона вже там — так можна сортувати
 * спершу по "Тип", потім (додатково) по "Назва".
 *
 * Раніше Vue (`DataListPage.vue`) і React (`useTableState.ts`) мали цю логіку
 * продубльованою і трохи розійшлися: клік без модифікатора по спадній колонці
 * при активному мультисорті в Vue скидав до одноколонкового asc саме на ній,
 * а в React очищав сортування повністю. Канонічна поведінка тут — як була
 * у Vue (проєктний eталон).
 */
export function toggleSort(current: SortItem[], key: string, additive: boolean): SortItem[] {
  const idx = current.findIndex((s) => s.key === key)

  if (!additive) {
    if (current.length === 1 && idx === 0) {
      return current[0].dir === 'asc' ? [{ key, dir: 'desc' }] : []
    }
    return [{ key, dir: 'asc' }]
  }

  if (idx === -1) {
    return [...current, { key, dir: 'asc' }]
  }
  if (current[idx].dir === 'asc') {
    return current.map((s, i) => (i === idx ? { ...s, dir: 'desc' } : s))
  }
  return current.filter((_, i) => i !== idx)
}
