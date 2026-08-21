import { Link } from "react-router-dom";
import { ArrowRight, Building2, Landmark, HardHat, Factory, ShieldCheck, Activity, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const AUDIENCES = [
  { icon: Landmark, title: "Municipalities", desc: "Operate every city service from a single command layer — lighting, water, waste and traffic together." },
  { icon: Building2, title: "Smart-city organizations", desc: "Deliver on the connected-city roadmap with a platform built for real-time operations." },
  { icon: HardHat, title: "Infrastructure companies", desc: "Monitor the assets you maintain, predict failures and prove service levels with data." },
  { icon: Factory, title: "Technology providers", desc: "Onboard your own devices into an enterprise-grade operations platform your customers can trust." },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Security & roles", desc: "Row-level security, granular roles (viewer → admin) and full audit trails on every action." },
  { icon: Clock, title: "Real-time by default", desc: "Telemetry, events, tickets and maps update instantly — no refresh button anywhere." },
  { icon: Landmark, title: "City-wide scale", desc: "From hundreds to hundreds of thousands of devices on one Supabase-backed core." },
];

export function SolutionsPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
          <Badge tone="info">Solutions</Badge>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Built for the people who run cities
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-500">
            One platform, four service lines, and a role-based experience adapted to every team —
            from command center to field operator.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="lift rounded-2xl border border-ink-100 bg-white p-7 shadow-card">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pulse-50 text-pulse-600">
                <a.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{a.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6">
              <f.icon className="h-5 w-5 text-pulse-600" />
              <h4 className="mt-3 text-sm font-bold text-ink-900">{f.title}</h4>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl bg-ink-950 px-6 py-12 text-center text-white">
          <h2 className="font-display text-2xl font-bold">Deploy for your city or organization</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
            Self-hosted on your Supabase project (recommended for municipalities), or run fully on
            CITYPULSE Cloud.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button>Request access <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="!border-white/20 !bg-white/5 !text-white">Try the demo</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}