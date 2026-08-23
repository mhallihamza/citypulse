-- ============================================================================
-- CITYPULSE — Supabase / PostgreSQL schema — part 1: core entities & enums
-- Run the three files in order: schema.sql -> schema_part2.sql -> schema_part3.sql
-- This schema is the single source of truth for the CITYPULSE SaaS platform.
-- Everything is multi-tenant: every organization-owned table carries either
-- `org_id` or `organization_id` and is protected by Row Level Security (part 3).
-- ============================================================================

create extension if not exists "pgcrypto";

create type service_name    as enum ('lighting','water','waste','traffic');
create type entity_status   as enum ('normal','warning','critical','offline');
create type severity        as enum ('critical','warning','info');
create type event_status    as enum ('new','acknowledged','resolved');
create type ticket_status   as enum ('open','in_progress','resolved','reopened');
create type ticket_priority as enum ('critical','high','medium','low');
create type ins_status      as enum ('new','acknowledged','actioned');
create type command_status  as enum ('PENDING','DELIVERED','FAILED','CANCELLED');
create type invite_status   as enum ('PENDING','ACCEPTED','REVOKED');

-- ----------------------------------------------------------------------------
-- Tenants
-- ----------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null default 'municipality',
  region text,
  created_at timestamptz not null default now()
);

-- Users: one row per auth.users identity (created by a trigger in part 3).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  full_name text not null,
  email text not null,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);
create index idx_profiles_org on profiles (organization_id);

-- Per-tenant enabled services (lighting/water/waste/traffic).
create table services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name service_name not null,
  label text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- Zones / areas within a city, with real GPS coordinates for mapping.
create table locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  zone text not null default 'Default',
  district text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Devices
-- ----------------------------------------------------------------------------
-- A registered device for any service. Lighting is the first implemented
-- service; water/waste/traffic reuse the same registry later.
create table devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null default 'lighting',
  location_id uuid references locations(id) on delete set null,
  -- "Device ID" as seen in the UI, e.g. L-104. Unique per tenant identity.
  device_key text not null,
  display_id text not null,
  display_name text,
  type text not null default 'ESP32_LIGHTING_CONTROLLER',
  firmware text default 'v1.0.0',
  mqtt_topic text,
  status entity_status not null default 'normal',
  mode text not null default 'NORMAL',
  connection boolean not null default false,
  signal numeric, battery numeric,
  last_heartbeat timestamptz,
  last_telemetry timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, device_key)
);
create index idx_devices_org on devices (org_id);
create index idx_devices_service on devices (org_id, service);

-- ----------------------------------------------------------------------------
-- Telemetry (real sensor samples, written by the IoT ingestion pipeline)
-- ----------------------------------------------------------------------------
-- Generic store shared by every service. Lighting samples use
-- lux / brightness / presence / power; future services use the same rows.
create table device_telemetry (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  lux numeric, brightness numeric, presence boolean, power numeric,
  flow numeric, pressure numeric, fill_level numeric,
  vehicles integer, density numeric, congestion numeric, travel_time numeric
);
create index idx_telemetry_device_ts on device_telemetry (device_id, ts desc);
