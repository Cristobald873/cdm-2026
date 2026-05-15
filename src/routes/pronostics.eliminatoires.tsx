import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMatchesByStage, useMyPredictions } from "@/lib/use-matches";
import { MatchCard } from "@/components/MatchCard";
import { STAGE_LABELS } from "@/lib/teams";

export const Route = createFileRoute("/pronostics/eliminatoires")({ component: Page });

const STAGES = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"] as const;

function Page() {
  const [stage, setStage] = useState<string>("R32");
  const { data, loading } = useMatchesByStage(stage);
  const preds = useMyPredictions();

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Éliminatoires</h1>
      <p className="text-sm text-muted-foreground">Points × 2. Les équipes seront mises à jour par l'admin.</p>

      <div className="mt-4 flex flex-wrap gap-1">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setStage(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${stage === s ? "bg-gold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-6 text-muted-foreground">Chargement…</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.map((m) => <MatchCard key={m.id} match={m} prediction={preds[m.id]} />)}
        </div>
      )}
    </section>
  );
}
