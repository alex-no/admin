import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

// Конфіги сторінок list-framework лежать поза цим проєктом — їх читає ще й
// frontend-react, щоб один екран не описувався двома конфігами (див.
// ../shared/page-configs/README.md). Вираз однаковий у контейнері (__dirname == /app,
// ./shared змонтований у /shared) і при локальному npm run dev.
const sharedConfigs = fileURLToPath(new URL('../shared/page-configs', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@configs': sharedConfigs,
    },
  },
  build: {
    outDir: 'dist',
    // Yii3-стартер вже має public/assets/ зі своїм .gitignore (динамічні ассети
    // фреймворку) — використовуємо іншу назву, щоб зібраний фронтенд туди не потрапляв.
    assetsDir: 'app-assets',
  },
  server: {
    host: true,
    port: 5173,
    // Без цього dev-сервер не віддає файли поза своїм root — а @configs саме там
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url)), sharedConfigs],
    },
    // Bind-mount на Windows (Docker Desktop) не пробрасує inotify-події файлової
    // системи хосту всередину контейнера — без polling Vite не бачить змін у
    // файлах і продовжує віддавати застарілий скомпільований модуль, поки
    // контейнер не перезапустити вручну.
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
