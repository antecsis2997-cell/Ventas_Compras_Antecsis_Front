import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const SIZE = 10

const emptyCliente = {
  nombre: '',
  email: '',
  telefono: '',
  tipoDocumento: '',
  documento: '',
  direccion: '',
}

function ClientesPage() {
  const [clientes, setProveedores] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCliente)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadClientes = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/clientes', {
        params: { page: pageNumber, size: SIZE },
      })
      const data = res.data
      setProveedores(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch (err) {
      setError('No se pudieron cargar los clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClientes(0)
  }, [loadClientes])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyCliente)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      nombre: p.nombre ?? '',
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      tipoDocumento: p.tipoDocumento ?? '',
      documento: p.documento ?? '',
      direccion: p.direccion ?? '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const nombre = form.nombre?.trim()
    const email = form.email?.trim()
    const telefono = form.telefono?.trim()
    if (!nombre || !email || !telefono) {
      setFormError('Nombre, email y teléfono son obligatorios')
      return
    }
    const body = {
      nombre,
      email,
      telefono,
      tipoDocumento: form.tipoDocumento?.trim() || null,
      documento: form.documento?.trim() || null,
      direccion: form.direccion?.trim() || null,
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/api/clientes/${editingId}`, body)
      } else {
        await api.post('/api/clientes', body)
      }
      setShowModal(false)
      loadClientes(page)
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Error al guardar el cliente'
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (id) => setDeleteId(id)
  const cancelDelete = () => setDeleteId(null)

  const doDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/api/clientes/${deleteId}`)
      setDeleteId(null)
      loadClientes(page)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Proveedores</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openCreate}>
            Nuevo cliente
          </button>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}
          {loading && <p>Cargando clientes...</p>}
          {!loading && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Documento</th>
                      <th>Activo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No hay clientes.
                        </td>
                      </tr>
                    ) : (
                      clientes.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{p.nombre}</td>
                          <td>{p.email}</td>
                          <td>{p.telefono}</td>
                          <td>{p.documento ?? '—'}</td>
                          <td>{p.activo ? 'Sí' : 'No'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary me-1"
                              onClick={() => openEdit(p)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => confirmDelete(p.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted small">
                  Página {page + 1} de {totalPages || 1}
                </div>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => loadClientes(page - 1)}
                    disabled={page === 0}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => loadClientes(page + 1)}
                    disabled={page + 1 >= totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingId ? 'Editar cliente' : 'Nuevo cliente'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    aria-label="Cerrar"
                  />
                </div>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2">{formError}</div>
                  )}
                  <div className="mb-2">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nombre: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Teléfono *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, telefono: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Tipo documento</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DNI, RUC, etc."
                      value={form.tipoDocumento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tipoDocumento: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Nº documento</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.documento}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, documento: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Dirección</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.direccion}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, direccion: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteId != null && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar eliminación</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelDelete}
                  aria-label="Cerrar"
                />
              </div>
              <div className="modal-body">
                ¿Eliminar este cliente? Esta acción no se puede deshacer.
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={doDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ClientesPage
