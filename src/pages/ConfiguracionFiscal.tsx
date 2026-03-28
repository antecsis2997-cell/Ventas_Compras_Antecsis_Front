import { useState, useEffect, useCallback } from "react";
import { Building2, Save, CheckCircle, XCircle, AlertCircle, RefreshCw, Upload, ShieldAlert, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Sector {
  id: number;
  nombreSector: string;
}

interface ConfigFiscal {
  id?: number;
  sectorId: number;
  sectorNombre?: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  domicilioFiscal: string;
  ubigeo: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solUsuario: string;
  solClave: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  serieBoleta: string;
  serieFactura: string;
  ambiente: "beta" | "produccion";
  activo: boolean;
  solConfigurado?: boolean;
  certificadoConfigurado?: boolean;
}

const EMPTY_FORM: Omit<ConfigFiscal, "sectorId"> = {
  ruc: "",
  razonSocial: "",
  nombreComercial: "",
  domicilioFiscal: "",
  ubigeo: "150101",
  distrito: "LIMA",
  provincia: "LIMA",
  departamento: "LIMA",
  solUsuario: "",
  solClave: "",
  certificadoPfxBase64: "",
  certificadoClave: "",
  serieBoleta: "B001",
  serieFactura: "F001",
  ambiente: "beta",
  activo: false,
};

const estadoBadge = (cfg: ConfigFiscal) => {
  if (cfg.activo)
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-xs text-green-400"><CheckCircle className="h-3 w-3" />Activo</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 border border-slate-500/30 px-2 py-0.5 text-xs text-slate-400"><XCircle className="h-3 w-3" />Inactivo</span>;
};

const ambienteBadge = (ambiente: string) => {
  if (ambiente === "produccion")
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs text-red-400">Producción</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-xs text-yellow-400">Beta / Pruebas</span>;
};

export default function ConfiguracionFiscal() {
  const { rolNombre, sedeId, sedeNombre } = useAuth();
  const esSuperusuario = rolNombre === "SUPERUSUARIO";

  const [configs, setConfigs] = useState<ConfigFiscal[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ConfigFiscal>({ sectorId: 0, ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // El backend ya filtra según el rol del usuario autenticado
      const configRes = await api.get("/api/configuracion-fiscal");
      setConfigs(configRes.data ?? []);

      // Solo el SUPERUSUARIO necesita ver todos los sectores para detectar bodegas sin configurar
      if (esSuperusuario) {
        const sectorRes = await api.get("/api/sectores");
        setSectores(sectorRes.data?.content ?? sectorRes.data ?? []);
      }
    } catch {
      setError("Error cargando datos. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }, [esSuperusuario]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirFormulario = (sectorId: number, sectorNombreParam?: string) => {
    const existing = configs.find((c) => c.sectorId === sectorId);
    const sector = sectores.find((s) => s.id === sectorId);
    const nombre = sectorNombreParam ?? sector?.nombreSector ?? existing?.sectorNombre ?? "";
    setForm({
      ...(existing ?? { sectorId, ...EMPTY_FORM }),
      sectorId,
      sectorNombre: nombre,
      // Limpiar campos sensibles: nunca mostramos las credenciales almacenadas
      solUsuario: "",
      solClave: "",
      certificadoPfxBase64: "",
      certificadoClave: "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handlePfxFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
      setForm((f) => ({ ...f, certificadoPfxBase64: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.ruc || form.ruc.length !== 11) { setError("El RUC debe tener 11 dígitos"); return; }
    if (!form.razonSocial) { setError("La razón social es requerida"); return; }
    if (!form.solUsuario || !form.solClave) { setError("Las credenciales SOL son requeridas"); return; }
    if (!form.serieFactura.startsWith("F") || form.serieFactura.length !== 4) { setError("Serie Factura inválida (ej: F001)"); return; }
    if (!form.serieBoleta.startsWith("B") || form.serieBoleta.length !== 4) { setError("Serie Boleta inválida (ej: B001)"); return; }

    setSaving(true);
    try {
      await api.post("/api/configuracion-fiscal", form);
      setSuccess("Configuración guardada correctamente");
      setShowForm(false);
      cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al guardar";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (cfg: ConfigFiscal) => {
    try {
      await api.patch(`/api/configuracion-fiscal/${cfg.id}/${cfg.activo ? "desactivar" : "activar"}`);
      cargar();
    } catch {
      setError("Error actualizando estado");
    }
  };

  // Solo para SUPERUSUARIO: sectores que aún no tienen configuración
  const sectoresSinConfig = sectores.filter((s) => !configs.some((c) => c.sectorId === s.id));

  // ───────────────────────────────────────────────────────────────────────────
  // Vista ADMIN — solo su propia bodega
  // ───────────────────────────────────────────────────────────────────────────
  if (!esSuperusuario) {
    const miConfig = configs.find((c) => c.sectorId === sedeId) ?? null;
    const sinSede = !sedeId;

    return (
      <div>
        <div className="page-header flex items-center justify-between mb-6">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Configuración Fiscal SUNAT
            </h1>
            <p className="page-subtitle">
              Configura las credenciales SUNAT y el certificado digital de tu bodega para emitir comprobantes electrónicos.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button className="ml-auto text-red-300 hover:text-red-100" onClick={() => setError("")}>✕</button>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <CheckCircle className="h-4 w-4 shrink-0" />{success}
            <button className="ml-auto text-green-300 hover:text-green-100" onClick={() => setSuccess("")}>✕</button>
          </div>
        )}

        {sinSede ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-yellow-400" />
            <p className="text-sm font-medium text-yellow-300">No tienes una bodega asignada</p>
            <p className="text-xs text-muted-foreground max-w-sm">Contacta al administrador del sistema para que te asigne a una bodega antes de configurar la facturación SUNAT.</p>
          </div>
        ) : (
          <div className="table-container">
            {/* Cabecera con la bodega del usuario */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Tu bodega: {sedeNombre}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Esta es la única bodega que puedes configurar.</p>
              </div>
              <Button size="sm" onClick={() => abrirFormulario(sedeId!, sedeNombre ?? undefined)}>
                {miConfig ? "Editar configuración" : "Configurar SUNAT"}
              </Button>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : miConfig ? (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-6">
                {/* Estado */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estado</p>
                  <div className="flex items-center gap-2">{estadoBadge(miConfig)}</div>
                </div>
                {/* Ambiente */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ambiente</p>
                  {ambienteBadge(miConfig.ambiente)}
                </div>
                {/* RUC */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">RUC</p>
                  <p className="text-sm font-mono text-foreground">{miConfig.ruc}</p>
                </div>
                {/* Razón Social */}
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Razón Social</p>
                  <p className="text-sm text-foreground">{miConfig.razonSocial}</p>
                </div>
                {/* Series */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Serie Factura</p>
                  <p className="text-sm font-mono text-foreground">{miConfig.serieFactura}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Serie Boleta</p>
                  <p className="text-sm font-mono text-foreground">{miConfig.serieBoleta}</p>
                </div>
                {/* Credenciales */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Credenciales SOL</p>
                  {miConfig.solConfigurado
                    ? <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Configuradas</span>
                    : <span className="text-red-400 text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Sin configurar</span>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Certificado Digital</p>
                  {miConfig.certificadoConfigurado
                    ? <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Cargado</span>
                    : <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />Sin certificado</span>}
                </div>
                {/* Acción activar/desactivar */}
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-border flex gap-3">
                  <Button
                    size="sm"
                    variant={miConfig.activo ? "destructive" : "default"}
                    onClick={() => toggleActivo(miConfig)}
                  >
                    {miConfig.activo ? "Desactivar envío SUNAT" : "Activar envío SUNAT"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aún no has configurado la facturación SUNAT para tu bodega.</p>
                <p className="text-xs text-muted-foreground mt-1">Haz clic en "Configurar SUNAT" para empezar.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal formulario: ADMIN puede editar todo, incluyendo las series */}
        {showForm && <FormularioModal form={form} setForm={setForm} error={error} saving={saving}
          onSubmit={handleSubmit} onClose={() => setShowForm(false)} onPfxFile={handlePfxFile}
          bloqueadoSector seriesReadOnly={false} />}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Vista SUPERUSUARIO — todas las bodegas
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Configuración Fiscal SUNAT
          </h1>
          <p className="page-subtitle">Gestión del SEE del Contribuyente por bodega. Configure las credenciales SUNAT y el certificado digital de cada local.</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button className="ml-auto text-red-300 hover:text-red-100" onClick={() => setError("")}>✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />{success}
          <button className="ml-auto text-green-300 hover:text-green-100" onClick={() => setSuccess("")}>✕</button>
        </div>
      )}

      {/* Bodegas configuradas */}
      {configs.length > 0 && (
        <div className="table-container mb-6">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Bodegas con configuración SUNAT</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bodega</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">RUC</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Razón Social</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Series</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Ambiente</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">SOL</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Certificado</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((cfg) => (
                  <tr key={cfg.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{cfg.sectorNombre}</td>
                    <td className="px-5 py-3 font-mono text-foreground">{cfg.ruc}</td>
                    <td className="px-5 py-3 text-foreground max-w-[200px] truncate">{cfg.razonSocial}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{cfg.serieFactura} / {cfg.serieBoleta}</td>
                    <td className="px-5 py-3">{ambienteBadge(cfg.ambiente)}</td>
                    <td className="px-5 py-3">
                      {cfg.solConfigurado
                        ? <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Configurado</span>
                        : <span className="text-red-400 text-xs flex items-center gap-1"><XCircle className="h-3 w-3" />Sin configurar</span>}
                    </td>
                    <td className="px-5 py-3">
                      {cfg.certificadoConfigurado
                        ? <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Cargado</span>
                        : <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />Sin certificado</span>}
                    </td>
                    <td className="px-5 py-3">{estadoBadge(cfg)}</td>
                    <td className="px-5 py-3 flex gap-2">
                      <button className="text-xs text-primary hover:underline" onClick={() => abrirFormulario(cfg.sectorId, cfg.sectorNombre)}>
                        Editar
                      </button>
                      <button
                        className={`text-xs ${cfg.activo ? "text-destructive" : "text-green-400"} hover:underline`}
                        onClick={() => toggleActivo(cfg)}
                      >{cfg.activo ? "Desactivar" : "Activar"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bodegas sin configuración */}
      {sectoresSinConfig.length > 0 && (
        <div className="table-container">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Bodegas sin configuración SUNAT</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bodega</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sectoresSinConfig.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground">{s.nombreSector}</td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="outline" onClick={() => abrirFormulario(s.id, s.nombreSector)}>
                        Configurar SUNAT
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && configs.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">Cargando configuraciones...</div>
      )}

      {/* Modal formulario: SUPERUSUARIO NO puede editar las series (solo lectura) */}
      {showForm && <FormularioModal form={form} setForm={setForm} error={error} saving={saving}
        onSubmit={handleSubmit} onClose={() => setShowForm(false)} onPfxFile={handlePfxFile}
        bloqueadoSector={false} seriesReadOnly={true} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente del formulario (compartido por ambas vistas)
// ─────────────────────────────────────────────────────────────────────────────
function FormularioModal({
  form, setForm, error, saving, onSubmit, onClose, onPfxFile, bloqueadoSector, seriesReadOnly,
}: {
  form: ConfigFiscal;
  setForm: React.Dispatch<React.SetStateAction<ConfigFiscal>>;
  error: string;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onPfxFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bloqueadoSector: boolean;
  seriesReadOnly: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-gradient-to-br from-[#0b1220] to-[#111827] shadow-xl shadow-black/40 text-white scrollbar-custom">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1220]/90 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold">Configuración SUNAT</h2>
            <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
              {bloqueadoSector && <Lock className="h-3 w-3" />}
              {form.sectorNombre}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}

          {/* Datos empresa */}
          <section>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Datos de la empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/60">RUC (11 dígitos) *</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.ruc} onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))} maxLength={11} placeholder="20123456789" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Ambiente *</label>
                <select className="mt-1 w-full rounded-md border border-white/10 bg-[#0f1929] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.ambiente} onChange={(e) => setForm((f) => ({ ...f, ambiente: e.target.value as "beta" | "produccion" }))}>
                  <option value="beta">Beta (Pruebas SUNAT)</option>
                  <option value="produccion">Producción</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-white/60">Razón Social *</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.razonSocial} onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))} placeholder="MI EMPRESA SAC" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-white/60">Nombre Comercial</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.nombreComercial} onChange={(e) => setForm((f) => ({ ...f, nombreComercial: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-white/60">Domicilio Fiscal</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.domicilioFiscal} onChange={(e) => setForm((f) => ({ ...f, domicilioFiscal: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Ubigeo (6 dígitos)</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.ubigeo} onChange={(e) => setForm((f) => ({ ...f, ubigeo: e.target.value }))} maxLength={6} placeholder="150101" />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Distrito</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.distrito} onChange={(e) => setForm((f) => ({ ...f, distrito: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Provincia</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Departamento</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.departamento} onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* Credenciales SOL */}
          <section>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Credenciales SOL (usuario secundario)</h3>
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-300 mb-3">
              <strong>Recomendación de seguridad:</strong> Crea un usuario secundario en SUNAT Operaciones en Línea con permisos solo para facturación electrónica. No uses tu clave SOL principal.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/60">Usuario SOL *</label>
                <input className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.solUsuario} onChange={(e) => setForm((f) => ({ ...f, solUsuario: e.target.value }))} placeholder="20123456789USUARIO" />
                <p className="mt-1 text-xs text-white/40">RUC + nombre del usuario SOL secundario</p>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Clave SOL *</label>
                <input type="password" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.solClave} onChange={(e) => setForm((f) => ({ ...f, solClave: e.target.value }))} />
                <p className="mt-1 text-xs text-white/40">Se cifra con AES-256 antes de guardar</p>
              </div>
            </div>
          </section>

          {/* Certificado digital */}
          <section>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Certificado Digital (.PFX)</h3>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300 mb-3">
              Formato .PFX o .P12. SUNAT lo entrega gratuitamente a empresas con ingresos ≤ S/1,260,000 anuales. También puedes adquirirlo desde S/118/año.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/60">Archivo .PFX</label>
                <label className="mt-1 flex items-center gap-2 cursor-pointer w-full rounded-md border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-white/60 hover:border-primary/50 hover:text-white transition-colors">
                  <Upload className="h-4 w-4 shrink-0" />
                  {form.certificadoPfxBase64 ? "Archivo cargado ✓" : "Seleccionar archivo..."}
                  <input type="file" accept=".pfx,.p12" className="hidden" onChange={onPfxFile} />
                </label>
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Contraseña del .PFX</label>
                <input type="password" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.certificadoClave} onChange={(e) => setForm((f) => ({ ...f, certificadoClave: e.target.value }))} />
                <p className="mt-1 text-xs text-white/40">Se cifra con AES-256 antes de guardar</p>
              </div>
            </div>
          </section>

          {/* Series */}
          <section>
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Series de comprobantes</h3>
            {seriesReadOnly && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Las series solo pueden ser modificadas por el administrador de cada bodega. Aquí se muestran como referencia.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-white/60">Serie Factura (ej: F001) {!seriesReadOnly && "*"}</label>
                <input
                  className={`mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none ${
                    seriesReadOnly
                      ? "border-white/5 bg-white/3 text-white/40 cursor-not-allowed"
                      : "border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-primary/50"
                  }`}
                  value={form.serieFactura}
                  onChange={(e) => !seriesReadOnly && setForm((f) => ({ ...f, serieFactura: e.target.value.toUpperCase() }))}
                  maxLength={4}
                  placeholder="F001"
                  readOnly={seriesReadOnly}
                  tabIndex={seriesReadOnly ? -1 : undefined}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/60">Serie Boleta (ej: B001) {!seriesReadOnly && "*"}</label>
                <input
                  className={`mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none ${
                    seriesReadOnly
                      ? "border-white/5 bg-white/3 text-white/40 cursor-not-allowed"
                      : "border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-primary/50"
                  }`}
                  value={form.serieBoleta}
                  onChange={(e) => !seriesReadOnly && setForm((f) => ({ ...f, serieBoleta: e.target.value.toUpperCase() }))}
                  maxLength={4}
                  placeholder="B001"
                  readOnly={seriesReadOnly}
                  tabIndex={seriesReadOnly ? -1 : undefined}
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-white/10 accent-primary" />
              <span className="text-sm text-white/80">Activar envío a SUNAT al guardar</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-[#0b1220]/90 px-6 py-4 backdrop-blur">
          <Button variant="outline" onClick={onClose} disabled={saving}
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </div>
  );
}
