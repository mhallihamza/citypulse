import { useApp } from "@/context/AppContext";
import { Card, CardHeader, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Link } from "react-router-dom";
import { CityMap } from "@/components/map/CityMap";
import { lightingStats } from "@/pages/app/_shared";

/** Lighting-scoped operations map (real coordinates only). */
export function LightingMapPage() {
  const { devices, states, telemetry, events, tickets } = useApp();
  const stats = lightingStats(devices, states, events, tickets);
  const lightingEvents = events.filter((e) => e.service === "lighting");

  return (
    <div>
      <PageHeader
        title="Lighting · Map"
        subtitle="Real positions of your lighting fleet from locations latitude / longitude."
        actions={
          <Link to="/app/lighting/devices">
            <Button variant="outline" size="sm">Device registry</Button>
          </Link>
        }
      />
      <Card className="overflow-hidden">
        <CardHeader
          title="Operations map"
          subtitle="Click a marker for live device detail"
          action={<Badge tone={stats.online > 0 ? "success" : "neutral"} dot>{stats.online} online</Badge>}
        />
        <CityMap
          devices={stats.fleet}
          events={lightingEvents}
          tickets={tickets}
          states={states}
          telemetry={telemetry}
          dark
          interactive
          className="h-[560px] rounded-none !border-0"
        />
      </Card>
    </div>
  );
}