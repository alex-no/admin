import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
