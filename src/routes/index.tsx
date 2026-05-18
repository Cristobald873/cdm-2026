import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Trophy, Users, Calendar, Target } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<{ players: number; played: number; nextMatch: any | null; myRank: number | null }>({
    players: 0, played: 0, nextMatch: null, myRank: null,
  });

  useEffect(() => {
    (async () => {
      const [{ count: players }, { count: played }, { data: next }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("matches").select("*", { count: "exact", head: true }).not("real_home_score", "is", null),
        supabase.from("matches").select("*").gt("kickoff_at", new Date().toISOString()).order("kickoff_at").limit(1).maybeSingle(),
      ]);
      let myRank: number | null = null;
      if (user) {
        const { data: rows } = await supabase.from("predictions").select("user_id, points_earned");
        const totals = new Map<string, number>();
        (rows ?? []).forEach((r: any) => totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + (r.points_earned ?? 0)));
        const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
        const idx = sorted.findIndex(([id]) => id === user.id);
        myRank = idx === -1 ? null : idx + 1;
      }
      setStats({ players: players ?? 0, played: played ?? 0, nextMatch: next, myRank });
    })();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">…</div>;

  if (!user) {
    return (
      <section className="py-12 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="chip mx-auto mb-4 bg-gold">11 juin → 19 juillet 2026</p>
          <h1 className="font-display text-6xl text-foreground sm:text-8xl">
            PRONOS<br /><span className="text-gold">CDM 2026</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            La Coupe du Monde entre potes. Pronostiquez chaque match, défiez vos amis, dominez le classement.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/inscription" className="rounded-md bg-gold px-6 py-3 text-base font-bold">S'inscrire</Link>
            <Link to="/connexion" className="rounded-md border border-border px-6 py-3 text-base font-medium hover:bg-accent">Se connecter</Link>
          </div>
        </div>
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Target, t: "Score exact", v: "5 pts" },
            { icon: Trophy, t: "Bon résultat", v: "2-3 pts" },
            { icon: Users, t: "Éliminatoires", v: "Bonus" },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card p-4">
              <c.icon className="mx-auto h-6 w-6 text-gold" />
              <div className="mt-2 font-display text-3xl text-gold">{c.v}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.t}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl">{profile?.avatar}</span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Salut</p>
          <h1 className="font-display text-3xl">{profile?.pseudo}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Joueurs" value={String(stats.players)} />
        <Stat icon={Trophy} label="Mon rang" value={stats.myRank ? `#${stats.myRank}` : "—"} />
        <Stat icon={Target} label="Matchs joués" value={String(stats.played)} />
        <Stat icon={Calendar} label="Total matchs" value="104" />
      </div>

      {stats.nextMatch && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prochain match</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-display text-2xl">{stats.nextMatch.home_team} vs {stats.nextMatch.away_team}</span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(stats.nextMatch.kickoff_at), "EEE d MMM HH:mm", { locale: fr })}
            </span>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link to="/pronostics/groupes" className="rounded-xl border border-border bg-card p-5 hover:border-primary">
          <h3 className="font-display text-2xl">Pronos groupes</h3>
          <p className="text-sm text-muted-foreground">72 matchs de poules</p>
        </Link>
        <Link to="/pronostics/pre-tournoi" className="rounded-xl border border-border bg-card p-5 hover:border-primary">
          <h3 className="font-display text-2xl">Éliminatoires</h3>
          <p className="text-sm text-muted-foreground">Qualifiés, vainqueur, buteur</p>
        </Link>
        <Link to="/classements" className="rounded-xl border border-border bg-card p-5 hover:border-primary">
          <h3 className="font-display text-2xl">Classement</h3>
          <p className="text-sm text-muted-foreground">Live</p>
        </Link>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-gold" />
      <div className="mt-2 font-display text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
