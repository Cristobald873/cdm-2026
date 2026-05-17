// Formatters always anchored on Europe/Paris (CEST during the World Cup).

const DATETIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const TIME_ONLY = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatParis(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return DATETIME.format(d).replace(",", " ·");
}

export function formatParisDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return DATE_ONLY.format(d);
}

export function formatParisTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return TIME_ONLY.format(d);
}

export type ScoreView = {
  homeMain: number | null;
  awayMain: number | null;
  suffix: string | null; // "a.p." or null
  pens?: { home: number; away: number; winner: "home" | "away" } | null;
};

export type MatchScoreInput = {
  real_home_score: number | null;
  real_away_score: number | null;
  real_home_score_90?: number | null;
  real_away_score_90?: number | null;
  real_home_score_aet?: number | null;
  real_away_score_aet?: number | null;
  real_home_score_pens?: number | null;
  real_away_score_pens?: number | null;
  went_to_aet?: boolean | null;
  went_to_penalties?: boolean | null;
  penalty_winner?: "home" | "away" | null;
};

export function getScoreView(m: MatchScoreInput): ScoreView | null {
  const aet = m.went_to_aet && m.real_home_score_aet !== null && m.real_away_score_aet !== null;
  if (aet) {
    return {
      homeMain: m.real_home_score_aet!,
      awayMain: m.real_away_score_aet!,
      suffix: "a.p.",
      pens:
        m.went_to_penalties && m.real_home_score_pens !== null && m.real_away_score_pens !== null && m.penalty_winner
          ? { home: m.real_home_score_pens!, away: m.real_away_score_pens!, winner: m.penalty_winner }
          : null,
    };
  }
  const h = m.real_home_score_90 ?? m.real_home_score;
  const a = m.real_away_score_90 ?? m.real_away_score;
  if (h === null || a === null) return null;
  return { homeMain: h, awayMain: a, suffix: null, pens: null };
}
