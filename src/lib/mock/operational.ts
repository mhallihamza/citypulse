import type { CityEvent, Operator, Ticket, TicketStatus } from "@/lib/types";
import { mulberry32 } from "@/lib/utils";

const now = Date.now();
const MIN = 60_000;

export function seedEvents(): CityEvent[] {
  const e = (
    id: string,
    service: CityEvent["service"],
    deviceId: string,
    title: string,
    severity: CityEvent["severity"],
    status: CityEvent["status"],
    ageMin: number,
    detail: string
  ): CityEvent => ({
    id,
    service,
    deviceId,
    title,
    severity,
    status,
    detail,
    createdAt: now - ageMin * MIN,
    acknowledgedAt: status !== "new" ? now - (ageMin - 3) * MIN : undefined,
    resolvedAt: status === "resolved" ? now - (ageMin - 12) * MIN : undefined,
    source: id.includes("AI") ? "ai" : id.includes("OP") ? "operator" : "realtime",
  });

  return [
    e("EV-1041", "lighting", "L-104", "Lamp failure detected", "critical", "new", 2, "Lux 4.2 lx vs. expected ~14 lx. Brightness commanded at 100%."),
    e("EV-2103", "water", "W-03", "Possible water leak", "warning", "new", 6, "Pressure dropped 0.6 bar in Zone W2 over 6 minutes."),
    e("EV-3182", "waste", "B-218", "Bin approaching capacity", "warning", "new", 11, "Fill level 87% · collection recommended today."),
    e("EV-4055", "traffic", "T-05", "Traffic normalized", "info", "new", 14, "Congestion on Avenue Hassan II returned to normal levels."),
    e("EV-1099", "lighting", "L-127", "Electrical fault", "critical", "acknowledged", 38, "Feeder panel F-3 tripped; 4 fixtures affected."),
    e("EV-2120", "water", "W-11", "Pressure drop", "warning", "acknowledged", 130, "Pressure below 3.0 bar during peak consumption."),
    e("EV-3105", "waste", "B-201", "Collection completed", "info", "resolved", 260, "Zone B1 route completed ahead of schedule."),
    e("EV-4018", "traffic", "T-12", "Congestion detected", "warning", "new", 3, "Density 78% on Boulevard Pasteur between 17:00–18:00."),
    e("EV-1090", "lighting", "L-109", "Lamp offline", "critical", "acknowledged", 75, "No heartbeat received in 75 minutes."),
    e("EV-2100", "water", "W-08", "Consumption anomaly", "info", "resolved", 320, "Night-flow anomaly resolved — meter re-calibrated."),
    e("EV-3099", "waste", "B-205", "Overflow risk", "critical", "new", 5, "Fill level 96% · overflow probability high within 2 hours."),
    e("EV-1055", "lighting", "L-118", "Adaptive dimming active", "info", "resolved", 190, "Dimming profile applied after 00:30."),
  ];
}

const tk = (
  id: string,
  title: string,
  service: Ticket["service"],
  priority: Ticket["priority"],
  status: Ticket["status"],
  deviceId: string | undefined,
  operatorId: string | undefined,
  ageMin: number,
  desc: string,
  aiAnalysis: string | undefined,
  comments: Ticket["comments"],
  timelineExtra: [number, string, string][]
): Ticket => {
  const timeline: Ticket["timeline"] = [
    { ts: now - ageMin * MIN, label: "Ticket created from event", actor: "System" },
    ...timelineExtra.map(([m, label, actor]) => ({ ts: now - m * MIN, label, actor })),
  ];
  return {
    id,
    title,
    service,
    priority,
    status,
    deviceId,
    operatorId,
    createdBy: "CITYPULSE AI",
    createdAt: now - ageMin * MIN,
    updatedAt: now - Math.max(1, ageMin - 4) * MIN,
    description: desc,
    aiAnalysis,
    comments,
    timeline,
    attachmentCount: priority === "critical" ? 2 : 1,
    resolution: status === "resolved" ? "Confirmed repaired on site. Firmware updated to v4.2.2." : undefined,
  };
};

const rnd = mulberry32(4242);
void rnd;

export function seedTickets(): Ticket[] {
  return [
    tk("LGT-104", "Lamp failure", "lighting", "critical", "open", "L-104", "op-1", 2,
      "L-104 reports lux of 4.2 lx while brightness is commanded at 100%. Light output significantly below expected levels.",
      "Lighting output is significantly below expected levels. Lux 4.2 vs. expected ≥12. Likely LED driver fault or fixture damage.",
      [{ id: "c1", author: "Ahmed B.", body: "Heading to location now, will inspect fixture and driver.", ts: now - 4 * MIN }],
      [[4, "Assigned to Ahmed B.", "Supervisor"]]),
    tk("WAT-003", "Possible water leak", "water", "high", "in_progress", "W-03", "op-2", 7,
      "Pressure drop of 0.6 bar detected in Zone W2. Flow anomaly near Rue Ibn Sina.",
      "Leak probability increased from 12% to 58% in the last 30 minutes based on pressure/flow ratio.",
      [],
      [[6, "Assigned to Sara K.", "System"], [2, "Acoustic survey started", "Sara K."]]),
    tk("WST-218", "Bin collection request", "waste", "high", "in_progress", "B-218", "op-3", 12,
      "B-218 at 87% fill. Collection recommended today; overflow risk within 48 hours.",
      undefined,
      [{ id: "c2", author: "Youssef M.", body: "Adding B-218 to this afternoon's route R-4.", ts: now - 5 * MIN }],
      [[10, "Added to route R-4", "Youssef M."]]),
    tk("TRF-005", "Congestion on Avenue Hassan II", "traffic", "medium", "open", "T-05", undefined, 16,
      "Density 62% with corridor travel time above average. Monitor during peak hours.",
      undefined, [], []),
    tk("LGT-127", "Electrical fault — feeder F-3", "lighting", "critical", "in_progress", "L-127", "op-4", 45,
      "Feeder panel F-3 tripped. 4 fixtures reported offline.",
      undefined,
      [{ id: "c3", author: "Leila T.", body: "Panel inspected — replacing contactor.", ts: now - 20 * MIN }],
      [[40, "Assigned to Leila T.", "System"], [18, "Spare part requested", "Leila T."]]),
    tk("WAT-011", "Pressure anomaly in Zone W4", "water", "medium", "open", "W-11", undefined, 140,
      "Pressure below 3.0 bar during peak hours. Possibly valve throttling.",
      undefined, [], []),
    tk("WST-205", "Overflow risk B-205", "waste", "critical", "open", "B-205", undefined, 6,
      "Fill level 96%. Immediate collection required.",
      "Overflow probability estimated at 82% within the next 2 hours if no collection occurs.",
      [], []),
    tk("TRF-012", "Congestion — Boulevard Pasteur", "traffic", "high", "resolved", "T-12", "op-5", 320,
      "Prolonged congestion detected. Signal timing adjusted.",
      undefined,
      [{ id: "c4", author: "Omar R.", body: "Signal plan revised; re-check at 18:00.", ts: now - 200 * MIN }],
      [[300, "Assigned to Omar R.", "System"], [180, "Signal timing adjusted", "Omar R."]]),
    tk("LGT-109", "Lamp offline", "lighting", "high", "resolved", "L-109", "op-1", 480,
      "No heartbeat for 75 minutes. Device reconnected after power cycle.",
      undefined, [],
      [[420, "Assigned to Ahmed B.", "System"], [90, "Reconnected after power cycle", "Ahmed B."]]),
  ];
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  reopened: "Reopened",
};

const now2 = Date.now();

export function seedOperators(): Operator[] {
  return [
    { id: "op-1", name: "Ahmed B.", initials: "AB", role: "field_operator", status: "available", email: "ahmed.b@citypulse.ops", phone: "+212 6 61 00 11 02", service: "lighting", currentTickets: 2, resolvedTotal: 184, avgResolutionMin: 68, lastActivity: now2 - 4 * MIN },
    { id: "op-2", name: "Sara K.", initials: "SK", role: "field_operator", status: "on_assignment", email: "sara.k@citypulse.ops", phone: "+212 6 61 00 11 07", service: "water", currentTickets: 1, resolvedTotal: 132, avgResolutionMin: 54, lastActivity: now2 - 2 * MIN },
    { id: "op-3", name: "Youssef M.", initials: "YM", role: "field_operator", status: "available", email: "youssef.m@citypulse.ops", phone: "+212 6 61 00 11 12", service: "waste", currentTickets: 1, resolvedTotal: 219, avgResolutionMin: 42, lastActivity: now2 - 9 * MIN },
    { id: "op-4", name: "Leila T.", initials: "LT", role: "field_operator", status: "on_assignment", email: "leila.t@citypulse.ops", phone: "+212 6 61 00 11 19", service: "lighting", currentTickets: 3, resolvedTotal: 96, avgResolutionMin: 88, lastActivity: now2 - 18 * MIN },
    { id: "op-5", name: "Omar R.", initials: "OR", role: "supervisor", status: "available", email: "omar.r@citypulse.ops", phone: "+212 6 61 00 11 25", service: "all", currentTickets: 1, resolvedTotal: 311, avgResolutionMin: 51, lastActivity: now2 - 35 * MIN },
    { id: "op-6", name: "Nadia F.", initials: "NF", role: "supervisor", status: "offline", email: "nadia.f@citypulse.ops", phone: "+212 6 61 00 11 31", service: "all", currentTickets: 0, resolvedTotal: 268, avgResolutionMin: 47, lastActivity: now2 - 160 * MIN },
  ];
}