import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface ProveedorRow {
  id: number;
  nombre: string;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean | null;
}

const emptyForm = {
  nombre: "",
  ruc: "",
  email: "",
  telefono: "",
  direccion: "",
};

export default function Proveedores() {
  const [search, setSearch] = useState("");
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadProveedores = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/proveedores", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setProveedores(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProveedores(0); }, [loadProveedores]);

  const filtered = proveedores.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      (p.ruc ?? "").includes(search)
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (p: ProveedorRow) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre ?? "",
      ruc: p.ruc ?? "",
      email: p.email ?? "",
      telefono: p.telefono ?? "",
      direccion: p.direccion ?? "",
    });
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
      const body = {
        nombre,
        ruc: form.ruc?.trim() || null,
        email: form.email?.trim() || null,
        telefono: form.telefono?.trim() || null,
        direccion: form.direccion?.trim() || null,
      };
      if (editingId) {
        await api.put(`/api/proveedores/${editingId}`, body);
      } else {
        await api.post("/api/proveedores", body);
      }
      setDialogOpen(false);
      loadProveedores(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al guardar";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    try {
      await api.delete(`/api/proveedores/${id}`);
      loadProveedores(page);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Proveedores</h1>
          <p className="page-subtitle">Gestión de proveedores</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUC..."
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
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">RUC</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Teléfono</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Dirección</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-4 text-center text-muted-foreground">No hay proveedores</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-muted-foreground">{p.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-5 py-3 text-foreground">{p.ruc ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.telefono ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{p.direccion ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDelete(p.id)}>
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
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadProveedores(page - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => loadProveedores(page + 1)}>Siguiente</Button>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre / Razón social *</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Distribuidora El Sol S.A.C."
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">RUC</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.ruc}
                onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                placeholder="20XXXXXXXXX"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@proveedor.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="999 999 999"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <input
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                placeholder="Av. Principal 123, Lima"
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
