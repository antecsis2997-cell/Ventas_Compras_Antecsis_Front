import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface CompraRow {
  id: number;
  fecha: string;
  proveedorNombre: string;
  total: number;
  estado: string;
}

function formatNumCompra(id: number) {
  return "C-" + String(id).padStart(3, "0");
}

export default function Compras() {
  const [search, setSearch] = useState("");
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadCompras = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/compras", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setCompras(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setCompras([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompras(0);
  }, [loadCompras]);

  const filtered = compras.filter(
    (c) =>
      c.proveedorNombre?.toLowerCase().includes(search.toLowerCase()) ||
      String(c.id).includes(search)
  );

  const estadoBadge = (estado: string) => {
    const map: Record<string, { style: string; label: string }> = {
      COMPLETADA: { style: "bg-success/10 text-success", label: "Recibido" },
      ANULADA: { style: "bg-destructive/10 text-destructive", label: "Anulado" },
    };
    const { style, label } = map[estado] ?? { style: "bg-muted text-muted-foreground", label: estado };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
  };

  const handleAnular = async (id: number) => {
    if (!confirm("¿Anular esta compra?")) return;
    try {
      await api.patch(`/api/compras/${id}/anular`);
      loadCompras(page);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Trazabilidad de compras y proveedores</p>
        </div>
        <Button type="button"><Plus className="mr-2 h-4 w-4" />Nueva Compra</Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar compra o proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">N° Compra</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Proveedor</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Items</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">No hay compras</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-primary">{formatNumCompra(c.id)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.fecha ? new Date(c.fecha).toISOString().slice(0, 10) : "—"}</td>
                    <td className="px-5 py-3 text-foreground">{c.proveedorNombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">—</td>
                    <td className="px-5 py-3 font-semibold text-foreground">S/ {Number(c.total).toFixed(2)}</td>
                    <td className="px-5 py-3">{estadoBadge(c.estado)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Anular" onClick={() => handleAnular(c.id)} disabled={c.estado === "ANULADA"}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages || 1}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadCompras(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadCompras(page + 1)}>Siguiente</Button>
        </div>
      </div>
    </>
  );
}
