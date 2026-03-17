import { useState, useEffect, useCallback } from "react";
import { Search, FileText, FileSpreadsheet, Mail, ExternalLink, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatMoney, type Moneda } from "@/lib/utils";
import { Link } from "react-router-dom";

interface ComprobanteRow {
  id: number;
  fecha: string;
  clienteNombre: string;
  usuarioNombre: string;
  sectorId: number | null;
  sectorNombre: string | null;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
  moneda: string;
}

interface VentaDetalle {
  id: number;
  fecha: string;
  clienteNombre: string;
  usuarioNombre: string;
  sectorNombre: string | null;
  total: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  estado: string;
  moneda: string;
  metodoPagoNombre: string | null;
  conCuotas: boolean | null;
  items: {
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; className: string }> = {
    COMPLETADA: { label: "Completada", className: "bg-green-500/15 text-green-700 dark:text-green-400" },
    PENDIENTE: { label: "Pendiente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
    ANULADA: { label: "Anulada", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  };
  const t = map[estado] ?? { label: estado, className: "bg-muted text-muted-foreground" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${t.className}`}>{t.label}</span>;
}

export default function Facturacion() {
  const [comprobantes, setComprobantes] = useState<ComprobanteRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "FACTURA" | "BOLETA">("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaDetalle, setVentaDetalle] = useState<VentaDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [reenvioModal, setReenvioModal] = useState(false);
  const [reenvioVentaId, setReenvioVentaId] = useState<number | null>(null);

  const loadComprobantes = useCallback(async (pageNum: number = 0) => {
    setLoading(true);
    try {
      const res = await api.get("/api/ventas", { params: { page: pageNum, size: 20 } });
      const data = res.data;
      setComprobantes(data.content ?? []);
      setPage(data.number ?? pageNum);
      setTotalPages(data.totalPages ?? 0);
    } catch {
      setComprobantes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComprobantes(0);
  }, [loadComprobantes]);

  const filtered = comprobantes.filter((v) => {
    if (filtroTipo !== "TODOS" && (v.tipoDocumento ?? "") !== filtroTipo) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      (v.numeroDocumento ?? "").toLowerCase().includes(q) ||
      (v.clienteNombre ?? "").toLowerCase().includes(q)
    );
  });

  const openDetalle = async (id: number) => {
    setShowDetalleModal(true);
    setVentaDetalle(null);
    setLoadingDetalle(true);
    try {
      const res = await api.get(`/api/ventas/${id}`);
      setVentaDetalle(res.data);
    } catch {
      setVentaDetalle(null);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const openReenvio = (ventaId: number) => {
    setReenvioVentaId(ventaId);
    setReenvioModal(true);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Facturación</h1>
        <p className="page-subtitle">
          Consulta de comprobantes emitidos, estados de pago, cobranza y reportes para SUNAT
        </p>
      </div>

      <div className="space-y-6">
        {/* Accesos rápidos: Reportes SUNAT */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reportes para SUNAT
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Exporte ventas por rango de fechas en Excel o PDF para presentación ante SUNAT.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/reportes">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Ir a Reportes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://e.sunat.gob.pe/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                SUNAT (portal)
              </a>
            </Button>
          </div>
        </div>

        {/* Consulta de comprobantes emitidos */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <h2 className="text-base font-semibold text-foreground px-4 py-3 border-b border-border">
            Comprobantes emitidos
          </h2>
          <div className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por número o cliente..."
                className="w-full pl-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "TODOS" | "FACTURA" | "BOLETA")}
            >
              <option value="TODOS">Todos los comprobantes</option>
              <option value="FACTURA">Solo Facturas</option>
              <option value="BOLETA">Solo Boletas</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Cargando comprobantes...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay comprobantes que coincidan con los filtros.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">N° Documento</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-foreground">
                        {v.fecha ? new Date(v.fecha).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground">{v.tipoDocumento ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground font-medium">{v.numeroDocumento ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground">{v.clienteNombre}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {formatMoney(v.total, v.moneda as Moneda)}
                      </td>
                      <td className="px-4 py-3">{estadoBadge(v.estado)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetalle(v.id)}
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openReenvio(v.id)}
                            title="Reenviar comprobante"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => loadComprobantes(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => loadComprobantes(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Reenvío de comprobante: info */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Reenvío de comprobante por correo
          </h2>
          <p className="text-sm text-muted-foreground">
            Desde la tabla puede usar el botón de correo en cada comprobante. La funcionalidad de envío de PDF por correo estará disponible cuando se integre el servicio de notificaciones.
          </p>
        </div>
      </div>

      {/* Modal Detalle */}
      <Dialog open={showDetalleModal} onOpenChange={setShowDetalleModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Detalle del comprobante {ventaDetalle?.tipoDocumento} {ventaDetalle?.numeroDocumento}
            </DialogTitle>
          </DialogHeader>
          {loadingDetalle ? (
            <div className="py-8 text-center text-muted-foreground">Cargando detalle...</div>
          ) : ventaDetalle ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Fecha:</span>
                  <p className="text-foreground">{ventaDetalle.fecha ? new Date(ventaDetalle.fecha).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Estado:</span>
                  <p className="mt-1">{estadoBadge(ventaDetalle.estado)}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Cliente:</span>
                  <p className="text-foreground">{ventaDetalle.clienteNombre}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Método de pago:</span>
                  <p className="text-foreground">{ventaDetalle.metodoPagoNombre ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tipo documento:</span>
                  <p className="text-foreground">{ventaDetalle.tipoDocumento ?? "—"}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">N° Documento:</span>
                  <p className="text-foreground">{ventaDetalle.numeroDocumento ?? "—"}</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-2">Productos</h3>
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventaDetalle.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-foreground">{item.productoNombre}</td>
                          <td className="px-3 py-2 text-right text-foreground">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-foreground">{formatMoney(item.precioUnitario, ventaDetalle.moneda as Moneda)}</td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">{formatMoney(item.subtotal, ventaDetalle.moneda as Moneda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-between items-center rounded-lg border border-border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{formatMoney(ventaDetalle.total, ventaDetalle.moneda as Moneda)}</span>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setShowDetalleModal(false)}>Cerrar</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal Reenvío (placeholder) */}
      <Dialog open={reenvioModal} onOpenChange={setReenvioModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar comprobante por correo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Comprobante #{reenvioVentaId}. La opción de envío de PDF por correo estará disponible cuando se integre el servicio de notificaciones con el cliente.
          </p>
          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setReenvioModal(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
