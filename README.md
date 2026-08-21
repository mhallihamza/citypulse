# CITYPULSE — Smart City Operations Platform

CITYPULSE is a production-quality Smart City Operations Platform that connects IoT
devices, real-time telemetry, city infrastructure services, AI analysis, incidents,
tickets and field operators into one interface.

```
ESP32 / IoT Sensors → MQTT → Backend / MQTT Processing → Supabase PostgreSQL
  → Supabase Realtime → React app → Operators / AI / Tickets
```

> **Demo mode:** the app is fully interactive out of the box. Without Supabase
> credentials it runs a **live simulation engine** (`src/lib/simulate.ts`) that
> streams telemetry, events, tickets and notifications every ~3 seconds — exactly
> matching what a Supabase Realtime subscription delivers. Add credentials to switch
> to live data with zero UI changes.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173 (hash router)
```

**Sign in:** use the demo email/password, or click a role-protected demo
(Admin / Supervisor / Operator / Viewer) on the login page.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build
- `npm run typecheck` — TypeScript check only

## Project structure

```
supabase/           schema.sql + _part2/_part3  (PostgreSQL, RLS, triggers)
src/
  lib/              types (domain model), mock seed data, live simulation,
                    chart helpers, supabase client, formatting
  context/          AppContext (auth, store, realtime tick, all actions)
  components/
    ui/             design system (Button, Card, Badge, Modal, Tabs, StatCard…)
    layout/         AppShell (sidebar/topbar/mobile nav) + PublicLayout
    map/            CityMap — interactive SVG blueprint map with layers & popups
  pages/
    public/         Marketing site (Home, Platform, Solutions, About)
    auth/           Login, Register, Onboarding
    app/            Dashboard, CityMap, Service pages, Device detail,
                    Events, Tickets, Operators, AI Insights, Analytics,
                    Devices, Notifications, Settings
```

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql`, `schema_part2.sql`, `schema_part3.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
4. `src/lib/supabase.ts` exposes `subscribeRealtime(["devices","events","tickets",…], cb)`
   which wires `postgres_changes` channels per table. The simulation engine uses the
   same data shape, so wiring them together is mechanical.

### Real-time entities

`devices`, `device_telemetry`, `events`, `tickets`, `ticket_assignments`,
`notifications`, `operators`, `ai_insights` — all scoped per-organization via
Row Level Security (`org_id_of(auth.uid())`).

## Roles

- **Admin** — full access.
- **Supervisor** — monitor operations, assign tickets, manage teams.
- **Operator** — monitor services, receive events, manage assigned tickets.
- **Viewer** — read-only.

## Design system

Buttons, cards, badges, tables, charts, maps, dropdowns, modals, tabs, tooltips,
alerts, notifications, timelines, status indicators and command controls, with
consistent spacing/typography and explicit states for Normal / Success / Warning /
Critical / Offline / Loading / Empty / Error.

## To-do / notes

- Map is an SVG "blueprint" style canvas (no third-party map tiles) so it works
  fully offline and themable. Swap `CityMap` internals for Leaflet/MapLibre if you
  need geo tiles; markers already accept real lat/lng.
- Command delivery (MQTT publish) is stubbed via the context; wire
  `toggleDeviceMode` → MQTT in production.
