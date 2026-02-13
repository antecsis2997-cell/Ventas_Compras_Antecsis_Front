import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const SIZE = 10
const emptyForm = { nombreEmisor: '', productoId: '', descripcion: '', precio: '', estado: 'LEVE' }

function SolicitudesProductoPage() {
  const [list, setList] = useState([])
  const [pendientes, setPendientes] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [productos, setProductos] = useState([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const [res, pend] = await Promise.all([
        api.get('/api/solicitudes-producto', { params: { page: pageNumber, size: SIZE } }),
        api.get('/api/solicitudes-producto/pendientes'),
      ])
      const data = res.data
      setList(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
      setPendientes(pend.data || [])
    } catch {
      setError('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  const openCreate = async () => {
    setForm(emptyForm)
    setFormError(null)
    setShowModal(true)
    try {
      const r = await api.get('/api/productos', { params: { size: 500 } })
      setProductos(r.data.content ?? [])
    } catch {}
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.nombreEmisor?.trim()) { setFormError('Nombre del emisor es obligatorio'); return }
    setSaving(true)
    try {
      await api.post('/api/solicitudes-producto', {
        nombreEmisor: form.nombreEmisor.trim(),
        productoId: form.productoId ? Number(form.productoId) : null,
        descripcion: form.descripcion?.trim() || null,
        precio: form.precio !== '' ? Number(form.precio) : null,
        estado: form.estado || 'LEVE',
      })
      setShowModal(false)
      load(page)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const marcarAtendida = async (id) => {
    try {
      await api.patch(`/api/solicitudes-producto/${id}/atendida`)
      load(page)
    } catch {}
  }

  return (
    <>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white">
          <h5 className="card-title mb-0">Solicitudes pendientes (Logística)</h5>
        </div>
        <div className="card-body">
          {pendientes.length === 0 ? (
            <p className="text-muted mb-0">No hay solicitudes pendientes.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {pendientes.map((s) => (
                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>
                    <strong>{s.nombreEmisor}</strong> — {s.productoNombre || s.descripcion || '—'} — {s.precio != null ? `S/ ${Number(s.precio).toFixed(2)}` : '—'}
                    <span className={`badge ms-2 ${s.estado === 'EMERGENTE' ? 'bg-danger' : 'bg-warning'}`}>{s.estado}</span>
                  </span>
                  <button type="button" className="btn btn-sm btn-success" onClick={() => marcarAtendida(s.id)}>Atendida</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Todas las solicitudes</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openCreate}>Nueva solicitud</button>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {loading && <p>Cargando...</p>}
          {!loading && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr><th>ID</th><th>Emisor</th><th>Producto</th><th>Descripción</th><th>Precio</th><th>Estado</th><th>Atendida</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan="8" className="text-center text-muted">No hay solicitudes.</td></tr>
                    ) : (
                      list.map((s) => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.nombreEmisor}</td>
                          <td>{s.productoNombre ?? '—'}</td>
                          <td>{s.descripcion ?? '—'}</td>
                          <td>{s.precio != null ? `S/ ${Number(s.precio).toFixed(2)}` : '—'}</td>
                          <td><span className={`badge ${s.estado === 'EMERGENTE' ? 'bg-danger' : 'bg-warning'}`}>{s.estado}</span></td>
                          <td>{s.atendida ? 'Sí' : 'No'}</td>
                          <td>{s.fecha ? new Date(s.fecha).toLocaleString() : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-3">
                <span className="text-muted small">Página {page + 1} de {totalPages || 1}</span>
                <div className="btn-group btn-group-sm">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => load(page - 1)} disabled={page === 0}>Anterior</button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => load(page + 1)} disabled={page + 1 >= totalPages}>Siguiente</button>
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
                  <h5 className="modal-title">Nueva solicitud de producto</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar" />
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2">{formError}</div>}
                  <div className="mb-2">
                    <label className="form-label">Nombre emisor *</label>
                    <input type="text" className="form-control" value={form.nombreEmisor} onChange={(e) => setForm((f) => ({ ...f, nombreEmisor: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Producto</label>
                    <select className="form-select" value={form.productoId} onChange={(e) => setForm((f) => ({ ...f, productoId: e.target.value }))}>
                      <option value="">—</option>
                      {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Descripción</label>
                    <input type="text" className="form-control" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Precio</label>
                    <input type="number" step="0.01" className="form-control" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                      <option value="LEVE">Leve (Amarillo)</option>
                      <option value="EMERGENTE">Emergente (Rojo)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SolicitudesProductoPage
