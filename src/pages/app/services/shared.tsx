import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Cpu } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { ChartTooltip } from "@/components/ui/ChartCard";
import { errMsg } from "@/lib/api";
import type { ServiceId, TelemetrySample } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the multi-service dashboards (Traffic / Water).
 * Everything renders REAL database values only — no simulated data.
 */

export function OnlineBadge({ online }: { online: boolean | undefined }) {
  const tone = online
    ? "bg-live-50 text-live-700 border-live-200"
    : "bg-slate-100 text-slate-600 border-slate-200";
  const dot = online ? "bg-live-500" : "bg-slate-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold", tone)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {online ? "ONLINE" : "OFFLINE"}
    </span>
  );
}

/** Colored pill for a free-text service state (CLEAR / CONGESTED / LEAK …). */
export function ServiceStatePill({ state }: { state: string }) {
  const s = String(state).toUpperCase();
  const tone =
    ["CONGESTED", "LEAK", "INCIDENT"].includes(s)
      ? "bg-red-50 text-red-700 border-red-200"
      : ["MODERATE", "LOW_PRESSURE", "WARNING"].includes(s)
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : ["CLEAR", "NORMAL", "OK"].includes(s)
          ? "bg-live-50 text-live-700 border-live-200"
          : "bg-ink-100 text-ink-600 border-ink-200";
  return <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold", tone)}>{s}</span>;
}

export function MetricCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className={cn("mt-1 font-display text-lg font-bold tabular text-ink-900", tone)}>{value}</div>
    </div>
  );
}

/** Historical telemetry chart built ONLY from real device_telemetry samples. */
export function TelemetryChart({
  title,
  color,
  samples,
  field,
  fmt,
}: {
  title: string;
  color: string;
  samples: TelemetrySample[];
  field: keyof TelemetrySample;
  fmt?: (v: number) => string;
}) {
  const data = useMemo(
    () =>
      samples
        .filter((s) => Number.isFinite(Number(s[field])))
        .map((s) => ({ t: new Date(s.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), v: Number(s[field]) })),
    [samples, field]
  );
  if (data.length === 0) return null;
  const gradId = `g-${String(field)}-${title.replace(/\W/g, "")}`;
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink-800">{title}</span>
        <span className="text-[11px] tabular text-ink-400">{data.length} samples</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <RTooltip content={<ChartTooltip formatter={(v: number) => (fmt ? fmt(v) : String(v))} />} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} name={title} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const SERVICE_TYPE_OPTIONS: Record<ServiceId, string[]> = {
  lighting: ["ESP32_LIGHTING_CONTROLLER", "STREET_LIGHT_CONTROLLER", "FEEDER_PANEL", "PHOTOCELL_SENSOR"],
  traffic: ["TRAFFIC_SEGMENT_CONTROLLER", "IR_SENSOR_PAIR", "TRAFFIC_CAMERA_NODE"],
  water: ["WATER_FLOW_CONTROLLER", "PRESSURE_SENSOR", "LEAK_DETECTOR"],
  waste: ["WASTE_SMART_BIN", "FILL_LEVEL_SENSOR"],
};

/**
 * Multi-service device registration. The user picks Lighting / Water / Traffic /
 * Waste; the form adapts its type options to the chosen service. Creating a
 * writes one row into public.devices (org_id from the session) — the browser
 * NEVER opens an MQTT connection; Fusion AI / IoT infra connects the hardware.
 */
export function CreateDeviceModal({
  open,
  defaultService,
  allowedServices,
  onClose,
}: {
  open: boolean;
  defaultService: ServiceId;
  allowedServices: ServiceId[];
  onClose: () => void;
}) {
  const { createDevice } = useApp();
  const [service, setService] = useState<ServiceId>(defaultService);
  const [form, setForm] = useState({ deviceKey: "", displayName: "", type: "", zone: "", locationLabel: "", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.deviceKey.trim()) {
      setError("A device ID is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createDevice({
        deviceKey: form.deviceKey,
        displayName: form.displayName,
        type: form.type || SERVICE_TYPE_OPTIONS[service][0],
        zone: form.zone,
        locationLabel: form.locationLabel,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        service,
      });
      setForm({ deviceKey: "", displayName: "", type: "", zone: "", locationLabel: "", latitude: "", longitude: "" });
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-pulse-600" /> Register device
        </span>
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-device-form" loading={saving}>Register device</Button>
        </>
      }
    >
      <form id="create-device-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Service" className="sm:col-span-1">
          <Select value={service} onChange={(e) => { setService(e.target.value as typeof service); setForm((f) => ({ ...f, type: "" })); }}>
            {allowedServices.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </Select>
        </Field>
        <Field label="Device ID" hint="Unique per organization, e.g. T-001 / W-101" className="sm:col-span-1">
          <Input value={form.deviceKey} onChange={set("deviceKey")} placeholder={service === "traffic" ? "T-001" : service === "waste" ? "SmartBin01" : "W-101"} />
        </Field>
        <Field label="Name" className="sm:col-span-1">
          <Input value={form.displayName} onChange={set("displayName")} placeholder="Segment Av. Mohammed V" />
        </Field>
        <Field label="Device type" className="sm:col-span-1">
          <Select value={form.type} onChange={set("type")}>
            {SERVICE_TYPE_OPTIONS[service].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Location" hint="Street / landmark label" className="sm:col-span-2">
          <Input value={form.locationLabel} onChange={set("locationLabel")} placeholder="Rue Al Massira" />
        </Field>
        <Field label="Zone">
          <Input value={form.zone} onChange={set("zone")} placeholder="Zone T1" />
        </Field>
        <Field label="Latitude" hint="Optional — enables map placement">
          <Input value={form.latitude} onChange={set("latitude")} placeholder="33.5731" inputMode="decimal" />
        </Field>
        <Field label="Longitude" hint="Optional — enables map placement">
          <Input value={form.longitude} onChange={set("longitude")} placeholder="-7.5898" inputMode="decimal" />
        </Field>

        <div className="sm:col-span-2 rounded-lg border border-pulse-100 bg-pulse-50 p-3 text-xs leading-relaxed text-pulse-800">
          Registering creates the device in Supabase with a PENDING {service} state row.
          It does not open an MQTT connection from the browser — Fusion AI / the IoT
          infrastructure connects the physical device.
        </div>

        {error && (
          <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>
        )}
      </form>
    </Modal>
  );
}