import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/AdminLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import Planes from "./pages/Planes";
import Index from "./pages/Index";
import PlataformaSectores from "./pages/PlataformaSectores";
import Productos from "./pages/Productos";
import Ventas from "./pages/Ventas";
import Compras from "./pages/Compras";
import Usuarios from "./pages/Usuarios";
import Sectores from "./pages/Sectores";
import Suscripciones from "./pages/Suscripciones";
import Clientes from "./pages/Clientes";
import { PlaceholderPage } from "./components/PlaceholderPage";
import Reportes from "./pages/Reportes";
import ReportesDiarias from "./pages/ReportesDiarias";
import ReportesMensuales from "./pages/ReportesMensuales";
import ReportesAnuales from "./pages/ReportesAnuales";
import Solicitudes from "./pages/Solicitudes";
import Insumos from "./pages/Insumos";
import InsumosCatalog from "./pages/InsumosCatalog";
import Proveedores from "./pages/Proveedores";
import Categorias from "./pages/Categorias";
import Entregas from "./pages/Entregas";
import Facturacion from "./pages/Facturacion";
import VistaPantalla1 from "./pages/VistaPantalla1";
import VistaPantalla2 from "./pages/VistaPantalla2";
import MetricasLogistica from "./pages/MetricasLogistica";
import InformePedidosPendientesDelivery from "./pages/InformePedidosPendientesDelivery";
import SolicitudesRecuperacion from "./pages/SolicitudesRecuperacion";
import ConfiguracionFiscal from "./pages/ConfiguracionFiscal";
import CuentaLicencia from "./pages/CuentaLicencia";
import BandejaNotificaciones from "./pages/BandejaNotificaciones";
import RubrosComercialesAdmin from "./pages/RubrosComercialesAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ModuleRoute({ modulo, children }: { modulo: string; children: React.ReactNode }) {
  const { hasModule } = useAuth();
  if (!hasModule(modulo)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function SectoresRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Sectores />;
}

function SuscripcionesRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Suscripciones />;
}

function RubrosComercialesRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO") {
    return <Navigate to="/dashboard" replace />;
  }
  return <RubrosComercialesAdmin />;
}

function SolicitudesRecuperacionRoute() {
  const { rolNombre } = useAuth();
  if (rolNombre !== "SUPERUSUARIO" && rolNombre !== "ADMIN" && rolNombre !== "SOPORTE") {
    return <Navigate to="/dashboard" replace />;
  }
  return <SolicitudesRecuperacion />;
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
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/planes" element={<Planes />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<DashboardLayout><ModuleRoute modulo="DASHBOARD"><Index /></ModuleRoute></DashboardLayout>} />
            <Route path="/plataforma-sectores" element={<DashboardLayout><ModuleRoute modulo="DASHBOARD"><PlataformaSectores /></ModuleRoute></DashboardLayout>} />
            <Route path="/productos" element={<DashboardLayout><ModuleRoute modulo="PRODUCTOS"><Productos /></ModuleRoute></DashboardLayout>} />
            <Route path="/ventas" element={<DashboardLayout><ModuleRoute modulo="VENTAS"><Ventas /></ModuleRoute></DashboardLayout>} />
            <Route path="/vista-pantalla-1" element={<DashboardLayout><ModuleRoute modulo="DASHBOARD"><VistaPantalla1 /></ModuleRoute></DashboardLayout>} />
            <Route path="/vista-pantalla-2" element={<DashboardLayout><ModuleRoute modulo="DASHBOARD"><VistaPantalla2 /></ModuleRoute></DashboardLayout>} />
            <Route path="/compras" element={<DashboardLayout><ModuleRoute modulo="COMPRAS"><Compras /></ModuleRoute></DashboardLayout>} />
            <Route path="/insumos" element={<DashboardLayout><ModuleRoute modulo="INVENTARIO"><Insumos /></ModuleRoute></DashboardLayout>} />
            <Route path="/insumos/catalogo" element={<DashboardLayout><ModuleRoute modulo="INVENTARIO"><InsumosCatalog /></ModuleRoute></DashboardLayout>} />
            <Route path="/usuarios" element={<DashboardLayout><ModuleRoute modulo="USUARIOS"><Usuarios /></ModuleRoute></DashboardLayout>} />
            <Route path="/solicitudes-recuperacion" element={<DashboardLayout><SolicitudesRecuperacionRoute /></DashboardLayout>} />
            <Route path="/clientes" element={<DashboardLayout><ModuleRoute modulo="CLIENTES"><Clientes /></ModuleRoute></DashboardLayout>} />
            <Route path="/proveedores" element={<DashboardLayout><ModuleRoute modulo="PROVEEDORES"><Proveedores /></ModuleRoute></DashboardLayout>} />
            <Route path="/categorias" element={<DashboardLayout><ModuleRoute modulo="PRODUCTOS"><Categorias /></ModuleRoute></DashboardLayout>} />
            <Route path="/sectores" element={<DashboardLayout><SectoresRoute /></DashboardLayout>} />
            <Route path="/suscripciones" element={<DashboardLayout><SuscripcionesRoute /></DashboardLayout>} />
            <Route path="/admin/rubros-comerciales" element={<DashboardLayout><RubrosComercialesRoute /></DashboardLayout>} />
            <Route path="/cuenta/licencia" element={<DashboardLayout><CuentaLicencia /></DashboardLayout>} />
            <Route path="/cuenta/bandeja" element={<DashboardLayout><BandejaNotificaciones /></DashboardLayout>} />
            <Route path="/localizacion" element={<DashboardLayout><PlaceholderPage title="Localización" subtitle="Gestión de ubicaciones" /></DashboardLayout>} />
            <Route path="/solicitudes" element={<DashboardLayout><ModuleRoute modulo="SOLICITUDES_STOCK"><Solicitudes /></ModuleRoute></DashboardLayout>} />
            <Route path="/entregas" element={<DashboardLayout><ModuleRoute modulo="LOGISTICA_ENTREGAS"><Entregas /></ModuleRoute></DashboardLayout>} />
            <Route path="/delivery" element={<DashboardLayout><ModuleRoute modulo="LOGISTICA_ENTREGAS"><Entregas /></ModuleRoute></DashboardLayout>} />
            <Route path="/entregas/5-6-meses" element={<DashboardLayout><ModuleRoute modulo="LOGISTICA_ENTREGAS"><Entregas /></ModuleRoute></DashboardLayout>} />
            <Route path="/logistica/metricas" element={<DashboardLayout><ModuleRoute modulo="LOGISTICA_ENTREGAS"><MetricasLogistica /></ModuleRoute></DashboardLayout>} />
            <Route path="/logistica/informe-pedidos-pendientes-delivery" element={<DashboardLayout><ModuleRoute modulo="LOGISTICA_ENTREGAS"><InformePedidosPendientesDelivery /></ModuleRoute></DashboardLayout>} />
            <Route path="/mensajes" element={<DashboardLayout><ModuleRoute modulo="MENSAJES"><PlaceholderPage title="Mensajes" subtitle="CHAT / mensajes" /></ModuleRoute></DashboardLayout>} />
            <Route path="/historial-pedidos" element={<DashboardLayout><ModuleRoute modulo="HISTORIAL_PEDIDOS"><PlaceholderPage title="Historial de pedidos" subtitle="Consulta de pedidos" /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><Reportes /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/diarias" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesDiarias /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/mensuales" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesMensuales /></ModuleRoute></DashboardLayout>} />
            <Route path="/reportes/anuales" element={<DashboardLayout><ModuleRoute modulo="REPORTES"><ReportesAnuales /></ModuleRoute></DashboardLayout>} />
            <Route path="/facturacion" element={<DashboardLayout><ModuleRoute modulo="VENTAS"><Facturacion /></ModuleRoute></DashboardLayout>} />
            <Route path="/configuracion-fiscal" element={<DashboardLayout><ConfiguracionFiscal /></DashboardLayout>} />
            <Route path="/inicio" element={<Navigate to="/plataforma-sectores" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
