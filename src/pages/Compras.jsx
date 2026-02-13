import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const SIZE = 10
const LIST_SIZE = 500

function ComprasPage() {
  const [compras, setCompras] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [proveedores, setProveedores] = useState([])
  const [metodosPago, setMetodosPago] = useState([])
  const [productos, setProductos] = useState([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [form, setForm] = useState({
    proveedorId: '',
    metodoPagoId: '',
    observaciones: '',
    numeroDocumento: '',
    items: [{ productoId: '', cantidad: 1, precioUnitario: '' }],
  })

  const loadCompras = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/compras', {
        params: { page: pageNumber, size: SIZE },
      })
      const data = response.data
      setCompras(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las compras')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCompras(0)
  }, [loadCompras])

  const openModal = async () => {
    setForm({
      proveedorId: '',
      metodoPagoId: '',
      observaciones: '',
      numeroDocumento: '',
      items: [{ productoId: '', cantidad: 1, precioUnitario: '' }],
    })
    setFormError(null)
    setShowModal(true)
    try {
      const [provRes, metodosRes, productosRes] = await Promise.all([
        api.get('/api/proveedores', { params: { page: 0, size: LIST_SIZE } }),
        api.get('/api/metodos-pago'),
        api.get('/api/productos', { params: { page: 0, size: LIST_SIZE } }),
      ])
      setProveedores(provRes.data.content ?? provRes.data ?? [])
      setMetodosPago(metodosRes.data ?? [])
      setProductos(productosRes.data.content ?? productosRes.data ?? [])
    } catch (e) {
      setFormError('No se pudieron cargar proveedores, productos o métodos de pago')
    }
  }

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, { productoId: '', cantidad: 1, precioUnitario: '' }],
    }))
  }

  const removeItem = (index) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }))
  }

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === index ? { ...it, [field]: value } : it
      ),
    }))
  }

  const handleSubmitCompra = async (e) => {
    e.preventDefault()
    setFormError(null)
    const proveedorId = form.proveedorId ? Number(form.proveedorId) : null
    if (!proveedorId) {
      setFormError('Seleccione un proveedor')
      return
    }
    const items = form.items
      .filter(
        (it) =>
          it.productoId &&
          it.cantidad > 0 &&
          it.precioUnitario !== '' &&
          Number(it.precioUnitario) > 0
      )
      .map((it) => ({
        productoId: Number(it.productoId),
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
      }))
    if (items.length === 0) {
      setFormError('Agregue al menos un producto con cantidad y precio unitario')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/compras', {
        proveedorId,
        metodoPagoId: form.metodoPagoId ? Number(form.metodoPagoId) : null,
        observaciones: form.observaciones || null,
        numeroDocumento: form.numeroDocumento || null,
        items,
      })
      setShowModal(false)
      loadCompras(page)
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Error al registrar la compra'
      )
    } finally {
      setSaving(false)
    }
  }

  const formatFecha = (f) => {
    if (!f) return '—'
    try {
      const d = new Date(f)
      return Number.isNaN(d.getTime()) ? f : d.toLocaleString()
    } catch {
      return f
    }
  }

  return (
    <>
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Compras</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openModal}>
            Nueva compra
          </button>
        </div>
        <div className="card-body">
          {loading && <p>Cargando compras...</p>}
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Documento</th>
                      <th>Usuario</th>
                      <th>Método de pago</th>
                      <th>Total</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted">
                          No hay compras registradas.
                        </td>
                      </tr>
                    ) : (
                      compras.map((c) => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td>{formatFecha(c.fecha)}</td>
                          <td>{c.proveedorNombre}</td>
                          <td>{c.numeroDocumento ?? '—'}</td>
                          <td>{c.usuarioNombre}</td>
                          <td>{c.metodoPagoNombre ?? '—'}</td>
                          <td>
                            S/ {c.total != null ? Number(c.total).toFixed(2) : '0.00'}
                          </td>
                          <td>{c.estado}</td>
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
                    onClick={() => loadCompras(page - 1)}
                    disabled={page === 0}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => loadCompras(page + 1)}
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
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <form onSubmit={handleSubmitCompra}>
                <div className="modal-header">
                  <h5 className="modal-title">Nueva compra</h5>
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
                  <div className="mb-3">
                    <label className="form-label">Proveedor *</label>
                    <select
                      className="form-select"
                      value={form.proveedorId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, proveedorId: e.target.value }))
                      }
                      required
                    >
                      <option value="">Seleccione...</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label">Nº documento</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.numeroDocumento}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, numeroDocumento: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Método de pago</label>
                      <select
                        className="form-select"
                        value={form.metodoPagoId}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, metodoPagoId: e.target.value }))
                        }
                      >
                        <option value="">Sin especificar</option>
                        {metodosPago.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3 mt-2">
                    <label className="form-label">Observaciones</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.observaciones}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2 d-flex justify-content-between align-items-center">
                    <label className="form-label mb-0">Detalle (producto, cantidad, precio unit.) *</label>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addItem}>
                      + Agregar línea
                    </button>
                  </div>
                  {form.items.map((item, index) => (
                    <div key={index} className="row g-2 mb-2 align-items-end">
                      <div className="col-4">
                        <select
                          className="form-select form-select-sm"
                          value={item.productoId}
                          onChange={(e) =>
                            updateItem(index, 'productoId', e.target.value)
                          }
                        >
                          <option value="">Producto...</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min="1"
                          placeholder="Cant."
                          value={item.cantidad}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'cantidad',
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                        />
                      </div>
                      <div className="col-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          min="0"
                          step="0.01"
                          placeholder="P. unit."
                          value={item.precioUnitario}
                          onChange={(e) =>
                            updateItem(index, 'precioUnitario', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length === 1}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))}
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
                    {saving ? 'Guardando...' : 'Registrar compra'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ComprasPage
