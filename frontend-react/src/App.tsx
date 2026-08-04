import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from './contexts/AuthContext'
import { useTheme } from './composables/useTheme'
import ToastContainer from './components/ToastContainer'
import AppRoutes from './routes'

function ThemeApplier() {
  const { mode } = useTheme()
  useEffect(() => {
    // Композабл уже застосовує тему через useEffect, це для явності
  }, [mode])
  return null
}

function LocaleWatcher() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <LocaleWatcher />
      <ToastContainer />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
