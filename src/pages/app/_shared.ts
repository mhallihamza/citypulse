import type { Device, ServiceId, TelemetrySample } from "@/lib/types";
import { round } from "@/lib/utils";
import { lastValue, sparkOf } from "@/lib/charts";

/** KPI snapshot for a service derived from live device/telemetry state. */
export function serviceStats(
  service: ServiceId,
  devices: Device[],
  telemetry: Record<string, TelemetrySample[]>
) {
  const fleet = devices.filter((d) => d.service === service);
  const total = fleet.length;
  const operational = fleet.filter((d) => d.entityStatus === "normal").length;
  const warning = fleet.filter((d) => d.entityStatus === "warning").length;
  const critical = fleet.filter((d) => d.entityStatus === "critical").length;
  const offline = fleet.filter((d) => d.entityStatus === "offline").length;
  const operationalPct = total ? round((operational / total) * 100, 1) : 0;

  const samples = fleet.flatMap((d) => telemetry[d.id] ?? []);
  const spark = (key: keyof TelemetrySample, n: number) =>
    fleet.length ? takeAvg(fleet, telemetry, key, n) : [];

  let energy: number;
  if (service === "lighting") energy = fleet.reduce((s, d) => s + (lastValue(telemetry[d.id], "power") ?? 0), 0);
  else energy = fleet.length * 0;
  void spark;

  return {
    fleet,
    total,
    operational,
    warning,
    critical,
    offline,
    operationalPct,
    energy,
    avgFill: fleet.length ? avgNum(fleet, telemetry, "fillLevel") : 0,
    avgFlow: fleet.length ? avgNum(fleet, telemetry, "flow") : 0,
    avgPressure: fleet.length ? avgNum(fleet, telemetry, "pressure") : 0,
    avgDensity: fleet.length ? avgNum(fleet, telemetry, "density") : 0,
    avgCongestion: fleet.length ? avgNum(fleet, telemetry, "congestion") : 0,
    totalVehicles: fleet.length ? Math.round(fleet.reduce((s, d) => s + (lastValue(telemetry[d.id], "vehicles") ?? 0), 0) * 24) : 0,
    spark,
  };
}

function takeAvg(fleet: Device[], telemetry: Record<string, TelemetrySample[]>, key: keyof TelemetrySample, n: number): number[] {
  const out: number[] = [];
  const nFleet = Math.min(fleet.length, 14);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let f = 0; f < nFleet; f++) {
      const arr = telemetry[fleet[f].id];
      const sample = arr && arr[arr.length - nFleet + Math.floor((i / n) * nFleet)];
      if (sample) {
        const v = Number(sample[key]);
        if (!Number.isNaN(v)) {
          sum += v;
          cnt++;
        }
      }
    }
    out.push(cnt ? sum / cnt : 0);
  }
  return out;
}

function avgNum(fleet: Device[], telemetry: Record<string, TelemetrySample[]>, key: keyof TelemetrySample): number {
  const vals = fleet.map((d) => lastValue(telemetry[d.id], key)).filter((v): v is number => v != null);
  if (!vals.length) return 0;
  return round(vals.reduce((a, b) => a + b, 0) / vals.length, 2);
}

export function utilizationSeries(spark: number[]): number[] {
  return spark.length ? spark : [90, 91, 92, 93, 92, 94, 95];
}

export function serviceSubtext(service: ServiceId): string {
  return {
    lighting: "Monitor and control smart street lighting infrastructure.",
    water: "Monitor water flow, pressure, leak events and consumption.",
    waste: "Bin fill-level monitoring and collection optimization.",
    traffic: "Vehicle density, congestion detection and travel-time analysis.",
  }[service];
}