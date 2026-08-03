// Copyright (c) 2026 Oleksandr Nosov. MIT License.

import { ref } from 'vue'

/**
 * Розкривні рядки таблиці (react-admin: Datagrid expand). Кілька рядків можуть
 * бути розкриті одночасно. Set перестворюється при кожній зміні — інакше Vue
 * не побачить мутацію (той самий патерн, що selectedIds у Cities.vue:374).
 */
export function useRowExpand() {
  const expanded = ref(new Set())

  function isExpanded(id) {
    return expanded.value.has(id)
  }

  function toggle(id) {
    if (expanded.value.has(id)) {
      expanded.value.delete(id)
    } else {
      expanded.value.add(id)
    }
    // Vue 3 не реактивний на мутації Set через .add/.delete — треба перестворити
    expanded.value = new Set(expanded.value)
  }

  function collapseAll() {
    expanded.value = new Set()
  }

  return { expanded, isExpanded, toggle, collapseAll }
}
