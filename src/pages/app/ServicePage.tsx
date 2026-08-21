import { Link } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Gauge, Power, AlertTriangle, Zap, Droplets, Waves, Trash2, Route, Car, Timer, TrendingDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { ChartCard, ChartTooltip } from "@/components/ui/ChartCard";
import { serviceStats, serviceSubtext } from "@/pages/app/_shared";
import { timeAgo } from "@/lib/format";
import { kpiTrend, sparkOf, toSeries } from "@/lib/charts";
import type { ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

const KPI_CONFIG: Record<ServiceId, { key: "operational" | "offline" | "warning" | "critical" | "energy" | "avgFill" | "avgPressure" | "avgCongestion" | "totalVehicles" | "avgDensity" | "avgFlow" | "total"; label: string; unit: string; color: string }[]> = {
  lighting: [
    { key: "total", label: "Total lamps", unit: "", color: "#246BFF" },
    { key: "operational", label: "Operational", unit: "", color: "#10B981" },
    { key: "critical", label: "Failures", unit: "", color: "#EF4444" },
    { key: "warning", label: "Maintenance alerts", unit: "", color: "#F59E0B" },
    { key: "energy", label: "Energy consumption", unit: "W", color: "#8B5CF6" },
  ],
  water: [
    { key: "avgFlow", label: "Avg flow", unit: "L/min", color: "#246BFF" },
    { key: "avgPressure", label: "Avg pressure", unit: "bar", color: "#0B5FE8" },
    { key: "warning", label: "Leak events", unit: "", color: "#F59E0B" },
    { key: "total", label: "Nodes monitored", unit: "", color: "#64748B" },
    { key: "critical", label: "Active alerts", unit: "", color: "#EF4444" },
  ],
  waste: [
    { key: "total", label: "Total bins", unit: "", color: "#10B981" },
    { key: "avgFill", label: "Avg fill level", unit: "%", color: "#F59E0B" },
    { key: "critical", label: "Overflow risks", unit: "", color: "#EF4444" },
    { key: "offline", label: "Offline sensors", unit: "", color: "#64748B" },
  ],
  traffic: [
    { key: "total", label: "Sensors", unit: "", color: "#8B5CF6" },
    { key: "avgDensity", label: "Avg density", unit: "%", color: "#246BFF" },
    { key: "avgCongestion", label: "Congestion", unit: "%", color: "#F59E0B" },
    { key: "totalVehicles", label: "Vehicles (24h)", unit: "", color: "#10B981" },
    { key: "warning", label: "Incidents", unit: "", color: "#EF4444" },
  ],
};

function formatW(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)} kW` : `${Math.round(v)} W`;
}

function TelemetryChart({
  type,
  color,
  series,
  fmt,
}: {
  type: "area" | "bar";
  color: string;
  series: { t: number; v: number }[];
  fmt: (v: number) => string;
}) {
  const data = series.map((p) => ({ t: new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), v: Math.round(p.v * 100) / 100 }));
  const common = {
    data,
    strokeWidth: 2,
    isAnimationActive: false,
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "area" ? (
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={`g-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <RTooltip content={<ChartTooltip formatter={fmt} />} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g-${color.replace("#", "")})`} name="value" />
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
          <RTooltip content={<ChartTooltip formatter={fmt} />} />
          <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} name="value" />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export function ServicePage({ service }: { service: ServiceId }) {
  const { data, now } = useApp();
  const stats = serviceStats(service, data.devices, data.telemetry);
  const fleet = stats.fleet;
  const events = data.events.filter((e) => e.service === service).slice(0, 6);
  const label = service[0].toUpperCase() + service.slice(1);

  const chartDefs = (() => {
    if (service === "lighting") {
      return [
        { title: "Lux", subtitle: "Illuminance across fleet (lx)", color: "#F59E0B", key: "lux", fmt: (v: number) => `${v.toFixed(1)} lx`, type: "area" as const },
        { title: "Brightness", subtitle: "Commanded brightness (%)", color: "#246BFF", key: "brightness", fmt: (v: number) => `${Math.round(v)}%`, type: "area" as const },
        { title: "Presence events", subtitle: "Detection events (0/1)", color: "#10B981", key: "presence", fmt: (v: number) => (v > 0.5 ? "Detected" : "None"), type: "bar" as const },
        { title: "Energy", subtitle: "Fleet consumption (W)", color: "#8B5CF6", key: "power", fmt: (v: number) => `${Math.round(v)} W`, type: "area" as const },
      ];
    }
    if (service === "water") {
      return [
        { title: "Flow", subtitle: "Average flow (L/min)", color: "#246BFF", key: "flow", fmt: (v: number) => `${v.toFixed(1)} L/min`, type: "area" as const },
        { title: "Pressure", subtitle: "Average pressure (bar)", color: "#0B5FE8", key: "pressure", fmt: (v: number) => `${v.toFixed(2)} bar`, type: "area" as const },
      ];
    }
    if (service === "waste") {
      return [
        { title: "Fill level", subtitle: "Fleet average fill (%)", color: "#10B981", key: "fillLevel", fmt: (v: number) => `${Math.round(v)}%`, type: "area" as const },
        { title: "Bins near capacity", subtitle: "Bins above 80% fill", color: "#F59E0B", key: "fillLevel", fmt: () => `${fleet.filter((d) => (data.telemetry[d.id]?.slice(-1)[0]?.fillLevel ?? 0) > 80).length} bins`, type: "bar" as const },
      ];
    }
    return [
      { title: "Density", subtitle: "Average vehicle density (%)", color: "#8B5CF6", key: "density", fmt: (v: number) => `${Math.round(v)}%`, type: "area" as const },
      { title: "Congestion", subtitle: "Congestion index", color: "#F59E0B", key: "congestion", fmt: (v: number) => `${Math.round(v)}%`, type: "area" as const },
      { title: "Travel time", subtitle: "Average corridor travel time", color: "#246BFF", key: "travelTime", fmt: (v: number) => `${v.toFixed(1)} min`, type: "area" as const },
    ];
  })();

  // Aggregate telemetry across fleet (average per timestamp).
  const aggSeries = (key: keyof typeof fleet[0] extends never ? never : string) => {
    const points: { t: number; v: number }[] = [];
    const n = 90;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let cnt = 0;
      for (const d of fleet.slice(0, 16)) {
        const arr = data.telemetry[d.id];
        if (!arr || arr.length < n) continue;
        const s = arr[arr.length - n + i];
        const v = Number(s[key as never]);
        if (!Number.isNaN(v)) {
          sum += v;
          cnt++;
        }
      }
      if (cnt) points.push({ t: (fleet[0] ? data.telemetry[fleet[0].id]?.slice(-n)[i]?.ts : 0) ?? 0, v: sum / cnt });
    }
    return points;
  };

  return (
    <div>
      <PageHeader
        title={label}
        subtitle={serviceSubtext(service)}
        live
        actions={
          <>
            <Badge tone="success" dot>LIVE</Badge>
            <Link to={`/app/${service}`}><Button variant="outline" size="sm">Device list</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {KPI_CONFIG[service].map((k) => {
          const raw = k.key === "total" ? stats.total : k.key === "operational" ? stats.operational : k.key === "warning" ? stats.warning : k.key === "critical" ? stats.critical : k.key === "offline" ? stats.offline : k.key === "energy" ? stats.energy : k.key === "avgFill" ? stats.avgFill : k.key === "avgPressure" ? stats.avgPressure : k.key === "avgFlow" ? stats.avgFlow : k.key === "avgDensity" ? stats.avgDensity : k.key === "avgCongestion" ? stats.avgCongestion : stats.totalVehicles;
          const val = k.key === "energy" ? formatW(raw) : k.key === "totalVehicles" ? raw.toLocaleString() : k.key === "avgFill" || k.key === "avgDensity" || k.key === "avgCongestion" ? `${Math.round(raw)}%` : k.key === "avgPressure" ? `${raw.toFixed(2)} bar` : k.key === "avgFlow" ? `${raw.toFixed(1)}` : `${raw}`;
          const spark = stats.spark(
            service === "lighting" ? (k.color === "#F59E0B" ? "lux" : k.color === "#246BFF" ? "brightness" : "power")
              : service === "water" ? (k.key === "avgFlow" ? "flow" : "pressure")
              : service === "waste" ? "fillLevel"
              : (k.key === "avgDensity" ? "density" : k.key === "avgCongestion" ? "congestion" : "travelTime"),
            14
          );
          return (
            <StatCard
              key={k.label}
              label={k.label}
              value={val}
              sub={k.unit ? k.unit : "live"}
              trend={kpiTrend(spark.length ? spark : [50, 52, 51, 53, 54])}
              spark={spark.length ? spark : [50, 52, 51, 53, 54]}
              sparkColor={k.color}
              lastUpdate={fleet[0]?.lastTelemetryAt}
            />
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={`${label} map`} subtitle="Status across zones & devices" action={<Link to="/app/map"><Button variant="ghost" size="xs">Full map</Button></Link>} />
          <div className="p-4">
            <CityMap
              devices={data.devices}
              events={data.events}
              telemetry={data.telemetry}
              serviceFilter={service}
              dark
              className="h-[360px]"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={`Real-time ${label.toLowerCase()} events`} action={<Link to="/app/events"><Button variant="ghost" size="xs">All events</Button></Link>} />
          <div className="divide-y divide-ink-50">
            {events.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-400">No recent events</div>}
            {events.map((e) => (
              <div key={e.id} className="feed-item flex items-start gap-3 px-5 py-3">
                <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink-800">{e.title}</div>
                  <div className="text-[11px] text-ink-400">{e.deviceId} · {timeAgo(e.createdAt, now)}</div>
                </div>
                <SeverityBadge severity={e.severity} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Telemetry charts */}
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {chartDefs.map((c) => (
          <ChartCard key={c.title} title={c.title} subtitle={c.subtitle} height={200}>
            <TelemetryChart type={c.type} color={c.color} series={aggSeries(c.key as string)} fmt={c.fmt} />
          </ChartCard>
        ))}
      </div>

      {/* Device list */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title={`${label} devices`}
          subtitle={`${fleet.length} connected ${service} devices`}
          action={<Badge tone="neutral">{stats.operational} operational</Badge>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-2.5 font-semibold">Device</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Zone</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Last seen</th>
                <th className="px-4 py-2.5 text-right font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {fleet.slice(0, 10).map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="px-5 py-3">
                    <Link to={`/app/${service}/${d.id}`} className="font-semibold text-ink-900 hover:text-pulse-600">{d.id}</Link>
                    <div className="text-[11px] text-ink-400">{d.name}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{d.type}</td>
                  <td className="px-4 py-3 text-ink-500">{d.zone}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.entityStatus} /></td>
                  <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(d.lastTelemetryAt, now)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/${service}/${d.id}`}>
                      <Button variant="ghost" size="xs">Open</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}