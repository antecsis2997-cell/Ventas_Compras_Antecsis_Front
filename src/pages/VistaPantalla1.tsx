import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface StockAlerta {
  productoId: number;
  nombre: string;
  stock: number;
  stockMinimoAlerta: number | null;
}

interface MontosAcumulados {
  ventasHoy: number;
  ventasMes: number;
}

export default function VistaPantalla1() {
  const [productosStock, setProductosStock] = useState<StockAlerta[]>([]);
  const [montos, setMontos] = useState<MontosAcumulados>({ ventasHoy: 0, ventasMes: 0 });
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hoy = new Date();
    const fechaHoy = hoy.toISOString().slice(0, 10);
    const year = hoy.getFullYear();
    const month = hoy.getMonth() + 1;

    const load = async () => {
      setLoading(true);
      try {
        const [stockRes, ventasDiaRes, ventasMesRes] = await Promise.all([
          api.get("/api/inventario/stock-bajo-alerta", { params: { size: 20 } }),
          api.get("/api/dashboard/ventas-dia", { params: { fecha: fechaHoy } }),
          api.get("/api/dashboard/ventas-mes", { params: { year, month } }),
        ]);
        const content = stockRes.data?.content ?? [];
        setProductosStock(content.map((p: { productoId?: number; nombre?: string; stock?: number; stockMinimoAlerta?: number | null }, i: number) => ({
          productoId: p.productoId ?? i,
          nombre: p.nombre ?? "—",
          stock: p.stock ?? 0,
          stockMinimoAlerta: p.stockMinimoAlerta ?? null,
        })));
        setMontos({
          ventasHoy: ventasDiaRes.data?.montoTotal ?? 0,
          ventasMes: ventasMesRes.data?.montoTotal ?? 0,
        });
      } catch {
        setProductosStock([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const loop = () => {
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    v.addEventListener("ended", loop);
    v.play().catch(() => {});
    return () => v.removeEventListener("ended", loop);
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Vista Pantalla 1</h1>
        <p className="page-subtitle">Alertas de stock (umbral variable por producto) y montos acumulados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="table-container">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">Alertas de Stock</h3>
            <Link to="/productos" className="text-sm text-primary hover:underline">Ver productos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Stock</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Mínimo alerta</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
                ) : productosStock.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-4 text-center text-muted-foreground">Sin alertas</td></tr>
                ) : (
                  productosStock.map((p, idx) => (
                    <tr key={p.productoId ?? idx} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{p.nombre}</td>
                      <td className="px-5 py-3 text-center text-red-600 font-semibold">{p.stock}</td>
                      <td className="px-5 py-3 text-center">{p.stockMinimoAlerta ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="table-container p-5">
            <h3 className="text-base font-semibold mb-4">Montos totales acumulados</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ventas Hoy</p>
                <p className="text-2xl font-bold text-primary">{formatMoney(Number(montos.ventasHoy))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventas Mes</p>
                <p className="text-2xl font-bold text-primary">{formatMoney(Number(montos.ventasMes))}</p>
              </div>
            </div>
          </div>

          <div className="table-container p-5">
            <h3 className="text-base font-semibold mb-3">Video</h3>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src="/video.mp4"
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Coloque su archivo video.mp4 en public/video.mp4 para reproducirlo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
