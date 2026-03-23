import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Shield, Users, Building2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ROLES_ADMIN = [
  { value: "CAJERO", label: "Cajero" },
  { value: "ALMACENERO", label: "Almacenero" },
  { value: "VENTAS", label: "Ventas" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "ADMINISTRACION", label: "Administración" },
  { value: "SOPORTE", label: "Soporte" },
];

const ROLES_SUPERUSUARIO = [
  { value: "ADMIN", label: "Administrador" },
  ...ROLES_ADMIN,
];

const ROL_BADGE: Record<string, string> = {
  ADMIN:          "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CAJERO:         "bg-green-500/15 text-green-400 border-green-500/30",
  ALMACENERO:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  VENTAS:         "bg-purple-500/15 text-purple-400 border-purple-500/30",
  LOGISTICA:      "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  ADMINISTRACION: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  SOPORTE:        "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const emptyForm = {
  username: "", password: "", rol: "CAJERO",
  nombre: "", apellido: "", correo: "", fechaNacimiento: "",
  sedeId: "", sedeNombre: "", activo: true,
};

interface UsuarioRow {
  id: number;
  username: string;
  nombre: string | null;
  apellido: string | null;
  correo: string | null;
  edad: number | null;
  fechaNacimiento: string | null;
  sedeId: number | null;
  sedeNombre: string | null;
  rolNombre: string | null;
  activo: boolean | null;
  puedeRecuperarContrasena?: boolean | null;
}

interface ModuloPermiso {
  id: number; codigo: string; nombre: string;
  descripcion: string; icono: string; orden: number; asignado: boolean;
}

export default function Usuarios() {
  const { rolNombre: myRol, username: myUsername, sedeId: mySedeId, sedeNombre: mySedeNombre } = useAuth();
  const esSuperusuario = myRol === "SUPERUSUARIO";

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sectores, setSectores] = useState<{ id: number; nombreSector: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDesactivarId, setConfirmDesactivarId] = useState<number | null>(null);
  const [permisosDialogOpen, setPermisosDialogOpen] = useState(false);
  const [permisosUsuarioId, setPermisosUsuarioId] = useState<number | null>(null);
  const [permisosUsuarioNombre, setPermisosUsuarioNombre] = useState("");
  const [permisosModulos, setPermisosModulos] = useState<ModuloPermiso[]>([]);
  const [permisosLoading, setPermisosLoading] = useState(false);
  const [permisosSaving, setPermisosSaving] = useState(false);
  // Fila expandida en la vista SUPERUSUARIO
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadUsuarios = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/usuarios", { params: { page: pageNum, size: 20 } });
      setUsuarios(res.data.content ?? []);
      setPage(res.data.number ?? pageNum);
      setTotalPages(res.data.totalPages ?? 0);
    } catch { setUsuarios([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsuarios(0); }, [loadUsuarios]);

  useEffect(() => {
    if (!esSuperusuario) return;
    api.get("/api/sectores", { params: { size: 100 } })
      .then((r) => setSectores(r.data?.content ?? r.data ?? []))
      .catch(() => {});
  }, [esSuperusuario]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    const base = { ...emptyForm };
    if (!esSuperusuario && mySedeId) base.sedeId = String(mySedeId);
    setForm(base);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (u: UsuarioRow) => {
    setEditingId(u.id);
    setForm({
      username: u.username, password: "",
      rol: u.rolNombre ?? "CAJERO",
      nombre: u.nombre ?? "", apellido: u.apellido ?? "",
      correo: u.correo ?? "", fechaNacimiento: u.fechaNacimiento ?? "",
      sedeId: u.sedeId != null ? String(u.sedeId) : "",
      sedeNombre: u.sedeNombre ?? "", activo: u.activo ?? true,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleToggleActivo = async (id: number, nuevoActivo: boolean) => {
    setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: nuevoActivo } : u));
    try {
      await api.patch(`/api/usuarios/${id}/activo`, { activo: nuevoActivo });
    } catch {
      setUsuarios((prev) => prev.map((u) => u.id === id ? { ...u, activo: !nuevoActivo } : u));
      toast.error("Error al cambiar estado del usuario");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar definitivamente este usuario? Se borrará de la base de datos.")) return;
    try {
      await api.delete(`/api/usuarios/${id}`);
      loadUsuarios(page);
    } catch { toast.error("No se pudo eliminar el usuario"); }
  };

  const handleTogglePuedeRecuperar = async (u: UsuarioRow, value: boolean) => {
    try {
      await api.patch(`/api/usuarios/${u.id}/puede-recuperar-contrasena`, { puedeRecuperarContrasena: value });
      setUsuarios((prev) => prev.map((usr) => usr.id === u.id ? { ...usr, puedeRecuperarContrasena: value } : usr));
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al actualizar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/usuarios/${editingId}`, {
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          correo: form.correo.trim() || null,
          fechaNacimiento: form.fechaNacimiento || null,
          rol: form.rol.trim() || null,
          sedeId: form.sedeId ? Number(form.sedeId) : null,
          activo: form.activo,
          password: form.password.trim() || null,
        });
      } else {
        if (!form.username.trim() || !form.password.trim() || !form.rol.trim()) {
          setFormError("Usuario, contraseña y rol son obligatorios");
          setSaving(false);
          return;
        }
        if (!form.correo.trim()) {
          setFormError("El correo es obligatorio para poder recuperar la cuenta");
          setSaving(false);
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.correo.trim())) {
          setFormError("El correo no tiene un formato válido");
          setSaving(false);
          return;
        }
        await api.post("/api/usuarios", {
          username: form.username.trim(),
          password: form.password.trim(),
          rol: form.rol.trim(),
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          correo: form.correo.trim() || null,
          fechaNacimiento: form.fechaNacimiento || null,
          sedeId: form.sedeId ? Number(form.sedeId) : null,
        });
      }
      setDialogOpen(false);
      loadUsuarios(page);
      toast.success(editingId ? "Usuario actualizado" : "Usuario creado");
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      setFormError(res?.status === 403 ? "No tiene permiso" : (res?.data?.message ?? "Error al guardar"));
    } finally { setSaving(false); }
  };

  const openPermisos = async (u: UsuarioRow) => {
    setPermisosUsuarioId(u.id);
    setPermisosUsuarioNombre([u.nombre, u.apellido].filter(Boolean).join(" ") || u.username);
    setPermisosDialogOpen(true);
    setPermisosLoading(true);
    try {
      const { data } = await api.get<ModuloPermiso[]>(`/api/permisos/usuarios/${u.id}`);
      setPermisosModulos(data);
    } catch { setPermisosModulos([]); }
    finally { setPermisosLoading(false); }
  };

  const guardarPermisos = async () => {
    if (!permisosUsuarioId) return;
    setPermisosSaving(true);
    try {
      await api.put(`/api/permisos/usuarios/${permisosUsuarioId}`, {
        moduloCodigos: permisosModulos.filter((m) => m.asignado).map((m) => m.codigo),
      });
      setPermisosDialogOpen(false);
      toast.success(`Permisos de ${permisosUsuarioNombre} actualizados`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al guardar permisos");
    } finally { setPermisosSaving(false); }
  };

  const rolBadge = (rol: string | null) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROL_BADGE[rol ?? ""] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}>
      {rol ?? "—"}
    </span>
  );

  const activoBadge = (activo: boolean | null) =>
    activo
      ? <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-xs text-green-400">Activo</span>
      : <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs text-red-400">Inactivo</span>;

  // ── VISTA SUPERUSUARIO: solo ve ADMINs (uno por bodega) ──────────────────

  if (esSuperusuario) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Administradores de Bodegas</h1>
            <p className="page-subtitle">Gestiona los administradores de cada bodega — activa, desactiva o edita sus cuentas.</p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nuevo administrador</Button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bodega</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Correo</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Recuperar clave</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">No hay administradores registrados.</td></tr>
                  ) : usuarios.map((u) => {
                    const isOwnUser = myUsername === u.username;
                    const expanded = expandedId === u.id;
                    return (
                      <>
                        <tr key={u.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${expanded ? "bg-muted/20" : ""}`}>
                          <td className="px-5 py-3 font-medium text-foreground">{u.sedeNombre ?? "—"}</td>
                          <td className="px-5 py-3 font-mono text-sm text-foreground">{u.username}</td>
                          <td className="px-5 py-3 text-foreground">
                            {[u.nombre, u.apellido].filter(Boolean).join(" ") || "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">{u.correo ?? "—"}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {activoBadge(u.activo)}
                              {!isOwnUser && (
                                <Switch
                                  checked={!!u.activo}
                                  onCheckedChange={(checked) => {
                                    if (checked) handleToggleActivo(u.id, true);
                                    else setConfirmDesactivarId(u.id);
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {!isOwnUser ? (
                              <Checkbox
                                checked={!!u.puedeRecuperarContrasena}
                                onCheckedChange={(checked) => handleTogglePuedeRecuperar(u, !!checked)}
                              />
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                                onClick={() => setExpandedId(expanded ? null : u.id)}
                              >
                                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                Detalles
                              </button>
                              <Button variant="ghost" size="icon" onClick={() => !isOwnUser && openPermisos(u)} disabled={isOwnUser} title="Permisos">
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => !isOwnUser && openEdit(u)} disabled={isOwnUser} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => !isOwnUser && handleDelete(u.id)} disabled={isOwnUser} title="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${u.id}-detail`} className="border-b border-border bg-muted/10">
                            <td colSpan={7} className="px-5 py-4">
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">ID</p>
                                  <p className="font-mono">{u.id}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Rol</p>
                                  {rolBadge(u.rolNombre)}
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Edad</p>
                                  <p>{u.edad != null ? `${u.edad} años` : "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Fecha nacimiento</p>
                                  <p>{u.fechaNacimiento ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Bodega (ID)</p>
                                  <p>{u.sedeNombre} <span className="text-muted-foreground text-xs">#{u.sedeId}</span></p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4 pb-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadUsuarios(page - 1)}>Anterior</Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadUsuarios(page + 1)}>Siguiente</Button>
            </div>
          )}
        </div>

        <FormularioDialog
          open={dialogOpen} onOpenChange={setDialogOpen}
          editingId={editingId} form={form} setForm={setForm}
          formError={formError} saving={saving} onSubmit={handleSubmit}
          sectores={sectores} esSuperusuario={true} mySedeId={mySedeId} mySedeNombre={mySedeNombre}
          roles={ROLES_SUPERUSUARIO}
        />
        <ConfirmDesactivar confirmId={confirmDesactivarId} setConfirmId={setConfirmDesactivarId}
          onConfirm={() => { if (confirmDesactivarId != null) { handleToggleActivo(confirmDesactivarId, false); setConfirmDesactivarId(null); } }} />
        <PermisosDialog open={permisosDialogOpen} onOpenChange={setPermisosDialogOpen}
          nombreUsuario={permisosUsuarioNombre} modulos={permisosModulos} loading={permisosLoading}
          saving={permisosSaving} onToggle={(c) => setPermisosModulos((p) => p.map((m) => m.codigo === c ? { ...m, asignado: !m.asignado } : m))}
          onGuardar={guardarPermisos} />
      </>
    );
  }

  // ── VISTA ADMIN: sus propios usuarios de la bodega ────────────────────────

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Usuarios de mi bodega</h1>
          <p className="page-subtitle">
            Gestiona el equipo de <strong>{mySedeNombre ?? "tu bodega"}</strong> — activa, desactiva, edita permisos y datos de cada usuario.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nuevo usuario</Button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Usuario</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Rol</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Correo</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Edad</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Recuperar clave</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No hay usuarios en tu bodega. Crea uno con "Nuevo usuario".
                  </td></tr>
                ) : usuarios.map((u) => {
                  const isOwnUser = myUsername === u.username;
                  const expanded = expandedId === u.id;
                  return (
                    <>
                      <tr key={u.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${expanded ? "bg-muted/20" : ""}`}>
                        <td className="px-5 py-3">
                          <span className="font-mono text-sm text-foreground">{u.username}</span>
                          {isOwnUser && <span className="ml-2 text-[10px] text-muted-foreground">(tú)</span>}
                        </td>
                        <td className="px-5 py-3 text-foreground">
                          {[u.nombre, u.apellido].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="px-5 py-3">{rolBadge(u.rolNombre)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{u.correo ?? "—"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{u.edad != null ? `${u.edad} años` : "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            {activoBadge(u.activo)}
                            {!isOwnUser && (
                              <Switch
                                checked={!!u.activo}
                                onCheckedChange={(checked) => {
                                  if (checked) handleToggleActivo(u.id, true);
                                  else setConfirmDesactivarId(u.id);
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {!isOwnUser && u.sedeId === mySedeId ? (
                            <Checkbox
                              checked={!!u.puedeRecuperarContrasena}
                              onCheckedChange={(checked) => handleTogglePuedeRecuperar(u, !!checked)}
                            />
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                              onClick={() => setExpandedId(expanded ? null : u.id)}
                            >
                              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              Detalles
                            </button>
                            <Button variant="ghost" size="icon" onClick={() => !isOwnUser && openPermisos(u)} disabled={isOwnUser} title="Permisos">
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => !isOwnUser && openEdit(u)} disabled={isOwnUser} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => !isOwnUser && handleDelete(u.id)} disabled={isOwnUser} title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${u.id}-detail`} className="border-b border-border bg-muted/10">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">ID de usuario</p>
                                <p className="font-mono text-foreground">{u.id}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Fecha nacimiento</p>
                                <p className="text-foreground">{u.fechaNacimiento ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Recuperar contraseña</p>
                                <p className="text-foreground">{u.puedeRecuperarContrasena ? "Permitido" : "Bloqueado"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Bodega asignada</p>
                                <p className="text-foreground">{u.sedeNombre ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 pb-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadUsuarios(page - 1)}>Anterior</Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadUsuarios(page + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      <FormularioDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        editingId={editingId} form={form} setForm={setForm}
        formError={formError} saving={saving} onSubmit={handleSubmit}
        sectores={sectores} esSuperusuario={false} mySedeId={mySedeId} mySedeNombre={mySedeNombre}
        roles={ROLES_ADMIN}
      />
      <ConfirmDesactivar confirmId={confirmDesactivarId} setConfirmId={setConfirmDesactivarId}
        onConfirm={() => { if (confirmDesactivarId != null) { handleToggleActivo(confirmDesactivarId, false); setConfirmDesactivarId(null); } }} />
      <PermisosDialog open={permisosDialogOpen} onOpenChange={setPermisosDialogOpen}
        nombreUsuario={permisosUsuarioNombre} modulos={permisosModulos} loading={permisosLoading}
        saving={permisosSaving} onToggle={(c) => setPermisosModulos((p) => p.map((m) => m.codigo === c ? { ...m, asignado: !m.asignado } : m))}
        onGuardar={guardarPermisos} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes reutilizables
// ─────────────────────────────────────────────────────────────────────────────

function FormularioDialog({ open, onOpenChange, editingId, form, setForm, formError, saving, onSubmit, sectores, esSuperusuario, mySedeId, mySedeNombre, roles }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editingId: number | null;
  form: typeof emptyForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  formError: string; saving: boolean; onSubmit: (e: React.FormEvent) => void;
  sectores: { id: number; nombreSector: string }[];
  esSuperusuario: boolean; mySedeId: number | null; mySedeNombre: string | null;
  roles: { value: string; label: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingId ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {!editingId ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usuario (login) *</Label>
                  <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Usuario (login)</Label>
                <Input value={form.username} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}>
                  {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Dejar en blanco para no cambiar" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Apellido</Label>
              <Input value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} /></div>
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico {!editingId && <span className="text-destructive">*</span>}</Label>
            <Input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
              placeholder="usuario@correo.com" required={!editingId} />
            {!editingId && <p className="text-xs text-muted-foreground">Necesario para recuperación de contraseña.</p>}
          </div>
          <div className="space-y-2"><Label>Fecha de nacimiento</Label>
            <Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm((f) => ({ ...f, fechaNacimiento: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Bodega (Sector) *</Label>
            {esSuperusuario ? (
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.sedeId} onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}>
                <option value="">Seleccionar bodega...</option>
                {sectores.map((s) => <option key={s.id} value={s.id}>{s.nombreSector}</option>)}
              </select>
            ) : (
              <Input value={mySedeNombre ?? ""} disabled className="bg-muted" />
            )}
          </div>
          {editingId && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" checked={form.activo}
                onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} className="rounded border-input" />
              <Label htmlFor="activo">Usuario activo</Label>
            </div>
          )}
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar" : "Crear usuario"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDesactivar({ confirmId, setConfirmId, onConfirm }: {
  confirmId: number | null; setConfirmId: (v: number | null) => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open={confirmId != null} onOpenChange={(open) => !open && setConfirmId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
          <AlertDialogDescription>El usuario no podrá iniciar sesión hasta que lo reactive. ¿Desea desactivarlo?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desactivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PermisosDialog({ open, onOpenChange, nombreUsuario, modulos, loading, saving, onToggle, onGuardar }: {
  open: boolean; onOpenChange: (v: boolean) => void; nombreUsuario: string;
  modulos: ModuloPermiso[]; loading: boolean; saving: boolean;
  onToggle: (codigo: string) => void; onGuardar: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Permisos de {nombreUsuario}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Módulos y vistas a los que este usuario tendrá acceso.</p>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Cargando permisos...</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-custom">
            {modulos.map((m) => (
              <label key={m.codigo} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={m.asignado} onCheckedChange={() => onToggle(m.codigo)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.nombre}</p>
                  <p className="text-xs text-muted-foreground">{m.descripcion}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={onGuardar} disabled={saving || loading}>{saving ? "Guardando..." : "Guardar permisos"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
