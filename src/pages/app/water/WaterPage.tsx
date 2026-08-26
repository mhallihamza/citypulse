import { Link } from "react-router-dom";
import { Inbox, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { EmptyState } from "@/components/ui/Modal";
import { waterStats } from "@/pages/app/_shared";
import { Kpi } from "@/pages/app/lighting/LightingPage";
import { OnlineBadge, ServiceStatePill } from "@/pages/app/services/shared";
import { timeAgo } from "@/lib/format";

/**
 * WATER — real service backed by public.devices (service='water'),
 * water_states and device_telemetry. Every figure is read from Supabase.
 */
export function WaterPage() {
  const { devices, waterStates, telemetry, events, tickets, now } = useApp();
  const stats = waterStats(devices, waterStates, tickets);
  const waterEvents = events.filter((e) => e.service === "water");
  const recent = waterEvents.slice(0, 6);
  const samples = Object.values(telemetry).flat();

  // Live averages across ONLINE devices only (real values).
  const onlineFleet = stats.fleet.filter((d) => waterStates[d.id]?.online);
  const avgFlow = onlineFleet.length > 0 ? onlineFleet.reduce((a, d) => a + Number(waterStates[d.id]?.flow ?? 0), 0) / onlineFleet.length : null;
  const avgPressure = onlineFleet.length > 0 ? onlineFleet.reduce((a, d) => a + Number(waterStates[d.id]?.pressure ?? 0), 0) / onlineFleet.length : null;

  return (
    <div>
      <PageHeader
        title="Water"
        subtitle="Water flow, pressure and leak detection across your network."
        actions={
          <>
            <Badge tone={stats.leaks > 0 ? "critical" : stats.offline > 0 ? "warning" : "success"} dot>
              {stats.leaks > 0 ? `${stats.leaks} leak${stats.leaks === 1 ? "" : "s"}` : `${stats.online}/${stats.total} online`}
            </Badge>
            <Link to="/app/water/devices">
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
            title="No live water data available."
            message="Register a water controller to start receiving live flow, pressure and leak status from the IoT pipeline."
            action={
              <Link to="/app/water/devices">
                <Button><Plus className="h-4 w-4" /> Add device</Button>
              </Link>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Kpi label="Monitored points" value={stats.total} />
            <Kpi label="Online" value={stats.online} tone={stats.online > 0 ? "text-live-600" : undefined} />
            <Kpi label="Avg flow" value={avgFlow != null ? `${avgFlow.toFixed(1)} L/s` : "—"} tone="text-pulse-600" />
            <Kpi label="Avg pressure" value={avgPressure != null ? `${avgPressure.toFixed(2)} bar` : "—"} />
            <Kpi label="Leaks detected" value={stats.leaks} tone={stats.leaks > 0 ? "text-red-600" : undefined} />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader
                title="Live water states"
                subtitle="From water_states — updated in real time via Supabase Realtime"
                action={
                  <Link to="/app/water/devices">
                    <Button variant="ghost" size="xs">Registry</Button>
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                      <th className="px-5 py-2.5 font-semibold">Point</th>
                      <th className="px-3 py-2.5 font-semibold">Flow (L/s)</th>
                      <th className="px-3 py-2.5 font-semibold">Pressure (bar)</th>
                      <th className="px-3 py-2.5 font-semibold">Leakage</th>
                      <th className="px-3 py-2.5 font-semibold">State</th>
                      <th className="px-3 py-2.5 font-semibold">Last seen</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {stats.fleet.map((d) => {
                      const s = waterStates[d.id];
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                          <td className="px-5 py-3">
                            <Link to={`/app/water/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">{d.deviceKey}</Link>
                            <div className="truncate text-[11px] text-ink-400">{d.displayName}</div>
                          </td>
                          <td className="px-3 py-3 tabular text-ink-800">{s?.flow != null ? Number(s.flow).toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 tabular text-ink-600">{s?.pressure != null ? Number(s.pressure).toFixed(2) : "—"}</td>
                          <td className="px-3 py-3">
                            {s ? (
                              s.leakage ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">LEAK</span>
                              ) : (
                                <span className="text-xs font-medium text-live-600">None</span>
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-3">{s ? <ServiceStatePill state={s.state} /> : "—"}</td>
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
                <CardHeader title="Water map" subtitle="Real positions · click a marker for detail" />
                <div className="p-4">
                  <CityMap devices={stats.fleet} events={waterEvents} tickets={tickets} waterStates={waterStates} telemetry={telemetry} dark interactive className="h-[300px]" />
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
                        <div className="text-[11px] text-ink-400">{e.eventType} · {timeAgo(e.createdAt, now)}</div>
                      </div>
                      <Badge tone={e.severity === "critical" ? "critical" : e.severity === "warning" ? "warning" : "info"}>{e.severity}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="mb-1.5 text-[13px] font-semibold text-ink-800">Telemetry coverage</div>
                <p className="text-xs leading-relaxed text-ink-400">
                  {samples.filter((s) => Number.isFinite(Number(s.flow))).length} flow samples and{" "}
                  {samples.filter((s) => Number.isFinite(Number(s.pressure))).length} pressure samples are stored in{" "}
                  <span className="font-mono">water_telemetry</span>. Open a device to chart its history.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}