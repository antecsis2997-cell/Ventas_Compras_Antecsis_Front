import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Truck, Search, CheckCircle2, Package, Zap, Calendar, MapPin, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatMoney, type Moneda } from "@/lib/utils";

type TabTipo = "entregas" | "delivery" | "cincoSeisMeses";

interface EntregaRow {
  id: number;
  fecha: string;
  clienteNombre: string;
  usuarioNombre: string;
  sectorNombre: string | null;
  total: number;
  moneda: string;
  tipoEntrega: string | null;
  direccionEntrega: string | null;
  estadoEntrega: string | null;
  entregadoPorNombre: string | null;
  codigoTracking?: string | null;
}

export default function Entregas() {
  const location = useLocation();
  const isDeliveryPath = location.pathname === "/delivery";
  const isCincoSeisPath = location.pathname === "/entregas/5-6-meses";

  const getInitialTab = (): TabTipo => {
    if (isDeliveryPath) return "delivery";
    if (isCincoSeisPath) return "cincoSeisMeses";
    return "entregas";
  };

  const [activeTab, setActiveTab] = useState<TabTipo>(getInitialTab());
  const [search, setSearch] = useState("");
  const [entregas, setEntregas] = useState<EntregaRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [confirmarEntregaId, setConfirmarEntregaId] = useState<number | null>(null);
  const [solicitandoTrackingId, setSolicitandoTrackingId] = useState<number | null>(null);
  const [confirmacionVentaId, setConfirmacionVentaId] = useState<number | null>(null);
  const [confirmacionCorreo, setConfirmacionCorreo] = useState("");
  const [confirmacionTelefono, setConfirmacionTelefono] = useState("");
  const [firmaBase64, setFirmaBase64] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tipoFiltro = activeTab === "delivery" ? "INMEDIATA" : activeTab === "cincoSeisMeses" ? "PROGRAMADA_5_6_MESES" : "PROGRAMADA_3_5";

  const loadEntregas = useCallback(
    async (pageNum: number = 0) => {
      setLoading(true);
      setEntregas([]);
      try {
        const params: Record<string, string | number> = { page: pageNum, size: 10 };
        if (tipoFiltro) params.tipoEntrega = tipoFiltro;
        const res = await api.get("/api/ventas/entregas-pendientes", { params });
        const data = res.data;
        const items = (data.content ?? []) as EntregaRow[];
        const filtrados = items.filter((e) => (e.tipoEntrega?.toUpperCase() ?? "") === tipoFiltro);
        setEntregas(filtrados);
        setPage(data.number ?? pageNum);
        setTotalPages(data.totalPages ?? 0);
      } catch {
        setEntregas([]);
      } finally {
        setLoading(false);
      }
    },
    [tipoFiltro]
  );

  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [isDeliveryPath, isCincoSeisPath]);

  useEffect(() => {
    loadEntregas(0);
  }, [loadEntregas]);

  const marcarEntregado = async (ventaId: number) => {
    setConfirmarEntregaId(null);
    setMarcandoId(ventaId);
    try {
      await api.patch(`/api/ventas/${ventaId}/marcar-entregado`);
      loadEntregas(page);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al marcar entrega";
      alert(msg);
    } finally {
      setMarcandoId(null);
    }
  };

  const solicitarTracking = async (ventaId: number) => {
    setSolicitandoTrackingId(ventaId);
    try {
      await api.post(`/api/ventas/${ventaId}/solicitar-tracking`);
      loadEntregas(page);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al solicitar tracking";
      alert(msg);
    } finally {
      setSolicitandoTrackingId(null);
    }
  };

  const iniciarFirma = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    (canvas as unknown as { drawing: boolean }).drawing = true;
  };

  const dibujarFirma = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current as (HTMLCanvasElement & { drawing?: boolean }) | null;
    if (!canvas || !canvas.drawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const terminarFirma = () => {
    const canvas = canvasRef.current as (HTMLCanvasElement & { drawing?: boolean }) | null;
    if (canvas) canvas.drawing = false;
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaBase64("");
  };

  const obtenerFirmaBase64 = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  const enviarConfirmacion = async () => {
    if (!confirmacionVentaId) return;
    const firma = obtenerFirmaBase64();
    setFirmaBase64(firma);
    try {
      await api.post(`/api/ventas/${confirmacionVentaId}/confirmar-entrega`, {
        firmaBase64: firma || undefined,
        correo: confirmacionCorreo.trim() || undefined,
        telefono: confirmacionTelefono.trim() || undefined,
      });
      setConfirmacionVentaId(null);
      setConfirmacionCorreo("");
      setConfirmacionTelefono("");
      limpiarFirma();
      loadEntregas(page);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al confirmar";
      alert(msg);
    }
  };

  const filtered = entregas.filter(
    (e) =>
      e.clienteNombre?.toLowerCase().includes(search.toLowerCase()) ||
      e.direccionEntrega?.toLowerCase().includes(search.toLowerCase()) ||
      String(e.id).includes(search)
  );

  const tipoEntregaLabel = (tipo: string | null) => {
    if (!tipo) return "—";
    if (tipo === "INMEDIATA") return "Inmediata";
    if (tipo === "PROGRAMADA_5_6_MESES") return "5 a 6 meses";
    return "3 a 5 días";
  };

  const tabLabelEntregas = "Entregas (3 a 5 días)";
  const tabLabelDelivery = "Delivery (Inmediata)";
  const tabLabelCincoSeis = "5 a 6 meses";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Logística
          </h1>
          <p className="page-subtitle">
            Entregas programadas y delivery inmediato. Las entregadas se muestran en verde como registro.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-border flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("entregas")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "entregas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          {tabLabelEntregas}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("delivery")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "delivery"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          {tabLabelDelivery}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cincoSeisMeses")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "cincoSeisMeses"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          {tabLabelCincoSeis}
        </button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por cliente, dirección o N° venta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">N° Venta</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Sector</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vendedor</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tracking / Solicitar</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Dirección</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Entregado por</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-4 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-4 text-center text-muted-foreground">
                    No hay registros de {activeTab === "delivery" ? "delivery" : activeTab === "cincoSeisMeses" ? "5 a 6 meses" : "entregas"}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      e.estadoEntrega === "ENTREGADO" ? "bg-green-500/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-primary">{e.id}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.fecha ? new Date(e.fecha).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-foreground">{e.sectorNombre ?? "—"}</td>
                    <td className="px-5 py-3 text-foreground">{e.clienteNombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{e.usuarioNombre}</td>
                    <td className="px-5 py-3 text-foreground">
                      {e.codigoTracking ? (
                        <span className="text-xs font-mono" title={e.codigoTracking}>{e.codigoTracking.slice(0, 12)}...</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => solicitarTracking(e.id)}
                          disabled={solicitandoTrackingId === e.id}
                        >
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          {solicitandoTrackingId === e.id ? "..." : "Solicitar"}
                        </Button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate" title={e.direccionEntrega ?? ""}>
                      {e.direccionEntrega ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      {formatMoney(Number(e.total), (e.moneda as Moneda) ?? "PEN")}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.entregadoPorNombre ?? "—"}
                    </td>
                    <td className="px-5 py-3 flex gap-1 flex-wrap">
                      {e.estadoEntrega === "ENTREGADO" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Entregado
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setConfirmarEntregaId(e.id)}
                            disabled={marcandoId === e.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {marcandoId === e.id ? "..." : "Entregar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmacionVentaId(e.id)}
                          >
                            <FileSignature className="h-4 w-4 mr-1" />
                            Confirmar
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-muted-foreground">
          Página {page + 1} de {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => loadEntregas(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => loadEntregas(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Modal Confirmación entrega - firma, correo, teléfono */}
      <Dialog open={confirmacionVentaId !== null} onOpenChange={(open) => {
        if (!open) {
          setConfirmacionVentaId(null);
          setConfirmacionCorreo("");
          setConfirmacionTelefono("");
          limpiarFirma();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar recepción - Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Firma digital del cliente</label>
              <div className="mt-2 border border-border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="w-full cursor-crosshair bg-white dark:bg-muted"
                  onMouseDown={iniciarFirma}
                  onMouseMove={dibujarFirma}
                  onMouseUp={terminarFirma}
                  onMouseLeave={terminarFirma}
                  style={{ touchAction: "none" }}
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={limpiarFirma} className="mt-1">Limpiar</Button>
            </div>
            <div>
              <label className="text-sm font-medium">Correo del cliente</label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={confirmacionCorreo}
                onChange={(e) => setConfirmacionCorreo(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono del cliente</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={confirmacionTelefono}
                onChange={(e) => setConfirmacionTelefono(e.target.value)}
                placeholder="+51 999 999 999"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmacionVentaId(null)}>Cancelar</Button>
              <Button onClick={enviarConfirmacion}>Registrar confirmación</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarEntregaId !== null} onOpenChange={(open) => !open && setConfirmarEntregaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro que va a entregar?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará esta venta como entregada y cambiará su estado a completado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmarEntregaId !== null && marcarEntregado(confirmarEntregaId)}
            >
              Sí, entregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
