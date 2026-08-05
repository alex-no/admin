import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // happy-dom, а не node: кілька модулів ядра чіпають localStorage/window
    // (columnPrefs, savedFilters, modalWindow, notifications) — це звичайні
    // браузерні API, доступні в будь-якому фронтенді, а не Node-специфіка.
    environment: 'happy-dom',
    include: ['*.test.ts'],
  },
})
