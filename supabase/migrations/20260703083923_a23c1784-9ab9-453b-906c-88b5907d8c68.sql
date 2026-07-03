
CREATE OR REPLACE FUNCTION public.compute_prediction_points_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.matches WHERE id = NEW.match_id;
  IF m.real_home_score IS NOT NULL AND m.real_away_score IS NOT NULL THEN
    NEW.points_earned := public.compute_match_points(
      NEW.pred_home, NEW.pred_away,
      m.real_home_score, m.real_away_score,
      m.stage
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_points_on_pred_insert ON public.predictions;
CREATE TRIGGER trg_compute_points_on_pred_insert
  BEFORE INSERT OR UPDATE OF pred_home, pred_away ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.compute_prediction_points_on_insert();

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

CREATE OR REPLACE FUNCTION public.recompute_pre_tournament()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  pts INT;
  gr RECORD;
  ts RECORD;
BEGIN
  SELECT * INTO ts FROM public.tournament_settings WHERE id = 1;
  FOR rec IN SELECT * FROM public.pre_tournament_predictions LOOP
    pts := 0;
    SELECT * INTO gr FROM public.group_results WHERE group_letter = rec.group_letter;
    IF gr IS NOT NULL THEN
      IF rec.qualified_1 IS NOT NULL AND rec.qualified_1 IN (gr.qualified_1, gr.qualified_2) THEN pts := pts + 2; END IF;
      IF rec.qualified_2 IS NOT NULL AND rec.qualified_2 IN (gr.qualified_1, gr.qualified_2) AND rec.qualified_2 <> rec.qualified_1 THEN pts := pts + 2; END IF;
    END IF;
    IF rec.tournament_winner IS NOT NULL AND ts.real_winner IS NOT NULL AND rec.tournament_winner = ts.real_winner THEN pts := pts + 15; END IF;
    IF rec.top_scorer IS NOT NULL AND ts.real_top_scorer IS NOT NULL AND lower(trim(rec.top_scorer)) = lower(trim(ts.real_top_scorer)) THEN pts := pts + 10; END IF;
    UPDATE public.pre_tournament_predictions SET points_earned = pts, updated_at = now() WHERE id = rec.id;
  END LOOP;
  RETURN NULL;
END;
$function$;

-- Trigger recompute by touching one row (function ignores NEW, iterates all)
DO $$
DECLARE r RECORD;
BEGIN
  SELECT id INTO r FROM public.pre_tournament_predictions LIMIT 1;
  IF FOUND THEN
    UPDATE public.pre_tournament_predictions SET updated_at = now() WHERE id = r.id;
  END IF;
END $$;
