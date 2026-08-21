import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "offline"
  | "brand"
  | "danger";

const tones: Record<Tone, string> = {
  success: "bg-live-50 text-live-700 border-live-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  info: "bg-pulse-50 text-pulse-700 border-pulse-200",
  neutral: "bg-ink-100 text-ink-600 border-ink-200",
  offline: "bg-slate-100 text-slate-600 border-slate-200 ",
  brand: "bg-ink-950 text-white border-ink-800",
  danger: "bg-red-50 text-red-700 border-red-200",
};

const dots: Record<Tone, string> = {
  success: "bg-live-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  info: "bg-pulse-500",
  neutral: "bg-ink-400",
  offline: "bg-slate-400",
  brand: "bg-pulse-400",
  danger: "bg-red-500",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot = false,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  return (
    <Badge tone={severity === "critical" ? "critical" : severity === "warning" ? "warning" : "info"} dot>
      {severity === "critical" ? "Critical" : severity === "warning" ? "Warning" : "Info"}
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: "normal" | "warning" | "critical" | "offline";
  className?: string;
}) {
  const tone: Tone = status === "normal" ? "success" : status;
  return (
    <Badge tone={tone} dot className={className}>
      {status.toUpperCase()}
    </Badge>
  );
}

export function toneForStatus(status: "normal" | "warning" | "critical" | "offline"): Tone {
  return status === "normal" ? "success" : status;
}