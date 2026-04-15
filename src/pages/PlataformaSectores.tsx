import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sectoresApi, type SectorPlataformaResponse } from "@/api/sectores";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Building2, LayoutDashboard, Play, ExternalLink } from "lucide-react";

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be" && u.pathname.length > 1) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1).split("/")[0]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function PlataformaSectores() {
  const { rolNombre, esDueñoPlataforma } = useAuth();
  const [items, setItems] = useState<SectorPlataformaResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const data = await sectoresApi.plataforma();
        if (ok) setItems(data ?? []);
      } catch {
        if (ok) setItems([]);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Plataforma principal · Sectores</h1>
        <p className="page-subtitle">
          {esDueñoPlataforma
            ? "Vista de todas las sedes del sistema. Cada tarjeta representa un punto de operación (Market / sucursal)."
            : rolNombre === "SUPERUSUARIO"
              ? "Sus bodegas licenciadas. Use Mi cuenta para cambiar la sede activa u operar en cada una."
              : "Su sede asignada. El video promocional lo configura el administrador de plataforma en Sectores / Sedes."}
        </p>
        {esDueñoPlataforma && (
          <p className="mt-2 text-sm text-muted-foreground">
            Para encender o apagar una bodega (activa / inactiva), use el menú{" "}
            <Link to="/sectores" className="text-primary font-medium hover:underline">
              Sectores / Sedes
            </Link>
            : columna <span className="text-foreground/90">Activa</span> (interruptor). Aquí solo se muestran sedes activas.
          </p>
        )}
        {!esDueñoPlataforma && rolNombre === "SUPERUSUARIO" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Activar o desactivar bodegas a nivel plataforma solo lo puede el administrador del sistema en Sectores / Sedes.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando sedes…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-medium text-foreground">No hay sedes para mostrar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Si no tiene sede asignada, contacte al administrador. El superusuario puede crear sedes en el menú Sectores.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((s, idx) => {
            const embed = s.videoPromocionalUrl ? youtubeEmbedUrl(s.videoPromocionalUrl) : null;
            return (
              <div
                key={s.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-chart-4/[0.06] opacity-80" />
                <div className="relative border-b border-border/60 bg-muted/30 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Sede {String(idx + 1).padStart(2, "0")}
                        </p>
                        <h2 className="text-lg font-bold tracking-tight text-foreground">{s.nombreSector}</h2>
                      </div>
                    </div>
                  </div>
                  {(s.telefono || s.direccion) && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {[s.direccion, s.telefono].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="relative flex flex-1 flex-col p-5">
                  {embed ? (
                    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-black/5 shadow-inner">
                      <div className="aspect-video w-full">
                        <iframe
                          title={`Video ${s.nombreSector}`}
                          src={embed}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : s.videoPromocionalUrl ? (
                    <a
                      href={s.videoPromocionalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <Play className="h-4 w-4 shrink-0" />
                      Ver video promocional
                      <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />
                    </a>
                  ) : (
                    <div className="mb-4 flex aspect-video items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 text-xs text-muted-foreground">
                      Sin video promocional
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button asChild className="gap-2">
                      <Link to="/dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                        Ir al panel
                      </Link>
                    </Button>
                    {esDueñoPlataforma && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/sectores">Gestionar sedes</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
