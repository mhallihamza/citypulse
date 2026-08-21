import { cn } from "@/lib/utils";

export function LogoMark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className={light ? "fill-pulse-400" : "fill-ink-900"} />
      <path
        d="M7 19.5h5l3.5-7 3.5 11.5 3-8.5 3 4h3"
        stroke="url(#pulse-logo-g)"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="15.5" r="2.1" fill="#34D399" />
      <defs>
        <linearGradient id="pulse-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FB0FF" />
          <stop offset="1" stopColor="#246BFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  light = false,
  compact = false,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <LogoMark light={light} className="h-8 w-8 shrink-0" />
      {!compact && (
        <span className={cn("font-display text-lg font-700 tracking-tight", light ? "text-white" : "text-ink-900")}>
          CITY<span className="text-pulse-500">PULSE</span>
        </span>
      )}
    </span>
  );
}