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

interface CategoriaRow {
  id: number;
  nombre: string;
}

const emptyForm = { nombre: "" };

export default function Categorias() {
  const [search, setSearch] = useState("");
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadCategorias = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/categorias", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setCategorias(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategorias(0);
  }, [loadCategorias]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (c: CategoriaRow) => {
    setEditingId(c.id);
    setForm({ nombre: c.nombre });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const nombre = form.nombre?.trim();
    if (!nombre) {
      setFormError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = { nombre };
      if (editingId) {
        await api.put(`/api/categorias/${editingId}`, payload);
      } else {
        await api.post("/api/categorias", payload);
      }
      setDialogOpen(false);
      loadCategorias(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al guardar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await api.delete(`/api/categorias/${id}`);
      loadCategorias(page);
    } catch {
      alert("No se pudo eliminar la categoría");
    }
  };

  const filtered = categorias.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p className="page-subtitle">Gestión de categorías de productos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar categoría..."
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-4 text-center text-muted-foreground">No hay categorías</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-muted-foreground">{c.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.nombre}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEdit(c)}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
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
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadCategorias(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadCategorias(page + 1)}>Siguiente</Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Ej: Abarrotes, Bebidas, Lácteos..."
                value={form.nombre}
                onChange={(e) => setForm({ nombre: e.target.value })}
                maxLength={255}
                required
              />
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
