import type { AiInsight, AppNotification } from "@/lib/types";

const now = Date.now();
const MIN = 60_000;

export function seedNotifications(): AppNotification[] {
  return [
    { id: "NT-901", severity: "critical", title: "Critical lighting failure", message: "L-104 detected with lux 4.2 lx — see AI analysis.", read: false, ts: now - 2 * MIN, actionUrl: "/app/lighting/L-104" },
    { id: "NT-902", severity: "critical", title: "Overflow risk B-205", message: "Fill level 96% — immediate collection required.", read: false, ts: now - 5 * MIN, actionUrl: "/app/waste/B-205" },
    { id: "NT-903", severity: "warning", title: "Water leak probability increased", message: "Zone W2 pressure drop 0.6 bar in 6 minutes.", read: false, ts: now - 6 * MIN, actionUrl: "/app/water/W-03" },
    { id: "NT-904", severity: "warning", title: "Device went offline", message: "L-109 no heartbeat for 75 minutes.", read: true, ts: now - 75 * MIN, actionUrl: "/app/lighting/L-109" },
    { id: "NT-905", severity: "info", title: "AI generated recommendation", message: "Adaptive dimming could reduce energy use 12% in Zone L3.", read: false, ts: now - 22 * MIN, actionUrl: "/app/ai-insights" },
    { id: "NT-906", severity: "info", title: "Ticket assigned to you", message: "WAT-003 assigned to you by System.", read: true, ts: now - 6 * MIN, actionUrl: "/app/tickets/WAT-003" },
    { id: "NT-907", severity: "warning", title: "Congestion detected", message: "Density 78% on Boulevard Pasteur — peak corridor.", read: true, ts: now - 3 * MIN, actionUrl: "/app/traffic/T-12" },
    { id: "NT-908", severity: "info", title: "Collection completed", message: "Zone B1 route completed ahead of schedule.", read: true, ts: now - 260 * MIN, actionUrl: "/app/waste" },
  ];
}

export function seedInsights(): AiInsight[] {
  return [
    {
      id: "AI-201",
      title: "Lighting anomaly detected",
      service: "lighting",
      severity: "critical",
      confidence: 0.94,
      observation: "L-104 is commanding 100% brightness while emitting only 4.2 lx — output is 70% below the corridor baseline (≥12 lx).",
      evidence: [
        { label: "Lux", value: "4.2 lx" },
        { label: "Expected baseline", value: "≥ 12 lx" },
        { label: "Brightness command", value: "100%" },
        { label: "Night condition", value: "TRUE" },
      ],
      recommendation: "Inspect lamp L-104. Likely LED driver fault or fixture damage. Dispatch field operator to Rue Al Massira.",
      devices: ["L-104"],
      createdAt: now - 3 * MIN,
      status: "new",
    },
    {
      id: "AI-202",
      title: "Water leak probability increased",
      service: "water",
      severity: "warning",
      confidence: 0.78,
      observation: "Pressure in Zone W2 dropped 0.6 bar in 6 minutes while flow rose 18%, a classic leak signature in district feed WZ-2.",
      evidence: [
        { label: "Pressure delta", value: "-0.6 bar" },
        { label: "Flow delta", value: "+18%" },
        { label: "Night-flow model", value: "Above threshold" },
      ],
      recommendation: "Start acoustic survey near Rue Ibn Sina and validate with the closest isolation valve.",
      devices: ["W-03", "W-04", "W-11"],
      createdAt: now - 8 * MIN,
      status: "new",
    },
    {
      id: "AI-203",
      title: "Traffic congestion prediction",
      service: "traffic",
      severity: "warning",
      confidence: 0.81,
      observation: "Corridor density on Avenue Hassan II trending +9% for the hour; model predicts congestion index 74 within 25 minutes.",
      evidence: [
        { label: "Density trend", value: "+9% / hr" },
        { label: "Predicted index", value: "74 / 100" },
        { label: "Peak window", value: "17:15–18:30" },
      ],
      recommendation: "Pre-emptively adjust signal timing at junctions J-4 and J-5.",
      devices: ["T-05", "T-12"],
      createdAt: now - 12 * MIN,
      status: "new",
    },
    {
      id: "AI-204",
      title: "Waste collection optimization",
      service: "waste",
      severity: "info",
      confidence: 0.88,
      observation: "4 bins in Zone B4 exceed 80% fill. Merging 2 routes saves approx. 38 km per week while preventing 2 overflow events.",
      evidence: [
        { label: "Bins > 80%", value: "4" },
        { label: "Weekly distance saved", value: "≈ 38 km" },
        { label: "Overflow events avoided", value: "2 / wk" },
      ],
      recommendation: "Merge routes R-4 and R-6 on Thursday afternoons.",
      devices: ["B-218", "B-205", "B-219"],
      createdAt: now - 40 * MIN,
      status: "acknowledged",
    },
    {
      id: "AI-205",
      title: "Energy-saving opportunity",
      service: "lighting",
      severity: "info",
      confidence: 0.72,
      observation: "Zone L3 shows consistent low pedestrian activity after 01:00. Adaptive dimming to 60% maintains safety standard S4.",
      evidence: [
        { label: "Presence index", value: "0.08" },
        { label: "Suggested dim level", value: "60%" },
        { label: "Estimated savings", value: "12% / mo" },
      ],
      recommendation: "Apply dimming profile 01:00–05:00 to Zone L3 fixtures.",
      devices: ["L-118", "L-119", "L-120"],
      createdAt: now - 2 * 60 * MIN,
      status: "actioned",
    },
  ];
}