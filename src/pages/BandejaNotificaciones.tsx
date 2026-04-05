import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Inbox, Mail } from "lucide-react";

type Item = {
  id: number;
  tipo: string;
  titulo: string;
  cuerpoResumen: string | null;
  createdAt: string;
};

export default function BandejaNotificaciones() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<Item[]>("/api/mi-cuenta/bandeja");
        if (ok) setItems(res.data ?? []);
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
        <h1 className="page-title">Bandeja del sistema</h1>
        <p className="page-subtitle">
          Registro de envíos a su correo (licencias, avisos). No sustituye un cliente de correo completo.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
            <p className="mt-3 text-sm font-medium text-foreground">No hay notificaciones</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Asegúrese de tener correo configurado en su usuario. Tras comprar un plan, aparecerá aquí el aviso de licencia.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{n.titulo}</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {n.tipo}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.createdAt
                        ? new Date(n.createdAt).toLocaleString("es-PE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : ""}
                    </p>
                    {n.cuerpoResumen && (
                      <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap break-words">{n.cuerpoResumen}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
