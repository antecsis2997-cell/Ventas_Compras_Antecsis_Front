import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface MetricasVendedor {
  vendedorNombre: string;
  vendedorId: number;
  cantidadEntregas: number;
  montoTotal: number;
}

export default function MetricasLogistica() {
  const [metricas, setMetricas] = useState<MetricasVendedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/ventas/metricas-entregas-vendedor");
        setMetricas(Array.isArray(res.data) ? res.data : []);
      } catch {
        setMetricas([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Métricas de entregas por vendedor
        </h1>
        <p className="page-subtitle">Logística mide las entregas del delivery por vendedor</p>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vendedor</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Cantidad entregas</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Monto total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">Cargando...</td>
                </tr>
              ) : metricas.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                    No hay datos de entregas por vendedor
                  </td>
                </tr>
              ) : (
                metricas.map((m) => (
                  <tr key={m.vendedorId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{m.vendedorNombre}</td>
                    <td className="px-5 py-3 text-center font-semibold">{m.cantidadEntregas}</td>
                    <td className="px-5 py-3 text-right font-semibold text-primary">
                      {formatMoney(Number(m.montoTotal))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
