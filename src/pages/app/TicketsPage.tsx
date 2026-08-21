import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import type { Ticket, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<TicketStatus, string> = {
  open: "bg-pulse-50 text-pulse-700 border-pulse-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-live-50 text-live-700 border-live-200",
  reopened: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusPill({ status }: { status: TicketStatus }) {
  return <span className={cn("inline-block rounded-full border px-2 py-0.5 text-xs font-semibold", STATUS_TONE[status])}>{status.replace("_", " ")}</span>;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function TicketsPage() {
  const { data, now } = useApp();
  const [view, setView] = useState("all");

  const filtered = data.tickets.filter((t) => {
    if (view === "all") return true;
    if (view === "open") return t.status === "open";
    if (view === "in_progress") return t.status === "in_progress";
    if (view === "resolved") return t.status === "resolved";
    if (view === "critical") return t.priority === "critical" && t.status !== "resolved";
    return true;
  }).sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const tabItems = [
    { id: "all", label: "All", count: data.tickets.length },
    { id: "open", label: "Open", count: data.tickets.filter((t) => t.status === "open").length },
    { id: "in_progress", label: "In Progress", count: data.tickets.filter((t) => t.status === "in_progress").length },
    { id: "resolved", label: "Resolved", count: data.tickets.filter((t) => t.status === "resolved").length },
    { id: "critical", label: "Critical", count: data.tickets.filter((t) => t.priority === "critical" && t.status !== "resolved").length },
  ];

  const operatorName = (id?: string) => data.operators.find((o) => o.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle="End-to-end incident and work order management."
        actions={<Tabs items={tabItems} active={view} onChange={setView} />}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Ticket</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Operator</th>
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
                      #{t.id}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-ink-800">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <ServiceIconBadge service={t.service} size="sm" />
                      <span className="hidden xl:inline">{t.service[0].toUpperCase() + t.service.slice(1)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={t.priority === "critical" ? "critical" : t.priority === "high" || t.priority === "medium" ? "warning" : "info"} /></td>
                  <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                  <td className="px-4 py-3 text-ink-600">{operatorName(t.operatorId)}</td>
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
      </Card>
    </div>
  );
}