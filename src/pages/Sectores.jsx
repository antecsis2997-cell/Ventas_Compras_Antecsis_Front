import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const SIZE = 10
const emptyForm = { nombreSector: '', telefono: '', direccion: '' }

function SectoresPage() {
  const [list, setList] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/sectores', { params: { page: pageNumber, size: SIZE } })
      const data = res.data
      setList(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      setError('Error al cargar sectores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(0) }, [load])

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormError(null); setShowModal(true) }
  const openEdit = (s) => {
    setEditingId(s.id)
    setForm({ nombreSector: s.nombreSector ?? '', telefono: s.telefono ?? '', direccion: s.direccion ?? '' })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.nombreSector?.trim()) { setFormError('Nombre del sector es obligatorio'); return }
    setSaving(true)
    try {
      if (editingId) await api.put(`/api/sectores/${editingId}`, form)
      else await api.post('/api/sectores', form)
      setShowModal(false)
      load(page)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/api/sectores/${deleteId}`)
      setDeleteId(null)
      load(page)
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
          <h5 className="card-title mb-0">Sectores / Sedes</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openCreate}>Nuevo sector</button>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {loading && <p>Cargando...</p>}
          {!loading && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead><tr><th>ID</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th></th></tr></thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan="5" className="text-center text-muted">No hay sectores.</td></tr>
                    ) : (
                      list.map((s) => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.nombreSector}</td>
                          <td>{s.telefono ?? '—'}</td>
                          <td>{s.direccion ?? '—'}</td>
                          <td>
                            <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(s)}>Editar</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteId(s.id)}>Eliminar</button>
                          </td>
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
                  <h5 className="modal-title">{editingId ? 'Editar sector' : 'Nuevo sector'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar" />
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2">{formError}</div>}
                  <div className="mb-2">
                    <label className="form-label">Nombre sector *</label>
                    <input type="text" className="form-control" value={form.nombreSector} onChange={(e) => setForm((f) => ({ ...f, nombreSector: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Teléfono</label>
                    <input type="text" className="form-control" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Dirección</label>
                    <input type="text" className="form-control" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} />
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

      {deleteId != null && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Confirmar</h5><button type="button" className="btn-close" onClick={() => setDeleteId(null)} /></div>
              <div className="modal-body">¿Eliminar este sector?</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={doDelete} disabled={deleting}>{deleting ? '...' : 'Eliminar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SectoresPage
