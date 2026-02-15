import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  edad: "",
  cargo: "",
  sedeId: "",
};

export default function Usuarios() {
  const [form, setForm] = useState(emptyForm);
  const [sectores, setSectores] = useState<{ id: number; nombreSector: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/sectores", { params: { size: 100 } })
      .then((r) => setSectores(r.data?.content ?? r.data ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const username = form.username.trim();
    const password = form.password.trim();
    const rol = form.rol.trim();
    if (!username || !password || !rol) {
      setError("Usuario, contraseña y rol son obligatorios");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/usuarios", {
        username,
        password,
        rol,
        nombre: form.nombre.trim() || null,
        apellido: form.apellido.trim() || null,
        correo: form.correo.trim() || null,
        edad: form.edad !== "" ? Number(form.edad) : null,
        cargo: form.cargo.trim() || null,
        sedeId: form.sedeId ? Number(form.sedeId) : null,
      });
      setMessage("Usuario creado correctamente. Límites: 3 Cajeros, 1 Ventas por usuario principal.");
      setForm(emptyForm);
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (res?.status === 403) {
        setError("No tiene permiso para crear usuarios.");
      } else {
        setError(res?.data?.message ?? "Error al crear el usuario");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Usuarios</h1>
        <p className="page-subtitle">Crear usuarios (solo SUPERUSUARIO o ADMIN)</p>
      </div>

      <div className="table-container p-6 max-w-xl">
        {message && <p className="text-sm text-success mb-4">{message}</p>}
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario (login) *</Label>
              <Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
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
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Edad</Label>
              <Input type="number" min={0} value={form.edad} onChange={(e) => setForm((f) => ({ ...f, edad: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sede (Sector)</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.sedeId}
              onChange={(e) => setForm((f) => ({ ...f, sedeId: e.target.value }))}
            >
              <option value="">Sin sede</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>{s.nombreSector}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear usuario"}</Button>
        </form>
      </div>
    </>
  );
}
