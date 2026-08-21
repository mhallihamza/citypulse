-- ============================================================================
-- CITYPULSE — Supabase / PostgreSQL schema, indexes & Row Level Security
-- Run in the Supabase SQL editor. Mirrors src/lib/types.ts (the UI's mock
-- data shape matches these entities exactly, so swapping in Realtime is
-- a drop-in change via lib/supabase.ts `subscribeRealtime(...)`).
-- ============================================================================

create extension if not exists "pgcrypto";

create type service_name    as enum ('lighting','water','waste','traffic');
create type entity_status   as enum ('normal','warning','critical','offline');
create type severity        as enum ('critical','warning','info');
create type event_status    as enum ('new','acknowledged','resolved');
create type ticket_status   as enum ('open','in_progress','resolved','reopened');
create type ticket_priority as enum ('critical','high','medium','low');
create type ins_status      as enum ('new','acknowledged','actioned');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null default 'municipality',
  region text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  full_name text not null,
  email text not null,
  role text not null default 'operator'
);

create table services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name service_name not null,
  label text not null,
  enabled boolean not null default true,
  unique (organization_id, name)
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  zone text not null,
  district text,
  x numeric, y numeric
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null,
  location_id uuid references locations(id) on delete set null,
  device_key text unique not null,
  display_id text not null,
  display_name text,
  type text,
  firmware text default 'v1.0.0',
  mqtt_topic text,
  status entity_status not null default 'normal',
  mode text not null default 'NORMAL',
  connection boolean not null default true,
  signal numeric, battery numeric,
  last_heartbeat timestamptz, last_telemetry timestamptz
);

create table device_telemetry (
  id bigint generated always as identity primary key,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  lux numeric, brightness numeric, presence boolean, power numeric,
  flow numeric, pressure numeric, fill_level numeric,
  vehicles integer, density numeric, congestion numeric, travel_time numeric
);
create index idx_telemetry_device_ts on device_telemetry (device_id, ts desc);
