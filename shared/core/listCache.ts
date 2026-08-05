/**
 * Кеш list-запитів по ключу, без TTL, просте усунення найстарішого запису при
 * переповненні (не LRU за читанням, лише за записом) — для сценарію "кілька
 * list-сторінок за сесію" достатньо. Був продубльований байт-в-байт
 * (useListCache.js / useListCache.ts) — жодної реактивності тут немає, лише Map.
 */
export function createListCache(maxEntries = 50) {
  const cache = new Map<string, any>()

  return {
    get<T = any>(key: string): T | null {
      return cache.get(key) ?? null
    },
    set(key: string, value: any): void {
      cache.delete(key)
      cache.set(key, value)
      if (cache.size > maxEntries) {
        cache.delete(cache.keys().next().value as string)
      }
    },
  }
}

// Module-scope singleton — той самий кеш для всіх list-сторінок застосунку
// (кожен фронтенд бандлиться окремо, тож Vue і React не діляться цим інстансом).
const defaultCache = createListCache()
export const getCached = defaultCache.get
export const setCached = defaultCache.set
