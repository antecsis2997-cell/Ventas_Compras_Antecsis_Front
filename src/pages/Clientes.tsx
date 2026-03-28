import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

const TIPOS_DOC = [
  { value: "DNI",       label: "DNI",                digits: 8  },
  { value: "RUC",       label: "RUC",                digits: 11 },
  { value: "CE",        label: "Carnet Extranjería",  digits: 20 },
  { value: "PASAPORTE", label: "Pasaporte",            digits: 20 },
];

const TIPO_FILTROS = [
  { value: "",        label: "Todos"    },
  { value: "RUC",    label: "Empresas" },
  { value: "DNI",    label: "Personas" },
];

interface ClienteRow {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  tipoDocumento: string | null;
  documento: string | null;
  direccion: string | null;
  distrito?: string | null;
  provincia?: string | null;
  pais?: string | null;
  activo: boolean | null;
}

const emptyForm = {
  nombre: "",
  email: "",
  telefono: "",
  tipoDocumento: "DNI",
  documento: "",
  direccion: "",
  distrito: "",
  provincia: "",
  pais: "",
};

const DEBOUNCE_MS = 350;

function DocBadge({ tipo, doc }: { tipo: string | null; doc: string | null }) {
  if (!doc && !tipo) return <span className="text-muted-foreground">—</span>;
  const t = tipo?.toUpperCase() ?? "";
  const isRuc = t === "RUC" || t === "6";
  const isDni = t === "DNI" || t === "1";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
        isRuc
          ? "bg-blue-500/15 text-blue-400 border border-blue-500/25"
          : isDni
          ? "bg-violet-500/15 text-violet-400 border border-violet-500/25"
          : "bg-white/10 text-white/50 border border-white/15"
      }`}>
        {isRuc ? <Building2 className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
        {tipo || "—"}
      </span>
      <span className="font-mono text-sm">{doc || "—"}</span>
    </span>
  );
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadClientes = useCallback(
    async (pageNum: number = 0) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: pageNum, size: 10 };
        if (searchParam.trim()) params.search = searchParam.trim();
        const res = await api.get("/api/clientes", { params });
        const data = res.data;
        let items: ClienteRow[] = data.content ?? [];
        // Filtro por tipo de documento (client-side ya que el backend no lo soporta aún)
        if (filtroTipo) {
          items = items.filter((c) =>
            c.tipoDocumento?.toUpperCase().trim() === filtroTipo
          );
        }
        setClientes(items);
        setPage(data.number ?? pageNum);
        setTotalPages(data.totalPages ?? 0);
      } catch {
        setClientes([]);
      } finally {
        setLoading(false);
      }
    },
    [searchParam, filtroTipo]
  );

  useEffect(() => {
    const t = setTimeout(() => setSearchParam(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadClientes(0); }, [loadClientes]);

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
      tipoDocumento: c.tipoDocumento ?? "DNI",
      documento: c.documento ?? "",
      direccion: c.direccion ?? "",
      distrito: c.distrito ?? "",
      provincia: c.provincia ?? "",
      pais: c.pais ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const nombre = form.nombre?.trim();
    if (!nombre) { setFormError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const body = {
        nombre,
        email: form.email?.trim() || null,
        telefono: form.telefono?.trim() || null,
        tipoDocumento: form.tipoDocumento?.trim() || null,
        documento: form.documento?.trim() || null,
        direccion: form.direccion?.trim() || null,
        distrito: form.distrito?.trim() || null,
        provincia: form.provincia?.trim() || null,
        pais: form.pais?.trim() || null,
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
    } catch { /* ignore */ }
  };

  const tipoActual = TIPOS_DOC.find((t) => t.value === form.tipoDocumento);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <p className="page-subtitle">Personas naturales (DNI/CE) y empresas (RUC) — base de clientes de la bodega</p>
      </div>

      <div className="table-container">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o RUC..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro rápido por tipo */}
          <div className="flex rounded-md border border-input overflow-hidden text-sm">
            {TIPO_FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFiltroTipo(f.value); setPage(0); }}
                className={`px-3 py-2 transition-colors ${
                  filtroTipo === f.value
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
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
                    <th className="text-left p-3 font-medium">Documento</th>
                    <th className="text-left p-3 font-medium">Contacto</th>
                    <th className="text-left p-3 font-medium">Dirección</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        {searchParam || filtroTipo
                          ? "Sin resultados. Prueba otro filtro o nombre."
                          : "No hay clientes. Crea uno con \"Nuevo cliente\"."}
                      </td>
                    </tr>
                  ) : (
                    clientes.map((c) => (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium max-w-[200px] truncate" title={c.nombre}>
                          {c.nombre}
                        </td>
                        <td className="p-3">
                          <DocBadge tipo={c.tipoDocumento} doc={c.documento} />
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          <div>{c.email || "—"}</div>
                          {c.telefono && <div>{c.telefono}</div>}
                        </td>
                        <td className="p-3 max-w-[160px] truncate text-muted-foreground text-xs" title={c.direccion || ""}>
                          {[c.direccion, c.distrito, c.provincia].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="p-3">
                          {c.activo !== false ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/25">
                              <UserCheck className="h-2.5 w-2.5" /> Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                              <UserX className="h-2.5 w-2.5" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} title="Desactivar">
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

      {/* Modal crear / editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">

            <div>
              <label className="text-sm font-medium">Nombre / Razón Social *</label>
              <input type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Juan Pérez / EMPRESA SAC"
                maxLength={200} />
            </div>

            {/* Tipo documento + N° */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo documento</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.tipoDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value, documento: "" }))}>
                  {TIPOS_DOC.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  N° documento
                  {tipoActual && <span className="ml-1 text-xs text-muted-foreground">({tipoActual.digits === 20 ? "hasta 20 dígitos" : `${tipoActual.digits} dígitos`})</span>}
                </label>
                <input type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  value={form.documento}
                  onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                  placeholder={form.tipoDocumento === "RUC" ? "20123456789" : form.tipoDocumento === "DNI" ? "12345678" : ""}
                  maxLength={tipoActual?.digits ?? 20} />
              </div>
            </div>

            {/* Email + Teléfono */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Email <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input type="email"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="987654321" />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="text-sm font-medium">Dirección <span className="text-muted-foreground font-normal">(opcional — requerida para facturas)</span></label>
              <input type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.direccion}
                onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                placeholder="Av. Principal 123" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Distrito</label>
                <input type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.distrito}
                  onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))}
                  placeholder="Miraflores" />
              </div>
              <div>
                <label className="text-sm font-medium">Provincia</label>
                <input type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.provincia}
                  onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
                  placeholder="Lima" />
              </div>
              <div>
                <label className="text-sm font-medium">País</label>
                <input type="text"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.pais}
                  onChange={(e) => setForm((f) => ({ ...f, pais: e.target.value }))}
                  placeholder="Perú" />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">{formError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
