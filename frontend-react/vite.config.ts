import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Конфіги сторінок list-framework лежать поза цим проєктом — той самий каталог
// читає frontend/ (Vue), щоб один екран не описувався двома конфігами (див.
// ../shared/page-configs/README.md). Вираз однаковий у контейнері (__dirname == /app,
// ./shared змонтований у /shared) і при локальному npm run dev.
const sharedConfigs = path.resolve(__dirname, '../shared/page-configs')
// Чиста логіка (без Vue/React), спільна з frontend/ — див. ../shared/core/README.md
const sharedCore = path.resolve(__dirname, '../shared/core')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@configs': sharedConfigs,
      '@core': sharedCore,
    },
  },
  build: {
    outDir: 'dist',
    // У проді обидва фронтенди лежать в одному public/ спільного контейнера:
    // Vue — index.html + app-assets/, React — react-index.html + react-assets/.
    // Різні імена, щоб збірки не затирали одна одну (див. docker/apache/backend-prod.conf).
    assetsDir: 'react-assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    // Без цього dev-сервер не віддає файли поза своїм root — а @configs саме там
    fs: {
      allow: [path.resolve(__dirname), sharedConfigs, sharedCore],
    },
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend',
        changeOrigin: true,
      },
    },
  },
})
