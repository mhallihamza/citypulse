import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Moon, Power, Sun, Ticket as TicketIcon, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChartTooltip } from "@/components/ui/ChartCard";
import { EmptyState } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { ModePill } from "@/pages/app/lighting/LightingPage";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { errMsg } from "@/lib/api";
import type { TicketPriority } from "@/lib/types";

function StatCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className={cn("mt-1 font-display text-lg font-bold text-ink-900", tone)}>{value}</div>
    </div>
  );
}

export function LightingDeviceDetail() {
  const { deviceId = "" } = useParams();
  const { devices, states, telemetry, events, tickets, commands, now, sendCommand, createTicket, toast } = useApp();
  const [tab, setTab] = useState("overview");
  const [brightness, setBrightness] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  const device = devices.find((d) => d.id === deviceId && d.service === "lighting");
  const state = device ? states[device.id] : undefined;
  const samples = useMemo(() => (device ? telemetry[device.id] ?? [] : []), [device, telemetry]);
  const deviceEvents = useMemo(() => events.filter((e) => e.deviceId === deviceId), [events, deviceId]);
  const deviceTickets = useMemo(() => tickets.filter((t) => t.deviceId === deviceId), [tickets, deviceId]);
  const deviceCommands = useMemo(() => commands.filter((c) => c.deviceId === deviceId), [commands, deviceId]);

  if (!device) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Device not found</h2>
        <p className="mt-1 text-sm text-ink-500">No lighting device with this id exists in your organization.</p>
        <Link to="/app/lighting/devices" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to devices</Button>
        </Link>
      </div>
    );
  }

  const status: "normal" | "warning" | "critical" | "offline" = state
    ? state.lampFailure
      ? "critical"
      : state.online
        ? "normal"
        : "offline"
    : device.status;

  const doCommand = async (command: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await sendCommand(device.id, command, payload);
    } catch (e) {
      toast({ title: "Command failed", message: errMsg(e), severity: "critical" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/app/lighting" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        <ArrowLeft className="h-4 w-4" /> Back to Lighting
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {device.deviceKey}
            <span className="ml-1 align-middle text-sm font-normal text-ink-400">{device.displayName}</span>
          </span>
        }
        subtitle={`LIGHTING · ${device.type} · ${device.zone}${device.locationLabel ? ` · ${device.locationLabel}` : ""}`}
        actions={
          <>
            <StatusBadge status={status} />
            <Button variant="outline" size="sm" onClick={() => setShowTicket((v) => !v)}>
              <TicketIcon className="h-4 w-4" /> Create ticket
            </Button>
          </>
        }
      />

      {/* Live state grid — real lighting_states values */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCell label="Online" value={state ? (state.online ? "Yes" : "No") : "Unknown"} tone={state?.online ? "text-live-600" : "text-ink-500"} />
        <StatCell label="Mode" value={<ModePill mode={state?.mode ?? device.mode} />} />
        <StatCell label="Brightness" value={state ? `${state.brightness}%` : "—"} />
        <StatCell label="Lux" value={state?.lux != null ? `${Number(state.lux).toFixed(1)} lx` : "—"} />
        <StatCell label="Last seen" value={<span className="text-sm tabular">{state?.lastSeen ? timeAgo(state.lastSeen, now) : "never"}</span>} />
        <StatCell label="Presence" value={state ? (state.presence ? "Detected" : "None") : "—"} />
        <StatCell
          label="Night"
          value={
            state ? (
              <span className="flex items-center gap-1.5">
                {state.night ? <Moon className="h-4 w-4 text-pulse-500" /> : <Sun className="h-4 w-4 text-amber-500" />}
                {state.night ? "Yes" : "No"}
              </span>
            ) : (
              "—"
            )
          }
        />
        <StatCell label="Lamp" value={state?.lampFailure ? "FAILURE" : "OK"} tone={state?.lampFailure ? "text-red-600" : "text-live-600"} />
        <StatCell label="Firmware" value={<span className="text-sm font-mono">{device.firmware}</span>} />
        <StatCell label="MQTT topic" value={<span className="block truncate font-mono text-xs">{device.mqttTopic ?? "—"}</span>} />
      </div>

      {/* Command bar — writes real device_commands rows */}
      <Card className="mt-5">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Commands · {device.deviceKey}</div>
            <p className="mt-1 max-w-sm text-[11px] leading-snug text-ink-400">
              Commands are stored in <span className="font-semibold">device_commands</span> with status{" "}
              <Badge tone="warning">PENDING</Badge> until Fusion AI confirms delivery. The UI never fakes a result.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button variant="dark" size="sm" disabled={busy} onClick={() => void doCommand("OFF")}>
              <Power className="h-3.5 w-3.5" /> Turn OFF
            </Button>
            <Button variant="success" size="sm" disabled={busy} onClick={() => void doCommand("NORMAL")}>
              Set NORMAL
            </Button>
            <div className="flex items-center gap-1.5">
              <Input
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                placeholder="Brightness %"
                inputMode="numeric"
                className="!h-[34px] w-32 !py-1.5"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !brightness.trim()}
                onClick={() => {
                  const v = Math.max(0, Math.min(100, Number(brightness)));
                  if (Number.isNaN(v)) return;
                  void doCommand("SET_BRIGHTNESS", { brightness: v });
                  setBrightness("");
                }}
              >
                <Zap className="h-3.5 w-3.5" /> Set brightness
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Create ticket inline */}
      {showTicket && (
        <CreateTicketInline
          deviceKey={device.deviceKey}
          onCancel={() => setShowTicket(false)}
          onCreate={async (title, priority, description) => {
            await createTicket({ title, service: "lighting", priority, deviceId: device.id, description });
            setShowTicket(false);
          }}
        />
      )}

      <div className="mt-6">
        <Tabs
          items={[
            { id: "overview", label: "Overview" },
            { id: "telemetry", label: "Telemetry", count: samples.length },
            { id: "events", label: "Events", count: deviceEvents.length },
            { id: "commands", label: "Commands", count: deviceCommands.length },
            { id: "tickets", label: "Tickets", count: deviceTickets.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Device information" subtitle="From the devices registry" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Device ID" value={<span className="font-mono">{device.deviceKey}</span>} />
              <Row label="Name" value={device.displayName} />
              <Row label="Service" value="LIGHTING" />
              <Row label="Type" value={device.type} />
              <Row label="Location" value={device.locationLabel ?? "—"} />
              <Row label="Zone" value={device.zone} />
              <Row
                label="Coordinates"
                value={
                  device.latitude != null && device.longitude != null ? (
                    <span className="tabular">{Number(device.latitude).toFixed(5)}, {Number(device.longitude).toFixed(5)}</span>
                  ) : (
                    "Not set"
                  )
                }
              />
              <Row label="Firmware" value={<span className="font-mono text-xs">{device.firmware}</span>} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Latest telemetry" subtitle="Most recent sample in device_telemetry" />
            <CardBody className="grid grid-cols-2 gap-3">
              {samples.length === 0 ? (
                <div className="col-span-2">
                  <EmptyState title="No telemetry data available." message="Samples appear here once the device reports to the IoT pipeline." />
                </div>
              ) : (
                <>
                  <MiniTelemetry label="Lux" value={lastNum(samples, "lux", 1)} unit="lx" />
                  <MiniTelemetry label="Brightness" value={lastNum(samples, "brightness", 0)} unit="%" />
                  <MiniTelemetry label="Presence" value={samples.slice(-1)[0]?.presence ? "Detected" : "None"} unit="" />
                  <MiniTelemetry label="Power" value={lastNum(samples, "power", 1)} unit="W" />
                  <div className="col-span-2 mt-1 text-[11px] text-ink-400 tabular">Sample time {timeAgo(samples.slice(-1)[0].ts, now)}</div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "telemetry" && (
        <div className="mt-4">
          {samples.length === 0 ? (
            <Card>
              <EmptyState
                title="No telemetry data available."
                message={`device_telemetry has no samples for ${device.deviceKey} yet. Values are never generated by the UI.`}
                className="py-14"
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <DeviceChart title="Lux" color="#F59E0B" samples={samples} field="lux" fmt={(v) => `${v.toFixed(1)} lx`} />
              <DeviceChart title="Brightness" color="#246BFF" samples={samples} field="brightness" fmt={(v) => `${Math.round(v)}%`} />
              <DeviceChart title="Presence" color="#10B981" samples={samples} field="presence" fmt={(v) => (v > 0.5 ? "Detected" : "None")} />
              <DeviceChart title="Power" color="#8B5CF6" samples={samples} field="power" fmt={(v) => `${Math.round(v)} W`} />
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <Card className="mt-4 overflow-hidden">
          <CardHeader title={`Events · ${device.deviceKey}`} />
          <div className="divide-y divide-ink-50">
            {deviceEvents.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-400">No events detected.</div>}
            {deviceEvents.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                <SeverityBadge severity={e.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink-800">{e.title}</div>
                  <div className="text-[11px] text-ink-400">
                    {e.eventType} · {timeAgo(e.createdAt, now)} · source: {e.source}
                  </div>
                  {e.detail && <p className="mt-1 text-xs leading-relaxed text-ink-500">{e.detail}</p>}
                </div>
                <Badge tone={e.status === "resolved" ? "success" : e.status === "acknowledged" ? "warning" : "info"}>{e.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "commands" && (
        <Card className="mt-4 overflow-hidden">
          <CardHeader title={`Commands · ${device.deviceKey}`} subtitle="Real rows from device_commands — status updates via Supabase Realtime" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                  <th className="px-5 py-2.5 font-semibold">Command</th>
                  <th className="px-4 py-2.5 font-semibold">Payload</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Requested by</th>
                  <th className="px-4 py-2.5 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {deviceCommands.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-ink-400">No commands sent yet.</td></tr>
                )}
                {deviceCommands.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 font-mono font-semibold text-ink-800">{c.command}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{JSON.stringify(c.payload)}</td>
                    <td className="px-4 py-3"><CommandStatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-ink-600">{c.requestedByName ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(c.requestedAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "tickets" && (
        <Card className="mt-4 overflow-hidden">
          <CardHeader title={`Tickets · ${device.deviceKey}`} />
          <div className="divide-y divide-ink-50">
            {deviceTickets.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-400">No tickets for this device.</div>}
            {deviceTickets.map((t) => (
              <Link key={t.id} to={`/app/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/60">
                <SeverityBadge severity={t.priority === "critical" ? "critical" : t.priority === "low" ? "info" : "warning"} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink-800">{t.title}</div>
                  <div className="text-[11px] text-ink-400">{t.ticketKey} · updated {timeAgo(t.updatedAt, now)}</div>
                </div>
                <Badge tone={t.status === "resolved" ? "success" : t.status === "in_progress" ? "warning" : "info"}>{t.status.replace("_", " ")}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-50 pb-2 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}

function MiniTelemetry({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{label}</div>
      <div className="mt-0.5 font-display text-lg font-bold tabular text-ink-900">
        {value} <span className="text-xs font-semibold text-ink-400">{unit}</span>
      </div>
    </div>
  );
}

function lastNum(samples: { ts: number; lux?: number; brightness?: number; presence?: number; power?: number }[], key: "lux" | "brightness" | "presence" | "power", digits = 1): string {
  const last = samples.slice(-1)[0];
  const v = last ? Number(last[key]) : NaN;
  return Number.isNaN(v) ? "—" : v.toFixed(digits);
}

function DeviceChart({
  title,
  color,
  samples,
  field,
  fmt,
}: {
  title: string;
  color: string;
  samples: { ts: number; lux?: number; brightness?: number; presence?: number; power?: number }[];
  field: "lux" | "brightness" | "presence" | "power";
  fmt: (v: number) => string;
}) {
  const data = samples.map((s) => ({
    t: new Date(s.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    v: s[field] == null ? 0 : Math.round(Number(s[field]) * 100) / 100,
  }));
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink-900">{title}</h3>
        <span className="text-[11px] text-ink-400 tabular">{samples.length} real samples</span>
      </div>
      <div className="h-[200px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={`g-${field}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
            <XAxis dataKey="t" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <RTooltip content={<ChartTooltip formatter={fmt} />} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g-${field})`} name={title} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function CommandStatusBadge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED"
      ? "bg-live-50 text-live-700 border-live-200"
      : status === "FAILED"
        ? "bg-red-50 text-red-700 border-red-200"
        : status === "CANCELLED"
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-amber-50 text-amber-700 border-amber-200";
  return <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold", tone)}>{status}</span>;
}

function CreateTicketInline({
  deviceKey,
  onCancel,
  onCreate,
}: {
  deviceKey: string;
  onCancel: () => void;
  onCreate: (title: string, priority: TicketPriority, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(`Inspect ${deviceKey}`);
  const [priority, setPriority] = useState<TicketPriority>("high");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <Card className="mt-5 border-pulse-200">
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ticket title" />
          </Field>
          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the field team check?" />
          </Field>
        </div>
        {error && <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button
            loading={saving}
            onClick={async () => {
              if (!title.trim()) {
                setError("A title is required.");
                return;
              }
              setSaving(true);
              try {
                await onCreate(title.trim(), priority, description.trim());
              } catch (e) {
                setError(errMsg(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            Create ticket
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}