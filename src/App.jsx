import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import DashboardLayout from './components/DashboardLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import VentasPage from './pages/Ventas'
import ComprasPage from './pages/Compras'
import ProductosPage from './pages/Productos'
import ClientesPage from './pages/Clientes'
import ProveedoresPage from './pages/Proveedores'
import UsuariosPage from './pages/Usuarios'
import SectoresPage from './pages/Sectores'
import LocalizacionesPage from './pages/Localizaciones'
import SolicitudesProductoPage from './pages/SolicitudesProducto'
import MensajesPage from './pages/Mensajes'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <span>Cargando...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="compras" element={<ComprasPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="sectores" element={<SectoresPage />} />
            <Route path="localizaciones" element={<LocalizacionesPage />} />
            <Route path="solicitudes-producto" element={<SolicitudesProductoPage />} />
            <Route path="mensajes" element={<MensajesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
