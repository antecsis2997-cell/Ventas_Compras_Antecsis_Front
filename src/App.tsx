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
import Solicitudes from "./pages/Solicitudes";
import Insumos from "./pages/Insumos";
import Proveedores from "./pages/Proveedores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ModuleRoute({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  const { hasModule } = useAuth();
  if (!hasModule(modulo)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
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
            <Route path="/" element={<DashboardLayout><ModuleRoute modulo="DASHBOARD"><Index /></ModuleRoute></DashboardLayout>} />
            <Route path="/productos" element={<DashboardLayout><ModuleRoute modulo="PRODUCTOS"><Productos /></ModuleRoute></DashboardLayout>} />
            <Route path="/ventas" element={<DashboardLayout><ModuleRoute modulo="VENTAS"><Ventas /></ModuleRoute></DashboardLayout>} />
            <Route path="/compras" element={<DashboardLayout><ModuleRoute modulo="COMPRAS"><Compras /></ModuleRoute></DashboardLayout>} />
            <Route path="/insumos" element={<DashboardLayout><ModuleRoute modulo="INVENTARIO"><Insumos /></ModuleRoute></DashboardLayout>} />
            <Route path="/usuarios" element={<DashboardLayout><ModuleRoute modulo="USUARIOS"><Usuarios /></ModuleRoute></DashboardLayout>} />
            <Route path="/clientes" element={<DashboardLayout><ModuleRoute modulo="CLIENTES"><Clientes /></ModuleRoute></DashboardLayout>} />
            <Route path="/proveedores" element={<DashboardLayout><ModuleRoute modulo="PROVEEDORES"><Proveedores /></ModuleRoute></DashboardLayout>} />
            <Route path="/sectores" element={<DashboardLayout><SectoresRoute /></DashboardLayout>} />
            <Route path="/localizacion" element={<DashboardLayout><PlaceholderPage title="Localización" subtitle="Gestión de ubicaciones" /></DashboardLayout>} />
            <Route path="/solicitudes" element={<DashboardLayout><ModuleRoute modulo="SOLICITUDES_STOCK"><Solicitudes /></ModuleRoute></DashboardLayout>} />
            <Route path="/mensajes" element={<DashboardLayout><ModuleRoute modulo="MENSAJES"><PlaceholderPage title="Mensajes" subtitle="CHAT / mensajes" /></ModuleRoute></DashboardLayout>} />
            <Route path="/historial-pedidos" element={<DashboardLayout><ModuleRoute modulo="HISTORIAL_PEDIDOS"><PlaceholderPage title="Historial de pedidos" subtitle="Consulta de pedidos" /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><Reportes /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/diarias" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesDiarias /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/mensuales" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesMensuales /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/anuales" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesAnuales /></ModuleRoute></DashboardLayout>} />
            <Route path="/facturacion" element={<Navigate to="/ventas" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
