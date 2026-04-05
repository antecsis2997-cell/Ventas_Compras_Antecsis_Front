import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarRange, CheckCircle2, CircleDollarSign, Sparkles, TrendingUp } from "lucide-react";

export type ReporteVentasDTO = {
  totalVentas: number;
  montoTotal: number;
  graficoLabels?: string[];
  graficoValores?: number[];
  completadas?: number;
  anuladas?: number;
  pendientes?: number;
};

const C1 = "hsl(var(--chart-1))";
const FILL_END = "hsl(var(--chart-1) / 0.02)";

function seriesFromDto(d: ReporteVentasDTO | null) {
  const labels = d?.graficoLabels;
  const valores = d?.graficoValores;
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

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; payload?: { label?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  const lbl = payload[0]?.payload?.label ?? label;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{lbl}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(v)}</p>
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
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{p.name}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{p.value}</p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent: "primary" | "success" | "info" | "warning";
}) {
  const ring =
    accent === "primary"
      ? "from-primary/15 to-primary/5 ring-primary/20"
      : accent === "success"
        ? "from-emerald-500/12 to-emerald-500/5 ring-emerald-500/15"
        : accent === "info"
          ? "from-sky-500/12 to-sky-500/5 ring-sky-500/15"
          : "from-amber-500/12 to-amber-500/5 ring-amber-500/15";
  const iconBg =
    accent === "primary"
      ? "bg-primary/15 text-primary"
      : accent === "success"
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        : accent === "info"
          ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
          : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br ${ring} p-4 shadow-sm ring-1`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3 p-1">
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
  );
}

export function ReporteVentasVisual({
  data,
  loading,
  variant,
  periodLabel,
  filters,
  exportSlot,
}: {
  data: ReporteVentasDTO | null;
  loading: boolean;
  variant: "dia" | "mes" | "anio";
  periodLabel: string;
  filters: ReactNode;
  exportSlot: ReactNode;
}) {
  const chartData = useMemo(() => seriesFromDto(data), [data]);

  const estadoPie = useMemo(() => {
    const c = Number(data?.completadas ?? 0);
    const a = Number(data?.anuladas ?? 0);
    const p = Number(data?.pendientes ?? 0);
    return [
      { name: "Completadas", value: c, fill: "hsl(var(--chart-2))" },
      { name: "Anuladas", value: a, fill: "hsl(var(--chart-5))" },
      { name: "Pendientes / otras", value: p, fill: "hsl(var(--chart-3))" },
    ].filter((x) => x.value > 0);
  }, [data?.completadas, data?.anuladas, data?.pendientes]);

  const totalVentas = Number(data?.totalVentas ?? 0);
  const montoTotal = Number(data?.montoTotal ?? 0);
  const ticketPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;
  const pctCompletadas =
    totalVentas > 0 ? Math.round((Number(data?.completadas ?? 0) / totalVentas) * 100) : 0;

  const insight = useMemo(() => {
    if (!chartData.length) return null;
    let maxIdx = 0;
    let maxVal = chartData[0].monto;
    chartData.forEach((row, i) => {
      if (row.monto > maxVal) {
        maxVal = row.monto;
        maxIdx = i;
      }
    });
    if (maxVal <= 0) return null;
    const row = chartData[maxIdx];
    if (variant === "dia") {
      return { title: "Franja con mayor monto", detail: `${row.label} · ${formatMoney(maxVal)}` };
    }
    if (variant === "mes") {
      return { title: "Día pico del periodo", detail: `Día ${row.label} · ${formatMoney(maxVal)}` };
    }
    return { title: "Mes más fuerte", detail: `${row.label} · ${formatMoney(maxVal)}` };
  }, [chartData, variant]);

  const xInterval =
    variant === "dia" ? 3 : variant === "mes" ? Math.max(0, Math.floor(chartData.length / 8)) : 0;

  const chartTitle =
    variant === "dia"
      ? "Distribución horaria del monto"
      : variant === "mes"
        ? "Evolución diaria de ingresos"
        : "Ingresos por mes del año";

  const chartSubtitle =
    variant === "dia"
      ? "Suma de ventas por hora (0:00 – 23:00)"
      : variant === "mes"
        ? "Total facturado por cada día del calendario"
        : "Comparativa mensual acumulada";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-4/10" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Periodo seleccionado</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{periodLabel}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Visualización alineada con paneles analíticos modernos: KPIs, tendencia y composición por estado.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">{filters}</div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            label="Operaciones"
            value={String(totalVentas)}
            hint="Ventas registradas"
            accent="primary"
          />
          <KpiCard
            icon={CircleDollarSign}
            label="Ingresos totales"
            value={formatMoney(montoTotal)}
            accent="success"
          />
          <KpiCard
            icon={BarChart3}
            label="Ticket promedio"
            value={totalVentas ? formatMoney(ticketPromedio) : "—"}
            hint={totalVentas ? "Monto ÷ cantidad" : "Sin ventas"}
            accent="info"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Tasa completadas"
            value={totalVentas ? `${pctCompletadas}%` : "—"}
            hint={
              totalVentas
                ? `${data.completadas ?? 0} de ${totalVentas} ventas`
                : "Sin datos"
            }
            accent="warning"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/80 bg-muted/25 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">{chartTitle}</h3>
            <p className="text-xs text-muted-foreground">{chartSubtitle}</p>
          </div>
          <div className="p-3 sm:p-5">
            {loading ? (
              <ChartSkeleton />
            ) : chartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No hay puntos para este periodo
              </div>
            ) : variant === "anio" ? (
              <div className="h-[min(20rem,50vh)] min-h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={48}
                      fontSize={11}
                      tickFormatter={formatCompact}
                    />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
                    <Bar dataKey="monto" fill="hsl(var(--chart-4) / 0.85)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    <Line
                      type="monotone"
                      dataKey="monto"
                      stroke={C1}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: C1, strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[min(20rem,50vh)] min-h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`repArea-${variant}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C1} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={FILL_END} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={xInterval}
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
                    <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="monto"
                      stroke={C1}
                      strokeWidth={2}
                      fill={`url(#repArea-${variant})`}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: C1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {insight && !loading ? (
            <div className="mx-5 mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{insight.title}</p>
                <p className="font-semibold text-foreground">{insight.detail}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="border-b border-border/80 bg-muted/25 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Estado de ventas</h3>
            <p className="text-xs text-muted-foreground">Completadas, anuladas y pendientes</p>
          </div>
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-4 py-6">
            {loading ? (
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            ) : estadoPie.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Sin ventas en el periodo</p>
            ) : (
              <>
                <div className="h-[200px] w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={estadoPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={84}
                        paddingAngle={2}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                      >
                        {estadoPie.map((e, i) => (
                          <Cell key={i} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<EstadoTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                  {estadoPie.map((e) => (
                    <li key={e.name} className="flex items-center justify-between gap-6 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.fill }} />
                        {e.name}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">{e.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/80 bg-muted/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm ring-1 ring-border/80">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Exportar datos</p>
            <p className="text-xs text-muted-foreground">Mismo rango que el periodo mostrado arriba.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{exportSlot}</div>
      </div>
    </div>
  );
}
