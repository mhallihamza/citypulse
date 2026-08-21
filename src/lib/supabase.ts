import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client factory.
 *
 * Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local to connect
 * to your project (schema: supabase/schema.sql). Without credentials the
 * app runs in DEMO MODE and uses the local simulation engine with an
 * identical data shape — so swapping to Realtime is a drop-in change.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(url && anon);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 4 } },
    })
  : null;

/**
 * Subscription helper mirroring the live simulation.
 *
 *   subscribeRealtime(["devices", "events", "tickets"], (payload) => ...)
 *
 * wires a postgres_changes channel per table and returns an unsubscribe fn.
 */
export function subscribeRealtime(
  tables: string[],
  onPayload: (table: string, row: Record<string, unknown>, type: string) => void
): () => void {
  if (!supabase) return () => {};
  const channels = tables.map((table) =>
    supabase
      .channel(`citypulse:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          if (payload.eventType === "DELETE") {
            onPayload(table, {}, "delete");
          } else if (payload.new) {
            onPayload(table, payload.new as Record<string, unknown>, payload.eventType);
          }
        }
      )
      .subscribe()
  );
  return () => channels.forEach((c) => supabase.removeChannel(c));
}

export function signInWithGoogle() {
  if (!supabase) return;
  void supabase.auth.signInWithOAuth({ provider: "google" });
}