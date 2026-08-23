-- ============================================================================
-- CITYPULSE — part 2: operations entities (append to schema.sql, run before
-- schema_part3.sql). All rows below are tenant-scoped via `org_id`.
-- ============================================================================

-- Field operators (people / work crews). Optional for now; tickets can also be
-- assigned directly to organization users (profiles) via `tickets.assigned_to`.
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

-- ----------------------------------------------------------------------------
-- Events (written by Fusion AI from the MQTT stream)
-- ----------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null default 'lighting',
  device_id uuid references devices(id) on delete set null,
  device_key text,
  title text not null,
  -- e.g. LAMP_FAILURE, LAMP_RESTORED, DEVICE_OFFLINE, DISCONNECTED
  event_type text not null default 'EVENT',
  severity severity not null default 'info',
  status event_status not null default 'new',
  detail text,
  source text not null default 'fusion_ai',
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_events_created on events (org_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Tickets (work orders linked to devices / events / users)
-- ----------------------------------------------------------------------------
create table tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_key text not null,
  title text not null,
  service service_name not null default 'lighting',
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'open',
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
create index idx_tickets_org on tickets (org_id, updated_at desc);

create table ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  operator_id uuid references operators(id) on delete cascade,
  assigned_by text, assigned_at timestamptz not null default now()
);

create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_ticket_comments on ticket_comments (ticket_id, created_at);

-- ----------------------------------------------------------------------------
-- Live lighting state (one row per lighting device, updated by Fusion AI)
-- ----------------------------------------------------------------------------
create table lighting_states (
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid primary key references devices(id) on delete cascade,
  mode text not null default 'NORMAL',           -- NORMAL | OFF | FAILURE
  brightness integer not null default 0,          -- 0..100 commanded
  lux numeric,                                    -- measured illuminance
  presence boolean not null default false,        -- pedestrian/vehicle presence
  night boolean not null default true,
  lamp_failure boolean not null default false,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- ----------------------------------------------------------------------------
-- Device commands (UI writes here; Fusion AI consumes and delivers via MQTT)
-- ----------------------------------------------------------------------------
create table device_commands (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  command text not null,                          -- OFF | NORMAL | SET_BRIGHTNESS
  payload jsonb not null default '{}',
  status command_status not null default 'PENDING',
  requested_by uuid references profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  delivered_at timestamptz,
  ack_at timestamptz,
  error text
);
create index idx_commands_device on device_commands (org_id, device_id, requested_at desc);

-- ----------------------------------------------------------------------------
-- Audit log (operator actions, written by the platform)
-- ----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  action text not null,                           -- e.g. command.sent, ticket.updated
  entity_type text,
  entity_id text,
  detail text,
  created_at timestamptz not null default now()
);
create index idx_audit_org on audit_logs (org_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Secure invite-based organization membership
-- ----------------------------------------------------------------------------
create table organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  invite_code text unique not null,
  email text not null,
  role text not null default 'operator',
  status invite_status not null default 'PENDING',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  unique (org_id, email)
);

-- ----------------------------------------------------------------------------
-- Notifications & AI insights
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  severity severity not null default 'info',
  title text not null,
  message text,
  read boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);
create index idx_notifications_org on notifications (org_id, created_at desc);

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  service service_name not null default 'lighting',
  title text not null,
  severity severity not null default 'info',
  confidence numeric not null default 0,
  observation text not null,
  evidence jsonb not null default '[]',
  recommendation text not null,
  devices text[] not null default '{}',
  status ins_status not null default 'new',
  created_at timestamptz not null default now()
);
