-- ============================================================================
-- CITYPULSE — part 2: operations entities & triggers (append to part 1)
-- ============================================================================

create table operators (
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

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null,
  device_id uuid references devices(id) on delete set null,
  device_key text, title text not null,
  severity severity not null default 'info',
  status event_status not null default 'new',
  detail text, source text not null default 'realtime',
  created_at timestamptz not null default now()
);
create index idx_events_created on events (created_at desc);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_key text unique not null,
  title text not null, service service_name not null,
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'open',
  device_id uuid references devices(id) on delete set null,
  description text, ai_analysis text, resolution text,
  attachment_count integer not null default 0,
  created_by text default 'CITYPULSE AI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  operator_id uuid not null references operators(id) on delete cascade,
  assigned_by text, assigned_at timestamptz not null default now()
);

create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author text not null, body text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  severity severity not null default 'info',
  title text not null, message text,
  read boolean not null default false,
  action_url text, created_at timestamptz not null default now()
);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null,
  title text not null, severity severity not null default 'info',
  confidence numeric not null default 0,
  observation text not null, evidence jsonb not null default '[]',
  recommendation text not null, devices text[] not null default '{}',
  status ins_status not null default 'new',
  created_at timestamptz not null default now()
);
