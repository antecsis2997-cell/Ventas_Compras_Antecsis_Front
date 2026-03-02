import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

const LIST_SIZE = 500;

interface CompraRow {
  id: number;
  fecha: string;
  proveedorNombre: string;
  usuarioNombre: string;
  sectorId: number | null;
  sectorNombre: string | null;
  total: number;
  estado: string;
  numeroDocumento: string | null;
}

interface CompraDetalle {
  id: number;
  fecha: string;
  proveedorNombre: string;
  usuarioNombre: string;
  sectorNombre: string | null;
  total: number;
  estado: string;
  numeroDocumento: string | null;
  metodoPagoNombre: string | null;
  observaciones: string | null;
  items: {
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
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

  const [showModal, setShowModal] = useState(false);
  const [proveedores, setProveedores] = useState<{ id: number; nombre: string; ruc?: string | null }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<{ id: number; nombre: string; codigo: string; moneda?: string }[]>([]);
  const [form, setForm] = useState({
    proveedorId: "",
    metodoPagoId: "",
    numeroDocumento: "",
    observaciones: "",
    items: [{ productoId: "", cantidad: 1, precioUnitario: "" }],
  });
  const [filterProveedor, setFilterProveedor] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [compraDetalle, setCompraDetalle] = useState<CompraDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

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

  const openModal = async () => {
    setForm({
      proveedorId: "",
      metodoPagoId: "",
      numeroDocumento: "",
      observaciones: "",
      items: [{ productoId: "", cantidad: 1, precioUnitario: "" }],
    });
    setFilterProveedor("");
    setFormError("");
    setShowModal(true);
    try {
      const [provRes, metodosRes, prodRes] = await Promise.all([
        api.get("/api/proveedores", { params: { page: 0, size: LIST_SIZE } }),
        api.get("/api/metodos-pago"),
        api.get("/api/productos", { params: { page: 0, size: LIST_SIZE } }),
      ]);
      setProveedores(provRes.data?.content ?? provRes.data ?? []);
      setMetodosPago(Array.isArray(metodosRes.data) ? metodosRes.data : []);
      setProductos(prodRes.data?.content ?? prodRes.data ?? []);
    } catch {
      setFormError("No se pudieron cargar proveedores o productos");
    }
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productoId: "", cantidad: 1, precioUnitario: "" }] }));
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, value: string | number) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)),
    }));

  const calcTotal = () => {
    return form.items.reduce((sum, it) => {
      const precio = Number(it.precioUnitario) || 0;
      const cant = Number(it.cantidad) || 0;
      return sum + precio * cant;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const proveedorId = form.proveedorId ? Number(form.proveedorId) : null;
    if (!proveedorId) {
      setFormError("Seleccione un proveedor");
      return;
    }
    const items = form.items
      .filter((it) => it.productoId && Number(it.cantidad) > 0 && Number(it.precioUnitario) > 0)
      .map((it) => ({
        productoId: Number(it.productoId),
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
      }));
    if (items.length === 0) {
      setFormError("Agregue al menos un producto con cantidad y precio");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/compras", {
        proveedorId,
        metodoPagoId: form.metodoPagoId ? Number(form.metodoPagoId) : null,
        numeroDocumento: form.numeroDocumento || null,
        observaciones: form.observaciones || null,
        items,
      });
      setShowModal(false);
      loadCompras(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al registrar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

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
    if (!confirm("¿Anular esta compra? Se descontará el stock ingresado.")) return;
    try {
      await api.patch(`/api/compras/${id}/anular`);
      loadCompras(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al anular";
      alert(msg);
    }
  };

  const verDetalle = async (id: number) => {
    setShowDetalleModal(true);
    setLoadingDetalle(true);
    setCompraDetalle(null);
    try {
      const res = await api.get(`/api/compras/${id}`);
      setCompraDetalle(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al cargar detalle";
      alert(msg);
      setShowDetalleModal(false);
    } finally {
      setLoadingDetalle(false);
    }
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Registro de compras a proveedores</p>
        </div>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Compra
        </Button>
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sector</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Proveedor</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">N° Documento</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-4 text-center text-muted-foreground">No hay compras</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => verDetalle(c.id)}
                  >
                    <td className="px-5 py-3 font-medium text-primary">{formatNumCompra(c.id)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.fecha ? new Date(c.fecha).toLocaleString() : "—"}</td>
                    <td className="px-5 py-3 text-foreground">{c.sectorNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-foreground">{c.proveedorNombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.usuarioNombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.numeroDocumento ?? "—"}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">{formatMoney(Number(c.total))}</td>
                    <td className="px-5 py-3">{estadoBadge(c.estado)}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Ver detalles"
                          onClick={() => verDetalle(c.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                          title="Anular compra"
                          onClick={() => handleAnular(c.id)}
                          disabled={c.estado === "ANULADA"}
                        >
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

      {/* Modal Nueva Compra */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Proveedor */}
            <div>
              <label className="text-sm font-medium">Proveedor *</label>
              <input
                type="text"
                placeholder="Buscar por nombre o RUC..."
                className="mb-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterProveedor}
                onChange={(e) => setFilterProveedor(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.proveedorId}
                onChange={(e) => setForm((f) => ({ ...f, proveedorId: e.target.value }))}
                required
              >
                <option value="">Seleccione...</option>
                {proveedores
                  .filter(
                    (p) =>
                      !filterProveedor.trim() ||
                      p.nombre?.toLowerCase().includes(filterProveedor.toLowerCase()) ||
                      (p.ruc ?? "").includes(filterProveedor)
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.ruc ? ` (${p.ruc})` : ""}
                    </option>
                  ))}
              </select>
            </div>

            {/* Método de pago y número documento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Método de pago</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.metodoPagoId}
                  onChange={(e) => setForm((f) => ({ ...f, metodoPagoId: e.target.value }))}
                >
                  <option value="">—</option>
                  {metodosPago.map((mp) => (
                    <option key={mp.id} value={mp.id}>{mp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">N° documento / factura</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.numeroDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, numeroDocumento: e.target.value }))}
                  placeholder="Ej: F001-00012"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-sm font-medium">Observaciones</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                placeholder="Opcional..."
              />
            </div>

            {/* Detalle de productos */}
            <div>
              <label className="text-sm font-medium">Detalle de productos *</label>
              <div className="mt-2 space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      {i === 0 && <span className="text-xs text-muted-foreground">Producto</span>}
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={item.productoId}
                        onChange={(e) => updateItem(i, "productoId", e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      {i === 0 && <span className="text-xs text-muted-foreground">Cantidad</span>}
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={item.cantidad}
                        onChange={(e) => updateItem(i, "cantidad", parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                    <div className="w-32">
                      {i === 0 && <span className="text-xs text-muted-foreground">Precio compra</span>}
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="0.00"
                        value={item.precioUnitario}
                        onChange={(e) => updateItem(i, "precioUnitario", e.target.value)}
                      />
                    </div>
                    <div className="w-28 text-right">
                      {i === 0 && <span className="text-xs text-muted-foreground block">Subtotal</span>}
                      <span className="inline-block py-2 text-sm font-medium text-foreground">
                        {formatMoney((Number(item.precioUnitario) || 0) * (Number(item.cantidad) || 0))}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(i)}
                      disabled={form.items.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2">
                + Agregar producto
              </Button>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center rounded-lg border border-border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Total de la compra</span>
              <span className="text-lg font-bold text-foreground">{formatMoney(calcTotal())}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Registrando..." : "Registrar compra"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle de Compra */}
      <Dialog open={showDetalleModal} onOpenChange={setShowDetalleModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Compra {compraDetalle ? formatNumCompra(compraDetalle.id) : ""}</DialogTitle>
          </DialogHeader>
          {loadingDetalle ? (
            <div className="py-8 text-center text-muted-foreground">Cargando detalle...</div>
          ) : compraDetalle ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Fecha:</span>
                  <p className="text-foreground">{compraDetalle.fecha ? new Date(compraDetalle.fecha).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Estado:</span>
                  <p className="mt-1">{estadoBadge(compraDetalle.estado)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Proveedor:</span>
                  <p className="text-foreground">{compraDetalle.proveedorNombre}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Usuario:</span>
                  <p className="text-foreground">{compraDetalle.usuarioNombre}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Sector:</span>
                  <p className="text-foreground">{compraDetalle.sectorNombre ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">N° Documento:</span>
                  <p className="text-foreground">{compraDetalle.numeroDocumento ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Método de pago:</span>
                  <p className="text-foreground">{compraDetalle.metodoPagoNombre ?? "—"}</p>
                </div>
                {compraDetalle.observaciones && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Observaciones:</span>
                    <p className="text-foreground">{compraDetalle.observaciones}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2">Productos</h3>
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
                      {compraDetalle.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-foreground">{item.productoNombre}</td>
                          <td className="px-3 py-2 text-right text-foreground">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatMoney(item.precioUnitario)}</td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">{formatMoney(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Total de la compra</span>
                <span className="text-lg font-bold text-foreground">{formatMoney(compraDetalle.total)}</span>
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
