// Кеш list-запитів на рівні модуля, спільний для всіх інстансів DataTable —
// той самий підхід, що й у useRemoteOptions (кеш по ключу, без TTL).
// Просте усунення найстарішого запису при переповненні (не LRU за читанням,
// лише за записом) — для сценарію "кілька list-сторінок за сесію" достатньо.

const MAX_ENTRIES = 50
const cache = new Map<string, any>()

export function getCached<T = any>(key: string): T | null {
  return cache.get(key) ?? null
}

export function setCached(key: string, value: any) {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > MAX_ENTRIES) {
    cache.delete(cache.keys().next().value as string)
  }
}
