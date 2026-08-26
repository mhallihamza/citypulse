-- ============================================================================
-- CITYPULSE — part 3: Row Level Security, triggers & auth RPCs
-- Run after schema.sql and schema_part2.sql.
-- Every org-owned table is RLS-protected using the caller's profile
-- organization (frontend filtering is never the security boundary).
-- ============================================================================

-- Helper: the organization of the current authenticated user.
create or replace function public.org_org_id(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = uid
$$;

-- ------------------------------------------------------------
-- Enable RLS everywhere
-- ------------------------------------------------------------
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table services enable row level security;
alter table locations enable row level security;
alter table devices enable row level security;
alter table device_telemetry enable row level security;
alter table lighting_states enable row level security;
alter table traffic_states enable row level security;
alter table water_states enable row level security;
alter table device_commands enable row level security;
alter table audit_logs enable row level security;
alter table operators enable row level security;
alter table events enable row level security;
alter table tickets enable row level security;
alter table ticket_assignments enable row level security;
alter table ticket_comments enable row level security;
alter table organization_invites enable row level security;
alter table notifications enable row level security;
alter table ai_insights enable row level security;

-- ------------------------------------------------------------
-- Organizations & profiles (users)
-- ------------------------------------------------------------
create policy "orgs: select own" on organizations
  for select using (id = public.org_org_id(auth.uid()));

-- A user can always read/update their own profile; org-mates are readable so
-- tickets can be assigned to organization users.
create policy "profiles: select own or org" on profiles
  for select using (
    id = auth.uid()
    or (organization_id is not null and organization_id = public.org_org_id(auth.uid()))
  );

create policy "profiles: update own" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------------------
-- Services (uses organization_id column)
-- ------------------------------------------------------------
create policy "services: org scope" on services
  for select using (organization_id = public.org_org_id(auth.uid()));
create policy "services: org insert" on services
  for insert with check (organization_id = public.org_org_id(auth.uid()));
create policy "services: org update" on services
  for update using (organization_id = public.org_org_id(auth.uid()))
  with check (organization_id = public.org_org_id(auth.uid()));

-- ----------
-- Locations
-- ----------
create policy "locations: org scope" on locations
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "locations: org insert" on locations
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- Devices
-- --------
create policy "devices: org scope" on devices
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "devices: org insert" on devices
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "devices: org update" on devices
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- ----------
-- Telemetry
-- ----------
create policy "telemetry: org scope" on device_telemetry
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "telemetry: org insert" on device_telemetry
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- ---------------
-- Lighting states
-- ---------------
create policy "states: org scope" on lighting_states
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "states: org insert" on lighting_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "states: org update" on lighting_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

create policy "traffic_states: org scope" on traffic_states
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "traffic_states: org insert" on traffic_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "traffic_states: org update" on traffic_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

create policy "water_states: org scope" on water_states
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "water_states: org insert" on water_states
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "water_states: org update" on water_states
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- Commands
-- --------
create policy "commands: org scope" on device_commands
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "commands: org insert" on device_commands
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "commands: org update" on device_commands
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- Audit log
-- --------
create policy "audit: org scope" on audit_logs
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "audit: org insert" on audit_logs
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- ----------
-- Operators
-- ----------
create policy "operators: org scope" on operators
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "operators: org insert" on operators
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "operators: org update" on operators
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));
create policy "operators: org delete" on operators
  for delete using (org_id = public.org_org_id(auth.uid()));

-- --------
-- Events
-- --------
create policy "events: org scope" on events
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "events: org insert" on events
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "events: org update" on events
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- Tickets
-- --------
create policy "tickets: org scope" on tickets
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "tickets: org insert" on tickets
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "tickets: org update" on tickets
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

create policy "assignments: org scope" on ticket_assignments
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "assignments: org insert" on ticket_assignments
  for insert with check (org_id = public.org_org_id(auth.uid()));
create policy "assignments: org delete" on ticket_assignments
  for delete using (org_id = public.org_org_id(auth.uid()));

create policy "comments: org scope" on ticket_comments
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "comments: org insert" on ticket_comments
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- Invites
-- --------
create policy "invites: org scope" on organization_invites
  for select using (org_id = public.org_org_id(auth.uid()));

-- --------------
-- Notifications
-- --------------
create policy "notifications: org scope" on notifications
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "notifications: org update" on notifications
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));
create policy "notifications: org insert" on notifications
  for insert with check (org_id = public.org_org_id(auth.uid()));

-- --------
-- AI insights
-- --------
create policy "insights: org scope" on ai_insights
  for select using (org_id = public.org_org_id(auth.uid()));
create policy "insights: org update" on ai_insights
  for update using (org_id = public.org_org_id(auth.uid()))
  with check (org_id = public.org_org_id(auth.uid()));

-- ============================================================================
-- Triggers
-- ============================================================================

-- 1. Auto-create a public profile when an auth user signs up.
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
-- Security-definer RPCs used by the sign-up / join flows
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
-- The invite is bound to the caller's email; a code alone is never enough.
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
-- SUPABASE REALTIME — enable Postgres changes for the live dashboard tables.
-- The React dashboard subscribes with `postgres_changes` so device states,
-- commands, events, tickets and notifications update WITHOUT a page refresh.
-- In Supabase a table only emits change events once it is added to the
-- `supabase_realtime` publication (all tables exist after schema_part2.sql).
-- Each statement is guarded so re-running this file is safe.
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
