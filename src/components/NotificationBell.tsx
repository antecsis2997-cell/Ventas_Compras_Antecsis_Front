import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, KeyRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface SolicitudRecuperacion {
  id: number;
  username: string;
  nombreCompleto: string;
  correo: string;
  fechaSolicitud: string;
}

/** Reproduce un sonido de notificación (beep) usando Web Audio API */
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Ignorar si el navegador no soporta o está en modo silencio
  }
}

export function NotificationBell() {
  const { rolNombre } = useAuth();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<SolicitudRecuperacion[]>([]);
  const [open, setOpen] = useState(false);
  const lastCountRef = useRef(-1); // -1 = primera carga, no reproducir sonido

  const canSeeNotifications =
    rolNombre === "SUPERADMIN" || rolNombre === "SUPERUSUARIO" || rolNombre === "ADMIN" || rolNombre === "SOPORTE";

  const fetchSolicitudes = useCallback(async () => {
    if (!canSeeNotifications) return;
    try {
      const { data } = await api.get<SolicitudRecuperacion[]>("/api/auth/solicitudes-recuperacion");
      const list = data ?? [];
      setSolicitudes(list);

      // Sonido solo cuando llegan solicitudes nuevas (más que en el poll anterior)
      const count = list.length;
      if (lastCountRef.current >= 0 && count > lastCountRef.current) {
        playNotificationSound();
      }
      lastCountRef.current = count;
    } catch {
      // No mostrar error si falla el polling (ej. sesión expirada)
    }
  }, [canSeeNotifications]);

  useEffect(() => {
    if (!canSeeNotifications) return;
    fetchSolicitudes();

    const interval = setInterval(fetchSolicitudes, 45000); // cada 45 segundos
    return () => clearInterval(interval);
  }, [canSeeNotifications, fetchSolicitudes]);

  const formatFecha = (fecha: string) => {
    if (!fecha) return "";
    const d = new Date(fecha);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    return d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
  };

  const goToSolicitudes = () => {
    setOpen(false);
    navigate("/solicitudes-recuperacion");
  };

  if (!canSeeNotifications) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) fetchSolicitudes();
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5" />
          {solicitudes.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {solicitudes.length > 9 ? "9+" : solicitudes.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Solicitudes de recuperación</h3>
            {solicitudes.length > 0 && (
              <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={goToSolicitudes}>
                Ver todas
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {solicitudes.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No hay solicitudes pendientes
            </div>
          ) : (
            <ul className="divide-y">
              {solicitudes.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={goToSolicitudes}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.correo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatFecha(s.fechaSolicitud)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
