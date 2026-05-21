-- Add teams_confirmed column to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS teams_confirmed BOOLEAN NOT NULL DEFAULT false;

-- Group matches: teams are known from the start, mark confirmed
UPDATE public.matches SET teams_confirmed = true WHERE stage = 'GROUP';

-- Update RLS so predictions can only be inserted/updated when match has confirmed teams
DROP POLICY IF EXISTS "predictions insert own pre-kickoff" ON public.predictions;
CREATE POLICY "predictions insert own pre-kickoff"
ON public.predictions
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = predictions.match_id
      AND m.kickoff_at > now()
      AND m.teams_confirmed = true
  )
);

DROP POLICY IF EXISTS "predictions update own pre-kickoff" ON public.predictions;
CREATE POLICY "predictions update own pre-kickoff"
ON public.predictions
FOR UPDATE
USING (
  (user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = predictions.match_id
      AND m.kickoff_at > now()
      AND m.teams_confirmed = true
  )
);