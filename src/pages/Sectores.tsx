import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface SectorRow {
  id: number;
  nombreSector: string;
  telefono: string | null;
  direccion: string | null;
}

const emptyForm = {
  nombreSector: "",
  telefono: "",
  direccion: "",
};

export default function Sectores() {
  const [sectores, setSectores] = useState<SectorRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadSectores = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/sectores", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setSectores(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setSectores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSectores(0);
  }, [loadSectores]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (s: SectorRow) => {
    setEditingId(s.id);
    setForm({
      nombreSector: s.nombreSector ?? "",
      telefono: s.telefono ?? "",
      direccion: s.direccion ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const nombre = form.nombreSector?.trim();
    if (!nombre) {
      setFormError("El nombre del sector/sede es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const body = {
        nombreSector: nombre,
        telefono: form.telefono?.trim() || null,
        direccion: form.direccion?.trim() || null,
      };
      if (editingId) {
        await api.put("/api/sectores/" + editingId, body);
      } else {
        await api.post("/api/sectores", body);
      }
      setDialogOpen(false);
      loadSectores(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta sede/sector?")) return;
    try {
      await api.delete("/api/sectores/" + id);
      loadSectores(page);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sectores / Sedes</h1>
        <p className="page-subtitle">Gestión de sedes (nombre, teléfono, dirección)</p>
      </div>

      <div className="table-container">
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva sede
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
                    <th className="text-left p-3 font-medium">Teléfono</th>
                    <th className="text-left p-3 font-medium">Dirección</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sectores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No hay sectores. Cree uno con &quot;Nueva sede&quot;.
                      </td>
                    </tr>
                  ) : (
                    sectores.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-3">{s.nombreSector}</td>
                        <td className="p-3">{s.telefono || "—"}</td>
                        <td className="p-3">{s.direccion || "—"}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Eliminar">
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
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadSectores(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadSectores(page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar sede" : "Nueva sede"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre *</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.nombreSector}
                onChange={(e) => setForm((f) => ({ ...f, nombreSector: e.target.value }))}
                placeholder="Ej. Sede Central"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Opcional"
              />
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
