import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Plus, ShoppingCart, Trash2, X } from "lucide-react";
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
  usuarioNombre: string;
  sectorId: number | null;
  sectorNombre: string | null;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
  moneda: string;
}

interface VentaDetalle {
  id: number;
  fecha: string;
  clienteNombre: string;
  usuarioNombre: string;
  sectorNombre: string | null;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
  moneda: string;
  metodoPagoNombre: string | null;
  conCuotas: boolean | null;
  requiereDelivery?: boolean | null;
  tipoEntrega?: string | null;
  direccionEntrega?: string | null;
  estadoEntrega?: string | null;
  entregadoPorNombre?: string | null;
  items: {
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
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
  codigo: string;
  precioOriginal: number;
  precioUnitario: number;
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
  const [monedaVenta, setMonedaVenta] = useState<"PEN" | "USD">("PEN");
  const [conCuotas, setConCuotas] = useState(false);
  const [requiereDelivery, setRequiereDelivery] = useState(false);
  const [tipoEntrega, setTipoEntrega] = useState<"INMEDIATA" | "PROGRAMADA_3_5" | "PROGRAMADA_5_6_MESES">("INMEDIATA");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [dniCmr, setDniCmr] = useState("");
  const [searchProducto, setSearchProducto] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [codigoBarras, setCodigoBarras] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

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
    setMonedaVenta("PEN");
    setConCuotas(false);
    setRequiereDelivery(false);
    setTipoEntrega("INMEDIATA" as "INMEDIATA" | "PROGRAMADA_3_5" | "PROGRAMADA_5_6_MESES");
    setDireccionEntrega("");
    setDniCmr("");
    setCodigoBarras("");
    setSearchProducto("");
    setShowDropdown(false);
    setFilterCliente("");
    setFormError("");
    setShowModal(true);
    try {
      const [clientesRes, metodosRes, prodRes] = await Promise.all([
        api.get("/api/clientes", { params: { page: 0, size: LIST_SIZE } }),
        api.get("/api/metodos-pago"),
        api.get("/api/productos", { params: { page: 0, size: LIST_SIZE } }),
      ]);
      setClientes(clientesRes.data?.content ?? clientesRes.data ?? []);
      setMetodosPago(Array.isArray(metodosRes.data) ? metodosRes.data : []);
      setProductos(prodRes.data?.content ?? prodRes.data ?? []);
    } catch {
      setFormError("No se pudieron cargar clientes o productos");
    }
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const filteredProductosSugerencias = productos.filter(
    (p) =>
      p.moneda === monedaVenta &&
      (p.stock ?? 0) > 0 &&
      (p.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
        (p.codigo ?? "").toLowerCase().includes(searchProducto.toLowerCase()))
  ).slice(0, 10);

  const agregarProductoAlCarrito = (p: ProductoItem) => {
    const existe = carrito.find((c) => c.productoId === p.id);
    if (existe) {
      if (existe.cantidad < (p.stock ?? 0)) {
        setCarrito(carrito.map((c) =>
          c.productoId === p.id ? { ...c, cantidad: c.cantidad + 1 } : c
        ));
      }
    } else {
      setCarrito([
        ...carrito,
        {
          productoId: p.id,
          nombre: p.nombre,
          codigo: p.codigo,
          precioOriginal: p.precio,
          precioUnitario: p.precio,
          moneda: p.moneda ?? "PEN",
          cantidad: 1,
          stock: p.stock ?? 0,
        },
      ]);
    }
    setSearchProducto("");
    setShowDropdown(false);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const agregarPorCodigo = () => {
    const codigo = codigoBarras.trim();
    if (!codigo) return;
    const producto = productos.find(
      (p) => p.codigo === codigo && p.moneda === monedaVenta && (p.stock ?? 0) > 0
    );
    if (producto) {
      agregarProductoAlCarrito(producto);
      setCodigoBarras("");
      codigoRef.current?.focus();
    } else {
      alert("Producto no encontrado o sin stock");
      setCodigoBarras("");
    }
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    const item = carrito.find((c) => c.productoId === productoId);
    if (!item) return;
    if (cantidad < 1) return;
    if (cantidad > item.stock) {
      alert(`Stock insuficiente. Disponible: ${item.stock}`);
      return;
    }
    setCarrito(carrito.map((c) =>
      c.productoId === productoId ? { ...c, cantidad } : c
    ));
  };

  const actualizarPrecio = (productoId: number, precio: number) => {
    if (precio <= 0) return;
    setCarrito(carrito.map((c) =>
      c.productoId === productoId ? { ...c, precioUnitario: precio } : c
    ));
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter((c) => c.productoId !== productoId));
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!clienteId) {
      setFormError("Seleccione un cliente");
      return;
    }
    if (carrito.length === 0) {
      setFormError("Agregue al menos un producto al carrito");
      return;
    }
    setSaving(true);
    try {
      if (requiereDelivery && (tipoEntrega === "INMEDIATA" || tipoEntrega === "PROGRAMADA_5_6_MESES") && !direccionEntrega.trim()) {
        setFormError("La dirección de entrega es obligatoria para este tipo de delivery");
        setSaving(false);
        return;
      }

      await api.post("/api/ventas", {
        clienteId: Number(clienteId),
        metodoPagoId: metodoPagoId ? Number(metodoPagoId) : null,
        tipoDocumento: tipoDocumento || null,
        numeroDocumento: numeroDocumento || null,
        moneda: monedaVenta,
        conCuotas: metodoPagoId && metodosPago.find((mp) => mp.id === Number(metodoPagoId))?.nombre.toLowerCase().includes("tarjeta") ? conCuotas : null,
        observaciones: null,
        requiereDelivery: requiereDelivery,
        tipoEntrega: requiereDelivery ? tipoEntrega : null,
        direccionEntrega: requiereDelivery && (tipoEntrega === "INMEDIATA" || tipoEntrega === "PROGRAMADA_5_6_MESES") ? direccionEntrega.trim() : null,
        dniCmr: dniCmr.trim() || null,
        items: carrito.map((c) => ({
          productoId: c.productoId,
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
        })),
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

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      COMPLETADA: "bg-success/10 text-success",
      PENDIENTE: "bg-warning/10 text-warning",
      ANULADA: "bg-destructive/10 text-destructive",
    };
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[estado] ?? ""}`}>{estado}</span>;
  };

  const verDetalle = async (id: number) => {
    setShowDetalleModal(true);
    setLoadingDetalle(true);
    setVentaDetalle(null);
    try {
      const res = await api.get(`/api/ventas/${id}`);
      setVentaDetalle(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al cargar detalle";
      alert(msg);
      setShowDetalleModal(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const metodoPagoSeleccionado = metodosPago.find((mp) => mp.id === Number(metodoPagoId));
  const esTarjeta = metodoPagoSeleccionado?.nombre.toLowerCase().includes("tarjeta");

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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo / Nº doc</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">No hay ventas</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr 
                    key={v.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => verDetalle(v.id)}
                  >
                    <td className="px-5 py-3 font-medium text-primary">{v.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.fecha ? new Date(v.fecha).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-foreground">{v.sectorNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-foreground">{v.clienteNombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.usuarioNombre}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{formatMoney(Number(v.total), (v.moneda as Moneda) ?? "PEN")}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.tipoDocumento ?? "—"} {v.numeroDocumento ?? ""}</td>
                    <td className="px-5 py-3">{estadoBadge(v.estado)}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="rounded p-1.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Ver detalles"
                        onClick={() => verDetalle(v.id)}
                      >
                        Ver
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
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadVentas(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadVentas(page + 1)}>Siguiente</Button>
        </div>
      </div>

      {/* Modal Nueva Venta */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Venta</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
              {/* Columna izquierda: Productos y carrito */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Productos</span>
                    <div className="flex rounded-lg border border-input overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { if (monedaVenta !== "PEN") { setMonedaVenta("PEN"); setCarrito([]); } }}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${monedaVenta === "PEN" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        S/ Soles
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (monedaVenta !== "USD") { setMonedaVenta("USD"); setCarrito([]); } }}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${monedaVenta === "USD" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                      >
                        $ Dólares
                      </button>
                    </div>
                  </div>
            {/* Buscar Producto */}
            <div>
              <label className="text-sm font-medium">Buscar Producto</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Escribe nombre o código del producto..."
                  value={searchProducto}
                  onChange={(e) => {
                    setSearchProducto(e.target.value);
                    setShowDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowDropdown(searchProducto.length > 0)}
                  className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {showDropdown && filteredProductosSugerencias.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProductosSugerencias.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => agregarProductoAlCarrito(p)}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0 focus:outline-none focus:bg-muted"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                            {p.codigo && <p className="text-xs text-muted-foreground">{p.codigo}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">{formatMoney(p.precio, (p.moneda as Moneda) ?? "PEN")}</p>
                            <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Código de Barras */}
            <div>
              <label className="text-sm font-medium">Código de Barras</label>
              <div className="flex gap-2 mt-2">
                <input
                  ref={codigoRef}
                  type="text"
                  placeholder="Escanear código..."
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPorCodigo())}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="button" variant="outline" onClick={agregarPorCodigo}>Agregar</Button>
              </div>
            </div>

            {/* Carrito - Grilla Editable */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Productos en el carrito</label>
                {carrito.length > 0 && (
                  <span className="text-xs text-muted-foreground">{carrito.length} producto(s)</span>
                )}
              </div>
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 border border-dashed border-border rounded-lg text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mb-2" />
                  <p className="text-sm">No hay productos en el carrito</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Stock</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio Unit.</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.map((item) => (
                        <tr key={item.productoId} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">{item.nombre}</p>
                            {item.codigo && <p className="text-xs text-muted-foreground">{item.codigo}</p>}
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">{item.stock}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.precioUnitario}
                              onChange={(e) => actualizarPrecio(item.productoId, parseFloat(e.target.value) || 0)}
                              className="w-24 text-right rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              max={item.stock}
                              value={item.cantidad}
                              onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value, 10) || 1)}
                              className="w-16 text-center rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">
                            {formatMoney(item.precioUnitario * item.cantidad, monedaVenta)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarDelCarrito(item.productoId)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-base font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">{formatMoney(calcularTotal(), monedaVenta)}</span>
            </div>
                </div>
              </div>

              {/* Columna derecha: Cliente, Pago, Documento, Delivery */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/5 p-4 shadow-sm space-y-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">Cliente</span>
                  <div>
              <label className="text-sm font-medium">Cliente *</label>
              <input
                type="text"
                placeholder="Buscar cliente..."
                className="mt-2 mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterCliente}
                onChange={(e) => setFilterCliente(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
              >
                <option value="">Seleccione cliente...</option>
                {clientes
                  .filter(
                    (c) =>
                      !filterCliente.trim() ||
                      c.nombre?.toLowerCase().includes(filterCliente.toLowerCase()) ||
                      (c.documento ?? "").includes(filterCliente)
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.documento ? `(${c.documento})` : ""}
                    </option>
                  ))}
              </select>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/5 p-4 shadow-sm space-y-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">Pago y Documento</span>
                  <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Método de pago</label>
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={metodoPagoId}
                  onChange={(e) => setMetodoPagoId(e.target.value)}
                >
                  <option value="">—</option>
                  {metodosPago.map((mp) => (
                    <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo documento</label>
                <select
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="FACTURA">Factura</option>
                  <option value="BOLETA">Boleta</option>
                </select>
              </div>
            </div>

            {/* DNI CMR para puntos */}
            <div>
              <label className="text-sm font-medium">DNI para puntos CMR (opcional)</label>
              <input
                type="text"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dniCmr}
                onChange={(e) => setDniCmr(e.target.value)}
                placeholder="Ej: 10152669"
              />
            </div>

            {/* Cuotas si es tarjeta */}
            {esTarjeta && (
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!conCuotas}
                    onChange={() => setConCuotas(false)}
                  />
                  Sin cuotas
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={conCuotas}
                    onChange={() => setConCuotas(true)}
                  />
                  Con cuotas
                </label>
              </div>
            )}

            {/* Número Documento */}
            <div>
              <label className="text-sm font-medium">Número de documento</label>
              <input
                type="text"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Ej: F001-00001"
              />
            </div>
                </div>

                {/* Delivery */}
                <div className="rounded-xl border border-border bg-muted/5 p-4 shadow-sm space-y-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">Delivery</span>
                  {!requiereDelivery ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRequiereDelivery(true)}
                      className="w-full justify-center"
                    >
                      Añadir delivery
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Delivery activado</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRequiereDelivery(false);
                            setTipoEntrega("INMEDIATA");
                            setDireccionEntrega("");
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Quitar delivery
                        </button>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo de entrega</label>
                        <select
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={tipoEntrega}
                          onChange={(e) => setTipoEntrega(e.target.value as "INMEDIATA" | "PROGRAMADA_3_5" | "PROGRAMADA_5_6_MESES")}
                        >
                          <option value="INMEDIATA">Entrega inmediata</option>
                          <option value="PROGRAMADA_5_6_MESES">5 a 6 meses</option>
                          <option value="PROGRAMADA_3_5">3 a 5 días</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Dirección de entrega *</label>
                        <input
                          type="text"
                          placeholder="Ej: Av. Principal 123, Distrito..."
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={direccionEntrega}
                          onChange={(e) => setDireccionEntrega(e.target.value)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La venta quedará en estado PENDIENTE hasta que Logística marque la entrega como completada.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving || carrito.length === 0}>
                {saving ? "Registrando..." : "Registrar Venta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle de Venta */}
      <Dialog open={showDetalleModal} onOpenChange={setShowDetalleModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta #{ventaDetalle?.id}</DialogTitle>
          </DialogHeader>
          {loadingDetalle ? (
            <div className="py-8 text-center text-muted-foreground">Cargando detalle...</div>
          ) : ventaDetalle ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Fecha:</span>
                  <p className="text-foreground">{ventaDetalle.fecha ? new Date(ventaDetalle.fecha).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Estado:</span>
                  <p className="mt-1">{estadoBadge(ventaDetalle.estado)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Cliente:</span>
                  <p className="text-foreground">{ventaDetalle.clienteNombre}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Usuario:</span>
                  <p className="text-foreground">{ventaDetalle.usuarioNombre}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Sector:</span>
                  <p className="text-foreground">{ventaDetalle.sectorNombre ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Moneda:</span>
                  <p className="text-foreground">{ventaDetalle.moneda === "USD" ? "Dólares ($)" : "Soles (S/)"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tipo documento:</span>
                  <p className="text-foreground">{ventaDetalle.tipoDocumento ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">N° Documento:</span>
                  <p className="text-foreground">{ventaDetalle.numeroDocumento ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Método de pago:</span>
                  <p className="text-foreground">{ventaDetalle.metodoPagoNombre ?? "—"}</p>
                </div>
                {ventaDetalle.conCuotas !== null && ventaDetalle.metodoPagoNombre?.toLowerCase().includes("tarjeta") && (
                  <div>
                    <span className="font-medium text-muted-foreground">Cuotas:</span>
                    <p className="text-foreground">{ventaDetalle.conCuotas ? "Con cuotas" : "Sin cuotas"}</p>
                  </div>
                )}
                {ventaDetalle.requiereDelivery && (
                  <>
                    <div>
                      <span className="font-medium text-muted-foreground">Tipo entrega:</span>
                      <p className="text-foreground">
                        {ventaDetalle.tipoEntrega === "INMEDIATA" ? "Inmediata" : ventaDetalle.tipoEntrega === "PROGRAMADA_5_6_MESES" ? "5 a 6 meses" : "3 a 5 días"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Estado entrega:</span>
                      <p className="text-foreground">{ventaDetalle.estadoEntrega ?? "—"}</p>
                    </div>
                    {ventaDetalle.entregadoPorNombre && (
                      <div>
                        <span className="font-medium text-muted-foreground">Entregado por:</span>
                        <p className="text-foreground">{ventaDetalle.entregadoPorNombre}</p>
                      </div>
                    )}
                    {ventaDetalle.direccionEntrega && (
                      <div className="col-span-2">
                        <span className="font-medium text-muted-foreground">Dirección:</span>
                        <p className="text-foreground">{ventaDetalle.direccionEntrega}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2">Productos vendidos</h3>
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaDetalle.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-foreground">{item.productoNombre}</td>
                          <td className="px-3 py-2 text-right text-foreground">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatMoney(item.precioUnitario, ventaDetalle.moneda as Moneda)}</td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">{formatMoney(item.subtotal, ventaDetalle.moneda as Moneda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Total de la venta</span>
                <span className="text-lg font-bold text-foreground">{formatMoney(ventaDetalle.total, ventaDetalle.moneda as Moneda)}</span>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setShowDetalleModal(false)}>Cerrar</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
