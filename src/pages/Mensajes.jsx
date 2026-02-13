import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getUsernameFromToken } from '../utils/jwt'

const SIZE = 15
const emptyForm = { nombreReceptor: '', item: '', descripcion: '', precio: '', estado: 'LEVE', nombreEmisor: '' }

function MensajesPage() {
  const { token } = useAuth()
  const username = getUsernameFromToken(token)
  const [list, setList] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/mensajes', { params: { page: pageNumber, size: SIZE } })
      const data = res.data
      setList(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      setError('Error al cargar mensajes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  const openCreate = () => {
    setForm({ ...emptyForm, nombreEmisor: username || '' })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.nombreReceptor?.trim()) { setFormError('Nombre del receptor es obligatorio'); return }
    setSaving(true)
    try {
      await api.post('/api/mensajes', {
        nombreReceptor: form.nombreReceptor.trim(),
        item: form.item?.trim() || null,
        descripcion: form.descripcion?.trim() || null,
        precio: form.precio !== '' ? Number(form.precio) : null,
        estado: form.estado || null,
        nombreEmisor: form.nombreEmisor?.trim() || null,
      })
      setShowModal(false)
      load(page)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al enviar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Mensajes (CHAT)</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openCreate}>Nuevo mensaje</button>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {loading && <p>Cargando...</p>}
          {!loading && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr><th>ID</th><th>Receptor</th><th>Emisor</th><th>Item</th><th>Descripción</th><th>Precio</th><th>Estado</th><th>Fecha</th></tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan="8" className="text-center text-muted">No hay mensajes.</td></tr>
                    ) : (
                      list.map((m) => (
                        <tr key={m.id}>
                          <td>{m.id}</td>
                          <td>{m.nombreReceptor}</td>
                          <td>{m.nombreEmisor ?? '—'}</td>
                          <td>{m.item ?? '—'}</td>
                          <td>{m.descripcion ?? '—'}</td>
                          <td>{m.precio != null ? `S/ ${Number(m.precio).toFixed(2)}` : '—'}</td>
                          <td>{m.estado ? <span className={`badge ${m.estado === 'EMERGENTE' ? 'bg-danger' : 'bg-warning'}`}>{m.estado}</span> : '—'}</td>
                          <td>{m.fecha ? new Date(m.fecha).toLocaleString() : '—'}</td>
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
                  <h5 className="modal-title">Enviar mensaje</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar" />
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2">{formError}</div>}
                  <div className="mb-2">
                    <label className="form-label">Receptor *</label>
                    <input type="text" className="form-control" value={form.nombreReceptor} onChange={(e) => setForm((f) => ({ ...f, nombreReceptor: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Emisor</label>
                    <input type="text" className="form-control" value={form.nombreEmisor} onChange={(e) => setForm((f) => ({ ...f, nombreEmisor: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Item</label>
                    <input type="text" className="form-control" value={form.item} onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))} />
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
                      <option value="">—</option>
                      <option value="LEVE">Leve (Amarillo)</option>
                      <option value="EMERGENTE">Emergente (Rojo)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enviando...' : 'Enviar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MensajesPage
