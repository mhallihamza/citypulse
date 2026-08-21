/**
 * CITYPULSE domain model.
 * Mirrors the Supabase / PostgreSQL data model (see supabase/schema.sql).
 * Entities: profiles, organizations, services, devices, device_telemetry,
 * events, tickets, ticket_assignments, notifications, locations, ai_insights.
 */

export type ServiceId = "lighting" | "water" | "waste" | "traffic";

export type Severity = "critical" | "warning" | "info";

export type EntityStatus = "normal" | "warning" | "critical" | "offline";

export type DeviceStatus = "online" | "offline";

export type LightingMode = "NORMAL" | "OFF" | "FAILURE";
export type DeviceMode = LightingMode | "ON";

export type Role = "admin" | "supervisor" | "operator" | "viewer";

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  organizationType: "municipality" | "infrastructure_company" | "technology_provider" | "other";
  role: Role;
}

export interface Point {
  x: number; // 0..1000 map space
  y: number; // 0..1000 map space
}

export interface TelemetrySample {
  ts: number;
  lux?: number;
  brightness?: number;
  presence?: number; // 0|1
  power?: number;
  flow?: number; // liters per minute per endpoint sample
  pressure?: number; // bar
  fillLevel?: number; // 0..100
  batchCount?: number; // waste collections today
  vehicles?: number; // vehicles per 15 min
  density?: number; // 0..100
  congestion?: number; // 0..100
  travelTime?: number; // minutes
}

export interface Device {
  id: string; // e.g. ESP32-LIGHT-001 / L-104
  name: string;
  service: ServiceId;
  type: string;
  location: string;
  zone: string;
  district: string;
  status: DeviceStatus;
  mode: DeviceMode;
  entityStatus: EntityStatus;
  firmware: string;
  mqttTopic: string;
  lastHeartbeat: number;
  lastTelemetryAt: number;
  point: Point;
  signal: number; // 0..100 RSSI-style quality
  battery?: number;
  installedAt: string;
  linkedInfra: string; // e.g. "Street light L-104"
}

export type EventStatus = "new" | "acknowledged" | "resolved";

export interface CityEvent {
  id: string;
  service: ServiceId;
  deviceId: string;
  title: string;
  severity: Severity;
  status: EventStatus;
  detail: string;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  source: "realtime" | "ai" | "operator";
}

export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in_progress" | "resolved" | "reopened";

export interface TicketComment {
  id: string;
  author: string;
  body: string;
  ts: number;
}

export interface TicketTimelineItem {
  ts: number;
  label: string;
  actor: string;
}

export interface Ticket {
  id: string; // e.g. LGT-104
  title: string;
  service: ServiceId;
  priority: TicketPriority;
  status: TicketStatus;
  deviceId?: string;
  operatorId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  description: string;
  aiAnalysis?: string;
  comments: TicketComment[];
  timeline: TicketTimelineItem[];
  attachmentCount: number;
  resolution?: string;
}

export type OperatorStatus = "available" | "on_assignment" | "offline";

export interface Operator {
  id: string;
  name: string;
  initials: string;
  role: "field_operator" | "supervisor";
  status: OperatorStatus;
  email: string;
  phone: string;
  service: ServiceId | "all";
  currentTickets: number;
  resolvedTotal: number;
  avgResolutionMin: number;
  lastActivity: number;
}

export type NotificationSeverity = "critical" | "warning" | "info";

export interface AppNotification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  read: boolean;
  ts: number;
  actionUrl?: string;
}

export interface AiInsight {
  id: string;
  title: string;
  service: ServiceId;
  severity: Severity;
  confidence: number; // 0..1
  observation: string;
  evidence: { label: string; value: string }[];
  recommendation: string;
  devices: string[];
  createdAt: number;
  status: "new" | "acknowledged" | "actioned";
}

export interface ServiceState {
  id: ServiceId;
  label: string;
  operationalPct: number;
  trend: number; // points up/down (pp)
  lastUpdate: number;
}

export type ServiceStatusText =
  | "Operational"
  | "Normal"
  | "Warning"
  | "Critical"
  | "Offline";

export const SERVICE_LABEL: Record<ServiceId, string> = {
  lighting: "Lighting",
  water: "Water",
  waste: "Waste",
  traffic: "Traffic",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#246bff",
};

export const ENTITY_STATUS_COLOR: Record<EntityStatus, string> = {
  normal: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
  offline: "#64748b",
};

export interface KpiSeries {
  label: string;
  value: string;
  sub: string;
  trend: "up" | "down" | "flat";
  color: string;
  spark: number[];
}

export interface AppData {
  profile: Profile;
  devices: Device[];
  events: CityEvent[];
  tickets: Ticket[];
  operators: Operator[];
  notifications: AppNotification[];
  insights: AiInsight[];
  telemetry: Record<string, TelemetrySample[]>;
}