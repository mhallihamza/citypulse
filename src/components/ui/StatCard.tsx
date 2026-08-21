import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Sparkline } from "@/components/ui/Sparkline";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * KPI card used across dashboards: value + trend + sparkline + last update.
 * Props follow the CITYPULSE KPI contract (current value, status, trend,
 * mini chart, last update).
 */
export function StatCard({
  label,
  value,
  sub,
  trend = "flat",
  spark,
  sparkColor,
  icon,
  lastUpdate,
  toneClass,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  spark?: number[];
  sparkColor?: string;
  icon?: ReactNode;
  lastUpdate?: number;
  toneClass?: string;
  className?: string;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    <Card className={cn("lift p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-ink-500">
          {icon}
          <span className="text-[13px] font-semibold uppercase tracking-wide">{label}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold",
            trend === "up" && "bg-live-50 text-live-700",
            trend === "down" && "bg-red-50 text-red-600",
            trend === "flat" && "bg-ink-100 text-ink-500"
          )}
          title={`Trend: ${trend}`}
        >
          <TrendIcon className="h-3 w-3" />
          {sub ? "PP" : ""}
        </span>
      </div>
      <div className={cn("mt-3 font-display text-[26px] font-bold tracking-tight text-ink-900", toneClass)}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-ink-500">{sub ?? "\u00a0"}</div>
      {spark && (
        <div className="mt-3 -mx-1">
          <Sparkline data={spark} color={sparkColor ?? "#246BFF"} height={38} />
        </div>
      )}
      {lastUpdate && (
        <div className="mt-2 text-[11px] text-ink-400">
          Last update <span className="tabular font-medium text-ink-500">{timeAgo(lastUpdate, Date.now())}</span>
        </div>
      )}
    </Card>
  );
}