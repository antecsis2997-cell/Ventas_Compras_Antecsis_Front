import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store } from "lucide-react";

type Rubro = {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  orden: number;
};

export default function RubrosComercialesAdmin() {
  const [items, setItems] = useState<Rubro[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Rubro[]>("/api/rubros-comerciales/admin");
      setItems(res.data ?? []);
    } catch {
      setItems([]);
      toast.error("No se pudieron cargar los rubros");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (r: Rubro, activo: boolean) => {
    setUpdating(r.id);
    try {
      await api.patch(`/api/rubros-comerciales/${r.id}`, { activo });
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, activo } : x)));
      toast.success(activo ? "Rubro habilitado" : "Rubro deshabilitado");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Error al actualizar");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Rubros comerciales</h1>
        <p className="page-subtitle">
          Habilita o deshabilita sectores de negocio visibles al comprar un plan (Mercado, Zapatería, etc.).
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-sm">
            {items.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{r.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{r.codigo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`rubro-${r.id}`} className="text-sm text-muted-foreground">
                    {r.activo ? "Activo" : "Inactivo"}
                  </Label>
                  <Switch
                    id={`rubro-${r.id}`}
                    checked={r.activo}
                    disabled={updating === r.id}
                    onCheckedChange={(c) => toggle(r, c)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
