import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Unlock, CheckCircle2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNow } from "@/lib/use-now";
import { formatParis, getScoreView, type MatchScoreInput } from "@/lib/format";
import { PercentBar } from "@/components/PercentBar";
import { toast } from "sonner";
import type { PlayerProfile, AnyPrediction } from "@/lib/use-players";
import type { MatchStat } from "@/lib/use-match-stats";

export type Match = MatchScoreInput & {
  id: string;
  stage: string;
  group_letter: string | null;
  match_number: number | null;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  venue: string | null;
  teams_confirmed?: boolean;
};

export type Prediction = {
  pred_home: number;
  pred_away: number;
  points_earned: number | null;
};

function ScoreInput({ value, onChange, disabled }: { value: number | ""; onChange: (v: number | "") => void; disabled?: boolean }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      inputMode="numeric"
      value={value}
      disabled={disabled}
      readOnly={disabled}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? "" : Math.max(0, Math.min(20, parseInt(v) || 0)));
      }}
      className="h-14 w-14 rounded-lg border border-border bg-input text-center font-display text-3xl text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
    />
  );
}

export function MatchCard({
  match,
  prediction,
  selectedPlayers,
  predsForMatch,
  stat,
}: {
  match: Match;
  prediction?: Prediction | null;
  selectedPlayers?: PlayerProfile[];
  predsForMatch?: AnyPrediction[];
  stat?: MatchStat;
}) {
  const { user } = useAuth();
  const now = useNow(30_000);
  const kickoff = new Date(match.kickoff_at).getTime();
  const locked = kickoff <= now;
  const teamsConfirmed = match.teams_confirmed !== false;

  const score = getScoreView(match);
  const winnerSide: "home" | "away" | null = score
    ? score.pens
      ? score.pens.winner
      : score.homeMain! > score.awayMain!
        ? "home"
        : score.awayMain! > score.homeMain!
          ? "away"
          : null
    : null;

  const [home, setHome] = useState<number | "">(prediction?.pred_home ?? "");
  const [away, setAway] = useState<number | "">(prediction?.pred_away ?? "");
  const [saving, setSaving] = useState(false);
  const initialRef = useRef(true);

  useEffect(() => {
    setHome(prediction?.pred_home ?? "");
    setAway(prediction?.pred_away ?? "");
    initialRef.current = true;
  }, [prediction?.pred_home, prediction?.pred_away]);

  useEffect(() => {
    if (!user || locked || !teamsConfirmed) return;
    if (initialRef.current) { initialRef.current = false; return; }
    if (home === "" || away === "") return;
    setSaving(true);
    const t = setTimeout(async () => {
      const { error } = await supabase.from("predictions").upsert(
        { user_id: user.id, match_id: match.id, pred_home: Number(home), pred_away: Number(away) },
        { onConflict: "user_id,match_id" }
      );
      setSaving(false);
      if (error) toast.error(error.message.includes("row-level") ? "Match verrouillé" : "Erreur de sauvegarde");
    }, 800);
    return () => clearTimeout(t);
  }, [home, away, user, locked, teamsConfirmed, match.id]);

  const others = (selectedPlayers ?? []).filter((p) => p.id !== user?.id);
  const predsByUser = new Map((predsForMatch ?? []).map((p) => [p.user_id, p]));

  return (
    <div className="relative rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {formatParis(match.kickoff_at)} <span className="opacity-60">(Paris)</span>
        </span>
        {score ? (
          <span className="chip bg-result/20 text-result"><CheckCircle2 className="h-3 w-3" />Résultat</span>
        ) : !teamsConfirmed ? (
          <span className="chip bg-locked/20 text-locked"><ShieldAlert className="h-3 w-3" />Fermé</span>
        ) : locked ? (
          <span className="chip bg-locked/20 text-locked"><Lock className="h-3 w-3" />Verrouillé</span>
        ) : (
          <span className="chip bg-success/20 text-success"><Unlock className="h-3 w-3" />Ouvert</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className={`text-right font-semibold ${winnerSide === "home" ? "text-gold" : ""}`}>{match.home_team}</div>
        <div className="flex items-center gap-2">
          <ScoreInput value={home} onChange={setHome} disabled={locked || !user || !teamsConfirmed} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <ScoreInput value={away} onChange={setAway} disabled={locked || !user || !teamsConfirmed} />
        </div>
        <div className={`font-semibold ${winnerSide === "away" ? "text-gold" : ""}`}>{match.away_team}</div>
      </div>

      {score && (
        <div className="mt-3 flex flex-col items-center gap-1 border-t border-border pt-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Score réel</span>
            <span className="font-display text-2xl text-result">
              {score.homeMain} - {score.awayMain}
              {score.suffix && <span className="ml-2 text-base text-muted-foreground">{score.suffix}</span>}
            </span>
            {prediction?.points_earned !== null && prediction?.points_earned !== undefined && (
              <span className={`chip ${prediction.points_earned > 0 ? "bg-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                +{prediction.points_earned} pts
              </span>
            )}
          </div>
          {score.pens && (
            <div className="text-xs font-semibold text-orange-400">
              ⚽ TAB&nbsp;{score.pens.home} – {score.pens.away}
              <span className="ml-2 text-muted-foreground">
                · {score.pens.winner === "home" ? match.home_team : match.away_team} qualifié
              </span>
            </div>
          )}
        </div>
      )}

      {!locked && teamsConfirmed && (predsForMatch?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            👥 Pronos des joueurs ({predsForMatch!.length} prono{predsForMatch!.length > 1 ? "s" : ""})
          </p>
          {(() => {
            const total = predsForMatch!.length;
            let h = 0, d = 0, a = 0;
            predsForMatch!.forEach((p) => {
              if (p.pred_home > p.pred_away) h++;
              else if (p.pred_home < p.pred_away) a++;
              else d++;
            });
            return (
              <ul className="space-y-1">
                <PercentBar label={`${match.home_team} gagne`} count={h} total={total} />
                <PercentBar label="Match nul" count={d} total={total} />
                <PercentBar label={`${match.away_team} gagne`} count={a} total={total} />
              </ul>
            );
          })()}
        </div>
      )}

      {locked && others.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">👁 Pronos des joueurs sélectionnés</p>
          <ul className="space-y-1 text-sm">
            {others.map((p) => {
              const pr = predsByUser.get(p.id);
              if (!pr) {
                return (
                  <li key={p.id} className="flex items-center gap-2 text-muted-foreground">
                    <span>—</span><span>{p.avatar}</span>
                    <span style={{ color: p.color }}>{p.pseudo}</span>
                    <span className="ml-auto text-xs italic">pas de prono</span>
                  </li>
                );
              }
              let badge: React.ReactNode = null;
              if (score && pr.points_earned !== null) {
                const exact = pr.pred_home === score.homeMain && pr.pred_away === score.awayMain;
                if (exact) badge = <span className="chip bg-gold text-primary-foreground">🎯 +{pr.points_earned} pts</span>;
                else if (pr.points_earned > 0) badge = <span className="chip bg-success/20 text-success">✅ +{pr.points_earned} pts</span>;
                else badge = <span className="chip bg-muted text-muted-foreground">❌ 0 pt</span>;
              }
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <span>{p.avatar}</span>
                  <span style={{ color: p.color }} className="font-medium">{p.pseudo}</span>
                  <span className="ml-auto font-display text-lg">{pr.pred_home} — {pr.pred_away}</span>
                  {badge}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {saving && <div className="mt-2 text-right text-xs text-muted-foreground">Sauvegarde…</div>}

      {!teamsConfirmed && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-background/85 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-700 shadow-lg shadow-gold/30">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="mt-3 font-display text-xl tracking-wide text-gold">PRONOS FERMÉS</p>
          <p className="mt-1 px-4 text-center text-xs text-muted-foreground">Ouverture dès que les équipes seront connues</p>
        </div>
      )}
    </div>
  );
}
