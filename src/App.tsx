import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import Login from "./pages/Login";
import Index from "./pages/Index";
import Productos from "./pages/Productos";
import Ventas from "./pages/Ventas";
import Compras from "./pages/Compras";
import Usuarios from "./pages/Usuarios";
import Sectores from "./pages/Sectores";
import Clientes from "./pages/Clientes";
import { PlaceholderPage } from "./components/PlaceholderPage";
import Reportes from "./pages/Reportes";
import ReportesDiarias from "./pages/ReportesDiarias";
import ReportesMensuales from "./pages/ReportesMensuales";
import ReportesAnuales from "./pages/ReportesAnuales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function UsuariosRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO" && rolNombre !== "ADMIN") {
    return <Navigate to="/" replace />;
  }
  return <Usuarios />;
}

function SectoresRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO") {
    return <Navigate to="/" replace />;
  }
  return <Sectores />;
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<DashboardLayout><Index /></DashboardLayout>} />
            <Route path="/productos" element={<DashboardLayout><Productos /></DashboardLayout>} />
            <Route path="/ventas" element={<DashboardLayout><Ventas /></DashboardLayout>} />
            <Route path="/compras" element={<DashboardLayout><Compras /></DashboardLayout>} />
            <Route path="/insumos" element={<DashboardLayout><Productos /></DashboardLayout>} />
            <Route path="/usuarios" element={<DashboardLayout><UsuariosRoute /></DashboardLayout>} />
            <Route path="/clientes" element={<DashboardLayout><Clientes /></DashboardLayout>} />
            <Route path="/proveedores" element={<DashboardLayout><PlaceholderPage title="Proveedores" subtitle="Gestión de proveedores" /></DashboardLayout>} />
            <Route path="/sectores" element={<DashboardLayout><SectoresRoute /></DashboardLayout>} />
            <Route path="/localizacion" element={<DashboardLayout><PlaceholderPage title="Localización" subtitle="Gestión de ubicaciones" /></DashboardLayout>} />
            <Route path="/solicitudes" element={<DashboardLayout><PlaceholderPage title="Solicitudes" subtitle="Solicitudes de producto" /></DashboardLayout>} />
            <Route path="/mensajes" element={<DashboardLayout><PlaceholderPage title="Mensajes" subtitle="CHAT / mensajes" /></DashboardLayout>} />
            <Route path="/historial-pedidos" element={<DashboardLayout><PlaceholderPage title="Historial de pedidos" subtitle="Consulta de pedidos" /></DashboardLayout>} />
            <Route path="/reportes" element={<DashboardLayout><Reportes /></DashboardLayout>} />
            <Route path="/reportes/diarias" element={<DashboardLayout><ReportesDiarias /></DashboardLayout>} />
            <Route path="/reportes/mensuales" element={<DashboardLayout><ReportesMensuales /></DashboardLayout>} />
            <Route path="/reportes/anuales" element={<DashboardLayout><ReportesAnuales /></DashboardLayout>} />
            <Route path="/facturacion" element={<Navigate to="/ventas" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
