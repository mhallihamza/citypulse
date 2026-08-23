import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { Modal, EmptyState } from "@/components/ui/Modal";
import { errMsg } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/**
 * Lighting device registry — backed by the `devices` table.
 * Creating a device REGISTERS it in Supabase (it does NOT open any
 * connection from the browser; MQTT stays with Fusion AI / IoT infra).
 */
export function LightingDevicesPage() {
  const { devices, states, now, createDevice } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [open, setOpen] = useState(false);

  const fleet = useMemo(
    () =>
      devices.filter((d) => {
        if (d.service !== "lighting") return false;
        if (statusFilter === "online" && !states[d.id]?.online) return false;
        if (statusFilter === "offline" && states[d.id]?.online !== false) return false;
        if (query && !(`${d.deviceKey} ${d.displayName} ${d.type}`.toLowerCase().includes(query.toLowerCase()))) return false;
        return true;
      }),
    [devices, states, query, statusFilter]
  );

  const onlineCount = devices.filter((d) => d.service === "lighting" && states[d.id]?.online).length;

  return (
    <div>
      <PageHeader
        title="Lighting devices"
        subtitle="Registered street light controllers — stored in Supabase, fed by the IoT pipeline."
        actions={
          <>
            <Badge tone={onlineCount > 0 ? "success" : "neutral"} dot>{onlineCount} online</Badge>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add device
            </Button>
          </>
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
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="!w-auto sm:w-40">
            <option value="all">All statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-[11px] uppercase tracking-widest text-ink-400">
                <th className="px-5 py-3 font-semibold">Device ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last seen</th>
                <th className="px-4 py-3 font-semibold">Firmware</th>
                <th className="px-4 py-3 text-right font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {fleet.map((d) => {
                const s = states[d.id];
                return (
                  <tr key={d.id} className="transition-colors hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/app/lighting/devices/${d.id}`} className="font-mono font-semibold text-pulse-600 hover:underline">{d.deviceKey}</Link>
                      <div className="text-[11px] text-ink-400">{d.displayName}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{d.type}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-ink-500">{d.locationLabel ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-500">{d.zone}</td>
                    <td className="px-4 py-3"><StatusBadge status={s ? (s.lampFailure ? "critical" : s.online ? "normal" : "offline") : d.status} /></td>
                    <td className="px-4 py-3 text-ink-500 tabular">{s?.lastSeen ? timeAgo(s.lastSeen, now) : d.lastHeartbeat ? timeAgo(d.lastHeartbeat, now) : "never"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{d.firmware}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/app/lighting/devices/${d.id}`} className="text-pulse-600 hover:underline">Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {fleet.length === 0 && (
          <EmptyState
            title="No lighting devices registered yet."
            message="Register your first controller — e.g. Device ID L-104 — to bring it into CityPulse operations."
            action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add device</Button>}
            className="py-14"
          />
        )}
      </Card>

      <CreateDeviceModal open={open} onClose={() => setOpen(false)} onCreate={createDevice} />
    </div>
  );
}

function CreateDeviceModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { deviceKey: string; displayName: string; type: string; zone: string; locationLabel: string; latitude?: number | null; longitude?: number | null }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    deviceKey: "",
    displayName: "",
    type: "ESP32_LIGHTING_CONTROLLER",
    zone: "",
    locationLabel: "",
    latitude: "",
    longitude: "",
    firmware: "v1.0.0",
    mqttClientId: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.deviceKey.trim()) {
      setError("Device ID is required (for example L-104).");
      return;
    }
    const lat = form.latitude.trim() === "" ? null : Number(form.latitude);
    const lng = form.longitude.trim() === "" ? null : Number(form.longitude);
    if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) {
      setError("Latitude and longitude must be numbers.");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        deviceKey: form.deviceKey,
        displayName: form.displayName,
        type: form.type,
        zone: form.zone,
        locationLabel: form.locationLabel,
        latitude: lat,
        longitude: lng,
      });
      setForm({ deviceKey: "", displayName: "", type: "ESP32_LIGHTING_CONTROLLER", zone: "", locationLabel: "", latitude: "", longitude: "", firmware: "v1.0.0", mqttClientId: "" });
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
          <Cpu className="h-4 w-4 text-pulse-600" /> Register lighting device
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
        <Field label="Device ID" hint="Unique per organization, e.g. L-104" className="sm:col-span-1">
          <Input value={form.deviceKey} onChange={set("deviceKey")} placeholder="L-104" />
        </Field>
        <Field label="Name" className="sm:col-span-1">
          <Input value={form.displayName} onChange={set("displayName")} placeholder="Street Lamp L-104" />
        </Field>
        <Field label="Service" className="sm:col-span-1">
          <Select value="lighting" disabled>
            <option value="lighting">LIGHTING</option>
          </Select>
        </Field>
        <Field label="Device type" className="sm:col-span-1">
          <Select value={form.type} onChange={set("type")}>
            <option value="ESP32_LIGHTING_CONTROLLER">ESP32_LIGHTING_CONTROLLER</option>
            <option value="STREET_LIGHT_CONTROLLER">STREET_LIGHT_CONTROLLER</option>
            <option value="FEEDER_PANEL">FEEDER_PANEL</option>
            <option value="PHOTOCELL_SENSOR">PHOTOCELL_SENSOR</option>
          </Select>
        </Field>
        <Field label="Location" hint="Street / landmark label" className="sm:col-span-2">
          <Input value={form.locationLabel} onChange={set("locationLabel")} placeholder="Rue Al Massira" />
        </Field>
        <Field label="Zone">
          <Input value={form.zone} onChange={set("zone")} placeholder="Zone L1" />
        </Field>
        <Field label="Firmware version">
          <Input value={form.firmware} onChange={set("firmware")} placeholder="v1.0.0" />
        </Field>
        <Field label="Latitude" hint="Optional — enables map placement">
          <Input value={form.latitude} onChange={set("latitude")} placeholder="33.5731" inputMode="decimal" />
        </Field>
        <Field label="Longitude" hint="Optional — enables map placement">
          <Input value={form.longitude} onChange={set("longitude")} placeholder="-7.5898" inputMode="decimal" />
        </Field>
        <Field label="MQTT client ID" hint="Used by the IoT pipeline, not by this browser" className="sm:col-span-2">
          <Input value={form.mqttClientId} onChange={set("mqttClientId")} placeholder="ESP32-LIGHT-L104" />
        </Field>

        <div className="sm:col-span-2 rounded-lg border border-pulse-100 bg-pulse-50 p-3 text-xs leading-relaxed text-pulse-800">
          Registering creates the device in Supabase with a PENDING lighting state.
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