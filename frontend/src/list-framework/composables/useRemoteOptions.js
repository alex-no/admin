// Copyright (c) 2026 Oleksandr Nosov. MIT License.
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { formatOptionLabel, withDefaultPerPage } from '@core/remoteOptions'

// Кеш по URL, спільний для всіх компонентів (filter + cell), щоб той самий
// довідник (наприклад, країни) не запитувався з бекенду повторно.
// Кешуються **сирі рядки**, а мапінг у value/label робиться поверх, у кожного
// виклику свій: інакше другий виклик того самого URL з іншими valueKey/labelKey
// мовчки дістав би підписи, зроблені для першого. (Так само в React-версії.)
const cache = new Map()

/**
 * @param {string} url                       - ендпоінт, що повертає { data: [...] }
 * @param {Object} opts
 * @param {string} opts.valueKey             - поле рядка, що йде у value (default 'id')
 * @param {string} opts.labelKey             - поле рядка, що йде у label (default 'name_uk')
 * @param {string} [opts.labelTemplate]      - підпис з кількох полів, напр. "{utc_offset} ({count})";
 *                                             має пріоритет над labelKey
 * @param {{value:string,label:string}} [opts.placeholderOption] - опція "Всі..." на початку списку
 */
export function useRemoteOptions(url, opts = {}) {
  const {
    valueKey = 'id',
    labelKey = 'name_uk',
    labelTemplate = null,
    placeholderOption = null,
  } = opts
  const { authHeaders } = useAuth()

  if (!url) {
    return { options: ref([]), rows: ref([]), loading: ref(false), error: ref(null) }
  }

  if (!cache.has(url)) {
    // Сирі рядки відповіді — потрібні там, де мало value/label: напр. модалка
    // фільтрує райони по region_in_area_id. Без цього сторінка тягнула б той
    // самий довідник другим запитом, повз кеш.
    const rows = ref([])
    const loading = ref(true)
    const error = ref(null)
    const total = ref(0)
    const truncated = ref(false)

    cache.set(url, { rows, loading, error, total, truncated })

    fetch(withDefaultPerPage(url), { headers: authHeaders() })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message ?? `Помилка завантаження списку (HTTP ${res.status})`)
        rows.value = json.data ?? []
        total.value = json.pagination?.total ?? rows.value.length
        truncated.value = total.value > rows.value.length
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

  const options = computed(() => {
    const mapped = entry.rows.value.map((row) => ({
      value: row[valueKey],
      label: labelTemplate ? formatOptionLabel(labelTemplate, row) : row[labelKey],
    }))

    // Якщо довідник обрізаний — додаємо інформаційний рядок
    if (entry.truncated?.value && entry.total?.value) {
      mapped.push({
        value: '',
        label: `▸ Показано ${mapped.length} з ${entry.total.value} — для пошуку потрібен автокомпліт`,
        disabled: true,
      })
    }

    return placeholderOption ? [placeholderOption, ...mapped] : mapped
  })

  return {
    options,
    rows: entry.rows,
    loading: entry.loading,
    error: entry.error,
    total: entry.total || ref(0),
    truncated: entry.truncated || ref(false),
  }
}
