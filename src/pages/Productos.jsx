import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const SIZE = 10
const CAT_LIST_SIZE = 500

const UNIDADES = [
  { value: '', label: '—' },
  { value: 'UND', label: 'Unidad' },
  { value: 'KG', label: 'Kg' },
  { value: 'MG', label: 'Mg' },
  { value: 'GRAMOS', label: 'Gramos' },
]

const emptyProduct = {
  codigo: '',
  nombre: '',
  descripcion: '',
  precio: '',
  precioCompra: '',
  stock: '',
  categoriaId: '',
  unidadMedida: '',
  imagenUrl: '',
  stockMinimoAlerta: '',
}

function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [categorias, setCategorias] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadProductos = useCallback(async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/productos', {
        params: { page: pageNumber, size: SIZE },
      })
      const data = res.data
      setProductos(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch (err) {
      setError('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProductos(0)
  }, [loadProductos])

  useEffect(() => {
    api
      .get('/api/categorias', { params: { page: 0, size: CAT_LIST_SIZE } })
      .then((res) => setCategorias(res.data.content ?? res.data ?? []))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyProduct)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      codigo: p.codigo ?? '',
      nombre: p.nombre ?? '',
      descripcion: p.descripcion ?? '',
      precio: p.precio != null ? String(p.precio) : '',
      precioCompra: p.precioCompra != null ? String(p.precioCompra) : '',
      stock: p.stock != null ? String(p.stock) : '',
      categoriaId: p.categoriaId != null ? String(p.categoriaId) : '',
      unidadMedida: p.unidadMedida ?? '',
      imagenUrl: p.imagenUrl ?? '',
      stockMinimoAlerta: p.stockMinimoAlerta != null ? String(p.stockMinimoAlerta) : '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    const nombre = form.nombre?.trim()
    const precio = form.precio ? Number(form.precio) : null
    const stock = form.stock !== '' ? Number(form.stock) : null
    if (!nombre) {
      setFormError('El nombre es obligatorio')
      return
    }
    if (precio == null || precio <= 0) {
      setFormError('El precio de venta es obligatorio y debe ser mayor a 0')
      return
    }
    if (stock == null || stock < 0) {
      setFormError('El stock es obligatorio y no puede ser negativo')
      return
    }
    const body = {
      codigo: form.codigo?.trim() || null,
      nombre,
      descripcion: form.descripcion?.trim() || null,
      precio,
      precioCompra: form.precioCompra ? Number(form.precioCompra) : null,
      stock,
      categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
      unidadMedida: form.unidadMedida?.trim() || null,
      imagenUrl: form.imagenUrl?.trim() || null,
      stockMinimoAlerta: form.stockMinimoAlerta !== '' ? Number(form.stockMinimoAlerta) : null,
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/api/productos/${editingId}`, body)
      } else {
        await api.post('/api/productos', body)
      }
      setShowModal(false)
      loadProductos(page)
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Error al guardar el producto'
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
      await api.delete(`/api/productos/${deleteId}`)
      setDeleteId(null)
      loadProductos(page)
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
          <h5 className="card-title mb-0">Productos</h5>
          <button className="btn btn-sm btn-primary" type="button" onClick={openCreate}>
            Nuevo producto
          </button>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}
          {loading && <p>Cargando productos...</p>}
          {!loading && (
            <>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Unidad</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Activo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center text-muted">
                          No hay productos.
                        </td>
                      </tr>
                    ) : (
                      productos.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{p.codigo ?? '—'}</td>
                          <td>{p.nombre}</td>
                          <td>{p.categoriaNombre ?? '—'}</td>
                          <td>{p.unidadMedida ?? '—'}</td>
                          <td>S/ {p.precio != null ? Number(p.precio).toFixed(2) : '—'}</td>
                          <td>{p.stock}</td>
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
                    onClick={() => loadProductos(page - 1)}
                    disabled={page === 0}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => loadProductos(page + 1)}
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
                    {editingId ? 'Editar producto' : 'Nuevo producto'}
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
                    <label className="form-label">Código</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.codigo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, codigo: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.nombre}
                      maxLength={50}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nombre: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.descripcion}
                      maxLength={50}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, descripcion: e.target.value }))
                      }
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Precio venta *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={form.precio}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, precio: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Precio compra</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={form.precioCompra}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, precioCompra: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="mb-2 mt-2">
                    <label className="form-label">Stock *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.stock}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stock: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Unidad</label>
                    <select
                      className="form-select"
                      value={form.unidadMedida}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unidadMedida: e.target.value }))
                      }
                    >
                      {UNIDADES.map((u) => (
                        <option key={u.value || 'x'} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">URL imagen</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://..."
                      value={form.imagenUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, imagenUrl: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Stock mínimo (alerta)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.stockMinimoAlerta}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, stockMinimoAlerta: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Categoría</label>
                    <select
                      className="form-select"
                      value={form.categoriaId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, categoriaId: e.target.value }))
                      }
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
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
                ¿Eliminar este producto? Esta acción no se puede deshacer.
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

export default ProductosPage
