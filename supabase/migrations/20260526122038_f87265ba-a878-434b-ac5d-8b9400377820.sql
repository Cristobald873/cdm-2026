CREATE OR REPLACE FUNCTION public.get_match_pred_stats()
RETURNS TABLE(match_id text, home_wins int, draws int, away_wins int, total int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.match_id,
    COUNT(*) FILTER (WHERE p.pred_home > p.pred_away)::int AS home_wins,
    COUNT(*) FILTER (WHERE p.pred_home = p.pred_away)::int AS draws,
    COUNT(*) FILTER (WHERE p.pred_home < p.pred_away)::int AS away_wins,
    COUNT(*)::int AS total
  FROM public.predictions p
  GROUP BY p.match_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_match_pred_stats() TO anon, authenticated;