import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, FileText } from "lucide-react";
import { ReporteVentasVisual, type ReporteVentasDTO } from "@/components/reportes/ReporteVentasVisual";

export default function ReportesAnuales() {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [data, setData] = useState<ReporteVentasDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/dashboard/ventas-anio", { params: { year } })
      .then((res) => setData(res.data))
      .catch(() => setData({ totalVentas: 0, montoTotal: 0, completadas: 0, anuladas: 0, pendientes: 0 }))
      .finally(() => setLoading(false));
  }, [year]);

  const periodLabel = useMemo(() => `Año fiscal ${year}`, [year]);

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

  const years = Array.from({ length: 8 }, (_, i) => hoy.getFullYear() - i);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ventas anuales</h1>
        <p className="page-subtitle">Barras + tendencia por mes, KPIs anuales y exportación</p>
      </div>

      <ReporteVentasVisual
        variant="anio"
        data={data}
        loading={loading}
        periodLabel={periodLabel}
        filters={
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Año</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[140px] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        exportSlot={
          <>
            <Button variant="outline" className="gap-2 shadow-sm" disabled={descargando !== null} onClick={() => descargar("excel")}>
              <FileSpreadsheet className="h-4 w-4" />
              {descargando === "excel" ? "Descargando…" : "Excel"}
            </Button>
            <Button variant="outline" className="gap-2 shadow-sm" disabled={descargando !== null} onClick={() => descargar("pdf")}>
              <FileText className="h-4 w-4" />
              {descargando === "pdf" ? "Descargando…" : "PDF"}
            </Button>
          </>
        }
      />
    </>
  );
}
