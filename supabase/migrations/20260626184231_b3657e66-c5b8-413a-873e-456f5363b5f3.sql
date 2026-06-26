
-- Ensure the BEFORE trigger to sync 90/aet into real_home_score/real_away_score runs on every change
DROP TRIGGER IF EXISTS sync_match_scoring_score_trg ON public.matches;
CREATE TRIGGER sync_match_scoring_score_trg
BEFORE INSERT OR UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.sync_match_scoring_score();

-- Ensure the AFTER trigger that recomputes predictions points fires on score changes
DROP TRIGGER IF EXISTS recompute_match_predictions_trg ON public.matches;
CREATE TRIGGER recompute_match_predictions_trg
AFTER INSERT OR UPDATE OF real_home_score, real_away_score, stage ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.recompute_match_predictions();

-- Full recalculation of every prediction's points without touching pred_home/pred_away
UPDATE public.predictions p
SET points_earned = public.compute_match_points(
      p.pred_home, p.pred_away,
      m.real_home_score, m.real_away_score,
      m.stage
    ),
    updated_at = now()
FROM public.matches m
WHERE p.match_id = m.id
  AND m.real_home_score IS NOT NULL
  AND m.real_away_score IS NOT NULL;

-- Reset points to NULL for predictions on matches without a real score
UPDATE public.predictions p
SET points_earned = NULL,
    updated_at = now()
FROM public.matches m
WHERE p.match_id = m.id
  AND (m.real_home_score IS NULL OR m.real_away_score IS NULL)
  AND p.points_earned IS NOT NULL;
