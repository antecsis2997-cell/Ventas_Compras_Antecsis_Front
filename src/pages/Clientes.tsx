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

const TIPOS_DOC = [
  { value: "", label: "—" },
  { value: "RUC", label: "RUC" },
  { value: "DNI", label: "DNI" },
];

interface ClienteRow {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  direccion: string | null;
  activo: boolean | null;
}

const emptyForm = {
  nombre: "",
  email: "",
  telefono: "",
  tipoDocumento: "",
  documento: "",
  direccion: "",
};

const DEBOUNCE_MS = 350;

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadClientes = useCallback(
    async (pageNum: number = 0) => {
      setLoading(true);
      try {
        const params: { page: number; size: number; search?: string } = {
          page: pageNum,
          size: 10,
        };
        if (searchParam.trim()) params.search = searchParam.trim();
        const res = await api.get("/api/clientes", { params });
        const data = res.data;
        setClientes(data.content ?? []);
        setPage(data.number ?? pageNum);
        setTotalPages(data.totalPages ?? 0);
      } catch {
        setClientes([]);
      } finally {
        setLoading(false);
      }
    },
    [searchParam]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearchParam(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadClientes(0);
  }, [loadClientes]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (c: ClienteRow) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      tipoDocumento: c.tipoDocumento ?? "",
      documento: c.documento ?? "",
      direccion: c.direccion ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const nombre = form.nombre?.trim();
    const email = form.email?.trim();
    if (!nombre) {
      setFormError("El nombre es obligatorio");
      return;
    }
    if (!email) {
      setFormError("El email es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const body = {
        nombre,
        email,
        telefono: form.telefono?.trim() || "",
        tipoDocumento: form.tipoDocumento?.trim() || null,
        documento: form.documento?.trim() || null,
        direccion: form.direccion?.trim() || null,
      };
      if (editingId) {
        await api.put("/api/clientes/" + editingId, body);
      } else {
        await api.post("/api/clientes", body);
      }
      setDialogOpen(false);
      loadClientes(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Desactivar este cliente?")) return;
    try {
      await api.delete("/api/clientes/" + id);
      loadClientes(page);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <p className="page-subtitle">Gestión de clientes (nombre, RUC/DNI, contacto)</p>
      </div>

      <div className="table-container">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUC/DNI..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Teléfono</th>
                    <th className="text-left p-3 font-medium">Tipo doc.</th>
                    <th className="text-left p-3 font-medium">RUC / DNI</th>
                    <th className="text-left p-3 font-medium">Dirección</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        {searchParam
                          ? "No hay resultados. Pruebe otro nombre o número."
                          : "No hay clientes. Cree uno con \"Nuevo cliente\"."}
                      </td>
                    </tr>
                  ) : (
                    clientes.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="p-3 font-medium">{c.nombre}</td>
                        <td className="p-3">{c.email}</td>
                        <td className="p-3">{c.telefono || "—"}</td>
                        <td className="p-3">{c.tipoDocumento || "—"}</td>
                        <td className="p-3">{c.documento || "—"}</td>
                        <td className="p-3 max-w-[180px] truncate" title={c.direccion || ""}>
                          {c.direccion || "—"}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadClientes(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadClientes(page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Razón social o nombre"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Opcional pero recomendado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo documento</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.tipoDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}
                >
                  {TIPOS_DOC.map((o) => (
                    <option key={o.value || "x"} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">RUC / DNI</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                  placeholder="Número"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
