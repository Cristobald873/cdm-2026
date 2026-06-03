import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";
import type { Match, Prediction } from "@/components/MatchCard";

export function useMatchesByStage(stage: string | string[]) {
  const stages = Array.isArray(stage) ? stage : [stage];
  const [data, setData] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.from("matches").select("*").in("stage", stages as any).order("kickoff_at").then(({ data: d }) => {
      if (mounted) { setData((d as Match[]) ?? []); setLoading(false); }
    });
    const unsub = subscribeRealtime("matches", (payload) => {
      const row = (payload.new ?? payload.old) as Match;
      if (!row || !stages.includes(row.stage)) return;
      setData((prev) => {
        if (payload.eventType === "DELETE") return prev.filter((m) => m.id !== row.id);
        const idx = prev.findIndex((m) => m.id === row.id);
        if (idx === -1) return [...prev, payload.new as Match].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
        const copy = [...prev]; copy[idx] = payload.new as Match; return copy;
      });
    });
    return () => { mounted = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages.join(",")]);
  return { data, loading };
}

export function useMyPredictions() {
  const [map, setMap] = useState<Record<string, Prediction>>({});
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setMap({}); return; }
      const { data } = await supabase.from("predictions").select("match_id, pred_home, pred_away, points_earned").eq("user_id", u.user.id);
      if (!mounted) return;
      const m: Record<string, Prediction> = {};
      (data ?? []).forEach((p: any) => { m[p.match_id] = { pred_home: p.pred_home, pred_away: p.pred_away, points_earned: p.points_earned }; });
      setMap(m);
    };
    load();
    const unsub = subscribeRealtime("predictions", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return map;
}
