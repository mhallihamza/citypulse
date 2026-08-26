import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CircleSlash, Inbox } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { lightingStats, serviceConnected, trafficStats, waterStats } from "@/pages/app/_shared";
import { timeAgo } from "@/lib/format";
import { SERVICES } from "@/lib/services";
import type { ServiceId } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * CITYPULSE — global dashboard.
 * The CITY OVERVIEW: status of the whole platform across all four services.
 * Lighting, Water and Traffic read live data from Supabase (devices, states,
 * telemetry, events, tickets); Waste shows an honest "not connected yet" card
 * until its module ships. Every number is computed from real records.
 */
export function Dashboard() {
  const { devices, states, trafficStates, waterStates, telemetry, events, tickets, insights, organization, loadingData, now } = useApp();
  const stats = lightingStats(devices, states, events, tickets);
  const tStats = trafficStats(devices, trafficStates, events, tickets);
  const wStats = waterStats(devices, waterStates, tickets);

  const criticalOpen = events.filter((e) => e.severity === "critical" && e.status !== "resolved").length;
  const openTickets = tickets.filter((t) => t.status !== "resolved").length;
  const recentEvents = events.slice(0, 5);
  const topTickets = tickets.filter((t) => t.status !== "resolved").slice(0, 3);
  const newInsights = insights.filter((i) => i.status === "new").length;

  return (
    <div>
      <PageHeader
        title="City Overview"
        subtitle="Real-time infrastructure status across your city."
        actions={
          <>
            {loadingData ? (
              <Badge tone="info" dot>Loading…</Badge>
            ) : (
              <Badge tone={criticalOpen > 0 ? "critical" : "success"} dot>
                {criticalOpen > 0 ? `${criticalOpen} critical` : "All clear"}
              </Badge>
            )}
            <Link to="/app/map">
              <Button variant="outline" size="sm">
                Open map <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        }
      />

      {/* Service cards — one per supported city service */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((svc) => {
          const connected = serviceConnected(svc.key as ServiceId);
          return (
            <Link key={svc.key} to={`/app/${svc.key}`} className="group">
              <Card className={cn("lift h-full p-5", !connected && "opacity-95")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-ink-500">
                    <ServiceIconBadge service={svc.key} size="sm" />
                    <span className="text-[13px] font-semibold uppercase tracking-wide">{svc.name}</span>
                  </div>
                  {connected ? (
                    <span className="inline-flex items-center rounded-full bg-live-50 px-1.5 py-0.5 text-[11px] font-bold text-live-700">Live</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] font-bold text-ink-500">
                      <CircleSlash className="h-3 w-3" /> Not connected
                    </span>
                  )}
                </div>

                {connected ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                      {svc.key === "lighting" && (
                        <>
                          <MiniStat label="Devices" value={String(stats.total)} />
                          <MiniStat label="Online" value={String(stats.online)} tone={stats.online > 0 ? "text-live-600" : undefined} />
                          <MiniStat label="Offline" value={String(stats.offline)} tone={stats.offline > 0 ? "text-amber-600" : undefined} />
                          <MiniStat label="Incidents" value={String(stats.failures + stats.openTickets)} tone={stats.failures > 0 ? "text-red-600" : undefined} />
                        </>
                      )}
                      {svc.key === "traffic" && (
                        <>
                          <MiniStat label="Segments" value={String(tStats.total)} />
                          <MiniStat label="Online" value={String(tStats.online)} tone={tStats.online > 0 ? "text-live-600" : undefined} />
                          <MiniStat label="Vehicles" value={String(tStats.vehiclesObserved)} tone="text-pulse-600" />
                          <MiniStat label="Congested" value={String(tStats.congested)} tone={tStats.congested > 0 ? "text-red-600" : undefined} />
                        </>
                      )}
                      {svc.key === "water" && (
                        <>
                          <MiniStat label="Points" value={String(wStats.total)} />
                          <MiniStat label="Online" value={String(wStats.online)} tone={wStats.online > 0 ? "text-live-600" : undefined} />
                          <MiniStat label="Leaks" value={String(wStats.leaks)} tone={wStats.leaks > 0 ? "text-red-600" : undefined} />
                          <MiniStat label="Open tickets" value={String(wStats.openTickets)} />
                        </>
                      )}
                    </div>
                    <div className="mt-3 text-[11px] text-ink-400">{svc.name} service · live operations</div>
                  </>
                ) : (
                  <div className="mt-3 flex flex-col items-start gap-1">
                    <div className="font-display text-lg font-bold text-ink-400">No live data</div>
                    <p className="text-xs leading-relaxed text-ink-400">
                      The {svc.name} service is not connected yet. CityPulse is preparing this service.
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Live map (real coordinates only) */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Live infrastructure map"
            subtitle="Real device positions from your organization's locations"
            action={
              <Link to="/app/map">
                <Button variant="ghost" size="xs">Full map</Button>
              </Link>
            }
          />
          <div className="p-4">
            <CityMap devices={devices} events={events} tickets={tickets} states={states} telemetry={telemetry} dark className="h-[380px]" />
          </div>
        </Card>

        <div className="space-y-5">
          {/* Recent events — real records only */}
          <Card>
            <CardHeader title="Recent events" action={<Link to="/app/events"><Button variant="ghost" size="xs">All</Button></Link>} />
            <div className="divide-y divide-ink-50">
              {recentEvents.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 px-5 py-10 text-center">
                  <Inbox className="h-5 w-5 text-ink-300" />
                  <div className="text-sm font-semibold text-ink-500">No recent events.</div>
                  <p className="text-xs text-ink-400">Events appear here when devices report them.</p>
                </div>
              )}
              {recentEvents.map((e) => {
                const dev = devices.find((d) => d.id === e.deviceId);
                const href = dev ? `/app/${dev.service}/devices/${dev.id}` : "/app/events";
                return (
                  <Link key={e.id} to={href} className="feed-item flex items-start gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60">
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500")} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink-800">{e.title}</div>
                      <div className="text-[11px] text-ink-400">
                        {e.eventType} · {dev?.deviceKey ?? e.deviceKey ?? "—"} · {timeAgo(e.createdAt, now)}
                      </div>
                    </div>
                    <SeverityBadge severity={e.severity} />
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Open tickets */}
          <Card>
            <CardHeader title="Open tickets" action={<Link to="/app/tickets"><Button variant="ghost" size="xs">Manage</Button></Link>} />
            <CardBody className="pt-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="font-display text-3xl font-bold text-ink-900">{openTickets}</div>
                  <div className="text-xs text-ink-500">{openTickets === 1 ? "ticket awaiting action" : "tickets awaiting action"}</div>
                </div>
                <Badge tone={openTickets > 0 ? "warning" : "neutral"} dot>{stats.openTickets} lighting</Badge>
              </div>
              <div className="mt-4 space-y-1.5">
                {topTickets.length === 0 && (
                  <div className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-center text-xs text-ink-400">No open tickets.</div>
                )}
                {topTickets.map((t) => (
                  <Link key={t.id} to={`/app/tickets/${t.id}`} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 transition-colors hover:border-pulse-200 hover:bg-pulse-50/40">
                    <span className="text-[13px] font-medium text-ink-700">{t.ticketKey}</span>
                    <span className="truncate pl-3 text-xs text-ink-400">{t.title}</span>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* AI snapshot — real counts or explicit empty state */}
          <Card className="bg-gradient-to-br from-ink-950 to-ink-800 !border-ink-800">
            <CardBody className="text-white">
              <div className="text-[11px] font-bold uppercase tracking-widest text-pulse-300">AI Insights</div>
              {insights.length === 0 ? (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-300">
                  No AI insights available yet. Insights are produced by the Fusion AI pipeline from live telemetry.
                </p>
              ) : (
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-ink-300">Total insights</span><span className="font-bold">{insights.length}</span></div>
                  <div className="flex justify-between"><span className="text-ink-300">New</span><span className="font-bold text-pulse-300">{newInsights}</span></div>
                  <div className="flex justify-between"><span className="text-ink-300">Actioned</span><span className="font-bold">{insights.filter((i) => i.status === "actioned").length}</span></div>
                </div>
              )}
              <Link to="/app/ai-insights" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full !border-white/20 !bg-white/5 !text-white hover:!bg-white/10">
                  Open AI Insights <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {organization && (
        <div className="mt-6 text-center text-[11px] text-ink-400">
          Viewing data for <span className="font-semibold text-ink-500">{organization.name}</span> — loaded from Supabase with organization isolation.
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className={cn("font-display text-xl font-bold tabular text-ink-900", tone)}>{value}</div>
    </div>
  );
}