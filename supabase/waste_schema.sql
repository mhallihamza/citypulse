-- ============================================================================
-- CITYPULSE — WASTE SERVICE (Smart Bin) SCHEMA
-- ============================================================================
-- Non-destructive + idempotent. Adds exactly what Waste needs on top of the
-- existing shared infrastructure (devices / device_telemetry / events /
-- tickets). Reuses the per-service telemetry pattern already in place for
-- lighting / traffic / water.
--
--   ESP32/Smart Bin -> MQTT -> Fusion AI -> Supabase
--       device_telemetry (historical)  +  waste_states (current/latest)
--       -> Realtime -> React
--
-- Run AFTER: traffic_water_schema.sql, service_telemetry_schema.sql,
--            water_esp32_schema.sql (or just schema_full.sql).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Live Smart Bin state  (current/latest — one row per waste device)
-- ----------------------------------------------------------------------------
create table if not exists waste_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  level numeric default 0,              -- fill level %
  temperature numeric,                  -- °C
  humidity numeric,                     -- %
  status text not null default 'NORMAL',-- NORMAL | WARNING | …
  hand_detected boolean not null default false,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_waste_states_org on waste_states (org_id);

-- ----------------------------------------------------------------------------
-- 2) Waste HISTORICAL telemetry — extend waste_telemetry with the Smart Bin
--    payload fields (fill_level already exists; level maps to it).
-- ----------------------------------------------------------------------------
alter table waste_telemetry add column if not exists temperature numeric;
alter table waste_telemetry add column if not exists humidity numeric;
alter table waste_telemetry add column if not exists hand_detected boolean;
alter table waste_telemetry add column if not exists status text;
alter table waste_telemetry add column if not exists state text;

-- ----------------------------------------------------------------------------
-- 3) Shared device_telemetry — add the historical Waste columns (reused)
-- ----------------------------------------------------------------------------
alter table device_telemetry add column if not exists temperature numeric;
alter table device_telemetry add column if not exists humidity numeric;
alter table device_telemetry add column if not exists hand_detected boolean;

-- ----------------------------------------------------------------------------
-- 4) RLS — organization isolation (multi-tenant). Org A never sees org B.
-- ----------------------------------------------------------------------------
alter table waste_states enable row level security;

drop policy if exists "waste_states: org scope" on waste_states;
create policy "waste_states: org scope" on waste_states
  for select using (org_id = public.org_org_id(auth.uid()));
drop policy if exists "waste_states: org insert" on waste_states;
create policy "waste_states: org insert" on waste_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
drop policy if exists "waste_states: org update" on waste_states;
create policy "waste_states: org update" on waste_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));
-- ----------------------------------------------------------------------------
-- 5) Extend the existing devices->state trigger so registering a Waste device
--    auto-creates its waste_states row (no second competing trigger).
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
  elsif new.service = 'waste' then
    insert into waste_states (org_id, device_id)
    values (new.org_id, new.id)
    on conflict (device_id) do nothing;
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- 6) Bridge trigger: route legacy device_telemetry inserts into the correct
--    per-service table. Waste branch now carries the full Smart Bin payload
--    (via jsonb picks so older row shapes never error).
-- ----------------------------------------------------------------------------
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
    insert into waste_telemetry (org_id, device_id, ts, fill_level,
                                 temperature, humidity, hand_detected, status)
    values (new.org_id, new.device_id, coalesce(new.ts, now()),
            new.fill_level, new.temperature, new.humidity, new.hand_detected,
            (to_jsonb(new) ->> 'status'));
  end if;
  return new;
end $$;

drop trigger if exists telemetry_route_to_service on device_telemetry;
create trigger telemetry_route_to_service
  after insert on device_telemetry
  for each row execute function route_service_telemetry();

-- ----------------------------------------------------------------------------
-- 7) Realtime publication for waste_states (guarded — never duplicated)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'waste_states') then
    alter publication supabase_realtime add table public.waste_states;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 8) Backfill existing waste telemetry with the Smart Bin payload fields.
--    Guarded with NOT EXISTS on (device_id, ts) — re-runs never duplicate.
-- ----------------------------------------------------------------------------
insert into waste_telemetry (org_id, device_id, ts, fill_level,
                             temperature, humidity, hand_detected, status)
select t.org_id, t.device_id, t.ts, t.fill_level, t.temperature, t.humidity,
       t.hand_detected, (to_jsonb(t) ->> 'status')
from device_telemetry t
where t.fill_level is not null
  and not exists (select 1 from waste_telemetry w where w.device_id = t.device_id and w.ts = t.ts);

-- ============================================================================
-- READY — run the existing traffic_water_test_data.sql pattern to verify:
--   1. insert into devices (org_id, service='waste', device_key='SmartBin01', type='WASTE_SMART_BIN', ...)
--   2. insert into device_telemetry (org_id, device_id, fill_level, temperature, humidity, hand_detected, ts) ...
--        -> bridge trigger copies it to waste_telemetry
--   3. update waste_states set level, temperature, humidity, status, online, last_seen ...
--   4. Realtime -> React /app/waste updates instantly.
-- ============================================================================