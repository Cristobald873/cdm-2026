import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMatchesByStage, useMyPredictions } from "@/lib/use-matches";
import { MatchCard } from "@/components/MatchCard";
import { GROUP_LETTERS } from "@/lib/teams";
import { useAuth } from "@/lib/auth-context";
import { PlayerSelector } from "@/components/PlayerSelector";
import { usePlayers, useAllPredictions } from "@/lib/use-players";
import { GroupStandings } from "@/components/GroupStandings";
import { useMatchPredStats } from "@/lib/use-match-stats";

export const Route = createFileRoute("/pronostics/groupes")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("ALL");
  const { data, loading } = useMatchesByStage("GROUP");
  const preds = useMyPredictions();
  const { players } = usePlayers();
  const allPreds = useAllPredictions();
  const stats = useMatchPredStats();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedPlayers = players.filter((p) => selected.has(p.id));
  const filtered = filter === "ALL" ? data : data.filter((m) => m.group_letter === filter);

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Phase de groupes</h1>
      <p className="text-sm text-muted-foreground">Sauvegarde automatique. Verrouillage au coup d'envoi.</p>

      <PlayerSelector players={players} selected={selected} onToggle={toggle} />

      <div className="mt-4 flex flex-wrap gap-1">
        <Btn active={filter === "ALL"} onClick={() => setFilter("ALL")}>Tous</Btn>
        {GROUP_LETTERS.map((g) => (
          <Btn key={g} active={filter === g} onClick={() => setFilter(g)}>Groupe {g}</Btn>
        ))}
      </div>

      {!user && <p className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">Connecte-toi pour pronostiquer.</p>}

      {filter !== "ALL" && <div className="mt-4"><GroupStandings group={filter} matches={data} /></div>}


      {loading ? <p className="mt-6 text-muted-foreground">Chargement…</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} prediction={preds[m.id]} selectedPlayers={selectedPlayers} predsForMatch={allPreds.get(m.id)} stat={stats.get(m.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function Btn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-gold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}
