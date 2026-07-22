import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost',
        changeOrigin: true,
      },
    },
  },
})
