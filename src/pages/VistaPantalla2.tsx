import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface ProductoRow {
  id: number;
  nombre: string;
  codigo: string;
  stock: number;
  precio: number;
  moneda: string;
}

export default function VistaPantalla2() {
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/productos", { params: { page: 0, size: 200 } });
        const content = res.data?.content ?? res.data ?? [];
        const rows = content.map((p: { id: number; nombre: string; codigo?: string; stock?: number; precio: number; moneda?: string }) => ({
          id: p.id,
          nombre: p.nombre,
          codigo: p.codigo ?? "",
          stock: p.stock ?? 0,
          precio: p.precio,
          moneda: p.moneda ?? "PEN",
        }));
        setProductos(rows);
        const total = rows.reduce((s: number, p: ProductoRow) => s + p.precio * p.stock, 0);
        setSaldoTotal(total);
      } catch {
        setProductos([]);
        setSaldoTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 30000);
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
        <h1 className="page-title">Vista Pantalla 2</h1>
        <p className="page-subtitle">Lista de productos, saldo total y videos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 table-container">
          <div className="p-5 pb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">Lista de Productos</h3>
            <p className="text-lg font-bold text-primary">Saldo total: {formatMoney(saldoTotal)}</p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 z-10">
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Producto</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Stock</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Precio</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">Cargando...</td></tr>
                ) : productos.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-4 text-center text-muted-foreground">Sin productos</td></tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2 font-medium">{p.nombre}</td>
                      <td className="px-5 py-2 text-center">{p.stock}</td>
                      <td className="px-5 py-2 text-right">{formatMoney(p.precio, p.moneda as "PEN" | "USD")}</td>
                      <td className="px-5 py-2 text-right font-medium">{formatMoney(p.precio * p.stock, p.moneda as "PEN" | "USD")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="table-container p-5">
            <h3 className="text-base font-semibold mb-3">Video MP4 (alta prioridad)</h3>
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
          </div>
          <div className="table-container p-5">
            <h3 className="text-base font-semibold mb-3">YouTube (baja prioridad)</h3>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1"
                title="YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
