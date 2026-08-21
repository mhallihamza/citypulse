import type { Device, Point, ServiceId, TelemetrySample } from "@/lib/types";
import { clamp, mulberry32, round } from "@/lib/utils";

/**
 * Deterministic seed data generator.
 * Produces ~120 IoT devices + telemetry history so every page of the
 * platform has realistic, stable data on first load. The simulation engine
 * (simulate.ts) then mutates a copy of this in real time.
 */

export const DEVICE_TYPES: Record<ServiceId, string[]> = {
  lighting: ["Street Light Controller", "Feeder Panel", "Photocell Sensor"],
  water: ["Pressure Sensor", "Flow Monitor", "Smart Meter"],
  waste: ["Ultrasonic Bin Sensor", "Fill-Level Node"],
  traffic: ["Radar Sensor", "Camera Node", "Loop Detector"],
};

/** Build the street grid positions for each service family. */
function positionsFor(service: ServiceId): Point[] {
  const pts: Point[] = [];
  if (service === "lighting") {
    const xs = [150, 300, 450, 600, 750, 880];
    const ys = [170, 280, 390, 500];
    let i = 0;
    for (const y of ys)
      for (const x of xs) {
        pts.push({ x: x + (i % 3) * 8, y: y + (i % 2) * 6 });
        i++;
      }
    pts.push({ x: 240, y: 90 }, { x: 760, y: 90 });
  } else if (service === "water") {
    const xs = [180, 320, 460, 600, 740, 862];
    const ys = [120, 210, 300, 390, 470];
    for (let i = 0; i < 24; i++) {
      pts.push({ x: xs[i % 6] + (i % 2) * 14, y: ys[Math.floor(i / 6) % 5] + (i % 3) * 10 });
    }
  } else if (service === "waste") {
    for (let i = 0; i < 36; i++) {
      pts.push({ x: 90 + ((i * 47) % 820) + 20, y: 60 + ((i * 67) % 480) + 30 });
    }
  } else {
    const xs = [200, 400, 600, 820];
    const ys = [170, 300, 430];
    for (let i = 0; i < 20; i++) {
      pts.push({ x: xs[i % 4], y: ys[Math.floor(i / 4) % 3] });
    }
  }
  return pts;
}

const ZONE_NAMES: Record<ServiceId, (i: number) => string> = {
  lighting: (i) => `Zone L${Math.floor(i / 8) + 1}`,
  water: (i) => `Zone W${Math.floor(i / 5) + 1}`,
  waste: (i) => `Zone B${Math.floor(i / 9) + 1}`,
  traffic: (i) => `Zone T${Math.floor(i / 7) + 1}`,
};

const DISTRICTS = ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6"];

export function buildDevices(): Device[] {
  const out: Device[] = [];
  const rnd = mulberry32(20240817);
  const now = Date.now();

  const families: ServiceId[] = ["lighting", "water", "waste", "traffic"];
  const countBy: Record<ServiceId, number> = { lighting: 40, water: 24, waste: 36, traffic: 20 };

  for (const service of families) {
    const count = countBy[service];
    const positions = positionsFor(service);
    for (let i = 0; i < count; i++) {
      const idx = i + 1;
      const id =
        service === "lighting"
          ? `L-${100 + idx}`
          : service === "water"
            ? `W-${String(idx).padStart(2, "0")}`
            : service === "waste"
              ? `B-${200 + idx}`
              : `T-${String(idx).padStart(2, "0")}`;
      const esp = `ESP32-${service.toUpperCase().slice(0, 4)}-${String(idx).padStart(3, "0")}`;
      const type = DEVICE_TYPES[service][i % DEVICE_TYPES[service].length];
      const district = DISTRICTS[i % DISTRICTS.length];
      const point = positions[i] ?? { x: 100 + rnd() * 800, y: 100 + rnd() * 400 };

      let entityStatus: Device["entityStatus"] = "normal";
      let mode: Device["mode"] = service === "lighting" ? "NORMAL" : "ON";
      if (i === 3 && service === "lighting") entityStatus = "critical"; // L-104
      if (i === 26 && service === "lighting") entityStatus = "warning"; // L-127
      if (i === 2 && service === "water") entityStatus = "warning"; // W-03
      if (i === 17 && service === "waste") entityStatus = "critical"; // B-218
      if (i === 4 && service === "waste") entityStatus = "warning";
      if (i === 4 && service === "traffic") entityStatus = "warning"; // T-05
      if (i === 8 && service === "lighting") entityStatus = "offline"; // L-109
      if (i % 23 === 0 && entityStatus === "normal") entityStatus = "warning";
      if (entityStatus === "offline") mode = "FAILURE";

      const last = now - Math.floor(rnd() * 15_000) - (i % 7) * 1_200;

      out.push({
        id,
        name:
          service === "lighting"
            ? "Street Light"
            : service === "water"
              ? "Water Monitor"
              : service === "waste"
                ? "Smart Bin"
                : "Traffic Sensor",
        service,
        type,
        location:
          service === "traffic" && i === 4
            ? "Avenue Hassan II"
            : service === "traffic"
              ? "Avenue Hassan II / Boulevard Pasteur"
              : `${district} · ${point.x.toFixed(0)} ${point.y.toFixed(0)}`,
        zone: ZONE_NAMES[service](i),
        district,
        status: entityStatus === "offline" ? "offline" : "online",
        mode,
        entityStatus,
        firmware:
          service === "lighting"
            ? "v4.2.1"
            : service === "water"
              ? "v3.8.0"
              : service === "waste"
                ? "v2.9.4"
                : "v5.0.2",
        mqttTopic: `citypulse/${service}/${esp.toLowerCase()}/telemetry`,
        lastHeartbeat: last,
        lastTelemetryAt: last,
        point,
        signal: 62 + Math.floor(rnd() * 38),
        battery: service !== "lighting" ? 68 + Math.floor(rnd() * 32) : undefined,
        installedAt: `2023-Q${(i % 4) + 1}`,
        linkedInfra:
          service === "lighting"
            ? `Street light ${id}`
            : service === "water"
              ? `Water main WZ-${(i % 6) + 1}`
              : service === "waste"
                ? `Waste zone ${ZONE_NAMES.waste(i)}`
                : `Signalized junction J-${(i % 6) + 1}`,
      });
    }
  }

  // Override hero devices with precise spec values.
  const l104 = out.find((d) => d.id === "L-104")!;
  l104.mode = "FAILURE";
  l104.entityStatus = "critical";
  l104.point = { x: 300, y: 260 };
  l104.location = "District 4 · Rue Al Massira";
  l104.lastHeartbeat = now - 2_000;

  const w03 = out.find((d) => d.id === "W-03")!;
  w03.entityStatus = "warning";
  w03.point = { x: 530, y: 210 };
  w03.linkedInfra = "Water main WZ-2";

  const b218 = out.find((d) => d.id === "B-218")!;
  b218.entityStatus = "critical";
  b218.point = { x: 670, y: 430 };
  b218.linkedInfra = "Waste zone B4";

  return out;
}

export function baseTelemetry(service: ServiceId, i: number): Omit<TelemetrySample, "ts"> {
  const rnd = mulberry32(i * 331 + 13);
  if (service === "lighting") {
    return { lux: round(4 + rnd() * 14, 1), brightness: 100, presence: rnd() > 0.45 ? 1 : 0, power: 32 };
  }
  if (service === "water") {
    return { flow: round(8 + rnd() * 6, 1), pressure: round(3.2 + rnd() * 1.3, 2) };
  }
  if (service === "waste") {
    return { fillLevel: round(30 + rnd() * 58) };
  }
  return {
    vehicles: Math.floor(180 + rnd() * 320),
    density: round(28 + rnd() * 44),
    congestion: round(15 + rnd() * 45),
    travelTime: round(9 + rnd() * 9, 1),
  };
}

/** 120 samples per device (~20 minutes at 10s cadence). */
export function seedTelemetry(devices: Device[]): Record<string, TelemetrySample[]> {
  const history: Record<string, TelemetrySample[]> = {};
  const now = Date.now();
  devices.forEach((d, di) => {
    const arr: TelemetrySample[] = [];
    let prev = baseTelemetry(d.service, di);
    const rnd = mulberry32(di * 977 + 5);
    for (let s = 0; s < 120; s++) {
      const drift = rnd() - 0.5;
      const sample: TelemetrySample = { ts: now - (119 - s) * 10_000, ...prev };
      if (d.service === "lighting") {
        sample.lux = round(clamp((sample.lux ?? 8) + drift * 2 + (d.entityStatus === "critical" ? -6 : 0), 0.2, 22));
        sample.presence = rnd() > 0.55 ? 1 : 0;
        sample.power = d.mode === "OFF" ? 0.4 : 30 + Math.floor(rnd() * 3);
      } else if (d.service === "water") {
        sample.flow = round(clamp((sample.flow ?? 10) + drift * 0.9, 2, 21));
        sample.pressure = round(clamp((sample.pressure ?? 3.9) + drift * 0.12, 2.4, 5.6));
      } else if (d.service === "waste") {
        sample.fillLevel = round(clamp((sample.fillLevel ?? 55) + 0.05 + rnd() * 0.6, 2, 100));
      } else {
        sample.vehicles = Math.max(20, Math.floor((sample.vehicles ?? 300) + drift * 30));
        sample.density = round(clamp((sample.density ?? 50) + drift * 6, 5, 100));
        sample.congestion = round(clamp((sample.congestion ?? 30) + drift * 8, 2, 100));
        sample.travelTime = round(clamp((sample.travelTime ?? 12) + drift * 1.2, 4, 40));
      }
      arr.push(sample);
      prev = sample;
    }
    // Precision overrides for hero scenarios.
    if (d.id === "L-104") {
      arr.slice(-24).forEach((s) => (s.lux = round(clamp(4.2 + (rnd() - 0.5) * 0.9, 3.5, 5))));
    } else if (d.id === "B-218") {
      arr.slice(-30).forEach((s) => (s.fillLevel = round(clamp(87 + (rnd() - 0.5) * 2, 84, 90))));
    } else if (d.id === "W-03") {
      arr.slice(-36).forEach((s) => {
        s.pressure = round(clamp((s.pressure ?? 3.9) - 0.6, 2.6, 3.6));
        s.flow = round(clamp((s.flow ?? 10) - 3, 5, 12));
      });
    }
    history[d.id] = arr;
  });
  return history;
}