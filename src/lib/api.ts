import { supabase } from "@/lib/supabase";
import type {
  AiInsight,
  AppNotification,
  CityEvent,
  CommandStatus,
  Device,
  DeviceCommand,
  EntityStatus,
  EventStatus,
  InsightStatus,
  LightingState,
  Location as OrgLocation,
  Organization,
  OrgService,
  Operator,
  Profile,
  Role,
  ServiceId,
  TelemetrySample,
  Ticket,
  TicketAssignment,
  TicketComment,
  TicketPriority,
  TicketStatus,
  TrafficState,
  WaterState,
  WasteState,
} from "@/lib/types";

/**
 * CITYPULSE data-access layer — typed queries & mappers against Supabase.
 * Every query is organization-scoped: the API key (RLS) enforces that rows
 * belong to the caller's organization; org_id filters are added for clarity.
 */

function toMs(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Date.parse(v);
  return Number.isNaN(n) ? null : n;
}

function toNum(v: unknown): number | null {
  return typeof v === "number" ? v : v == null ? null : Number(v);
}

// ---------------------------------------------------------------------------
// Raw row shapes (snake_case columns, as stored)
// ---------------------------------------------------------------------------

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  region: string | null;
}
interface ProfileRow {
  id: string;
  organization_id: string | null;
  full_name: string;
  email: string;
  role: string;
}
interface ServiceRow {
  name: ServiceId;
  label: string;
  enabled: boolean;
}
interface LocationRow {
  id: string;
  org_id: string;
  label: string;
  zone: string;
  district: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
}
interface DeviceRow {
  id: string;
  org_id: string;
  service: ServiceId;
  location_id: string | null;
  device_key: string;
  display_id: string;
  display_name: string | null;
  type: string;
  firmware: string | null;
  mqtt_topic: string | null;
  status: EntityStatus;
  mode: string;
  connection: boolean | null;
  signal: string | number | null;
  battery: string | number | null;
  last_heartbeat: string | null;
  last_telemetry: string | null;
  metadata: Record<string, unknown> | null;
}
interface StateRow {
  device_id: string;
  mode: string;
  brightness: number | null;
  lux: string | number | null;
  presence: boolean | null;
  night: boolean | null;
  lamp_failure: boolean | null;
  online: boolean | null;
  last_seen: string | null;
}
export type TelemetryTable = "lighting_telemetry" | "traffic_telemetry" | "water_telemetry" | "waste_telemetry";

interface LightingTelRow {
  device_id: string;
  ts: string;
  lux: string | number | null;
  brightness: string | number | null;
  presence: boolean | null;
  night: boolean | null;
  mode: string | null;
  lamp_failure: boolean | null;
}
interface TrafficTelRow {
  device_id: string;
  ts: string;
  state: string | null;
  vehicle_count: number | null;
  density: string | number | null;
  overdue_vehicles: number | null;
  tmax: string | number | null;
}
interface WaterTelRow {
  device_id: string;
  ts: string;
  flow: string | number | null;
  pressure: string | number | null;
  leakage: boolean | null;
  state: string | null;
  sensor_status: string | null;
  reference_pressure: string | number | null;
  pressure_drop: string | number | null;
  pressure_drop_percent: string | number | null;
}
interface WasteTelRow {
  device_id: string;
  ts: string;
  fill_level: string | number | null;
  temperature: string | number | null;
  humidity: string | number | null;
  hand_detected: boolean | null;
  status: string | null;
  state: string | null;
}
interface TrafficStateRow {
  device_id: string;
  vehicle_count: number | null;
  overdue_vehicles: number | null;
  density: string | number | null;
  congestion: string | number | null;
  tmax: string | number | null;
  state: string;
  online: boolean | null;
  last_seen: string | null;
}
interface WaterStateRow {
  device_id: string;
  flow: string | number | null;
  pressure: string | number | null;
  leakage: boolean | null;
  state: string;
  sensor_status: string | null;
  reference_pressure: string | number | null;
  pressure_drop: string | number | null;
  pressure_drop_percent: string | number | null;
  online: boolean | null;
  last_seen: string | null;
}
interface WasteStateRow {
  device_id: string;
  level: string | number | null;
  temperature: string | number | null;
  humidity: string | number | null;
  status: string;
  hand_detected: boolean | null;
  online: boolean | null;
  last_seen: string | null;
}
interface EventRow {
  id: string;
  org_id: string;
  service: ServiceId;
  device_id: string | null;
  device_key: string | null;
  event_type: string;
  title: string;
  severity: "critical" | "warning" | "info";
  status: EventStatus;
  detail: string | null;
  source: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  // ESP32 event extensions (unified events table)
  previous_state: string | null;
  current_state: string | null;
  sensor_status: string | null;
  ts: string | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  payload: Record<string, unknown> | null;
}
interface TicketRow {
  id: string;
  ticket_key: string;
  title: string;
  service: ServiceId;
  priority: TicketPriority;
  status: TicketStatus;
  device_id: string | null;
  assigned_to: string | null;
  description: string | null;
  ai_analysis: string | null;
  resolution: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
interface CommentRow {
  id: string;
  ticket_id: string;
  author: string;
  body: string;
  created_at: string;
}
interface NotificationRow {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string | null;
  read: boolean | null;
  action_url: string | null;
  created_at: string;
}
interface InsightRow {
  id: string;
  service: ServiceId;
  title: string;
  severity: "critical" | "warning" | "info";
  confidence: string | number | null;
  observation: string;
  evidence: unknown;
  recommendation: string;
  devices: string[];
  status: InsightStatus;
  created_at: string;
}
interface CommandRow {
  id: string;
  device_id: string;
  command: string;
  payload: Record<string, unknown>;
  status: CommandStatus;
  requested_by: string | null;
  requested_at: string;
  delivered_at: string | null;
  ack_at: string | null;
  error: string | null;
}
interface InviteRow {
  id: string;
  invite_code: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  created_at: string;
  expires_at: string;
}
interface OperatorRow {
  id: string;
  org_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  service: ServiceId | null;
  status: string;
  current_tickets: number;
  resolved_total: number;
  avg_resolution_min: number;
  last_activity: string | null;
}
interface TicketAssignmentRow {
  id: string;
  org_id: string;
  ticket_id: string;
  operator_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: (row.role as Role) ?? "viewer",
    organizationId: row.organization_id,
  };
}

export function mapOrganization(row: OrgRow): Organization {
  return { id: row.id, name: row.name, slug: row.slug, type: row.type, region: row.region };
}

export function mapDevice(row: DeviceRow, loc: LocationRow | null): Device {
  return {
    id: row.id,
    deviceKey: row.device_key,
    displayId: row.display_id,
    displayName: row.display_name ?? row.display_id,
    service: row.service,
    type: row.type,
    locationId: row.location_id,
    zone: loc?.zone ?? "—",
    district: loc?.district ?? null,
    locationLabel: loc?.label ?? null,
    latitude: loc?.latitude != null ? Number(loc.latitude) : null,
    longitude: loc?.longitude != null ? Number(loc.longitude) : null,
    firmware: row.firmware ?? "v1.0.0",
    mqttTopic: row.mqtt_topic,
    status: row.status,
    mode: row.mode,
    online: Boolean(row.connection),
    signal: toNum(row.signal),
    battery: toNum(row.battery),
    lastHeartbeat: toMs(row.last_heartbeat),
    lastTelemetry: toMs(row.last_telemetry),
    metadata: row.metadata ?? {},
  };
}

export function mapState(row: StateRow): LightingState {
  return {
    deviceId: row.device_id,
    mode: row.mode,
    brightness: row.brightness ?? 0,
    lux: toNum(row.lux),
    presence: Boolean(row.presence),
    night: Boolean(row.night),
    lampFailure: Boolean(row.lamp_failure),
    online: Boolean(row.online),
    lastSeen: toMs(row.last_seen) ?? Date.now(),
  };
}

export function mapTelemetryRow(table: TelemetryTable, raw: Record<string, unknown>): TelemetrySample {
  const ts = Date.parse((raw as { ts?: string }).ts ?? "") || Date.now();
  if (table === "lighting_telemetry") {
    const r = raw as unknown as LightingTelRow;
    return {
      ts,
      lux: toNum(r.lux) ?? undefined,
      brightness: toNum(r.brightness) ?? undefined,
      presence: r.presence === null || r.presence === undefined ? undefined : Number(r.presence),
      night: r.night === null ? undefined : Boolean(r.night),
      mode: r.mode ?? undefined,
      lampFailure: r.lamp_failure === null ? undefined : Boolean(r.lamp_failure),
    };
  }
  if (table === "traffic_telemetry") {
    const r = raw as unknown as TrafficTelRow;
    return {
      ts,
      state: r.state ?? undefined,
      vehicleCount: r.vehicle_count ?? undefined,
      density: toNum(r.density) ?? undefined,
      overdueVehicles: r.overdue_vehicles ?? undefined,
      tmax: toNum(r.tmax) ?? undefined,
    };
  }
  if (table === "water_telemetry") {
    const r = raw as unknown as WaterTelRow;
    return {
      ts,
      flow: toNum(r.flow) ?? undefined,
      pressure: toNum(r.pressure) ?? undefined,
      leakage: r.leakage === null || r.leakage === undefined ? undefined : Boolean(r.leakage),
      state: r.state ?? undefined,
      sensorStatus: r.sensor_status ?? undefined,
      referencePressure: toNum(r.reference_pressure) ?? undefined,
      pressureDrop: toNum(r.pressure_drop) ?? undefined,
      pressureDropPercent: toNum(r.pressure_drop_percent) ?? undefined,
    };
  }
  const r = raw as unknown as WasteTelRow;
  return {
    ts,
    fillLevel: toNum(r.fill_level) ?? undefined,
    temperature: toNum(r.temperature) ?? undefined,
    humidity: toNum(r.humidity) ?? undefined,
    handDetected: r.hand_detected === null || r.hand_detected === undefined ? undefined : Boolean(r.hand_detected),
  };
}

export function mapWasteState(row: WasteStateRow): WasteState {
  return {
    deviceId: row.device_id,
    level: toNum(row.level) ?? undefined,
    temperature: toNum(row.temperature) ?? undefined,
    humidity: toNum(row.humidity) ?? undefined,
    status: row.status,
    handDetected: Boolean(row.hand_detected),
    online: Boolean(row.online),
    lastSeen: toMs(row.last_seen) ?? Date.now(),
  };
}

export function mapTrafficState(row: TrafficStateRow): TrafficState {
  return {
    deviceId: row.device_id,
    vehicleCount: row.vehicle_count ?? 0,
    overdueVehicles: row.overdue_vehicles ?? 0,
    density: toNum(row.density),
    tmax: toNum(row.tmax),
    state: row.state,
    online: Boolean(row.online),
    lastSeen: toMs(row.last_seen) ?? Date.now(),
  };
}

export function mapWaterState(row: WaterStateRow): WaterState {
  return {
    deviceId: row.device_id,
    flow: toNum(row.flow),
    pressure: toNum(row.pressure),
    leakage: Boolean(row.leakage),
    state: row.state,
    sensorStatus: row.sensor_status,
    referencePressure: toNum(row.reference_pressure),
    pressureDrop: toNum(row.pressure_drop),
    pressureDropPercent: toNum(row.pressure_drop_percent),
    online: Boolean(row.online),
    lastSeen: toMs(row.last_seen) ?? Date.now(),
  };
}

export function mapEvent(row: EventRow): CityEvent {
  return {
    id: row.id,
    service: row.service,
    deviceId: row.device_id,
    deviceKey: row.device_key,
    eventType: row.event_type,
    title: row.title,
    severity: row.severity,
    status: row.status,
    detail: row.detail,
    source: row.source,
    createdAt: Date.parse(row.created_at),
    acknowledgedAt: toMs(row.acknowledged_at),
    resolvedAt: toMs(row.resolved_at),
    previousState: row.previous_state,
    currentState: row.current_state,
    sensorStatus: row.sensor_status,
    eventTs: toMs(row.ts),
  };
}

export function mapTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    ticketKey: row.ticket_key,
    title: row.title,
    service: row.service,
    priority: row.priority,
    status: row.status,
    deviceId: row.device_id,
    assignedTo: row.assigned_to,
    assigneeName: null,
    description: row.description,
    aiAnalysis: row.ai_analysis,
    resolution: row.resolution,
    createdBy: row.created_by,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  };
}

export function mapComment(row: CommentRow): TicketComment {
  return { id: row.id, ticketId: row.ticket_id, author: row.author, body: row.body, createdAt: Date.parse(row.created_at) };
}

export function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    read: Boolean(row.read),
    ts: Date.parse(row.created_at),
    actionUrl: row.action_url,
  };
}

export function mapInsight(row: InsightRow): AiInsight {
  const evidence = Array.isArray(row.evidence)
    ? row.evidence.map((e) => (typeof e === "object" && e !== null ? e : { label: "detail", value: String(e) }))
    : [];
  return {
    id: row.id,
    title: row.title,
    service: row.service,
    severity: row.severity,
    confidence: toNum(row.confidence) ?? 0,
    observation: row.observation,
    evidence: evidence as { label: string; value: string }[],
    recommendation: row.recommendation,
    devices: row.devices ?? [],
    createdAt: Date.parse(row.created_at),
    status: row.status,
  };
}

export function mapCommand(row: CommandRow): DeviceCommand {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceKey: "",
    command: row.command,
    payload: row.payload ?? {},
    status: row.status,
    requestedBy: row.requested_by,
    requestedByName: null,
    requestedAt: Date.parse(row.requested_at),
    deliveredAt: toMs(row.delivered_at),
    ackAt: toMs(row.ack_at),
    error: row.error,
  };
}

export function mapInvite(row: InviteRow): { id: string; code: string; email: string; role: string; status: "PENDING" | "ACCEPTED" | "REVOKED"; createdAt: number; expiresAt: number } {
  return {
    id: row.id,
    code: row.invite_code,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: Date.parse(row.created_at),
    expiresAt: Date.parse(row.expires_at),
  };
}

export function mapOperator(row: OperatorRow): Operator {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    service: row.service,
    status: row.status,
    currentTickets: row.current_tickets ?? 0,
    resolvedTotal: row.resolved_total ?? 0,
    avgResolutionMin: row.avg_resolution_min ?? 0,
    lastActivity: toMs(row.last_activity),
  };
}

export function mapTicketAssignment(row: TicketAssignmentRow): TicketAssignment {
  return {
    id: row.id,
    orgId: row.org_id,
    ticketId: row.ticket_id,
    operatorId: row.operator_id,
    assignedBy: row.assigned_by,
    assignedAt: Date.parse(row.assigned_at),
  };
}

// ---------------------------------------------------------------------------
// Reads (all organization-scoped)
// ---------------------------------------------------------------------------

export async function fetchProfileByUserId(userId: string | undefined): Promise<Profile | null> {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as ProfileRow) : null;
}

export async function fetchOrganization(orgId: string | null): Promise<Organization | null> {
  if (!supabase || !orgId) return null;
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
  if (error) throw error;
  return data ? mapOrganization(data as OrgRow) : null;
}

export async function fetchServices(orgId: string | null): Promise<OrgService[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase
    .from("services")
    .select("name, label, enabled")
    .eq("organization_id", orgId)
    .order("label");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    name: r.name as ServiceId,
    label: r.label,
    enabled: Boolean(r.enabled),
  }));
}

export async function fetchLocations(orgId: string | null): Promise<OrgLocation[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("locations").select("*").eq("org_id", orgId).order("label");
  if (error) throw error;
  return (data ?? []).map((r: LocationRow) => ({
    id: r.id,
    orgId: r.org_id,
    label: r.label,
    zone: r.zone,
    district: r.district,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
  }));
}

export async function fetchDevices(orgId: string | null): Promise<Device[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase
    .from("devices")
    .select("*, locations(label, zone, district, latitude, longitude)")
    .eq("org_id", orgId)
    .order("device_key", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const { locations: loc, ...dev } = r as DeviceRow & { locations: LocationRow | null };
    return mapDevice(dev, loc);
  });
}

export async function fetchLightingStates(orgId: string | null): Promise<LightingState[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("lighting_states").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((r: StateRow) => mapState(r));
}

export async function fetchTrafficStates(orgId: string | null): Promise<TrafficState[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("traffic_states").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((r: TrafficStateRow) => mapTrafficState(r));
}

export async function fetchWaterStates(orgId: string | null): Promise<WaterState[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("water_states").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((r: WaterStateRow) => mapWaterState(r));
}

export async function fetchWasteStates(orgId: string | null): Promise<WasteState[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("waste_states").select("*").eq("org_id", orgId);
  if (error) throw error;
  return (data ?? []).map((r: WasteStateRow) => mapWasteState(r));
}

export async function fetchTelemetry(
  orgId: string | null,
  deviceIds: string[],
  limit = 60
): Promise<Record<string, TelemetrySample[]>> {
  if (!supabase || !orgId || !deviceIds.length) return {};

  // Read each service's own history table (exact ESP32 payload shapes).
  const tables: TelemetryTable[] = ["lighting_telemetry", "traffic_telemetry", "water_telemetry", "waste_telemetry"];
  const grouped = new Map<string, TelemetrySample[]>();

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase!
        .from(table)
        .select("device_id, ts, *")
        .eq("org_id", orgId)
        .in("device_id", deviceIds)
        .order("ts", { ascending: false })
        .limit(limit);
      if (error) throw error;
      for (const raw of data ?? []) {
        const s = mapTelemetryRow(table, raw as Record<string, unknown>);
        const arr = grouped.get((raw as { device_id: string }).device_id) ?? [];
        arr.push(s);
        grouped.set((raw as { device_id: string }).device_id, arr);
      }
    })
  );

  const out: Record<string, TelemetrySample[]> = {};
  for (const [id, samples] of grouped) {
    // Merge all sources chronologically (ascending), keep the most recent tail.
    out[id] = samples.sort((a, b) => a.ts - b.ts).slice(-limit);
  }
  return out;
}

export async function fetchEvents(orgId: string | null): Promise<CityEvent[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("events").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map((r: EventRow) => mapEvent(r));
}

export async function fetchTickets(orgId: string | null): Promise<Ticket[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("tickets").select("*").eq("org_id", orgId).order("updated_at", { ascending: false }).limit(150);
  if (error) throw error;
  return (data ?? []).map((r: TicketRow) => mapTicket(r));
}

export async function fetchTicketComments(ticketIds: string[]): Promise<TicketComment[]> {
  if (!supabase || !ticketIds.length) return [];
  const { data, error } = await supabase.from("ticket_comments").select("*").in("ticket_id", ticketIds).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: CommentRow) => mapComment(r));
}

export async function fetchNotifications(orgId: string | null): Promise<AppNotification[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("notifications").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []).map((r: NotificationRow) => mapNotification(r));
}

export async function fetchInsights(orgId: string | null): Promise<AiInsight[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("ai_insights").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(40);
  if (error) throw error;
  return (data ?? []).map((r: InsightRow) => mapInsight(r));
}

export async function fetchCommands(orgId: string | null): Promise<DeviceCommand[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("device_commands").select("*").eq("org_id", orgId).order("requested_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((r: CommandRow) => mapCommand(r));
}

export async function fetchOrgUsers(orgId: string | null): Promise<Profile[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("profiles").select("*").eq("organization_id", orgId).order("full_name");
  if (error) throw error;
  return (data ?? []).map((r: ProfileRow) => mapProfile(r));
}

export async function fetchInvites(orgId: string | null): Promise<ReturnType<typeof mapInvite>[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("organization_invites").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: InviteRow) => mapInvite(r));
}

export async function fetchOperators(orgId: string | null): Promise<Operator[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("operators").select("*").eq("org_id", orgId).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: OperatorRow) => mapOperator(r));
}

export async function fetchTicketAssignments(orgId: string | null): Promise<TicketAssignment[]> {
  if (!supabase || !orgId) return [];
  const { data, error } = await supabase.from("ticket_assignments").select("*").eq("org_id", orgId).order("assigned_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: TicketAssignmentRow) => mapTicketAssignment(r));
}

// ---------------------------------------------------------------------------
// Writes (each row carries the caller's org_id; RLS enforces isolation)
// ---------------------------------------------------------------------------

export interface CreateDeviceInput {
  deviceKey: string;
  displayName: string;
  type: string;
  zone: string;
  locationLabel: string;
  service?: ServiceId; // defaults to lighting (back-compat)
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, unknown>;
}

export async function insertDevice(orgId: string, input: CreateDeviceInput): Promise<void> {
  if (!supabase || !orgId) throw new Error("Supabase is not configured");
  const user = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const service = input.service ?? "lighting";

  let locationId: string | null = null;
  if (input.locationLabel.trim()) {
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .insert({
        org_id: orgId,
        label: input.locationLabel.trim(),
        zone: input.zone.trim() || "Default",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .select("id")
      .single();
    if (locErr) throw locErr;
    locationId = loc?.id ?? null;
  }

  const defaultType = { lighting: "ESP32_LIGHTING_CONTROLLER", traffic: "TRAFFIC_SEGMENT_CONTROLLER", water: "WATER_FLOW_CONTROLLER", waste: "WASTE_BIN_SENSOR" }[service];
  const mqttTopic = `citypulse/${service}/${input.deviceKey.trim()}`;
  const { error } = await supabase.from("devices").insert({
    org_id: orgId,
    service,
    location_id: locationId,
    device_key: input.deviceKey.trim().toUpperCase(),
    display_id: input.deviceKey.trim().toUpperCase(),
    display_name: input.displayName.trim() || input.deviceKey.trim().toUpperCase(),
    type: input.type.trim() || defaultType,
    firmware: "v1.0.0",
    mqtt_topic: mqttTopic,
    status: "normal",
    mode: service === "traffic" ? "CLEAR" : "NORMAL",
    connection: false,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;

  void insertAudit({
    orgId,
    actorId: user.data?.user?.id ?? null,
    action: "device.created",
    entityType: "devices",
    entityId: input.deviceKey.trim().toUpperCase(),
    detail: `Registered ${service} device ${input.deviceKey.trim().toUpperCase()}`,
  });
}

export async function insertDeviceLocation(orgId: string, input: { label: string; zone: string; latitude?: number | null; longitude?: number | null }): Promise<string | null> {
  if (!supabase || !orgId) return null;
  const { data, error } = await supabase
    .from("locations")
    .insert({ org_id: orgId, label: input.label.trim(), zone: input.zone.trim() || "Default", latitude: input.latitude ?? null, longitude: input.longitude ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

export async function insertCommand(
  orgId: string,
  userId: string | null,
  deviceId: string,
  command: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!supabase || !orgId) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("device_commands").insert({
    org_id: orgId,
    device_id: deviceId,
    command,
    payload,
    status: "PENDING",
    requested_by: userId,
  });
  if (error) throw error;
  void insertAudit({ orgId, actorId: userId, action: "command.sent", entityType: "device_commands", entityId: deviceId, detail: `${command} -> ${deviceId}` });
}

export async function updateEventStatus(
  id: string,
  data: { status: EventStatus; acknowledged_at?: string | null; resolved_at?: string | null }
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("events").update(data).eq("id", id);
  if (error) throw error;
}

export type AuditInput = {
  orgId: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
};

export async function insertAudit(input: AuditInput): Promise<void> {
  if (!supabase || !input.orgId) return;
  await supabase.from("audit_logs").insert({
    org_id: input.orgId,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    detail: input.detail ?? null,
  });
}

export type NewTicketInput = {
  orgId: string;
  ticketKey: string;
  title: string;
  service: ServiceId;
  priority: TicketPriority;
  deviceId?: string | null;
  description?: string | null;
  createdBy: string;
};

export async function insertTicket(input: NewTicketInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("tickets").insert({
    org_id: input.orgId,
    ticket_key: input.ticketKey,
    title: input.title,
    service: input.service,
    priority: input.priority,
    status: "open",
    device_id: input.deviceId ?? null,
    description: input.description ?? null,
    created_by: input.createdBy,
  });
  if (error) throw error;
}

export async function updateTicket(
  ticketId: string,
  patch: Partial<{ status: TicketStatus; resolution: string; assigned_to: string }>
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId);
  if (error) throw error;
}

export interface NewOperatorInput {
  orgId: string;
  name: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  service?: Operator["service"];
  status?: string;
}

export async function insertOperator(input: NewOperatorInput): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("operators").insert({
    org_id: input.orgId,
    name: input.name,
    role: input.role ?? "field_operator",
    email: input.email ?? null,
    phone: input.phone ?? null,
    service: input.service ?? null,
    status: input.status ?? "available",
  });
  if (error) throw error;
}

export async function updateOperator(
  operatorId: string,
  patch: Partial<{ name: string; role: string; email: string | null; phone: string | null; service: Operator["service"]; status: string }>
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("operators").update(patch).eq("id", operatorId);
  if (error) throw error;
}

export async function deleteOperator(operatorId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("operators").delete().eq("id", operatorId);
  if (error) throw error;
}

export async function assignTicketOperator(orgId: string, ticketId: string, operatorId: string, assignedBy: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("ticket_assignments").insert({
    org_id: orgId,
    ticket_id: ticketId,
    operator_id: operatorId,
    assigned_by: assignedBy,
  });
  if (error) throw error;
}

export async function removeTicketAssignment(assignmentId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("ticket_assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}

export async function insertTicketComment(ticketId: string, author: string, body: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const user = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  let orgId: string | null = null;
  if (user.data?.user?.id) {
    const { data } = await supabase.from("profiles").select("organization_id").eq("id", user.data.user.id).maybeSingle();
    orgId = data?.organization_id ?? null;
  }
  const { error } = await supabase.from("ticket_comments").insert({ ticket_id: ticketId, org_id: orgId, author, body });
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(orgId: string | null): Promise<void> {
  if (!supabase || !orgId) return;
  await supabase.from("notifications").update({ read: true }).eq("org_id", orgId);
}

export async function updateInsightStatus(id: string, status: InsightStatus): Promise<void> {
  if (!supabase) return;
  await supabase.from("ai_insights").update({ status }).eq("id", id);
}

// ---------------------------------------------------------------------------
// Auth / organization RPCs (security definer functions in schema_part3.sql)
// ---------------------------------------------------------------------------

export async function rpcRegisterOrganization(name: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const slug =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || `org-${Date.now().toString(36)}`;
  const { data, error } = await supabase.rpc("register_organization", { p_name: name, p_slug: slug });
  if (error) throw error;
  return data as string;
}

export async function rpcJoinOrganization(code: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("join_organization", { p_code: code });
  if (error) throw error;
  return data as string;
}

export async function rpcCreateInvite(email: string, role: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.rpc("create_invite", { p_email: email, p_role: role });
  if (error) throw error;
  return data as string;
}

export async function rpcRevokeInvite(inviteId: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function errMsg(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const err = e as { message?: string; code?: string };
  if (err.code === "23505") return "A record with that key already exists in the database.";
  if (err.code === "42501") return "Permission denied by the organization security policy.";
  if (err.message === "INVALID_INVITE") return "That invite code is invalid, expired, or not issued for your email address.";
  if (err.message === "NOT_ADMIN") return "Only organization admins can issue invites.";
  if (err.message === "NO_ORG") return "Your profile is not attached to an organization yet.";
  return err.message ?? "Request failed";
}

/** True when the failure means the CITYPULSE schema was never installed (PGRST205). */
export function isSchemaError(e: unknown): boolean {
  const msg =
    typeof e === "string"
      ? e
      : ((e as { message?: string; code?: string })?.message ?? "");
  return (
    msg.includes("Could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("PGRST205")
  );
}