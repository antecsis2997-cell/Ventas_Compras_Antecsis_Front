import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";

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
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "ventas_" + fechaInicio + "_" + fechaFin + (tipo === "excel" ? ".xlsx" : ".pdf");
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
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Exporte ventas por rango de fechas en Excel o PDF</p>
      </div>

      <div className="table-container p-6 max-w-2xl space-y-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Exportar por rango</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha inicio</label>
              <input
                type="date"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha fin</label>
              <input
                type="date"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
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
      </div>
    </>
  );
}
