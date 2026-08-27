import type { CityEvent, Device, LightingState, ServiceId, TelemetrySample, Ticket, TrafficState, WasteState, WaterState } from "@/lib/types";
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
  anomalies: number; // devices whose live ESP32 state is anything other than NORMAL (e.g. MEDIUM_LEAK, BLOCKAGE)
  openTickets: number;
}

export function waterStats(devices: Device[], waterStates: Record<string, WaterState>, tickets: Ticket[]): WaterStats {
  const fleet = devices.filter((d) => d.service === "water");
  const online = fleet.filter((d) => waterStates[d.id]?.online).length;
  const anomalies = fleet.filter((d) => {
    const st = String(waterStates[d.id]?.state ?? "").trim().toUpperCase();
    return st !== "" && st !== "NORMAL";
  }).length;
  const openTickets = tickets.filter((t) => t.service === "water" && t.status !== "resolved").length;
  return { fleet, total: fleet.length, online, offline: fleet.length - online, anomalies, openTickets };
}

// ---------------------------------------------------------------------------
// Waste — Smart Bin statistics from actual waste_states records.
// ---------------------------------------------------------------------------

export interface WasteStats {
  fleet: Device[];
  total: number;
  online: number;
  offline: number;
  warnings: number; // bins currently reporting status WARNING
  openTickets: number;
}

export function wasteStats(devices: Device[], wasteStates: Record<string, WasteState>, tickets: Ticket[]): WasteStats {
  const fleet = devices.filter((d) => d.service === "waste");
  const online = fleet.filter((d) => wasteStates[d.id]?.online).length;
  const warnings = fleet.filter((d) => String(wasteStates[d.id]?.status ?? "").trim().toUpperCase() === "WARNING").length;
  const openTickets = tickets.filter((t) => t.service === "waste" && t.status !== "resolved").length;
  return { fleet, total: fleet.length, online, offline: fleet.length - online, warnings, openTickets };
}

// ---------------------------------------------------------------------------
// City health — per-service operational score built from REAL signals:
// connectivity + live state (lamp failure / congestion / leak / bin warning)
// + unresolved incidents. Issues always move the percentage and the label.
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  pct: number | null; // % of the fleet fully healthy (null when no devices)
  label: string; // Operational | Minor issues | Degraded | Offline | Incident | Critical | No data
  tone: string; // tailwind text color for the label
  healthy: number;
  total: number;
  issues: number;
  criticals: number;
}

export function serviceHealth(
  service: ServiceId,
  devices: Device[],
  states: Record<string, LightingState>,
  trafficStates: Record<string, TrafficState>,
  waterStates: Record<string, WaterState>,
  wasteStates: Record<string, WasteState>,
  events: CityEvent[]
): ServiceHealth {
  const fleet = devices.filter((d) => d.service === service);
  const total = fleet.length;
  const empty: ServiceHealth = { pct: null, label: "No data", tone: "text-ink-400", healthy: 0, total: 0, issues: 0, criticals: 0 };
  if (total === 0) return empty;

  // Unresolved incidents per device (real event rows only).
  const openEvents = new Map<string, { critical: boolean; warning: boolean }>();
  for (const e of events) {
    if (e.service !== service || !e.deviceId || e.status === "resolved") continue;
    const cur = openEvents.get(e.deviceId) ?? { critical: false, warning: false };
    if (e.severity === "critical") cur.critical = true;
    else if (e.severity === "warning") cur.warning = true;
    openEvents.set(e.deviceId, cur);
  }

  let issues = 0;
  let criticals = 0;
  for (const d of fleet) {
    let problem: "critical" | "warning" | null = null;
    const flag = (p: "critical" | "warning") => {
      if (!problem || (p === "critical" && problem === "warning")) problem = p;
    };

    // Connectivity — a registered device that is not reporting is a real issue.
    const online =
      service === "lighting" ? states[d.id]?.online : service === "traffic" ? trafficStates[d.id]?.online : service === "water" ? waterStates[d.id]?.online : wasteStates[d.id]?.online;
    if (online === false) flag("warning");

    // Live state per service vocabulary.
    if (service === "lighting") {
      const s = states[d.id];
      if (s?.lampFailure) flag("critical");
    } else if (service === "traffic") {
      const st = String(trafficStates[d.id]?.state ?? "").toUpperCase();
      if (st === "INCIDENT") flag("critical");
      else if (st === "CONGESTED") flag("warning");
    } else if (service === "water") {
      const s = waterStates[d.id];
      const st = String(s?.state ?? "").toUpperCase();
      if (s?.leakage || st === "LEAK" || st === "BLOCKAGE" || st.includes("LEAK")) flag("critical");
      else if (st !== "" && st !== "NORMAL" && st !== "OK") flag("warning");
    } else if (service === "waste") {
      const st = String(wasteStates[d.id]?.status ?? "").toUpperCase();
      if (st !== "" && st !== "NORMAL") flag("warning");
    }

    const ev = openEvents.get(d.id);
    if (ev?.critical) flag("critical");
    else if (ev?.warning) flag("warning");

    if (problem) {
      issues += 1;
      if (problem === "critical") criticals += 1;
    }
  }

  const healthy = total - issues;
  const pct = (healthy / total) * 100;

  let label = "Operational";
  let tone = "text-live-600";
  if (issues > 0) {
    if (criticals > 0) {
      label = "Incident";
      tone = "text-red-600";
    } else if (issues === total) {
      label = "Offline";
      tone = "text-amber-600";
    } else if (pct >= 80) {
      label = "Minor issues";
      tone = "text-amber-600";
    } else if (pct >= 50) {
      label = "Degraded";
      tone = "text-amber-600";
    } else {
      label = "Critical";
      tone = "text-red-600";
    }
  }

  return { pct, label, tone, healthy, total, issues, criticals };
}