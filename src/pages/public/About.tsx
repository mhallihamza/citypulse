import { Link } from "react-router-dom";
import { ArrowRight, Target, Users, Globe2, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const VALUES = [
  { icon: Target, title: "Operational clarity", desc: "Complexity belongs in the platform, not on your operators' screens." },
  { icon: Users, title: "Field-first design", desc: "Built with the dispatchers, technicians and supervisors who keep cities moving." },
  { icon: Globe2, title: "City-scale vision", desc: "From one corridor to a whole metropolitan region — the architecture grows with you." },
  { icon: HeartHandshake, title: "Radical practicality", desc: "No sci-fi. Measureable uptime, actionable tickets and real resolution." },
];

export function AboutPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
          <Badge tone="neutral">About</Badge>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            The operations layer for modern cities
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-500">
            CITYPULSE was founded on a simple observation: cities collect more data than ever, but
            operators still struggle to see what is happening, why it is happening, and what to do
            about it. We built the platform that closes that gap.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pulse-50 text-pulse-600">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-ink-900">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid overflow-hidden rounded-2xl border border-ink-100 md:grid-cols-3">
          {[
            { k: "2019", v: "Founded" },
            { k: "40+", v: "Cities & utilities" },
            { k: "1,248+", v: "Devices managed" },
          ].map((s) => (
            <div key={s.v} className="border-b border-ink-100 p-8 text-center last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="font-display text-3xl font-bold text-ink-900">{s.k}</div>
              <div className="mt-1 text-sm text-ink-500">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/register" className="inline-flex">
            <Button size="lg">
              Work with us <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}