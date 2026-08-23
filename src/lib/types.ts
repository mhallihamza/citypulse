/**
 * CITYPULSE — Smart City Operations Platform
 *
 * Domain model. Mirrors the Supabase / PostgreSQL schema
 * (see supabase/schema.sql + schema_part2.sql). All types in this file are
 * plain data shapes mapped from real database rows — nothing here is simulated.
 */

export type ServiceId = "lighting" | "water" | "waste" | "traffic";

export type Severity = "critical" | "warning" | "info";
export type EntityStatus = "normal" | "warning" | "critical" | "offline";
export type EventStatus = "new" | "acknowledged" | "resolved";
export type TicketStatus = "open" | "in_progress" | "resolved" | "reopened";
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type InsightStatus = "new" | "acknowledged" | "actioned";
export type CommandStatus = "PENDING" | "DELIVERED" | "FAILED" | "CANCELLED";
export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED";
export type Role = "admin" | "supervisor" | "operator" | "viewer";

export const SERVICE_IDS: ServiceId[] = ["lighting", "water", "waste", "traffic"];

// ---------------------------------------------------------------------------
// Tenant & users
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  region: string | null;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string | null;
}

export interface OrgService {
  name: ServiceId;
  label: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Locations & devices
// ---------------------------------------------------------------------------

export interface Location {
  id: string;
  orgId: string;
  label: string;
  zone: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Device {
  id: string; // uuid
  deviceKey: string; // e.g. L-104 (unique per organization)
  displayId: string;
  displayName: string;
  service: ServiceId;
  type: string;
  locationId: string | null;
  zone: string;
  district: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  firmware: string;
  mqttTopic: string | null;
  status: EntityStatus;
  mode: string; // NORMAL | OFF | FAILURE
  online: boolean;
  signal: number | null;
  battery: number | null;
  lastHeartbeat: number | null;
  lastTelemetry: number | null;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

/** Live operational state for a lighting device (lighting_states table). */
export interface LightingState {
  deviceId: string;
  mode: "NORMAL" | "OFF" | "FAILURE" | string;
  brightness: number;
  lux: number | null;
  presence: boolean;
  night: boolean;
  lampFailure: boolean;
  online: boolean;
  lastSeen: number;
}

/** One telemetry sample (device_telemetry row). */
export interface TelemetrySample {
  ts: number;
  lux?: number;
  brightness?: number;
  presence?: number; // 0 | 1 for charts
  power?: number;
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export interface CityEvent {
  id: string;
  service: ServiceId;
  deviceId: string | null;
  deviceKey: string | null;
  eventType: string;
  title: string;
  severity: Severity;
  status: EventStatus;
  detail: string | null;
  source: string;
  createdAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  body: string;
  createdAt: number;
}

export interface Ticket {
  id: string; // uuid
  ticketKey: string; // e.g. LGT-104
  title: string;
  service: ServiceId;
  priority: TicketPriority;
  status: TicketStatus;
  deviceId: string | null;
  assignedTo: string | null;
  assigneeName: string | null;
  description: string | null;
  aiAnalysis: string | null;
  resolution: string | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface DeviceCommand {
  id: string;
  deviceId: string;
  deviceKey: string;
  command: string; // OFF | NORMAL | SET_BRIGHTNESS
  payload: Record<string, unknown>;
  status: CommandStatus;
  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: number;
  deliveredAt: number | null;
  ackAt: number | null;
  error: string | null;
}

export interface AppNotification {
  id: string;
  severity: Severity;
  title: string;
  message: string | null;
  read: boolean;
  ts: number;
  actionUrl: string | null;
}

export interface AiInsight {
  id: string;
  title: string;
  service: ServiceId;
  severity: Severity;
  confidence: number;
  observation: string;
  evidence: { label: string; value: string }[];
  recommendation: string;
  devices: string[];
  createdAt: number;
  status: InsightStatus;
}

export interface OrgInvite {
  id: string;
  code: string;
  email: string;
  role: string;
  status: InviteStatus;
  createdAt: number;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Display helpers (kept from the original design system)
// ---------------------------------------------------------------------------

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

export const ENTITY_STATUS_LABEL: Record<EntityStatus, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
};