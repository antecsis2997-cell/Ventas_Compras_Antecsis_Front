import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/StatCard";
import { formatAppDate } from "@/lib/locale";
import { DashboardAnalytics, type VentasSerieDTO } from "@/components/dashboard/DashboardAnalytics";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  Plus,
  Truck,
  RefreshCw,
  Users,
} from "lucide-react";

function useSaludo() {
  const { t } = useTranslation();
  const h = new Date().getHours();
  if (h < 12) return t("pages.dashboard.greetingMorning");
  if (h < 19) return t("pages.dashboard.greetingAfternoon");
  return t("pages.dashboard.greetingEvening");
}

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const emptySerie = (): VentasSerieDTO => ({
  totalVentas: 0,
  montoTotal: 0,
  graficoLabels: [],
  graficoValores: [],
  completadas: 0,
  anuladas: 0,
  pendientes: 0,
});

export default function Dashboard() {
  const { t } = useTranslation();
  const saludo = useSaludo();
  const { username } = useAuth();
  const [ventasHoy, setVentasHoy] = useState<VentasSerieDTO>(emptySerie);
  const [ventasMes, setVentasMes] = useState<VentasSerieDTO>(emptySerie);
  const [ventasAnio, setVentasAnio] = useState<VentasSerieDTO>(emptySerie);
  const [dashboardYearMonth, setDashboardYearMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
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
    setDashboardYearMonth({ year, month });

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
        setError(t("pages.dashboard.loadError"));
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
          <h1 className="page-title">{t("pages.dashboard.title")}</h1>
          <p className="page-subtitle">{t("common.loading")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header con saludo */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">
            {saludo}, {username ?? t("layout.user")} 👋
          </h1>
          <p className="page-subtitle capitalize">
            {formatAppDate(new Date(), {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link to="/ventas"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ir a</p>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Nueva Venta</p>
          </div>
        </Link>
        <Link to="/compras"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ir a</p>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Nueva Compra</p>
          </div>
        </Link>
        <Link to="/insumos"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group">
          <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ir a</p>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Ajustar Stock</p>
          </div>
        </Link>
        <Link to="/clientes"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ir a</p>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Clientes</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Ventas Hoy"
          value={formatMoney(Number(ventasHoy.montoTotal ?? 0))}
          change={`${ventasHoy.totalVentas} ventas`}
          changeType="neutral"
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Ventas del Mes"
          value={formatMoney(Number(ventasMes.montoTotal ?? 0))}
          change={`${ventasMes.totalVentas} ventas`}
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Ventas del Año"
          value={formatMoney(Number(ventasAnio.montoTotal ?? 0))}
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

      <DashboardAnalytics
        yearLabel={dashboardYearMonth.year}
        monthLabel={MESES_LARGO[dashboardYearMonth.month - 1] ?? ""}
        ventasHoy={ventasHoy}
        ventasMes={ventasMes}
        ventasAnio={ventasAnio}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <div className="table-container p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Pedidos del mes</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Completados</p>
              <p className="text-3xl font-bold text-success">{pedidosEstado.pedidosFacturados}</p>
            </div>
            <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Anulados</p>
              <p className="text-3xl font-bold text-muted-foreground">{pedidosEstado.pedidosAnulados}</p>
            </div>
          </div>
        </div>
        <div className="table-container p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Producto más vendido</h3>
          {productoMasVendido ? (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-4">
              <p className="text-lg font-bold text-foreground">{productoMasVendido.nombre}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-primary">{productoMasVendido.cantidadVendida}</span> unidades vendidas este mes
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin datos disponibles</p>
          )}
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
            <Link to="/insumos" className="text-sm text-primary hover:underline">
              Ver inventario
            </Link>
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
                    <tr key={p.nombre ? `${p.nombre}-${idx}` : idx} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
