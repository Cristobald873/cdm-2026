import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";
import { useAuth } from "@/lib/auth-context";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/stats")({ component: Page });

type Profile = { id: string; pseudo: string; avatar: string; color: string };
type Pred = { user_id: string; match_id: string; pred_home: number; pred_away: number; points_earned: number | null };
type PrePred = { user_id: string; points_earned: number | null };
type Match = { id: string; kickoff_at: string; real_home_score: number | null; real_away_score: number | null };

function Page() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [preds, setPreds] = useState<Pred[]>([]);
  const [pre, setPre] = useState<PrePred[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const reload = async () => {
    const [{ data: p }, { data: pr }, { data: pt }, { data: ms }] = await Promise.all([
      supabase.from("profiles").select("id,pseudo,avatar,color"),
      supabase.from("predictions").select("user_id,match_id,pred_home,pred_away,points_earned"),
      supabase.from("pre_tournament_predictions").select("user_id,points_earned"),
      supabase.from("matches").select("id,kickoff_at,real_home_score,real_away_score").order("kickoff_at"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setPreds((pr as Pred[]) ?? []);
    setPre((pt as PrePred[]) ?? []);
    setMatches((ms as Match[]) ?? []);
  };

  useEffect(() => {
    reload();
    const unsubs = [
      subscribeRealtime("profiles", reload),
      subscribeRealtime("predictions", reload),
      subscribeRealtime("pre_tournament_predictions", reload),
      subscribeRealtime("matches", reload),
    ];
    return () => { unsubs.forEach((u) => u()); };
  }, []);

  // Default: all players selected on first load
  useEffect(() => {
    if (profiles.length > 0 && selected.size === 0) {
      setSelected(new Set(profiles.map((p) => p.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const matchById = useMemo(() => {
    const m = new Map<string, Match>();
    matches.forEach((x) => m.set(x.id, x));
    return m;
  }, [matches]);

  // Played matches sorted by kickoff
  const playedMatches = useMemo(
    () => matches.filter((m) => m.real_home_score !== null && m.real_away_score !== null),
    [matches]
  );

  // Progression: one point per match-day (YYYY-MM-DD)
  const progression = useMemo(() => {
    const oraclePts = new Map<string, number>();
    pre.forEach((p) => oraclePts.set(p.user_id, (oraclePts.get(p.user_id) ?? 0) + (p.points_earned ?? 0)));

    const predsByMatch = new Map<string, Pred[]>();
    preds.forEach((p) => {
      const arr = predsByMatch.get(p.match_id) ?? [];
      arr.push(p);
      predsByMatch.set(p.match_id, arr);
    });

    const days = Array.from(new Set(playedMatches.map((m) => m.kickoff_at.slice(0, 10)))).sort();
    const cumul = new Map<string, number>();
    profiles.forEach((p) => cumul.set(p.id, oraclePts.get(p.id) ?? 0));

    const rows: Record<string, any>[] = [];
    // Initial baseline (oracle only) so the line starts before first match day
    if (days.length > 0) {
      const initial: Record<string, any> = { day: "Pré" };
      profiles.forEach((p) => { initial[p.id] = cumul.get(p.id) ?? 0; });
      rows.push(initial);
    }
    days.forEach((day) => {
      const matchesOfDay = playedMatches.filter((m) => m.kickoff_at.slice(0, 10) === day);
      matchesOfDay.forEach((m) => {
        (predsByMatch.get(m.id) ?? []).forEach((pr) => {
          cumul.set(pr.user_id, (cumul.get(pr.user_id) ?? 0) + (pr.points_earned ?? 0));
        });
      });
      const row: Record<string, any> = {
        day: new Date(day).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      };
      profiles.forEach((p) => { row[p.id] = cumul.get(p.id) ?? 0; });
      rows.push(row);
    });
    return rows;
  }, [profiles, preds, pre, playedMatches]);

  // Per-player stats
  const perPlayer = useMemo(() => {
    const m = new Map<string, {
      exact: number; good: number; wrong: number;
      goals: number;
      best: number;
      streak: number;
      success: number;
      played: number;
    }>();
    profiles.forEach((p) => m.set(p.id, { exact: 0, good: 0, wrong: 0, goals: 0, best: 0, streak: 0, success: 0, played: 0 }));

    // Group predictions by user, ordered by match kickoff
    const byUser = new Map<string, { pred: Pred; match: Match }[]>();
    preds.forEach((pr) => {
      const mt = matchById.get(pr.match_id);
      if (!mt || mt.real_home_score === null || mt.real_away_score === null) return;
      const arr = byUser.get(pr.user_id) ?? [];
      arr.push({ pred: pr, match: mt });
      byUser.set(pr.user_id, arr);
    });

    byUser.forEach((arr, uid) => {
      arr.sort((a, b) => a.match.kickoff_at.localeCompare(b.match.kickoff_at));
      const s = m.get(uid); if (!s) return;
      let streak = 0;
      arr.forEach(({ pred, match }) => {
        s.played++;
        const exact = pred.pred_home === match.real_home_score && pred.pred_away === match.real_away_score;
        const goodResult = Math.sign(pred.pred_home - pred.pred_away) === Math.sign(match.real_home_score! - match.real_away_score!);
        if (exact) s.exact++;
        else if (goodResult) s.good++;
        else s.wrong++;
        if (pred.pred_home === match.real_home_score) s.goals++;
        if (pred.pred_away === match.real_away_score) s.goals++;
        const pts = pred.points_earned ?? 0;
        if (pts > s.best) s.best = pts;
        if (goodResult) streak++; else streak = 0;
      });
      s.streak = streak;
      s.success = s.played > 0 ? Math.round(((s.exact + s.good) / s.played) * 100) : 0;
    });
    return m;
  }, [profiles, preds, matchById]);

  const visibleProfiles = profiles.filter((p) => selected.has(p.id));

  if (!user) {
    return <section><p className="text-muted-foreground">Connecte-toi pour voir les stats.</p></section>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-gold">📈 Stats &amp; Progression</h1>
        <p className="text-sm text-muted-foreground">Visualise l'évolution du tournoi joueur par joueur.</p>
      </div>

      {/* Player pills */}
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Joueurs affichés</span>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setSelected(new Set(profiles.map((p) => p.id)))} className="text-muted-foreground hover:text-foreground">Tous</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">Aucun</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profiles.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <button key={p.id} onClick={() => toggle(p.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  isSel ? "border-primary bg-primary/20 text-foreground" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                style={isSel ? { borderColor: p.color } : undefined}>
                <span>{p.avatar}</span>
                <span>{p.pseudo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progression line chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-2xl text-gold">Progression au classement</h2>
        {progression.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Aucun match joué pour l'instant.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={progression} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {visibleProfiles.map((p) => (
                  <Line key={p.id} type="monotone" dataKey={p.id} name={`${p.avatar} ${p.pseudo}`}
                    stroke={p.color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Donuts: répartition des pronos */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-2xl text-gold">Répartition des pronos</h2>
        {visibleProfiles.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sélectionne au moins un joueur.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProfiles.map((p) => {
              const s = perPlayer.get(p.id)!;
              const data = [
                { name: "🎯 Exacts", value: s.exact, fill: "#f5c842" },
                { name: "✅ Bons", value: s.good, fill: "#22c55e" },
                { name: "❌ Ratés", value: s.wrong, fill: "#ef4444" },
              ];
              const total = s.exact + s.good + s.wrong;
              return (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span>{p.avatar}</span>
                    <span style={{ color: p.color }} className="font-semibold">{p.pseudo}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{total} prono{total > 1 ? "s" : ""}</span>
                  </div>
                  {total === 0 ? (
                    <p className="py-6 text-center text-xs italic text-muted-foreground">Aucun match joué</p>
                  ) : (
                    <div className="h-44">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bar: goals devinés */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-2xl text-gold">Buts correctement devinés</h2>
        {visibleProfiles.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sélectionne au moins un joueur.</p>
        ) : (
          <div className="w-full" style={{ height: Math.max(200, visibleProfiles.length * 48) }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={visibleProfiles.map((p) => ({
                  name: `${p.avatar} ${p.pseudo}`,
                  goals: perPlayer.get(p.id)?.goals ?? 0,
                  fill: p.color,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 13, fill: "#ffffff" }}
                  width={140}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="goals" radius={[0, 4, 4, 0]} barSize={28}>
                  {visibleProfiles.map((p) => <Cell key={p.id} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Mini stats per player */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display text-2xl text-gold">Stats individuelles</h2>
        {visibleProfiles.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sélectionne au moins un joueur.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProfiles.map((p) => {
              const s = perPlayer.get(p.id)!;
              return (
                <div key={p.id} className="rounded-lg border border-border p-3" style={{ borderLeft: `4px solid ${p.color}` }}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{p.avatar}</span>
                    <span style={{ color: p.color }} className="font-semibold">{p.pseudo}</span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li className="flex justify-between"><span className="text-muted-foreground">🏆 Meilleur match</span><span className="font-display text-gold">{s.best} pts</span></li>
                    <li className="flex justify-between"><span className="text-muted-foreground">🔥 Série en cours</span><span className="font-display">{s.streak}</span></li>
                    <li className="flex justify-between"><span className="text-muted-foreground">🎯 Taux de réussite</span><span className="font-display">{s.success}%</span></li>
                    <li className="flex justify-between text-xs text-muted-foreground"><span>Matchs pronostiqués joués</span><span>{s.played}</span></li>
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
