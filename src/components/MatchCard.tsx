import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Lock, Unlock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export type Match = {
  id: string;
  stage: string;
  group_letter: string | null;
  match_number: number | null;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  venue: string | null;
  real_home_score: number | null;
  real_away_score: number | null;
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
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? "" : Math.max(0, Math.min(20, parseInt(v) || 0)));
      }}
      className="h-14 w-14 rounded-lg border border-border bg-input text-center font-display text-3xl text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
    />
  );
}

export function MatchCard({ match, prediction }: { match: Match; prediction?: Prediction | null }) {
  const { user } = useAuth();
  const locked = new Date(match.kickoff_at).getTime() <= Date.now();
  const hasResult = match.real_home_score !== null && match.real_away_score !== null;

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
    if (!user || locked) return;
    if (initialRef.current) { initialRef.current = false; return; }
    if (home === "" || away === "") return;
    setSaving(true);
    const t = setTimeout(async () => {
      const { error } = await supabase.from("predictions").upsert(
        { user_id: user.id, match_id: match.id, pred_home: Number(home), pred_away: Number(away) },
        { onConflict: "user_id,match_id" }
      );
      setSaving(false);
      if (error) toast.error("Erreur de sauvegarde");
    }, 800);
    return () => clearTimeout(t);
  }, [home, away, user, locked, match.id]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {format(new Date(match.kickoff_at), "EEE d MMM · HH:mm", { locale: fr })}
        </span>
        {hasResult ? (
          <span className="chip bg-result/20 text-result"><CheckCircle2 className="h-3 w-3" />Résultat</span>
        ) : locked ? (
          <span className="chip bg-locked/20 text-locked"><Lock className="h-3 w-3" />Verrouillé</span>
        ) : (
          <span className="chip bg-success/20 text-success"><Unlock className="h-3 w-3" />Ouvert</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right font-semibold">{match.home_team}</div>
        <div className="flex items-center gap-2">
          <ScoreInput value={home} onChange={setHome} disabled={locked || !user} />
          <span className="font-display text-xl text-muted-foreground">:</span>
          <ScoreInput value={away} onChange={setAway} disabled={locked || !user} />
        </div>
        <div className="font-semibold">{match.away_team}</div>
      </div>

      {hasResult && (
        <div className="mt-3 flex items-center justify-center gap-3 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Score réel</span>
          <span className="font-display text-2xl text-result">{match.real_home_score} - {match.real_away_score}</span>
          {prediction?.points_earned !== null && prediction?.points_earned !== undefined && (
            <span className={`chip ${prediction.points_earned > 0 ? "bg-gold text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              +{prediction.points_earned} pts
            </span>
          )}
        </div>
      )}

      {saving && <div className="mt-2 text-right text-xs text-muted-foreground">Sauvegarde…</div>}
    </div>
  );
}
