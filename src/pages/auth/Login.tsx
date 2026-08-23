import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Wifi, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { errMsg } from "@/lib/api";

export function AuthLeftPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-ink-950 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pulse-600/20 blur-3xl" />

      <Link to="/" className="relative">
        <Logo light />
      </Link>

      <div className="relative">
        <h2 className="font-display text-4xl font-bold leading-tight">Welcome back.</h2>
        <p className="mt-3 max-w-sm text-ink-300">
          Manage your city infrastructure from one intelligent platform.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-ink-400">
            <span className="inline-flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-pulse-400" /> Supabase Realtime</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-live-400" /> Fusion AI</span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            {[
              { h: "h-16", c: "bg-pulse-500/70" },
              { h: "h-24", c: "bg-pulse-600/80" },
              { h: "h-11", c: "bg-live-500/70" },
              { h: "h-20", c: "bg-pulse-700/70" },
            ].map((b, i) => (
              <div key={i} className={`w-10 ${b.h} ${b.c} animate-soft-pulse rounded-t-md`} style={{ animationDelay: `${i * 320}ms` }} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-live-400" />
            Organization-isolated data · Row Level Security enforced
          </div>
        </div>
      </div>

      <p className="relative text-xs text-ink-500">
        © {new Date().getFullYear()} CITYPULSE · Enterprise Smart City Platform
      </p>
    </div>
  );
}

/**
 * Login — real Supabase Auth (signInWithPassword). No demo accounts,
 * no stored passwords, no bypasses.
 */
export function Login() {
  const { signIn } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      navigate("/app");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthLeftPanel />
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/"><span className="inline-flex"><Logo /></span></Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Sign in to CITYPULSE</h1>
          <p className="mt-1 text-sm text-ink-500">Smart City Operations Platform</p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            <Field label="Work email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="you@city.gov"
                  autoComplete="email"
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-pulse-600 hover:text-pulse-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}