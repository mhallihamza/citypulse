import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Database } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { hasSupabase } from "@/lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/Button";
// Public
import { Home } from "@/pages/public/Home";
import { PlatformPage } from "@/pages/public/Platform";
import { SolutionsPage } from "@/pages/public/Solutions";
import { AboutPage } from "@/pages/public/About";
// Auth
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Onboarding } from "@/pages/auth/Onboarding";
// App — City Overview
import { Dashboard } from "@/pages/app/Dashboard";
import { CityMapPage } from "@/pages/app/CityMapPage";
import { EventsPage } from "@/pages/app/EventsPage";
import { TicketsPage } from "@/pages/app/TicketsPage";
import { TicketDetail } from "@/pages/app/TicketDetail";
import { OperatorsPage } from "@/pages/app/OperatorsPage";
import { AiInsightsPage } from "@/pages/app/AiInsightsPage";
import { NotificationsPage } from "@/pages/app/NotificationsPage";
import { SettingsPage } from "@/pages/app/SettingsPage";
import { ServicePage } from "@/pages/app/ServicePage";
// Lighting (the implemented service)
import { LightingPage } from "@/pages/app/lighting/LightingPage";
import { LightingDevicesPage } from "@/pages/app/lighting/LightingDevicesPage";
import { LightingDeviceDetail } from "@/pages/app/lighting/LightingDeviceDetail";
import { LightingMapPage } from "@/pages/app/lighting/LightingMapPage";
import { LightingCommandsPage } from "@/pages/app/lighting/LightingCommandsPage";
// Traffic & Water (real services)
import { TrafficPage } from "@/pages/app/traffic/TrafficPage";
import { TrafficDevicesPage, TrafficDeviceDetail } from "@/pages/app/traffic/TrafficDevices";
import { WaterPage } from "@/pages/app/water/WaterPage";
import { WaterDevicesPage, WaterDeviceDetail } from "@/pages/app/water/WaterDevices";
import { NotFound } from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Shown instead of the platform when VITE_ credentials are missing. */
function NeedsConfig() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-ink-50 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-950 text-white">
        <Database className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-display text-xl font-bold text-ink-900">Connect your Supabase project</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
          CITYPULSE runs on real data only — there is no demo mode. Add{" "}
          <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>{" "}
          to <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">.env.local</code>, then run{" "}
          <span className="font-semibold">supabase/schema_full.sql</span> in the Supabase SQL Editor and restart the dev server.
        </p>
        <p className="mt-2 text-xs text-ink-400">
          Never place service-role keys, database passwords or MQTT secrets in VITE_ variables.
        </p>
      </div>
      <a href="/login">
        <Button variant="outline">Go to sign in</Button>
      </a>
    </div>
  );
}

/** Shown when the CITYPULSE schema has not been installed in Supabase yet. */
function SchemaSetup() {
  const { authUser, signOut } = useApp();
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-6 py-12">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 shadow-card">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Database className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink-900">Database schema not installed yet</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              You are signed in{authUser?.email ? <> as <span className="font-semibold">{authUser.email}</span></> : null} and the
              Supabase connection works, but the CITYPULSE tables do not exist in this project
              (<code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-xs">public.profiles</code> was not found).
              This happens when the schema SQL has not been run — or only partially run.
            </p>

            <ol className="mt-5 space-y-3 text-sm text-ink-700">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pulse-600 text-[11px] font-bold text-white">1</span>
                <span>
                  Open <span className="font-semibold">Supabase Studio</span> for this project and go to{" "}
                  <span className="font-semibold">SQL Editor</span>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pulse-600 text-[11px] font-bold text-white">2</span>
                <span>
                  Copy the whole file <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs">supabase/schema_full.sql</code>{" "}
                  from this project, paste it into the editor and press <span className="font-semibold">Run</span>.
                  It is idempotent — it safely creates everything that is missing (including your{" "}
                  <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-xs">profiles</code> row) and keeps existing data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pulse-600 text-[11px] font-bold text-white">3</span>
                <span>Come back here and press <span className="font-semibold">Reload</span> below.</span>
              </li>
            </ol>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()}>Reload after running the SQL</Button>
              <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
            </div>

            <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-relaxed text-ink-400">
              Never place service-role keys, database passwords or MQTT secrets in VITE_ variables.
              The publishable key in <code className="font-mono">.env.local</code> is all the browser needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { booting, authUser, schemaMissing, needsOnboarding } = useApp();
  if (!hasSupabase) return <NeedsConfig />;
  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pulse-500 border-t-transparent" />
      </div>
    );
  }
  if (!authUser) return <Navigate to="/login" replace />;
  if (schemaMissing) return <SchemaSetup />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={hasSupabase ? <Login /> : <NeedsConfig />} />
        <Route path="/register" element={hasSupabase ? <Register /> : <NeedsConfig />} />
        <Route path="/onboarding" element={hasSupabase ? <Onboarding /> : <NeedsConfig />} />

        {/* Operations platform */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* Global City Overview — NOT a lighting dashboard */}
          <Route index element={<Dashboard />} />
          <Route path="map" element={<CityMapPage />} />

          {/* Services: Lighting / Water / Traffic are live; Waste is a future module */}
          <Route path="lighting" element={<LightingPage />} />
          <Route path="lighting/devices" element={<LightingDevicesPage />} />
          <Route path="lighting/devices/:deviceId" element={<LightingDeviceDetail />} />
          <Route path="lighting/map" element={<LightingMapPage />} />
          <Route path="lighting/events" element={<EventsPage service="lighting" />} />
          <Route path="lighting/commands" element={<LightingCommandsPage />} />
          <Route path="lighting/tickets" element={<TicketsPage service="lighting" />} />

          {/* Water — real service */}
          <Route path="water" element={<WaterPage />} />
          <Route path="water/devices" element={<WaterDevicesPage />} />
          <Route path="water/devices/:deviceId" element={<WaterDeviceDetail />} />
          <Route path="water/events" element={<EventsPage service="water" />} />
          <Route path="water/tickets" element={<TicketsPage service="water" />} />

          {/* Traffic — real service */}
          <Route path="traffic" element={<TrafficPage />} />
          <Route path="traffic/devices" element={<TrafficDevicesPage />} />
          <Route path="traffic/devices/:deviceId" element={<TrafficDeviceDetail />} />
          <Route path="traffic/events" element={<EventsPage service="traffic" />} />
          <Route path="traffic/tickets" element={<TicketsPage service="traffic" />} />

          {/* Waste — future module */}
          <Route path="waste" element={<ServicePage service="waste" />} />

          {/* Operations */}
          <Route path="events" element={<EventsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetail />} />
          <Route path="operators" element={<OperatorsPage />} />

          {/* Intelligence */}
          <Route path="ai-insights" element={<AiInsightsPage />} />

          {/* System */}
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/:tab" element={<SettingsPage />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}