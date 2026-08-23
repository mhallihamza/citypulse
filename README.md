# CITYPULSE — Smart City Operations Platform

CITYPULSE is a **multi-tenant Smart City Operations SaaS**. It connects IoT devices,
real-time telemetry, city infrastructure services, AI analysis, incidents, tickets
and field operations into one interface.

```
ESP32 / IoT Sensors -> MQTT -> Fusion AI (ingestion & processing) -> Supabase PostgreSQL
      -> Supabase Realtime -> React app -> Operators / Tickets / Commands
```

**CITYPULSE is the PLATFORM. LIGHTING is the currently implemented service.
Water, Waste and Traffic are future services** — they exist in navigation, the
dashboard and the data model, and render honest "service not connected yet"
states until real devices are onboarded. There is **no demo mode**: without
valid credentials the platform shows a "connect your Supabase project" state
instead of simulated data.

## Services

| Service  | Status | Notes                                            |
| -------- | ------ | ------------------------------------------------ |
| Lighting | Live   | Devices, live state, telemetry, events, commands |
| Water    | Future | Architecture ready - no fake data                |
| Waste    | Future | Architecture ready - no fake data                |
| Traffic  | Future | Architecture ready - no fake data                |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 (hash router)
```

1. Create a Supabase project.
2. In Supabase Studio -> SQL Editor, run **`supabase/schema_full.sql`** (single idempotent
   file — creates every table, RLS policy, trigger and RPC; safe to re-run).
   Alternatively run `schema.sql` -> `schema_part2.sql` -> `schema_part3.sql` in order.
3. Copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY`
4. Register an account, create your organization (you become ADMIN), then
   register lighting devices from **Lighting -> Devices**.

> Security: use only the publishable key in frontend code. Never place
> `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_PASSWORD`, `MQTT_PASSWORD` or
> `FUSION_AI_SECRET` in `VITE_` variables.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build
- `npm run typecheck` — TypeScript check only

## Architecture

```
supabase/           schema.sql + _part2 + _part3 (tables, RLS, triggers, RPCs)
src/
  lib/
    types.ts        domain model mapped 1:1 to database rows
    services.ts     service registry (lighting live; water/waste/traffic future)
    supabase.ts     client + org-safe Realtime subscription helper
    api.ts          typed queries/mutations (all organization-scoped)
    format.ts       display helpers
  context/          AppContext — Supabase Auth + org-scoped data + Realtime
  components/
    ui/             design system (Button, Card, Badge, Modal, Tabs...)
    layout/         AppShell (sidebar/topbar/mobile nav) + PublicLayout
    map/            CityMap — blueprint map placed ONLY from real lat/lng
  pages/
    public/         Marketing site (Home, Platform, Solutions, About)
    auth/           Login, Register (create-org / join-by-invite), Onboarding
    app/            Dashboard = CITY OVERVIEW, Events, Tickets, TicketDetail,
                    Notifications, AI Insights, Settings, CityMap
    app/lighting/   Lighting dashboard, Devices (+create), Device detail
                    (Overview/Telemetry/Events/Commands/Tickets), Map, Commands
```

## Multi-tenant security

- `profiles` rows link `auth.users` to an `organization_id` (created by a trigger).
- Every tenant-owned table carries `org_id` / `organization_id` with RLS policies
  scoped through `public.org_org_id(auth.uid())`.
- Joining an existing organization requires an admin-issued invite code bound to
  the invitee's email (`join_organization` RPC) — never just a typed name.
- Realtime payloads are additionally filtered by RLS server-side.

## Command flow (no MQTT in React)

```
UI click (OFF / NORMAL / SET_BRIGHTNESS)
  -> insert into device_commands (status PENDING)
  -> Database Webhook / Edge Function -> Fusion AI -> MQTT -> ESP32
  -> status becomes DELIVERED / FAILED -> Supabase Realtime -> UI refresh
```

The UI only ever displays what the database confirms.

## Data flow test checklist

1. Sign up, confirm email, sign in, create organization.
2. Lighting -> Devices -> Add device (e.g. `L-104`, type `ESP32_LIGHTING_CONTROLLER`,
   optional latitude/longitude). A `lighting_states` row is created automatically.
3. Insert real telemetry into `device_telemetry` (from Fusion AI) -> charts appear.
4. Insert an event into `events` (e.g. `LAMP_FAILURE`, severity `critical`) -> it
   appears in Events instantly via Realtime; a ticket is auto-created by trigger.
5. Update the event to `resolved` / insert `LAMP_RESTORED` -> the UI updates live.
6. Device page -> Turn OFF -> a PENDING row appears in `device_commands`;
   mark it DELIVERED from Fusion AI and watch the status change.