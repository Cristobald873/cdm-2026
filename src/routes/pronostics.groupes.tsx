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
import { useMatchCommentCounts } from "@/lib/use-chat";
import { getScoreView } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/pronostics/groupes")({ component: Page });

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0h 00m";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function Page() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("ALL");
  const { data, loading } = useMatchesByStage("GROUP");
  const preds = useMyPredictions();
  const { players } = usePlayers();
  const allPreds = useAllPredictions();
  const stats = useMatchPredStats();
  const commentCounts = useMatchCommentCounts();
  const now = useNow(30_000);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(players.map((p) => p.id)));
  const deselectAll = () => setSelected(new Set());
  const selectedPlayers = players.filter((p) => selected.has(p.id));

  const base = filter === "ALL" ? data : data.filter((m) => m.group_letter === filter);

  const urgent = base
    .filter((m) => {
      if (getScoreView(m) !== null) return null;
      const ko = new Date(m.kickoff_at).getTime();
      const diff = ko - now;
      return diff > 0 && diff <= 24 * 60 * 60 * 1000;
    })
    .slice()
    .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

  const urgentIds = new Set(urgent.map((m) => m.id));

  const filtered = base
    .filter((m) => !urgentIds.has(m.id))
    .slice()
    .sort((a, b) => {
      const aDone = getScoreView(a) !== null ? 1 : 0;
      const bDone = getScoreView(b) !== null ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.kickoff_at.localeCompare(b.kickoff_at);
    });

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Phase de groupes</h1>
      <p className="text-sm text-muted-foreground">Sauvegarde automatique. Verrouillage au coup d'envoi.</p>

      <PlayerSelector players={players} selected={selected} onToggle={toggle} onSelectAll={selectAll} onDeselectAll={deselectAll} />

      <div className="mt-4 flex flex-wrap gap-1">
        <Btn active={filter === "ALL"} onClick={() => setFilter("ALL")}>Tous</Btn>
        {GROUP_LETTERS.map((g) => (
          <Btn key={g} active={filter === g} onClick={() => setFilter(g)}>Groupe {g}</Btn>
        ))}
      </div>

      {!user && <p className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">Connecte-toi pour pronostiquer.</p>}

      {filter !== "ALL" && <div className="mt-4"><GroupStandings group={filter} matches={data} /></div>}

      {urgent.length > 0 && (
        <div className="mt-6 rounded-xl border-2 border-orange-500/60 bg-orange-500/10 p-4 shadow-[0_0_24px_-8px] shadow-orange-500/40">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5 animate-pulse text-orange-400" />
            <h2 className="font-display text-xl text-orange-300">🔥 Fermeture imminente</h2>
            <span className="ml-auto rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-200">
              {urgent.length} match{urgent.length > 1 ? "s" : ""} &lt; 24h
            </span>
          </div>
          <p className="mb-3 text-xs text-orange-200/80">À pronostiquer avant le coup d'envoi — ne loupe pas la fenêtre !</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {urgent.map((m) => {
              const ko = new Date(m.kickoff_at).getTime();
              return (
                <div key={m.id} className="relative">
                  <div className="absolute -top-2 left-3 z-10 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                    ⏱ {formatCountdown(ko - now)}
                  </div>
                  <MatchCard match={m} prediction={preds[m.id]} selectedPlayers={selectedPlayers} predsForMatch={allPreds.get(m.id)} stat={stats.get(m.id)} commentCount={commentCounts.get(m.id) ?? 0} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? <p className="mt-6 text-muted-foreground">Chargement…</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} prediction={preds[m.id]} selectedPlayers={selectedPlayers} predsForMatch={allPreds.get(m.id)} stat={stats.get(m.id)} commentCount={commentCounts.get(m.id) ?? 0} />
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

