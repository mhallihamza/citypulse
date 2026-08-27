import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, MapPinOff, X } from "lucide-react";
import type { CityEvent, Device, LightingState, ServiceId, TelemetrySample, Ticket, TrafficState, WasteState, WaterState } from "@/lib/types";
import { ENTITY_STATUS_COLOR } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SERVICE_CONFIG } from "@/lib/services";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export type MapServiceFilter = ServiceId | "all" | "incidents";

export interface CityMapLayers {
  devices: boolean;
  infrastructure: boolean;
  events: boolean;
  tickets: boolean;
}

/**
 * CITYPULSE operations map.
 * Markers are placed ONLY from real device coordinates (locations.latitude /
 * longitude). Devices without coordinates are never invented or approximated:
 * if nothing has coordinates the map renders an explicit empty state.
 */

const CITYPULSE_HUD_LEGEND = [
  { key: "normal", color: "#10b981" },
  { key: "warning", color: "#f59e0b" },
  { key: "critical", color: "#ef4444" },
  { key: "offline", color: "#9ca3af" },
];

const RIVER = "M-20 470 C 180 400, 340 470, 640 420 S 820 260, 1020 330 L 1020 700 L -20,700 Z";

const ROADS: { d: string; w: number }[] = [
  { d: "M0 150 H1000", w: 5 },
  { d: "M0 300 H1000", w: 8 },
  { d: "M0 450 H1000", w: 6 },
  { d: "M0 560 H1000", w: 4 },
  { d: "M150 0 V640", w: 5 },
  { d: "M320 0 V640", w: 8 },
  { d: "M480 0 V640", w: 4 },
  { d: "M640 0 V640", w: 5 },
  { d: "M810 0 V640", w: 7 },
];

const ZONES = [
  "M150 0 H320 V150 H150 Z",
  "M320 150 H480 V300 H320 Z",
  "M480 300 H640 V450 H480 Z",
  "M640 450 H810 V560 H640 Z",
  "M810 150 H1000 V300 H810 Z",
  "M150 450 H320 V560 H150 Z",
];

function Infrastructure({ dark }: { dark: boolean }) {
  const roadC = dark ? "rgba(148,163,184,0.22)" : "rgba(23,37,84,0.18)";
  return (
    <g>
      <path d={RIVER} fill={dark ? "rgba(36,107,255,0.16)" : "rgba(36,107,255,0.12)"} />
      <path
        d="M-20 470 C 180 400, 340 470, 640 420 S 980 280, 1020 330"
        fill="none"
        stroke={dark ? "rgba(128,170,255,0.5)" : "rgba(36,107,255,0.45)"}
        strokeWidth={3}
        strokeDasharray="16 12"
        strokeLinecap="round"
        opacity={0.85}
      />
      {ZONES.map((z, i) => (
        <path key={i} d={z} fill={dark ? "rgba(36,107,255,0.05)" : "rgba(36,107,255,0.04)"} stroke={dark ? "rgba(148,163,184,0.10)" : "rgba(23,37,84,0.08)"} strokeWidth={1} />
      ))}
      {ROADS.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke={roadC} strokeWidth={r.w} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Project real lat/lng into the 1000x640 blueprint space (min-max normalize). */
function projectDevices(devices: Device[]): Map<string, { x: number; y: number }> {
  const pts = devices.filter((d) => d.latitude != null && d.longitude != null);
  const out = new Map<string, { x: number; y: number }>();
  if (!pts.length) return out;
  const lats = pts.map((d) => d.latitude!);
  const lngs = pts.map((d) => d.longitude!);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 1e-6);
  const spanLng = Math.max(maxLng - minLng, 1e-6);
  const PAD = 90;

  // First pass — base projection (north up, min-max normalized to the canvas).
  const base = pts.map((d) => {
    const nx = (d.longitude! - minLng) / spanLng; // 0..1
    const ny = (d.latitude! - minLat) / spanLat; // 0..1
    return { id: d.id, x: PAD + nx * (1000 - PAD * 2), y: 60 + (1 - ny) * (600 - 120) };
  });

  // Second pass — devices landing on the SAME spot (shared site, or every
  // device holding one coordinate) are spread on a small deterministic ring so
  // each marker stays individually visible and clickable. Ordering by device
  // id keeps positions stable between renders.
  const groups = new Map<string, { id: string; x: number; y: number }[]>();
  for (const p of base) {
    const key = `${Math.round(p.x)}:${Math.round(p.y)}`;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    if (arr.length === 1) {
      out.set(arr[0].id, { x: arr[0].x, y: arr[0].y });
      continue;
    }
    const sorted = [...arr].sort((a, b) => a.id.localeCompare(b.id));
    const radius = 16 + Math.min(sorted.length, 6) * 2;
    sorted.forEach((p, i) => {
      const angle = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
      out.set(p.id, {
        x: Math.min(980, Math.max(20, p.x + Math.cos(angle) * radius)),
        y: Math.min(620, Math.max(20, p.y + Math.sin(angle) * radius)),
      });
    });
  }
  return out;
}

function stateMeta(
  device: Device,
  states: Record<string, LightingState> | undefined,
  trafficStates: Record<string, TrafficState> | undefined,
  waterStates: Record<string, WaterState> | undefined,
  wasteStates: Record<string, WasteState> | undefined,
  telemetry: Record<string, TelemetrySample[]> | undefined
): { label: string; value: string }[] {
  const s = states?.[device.id];
  const tS = trafficStates?.[device.id];
  const wS = waterStates?.[device.id];
  const bS = wasteStates?.[device.id];
  const last = telemetry?.[device.id]?.slice(-1)[0];
  if (device.service === "lighting") {
    return [
      { label: "Online", value: s ? (s.online ? "Yes" : "No") : device.online ? "Yes" : "Unknown" },
      { label: "Mode", value: s?.mode ?? device.mode },
      { label: "Brightness", value: s ? `${s.brightness}%` : last?.brightness != null ? `${Math.round(last.brightness)}%` : "—" },
      { label: "Lux", value: s?.lux != null ? `${Number(s.lux).toFixed(1)} lx` : last?.lux != null ? `${Number(last.lux).toFixed(1)} lx` : "—" },
      { label: "Presence", value: s ? (s.presence ? "Detected" : "None") : "—" },
      { label: "Lamp", value: s?.lampFailure ? "FAILURE" : "OK" },
    ];
  }
  if (device.service === "traffic") {
    return [
      { label: "Online", value: tS ? (tS.online ? "Yes" : "No") : device.online ? "Yes" : "Unknown" },
      { label: "State", value: tS?.state ?? device.status.toUpperCase() },
      { label: "Vehicles", value: last?.vehicleCount != null ? String(last.vehicleCount) : tS?.vehicleCount != null ? String(tS.vehicleCount) : "—" },
      { label: "Overdue", value: last?.overdueVehicles != null ? String(last.overdueVehicles) : tS?.overdueVehicles != null ? String(tS.overdueVehicles) : "—" },
      { label: "Density", value: last?.density != null ? Number(last.density).toFixed(1) : tS?.density != null ? Number(tS.density).toFixed(1) : "—" },
      { label: "T-max", value: last?.tmax != null ? `${Number(last.tmax).toFixed(0)}s` : tS?.tmax != null ? `${Number(tS.tmax).toFixed(0)}s` : "—" },
    ];
  }
  if (device.service === "water") {
    return [
      { label: "Online", value: wS ? (wS.online ? "Yes" : "No") : device.online ? "Yes" : "Unknown" },
      { label: "State", value: wS?.state ?? last?.state ?? device.status.toUpperCase() },
      { label: "Sensor", value: wS?.sensorStatus ?? last?.sensorStatus ?? "—" },
      { label: "Pressure", value: wS?.pressure != null ? `${Number(wS.pressure).toFixed(2)}` : last?.pressure != null ? Number(last.pressure).toFixed(2) : "—" },
      { label: "Ref pressure", value: wS?.referencePressure != null ? `${Number(wS.referencePressure).toFixed(0)}` : last?.referencePressure != null ? Number(last.referencePressure).toFixed(0) : "—" },
      { label: "Drop %", value: wS?.pressureDropPercent != null ? `${Number(wS.pressureDropPercent).toFixed(2)}%` : last?.pressureDropPercent != null ? `${Number(last.pressureDropPercent).toFixed(2)}%` : "—" },
    ];
  }
  if (device.service === "waste") {
    return [
      { label: "Online", value: bS ? (bS.online ? "Yes" : "No") : device.online ? "Yes" : "Unknown" },
      { label: "Fill level", value: bS?.level != null ? `${Math.round(bS.level)}%` : last?.fillLevel != null ? `${Math.round(last.fillLevel)}%` : "-" },
      { label: "Temperature", value: bS?.temperature != null ? `${Number(bS.temperature).toFixed(1)} C` : "-" },
      { label: "Humidity", value: bS?.humidity != null ? `${Math.round(bS.humidity)}%` : "-" },
      { label: "Status", value: bS?.status ?? device.status.toUpperCase() },
      { label: "Hand detected", value: bS ? (bS.handDetected ? "Yes" : "No") : "-" },
    ];
  }
  return [{ label: "Status", value: device.status.toUpperCase() }];
}

interface CityMapProps {
  devices: Device[];
  events?: CityEvent[];
  tickets?: Ticket[];
  states?: Record<string, LightingState>;
  trafficStates?: Record<string, TrafficState>;
  waterStates?: Record<string, WaterState>;
  wasteStates?: Record<string, WasteState>;
  telemetry?: Record<string, TelemetrySample[]>;
  serviceFilter?: MapServiceFilter;
  layers?: CityMapLayers;
  dark?: boolean;
  interactive?: boolean;
  hud?: boolean;
  highlightDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
  noActions?: boolean;
  className?: string;
}

export function CityMap({
  devices,
  events = [],
  tickets = [],
  states,
  trafficStates,
  waterStates,
  wasteStates,
  telemetry,
  serviceFilter = "all",
  layers = { devices: true, infrastructure: true, events: true, tickets: true },
  dark = false,
  interactive = false,
  hud = false,
  highlightDeviceId,
  onSelectDevice,
  noActions = false,
  className,
}: CityMapProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(highlightDeviceId ?? null);
  const [timeRange, setTimeRange] = useState<"Live" | "24h" | "7d">("Live");

  const visibleDevices = useMemo(() => {
    return devices.filter((d) => {
      if (serviceFilter === "all") return d.latitude != null && d.longitude != null;
      if (serviceFilter === "incidents")
        return d.status !== "normal" && d.latitude != null && d.longitude != null;
      return d.service === serviceFilter && d.latitude != null && d.longitude != null;
    });
  }, [devices, serviceFilter]);

  const projected = useMemo(() => projectDevices(visibleDevices), [visibleDevices]);
  const selectedDevice = visibleDevices.find((d) => d.id === selected) ?? null;
  const incident = selectedDevice ? events.find((e) => e.deviceId === selectedDevice.id && e.status !== "resolved") : undefined;

  // Devices WITHOUT real coordinates — never invented, but never silently hidden.
  const unpositioned = useMemo(() => {
    return devices.filter((d) => {
      if (serviceFilter === "incidents") return d.status !== "normal" && (d.latitude == null || d.longitude == null);
      if (serviceFilter !== "all" && d.service !== serviceFilter) return false;
      return d.latitude == null || d.longitude == null;
    });
  }, [devices, serviceFilter]);
  const [showMissing, setShowMissing] = useState(false);

  const select = (id: string) => {
    setSelected(id);
    onSelectDevice?.(id);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-xl border", dark ? "map-canvas border-ink-800" : "map-canvas-light border-ink-100", className)}>
      <svg viewBox="0 0 1000 640" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {layers.infrastructure && <Infrastructure dark={dark} />}

        {/* Device markers — placed ONLY from real coordinates */}
        {layers.devices &&
          visibleDevices.map((dev) => {
            const pt = projected.get(dev.id);
            if (!pt) return null;
            const c = ENTITY_STATUS_COLOR[dev.status];
            const isSel = selected === dev.id;
            const r = dev.status === "critical" ? 10 : dev.status === "warning" ? 9 : 8;
            const Icon = SERVICE_CONFIG[dev.service].icon;
            const glyph = dark ? "#0b1322" : "#fff";
            return (
              <g key={dev.id} transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer" onClick={() => (interactive ? select(dev.id) : undefined)}>
                {(dev.status === "critical" || dev.status === "warning") && (
                  <circle r={r + 4} fill="none" stroke={c} strokeWidth={1.5} opacity={0.5}>
                    <animate attributeName="r" values={`${r};${r + 9}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={r} fill={c} stroke={dark ? "#0b1322" : "#fff"} strokeWidth={2.5} />
                <g transform={`translate(${-7}, ${-7})`}>
                  <Icon size={14} strokeWidth={2.2} style={{ color: glyph }} />
                </g>
                <circle cx={r - 2} cy={-(r - 2)} r={3.5} fill={c} stroke={dark ? "#0b1322" : "#fff"} strokeWidth={1.5} />
                {isSel && <circle r={r + 6} fill="none" stroke="#246BFF" strokeWidth={2} />}
              </g>
            );
          })}

        {/* Event pins (unresolved events only) */}
        {layers.events &&
          events
            .filter((e) => e.deviceId && e.status !== "resolved" && projected.has(e.deviceId))
            .slice(0, 40)
            .map((e) => {
              const pt = projected.get(e.deviceId!)!;
              const c = e.severity === "critical" ? "#ef4444" : e.severity === "warning" ? "#f59e0b" : "#246bff";
              return (
                <g key={`ev-${e.id}`} transform={`translate(${pt.x}, ${pt.y - 16})`} className="cursor-pointer" onClick={() => (interactive ? select(e.deviceId!) : undefined)}>
                  <path d="M0,0 L-6,-10 a6,6 0 1 1 12,0 Z" fill={c} />
                  <circle cx={0} cy={-12.5} r={1.8} fill={dark ? "#0b1322" : "#fff"} />
                </g>
              );
            })}

        {/* Ticket pins (open work orders) */}
        {layers.tickets &&
          tickets
            .filter((t) => t.deviceId && t.status !== "resolved" && projected.has(t.deviceId))
            .slice(0, 30)
            .map((t) => {
              const pt = projected.get(t.deviceId!)!;
              const c = t.priority === "critical" || t.priority === "high" ? "#ef4444" : "#f59e0b";
              return (
                <g key={`tk-${t.id}`} transform={`translate(${pt.x + 10}, ${pt.y - 12})`} className="cursor-pointer" onClick={() => navigate(`/app/tickets/${t.id}`)}>
                  <rect x={-6} y={-6} width={12} height={12} rx={3} fill={c} />
                  <rect x={-3} y={-3} width={6} height={6} rx={1.5} fill={dark ? "#0b1322" : "#fff"} opacity={0.92} />
                </g>
              );
            })}
      </svg>

      {/* Empty state — never invent markers */}
      {projected.size === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-ink-950/55 text-center backdrop-blur-[2px]">
          <MapPinOff className="h-7 w-7 text-white/70" />
          <div className="text-sm font-semibold text-white">No device locations available.</div>
          <p className="max-w-xs px-6 text-xs leading-relaxed text-white/60">
            Devices appear here once they are registered with real coordinates
            (locations latitude / longitude). No positions are simulated.
          </p>
        </div>
      )}

      {/* Device popup */}
      {selectedDevice && interactive && (
        <div className="absolute bottom-4 left-4 z-20 w-[280px] rounded-xl border border-ink-700 bg-ink-900/95 p-4 text-white shadow-pop backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-base font-bold leading-tight">{selectedDevice.deviceKey}</div>
              <div className="truncate text-xs text-ink-300">{selectedDevice.displayName}</div>
              {selectedDevice.locationLabel && <div className="mt-0.5 truncate text-[11px] text-ink-400">{selectedDevice.locationLabel}</div>}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={selectedDevice.status} />
              <button className="ml-1 rounded-md p-1 text-ink-400 hover:bg-white/10 hover:text-white" onClick={() => setSelected(null)} aria-label="Close popup">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {stateMeta(selectedDevice, states, trafficStates, waterStates, wasteStates, telemetry).map((m) => (
              <div key={m.label}>
                <div className="text-[10px] uppercase tracking-wide text-ink-400">{m.label}</div>
                <div className="tabular font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
          {incident && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-red-300">Open incident</div>
              <div className="mt-0.5 text-[13px] font-semibold text-white">{incident.title}</div>
              {incident.detail && <div className="mt-0.5 text-[11px] leading-snug text-ink-300">{incident.detail}</div>}
              <div className="mt-1 text-[10px] text-ink-400">{incident.eventType} · {timeAgo(incident.createdAt)}</div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <span className="text-[10px] text-ink-400">
              Last seen {selectedDevice.lastHeartbeat ? timeAgo(selectedDevice.lastHeartbeat) : "never"}
            </span>
            {!noActions && (
              <Button
                size="xs"
                variant="primary"
                onClick={() =>
                  onSelectDevice
                    ? onSelectDevice(selectedDevice.id)
                    : incident
                      ? navigate(`/app/${selectedDevice.service}/events`)
                      : navigate(`/app/${selectedDevice.service}/devices/${selectedDevice.id}`)
                }
              >
                {incident ? "View incident" : "View device"} <ArrowUpRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Map control bar (HUD) — shown on the overview dashboard */}
      {hud && (
        <div
          className={cn(
            "pointer-events-auto absolute left-1/2 top-3 z-20 flex max-w-[94%] -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold",
            dark ? "bg-ink-950/75 text-white/80 backdrop-blur" : "bg-white/90 text-ink-600 shadow-sm backdrop-blur"
          )}
        >
          <div className={cn("flex items-center rounded-md p-0.5", dark ? "bg-white/10" : "bg-ink-100")}>
            {(["Live", "24h", "7d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "rounded px-2.5 py-1 transition-colors",
                  timeRange === t ? (dark ? "bg-white/20 text-white" : "bg-white text-ink-900 shadow-sm") : "hover:opacity-80"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <span className={cn("h-4 w-px", dark ? "bg-white/20" : "bg-ink-200")} />
          <button className="hover:opacity-80">Filters</button>
          <button className="hover:opacity-80">Layers</button>
          <span className={cn("h-4 w-px", dark ? "bg-white/20" : "bg-ink-200")} />
          <div className="flex items-center gap-2">
            {CITYPULSE_HUD_LEGEND.map((l) => (
              <span key={l.key} className="inline-flex items-center gap-1 uppercase">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} /> {l.key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {!hud && (
      <div
        className={cn(
          "pointer-events-none absolute right-3 top-3 hidden items-center gap-3 rounded-lg px-3 py-2 sm:flex",
          dark ? "bg-ink-950/70 text-white/80 backdrop-blur" : "bg-white/85 text-ink-600 shadow-sm backdrop-blur"
        )}
      >
        {(["normal", "warning", "critical", "offline"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full" style={{ background: ENTITY_STATUS_COLOR[s] }} />
            {s}
          </span>
        ))}
      </div>
      )}

      {/* Unpositioned devices — real devices lacking coordinates. Listed, never faked. */}
      {unpositioned.length > 0 && (
        <div className="absolute bottom-3 right-3 z-20 flex max-w-[250px] flex-col items-end gap-1.5">
          {showMissing && (
            <div
              className={cn(
                "w-full rounded-lg border p-2.5 shadow-sm",
                dark ? "border-white/10 bg-ink-900/95 text-white" : "border-ink-100 bg-white/95 text-ink-700"
              )}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">Missing coordinates</div>
              <div className="mt-1 max-h-44 space-y-0.5 overflow-y-auto">
                {unpositioned.map((d) => {
                  const Ic = SERVICE_CONFIG[d.service].icon;
                  return (
                    <Link
                      key={d.id}
                      to={`/app/${d.service}/devices/${d.id}`}
                      className={cn("flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] font-semibold", dark ? "hover:bg-white/10" : "hover:bg-ink-50")}
                    >
                      <Ic className="h-3 w-3 shrink-0" style={{ color: SERVICE_CONFIG[d.service].color }} />
                      <span className="truncate">{d.deviceKey}</span>
                      <span className="ml-auto text-[9px] uppercase opacity-50">{d.service}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[10px] leading-snug opacity-60">
                Add a location with latitude / longitude to place these devices on the map. Positions are never simulated.
              </div>
            </div>
          )}
          <button
            onClick={() => setShowMissing((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur transition-colors",
              dark ? "border-white/15 bg-ink-950/70 text-white/80 hover:bg-ink-950/90" : "border-ink-200 bg-white/90 text-ink-600 shadow-sm hover:bg-white"
            )}
          >
            <MapPinOff className="h-3 w-3" />
            {unpositioned.length} without coordinates
          </button>
        </div>
      )}
    </div>
  );
}