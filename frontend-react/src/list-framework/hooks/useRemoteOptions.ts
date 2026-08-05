import { useEffect, useState } from 'react'
import { apiGet } from '@/utils/api'
import { formatOptionLabel, withDefaultPerPage } from '@core/remoteOptions'
import type { Option } from '../types'

// Спільний кеш на весь застосунок: один і той самий optionsUrl не тягнеться
// повторно для кожної комірки/фільтра (аналог useRemoteOptions у Vue-версії).
// Кешуються **сирі рядки**, а мапінг у value/label робиться поверх — інакше той
// самий довідник із іншими valueKey/labelKey пішов би другим запитом.
const cache = new Map<string, Promise<any[]>>()

function fetchRows(url: string): Promise<any[]> {
  if (!cache.has(url)) {
    cache.set(
      url,
      apiGet(withDefaultPerPage(url))
        .then((res) => res.data ?? [])
        .catch(() => [])
    )
  }
  return cache.get(url)!
}

/**
 * Проміс зі списком варіантів. Поза React — щоб ним могли скористатись і хук нижче,
 * і експорт у CSV (там потрібні підписи, а не коди, але хук викликати ніде).
 *
 * `optionsUrl` зі спільного конфіга приходить повним ('/api/admin/...') — `apiGet`
 * приймає і таку форму, і коротку, тому нормалізувати тут не треба.
 */
export function fetchOptions(
  url: string,
  opts: { valueKey?: string; labelKey?: string; labelTemplate?: string } = {}
): Promise<Option[]> {
  const { valueKey = 'id', labelKey = 'name_uk', labelTemplate } = opts

  return fetchRows(url).then((rows) =>
    rows.map((item: any) => ({
      value: item[valueKey],
      label: labelTemplate ? formatOptionLabel(labelTemplate, item) : item[labelKey],
    }))
  )
}

export function useRemoteOptions(
  url: string | undefined,
  opts: { valueKey?: string; labelKey?: string; labelTemplate?: string } = {}
) {
  const { valueKey = 'id', labelKey = 'name_uk', labelTemplate } = opts
  const [options, setOptions] = useState<Option[]>([])
  // Сирі рядки відповіді — потрібні там, де мало value/label (напр. модалка
  // фільтрує райони по region_in_area_id). Дзеркало Vue: `rows` у композаблі.
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) return

    let alive = true
    setLoading(true)

    fetchRows(url).then((list) => {
      if (!alive) return
      setRows(list)
      setOptions(
        list.map((item: any) => ({
          value: item[valueKey],
          label: labelTemplate ? formatOptionLabel(labelTemplate, item) : item[labelKey],
        }))
      )
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [url, valueKey, labelKey, labelTemplate])

  return { options, rows, loading }
}
