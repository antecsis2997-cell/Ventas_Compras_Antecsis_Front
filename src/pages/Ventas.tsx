import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { Search, Plus, ShoppingCart, Trash2, X, Printer, Sparkles, ScanLine } from "lucide-react";
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
import {
  estiloContenedorPreviewHover,
  estiloMarcoImagenClaro,
} from "@/lib/productoImagenMarca";

const LIST_SIZE = 500;

/**
 * Mejora visual en ampliación (hover / visor): contraste, color y brillo.
 * No aumenta píxeles reales; para “HD” hace falta otra imagen o un servicio de IA en servidor.
 */
const ESTILO_MEJORA_VISTA_IMAGEN: CSSProperties = {
  filter: "contrast(1.1) saturate(1.18) brightness(1.08)",
};

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
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  /** Vista ampliada del producto (doble clic en miniatura; no añade al carrito). */
  const [previewImagenProducto, setPreviewImagenProducto] = useState<ProductoItem | null>(null);
  /** Panel catálogo (izquierda): límite para que el HoverCard no cubra el carrito. */
  const [panelCatalogoEl, setPanelCatalogoEl] = useState<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const codigoRef = useRef<HTMLInputElement>(null);

  // Buscador inteligente de clientes
  type ClienteItem = { id: number; nombre: string; documento?: string | null; tipoDocumento?: string | null };
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResultados, setClienteResultados] = useState<ClienteItem[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteItem | null>(null);
  const [clienteBuscando, setClienteBuscando] = useState(false);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteSearchRef = useRef<HTMLInputElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  // Mini-modal creación rápida de cliente
  const [showCrearCliente, setShowCrearCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({
    nombre: "", tipoDocumento: "DNI", documento: "", direccion: "", email: "", telefono: "",
  });
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [crearClienteError, setCrearClienteError] = useState("");

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
    if (!clienteId || clienteId === "CONSUMIDOR_FINAL") { setComprasCalificadas(null); return; }
    api.get(`/api/ventas/clientes/${clienteId}/compras-calificadas`)
      .then((r) => setComprasCalificadas(r.data))
      .catch(() => setComprasCalificadas(null));
  }, [clienteId]);

  // Búsqueda debounced de clientes
  useEffect(() => {
    if (!clienteQuery.trim() || clienteQuery.length < 1) {
      setClienteResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      setClienteBuscando(true);
      try {
        const res = await api.get("/api/clientes", { params: { search: clienteQuery.trim(), page: 0, size: 12 } });
        let items: ClienteItem[] = res.data?.content ?? res.data ?? [];
        // Para Factura: mostrar solo clientes con RUC
        if (tipoDocumento === "FACTURA") {
          items = items.filter((c) => {
            const tdoc = c.tipoDocumento?.toUpperCase().trim();
            return tdoc === "RUC" || tdoc === "6";
          });
        }
        setClienteResultados(items);
        setShowClienteDropdown(true);
      } catch {
        setClienteResultados([]);
      } finally {
        setClienteBuscando(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteQuery, tipoDocumento]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        clienteDropdownRef.current && !clienteDropdownRef.current.contains(e.target as Node) &&
        clienteSearchRef.current && !clienteSearchRef.current.contains(e.target as Node)
      ) {
        setShowClienteDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setClienteQuery("");
    setClienteResultados([]);
    setClienteSeleccionado(null);
    setShowClienteDropdown(false);
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
    setFormError("");
    setShowModal(true);
    try {
      const [metodosRes, prodRes] = await Promise.all([
        api.get("/api/metodos-pago"),
        api.get("/api/productos", { params: { page: 0, size: LIST_SIZE } }),
      ]);
      setMetodosPago(Array.isArray(metodosRes.data) ? metodosRes.data : []);
      setProductos(prodRes.data?.content ?? prodRes.data ?? []);
    } catch {
      setFormError("No se pudieron cargar productos");
    }
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const seleccionarCliente = (c: ClienteItem | "CONSUMIDOR_FINAL") => {
    if (c === "CONSUMIDOR_FINAL") {
      setClienteId("CONSUMIDOR_FINAL");
      setClienteSeleccionado(null);
      setClienteQuery("");
    } else {
      setClienteId(String(c.id));
      setClienteSeleccionado(c);
      setClienteQuery("");
    }
    setShowClienteDropdown(false);
  };

  const limpiarCliente = () => {
    setClienteId("");
    setClienteSeleccionado(null);
    setClienteQuery("");
    setComprasCalificadas(null);
    setTimeout(() => clienteSearchRef.current?.focus(), 50);
  };

  const abrirCrearCliente = () => {
    const q = clienteQuery.trim();
    const soloDigitos = /^\d+$/.test(q);

    // Auto-detectar tipo por longitud si la query es solo dígitos
    let tipoDetectado = tipoDocumento === "FACTURA" ? "RUC" : "DNI";
    let documentoDetectado = "";
    let nombreDetectado = q;

    if (soloDigitos) {
      if (q.length === 11) { tipoDetectado = "RUC"; documentoDetectado = q; nombreDetectado = ""; }
      else if (q.length === 8) { tipoDetectado = "DNI"; documentoDetectado = q; nombreDetectado = ""; }
    }

    setNuevoClienteForm({
      nombre: nombreDetectado,
      tipoDocumento: tipoDetectado,
      documento: documentoDetectado,
      direccion: "",
      email: "",
      telefono: "",
    });
    setCrearClienteError("");
    setShowCrearCliente(true);
    setShowClienteDropdown(false);
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoClienteForm.nombre.trim()) { setCrearClienteError("El nombre es obligatorio"); return; }
    if (!nuevoClienteForm.documento.trim()) { setCrearClienteError("El documento es obligatorio"); return; }
    setCreandoCliente(true);
    setCrearClienteError("");
    try {
      const res = await api.post<{ id: number; nombre: string; documento: string; tipoDocumento: string }>("/api/clientes", {
        nombre: nuevoClienteForm.nombre.trim(),
        tipoDocumento: nuevoClienteForm.tipoDocumento,
        documento: nuevoClienteForm.documento.trim(),
        direccion: nuevoClienteForm.direccion.trim() || null,
        email: nuevoClienteForm.email.trim() || null,
        telefono: nuevoClienteForm.telefono.trim() || null,
      });
      const creado = res.data;
      seleccionarCliente({ id: creado.id, nombre: creado.nombre, documento: creado.documento, tipoDocumento: creado.tipoDocumento });
      setShowCrearCliente(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCrearClienteError(msg ?? "Error al crear el cliente");
    } finally {
      setCreandoCliente(false);
    }
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
    const esConsumidorFinal = !clienteId || clienteId === "CONSUMIDOR_FINAL";

    if (carrito.length === 0) {
      setFormError("Agregue al menos un producto al carrito");
      return;
    }
    if (tipoDocumento === "FACTURA") {
      if (esConsumidorFinal) {
        setFormError("La Factura requiere seleccionar un cliente con RUC.");
        return;
      }
      const tdoc = clienteSeleccionado?.tipoDocumento?.toUpperCase().trim();
      if (tdoc !== "RUC" && tdoc !== "6") {
        setFormError("La Factura solo puede emitirse a clientes con RUC. Cambie el tipo de documento del cliente o seleccione Boleta.");
        return;
      }
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

      const esConsumidorFinalPost = !clienteId || clienteId === "CONSUMIDOR_FINAL";
      await api.post("/api/ventas", {
        clienteId: esConsumidorFinalPost ? null : Number(clienteId),
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
      setPreviewImagenProducto(null);
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
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-lg shadow-primary/5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="page-title">
                <span className="bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                  Ventas
                </span>
              </h1>
              <p className="page-subtitle mt-0.5 max-w-md">
                Historial, SUNAT y punto de venta en un solo lugar.
              </p>
            </div>
          </div>
          <Button
            onClick={openModal}
            size="lg"
            className="h-12 shrink-0 gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 px-6 font-semibold shadow-lg shadow-primary/25 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Abrir punto de venta
          </Button>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar venta o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input/80 bg-card/80 py-2.5 pl-10 pr-4 text-sm shadow-sm backdrop-blur-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="table-container rounded-xl border border-border/60 shadow-sm">
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
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a1628] text-white">
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(37,99,235,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(14,165,233,0.12),transparent_50%),linear-gradient(180deg,#0c2139_0%,#0a192f_40%,#071525_100%)]"
            aria-hidden
          />

          {/* Barra superior */}
          <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-blue-950/50 bg-[#0b1f35]/95 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-xl sm:px-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg shadow-primary/35 ring-2 ring-white/10">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-sm font-bold tracking-tight text-white sm:text-base">Punto de venta</span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400/80">Antecsis · POS</span>
                </div>
              </div>
              <div className="flex rounded-xl border border-white/15 bg-black/20 p-0.5 shadow-inner">
                <button type="button"
                  onClick={() => { if (monedaVenta !== "PEN") { setMonedaVenta("PEN"); setCarrito([]); setCategoriaActiva("Todas"); } }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${monedaVenta === "PEN" ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/30" : "text-white/45 hover:text-white hover:bg-white/5"}`}>
                  S/ PEN
                </button>
                <button type="button"
                  onClick={() => { if (monedaVenta !== "USD") { setMonedaVenta("USD"); setCarrito([]); setCategoriaActiva("Todas"); } }}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${monedaVenta === "USD" ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/30" : "text-white/45 hover:text-white hover:bg-white/5"}`}>
                  $ USD
                </button>
              </div>
            </div>
            <button type="button" onClick={() => { setPreviewImagenProducto(null); setShowModal(false); }}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/50 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cuerpo: split */}
          <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

            {/* ── Panel izquierdo: catálogo de productos (límite visual del HoverCard de imágenes) ── */}
            <div
              ref={setPanelCatalogoEl}
              className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden border-r border-blue-900/40 bg-[#0a1f38]/75"
            >

              {/* Barra de búsqueda + código de barras */}
              <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-black/15 p-4 backdrop-blur-sm sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-400/50" />
                  <input ref={searchRef} type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchProducto}
                    onChange={(e) => setSearchProducto(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white shadow-inner placeholder:text-white/35 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                </div>
                <div className="flex shrink-0 gap-2">
                  <div className="relative">
                    <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400/60" />
                    <input ref={codigoRef} type="text" placeholder="Código de barras"
                      value={codigoBarras}
                      onChange={(e) => setCodigoBarras(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPorCodigo())}
                      className="w-40 rounded-xl border border-violet-500/25 bg-violet-500/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25 sm:w-44" />
                  </div>
                  <button type="button" onClick={agregarPorCodigo}
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 active:scale-[0.98]">
                    Agregar
                  </button>
                </div>
              </div>

              {/* Tabs de categoría */}
              <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-black/10 px-4 py-3 scrollbar-custom">
                {categorias.map((cat) => (
                  <button key={cat} type="button" onClick={() => setCategoriaActiva(cat)}
                    className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                      categoriaActiva === cat
                        ? "border-primary/40 bg-gradient-to-r from-primary to-violet-600 text-white shadow-[0_0_24px_-4px] shadow-primary/50"
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grilla de productos */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
                {productosFiltrados.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-white/30">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-violet-600/20 ring-1 ring-white/10">
                      <Search className="h-8 w-8 text-cyan-400/50" />
                    </div>
                    <p className="text-sm font-medium text-white/50">Sin productos{searchProducto ? ` para “${searchProducto}”` : ""}</p>
                    <p className="mt-1 text-xs text-white/35">Prueba otra categoría o limpia el buscador</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {productosFiltrados.map((p) => {
                      const enCarrito = carrito.find((c) => c.productoId === p.id);
                      const sinStock = (p.stock ?? 0) <= 0;
                      return (
                        <button key={p.id} type="button"
                          onClick={() => !sinStock && agregarProductoAlCarrito(p)}
                          disabled={sinStock}
                          className={`group relative flex flex-col items-start rounded-2xl border p-3 text-left shadow-sm transition-all duration-200 ${
                            sinStock
                              ? "cursor-not-allowed border-slate-200 bg-white/60 opacity-50"
                              : enCarrito
                                ? "border-primary bg-white shadow-md ring-2 ring-primary/35 hover:ring-primary/50"
                                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                          }`}>
                          {/* Badge cantidad en carrito */}
                          {enCarrito && (
                            <span className="absolute right-2 top-2 z-10 flex h-6 min-w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-600 px-1 text-[11px] font-bold text-white shadow-md shadow-primary/40 ring-2 ring-white/20">
                              {enCarrito.cantidad}
                            </span>
                          )}
                          {/* Imagen del producto con hover para ampliar */}
                          {p.imagenUrl ? (
                            <HoverCard openDelay={120} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div
                                  role="presentation"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImagenProducto(p);
                                  }}
                                  className="relative mb-2 h-28 w-full shrink-0 cursor-zoom-in overflow-hidden rounded-xl bg-white transition duration-200 group-hover:brightness-[1.02]"
                                  style={estiloMarcoImagenClaro()}
                                  title="Pasa el mouse para ampliar · doble clic para pantalla completa"
                                >
                                  <img
                                    key={`thumb-${p.id}`}
                                    src={p.imagenUrl}
                                    alt={p.nombre}
                                    className="w-full h-full object-cover [image-rendering:auto]"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      img.style.display = "none";
                                      const fb = img.nextElementSibling as HTMLElement | null;
                                      if (fb) fb.style.display = "flex";
                                    }}
                                  />
                                  <div className="absolute inset-0 items-center justify-center hidden">
                                    <span className="text-3xl select-none">📦</span>
                                  </div>
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent
                                side="left"
                                align="start"
                                sideOffset={12}
                                avoidCollisions
                                collisionBoundary={panelCatalogoEl ?? undefined}
                                collisionPadding={{ top: 12, bottom: 12, left: 12, right: 20 }}
                                className="z-[105] w-auto max-w-[min(85vw,480px)] border border-white/25 p-2 sm:p-3 shadow-2xl shadow-black/90 ring-1 ring-black/60"
                                style={{ backgroundColor: "#0a0f18" }}
                              >
                                <div
                                  className="flex max-h-[min(62vh,440px)] max-w-full items-center justify-center rounded-xl p-1.5 sm:p-2"
                                  style={estiloContenedorPreviewHover()}
                                >
                                  <img
                                    key={`zoom-${p.id}`}
                                    src={p.imagenUrl}
                                    alt={p.nombre}
                                    className="max-h-[min(58vh,400px)] w-full max-w-full rounded-lg object-contain shadow-lg"
                                    style={ESTILO_MEJORA_VISTA_IMAGEN}
                                    loading="eager"
                                    decoding="async"
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                                <p className="mt-2 max-w-[min(88vw,500px)] text-center text-[11px] leading-snug text-white/60">
                                  <span className="block truncate font-medium text-white/85">{p.nombre}</span>
                                  <span className="mt-1 block text-[10px] text-white/40">
                                    Vista mejorada (color/contraste). Doble clic en la miniatura para ampliar más.
                                  </span>
                                </p>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <div
                              className="mb-2 flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-slate-50"
                              style={estiloMarcoImagenClaro()}
                            >
                              <span className="select-none text-3xl text-slate-300">📦</span>
                            </div>
                          )}
                          {p.categoriaNombre && (
                            <span className="mb-1 inline-block rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                              {p.categoriaNombre}
                            </span>
                          )}
                          <p className="mb-1 line-clamp-2 text-xs font-semibold leading-snug text-black">{p.nombre}</p>
                          {p.codigo && (
                            <p className="mb-1 font-mono text-[10px] font-semibold text-black">{p.codigo}</p>
                          )}
                          <p className="mt-auto text-base font-extrabold tracking-tight text-emerald-700">
                            {formatMoney(p.precio, (p.moneda as Moneda) ?? "PEN")}
                          </p>
                          <p className={`mt-0.5 text-[10px] font-medium ${sinStock ? "text-red-600" : "text-slate-600"}`}>
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
            <div className="relative z-[110] flex w-[400px] shrink-0 flex-col overflow-hidden border-l border-blue-900/50 bg-gradient-to-b from-[#0c2540] via-[#0a1f38] to-[#071525] shadow-[-12px_0_40px_-20px_rgba(0,0,0,0.75)] sm:w-[420px]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" aria-hidden />

              {/* Lista del carrito */}
              <div className="scrollbar-custom flex-1 space-y-2 overflow-y-auto p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/80" />
                    Carrito
                  </span>
                  {carrito.length > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-cyan-300/90">{carrito.length} ítem(s)</span>
                  )}
                </div>
                {carrito.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-white/25">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                      <ShoppingCart className="h-6 w-6 text-white/35" />
                    </div>
                    <p className="text-xs font-medium text-white/45">Toca un producto para agregarlo</p>
                  </div>
                ) : carrito.map((item) => (
                  <div
                    key={item.productoId}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-md shadow-blue-950/20 transition hover:border-slate-300 hover:shadow-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-black">{item.nombre}</p>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold tracking-wide text-black">
                        {item.codigo?.trim() ? item.codigo.trim() : "—"}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-neutral-800">
                        Stock: <span className="tabular-nums text-black">{item.stock}</span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-neutral-600">Precio:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => actualizarPrecio(item.productoId, parseFloat(e.target.value) || 0)}
                          className="w-20 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-right text-[11px] font-medium text-black focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-sm font-bold text-black transition hover:bg-slate-200"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-black">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-sm font-bold text-black transition hover:bg-slate-200 disabled:opacity-35"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-bold text-black">
                        {formatMoney(item.precioUnitario * item.cantidad, monedaVenta)}
                      </span>
                      <button
                        type="button"
                        onClick={() => eliminarDelCarrito(item.productoId)}
                        className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Quitar del carrito"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total + cobro */}
              <div className="border-t border-white/10 p-4 space-y-3 shrink-0 overflow-y-auto max-h-[60vh] scrollbar-custom">

                {/* Total */}
                <div className="relative mb-1 overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/25 via-violet-600/15 to-cyan-500/10 px-4 py-4 shadow-[0_0_40px_-12px] shadow-primary/50 ring-1 ring-white/10">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl" aria-hidden />
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Total</span>
                    <span className="bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                      {formatMoney(calcularTotal(), monedaVenta)}
                    </span>
                  </div>
                </div>

                {/* Cliente — buscador inteligente estilo Bsale */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Cliente</label>

                  {/* Cliente seleccionado: badge con X para deseleccionar */}
                  {clienteId ? (
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
                      <span className="text-xs text-white flex-1 truncate">
                        {clienteId === "CONSUMIDOR_FINAL"
                          ? "👤 Consumidor Final"
                          : `✓ ${clienteSeleccionado?.nombre ?? ""}${clienteSeleccionado?.documento ? ` · ${clienteSeleccionado.documento}` : ""}`}
                      </span>
                      <button type="button" onClick={limpiarCliente}
                        className="text-white/40 hover:text-white/80 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Input de búsqueda */
                    <div className="relative mt-1">
                      <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
                        <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
                        <input
                          ref={clienteSearchRef}
                          type="text"
                          placeholder={tipoDocumento === "FACTURA" ? "Buscar por nombre o RUC..." : "Buscar o escribir nombre / DNI..."}
                          value={clienteQuery}
                          onChange={(e) => { setClienteQuery(e.target.value); setShowClienteDropdown(true); }}
                          onFocus={() => { if (clienteQuery.length >= 2 || clienteResultados.length > 0) setShowClienteDropdown(true); else setShowClienteDropdown(true); }}
                          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none min-w-0"
                        />
                        {clienteBuscando && <span className="text-[10px] text-white/30 animate-pulse shrink-0">buscando…</span>}
                      </div>

                      {/* Dropdown de resultados */}
                      {showClienteDropdown && (
                        <div ref={clienteDropdownRef}
                          className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#0d1628] shadow-xl overflow-hidden max-h-52 overflow-y-auto scrollbar-custom">

                          {/* Consumidor Final — solo en boleta */}
                          {tipoDocumento !== "FACTURA" && (
                            <button type="button"
                              onMouseDown={() => seleccionarCliente("CONSUMIDOR_FINAL")}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:bg-white/5 border-b border-white/5 text-left">
                              <span className="text-base">👤</span>
                              <span>Consumidor Final <span className="text-white/30">(sin identificar)</span></span>
                            </button>
                          )}

                          {/* Resultados de búsqueda */}
                          {clienteResultados.map((c) => {
                            const tdoc = c.tipoDocumento?.toUpperCase().trim();
                            const esRuc = tdoc === "RUC" || tdoc === "6";
                            const isDni = tdoc === "DNI" || tdoc === "1";
                            const sinRucFactura = tipoDocumento === "FACTURA" && !esRuc;
                            return (
                              <button key={c.id} type="button"
                                onMouseDown={() => seleccionarCliente(c)}
                                disabled={sinRucFactura}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left ${sinRucFactura ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5"}`}>
                                <span className="text-xs text-white truncate">{c.nombre}</span>
                                <span className="shrink-0 flex items-center gap-1.5">
                                  {c.documento && (
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                      esRuc
                                        ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
                                        : isDni
                                        ? "bg-violet-500/15 text-violet-400 border-violet-500/25"
                                        : "bg-white/10 text-white/40 border-white/15"
                                    }`}>
                                      {c.tipoDocumento}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-white/50">{c.documento}</span>
                                  {sinRucFactura && <span className="text-amber-400 text-[10px]">⚠</span>}
                                </span>
                              </button>
                            );
                          })}

                          {/* Sin resultados / Crear nuevo */}
                          {clienteQuery.trim().length >= 1 && !clienteBuscando && (
                            <button type="button"
                              onMouseDown={abrirCrearCliente}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-primary hover:bg-primary/10 border-t border-white/5 text-left font-medium">
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              {clienteResultados.length === 0
                                ? `Crear cliente "${clienteQuery.trim()}"`
                                : `Crear nuevo cliente`}
                            </button>
                          )}

                          {clienteQuery.trim().length < 1 && clienteResultados.length === 0 && (
                            <p className="px-3 py-2.5 text-[11px] text-white/30">Escribe nombre, DNI o RUC para buscar…</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Avisos */}
                  {(() => {
                    if (tipoDocumento !== "FACTURA" || !clienteId || clienteId === "CONSUMIDOR_FINAL") return null;
                    const tdoc = clienteSeleccionado?.tipoDocumento?.toUpperCase().trim();
                    if (tdoc === "RUC" || tdoc === "6") return null;
                    return (
                      <p className="mt-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                        ⚠ Este cliente no tiene RUC. La Factura solo se emite a empresas con RUC.
                      </p>
                    );
                  })()}
                  {(() => {
                    const total = carrito.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0);
                    const sinIdentificar = !clienteId || clienteId === "CONSUMIDOR_FINAL";
                    if (tipoDocumento === "BOLETA" && sinIdentificar && total > 700) {
                      return (
                        <p className="mt-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                          ⚠ Monto supera S/ 700. SUNAT exige identificar al comprador con nombre y documento.
                        </p>
                      );
                    }
                    return null;
                  })()}

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
                    <select value={tipoDocumento} onChange={(e) => {
                        const nuevo = e.target.value;
                        setTipoDocumento(nuevo);
                        // Si cambia a Factura y el cliente actual no tiene RUC, deseleccionarlo
                        if (nuevo === "FACTURA" && clienteSeleccionado) {
                          const tdoc = clienteSeleccionado.tipoDocumento?.toUpperCase().trim();
                          if (tdoc !== "RUC" && tdoc !== "6") {
                            limpiarCliente();
                          }
                        }
                        // Si cambia a Boleta y había Consumidor Final, mantenerlo
                      }}
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-violet-600 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-[0_8px_32px_-8px] shadow-primary/50 transition hover:brightness-110 hover:shadow-[0_12px_40px_-8px] hover:shadow-primary/60 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:hover:brightness-100">
                  <Sparkles className="h-4 w-4 shrink-0 opacity-90" />
                  {saving ? "Registrando…" : `Confirmar venta · ${formatMoney(calcularTotal(), monedaVenta)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini-modal: Crear cliente rápido */}
      <Dialog open={showCrearCliente} onOpenChange={setShowCrearCliente}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs text-muted-foreground">Nombre / Razón Social *</label>
              <input type="text" value={nuevoClienteForm.nombre}
                onChange={(e) => setNuevoClienteForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Juan Pérez / EMPRESA SAC"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Tipo documento *</label>
                <select value={nuevoClienteForm.tipoDocumento}
                  onChange={(e) => setNuevoClienteForm(f => ({ ...f, tipoDocumento: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                  style={{ backgroundColor: "#1e2a3a" }}>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="CE">Carnet Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">N° documento *</label>
                <input type="text" value={nuevoClienteForm.documento}
                  onChange={(e) => setNuevoClienteForm(f => ({ ...f, documento: e.target.value }))}
                  placeholder={nuevoClienteForm.tipoDocumento === "RUC" ? "20123456789" : "12345678"}
                  maxLength={nuevoClienteForm.tipoDocumento === "RUC" ? 11 : 20}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Dirección <span className="text-white/30">(opcional)</span></label>
              <input type="text" value={nuevoClienteForm.direccion}
                onChange={(e) => setNuevoClienteForm(f => ({ ...f, direccion: e.target.value }))}
                placeholder="Av. Principal 123, Lima"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Email <span className="text-white/30">(opcional)</span></label>
                <input type="email" value={nuevoClienteForm.email}
                  onChange={(e) => setNuevoClienteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Teléfono <span className="text-white/30">(opcional)</span></label>
                <input type="text" value={nuevoClienteForm.telefono}
                  onChange={(e) => setNuevoClienteForm(f => ({ ...f, telefono: e.target.value }))}
                  placeholder="987654321"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30" />
              </div>
            </div>
            {crearClienteError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{crearClienteError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => setShowCrearCliente(false)} disabled={creandoCliente}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={guardarNuevoCliente} disabled={creandoCliente}>
                {creandoCliente ? "Guardando…" : "Crear y seleccionar"}
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

      {/* Ampliación máxima (doble clic en miniatura del POS; no suma al carrito) */}
      <Dialog open={previewImagenProducto !== null} onOpenChange={(open) => { if (!open) setPreviewImagenProducto(null); }}>
        <DialogContent className="max-h-[min(96vh,920px)] w-[min(96vw,920px)] max-w-[min(96vw,920px)] border-white/20 p-4 sm:max-w-[min(96vw,920px)]">
          <DialogHeader>
            <DialogTitle className="pr-8 text-base text-white">{previewImagenProducto?.nombre}</DialogTitle>
          </DialogHeader>
          <div
            className="flex max-h-[min(82vh,780px)] items-center justify-center overflow-auto rounded-xl p-3"
            style={estiloContenedorPreviewHover()}
          >
            {previewImagenProducto?.imagenUrl ? (
              <img
                src={previewImagenProducto.imagenUrl}
                alt={previewImagenProducto.nombre}
                className="max-h-full max-w-full rounded-md object-contain"
                style={ESTILO_MEJORA_VISTA_IMAGEN}
              />
            ) : null}
          </div>
          <p className="text-center text-[10px] leading-relaxed text-white/45">
            Vista con más brillo, contraste y color. No inventa detalle nuevo: si la foto es muy chica seguirá viéndose pixelada.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
