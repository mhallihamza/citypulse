import { Link } from "react-router-dom";
import { Inbox, LightbulbOff, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { EmptyState } from "@/components/ui/Modal";
import { lightingStats } from "@/pages/app/_shared";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * LIGHTING — the currently implemented CITYPULSE service.
 * All figures come from real database rows (devices, lighting_states,
 * events, tickets). When the organization has no devices yet, the page
 * shows the required empty state with an explicit "Add device" action.
 */
export function LightingPage() {
  const { devices, states, telemetry, events, tickets, now } = useApp();
  const stats = lightingStats(devices, states, events, tickets);

  const lightingEvents = events.filter((e) => e.service === "lighting");
  const recent = lightingEvents.slice(0, 6);
  const fleetWithState = stats.fleet;

  return (
    <div>
      <PageHeader
        title="Lighting"
        subtitle="Monitor and control smart street lighting infrastructure."
        actions={
          <>
            <Badge tone={stats.offline > 0 ? "warning" : "success"} dot>
              {stats.online}/{stats.total} online
            </Badge>
            <Link to="/app/lighting/devices">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add device
              </Button>
            </Link>
          </>
        }
      />

      {fleetWithState.length === 0 ? (
        <Card>
          <EmptyState
            title="No lighting devices registered yet."
            message="Register your first street light controller to start receiving live state and telemetry from the IoT pipeline."
            action={
              <Link to="/app/lighting/devices">
                <Button>
                  <Plus className="h-4 w-4" /> Add device
                </Button>
              </Link>
            }
            className="py-16"
          />
        </Card>
      ) : (
        <>
          {/* KPI row — computed from real records */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Connected devices" value={stats.total} />
            <Kpi label="Online" value={stats.online} tone={stats.online > 0 ? "text-live-600" : undefined} />
            <Kpi label="Offline" value={stats.offline} tone={stats.offline > 0 ? "text-amber-600" : undefined} />
            <Kpi label="Open incidents" value={stats.failures + stats.openTickets} tone={stats.failures > 0 ? "text-red-600" : undefined} />
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            {/* Live device states */}
            <Card className="overflow-hidden">
              <CardHeader
                title="Live device states"
                subtitle="From lighting_states — updated in real time via Supabase Realtime"
                action={
                  <Link to="/app/lighting/devices">
                    <Button variant="ghost" size="xs">Registry</Button>
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                      <th className="px-5 py-2.5 font-semibold">Device</th>
                      <th className="px-3 py-2.5 font-semibold">Zone</th>
                      <th className="px-3 py-2.5 font-semibold">Mode</th>
                      <th className="px-3 py-2.5 font-semibold">Bright.</th>
                      <th className="px-3 py-2.5 font-semibold">Lux</th>
                      <th className="px-3 py-2.5 font-semibold">Presence</th>
                      <th className="px-3 py-2.5 font-semibold">Lamp</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-50">
                    {fleetWithState.map((d) => {
                      const s = states[d.id];
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                          <td className="px-5 py-3">
                            <Link to={`/app/lighting/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">
                              {d.deviceKey}
                            </Link>
                            <div className="text-[11px] text-ink-400">{d.displayName}</div>
                          </td>
                          <td className="px-3 py-3 text-ink-500">{d.zone}</td>
                          <td className="px-3 py-3"><ModePill mode={s?.mode ?? d.mode} /></td>
                          <td className="px-3 py-3 tabular text-ink-700">{s ? `${s.brightness}%` : "—"}</td>
                          <td className="px-3 py-3 tabular text-ink-700">{s?.lux != null ? `${Number(s.lux).toFixed(1)}` : "—"}</td>
                          <td className="px-3 py-3 text-ink-600">{s ? (s.presence ? "Yes" : "No") : "—"}</td>
                          <td className="px-3 py-3">
                            {s?.lampFailure ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">FAILURE</span>
                            ) : (
                              <span className="text-xs text-ink-400">OK</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={s ? (s.lampFailure ? "critical" : s.online ? "normal" : "offline") : d.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link to={`/app/lighting/devices/${d.id}`}><Button variant="ghost" size="xs">Open</Button></Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-5">
              {/* Map */}
              <Card className="overflow-hidden">
                <CardHeader title="Lighting map" subtitle="Real positions · click a marker for detail" />
                <div className="p-4">
                  <CityMap devices={stats.fleet} events={lightingEvents} tickets={tickets} states={states} telemetry={telemetry} dark interactive className="h-[300px]" />
                </div>
              </Card>

              {/* Recent lighting events */}
              <Card>
                <CardHeader title="Recent events" action={<Link to="/app/lighting/events"><Button variant="ghost" size="xs">All events</Button></Link>} />
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
                      <SeverityBadge severity={e.severity} />
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

export function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{label}</div>
      <div className={cn("mt-1 font-display text-[28px] font-bold tabular leading-none text-ink-900", tone)}>{value}</div>
    </Card>
  );
}

export function ModePill({ mode }: { mode: string }) {
  const tone =
    mode === "OFF"
      ? "bg-ink-100 text-ink-600 border-ink-200"
      : mode === "FAILURE"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-live-50 text-live-700 border-live-200";
  return (
    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold", tone)}>
      {mode}
      {mode === "OFF" && <LightbulbOff className="ml-1 inline h-3 w-3" />}
    </span>
  );
}