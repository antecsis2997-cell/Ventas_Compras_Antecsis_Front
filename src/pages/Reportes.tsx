import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, FolderOutput, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { openReportBlobInNewTab } from "@/lib/openReportInNewTab";
import { toast } from "sonner";

export default function Reportes() {
  const hoy = new Date().toISOString().slice(0, 10);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  const descargar = async (tipo: "excel" | "pdf") => {
    setDescargando(tipo);
    try {
      const res = await api.get("/api/reportes/ventas-" + tipo, {
        params: { fechaInicio, fechaFin },
        responseType: "blob",
      });
      if (
        !openReportBlobInNewTab(res, tipo, {
          excelFileName: "ventas_" + fechaInicio + "_" + fechaFin + ".xlsx",
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

  const enlaces = [
    { to: "/reportes/diarias", title: "Vista diaria", desc: "Curva por hora y KPIs del día" },
    { to: "/reportes/mensuales", title: "Vista mensual", desc: "Serie diaria y donut de estados" },
    { to: "/reportes/anuales", title: "Vista anual", desc: "Barras por mes y tendencia" },
  ] as const;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Exporte por rango libre o abra informes con gráficos detallados</p>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 pb-8">
        <div className="grid gap-4 md:grid-cols-3">
          {enlaces.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/80 bg-muted/25 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderOutput className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Exportar por rango</h2>
                <p className="text-xs text-muted-foreground">
                  Descarga Excel; el PDF se abre en una nueva pestaña para verlo (sin gráfico).
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <Label htmlFor="rep-ini" className="text-xs font-medium text-muted-foreground">
                  Fecha inicio
                </Label>
                <Input id="rep-ini" type="date" className="w-[200px] shadow-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-fin" className="text-xs font-medium text-muted-foreground">
                  Fecha fin
                </Label>
                <Input id="rep-fin" type="date" className="w-[200px] shadow-sm" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2 shadow-sm" variant="default" disabled={descargando !== null} onClick={() => descargar("excel")}>
                <FileSpreadsheet className="h-4 w-4" />
                {descargando === "excel" ? "Descargando…" : "Descargar Excel"}
              </Button>
              <Button variant="outline" className="gap-2 shadow-sm" disabled={descargando !== null} onClick={() => descargar("pdf")}>
                <FileText className="h-4 w-4" />
                {descargando === "pdf" ? "Abriendo…" : "Ver PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
