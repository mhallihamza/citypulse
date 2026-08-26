-- ============================================================================
-- CITYPULSE — TRAFFIC + WATER REAL-DATA VERIFICATION WORKFLOW
-- ============================================================================
-- Run AFTER supabase/traffic_water_schema.sql. Execute section by section in
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
set vehicle_count = 84, pending_vehicles = 6, density = 34.5,
    congestion = 72, travel_time = 245, state = 'CONGESTED',
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
-- SECTION 5 — WATER telemetry history
-- ----------------------------------------------------------------------------
insert into device_telemetry (org_id, device_id, ts, flow, pressure)
select d.org_id, d.id, now() - (i || ' minutes')::interval,
       10.5 + (i % 6) * 1.3,       -- flow L/s
       3.4 + (i % 4) * 0.35        -- pressure bar
from devices d
cross join generate_series(1, 12) as i
where d.service = 'water' and d.device_key = 'W-101';

-- ----------------------------------------------------------------------------
-- SECTION 6 — WATER current state (normal)
-- ----------------------------------------------------------------------------
update water_states s
set flow = 14.2, pressure = 4.6, leakage = false, state = 'NORMAL',
    online = true, last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'water' and d.device_key = 'W-101';

-- ----------------------------------------------------------------------------
-- SECTION 7 — simulate a real LEAK: flip the water state + raise an event
--             -> React /app/water shows LEAK instantly via Realtime
-- ----------------------------------------------------------------------------
update water_states s
set flow = 21.8, pressure = 2.1, leakage = true, state = 'LEAK', last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'water' and d.device_key = 'W-101';

insert into events (org_id, service, device_id, device_key, title, event_type, severity, status, detail, source)
select d.org_id, 'water', d.id, d.device_key,
       'Leakage detected at Pump Station 2',
       'LEAKAGE_DETECTED', 'critical', 'new',
       'Pressure dropped to 2.1 bar while flow rose to 21.8 L/s — probable pipe leak.',
       'fusion_ai'
from devices d where d.service = 'water' and d.device_key = 'W-101';

-- ----------------------------------------------------------------------------
-- SECTION 8 — restore the leak (LEAK_REPAIRED, like LAMP_RESTORED for lighting)
-- ----------------------------------------------------------------------------
update water_states s
set flow = 13.9, pressure = 4.4, leakage = false, state = 'NORMAL', last_seen = now()
from devices d
where d.id = s.device_id and d.service = 'water' and d.device_key = 'W-101';

insert into events (org_id, service, device_id, device_key, title, event_type, severity, status, detail, source)
select d.org_id, 'water', d.id, d.device_key,
       'Leak repaired at Pump Station 2',
       'LEAK_REPAIRED', 'info', 'resolved',
       'Pressure restored to 4.4 bar; flow normalized at 13.9 L/s.',
       'fusion_ai'
from devices d where d.service = 'water' and d.device_key = 'W-101';