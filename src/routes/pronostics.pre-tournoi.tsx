import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TEAMS_BY_GROUP, GROUP_LETTERS, ALL_TEAMS } from "@/lib/teams";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/pronostics/pre-tournoi")({ component: Page });

const LOCK_AT = new Date("2026-06-11T19:00:00Z").getTime();

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, { qualified_1: string; qualified_2: string; tournament_winner: string; top_scorer: string }>>({});
  const [loaded, setLoaded] = useState(false);
  const locked = Date.now() >= LOCK_AT;

  useEffect(() => {
    if (!user) return;
    supabase.from("pre_tournament_predictions").select("*").eq("user_id", user.id).then(({ data }) => {
      const map: any = {};
      GROUP_LETTERS.forEach((g) => { map[g] = { qualified_1: "", qualified_2: "", tournament_winner: "", top_scorer: "" }; });
      (data ?? []).forEach((r: any) => {
        map[r.group_letter] = {
          qualified_1: r.qualified_1 ?? "",
          qualified_2: r.qualified_2 ?? "",
          tournament_winner: r.tournament_winner ?? "",
          top_scorer: r.top_scorer ?? "",
        };
      });
      setRows(map);
      setLoaded(true);
    });
  }, [user]);

  const save = async (g: string, patch: Partial<typeof rows[string]>) => {
    if (!user || locked) return;
    const next = { ...rows[g], ...patch };
    setRows({ ...rows, [g]: next });
    const { error } = await supabase.from("pre_tournament_predictions").upsert(
      {
        user_id: user.id,
        group_letter: g,
        qualified_1: next.qualified_1 || null,
        qualified_2: next.qualified_2 || null,
        tournament_winner: next.tournament_winner || null,
        top_scorer: next.top_scorer || null,
      },
      { onConflict: "user_id,group_letter" }
    );
    if (error) toast.error("Erreur de sauvegarde");
  };

  if (!user) return <p className="text-muted-foreground">Connecte-toi pour pronostiquer.</p>;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl text-gold">Qualifications</h1>
        {locked && <span className="chip bg-locked/20 text-locked"><Lock className="h-3 w-3" />Verrouillé</span>}
      </div>
      <p className="text-sm text-muted-foreground">Verrouillage le 11 juin 2026 à 21h (Paris).</p>

      {!loaded ? <p className="mt-6 text-muted-foreground">Chargement…</p> : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {GROUP_LETTERS.map((g) => {
              const teams = TEAMS_BY_GROUP[g];
              const r = rows[g];
              return (
                <div key={g} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-display text-2xl text-gold">Groupe {g}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Sel label="1er" value={r.qualified_1} onChange={(v) => save(g, { qualified_1: v })} options={teams} disabled={locked} />
                    <Sel label="2e" value={r.qualified_2} onChange={(v) => save(g, { qualified_2: v })} options={teams} disabled={locked} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl text-gold">Bonus</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Sel label="🏆 Vainqueur du tournoi (15 pts)"
                value={rows.A?.tournament_winner ?? ""}
                onChange={(v) => GROUP_LETTERS.forEach((g) => save(g, { tournament_winner: v }))}
                options={ALL_TEAMS} disabled={locked} />
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">⚽ Meilleur buteur (10 pts)</span>
                <input
                  className="w-full rounded-md border border-border bg-input px-3 py-2 outline-none focus:border-primary"
                  value={rows.A?.top_scorer ?? ""}
                  disabled={locked}
                  onChange={(e) => GROUP_LETTERS.forEach((g) => save(g, { top_scorer: e.target.value }))}
                  placeholder="Ex: Mbappé"
                />
              </label>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Sel({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full rounded-md border border-border bg-input px-2 py-2 outline-none focus:border-primary disabled:opacity-50">
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
