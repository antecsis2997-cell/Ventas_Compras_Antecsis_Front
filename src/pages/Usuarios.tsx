import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "CAJERO", label: "Cajero" },
  { value: "ALMACENERO", label: "Almacenero" },
  { value: "VENTAS", label: "Ventas" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "ADMINISTRACION", label: "Administración" },
];

const emptyForm = {
  username: "",
  password: "",
  rol: "CAJERO",
  nombre: "",
  apellido: "",
  correo: "",
  fechaNacimiento: "",
  sedeId: "",
  sedeNombre: "",
  activo: true,
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
}

export default function Usuarios() {
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
  const [message, setMessage] = useState("");
  const [confirmDesactivarId, setConfirmDesactivarId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string | null; rolNombre: string; sedeId: number | null; sedeNombre: string | null } | null>(null);

  const loadUsuarios = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/usuarios", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setUsuarios(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsuarios(0);
  }, [loadUsuarios]);

  useEffect(() => {
    if (currentUser?.rolNombre !== "SUPERUSUARIO") return;
    api.get("/api/sectores", { params: { size: 100 } })
      .then((r) => setSectores(r.data?.content ?? r.data ?? []))
      .catch(() => {});
  }, [currentUser?.rolNombre]);

  useEffect(() => {
    api.get("/api/auth/me")
      .then((r) => setCurrentUser({
        username: r.data?.username ?? null,
        rolNombre: r.data?.rolNombre ?? "",
        sedeId: r.data?.sedeId ?? null,
        sedeNombre: r.data?.sedeNombre ?? null,
      }))
      .catch(() => setCurrentUser(null));
  }, []);

  const isAdminConSede = currentUser?.rolNombre === "ADMIN" && currentUser?.sedeId != null;

  const openCreate = () => {
    setEditingId(null);
    const base = { ...emptyForm };
    if (isAdminConSede) {
      base.sedeId = String(currentUser!.sedeId);
      base.rol = "CAJERO";
    }
    setForm(base);
    setFormError("");
    setMessage("");
    setDialogOpen(true);
  };

  const openEdit = (u: UsuarioRow) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      password: "",
      rol: u.rolNombre ?? "CAJERO",
      nombre: u.nombre ?? "",
      apellido: u.apellido ?? "",
      correo: u.correo ?? "",
      fechaNacimiento: u.fechaNacimiento ?? "",
      sedeId: u.sedeId != null ? String(u.sedeId) : "",
      sedeNombre: u.sedeNombre ?? "",
      activo: u.activo ?? true,
    });
    setFormError("");
    setMessage("");
    setDialogOpen(true);
  };

  const handleToggleActivo = async (id: number, nuevoActivo: boolean) => {
    setUsuarios((prev) =>
      prev.map((user) => (user.id === id ? { ...user, activo: nuevoActivo } : user))
    );
    try {
      await api.patch("/api/usuarios/" + id + "/activo", { activo: nuevoActivo });
    } catch {
      setUsuarios((prev) =>
        prev.map((user) => (user.id === id ? { ...user, activo: !nuevoActivo } : user))
      );
    }
  };

  const onConfirmDesactivar = () => {
    if (confirmDesactivarId != null) {
      handleToggleActivo(confirmDesactivarId, false);
      setConfirmDesactivarId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar definitivamente este usuario? Se borrará de la base de datos.")) return;
    try {
      await api.delete("/api/usuarios/" + id);
      loadUsuarios(page);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setMessage("");
    setSaving(true);
    try {
      if (editingId) {
        if (!form.sedeId) {
          setFormError("La sede es obligatoria");
          setSaving(false);
          return;
        }
        await api.put("/api/usuarios/" + editingId, {
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          correo: form.correo.trim() || null,
          fechaNacimiento: form.fechaNacimiento || null,
          rol: form.rol.trim() || null,
          sedeId: Number(form.sedeId),
          activo: form.activo,
          password: form.password.trim() || null,
        });
        setMessage("Usuario actualizado.");
      } else {
        const username = form.username.trim();
        const password = form.password.trim();
        const rol = form.rol.trim();
        if (!username || !password || !rol) {
          setFormError("Usuario, contraseña y rol son obligatorios");
          setSaving(false);
          return;
        }
        if (!isAdminConSede && !form.sedeId) {
          setFormError("La sede es obligatoria");
          setSaving(false);
          return;
        }
        await api.post("/api/usuarios", {
          username,
          password,
          rol,
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          correo: form.correo.trim() || null,
          fechaNacimiento: form.fechaNacimiento || null,
          sedeId: form.sedeId ? Number(form.sedeId) : null,
        });
        setMessage("Usuario creado correctamente.");
      }
      setForm(emptyForm);
      setDialogOpen(false);
      loadUsuarios(page);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (res?.status === 403) {
        setFormError("No tiene permiso.");
      } else {
        setFormError(res?.data?.message ?? "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
        <p className="page-subtitle">Listado y creación de usuarios (solo SUPERUSUARIO o ADMIN)</p>
      </div>

      <div className="table-container">
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
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
                    <th className="text-left p-3 font-medium">Usuario</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Rol</th>
                    <th className="text-left p-3 font-medium">Edad</th>
                    <th className="text-left p-3 font-medium">Sede</th>
                    <th className="text-left p-3 font-medium">Activo</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No hay usuarios. Cree uno con &quot;Nuevo usuario&quot;.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => {
                      const isOwnUser = currentUser?.username != null && u.username === currentUser.username;
                      return (
                      <tr key={u.id} className="border-t border-border">
                        <td className="p-3 font-medium">{u.username}</td>
                        <td className="p-3">
                          {[u.nombre, u.apellido].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td className="p-3">{u.rolNombre ?? "—"}</td>
                        <td className="p-3">{u.edad != null ? u.edad : "—"}</td>
                        <td className="p-3">{u.sedeNombre ?? "—"}</td>
                        <td className="p-3">
                          <Switch
                            checked={!!u.activo}
                            disabled={isOwnUser}
                            onCheckedChange={(checked) => {
                              if (isOwnUser) return;
                              if (checked) handleToggleActivo(u.id, true);
                              else setConfirmDesactivarId(u.id);
                            }}
                          />
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => !isOwnUser && openEdit(u)} title={isOwnUser ? "No puede editar su propio usuario" : "Editar"} disabled={isOwnUser}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => !isOwnUser && handleDelete(u.id)} title={isOwnUser ? "No puede eliminarse" : "Eliminar (borrar de la BD)"} disabled={isOwnUser}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ); })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadUsuarios(page - 1)}>
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadUsuarios(page + 1)}>
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
            <DialogTitle>{editingId ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          {message && <p className="text-sm text-success">{message}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuario (login) *</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <select
                    id="rol"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.rol}
                    onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  >
                    {(currentUser?.rolNombre === "ADMIN" ? ROLES.filter((r) => r.value !== "ADMIN") : ROLES).map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Usuario (login)</Label>
                  <Input id="username" value={form.username} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol-edit">Rol</Label>
                  <select
                    id="rol-edit"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.rol}
                    onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Dejar en blanco para no cambiar"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={form.fechaNacimiento} onChange={(e) => setForm((f) => ({ ...f, fechaNacimiento: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Sede (Sector) *</Label>
              {isAdminConSede ? (
                <Input
                  value={editingId ? form.sedeNombre : (currentUser?.sedeNombre ?? "")}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.sedeId}
                  onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
                >
{sectores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombreSector}</option>
                  ))}
                </select>
              )}
            </div>
            {editingId && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="rounded border-input"
                />
                <Label htmlFor="activo">Usuario activo</Label>
              </div>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Guardar" : "Crear usuario"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDesactivarId != null} onOpenChange={(open) => !open && setConfirmDesactivarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              El usuario no podrá iniciar sesión hasta que lo reactive. ¿Desea desactivarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDesactivar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
