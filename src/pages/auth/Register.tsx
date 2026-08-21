import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, User, Building2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { AuthLeftPanel } from "@/pages/auth/Login";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function PasswordCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-1.5 text-xs", ok ? "text-live-700" : "text-ink-400")}>
      <Check className={cn("h-3.5 w-3.5", ok ? "text-live-600" : "text-ink-300")} />
      {label}
    </li>
  );
}

export function Register() {
  const { register } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    organization: "",
    role: "",
    password: "",
    confirm: "",
  });
  const [orgType, setOrgType] = useState<Profile["organizationType"]>("municipality");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const pw = form.password;
  const checks = {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    num: /\d/.test(pw),
    sym: /[^A-Za-z0-9]/.test(pw),
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
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
    setError("");
    register({
      fullName: form.fullName,
      email: form.email,
      organization: form.organization || "City Operations",
      orgType,
      role: form.role || "operator",
    });
    navigate("/onboarding");
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthLeftPanel />
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <Link to="/"><span className="inline-flex"><Logo /></span></Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Request access</h1>
          <p className="mt-1 text-sm text-ink-500">Create your CITYPULSE organization workspace.</p>

          <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input value={form.fullName} onChange={set("fullName")} className="pl-9" placeholder="Yassine El Amrani" />
              </div>
            </Field>
            <Field label="Work email" className="sm:col-span-2">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type="email" value={form.email} onChange={set("email")} className="pl-9" placeholder="you@city.gov" />
              </div>
            </Field>
            <Field label="Organization">
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input value={form.organization} onChange={set("organization")} className="pl-9" placeholder="Casablanca Urban Operations" />
              </div>
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={set("role")}>
                <option value="">Select role…</option>
                <option value="operator">Operator</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>

            <Field label="Organization type" className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["municipality", "Municipality"],
                  ["infrastructure_company", "Infrastructure company"],
                  ["technology_provider", "Technology provider"],
                  ["other", "Other"],
                ] as [Profile["organizationType"], string][]).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setOrgType(val)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors",
                      orgType === val
                        ? "border-pulse-400 bg-pulse-50 text-pulse-700"
                        : "border-ink-200 text-ink-600 hover:border-ink-300"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type={show ? "text" : "password"} value={form.password} onChange={set("password")} className="pl-9 pr-10" placeholder="Min. 8 characters" />
              </div>
            </Field>
            <Field label="Confirm password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} className="pl-9 pr-10" placeholder="Repeat password" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" aria-label="Toggle password visibility">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <div className="sm:col-span-2 rounded-lg border border-ink-100 bg-ink-50/60 p-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Password security requirements</div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <PasswordCheck ok={checks.len} label="At least 8 characters" />
                <PasswordCheck ok={checks.upper} label="One uppercase letter" />
                <PasswordCheck ok={checks.num} label="One number" />
                <PasswordCheck ok={checks.sym} label="One symbol" />
              </ul>
            </div>

            {error && (
              <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" className="sm:col-span-2">
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