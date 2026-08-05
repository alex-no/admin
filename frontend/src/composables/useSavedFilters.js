// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { ref } from 'vue'
import { readSavedFilters, writeSavedFilters, upsertSavedFilter, removeSavedFilter } from '@core/savedFilters'

// Іменовані пресети фільтрів (react-admin: "Saved Queries") на localStorage,
// без бекенду — namespace = props.apiList сторінки, що викликає composable.
export function useSavedFilters(namespace) {
  const presets = ref(readSavedFilters(namespace))

  function save(name, snapshot) {
    presets.value = upsertSavedFilter(presets.value, name, snapshot)
    writeSavedFilters(namespace, presets.value)
  }

  function remove(name) {
    presets.value = removeSavedFilter(presets.value, name)
    writeSavedFilters(namespace, presets.value)
  }

  return { presets, save, remove }
}
