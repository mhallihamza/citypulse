import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { ArrowLeft, Wifi, Signal, Activity, ListChecks, Ticket as TicketIcon, Power, Sun, Droplets, Trash2, Car } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChartCard, ChartTooltip } from "@/components/ui/ChartCard";
import { Modal } from "@/components/ui/Modal";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { toSeries } from "@/lib/charts";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className={cn("mt-1 font-display text-lg font-bold text-ink-900", tone)}>{value}</div>
    </div>
  );
}

export function DeviceDetail() {
  const { deviceId = "", service = "" } = useParams();
  const { data, toggleDeviceMode, createTicketFromEvent } = useApp();
  const device = data.devices.find((d) => d.id === deviceId);
  const [expand, setExpand] = useState(false);

  if (!device) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Device not found</h2>
        <p className="mt-1 text-sm text-ink-500">{deviceId} is not registered in this workspace.</p>
        <Link to="/app/devices" className="mt-4 inline-block"><Button variant="outline" size="sm">Back to devices</Button></Link>
      </div>
    );
  }

  const samples = data.telemetry[device.id] ?? [];
  const last = samples.slice(-1)[0];
  const eventsFor = data.events.filter((e) => e.deviceId === device.id).slice(0, 6);
  const serviceLabel = SERVICE_LABEL[device.service];

  const statusTone = device.entityStatus;
  const meta = deviceMetaFor(device.service, last);

  const chartDefs = chartDefsFor(device.service);

  return (
    <div>
      <Link to={`/app/${device.service}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        <ArrowLeft className="h-4 w-4" /> Back to {serviceLabel}
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ServiceIconBadge service={device.service} size="md" />
            <span>
              {device.id}
              <span className="ml-3 align-middle text-sm font-normal text-ink-400">{device.name}</span>
            </span>
          </span>
        }
        subtitle={`${serviceLabel} · ${device.type} · ${device.zone}`}
        live
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setExpand(true)}>
              <TicketIcon className="h-4 w-4" /> Create Ticket
            </Button>
          </>
        }
      />

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCell label="Status" value={device.entityStatus.toUpperCase()} tone={toneText(device.entityStatus)} />
        <StatCell label="Connection" value={device.status.toUpperCase()} tone={device.status === "online" ? "text-live-600" : "text-slate-500"} />
        <StatCell label="Mode" value={device.mode} />
        <StatCell label="Last update" value={<span className="text-sm">{timeAgo(device.lastTelemetryAt)}</span>} />
        <StatCell label="MQTT" value={<span className="text-sm text-live-600">subscribed</span>} />
      </div>

      {/* Meta + telemetry grid */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.9fr]">
        <Card>
          <CardHeader title="Live telemetry" subtitle="Latest values from the device" />
          <CardBody className="space-y-3">
            {meta.map((m) => (
              <div key={m.label} className="flex items-center justify-between border-b border-ink-50 pb-2 last:border-0">
                <span className="text-sm text-ink-500">{m.label}</span>
                <span className="tabular font-semibold text-ink-900">{m.value}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Device connection</div>
              <div className="mt-2 space-y-2 text-sm">
                <MetaRow icon={<Wifi className="h-4 w-4 text-live-600" />} label="MQTT status" value={device.status === "online" ? "CONNECTED" : "DISCONNECTED"} tone="text-live-600" />
                <MetaRow icon={<Signal className="h-4 w-4 text-pulse-600" />} label="Signal quality" value={`${Math.round(device.signal)}%`} />
                <MetaRow icon={<Activity className="h-4 w-4 text-ink-400" />} label="Last heartbeat" value={timeAgo(device.lastHeartbeat)} />
                <MetaRow icon={<Activity className="h-4 w-4 text-ink-400" />} label="Last telemetry" value={timeAgo(device.lastTelemetryAt)} />
              </div>
            </div>
            {device.battery != null && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Firmware</div>
                <div className="mt-1 text-sm font-medium text-ink-800">{device.firmware} · battery {device.battery}%</div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {chartDefs.slice(0, 2).map((c) => (
              <ChartCard key={c.key} title={c.title} subtitle={`${serviceLabel} telemetry`} height={170}>
                <DeviceTelemetryChart keyName={c.key} color={c.color} sample={toSeries(samples, c.key as any)} fmt={c.fmt} />
              </ChartCard>
            ))}
          </div>
          {chartDefs.slice(2).map((c) => (
              <ChartCard key={c.key} title={c.title} subtitle={`${serviceLabel} telemetry`} height={170}>
                <DeviceTelemetryChart keyName={c.key} color={c.color} sample={toSeries(samples, c.key as any)} fmt={c.fmt} />
              </ChartCard>
            ))}

          <Card>
            <CardHeader title="Event timeline" subtitle="Events recorded for this device" action={<Link to="/app/events"><Button variant="ghost" size="xs">All events</Button></Link>} />
            <div className="max-h-64 space-y-0 overflow-y-auto px-5 py-2">
              {eventsFor.length === 0 && <div className="py-8 text-center text-sm text-ink-400">No events for this device.</div>}
              {eventsFor.map((e, i) => (
                <div key={e.id} className="relative flex gap-3 border-l border-ink-100 pb-4 pl-4 last:pb-2" style={{ marginTop: i === 0 ? 0 : undefined }}>
                  <span className={cn("absolute -left-[5px] top-1 h-2 w-2 rounded-full", e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500")} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-ink-800">{e.title}</span>
                      <SeverityBadge severity={e.severity} />
                    </div>
                    <div className="text-[11px] text-ink-400 tabular">{timeAgo(e.createdAt)} · {e.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Commands" subtitle="Send control commands over MQTT" />
          <CardBody className="space-y-3">
            {deviceCommands(device.service).map((mode) => {
              const active = device.mode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => toggleDeviceMode(device.id, mode as any)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-pulse-400 bg-pulse-50 text-pulse-700"
                      : "border-ink-200 text-ink-600 hover:border-pulse-300 hover:text-pulse-600"
                  )}
                >
                  <span className="flex items-center gap-2"><Power className="h-4 w-4" /> {mode}</span>
                  {active && <Badge tone="info">Active</Badge>}
                </button>
              );
            })}
            <p className="pt-1 text-[11px] text-ink-400">
              Commands are delivered over MQTT topic <span className="font-mono">{device.mqttTopic}</span>
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="AI analysis" subtitle="Model output for this device" />
          <CardBody>
            {device.entityStatus === "critical" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="font-bold">Lighting output below expected levels.</div>
                <p className="mt-1 text-[13px]">
                  Lux {last?.lux != null ? last.lux.toFixed(1) : "4.2"} lx vs. expected ≥12 lx while
                  brightness is commanded at 100%. Likely LED driver fault or fixture damage.
                </p>
                <div className="mt-2 text-[11px] font-semibold text-amber-700">Confidence: 94%</div>
              </div>
            ) : (
              <div className="rounded-lg border border-live-100 bg-live-50 p-3 text-sm text-live-700">
                No anomalies detected. Telemetry within expected baseline.
              </div>
            )}
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Related</div>
              <div className="mt-1 text-[13px] text-ink-600">Infrastructure: {device.linkedInfra}</div>
              <div className="text-[13px] text-ink-600">Firmware: {device.firmware}</div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-ink-950 !border-ink-800">
          <CardBody className="text-white">
            <div className="text-[11px] font-bold uppercase tracking-widest text-pulse-300">Recommended action</div>
            <p className="mt-2 text-sm text-ink-200">
              {device.entityStatus === "critical"
                ? "Dispatch a field operator to inspect this device on site."
                : "No action required. Device is operating within normal parameters."}
            </p>
            <Button
              size="sm"
              className="mt-4 w-full"
              onClick={() => (eventsFor[0] ? createTicketFromEvent(eventsFor[0]) : setExpand(true))}
            >
              <TicketIcon className="h-4 w-4" /> Create Ticket
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Create Ticket modal */}
      <Modal
        open={expand}
        onClose={() => setExpand(false)}
        title={`Create ticket for ${device.id}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setExpand(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const ev = eventsFor[0] ?? {
                  id: `EV-${Date.now()}`,
                  service: device.service,
                  deviceId: device.id,
                  title: `Issue on ${device.id}`,
                  severity: device.entityStatus === "critical" ? ("critical" as const) : ("warning" as const),
                  status: "new" as const,
                  detail: `Manual ticket created for ${device.id} (${device.name}).`,
                  createdAt: Date.now(),
                  source: "operator" as const,
                };
                createTicketFromEvent(ev);
                setExpand(false);
              }}
            >
              Create ticket
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-ink-600">
            A ticket will be created and linked to <span className="font-semibold text-ink-900">{device.id}</span> —
            {device.name} ({device.type}).
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ===HELPERS===
function MetaRow({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-500">{icon} {label}</span>
      <span className={cn("tabular font-semibold text-ink-900", tone)}>{value}</span>
    </div>
  );
}

const SERVICE_LABEL: Record<string, string> = {
  lighting: "Lighting",
  water: "Water",
  waste: "Waste",
  traffic: "Traffic",
};

function toneText(s: string): string {
  if (s === "critical") return "text-red-600";
  if (s === "warning") return "text-amber-600";
  if (s === "normal") return "text-live-600";
  return "text-slate-500";
}

function deviceMetaFor(service: string, last: any): { label: string; value: string }[] {
  if (service === "lighting") {
    return [
      { label: "Lux", value: `${(last?.lux ?? 4.2).toFixed(1)} lx` },
      { label: "Presence", value: last?.presence ? "Detected" : "None" },
      { label: "Night", value: "YES" },
      { label: "Brightness", value: `${last?.brightness ?? 100}%` },
      { label: "Energy", value: `${last?.power ?? 32} W` },
    ];
  }
  if (service === "water") {
    return [
      { label: "Flow", value: `${(last?.flow ?? 10).toFixed(1)} L/min` },
      { label: "Pressure", value: `${(last?.pressure ?? 3.9).toFixed(2)} bar` },
      { label: "Zone", value: "W2" },
    ];
  }
  if (service === "waste") {
    return [{ label: "Fill level", value: `${last?.fillLevel ?? 62}%` }];
  }
  return [
    { label: "Density", value: `${last?.density ?? 50}%` },
    { label: "Congestion", value: `${last?.congestion ?? 30}%` },
    { label: "Travel time", value: `${(last?.travelTime ?? 12).toFixed(1)} min` },
  ];
}

function chartDefsFor(service: string): { key: string; title: string; color: string; fmt: (v: number) => string }[] {
  if (service === "lighting") {
    return [
      { key: "lux", title: "Lux", color: "#F59E0B", fmt: (v) => `${v.toFixed(1)} lx` },
      { key: "brightness", title: "Brightness", color: "#246BFF", fmt: (v) => `${Math.round(v)}%` },
      { key: "power", title: "Energy", color: "#8B5CF6", fmt: (v) => `${Math.round(v)} W` },
      { key: "presence", title: "Presence", color: "#10B981", fmt: (v) => (v > 0.5 ? "Detected" : "None") },
    ];
  }
  if (service === "water") {
    return [
      { key: "flow", title: "Flow", color: "#246BFF", fmt: (v) => `${v.toFixed(1)} L/min` },
      { key: "pressure", title: "Pressure", color: "#0B5FE8", fmt: (v) => `${v.toFixed(2)} bar` },
    ];
  }
  if (service === "waste") {
    return [{ key: "fillLevel", title: "Fill level", color: "#10B981", fmt: (v) => `${Math.round(v)}%` }];
  }
  return [
    { key: "density", title: "Density", color: "#8B5CF6", fmt: (v) => `${Math.round(v)}%` },
    { key: "congestion", title: "Congestion", color: "#F59E0B", fmt: (v) => `${Math.round(v)}%` },
    { key: "travelTime", title: "Travel time", color: "#246BFF", fmt: (v) => `${v.toFixed(1)} min` },
  ];
}

function deviceCommands(service: string): string[] {
  if (service === "lighting") return ["NORMAL", "OFF"];
  if (service === "water") return ["NORMAL", "ISOLATE"];
  if (service === "waste") return ["NORMAL", "COLLECT_NOW"];
  return ["NORMAL", "BRIGHTEN"];
}

function DeviceTelemetryChart({ keyName, color, sample, fmt, h = 180 }: { keyName: string; color: string; sample: { t: number; [k: string]: number }[]; fmt: (v: number) => string; h?: number }) {
  const data = sample.map((p) => ({ t: new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), v: Math.round((p[keyName] ?? 0) * 100) / 100 }));
  return (
    <ResponsiveContainer width="100%" height={h}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={`d-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
        <RTooltip content={<ChartTooltip formatter={fmt} />} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#d-${color.replace("#", "")})`} name={keyName} />
      </AreaChart>
    </ResponsiveContainer>
  );
}