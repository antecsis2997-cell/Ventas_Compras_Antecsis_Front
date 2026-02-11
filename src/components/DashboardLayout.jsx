import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import '../App.css'
import { useAuth } from '../context/AuthContext'

function DashboardLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      {/* Sidebar */}
      <aside
        className="bg-dark text-white d-flex flex-column p-3"
        style={{ width: '240px' }}
      >
        <h2 className="fs-4 mb-4 text-center">Antecsi Bodega</h2>
        <nav className="nav nav-pills flex-column mb-auto">
          <NavLink end to="/" className="nav-link text-white">
            Dashboard
          </NavLink>
          <NavLink to="/ventas" className="nav-link text-white">
            Ventas
          </NavLink>
          <span className="text-uppercase text-secondary small mt-3 mb-1">
            Próximamente
          </span>
          <button type="button" className="btn btn-link nav-link text-secondary text-start px-0">
            Compras
          </button>
          <button type="button" className="btn btn-link nav-link text-secondary text-start px-0">
            Productos
          </button>
          <button type="button" className="btn btn-link nav-link text-secondary text-start px-0">
            Clientes
          </button>
          <button type="button" className="btn btn-link nav-link text-secondary text-start px-0">
            Proveedores
          </button>
          <button type="button" className="btn btn-link nav-link text-secondary text-start px-0">
            Usuarios
          </button>
        </nav>
        <div className="mt-auto pt-3 border-top border-secondary small">
          <div>Usuario: admin</div>
          <button className="btn btn-sm btn-outline-light mt-2 w-100" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Topbar */}
        <header className="navbar navbar-light bg-white shadow-sm px-4">
          <span className="navbar-brand mb-0 h5">
            Panel de control - Bodega
          </span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">Hoy: {new Date().toLocaleDateString()}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-grow-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout

