import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { GROUP_LETTERS, TEAMS_BY_GROUP, STAGE_LABELS, ALL_TEAMS } from "@/lib/teams";
import { formatParis } from "@/lib/format";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notifyMatchEnded, notifyElimOpen } from "@/lib/push.functions";

export const Route = createFileRoute("/admin")({ component: Page });

type Match = {
  id: string; stage: string; group_letter: string | null; match_number: number | null;
  home_team: string; away_team: string; kickoff_at: string;
  real_home_score: number | null; real_away_score: number | null;
  real_home_score_90: number | null; real_away_score_90: number | null;
  real_home_score_aet: number | null; real_away_score_aet: number | null;
  real_home_score_pens: number | null; real_away_score_pens: number | null;
  penalty_winner: "home" | "away" | null;
  went_to_aet: boolean; went_to_penalties: boolean;
  teams_confirmed: boolean;
};

const STAGES = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"] as const;

function Page() {
  const { profile, loading } = useAuth();
  const [stage, setStage] = useState<string>("GROUP");
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupRes, setGroupRes] = useState<Record<string, { qualified_1: string; qualified_2: string }>>({});
  const [settings, setSettings] = useState<{ real_winner: string; real_top_scorer: string }>({ real_winner: "", real_top_scorer: "" });

  const reload = async () => {
    const { data: ms } = await supabase.from("matches").select("*").order("kickoff_at");
    setMatches((ms as Match[]) ?? []);
    const { data: gr } = await supabase.from("group_results").select("*");
    const map: any = {};
    GROUP_LETTERS.forEach((g) => map[g] = { qualified_1: "", qualified_2: "" });
    (gr ?? []).forEach((r: any) => map[r.group_letter] = { qualified_1: r.qualified_1 ?? "", qualified_2: r.qualified_2 ?? "" });
    setGroupRes(map);
    const { data: ts } = await supabase.from("tournament_settings").select("*").eq("id", 1).maybeSingle();
    if (ts) setSettings({ real_winner: (ts as any).real_winner ?? "", real_top_scorer: (ts as any).real_top_scorer ?? "" });
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => matches.filter((m) => m.stage === stage), [matches, stage]);

  if (loading) return <p className="text-muted-foreground">…</p>;
  if (!profile?.is_admin) return (
    <div className="rounded-xl border border-destructive/40 bg-card p-6 text-center">
      <h1 className="font-display text-3xl">Accès refusé</h1>
      <p className="text-muted-foreground">Cette page est réservée aux admins.</p>
    </div>
  );

  return (
    <section>
      <h1 className="font-display text-4xl text-gold">Admin</h1>

      <h2 className="mt-6 font-display text-2xl">Matchs</h2>
      <div className="mt-2 flex flex-wrap gap-1">
        {STAGES.map((s) => (
          <button key={s} onClick={() => setStage(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${stage === s ? "bg-gold" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.map((m) => <AdminMatchRow key={m.id} match={m} onSaved={reload} editTeams={m.stage !== "GROUP"} />)}
      </div>

      <h2 className="mt-10 font-display text-2xl">Qualifiés réels par groupe</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {GROUP_LETTERS.map((g) => (
          <div key={g} className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-display text-xl text-gold">Groupe {g}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([1, 2] as const).map((n) => (
                <select key={n} value={(groupRes[g] as any)?.[`qualified_${n}`] ?? ""}
                  onChange={async (e) => {
                    const v = e.target.value;
                    const next = { ...groupRes[g], [`qualified_${n}`]: v } as any;
                    setGroupRes({ ...groupRes, [g]: next });
                    await supabase.from("group_results").upsert({
                      group_letter: g,
                      qualified_1: next.qualified_1 || null,
                      qualified_2: next.qualified_2 || null,
                    }, { onConflict: "group_letter" });
                    toast.success("Sauvegardé");
                  }}
                  className="rounded-md border border-border bg-input px-2 py-2 text-sm outline-none focus:border-primary">
                  <option value="">{n === 1 ? "1er" : "2e"}</option>
                  {TEAMS_BY_GROUP[g].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl">Vainqueur & meilleur buteur</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="text-xs uppercase text-muted-foreground">Vainqueur</label>
          <select value={settings.real_winner}
            onChange={async (e) => {
              const v = e.target.value;
              setSettings({ ...settings, real_winner: v });
              await supabase.from("tournament_settings").update({ real_winner: v || null, updated_at: new Date().toISOString() }).eq("id", 1);
              toast.success("Sauvegardé");
            }}
            className="mt-1 w-full rounded-md border border-border bg-input px-2 py-2 outline-none focus:border-primary">
            <option value="">—</option>
            {ALL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="text-xs uppercase text-muted-foreground">Meilleur buteur</label>
          <input value={settings.real_top_scorer}
            onChange={(e) => setSettings({ ...settings, real_top_scorer: e.target.value })}
            onBlur={async () => {
              await supabase.from("tournament_settings").update({ real_top_scorer: settings.real_top_scorer || null, updated_at: new Date().toISOString() }).eq("id", 1);
              toast.success("Sauvegardé");
            }}
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 outline-none focus:border-primary"
            placeholder="Ex: Mbappé" />
        </div>
      </div>
    </section>
  );
}

function AdminMatchRow({ match, onSaved, editTeams }: { match: Match; onSaved: () => void; editTeams: boolean }) {
  const isElim = match.stage !== "GROUP";
  const notifyEnded = useServerFn(notifyMatchEnded);
  const notifyOpen = useServerFn(notifyElimOpen);
  const [home, setHome] = useState(match.home_team);
  const [away, setAway] = useState(match.away_team);


  const [h90, setH90] = useState<number | "">(match.real_home_score_90 ?? match.real_home_score ?? "");
  const [a90, setA90] = useState<number | "">(match.real_away_score_90 ?? match.real_away_score ?? "");
  const [aet, setAet] = useState<boolean>(match.went_to_aet);
  const [hAet, setHAet] = useState<number | "">(match.real_home_score_aet ?? "");
  const [aAet, setAAet] = useState<number | "">(match.real_away_score_aet ?? "");
  const [pens, setPens] = useState<boolean>(match.went_to_penalties);
  const [hPens, setHPens] = useState<number | "">(match.real_home_score_pens ?? "");
  const [aPens, setAPens] = useState<number | "">(match.real_away_score_pens ?? "");

  useEffect(() => {
    setHome(match.home_team); setAway(match.away_team);
    setH90(match.real_home_score_90 ?? match.real_home_score ?? "");
    setA90(match.real_away_score_90 ?? match.real_away_score ?? "");
    setAet(match.went_to_aet);
    setHAet(match.real_home_score_aet ?? ""); setAAet(match.real_away_score_aet ?? "");
    setPens(match.went_to_penalties);
    setHPens(match.real_home_score_pens ?? ""); setAPens(match.real_away_score_pens ?? "");
  }, [match.id]);

  const tie90 = h90 !== "" && a90 !== "" && Number(h90) === Number(a90);
  const tieAet = aet && hAet !== "" && aAet !== "" && Number(hAet) === Number(aAet);

  const save = async () => {
    const wasConfirmed = match.teams_confirmed === true;
    const hadScore = match.real_home_score !== null && match.real_away_score !== null;
    const payload: any = {
      home_team: home,
      away_team: away,
      real_home_score_90: h90 === "" ? null : Number(h90),
      real_away_score_90: a90 === "" ? null : Number(a90),
      went_to_aet: isElim && aet,
      real_home_score_aet: isElim && aet && hAet !== "" ? Number(hAet) : null,
      real_away_score_aet: isElim && aet && aAet !== "" ? Number(aAet) : null,
      went_to_penalties: isElim && pens,
      real_home_score_pens: isElim && pens && hPens !== "" ? Number(hPens) : null,
      real_away_score_pens: isElim && pens && aPens !== "" ? Number(aPens) : null,
    };
    if (!isElim || !aet) {
      payload.real_home_score_aet = null;
      payload.real_away_score_aet = null;
    }
    if (!isElim || !pens) {
      payload.real_home_score_pens = null;
      payload.real_away_score_pens = null;
    }
    const elimNowConfirmed = isElim && home.trim() !== "" && away.trim() !== "";
    if (elimNowConfirmed) payload.teams_confirmed = true;

    const { error } = await supabase.from("matches").update(payload).eq("id", match.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Match mis à jour");
    onSaved();

    // Déclencheurs push (fire-and-forget)
    const scoreNowSet = h90 !== "" && a90 !== "";
    if (!hadScore && scoreNowSet) {
      notifyEnded({ data: { matchId: match.id } }).catch(() => {});
    }
    if (isElim && !wasConfirmed && elimNowConfirmed) {
      notifyOpen({ data: { matchId: match.id } }).catch(() => {});
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{match.id} · {formatParis(match.kickoff_at)} (Paris)</div>
      <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-2">
        {editTeams ? (
          <input value={home} onChange={(e) => setHome(e.target.value)} className="rounded-md border border-border bg-input px-2 py-1 text-sm" />
        ) : <div className="font-semibold">{match.home_team}</div>}
        <input type="number" min={0} value={h90} onChange={(e) => setH90(e.target.value === "" ? "" : Number(e.target.value))} className="h-10 w-14 rounded-md border border-border bg-input text-center font-display text-xl" />
        <span className="text-xs text-muted-foreground">90'</span>
        <input type="number" min={0} value={a90} onChange={(e) => setA90(e.target.value === "" ? "" : Number(e.target.value))} className="h-10 w-14 rounded-md border border-border bg-input text-center font-display text-xl" />
        {editTeams ? (
          <input value={away} onChange={(e) => setAway(e.target.value)} className="rounded-md border border-border bg-input px-2 py-1 text-sm" />
        ) : <div className="font-semibold">{match.away_team}</div>}
      </div>

      {isElim && tie90 && (
        <div className="mt-3 border-t border-border pt-3">
          {!aet ? (
            <button onClick={() => setAet(true)} className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">+ Prolongations</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Après prolong.</span>
              <input type="number" min={0} value={hAet} onChange={(e) => setHAet(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 w-12 rounded-md border border-border bg-input text-center font-display" />
              <span>–</span>
              <input type="number" min={0} value={aAet} onChange={(e) => setAAet(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 w-12 rounded-md border border-border bg-input text-center font-display" />
              <button onClick={() => { setAet(false); setPens(false); }} className="ml-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            </div>
          )}
        </div>
      )}

      {isElim && aet && tieAet && (
        <div className="mt-2">
          {!pens ? (
            <button onClick={() => setPens(true)} className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">+ Tirs au but</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">TAB</span>
              <input type="number" min={0} value={hPens} onChange={(e) => setHPens(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 w-12 rounded-md border border-border bg-input text-center font-display text-orange-400" />
              <span>–</span>
              <input type="number" min={0} value={aPens} onChange={(e) => setAPens(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 w-12 rounded-md border border-border bg-input text-center font-display text-orange-400" />
              {hPens !== "" && aPens !== "" && Number(hPens) !== Number(aPens) && (
                <span className="text-xs text-gold">→ {Number(hPens) > Number(aPens) ? home : away} qualifié</span>
              )}
              <button onClick={() => setPens(false)} className="ml-2 text-xs text-muted-foreground hover:text-foreground">Annuler</button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button onClick={save} className="rounded-md bg-gold px-4 py-1.5 text-sm font-bold text-primary-foreground">Enregistrer</button>
      </div>
    </div>
  );
}
