import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Check, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const ASUNTOS = [
  "SOLICITO LA ADQUISICION DE STOCK",
  "SOLICITO REABASTECIMIENTO",
  "SOLICITO MATERIAL DE OFICINA",
  "OTRO",
];

const UNIDADES = [
  { value: "UND", label: "Unidad (UND)" },
  { value: "KILOS", label: "Kilos" },
  { value: "GR", label: "Gramos" },
];

interface SolicitudRow {
  id: number;
  nombre: string;
  apellidos: string;
  cargo: string;
  asunto: string;
  remitenteEmail: string;
  nombreRemitente: string;
  productoId: number | null;
  productoNombre: string | null;
  unidadMedida: string;
  cantidad: number;
  estado: string;
  fechaCreacion: string;
}

const emptyForm = {
  asunto: "",
  remitenteEmail: "",
  nombreRemitente: "",
  productoId: "",
  unidadMedida: "UND",
  cantidad: "",
};

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    nombre: string | null;
    apellido: string | null;
    rolNombre: string;
  } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [remitenteSuggestions, setRemitenteSuggestions] = useState<{ correo: string; nombre: string }[]>([]);
  const remitenteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canApprove = (currentUser?.rolNombre === "SUPERADMIN" || currentUser?.rolNombre === "SUPERUSUARIO" || currentUser?.rolNombre === "ADMIN" || currentUser?.rolNombre === "LOGISTICA");

  const loadSolicitudes = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/solicitudes-stock", { params: { page: pageNum, size: 10 } });
      const data = res.data;
      setSolicitudes(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSolicitudes(0);
  }, [loadSolicitudes]);

  useEffect(() => {
    api.get("/api/auth/me")
      .then((r) => {
        setCurrentUser({
          nombre: r.data?.nombre ?? null,
          apellido: r.data?.apellido ?? null,
          rolNombre: r.data?.rolNombre ?? "",
        });
      })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    api.get("/api/productos", { params: { size: 200 } })
      .then((r) => {
        const list = r.data?.content ?? r.data ?? [];
        setProductos(Array.isArray(list) ? list : []);
      })
      .catch(() => setProductos([]));
  }, []);

  const fetchRemitenteSuggestions = (q: string) => {
    if (!q || q.length < 2) {
      setRemitenteSuggestions([]);
      return;
    }
    api
      .get("/api/solicitudes-stock/usuarios-por-correo", { params: { q } })
      .then((r) => setRemitenteSuggestions(r.data ?? []))
      .catch(() => setRemitenteSuggestions([]));
  };

  const onRemitenteChange = (value: string) => {
    setForm((f) => ({ ...f, remitenteEmail: value, nombreRemitente: "" }));
    if (remitenteTimeoutRef.current) clearTimeout(remitenteTimeoutRef.current);
    remitenteTimeoutRef.current = setTimeout(() => fetchRemitenteSuggestions(value), 300);
  };

  const selectRemitente = (correo: string, nombre: string) => {
    setForm((f) => ({ ...f, remitenteEmail: correo, nombreRemitente: nombre.trim() }));
    setRemitenteSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");
    setSaving(true);
    try {
      const productoId = form.productoId ? Number(form.productoId) : null;
      const cantidad = form.cantidad ? Number(form.cantidad) : null;
      if (!form.asunto?.trim()) {
        setFormError("Asunto es obligatorio");
        setSaving(false);
        return;
      }
      if (!form.remitenteEmail?.trim()) {
        setFormError("Correo del remitente es obligatorio");
        setSaving(false);
        return;
      }
      if (!productoId || !cantidad || cantidad <= 0) {
        setFormError("Producto y cantidad son obligatorios");
        setSaving(false);
        return;
      }
      await api.post("/api/solicitudes-stock", {
        asunto: form.asunto.trim(),
        remitenteEmail: form.remitenteEmail.trim(),
        nombreRemitente: form.nombreRemitente?.trim() || null,
        productoId,
        unidadMedida: form.unidadMedida || "UND",
        cantidad,
      });
      setSuccessMsg("Solicitud enviada correctamente.");
      setForm(emptyForm);
      loadSolicitudes(page);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      setFormError(res?.data?.message ?? "Error al enviar");
    } finally {
      setSaving(false);
    }
  };

  const handleAprobar = async (id: number) => {
    try {
      await api.post(`/api/solicitudes-stock/${id}/aprobar`);
      loadSolicitudes(page);
    } catch {
      // ignore
    }
  };

  const handleDesaprobar = async (id: number) => {
    try {
      await api.post(`/api/solicitudes-stock/${id}/desaprobar`);
      loadSolicitudes(page);
    } catch {
      // ignore
    }
  };

  const handleImprimir = (s: SolicitudRow) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Solicitud ${s.id}</title></head><body style="font-family:sans-serif;padding:20px">
      <h2>Solicitud de adquisición de stock</h2>
      <p><strong>Nombre:</strong> ${s.nombre} ${s.apellidos}</p>
      <p><strong>Cargo:</strong> ${s.cargo}</p>
      <p><strong>Asunto:</strong> ${s.asunto}</p>
      <p><strong>Remitente:</strong> ${s.remitenteEmail}</p>
      <p><strong>Producto:</strong> ${s.productoNombre ?? "-"}</p>
      <p><strong>Unidad:</strong> ${s.unidadMedida}</p>
      <p><strong>Cantidad:</strong> ${s.cantidad}</p>
      <p><strong>Estado:</strong> ${s.estado}</p>
      <p><strong>Fecha:</strong> ${s.fechaCreacion}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
    w.close();
  };

  const nombreCompleto = [currentUser?.nombre, currentUser?.apellido].filter(Boolean).join(" ") || "—";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Solicitudes</h1>
        <p className="page-subtitle">Solicitud de adquisición de stock. Cajero envía, Logística aprueba.</p>
      </div>

      <div className="space-y-6">
        {/* Formulario de solicitud */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Nueva solicitud</h2>
          {successMsg && <p className="text-sm text-green-600 mb-3">{successMsg}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={nombreCompleto} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input value={currentUser?.rolNombre ?? "CAJERO"} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asunto">Asunto *</Label>
                <select
                  id="asunto"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.asunto}
                  onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))}
                  required
                >
                  <option value="">Seleccione o escriba abajo</option>
                  {ASUNTOS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="remitente">Remitente (correo) *</Label>
                <Input
                  id="remitente"
                  type="email"
                  value={form.remitenteEmail}
                  onChange={(e) => onRemitenteChange(e.target.value)}
                  placeholder="Correo del remitente"
                  required
                />
                {remitenteSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background shadow-lg max-h-40 overflow-auto">
                    {remitenteSuggestions.map((u) => (
                      <li
                        key={u.correo}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => selectRemitente(u.correo, u.nombre)}
                      >
                        {u.correo} – {u.nombre}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre de remitente</Label>
                <Input
                  value={form.nombreRemitente}
                  onChange={(e) => setForm((f) => ({ ...f, nombreRemitente: e.target.value }))}
                  placeholder="Se completa al elegir correo"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="producto">Producto / Insumo *</Label>
                <select
                  id="producto"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.productoId}
                  onChange={(e) => setForm((f) => ({ ...f, productoId: e.target.value }))}
                  required
                >
                  <option value="">Seleccione</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad de medida</Label>
                <select
                  id="unidad"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unidadMedida}
                  onChange={(e) => setForm((f) => ({ ...f, unidadMedida: e.target.value }))}
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                  required
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" disabled={saving}>
              <Send className="mr-2 h-4 w-4" />
              {saving ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </div>

        {/* Bandeja de solicitudes */}
        <div className="rounded-lg border border-border overflow-hidden">
          <h2 className="text-lg font-semibold p-4 border-b border-border">Bandeja de solicitudes</h2>
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Fecha</th>
                      <th className="text-left p-3 font-medium">Solicitante</th>
                      <th className="text-left p-3 font-medium">Asunto</th>
                      <th className="text-left p-3 font-medium">Producto</th>
                      <th className="text-left p-3 font-medium">Cant.</th>
                      <th className="text-left p-3 font-medium">Estado</th>
                      {canApprove && <th className="text-right p-3 font-medium">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.length === 0 ? (
                      <tr>
                        <td colSpan={canApprove ? 7 : 6} className="p-6 text-center text-muted-foreground">
                          No hay solicitudes.
                        </td>
                      </tr>
                    ) : (
                      solicitudes.map((s) => (
                        <tr key={s.id} className="border-t border-border">
                          <td className="p-3">{s.fechaCreacion ? new Date(s.fechaCreacion).toLocaleString() : "—"}</td>
                          <td className="p-3">{[s.nombre, s.apellidos].filter(Boolean).join(" ") || "—"}</td>
                          <td className="p-3 max-w-[200px] truncate">{s.asunto || "—"}</td>
                          <td className="p-3">{s.productoNombre ?? "—"}</td>
                          <td className="p-3">{s.cantidad} {s.unidadMedida}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                s.estado === "PENDIENTE"
                                  ? "bg-amber-100 text-amber-800"
                                  : s.estado === "APROBADO"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {s.estado}
                            </span>
                          </td>
                          {canApprove && (
                            <td className="p-3 text-right">
                              {s.estado === "PENDIENTE" && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleAprobar(s.id)} title="Aprobar">
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDesaprobar(s.id)} title="Desaprobar">
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleImprimir(s)} title="Imprimir">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 p-4 border-t border-border">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => loadSolicitudes(page - 1)}>
                    Anterior
                  </Button>
                  <span className="flex items-center px-2 text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => loadSolicitudes(page + 1)}>
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
