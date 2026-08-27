import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { EmptyState } from "@/components/ui/Modal";
import { wasteStats } from "@/pages/app/_shared";
import { Kpi } from "@/pages/app/lighting/LightingPage";
import { OnlineBadge, ServiceStatePill } from "@/pages/app/services/shared";
import { timeAgo } from "@/lib/format";

/**
 * WASTE — real service backed by public.devices (service='waste'),
 * waste_states and waste_telemetry. Every figure is read from Supabase.
 * No values are invented; an empty fleet renders an honest empty state.
 */
export function WastePage() {
  const { devices, wasteStates, telemetry, events, tickets, now } = useApp();
  const stats = wasteStats(devices, wasteStates, tickets);
  const wasteEvents = events.filter((e) => e.service === "waste");
  const recent = wasteEvents.slice(0, 6);
  const samples = Object.values(telemetry).flat();

  // Live averages across ONLINE bins only (real values).
  const onlineFleet = stats.fleet.filter((d) => wasteStates[d.id]?.online);
  const avgFill =
    onlineFleet.length > 0 ? onlineFleet.reduce((a, d) => a + Number(wasteStates[d.id]?.level ?? 0), 0) / onlineFleet.length : null;
return (
    <div>
      <PageHeader
        title="Waste"
        subtitle="Smart-bin fill level, temperature and humidity monitoring."
        actions={
          <>
            <Badge tone={stats.warnings > 0 ? "critical" : stats.offline > 0 ? "warning" : "success"} dot>
              {stats.warnings > 0 ? `${stats.warnings} warning${stats.warnings === 1 ? "" : "s"}` : `${stats.online}/${stats.total} online`}
            </Badge>
            <Link to="/app/waste/devices">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add device
              </Button>
            </Link>
          </>
        }
      />

      {stats.fleet.length === 0 ? (
        <Card>
          <EmptyState
            title="No live waste data available."
            message="Register a smart bin to start receiving live fill level, temperature and humidity from the IoT pipeline."
            action={
              <Link to="/app/waste/devices">
                <Button><Plus className="h-4 w-4" /> Add device</Button>
              </Link>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi label="Monitored bins" value={stats.total} />
            <Kpi label="Online" value={stats.online} tone={stats.online > 0 ? "text-live-600" : undefined} />
            <Kpi label="Avg fill level" value={avgFill != null ? `${avgFill.toFixed(0)}%` : "—"} />
            <Kpi label="Warnings" value={stats.warnings} tone={stats.warnings > 0 ? "text-red-600" : undefined} />
            <Kpi label="Open tickets" value={stats.openTickets} />
          </div>
<div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader title="Smart bins" subtitle="Live from waste_states — updates via Realtime" />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                      <th className="px-5 py-3 font-semibold">Device ID</th>
                      <th className="px-4 py-3 font-semibold">Fill level</th>
                      <th className="px-4 py-3 font-semibold">Temp</th>
                      <th className="px-4 py-3 font-semibold">Humidity</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Last seen</th>
                      <th className="px-4 py-3 font-semibold">Online</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {stats.fleet.map((d) => {
                      const s = wasteStates[d.id];
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                          <td className="px-5 py-3">
                            <Link to={`/app/waste/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">{d.deviceKey}</Link>
                            <div className="truncate text-[11px] text-ink-400">{d.displayName}</div>
                          </td>
                          <td className="px-4 py-3 tabular text-ink-700">
                            {s?.level != null ? (
                              <span className={Number(s.level) >= 85 ? "font-semibold text-red-600" : Number(s.level) >= 60 ? "font-semibold text-amber-600" : "text-live-600"}>
                                {Math.round(Number(s.level))}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 tabular text-ink-700">{s?.temperature != null ? `${Number(s.temperature).toFixed(1)} °C` : "—"}</td>
                          <td className="px-4 py-3 tabular text-ink-700">{s?.humidity != null ? `${Math.round(Number(s.humidity))}%` : "—"}</td>
                          <td className="px-4 py-3">{s ? <ServiceStatePill state={s.status} /> : "—"}</td>
                          <td className="px-4 py-3 text-xs tabular text-ink-500">{s?.lastSeen ? timeAgo(s.lastSeen, now) : "never"}</td>
                          <td className="px-4 py-3"><OnlineBadge online={Boolean(s?.online)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
<div className="space-y-5">
              <Card className="overflow-hidden">
                <CardHeader title="Waste map" subtitle="Real positions · click a marker for detail" />
                <div className="p-4">
                  <CityMap devices={stats.fleet} events={wasteEvents} tickets={tickets} wasteStates={wasteStates} telemetry={telemetry} dark interactive className="h-[300px]" />
                </div>
              </Card>

              <Card>
                <CardHeader title="Recent events" action={<Link to="/app/events"><Button variant="ghost" size="xs">All events</Button></Link>} />
                <div className="divide-y divide-ink-50">
                  {recent.length === 0 && (
                    <div className="flex flex-col items-center gap-1 px-5 py-8 text-center">
                      <Inbox className="h-5 w-5 text-ink-300" />
                      <div className="text-sm font-medium text-ink-400">No events detected.</div>
                    </div>
                  )}
                  {recent.map((e) => (
                    <div key={e.id} className="feed-item flex items-start gap-3 px-5 py-3">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink-800">{e.title}</div>
                        <div className="text-[11px] text-ink-400">{e.eventType}{e.previousState && e.currentState ? ` · ${e.previousState} → ${e.currentState}` : ""} · {timeAgo(e.createdAt, now)}</div>
                      </div>
                      <Badge tone={e.severity === "critical" ? "critical" : e.severity === "warning" ? "warning" : "info"}>{e.severity}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="mb-1.5 text-[13px] font-semibold text-ink-800">Telemetry coverage</div>
                <p className="text-xs leading-relaxed text-ink-400">
                  {samples.filter((s) => Number.isFinite(Number(s.fillLevel))).length} fill-level samples and{" "}
                  {samples.filter((s) => Number.isFinite(Number(s.temperature))).length} temperature readings are stored in{" "}
                  <span className="font-mono">waste_telemetry</span>. Open a bin to chart its history.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}