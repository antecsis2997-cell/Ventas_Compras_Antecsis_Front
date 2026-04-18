import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, FileSpreadsheet, FileText } from "lucide-react";
import { ReporteVentasVisual, type ReporteVentasDTO } from "@/components/reportes/ReporteVentasVisual";
import { openReportBlobInNewTab } from "@/lib/openReportInNewTab";
import { toast } from "sonner";

function periodoLargo(fecha: string) {
  const d = new Date(fecha + "T12:00:00");
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ReportesDiarias() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<ReporteVentasDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    if (!fecha) return;
    setLoading(true);
    api
      .get("/api/dashboard/ventas-dia", { params: { fecha } })
      .then((res) => setData(res.data))
      .catch(() => setData({ totalVentas: 0, montoTotal: 0, completadas: 0, anuladas: 0, pendientes: 0 }))
      .finally(() => setLoading(false));
  }, [fecha]);

  const periodLabel = useMemo(() => periodoLargo(fecha), [fecha]);

  const descargar = async (tipo: "excel" | "pdf") => {
    setDescargando(tipo);
    try {
      const res = await api.get("/api/reportes/ventas-" + tipo, {
        params: { fechaInicio: fecha, fechaFin: fecha },
        responseType: "blob",
      });
      if (
        !openReportBlobInNewTab(res, tipo, {
          excelFileName: "ventas_" + fecha + ".xlsx",
        })
      ) {
        toast.error("Permita ventanas emergentes para ver el archivo.");
      }
    } catch {
      // no-op
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ventas diarias</h1>
        <p className="page-subtitle">Análisis por día con curva horaria, KPIs y exportación</p>
      </div>

      <ReporteVentasVisual
        variant="dia"
        data={data}
        loading={loading}
        periodLabel={periodLabel}
        filters={
          <div className="space-y-2">
            <Label htmlFor="rep-dia-fecha" className="text-xs font-medium text-muted-foreground">
              Fecha
            </Label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="rep-dia-fecha"
                type="date"
                className="w-[min(100%,220px)]"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
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
              {descargando === "pdf" ? "Abriendo…" : "PDF"}
            </Button>
          </>
        }
      />
    </>
  );
}
