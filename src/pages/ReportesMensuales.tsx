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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getFirstLastDay(year: number, month: number) {
  const first = year + "-" + String(month).padStart(2, "0") + "-01";
  const last = new Date(year, month, 0);
  const lastStr = last.toISOString().slice(0, 10);
  return { first, last: lastStr };
}

export default function ReportesMensuales() {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [data, setData] = useState<ReporteVentasDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get("/api/dashboard/ventas-mes", { params: { year, month } })
      .then((res) => setData(res.data))
      .catch(() => setData({ totalVentas: 0, montoTotal: 0, completadas: 0, anuladas: 0, pendientes: 0 }))
      .finally(() => setLoading(false));
  }, [year, month]);

  const periodLabel = useMemo(() => `${MESES[month - 1]} ${year}`, [month, year]);

  const descargar = async (tipo: "excel" | "pdf") => {
    const { first, last } = getFirstLastDay(year, month);
    setDescargando(tipo);
    try {
      const res = await api.get("/api/reportes/ventas-" + tipo, {
        params: { fechaInicio: first, fechaFin: last },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "ventas_" + year + "_" + String(month).padStart(2, "0") + (tipo === "excel" ? ".xlsx" : ".pdf");
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
        <h1 className="page-title">Ventas mensuales</h1>
        <p className="page-subtitle">Serie diaria del mes, composición por estado y descarga</p>
      </div>

      <ReporteVentasVisual
        variant="mes"
        data={data}
        loading={loading}
        periodLabel={periodLabel}
        filters={
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Año</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[130px] shadow-sm">
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
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Mes</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[180px] shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {descargando === "pdf" ? "Descargando…" : "PDF"}
            </Button>
          </>
        }
      />
    </>
  );
}
