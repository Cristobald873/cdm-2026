import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlayers, useAllPredictions } from "@/lib/use-players";

export const Route = createFileRoute("/joueurs")({ component: Page });

function Page() {
  const { players } = usePlayers();
  const predsByMatch = useAllPredictions();
  const [totalMatches, setTotalMatches] = useState<number>(0);

  useEffect(() => {
    supabase.from("matches").select("id", { count: "exact", head: true }).then(({ count }) => {
      setTotalMatches(count ?? 0);
    });
  }, []);

  const { rankByUser, predsCountByUser } = useMemo(() => {
    const points = new Map<string, number>();
    const counts = new Map<string, number>();
    players.forEach((p) => { points.set(p.id, 0); counts.set(p.id, 0); });
    predsByMatch.forEach((arr) => {
      arr.forEach((pr) => {
        counts.set(pr.user_id, (counts.get(pr.user_id) ?? 0) + 1);
        if (pr.points_earned != null) points.set(pr.user_id, (points.get(pr.user_id) ?? 0) + pr.points_earned);
      });
    });
    const sorted = [...players].sort((a, b) => (points.get(b.id) ?? 0) - (points.get(a.id) ?? 0));
    const rank = new Map<string, number>();
    sorted.forEach((p, i) => rank.set(p.id, i + 1));
    return { rankByUser: rank, predsCountByUser: counts };
  }, [players, predsByMatch]);

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Joueurs</h1>
      <p className="text-sm text-muted-foreground">{players.length} joueur{players.length > 1 ? "s" : ""} inscrit{players.length > 1 ? "s" : ""}.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => {
          const rank = rankByUser.get(p.id);
          const count = predsCountByUser.get(p.id) ?? 0;
          return (
            <div key={p.id} className="rounded-xl border bg-card p-4" style={{ borderColor: p.color + "55" }}>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-3xl" style={{ background: p.color + "22" }}>
                  {p.avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xl" style={{ color: p.color }}>{p.pseudo}</div>
                  <div className="text-xs text-muted-foreground">
                    Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-secondary p-2 text-center">
                  <div className="text-xs text-muted-foreground">Rang général</div>
                  <div className="font-display text-xl text-gold">#{rank ?? "—"}</div>
                </div>
                <div className="rounded-md bg-secondary p-2 text-center">
                  <div className="text-xs text-muted-foreground">Pronos saisis</div>
                  <div className="font-display text-xl text-gold">{count}<span className="text-xs text-muted-foreground">/{totalMatches}</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link to="/classements" className="text-sm text-muted-foreground hover:text-foreground">Voir les classements détaillés →</Link>
      </div>
    </section>
  );
}
