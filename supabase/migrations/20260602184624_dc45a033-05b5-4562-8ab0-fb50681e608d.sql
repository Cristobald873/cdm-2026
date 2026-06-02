CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_global ON public.chat_messages (created_at) WHERE match_id IS NULL;
CREATE INDEX idx_chat_messages_match ON public.chat_messages (match_id, created_at) WHERE match_id IS NOT NULL;

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat read authenticated" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chat insert own" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat delete own or admin" ON public.chat_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;