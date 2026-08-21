import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CtaBanner } from "@/pages/public/Home";

const ARCH = [
  { e: "Physical layer", d: "Street lights, water mains, bins, signalized junctions", chips: ["ESP32", "LoRa / NB-IoT", "Meters & sensors", "Controllers"], note: "The city's physical infrastructure, instrumented with sensing, control and connectivity." },
  { e: "Device layer", d: "Securely onboarded IoT devices with identity, firmware and heartbeat", chips: ["Device registry", "Firmware OTA", "Heartbeat", "Provisioning"], note: "Every device has an identity, a heartbeat and a managed firmware lifecycle." },
  { e: "MQTT + ingestion", d: "Bi-directional messaging between devices and the platform", chips: ["MQTT broker", "Topic-per-device", "QoS 1", "Command channel"], note: "Telemetry flows up, commands flow down — all over MQTT with per-device topics." },
  { e: "Data platform", d: "Relational store with streaming ingest and row-level security", chips: ["PostgreSQL", "Supabase", "Realtime engine", "Row Level Security"], note: "Telemetry, events, tickets and AI output live in one relational, queryable core." },
  { e: "Real-time processing", d: "Streaming rules, aggregations and state tracking", chips: ["Stream processor", "Thresholds", "Dedupe & debounce", "≤ 1s latency"], note: "Raw samples become statuses, events and KPIs in real time." },
  { e: "AI analysis", d: "Anomaly detection, prediction and recommendation", chips: ["Detectors", "Forecast models", "Confidence scoring", "Explainability"], note: "Models turn telemetry into evidence-backed recommendations." },
  { e: "Operations", d: "Events, tickets, operators and field dispatch", chips: ["Events center", "Ticket workflow", "Assignments", "Dispatch"], note: "Recommendations become tickets, assignments and field dispatches." },
  { e: "Action", d: "Commands, resolution and continuous improvement", chips: ["Device commands", "Resolution loops", "Audit trail", "Retraining"], note: "Closed-loop: each action feeds back into the model and the city." },
];

export function PlatformPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-ink-100 bg-white py-16">
        <div className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
          <Badge tone="info">Platform</Badge>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            One architecture, from sensor to action
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-ink-500">
            CITYPULSE is engineered around a single idea: raw sensor data should become operational
            decisions with no need for glue code between layers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {ARCH.map((a, i) => (
            <div key={a.e} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="font-display text-lg font-bold text-ink-900">{a.e}</h3>
              </div>
              <p className="mt-2 text-sm text-ink-500">{a.d}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.chips.map((c) => (
                  <span key={c} className="rounded-md bg-pulse-50 px-2 py-0.5 text-[11px] font-semibold text-pulse-700">
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-t border-ink-50 pt-3 text-[13px] italic text-ink-400">{a.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-pulse-100 bg-gradient-to-br from-pulse-50 to-live-50 p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-ink-900">Built on Supabase & PostgreSQL</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
            Realtime subscriptions over Row Level Security, auth, storage for attachments, and
            PostgreSQL functions for rules and rollups — an enterprise-grade backend without
            infrastructure ops.
          </p>
          <Link to="/register" className="mt-6 inline-flex">
            <Button>
              Request a technical walkthrough <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="pt-16">
          <CtaBanner />
        </div>
      </section>
    </div>
  );
}