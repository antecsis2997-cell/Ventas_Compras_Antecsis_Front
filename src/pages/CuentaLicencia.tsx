import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type EstadoLicencia = {
  tieneContexto: boolean;
  planEtiqueta: string | null;
  planCodigo: string | null;
  estado: string;
  vigenciaHasta: string | null;
  licenciaActivada: boolean;
  rubroNombre: string | null;
  mensaje: string | null;
};

function badgeEstado(estado: string) {
  const u = estado?.toUpperCase() ?? "";
  if (u === "ACTIVO") return <Badge className="bg-emerald-600">Activo</Badge>;
  if (u === "INHABILITADO") return <Badge variant="destructive">Inhabilitado</Badge>;
  if (u === "PENDIENTE_ACTIVACION") return <Badge variant="secondary">Pendiente de activación</Badge>;
  return <Badge variant="outline">{estado}</Badge>;
}

export default function CuentaLicencia() {
  const [estado, setEstado] = useState<EstadoLicencia | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [activando, setActivando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<EstadoLicencia>("/api/mi-cuenta/licencia");
      setEstado(res.data);
    } catch {
      setEstado(null);
      toast.error("No se pudo cargar el estado de la licencia");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Pegue el token recibido por correo");
      return;
    }
    setActivando(true);
    try {
      await api.post("/api/mi-cuenta/licencia/activar", { token: token.trim() });
      toast.success("Licencia activada correctamente");
      setToken("");
      await cargar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "No se pudo activar la licencia");
    } finally {
      setActivando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Cuenta · Licencia</h1>
        <p className="page-subtitle">
          Plan contratado, estado y activación con la clave enviada al correo del administrador del plan.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-chart-2/10" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">Estado del plan</h2>
              {loading ? (
                <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
              ) : estado ? (
                <div className="mt-3 space-y-3 text-sm">
                  {estado.mensaje && (
                    <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{estado.mensaje}</span>
                    </div>
                  )}
                  {estado.tieneContexto && (
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</dt>
                        <dd className="font-semibold text-foreground">{estado.planEtiqueta ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</dt>
                        <dd className="mt-0.5">{badgeEstado(estado.estado)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vigencia hasta</dt>
                        <dd className="font-medium text-foreground">
                          {estado.vigenciaHasta
                            ? new Date(estado.vigenciaHasta).toLocaleDateString("es-PE", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rubro</dt>
                        <dd className="font-medium text-foreground">{estado.rubroNombre ?? "—"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Licencia en sistema</dt>
                        <dd className="mt-1">
                          {estado.licenciaActivada ? (
                            <Badge className="bg-emerald-600">Activada en esta instalación</Badge>
                          ) : (
                            <Badge variant="outline">Aún no ingresó la clave</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Ingresar licencia</h2>
              <p className="text-xs text-muted-foreground">
                Pegue el token completo del correo &quot;Su licencia AnTecsis&quot;. Debe coincidir con la sucursal asignada a su usuario.
              </p>
            </div>
          </div>
          <form onSubmit={activar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-lic">Clave de licencia</Label>
              <Input
                id="token-lic"
                className="font-mono text-xs"
                placeholder="eyJhbGciOiJIUzI1NiJ9..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={activando}>
              {activando ? "Validando…" : "Activar licencia"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
