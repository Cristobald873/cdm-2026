import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMatchesByStage, useMyPredictions } from "@/lib/use-matches";
import { MatchCard } from "@/components/MatchCard";
import { GROUP_LETTERS } from "@/lib/teams";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/pronostics/groupes")({ component: Page });

function Page() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("ALL");
  const { data, loading } = useMatchesByStage("GROUP");
  const preds = useMyPredictions();
  const filtered = filter === "ALL" ? data : data.filter((m) => m.group_letter === filter);

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Phase de groupes</h1>
      <p className="text-sm text-muted-foreground">Sauvegarde automatique. Verrouillage au coup d'envoi.</p>

      <div className="mt-4 flex flex-wrap gap-1">
        <Btn active={filter === "ALL"} onClick={() => setFilter("ALL")}>Tous</Btn>
        {GROUP_LETTERS.map((g) => (
          <Btn key={g} active={filter === g} onClick={() => setFilter(g)}>Groupe {g}</Btn>
        ))}
      </div>

      {!user && <p className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">Connecte-toi pour pronostiquer.</p>}

      {loading ? <p className="mt-6 text-muted-foreground">Chargement…</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} prediction={preds[m.id]} />
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
