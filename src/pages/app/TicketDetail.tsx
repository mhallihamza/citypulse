import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BrainCircuit, Send, UserPlus, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import * as api from "@/lib/api";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Modal";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import { SERVICE_LABEL, type Operator, type TicketAssignment, type TicketComment, type TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TicketDetail() {
  const { ticketId = "" } = useParams();
  const { tickets, devices, users, operators, ticketAssignments, now, setTicketStatus, assignTicket, assignTicketOperator, removeTicketOperator, addTicketComment, toast } = useApp();
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [sending, setSending] = useState(false);

  const ticket = tickets.find((t) => t.id === ticketId);
  const device = ticket?.deviceId ? devices.find((d) => d.id === ticket.deviceId) : undefined;

  // Real comments for this ticket.
  useEffect(() => {
    let mounted = true;
    if (!ticketId) return;
    api
      .fetchTicketComments([ticketId])
      .then((rows) => {
        if (mounted) setComments(rows);
      })
      .catch((e) => console.error("fetchTicketComments", e));
    return () => {
      mounted = false;
    };
  }, [ticketId]);

  if (!ticket) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Ticket not found</h2>
        <Link to="/app/tickets" className="mt-4 inline-block"><Button variant="outline" size="sm">Back to tickets</Button></Link>
      </div>
    );
  }

  // Field-operator assignments for this ticket — fetched through the
  // ticket_assignments -> operators relationship (never duplicated into tickets).
  const ticketAssignmentsForTicket = ticketAssignments.filter((a) => a.ticketId === ticket.id);
  const assignedOperators = ticketAssignmentsForTicket
    .map((a): { assignment: TicketAssignment; operator: Operator } | null => {
      const operator = operators.find((o) => o.id === a.operatorId);
      return operator ? { assignment: a, operator } : null;
    })
    .filter((x): x is { assignment: TicketAssignment; operator: Operator } => x !== null);
  // Operators not yet assigned to this ticket; matching-service operators sorted
  // first as preferred (cross-service assignment is still allowed for MVP).
  const candidateOperators = operators
    .filter((o) => !ticketAssignmentsForTicket.some((a) => a.operatorId === o.id))
    .sort((a, b) => Number(b.service === ticket.service) - Number(a.service === ticket.service));

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await addTicketComment(ticket.id, comment.trim());
      const rows = await api.fetchTicketComments([ticket.id]);
      setComments(rows);
      setComment("");
    } catch (e) {
      toast({ title: "Could not add comment", message: String((e as Error).message ?? e), severity: "critical" });
    } finally {
      setSending(false);
    }
  };

  const statusAction = (s: TicketStatus) => {
    switch (s) {
      case "open":
        return <Button size="sm" onClick={() => void setTicketStatus(ticket.id, "in_progress")}>Start work</Button>;
      case "in_progress":
        return <Button size="sm" variant="success" onClick={() => void setTicketStatus(ticket.id, "resolved")}>Resolve</Button>;
      default:
        return <Button size="sm" variant="outline" onClick={() => void setTicketStatus(ticket.id, "reopened")}>Reopen</Button>;
    }
  };

  return (
    <div>
      <Link to="/app/tickets" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <PageHeader
        title={<span className="font-mono">#{ticket.ticketKey}</span>}
        subtitle={ticket.title}
        actions={statusAction(ticket.status)}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Summary label="Priority" value={<SeverityBadge severity={ticket.priority === "critical" ? "critical" : ticket.priority === "medium" || ticket.priority === "low" ? "info" : "warning"} />} />
        <Summary label="Status" value={<Badge tone={ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "warning" : "info"}>{ticket.status.replace("_", " ")}</Badge>} />
        <Summary
          label="Device"
          value={
            device ? (
              <Link to={`/app/lighting/devices/${device.id}`} className="font-mono text-pulse-600 hover:underline">{device.deviceKey}</Link>
            ) : (
              <span className="text-ink-400">—</span>
            )
          }
        />
        <Summary label="Service" value={<span className="flex items-center gap-1.5"><ServiceIconBadge service={ticket.service} size="sm" /> {ticket.service[0].toUpperCase() + ticket.service.slice(1)}</span>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Incident information" subtitle={`Created by ${ticket.createdBy} · ${timeAgo(ticket.createdAt, now)}`} />
            <CardBody>
              <p className="text-sm leading-relaxed text-ink-600">{ticket.description ?? "No description provided."}</p>
              {ticket.resolution && (
                <div className="mt-4 rounded-lg border border-live-200 bg-live-50 p-3 text-sm text-live-800">
                  <span className="font-bold">Resolution:</span> {ticket.resolution}
                </div>
              )}
            </CardBody>
          </Card>

          {ticket.aiAnalysis && (
            <Card className="border-pulse-100">
              <CardHeader title={<span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-pulse-600" /> AI analysis</span>} />
              <CardBody>
                <p className="text-sm leading-relaxed text-ink-600">{ticket.aiAnalysis}</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Comments" subtitle={`${comments.length} ${comments.length === 1 ? "comment" : "comments"}`} />
            <CardBody className="space-y-3">
              {comments.length === 0 && <div className="text-sm text-ink-400">No comments yet.</div>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pulse-100 text-xs font-bold text-pulse-700">
                    {(c.author[0] ?? "?").toUpperCase()}
                  </span>
                  <div className="rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-ink-800">{c.author}</span>
                      <span className="text-ink-400 tabular">{timeAgo(c.createdAt, now)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{c.body}</p>
                  </div>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitComment();
                }}
                className="flex items-start gap-2 pt-2"
              >
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="min-h-[60px] flex-1" />
                <Button type="submit" variant="outline" size="sm" loading={sending} className="mt-0.5"><Send className="h-4 w-4" /></Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Ticket key" value={<span className="font-mono">{ticket.ticketKey}</span>} />
              <Row label="Created" value={timeAgo(ticket.createdAt, now)} />
              <Row label="Updated" value={timeAgo(ticket.updatedAt, now)} />
              <Row label="Location" value={device?.locationLabel ?? device?.zone ?? "—"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assignment" subtitle="Assign to an organization user" />
            <CardBody className="space-y-2">
              {users.length === 0 && <EmptyState title="No organization users found." className="py-6" />}
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => void assignTicket(ticket.id, u.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                    ticket.assignedTo === u.id ? "border-pulse-300 bg-pulse-50" : "border-ink-100 hover:border-pulse-200"
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                    {u.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-800">{u.fullName}</span>
                    <span className="block truncate text-[11px] text-ink-400">{u.role}</span>
                  </span>
                  {ticket.assignedTo === u.id && <Badge tone="info">Assigned</Badge>}
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Field Operators" subtitle="Assignments via ticket_assignments → operators" />
            <CardBody className="space-y-3">
              {assignedOperators.length === 0 && (
                <EmptyState title="No field operators assigned." message="Assign a field operator from your crew below." className="py-5" />
              )}
              {assignedOperators.map(({ assignment, operator }) => (
                <div key={assignment.id} className="flex items-center gap-3 rounded-lg border border-pulse-200 bg-pulse-50 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">
                    {operator.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-800">{operator.name}</span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {operator.role}
                      {operator.service ? ` · ${SERVICE_LABEL[operator.service]}` : ""} · {operator.status}
                    </span>
                  </span>
                  <Button variant="ghost" size="xs" className="!text-red-600 hover:!bg-red-50" onClick={() => void removeTicketOperator(assignment.id)}>
                    <X className="h-3.5 w-3.5" /> Unassign
                  </Button>
                </div>
              ))}

              <div className="border-t border-ink-100 pt-3">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">Assign operator</div>
                {candidateOperators.length === 0 && <p className="text-xs text-ink-400">No unassigned operators available.</p>}
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                  {candidateOperators.map((op) => {
                    const preferred = op.service === ticket.service;
                    return (
                      <div key={op.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2 transition-colors hover:border-pulse-200">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-700">
                          {op.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink-800">{op.name}</span>
                          <span className="block truncate text-[11px] text-ink-400">
                            {op.role}
                            {op.service ? ` · ${SERVICE_LABEL[op.service]}` : ""}
                          </span>
                        </span>
                        {preferred && <Badge tone="success">Preferred</Badge>}
                        <Button variant="outline" size="xs" onClick={() => void assignTicketOperator(ticket.id, op.id)}>
                          <UserPlus className="h-3.5 w-3.5" /> Assign
                        </Button>
                      </div>
                    );
                  })}
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
    <div className="flex justify-between gap-2 border-b border-ink-50 pb-2 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}