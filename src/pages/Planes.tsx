import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

const PLANES = [
  {
    id: "BASICO",
    nombre: "Plan Básico",
    descripcion: "Ideal para pequeños negocios. Ventas, inventario básico y reportes.",
    caracteristicas: ["Hasta 2 usuarios", "Ventas y compras", "Reportes básicos"],
    precio: 500,
  },
  {
    id: "INTERMEDIO",
    nombre: "Plan Intermedio",
    descripcion: "Para negocios en crecimiento. Más funciones y soporte.",
    caracteristicas: ["Hasta 5 usuarios", "Ventas, compras, logística", "Reportes avanzados", "Soporte prioritario"],
    precio: 1000,
  },
  {
    id: "AVANZADO",
    nombre: "Plan Premium",
    descripcion: "Solución completa para empresas. Todas las funcionalidades.",
    caracteristicas: ["Usuarios ilimitados", "Todas las funciones", "CRM, RRHH, Finanzas", "Soporte dedicado"],
    precio: 1500,
  },
];

type RubroOption = { codigo: string; nombre: string };

const PAYU_DOCS_URL = "https://developers.payulatam.com/latam/es/docs/integrations/api-integration/payments-api-peru.html#charge";

interface FormPago {
  ruc: string;
  nombreRuc: string;
  correoAdministrador: string;
  rubroCodigo: string;
  nombreTitular: string;
  numeroTarjeta: string;
  fechaCaducidad: string;
  cvv: string;
  conCuotas: boolean;
}

export default function Planes() {
  const navigate = useNavigate();
  const [rubros, setRubros] = useState<RubroOption[]>([]);
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormPago>({
    ruc: "",
    nombreRuc: "",
    correoAdministrador: "",
    rubroCodigo: "",
    nombreTitular: "",
    numeroTarjeta: "",
    fechaCaducidad: "",
    cvv: "",
    conCuotas: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get<RubroOption[]>("/api/rubros-comerciales")
      .then((res) => setRubros(res.data ?? []))
      .catch(() => setRubros([]));
  }, []);

  const openComprar = (planId: string) => {
    setPlanSeleccionado(planId);
    setForm({
      ruc: "",
      nombreRuc: "",
      correoAdministrador: "",
      rubroCodigo: "",
      nombreTitular: "",
      numeroTarjeta: "",
      fechaCaducidad: "",
      cvv: "",
      conCuotas: false,
    });
    setError("");
    setSuccess(false);
    setDialogOpen(true);
  };

  const planActual = planSeleccionado ? PLANES.find((p) => p.id === planSeleccionado) : null;
  const total = planActual?.precio ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.ruc?.trim() || !form.nombreRuc?.trim()) {
      setError("Complete RUC y nombre del RUC");
      return;
    }
    const email = form.correoAdministrador?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingrese un correo válido del administrador del plan (recibirá la licencia)");
      return;
    }
    if (!planSeleccionado) return;
    setLoading(true);
    try {
      await api.post("/api/suscripciones/compra-publica", {
        plan: planSeleccionado,
        ruc: form.ruc.trim(),
        nombreCliente: form.nombreRuc.trim(),
        correoAdministrador: email,
        rubroCodigo: form.rubroCodigo?.trim() || null,
        nombreTitularTarjeta: form.nombreTitular.trim() || null,
        numeroTarjeta: form.numeroTarjeta.replace(/\s/g, "") || null,
        fechaCaducidadTarjeta: form.fechaCaducidad || null,
        sectorId: null,
      });
      setSuccess(true);
      setTimeout(() => {
        setDialogOpen(false);
        navigate("/login");
      }, 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Error al procesar la compra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <h1 className="text-2xl font-bold text-center mb-2">Planes de suscripción</h1>
        <p className="text-center text-muted-foreground mb-12">
          Elija el plan que mejor se adapte a su negocio
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col"
            >
              <h2 className="text-lg font-semibold mb-2">{plan.nombre}</h2>
              <p className="text-sm text-muted-foreground mb-4 flex-1">
                {plan.descripcion}
              </p>
              <ul className="space-y-2 mb-6 text-sm">
                {plan.caracteristicas.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-primary">•</span> {c}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => openComprar(plan.id)}
                className="w-full"
              >
                Comprar
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Método de pago</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Todas las transacciones se realizan de manera segura
            </p>
          </DialogHeader>
          {success ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-green-600 font-medium">¡Pago registrado correctamente!</p>
              <p className="text-sm text-muted-foreground">
                Revise su correo: le enviamos la clave de licencia. Luego inicie sesión y active la licencia en Cuenta → Licencia.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                        step <= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step <= 2 ? "✓" : step}
                    </div>
                  ))}
                </div>

                <Tabs defaultValue="tarjeta">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tarjeta" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pago con tarjeta
                    </TabsTrigger>
                    <TabsTrigger value="otros">
                      <Wallet className="h-4 w-4 mr-2" />
                      Otros métodos de pago
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="tarjeta" className="mt-4 space-y-4">
                    <form onSubmit={handleSubmit} id="form-pago" className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Número de RUC *</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.ruc}
                          onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                          placeholder="Ej. 20123456789"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Nombre del RUC *</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.nombreRuc}
                          onChange={(e) => setForm((f) => ({ ...f, nombreRuc: e.target.value }))}
                          placeholder="Razón social"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Correo del administrador del plan *</label>
                        <input
                          type="email"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.correoAdministrador}
                          onChange={(e) => setForm((f) => ({ ...f, correoAdministrador: e.target.value }))}
                          placeholder="admin@empresa.com"
                          required
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recibirá la licencia firmada y los avisos del plan.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Rubro del negocio</label>
                        <select
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.rubroCodigo}
                          onChange={(e) => setForm((f) => ({ ...f, rubroCodigo: e.target.value }))}
                        >
                          <option value="">Seleccione (opcional)</option>
                          {rubros.map((r) => (
                            <option key={r.codigo} value={r.codigo}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Número de tarjeta</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.numeroTarjeta}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                            setForm((f) => ({ ...f, numeroTarjeta: v }));
                          }}
                          placeholder="Ej. 4100 4444 4444 4444"
                          maxLength={19}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Nombre del titular</label>
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={form.nombreTitular}
                          onChange={(e) => setForm((f) => ({ ...f, nombreTitular: e.target.value }))}
                          placeholder="Como aparece en la tarjeta"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Vencimiento (MM/AA)</label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={form.fechaCaducidad}
                            onChange={(e) => setForm((f) => ({ ...f, fechaCaducidad: e.target.value }))}
                            placeholder="06/25"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">CVV / CVC</label>
                          <input
                            type="text"
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={form.cvv}
                            onChange={(e) => setForm((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.conCuotas}
                          onCheckedChange={(c) => setForm((f) => ({ ...f, conCuotas: !!c }))}
                        />
                        <span className="text-sm">Divide en cuotas con Divídelo</span>
                      </label>
                    </form>
                  </TabsContent>
                  <TabsContent value="otros" className="mt-4">
                    <p className="text-sm text-muted-foreground py-4">
                      Por POS utilice Interbank. Por API utilice Yape. Consulte la documentación PayU para integración.
                    </p>
                    <a
                      href={PAYU_DOCS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Documentación PayU Latam - Pagos Perú
                    </a>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4 h-fit">
                <h3 className="font-semibold mb-3">Resumen de pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>1 producto</span>
                    <span>S/ {planActual?.precio?.toLocaleString("es-PE") ?? "0"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrega</span>
                    <span className="text-green-600">Gratis</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total</span>
                    <span>S/ {total.toLocaleString("es-PE")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">(IGV incluido)</p>
                </div>
                {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                <div className="flex flex-col gap-2 mt-4">
                  <Button type="submit" form="form-pago" className="w-full" disabled={loading}>
                    {loading ? "Procesando..." : "Hacer pedido"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 underline">GANAR PUNTOS:</h4>
            <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
              En este punto realizas la opción de obtener el puntaje de las tarjetas por POS.
            </p>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 mb-2">
              <li>• Por POS - UTILIZAR EL INTERBANK</li>
              <li>• Por API - UTILIZAR EL YAPE</li>
            </ul>
            <a
              href={PAYU_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
            >
              Integración PayU Latam - API Pagos Perú
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
