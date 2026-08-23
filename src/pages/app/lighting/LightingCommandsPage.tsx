import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Card, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Modal";
import { CommandStatusBadge } from "@/pages/app/lighting/LightingDeviceDetail";
import { timeAgo } from "@/lib/format";

/**
 * Lighting command log — real rows from device_commands.
 * The frontend never publishes MQTT directly: it only creates rows here and
 * reflects the status the database reports back (PENDING → DELIVERED / FAILED).
 */
export function LightingCommandsPage() {
  const { commands, devices, now } = useApp();
  const [deviceFilter, setDeviceFilter] = useState("all");

  const fleet = devices.filter((d) => d.service === "lighting");
  const filtered = useMemo(
    () => (deviceFilter === "all" ? commands : commands.filter((c) => c.deviceId === deviceFilter)),
    [commands, deviceFilter]
  );

  const pending = commands.filter((c) => c.status === "PENDING").length;
  const delivered = commands.filter((c) => c.status === "DELIVERED").length;

  return (
    <div>
      <PageHeader
        title="Lighting · Commands"
        subtitle="Every operator command is persisted in Supabase and delivered to devices by Fusion AI over MQTT."
        actions={
          <>
            <Badge tone={pending > 0 ? "warning" : "neutral"} dot>{pending} pending</Badge>
            <Badge tone="success" dot>{delivered} delivered</Badge>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center gap-3 p-4">
          <Select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)} className="!w-auto sm:w-56">
            <option value="all">All devices</option>
            {fleet.map((d) => (
              <option key={d.id} value={d.id}>{d.deviceKey}</option>
            ))}
          </Select>
          <p className="hidden text-xs text-ink-400 sm:block">
            React → Supabase insert → Database webhook → Fusion AI → MQTT → ESP32.
          </p>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Command</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Payload</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Requested by</th>
                <th className="px-4 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-mono font-semibold text-ink-800">{c.command}</td>
                  <td className="px-4 py-3">
                    {devices.find((d) => d.id === c.deviceId) ? (
                      <Link to={`/app/lighting/devices/${c.deviceId}`} className="font-mono text-pulse-600 hover:underline">{c.deviceKey || "—"}</Link>
                    ) : (
                      <span className="text-ink-400">{c.deviceKey || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{JSON.stringify(c.payload)}</td>
                  <td className="px-4 py-3"><CommandStatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-ink-600">{c.requestedByName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(c.requestedAt, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <EmptyState
            title="No commands yet."
            message="Use Turn OFF / Set NORMAL on a device page — each action creates a real device_commands row."
            className="py-14"
          />
        )}
      </Card>
    </div>
  );
}