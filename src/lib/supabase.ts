import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client factory for CITYPULSE.
 *
 * Environment variables (frontend-safe, publishable credentials ONLY):
 *   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
 *
 * NEVER put the service-role key, the database password, MQTT credentials or
 * Fusion AI secrets in VITE_ variables.
 *
 * Without valid credentials the platform renders a clear "connect your
 * Supabase project" state. There is no simulated/fake fallback.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const hasSupabase = Boolean(url && key);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 4 } },
    })
  : null;

/**
 * Subscribe to postgres_changes on org-owned tables.
 *
 * Authorization: Supabase Realtime broadcasts are additionally filtered by the
 * subscribing user's Row Level Security policies, so cross-tenant leakage is
 * prevented at the database level — never rely on client-side filtering.
 *
 * Returns an unsubscribe function; always call it when a component unmounts.
 */
export function subscribeOrgRealtime(
  tables: string[],
  onPayload: (table: string, row: Record<string, unknown>, event: "INSERT" | "UPDATE" | "DELETE") => void
): () => void {
  if (!supabase) return () => {};
  const channels = tables.map((table) =>
    supabase
      .channel(`citypulse:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const event = payload.eventType as "INSERT" | "UPDATE" | "DELETE";
          if (event === "DELETE") onPayload(table, (payload.old as Record<string, unknown>) ?? {}, event);
          else if (payload.new) onPayload(table, payload.new as Record<string, unknown>, event);
        }
      )
      .subscribe()
  );
  return () => channels.forEach((c) => void supabase.removeChannel(c));
}

export type { RealtimeChannel } from "@supabase/supabase-js";