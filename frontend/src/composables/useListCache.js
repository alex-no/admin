// Copyright (c) 2026 Oleksandr Nosov. MIT License.

// Module-scope кеш list-запитів, спільний для всіх інстансів DataListPage —
// той самий підхід, що й у useRemoteOptions.js (кеш по ключу, без TTL).
// Просте усунення найстарішого запису при переповненні (не LRU за читанням,
// лише за записом) — для сценарію "кілька list-сторінок за сесію" достатньо.
const MAX_ENTRIES = 50
const cache = new Map()

export function useListCache() {
  function get(key) {
    return cache.get(key) ?? null
  }

  function set(key, value) {
    cache.delete(key)
    cache.set(key, value)
    if (cache.size > MAX_ENTRIES) {
      cache.delete(cache.keys().next().value)
    }
  }

  return { get, set }
}
