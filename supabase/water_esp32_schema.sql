-- ============================================================================
-- CITYPULSE — WATER ESP32 TELEMETRY + UNIFIED EVENTS MIGRATION
-- ============================================================================
-- Aligns the Water service with the REAL ESP32 MQTT payloads:
--
--   citypulse/water/telemetry -> water_telemetry (history) + water_states (current)
--     { sensor_status, state, pressure, reference_pressure,
--       pressure_drop, pressure_drop_percent }
--
--   citypulse/water/events    -> shared public.events (NO per-service tables)
--     { type/event_type, previous_state, current_state, sensor_status, ... }
--
-- Non-destructive + idempotent: adds columns with IF NOT EXISTS, drops nothing,
-- deletes nothing. Legacy columns (flow, leakage) are preserved everywhere.
-- Traffic vocabulary (vehicle_count/density/overdue_vehicles/tmax/state) is
-- deliberately untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) WATER HISTORY (public.water_telemetry) — add the real ESP32 fields
-- ----------------------------------------------------------------------------
alter table public.water_telemetry add column if not exists sensor_status         text;
alter table public.water_telemetry add column if not exists reference_pressure    numeric;
alter table public.water_telemetry add column if not exists pressure_drop         numeric;
alter table public.water_telemetry add column if not exists pressure_drop_percent numeric;
alter table public.water_telemetry add column if not exists created_at            timestamptz default now();

create index if not exists idx_water_tel_device_ts on public.water_telemetry (device_id, ts desc);

-- ----------------------------------------------------------------------------
-- 2) WATER CURRENT STATE (public.water_states) — mirror of the latest payload
-- ----------------------------------------------------------------------------
alter table public.water_states add column if not exists sensor_status         text;
alter table public.water_states add column if not exists reference_pressure    numeric;
alter table public.water_states add column if not exists pressure_drop         numeric;
alter table public.water_states add column if not exists pressure_drop_percent numeric;

-- ----------------------------------------------------------------------------
-- 3) SHARED EVENTS TABLE — represent every service through service/device/type.
--    event_type REMAINS the canonical "type" column (no rename, no duplicates);
--    these columns carry the ESP32 transition details and the raw payload.
-- ----------------------------------------------------------------------------
alter table public.events add column if not exists previous_state text;
alter table public.events add column if not exists current_state  text;
alter table public.events add column if not exists sensor_status  text;
alter table public.events add column if not exists ts             timestamptz;
alter table public.events add column if not exists payload        jsonb;

create index if not exists idx_events_service_created on public.events (service, created_at desc);

-- ----------------------------------------------------------------------------
-- 4) LEGACY device_telemetry compatibility — extend so the legacy ingestion
--    path can carry the full Water payload without breaking Lighting/Traffic/
--    Waste (columns are additive and service-agnostic).
-- ----------------------------------------------------------------------------
alter table public.device_telemetry add column if not exists sensor_status         text;
alter table public.device_telemetry add column if not exists reference_pressure    numeric;
alter table public.device_telemetry add column if not exists pressure_drop         numeric;
alter table public.device_telemetry add column if not exists pressure_drop_percent numeric;

-- ----------------------------------------------------------------------------
-- 5) BRIDGE TRIGGER UPGRADE — same routing as before; the water branch now
--    forwards every ESP32 field into water_telemetry. Other branches are kept
--    byte-for-byte equivalent to service_telemetry_schema.sql.
-- ----------------------------------------------------------------------------
create or replace function public.route_service_telemetry() returns trigger
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
            (to_jsonb(new) ->> 'pending_vehicles'),
            (to_jsonb(new) ->> 'travel_time'));
  elsif svc = 'water' then
    insert into water_telemetry
      (org_id, device_id, ts, flow, pressure, leakage,
       sensor_status, state, reference_pressure, pressure_drop, pressure_drop_percent)
    values
      (new.org_id, new.device_id, coalesce(new.ts, now()), new.flow, new.pressure, new.leakage,
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

-- ----------------------------------------------------------------------------
-- 6) REALTIME — guardedly publish exactly once each (no duplicate entries)
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public'
                   and tablename='water_states') then
    alter publication supabase_realtime add table public.water_states;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public'
                   and tablename='water_telemetry') then
    alter publication supabase_realtime add table public.water_telemetry;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public'
                   and tablename='events') then
    alter publication supabase_realtime add table public.events;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 7) RLS SAFETY NET — org isolation already exists on these tables; this only
--    guarantees an org-scoped SELECT policy on a FRESH install. Existing
--    policies are never replaced or weakened.
-- ----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='water_states') then
    create policy "water_states: org scope" on public.water_states
      for select using (org_id = public.org_org_id(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='water_telemetry') then
    create policy "water_telemetry: org scope" on public.water_telemetry
      for select using (org_id = public.org_org_id(auth.uid()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='events') then
    create policy "events: org scope" on public.events
      for select using (org_id = public.org_org_id(auth.uid()));
  end if;
end $$;

-- ============================================================================
-- INGESTION NOTES (Fusion AI — no schema change needed to apply):
--  * timestamp is ESP32 UPTIME -> use MQTT reception time() for ts; never cast
--    uptime seconds to epoch.
--  * Resolve device UUID via devices.device_key = payload device_id ("water-001");
--    never insert the string into uuid columns. Skip unknown devices safely.
--  * Telemetry: INSERT water_telemetry, then UPSERT water_states (by device id).
--  * Events: INSERT public.events with event_type=payload.type, prev/current
--    states, sensor_status, source='fusion_ai', payload=complete JSON.
-- ============================================================================
