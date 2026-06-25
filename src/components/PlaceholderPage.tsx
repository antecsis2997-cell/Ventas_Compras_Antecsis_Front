import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

/** Pantalla honesta para rutas previstas sin contenido final aún — evita input “fantasma” en navegación. */
export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      <div className="table-container flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-16 sm:py-20">
        <Construction className="mb-1 h-12 w-12 text-muted-foreground" aria-hidden />
        <div className="max-w-md text-center space-y-2">
          <p className="text-base font-semibold text-foreground">Próximamente</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este módulo está en la hoja de ruta. Cuando esté disponible aparecerán aquí sus pantallas habituales.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/dashboard">Volver al inicio</Link>
        </Button>
      </div>
    </>
  );
}
