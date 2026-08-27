-- ============================================================================
-- CITYPULSE — PER-SERVICE TELEMETRY TABLES (actual ESP32 payload shapes)
-- ============================================================================
-- Dedicated HISTORICAL telemetry per service, matching what each ESP32 really
-- sends over MQTT -> Fusion AI -> Supabase. The legacy shared device_telemetry
-- table is KEPT untouched as an ingestion path: a bridge trigger copies every
-- row into the correct service table so nothing breaks during transition.
--
--   lighting_telemetry : lux, brightness, presence, night, mode, lamp_failure
--   traffic_telemetry  : state, vehicle_count, density, overdue_vehicles, tmax
--   water_telemetry    : flow, pressure, leakage, state
--   waste_telemetry    : fill_level, state        (future service — ready)
--
-- CURRENT STATE stays in lighting_states / traffic_states / water_states.
-- Run order: supabase/traffic_water_schema.sql FIRST, then THIS file.
-- Idempotent + non-destructive: safe to run repeatedly, drops nothing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Align traffic CURRENT STATE names with the real ESP32 vocabulary
--    (pending_vehicles is actually overdue_vehicles: cars stuck between IR1
--    and IR2 past T-max; travel_time measured by IR1/IR2 pair is tmax).
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'traffic_states' and column_name = 'pending_vehicles') then
    alter table traffic_states rename column pending_vehicles to overdue_vehicles;
  end if;
end $$;
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'traffic_states' and column_name = 'travel_time') then
    alter table traffic_states rename column travel_time to tmax;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) LIGHTING TELEMETRY HISTORY
-- ----------------------------------------------------------------------------
create table if not exists lighting_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  lux numeric,
  brightness numeric,
  presence boolean,
  night boolean,
  mode text,
  lamp_failure boolean
);

-- ----------------------------------------------------------------------------
-- 2) TRAFFIC TELEMETRY HISTORY (IR1/IR2 segment sensors)
-- ----------------------------------------------------------------------------
create table if not exists traffic_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  state text,
  vehicle_count integer,
  density numeric,
  overdue_vehicles integer,   -- vehicles still between IR1 and IR2 past T-max
  tmax numeric                -- max allowed travel time on the segment (s)
);

-- ----------------------------------------------------------------------------
-- 3) WATER TELEMETRY HISTORY
-- ----------------------------------------------------------------------------
create table if not exists water_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  flow numeric,               -- L/s
  pressure numeric,           -- bar
  leakage boolean default false,
  state text
);

-- ----------------------------------------------------------------------------
-- 4) WASTE TELEMETRY HISTORY (future service — schema ready today)
-- ----------------------------------------------------------------------------
create table if not exists waste_telemetry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  ts timestamptz not null default now(),
  fill_level numeric,         -- %
  state text
);

-- ----------------------------------------------------------------------------
-- 5) Indexes for chart/history queries (device time series + org scans)
-- ----------------------------------------------------------------------------
create index if not exists idx_lt_device_ts on lighting_telemetry (device_id, ts desc);
create index if not exists idx_tt_device_ts on traffic_telemetry  (device_id, ts desc);
create index if not exists idx_wt_device_ts on water_telemetry    (device_id, ts desc);
create index if not exists idx_st_device_ts on waste_telemetry    (device_id, ts desc);
create index if not exists idx_lighting_tel_org on lighting_telemetry (org_id);
create index if not exists idx_traffic_tel_org  on traffic_telemetry  (org_id);
create index if not exists idx_water_tel_org    on water_telemetry    (org_id);
create index if not exists idx_waste_tel_org    on waste_telemetry    (org_id);

-- ----------------------------------------------------------------------------
-- 6) ROW-LEVEL SECURITY — organization isolation on every new table
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 7) Realtime publication (guarded — never duplicated)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 8) Bridge trigger: legacy ingestion keeps working. Any row inserted into the
--    shared device_telemetry is copied into the correct per-service table
--    according to devices.service. Fusion AI can keep writing to either path.
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
    -- ESP32 water payload: sensor_status/state/pressure/reference_pressure/
    -- pressure_drop/pressure_drop_percent arrive via legacy compat columns
    -- (added by water_esp32_schema.sql); jsonb picks tolerate older shapes.
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

-- ----------------------------------------------------------------------------
-- 9) One-time backfill of EXISTING history so charts keep their past data.
--    Guarded with NOT EXISTS on (device_id, ts) — re-runs never duplicate rows.
-- ----------------------------------------------------------------------------
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
-- Lighting ESP32 payload { lux, brightness, presence, night, mode, lamp_failure }:
--   insert into lighting_telemetry (org_id, device_id, lux, brightness, presence, night, mode, lamp_failure)
--   values (...);                       -- night/mode/lamp_failure only exist here
--
-- Traffic ESP32 payload { state, vehicle_count, density, overdue_vehicles, tmax }:
--   insert into traffic_telemetry (org_id, device_id, state, vehicle_count, density, overdue_vehicles, tmax)
--   values (...);
--
-- Water ESP32 { sensor_status, state, pressure, reference_pressure, pressure_drop, pressure_drop_percent }:
--   insert into water_telemetry (org_id, device_id, sensor_status, state, pressure, reference_pressure,
--                                pressure_drop, pressure_drop_percent) values (...);
--
-- Waste (future): insert into waste_telemetry (org_id, device_id, fill_level, state) values (...);
--
-- Legacy inserts into device_telemetry still work: the bridge trigger routes
-- them automatically (night/mode/lamp_failure have no legacy column and are
-- only captured by the direct path above).