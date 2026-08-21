import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { PublicLayout } from "@/components/layout/PublicLayout";
// Public
import { Home } from "@/pages/public/Home";
import { PlatformPage } from "@/pages/public/Platform";
import { SolutionsPage } from "@/pages/public/Solutions";
import { AboutPage } from "@/pages/public/About";
// Auth
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Onboarding } from "@/pages/auth/Onboarding";
// App
import { Dashboard } from "@/pages/app/Dashboard";
import { CityMapPage } from "@/pages/app/CityMapPage";
import { ServicePage } from "@/pages/app/ServicePage";
import { DeviceDetail } from "@/pages/app/DeviceDetail";
import { EventsPage } from "@/pages/app/EventsPage";
import { TicketsPage } from "@/pages/app/TicketsPage";
import { TicketDetail } from "@/pages/app/TicketDetail";
import { OperatorsPage } from "@/pages/app/OperatorsPage";
import { AiInsightsPage } from "@/pages/app/AiInsightsPage";
import { AnalyticsPage } from "@/pages/app/AnalyticsPage";
import { DevicesPage } from "@/pages/app/DevicesPage";
import { NotificationsPage } from "@/pages/app/NotificationsPage";
import { SettingsPage } from "@/pages/app/SettingsPage";
import { NotFound } from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, demoMode } = useApp();
  if (!user && !demoMode) return <Navigate to="/login" replace />;
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Operations platform */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="map" element={<CityMapPage />} />
          <Route path="lighting" element={<ServicePage service="lighting" />} />
          <Route path="water" element={<ServicePage service="water" />} />
          <Route path="waste" element={<ServicePage service="waste" />} />
          <Route path="traffic" element={<ServicePage service="traffic" />} />
          <Route path=":service/:deviceId" element={<DeviceDetail />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:ticketId" element={<TicketDetail />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="ai-insights" element={<AiInsightsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="users" element={<SettingsPage tab="users" />} />
          <Route path="settings" element={<SettingsPage tab="profile" />} />
          <Route path="settings/:tab" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}