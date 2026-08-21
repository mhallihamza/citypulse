import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { serviceStats } from "@/pages/app/_shared";
import { timeAgo } from "@/lib/format";
import { kpiTrend, sparkOf } from "@/lib/charts";
import type { ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

const SERVICES: ServiceId[] = ["lighting", "water", "waste", "traffic"];

export function Dashboard() {
  const { data, now } = useApp();
  const critical = data.events.filter((e) => e.severity === "critical" && e.status !== "resolved").length;
  const newTickets = data.tickets.filter((t) => t.status === "open").length;

  return (
    <div>
      <PageHeader
        title="City Overview"
        subtitle="Real-time infrastructure status across your city."
        live
        actions={
          <>
            <Badge tone={critical > 0 ? "critical" : "success"} dot>
              {critical > 0 ? `${critical} critical` : "All clear"}
            </Badge>
            <Link to="/app/map">
              <Button variant="outline" size="sm">
                Open map <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((s) => {
          const stats = serviceStats(s, data.devices, data.telemetry);
          const spark = stats.spark(s === "lighting" ? "lux" : s === "water" ? "pressure" : s === "waste" ? "fillLevel" : "density", 16);
          const trend = kpiTrend(spark.length ? spark : [93, 94, 95, 94, 96]);
          const color = s === "lighting" ? "#F59E0B" : s === "water" ? "#246BFF" : s === "waste" ? "#10B981" : "#8B5CF6";
          const label = s[0].toUpperCase() + s.slice(1);
          return (
            <Link key={s} to={`/app/${s}`} className="group">
              <StatCard
                label={label}
                value={<span className="text-2xl">{stats.operationalPct}%</span>}
                sub={s === "traffic" ? "Normal" : "Operational"}
                trend={trend}
                spark={spark.length ? spark : [93, 94, 95, 94, 96]}
                sparkColor={color}
                icon={<ServiceIconBadge service={s} size="sm" />}
                lastUpdate={data.devices.find((d) => d.service === s)?.lastTelemetryAt}
              />
            </Link>
          );
        })}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Live infrastructure map"
            subtitle="Status of every connected device across the city"
            action={
              <Link to="/app/map">
                <Button variant="ghost" size="xs">Full map</Button>
              </Link>
            }
          />
          <div className="p-4">
            <CityMap
              devices={data.devices}
              events={data.events}
              tickets={data.tickets}
              telemetry={data.telemetry}
              dark
              className="h-[420px]"
            />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Recent events" action={<Link to="/app/events"><Button variant="ghost" size="xs">All</Button></Link>} />
            <div className="divide-y divide-ink-50">
              {data.events.slice(0, 5).map((e) => (
                <div key={e.id} className="feed-item flex items-start gap-3 px-5 py-3">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink-800">{e.title}</div>
                    <div className="text-[11px] text-ink-400">
                      {e.service[0].toUpperCase() + e.service.slice(1)} / {e.deviceId} · {timeAgo(e.createdAt, now)}
                    </div>
                  </div>
                  <SeverityBadge severity={e.severity} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Open tickets" action={<Link to="/app/tickets"><Button variant="ghost" size="xs">Manage</Button></Link>} />
            <CardBody className="pt-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-display text-3xl font-bold text-ink-900">{newTickets}</div>
                  <div className="text-xs text-ink-500">awaiting action</div>
                </div>
                <Badge tone="warning" dot>2 critical priority</Badge>
              </div>
              <div className="mt-4 space-y-1.5">
                {data.tickets.slice(0, 3).map((t) => (
                  <Link key={t.id} to={`/app/tickets/${t.id}`} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 transition-colors hover:border-pulse-200 hover:bg-pulse-50/40">
                    <span className="text-[13px] font-medium text-ink-700">{t.id}</span>
                    <span className="truncate pl-3 text-xs text-ink-400">{t.title}</span>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-ink-950 to-ink-800 !border-ink-800">
            <CardBody className="text-white">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-pulse-300">
                <TrendingUp className="h-4 w-4" /> AI snapshot
              </div>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-ink-300">Health score</span><span className="font-bold">92 / 100</span></div>
                <div className="flex justify-between"><span className="text-ink-300">Anomalies detected</span><span className="font-bold">12</span></div>
                <div className="flex justify-between"><span className="text-ink-300">High-priority recs</span><span className="font-bold text-red-300">4</span></div>
              </div>
              <Link to="/app/ai-insights" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full !border-white/20 !bg-white/5 !text-white hover:!bg-white/10">
                  Open AI Insights
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}