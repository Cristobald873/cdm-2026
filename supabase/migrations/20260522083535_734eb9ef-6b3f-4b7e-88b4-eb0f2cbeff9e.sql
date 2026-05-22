
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs read own" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_subs insert own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subs delete own" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

CREATE TABLE public.notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
CREATE INDEX idx_notifs_sent_lookup ON public.notifications_sent(kind, ref_id);

ALTER TABLE public.notifications_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifs_sent read own" ON public.notifications_sent
  FOR SELECT USING (user_id = auth.uid());
