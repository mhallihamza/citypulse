import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/format";
import type { OperatorStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<OperatorStatus, { label: string; cls: string; dot: string }> = {
  available: { label: "Available", cls: "bg-live-50 text-live-700 border-live-200", dot: "bg-live-500" },
  on_assignment: { label: "On Assignment", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  offline: { label: "Offline", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

export function OperatorsPage() {
  const { data, now } = useApp();

  return (
    <div>
      <PageHeader
        title="Operators"
        subtitle="Field teams, workload and live availability."
        live
        actions={
          <Badge tone="success" dot>
            {data.operators.filter((o) => o.status === "available").length} available
          </Badge>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { l: "Total operators", v: data.operators.length, t: "neutral" },
          { l: "Available", v: data.operators.filter((o) => o.status === "available").length, t: "success" },
          { l: "On assignment", v: data.operators.filter((o) => o.status === "on_assignment").length, t: "warning" },
          { l: "Open tickets", v: data.tickets.filter((t) => t.status === "open" || t.status === "in_progress").length, t: "info" },
        ].map((s) => (
          <Card key={s.l} className="p-5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">{s.l}</div>
            <div className="mt-1 font-display text-2xl font-bold text-ink-900">{s.v}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Operator</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Current tickets</th>
                <th className="px-4 py-3 font-semibold">Last activity</th>
                <th className="px-4 py-3 font-semibold">Avg resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {data.operators.map((o) => {
                const sm = STATUS_META[o.status];
                return (
                  <tr key={o.id} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pulse-100 text-xs font-bold text-pulse-700">{o.initials}</span>
                        <div>
                          <div className="font-semibold text-ink-900">{o.name}</div>
                          <div className="text-[11px] text-ink-400">{o.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{o.role.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-ink-600">{o.service === "all" ? "All" : o.service[0].toUpperCase() + o.service.slice(1)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold", sm.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", sm.dot)} /> {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular text-ink-800">{o.currentTickets}</td>
                    <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(o.lastActivity, now)}</td>
                    <td className="px-4 py-3 text-ink-600 tabular">{o.avgResolutionMin} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}