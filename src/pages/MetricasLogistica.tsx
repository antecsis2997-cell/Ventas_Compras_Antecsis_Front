import { useEffect, useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface EntregaDetalle {
  ventaId: number;
  fechaVenta: string;
  vendedorId: number | null;
  vendedorNombre: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  distrito: string | null;
  provincia: string | null;
  pais: string | null;
  productoNombre: string | null;
  cantidad: number;
  subtotal: number;
}

export default function MetricasLogistica() {
  const [detalles, setDetalles] = useState<EntregaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedorId, setVendedorId] = useState<string>("");
  const [distrito, setDistrito] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (vendedorId) params.vendedorId = vendedorId;
      if (distrito.trim()) params.distrito = distrito.trim();
      if (provincia.trim()) params.provincia = provincia.trim();
      if (pais.trim()) params.pais = pais.trim();

      const res = await api.get("/api/ventas/logistica/entregas-detalle", { params });
      setDetalles(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDetalles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendedoresUnicos = Array.from(
    new Map(
      detalles
        .filter((d) => d.vendedorId && d.vendedorNombre)
        .map((d) => [d.vendedorId, { id: d.vendedorId!, nombre: d.vendedorNombre! }])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Métricas de entregas (Logística)
        </h1>
        <p className="page-subtitle">
          Entregas del almacén delivery por vendedor, cliente, producto y zona (Distrito, Provincia, País).
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Vendedor</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
          >
            <option value="">Todos</option>
            {vendedoresUnicos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Distrito</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              placeholder="Filtrar por distrito..."
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Provincia</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              placeholder="Filtrar por provincia..."
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">País</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder="Filtrar por país..."
            />
          </div>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={load}
            className="w-full md:w-auto rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Venta</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vendedor</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Cantidad</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Subtotal</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Distrito</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Provincia</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">País</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : detalles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-muted-foreground">
                    No hay entregas que cumplan los filtros seleccionados
                  </td>
                </tr>
              ) : (
                detalles.map((d, idx) => (
                  <tr key={`${d.ventaId}-${idx}`} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">#{d.ventaId}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {d.fechaVenta ? new Date(d.fechaVenta).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3">{d.vendedorNombre ?? "—"}</td>
                    <td className="px-5 py-3">{d.clienteNombre ?? "—"}</td>
                    <td className="px-5 py-3">{d.productoNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-center font-semibold">{d.cantidad}</td>
                    <td className="px-5 py-3 text-right font-semibold text-primary">
                      {formatMoney(Number(d.subtotal))}
                    </td>
                    <td className="px-5 py-3">{d.distrito ?? "—"}</td>
                    <td className="px-5 py-3">{d.provincia ?? "—"}</td>
                    <td className="px-5 py-3">{d.pais ?? "—"}</td>
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
