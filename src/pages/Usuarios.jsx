import { useEffect, useState } from 'react'
import api from '../api/client'

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'ALMACENERO', label: 'Almacenero' },
  { value: 'VENTAS', label: 'Ventas' },
  { value: 'LOGISTICA', label: 'Logística' },
  { value: 'ADMINISTRACION', label: 'Administración' },
]

const emptyForm = {
  username: '',
  password: '',
  rol: 'CAJERO',
  nombre: '',
  apellido: '',
  correo: '',
  edad: '',
  cargo: '',
  sedeId: '',
}

function UsuariosPage() {
  const [form, setForm] = useState(emptyForm)
  const [sectores, setSectores] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/sectores', { params: { size: 100 } }).then((r) => setSectores(r.data.content ?? [])).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const username = form.username?.trim()
    const password = form.password?.trim()
    const rol = form.rol?.trim()
    if (!username || !password || !rol) {
      setError('Usuario, contraseña y rol son obligatorios')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/usuarios', {
        username,
        password,
        rol,
        nombre: form.nombre?.trim() || null,
        apellido: form.apellido?.trim() || null,
        correo: form.correo?.trim() || null,
        edad: form.edad !== '' ? Number(form.edad) : null,
        cargo: form.cargo?.trim() || null,
        sedeId: form.sedeId ? Number(form.sedeId) : null,
      })
      setMessage('Usuario creado. Solo superusuario o admin pueden crear usuarios. Límites: 3 Cajeros, 1 Ventas por licencia.')
      setForm(emptyForm)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('No tiene permiso para crear usuarios. Solo el superusuario puede hacerlo.')
      } else {
        setError(
          err.response?.data?.message || 'Error al crear el usuario'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white">
        <h5 className="card-title mb-0">Crear usuario</h5>
      </div>
      <div className="card-body">
        <p className="text-muted small">
          Solo <strong>Superusuario</strong> o <strong>Administrador</strong> pueden crear usuarios.
          Límites por licencia: 3 Cajeros, 1 Ventas. Roles: Admin, Cajero, Almacenero, Ventas, Logística, Administración.
        </p>
        {message && (
          <div className="alert alert-success py-2" role="alert">
            {message}
          </div>
        )}
        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px' }}>
          <div className="mb-2">
            <label className="form-label">Usuario (login) *</label>
            <input
              type="text"
              className="form-control"
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              required
            />
          </div>
          <div className="mb-2">
            <label className="form-label">Contraseña *</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
            />
          </div>
          <div className="mb-2">
            <label className="form-label">Rol *</label>
            <select
              className="form-select"
              value={form.rol}
              onChange={(e) =>
                setForm((f) => ({ ...f, rol: e.target.value }))
              }
              required
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="form-control"
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
            />
          </div>
          <div className="mb-2">
            <label className="form-label">Apellido</label>
            <input
              type="text"
              className="form-control"
              value={form.apellido}
              onChange={(e) =>
                setForm((f) => ({ ...f, apellido: e.target.value }))
              }
            />
          </div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label">Edad</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={form.edad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, edad: e.target.value }))
                }
              />
            </div>
            <div className="col-6">
              <label className="form-label">Cargo</label>
              <input
                type="text"
                className="form-control"
                value={form.cargo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cargo: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label">Sede (Sector)</label>
            <select
              className="form-select"
              value={form.sedeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, sedeId: e.target.value }))
              }
            >
              <option value="">Sin sede</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombreSector}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Correo</label>
            <input
              type="email"
              className="form-control"
              value={form.correo}
              onChange={(e) =>
                setForm((f) => ({ ...f, correo: e.target.value }))
              }
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UsuariosPage
