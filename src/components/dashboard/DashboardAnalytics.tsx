import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

export type VentasSerieDTO = {
  totalVentas: number;
  montoTotal: number;
  graficoLabels?: string[];
  graficoValores?: number[];
  completadas?: number;
  anuladas?: number;
  pendientes?: number;
};

const CHART_PRIMARY = "hsl(var(--chart-1))";
const CHART_FILL_END = "hsl(var(--chart-1) / 0.02)";

function buildSeries(labels: string[] | undefined, valores: number[] | undefined) {
  if (!labels?.length) return [];
  return labels.map((label, idx) => ({
    label,
    monto: Number(valores?.[idx] ?? 0),
  }));
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

type TooltipPayload = { value?: number; payload?: { label?: string } };

function ChartTooltipCard({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const lbl = payload[0]?.payload?.label ?? label;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-[11px] font-medium text-muted-foreground">{lbl}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(v)}</p>
    </div>
  );
}

function EstadoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-[11px] font-medium text-muted-foreground">{p.name}</p>
      <p className="text-sm font-semibold text-foreground tabular-nums">{p.value}</p>
    </div>
  );
}

export function DashboardAnalytics({
  yearLabel,
  monthLabel,
  ventasHoy,
  ventasMes,
  ventasAnio,
}: {
  yearLabel: number;
  monthLabel: string;
  ventasHoy: VentasSerieDTO;
  ventasMes: VentasSerieDTO;
  ventasAnio: VentasSerieDTO;
}) {
  const dataMes = useMemo(
    () => buildSeries(ventasMes.graficoLabels, ventasMes.graficoValores),
    [ventasMes.graficoLabels, ventasMes.graficoValores],
  );
  const dataAnio = useMemo(
    () => buildSeries(ventasAnio.graficoLabels, ventasAnio.graficoValores),
    [ventasAnio.graficoLabels, ventasAnio.graficoValores],
  );
  const dataHoy = useMemo(
    () => buildSeries(ventasHoy.graficoLabels, ventasHoy.graficoValores),
    [ventasHoy.graficoLabels, ventasHoy.graficoValores],
  );

  const estadoMes = useMemo(() => {
    const c = Number(ventasMes.completadas ?? 0);
    const a = Number(ventasMes.anuladas ?? 0);
    const p = Number(ventasMes.pendientes ?? 0);
    return [
      { name: "Completadas", value: c, fill: "hsl(var(--chart-2))" },
      { name: "Anuladas", value: a, fill: "hsl(var(--chart-5))" },
      { name: "Pendientes / otras", value: p, fill: "hsl(var(--chart-3))" },
    ].filter((x) => x.value > 0);
  }, [ventasMes.completadas, ventasMes.anuladas, ventasMes.pendientes]);

  const estadoMesVacio = estadoMes.length === 0;

  const mesTickInterval = Math.max(0, Math.floor((dataMes.length || 1) / 8));

  return (
    <section className="mb-6 space-y-6" aria-label="Gráficos del dashboard">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Analítica</h2>
          <p className="text-sm text-muted-foreground">
            Tendencias y composición con los mismos datos que usa el panel de reportes (Recharts).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 table-container overflow-hidden p-0 shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Ingresos del mes</h3>
            <p className="text-xs text-muted-foreground">
              Monto por día · {monthLabel} {yearLabel}
            </p>
          </div>
          <div className="h-[min(22rem,55vw)] min-h-[240px] w-full px-2 pb-4 pt-2 sm:px-4">
            {dataMes.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sin datos para graficar
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataMes} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashFillMes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_FILL_END} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={mesTickInterval}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={44}
                    fontSize={11}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip content={<ChartTooltipCard />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="monto"
                    stroke={CHART_PRIMARY}
                    strokeWidth={2}
                    fill="url(#dashFillMes)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: CHART_PRIMARY }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="table-container overflow-hidden p-0 shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Ventas del mes</h3>
            <p className="text-xs text-muted-foreground">Por estado operativo</p>
          </div>
          <div className="flex h-[min(22rem,55vw)] min-h-[240px] flex-col items-center justify-center gap-3 px-4 pb-4 pt-2">
            {estadoMesVacio ? (
              <p className="text-center text-sm text-muted-foreground">Sin ventas registradas este mes</p>
            ) : (
              <>
                <div className="h-[200px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={estadoMes}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {estadoMes.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<EstadoTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {estadoMes.map((e) => (
                    <li key={e.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: e.fill }} />
                      <span className="font-medium text-foreground">{e.value}</span>
                      <span>{e.name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="table-container overflow-hidden p-0 shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Ingresos del año</h3>
            <p className="text-xs text-muted-foreground">Total mensual · {yearLabel}</p>
          </div>
          <div className="h-[min(18rem,45vw)] min-h-[220px] w-full px-2 pb-4 pt-2 sm:px-4">
            {dataAnio.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataAnio} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                    fontSize={11}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip content={<ChartTooltipCard />} cursor={{ fill: "hsl(var(--muted) / 0.45)" }} />
                  <Bar
                    dataKey="monto"
                    radius={[6, 6, 0, 0]}
                    fill="hsl(var(--chart-4))"
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="table-container overflow-hidden p-0 shadow-sm">
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Actividad hoy</h3>
            <p className="text-xs text-muted-foreground">Monto acumulado por hora (0–23)</p>
          </div>
          <div className="h-[min(18rem,45vw)] min-h-[220px] w-full px-2 pb-4 pt-2 sm:px-4">
            {dataHoy.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sin datos
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataHoy} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashFillHoy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--info) / 0.02)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    interval={3}
                    fontSize={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                    fontSize={11}
                    tickFormatter={formatCompact}
                  />
                  <Tooltip content={<ChartTooltipCard />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="monto"
                    stroke="hsl(var(--info))"
                    strokeWidth={2}
                    fill="url(#dashFillHoy)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0, fill: "hsl(var(--info))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
