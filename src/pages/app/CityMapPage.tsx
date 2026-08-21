import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Layers } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CityMap, type CityMapLayers, type MapServiceFilter } from "@/components/map/CityMap";
import { cn } from "@/lib/utils";

const FILTERS: { id: MapServiceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lighting", label: "Lighting" },
  { id: "water", label: "Water" },
  { id: "waste", label: "Waste" },
  { id: "traffic", label: "Traffic" },
  { id: "incidents", label: "Incidents" },
];

const LAYER_KEYS: { id: keyof CityMapLayers; label: string }[] = [
  { id: "devices", label: "Devices" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "events", label: "Events" },
  { id: "tickets", label: "Tickets" },
];

export function CityMapPage() {
  const { data } = useApp();
  const [filter, setFilter] = useState<MapServiceFilter>("all");
  const [layers, setLayers] = useState<CityMapLayers>({
    devices: true,
    infrastructure: true,
    events: true,
    tickets: true,
  });

  const toggleLayer = (id: keyof CityMapLayers) => setLayers((l) => ({ ...l, [id]: !l[id] }));

  const counts: Record<MapServiceFilter, number> = {
    all: data.devices.length,
    lighting: data.devices.filter((d) => d.service === "lighting").length,
    water: data.devices.filter((d) => d.service === "water").length,
    waste: data.devices.filter((d) => d.service === "waste").length,
    traffic: data.devices.filter((d) => d.service === "traffic").length,
    incidents: data.devices.filter((d) => d.entityStatus !== "normal").length,
  };

  return (
    <div>
      <PageHeader
        title="City Map"
        subtitle="Interactive, real-time view of every connected asset across the city."
        live
        actions={
          <Link to="/app/devices">
            <Button variant="outline" size="sm">Device registry</Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="Operations map"
          subtitle="Click a marker for live device detail"
          action={
            <Badge tone="success" dot>{data.devices.filter((d) => d.status === "online").length} online</Badge>
          }
        />

        {/* Filters + layers */}
        <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  filter === f.id
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                )}
              >
                {f.label}
                <span className="ml-1.5 text-[10px] tabular opacity-70">{counts[f.id]}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[13px]">
            <span className="hidden items-center gap-1 text-ink-400 sm:inline-flex"><Layers className="h-4 w-4" /> Layers</span>
            {LAYER_KEYS.map((l) => (
              <button
                key={l.id}
                onClick={() => toggleLayer(l.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                  layers[l.id] ? "bg-pulse-50 text-pulse-700" : "text-ink-400"
                )}
              >
                <Eye className="h-3.5 w-3.5" /> {l.label}
              </button>
            ))}
          </div>
        </div>

        <CityMap
          devices={data.devices}
          events={data.events}
          tickets={data.tickets}
          telemetry={data.telemetry}
          serviceFilter={filter}
          layers={layers}
          dark
          className="h-[560px] rounded-none !border-0"
        />
      </Card>
    </div>
  );
}