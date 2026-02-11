import { useEffect, useState } from 'react'
import api from '../api/client'

function VentasPage() {
  const [ventas, setVentas] = useState([])
  const [page, setPage] = useState(0)
  const [size] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadVentas = async (pageNumber = 0) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/api/ventas', {
        params: {
          page: pageNumber,
          size,
        },
      })
      const data = response.data
      setVentas(data.content || [])
      setPage(data.number ?? pageNumber)
      setTotalPages(data.totalPages ?? 0)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVentas(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePrev = () => {
    if (page > 0) {
      loadVentas(page - 1)
    }
  }

  const handleNext = () => {
    if (page + 1 < totalPages) {
      loadVentas(page + 1)
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Ventas</h5>
        <button className="btn btn-sm btn-primary" type="button" disabled>
          Nueva venta (próximamente)
        </button>
      </div>
      <div className="card-body">
        {loading && <p>Cargando ventas...</p>}
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
                    <th>Cliente</th>
                    <th>Usuario</th>
                    <th>Método de pago</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted">
                        No hay ventas registradas.
                      </td>
                    </tr>
                  ) : (
                    ventas.map((venta) => (
                      <tr key={venta.id}>
                        <td>{venta.id}</td>
                        <td>{venta.fecha}</td>
                        <td>{venta.clienteNombre}</td>
                        <td>{venta.usuarioNombre}</td>
                        <td>{venta.metodoPagoNombre}</td>
                        <td>S/ {venta.total}</td>
                        <td>{venta.estado}</td>
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
                  onClick={handlePrev}
                  disabled={page === 0}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleNext}
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
  )
}

export default VentasPage

