import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";

function formatMoney(n: number) {
  return `S/ ${Number(n).toFixed(2)}`;
}

export default function ReportesAnuales() {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [data, setData] = useState<{ totalVentas: number; montoTotal: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get("/api/dashboard/ventas-anio", { params: { year } })
      .then((res) => setData(res.data))
      .catch(() => setData({ totalVentas: 0, montoTotal: 0 }))
      .finally(() => setLoading(false));
  }, [year]);

  const descargar = async (tipo: "excel" | "pdf") => {
    const first = `${year}-01-01`;
    const last = `${year}-12-31`;
    setDescargando(tipo);
    try {
      const res = await api.get(`/api/reportes/ventas-${tipo}`, {
        params: { fechaInicio: first, fechaFin: last },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ventas_${year}.${tipo === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setDescargando(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ventas Anuales</h1>
        <p className="page-subtitle">Consulte las ventas de un año y descargue el reporte</p>
      </div>

      <div className="table-container p-6 max-w-2xl space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Año</label>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : data ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Resumen del año {year}</h3>
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
