import { useEffect, useState } from 'react'
import api from '../api/client'

function DashboardPage() {
  const [ventasHoy, setVentasHoy] = useState({ totalVentas: 0, montoTotal: 0 })
  const [ventasMes, setVentasMes] = useState({ totalVentas: 0, montoTotal: 0 })
  const [ventasAnio, setVentasAnio] = useState({ totalVentas: 0, montoTotal: 0 })
  const [productoMasVendido, setProductoMasVendido] = useState(null)
  const [stockBajoCount, setStockBajoCount] = useState(0)
  const [pedidosEstado, setPedidosEstado] = useState({ pedidosFacturados: 0, pedidosAnulados: 0 })
  const [showAlertaStock, setShowAlertaStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [reporteInicio, setReporteInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [reporteFin, setReporteFin] = useState(() => new Date().toISOString().slice(0, 10))
  const [reporteDescargando, setReporteDescargando] = useState(null)

  useEffect(() => {
    const hoy = new Date()
    const fechaHoy = hoy.toISOString().slice(0, 10)
    const year = hoy.getFullYear()
    const month = hoy.getMonth() + 1

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [ventasDiaRes, ventasMesRes, ventasAnioRes, stockBajoRes, pedidosRes] = await Promise.all([
          api.get('/api/dashboard/ventas-dia', { params: { fecha: fechaHoy } }),
          api.get('/api/dashboard/ventas-mes', { params: { year, month } }),
          api.get('/api/dashboard/ventas-anio', { params: { year } }),
          api.get('/api/inventario/stock-bajo', { params: { limite: 5, size: 1 } }),
          api.get('/api/dashboard/pedidos-estado', { params: { year, month } }),
        ])
        setVentasHoy(ventasDiaRes.data)
        setVentasMes(ventasMesRes.data)
        setVentasAnio(ventasAnioRes.data)
        setStockBajoCount(stockBajoRes.data.totalElements ?? 0)
        setPedidosEstado(pedidosRes.data || { pedidosFacturados: 0, pedidosAnulados: 0 })
      } catch (e) {
        setError('Error al cargar el resumen')
      }

      try {
        const pmv = await api.get('/api/dashboard/producto-mas-vendido')
        setProductoMasVendido(pmv.data)
      } catch {
        setProductoMasVendido(null)
      }

      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    if (!loading && stockBajoCount > 0) setShowAlertaStock(true)
  }, [loading, stockBajoCount])

  const descargarReporte = async (tipo) => {
    setReporteDescargando(tipo)
    try {
      const res = await api.get(`/api/reportes/ventas-${tipo}`, {
        params: { fechaInicio: reporteInicio, fechaFin: reporteFin },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `ventas_${reporteInicio}_${reporteFin}.${tipo === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setReporteDescargando(null)
    }
  }

  const formatMoney = (n) =>
    typeof n === 'number' ? `S/ ${n.toFixed(2)}` : `S/ ${Number(n || 0).toFixed(2)}`

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <span>Cargando resumen...</span>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div className="alert alert-warning py-2" role="alert">
          {error}
        </div>
      )}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Ventas hoy</h6>
              <h3 className="mb-0">{formatMoney(ventasHoy.montoTotal)}</h3>
              <small className="text-muted">{ventasHoy.totalVentas} ventas</small>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Ventas del mes</h6>
              <h3 className="mb-0">{formatMoney(ventasMes.montoTotal)}</h3>
              <small className="text-muted">{ventasMes.totalVentas} ventas</small>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Ventas del año</h6>
              <h3 className="mb-0">{formatMoney(ventasAnio.montoTotal)}</h3>
              <small className="text-muted">{ventasAnio.totalVentas} ventas</small>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Producto más vendido</h6>
              <h3 className="mb-0 small">
                {productoMasVendido
                  ? `${productoMasVendido.nombre} (${productoMasVendido.cantidadVendida})`
                  : 'Sin datos'}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Productos con stock bajo</h6>
              <h3 className={`mb-0 ${stockBajoCount > 0 ? 'text-danger' : ''}`}>{stockBajoCount}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm border-primary">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Pedidos facturados (mes)</h6>
              <h3 className="mb-0 text-success">{pedidosEstado.pedidosFacturados}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">Pedidos anulados (mes)</h6>
              <h3 className="mb-0 text-secondary">{pedidosEstado.pedidosAnulados}</h3>
            </div>
          </div>
        </div>
      </div>

      {showAlertaStock && stockBajoCount > 0 && (
        <div className="modal d-block bg-dark bg-opacity-25" tabIndex="-1" style={{ overflow: 'auto' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title text-danger">Alerta: stock bajo</h5>
                <button type="button" className="btn-close" onClick={() => setShowAlertaStock(false)} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                Hay <strong>{stockBajoCount}</strong> producto(s) con stock por debajo del mínimo. Revise la sección Productos o Inventario.
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-primary" onClick={() => setShowAlertaStock(false)}>Entendido</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="card-title mb-0">Reportes (Excel / PDF)</h5>
        </div>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-auto">
              <label className="form-label small mb-0">Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={reporteInicio}
                onChange={(e) => setReporteInicio(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small mb-0">Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={reporteFin}
                onChange={(e) => setReporteFin(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-success"
                disabled={reporteDescargando !== null}
                onClick={() => descargarReporte('excel')}
              >
                {reporteDescargando === 'excel' ? '...' : 'Descargar Excel'}
              </button>
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                disabled={reporteDescargando !== null}
                onClick={() => descargarReporte('pdf')}
              >
                {reporteDescargando === 'pdf' ? '...' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h5 className="card-title mb-0">Resumen rápido</h5>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0">
            Ventas del día, mes y año; producto más vendido; productos con stock bajo (≤5).
            Descarga reportes en Excel o PDF por rango de fechas.
          </p>
        </div>
      </div>
    </>
  )
}

export default DashboardPage
