// Copyright (c) 2026 Oleksandr Nosov. MIT License.
// Реалізація переїхала в ядро, спільне з React — див. ../../../shared/core/README.md.
import { getCached, setCached } from '@core/listCache'

export function useListCache() {
  return { get: getCached, set: setCached }
}
