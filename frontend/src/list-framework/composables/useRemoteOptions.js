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
    return { options: ref([]), rows: ref([]), loading: ref(false), error: ref(null) }
  }

  if (!cache.has(url)) {
    const options = ref([])
    // Сирі рядки відповіді — потрібні там, де мало value/label: напр. модалка
    // фільтрує райони по region_in_area_id. Без цього сторінка тягнула б той
    // самий довідник другим запитом, повз кеш.
    const rows = ref([])
    const loading = ref(true)
    const error = ref(null)

    cache.set(url, { options, rows, loading, error })

    fetch(url, { headers: authHeaders() })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message ?? `Помилка завантаження списку (HTTP ${res.status})`)
        const list = json.data ?? []
        rows.value = list
        options.value = list.map((row) => ({
          value: row[valueKey],
          label: row[labelKey],
        }))
      })
      .catch((e) => {
        error.value = e.message
        // Не залишаємо URL "назавжди зіпсованим" — прибираємо з кешу, щоб наступний
        // виклик (напр. після повторного логіну через 401-редирект в тій самій SPA-сесії)
        // спробував заново, а не мовчки повертав порожній список.
        cache.delete(url)
      })
      .finally(() => { loading.value = false })
  }

  const entry = cache.get(url)

  if (!placeholderOption) {
    return entry
  }

  return {
    options: computed(() => [placeholderOption, ...entry.options.value]),
    rows: entry.rows,
    loading: entry.loading,
    error: entry.error,
  }
}
