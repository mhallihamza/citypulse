import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Ticket as TicketIcon, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import type { EventStatus, ServiceId, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EventsPage() {
  const { data, now, acknowledgeEvent, resolveEvent, createTicketFromEvent } = useApp();
  const [service, setService] = useState<"all" | ServiceId>("all");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [status, setStatus] = useState<"all" | EventStatus>("all");

  const events = data.events.filter((e) => {
    if (service !== "all" && e.service !== service) return false;
    if (severity !== "all" && e.severity !== severity) return false;
    if (status !== "all" && e.status !== status) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Real-time event management across all city services."
        live
        actions={<Badge tone={data.events.filter((e) => e.status === "new" && e.severity === "critical").length ? "critical" : "success"} dot>
          {data.events.filter((e) => e.status === "new").length} new
        </Badge>}
      />

      {/* Filters */}
      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <label className="text-xs font-semibold text-ink-500">
            Service
            <Select value={service} onChange={(e) => setService(e.target.value as any)} className="mt-1">
              <option value="all">All services</option>
              <option value="lighting">Lighting</option>
              <option value="water">Water</option>
              <option value="waste">Waste</option>
              <option value="traffic">Traffic</option>
            </Select>
          </label>
          <label className="text-xs font-semibold text-ink-500">
            Severity
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="mt-1">
              <option value="all">All severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </Select>
          </label>
          <label className="text-xs font-semibold text-ink-500">
            Status
            <Select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1">
              <option value="all">All status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </Select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="divide-y divide-ink-50">
          {events.length === 0 && <div className="px-6 py-14 text-center text-sm text-ink-400">No events match these filters.</div>}
          {events.map((e) => {
            const dev = data.devices.find((d) => d.id === e.deviceId);
            return (
              <div key={e.id} className="feed-item flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <ServiceIconBadge service={e.service} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={e.severity} />
                    <span className="truncate text-sm font-semibold text-ink-800">{e.title}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-400">
                    {e.service[0].toUpperCase() + e.service.slice(1)} /{" "}
                    <Link to={`/app/${e.service}/${e.deviceId}`} className="font-medium text-pulse-600 hover:underline">
                      {e.deviceId}
                    </Link>{" "}
                    {dev ? `· ${dev.location}` : ""} · <span className="tabular">{timeAgo(e.createdAt, now)}</span> · {e.status}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {e.status === "new" && (
                    <Button variant="outline" size="sm" onClick={() => acknowledgeEvent(e.id)}>
                      <Check className="h-3.5 w-3.5" /> Acknowledge
                    </Button>
                  )}
                  {e.status !== "resolved" && (
                    <Button variant="outline" size="sm" onClick={() => createTicketFromEvent(e)}>
                      <TicketIcon className="h-3.5 w-3.5" /> Ticket
                    </Button>
                  )}
                  {e.status !== "resolved" && (
                    <Button variant="ghost" size="sm" onClick={() => resolveEvent(e.id)}>Resolve</Button>
                  )}
                  <Link to={`/app/${e.service}/${e.deviceId}`}>
                    <Button variant="ghost" size="sm" className="!px-2">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}