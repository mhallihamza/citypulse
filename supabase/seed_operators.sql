-- ============================================================================
-- CITYPULSE — optional development seed for public.operators
-- ============================================================================
-- Run this ONLY against demo / staging environments to populate realistic
-- field operators. Production data should be created through the Operators
-- page (real Supabase writes) — never hardcoded in React.
--
-- The seed inserts one demo crew per organization. To restrict to a single
-- tenant, add a WHERE filter on organizations (e.g. WHERE o.slug = 'acme').
-- ============================================================================

insert into public.operators (org_id, name, role, email, phone, service, status, current_tickets, resolved_total, avg_resolution_min, last_activity)
select
  o.id,
  v.name,
  v.role,
  v.email,
  v.phone,
  v.service,
  v.status,
  v.current_tickets,
  v.resolved_total,
  v.avg_resolution_min,
  now()
from public.organizations o
cross join (values
  ('Ahmed Benali',      'Lighting Technician',  'ahmed.benali@citypulse.dev',    '+212-000-000-001', 'lighting', 'available', 1, 12, 45),
  ('Youssef Amrani',    'Electrical Technician', 'youssef.amrani@citypulse.dev',  '+212-000-000-002', 'lighting', 'busy',      2,  9, 38),
  ('Sara El Mansouri',  'Water Technician',     'sara.elmansouri@citypulse.dev', '+212-000-000-003', 'water',    'available', 0, 15, 30),
  ('Omar Alaoui',       'Waste Operator',       'omar.alaoui@citypulse.dev',     '+212-000-000-004', 'waste',    'busy',      3,  7, 52)
) as v(name, role, email, phone, service, status, current_tickets, resolved_total, avg_resolution_min)
on conflict do nothing;