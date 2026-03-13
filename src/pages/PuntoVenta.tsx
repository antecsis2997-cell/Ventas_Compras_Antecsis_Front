import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ShoppingCart, Trash2, Printer } from "lucide-react";
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
  precioUnitario: number;
  moneda: string;
  cantidad: number;
  stock: number;
}

export default function PuntoVenta() {
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [monedaVenta, setMonedaVenta] = useState<"PEN" | "USD">("PEN");
  const [clientes, setClientes] = useState<{ id: number; nombre: string; documento?: string | null }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [dniCmr, setDniCmr] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [ventaRegistrada, setVentaRegistrada] = useState<{ id: number; tipoDoc: string; numero: string; total: number; moneda: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [prodRes, clientesRes, metodosRes] = await Promise.all([
        api.get("/api/productos", { params: { page: 0, size: LIST_SIZE } }),
        api.get("/api/clientes", { params: { page: 0, size: LIST_SIZE } }),
        api.get("/api/metodos-pago"),
      ]);
      setProductos(prodRes.data?.content ?? prodRes.data ?? []);
      setClientes(clientesRes.data?.content ?? clientesRes.data ?? []);
      setMetodosPago(Array.isArray(metodosRes.data) ? metodosRes.data : []);
    } catch {
      setFormError("No se pudieron cargar productos");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProductos = productos.filter(
    (p) =>
      p.moneda === monedaVenta &&
      (p.nombre.toLowerCase().includes(searchProducto.toLowerCase()) ||
        (p.codigo ?? "").toLowerCase().includes(searchProducto.toLowerCase()))
  );

  const agregarAlCarrito = (p: ProductoItem) => {
    const stock = p.stock ?? 0;
    if (stock <= 0) return;
    const existe = carrito.find((c) => c.productoId === p.id);
    if (existe) {
      if (existe.cantidad < stock) {
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
          precioUnitario: p.precio,
          moneda: p.moneda ?? "PEN",
          cantidad: 1,
          stock,
        },
      ]);
    }
    setSearchProducto("");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    const item = carrito.find((c) => c.productoId === productoId);
    if (!item || cantidad < 1 || cantidad > item.stock) return;
    setCarrito(carrito.map((c) =>
      c.productoId === productoId ? { ...c, cantidad } : c
    ));
  };

  const eliminarDelCarrito = (productoId: number) => {
    setCarrito(carrito.filter((c) => c.productoId !== productoId));
  };

  const calcularTotal = () => carrito.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);

  const abrirCheckout = () => {
    if (carrito.length === 0) {
      setFormError("Agregue productos al carrito");
      return;
    }
    setFormError("");
    setClienteId("");
    setTipoDocumento("");
    setNumeroDocumento("");
    setMetodoPagoId("");
    setDniCmr("");
    setShowCheckout(true);
  };

  const handleRegistrar = async () => {
    if (!clienteId) {
      setFormError("Seleccione un cliente");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const res = await api.post("/api/ventas", {
        clienteId: Number(clienteId),
        metodoPagoId: metodoPagoId ? Number(metodoPagoId) : null,
        tipoDocumento: tipoDocumento || null,
        numeroDocumento: numeroDocumento || null,
        moneda: monedaVenta,
        conCuotas: null,
        observaciones: null,
        requiereDelivery: false,
        tipoEntrega: null,
        direccionEntrega: null,
        dniCmr: dniCmr.trim() || null,
        items: carrito.map((c) => ({
          productoId: c.productoId,
          cantidad: c.cantidad,
          precioUnitario: c.precioUnitario,
        })),
      });
      const venta = res.data;
      setVentaRegistrada({
        id: venta.id,
        tipoDoc: venta.tipoDocumento ?? "—",
        numero: venta.numeroDocumento ?? "",
        total: venta.total,
        moneda: venta.moneda ?? monedaVenta,
      });
      setCarrito([]);
      setShowCheckout(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al registrar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const imprimir = () => {
    if (!ventaRegistrada) return;
    const ventana = window.open("", "_blank", "width=400,height=500");
    if (!ventana) return;
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>${ventaRegistrada.tipoDoc} ${ventaRegistrada.numero}</title></head>
      <body style="font-family:sans-serif;padding:20px;">
        <h2>${ventaRegistrada.tipoDoc} ${ventaRegistrada.numero}</h2>
        <p>Venta #${ventaRegistrada.id}</p>
        <p><strong>Total: ${formatMoney(ventaRegistrada.total, ventaRegistrada.moneda as Moneda)}</strong></p>
        <p style="margin-top:40px;font-size:12px;">ANTECSIS - Punto de Venta</p>
      </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
    ventana.close();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Punto de Venta
        </h1>
        <p className="page-subtitle">Buscar productos, agregar al carrito e imprimir boleta/factura</p>
      </div>

      {formError && (
        <div className="mb-4 rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
          {formError}
        </div>
      )}

      {/* Moneda */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => { if (monedaVenta !== "PEN") { setMonedaVenta("PEN"); setCarrito([]); } }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${monedaVenta === "PEN" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          S/ Soles
        </button>
        <button
          type="button"
          onClick={() => { if (monedaVenta !== "USD") { setMonedaVenta("USD"); setCarrito([]); } }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${monedaVenta === "USD" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          $ Dólares
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar producto por nombre o código..."
          value={searchProducto}
          onChange={(e) => setSearchProducto(e.target.value)}
          className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grilla de productos - stock en ROJO (CANTIDAD) */}
        <div className="lg:col-span-2 table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">CANTIDAD (Stock)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Precio</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No hay productos con moneda {monedaVenta === "PEN" ? "Soles" : "Dólares"}
                  </td>
                </tr>
              ) : (
                filteredProductos.slice(0, 50).map((p) => {
                  const s = p.stock ?? 0;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => agregarAlCarrito(p)}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">{p.nombre}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.codigo ?? "—"}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="font-semibold text-red-600 dark:text-red-400">{s}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-primary">
                        {formatMoney(p.precio, (p.moneda as Moneda) ?? "PEN")}
                      </td>
                      <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => agregarAlCarrito(p)}
                          disabled={s <= 0}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Carrito */}
        <div className="table-container">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <h3 className="font-semibold">Carrito</h3>
            <Button size="sm" onClick={abrirCheckout} disabled={carrito.length === 0}>
              Procesar venta
            </Button>
          </div>
          <div className="p-4">
            {carrito.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Vacío</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {carrito.map((item) => (
                  <div key={item.productoId} className="flex items-center justify-between text-sm border-b border-border pb-2">
                    <div>
                      <p className="font-medium truncate max-w-[140px]">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Cant: <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value, 10) || 1)}
                          className="w-12 text-center rounded border border-input bg-background px-1 py-0.5"
                        /> / Stock: <span className="text-red-600 font-medium">{item.stock}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(item.precioUnitario * item.cantidad, monedaVenta)}</p>
                      <button
                        type="button"
                        onClick={() => eliminarDelCarrito(item.productoId)}
                        className="text-destructive hover:underline text-xs"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {carrito.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-lg font-bold text-primary">
                  Total: {formatMoney(calcularTotal(), monedaVenta)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Checkout - Cliente, tipo doc, imprimir */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Completar venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cliente *</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              >
                <option value="">Seleccione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo documento</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
              >
                <option value="">—</option>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Número documento</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
                placeholder="Ej: B001-00001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">DNI para puntos CMR (opcional)</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dniCmr}
                onChange={(e) => setDniCmr(e.target.value)}
                placeholder="Ej: 10152669"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Método de pago</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={metodoPagoId}
                onChange={(e) => setMetodoPagoId(e.target.value)}
              >
                <option value="">—</option>
                {metodosPago.map((mp) => (
                  <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                ))}
              </select>
            </div>
            <p className="text-sm font-semibold">Total: {formatMoney(calcularTotal(), monedaVenta)}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCheckout(false)}>Cancelar</Button>
              <Button onClick={handleRegistrar} disabled={saving}>
                {saving ? "Registrando..." : "Registrar e imprimir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal venta registrada - Imprimir boleta/factura */}
      <Dialog open={ventaRegistrada !== null} onOpenChange={(open) => !open && setVentaRegistrada(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Venta registrada</DialogTitle>
          </DialogHeader>
          {ventaRegistrada && (
            <div className="space-y-4">
              <p className="text-sm">
                <strong>{ventaRegistrada.tipoDoc}</strong> {ventaRegistrada.numero} - Total:{" "}
                {formatMoney(ventaRegistrada.total, ventaRegistrada.moneda as Moneda)}
              </p>
              <div className="flex gap-2">
                <Button onClick={imprimir} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir boleta/factura
                </Button>
                <Button variant="outline" onClick={() => setVentaRegistrada(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
