import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Lightbulb,
  Droplets,
  Trash2,
  TrafficCone,
  ChevronDown,
  ShieldCheck,
  Cpu,
  Wifi,
  Database,
  BrainCircuit,
  Users,
  Zap,
  BadgeCheck,
  Landmark,
  Activity,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CityMap } from "@/components/map/CityMap";
import { timeAgo } from "@/lib/format";
import type { ServiceId } from "@/lib/types";

const SERVICES: {
  id: ServiceId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  caps: string[];
  accent: string;
  bg: string;
}[] = [
  {
    id: "lighting",
    icon: Lightbulb,
    title: "Lighting",
    desc: "Smart street lighting with real-time lamp monitoring and adaptive brightness.",
    caps: ["Real-time lamp monitoring", "Adaptive brightness", "Presence detection", "Failure detection", "Energy monitoring"],
    accent: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    id: "water",
    icon: DropletIcon,
    title: "Water",
    desc: "Continuous monitoring of water infrastructure, flow, pressure and consumption.",
    caps: ["Flow monitoring", "Leak detection", "Consumption analysis", "Critical event detection"],
    accent: "#246BFF",
    bg: "#EEF6FF",
  },
  {
    id: "waste",
    icon: RecycleIcon,
    title: "Waste",
    desc: "Smart waste management with fill-level monitoring and optimized collection routes.",
    caps: ["Bin fill-level monitoring", "Collection optimization", "Overflow detection", "Route optimization"],
    accent: "#10B981",
    bg: "#ECFDF5",
  },
  {
    id: "traffic",
    icon: TrafficCone,
    title: "Traffic",
    desc: "Live traffic monitoring with congestion detection and travel-time analysis.",
    caps: ["Vehicle density", "Congestion detection", "Travel-time analysis", "Traffic incidents"],
    accent: "#8B5CF6",
    bg: "#F5F3FF",
  },
];

function DropletIcon(props: React.ComponentProps<typeof Droplets>) {
  return <Droplets {...props} />;
}
function RecycleIcon(props: React.ComponentProps<typeof Trash2>) {
  return <Trash2 {...props} />;
}

function Hero() {
  return (
    <section id="platform" className="relative overflow-hidden">
      <div className="hero-grid absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-pulse-50/80 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 md:px-8 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <Badge tone="info" className="mb-5">
              <ShieldCheck className="h-3.5 w-3.5" /> Enterprise Smart City Platform
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink-950 sm:text-5xl lg:text-[56px]">
              Smarter Cities.
              <br />
              Real-Time Intelligence.
              <br />
              <span className="text-gradient">Better Decisions.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-500">
              CITYPULSE connects city infrastructure, IoT devices, real-time data and AI into one
              intelligent operational platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg">
                  Explore Platform <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                { k: "1,248+", v: "Connected devices" },
                { k: "98.2%", v: "Availability" },
                { k: "<1s", v: "Telemetry latency" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-2xl font-bold tabular text-ink-900">{s.k}</div>
                  <div className="text-xs text-ink-500">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up lg:pl-2" style={{ animationDelay: "150ms" }}>
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative rounded-2xl border border-ink-100 bg-white p-3 shadow-card-hover">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-live-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500">Connected city · Live</span>
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ink-200" />
          <span className="h-2 w-2 rounded-full bg-ink-200" />
          <span className="h-2 w-2 rounded-full bg-ink-200" />
        </div>
      </div>

      <div className="map-canvas-light relative h-[300px] overflow-hidden rounded-xl border border-ink-100 sm:h-[340px]">
        <svg viewBox="0 0 500 340" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <circle cx={250} cy={170} r={44} fill="#246BFF" opacity={0.1} />
          <circle cx={250} cy={170} r={26} fill="#246BFF" />
          <circle cx={250} cy={170} r={26} fill="none" stroke="#246BFF" strokeWidth={1.5}>
            <animate attributeName="r" values="26;34;26" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
          </circle>
          {[
            { x: 92, y: 76, c: "#F59E0B" },
            { x: 420, y: 70, c: "#246BFF" },
            { x: 80, y: 268, c: "#10B981" },
            { x: 424, y: 260, c: "#8B5CF6" },
            { x: 250, y: 40, c: "#0B5FE8" },
            { x: 130, y: 170, c: "#D97706" },
            { x: 392, y: 165, c: "#0F766E" },
          ].map((n, i) => (
            <g key={i}>
              <line x1={250} y1={170} x2={n.x} y2={n.y} stroke={n.c} strokeWidth={1.4} strokeDasharray="5 5" opacity={0.55}>
                <animate attributeName="stroke-dashoffset" values="0;20" dur="1.4s" repeatCount="indefinite" />
              </line>
              <circle cx={n.x} cy={n.y} r={7} fill={n.c} stroke="#fff" strokeWidth={2}>
                <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>

        <div className="absolute left-3 top-3 animate-soft-pulse rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur">
          💡 <span className="tabular">L-104 · 4.2 lx</span>
        </div>
        <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur">
          💧 <span className="tabular">W-03 · pressure −0.6 bar</span>
        </div>
        <div className="absolute bottom-3 left-4 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur">
          🗑 <span className="tabular">B-218 · 87% full</span>
        </div>
        <div className="absolute bottom-3 right-4 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-700 shadow-sm backdrop-blur">
          🚦 <span>Avenue Hassan II · normal</span>
        </div>
      </div>
    </div>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="border-t border-ink-100 bg-ink-50/50 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="info">City Services</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            Four services. One operations layer.
          </h2>
          <p className="mt-3 text-ink-500">
            Every city service — lighting, water, waste and traffic — runs on the same real-time
            platform, so your operators see everything in one place.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="lift flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: s.bg, color: s.accent }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.desc}</p>
                <ul className="mt-4 space-y-2">
                  {s.caps.map((cap) => (
                    <li key={cap} className="flex items-center gap-2 text-[13px] text-ink-600">
                      <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: s.accent }} />
                      {cap}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-pulse-600 transition-colors hover:text-pulse-700"
                >
                  Explore service <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const PIPELINE = [
  { icon: Cpu, label: "Sensors", note: "ESP32 · LoRa · NB-IoT" },
  { icon: Wifi, label: "IoT Devices", note: "Secure device fleet" },
  { icon: Zap, label: "MQTT", note: "Bi-directional protocol" },
  { icon: Database, label: "Data Platform", note: "PostgreSQL · Supabase" },
  { icon: Activity, label: "Real-Time Processing", note: "Streaming + Realtime" },
  { icon: BrainCircuit, label: "AI", note: "Detection & prediction" },
  { icon: Users, label: "Operators", note: "Tickets & field teams" },
  { icon: BadgeCheck, label: "Action", note: "Resolution" },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="neutral">Architecture</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            How CITYPULSE works
          </h2>
          <p className="mt-3 text-ink-500">
            CITYPULSE converts raw sensor data into actionable city operations — from a single
            sensor heartbeat to a resolved ticket.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="hidden h-0.5 bg-gradient-to-r from-pulse-200 via-pulse-400 to-live-400 lg:block" style={{ position: "absolute", top: 36, left: "4%", right: "4%" }} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {PIPELINE.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-ink-100 bg-white shadow-card">
                    <Icon className="h-7 w-7 text-pulse-600" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-3 text-[13px] font-bold text-ink-900">{p.label}</div>
                  <div className="mt-0.5 text-[11px] text-ink-400">{p.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-pulse-100 bg-gradient-to-r from-pulse-50 to-live-50 p-6 text-center shadow-card sm:p-8">
          <p className="text-base font-medium leading-relaxed text-ink-700">
            Raw sensor data travels from the physical infrastructure through MQTT into the data
            platform, where real-time processing and AI turn it into{" "}
            <span className="font-bold text-ink-900">decisions your operators can act on</span> — a
            ticket, a route, a dispatch, a command.
          </p>
          <Link to="/platform" className="mt-5 inline-flex">
            <Button variant="outline" size="sm">
              Explore the technical architecture <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function RealtimeSection() {
  const { data, now } = useApp();
  const feed = data.events.slice(0, 5).map((e) => {
    const dev = data.devices.find((d) => d.id === e.deviceId);
    const emoji = e.service === "lighting" ? "💡" : e.service === "water" ? "💧" : e.service === "waste" ? "🗑" : "🚦";
    return { id: e.id, emoji, title: e.title, tag: `${e.service[0].toUpperCase() + e.service.slice(1)} / ${dev?.location ?? e.deviceId}`, ts: e.createdAt, severity: e.severity };
  });

  return (
    <section className="border-t border-ink-100 bg-ink-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="lg:sticky lg:top-28">
            <Badge tone="success" dot className="!border-live-400/30 !bg-live-400/10 !text-live-300">
              Real-time intelligence
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The city, live.
            </h2>
            <p className="mt-4 max-w-md text-ink-300">
              Every device streams telemetry in real time over MQTT. Operators see status changes,
              anomalies and events the second they happen — on the map and in the event stream.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              {[
                ["💡", "Lighting"],
                ["💧", "Water"],
                ["🗑", "Waste"],
                ["🚦", "Traffic"],
              ].map(([e, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 font-medium text-ink-300 ring-1 ring-white/10">
                  <span>{e}</span> {l}
                </span>
              ))}
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-400" />
                Live event feed
              </div>
              <div className="divide-y divide-white/5">
                {feed.map((item) => (
                  <div key={item.id} className="feed-item flex items-center gap-3 px-4 py-3">
                    <span className="text-lg">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-white">{item.title}</div>
                      <div className="truncate text-[11px] text-ink-400">{item.tag}</div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold tabular",
                        item.severity === "critical" ? "text-red-400" : item.severity === "warning" ? "text-amber-400" : "text-ink-400"
                      )}
                    >
                      {timeAgo(item.ts, now)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-pop">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ink-400">
                <Landmark className="h-4 w-4 text-pulse-400" /> City operations map
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-live-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-live-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-400" /> Streaming
              </span>
            </div>
            <CityMap
              devices={data.devices}
              events={data.events}
              telemetry={data.telemetry}
              dark
              interactive
              noActions
              className="border-0 rounded-none !border-white/10 h-[460px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AiSection() {
  return (
    <section id="ai" className="border-t border-ink-100 py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="info">AI Intelligence</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            From Data to Decisions
          </h2>
          <p className="mt-3 text-ink-500">
            CITYPULSE AI analyzes events and telemetry in real time, then recommends actions and
            creates the tickets that get the work done.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_1.15fr]">
          {/* Pipeline */}
          <div className="space-y-3">
            {[
              {
                tag: "RAW DATA",
                tone: "bg-ink-50 border-ink-100 text-ink-500",
                lines: ["Lux: 4.2 lx", "Brightness: 100%", "Night: TRUE", "Presence: TRUE"],
              },
              { tag: "AI ANALYSIS", tone: "bg-pulse-50 border-pulse-200 text-pulse-700", lines: ["Lighting output is significantly below expected levels."] },
              { tag: "RECOMMENDATION", tone: "bg-amber-50 border-amber-200 text-amber-700", lines: ["Inspect lamp L-104."] },
              { tag: "ACTION", tone: "bg-live-50 border-live-200 text-live-700", lines: ["Create Ticket"] },
            ].map((step, i) => (
              <div key={step.tag}>
                <div
                  className={cn(
                    "rounded-xl border p-4",
                    step.tone,
                    i === 0 ? "bg-ink-900/90" : ""
                  )}
                >
                  <div className={cn("text-[10px] font-bold uppercase tracking-widest", i === 0 ? "text-ink-400" : "")}>
                    {step.tag}
                  </div>
                  <div
                    className={cn(
                      "mt-1.5 font-mono text-[13px] leading-relaxed",
                      i === 0 ? "text-white" : ""
                    )}
                  >
                    {step.lines.map((l, j) => (
                      <div key={j} className="tabular">{l}</div>
                    ))}
                  </div>
                </div>
                {i < 3 && (
                  <div className="flex justify-center py-1">
                    <ChevronDown className="h-4 w-4 text-ink-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right: explanation cards */}
          <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-ink-900">Intelligence, not just alerts</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              CITYPULSE AI runs detection models over streaming telemetry and a batch analysis layer
              over historical data. Every insight carries evidence and a confidence score — so
              operators can trust the recommendation before they act.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { k: "Anomaly detection", v: "Faults, leaks, overflow and congestion, caught in seconds." },
                { k: "Predictive models", v: "Forecast congestion windows and collection demand." },
                { k: "Actionable output", v: "Every insight maps to a ticket, command or dispatch." },
                { k: "Explainable AI", v: "Confidence scores and evidence attached to every claim." },
              ].map((c) => (
                <div key={c.k} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
                  <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                    <BrainCircuit className="h-4 w-4 text-pulse-600" /> {c.k}
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{c.v}</p>
                </div>
              ))}
            </div>
            <Link to="/register" className="mt-7 inline-flex">
              <Button>
                See AI Insights in action <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function useCountUp(target: number, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const stepFn = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(stepFn);
    };
    raf = requestAnimationFrame(stepFn);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Metric({ value, suffix, label, decimals = 0 }: { value: number; suffix: string; label: string; decimals?: number }) {
  const v = useCountUp(value);
  return (
    <div className="text-center">
      <div className="font-display text-4xl font-bold tabular text-ink-950 sm:text-5xl">
        {v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        <span className="text-pulse-600">{suffix}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-ink-500">{label}</div>
    </div>
  );
}

function ImpactSection() {
  return (
    <section className="border-t border-ink-100 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="success" dot>Platform impact</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            Measured in real infrastructure
          </h2>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-10 lg:grid-cols-4">
          <Metric value={1248} suffix="+" label="Connected Devices" />
          <Metric value={98.2} suffix="%" decimals={1} label="Infrastructure Availability" />
          <Metric value={3482} suffix="" label="Events Processed" />
          <Metric value={24} suffix="/7" label="Real-Time Monitoring" />
        </div>
        <p className="mx-auto mt-14 max-w-xl text-center text-sm text-ink-400">
          Trusted by municipalities and infrastructure operators to keep cities running — one
          telemetry stream at a time.
        </p>
      </div>
    </section>
  );
}

export function CtaBanner() {
  return (
    <section className="px-4 pb-20 md:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-ink-950 px-6 py-16 text-center text-white sm:px-16">
        <div className="hero-grid absolute inset-0 opacity-40" style={{ position: "absolute", inset: 0 }} />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
            See what is happening. Understand why.
            <span className="text-gradient"> Take action.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-ink-300">
            CITYPULSE gives city operators one place to see what is happening, understand why it is
            happening, and take action.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="!border-white/20 !bg-white/5 !text-white hover:!bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <>
      <Hero />
      <ServicesSection />
      <HowItWorksSection />
      <RealtimeSection />
      <AiSection />
      <ImpactSection />
      <CtaBanner />
    </>
  );
}