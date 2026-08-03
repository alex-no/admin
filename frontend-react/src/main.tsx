import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n' // Initialize i18n
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import './styles/theme.css'
import './styles/modal.css'
import './styles/toast.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
