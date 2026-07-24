import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable для синхронизации фильтров и сортировки с URL
 *
 * @param {Object} config - Конфигурация фильтров
 * @param {Object} config.filters - Объект с реактивными фильтрами { filterName: ref(defaultValue) }
 * @param {Object} config.sorting - Объект с сортировкой { sortKey: ref('field'), sortDir: ref('ASC') }
 * @param {import('vue').Ref} config.multiSort - Реф с массивом сортировки по нескольким колонкам
 *   [{ key: 'field', dir: 'ASC' }, ...], порядок элементов = приоритет. В URL — один параметр
 *   `sort=key:dir,key2:dir2`. Независим от config.sorting (используется list-framework вместо него).
 * @param {Object} config.detail - Объект для детального окна { id: ref(null), onOpen: (id) => void }
 * @param {Function} config.onUpdate - Callback для вызова при изменении фильтров/сортировки
 * @param {Object} config.mappers - Опциональные функции преобразования значений { filterName: { toUrl, fromUrl } }
 */
export function useUrlFilters(config) {
  const route = useRoute()
  const router = useRouter()

  const { filters = {}, sorting = null, multiSort = null, detail = null, onUpdate = null, mappers = {} } = config

  function parseMultiSort(raw) {
    if (!raw) return []
    return String(raw)
      .split(',')
      .map((part) => {
        const [key, dir] = part.split(':')
        if (!key) return null
        return { key, dir: String(dir ?? 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC' }
      })
      .filter(Boolean)
  }

  function serializeMultiSort(items) {
    return (items ?? []).map((s) => `${s.key}:${s.dir}`).join(',')
  }

  // Функция для получения значения из URL с учетом mapper
  function getFromUrl(key, defaultValue) {
    const urlValue = route.query[key]
    if (urlValue === undefined || urlValue === null || urlValue === '') {
      return defaultValue
    }

    const mapper = mappers[key]
    if (mapper?.fromUrl) {
      return mapper.fromUrl(urlValue)
    }

    // Автоматическое преобразование типов
    if (typeof defaultValue === 'number') {
      return Number(urlValue) || defaultValue
    }
    if (typeof defaultValue === 'boolean') {
      return urlValue === 'true' || urlValue === '1'
    }

    return urlValue
  }

  // Функция для преобразования значения в URL с учетом mapper
  function toUrlValue(key, value) {
    const mapper = mappers[key]
    if (mapper?.toUrl) {
      return mapper.toUrl(value)
    }

    // Пропускаем пустые значения
    if (value === '' || value === null || value === undefined) {
      return undefined
    }

    return String(value)
  }

  // Инициализация фильтров из URL при монтировании
  function initFromUrl() {
    let hasChanges = false

    // Применяем значения из URL к фильтрам
    for (const [key, filterRef] of Object.entries(filters)) {
      const defaultValue = filterRef.value
      const urlValue = getFromUrl(key, defaultValue)

      if (urlValue !== defaultValue) {
        filterRef.value = urlValue
        hasChanges = true
      }
    }

    // Применяем сортировку из URL
    if (sorting) {
      if (route.query.sort_by && sorting.sortKey) {
        sorting.sortKey.value = route.query.sort_by
        hasChanges = true
      }
      if (route.query.sort_dir && sorting.sortDir) {
        sorting.sortDir.value = route.query.sort_dir.toUpperCase()
        hasChanges = true
      }
    }

    // Применяем мульти-сортировку из URL
    if (multiSort && route.query.sort) {
      const parsed = parseMultiSort(route.query.sort)
      if (parsed.length) {
        multiSort.value = parsed
        hasChanges = true
      }
    }

    // Применяем детальный ID из URL
    if (detail && route.query.id) {
      const detailId = Number(route.query.id)
      if (detailId > 0) {
        detail.id.value = detailId
        if (detail.onOpen) {
          detail.onOpen(detailId)
        }
      }
    }

    return hasChanges
  }

  // Функция обновления URL (без перезагрузки страницы)
  function updateUrl() {
    const query = { ...route.query }

    // Обновляем фильтры в URL
    for (const [key, filterRef] of Object.entries(filters)) {
      const urlValue = toUrlValue(key, filterRef.value)

      if (urlValue !== undefined && urlValue !== '') {
        query[key] = urlValue
      } else {
        delete query[key]
      }
    }

    // Обновляем сортировку в URL
    if (sorting) {
      if (sorting.sortKey?.value) {
        query.sort_by = sorting.sortKey.value
      } else {
        delete query.sort_by
      }

      if (sorting.sortDir?.value) {
        query.sort_dir = sorting.sortDir.value
      } else {
        delete query.sort_dir
      }
    }

    // Обновляем мульти-сортировку в URL
    if (multiSort) {
      const serialized = serializeMultiSort(multiSort.value)
      if (serialized) {
        query.sort = serialized
      } else {
        delete query.sort
      }
    }

    // Обновляем детальный ID в URL
    if (detail) {
      if (detail.id?.value) {
        query.id = String(detail.id.value)
      } else {
        delete query.id
      }
    }

    // Проверяем, изменился ли query
    const currentQueryStr = JSON.stringify(route.query)
    const newQueryStr = JSON.stringify(query)

    if (currentQueryStr !== newQueryStr) {
      router.replace({ query })
    }
  }

  // Функция для сброса всех фильтров
  function resetFilters(filterDefaults = {}) {
    for (const [key, filterRef] of Object.entries(filters)) {
      filterRef.value = filterDefaults[key] ?? ''
    }

    if (sorting) {
      if (filterDefaults.sortKey !== undefined) {
        sorting.sortKey.value = filterDefaults.sortKey
      }
      if (filterDefaults.sortDir !== undefined) {
        sorting.sortDir.value = filterDefaults.sortDir
      }
    }

    updateUrl()

    if (onUpdate) {
      onUpdate()
    }
  }

  // Наблюдаем за изменениями фильтров и автоматически обновляем URL
  for (const filterRef of Object.values(filters)) {
    watch(filterRef, () => {
      updateUrl()
    })
  }

  // Наблюдаем за изменениями сортировки
  if (sorting) {
    if (sorting.sortKey) {
      watch(sorting.sortKey, () => {
        updateUrl()
      })
    }
    if (sorting.sortDir) {
      watch(sorting.sortDir, () => {
        updateUrl()
      })
    }
  }

  // Наблюдаем за изменениями мульти-сортування (глибоко — це масив об'єктів)
  if (multiSort) {
    watch(multiSort, () => {
      updateUrl()
    }, { deep: true })
  }

  // Наблюдаем за изменениями детального ID
  if (detail?.id) {
    watch(detail.id, () => {
      updateUrl()
    })
  }

  return {
    initFromUrl,
    updateUrl,
    resetFilters
  }
}
