import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { LogIn, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/api";

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  if (getAuthToken()) {
    return <Navigate to="/plataforma-sectores" replace />;
  }
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/plataforma-sectores";

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Panel izquierdo */}
        <div className="flex flex-1 flex-col items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex flex-col items-center">
              <img src="/logo-antecsis.png" alt="ANTECSIS" className="h-28 w-auto" />
              <p className="mt-4 text-sm text-muted-foreground">ANTECSIS</p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Sistema de gestión para ventas, inventario y más.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/login", { state: { from: { pathname: from } } })}
                className="w-full h-12 text-base"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Iniciar sesión
              </Button>
              <Button
                onClick={() => navigate("/planes")}
                variant="outline"
                className="w-full h-12 text-base"
                size="lg"
              >
                <Package className="mr-2 h-5 w-5" />
                Obtener el programa
              </Button>
            </div>
          </div>
        </div>
        {/* Panel derecho - área promocional */}
        <div className="hidden flex-1 items-center justify-center bg-primary/5 p-12 lg:flex">
          <div className="max-w-md space-y-4 text-center">
            <div className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-primary/20 bg-background/50">
              <p className="text-sm text-muted-foreground">Espacio promocional</p>
            </div>
            <p className="text-sm text-muted-foreground">Gestión integral para tu negocio</p>
          </div>
        </div>
      </div>
      <p className="shrink-0 border-t border-border/60 py-3 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ANTECSIS · Todos los derechos reservados.
      </p>
    </div>
  );
}
