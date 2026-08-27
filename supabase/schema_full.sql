-- ============================================================================
-- CITYPULSE — COMPLETE SCHEMA INSTALLER / REPAIR (single file, idempotent)
--
-- Paste this WHOLE file into Supabase Studio -> SQL Editor -> Run.
-- It is safe on: an empty project, a partially-created database, or a
-- re-run. Missing tables/columns/policies are created; existing ones kept.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enum types (created only if missing)
-- ----------------------------------------------------------------------------
do $$ begin create type service_name    as enum ('lighting','water','waste','traffic'); exception when duplicate_object then null; end $$;
do $$ begin create type entity_status   as enum ('normal','warning','critical','offline'); exception when duplicate_object then null; end $$;
do $$ begin create type severity        as enum ('critical','warning','info'); exception when duplicate_object then null; end $$;
do $$ begin create type event_status    as enum ('new','acknowledged','resolved'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status   as enum ('open','in_progress','resolved','reopened'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_priority as enum ('critical','high','medium','low'); exception when duplicate_object then null; end $$;
do $$ begin create type ins_status      as enum ('new','acknowledged','actioned'); exception when duplicate_object then null; end $$;
do $$ begin create type command_status  as enum ('PENDING','DELIVERED','FAILED','CANCELLED'); exception when duplicate_object then null; end $$;
do $$ begin create type invite_status   as enum ('PENDING','ACCEPTED','REVOKED'); exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tenants & users
-- ----------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null default 'municipality',
  region text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  full_name text not null,
  email text not null,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_org on profiles (organization_id);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name service_name not null,
  label text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists locations (
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
-- Devices & telemetry
-- ----------------------------------------------------------------------------
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
    service service_name not null default 'lighting'::service_name,
  location_id uuid references locations(id) on delete set null,
  device_key text not null,
  display_id text not null,
  display_name text,
  type text not null default 'ESP32_LIGHTING_CONTROLLER',
  firmware text default 'v1.0.0',
  mqtt_topic text,
  status entity_status not null default 'normal'::entity_status,
  mode text not null default 'NORMAL',
  connection boolean not null default false,
  signal numeric, battery numeric,
  last_heartbeat timestamptz,
  last_telemetry timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, device_key)
);
create index if not exists idx_devices_org on devices (org_id);
create index if not exists idx_devices_service on devices (org_id, service);

create table if not exists device_telemetry (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  lux numeric, brightness numeric, presence boolean, power numeric,
  flow numeric, pressure numeric, fill_level numeric,
  vehicles integer, pending_vehicles integer, density numeric, congestion numeric, travel_time numeric
);
create index if not exists idx_telemetry_device_ts on device_telemetry (device_id, ts desc);

-- ----------------------------------------------------------------------------
-- Field operators
-- ----------------------------------------------------------------------------
create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null, role text not null default 'field_operator',
  email text, phone text, service service_name,
  status text not null default 'available',
  current_tickets integer not null default 0,
  resolved_total integer not null default 0,
  avg_resolution_min integer not null default 0,
  last_activity timestamptz
);

-- ----------------------------------------------------------------------------
-- Events
-- ----------------------------------------------------------------------------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null default 'lighting'::service_name,
  device_id uuid references devices(id) on delete set null,
  device_key text,
  title text not null,
  event_type text not null default 'EVENT',
  severity severity not null default 'info'::severity,
    status event_status NOT NULL,
  detail text,
  source text not null default 'fusion_ai',
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- Unified cross-service event fields (Water ESP32 payloads; type = event_type)
  ts timestamptz,
  previous_state text,
  current_state text,
  sensor_status text,
  payload jsonb
);
create index if not exists idx_events_created on events (org_id, created_at desc);

-- Guarded upgrade for databases created before the unified-event fields existed.
alter table events add column if not exists ts timestamptz;
alter table events add column if not exists previous_state text;
alter table events add column if not exists current_state text;
alter table events add column if not exists sensor_status text;
alter table events add column if not exists payload jsonb;

-- ----------------------------------------------------------------------------
-- Tickets
-- ----------------------------------------------------------------------------
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_key text not null,
  title text not null,
  service service_name not null default 'lighting'::service_name,
  priority ticket_priority not null default 'medium'::ticket_priority,
  status ticket_status not null default 'open'::ticket_status,
  device_id uuid references devices(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  description text,
  ai_analysis text,
  resolution text,
  created_by text default 'CITYPULSE AI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, ticket_key)
);
create index if not exists idx_tickets_org on tickets (org_id, updated_at desc);

create table if not exists ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  operator_id uuid references operators(id) on delete cascade,
  assigned_by text, assigned_at timestamptz not null default now()
);

create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ticket_comments on ticket_comments (ticket_id, created_at);

-- ----------------------------------------------------------------------------
-- Live lighting state (one row per lighting device)
-- ----------------------------------------------------------------------------
create table if not exists lighting_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  mode text not null default 'NORMAL',
  brightness integer not null default 0,
  lux numeric,
  presence boolean not null default false,
  night boolean not null default true,
  lamp_failure boolean not null default false,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Live traffic state (one row per traffic device)
-- ----------------------------------------------------------------------------
create table if not exists traffic_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  vehicle_count integer not null default 0,
  pending_vehicles integer not null default 0,
  density numeric default 0,
  congestion numeric default 0,
  travel_time numeric default 0,
  state text not null default 'CLEAR',
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_traffic_states_org on traffic_states (org_id);

-- ----------------------------------------------------------------------------
-- Live water state (one row per water device)
-- ----------------------------------------------------------------------------
create table if not exists water_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  flow numeric default 0,
  pressure numeric default 0,
  reference_pressure numeric default 0,
  pressure_drop numeric default 0,
  pressure_drop_percent numeric default 0,
  sensor_status text,
  leakage boolean not null default false,
  state text not null default 'NORMAL',
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_water_states_org on water_states (org_id);

-- Guarded upgrade: Water ESP32 fields for states tables created before them.
alter table water_states add column if not exists reference_pressure numeric default 0;
alter table water_states add column if not exists pressure_drop numeric default 0;
alter table water_states add column if not exists pressure_drop_percent numeric default 0;
alter table water_states add column if not exists sensor_status text;

-- ----------------------------------------------------------------------------
-- Device commands
-- ----------------------------------------------------------------------------
create table if not exists device_commands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}',
    status command_status not null default 'PENDING'::command_status,
  requested_by uuid references profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  ack_at timestamptz,
  error text
);
create index if not exists idx_commands_device on device_commands (org_id, device_id, requested_at desc);

-- ----------------------------------------------------------------------------
-- Audit log
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org on audit_logs (org_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Secure invite-based membership
-- ----------------------------------------------------------------------------
create table if not exists organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invite_code text unique not null,
  email text not null,
  role text not null default 'operator',
  status invite_status not null default 'PENDING'::invite_status,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  unique (org_id, email)
);

-- ----------------------------------------------------------------------------
-- Notifications & AI insights
-- ----------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  severity severity not null default 'info'::severity,
  title text not null,
  message text,
  read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_org on notifications (org_id, created_at desc);

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null default 'lighting'::service_name,
  title text not null,
  severity severity not null default 'info'::severity,
  confidence numeric not null default 0,
  observation text not null,
  evidence jsonb not null default '[]',
  recommendation text not null,
  devices text[] not null default '{}',
    status ins_status not null default 'new'::ins_status,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- REPAIR: bring pre-existing (older / partial) tables up to the full schema.
-- Every statement below is safe to run on complete or partial databases.
-- ============================================================================
alter table services         add column if not exists created_at timestamptz not null default now();
alter table locations        add column if not exists district text;
alter table locations        add column if not exists latitude numeric;
alter table locations        add column if not exists longitude numeric;
alter table locations        add column if not exists created_at timestamptz not null default now();
alter table devices          add column if not exists metadata jsonb not null default '{}';
alter table devices          add column if not exists created_at timestamptz not null default now();
alter table events           add column if not exists event_type text not null default 'EVENT';
alter table events           add column if not exists acknowledged_at timestamptz;
alter table events           add column if not exists resolved_at timestamptz;
alter table tickets          add column if not exists assigned_to uuid references profiles(id) on delete set null;
alter table ticket_comments  add column if not exists org_id uuid references organizations(id) on delete cascade;

-- Backfill org_id on legacy ticket comments so RLS keeps them visible.
update ticket_comments tc
   set org_id = t.org_id
  from tickets t
 where tc.ticket_id = t.id
   and tc.org_id is null;

-- Ensure every lighting device has a live-state row.
insert into lighting_states (org_id, device_id)
select d.org_id, d.id
  from devices d
 where d.service = 'lighting'
on conflict (device_id) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Helper: organization of the current authenticated user.
create or replace function public.org_org_id(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = uid
$$;

alter table organizations        enable row level security;
alter table profiles             enable row level security;
alter table services             enable row level security;
alter table locations            enable row level security;
alter table devices              enable row level security;
alter table device_telemetry     enable row level security;
alter table lighting_states      enable row level security;
alter table traffic_states       enable row level security;
alter table water_states         enable row level security;
alter table device_commands      enable row level security;
alter table audit_logs           enable row level security;
alter table operators            enable row level security;
alter table events               enable row level security;
alter table tickets              enable row level security;
alter table ticket_assignments   enable row level security;
alter table ticket_comments      enable row level security;
alter table organization_invites enable row level security;
alter table notifications        enable row level security;
alter table ai_insights          enable row level security;

-- ------------------------------------------------------------
-- Policies (drop + recreate so re-runs always end up correct)
-- ------------------------------------------------------------
drop policy if exists "orgs: select own" on organizations;
create policy "orgs: select own" on organizations
  for select using (id = public.org_org_id(auth.uid()));

drop policy if exists "profiles: select own or org" on profiles;
create policy "profiles: select own or org" on profiles
  for select using (
    id = auth.uid()
    or (organization_id is not null and organization_id = public.org_org_id(auth.uid()))
  );

drop policy if exists "profiles: update own" on profiles;
create policy "profiles: update own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "services: org scope" on services;
create policy "services: org scope" on services
  for select using (organization_id = public.org_org_id(auth.uid()));
drop policy if exists "services: org insert" on services;
create policy "services: org insert" on services
  for insert with check (organization_id = public.org_org_id(auth.uid()));
drop policy if exists "services: org update" on services;
create policy "services: org update" on services
  for update using (organization_id = public.org_org_id(auth.uid()))
  with check (organization_id = public.org_org_id(auth.uid()));

drop policy if exists "locations: org scope" on locations;
create policy "locations: org scope" on locations
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "locations: org insert" on locations;
create policy "locations: org insert" on locations
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "devices: org scope" on devices;
create policy "devices: org scope" on devices
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "devices: org insert" on devices;
create policy "devices: org insert" on devices
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "devices: org update" on devices;
create policy "devices: org update" on devices
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "telemetry: org scope" on device_telemetry;
create policy "telemetry: org scope" on device_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "telemetry: org insert" on device_telemetry;
create policy "telemetry: org insert" on device_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "states: org scope" on lighting_states;
create policy "states: org scope" on lighting_states
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "states: org insert" on lighting_states;
create policy "states: org insert" on lighting_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "states: org update" on lighting_states;
create policy "states: org update" on lighting_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "traffic_states: org scope" on traffic_states;
create policy "traffic_states: org scope" on traffic_states
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "traffic_states: org insert" on traffic_states;
create policy "traffic_states: org insert" on traffic_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "traffic_states: org update" on traffic_states;
create policy "traffic_states: org update" on traffic_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "water_states: org scope" on water_states;
create policy "water_states: org scope" on water_states
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "water_states: org insert" on water_states;
create policy "water_states: org insert" on water_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "water_states: org update" on water_states;
create policy "water_states: org update" on water_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "commands: org scope" on device_commands;
create policy "commands: org scope" on device_commands
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "commands: org insert" on device_commands;
create policy "commands: org insert" on device_commands
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "commands: org update" on device_commands;
create policy "commands: org update" on device_commands
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "audit: org scope" on audit_logs;
create policy "audit: org scope" on audit_logs
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "audit: org insert" on audit_logs;
create policy "audit: org insert" on audit_logs
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "operators: org scope" on operators;
create policy "operators: org scope" on operators
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "operators: org insert" on operators;
create policy "operators: org insert" on operators
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "operators: org update" on operators;
create policy "operators: org update" on operators
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "operators: org delete" on operators;
create policy "operators: org delete" on operators
  for delete using (org_id = public.org_org_id(auth.uid()));

drop policy if exists "events: org scope" on events;
create policy "events: org scope" on events
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "events: org insert" on events;
create policy "events: org insert" on events
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "events: org update" on events;
create policy "events: org update" on events
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "tickets: org scope" on tickets;
create policy "tickets: org scope" on tickets
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "tickets: org insert" on tickets;
create policy "tickets: org insert" on tickets
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "tickets: org update" on tickets;
create policy "tickets: org update" on tickets
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "assignments: org scope" on ticket_assignments;
create policy "assignments: org scope" on ticket_assignments
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "assignments: org insert" on ticket_assignments;
create policy "assignments: org insert" on ticket_assignments
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "assignments: org delete" on ticket_assignments;
create policy "assignments: org delete" on ticket_assignments
  for delete using (org_id = public.org_org_id(auth.uid()));

drop policy if exists "comments: org scope" on ticket_comments;
create policy "comments: org scope" on ticket_comments
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "comments: org insert" on ticket_comments;
create policy "comments: org insert" on ticket_comments
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "invites: org scope" on organization_invites;
create policy "invites: org scope" on organization_invites
  for select using (org_id = public.org_org_id(auth.uid()));

drop policy if exists "notifications: org scope" on notifications;
create policy "notifications: org scope" on notifications
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "notifications: org update" on notifications;
create policy "notifications: org update" on notifications
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "notifications: org insert" on notifications;
create policy "notifications: org insert" on notifications
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "insights: org scope" on ai_insights;
create policy "insights: org scope" on ai_insights
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "insights: org update" on ai_insights;
create policy "insights: org update" on ai_insights
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- ============================================================================
-- Triggers
-- ============================================================================

-- 1. Auto-create a profile whenever an auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.email, ''),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Creating a lighting device also creates its live state row.
create or replace function public.devices_to_lighting_state()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.service = 'lighting' then
    insert into lighting_states (org_id, device_id)
    values (new.org_id, new.id)
    on conflict (device_id) do nothing;
  elsif new.service = 'traffic' then
    insert into traffic_states (org_id, device_id)
    values (new.org_id, new.id)
    on conflict (device_id) do nothing;
  elsif new.service = 'water' then
    insert into water_states (org_id, device_id)
    values (new.org_id, new.id)
    on conflict (device_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists devices_to_lighting_state on devices;
create trigger devices_to_lighting_state
  after insert on devices
  for each row execute function public.devices_to_lighting_state();

-- 3. A new critical event automatically raises a high-priority ticket.
create or replace function public.events_to_tickets()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.severity = 'critical' and new.status = 'new' then
    insert into tickets (org_id, ticket_key, title, service, priority, status, device_id, description, created_by)
    values (
      new.org_id,
      upper(substr(new.service::text, 1, 3)) || '-' || coalesce(new.device_key, gen_random_uuid()::text),
      new.title, new.service, 'high', 'open', new.device_id, new.detail, 'CITYPULSE AI'
    )
    on conflict (org_id, ticket_key) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists events_to_tickets on events;
create trigger events_to_tickets
  after insert on events
  for each row execute function public.events_to_tickets();

-- 4. Keep tickets.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists touch_tickets on tickets;
create trigger touch_tickets
  before update on tickets
  for each row execute function public.set_updated_at();

drop trigger if exists touch_traffic_states on traffic_states;
create trigger touch_traffic_states
  before update on traffic_states
  for each row execute function public.set_updated_at();
drop trigger if exists touch_water_states on water_states;
create trigger touch_water_states
  before update on water_states
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Security-definer RPCs (sign-up / join flows)
-- ============================================================================

-- Flow A: create a new organization and make the caller its ADMIN.
create or replace function public.register_organization(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Invalid organization name';
  end if;
  insert into organizations (name, slug)
  values (btrim(p_name), lower(btrim(coalesce(p_slug, 'org-' || gen_random_uuid()::text))))
  returning id into v_org;

  update profiles
     set organization_id = v_org, role = 'admin'
   where id = auth.uid();

  insert into services (organization_id, name, label) values
    (v_org, 'lighting', 'Lighting'),
    (v_org, 'water', 'Water'),
    (v_org, 'waste', 'Waste'),
    (v_org, 'traffic', 'Traffic')
  on conflict (organization_id, name) do nothing;

  return v_org;
end $$;

-- Flow B: join an existing organization with an admin-issued invite code.
create or replace function public.join_organization(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_inv public.organization_invites%rowtype;
begin
  select * into v_inv
    from public.organization_invites
   where invite_code = upper(btrim(p_code))
     and status = 'PENDING'
     and lower(email) = lower((select email from profiles where id = auth.uid()))
     and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'INVALID_INVITE';
  end if;

  update profiles
     set organization_id = v_inv.org_id, role = v_inv.role
   where id = auth.uid();

  update public.organization_invites
     set status = 'ACCEPTED', accepted_at = now()
   where id = v_inv.id;

  return v_inv.org_id;
end $$;

-- Admin-only: issue (or rotate) an invite code for an email address.
create or replace function public.create_invite(p_email text, p_role text default 'operator')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_role text;
  v_code text;
begin
  select organization_id into v_org from profiles where id = auth.uid();
  if v_org is null then raise exception 'NO_ORG'; end if;

  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin' then raise exception 'NOT_ADMIN'; end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.organization_invites (org_id, invite_code, email, role, created_by)
  values (v_org, v_code, lower(btrim(p_email)), coalesce(p_role, 'operator'), auth.uid())
  on conflict (org_id, email) do update
     set invite_code = excluded.invite_code,
         status = 'PENDING',
         expires_at = now() + interval '7 days',
         created_by = auth.uid()
  returning invite_code into v_code;

  return v_code;
end $$;

-- Admin-only: revoke an invite.
create or replace function public.revoke_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.organization_invites
     set status = 'REVOKED'
   where id = p_invite_id
     and org_id = public.org_org_id(auth.uid());
end $$;

-- ============================================================================
-- BACKFILL: create profile rows for auth users that signed up before this
-- schema existed (so existing accounts keep working).
-- ============================================================================
insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, 'user'), '@', 1)),
       coalesce(u.email, ''),
       'viewer'
  from auth.users u
on conflict (id) do nothing;
-- ============================================================================
-- SUPABASE REALTIME — enable Postgres changes for the live dashboard tables.
-- The React dashboard subscribes with `postgres_changes` so device states,
-- commands, events, tickets and notifications update WITHOUT a page refresh.
-- In Supabase a table only emits change events once it is added to the
-- `supabase_realtime` publication. Each statement is guarded so that re-running
-- this file (or the 3-part path) is safe.
-- ============================================================================
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices') then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lighting_states') then
    alter publication supabase_realtime add table public.lighting_states;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_commands') then
    alter publication supabase_realtime add table public.device_commands;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tickets') then
    alter publication supabase_realtime add table public.tickets;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'device_telemetry') then
    alter publication supabase_realtime add table public.device_telemetry;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operators') then
    alter publication supabase_realtime add table public.operators;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ticket_assignments') then
    alter publication supabase_realtime add table public.ticket_assignments;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'traffic_states') then
    alter publication supabase_realtime add table public.traffic_states;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'water_states') then
    alter publication supabase_realtime add table public.water_states;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- PER-SERVICE TELEMETRY HISTORY (lighting / traffic / water / waste)
-- Actual ESP32 payload shapes. CURRENT STATE lives in *_states above; these
-- tables hold HISTORICAL samples for charts. Legacy shared device_telemetry
-- remains a valid ingestion path via the route_service_telemetry() bridge.
-- ----------------------------------------------------------------------------
create table if not exists lighting_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  lux numeric, brightness numeric, presence boolean,
  night boolean, mode text, lamp_failure boolean
);
create table if not exists traffic_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  state text, vehicle_count integer, density numeric,
  overdue_vehicles integer,   -- vehicles past T-max between IR1 and IR2
  tmax numeric                -- max allowed travel time on the segment (s)
);
create table if not exists water_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  sensor_status text, state text,
  pressure numeric, reference_pressure numeric,
  pressure_drop numeric, pressure_drop_percent numeric,
  flow numeric,               -- legacy field kept for backward compatibility
  created_at timestamptz not null default now()
);
create table if not exists waste_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  fill_level numeric, state text
);
-- Row-level security — organization isolation on every telemetry history table
alter table lighting_telemetry enable row level security;
alter table traffic_telemetry  enable row level security;
alter table water_telemetry    enable row level security;
alter table waste_telemetry    enable row level security;

drop policy if exists "lighting_tel: org select" on lighting_telemetry;
create policy "lighting_tel: org select" on lighting_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "lighting_tel: org insert" on lighting_telemetry;
create policy "lighting_tel: org insert" on lighting_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "traffic_tel: org select" on traffic_telemetry;
create policy "traffic_tel: org select" on traffic_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "traffic_tel: org insert" on traffic_telemetry;
create policy "traffic_tel: org insert" on traffic_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "water_tel: org select" on water_telemetry;
create policy "water_tel: org select" on water_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "water_tel: org insert" on water_telemetry;
create policy "water_tel: org insert" on water_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

drop policy if exists "waste_tel: org select" on waste_telemetry;
create policy "waste_tel: org select" on waste_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "waste_tel: org insert" on waste_telemetry;
create policy "waste_tel: org insert" on waste_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- Realtime publication for the four telemetry history tables (guarded)
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lighting_telemetry') then
    alter publication supabase_realtime add table public.lighting_telemetry;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'traffic_telemetry') then
    alter publication supabase_realtime add table public.traffic_telemetry;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'water_telemetry') then
    alter publication supabase_realtime add table public.water_telemetry;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waste_telemetry') then
    alter publication supabase_realtime add table public.waste_telemetry;
  end if;
end $$;

-- Bridge trigger: legacy shared ingestion keeps working. Any row inserted into
-- device_telemetry is copied into the correct per-service table according to
-- devices.service. Fusion AI can keep writing to either path.
create or replace function route_service_telemetry() returns trigger
language plpgsql security definer set search_path = public as $$
declare svc text;
begin
  select d.service into svc from devices d where d.id = new.device_id;
  if svc = 'lighting' then
    insert into lighting_telemetry (org_id, device_id, ts, lux, brightness, presence)
    values (new.org_id, new.device_id, coalesce(new.ts, now()), new.lux, new.brightness, new.presence);
  elsif svc = 'traffic' then
    insert into traffic_telemetry (org_id, device_id, ts, vehicle_count, density, overdue_vehicles, tmax)
    values (new.org_id, new.device_id, coalesce(new.ts, now()),
            new.vehicles, new.density,
            (to_jsonb(new) ->> 'pending_vehicles')::int,
            (to_jsonb(new) ->> 'travel_time')::numeric);
  elsif svc = 'water' then
    -- ESP32 water payload: sensor_status/state/reference_pressure/pressure_drop/
    -- pressure_drop_percent arrive via legacy compat columns; jsonb picks
    -- tolerate older row shapes that never carried them.
    insert into water_telemetry (org_id, device_id, ts, flow, pressure,
                                 sensor_status, state, reference_pressure,
                                 pressure_drop, pressure_drop_percent)
    values (new.org_id, new.device_id, coalesce(new.ts, now()),
            new.flow, new.pressure,
            (to_jsonb(new) ->> 'sensor_status'),
            (to_jsonb(new) ->> 'state'),
            (to_jsonb(new) ->> 'reference_pressure')::numeric,
            (to_jsonb(new) ->> 'pressure_drop')::numeric,
            (to_jsonb(new) ->> 'pressure_drop_percent')::numeric);
  elsif svc = 'waste' then
    insert into waste_telemetry (org_id, device_id, ts, fill_level)
    values (new.org_id, new.device_id, coalesce(new.ts, now()), new.fill_level);
  end if;
  return new;
end $$;

drop trigger if exists telemetry_route_to_service on device_telemetry;
create trigger telemetry_route_to_service
  after insert on device_telemetry
  for each row execute function route_service_telemetry();

-- One-time backfill of EXISTING history so charts keep their past data.
-- Guarded with NOT EXISTS on (device_id, ts) — re-runs never duplicate rows.
insert into lighting_telemetry (org_id, device_id, ts, lux, brightness, presence)
select t.org_id, t.device_id, t.ts, t.lux, t.brightness, t.presence
from device_telemetry t join devices d on d.id = t.device_id and d.service = 'lighting'
where not exists (select 1 from lighting_telemetry l where l.device_id = t.device_id and l.ts = t.ts);

insert into traffic_telemetry (org_id, device_id, ts, vehicle_count, density, overdue_vehicles, tmax)
select t.org_id, t.device_id, t.ts, t.vehicles, t.density, t.pending_vehicles, t.travel_time
from device_telemetry t join devices d on d.id = t.device_id and d.service = 'traffic'
where not exists (select 1 from traffic_telemetry g where g.device_id = t.device_id and g.ts = t.ts);

insert into water_telemetry (org_id, device_id, ts, flow, pressure,
                             sensor_status, state, reference_pressure,
                             pressure_drop, pressure_drop_percent)
select t.org_id, t.device_id, t.ts, t.flow, t.pressure,
       (to_jsonb(t) ->> 'sensor_status'),
       (to_jsonb(t) ->> 'state'),
       (to_jsonb(t) ->> 'reference_pressure')::numeric,
       (to_jsonb(t) ->> 'pressure_drop')::numeric,
       (to_jsonb(t) ->> 'pressure_drop_percent')::numeric
from device_telemetry t join devices d on d.id = t.device_id and d.service = 'water'
where not exists (select 1 from water_telemetry w where w.device_id = t.device_id and w.ts = t.ts);

insert into waste_telemetry (org_id, device_id, ts, fill_level)
select t.org_id, t.device_id, t.ts, t.fill_level
from device_telemetry t join devices d on d.id = t.device_id and d.service = 'waste'
where not exists (select 1 from waste_telemetry s where s.device_id = t.device_id and s.ts = t.ts);

-- ============================================================================
-- FUSION AI — WRITE TARGETS GOING FORWARD (preferred primary path)
-- ============================================================================
-- Lighting ESP32 { lux, brightness, presence, night, mode, lamp_failure }:
--   insert into lighting_telemetry (org_id, device_id, lux, brightness, presence, night, mode, lamp_failure) values (...);
-- Traffic ESP32 { state, vehicle_count, density, overdue_vehicles, tmax }:
--   insert into traffic_telemetry (org_id, device_id, state, vehicle_count, density, overdue_vehicles, tmax) values (...);
-- Water ESP32 { sensor_status, state, pressure, reference_pressure, pressure_drop, pressure_drop_percent }:
--   insert into water_telemetry (org_id, device_id, sensor_status, state, pressure, reference_pressure,
--                                pressure_drop, pressure_drop_percent) values (...);
-- Waste (future): insert into waste_telemetry (org_id, device_id, fill_level, state) values (...);
--
-- Legacy inserts into device_telemetry still work via the bridge trigger above
-- (night/mode/lamp_failure have no legacy column and are only captured by the
-- direct per-service path).
