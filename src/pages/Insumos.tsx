import { Search, AlertTriangle, ArrowUpCircle, ArrowDownCircle, RefreshCw, History, Image } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { api } from "@/lib/api";
import { formatMoney, type Moneda } from "@/lib/utils";

interface InventarioRow {
  productoId: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  stock: number;
  unidadMedida: string | null;
  stockMinimoAlerta: number | null;
  sectorNombre: string | null;
  imagenUrl?: string | null;
}

interface MovimientoRow {
  id: number;
  productoId: number;
  productoNombre: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string | null;
  referenciaId: number | null;
  usuarioNombre: string | null;
  fecha: string;
}

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  COMPRA: { label: "Compra", color: "text-success bg-success/10" },
  VENTA: { label: "Venta", color: "text-info bg-info/10" },
  ANULACION_COMPRA: { label: "Anul. Compra", color: "text-warning bg-warning/10" },
  ANULACION_VENTA: { label: "Anul. Venta", color: "text-warning bg-warning/10" },
  AJUSTE: { label: "Ajuste", color: "text-primary bg-primary/10" },
};

type Tab = "stock" | "movimientos";

export default function Insumos() {
  const [tab, setTab] = useState<Tab>("stock");
  const [search, setSearch] = useState("");
  const [filterStock, setFilterStock] = useState<"todos" | "bajo">("todos");

  const [items, setItems] = useState<InventarioRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [movPage, setMovPage] = useState(0);
  const [movTotalPages, setMovTotalPages] = useState(0);
  const [movLoading, setMovLoading] = useState(false);
  const [movFilterProducto, setMovFilterProducto] = useState("");

  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [ajusteForm, setAjusteForm] = useState({ productoId: "", nuevoStock: "", motivo: "" });
  const [ajusteError, setAjusteError] = useState("");
  const [ajusteSaving, setAjusteSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventarioRow | null>(null);

  const loadInventario = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const endpoint = filterStock === "bajo" ? "/api/inventario/stock-bajo" : "/api/inventario";
      const params: Record<string, unknown> = { page: pageNum, size: 15 };
      if (filterStock === "bajo") params.limite = 10;
      const res = await api.get(endpoint, { params });
      setItems(res.data?.content ?? []);
      setPage(res.data?.number ?? pageNum);
      setTotalPages(res.data?.totalPages ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterStock]);

  const loadMovimientos = useCallback(async (pageNum = 0) => {
    setMovLoading(true);
    try {
      const params: Record<string, unknown> = { page: pageNum, size: 15, sort: "fecha,desc" };
      if (movFilterProducto) params.productoId = movFilterProducto;
      const res = await api.get("/api/inventario/movimientos", { params });
      setMovimientos(res.data?.content ?? []);
      setMovPage(res.data?.number ?? pageNum);
      setMovTotalPages(res.data?.totalPages ?? 0);
    } catch {
      setMovimientos([]);
    } finally {
      setMovLoading(false);
    }
  }, [movFilterProducto]);

  useEffect(() => { loadInventario(); }, [loadInventario]);
  useEffect(() => { if (tab === "movimientos") loadMovimientos(); }, [tab, loadMovimientos]);

  const filtered = search
    ? items.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase()))
    : items;

  const isStockBajo = (i: InventarioRow) =>
    i.stockMinimoAlerta != null && i.stock <= i.stockMinimoAlerta;

  const openAjuste = (item: InventarioRow) => {
    setSelectedProduct(item);
    setAjusteForm({ productoId: String(item.productoId), nuevoStock: String(item.stock), motivo: "" });
    setAjusteError("");
    setAjusteOpen(true);
  };

  const submitAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setAjusteError("");
    const nuevoStock = Number(ajusteForm.nuevoStock);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      setAjusteError("Stock debe ser un número mayor o igual a 0");
      return;
    }
    if (!ajusteForm.motivo.trim()) {
      setAjusteError("Debe ingresar un motivo para el ajuste");
      return;
    }
    setAjusteSaving(true);
    try {
      await api.post("/api/inventario/ajuste", {
        productoId: Number(ajusteForm.productoId),
        nuevoStock,
        motivo: ajusteForm.motivo.trim(),
      });
      setAjusteOpen(false);
      loadInventario(page);
      if (tab === "movimientos") loadMovimientos(movPage);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al ajustar";
      setAjusteError(msg);
    } finally {
      setAjusteSaving(false);
    }
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Control de stock, movimientos y ajustes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "stock" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("stock")}
        >
          Stock actual
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "movimientos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("movimientos")}
        >
          <History className="inline h-4 w-4 mr-1 -mt-0.5" />
          Historial de movimientos
        </button>
      </div>

      {/* ====== TAB: STOCK ====== */}
      {tab === "stock" && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              className="rounded-md border border-input bg-card px-3 py-2 text-sm"
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value as "todos" | "bajo")}
            >
              <option value="todos">Todos los productos</option>
              <option value="bajo">Solo stock bajo</option>
            </select>
          </div>

          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground w-16">Imagen</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Código</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Precio</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stock</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Unidad</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">No hay productos</td></tr>
                  ) : (
                    filtered.map((i) => (
                      <tr
                        key={i.productoId}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${isStockBajo(i) ? "bg-destructive/5" : ""}`}
                      >
                        <td className="px-5 py-2">
                          {i.imagenUrl ? (
                            <HoverCard openDelay={200} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <button type="button" className="block rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary/30 transition-shadow">
                                  <img
                                    src={i.imagenUrl}
                                    alt={i.nombre}
                                    className="h-10 w-10 object-cover"
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }}
                                  />
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" className="w-auto p-2">
                                <img
                                  src={i.imagenUrl}
                                  alt={i.nombre}
                                  className="h-64 w-64 object-cover rounded border border-border"
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ) : null}
                          <div className={`h-10 w-10 rounded border border-border bg-muted/50 flex items-center justify-center ${i.imagenUrl ? "hidden" : ""}`} data-fallback>
                            <Image className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono text-muted-foreground">{i.productoId}</td>
                        <td className="px-5 py-3 text-muted-foreground">{i.codigo ?? "—"}</td>
                        <td className="px-5 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {i.nombre}
                            {isStockBajo(i) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-foreground">
                          {formatMoney(Number(i.precio), (i.moneda as Moneda) ?? "PEN")}
                        </td>
                        <td className="px-5 py-3 font-semibold text-foreground">{i.stock}</td>
                        <td className="px-5 py-3 text-muted-foreground">{i.unidadMedida ?? "—"}</td>
                        <td className="px-5 py-3">
                          {isStockBajo(i) ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                              Stock bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Ajustar stock"
                            onClick={() => openAjuste(i)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
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
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadInventario(page - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadInventario(page + 1)}>Siguiente</Button>
            </div>
          </div>
        </>
      )}

      {/* ====== TAB: MOVIMIENTOS ====== */}
      {tab === "movimientos" && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative max-w-xs">
              <input
                type="number"
                placeholder="Filtrar por ID producto..."
                value={movFilterProducto}
                onChange={(e) => setMovFilterProducto(e.target.value)}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadMovimientos()}>
              <Search className="mr-1 h-4 w-4" /> Buscar
            </Button>
          </div>

          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cantidad</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stock ant.</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stock nuevo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Motivo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movLoading ? (
                    <tr><td colSpan={8} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
                  ) : movimientos.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-4 text-center text-muted-foreground">No hay movimientos registrados</td></tr>
                  ) : (
                    movimientos.map((m) => {
                      const tipoInfo = TIPO_LABELS[m.tipo] ?? { label: m.tipo, color: "text-foreground bg-muted" };
                      const esEntrada = ["COMPRA", "ANULACION_VENTA"].includes(m.tipo);
                      return (
                        <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {m.fecha ? new Date(m.fecha).toLocaleString() : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tipoInfo.color}`}>
                              {tipoInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium text-foreground">{m.productoNombre}</td>
                          <td className="px-5 py-3">
                            <span className={`flex items-center gap-1 font-semibold ${esEntrada ? "text-success" : "text-destructive"}`}>
                              {esEntrada ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                              {esEntrada ? "+" : "-"}{m.cantidad}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{m.stockAnterior}</td>
                          <td className="px-5 py-3 font-semibold text-foreground">{m.stockNuevo}</td>
                          <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{m.motivo ?? "—"}</td>
                          <td className="px-5 py-3 text-muted-foreground">{m.usuarioNombre ?? "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-muted-foreground">Página {movPage + 1} de {movTotalPages || 1}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={movPage === 0} onClick={() => loadMovimientos(movPage - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={movPage + 1 >= movTotalPages} onClick={() => loadMovimientos(movPage + 1)}>Siguiente</Button>
            </div>
          </div>
        </>
      )}

      {/* ====== DIALOG: AJUSTE DE STOCK ====== */}
      <Dialog open={ajusteOpen} onOpenChange={setAjusteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-2">
              <p className="text-sm font-medium text-foreground">{selectedProduct.nombre}</p>
              <p className="text-sm text-muted-foreground">Stock actual: <span className="font-semibold text-foreground">{selectedProduct.stock}</span></p>
            </div>
          )}
          {ajusteError && <p className="text-sm text-destructive">{ajusteError}</p>}
          <form onSubmit={submitAjuste} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nuevo stock *</label>
              <input
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ajusteForm.nuevoStock}
                onChange={(e) => setAjusteForm((f) => ({ ...f, nuevoStock: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Motivo del ajuste *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ej: Conteo físico, mercadería dañada..."
                value={ajusteForm.motivo}
                onChange={(e) => setAjusteForm((f) => ({ ...f, motivo: e.target.value }))}
                maxLength={200}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAjusteOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={ajusteSaving}>
                {ajusteSaving ? "Guardando..." : "Aplicar ajuste"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
