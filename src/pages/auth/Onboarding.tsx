import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Lightbulb, Droplets, Trash2, TrafficCone, Rocket } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ServiceId } from "@/lib/types";

const STEPS = ["Organization", "Services", "Team", "Done"];

const SERVICE_CHOICES: { id: ServiceId; label: string; icon: typeof Lightbulb; desc: string }[] = [
  { id: "lighting", label: "Lighting", icon: Lightbulb, desc: "Smart street lighting" },
  { id: "water", label: "Water", icon: Droplets, desc: "Water infrastructure" },
  { id: "waste", label: "Waste", icon: Trash2, desc: "Waste management" },
  { id: "traffic", label: "Traffic", icon: TrafficCone, desc: "Traffic monitoring" },
];

export function Onboarding() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<ServiceId>>(new Set(["lighting", "water"]));
  const [team, setTeam] = useState("10-50");

  const toggle = (id: ServiceId) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const next = () => setStep((s) => Math.min(3, s + 1));
  const finish = () => navigate("/app");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <Link to="/"><span className="inline-flex"><Logo /></span></Link>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cn("h-1 rounded-full", i <= step ? "bg-pulse-500" : "bg-ink-200")} />
              <div className={cn("mt-1.5 text-center text-[11px] font-semibold", i <= step ? "text-pulse-600" : "text-ink-400")}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card sm:p-9">
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-950">Set up your workspace</h2>
              <p className="mt-1 text-sm text-ink-500">
                Welcome, {user?.fullName?.split(" ")[0] ?? "there"}. Your organization is{" "}
                <span className="font-semibold text-ink-800">{user?.organization ?? "City Operations"}</span> as a{" "}
                <span className="font-semibold text-ink-800">{user?.organizationType?.replace("_", " ")}</span>.
              </p>
              <div className="mt-6 rounded-xl border border-pulse-100 bg-pulse-50 p-4 text-sm text-pulse-800">
                A default city region has been created. You can add districts and zones at any time from Settings.
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-950">Select your services</h2>
              <p className="mt-1 text-sm text-ink-500">Choose the infrastructure lines you operate.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {SERVICE_CHOICES.map((s) => {
                  const Icon = s.icon;
                  const on = selected.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        on ? "border-pulse-400 bg-pulse-50" : "border-ink-100 hover:border-ink-200"
                      )}
                    >
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", on ? "bg-pulse-600 text-white" : "bg-ink-100 text-ink-500")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-ink-900">{s.label}</span>
                        <span className="block text-xs text-ink-500">{s.desc}</span>
                      </span>
                      {on && <Check className="h-4 w-4 text-pulse-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-950">Tell us about your team</h2>
              <p className="mt-1 text-sm text-ink-500">How many operators will use the platform?</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["1-9", "10-50", "50+"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTeam(v)}
                    className={cn(
                      "rounded-xl border py-3 text-sm font-semibold transition-colors",
                      team === v ? "border-pulse-400 bg-pulse-50 text-pulse-700" : "border-ink-100 text-ink-600"
                    )}
                  >
                    {v} operators
                  </button>
                ))}
              </div>
              <p className="mt-4 text-xs text-ink-400">Invite teammates later from Settings → Users &amp; Roles.</p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-live-50 text-live-600">
                <Rocket className="h-7 w-7" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink-950">You're all set</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                Your workspace is ready with live telemetry streaming. Let's open your city overview.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={next}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="lg" onClick={finish}>
                Open your workspace <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}