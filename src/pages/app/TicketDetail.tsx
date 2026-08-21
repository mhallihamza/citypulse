import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BrainCircuit, Paperclip, Send } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TicketDetail() {
  const { ticketId = "" } = useParams();
  const { data, now, setTicketStatus, assignTicket, addComment } = useApp();
  const [comment, setComment] = useState("");
  const ticket = data.tickets.find((t) => t.id === ticketId);

  if (!ticket) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Ticket not found</h2>
        <Link to="/app/tickets" className="mt-4 inline-block"><Button variant="outline" size="sm">Back to tickets</Button></Link>
      </div>
    );
  }

  const device = ticket.deviceId ? data.devices.find((d) => d.id === ticket.deviceId) : undefined;
  const operator = ticket.operatorId ? data.operators.find((o) => o.id === ticket.operatorId) : undefined;
  const availableOps = data.operators.filter((o) => o.status !== "offline");

  return (
    <div>
      <Link to="/app/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <PageHeader
        title={<span className="font-mono">#{ticket.id}</span>}
        subtitle={ticket.title}
        live
        actions={
          <>
            {ticket.status === "open" && <Button size="sm" onClick={() => setTicketStatus(ticket.id, "in_progress")}>Start Work</Button>}
            {ticket.status === "in_progress" && <Button size="sm" variant="success" onClick={() => setTicketStatus(ticket.id, "resolved")}>Resolve</Button>}
            {ticket.status !== "open" && ticket.status !== "in_progress" && (
              <Button size="sm" variant="outline" onClick={() => setTicketStatus(ticket.id, "open")}>Reopen</Button>
            )}
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Priority" value={<SeverityBadge severity={ticket.priority === "critical" ? "critical" : "warning"} />} />
        <Summary label="Status" value={<Badge tone={ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "warning" : "info"}>{ticket.status.replace("_", " ")}</Badge>} />
        <Summary label="Device" value={device ? <Link to={`/app/${device.service}/${device.id}`} className="text-pulse-600 hover:underline">{device.id}</Link> : <span className="text-ink-400">—</span>} />
        <Summary label="Service" value={<span className="flex items-center gap-1.5"><ServiceIconBadge service={ticket.service} size="sm" /> {ticket.service[0].toUpperCase() + ticket.service.slice(1)}</span>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Incident information" />
            <CardBody>
              <p className="text-sm leading-relaxed text-ink-600">{ticket.description}</p>
              {ticket.resolution && (
                <div className="mt-4 rounded-lg border border-live-200 bg-live-50 p-3 text-sm text-live-800">
                  <span className="font-bold">Resolution:</span> {ticket.resolution}
                </div>
              )}
            </CardBody>
          </Card>

          {ticket.aiAnalysis && (
            <Card className="border-pulse-100">
              <CardHeader title={<span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-pulse-600" /> AI Analysis</span>} />
              <CardBody>
                <p className="text-sm text-ink-600">{ticket.aiAnalysis}</p>
                <div className="mt-2 text-[11px] font-semibold text-pulse-600">Confidence: high</div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Timeline" subtitle="Audit trail of actions" />
            <div className="px-5 py-4">
              {ticket.timeline.map((item, i) => (
                <div key={i} className="relative flex gap-3 border-l border-ink-100 pb-4 pl-4 last:pb-0">
                  <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-pulse-500" />
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-ink-800">{item.label}</div>
                    <div className="text-[11px] text-ink-400">{item.actor} · <span className="tabular">{timeAgo(item.ts, now)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Comments" subtitle={`${ticket.comments.length} comments`} />
            <CardBody className="space-y-3">
              {ticket.comments.length === 0 && <div className="text-sm text-ink-400">No comments yet.</div>}
              {ticket.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pulse-100 text-xs font-bold text-pulse-700">{c.author[0]}</span>
                  <div className="rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-ink-800">{c.author}</span>
                      <span className="text-ink-400 tabular">{timeAgo(c.ts, now)}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-700">{c.body}</p>
                  </div>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  addComment(ticket.id, comment);
                  setComment("");
                }}
                className="flex items-start gap-2 pt-2"
              >
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="min-h-[60px] flex-1" />
                <Button type="submit" variant="outline" size="sm" className="mt-0.5"><Send className="h-4 w-4" /></Button>
              </form>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Created by" value={ticket.createdBy} />
              <Row label="Created" value={`${timeAgo(ticket.createdAt, now)}`} />
              <Row label="Attachments" value={<span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {ticket.attachmentCount}</span>} />
              <Row label="Location" value={device?.location ?? "—"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assigned operator" />
            <CardBody className="space-y-3">
              {operator ? (
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{operator.initials}</span>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{operator.name}</div>
                    <div className="text-xs text-ink-400">{operator.role} · {operator.service}</div>
                  </div>
                  <div className="ml-auto"><Badge tone="success" dot>On assignment</Badge></div>
                </div>
              ) : (
                <div className="text-sm text-ink-400">Unassigned</div>
              )}
              <div className="border-t border-ink-100 pt-3">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">Assign to</div>
                <div className="flex flex-wrap gap-1.5">
                  {availableOps.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => assignTicket(ticket.id, o.id)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                        ticket.operatorId === o.id ? "border-pulse-400 bg-pulse-50 text-pulse-700" : "border-ink-200 text-ink-600 hover:border-pulse-300"
                      )}
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}