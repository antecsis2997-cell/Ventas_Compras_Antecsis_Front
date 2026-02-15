import { useState, useEffect, useCallback } from "react";
import { Search, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

const LIST_SIZE = 500;

interface VentaRow {
  id: number;
  fecha: string;
  clienteNombre: string;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
}

export default function Ventas() {
  const [search, setSearch] = useState("");
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState<{ id: number; nombre: string }[]>([]);
  const [metodosPago, setMetodosPago] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<{ id: number; nombre: string; codigo: string; precio: number }[]>([]);
  const [form, setForm] = useState({
    clienteId: "",
    metodoPagoId: "",
    tipoDocumento: "",
    numeroDocumento: "",
    observaciones: "",
    items: [{ productoId: "", cantidad: 1 }],
  });
  const [codigoBarras, setCodigoBarras] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  useEffect(() => {
    loadVentas(0);
  }, [loadVentas]);

  const openModal = async () => {
    setForm({
      clienteId: "",
      metodoPagoId: "",
      tipoDocumento: "",
      numeroDocumento: "",
      observaciones: "",
      items: [{ productoId: "", cantidad: 1 }],
    });
    setCodigoBarras("");
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
      setFormError("No se pudieron cargar clientes o productos");
    }
  };

  const agregarPorCodigo = () => {
    const cod = codigoBarras.trim();
    if (!cod) return;
    const p = productos.find(
      (x) => (x.codigo ?? "").toString().toLowerCase() === cod.toLowerCase()
    );
    if (!p) {
      setFormError(`No hay producto con código "${cod}"`);
      return;
    }
    setFormError("");
    setForm((f) => {
      const idx = f.items.findIndex((it) => Number(it.productoId) === p.id);
      if (idx >= 0) {
        return {
          ...f,
          items: f.items.map((it, i) =>
            i === idx ? { ...it, cantidad: (it.cantidad || 0) + 1 } : it
          ),
        };
      }
      return { ...f, items: [...f.items, { productoId: String(p.id), cantidad: 1 }] };
    });
    setCodigoBarras("");
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productoId: "", cantidad: 1 }] }));
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: "productoId" | "cantidad", value: string | number) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const clienteId = form.clienteId ? Number(form.clienteId) : null;
    if (!clienteId) {
      setFormError("Seleccione un cliente");
      return;
    }
    const items = form.items
      .filter((it) => it.productoId && it.cantidad > 0)
      .map((it) => ({ productoId: Number(it.productoId), cantidad: Number(it.cantidad) }));
    if (items.length === 0) {
      setFormError("Agregue al menos un producto");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/ventas", {
        clienteId,
        metodoPagoId: form.metodoPagoId ? Number(form.metodoPagoId) : null,
        tipoDocumento: form.tipoDocumento || null,
        numeroDocumento: form.numeroDocumento || null,
        observaciones: form.observaciones || null,
        items,
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
    (v) =>
      v.clienteNombre?.toLowerCase().includes(search.toLowerCase()) ||
      String(v.id).includes(search)
  );

  const estadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      COMPLETADA: "bg-success/10 text-success",
      PENDIENTE: "bg-warning/10 text-warning",
      ANULADA: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[estado] ?? ""}`}>
        {estado}
      </span>
    );
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo / Nº doc</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-4 text-center text-muted-foreground">No hay ventas</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-primary">{v.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {v.fecha ? new Date(v.fecha).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-foreground">{v.clienteNombre}</td>
                    <td className="px-5 py-3 font-semibold text-foreground">S/ {Number(v.total).toFixed(2)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {v.tipoDocumento ?? "—"} {v.numeroDocumento ?? ""}
                    </td>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cliente *</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.clienteId}
                onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
                required
              >
                <option value="">Seleccione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Tipo doc</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.tipoDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}
                >
                  <option value="">—</option>
                  <option value="FACTURA">Factura</option>
                  <option value="BOLETA">Boleta</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Nº documento</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.numeroDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, numeroDocumento: e.target.value }))}
                  placeholder="Ej. F001-00001"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Agregar por código (código de barras)</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Código..."
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregarPorCodigo())}
                />
                <Button type="button" variant="outline" size="sm" onClick={agregarPorCodigo}>Agregar</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Detalle *</label>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 mt-1 mb-1">
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={item.productoId}
                    onChange={(e) => updateItem(i, "productoId", e.target.value)}
                  >
                    <option value="">Producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — S/ {Number(p.precio).toFixed(2)}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={item.cantidad}
                    onChange={(e) => updateItem(i, "cantidad", parseInt(e.target.value, 10) || 0)}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)} disabled={form.items.length === 1}>Quitar</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Línea</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Registrar venta"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
