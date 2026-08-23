import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, Eye, EyeOff, Lock, Mail, Ticket as TicketIcon, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { AuthLeftPanel } from "@/pages/auth/Login";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { errMsg } from "@/lib/api";
import { cn } from "@/lib/utils";

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", ok ? "text-live-700" : "text-ink-400")}>
      <Check className={cn("h-3.5 w-3.5", ok ? "text-live-600" : "text-ink-300")} />
      {label}
    </li>
  );
}

type Flow = "create" | "join";

/**
 * Registration — real Supabase Auth.
 * Flow A ("create"): after sign-up the user creates a NEW organization and
 * becomes its ADMIN (via the register_organization RPC).
 * Flow B ("join"): the user signs up and then joins an EXISTING organization
 * using an admin-issued invite code bound to their email — typing an org name
 * is never enough to join it.
 */
export function Register() {
  const { signUp } = useApp();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<Flow>("create");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const pw = form.password;
  const checks = {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    num: /\d/.test(pw),
    sym: /[^A-Za-z0-9]/.test(pw),
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.includes("@")) {
      setError("Please provide your full name and a valid work email.");
      return;
    }
    if (!Object.values(checks).every(Boolean)) {
      setError("Password does not meet the security requirements.");
      return;
    }
    if (pw !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { needsConfirmation } = await signUp(form.fullName.trim(), form.email.trim(), pw);
      if (needsConfirmation) {
        setConfirmSent(true);
      } else {
        navigate("/onboarding", { state: { flow } });
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="flex min-h-screen bg-white">
        <AuthLeftPanel />
        <div className="flex flex-1 items-center justify-center px-4 sm:px-10">
          <div className="max-w-md rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pulse-50 text-pulse-600">
              <Mail className="h-6 w-6" />
            </span>
            <h1 className="mt-4 font-display text-xl font-bold text-ink-950">Confirm your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              We sent a confirmation link to <span className="font-semibold text-ink-800">{form.email}</span>.
              Confirm your address, sign in, then finish setting up your organization.
            </p>
            <Link to="/login" className="mt-6 inline-block">
              <Button variant="outline">Back to sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AuthLeftPanel />
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <Link to="/"><Logo /></Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Create your CITYPULSE account</h1>
          <p className="mt-1 text-sm text-ink-500">Smart City Operations Platform · multi-tenant SaaS</p>

          {/* Flow selector */}
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
                <span className="block text-[11px] text-ink-500">New tenant · you become admin</span>
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
                <span className="block text-[13px] font-bold text-ink-900">Join existing organization</span>
                <span className="block text-[11px] text-ink-500">Requires an invite code</span>
              </span>
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input value={form.fullName} onChange={set("fullName")} className="pl-9" placeholder="Yassine El Amrani" />
              </div>
            </Field>
            <Field label="Work email" className="sm:col-span-2">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type="email" value={form.email} onChange={set("email")} className="pl-9" placeholder="you@city.gov" autoComplete="email" />
              </div>
            </Field>

            {flow === "join" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 sm:col-span-2">
                After confirming your account you will be asked for an <strong>invite code</strong> issued by an
                administrator of the organization. You cannot join by typing the organization name.
              </div>
            )}

            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type={show ? "text" : "password"} value={form.password} onChange={set("password")} className="pl-9 pr-10" placeholder="Min. 8 characters" autoComplete="new-password" />
              </div>
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} className="pl-9 pr-10" placeholder="Repeat password" autoComplete="new-password" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" aria-label="Toggle password visibility">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="rounded-lg border border-ink-100 bg-ink-50/60 p-3 sm:col-span-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Password security requirements</div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <PasswordCheck ok={checks.len} label="At least 8 characters" />
                <PasswordCheck ok={checks.upper} label="One uppercase letter" />
                <PasswordCheck ok={checks.num} label="One number" />
                <PasswordCheck ok={checks.sym} label="One symbol" />
              </ul>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 sm:col-span-2">{error}</div>
            )}

            <Button type="submit" size="lg" loading={busy} className="sm:col-span-2">
              Create Account <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have access?{" "}
            <Link to="/login" className="font-semibold text-pulse-600 hover:text-pulse-700">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}