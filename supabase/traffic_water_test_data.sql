-- ============================================================================
-- CITYPULSE — TRAFFIC + WATER REAL-DATA VERIFICATION WORKFLOW
-- ============================================================================
-- Run AFTER: traffic_water_schema.sql, service_telemetry_schema.sql,
-- water_esp32_schema.sql (all idempotent). Execute section by section in
-- the Supabase SQL editor and watch the React dashboards update live (the app
-- subscribes via Supabase Realtime; no page refresh is required).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 0 — resolve the target organization
-- ----------------------------------------------------------------------------
with org as (select id from organizations order by created_at limit 1)
select id as org_id, name from org;

-- ----------------------------------------------------------------------------
-- SECTION 1 — register a Traffic device (T-001) and a Water device (W-101).
--             The devices_to_lighting_state trigger auto-creates their state rows.
-- ----------------------------------------------------------------------------
insert into devices (org_id, service, device_key, display_id, display_name, type, mqtt_topic, status)
select o.id, v.svc, v.key, v.key, v.name, v.typ, 'citypulse/' || v.svc || '/' || v.key, 'offline'
from organizations o
cross join (values
  ('traffic', 'T-001', 'Segment Av. Mohammed V', 'TRAFFIC_SEGMENT_CONTROLLER'),
  ('water',   'W-101', 'Pump Station 2',          'WATER_FLOW_CONTROLLER')
) as v(svc, key, name, typ)
where not exists (
  select 1 from devices d where d.org_id = o.id and d.device_key = v.key
);

-- ----------------------------------------------------------------------------
-- SECTION 2 — Fusion AI simulation: write TRAFFIC telemetry history
--             (exactly what Fusion AI inserts after consuming MQTT)
-- ----------------------------------------------------------------------------
insert into device_telemetry (org_id, device_id, ts, vehicles, pending_vehicles, density, congestion, travel_time)
select d.org_id, d.id, now() - (i || ' minutes')::interval,
       30 + (i * 3) % 25,          -- vehicles
       (i % 7),                    -- pending_vehicles
       18 + (i * 2) % 22,          -- density
       25 + (i * 5) % 55,          -- congestion %
       120 + (i * 9) % 140         -- travel_time s
from devices d
cross join generate_series(1, 12) as i
where d.service = 'traffic' and d.device_key = 'T-001';

-- ----------------------------------------------------------------------------
-- SECTION 3 — Fusion AI simulation: update the TRAFFIC current state
--             -> React /app/traffic updates instantly via Realtime
-- ----------------------------------------------------------------------------
update traffic_states s
set vehicle_count = 84, overdue_vehicles = 6, density = 34.5,
    congestion = 72, tmax = 245, state = 'CONGESTED',
    online = true, last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'traffic' and d.device_key = 'T-001';
-- ----------------------------------------------------------------------------
-- SECTION 4 — raise a real TRAFFIC event (critical events auto-create a ticket
--             through the existing events_to_tickets trigger)
-- ----------------------------------------------------------------------------
insert into events (org_id, service, device_id, device_key, title, event_type, severity, status, detail, source)
select d.org_id, 'traffic', d.id, d.device_key,
       'Severe congestion on Segment Av. Mohammed V',
       'SEVERE_CONGESTION', 'critical', 'new',
       'Congestion 72% with average travel time of 245s over the last 10 minutes.',
       'fusion_ai'
from devices d where d.service = 'traffic' and d.device_key = 'T-001';

-- ----------------------------------------------------------------------------
-- SECTION 5 — WATER telemetry history (actual ESP32 payload shape):
--             { sensor_status, state, pressure, reference_pressure,
--               pressure_drop, pressure_drop_percent }  -> water_telemetry.
--             Pressure drop escalates until the device classifies MEDIUM_LEAK.
-- ----------------------------------------------------------------------------
insert into water_telemetry (org_id, device_id, ts, sensor_status, state,
                             pressure, reference_pressure, pressure_drop, pressure_drop_percent)
select d.org_id, d.id, now() - ((13 - i) || ' minutes')::interval,
       'OK',
       case when i > 9 then 'MEDIUM_LEAK' else null end,   -- state NULL until device classifies
       1100 - (i * 3.2)::numeric,      -- pressure (device units, not bar)
       1100,                           -- reference_pressure
       (i * 3.2)::numeric,             -- pressure_drop
       round((i * 3.2 / 11.0)::numeric, 2)  -- pressure_drop_percent
from devices d
cross join generate_series(1, 12) as i
where d.service = 'water' and d.device_key = 'W-101';

-- ----------------------------------------------------------------------------
-- SECTION 6 — WATER current state (latest reading -> water_states)
--             -> React /app/water updates instantly via Realtime
-- ----------------------------------------------------------------------------
update water_states s
set sensor_status = 'OK', state = 'MEDIUM_LEAK',
    pressure = 1061.6, reference_pressure = 1100,
    pressure_drop = 38.4, pressure_drop_percent = 3.49,
    online = true, last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'water' and d.device_key = 'W-101';

-- ----------------------------------------------------------------------------
-- SECTION 7 — WATER event on citypulse/water/events -> ONE row in the SHARED
--             events table (unified columns: previous_state/current_state/
--             sensor_status/payload). Exactly the documented ESP32 event shape:
--             { type: STATE_CHANGED, previous_state: MEDIUM_LEAK,
--               current_state: BLOCKAGE, ... }
-- ----------------------------------------------------------------------------
update water_states s
set state = 'BLOCKAGE', pressure = 809.32, reference_pressure = 1100,
    pressure_drop = 290.68, pressure_drop_percent = 26.43, last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'water' and d.device_key = 'W-101';

insert into events (org_id, service, device_id, device_key, title, event_type,
                    severity, status, detail, source, ts,
                    previous_state, current_state, sensor_status, payload)
select d.org_id, 'water', d.id, d.device_key,
       'Water state changed at Pump Station 2',
       'STATE_CHANGED', 'critical', 'new',
       'Pressure dropped 26.43% below the 1100 reference — flow obstruction detected.',
       'fusion_ai', now(),
       'MEDIUM_LEAK', 'BLOCKAGE', 'OK',
       '{"service":"water","device_id":"water-001","sensor_status":"OK","type":"STATE_CHANGED","previous_state":"MEDIUM_LEAK","current_state":"BLOCKAGE","pressure":809.32,"reference_pressure":1100,"pressure_drop":290.68,"pressure_drop_percent":26.43}'::jsonb
from devices d where d.service = 'water' and d.device_key = 'W-101';