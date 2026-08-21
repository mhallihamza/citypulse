import { Lightbulb, Droplets, Trash2, TrafficCone, type LucideIcon } from "lucide-react";
import type { ServiceId } from "@/lib/types";

export const SERVICE_META: Record<
  ServiceId,
  { label: string; icon: LucideIcon; color: string; bg: string; subtitle: string }
> = {
  lighting: {
    label: "Lighting",
    icon: Lightbulb,
    color: "#F59E0B",
    bg: "#FFFBEB",
    subtitle: "Smart street lighting infrastructure",
  },
  water: {
    label: "Water",
    icon: Droplets,
    color: "#246BFF",
    bg: "#EEF6FF",
    subtitle: "Water infrastructure monitoring",
  },
  waste: {
    label: "Waste",
    icon: Trash2,
    color: "#10B981",
    bg: "#ECFDF5",
    subtitle: "Smart waste management",
  },
  traffic: {
    label: "Traffic",
    icon: TrafficCone,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    subtitle: "Traffic monitoring & analytics",
  },
};

export function ServiceIcon({
  service,
  className,
}: {
  service: ServiceId;
  className?: string;
}) {
  const meta = SERVICE_META[service];
  const Icon = meta.icon;
  return <Icon className={className} />;
}

export function ServiceIconBadge({
  service,
  size = "md",
}: {
  service: ServiceId;
  size?: "sm" | "md" | "lg";
}) {
  const meta = SERVICE_META[service];
  const Icon = meta.icon;
  const dims =
    size === "sm" ? "h-8 w-8 p-1.5 rounded-lg" : size === "md" ? "h-10 w-10 p-2 rounded-lg" : "h-12 w-12 p-2.5 rounded-xl";
  return (
    <span className={`inline-flex items-center justify-center ${dims}`} style={{ background: meta.bg, color: meta.color }}>
      <Icon className="h-full w-full" />
    </span>
  );
}