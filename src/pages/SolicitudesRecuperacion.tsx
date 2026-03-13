import { useState, useEffect, useCallback } from "react";
import { Check, X, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SolicitudRecuperacion {
  id: number;
  username: string;
  nombreCompleto: string;
  correo: string;
  fechaSolicitud: string;
}

export default function SolicitudesRecuperacion() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRecuperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprobarId, setAprobarId] = useState<number | null>(null);
  const [rechazarId, setRechazarId] = useState<number | null>(null);

  const loadSolicitudes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get<SolicitudRecuperacion[]>("/api/auth/solicitudes-recuperacion");
      setSolicitudes(data ?? []);
    } catch {
      if (!silent) setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSolicitudes();

    const interval = setInterval(() => loadSolicitudes(true), 30000); // auto-refresh cada 30 seg
    return () => clearInterval(interval);
  }, [loadSolicitudes]);

  const handleAprobar = async (id: number) => {
    setAprobarId(id);
    try {
      const { data } = await api.post<{ mensaje: string; correoEnviado: string }>(
        `/api/auth/aprobar-recuperacion/${id}`
      );
      toast.success(data?.mensaje ?? "Correo enviado correctamente.", {
        description: `Se envió a ${data?.correoEnviado ?? ""}`,
      });
      setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? "Error al aprobar");
    } finally {
      setAprobarId(null);
    }
  };

  const handleRechazar = async (id: number) => {
    if (!confirm("¿Rechazar esta solicitud?")) return;
    setRechazarId(id);
    try {
      await api.post(`/api/auth/rechazar-recuperacion/${id}`);
      toast.info("Solicitud rechazada");
      setSolicitudes((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(res?.data?.message ?? "Error al rechazar");
    } finally {
      setRechazarId(null);
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return "—";
    const d = new Date(fecha);
    return d.toLocaleString("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Solicitudes de recuperación</h1>
          <p className="page-subtitle">
            Aprueba o rechaza solicitudes de usuarios que olvidaron su contraseña. Al aprobar, se envía el correo de recuperación.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSolicitudes} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="table-container mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : solicitudes.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-muted-foreground">
            <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay solicitudes pendientes.</p>
            <p className="text-sm mt-1">Las solicitudes aparecerán cuando un usuario falle el login y solicite recuperar contraseña.</p>
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Usuario</th>
                  <th className="text-left p-3 font-medium">Nombre</th>
                  <th className="text-left p-3 font-medium">Correo</th>
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-right p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-medium">{s.username}</td>
                    <td className="p-3">{s.nombreCompleto || "—"}</td>
                    <td className="p-3">{s.correo || "—"}</td>
                    <td className="p-3 text-muted-foreground">{formatFecha(s.fechaSolicitud)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAprobar(s.id)}
                        disabled={aprobarId !== null || rechazarId !== null}
                      >
                        {aprobarId === s.id ? (
                          "Enviando..."
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Aprobar y enviar correo
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRechazar(s.id)}
                        disabled={aprobarId !== null || rechazarId !== null}
                      >
                        {rechazarId === s.id ? "..." : <X className="h-4 w-4" />}
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
