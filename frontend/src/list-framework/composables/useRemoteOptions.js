// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

// Кеш по URL, спільний для всіх компонентів (filter + cell), щоб той самий
// довідник (наприклад, країни) не запитувався з бекенду повторно.
const cache = new Map()

/**
 * @param {string} url                       - ендпоінт, що повертає { data: [...] }
 * @param {Object} opts
 * @param {string} opts.valueKey             - поле рядка, що йде у value (default 'id')
 * @param {string} opts.labelKey             - поле рядка, що йде у label (default 'name_uk')
 * @param {{value:string,label:string}} [opts.placeholderOption] - опція "Всі..." на початку списку
 */
export function useRemoteOptions(url, opts = {}) {
  const { valueKey = 'id', labelKey = 'name_uk', placeholderOption = null } = opts
  const { authHeaders } = useAuth()

  if (!url) {
    return { options: ref([]), loading: ref(false), error: ref(null) }
  }

  if (!cache.has(url)) {
    const options = ref([])
    const loading = ref(true)
    const error = ref(null)

    cache.set(url, { options, loading, error })

    fetch(url, { headers: authHeaders() })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message ?? `Помилка завантаження списку (HTTP ${res.status})`)
        const rows = json.data ?? []
        options.value = rows.map((row) => ({
          value: row[valueKey],
          label: row[labelKey],
        }))
      })
      .catch((e) => { error.value = e.message })
      .finally(() => { loading.value = false })
  }

  const entry = cache.get(url)

  if (!placeholderOption) {
    return entry
  }

  return {
    options: computed(() => [placeholderOption, ...entry.options.value]),
    loading: entry.loading,
    error: entry.error,
  }
}
