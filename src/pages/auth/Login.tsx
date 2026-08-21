import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, Eye, EyeOff, ShieldCheck, Wifi, Zap, Building2, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { LiveIndicator } from "@/components/ui/StatusDot";
import type { Profile } from "@/lib/types";

export function AuthLeftPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-ink-950 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-pulse-600/20 blur-3xl" />

      <Link to="/" className="relative">
        <span className="inline-flex items-center gap-2.5">
          <Logo light />
        </span>
      </Link>

      <div className="relative">
        <h2 className="font-display text-4xl font-bold leading-tight">Welcome back.</h2>
        <p className="mt-3 max-w-sm text-ink-300">
          Manage your city infrastructure from one intelligent platform.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-ink-400">
            <span className="inline-flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-pulse-400" /> Realtime</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-live-400" /> <LiveIndicator /></span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            {[
              { h: "h-16", c: "bg-pulse-500/70" },
              { h: "h-24", c: "bg-pulse-600/80" },
              { h: "h-11", c: "bg-live-500/70" },
              { h: "h-20", c: "bg-pulse-700/70" },
              { h: "h-14", c: "bg-pulse-500/60" },
              { h: "h-28", c: "bg-pulse-600/70" },
            ].map((b, i) => (
              <div key={i} className={`w-10 ${b.h} ${b.c} animate-soft-pulse rounded-t-md`} style={{ animationDelay: `${i * 320}ms` }} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-live-400" />
            98.2% infrastructure availability · events resolved on time
          </div>
        </div>
      </div>

      <p className="relative text-xs text-ink-500">
        © {new Date().getFullYear()} CITYPULSE Technologies · Enterprise Smart City Platform
      </p>
    </div>
  );
}

export function Login() {
  const { login, loginAs } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("yassine.elamrani@casablanca-city.ma");
  const [password, setPassword] = useState("citypulse-2026");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    login(email);
    navigate("/app");
  };

  const demo = (role: Profile["role"]) => {
    loginAs(role);
    navigate("/app");
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AuthLeftPanel />

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/"><span className="inline-flex"><Logo /></span></Link>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Sign In</h1>
          <p className="mt-1 text-sm text-ink-500">Access the CITYPULSE operations platform.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email">
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
                  placeholder="••••••••••"
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

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-600">
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-ink-300 text-pulse-600 accent-pulse-600" />
                Remember me
              </label>
              <button type="button" className="text-[13px] font-semibold text-pulse-600 hover:text-pulse-700">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" className="w-full">
              Sign In <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">Or</span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>

            <Button type="button" variant="outline" size="lg" className="w-full">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a7.2 7.2 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-pulse-600 hover:text-pulse-700">
              Request access
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-400">Explore a role-protected demo</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["admin", "supervisor", "operator", "viewer"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => demo(r)}
                  className="rounded-lg border border-ink-100 bg-white px-3 py-1.5 text-left text-xs font-semibold text-ink-700 transition-colors hover:border-pulse-300 hover:text-pulse-600"
                >
                  {r[0].toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}