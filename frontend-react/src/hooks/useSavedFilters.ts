import { useCallback, useState } from 'react'
import {
  readSavedFilters,
  writeSavedFilters,
  upsertSavedFilter,
  removeSavedFilter,
  type FilterPreset as CoreFilterPreset,
} from '@core/savedFilters'

export interface FilterPreset extends CoreFilterPreset {
  filters?: Record<string, any>
  sort?: Array<{ key: string; dir: string }>
  perPage?: number
}

/**
 * Іменовані пресети фільтрів (як "Saved Queries" у react-admin) у localStorage,
 * без бекенду. namespace — apiList сторінки, що викликає хук.
 * Сховище і редʼюсери — в ядрі (@core/savedFilters), спільні з Vue.
 */
export function useSavedFilters(namespace: string) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => readSavedFilters(namespace) as FilterPreset[])

  const save = useCallback((name: string, snapshot: Omit<FilterPreset, 'name'>) => {
    setPresets(prev => {
      const next = upsertSavedFilter(prev, name, snapshot) as FilterPreset[]
      writeSavedFilters(namespace, next)
      return next
    })
  }, [namespace])

  const remove = useCallback((name: string) => {
    setPresets(prev => {
      const next = removeSavedFilter(prev, name) as FilterPreset[]
      writeSavedFilters(namespace, next)
      return next
    })
  }, [namespace])

  return { presets, save, remove }
}
