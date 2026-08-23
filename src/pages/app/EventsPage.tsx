import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Ticket as TicketIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Modal";
import { timeAgo } from "@/lib/format";
import type { EventStatus, ServiceId, Severity } from "@/lib/types";

/**
 * Events — real rows from public.events. A new event appears automatically
 * through the Supabase Realtime subscription; nothing is generated client-side.
 */
export function EventsPage({ service: fixedService }: { service?: ServiceId }) {
  const { events, devices, now, acknowledgeEvent, resolveEvent, createTicket } = useApp();
  const [service, setService] = useState<"all" | ServiceId>(fixedService ?? "all");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [status, setStatus] = useState<"all" | EventStatus>("all");

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (service !== "all" && e.service !== service) return false;
        if (severity !== "all" && e.severity !== severity) return false;
        if (status !== "all" && e.status !== status) return false;
        return true;
      }),
    [events, service, severity, status]
  );

  const newCount = events.filter((e) => e.status === "new").length;

  return (
    <div>
      <PageHeader
        title={fixedService ? `Lighting · Events` : "Events"}
        subtitle="Real-time event stream written by Fusion AI from device telemetry."
        actions={<Badge tone={newCount > 0 ? "critical" : "success"} dot>{newCount} new</Badge>}
      />

      {!fixedService && (
        <Card className="mb-5">
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <label className="text-xs font-semibold text-ink-500">
              Service
              <Select value={service} onChange={(e) => setService(e.target.value as typeof service)} className="mt-1">
                <option value="all">All services</option>
                <option value="lighting">Lighting</option>
              </Select>
            </label>
            <label className="text-xs font-semibold text-ink-500">
              Severity
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="mt-1">
                <option value="all">All severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </Select>
            </label>
            <label className="text-xs font-semibold text-ink-500">
              Status
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1">
                <option value="all">All status</option>
                <option value="new">New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </Select>
            </label>
          </div>
        </Card>
      )}

      <Card>
        <div className="divide-y divide-ink-50">
          {filtered.length === 0 && (
            <EmptyState title="No events detected." message="When a device reports LAMP_FAILURE, LAMP_RESTORED or another event, it appears here instantly." className="py-14" />
          )}
          {filtered.map((e) => {
            const dev = devices.find((d) => d.id === e.deviceId);
            return (
              <div key={e.id} className="feed-item flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={e.severity} />
                    <span className="truncate text-sm font-semibold text-ink-800">{e.title}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-400">
                    {e.eventType} /{" "}
                    {dev ? (
                      <Link to={`/app/lighting/devices/${dev.id}`} className="font-medium text-pulse-600 hover:underline">
                        {dev.deviceKey}
                      </Link>
                    ) : (
                      <span>{e.deviceKey ?? "—"}</span>
                    )}{" "}
                    {dev?.locationLabel ? `· ${dev.locationLabel}` : ""} · <span className="tabular">{timeAgo(e.createdAt, now)}</span> · {e.status}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {e.status === "new" && (
                    <Button variant="outline" size="sm" onClick={() => void acknowledgeEvent(e.id)}>
                      <Check className="h-3.5 w-3.5" /> Acknowledge
                    </Button>
                  )}
                  {e.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void createTicket({
                          title: e.title,
                          service: e.service,
                          priority: e.severity === "critical" ? "critical" : "high",
                          deviceId: e.deviceId,
                          description: e.detail ?? undefined,
                        })
                      }
                    >
                      <TicketIcon className="h-3.5 w-3.5" /> Ticket
                    </Button>
                  )}
                  {e.status !== "resolved" && (
                    <Button variant="ghost" size="sm" onClick={() => void resolveEvent(e.id)}>Resolve</Button>
                  )}
                  {dev && (
                    <Link to={`/app/lighting/devices/${dev.id}`}>
                      <Button variant="ghost" size="sm" className="!px-2"><ArrowRight className="h-3.5 w-3.5" /></Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}