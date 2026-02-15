import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
} from "lucide-react";

function formatMoney(n: number) {
  return `S/ ${Number(n).toFixed(2)}`;
}

export default function Dashboard() {
  const [ventasHoy, setVentasHoy] = useState({ totalVentas: 0, montoTotal: 0 });
  const [ventasMes, setVentasMes] = useState({ totalVentas: 0, montoTotal: 0 });
  const [ventasAnio, setVentasAnio] = useState({ totalVentas: 0, montoTotal: 0 });
  const [pedidosEstado, setPedidosEstado] = useState({ pedidosFacturados: 0, pedidosAnulados: 0 });
  const [productoMasVendido, setProductoMasVendido] = useState<{ nombre: string; cantidadVendida: number } | null>(null);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [ultimasVentas, setUltimasVentas] = useState<{ id: number; clienteNombre: string; total: number; fecha: string }[]>([]);
  const [productosStock, setProductosStock] = useState<{ nombre: string; stock: number; stockMinimoAlerta: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().slice(0, 10);
    const year = hoy.getFullYear();
    const month = hoy.getMonth() + 1;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ventasDiaRes, ventasMesRes, ventasAnioRes, pedidosRes, stockBajoRes, ventasListRes] = await Promise.all([
          api.get("/api/dashboard/ventas-dia", { params: { fecha: fechaHoy } }),
          api.get("/api/dashboard/ventas-mes", { params: { year, month } }),
          api.get("/api/dashboard/ventas-anio", { params: { year } }),
          api.get("/api/dashboard/pedidos-estado", { params: { year, month } }),
          api.get("/api/inventario/stock-bajo", { params: { limite: 10, size: 10 } }),
          api.get("/api/ventas", { params: { page: 0, size: 5 } }),
        ]);
        setVentasHoy(ventasDiaRes.data);
        setVentasMes(ventasMesRes.data);
        setVentasAnio(ventasAnioRes.data);
        setPedidosEstado(pedidosRes.data ?? { pedidosFacturados: 0, pedidosAnulados: 0 });
        setStockBajoCount(stockBajoRes.data?.totalElements ?? 0);
        setUltimasVentas(ventasListRes.data?.content ?? []);
        setProductosStock((stockBajoRes.data?.content ?? []).map((p: { nombre?: string; stock?: number }) => ({
          nombre: p.nombre ?? "—",
          stock: p.stock ?? 0,
          stockMinimoAlerta: null as number | null,
        })));
      } catch (e) {
        setError("Error al cargar el resumen");
      }
      try {
        const pmv = await api.get("/api/dashboard/producto-mas-vendido");
        setProductoMasVendido(pmv.data);
      } catch {
        setProductoMasVendido(null);
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Cargando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general de la bodega</p>
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Ventas Hoy"
          value={formatMoney(Number(ventasHoy.montoTotal))}
          change={`${ventasHoy.totalVentas} ventas`}
          changeType="neutral"
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatMoney(Number(ventasMes.montoTotal))}
          change={`${ventasMes.totalVentas} ventas`}
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Ventas del Año"
          value={formatMoney(Number(ventasAnio.montoTotal))}
          change={`${ventasAnio.totalVentas} ventas`}
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
        <StatCard
          title="Productos con stock bajo"
          value={String(stockBajoCount)}
          change={stockBajoCount > 0 ? "Revisar inventario" : "Ok"}
          changeType={stockBajoCount > 0 ? "negative" : "positive"}
          icon={Package}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <div className="table-container p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Pedidos del mes
          </h3>
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Facturados</p>
              <p className="text-2xl font-bold text-success">{pedidosEstado.pedidosFacturados}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Anulados</p>
              <p className="text-2xl font-bold text-muted-foreground">{pedidosEstado.pedidosAnulados}</p>
            </div>
          </div>
        </div>
        <div className="table-container p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">
            Producto más vendido
          </h3>
          <p className="text-lg font-medium text-foreground">
            {productoMasVendido
              ? `${productoMasVendido.nombre} (${productoMasVendido.cantidadVendida} und)`
              : "Sin datos"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="table-container">
          <div className="p-5 pb-3">
            <h3 className="text-base font-semibold text-foreground">Últimas Ventas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVentas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">
                      No hay ventas recientes
                    </td>
                  </tr>
                ) : (
                  ultimasVentas.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-primary">{v.id}</td>
                      <td className="px-5 py-3 text-foreground">{v.clienteNombre}</td>
                      <td className="px-5 py-3 font-semibold text-foreground">{formatMoney(Number(v.total))}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {v.fecha ? new Date(v.fecha).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-container">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Alertas de Stock</h3>
            <a href="/productos" className="text-sm text-primary hover:underline">
              Ver todo
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stock</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Mínimo</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosStock.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">
                      Sin alertas
                    </td>
                  </tr>
                ) : (
                  productosStock.map((p, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{p.nombre}</td>
                      <td className="px-5 py-3 text-foreground">{p.stock}</td>
                      <td className="px-5 py-3 text-muted-foreground">{p.stockMinimoAlerta ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/10 text-warning">
                          Bajo
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
