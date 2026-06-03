import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";

export type MatchStat = { home_wins: number; draws: number; away_wins: number; total: number };

export function useMatchPredStats() {
  const [map, setMap] = useState<Map<string, MatchStat>>(new Map());
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_match_pred_stats");
      if (!mounted) return;
      const m = new Map<string, MatchStat>();
      (data ?? []).forEach((r: any) => {
        m.set(r.match_id, { home_wins: r.home_wins, draws: r.draws, away_wins: r.away_wins, total: r.total });
      });
      setMap(m);
    };
    load();
    const unsub = subscribeRealtime("predictions", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return map;
}

