import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

const UNIDADES = [{ value: "", label: "—" }, { value: "UND", label: "Unidad" }, { value: "KG", label: "Kg" }, { value: "MG", label: "Mg" }, { value: "GRAMOS", label: "Gramos" }];

interface ProductoRow {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  categoriaId: number | null;
  categoriaNombre: string | null;
  unidadMedida: string | null;
  imagenUrl?: string | null;
  stockMinimoAlerta?: number | null;
}

interface Categoria { id: number; nombre: string; }

const emptyForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precio: "",
  stock: "",
  categoriaId: "",
  unidadMedida: "",
  imagenUrl: "",
  stockMinimoAlerta: "",
};

export default function Productos() {
  const [search, setSearch] = useState("");
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadProductos = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/productos", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setProductos(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProductos(0);
  }, [loadProductos]);

  useEffect(() => {
    api.get("/api/categorias", { params: { page: 0, size: 500 } })
      .then((r) => setCategorias(r.data?.content ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (p: ProductoRow) => {
    setEditingId(p.id);
    setForm({
      codigo: p.codigo ?? "",
      nombre: p.nombre ?? "",
      descripcion: p.descripcion ?? "",
      precio: p.precio != null ? String(p.precio) : "",
      stock: p.stock != null ? String(p.stock) : "",
      categoriaId: p.categoriaId != null ? String(p.categoriaId) : "",
      unidadMedida: p.unidadMedida ?? "",
      imagenUrl: p.imagenUrl ?? "",
      stockMinimoAlerta: p.stockMinimoAlerta != null ? String(p.stockMinimoAlerta) : "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const nombre = form.nombre?.trim();
    const precio = form.precio ? Number(form.precio) : null;
    const stock = form.stock !== "" ? Number(form.stock) : null;
    if (!nombre) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (precio == null || precio <= 0) {
      setFormError("Precio debe ser mayor a 0");
      return;
    }
    if (stock == null || stock < 0) {
      setFormError("Stock no puede ser negativo");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo?.trim() || null,
        nombre,
        descripcion: form.descripcion?.trim() || null,
        precio,
        precioCompra: null,
        stock,
        categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
        unidadMedida: form.unidadMedida || null,
        imagenUrl: form.imagenUrl?.trim() || null,
        stockMinimoAlerta: form.stockMinimoAlerta !== "" ? Number(form.stockMinimoAlerta) : null,
      };
      if (editingId) {
        await api.put(`/api/productos/${editingId}`, payload);
      } else {
        await api.post("/api/productos", payload);
      }
      setDialogOpen(false);
      loadProductos(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al guardar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api.delete(`/api/productos/${id}`);
      loadProductos(page);
    } catch {
      // ignore
    }
  };

  const filtered = productos.filter((p) =>
    p.nombre?.toLowerCase().includes(search.toLowerCase())
  );

  const stockBadge = (p: ProductoRow) => {
    const stock = p.stock ?? 0;
    if (stock <= 0) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">Sin stock</span>;
    return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">En stock</span>;
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Gestión de inventario</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar producto..."
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Categoría</th>
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
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-muted-foreground">{p.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.codigo ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.categoriaNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-foreground">S/ {Number(p.precio).toFixed(2)}</td>
                    <td className="px-5 py-3 text-foreground">{p.stock}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.unidadMedida ?? "—"}</td>
                    <td className="px-5 py-3">{stockBadge(p)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(p.id)}>
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
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadProductos(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadProductos(page + 1)}>Siguiente</Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Ej: Arroz 5kg" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} maxLength={50} required />
            </div>
            <div>
              <label className="text-sm font-medium">Código</label>
              <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción (máx. 50)</label>
              <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} maxLength={50} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Precio (S/) *</label>
                <input type="number" step="0.01" min="0" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium">Stock *</label>
                <input type="number" min="0" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.categoriaId} onChange={(e) => setForm((f) => ({ ...f, categoriaId: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Unidad</label>
                <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.unidadMedida} onChange={(e) => setForm((f) => ({ ...f, unidadMedida: e.target.value }))}>
                  {UNIDADES.map((u) => (
                    <option key={u.value || "x"} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Stock mínimo (alerta)</label>
              <input type="number" min="0" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.stockMinimoAlerta} onChange={(e) => setForm((f) => ({ ...f, stockMinimoAlerta: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">URL imagen</label>
              <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="https://..." value={form.imagenUrl} onChange={(e) => setForm((f) => ({ ...f, imagenUrl: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
