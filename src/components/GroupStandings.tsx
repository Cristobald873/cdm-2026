import { useMemo } from "react";
import type { Match } from "@/components/MatchCard";
import { TEAMS_BY_GROUP } from "@/lib/teams";

type Row = {
  team: string;
  pts: number;
  j: number;
  g: number;
  n: number;
  p: number;
  bp: number;
  bc: number;
  diff: number;
};

export function GroupStandings({ group, matches }: { group: string; matches: Match[] }) {
  const rows = useMemo<Row[]>(() => {
    const teams = TEAMS_BY_GROUP[group] ?? [];
    const map = new Map<string, Row>(
      teams.map((t) => [t, { team: t, pts: 0, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, diff: 0 }]),
    );
    for (const m of matches) {
      if (m.group_letter !== group) continue;
      if (m.real_home_score == null || m.real_away_score == null) continue;
      const h = map.get(m.home_team);
      const a = map.get(m.away_team);
      if (!h || !a) continue;
      h.j++; a.j++;
      h.bp += m.real_home_score; h.bc += m.real_away_score;
      a.bp += m.real_away_score; a.bc += m.real_home_score;
      if (m.real_home_score > m.real_away_score) { h.g++; h.pts += 3; a.p++; }
      else if (m.real_home_score < m.real_away_score) { a.g++; a.pts += 3; h.p++; }
      else { h.n++; a.n++; h.pts++; a.pts++; }
    }
    const arr = Array.from(map.values()).map((r) => ({ ...r, diff: r.bp - r.bc }));
    arr.sort((x, y) => y.pts - x.pts || y.diff - x.diff || y.bp - x.bp || x.team.localeCompare(y.team));
    return arr;
  }, [group, matches]);

  const rowClass = (i: number) => {
    if (i < 2) return "bg-emerald-500/15";
    if (i === 2) return "bg-orange-500/15";
    return "bg-red-500/10";
  };

  return (
    <div className="mb-4 rounded-lg border border-border bg-card p-3">
      <h2 className="mb-2 font-display text-lg text-gold">Classement Groupe {group} (live)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 pr-2">Équipe</th>
              <th className="px-1 text-center">Pts</th>
              <th className="px-1 text-center">J</th>
              <th className="px-1 text-center">G</th>
              <th className="px-1 text-center">N</th>
              <th className="px-1 text-center">P</th>
              <th className="px-1 text-center">BP</th>
              <th className="px-1 text-center">BC</th>
              <th className="px-1 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team} className={`${rowClass(i)} border-t border-border/50`}>
                <td className="py-1 pr-2 font-medium">{r.team}</td>
                <td className="px-1 text-center font-bold">{r.pts}</td>
                <td className="px-1 text-center">{r.j}</td>
                <td className="px-1 text-center">{r.g}</td>
                <td className="px-1 text-center">{r.n}</td>
                <td className="px-1 text-center">{r.p}</td>
                <td className="px-1 text-center">{r.bp}</td>
                <td className="px-1 text-center">{r.bc}</td>
                <td className="px-1 text-center">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
