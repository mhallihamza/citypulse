import { cn } from "@/lib/utils";

/** Pulsing colored status dot. */
export function StatusDot({
  tone = "success",
  pulse = true,
  className,
}: {
  tone?: "success" | "warning" | "critical" | "offline" | "info";
  pulse?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    success: "bg-live-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
    offline: "bg-slate-400",
    info: "bg-pulse-500",
  };
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping",
            styles[tone]
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", styles[tone])} />
    </span>
  );
}

/** "● LIVE" realtime connection indicator. */
export function LiveIndicator({
  label = "LIVE",
  tone = "success",
  className,
}: {
  label?: string;
  tone?: "success" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest",
        tone === "success" ? "bg-live-50 text-live-700" : "bg-amber-50 text-amber-700",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full animate-ping opacity-75",
            tone === "success" ? "bg-live-500" : "bg-amber-500"
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-1.5 w-1.5 rounded-full",
            tone === "success" ? "bg-live-500" : "bg-amber-500"
          )}
        />
      </span>
      {label}
    </span>
  );
}