import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Centralized Realtime bus.
// Each Supabase table is subscribed to ONCE for the whole app lifetime.
// Components/hooks register listeners via subscribeRealtime / useRealtime
// instead of creating their own supabase.channel(...). This avoids
// "cannot add 'postgres_changes' callbacks after subscribe()" errors caused
// by duplicate channel names across components.

export type RealtimeTable =
  | "profiles"
  | "matches"
  | "predictions"
  | "pre_tournament_predictions"
  | "chat_messages";

export type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: any;
  old: any;
  schema: string;
  table: string;
};

type Listener = (payload: RealtimePayload) => void;

const listeners = new Map<RealtimeTable, Set<Listener>>();
const channels = new Map<RealtimeTable, ReturnType<typeof supabase.channel>>();

function ensureChannel(table: RealtimeTable) {
  if (channels.has(table)) return;
  const ch = supabase
    .channel(`realtime-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload) => {
        const set = listeners.get(table);
        if (!set) return;
        set.forEach((l) => {
          try {
            l(payload as unknown as RealtimePayload);
          } catch {
            /* swallow listener errors */
          }
        });
      }
    )
    .subscribe();
  channels.set(table, ch);
}

export function subscribeRealtime(table: RealtimeTable, cb: Listener): () => void {
  ensureChannel(table);
  let set = listeners.get(table);
  if (!set) {
    set = new Set();
    listeners.set(table, set);
  }
  set.add(cb);
  return () => {
    listeners.get(table)?.delete(cb);
  };
}

export function useRealtime(table: RealtimeTable, cb: Listener) {
  useEffect(() => subscribeRealtime(table, cb), [table, cb]);
}

// Convenience: subscribe to multiple tables with the SAME callback (typical
// "reload everything" pattern).
export function useRealtimeTables(tables: RealtimeTable[], cb: () => void) {
  useEffect(() => {
    const unsubs = tables.map((t) => subscribeRealtime(t, () => cb()));
    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join("|"), cb]);
}
