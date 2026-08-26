import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";

/**
 * Supabase email-link landing target (/auth/callback).
 *
 * Confirmation links redirect here with #access_token=... — supabase-js
 * consumes the fragment automatically (detectSessionInUrl) and signs the user
 * in. This screen then routes based on REAL account state:
 *   - valid session + organization        -> /app
 *   - valid session + no organization yet -> /onboarding
 *   - error=access_denied / otp_expired   -> /login with an actionable notice
 */
export function AuthCallback() {
  const { authUser, booting, profile } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash.includes("error=access_denied")) {
      const expired = window.location.hash.includes("otp_expired");
      window.history.replaceState({}, "", window.location.pathname);
      navigate("/login", {
        replace: true,
        state: {
          authNotice: expired
            ? "Your email confirmation link is invalid or has expired. Links work only once — sign in with your password if the account is already confirmed, or register again to receive a fresh link."
            : "We could not verify your email link. Please try signing in, or register again.",
        },
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (!booting && authUser && profile) {
      navigate(profile.organizationId ? "/app" : "/onboarding", { replace: true });
    }
  }, [authUser, booting, profile, navigate]);

  // Safety net: if the session is valid but the profile row never hydrates
  // (e.g. transient network failure), continue to onboarding rather than
  // spinning forever — org-less accounts belong there anyway.
  useEffect(() => {
    if (booting || !authUser || profile) return;
    const t = window.setTimeout(() => navigate("/onboarding", { replace: true }), 5000);
    return () => window.clearTimeout(t);
  }, [authUser, booting, profile, navigate]);

  // No session at all -> nothing to verify here.
  useEffect(() => {
    if (!booting && !authUser && !window.location.hash.includes("access_token")) {
      navigate("/login", { replace: true });
    }
  }, [authUser, booting, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-4">
      <Logo />
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Loader2 className="h-4 w-4 animate-spin text-pulse-500" />
        Signing you in…
      </div>
    </div>
  );
}