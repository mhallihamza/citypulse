import { Link } from "react-router-dom";
import { ArrowRight, CircleSlash, PlugZap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardBody, PageHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceIconBadge } from "@/components/ui/ServiceIcon";
import { SERVICE_CONFIG, SERVICES } from "@/lib/services";
import type { ServiceId } from "@/lib/types";

/**
 * Service landing page for services NOT yet connected to real data (Waste).
 * Water and Traffic are now live modules with their own dashboards; this page
 * remains for future services so they onboard without any redesign. It renders
 * honest empty states — no simulated statistics are ever shown here.
 */
export function ServicePage({ service }: { service: ServiceId }) {
  const meta = SERVICE_CONFIG[service];
  const Icon = meta.icon;

  return (
    <div>
      <PageHeader
        title={meta.name}
        subtitle="CityPulse Smart City Operations · Service module"
        actions={<Badge tone="neutral" dot>Not connected</Badge>}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: meta.bg, color: meta.color }}>
            <Icon className="h-7 w-7" />
          </span>

          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">{meta.name} service is not connected yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              CityPulse is preparing the {meta.name} service. No live data is currently available,
              so nothing is displayed here yet. When your organization's {meta.name.toLowerCase()} devices
              are onboarded, real telemetry, events and commands will appear on this page.
            </p>
          </div>

          <div className="mt-2 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-3">
            <FeatureChip icon={<CircleSlash className="h-3.5 w-3.5" />} label="No live data" />
            <FeatureChip icon={<PlugZap className="h-3.5 w-3.5" />} label="IoT onboarding pending" />
            <FeatureChip icon={<ArrowRight className="h-3.5 w-3.5" />} label="Architecture ready" />
          </div>

          <Link to="/app/lighting" className="mt-4">
            <Button variant="outline" size="sm">
              Go to Lighting — the connected service <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Platform service map */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((s) => {
          const SIcon = s.icon;
          return (
            <Card key={s.key} className={s.key === service ? "border-pulse-200 shadow-glow" : ""}>
              <CardBody className="flex items-center gap-3 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: s.bg, color: s.color }}>
                  <SIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ink-900">{s.name}</div>
                  <div className="text-[11px] text-ink-400">{s.connected ? "Connected · real data" : "Not connected yet"}</div>
                </div>
                {s.key !== service && (
                  <Link to={`/app/${s.key}`} className="shrink-0 text-xs font-semibold text-pulse-600 hover:underline">Open</Link>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 text-center text-[11px] text-ink-400">
        <ServiceIconBadge service={service} size="sm" /> is part of the CITYPULSE multi-service architecture —
        enabling it later requires no redesign of the platform.
      </div>
    </div>
  );
}

function FeatureChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-xs font-semibold text-ink-500">
      {icon} {label}
    </span>
  );
}