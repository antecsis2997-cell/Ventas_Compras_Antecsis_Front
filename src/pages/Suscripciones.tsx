import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface SuscripcionRow {
  id: number;
  nombreCliente: string;
  ruc: string | null;
  sectorId: number | null;
  sucursalNombre: string | null;
  descripcion: string | null;
  estado: string;
  fechaCaducidad: string;
  paquete: string | null;
  correoReceptor: string | null;
  fechaUltimaAlerta: string | null;
  textoAlerta: string | null;
}

interface SectorRow {
  id: number;
  nombreSector: string;
}

const emptyForm = {
  nombreCliente: "",
  ruc: "",
  sectorId: 0,
  descripcion: "",
  estado: "POR_RENOVAR",
  fechaCaducidad: "",
  paquete: "PAQUETE_BASICO",
  correoReceptor: "",
};

const ESTADOS = [
  { value: "POR_RENOVAR", label: "Por renovar" },
  { value: "PAGADO", label: "Pagado" },
  { value: "TRANSACCION_EN_PROCESO", label: "Transacción en proceso" },
];

export default function Suscripciones() {
  const [items, setItems] = useState<SuscripcionRow[]>([]);
  const [sectores, setSectores] = useState<SectorRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("");
  const [alertSending, setAlertSending] = useState<number | null>(null);

  const loadSectores = useCallback(async () => {
    try {
      const res = await api.get("/api/sectores", { params: { size: 100 } });
      const data = res.data;
      setSectores(data.content ?? []);
    } catch {
      setSectores([]);
    }
  }, []);

  const loadItems = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pageNum, size: 10 };
      if (estadoFilter) params.estado = estadoFilter;
      const res = await api.get("/api/suscripciones", { params });
      const data = res.data;
      setItems(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  useEffect(() => {
    loadSectores();
  }, [loadSectores]);

  useEffect(() => {
    loadItems(0);
  }, [loadItems]);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sectorId: sectores[0]?.id ?? 0 });
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (s: SuscripcionRow) => {
    setEditingId(s.id);
    setForm({
      nombreCliente: s.nombreCliente ?? "",
      ruc: s.ruc ?? "",
      sectorId: s.sectorId ?? 0,
      descripcion: s.descripcion ?? "",
      estado: s.estado ?? "POR_RENOVAR",
      fechaCaducidad: s.fechaCaducidad ? s.fechaCaducidad.split("T")[0] : "",
      paquete: s.paquete ?? "PAQUETE_BASICO",
      correoReceptor: s.correoReceptor ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.nombreCliente?.trim()) {
      setFormError("El nombre del cliente es obligatorio");
      return;
    }
    if (!form.fechaCaducidad) {
      setFormError("La fecha de caducidad es obligatoria");
      return;
    }
    if (!form.sectorId) {
      setFormError("Debe seleccionar una sucursal");
      return;
    }
    setSaving(true);
    try {
      const body = {
        nombreCliente: form.nombreCliente.trim(),
        ruc: form.ruc?.trim() || null,
        sectorId: form.sectorId,
        descripcion: form.descripcion?.trim() || null,
        estado: form.estado,
        fechaCaducidad: form.fechaCaducidad,
        paquete: form.paquete?.trim() || null,
        correoReceptor: form.correoReceptor?.trim() || null,
      };
      if (editingId) {
        await api.put("/api/suscripciones/" + editingId, body);
      } else {
        await api.post("/api/suscripciones", body);
      }
      setDialogOpen(false);
      loadItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteError("");
    if (!confirm("¿Eliminar esta suscripción?")) return;
    try {
      await api.delete("/api/suscripciones/" + id);
      loadItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setDeleteError(msg || "No se pudo eliminar");
    }
  };

  const handleEnviarAlerta = async (id: number) => {
    setAlertSending(id);
    try {
      await api.post("/api/suscripciones/" + id + "/enviar-alerta");
      loadItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || "No se pudo enviar la alerta");
    } finally {
      setAlertSending(null);
    }
  };

  const estadoBadge = (estado: string) => {
    const v = estado?.toUpperCase() ?? "";
    if (v === "PAGADO") return <Badge variant="default" className="bg-green-600">Pagado</Badge>;
    if (v === "TRANSACCION_EN_PROCESO") return <Badge variant="secondary">En proceso</Badge>;
    return <Badge variant="destructive">Por renovar</Badge>;
  };

  const isVencida = (fecha: string) => {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Administrador de Suscripción</h1>
        <p className="page-subtitle">
          Gestión de licencias por punto/sucursal. Alertas por correo cuando la suscripción vence.
        </p>
      </div>

      <div className="table-container">
        {deleteError && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        )}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex gap-2 items-center">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva suscripción
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-left p-3 font-medium">RUC</th>
                    <th className="text-left p-3 font-medium">Sucursal</th>
                    <th className="text-left p-3 font-medium">Descripción</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">F. Caducidad</th>
                    <th className="text-left p-3 font-medium">Paquete</th>
                    <th className="text-left p-3 font-medium">Alerta</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-muted-foreground">
                        No hay suscripciones. Cree una con &quot;Nueva suscripción&quot;.
                      </td>
                    </tr>
                  ) : (
                    items.map((s, idx) => (
                      <tr
                        key={s.id}
                        className={`border-t border-border ${isVencida(s.fechaCaducidad) ? "bg-destructive/5" : ""}`}
                      >
                        <td className="p-3">{String(idx + 1 + page * 10).padStart(2, "0")}</td>
                        <td className="p-3 font-medium">{s.nombreCliente}</td>
                        <td className="p-3">{s.ruc || "—"}</td>
                        <td className="p-3">{s.sucursalNombre || "—"}</td>
                        <td className="p-3 max-w-[180px] truncate" title={s.descripcion ?? ""}>
                          {s.descripcion || "—"}
                        </td>
                        <td className="p-3">{estadoBadge(s.estado)}</td>
                        <td className="p-3">{formatDate(s.fechaCaducidad)}</td>
                        <td className="p-3">{s.paquete || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {s.textoAlerta || "—"}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEnviarAlerta(s.id)}
                            title="Enviar alerta por correo"
                            disabled={!s.correoReceptor || alertSending === s.id}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(s.id)}
                            title="Eliminar"
                          >
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => loadItems(page - 1)}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => loadItems(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingId ? "Editar suscripción" : "Nueva suscripción"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1">
            <div>
              <label className="text-sm font-medium">Cliente *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.nombreCliente}
                onChange={(e) => setForm((f) => ({ ...f, nombreCliente: e.target.value }))}
                placeholder="Ej. MARKET"
              />
            </div>
            <div>
              <label className="text-sm font-medium">RUC</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.ruc}
                onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sucursal *</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.sectorId}
                onChange={(e) => setForm((f) => ({ ...f, sectorId: Number(e.target.value) }))}
                required
              >
                <option value={0}>Seleccione...</option>
                {sectores.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.nombreSector}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Estado *</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha de caducidad *</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.fechaCaducidad}
                onChange={(e) => setForm((f) => ({ ...f, fechaCaducidad: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Paquete</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.paquete}
                onChange={(e) => setForm((f) => ({ ...f, paquete: e.target.value }))}
                placeholder="Ej. PAQUETE_BASICO"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Correo receptor (para alertas)</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.correoReceptor}
                onChange={(e) => setForm((f) => ({ ...f, correoReceptor: e.target.value }))}
                placeholder="correo@ejemplo.com"
              />
            </div>
            </div>
            {formError && <p className="text-sm text-destructive mt-2">{formError}</p>}
            <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t border-border mt-4">
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
