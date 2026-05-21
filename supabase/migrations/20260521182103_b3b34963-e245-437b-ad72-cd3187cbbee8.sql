DROP POLICY IF EXISTS "pre_pred read" ON public.pre_tournament_predictions;
CREATE POLICY "pre_pred read"
ON public.pre_tournament_predictions
FOR SELECT
USING (true);