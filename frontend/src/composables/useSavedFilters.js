// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { ref } from 'vue'

function storageKey(namespace) {
  return `admin.savedFilters:${namespace}`
}

function readAll(namespace) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(namespace)))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(namespace, presets) {
  localStorage.setItem(storageKey(namespace), JSON.stringify(presets))
}

// Іменовані пресети фільтрів (react-admin: "Saved Queries") на localStorage,
// без бекенду — namespace = props.apiList сторінки, що викликає composable.
export function useSavedFilters(namespace) {
  const presets = ref(readAll(namespace))

  function save(name, snapshot) {
    const next = presets.value.filter((p) => p.name !== name)
    next.push({ name, ...snapshot })
    presets.value = next
    writeAll(namespace, next)
  }

  function remove(name) {
    presets.value = presets.value.filter((p) => p.name !== name)
    writeAll(namespace, presets.value)
  }

  return { presets, save, remove }
}
