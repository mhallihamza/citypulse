import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Modal";
import { CreateDeviceModal, MetricCell, OnlineBadge, ServiceStatePill, TelemetryChart } from "@/pages/app/services/shared";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TelemetrySample } from "@/lib/types";

/** Water device registry — backed by the shared `devices` table. */
export function WaterDevicesPage() {
  const { devices, waterStates, now } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const fleet = useMemo(() => devices.filter((d) => d.service === "water"), [devices]);
  const filtered = fleet.filter((d) => !query || `${d.deviceKey} ${d.displayName} ${d.type}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Water devices"
        subtitle="Registered flow / pressure / leak sensors — stored in Supabase, fed by the IoT pipeline."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add device
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by device ID, name or type…"
            className="h-9 flex-1 rounded-lg border border-ink-100 bg-ink-50 px-3 text-sm focus:border-pulse-300 focus:outline-none focus:ring-2 focus:ring-pulse-100"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Pressure</th>
                <th className="px-4 py-3 font-semibold">Drop %</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Last seen</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No devices registered yet."
                      message="Register a water controller to start receiving live data from the IoT pipeline."
                      action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add device</Button>}
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
              {filtered.map((d) => {
                const s = waterStates[d.id];
                return (
                  <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/app/water/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">{d.deviceKey}</Link>
                      <div className="truncate text-[11px] text-ink-400">{d.displayName}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">{d.type}</td>
                    <td className="px-4 py-3 text-xs text-ink-600">{d.locationLabel ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-700">{s?.pressure != null ? Number(s.pressure).toFixed(2) : "—"}</td>
                    <td className="px-4 py-3 tabular">{s?.pressureDropPercent != null ? <span className={Number(s.pressureDropPercent) > 0 ? "font-semibold text-red-600" : "text-live-600"}>{Number(s.pressureDropPercent).toFixed(2)}%</span> : "—"}</td>
                    <td className="px-4 py-3">{s ? <ServiceStatePill state={s.state} /> : "—"}</td>
                    <td className="px-4 py-3 text-xs tabular text-ink-500">{s?.lastSeen ? timeAgo(s.lastSeen, now) : "never"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/app/water/devices/${d.id}`}><Button variant="ghost" size="xs">Open</Button></Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <CreateDeviceModal open defaultService="water" allowedServices={["lighting", "water", "traffic"]} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Water point detail — identity, live state, telemetry history, events, tickets. */
export function WaterDeviceDetail() {
  const { deviceId = "" } = useParams();
  const { devices, waterStates, telemetry, events, tickets, now } = useApp();
  const device = devices.find((d) => d.id === deviceId && d.service === "water");
  const state = waterStates[deviceId];
  const samples: TelemetrySample[] = telemetry[deviceId] ?? [];
  const deviceEvents = events.filter((e) => e.deviceId === deviceId);
  const deviceTickets = tickets.filter((t) => t.deviceId === deviceId);

  if (!device) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Device not found</h2>
        <p className="mt-1 text-sm text-ink-500">No water device with this id exists in your organization.</p>
        <Link to="/app/water/devices" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to devices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/app/water/devices" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        ← Back to Water devices
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {device.deviceKey}
            <span className="ml-1 align-middle text-sm font-normal text-ink-400">{device.displayName}</span>
          </span>
        }
        subtitle={`WATER · ${device.type}${device.locationLabel ? ` · ${device.locationLabel}` : ""}`}
        actions={<OnlineBadge online={Boolean(state?.online)} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MetricCell label="Pressure" value={state?.pressure != null ? Number(state.pressure).toFixed(2) : "—"} />
        <MetricCell label="Reference" value={state?.referencePressure != null ? Number(state.referencePressure).toFixed(0) : "—"} />
        <MetricCell label="Pressure drop" value={state?.pressureDrop != null ? Number(state.pressureDrop).toFixed(2) : "—"} />
        <MetricCell label="Drop %" value={state?.pressureDropPercent != null ? `${Number(state.pressureDropPercent).toFixed(2)}%` : "—"} tone={state?.pressureDropPercent != null && Number(state.pressureDropPercent) > 0 ? "text-red-600" : undefined} />
        <MetricCell label="Sensor" value={state?.sensorStatus ?? "—"} />
        <MetricCell label="State" value={state ? <ServiceStatePill state={state.state} /> : "—"} />
        <MetricCell label="Last seen" value={<span className="text-sm">{state?.lastSeen ? timeAgo(state.lastSeen, now) : "never"}</span>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Telemetry history" subtitle="Real rows from water_telemetry" />
            <CardBody>
              {samples.length === 0 ? (
                <EmptyState title="No telemetry data available." message={`water_telemetry has no samples for ${device.deviceKey} yet. Values are never generated by the UI.`} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <TelemetryChart title="Pressure" color="#246BFF" field="pressure" samples={samples} fmt={(v) => v.toFixed(2)} />
                  <TelemetryChart title="Pressure drop" color="#8B5CF6" field="pressureDrop" samples={samples} fmt={(v) => v.toFixed(2)} />
                  <TelemetryChart title="Pressure drop %" color="#EF4444" field="pressureDropPercent" samples={samples} fmt={(v) => `${v.toFixed(2)}%`} />
                  <div className="col-span-full rounded-lg border border-ink-100 bg-ink-50/50 px-4 py-2.5 text-[12px] text-ink-600">
                    Readings showing a pressure drop:{" "}
                    <span className={cn("font-semibold tabular", samples.some((s) => Number(s.pressureDropPercent) > 0) ? "text-red-600" : "text-live-700")}>
                      {samples.filter((s) => Number(s.pressureDropPercent) > 0).length}
                    </span>{" "}
                    of {samples.length} samples · latest sample {timeAgo(samples[samples.length - 1].ts, now)}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Events · ${device.deviceKey}`} />
            <div className="divide-y divide-ink-50">
              {deviceEvents.length === 0 && <div className="px-5 py-10 text-center text-sm text-ink-400">No events detected.</div>}
              {deviceEvents.map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${e.severity === "critical" ? "bg-red-500" : e.severity === "warning" ? "bg-amber-500" : "bg-pulse-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-ink-800">{e.title}</div>
                    <div className="text-[11px] text-ink-400">{e.eventType}{e.previousState && e.currentState ? ` · ${e.previousState} → ${e.currentState}` : ""} · {timeAgo(e.createdAt, now)} · source: {e.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Device information" subtitle="From the devices registry" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Device ID" value={<span className="font-mono">{device.deviceKey}</span>} />
              <Row label="Name" value={device.displayName} />
              <Row label="Service" value="WATER" />
              <Row label="Type" value={device.type} />
              <Row label="Location" value={device.locationLabel ?? "—"} />
              <Row label="Zone" value={device.zone} />
              <Row label="MQTT topic" value={<span className="font-mono text-xs">{device.mqttTopic ?? "—"}</span>} />
              <Row label="Last seen" value={state?.lastSeen ? timeAgo(state.lastSeen, now) : "never"} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tickets" />
            <div className="divide-y divide-ink-50">
              {deviceTickets.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-400">No tickets for this device.</div>}
              {deviceTickets.map((t) => (
                <Link key={t.id} to={`/app/tickets/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-ink-50/60">
                  <span className="truncate text-[13px] font-medium text-ink-700">{t.ticketKey} · {t.title}</span>
                  <StatusBadge status={t.status === "resolved" ? "normal" : t.status === "in_progress" ? "warning" : "offline"} />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-ink-50 pb-2 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}