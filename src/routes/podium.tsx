import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";

export const Route = createFileRoute("/podium")({ component: Page });

type Row = { id: string; pseudo: string; avatar: string; color: string; points: number };

const fetchAllPredictions = async () => {
  const pageSize = 1000;
  let from = 0;
  const rows: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("predictions")
      .select("user_id,points_earned")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
};

function Page() {
  const [list, setList] = useState<Row[]>([]);
  useEffect(() => {
    const reload = async () => {
      const [{ data: profiles }, preds, { data: pre }] = await Promise.all([
        supabase.from("profiles").select("id,pseudo,avatar,color"),
        fetchAllPredictions(),
        supabase.from("pre_tournament_predictions").select("user_id,points_earned"),
      ]);
      const totals = new Map<string, number>();
      (preds ?? []).forEach((p: any) => totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_earned ?? 0)));
      (pre ?? []).forEach((p: any) => totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points_earned ?? 0)));
      const rows = (profiles ?? []).map((p: any) => ({ ...p, points: totals.get(p.id) ?? 0 }));
      rows.sort((a, b) => b.points - a.points);
      setList(rows);
    };
    reload();
    const unsubs = [
      subscribeRealtime("predictions", reload),
      subscribeRealtime("matches", reload),
      subscribeRealtime("pre_tournament_predictions", reload),
      subscribeRealtime("profiles", reload),
    ];
    return () => { unsubs.forEach((u) => u()); };
  }, []);

  const top3 = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <section>
      <h1 className="font-display text-4xl text-gold text-center">Podium</h1>

      <div className="mx-auto mt-8 flex max-w-2xl items-end justify-center gap-3">
        {[1, 0, 2].map((idx) => {
          const r = top3[idx];
          if (!r) return <div key={idx} className="flex-1" />;
          // idx is the rank-1 (0=1st, 1=2nd, 2=3rd). Tallest = 1st.
          const heightByRank = [180, 130, 90];
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={r.id} className="flex flex-1 flex-col items-center">
              <div className="text-5xl">{r.avatar}</div>
              <div className="mt-1 text-center font-bold" style={{ color: r.color }}>{r.pseudo}</div>
              <div className="font-display text-2xl text-gold">{r.points} pts</div>
              <div className="mt-2 w-full rounded-t-xl bg-card border border-border flex items-center justify-center text-4xl"
                style={{ height: heightByRank[idx] }}>
                {medals[idx]}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="mx-auto mt-10 max-w-xl space-y-2">
          {rest.map((r, i) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="w-6 text-muted-foreground">#{i + 4}</span>
                <span className="text-xl">{r.avatar}</span>
                <span style={{ color: r.color }}>{r.pseudo}</span>
              </div>
              <span className="font-display text-xl text-gold">{r.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
