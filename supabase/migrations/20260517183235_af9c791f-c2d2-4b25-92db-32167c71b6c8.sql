
-- 1. Schema additions for AET / penalties on matches
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS real_home_score_90 INT,
  ADD COLUMN IF NOT EXISTS real_away_score_90 INT,
  ADD COLUMN IF NOT EXISTS real_home_score_aet INT,
  ADD COLUMN IF NOT EXISTS real_away_score_aet INT,
  ADD COLUMN IF NOT EXISTS real_home_score_pens INT,
  ADD COLUMN IF NOT EXISTS real_away_score_pens INT,
  ADD COLUMN IF NOT EXISTS penalty_winner TEXT CHECK (penalty_winner IN ('home','away')),
  ADD COLUMN IF NOT EXISTS went_to_aet BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS went_to_penalties BOOLEAN NOT NULL DEFAULT false;

-- 2. Sync trigger: keep real_home_score/real_away_score as the scoring score
-- (AET if applicable, else 90 min)
CREATE OR REPLACE FUNCTION public.sync_match_scoring_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.went_to_aet AND NEW.real_home_score_aet IS NOT NULL AND NEW.real_away_score_aet IS NOT NULL THEN
    NEW.real_home_score := NEW.real_home_score_aet;
    NEW.real_away_score := NEW.real_away_score_aet;
  ELSIF NEW.real_home_score_90 IS NOT NULL AND NEW.real_away_score_90 IS NOT NULL THEN
    NEW.real_home_score := NEW.real_home_score_90;
    NEW.real_away_score := NEW.real_away_score_90;
  END IF;
  -- Auto-detect penalty winner from pen scores
  IF NEW.went_to_penalties AND NEW.real_home_score_pens IS NOT NULL AND NEW.real_away_score_pens IS NOT NULL THEN
    NEW.penalty_winner := CASE
      WHEN NEW.real_home_score_pens > NEW.real_away_score_pens THEN 'home'
      WHEN NEW.real_away_score_pens > NEW.real_home_score_pens THEN 'away'
      ELSE NEW.penalty_winner
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_match_scoring_score ON public.matches;
CREATE TRIGGER trg_sync_match_scoring_score
  BEFORE INSERT OR UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.sync_match_scoring_score();

-- 3. Re-attach recompute trigger on matches (after sync)
DROP TRIGGER IF EXISTS trg_recompute_predictions_on_match ON public.matches;
CREATE TRIGGER trg_recompute_predictions_on_match
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  WHEN (OLD.real_home_score IS DISTINCT FROM NEW.real_home_score OR OLD.real_away_score IS DISTINCT FROM NEW.real_away_score)
  EXECUTE FUNCTION public.recompute_match_predictions();

-- 4. Pre-tournament scoring update: winner 15 pts, top scorer 10 pts
CREATE OR REPLACE FUNCTION public.recompute_pre_tournament()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 5. Update all 72 group match kickoff times (CEST -> UTC, -2h)
UPDATE public.matches SET kickoff_at = v.k FROM (VALUES
  ('A11','2026-06-11 19:00:00+00'::timestamptz),
  ('A12','2026-06-12 02:00:00+00'::timestamptz),
  ('B11','2026-06-12 19:00:00+00'::timestamptz),
  ('D11','2026-06-13 01:00:00+00'::timestamptz),
  ('B12','2026-06-13 19:00:00+00'::timestamptz),
  ('C11','2026-06-13 22:00:00+00'::timestamptz),
  ('C12','2026-06-14 01:00:00+00'::timestamptz),
  ('D12','2026-06-14 04:00:00+00'::timestamptz),
  ('E11','2026-06-14 17:00:00+00'::timestamptz),
  ('F11','2026-06-14 20:00:00+00'::timestamptz),
  ('E12','2026-06-14 23:00:00+00'::timestamptz),
  ('F12','2026-06-15 02:00:00+00'::timestamptz),
  ('H11','2026-06-15 16:00:00+00'::timestamptz),
  ('G11','2026-06-15 19:00:00+00'::timestamptz),
  ('H12','2026-06-15 22:00:00+00'::timestamptz),
  ('G12','2026-06-16 01:00:00+00'::timestamptz),
  ('I11','2026-06-16 19:00:00+00'::timestamptz),
  ('I12','2026-06-16 22:00:00+00'::timestamptz),
  ('J11','2026-06-17 01:00:00+00'::timestamptz),
  ('J12','2026-06-17 04:00:00+00'::timestamptz),
  ('K11','2026-06-17 17:00:00+00'::timestamptz),
  ('L11','2026-06-17 20:00:00+00'::timestamptz),
  ('L12','2026-06-17 23:00:00+00'::timestamptz),
  ('K12','2026-06-18 02:00:00+00'::timestamptz),
  ('A22','2026-06-18 16:00:00+00'::timestamptz),
  ('B22','2026-06-18 19:00:00+00'::timestamptz),
  ('B21','2026-06-18 22:00:00+00'::timestamptz),
  ('A21','2026-06-19 01:00:00+00'::timestamptz),
  ('D21','2026-06-19 19:00:00+00'::timestamptz),
  ('C22','2026-06-19 22:00:00+00'::timestamptz),
  ('C21','2026-06-20 00:30:00+00'::timestamptz),
  ('D22','2026-06-20 03:00:00+00'::timestamptz),
  ('F21','2026-06-20 17:00:00+00'::timestamptz),
  ('E21','2026-06-20 20:00:00+00'::timestamptz),
  ('E22','2026-06-21 00:00:00+00'::timestamptz),
  ('F22','2026-06-21 04:00:00+00'::timestamptz),
  ('H21','2026-06-21 16:00:00+00'::timestamptz),
  ('G21','2026-06-21 19:00:00+00'::timestamptz),
  ('H22','2026-06-21 22:00:00+00'::timestamptz),
  ('G22','2026-06-22 01:00:00+00'::timestamptz),
  ('J21','2026-06-22 17:00:00+00'::timestamptz),
  ('I21','2026-06-22 21:00:00+00'::timestamptz),
  ('I22','2026-06-23 00:00:00+00'::timestamptz),
  ('J22','2026-06-23 03:00:00+00'::timestamptz),
  ('K21','2026-06-23 17:00:00+00'::timestamptz),
  ('L21','2026-06-23 20:00:00+00'::timestamptz),
  ('L22','2026-06-23 23:00:00+00'::timestamptz),
  ('K22','2026-06-24 02:00:00+00'::timestamptz),
  ('B31','2026-06-24 19:00:00+00'::timestamptz),
  ('B32','2026-06-24 19:00:00+00'::timestamptz),
  ('C31','2026-06-24 22:00:00+00'::timestamptz),
  ('C32','2026-06-24 22:00:00+00'::timestamptz),
  ('A31','2026-06-25 01:00:00+00'::timestamptz),
  ('A32','2026-06-25 01:00:00+00'::timestamptz),
  ('E31','2026-06-25 20:00:00+00'::timestamptz),
  ('E32','2026-06-25 20:00:00+00'::timestamptz),
  ('F31','2026-06-25 23:00:00+00'::timestamptz),
  ('F32','2026-06-25 23:00:00+00'::timestamptz),
  ('D31','2026-06-26 02:00:00+00'::timestamptz),
  ('D32','2026-06-26 02:00:00+00'::timestamptz),
  ('I31','2026-06-26 19:00:00+00'::timestamptz),
  ('I32','2026-06-26 19:00:00+00'::timestamptz),
  ('H31','2026-06-27 00:00:00+00'::timestamptz),
  ('H32','2026-06-27 00:00:00+00'::timestamptz),
  ('G31','2026-06-27 03:00:00+00'::timestamptz),
  ('G32','2026-06-27 03:00:00+00'::timestamptz),
  ('L31','2026-06-27 21:00:00+00'::timestamptz),
  ('L32','2026-06-27 21:00:00+00'::timestamptz),
  ('K31','2026-06-27 23:30:00+00'::timestamptz),
  ('K32','2026-06-27 23:30:00+00'::timestamptz),
  ('J31','2026-06-28 02:00:00+00'::timestamptz),
  ('J32','2026-06-28 02:00:00+00'::timestamptz)
) AS v(id, k)
WHERE matches.id = v.id;
