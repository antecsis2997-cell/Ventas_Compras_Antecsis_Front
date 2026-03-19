import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { Calendar, FileSpreadsheet, FileText } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function ReportesDiarias() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<{
    totalVentas: number;
    montoTotal: number;
    graficoLabels?: string[];
    graficoValores?: number[];
    completadas?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    if (!fecha) return;
    setLoading(true);
    api.get("/api/dashboard/ventas-dia", { params: { fecha } })
      .then((res) => setData(res.data))
      .catch(() => setData({ totalVentas: 0, montoTotal: 0 }))
      .finally(() => setLoading(false));
  }, [fecha]);

  const lineData =
    data?.graficoLabels?.map((label, idx) => ({
      label,
      monto: data.graficoValores?.[idx] ?? 0,
    })) ?? [];

  const completadas = Number(data?.completadas ?? 0);
  const otros = Math.max(0, Number(data?.totalVentas ?? 0) - completadas);

  const descargar = async (tipo: "excel" | "pdf") => {
    setDescargando(tipo);
    try {
      const res = await api.get("/api/reportes/ventas-" + tipo, {
        params: { fechaInicio: fecha, fechaFin: fecha },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "ventas_" + fecha + (tipo === "excel" ? ".xlsx" : ".pdf");
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // no-op
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ventas Diarias</h1>
        <p className="page-subtitle">Consulte las ventas de un día y descargue el reporte</p>
      </div>

      <div className="table-container p-6 max-w-2xl space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fecha</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Resumen del día</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de ventas</p>
                <p className="text-2xl font-bold text-foreground">{data.totalVentas}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto total</p>
                <p className="text-2xl font-bold text-foreground">{formatMoney(Number(data.montoTotal))}</p>
              </div>
            </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-base font-semibold text-foreground mb-4">Gráfico de monto</h3>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-center">
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="monto"
                        stroke="#4f46e5"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Completadas</p>
                    <p className="text-2xl font-bold text-success">{completadas}</p>
                  </div>
                  <div className="w-full h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Completadas", value: completadas },
                            { name: "Otros", value: otros },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          stroke="none"
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#94a3b8" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {Number(data.totalVentas) === 0
                      ? "Sin ventas"
                      : `Completadas: ${Math.round((completadas / Number(data.totalVentas)) * 100)}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={descargando !== null} onClick={() => descargar("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {descargando === "excel" ? "Descargando..." : "Descargar Excel"}
          </Button>
          <Button variant="outline" disabled={descargando !== null} onClick={() => descargar("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            {descargando === "pdf" ? "Descargando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>
    </>
  );
}
