import { useCallback, useState } from 'react'

export interface FilterPreset {
  name: string
  filters?: Record<string, any>
  sort?: Array<{ key: string; dir: string }>
  perPage?: number
}

function storageKey(namespace: string): string {
  return `admin.savedFilters:${namespace}`
}

function readAll(namespace: string): FilterPreset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(namespace)) ?? '')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(namespace: string, presets: FilterPreset[]) {
  localStorage.setItem(storageKey(namespace), JSON.stringify(presets))
}

/**
 * Іменовані пресети фільтрів (як "Saved Queries" у react-admin) у localStorage,
 * без бекенду. namespace — apiList сторінки, що викликає хук.
 */
export function useSavedFilters(namespace: string) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => readAll(namespace))

  const save = useCallback((name: string, snapshot: Omit<FilterPreset, 'name'>) => {
    setPresets(prev => {
      const next = [...prev.filter(p => p.name !== name), { name, ...snapshot }]
      writeAll(namespace, next)
      return next
    })
  }, [namespace])

  const remove = useCallback((name: string) => {
    setPresets(prev => {
      const next = prev.filter(p => p.name !== name)
      writeAll(namespace, next)
      return next
    })
  }, [namespace])

  return { presets, save, remove }
}
