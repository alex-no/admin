/**
 * Іменовані пресети фільтрів (react-admin: "Saved Queries") на localStorage,
 * без бекенду. namespace = apiList сторінки, що викликає хук/композабл.
 */

export interface FilterPreset {
  name: string
  [key: string]: any
}

export function savedFiltersStorageKey(namespace: string): string {
  return `admin.savedFilters:${namespace}`
}

export function readSavedFilters(namespace: string): FilterPreset[] {
  try {
    const raw = localStorage.getItem(savedFiltersStorageKey(namespace))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeSavedFilters(namespace: string, presets: FilterPreset[]): void {
  localStorage.setItem(savedFiltersStorageKey(namespace), JSON.stringify(presets))
}

/** Замінює пресет з тим самим ім'ям (якщо є) новим знімком; порядок інших не міняється. */
export function upsertSavedFilter(presets: FilterPreset[], name: string, snapshot: Record<string, any>): FilterPreset[] {
  return [...presets.filter((p) => p.name !== name), { name, ...snapshot }]
}

export function removeSavedFilter(presets: FilterPreset[], name: string): FilterPreset[] {
  return presets.filter((p) => p.name !== name)
}
