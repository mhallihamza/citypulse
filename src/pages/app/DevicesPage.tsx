import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { timeAgo } from "@/lib/format";
import type { ServiceId } from "@/lib/types";

export function DevicesPage() {
  const { data, now } = useApp();
  const [service, setService] = useState<"all" | ServiceId>("all");
  const [query, setQuery] = useState("");

  const devices = data.devices.filter((d) => {
    if (service !== "all" && d.service !== service) return false;
    if (query && !(d.id.toLowerCase().includes(query.toLowerCase()) || d.type.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Devices"
        subtitle="IoT device registry, connection state and firmware across every service."
        live
        actions={<Badge tone="success" dot>{data.devices.filter((d) => d.status === "online").length} online</Badge>}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by device ID or type…"
            className="h-9 flex-1 rounded-lg border border-ink-100 bg-ink-50 px-3 text-sm focus:border-pulse-300 focus:outline-none focus:ring-2 focus:ring-pulse-100"
          />
          <Select value={service} onChange={(e) => setService(e.target.value as any)} className="!w-auto sm:w-44">
            <option value="all">All services</option>
            <option value="lighting">Lighting</option>
            <option value="water">Water</option>
            <option value="waste">Waste</option>
            <option value="traffic">Traffic</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last seen</th>
                <th className="px-4 py-3 font-semibold">Firmware</th>
                <th className="px-4 py-3 text-right font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {devices.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                  <td className="px-5 py-3">
                    <Link to={`/app/${d.service}/${d.id}`} className="font-mono font-semibold text-pulse-600 hover:underline">{d.id}</Link>
                    <div className="text-[11px] text-ink-400">{d.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <ServiceIconBadge service={d.service} size="sm" /> {d.service[0].toUpperCase() + d.service.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{d.type}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-ink-500">{d.location}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.entityStatus} />
                    <span className="ml-1 text-[10px] text-ink-400">{d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-500 tabular">{timeAgo(d.lastTelemetryAt, now)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-500">{d.firmware}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/${d.service}/${d.id}`} className="text-pulse-600 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}