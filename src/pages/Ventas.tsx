import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, ShoppingCart, Trash2, Minus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatMoney, type Moneda } from "@/lib/utils";

const LIST_SIZE = 500;

interface VentaRow {
  id: number;
  fecha: string;
  clienteNombre: string;
  sectorId: number | null;
  sectorNombre: string | null;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
}

interface ProductoItem {
  id: number;
  nombre: string;
  codigo: string;
  precio: number;
  moneda?: string;
  stock?: number;
  unidadMedida?: string;
  categoriaNombre?: string;
}

interface CarritoItem {
  productoId: number;
  nombre: string;
  precio: number;
  moneda: string;
  cantidad: number;
  stock: number;
}

export default function Ventas() {
  const [search, setSearch] = useState("");
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState<{ id: number; nombre: string; documento?: string | null }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterProducto, setFilterProducto] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const codigoRef = useRef<HTMLInputElement>(null);

  const loadVentas = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/ventas", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setVentas(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVentas(0); }, [loadVentas]);

  const openModal = async () => {
    setCarrito([]);
    setClienteId("");
    setMetodoPagoId("");
    setTipoDocumento("");
    setNumeroDocumento("");
    setCodigoBarras("");
    setFilterCliente("");
    setFilterProducto("");
    setFormError("");
    setShowModal(true);
    try {
      const [clientesRes, metodosRes, productosRes] = await Promise.all([
        api.get("/api/clientes", { params: { page: 0, size: LIST_SIZE } }),
        api.get("/api/metodos-pago"),
        api.get("/api/productos", { params: { page: 0, size: LIST_SIZE } }),
      ]);
      setClientes(clientesRes.data?.content ?? clientesRes.data ?? []);
      setMetodosPago(Array.isArray(metodosRes.data) ? metodosRes.data : []);
      setProductos(productosRes.data?.content ?? productosRes.data ?? []);
    } catch {
      setFormError("No se pudieron cargar los datos");
    }
  };

  const agregarAlCarrito = (p: ProductoItem) => {
    setFormError("");
    setCarrito((prev) => {
      const idx = prev.findIndex((c) => c.productoId === p.id);
      if (idx >= 0) {
        if (prev[idx].cantidad >= (p.stock ?? 0)) {
          setFormError(`Stock insuficiente: ${p.nombre}`);
          return prev;
        }
        return prev.map((c, i) => i === idx ? { ...c, cantidad: c.cantidad + 1 } : c);
      }
      if ((p.stock ?? 0) <= 0) {
        setFormError(`Sin stock: ${p.nombre}`);
        return prev;
      }
      return [...prev, {
        productoId: p.id,
        nombre: p.nombre,
        precio: p.precio,
        moneda: p.moneda ?? "PEN",
        cantidad: 1,
        stock: p.stock ?? 0,
      }];
    });
  };

  const agregarPorCodigo = () => {
    const cod = codigoBarras.trim();
    if (!cod) return;
    const p = productos.find((x) => (x.codigo ?? "").toLowerCase() === cod.toLowerCase());
    if (!p) {
      setFormError(`No hay producto con código "${cod}"`);
    } else {
      agregarAlCarrito(p);
    }
    setCodigoBarras("");
    codigoRef.current?.focus();
  };

  const updateCantidad = (productoId: number, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((c) => c.productoId === productoId ? { ...c, cantidad: c.cantidad + delta } : c)
        .filter((c) => c.cantidad > 0)
    );
  };

  const quitarDelCarrito = (productoId: number) => {
    setCarrito((prev) => prev.filter((c) => c.productoId !== productoId));
  };

  const total = carrito.reduce((sum, c) => sum + c.precio * c.cantidad, 0);

  const handleSubmit = async () => {
    setFormError("");
    if (!clienteId) { setFormError("Seleccione un cliente"); return; }
    if (carrito.length === 0) { setFormError("Agregue al menos un producto"); return; }
    setSaving(true);
    try {
      await api.post("/api/ventas", {
        clienteId: Number(clienteId),
        metodoPagoId: metodoPagoId ? Number(metodoPagoId) : null,
        tipoDocumento: tipoDocumento || null,
        numeroDocumento: numeroDocumento || null,
        observaciones: null,
        items: carrito.map((c) => ({ productoId: c.productoId, cantidad: c.cantidad })),
      });
      setShowModal(false);
      loadVentas(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al registrar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const filtered = ventas.filter(
    (v) => v.clienteNombre?.toLowerCase().includes(search.toLowerCase()) || String(v.id).includes(search)
  );

  const filteredProductos = filterProducto
    ? productos.filter((p) => p.nombre.toLowerCase().includes(filterProducto.toLowerCase()) || (p.codigo ?? "").toLowerCase().includes(filterProducto.toLowerCase()))
    : productos;

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      COMPLETADA: "bg-success/10 text-success",
      PENDIENTE: "bg-warning/10 text-warning",
      ANULADA: "bg-destructive/10 text-destructive",
    };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[estado] ?? ""}`}>{estado}</span>;
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Registro y gestión de ventas</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar venta o cliente..."
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">N° Venta</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sector</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo / Nº doc</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">No hay ventas</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-primary">{v.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.fecha ? new Date(v.fecha).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-foreground">{v.sectorNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-foreground">{v.clienteNombre}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{formatMoney(Number(v.total))}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.tipoDocumento ?? "—"} {v.numeroDocumento ?? ""}</td>
                    <td className="px-5 py-3">{estadoBadge(v.estado)}</td>
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
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadVentas(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadVentas(page + 1)}>Siguiente</Button>
        </div>
      </div>

      {/* ====== MODAL POS ====== */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex h-[85vh]">
            {/* IZQUIERDA: Productos en grilla */}
            <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
              <DialogHeader className="px-5 pt-5 pb-3">
                <DialogTitle>Seleccionar productos</DialogTitle>
              </DialogHeader>

              {/* Buscadores */}
              <div className="px-5 pb-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={filterProducto}
                    onChange={(e) => setFilterProducto(e.target.value)}
                    className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    ref={codigoRef}
                    type="text"
                    placeholder="Código de barras..."
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPorCodigo())}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={agregarPorCodigo}>Escanear</Button>
                </div>
              </div>

              {/* Grilla de productos */}
              <div className="flex-1 overflow-y-auto px-5 pb-5">
                {filteredProductos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2" />
                    <p className="text-sm">No hay productos disponibles</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProductos.map((p) => {
                      const enCarrito = carrito.find((c) => c.productoId === p.id);
                      const sinStock = (p.stock ?? 0) <= 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={sinStock}
                          onClick={() => agregarAlCarrito(p)}
                          className={`relative rounded-lg border p-3 text-left transition-all
                            ${enCarrito
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                            }
                            ${sinStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                          `}
                        >
                          {enCarrito && (
                            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {enCarrito.cantidad}
                            </span>
                          )}
                          <p className="text-sm font-medium text-foreground truncate">{p.nombre}</p>
                          {p.codigo && <p className="text-xs text-muted-foreground mt-0.5">{p.codigo}</p>}
                          <p className="text-sm font-bold text-primary mt-1">
                            {formatMoney(p.precio, (p.moneda as Moneda) ?? "PEN")}
                          </p>
                          <p className={`text-xs mt-1 ${sinStock ? "text-destructive" : "text-muted-foreground"}`}>
                            Stock: {p.stock ?? 0} {p.unidadMedida ?? ""}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* DERECHA: Carrito + checkout */}
            <div className="w-[380px] flex flex-col bg-muted/20">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito
                  {carrito.length > 0 && (
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {carrito.reduce((s, c) => s + c.cantidad, 0)} items
                    </span>
                  )}
                </h3>
              </div>

              {formError && <p className="text-sm text-destructive px-5 pt-2">{formError}</p>}

              {/* Items del carrito */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Carrito vacío</p>
                    <p className="text-xs">Haz clic en un producto para agregar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {carrito.map((c) => (
                      <div key={c.productoId} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(c.precio, c.moneda as Moneda)} x {c.cantidad}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCantidad(c.productoId, -1)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-foreground">{c.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => updateCantidad(c.productoId, 1)}
                            disabled={c.cantidad >= c.stock}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="w-20 text-right text-sm font-semibold text-foreground">
                          {formatMoney(c.precio * c.cantidad, c.moneda as Moneda)}
                        </p>
                        <button
                          type="button"
                          onClick={() => quitarDelCarrito(c.productoId)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkout */}
              <div className="border-t border-border px-5 py-4 space-y-3 bg-card">
                {/* Cliente */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cliente *</label>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                  />
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                  >
                    <option value="">Seleccione cliente...</option>
                    {clientes
                      .filter((c) => !filterCliente.trim() || c.nombre?.toLowerCase().includes(filterCliente.toLowerCase()) || (c.documento ?? "").includes(filterCliente))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}{c.documento ? ` (${c.documento})` : ""}</option>
                      ))}
                  </select>
                </div>

                {/* Doc y método pago */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tipo doc</label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="FACTURA">Factura</option>
                      <option value="BOLETA">Boleta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Método pago</label>
                    <select
                      className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={metodoPagoId}
                      onChange={(e) => setMetodoPagoId(e.target.value)}
                    >
                      <option value="">—</option>
                      {metodosPago.map((mp) => (
                        <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">N° documento</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="F001-00001"
                  />
                </div>

                {/* Total */}
                <div className="flex justify-between items-center rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">{formatMoney(total)}</span>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={saving || carrito.length === 0}
                  onClick={handleSubmit}
                >
                  {saving ? "Registrando..." : "Registrar venta"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
