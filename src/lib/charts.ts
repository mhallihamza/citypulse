import type { TelemetrySample } from "@/lib/types";

export interface SeriesPoint {
  t: number;
  v: number;
}

export function toSeries(
  samples: TelemetrySample[] | undefined,
  key: keyof TelemetrySample,
  label = "v"
): { [label: string]: number; t: number }[] {
  if (!samples) return [];
  return samples.map((s) => {
    const value = s[key];
    return { t: s.ts, [label]: value == null ? 0 : Number(value) };
  });
}

export function aggregate(
  samples: TelemetrySample[] | undefined,
  key: keyof TelemetrySample
): number | null {
  if (!samples || !samples.length) return null;
  const values = samples.map((s) => Number(s[key])).filter((v) => !Number.isNaN(v));
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function lastValue(samples: TelemetrySample[] | undefined, key: keyof TelemetrySample): number | null {
  const last = samples?.slice(-1)[0];
  if (!last) return null;
  const v = Number(last[key]);
  return Number.isNaN(v) ? null : v;
}

/** Simple time bucket aggregation for the analytics page. */
export function bucketize(
  rows: { t: number; v: number }[],
  bucket: number
): { t: number; v: number }[] {
  if (!rows.length) return [];
  const map = new Map<number, { sum: number; n: number }>();
  for (const r of rows) {
    const b = Math.floor(r.t / bucket) * bucket;
    const cur = map.get(b) ?? { sum: 0, n: 0 };
    cur.sum += r.v;
    cur.n += 1;
    map.set(b, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, { sum, n }]) => ({ t, v: sum / n }));
}

export function sparkOf(samples: TelemetrySample[] | undefined, key: keyof TelemetrySample, n = 16): number[] {
  if (!samples || !samples.length) return [];
  const step = Math.max(1, Math.floor(samples.length / n));
  const picked: number[] = [];
  for (let i = samples.length - 1; i >= 0; i -= step) {
    const v = Number(samples[i][key]);
    if (!Number.isNaN(v)) picked.unshift(v);
    if (picked.length >= n) break;
  }
  return picked;
}

export function kpiTrend(spark: number[]): "up" | "down" | "flat" {
  if (spark.length < 2) return "flat";
  const first = spark[0];
  const last = spark[spark.length - 1];
  const delta = last - first;
  if (Math.abs(delta) < 1e-6) return "flat";
  return delta > 0 ? "up" : "down";
}