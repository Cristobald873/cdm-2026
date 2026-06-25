import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";

export type PlayerProfile = {
  id: string;
  pseudo: string;
  avatar: string;
  color: string;
  created_at: string;
};

export type AnyPrediction = {
  user_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  points_earned: number | null;
};

export type PrePred = {
  user_id: string;
  group_letter: string;
  qualified_1: string | null;
  qualified_2: string | null;
  tournament_winner: string | null;
  top_scorer: string | null;
};

export function usePlayers() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,pseudo,avatar,color,created_at")
        .order("created_at", { ascending: true });
      if (!mounted) return;
      setPlayers((data as PlayerProfile[]) ?? []);
      setLoading(false);
    };
    load();
    const unsub = subscribeRealtime("profiles", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return { players, loading };
}

export function useAllPredictions() {
  const [byMatch, setByMatch] = useState<Map<string, AnyPrediction[]>>(new Map());
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const pageSize = 1000;
      let from = 0;
      const rows: AnyPrediction[] = [];

      while (mounted) {
        const { data, error } = await supabase
          .from("predictions")
          .select("user_id,match_id,pred_home,pred_away,points_earned")
          .order("match_id", { ascending: true })
          .order("user_id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error || !data || data.length === 0) break;
        rows.push(...(data as AnyPrediction[]));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      if (!mounted) return;
      const m = new Map<string, AnyPrediction[]>();
      rows.forEach((p) => {
        const arr = m.get(p.match_id) ?? [];
        arr.push(p);
        m.set(p.match_id, arr);
      });
      setByMatch(m);
    };
    load();
    const unsub = subscribeRealtime("predictions", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return byMatch;
}

export function useAllPrePredictions() {
  const [list, setList] = useState<PrePred[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("pre_tournament_predictions")
        .select("user_id,group_letter,qualified_1,qualified_2,tournament_winner,top_scorer");
      if (!mounted) return;
      setList((data as PrePred[]) ?? []);
    };
    load();
    const unsub = subscribeRealtime("pre_tournament_predictions", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return list;
}

