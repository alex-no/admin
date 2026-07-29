import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ToastContainer from './components/ToastContainer'
import AppRoutes from './routes'

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
