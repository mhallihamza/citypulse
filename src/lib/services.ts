import { Lightbulb, Droplets, Trash2, TrafficCone, type LucideIcon } from "lucide-react";
import type { ServiceId } from "@/lib/types";

/**
 * CITYPULSE service registry.
 *
 * The platform supports four city services. LIGHTING is the only service
 * currently connected to real IoT data. Water, Waste and Traffic are future
 * services: they exist in the architecture, navigation and product, but have
 * no live data yet and render professional "not connected yet" states.
 *
 * Adding a service later = filling in a shape like this, no redesign needed.
 */
export interface ServiceConfig {
  key: ServiceId;
  name: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  description: string;
  /** Whether the service currently has real operational data. */
  connected: boolean;
}

export const SERVICES: ServiceConfig[] = [
  {
    key: "lighting",
    name: "Lighting",
    icon: Lightbulb,
    color: "#F59E0B",
    bg: "#FFFBEB",
    description: "Smart street lighting operations.",
    connected: true,
  },
  {
    key: "water",
    name: "Water",
    icon: Droplets,
    color: "#246BFF",
    bg: "#EEF6FF",
    description: "Water infrastructure monitoring.",
    connected: true,
  },
  {
    key: "waste",
    name: "Waste",
    icon: Trash2,
    color: "#10B981",
    bg: "#ECFDF5",
    description: "Smart waste management.",
    connected: false,
  },
  {
    key: "traffic",
    name: "Traffic",
    icon: TrafficCone,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    description: "Traffic monitoring & analytics.",
    connected: true,
  },
];

export const SERVICE_CONFIG: Record<ServiceConfig["key"], ServiceConfig> = Object.fromEntries(
  SERVICES.map((s) => [s.key, s])
) as Record<ServiceConfig["key"], ServiceConfig>;