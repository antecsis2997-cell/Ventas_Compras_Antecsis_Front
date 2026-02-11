function DashboardPage() {
  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">
                Ventas hoy
              </h6>
              <h3 className="mb-0">S/ 0.00</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">
                Compras hoy
              </h6>
              <h3 className="mb-0">S/ 0.00</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">
                Stock total
              </h6>
              <h3 className="mb-0">0</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-6 col-lg-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted text-uppercase mb-2">
                Productos bajos de stock
              </h6>
              <h3 className="mb-0 text-danger">0</h3>
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
            Aquí podrás ver las métricas principales de ventas y compras de tu bodega,
            gestionar productos, clientes, proveedores y usuarios. Más adelante
            conectaremos estos widgets a tu API de Spring Boot.
          </p>
        </div>
      </div>
    </>
  )
}

export default DashboardPage

