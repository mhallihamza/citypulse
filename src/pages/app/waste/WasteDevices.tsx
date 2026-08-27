import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Modal";
import { CreateDeviceModal, MetricCell, OnlineBadge, ServiceStatePill, TelemetryChart } from "@/pages/app/services/shared";
import { timeAgo } from "@/lib/format";
import type { TelemetrySample } from "@/lib/types";

/** Waste device registry — backed by the shared `devices` table. */
export function WasteDevicesPage() {
  const { devices, wasteStates, now } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const fleet = useMemo(() => devices.filter((d) => d.service === "waste"), [devices]);
  const filtered = fleet.filter((d) => !query || `${d.deviceKey} ${d.displayName} ${d.type}`.toLowerCase().includes(query.toLowerCase()));
return (
    <div>
      <PageHeader
        title="Waste devices"
        subtitle="Registered smart bins — stored in Supabase, fed by the IoT pipeline."
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
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Fill level</th>
                <th className="px-4 py-3 font-semibold">Status</th>
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
                      message="Register a smart bin to start receiving live fill-level data from the IoT pipeline."
                      action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add device</Button>}
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
              {filtered.map((d) => {
                const s = wasteStates[d.id];
                return (
                  <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/app/waste/devices/${d.id}`} className="font-mono text-[13px] font-semibold text-pulse-600 hover:underline">{d.deviceKey}</Link>
                      <div className="truncate text-[11px] text-ink-400">{d.displayName}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-600">{d.type}</td>
                    <td className="px-4 py-3 text-xs text-ink-500">{d.locationLabel ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-700">
                      {s?.level != null ? (
                        <span className={Number(s.level) >= 85 ? "font-semibold text-red-600" : Number(s.level) >= 60 ? "font-semibold text-amber-600" : "text-live-600"}>
                          {Math.round(Number(s.level))}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">{s ? <ServiceStatePill state={s.status} /> : "—"}</td>
                    <td className="px-4 py-3 text-xs tabular text-ink-500">{s?.lastSeen ? timeAgo(s.lastSeen, now) : "never"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/app/waste/devices/${d.id}`} className="text-xs font-semibold text-pulse-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <CreateDeviceModal open defaultService="waste" allowedServices={["lighting", "water", "traffic", "waste"]} onClose={() => setOpen(false)} />}
    </div>
  );
}
/** Smart Bin detail — identity, live state, telemetry history, events, tickets. */
export function WasteDeviceDetail() {
  const { deviceId = "" } = useParams();
  const { devices, wasteStates, telemetry, events, tickets, now } = useApp();
  const device = devices.find((d) => d.id === deviceId && d.service === "waste");
  const state = wasteStates[deviceId];
  const samples: TelemetrySample[] = telemetry[deviceId] ?? [];
  const deviceEvents = events.filter((e) => e.deviceId === deviceId);
  const deviceTickets = tickets.filter((t) => t.deviceId === deviceId);

  if (!device) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-semibold text-ink-800">Device not found</h2>
        <p className="mt-1 text-sm text-ink-500">No waste device with this id exists in your organization.</p>
        <Link to="/app/waste/devices" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Back to devices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/app/waste/devices" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-pulse-600">
        ← Back to Waste devices
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {device.deviceKey}
            <span className="ml-1 align-middle text-sm font-normal text-ink-400">{device.displayName}</span>
          </span>
        }
        subtitle={`WASTE · ${device.type}${device.locationLabel ? ` · ${device.locationLabel}` : ""}`}
        actions={<OnlineBadge online={Boolean(state?.online)} />}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCell label="Fill level" value={state?.level != null ? `${Math.round(Number(state.level))}%` : "—"} />
        <MetricCell label="Temperature" value={state?.temperature != null ? `${Number(state.temperature).toFixed(1)} °C` : "—"} />
        <MetricCell label="Humidity" value={state?.humidity != null ? `${Math.round(Number(state.humidity))}%` : "—"} />
        <MetricCell label="Status" value={state ? <ServiceStatePill state={state.status} /> : "—"} />
        <MetricCell label="Hand detected" value={state ? (state.handDetected ? "Yes" : "No") : "—"} />
        <MetricCell label="Last seen" value={<span className="text-sm">{state?.lastSeen ? timeAgo(state.lastSeen, now) : "never"}</span>} />
      </div>
<div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Telemetry history" subtitle="Real rows from waste_telemetry" />
            <CardBody>
              {samples.length === 0 ? (
                <EmptyState title="No telemetry data available." message={`waste_telemetry has no samples for ${device.deviceKey} yet. Values are never generated by the UI.`} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <TelemetryChart title="Fill level %" color="#10B981" field="fillLevel" samples={samples} fmt={(v) => `${v.toFixed(0)}%`} />
                  <TelemetryChart title="Temperature (°C)" color="#F59E0B" field="temperature" samples={samples} fmt={(v) => `${v.toFixed(1)} °C`} />
                  <TelemetryChart title="Humidity %" color="#246BFF" field="humidity" samples={samples} fmt={(v) => `${v.toFixed(0)}%`} />
                  <div className="col-span-full text-[11px] text-ink-400 tabular">Latest sample {samples.length ? timeAgo(samples[samples.length - 1].ts, now) : ""}</div>
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
            <CardHeader title={`Tickets · ${device.deviceKey}`} />
            <div className="divide-y divide-ink-50">
              {deviceTickets.length === 0 && <div className="px-5 py-10 text-center text-sm text-ink-400">No tickets for this device.</div>}
              {deviceTickets.map((t) => (
                <Link key={t.id} to={`/app/tickets/${t.id}`} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/60">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink-800">{t.title}</div>
                    <div className="text-[11px] text-ink-400">{t.ticketKey} · {t.status} · {timeAgo(t.createdAt, now)}</div>
                  </div>
                  <span className="text-xs font-semibold text-pulse-600">Open →</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardBody>
              <div className="text-xs leading-relaxed text-ink-400">
                Smart bin data arrives on <span className="font-mono">citypulse/waste/telemetry</span> as fill level, temperature,
                humidity and status, flows through Fusion AI, and is stored in <span className="font-mono">waste_telemetry</span> with
                the current reading in <span className="font-mono">waste_states</span>.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}