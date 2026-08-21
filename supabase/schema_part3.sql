-- ============================================================================
-- CITYPULSE — part 3: Row Level Security & triggers
-- ============================================================================

alter table organizations, profiles, services, locations, devices,
  device_telemetry, operators, events, tickets, ticket_assignments,
  ticket_comments, notifications, ai_insights enable row level security;

-- Scope any table to the caller's organization.
create or replace function public.org_id_of(uid uuid)
returns uuid language sql stable as $$ select organization_id from profiles where id = uid $$;

create or replace function public.grant_org_select(tab text)
returns void language plpgsql as $$
begin
  execute format(
    'drop policy if exists "org scope" on %I; ' ||
    'create policy "org scope" on %I for select using (org_id = public.org_id_of(auth.uid()));',
    tab, tab
  );
end $$;

select public.grant_org_select('devices');
select public.grant_org_select('device_telemetry');
select public.grant_org_select('events');
select public.grant_org_select('tickets');
select public.grant_org_select('ticket_assignments');
select public.grant_org_select('ticket_comments');
select public.grant_org_select('notifications');
select public.grant_org_select('ai_insights');
select public.grant_org_select('operators');
select public.grant_org_select('services');
select public.grant_org_select('locations');

-- A new critical event automatically raises a high-priority ticket.
create or replace function public.events_to_tickets()
returns trigger language plpgsql as $$
begin
  if new.severity = 'critical' and new.status = 'new' then
    insert into tickets (org_id, ticket_key, title, service, priority, status, device_id, description, created_by)
    values (
      new.org_id,
      upper(substr(new.service::text,1,3)) || '-' || coalesce(new.device_key, gen_random_uuid()::text),
      new.title, new.service, 'high', 'open', new.device_id, new.detail, 'CITYPULSE AI'
    )
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger events_to_tickets after insert on events
  for each row execute function public.events_to_tickets();

-- Keep tickets.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger touch_tickets before update on tickets
  for each row execute function public.set_updated_at();
