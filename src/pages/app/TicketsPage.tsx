import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import { SERVICE_LABEL, type ServiceId, type Ticket, type TicketPriority, type TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function StatusPill({ status }: { status: TicketStatus }) {
  const tone: Record<TicketStatus, string> = {
    open: "bg-pulse-50 text-pulse-700 border-pulse-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-live-50 text-live-700 border-live-200",
    reopened: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-semibold", tone[status])}>{status.replace("_", " ")}</span>;
}

/**
 * Tickets — real rows from public.tickets. Authorized users can create,
 * assign, update, resolve and re-open tickets (writes go to Supabase).
 */
export function TicketsPage({ service: fixedService }: { service?: ServiceId }) {
  const { tickets, now } = useApp();
  const [view, setView] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const scoped = fixedService ? tickets.filter((t) => t.service === fixedService) : tickets;

  const filtered = useMemo(
    () =>
      scoped
        .filter((t) => {
          if (view === "all") return true;
          if (view === "open") return t.status === "open";
          if (view === "in_progress") return t.status === "in_progress";
          if (view === "resolved") return t.status === "resolved";
          if (view === "critical") return t.priority === "critical" && t.status !== "resolved";
          return true;
        })
        .sort(
          (a, b) =>
            (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        ),
    [scoped, view]
  );

  const tabItems = [
    { id: "all", label: "All", count: scoped.length },
    { id: "open", label: "Open", count: scoped.filter((t) => t.status === "open").length },
    { id: "in_progress", label: "In Progress", count: scoped.filter((t) => t.status === "in_progress").length },
    { id: "resolved", label: "Resolved", count: scoped.filter((t) => t.status === "resolved").length },
    { id: "critical", label: "Critical", count: scoped.filter((t) => t.priority === "critical" && t.status !== "resolved").length },
  ];

  return (
    <div>
      <PageHeader
        title={fixedService ? "Lighting · Tickets" : "Tickets"}
        subtitle="Incident and work-order management across your organization."
        actions={
          <>
            <Tabs items={tabItems} active={view} onChange={setView} />
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Ticket</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                {!fixedService && <th className="px-4 py-3 font-semibold">Service</th>}
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((t: Ticket) => (
                <tr key={t.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="px-5 py-3">
                    <Link to={`/app/tickets/${t.id}`} className="font-mono font-semibold text-pulse-600 hover:underline">
                      #{t.ticketKey}
                    </Link>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-medium text-ink-800">{t.title}</td>
                  {!fixedService && (
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-ink-600">
                        <ServiceIconBadge service={t.service} size="sm" />
                        <span className="hidden xl:inline">{t.service[0].toUpperCase() + t.service.slice(1)}</span>
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <SeverityBadge severity={t.priority === "critical" ? "critical" : t.priority === "medium" || t.priority === "low" ? "info" : "warning"} />
                  </td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 text-ink-600">{t.assigneeName ?? <span className="text-ink-400">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(t.createdAt, now)}</td>
                  <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(t.updatedAt, now)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/tickets/${t.id}`} className="text-pulse-600 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState
            title="No tickets yet."
            message="Tickets are created by operators or automatically from critical events."
            action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New ticket</Button>}
            className="py-14"
          />
        )}
      </Card>

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} defaultService={(fixedService ?? "lighting") as ServiceId} />}
    </div>
  );
}

function CreateTicketModal({ onClose, defaultService }: { onClose: () => void; defaultService: ServiceId }) {
  const { createTicket, devices } = useApp();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("high");
  const [service, setService] = useState<ServiceId>(defaultService);
  const [deviceId, setDeviceId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fleet = devices.filter((d) => d.service === service);

  return (
    <Modal
      open
      onClose={onClose}
      title="Create ticket"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={saving}
            onClick={async () => {
              if (!title.trim()) {
                setError("A title is required.");
                return;
              }
              setSaving(true);
              try {
                await createTicket({
                  title: title.trim(),
                  service,
                  priority,
                  deviceId: deviceId || null,
                  description: description.trim() || undefined,
                });
                onClose();
              } catch (e) {
                setError(String((e as Error).message ?? e));
              } finally {
                setSaving(false);
              }
            }}
          >
            Create ticket
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lamp out after storm" />
        </Field>
        <Field label="Service">
          <Select value={service} onChange={(e) => { setService(e.target.value as ServiceId); setDeviceId(""); }}>
            {(Object.keys(SERVICE_LABEL) as ServiceId[]).map((s) => (
              <option key={s} value={s}>{SERVICE_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Device (optional)" className="sm:col-span-2">
          <Select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            <option value="">No linked device</option>
            {fleet.map((d) => (
              <option key={d.id} value={d.id}>{d.deviceKey}</option>
            ))}
          </Select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Context for the field team…" />
        </Field>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 sm:col-span-2">{error}</div>
        )}
        <div className="text-[11px] text-ink-400 sm:col-span-2">
          Critical events automatically raise high-priority tickets via a database trigger.
        </div>
      </div>
    </Modal>
  );
}