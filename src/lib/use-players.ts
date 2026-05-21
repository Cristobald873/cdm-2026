import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    const ch = supabase
      .channel("players")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);
  return { players, loading };
}

export function useAllPredictions() {
  const [byMatch, setByMatch] = useState<Map<string, AnyPrediction[]>>(new Map());
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("predictions")
        .select("user_id,match_id,pred_home,pred_away,points_earned");
      if (!mounted) return;
      const m = new Map<string, AnyPrediction[]>();
      ((data as AnyPrediction[]) ?? []).forEach((p) => {
        const arr = m.get(p.match_id) ?? [];
        arr.push(p);
        m.set(p.match_id, arr);
      });
      setByMatch(m);
    };
    load();
    const ch = supabase
      .channel("all-preds")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
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
    const ch = supabase
      .channel("all-prepreds")
      .on("postgres_changes", { event: "*", schema: "public", table: "pre_tournament_predictions" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);
  return list;
}
