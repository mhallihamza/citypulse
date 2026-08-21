import { cn } from "@/lib/utils";

export function Progress({
  value,
  tone = "info",
  className,
  barClassName,
}: {
  value: number;
  tone?: "info" | "success" | "warning" | "critical";
  className?: string;
  barClassName?: string;
}) {
  const colors = {
    info: "bg-pulse-500",
    success: "bg-live-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink-100", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Meter({
  value,
  label,
  unit = "%",
  tone,
  className,
}: {
  value: number;
  label: string;
  unit?: string;
  tone?: "info" | "success" | "warning" | "critical";
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink-500">{label}</span>
        <span className="tabular font-semibold text-ink-800">
          {value}
          {unit}
        </span>
      </div>
      <Progress value={value} tone={tone} />
    </div>
  );
}