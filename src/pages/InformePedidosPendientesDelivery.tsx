import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Truck, Clock, Navigation, CheckCircle2 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type DashboardPedidosPendientesDeliveryDTO = {
  totalRequiereDelivery: number;
  pendientes: number;
  enCamino: number;
  entregados: number;
};

export default function InformePedidosPendientesDelivery() {
  const [data, setData] = useState<DashboardPedidosPendientesDeliveryDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/api/dashboard/pedidos-pendientes-delivery")
      .then((res) => {
        if (!mounted) return;
        setData(res.data);
      })
      .catch(() => {
        if (!mounted) return;
        setData({ totalRequiereDelivery: 0, pendientes: 0, enCamino: 0, entregados: 0 });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const donutData = useMemo(() => {
    const pendientes = data?.pendientes ?? 0;
    const enCamino = data?.enCamino ?? 0;
    return [
      { name: "Pendientes", value: pendientes },
      { name: "En camino", value: enCamino },
    ];
  }, [data]);

  const totalPendientes = (data?.pendientes ?? 0) + (data?.enCamino ?? 0);
  const porcentajePendientes =
    totalPendientes === 0 ? 0 : Math.round(((data?.pendientes ?? 0) / totalPendientes) * 100);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Informe pendientes (delivery)
        </h1>
        <p className="page-subtitle">
          Órdenes que requieren delivery y aún no se han entregado, agrupadas por estadoEntrega.
        </p>
      </div>

      {loading || !data ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Pendientes
              </div>
              <div className="text-3xl font-bold text-foreground">{data.pendientes}</div>
              <div className="text-xs text-muted-foreground">
                {porcentajePendientes}% del total pendiente
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4" />
                En camino
              </div>
              <div className="text-3xl font-bold text-foreground">{data.enCamino}</div>
              <div className="text-xs text-muted-foreground">
                {data.totalRequiereDelivery === 0 ? "—" : `${Math.round(((data.enCamino) / Math.max(1, data.totalRequiereDelivery)) * 100)}%`}
                {" "}del total que requiere delivery
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Entregados
              </div>
              <div className="text-3xl font-bold text-foreground">{data.entregados}</div>
              <div className="text-xs text-muted-foreground">Referencia (entregados)</div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">
              Distribución de pendientes
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-center">
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="none"
                    >
                      <Cell fill="#4f46e5" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Total pendiente</div>
                  <div className="text-2xl font-bold text-foreground">{totalPendientes}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">Pendientes</div>
                  <div className="text-2xl font-bold text-foreground">{data.pendientes}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalPendientes === 0 ? 0 : `${Math.round((data.pendientes / totalPendientes) * 100)}%`}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">En camino</div>
                  <div className="text-2xl font-bold text-foreground">{data.enCamino}</div>
                  <div className="text-xs text-muted-foreground">
                    {totalPendientes === 0 ? 0 : `${Math.round((data.enCamino / totalPendientes) * 100)}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

