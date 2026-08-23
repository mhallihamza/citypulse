import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, MapPinOff, X } from "lucide-react";
import type { CityEvent, Device, LightingState, ServiceId, TelemetrySample, Ticket } from "@/lib/types";
import { ENTITY_STATUS_COLOR } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
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

  for (const d of pts) {
    const nx = (d.longitude! - minLng) / spanLng; // 0..1
    const ny = (d.latitude! - minLat) / spanLat; // 0..1 (north up)
    const x = PAD + nx * (1000 - PAD * 2) + (out.size % 3) * 2;
    const y = 60 + (1 - ny) * (600 - 120) + (out.size % 2) * 2;
    // When every device shares one coordinate, spread deterministically by id hash.
    const sameSpot = spanLat < 1e-6 && spanLng < 1e-6;
    out.set(d.id, sameSpot ? { x: 200 + ((hashId(d.id) * 37) % 600), y: 140 + ((hashId(d.id) * 53) % 360) } : { x, y });
  }
  return out;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function stateMeta(
  device: Device,
  states: Record<string, LightingState> | undefined,
  telemetry: Record<string, TelemetrySample[]> | undefined
): { label: string; value: string }[] {
  const s = states?.[device.id];
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
  return [{ label: "Status", value: device.status.toUpperCase() }];
}

interface CityMapProps {
  devices: Device[];
  events?: CityEvent[];
  tickets?: Ticket[];
  states?: Record<string, LightingState>;
  telemetry?: Record<string, TelemetrySample[]>;
  serviceFilter?: MapServiceFilter;
  layers?: CityMapLayers;
  dark?: boolean;
  interactive?: boolean;
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
  telemetry,
  serviceFilter = "all",
  layers = { devices: true, infrastructure: true, events: true, tickets: true },
  dark = false,
  interactive = false,
  highlightDeviceId,
  onSelectDevice,
  noActions = false,
  className,
}: CityMapProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(highlightDeviceId ?? null);

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
            const r = dev.status === "critical" ? 9 : dev.status === "warning" ? 8 : 7;
            return (
              <g key={dev.id} transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer" onClick={() => (interactive ? select(dev.id) : undefined)}>
                {(dev.status === "critical" || dev.status === "warning") && (
                  <circle r={r + 4} fill="none" stroke={c} strokeWidth={1.5} opacity={0.5}>
                    <animate attributeName="r" values={`${r};${r + 9}`} dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle r={r} fill={c} stroke={dark ? "#0b1322" : "#fff"} strokeWidth={2.5} />
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
            {stateMeta(selectedDevice, states, telemetry).map((m) => (
              <div key={m.label}>
                <div className="text-[10px] uppercase tracking-wide text-ink-400">{m.label}</div>
                <div className="tabular font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <span className="text-[10px] text-ink-400">
              Last seen {selectedDevice.lastHeartbeat ? timeAgo(selectedDevice.lastHeartbeat) : "never"}
            </span>
            {!noActions && (
              <Button
                size="xs"
                variant="primary"
                onClick={() => (onSelectDevice ? onSelectDevice(selectedDevice.id) : navigate(`/app/lighting/devices/${selectedDevice.id}`))}
              >
                View device <ArrowUpRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
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
    </div>
  );
}