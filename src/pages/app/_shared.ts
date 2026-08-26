import type { CityEvent, Device, LightingState, ServiceId, TelemetrySample, Ticket, TrafficState, WaterState } from "@/lib/types";
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

/** Route prefix for a service's device detail pages (lighting keeps its own). */
export function serviceDevicePath(service: ServiceId): string {
  return `/app/${service}/devices`;
}

// ---------------------------------------------------------------------------
// Traffic & Water — real operational statistics from actual database records.
// ---------------------------------------------------------------------------

export interface TrafficStats {
  fleet: Device[];
  total: number;
  online: number;
  offline: number;
  congested: number; // devices currently CONGESTED / INCIDENT
  openTickets: number;
  vehiclesObserved: number; // sum of live vehicle_count across online devices
}

export function trafficStats(devices: Device[], trafficStates: Record<string, TrafficState>, events: CityEvent[], tickets: Ticket[]): TrafficStats {
  const fleet = devices.filter((d) => d.service === "traffic");
  const online = fleet.filter((d) => trafficStates[d.id]?.online).length;
  const congested = fleet.filter((d) => ["CONGESTED", "INCIDENT"].includes(String(trafficStates[d.id]?.state ?? ""))).length;
  const openTickets = tickets.filter((t) => t.service === "traffic" && t.status !== "resolved").length;
  let vehiclesObserved = 0;
  for (const d of fleet) {
    const s = trafficStates[d.id];
    if (s?.online && Number.isFinite(s.vehicleCount)) vehiclesObserved += s.vehicleCount;
  }
  return { fleet, total: fleet.length, online, offline: fleet.length - online, congested, openTickets, vehiclesObserved };
}

export interface WaterStats {
  fleet: Device[];
  total: number;
  online: number;
  offline: number;
  leaks: number; // devices with leakage = true
  openTickets: number;
}

export function waterStats(devices: Device[], waterStates: Record<string, WaterState>, tickets: Ticket[]): WaterStats {
  const fleet = devices.filter((d) => d.service === "water");
  const online = fleet.filter((d) => waterStates[d.id]?.online).length;
  const leaks = fleet.filter((d) => waterStates[d.id]?.leakage).length;
  const openTickets = tickets.filter((t) => t.service === "water" && t.status !== "resolved").length;
  return { fleet, total: fleet.length, online, offline: fleet.length - online, leaks, openTickets };
}