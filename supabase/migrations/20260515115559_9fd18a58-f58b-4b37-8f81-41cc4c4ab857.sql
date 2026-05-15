
-- Enums
CREATE TYPE public.match_stage AS ENUM ('GROUP','R32','R16','QF','SF','THIRD','FINAL');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo TEXT UNIQUE NOT NULL,
  avatar TEXT NOT NULL DEFAULT '⚽',
  color TEXT NOT NULL DEFAULT '#f5c842',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches
CREATE TABLE public.matches (
  id TEXT PRIMARY KEY,
  stage public.match_stage NOT NULL,
  group_letter TEXT,
  match_number INT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  real_home_score INT,
  real_away_score INT
);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches read all" ON public.matches FOR SELECT USING (true);

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = _uid), false);
$$;

CREATE POLICY "matches admin write" ON public.matches FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Predictions
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  pred_home INT NOT NULL,
  pred_away INT NOT NULL,
  points_earned INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
-- Own predictions always readable; others' predictions readable only after kickoff
CREATE POLICY "predictions read" ON public.predictions FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at <= now())
);
CREATE POLICY "predictions insert own pre-kickoff" ON public.predictions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at > now())
);
CREATE POLICY "predictions update own pre-kickoff" ON public.predictions FOR UPDATE USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at > now())
);
CREATE POLICY "predictions delete own pre-kickoff" ON public.predictions FOR DELETE USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.kickoff_at > now())
);

-- Pre-tournament predictions
CREATE TABLE public.pre_tournament_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_letter TEXT NOT NULL,
  qualified_1 TEXT,
  qualified_2 TEXT,
  tournament_winner TEXT,
  top_scorer TEXT,
  points_earned INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_letter)
);
ALTER TABLE public.pre_tournament_predictions ENABLE ROW LEVEL SECURITY;

-- Lock date = first kickoff (2026-06-11 21:00 Europe/Paris = 19:00 UTC)
CREATE OR REPLACE FUNCTION public.pre_tournament_locked()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT now() >= TIMESTAMPTZ '2026-06-11 19:00:00+00';
$$;

CREATE POLICY "pre_pred read" ON public.pre_tournament_predictions FOR SELECT USING (
  user_id = auth.uid() OR public.pre_tournament_locked()
);
CREATE POLICY "pre_pred insert own" ON public.pre_tournament_predictions FOR INSERT WITH CHECK (
  user_id = auth.uid() AND NOT public.pre_tournament_locked()
);
CREATE POLICY "pre_pred update own" ON public.pre_tournament_predictions FOR UPDATE USING (
  user_id = auth.uid() AND NOT public.pre_tournament_locked()
);

-- Group results (admin)
CREATE TABLE public.group_results (
  group_letter TEXT PRIMARY KEY,
  qualified_1 TEXT,
  qualified_2 TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.group_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_results read" ON public.group_results FOR SELECT USING (true);
CREATE POLICY "group_results admin write" ON public.group_results FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Tournament settings (singleton): real winner & top scorer
CREATE TABLE public.tournament_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  real_winner TEXT,
  real_top_scorer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.tournament_settings (id) VALUES (1);
ALTER TABLE public.tournament_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts read" ON public.tournament_settings FOR SELECT USING (true);
CREATE POLICY "ts admin write" ON public.tournament_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo, avatar, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pseudo', 'joueur_' || substr(NEW.id::text, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'avatar', '⚽'),
    COALESCE(NEW.raw_user_meta_data->>'color', '#f5c842')
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Stage multiplier
CREATE OR REPLACE FUNCTION public.stage_multiplier(_stage public.match_stage)
RETURNS INT LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE WHEN _stage = 'GROUP' THEN 1 ELSE 2 END;
$$;

-- Compute points for a single prediction
CREATE OR REPLACE FUNCTION public.compute_match_points(
  _pred_home INT, _pred_away INT,
  _real_home INT, _real_away INT,
  _stage public.match_stage
) RETURNS INT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  base INT := 0;
  pred_diff INT;
  real_diff INT;
  pred_winner INT; -- 1 home, -1 away, 0 draw
  real_winner INT;
BEGIN
  IF _real_home IS NULL OR _real_away IS NULL THEN RETURN NULL; END IF;
  IF _pred_home = _real_home AND _pred_away = _real_away THEN
    base := 5;
  ELSE
    pred_diff := _pred_home - _pred_away;
    real_diff := _real_home - _real_away;
    pred_winner := sign(pred_diff);
    real_winner := sign(real_diff);
    IF pred_winner = real_winner AND pred_diff = real_diff THEN
      base := 3;
    ELSIF pred_winner = real_winner THEN
      base := 2;
    ELSE
      base := 0;
    END IF;
  END IF;
  RETURN base * public.stage_multiplier(_stage);
END;
$$;

-- Trigger: recompute predictions points when match scores change
CREATE OR REPLACE FUNCTION public.recompute_match_predictions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.real_home_score IS NOT NULL AND NEW.real_away_score IS NOT NULL THEN
    UPDATE public.predictions p
    SET points_earned = public.compute_match_points(p.pred_home, p.pred_away, NEW.real_home_score, NEW.real_away_score, NEW.stage),
        updated_at = now()
    WHERE p.match_id = NEW.id;
  ELSE
    UPDATE public.predictions p SET points_earned = NULL, updated_at = now() WHERE p.match_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_recompute_predictions
  AFTER UPDATE OF real_home_score, real_away_score ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.recompute_match_predictions();

-- Recompute pre-tournament predictions when group_results or tournament_settings change
CREATE OR REPLACE FUNCTION public.recompute_pre_tournament()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    IF rec.tournament_winner IS NOT NULL AND ts.real_winner IS NOT NULL AND rec.tournament_winner = ts.real_winner THEN pts := pts + 10; END IF;
    IF rec.top_scorer IS NOT NULL AND ts.real_top_scorer IS NOT NULL AND lower(trim(rec.top_scorer)) = lower(trim(ts.real_top_scorer)) THEN pts := pts + 5; END IF;
    UPDATE public.pre_tournament_predictions SET points_earned = pts, updated_at = now() WHERE id = rec.id;
  END LOOP;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_recompute_pre_groupresults
  AFTER INSERT OR UPDATE OR DELETE ON public.group_results
  FOR EACH STATEMENT EXECUTE FUNCTION public.recompute_pre_tournament();
CREATE TRIGGER trg_recompute_pre_settings
  AFTER UPDATE ON public.tournament_settings
  FOR EACH STATEMENT EXECUTE FUNCTION public.recompute_pre_tournament();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_tournament_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_settings;
