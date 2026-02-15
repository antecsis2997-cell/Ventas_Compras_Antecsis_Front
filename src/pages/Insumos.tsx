import { Search, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const insumosData = [
  { id: 1, titulo: "Bolsas Plásticas Medianas", descripcion: "Bolsas para empaque de productos", saldo: 25.00, moneda: "PEN", stock: 500, unidad: "Und", alerta: false },
  { id: 2, titulo: "Papel Térmico 80mm", descripcion: "Rollo para impresora de boletas", saldo: 12.50, moneda: "PEN", stock: 8, unidad: "Und", alerta: true },
  { id: 3, titulo: "Etiquetas de Precio", descripcion: "Etiquetas adhesivas para precios", saldo: 18.00, moneda: "PEN", stock: 200, unidad: "Und", alerta: false },
  { id: 4, titulo: "Cinta de Embalaje", descripcion: "Cinta transparente para sellado", saldo: 5.50, moneda: "USD", stock: 3, unidad: "Und", alerta: true },
];

export default function Insumos() {
  const [search, setSearch] = useState("");
  const filtered = insumosData.filter((i) => i.titulo.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Insumos</h1>
          <p className="page-subtitle">Gestión de insumos y materiales</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />Nuevo Insumo</Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar insumo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-input bg-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Título</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Descripción</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Saldo</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Stock</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Unidad</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${i.alerta ? "bg-destructive/5" : ""}`}>
                  <td className="px-5 py-3 font-mono text-muted-foreground">{i.id}</td>
                  <td className="px-5 py-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {i.titulo}
                      {i.alerta && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[200px] truncate">{i.descripcion}</td>
                  <td className="px-5 py-3 text-foreground">{i.moneda === "USD" ? "$" : "S/"} {i.saldo.toFixed(2)}</td>
                  <td className="px-5 py-3 text-foreground">{i.stock}</td>
                  <td className="px-5 py-3 text-muted-foreground">{i.unidad}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"><Edit className="h-4 w-4" /></button>
                      <button className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
