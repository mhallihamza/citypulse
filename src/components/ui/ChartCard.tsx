import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  height = 260,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className="p-4" style={{ height }}>
        {children}
      </div>
    </Card>
  );
}

export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-ink-700">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 tabular">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-ink-500">{p.name}:</span>
          <span className="font-semibold text-ink-900">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}