import type { AppData, Profile } from "@/lib/types";
import { buildDevices, seedTelemetry } from "@/lib/mock/core";
import { seedEvents, seedOperators, seedTickets } from "@/lib/mock/operational";
import { seedInsights, seedNotifications } from "@/lib/mock/intelligence";

export const demoProfile: Profile = {
  id: "usr-001",
  fullName: "Yassine El Amrani",
  email: "yassine.elamrani@casablanca-city.ma",
  organization: "Casablanca Urban Operations",
  organizationType: "municipality",
  role: "admin",
};

export function createInitialData(): AppData {
  const devices = buildDevices();
  return {
    profile: { ...demoProfile },
    devices,
    events: seedEvents(),
    tickets: seedTickets(),
    operators: seedOperators(),
    notifications: seedNotifications(),
    insights: seedInsights(),
    telemetry: seedTelemetry(devices),
  };
}