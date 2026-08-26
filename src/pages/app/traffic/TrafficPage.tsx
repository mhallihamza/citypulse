import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { EmptyState } from "@/components/ui/Modal";
import { trafficStats } from "@/pages/app/_shared";
import { Kpi } from "@/pages/app/lighting/LightingPage";
import { OnlineBadge, TelemetryChart } from "@/pages/app/services/shared";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * TRAFFIC — real service backed by public.devices (service='traffic'),
 * traffic_states and device_telemetry. Every figure is read from Supabase.
 */
export function TrafficPage() {
  const { devices, trafficStates, telemetry, events, tickets, now } = useApp();
  const stats = trafficStats(devices, trafficStates, events, tickets);
  const trafficEvents = events.filter((e) => e.service === "traffic");
  const recent = trafficEvents.slice(0, 6);

  // Aggregate live metrics across ONLINE devices only — real values only.
  const onlineFleet = stats.fleet.filter((d) => trafficStates[d.id]?.online);
  const avgDensity =
    onlineFleet.length > 0
      ? onlineFleet.reduce((acc, d) => acc + Number(trafficStates[d.id]?.density ?? 0), 0) / onlineFleet.length
      : null;
  const avgTmax =
    onlineFleet.length > 0
      ? onlineFleet.reduce((acc, d) => acc + Number(trafficStates[d.id]?.tmax ?? 0), 0) / onlineFleet.length
      : null;

  return (
    <div>
      <PageHeader
        title="Traffic"
        subtitle="Vehicle density, congestion detection and travel-time analysis."
        actions={
          <>
            <Badge tone={stats.offline > 0 ? "warning" : "success"} dot>
              {stats.online}/{stats.total} online
            </Badge>
            <Link to="/app/traffic/devices">
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
            title="No live traffic data available."
            message="Register a traffic segment controller to start receiving live vehicle counts, density and travel time from the IoT pipeline."
            action={
              <Link to="/app/traffic/devices">
                <Button><Plus className="h-4 w-4" /> Add device</Button>
              </Link>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi label="Monitored segments" value={stats.total} />
            <Kpi label="Online" value={stats.online} tone={stats.online > 0 ? "text-live-600" : undefined} />
            <Kpi label="Vehicles observed" value={stats.vehiclesObserved} tone="text-pulse-600" />
            <Kpi label="Avg density" value={avgDensity != null ? avgDensity.toFixed(1) : "—"} />
            <Kpi label="Avg T-max" value={avgTmax != null ? `${avgTmax.toFixed(0)}s` : "—"} />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Live segment states"
                subtitle="From traffic_states — updated in real time via Supabase Realtime"
                action={
                  <Link to="/app/traffic/devices">
                    <Button variant="ghost" size="xs">Registry</Button>
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                      <th className="px-5 py-2.5 font-semibold">Segment</th>
                      <th className="px-3 py-2.5 font-semibold">Vehicles</th>
                      <th className="px-3 py-2.5 font-semibold">Overdue</th>
                      <th className="px-3 py-2.5 font-semibold">Density</th>
                      <th className="px-3 py-2.5 font-semibold">T-max</th>
                      <th className="px-3 py-2.5 font-semibold">Last seen</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {stats.fleet.map((d) => {
                      const s = trafficStates[d.id];
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                          <td className="px-5 py-3">
                            <Link to={`/app/traffic/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">
                              {d.deviceKey}
                            </Link>
                            <div className="truncate text-[11px] text-ink-400">{s?.state ?? "—"}</div>
                          </td>
                          <td className="px-3 py-3 tabular text-ink-800">{s?.vehicleCount ?? "—"}</td>
                          <td className="px-3 py-3 tabular text-ink-600">{s?.overdueVehicles ?? "—"}</td>
                          <td className="px-3 py-3 tabular text-ink-600">{s?.density != null ? Number(s.density).toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 tabular text-ink-600">{s?.tmax != null ? `${Number(s.tmax).toFixed(0)}s` : "—"}</td>
                          <td className="px-3 py-3 text-xs tabular text-ink-500">{s?.lastSeen ? timeAgo(s.lastSeen, now) : "never"}</td>
                          <td className="px-3 py-3"><OnlineBadge online={Boolean(s?.online)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="overflow-hidden">
                <CardHeader title="Traffic map" subtitle="Real positions · click a marker for detail" />
                <div className="p-4">
                  <CityMap devices={stats.fleet} events={trafficEvents} tickets={tickets} trafficStates={trafficStates} telemetry={telemetry} dark interactive className="h-[300px]" />
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
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-ink-800">{e.title}</div>
                        <div className="text-[11px] text-ink-400">{e.eventType} · {timeAgo(e.createdAt, now)}</div>
                      </div>
                      <Badge tone={e.severity === "critical" ? "critical" : e.severity === "warning" ? "warning" : "info"}>{e.severity}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}