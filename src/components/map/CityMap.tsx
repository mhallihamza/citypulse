import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, X } from "lucide-react";
import type {
  CityEvent,
  Device,
  ServiceId,
  TelemetrySample,
  Ticket,
} from "@/lib/types";
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

const RIVER =
  "M-20 470 C 180 400, 340 470, 640 420 S 820 260, 1020 330 L 1020 700 L -20,700 Z";

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
  { d: "M150 150 C 260 210, 300 230, 320 300", w: 3.5 },
  { d: "M640 300 C 700 340, 760 380, 810 450", w: 3.5 },
  { d: "M480 450 C 520 470, 560 500, 580 560", w: 3 },
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
        <path
          key={i}
          d={z}
          fill={dark ? "rgba(36,107,255,0.05)" : "rgba(36,107,255,0.04)"}
          stroke={dark ? "rgba(148,163,184,0.10)" : "rgba(23,37,84,0.08)"}
          strokeWidth={1}
        />
      ))}
      {ROADS.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke={roadC} strokeWidth={r.w} strokeLinecap="round" />
      ))}
    </g>
  );
}

function deviceMeta(
  d: Device,
  telemetry: Record<string, TelemetrySample[]> | undefined
): { label: string; value: string }[] {
  const last = telemetry?.[d.id]?.slice(-1)[0];
  if (d.service === "lighting") {
    return [
      { label: "Lux", value: `${(last?.lux ?? 4.2).toFixed(1)} lx` },
      { label: "Brightness", value: `${last?.brightness ?? 100}%` },
      { label: "Presence", value: last?.presence ? "Detected" : "None" },
      { label: "Power", value: `${last?.power ?? 32} W` },
    ];
  }
  if (d.service === "water") {
    return [
      { label: "Flow", value: `${(last?.flow ?? 10).toFixed(1)} L/min` },
      { label: "Pressure", value: `${(last?.pressure ?? 3.9).toFixed(2)} bar` },
    ];
  }
  if (d.service === "waste") {
    return [{ label: "Fill level", value: `${last?.fillLevel ?? 62}%` }];
  }
  return [
    { label: "Density", value: `${last?.density ?? 50}%` },
    { label: "Congestion", value: `${last?.congestion ?? 30}%` },
    { label: "Travel time", value: `${(last?.travelTime ?? 12).toFixed(1)} min` },
  ];
}

interface CityMapProps {
  devices: Device[];
  events?: CityEvent[];
  tickets?: Ticket[];
  telemetry?: Record<string, TelemetrySample[]>;
  serviceFilter?: MapServiceFilter;
  layers?: CityMapLayers;
  dark?: boolean;
  interactive?: boolean;
  highlightDeviceId?: string;
  onSelectDevice?: (deviceId: string) => void;
  className?: string;
  noActions?: boolean;
}

export function CityMap({
  devices,
  events = [],
  tickets = [],
  telemetry,
  serviceFilter = "all",
  layers = { devices: true, infrastructure: true, events: true, tickets: false },
  dark = true,
  interactive = true,
  highlightDeviceId,
  onSelectDevice,
  className,
  noActions = false,
}: CityMapProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(highlightDeviceId ?? null);

  const visible = useMemo(() => {
    if (serviceFilter === "incidents") return devices.filter((d) => d.entityStatus !== "normal");
    if (serviceFilter === "all") return devices;
    return devices.filter((d) => d.service === serviceFilter);
  }, [devices, serviceFilter]);

  const selectedDevice = selected ? devices.find((d) => d.id === selected) : undefined;
  const selEvent = selected ? events.filter((e) => e.deviceId === selected) : [];

  const select = (id: string) => {
    setSelected(id);
    if (onSelectDevice) onSelectDevice(id);
  };

  const flipX = selectedDevice ? selectedDevice.point.x > 640 : false;
  const flipY = selectedDevice ? selectedDevice.point.y < 120 : false;

  return (
    <div
      className={cn(
        "map-canvas relative w-full overflow-hidden rounded-xl border",
        !dark && "map-canvas-light",
        dark ? "border-ink-800" : "border-ink-100",
        className
      )}
    >
      <svg
        viewBox="0 0 1000 640"
        className="block h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="City infrastructure map"
      >
        {layers.infrastructure && <Infrastructure dark={dark} />}
        {layers.devices &&
          visible.map((d) => {
            const c = ENTITY_STATUS_COLOR[d.entityStatus];
            const big = d.entityStatus === "critical";
            const selectedFlag = selected === d.id;
            return (
              <g
                key={d.id}
                transform={`translate(${d.point.x}, ${d.point.y})`}
                className="cursor-pointer"
                onClick={() => (interactive ? select(d.id) : undefined)}
              >
                <circle r={big ? 9 : 7} fill={c} opacity={0.22}>
                  <animate attributeName="r" values={big ? "7;9;7" : "6;7;6"} dur="3s" repeatCount="indefinite" />
                </circle>
                <circle r={big ? 4.6 : 3.6} fill={c} stroke={dark ? "#0b1322" : "#ffffff"} strokeWidth={1.4} />
                {selectedFlag && (
                  <circle r={13} fill="none" stroke={c} strokeWidth={1.5} strokeDasharray="5 4" className="animate-[spin_8s_linear_infinite]" style={{ transformOrigin: "0px 0px" }} />
                )}
              </g>
            );
          })}
        {layers.events &&
          events
            .filter((e) => e.severity !== "info" && e.status === "new")
            .map((e) => {
              const dev = devices.find((d) => d.id === e.deviceId);
              if (!dev) return null;
              const c = e.severity === "critical" ? "#ef4444" : "#f59e0b";
              return (
                <g key={e.id} transform={`translate(${dev.point.x}, ${dev.point.y - 16})`} className="cursor-pointer" onClick={() => (interactive ? select(dev.id) : undefined)}>
                  <path d="M0,0 L-6,-10 a6,6 0 1 1 12,0 Z" fill={c} />
                  <circle cx={0} cy={-6.5} r={1.8} fill={dark ? "#0b1322" : "#fff"} />
                </g>
              );
            })}
        {layers.tickets &&
          tickets.map((t) => {
            const dev = t.deviceId ? devices.find((d) => d.id === t.deviceId) : undefined;
            if (!dev || t.status === "resolved") return null;
            const c = t.priority === "critical" ? "#ef4444" : t.priority === "high" ? "#f59e0b" : "#246bff";
            return (
              <g key={t.id} transform={`translate(${dev.point.x + 8}, ${dev.point.y - 14})`} className="cursor-pointer" onClick={() => navigate(`/app/tickets/${t.id}`)}>
                <rect x={-7} y={-7} width={14} height={14} rx={3.5} fill={c} />
                <rect x={-3.5} y={-3.5} width={7} height={7} rx={1.5} fill={dark ? "#0b1322" : "#fff"} opacity={0.9} />
              </g>
            );
          })}
      </svg>
      {/* ===POPUP=== */}
      {selectedDevice && interactive && (
        <div
          className={cn(
            "absolute bottom-4 left-4 z-20 w-[270px] rounded-xl border border-ink-700 bg-ink-900/95 p-4 text-white shadow-pop backdrop-blur",
            flipX && "bottom-4 right-4 left-auto",
            flipY && "bottom-auto top-4"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-display text-base font-bold leading-tight">{selectedDevice.id}</div>
              <div className="text-xs text-ink-300">{selectedDevice.name}</div>
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={selectedDevice.entityStatus} />
              <button
                className="ml-1 rounded-md p-1 text-ink-400 hover:bg-white/10 hover:text-white"
                onClick={() => setSelected(null)}
                aria-label="Close popup"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {selEvent[0] && (
            <div className="mt-2 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
              {selEvent[0].title}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {deviceMeta(selectedDevice, telemetry).map((m) => (
              <div key={m.label}>
                <div className="text-[10px] uppercase tracking-wide text-ink-400">{m.label}</div>
                <div className="tabular font-semibold">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <span className="text-[10px] text-ink-400">Updated {timeAgo(selectedDevice.lastTelemetryAt)}</span>
            {!noActions && (
              <Button
                size="xs"
                variant="primary"
                onClick={() =>
                  onSelectDevice
                    ? onSelectDevice(selectedDevice.id)
                    : navigate(`/app/${selectedDevice.service}/${selectedDevice.id}`)
                }
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