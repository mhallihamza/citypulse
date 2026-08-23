import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Lightbulb, Rocket, Ticket as TicketIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { errMsg } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Post sign-up onboarding.
 * Flow A: create a NEW organization (caller becomes ADMIN).
 * Flow B: join an EXISTING organization using an admin-issued invite code.
 */
export function Onboarding() {
  const { authUser, profile, organization, createOrganization, joinOrganization } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const initialFlow = (location.state as { flow?: "create" | "join" } | null)?.flow ?? "create";
  const [flow, setFlow] = useState<"create" | "join">(initialFlow);
  const [orgName, setOrgName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already attached to an organization → nothing to onboard.
  useEffect(() => {
    if (profile && organization) navigate("/app", { replace: true });
  }, [profile, organization, navigate]);

  if (!authUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-4">
        <Logo />
        <p className="text-sm text-ink-500">Create an account first to set up your workspace.</p>
        <Link to="/register"><Button>Go to registration</Button></Link>
      </div>
    );
  }

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (flow === "create") {
        if (!orgName.trim()) throw new Error("Enter your organization name.");
        await createOrganization(orgName.trim());
      } else {
        if (!code.trim()) throw new Error("Enter the invite code you received.");
        await joinOrganization(code.trim());
      }
      navigate("/app");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <Link to="/"><span className="inline-flex"><Logo /></span></Link>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-card sm:p-9">
          <h2 className="font-display text-2xl font-bold text-ink-950">Set up your workspace</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            Welcome{authUser.email ? `, ${authUser.email}` : ""}. CITYPULSE is a multi-service platform —
            Lighting is live today; Water, Waste and Traffic activate later.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFlow("create")}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3.5 text-left transition-colors",
                flow === "create" ? "border-pulse-400 bg-pulse-50" : "border-ink-200 hover:border-ink-300"
              )}
            >
              <Building2 className={cn("h-4 w-4 shrink-0", flow === "create" ? "text-pulse-600" : "text-ink-400")} />
              <span>
                <span className="block text-[13px] font-bold text-ink-900">Create organization</span>
                <span className="block text-[11px] text-ink-500">You become its admin</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFlow("join")}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-3.5 text-left transition-colors",
                flow === "join" ? "border-pulse-400 bg-pulse-50" : "border-ink-200 hover:border-ink-300"
              )}
            >
              <TicketIcon className={cn("h-4 w-4 shrink-0", flow === "join" ? "text-pulse-600" : "text-ink-400")} />
              <span>
                <span className="block text-[13px] font-bold text-ink-900">Join with invite</span>
                <span className="block text-[11px] text-ink-500">Existing organization</span>
              </span>
            </button>
          </div>

          {flow === "create" ? (
            <div className="mt-5">
              <Field label="Organization name" hint="Example: CityPulse Casablanca">
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your municipality or company" />
              </Field>
              <p className="mt-2 text-xs text-ink-400">
                A tenant is created with all four services registered; Lighting starts connected.
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <Field label="Invite code" hint="Issued by an organization admin · bound to your email">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="E.g. A1B2C3D4" className="font-mono uppercase" />
              </Field>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-pulse-100 bg-pulse-50 p-3 text-xs leading-relaxed text-pulse-800">
            <Lightbulb className="h-4 w-4 shrink-0" />
            Next step after setup: register your first lighting device (for example L-104) from Lighting → Devices.
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>
          )}

          <div className="mt-7 flex items-center justify-between">
            <span className="text-xs text-ink-400">Signed in as {authUser.email}</span>
            <Button size="lg" loading={busy} onClick={() => void submit()}>
              {flow === "create" ? "Create workspace" : "Join workspace"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <Rocket className="h-3.5 w-3.5" /> Your data is isolated by Row Level Security.
        </p>
      </div>
    </div>
  );
}