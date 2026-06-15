import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TEAMS_BY_GROUP, GROUP_LETTERS, ALL_TEAMS } from "@/lib/teams";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { PlayerSelector } from "@/components/PlayerSelector";
import { usePlayers, useAllPrePredictions } from "@/lib/use-players";
import { PercentBar } from "@/components/PercentBar";

export const Route = createFileRoute("/pronostics/pre-tournoi")({ component: Page });

const LOCK_AT = new Date("2026-06-11T19:00:00Z").getTime();

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<string, { qualified_1: string; qualified_2: string; tournament_winner: string; top_scorer: string }>>({});
  const [loaded, setLoaded] = useState(false);
  const locked = Date.now() >= LOCK_AT;

  const { players } = usePlayers();
  const allPre = useAllPrePredictions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(players.map((p) => p.id)));
  const deselectAll = () => setSelected(new Set());
  const others = players.filter((p) => selected.has(p.id) && p.id !== user?.id);

  const preByUserGroup = useMemo(() => {
    const m = new Map<string, Map<string, typeof allPre[number]>>();
    allPre.forEach((r) => {
      if (!m.has(r.user_id)) m.set(r.user_id, new Map());
      m.get(r.user_id)!.set(r.group_letter, r);
    });
    return m;
  }, [allPre]);

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

  const Stats = ({ field, group }: { field: "qualified_1" | "qualified_2" | "tournament_winner" | "top_scorer"; group: string }) => {
    const counts = new Map<string, number>();
    let total = 0;
    allPre.forEach((r) => {
      if (r.group_letter !== group) return;
      const v = (r as any)[field];
      if (!v) return;
      counts.set(v, (counts.get(v) ?? 0) + 1);
      total++;
    });
    if (total === 0) return <p className="mt-1 text-xs italic text-muted-foreground">Aucun prono pour l'instant</p>;
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return (
      <ul className="mt-1 space-y-0.5">
        {sorted.map(([team, n]) => <PercentBar key={team} label={team} count={n} total={total} />)}
      </ul>
    );
  };

  const Picks = ({ field, group }: { field: "qualified_1" | "qualified_2" | "tournament_winner" | "top_scorer"; group: string }) => {
    if (others.length === 0) return null;
    return (
      <ul className="mt-1 space-y-0.5 text-xs">
        {others.map((p) => {
          const v = preByUserGroup.get(p.id)?.get(group)?.[field];
          return (
            <li key={p.id} className="flex items-center gap-1.5">
              <span>{p.avatar}</span>
              <span style={{ color: p.color }}>{p.pseudo}</span>
              <span className="ml-auto text-muted-foreground">{v || "—"}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const OtherLine = ({ field, group }: { field: "qualified_1" | "qualified_2" | "tournament_winner" | "top_scorer"; group: string }) => {
    if (locked) return <Picks field={field} group={group} />;
    if (field === "top_scorer") return null; // free text, skip stats
    return <Stats field={field} group={group} />;
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl text-gold">Qualifications</h1>
        {locked && <span className="chip bg-locked/20 text-locked"><Lock className="h-3 w-3" />Verrouillé</span>}
      </div>
      <p className="text-sm text-muted-foreground">Verrouillage le 11 juin 2026 à 21h (Paris).</p>

      <PlayerSelector players={players} selected={selected} onToggle={toggle} onSelectAll={selectAll} onDeselectAll={deselectAll} />

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
                    <div>
                      <Sel label="1er" value={r.qualified_1} onChange={(v) => save(g, { qualified_1: v })} options={teams} disabled={locked} />
                      <OtherLine field="qualified_1" group={g} />
                    </div>
                    <div>
                      <Sel label="2e" value={r.qualified_2} onChange={(v) => save(g, { qualified_2: v })} options={teams} disabled={locked} />
                      <OtherLine field="qualified_2" group={g} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl text-gold">Bonus</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Sel label="🏆 Vainqueur du tournoi (15 pts)"
                  value={rows.A?.tournament_winner ?? ""}
                  onChange={(v) => save("A", { tournament_winner: v })}
                  options={ALL_TEAMS} disabled={locked} />
                <OtherLine field="tournament_winner" group="A" />
              </div>
              <div>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">⚽ Meilleur buteur (10 pts)</span>
                  <input
                    className="w-full rounded-md border border-border bg-input px-3 py-2 outline-none focus:border-primary"
                    value={rows.A?.top_scorer ?? ""}
                    disabled={locked}
                    onChange={(e) => save("A", { top_scorer: e.target.value })}
                    placeholder="Ex: Mbappé"
                  />
                </label>
                <OtherLine field="top_scorer" group="A" />
              </div>
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
