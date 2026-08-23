import type { CityEvent, Device, LightingState, ServiceId, TelemetrySample, Ticket } from "@/lib/types";
import { SERVICES } from "@/lib/services";

/**
 * Real operational statistics derived from actual database records.
 * Nothing here invents values: counts come from the org-scoped arrays
 * hydrated by AppContext (which fetch them from Supabase).
 */

export interface LightingStats {
  fleet: Device[];
  total: number;
  online: number;
  offline: number;
  failures: number; // LAMP_FAILURE events not yet resolved
  openTickets: number; // tickets NOT in a terminal status
}

export function lightingStats(
  devices: Device[],
  states: Record<string, LightingState>,
  events: CityEvent[],
  tickets: Ticket[]
): LightingStats {
  const fleet = devices.filter((d) => d.service === "lighting");
  const online = fleet.filter((d) => {
    const s = states[d.id];
    return s ? s.online : d.online;
  }).length;
  const failures = events.filter(
    (e) => e.service === "lighting" && e.eventType === "LAMP_FAILURE" && e.status !== "resolved"
  ).length;
  const openTickets = tickets.filter(
    (t) => t.service === "lighting" && t.status !== "resolved"
  ).length;
  return { fleet, total: fleet.length, online, offline: fleet.length - online, failures, openTickets };
}

/** Average of the last telemetry value across a device set (null when no data). */
export function avgLast(
  devices: Device[],
  telemetry: Record<string, TelemetrySample[]>,
  key: keyof TelemetrySample
): number | null {
  const vals: number[] = [];
  for (const d of devices) {
    const arr = telemetry[d.id];
    const last = arr?.slice(-1)[0];
    const v = last ? Number(last[key]) : NaN;
    if (!Number.isNaN(v)) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function serviceConnected(service: ServiceId): boolean {
  return SERVICES.find((s) => s.key === service)?.connected ?? false;
}

export function serviceSubtext(service: ServiceId): string {
  return {
    lighting: "Monitor and control smart street lighting infrastructure.",
    water: "Water flow, pressure, leak events and consumption.",
    waste: "Bin fill-level monitoring and collection optimization.",
    traffic: "Vehicle density, congestion detection and travel-time analysis.",
  }[service];
}