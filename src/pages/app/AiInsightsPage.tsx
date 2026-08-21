import { Link } from "react-router-dom";
import { BrainCircuit, Check, Ticket as TicketIcon, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import { confidenceLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AiInsightsPage() {
  const { data, now, acknowledgeInsight, createTicketFromInsight } = useApp();
  const health = 92;
  const anomalies = data.insights.filter((i) => i.severity !== "info").length + 8;
  const highPriority = data.insights.filter((i) => i.severity === "critical" || i.severity === "warning").length;

  return (
    <div>
      <PageHeader
        title="AI Insights"
        subtitle="Automated intelligence across the city's live telemetry and event streams."
        live
        actions={<Badge tone="info" dot><BrainCircuit className="h-3.5 w-3.5" /> Model streaming</Badge>}
      />

      {/* AI overview */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-ink-950 to-ink-800 !border-ink-800 p-5 text-white">
          <div className="text-[11px] font-bold uppercase tracking-widest text-pulse-300">City Health Score</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold">{health}</span>
            <span className="text-lg text-ink-400">/ 100</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-live-400 to-pulse-400" style={{ width: `${health}%` }} />
          </div>
        </Card>
        {[
          { l: "Detected anomalies", v: anomalies, tone: "text-amber-600" },
          { l: "High-priority recommendations", v: highPriority, tone: "text-red-600" },
          { l: "Models active", v: "6", tone: "text-pulse-600" },
        ].map((s, i) => (
          <Card key={s.l} className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{s.l}</div>
            <div className={cn("mt-1 font-display text-4xl font-bold", s.tone)}>{s.v}</div>
          </Card>
        ))}
      </div>

      {/* Insights list */}
      <div className="space-y-4">
        {data.insights.map((ins) => (
          <Card key={ins.id} className={cn(ins.severity === "critical" ? "border-red-200" : ins.severity === "warning" ? "border-amber-200" : "")}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <ServiceIconBadge service={ins.service} size="sm" />
                  <span>{ins.title}</span>
                  <SeverityBadge severity={ins.severity} />
                </span>
              }
              subtitle={`${ins.id} · ${timeAgo(ins.createdAt, now)} · Confidence ${confidenceLabel(ins.confidence)} (${Math.round(ins.confidence * 100)}%)`}
              action={<Badge tone={ins.status === "new" ? "info" : ins.status === "acknowledged" ? "warning" : "success"} dot>{ins.status}</Badge>}
            />
            <CardBody>
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Observation</div>
                  <p className="mt-1 text-sm text-ink-700">{ins.observation}</p>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">Evidence</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ins.evidence.map((ev) => (
                      <span key={ev.label} className="rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-700">
                        <span className="font-semibold">{ev.label}:</span> {ev.value}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-pulse-100 bg-pulse-50 p-3 text-sm text-pulse-900">
                    <span className="font-bold">Recommendation:</span> {ins.recommendation}
                  </div>
                  {ins.devices.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ins.devices.map((d) => (
                        <Link key={d} to={`/app/${ins.service}/${d}`} className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2 py-1 text-xs font-semibold text-ink-600 hover:border-pulse-300 hover:text-pulse-600">
                          {d} <ArrowRight className="h-3 w-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-end gap-2 border-t border-ink-50 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createTicketFromInsight(ins)}
                    disabled={ins.status === "actioned"}
                  >
                    <TicketIcon className="h-4 w-4" /> Create Ticket
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeInsight(ins.id)}
                    disabled={ins.status !== "new"}
                  >
                    <Check className="h-4 w-4" /> Acknowledge
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}