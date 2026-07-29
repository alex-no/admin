import { useEffect, useState } from 'react'
import { apiGet } from '@/utils/api'
import type { Option } from '../types'

// Спільний кеш на весь застосунок: один і той самий optionsUrl не тягнеться
// повторно для кожної комірки/фільтра (аналог useRemoteOptions у Vue-версії).
const cache = new Map<string, Promise<Option[]>>()

/**
 * Проміс зі списком варіантів. Поза React — щоб ним могли скористатись і хук нижче,
 * і експорт у CSV (там потрібні підписи, а не коди, але хук викликати ніде).
 */
export function fetchOptions(
  url: string,
  opts: { valueKey?: string; labelKey?: string } = {}
): Promise<Option[]> {
  const { valueKey = 'id', labelKey = 'name_uk' } = opts
  const key = `${url}|${valueKey}|${labelKey}`

  if (!cache.has(key)) {
    cache.set(
      key,
      apiGet(url)
        .then((res) =>
          (res.data ?? []).map((item: any) => ({
            value: item[valueKey],
            label: item[labelKey],
          }))
        )
        .catch(() => [])
    )
  }

  return cache.get(key)!
}

export function useRemoteOptions(
  url: string | undefined,
  opts: { valueKey?: string; labelKey?: string } = {}
) {
  const { valueKey = 'id', labelKey = 'name_uk' } = opts
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) return

    let alive = true
    setLoading(true)

    fetchOptions(url, { valueKey, labelKey }).then((opts) => {
      if (!alive) return
      setOptions(opts)
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [url, valueKey, labelKey])

  return { options, loading }
}
