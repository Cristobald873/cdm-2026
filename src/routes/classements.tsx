import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/classements")({ component: Page });

type Profile = { id: string; pseudo: string; avatar: string; color: string };
type Pred = { user_id: string; match_id: string; pred_home: number; pred_away: number; points_earned: number | null };
type PrePred = { user_id: string; points_earned: number | null };
type Match = { id: string; real_home_score: number | null; real_away_score: number | null };

const TABS = [
  { k: "general", label: "🏆 Général" },
  { k: "exact", label: "🎯 Scores exacts" },
  { k: "good", label: "✅ Bons résultats" },
  { k: "goals", label: "🌍 Buts devinés" },
  { k: "oracle", label: "🔮 Oracle" },
  { k: "loose", label: "😂 Looseur" },
] as const;

const TAB_DESCRIPTIONS: Record<typeof TABS[number]["k"], string> = {
  general: "Le classement principal. Additionne tous tes points : matchs de groupes, éliminatoires et pronostics pré-tournoi. C'est celui-là qui compte pour le podium final.",
  exact: "Combien de fois tu as pronostiqué le score parfait (ex: 2-1 et c'était bien 2-1). Le plus dur à avoir — chaque score exact vaut 5 pts en poules et 10 pts en éliminatoires.",
  good: "Combien de fois tu as trouvé le bon vainqueur (ou le bon nul), même sans le score exact. Ça mesure ton instinct foot au-delà de la précision des scores.",
  goals: "Combien de buts individuels tu as devinés correctement. Si tu pronostiques 2-1 et que c'est 2-0, tu as quand même deviné le score de l'équipe qui a marqué 2. C'est le classement des vrais analystes offensifs.",
  oracle: "Tes pronostics faits avant le début du tournoi : les équipes qualifiées de chaque groupe (+2 pts chacune), le vainqueur final (+15 pts) et le meilleur buteur (+10 pts). Ce classement mesure ta vision long terme — impossible de rattraper ça en cours de route.",
  loose: "Le classement inversé. Trié du moins bon au meilleur. Celui qui finit en tête ici a une tournée à offrir.",
};

const fetchAllPredictions = async () => {
  const pageSize = 1000;
  let from = 0;
  const rows: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("predictions")
      .select("user_id,match_id,pred_home,pred_away,points_earned")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
};

function Page() {
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]["k"]>("general");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [preds, setPreds] = useState<Pred[]>([]);
  const [pre, setPre] = useState<PrePred[]>([]);
  const [matches, setMatches] = useState<Map<string, Match>>(new Map());

  const reload = async () => {
    const [{ data: p }, pr, { data: pt }, { data: ms }] = await Promise.all([
      supabase.from("profiles").select("id,pseudo,avatar,color"),
      fetchAllPredictions(),
      supabase.from("pre_tournament_predictions").select("user_id,points_earned"),
      supabase.from("matches").select("id,real_home_score,real_away_score"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setPreds((pr as Pred[]) ?? []);
    setPre((pt as PrePred[]) ?? []);
    const m = new Map<string, Match>(); ((ms as Match[]) ?? []).forEach((x) => m.set(x.id, x)); setMatches(m);
  };

  useEffect(() => {
    reload();
    const unsubs = [
      subscribeRealtime("predictions", reload),
      subscribeRealtime("matches", reload),
      subscribeRealtime("pre_tournament_predictions", reload),
      subscribeRealtime("profiles", reload),
    ];
    return () => { unsubs.forEach((u) => u()); };
  }, []);

  const ranking = useMemo(() => {
    const stats = new Map<string, { points: number; exact: number; good: number; goals: number; oracle: number }>();
    profiles.forEach((p) => stats.set(p.id, { points: 0, exact: 0, good: 0, goals: 0, oracle: 0 }));
    preds.forEach((pr) => {
      const s = stats.get(pr.user_id); if (!s) return;
      const m = matches.get(pr.match_id);
      if (!m || m.real_home_score === null || m.real_away_score === null) return;
      s.points += pr.points_earned ?? 0;
      if (pr.pred_home === m.real_home_score && pr.pred_away === m.real_away_score) {
        s.exact++;
        s.good++;
      } else {
        const pw = Math.sign(pr.pred_home - pr.pred_away);
        const rw = Math.sign(m.real_home_score - m.real_away_score);
        if (pw === rw) s.good++;
      }
      if (pr.pred_home === m.real_home_score) s.goals++;
      if (pr.pred_away === m.real_away_score) s.goals++;
    });
    pre.forEach((p) => { const s = stats.get(p.user_id); if (s) { s.oracle += p.points_earned ?? 0; s.points += p.points_earned ?? 0; }});
    const list = profiles.map((p) => ({ ...p, ...stats.get(p.id)! }));
    const key: keyof typeof list[0] = tab === "general" ? "points" : tab === "exact" ? "exact" : tab === "good" ? "good" : tab === "goals" ? "goals" : tab === "oracle" ? "oracle" : "points";
    list.sort((a, b) => (b[key] as number) - (a[key] as number));
    if (tab === "loose") list.reverse();
    return list;
  }, [profiles, preds, pre, matches, tab]);

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Classements</h1>
      <p className="text-sm text-muted-foreground">Mise à jour en temps réel.</p>

      <div className="mt-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.k ? "bg-gold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{TAB_DESCRIPTIONS[tab]}</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {ranking.length === 0 && <p className="p-6 text-center text-muted-foreground">Pas encore de joueurs.</p>}
        {ranking.map((r, i) => {
          const isMe = user?.id === r.id;
          const value =
            tab === "general" ? `${r.points} pts` :
            tab === "exact" ? `${r.exact}` :
            tab === "good" ? `${r.good}` :
            tab === "goals" ? `${r.goals}` :
            tab === "oracle" ? `${r.oracle} pts` :
            `${r.points} pts`;
          return (
            <div key={r.id} className={`flex items-center justify-between px-4 py-3 ${i < ranking.length - 1 ? "border-b border-border" : ""} ${isMe ? "bg-primary/10" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="w-8 text-center font-display text-xl text-muted-foreground">#{i + 1}</span>
                <span className="text-2xl">{r.avatar}</span>
                <span className="font-semibold" style={{ color: r.color }}>{r.pseudo}</span>
                {isMe && <span className="chip bg-gold">moi</span>}
              </div>
              <span className="font-display text-2xl text-gold">{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
