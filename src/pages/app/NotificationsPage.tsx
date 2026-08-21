import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "critical", label: "Critical", cls: "border-red-200 bg-red-50/60" },
  { key: "warning", label: "Warnings", cls: "border-amber-200 bg-amber-50/60" },
  { key: "info", label: "Information", cls: "border-pulse-100 bg-pulse-50/40" },
] as const;

export function NotificationsPage() {
  const { data, now, markNotificationRead } = useApp();

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Alerts, AI recommendations and activity across your organization."
        live
        actions={<Badge tone="info" dot>{data.notifications.filter((n) => !n.read).length} unread</Badge>}
      />

      <div className="space-y-6">
        {GROUPS.map((g) => {
          const items = data.notifications.filter((n) => n.severity === g.key);
          if (!items.length) return null;
          return (
            <Card key={g.key} className={cn("border", g.cls)}>
              <div className="flex items-center justify-between border-b border-ink-100/60 px-5 py-3">
                <div className="text-sm font-bold text-ink-800">{g.label}</div>
                <Badge tone="neutral">{items.filter((n) => !n.read).length} new</Badge>
              </div>
              <div className="divide-y divide-ink-50">
                {items.map((n) => {
                  const dot = n.severity === "critical" ? "bg-red-500" : n.severity === "warning" ? "bg-amber-500" : "bg-pulse-500";
                  return (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={cn("flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/60", !n.read && "bg-white/40")}
                    >
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink-800">{n.title}</span>
                        <span className="block text-xs text-ink-500">{n.message}</span>
                        <span className="mt-0.5 block text-[10px] text-ink-400 tabular">{timeAgo(n.ts, now)}</span>
                      </span>
                      {!n.read && (
                        <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-pulse-500" />
                      )}
                      {n.actionUrl && (
                        <Link to={n.actionUrl} className="shrink-0 text-xs font-semibold text-pulse-600 hover:underline">
                          View
                        </Link>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}