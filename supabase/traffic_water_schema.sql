-- ============================================================================
-- CITYPULSE — TRAFFIC + WATER SERVICES (non-destructive, idempotent migration)
-- ============================================================================
-- Enables real Traffic and Water end-to-end:
--   * extends the shared device_telemetry history with pending_vehicles
--   * adds traffic_states / water_states (current-state rows, one per device)
--   * RLS (org isolation) + realtime publication for both new tables
--   * auto-creates the correct state row when a device of that service is added
-- Safe to run on an existing database: it never drops tables, drops data, or
-- recreates the platform. Re-running is a no-op where guarded.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Extend shared telemetry (already has flow/pressure/fill_level/vehicles/
--    density/congestion/travel_time). Add the traffic pending_queue concept.
-- ----------------------------------------------------------------------------
alter table device_telemetry add column if not exists pending_vehicles integer;

-- ----------------------------------------------------------------------------
-- 2) Current-state tables (one row per device; distinct from historical
--    device_telemetry rows). Traffic & Water use the SAME pattern lighting uses.
-- ----------------------------------------------------------------------------
create table if not exists traffic_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  vehicle_count integer not null default 0,
  pending_vehicles integer not null default 0,
  density numeric              default 0,
  congestion numeric            default 0,   -- 0..100 %
  travel_time numeric           default 0,   -- seconds
  state text not null default 'CLEAR',       -- CLEAR | MODERATE | CONGESTED | INCIDENT
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists water_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  flow numeric                   default 0,   -- L/s
  pressure numeric               default 0,   -- bar
  leakage boolean not null default false,
  state text not null default 'NORMAL',       -- NORMAL | LEAK | LOW_PRESSURE | OFFLINE
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traffic_states_org on traffic_states (org_id);
create index if not exists idx_water_states_org on water_states (org_id);
-- ----------------------------------------------------------------------------
-- 3) Row-level security (multi-tenant isolation). Organization A can never see
--    organization B's traffic/water state, even via Realtime.
-- ----------------------------------------------------------------------------
alter table traffic_states enable row level security;
alter table water_states    enable row level security;

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

-- ----------------------------------------------------------------------------
-- 4) Supabase Realtime (guarded — no duplicate publication entries)
-- ----------------------------------------------------------------------------
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
-- 5) Auto-create the matching state row when a device of that service is added.
--    Extends the existing lighting-state auto-row trigger to Traffic & Water.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6) Keep updated_at current on the new service state rows (reuses set_updated_at)
-- ----------------------------------------------------------------------------
drop trigger if exists touch_traffic_states on traffic_states;
create trigger touch_traffic_states
  before update on traffic_states
  for each row execute function public.set_updated_at();
drop trigger if exists touch_water_states on water_states;
create trigger touch_water_states
  before update on water_states
  for each row execute function public.set_updated_at();

-- ============================================================================
-- OPTIONAL real-data test seed (run intentionally, not part of schema install)
-- ============================================================================
-- Inserts a real device + current-state row per service so the data flow can be
-- verified. Uncomment to run once against the target organization.
--
-- insert into devices (org_id, service, device_key, display_id, display_name, type, mqtt_topic, status)
-- select o.id, v.svc, v.k, v.k, v.name, v.typ, v.topic, 'offline'
-- from organizations o
-- cross join (values
--   ('traffic', 'T-001', 'T-001', 'Segment Av. Mohammed V', 'TRAFFIC_SEGMENT_CONTROLLER', 'citypulse/traffic/telemetry'),
--   ('water',   'W-101', 'W-101', 'Pump Station 2',          'WATER_FLOW_CONTROLLER',     'citypulse/water/telemetry')
-- ) as v(svc, k, display_key, name, typ, topic);
--
-- update traffic_states set vehicle_count = 42, pending_vehicles = 5, density = 31,
--        congestion = 68, travel_time = 210, state = 'CONGESTED', online = true,
--        last_seen = now()
-- where device_id in (select d.id from devices d join organizations o on o.id = d.org_id);
--
-- update water_states set flow = 12.5, pressure = 4.2, leakage = false, state = 'NORMAL',
--        online = true, last_seen = now()
-- where device_id in (select d.id from devices d join organizations o on o.id = d.org_id);
-- ============================================================================
