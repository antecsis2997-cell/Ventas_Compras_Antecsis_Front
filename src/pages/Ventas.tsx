import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, Plus, ShoppingCart, Trash2, X, Printer } from "lucide-react";
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
import { getBoletaHtml, type VentaParaBoleta } from "@/lib/boletaPrint";

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
  sunatEstadoCdr?: string | null;
  sunatCodigoRespuesta?: string | null;
  sunatDescripcionCdr?: string | null;
  sunatNombreArchivo?: string | null;
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
  imagenUrl?: string | null;
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
  const [yapeTelefono, setYapeTelefono] = useState("");
  const [yapeOtp, setYapeOtp] = useState("");
  const [searchProducto, setSearchProducto] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("Todas");
  const [filterCliente, setFilterCliente] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [correlativoPreview, setCorrelativoPreview] = useState("");

  const [comprasCalificadas, setComprasCalificadas] = useState<{
    comprasCalificadas: number;
    faltanParaDescuento: number;
    proximaDescuento: boolean;
  } | null>(null);

  useEffect(() => {
    if (!showModal || !tipoDocumento || (tipoDocumento !== "BOLETA" && tipoDocumento !== "FACTURA")) {
      setCorrelativoPreview("");
      return;
    }
    api.get<{ siguienteNumero: string }>("/api/ventas/siguiente-numero-comprobante", { params: { tipoDocumento } })
      .then((r) => setCorrelativoPreview(r.data?.siguienteNumero?.trim() ?? ""))
      .catch(() => setCorrelativoPreview(""));
  }, [showModal, tipoDocumento]);

  useEffect(() => {
    if (!clienteId) { setComprasCalificadas(null); return; }
    api.get(`/api/ventas/clientes/${clienteId}/compras-calificadas`)
      .then((r) => setComprasCalificadas(r.data))
      .catch(() => setComprasCalificadas(null));
  }, [clienteId]);

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
    setComprasCalificadas(null);
    setMetodoPagoId("");
    setTipoDocumento("BOLETA");
    setNumeroDocumento("");
    setCorrelativoPreview("");
    setMonedaVenta("PEN");
    setConCuotas(false);
    setRequiereDelivery(false);
    setTipoEntrega("INMEDIATA" as "INMEDIATA" | "PROGRAMADA_3_5" | "PROGRAMADA_5_6_MESES");
    setDireccionEntrega("");
    setDniCmr("");
    setYapeTelefono("");
    setYapeOtp("");
    setCodigoBarras("");
    setSearchProducto("");
    setCategoriaActiva("Todas");
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

  // Tabs de categoría para la grilla POS
  const categorias = useMemo(() => {
    const cats = new Set(
      productos
        .filter((p) => p.moneda === monedaVenta && p.categoriaNombre)
        .map((p) => p.categoriaNombre!)
    );
    return ["Todas", ...Array.from(cats).sort()];
  }, [productos, monedaVenta]);

  // Productos filtrados para la grilla POS (categoría + búsqueda)
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (p.moneda !== monedaVenta) return false;
      if (categoriaActiva !== "Todas" && p.categoriaNombre !== categoriaActiva) return false;
      if (searchProducto) {
        const q = searchProducto.toLowerCase();
        return p.nombre.toLowerCase().includes(q) || (p.codigo ?? "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [productos, monedaVenta, categoriaActiva, searchProducto]);

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
    if (metodoPagoSeleccionado && metodoPagoSeleccionado.nombre.toLowerCase().includes("yape")) {
      if (!yapeTelefono.trim()) {
        setFormError("Ingrese el celular Yape del cliente");
        return;
      }
      if (!yapeOtp.trim()) {
        setFormError("Ingrese el código OTP de Yape");
        return;
      }
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
        numeroDocumento: correlativoPreview ? null : (numeroDocumento || null),
        moneda: monedaVenta,
        conCuotas: metodoPagoId && metodosPago.find((mp) => mp.id === Number(metodoPagoId))?.nombre.toLowerCase().includes("tarjeta") ? conCuotas : null,
        observaciones: null,
        requiereDelivery: requiereDelivery,
        tipoEntrega: requiereDelivery ? tipoEntrega : null,
        direccionEntrega: requiereDelivery && (tipoEntrega === "INMEDIATA" || tipoEntrega === "PROGRAMADA_5_6_MESES") ? direccionEntrega.trim() : null,
        dniCmr: dniCmr.trim() || null,
        yapeTelefono: metodoPagoSeleccionado && metodoPagoSeleccionado.nombre.toLowerCase().includes("yape") ? yapeTelefono.trim() : null,
        yapeOtp: metodoPagoSeleccionado && metodoPagoSeleccionado.nombre.toLowerCase().includes("yape") ? yapeOtp.trim() : null,
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

  const sunatBadge = (v: VentaRow) => {
    if (!v.sunatEstadoCdr || v.sunatEstadoCdr === "NO_APLICA") return null;
    const map: Record<string, { cls: string; label: string }> = {
      ACEPTADO:   { cls: "bg-green-500/10 text-green-400 border border-green-500/20", label: "SUNAT ✓" },
      OBSERVADO:  { cls: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", label: "SUNAT ⚠" },
      RECHAZADO:  { cls: "bg-red-500/10 text-red-400 border border-red-500/20", label: "SUNAT ✗" },
      PENDIENTE:  { cls: "bg-blue-500/10 text-blue-400 border border-blue-500/20", label: "SUNAT ⏳" },
      ERROR_ENVIO:{ cls: "bg-orange-500/10 text-orange-400 border border-orange-500/20", label: "SUNAT ERR" },
    };
    const info = map[v.sunatEstadoCdr] ?? { cls: "bg-muted/10 text-muted-foreground", label: v.sunatEstadoCdr };
    return (
      <span title={v.sunatDescripcionCdr ?? v.sunatEstadoCdr}
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
        {info.label}
      </span>
    );
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
  const esYape = metodoPagoSeleccionado?.nombre.toLowerCase().includes("yape");

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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">SUNAT</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-4 text-center text-muted-foreground">No hay ventas</td></tr>
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
                    <td className="px-5 py-3">{sunatBadge(v)}</td>
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

      {/* ── Panel POS: Nueva Venta (full-screen) ────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#080f1c] text-white">

          {/* Barra superior */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0d1628] px-5 py-3 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="text-base font-semibold">Nueva Venta</span>
              </div>
              {/* Moneda toggle */}
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                <button type="button"
                  onClick={() => { if (monedaVenta !== "PEN") { setMonedaVenta("PEN"); setCarrito([]); setCategoriaActiva("Todas"); } }}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${monedaVenta === "PEN" ? "bg-primary text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                  S/ Soles
                </button>
                <button type="button"
                  onClick={() => { if (monedaVenta !== "USD") { setMonedaVenta("USD"); setCarrito([]); setCategoriaActiva("Todas"); } }}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${monedaVenta === "USD" ? "bg-primary text-white" : "text-white/50 hover:bg-white/5 hover:text-white"}`}>
                  $ USD
                </button>
              </div>
            </div>
            <button onClick={() => setShowModal(false)}
              className="rounded-lg p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cuerpo: split */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Panel izquierdo: catálogo de productos ── */}
            <div className="flex flex-col flex-1 overflow-hidden border-r border-white/10">

              {/* Barra de búsqueda + código de barras */}
              <div className="flex gap-3 p-4 border-b border-white/10 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input ref={searchRef} type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchProducto}
                    onChange={(e) => setSearchProducto(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <input ref={codigoRef} type="text" placeholder="Cód. barras..."
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPorCodigo())}
                    className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <button onClick={agregarPorCodigo}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white/80 transition-colors shrink-0">
                    Agregar
                  </button>
                </div>
              </div>

              {/* Tabs de categoría */}
              <div className="flex gap-2 px-4 py-2.5 border-b border-white/10 overflow-x-auto shrink-0 scrollbar-custom">
                {categorias.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategoriaActiva(cat)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      categoriaActiva === cat
                        ? "bg-primary text-white shadow-sm shadow-primary/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grilla de productos */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
                {productosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-white/20">
                    <Search className="h-10 w-10 mb-3" />
                    <p className="text-sm">Sin productos{searchProducto ? ` para "${searchProducto}"` : ""}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {productosFiltrados.map((p) => {
                      const enCarrito = carrito.find((c) => c.productoId === p.id);
                      const sinStock = (p.stock ?? 0) <= 0;
                      return (
                        <button key={p.id} type="button"
                          onClick={() => !sinStock && agregarProductoAlCarrito(p)}
                          disabled={sinStock}
                          className={`relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-150 ${
                            sinStock
                              ? "border-white/5 bg-white/3 opacity-35 cursor-not-allowed"
                              : enCarrito
                                ? "border-primary/60 bg-primary/10 hover:bg-primary/15 shadow-sm shadow-primary/20"
                                : "border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/20"
                          }`}>
                          {/* Badge cantidad en carrito */}
                          {enCarrito && (
                            <span className="absolute top-2 right-2 z-10 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {enCarrito.cantidad}
                            </span>
                          )}
                          {/* Imagen del producto con hover para ampliar */}
                          {p.imagenUrl ? (
                            <HoverCard openDelay={200} closeDelay={80}>
                              <HoverCardTrigger asChild>
                                <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-white/5 shrink-0 cursor-pointer">
                                  <img
                                    src={p.imagenUrl}
                                    alt={p.nombre}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent side="right" className="w-auto p-2 z-[60]">
                                <img
                                  src={p.imagenUrl}
                                  alt={p.nombre}
                                  className="h-72 w-72 object-cover rounded-lg border border-border"
                                />
                                <p className="text-xs text-center text-muted-foreground mt-1 max-w-[288px] truncate">{p.nombre}</p>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <div className="w-full h-16 mb-2 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                              <span className="text-2xl select-none">📦</span>
                            </div>
                          )}
                          {p.categoriaNombre && (
                            <span className="mb-1 text-[9px] font-semibold text-white/35 uppercase tracking-widest">
                              {p.categoriaNombre}
                            </span>
                          )}
                          <p className="text-xs font-medium text-white leading-snug mb-1 line-clamp-2">{p.nombre}</p>
                          {p.codigo && <p className="text-[10px] text-white/25 font-mono mb-1">{p.codigo}</p>}
                          <p className="text-sm font-bold text-primary mt-auto">
                            {formatMoney(p.precio, (p.moneda as Moneda) ?? "PEN")}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${sinStock ? "text-red-400" : "text-white/30"}`}>
                            Stock: {p.stock ?? 0}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Panel derecho: carrito + cobro ── */}
            <div className="w-[380px] shrink-0 flex flex-col bg-[#0d1628] overflow-hidden">

              {/* Lista del carrito */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-custom">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Carrito</span>
                  {carrito.length > 0 && (
                    <span className="text-[11px] text-white/30">{carrito.length} ítem(s)</span>
                  )}
                </div>
                {carrito.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-white/20">
                    <ShoppingCart className="h-8 w-8 mb-2" />
                    <p className="text-xs">Selecciona productos del catálogo</p>
                  </div>
                ) : carrito.map((item) => (
                  <div key={item.productoId}
                    className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/8 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{item.nombre}</p>
                      {/* Precio editable */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-white/30">Precio:</span>
                        <input type="number" step="0.01" min="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => actualizarPrecio(item.productoId, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[11px] text-right text-white focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                    </div>
                    {/* Controles cantidad */}
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                        className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors">
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-white">{item.cantidad}</span>
                      <button type="button"
                        onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                        disabled={item.cantidad >= item.stock}
                        className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors disabled:opacity-30">
                        +
                      </button>
                    </div>
                    <span className="w-14 text-right text-xs font-semibold text-white shrink-0">
                      {formatMoney(item.precioUnitario * item.cantidad, monedaVenta)}
                    </span>
                    <button type="button" onClick={() => eliminarDelCarrito(item.productoId)}
                      className="p-1 rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Total + cobro */}
              <div className="border-t border-white/10 p-4 space-y-3 shrink-0 overflow-y-auto max-h-[60vh] scrollbar-custom">

                {/* Total */}
                <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 mb-1">
                  <span className="text-sm font-semibold text-white/70">TOTAL</span>
                  <span className="text-2xl font-bold text-primary">{formatMoney(calcularTotal(), monedaVenta)}</span>
                </div>

                {/* Cliente */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Cliente *</label>
                  <input type="text" placeholder="Filtrar cliente..."
                    value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}
                    className="mt-1 w-full border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    style={{ backgroundColor: "#0d1628" }}>
                    <option value="" style={{ backgroundColor: "#0d1628" }}>Seleccione cliente...</option>
                    {clientes
                      .filter((c) => !filterCliente.trim() ||
                        c.nombre?.toLowerCase().includes(filterCliente.toLowerCase()) ||
                        (c.documento ?? "").includes(filterCliente))
                      .map((c) => (
                        <option key={c.id} value={c.id} style={{ backgroundColor: "#0d1628" }}>
                          {c.nombre}{c.documento ? ` (${c.documento})` : ""}
                        </option>
                      ))}
                  </select>
                  {comprasCalificadas !== null && (
                    <div className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug ${
                      comprasCalificadas.proximaDescuento
                        ? "bg-green-500/15 border border-green-500/25 text-green-400"
                        : "bg-blue-500/10 border border-blue-500/20 text-blue-300"
                    }`}>
                      {comprasCalificadas.proximaDescuento
                        ? "🎉 ¡Esta compra aplica 20% de descuento! (si supera S/ 50)"
                        : `🛒 Compras +S/50: ${comprasCalificadas.comprasCalificadas} — faltan ${comprasCalificadas.faltanParaDescuento + 1} para el 20% dto.`}
                    </div>
                  )}
                </div>

                {/* Método pago + Tipo documento */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Método pago</label>
                    <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)}
                      className="mt-1 w-full border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      style={{ backgroundColor: "#0d1628" }}>
                      <option value="" style={{ backgroundColor: "#0d1628" }}>—</option>
                      {metodosPago.map((mp) => <option key={mp.id} value={mp.id} style={{ backgroundColor: "#0d1628" }}>{mp.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Documento</label>
                    <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)}
                      className="mt-1 w-full border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      style={{ backgroundColor: "#0d1628" }}>
                      <option value="" style={{ backgroundColor: "#0d1628" }}>—</option>
                      <option value="BOLETA" style={{ backgroundColor: "#0d1628" }}>Boleta</option>
                      <option value="FACTURA" style={{ backgroundColor: "#0d1628" }}>Factura</option>
                    </select>
                  </div>
                </div>

                {/* N° documento */}
                {tipoDocumento && (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">N° Documento</label>
                    {correlativoPreview ? (
                      <input type="text" readOnly value={correlativoPreview}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white/60" />
                    ) : (
                      <input type="text" value={numeroDocumento}
                        onChange={(e) => setNumeroDocumento(e.target.value)}
                        placeholder="Ej: B001-00001"
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    )}
                  </div>
                )}

                {/* Yape */}
                {esYape && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40">Celular Yape</label>
                      <input type="tel" value={yapeTelefono} onChange={(e) => setYapeTelefono(e.target.value)}
                        placeholder="969929157"
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40">OTP Yape</label>
                      <input type="text" value={yapeOtp} onChange={(e) => setYapeOtp(e.target.value)}
                        placeholder="557454"
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>
                )}

                {/* Tarjeta cuotas */}
                {esTarjeta && (
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                      <input type="radio" checked={!conCuotas} onChange={() => setConCuotas(false)} /> Sin cuotas
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                      <input type="radio" checked={conCuotas} onChange={() => setConCuotas(true)} /> Con cuotas
                    </label>
                  </div>
                )}

                {/* CMR */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">DNI puntos CMR (opcional)</label>
                  <input type="text" value={dniCmr} onChange={(e) => setDniCmr(e.target.value)}
                    placeholder="Ej: 10152669"
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>

                {/* Delivery */}
                {!requiereDelivery ? (
                  <button type="button" onClick={() => setRequiereDelivery(true)}
                    className="w-full py-1.5 rounded-lg border border-white/10 text-xs text-white/40 hover:text-white hover:border-white/20 transition-colors">
                    + Añadir delivery
                  </button>
                ) : (
                  <div className="rounded-lg border border-white/10 p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-white/70">Delivery</span>
                      <button type="button"
                        onClick={() => { setRequiereDelivery(false); setTipoEntrega("INMEDIATA"); setDireccionEntrega(""); }}
                        className="text-[10px] text-red-400 hover:underline">Quitar</button>
                    </div>
                    <select value={tipoEntrega}
                      onChange={(e) => setTipoEntrega(e.target.value as "INMEDIATA" | "PROGRAMADA_3_5" | "PROGRAMADA_5_6_MESES")}
                      className="w-full border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none"
                      style={{ backgroundColor: "#0d1628" }}>
                      <option value="INMEDIATA" style={{ backgroundColor: "#0d1628" }}>Entrega inmediata</option>
                      <option value="PROGRAMADA_3_5" style={{ backgroundColor: "#0d1628" }}>3 a 5 días</option>
                      <option value="PROGRAMADA_5_6_MESES" style={{ backgroundColor: "#0d1628" }}>5 a 6 meses</option>
                    </select>
                    <input type="text" placeholder="Dirección de entrega *" value={direccionEntrega}
                      onChange={(e) => setDireccionEntrega(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none" />
                  </div>
                )}

                {formError && <p className="text-xs text-red-400">{formError}</p>}

                {/* Botón confirmar */}
                <button type="button" onClick={handleSubmit}
                  disabled={saving || carrito.length === 0}
                  className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                  <ShoppingCart className="h-4 w-4" />
                  {saving ? "Registrando..." : `Confirmar Venta · ${formatMoney(calcularTotal(), monedaVenta)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const paraBoleta: VentaParaBoleta = {
                      id: ventaDetalle.id,
                      tipoDocumento: ventaDetalle.tipoDocumento,
                      numeroDocumento: ventaDetalle.numeroDocumento,
                      fecha: ventaDetalle.fecha,
                      clienteNombre: ventaDetalle.clienteNombre,
                      usuarioNombre: ventaDetalle.usuarioNombre,
                      sectorNombre: ventaDetalle.sectorNombre,
                      metodoPagoNombre: ventaDetalle.metodoPagoNombre,
                      total: Number(ventaDetalle.total),
                      moneda: ventaDetalle.moneda ?? "PEN",
                      items: ventaDetalle.items.map((i) => ({
                        productoNombre: i.productoNombre,
                        cantidad: i.cantidad,
                        precioUnitario: Number(i.precioUnitario),
                        subtotal: Number(i.subtotal),
                      })),
                    };
                    const html = getBoletaHtml(paraBoleta);
                    const w = window.open("", "_blank", "width=380,height=700");
                    if (w) {
                      w.document.write(html);
                      w.document.close();
                      w.focus();
                      w.print();
                    }
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir boleta/factura
                </Button>
                <Button type="button" onClick={() => setShowDetalleModal(false)}>Cerrar</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
