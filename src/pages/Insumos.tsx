import {
  Search, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, History, LayoutGrid, LayoutList, Package,
  TrendingDown, DollarSign, Boxes,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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
  activo?: boolean | null;
  estado?: string | null;
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
  COMPRA:          { label: "Compra",       color: "text-success bg-success/10" },
  VENTA:           { label: "Venta",        color: "text-info bg-info/10" },
  CONVERSION:      { label: "Conversión",   color: "text-primary bg-primary/10" },
  ANULACION_COMPRA:{ label: "Anul. Compra", color: "text-warning bg-warning/10" },
  ANULACION_VENTA: { label: "Anul. Venta",  color: "text-warning bg-warning/10" },
  AJUSTE:          { label: "Ajuste",       color: "text-primary bg-primary/10" },
};

type Tab       = "stock" | "movimientos";
type ViewMode  = "tabla" | "grilla";

export default function Insumos() {
  const [tab, setTab]               = useState<Tab>("stock");
  const [viewMode, setViewMode]     = useState<ViewMode>("tabla");
  const [search, setSearch]         = useState("");
  const [filterStock, setFilterStock] = useState<"todos" | "bajo">("todos");

  const [items, setItems]           = useState<InventarioRow[]>([]);
  const [page, setPage]             = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading]       = useState(false);

  const [movimientos, setMovimientos]         = useState<MovimientoRow[]>([]);
  const [movPage, setMovPage]                 = useState(0);
  const [movTotalPages, setMovTotalPages]     = useState(0);
  const [movLoading, setMovLoading]           = useState(false);
  const [movSearchNombre, setMovSearchNombre] = useState("");

  const [ajusteOpen, setAjusteOpen]       = useState(false);
  const [ajusteForm, setAjusteForm]       = useState({ productoId: "", nuevoStock: "", motivo: "" });
  const [ajusteError, setAjusteError]     = useState("");
  const [ajusteSaving, setAjusteSaving]   = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventarioRow | null>(null);

  /* ── Carga de datos ───────────────────────────────────────────────── */
  const loadInventario = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const endpoint = filterStock === "bajo"
        ? "/api/inventario/stock-bajo"
        : "/api/inventario";
      const params: Record<string, unknown> = { page: pageNum, size: 30 };
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
      const res = await api.get("/api/inventario/movimientos", { params });
      setMovimientos(res.data?.content ?? []);
      setMovPage(res.data?.number ?? pageNum);
      setMovTotalPages(res.data?.totalPages ?? 0);
    } catch {
      setMovimientos([]);
    } finally {
      setMovLoading(false);
    }
  }, []);

  useEffect(() => { loadInventario(); }, [loadInventario]);
  useEffect(() => { if (tab === "movimientos") loadMovimientos(); }, [tab, loadMovimientos]);

  /* ── Derivados ────────────────────────────────────────────────────── */
  const isStockBajo = (i: InventarioRow) =>
    i.stockMinimoAlerta != null && i.stock <= i.stockMinimoAlerta;

  const filtered = useMemo(() =>
    search ? items.filter((i) => i.nombre.toLowerCase().includes(search.toLowerCase())) : items,
  [items, search]);

  const movFiltered = useMemo(() =>
    movSearchNombre
      ? movimientos.filter((m) => m.productoNombre.toLowerCase().includes(movSearchNombre.toLowerCase()))
      : movimientos,
  [movimientos, movSearchNombre]);

  const stats = useMemo(() => ({
    total:     items.length,
    valorTotal: items.reduce((s, i) => s + Number(i.precio) * i.stock, 0),
    stockBajo: items.filter(isStockBajo).length,
  }), [items]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Ajuste de stock ─────────────────────────────────────────────── */
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

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Control de stock, imágenes y movimientos</p>
        </div>
        <Button asChild>
          <Link to="/insumos/catalogo">Agregar / editar productos</Link>
        </Button>
      </div>

      {/* ── Banner de resumen ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Boxes className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Productos cargados</p>
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor del stock</p>
            <p className="text-xl font-bold text-foreground">{formatMoney(stats.valorTotal, "PEN")}</p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${stats.stockBajo > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${stats.stockBajo > 0 ? "bg-destructive/10" : "bg-muted/40"}`}>
            <TrendingDown className={`h-5 w-5 ${stats.stockBajo > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stock bajo mínimo</p>
            <p className={`text-xl font-bold ${stats.stockBajo > 0 ? "text-destructive" : "text-foreground"}`}>{stats.stockBajo}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
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
          {/* Barra de controles */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
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
            {/* Toggle de vista */}
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("tabla")}
                title="Vista tabla"
                className={`px-2.5 py-2 transition-colors ${viewMode === "tabla" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grilla")}
                title="Vista grilla"
                className={`px-2.5 py-2 transition-colors ${viewMode === "grilla" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ─── Vista TABLA ─── */}
          {viewMode === "tabla" && (
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground w-20">Imagen</th>
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
                      <tr><td colSpan={8} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="px-5 py-4 text-center text-muted-foreground">No hay productos</td></tr>
                    ) : filtered.map((i) => (
                      <tr
                        key={i.productoId}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${isStockBajo(i) ? "bg-destructive/5" : ""}`}
                      >
                        {/* Imagen: miniatura visible + hover para tamaño grande */}
                        <td className="px-5 py-2">
                          {i.imagenUrl ? (
                            <HoverCard openDelay={150} closeDelay={80}>
                              <HoverCardTrigger asChild>
                                <button type="button" className="block rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary/40 transition-shadow">
                                  <img
                                    src={i.imagenUrl}
                                    alt={i.nombre}
                                    className="h-12 w-12 object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
                                    }}
                                  />
                                  <div className="hidden h-12 w-12 items-center justify-center bg-muted/40">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" className="w-auto p-2">
                                <img
                                  src={i.imagenUrl}
                                  alt={i.nombre}
                                  className="h-56 w-56 object-cover rounded-lg border border-border"
                                />
                                <p className="text-xs text-center text-muted-foreground mt-1">{i.nombre}</p>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground font-mono">{i.codigo ?? "—"}</td>
                        <td className="px-5 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {i.nombre}
                            {isStockBajo(i) && (
                              <span title="Stock bajo mínimo">
                                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                              </span>
                            )}
                          </div>
                          {i.descripcion && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{i.descripcion}</p>}
                        </td>
                        <td className="px-5 py-3 text-foreground">
                          {formatMoney(Number(i.precio), (i.moneda as Moneda) ?? "PEN")}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-bold text-base ${isStockBajo(i) ? "text-destructive" : "text-foreground"}`}>
                            {i.stock}
                          </span>
                          {i.stockMinimoAlerta != null && (
                            <p className="text-[10px] text-muted-foreground">mín: {i.stockMinimoAlerta}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{i.unidadMedida ?? "—"}</td>
                        <td className="px-5 py-3">
                          {i.activo === false || i.estado === "INACTIVO" ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">Inactivo</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">Activo</span>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Vista GRILLA ─── */}
          {viewMode === "grilla" && (
            <div>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay productos</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filtered.map((i) => {
                    const bajo = isStockBajo(i);
                    return (
                      <div
                        key={i.productoId}
                        className={`relative flex flex-col rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md ${
                          bajo ? "border-destructive/40" : "border-border"
                        }`}
                      >
                        {/* Imagen */}
                        {i.imagenUrl ? (
                          <div className="relative">
                            <img
                              src={i.imagenUrl}
                              alt={i.nombre}
                              className="w-full h-36 object-cover bg-muted/30"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove("hidden");
                              }}
                            />
                            <div className="hidden w-full h-36 bg-muted/30 items-center justify-center">
                              <Package className="h-10 w-10 text-muted-foreground" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-36 bg-muted/20 flex items-center justify-center">
                            <Package className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}

                        {/* Badge stock bajo */}
                        {bajo && (
                          <span className="absolute top-2 right-2 bg-destructive text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" /> Bajo
                          </span>
                        )}

                        {/* Info */}
                        <div className="flex flex-col flex-1 p-3">
                          {i.codigo && <p className="text-[10px] text-muted-foreground font-mono mb-0.5">{i.codigo}</p>}
                          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-2">{i.nombre}</p>

                          <div className="mt-auto space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Stock</span>
                              <span className={`text-sm font-bold ${bajo ? "text-destructive" : "text-success"}`}>
                                {i.stock} {i.unidadMedida ?? ""}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Precio</span>
                              <span className="text-xs font-medium text-foreground">
                                {formatMoney(Number(i.precio), (i.moneda as Moneda) ?? "PEN")}
                              </span>
                            </div>
                            {i.stockMinimoAlerta != null && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Mínimo</span>
                                <span className="text-xs text-muted-foreground">{i.stockMinimoAlerta}</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => openAjuste(i)}
                            className="mt-3 w-full py-1.5 rounded-lg border border-input text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="h-3 w-3" /> Ajustar stock
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
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
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre de producto..."
                value={movSearchNombre}
                onChange={(e) => setMovSearchNombre(e.target.value)}
                className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadMovimientos()}>
              <RefreshCw className="mr-1 h-4 w-4" /> Actualizar
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
                  ) : movFiltered.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-4 text-center text-muted-foreground">No hay movimientos registrados</td></tr>
                  ) : movFiltered.map((m) => {
                    const tipoInfo = TIPO_LABELS[m.tipo] ?? { label: m.tipo, color: "text-foreground bg-muted" };
                    const esEntrada = (m.stockNuevo ?? 0) > (m.stockAnterior ?? 0);
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
                            {esEntrada ? "+" : "−"}{m.cantidad}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{m.stockAnterior}</td>
                        <td className="px-5 py-3 font-semibold text-foreground">{m.stockNuevo}</td>
                        <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{m.motivo ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{m.usuarioNombre ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
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
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 mb-2">
              {selectedProduct.imagenUrl && (
                <img
                  src={selectedProduct.imagenUrl}
                  alt={selectedProduct.nombre}
                  className="h-12 w-12 rounded-lg object-cover border border-border shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{selectedProduct.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  Stock actual: <span className="font-semibold text-foreground">{selectedProduct.stock}</span>
                  {selectedProduct.unidadMedida && ` ${selectedProduct.unidadMedida}`}
                </p>
              </div>
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
