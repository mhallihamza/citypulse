import type {
  AiInsight,
  AppData,
  AppNotification,
  CityEvent,
  Device,
  ServiceId,
  TelemetrySample,
} from "@/lib/types";
import { clamp, round } from "@/lib/utils";

/**
 * Live simulation engine.
 *
 * In production this is replaced by Supabase Realtime subscriptions
 * (see lib/supabase.ts + supabase/schema.sql). The simulation mutates the
 * same AppData shape every 3 seconds so every screen visibly updates —
 * KPIs, device status, events, notifications, maps and charts — without a
 * page refresh. This mirrors exactly what a `postgres_changes` channel
 * would deliver.
 */

const EVENT_POOL: {
  service: ServiceId;
  deviceIndexFn: (count: number) => number;
  title: string;
  severity: CityEvent["severity"];
  detail: string;
}[] = [
  { service: "lighting", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Dimming command exceeded threshold", severity: "warning", detail: "Brightness drifted from commanded profile." },
  { service: "water", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Flow fluctuation detected", severity: "info", detail: "Flow variance above seasonal baseline." },
  { service: "waste", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Bin fill level spike", severity: "warning", detail: "Unexpected fill increase, collection route may need rerouting." },
  { service: "traffic", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Congestion building", severity: "warning", detail: "Density forecast crossing 70% on monitored corridor." },
  { service: "lighting", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Photocell calibration event", severity: "info", detail: "Auto-calibration completed successfully." },
  { service: "water", deviceIndexFn: (c) => Math.floor(Math.random() * c), title: "Pressure transient", severity: "warning", detail: "Pressure transient logged during network operation." },
];

let eventSeq = 1100;
let notifSeq = 920;
let ticketSeq = 700;

function nextSample(prev: TelemetrySample | undefined, d: Device, ts: number): TelemetrySample {
  const drift = Math.random() - 0.5;
  const base: TelemetrySample = prev ? { ...prev } : { ts };
  base.ts = ts;
  if (d.service === "lighting") {
    base.lux = round(clamp((base.lux ?? 8) + drift * 1.1 + (d.entityStatus === "critical" ? -0.4 : 0), 0.2, 22), 1);
    base.presence = Math.random() > 0.55 ? 1 : 0;
    base.power = d.mode === "OFF" ? 0.4 : d.mode === "FAILURE" ? 30 : 31 + Math.floor(Math.random() * 3);
    base.brightness = d.mode === "OFF" ? 0 : 100;
    if (d.id === "L-104") base.lux = round(clamp(4.2 + drift * 0.6, 3.4, 5.2), 1);
  } else if (d.service === "water") {
    base.flow = round(clamp((base.flow ?? 10) + drift * 0.8, 2, 21), 1);
    base.pressure = round(clamp((base.pressure ?? 4) + drift * 0.08 + (d.id === "W-03" ? -0.03 : 0), 2.4, 5.6), 2);
  } else if (d.service === "waste") {
    base.fillLevel = round(clamp((base.fillLevel ?? 55) + 0.05 + Math.random() * 0.5, 2, 100));
  } else {
    base.vehicles = Math.max(20, Math.floor((base.vehicles ?? 300) + drift * 24));
    base.density = round(clamp((base.density ?? 50) + drift * 5, 5, 100));
    base.congestion = round(clamp((base.congestion ?? 30) + drift * 6, 2, 100));
    base.travelTime = round(clamp((base.travelTime ?? 12) + drift * 1, 4, 40), 1);
  }
  return base;
}

function maybeRandomDeviceStateChange(devices: Device[], ts: number): Device[] {
  const updated = devices.slice();
  if (Math.random() < 0.06) {
    const i = 20 + Math.floor(Math.random() * (updated.length - 20));
    const d = updated[i];
    if (d.entityStatus === "normal") {
      d.entityStatus = "warning";
      d.mode = d.service === "lighting" ? "FAILURE" : d.mode;
    } else if (d.entityStatus === "warning" && Math.random() < 0.5) {
      d.entityStatus = "normal";
      d.mode = d.service === "lighting" ? "NORMAL" : "ON";
    }
    d.lastHeartbeat = ts;
  }
  if (Math.random() < 0.05) {
    const offline = updated.filter((d) => d.status === "offline");
    if (offline.length) {
      const pick = offline[Math.floor(Math.random() * offline.length)];
      pick.status = "online";
      pick.entityStatus = "warning";
      pick.lastHeartbeat = ts;
    }
  }
  return updated;
}

export function tick(prev: AppData): AppData {
  const ts = Date.now();
  const devices = prev.devices.map((d) => ({
    ...d,
    lastHeartbeat: d.status === "online" ? ts - Math.floor(Math.random() * 800) : d.lastHeartbeat,
    lastTelemetryAt: ts,
    signal: clamp(d.signal + (Math.random() - 0.5) * 6, 55, 100),
  }));
  const devices2 = maybeRandomDeviceStateChange(devices, ts);

  const telemetry: Record<string, TelemetrySample[]> = {};
  for (const d of devices2) {
    const arr = prev.telemetry[d.id] ?? [];
    const n = nextSample(arr.slice(-1)[0], d, ts);
    telemetry[d.id] = [...arr.slice(-140), n];
  }

  // Keep hero scenarios stable for demo continuity.
  const w03 = devices2.find((d) => d.id === "W-03");
  const b218 = devices2.find((d) => d.id === "B-218");
  if (w03) w03.entityStatus = "warning";
  if (b218) b218.entityStatus = "critical";

  let events = prev.events;
  let notifications = prev.notifications;
  let tickets = prev.tickets;

  // Occasionally produce a streaming event (like a postgres_changes insert).
  if (Math.random() < 0.2) {
    const tpl = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    const fleet = devices2.filter((d) => d.service === tpl.service);
    if (fleet.length) {
      const dev = fleet[tpl.deviceIndexFn(fleet.length)];
      const ev: CityEvent = {
        id: `EV-${eventSeq++}`,
        service: tpl.service,
        deviceId: dev.id,
        title: tpl.title,
        severity: tpl.severity,
        status: "new",
        detail: tpl.detail,
        createdAt: ts,
        source: "realtime",
      };
      events = [ev, ...prev.events].slice(0, 60);
      notifications = [
        {
          id: `NT-${notifSeq++}`,
          severity: (tpl.severity === "warning" ? "warning" : "info") as AppNotification["severity"],
          title: tpl.title,
          message: `${dev.id} · ${dev.zone}`,
          read: false,
          ts,
          actionUrl: `/app/${tpl.service}/${dev.id}`,
        },
        ...prev.notifications,
      ].slice(0, 40);
    }
  }

  // Occasionally resolve the oldest acknowledged event (churn).
  if (Math.random() < 0.08) {
    const cand = prev.events.find((e) => e.status === "acknowledged");
    if (cand) {
      events = events.map((e) => (e.id === cand.id ? { ...e, status: "resolved", resolvedAt: ts } : e));
    }
  }

  // Occasionally a new ticket materializes from a critical event.
  const openCritical = events.find(
    (e) => e.severity === "critical" && e.status === "new" && !tickets.some((t) => t.deviceId === e.deviceId)
  );
  if (openCritical && Math.random() < 0.4) {
    const prefix = { lighting: "LGT", water: "WAT", waste: "WST", traffic: "TRF" }[openCritical.service];
    const t = {
      id: `${prefix}-${openCritical.deviceId.split("-")[1] ?? ticketSeq++}`,
      title: openCritical.title,
      service: openCritical.service,
      priority: "high" as const,
      status: "open" as const,
      deviceId: openCritical.deviceId,
      operatorId: undefined,
      createdBy: "CITYPULSE AI",
      createdAt: ts,
      updatedAt: ts,
      description: openCritical.detail,
      aiAnalysis: undefined,
      comments: [],
      timeline: [{ ts, label: "Ticket created automatically from critical event", actor: "CITYPULSE AI" }],
      attachmentCount: 0,
    };
    tickets = [t, ...prev.tickets];
  }

  // Touch updatedAt on a random in-flight ticket.
  if (Math.random() < 0.12) {
    const inFlight = tickets.find((t) => t.status === "in_progress") ?? tickets.find((t) => t.status === "open");
    if (inFlight) {
      tickets = tickets.map((t) => (t.id === inFlight.id ? { ...t, updatedAt: ts } : t));
    }
  }

  return { ...prev, devices: devices2, telemetry, events, notifications, tickets };
}

let insightSeq = 210;

export function tickInsights(prev: AppData): AppData {
  if (Math.random() < 0.1) {
    const labels = ["Service anomaly trending above threshold", "Corridor travel-time model updated", "Zone efficiency indicator changed"];
    const svc = (["lighting", "water", "waste", "traffic"] as ServiceId[])[Math.floor(Math.random() * 4)];
    const ins: AiInsight = {
      id: `AI-${insightSeq++}`,
      title: labels[Math.floor(Math.random() * labels.length)],
      service: svc,
      severity: "info",
      confidence: 0.6 + Math.random() * 0.3,
      observation: "Streaming model revision from hourly batch pipeline.",
      evidence: [{ label: "Window", value: "15 min" }],
      recommendation: "No immediate action required; continue monitoring.",
      devices: [],
      createdAt: Date.now(),
      status: "new",
    };
    return { ...prev, insights: [ins, ...prev.insights].slice(0, 30) };
  }
  return prev;
}