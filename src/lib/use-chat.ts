import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeRealtime } from "@/lib/realtime-bus";

export type ChatMessage = {
  id: string;
  user_id: string;
  match_id: string | null;
  content: string;
  created_at: string;
};

export function useChatMessages(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      let q = supabase.from("chat_messages").select("*").order("created_at", { ascending: true });
      q = matchId === null ? q.is("match_id", null) : q.eq("match_id", matchId);
      const { data } = await q;
      if (!mounted) return;
      setMessages((data as ChatMessage[]) ?? []);
      setLoading(false);
    };
    load();
    const unsub = subscribeRealtime("chat_messages", (payload) => {
      const row = (payload.new ?? payload.old) as ChatMessage | undefined;
      if (!row) return;
      const belongs = matchId === null ? row.match_id === null : row.match_id === matchId;
      if (!belongs) return;
      if (payload.eventType === "INSERT") {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      } else if (payload.eventType === "DELETE") {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as ChatMessage).id));
      }
    });
    return () => { mounted = false; unsub(); };
  }, [matchId]);

  const send = useCallback(async (userId: string, content: string) => {
    const c = content.trim();
    if (!c) return { error: null };
    const { error } = await supabase.from("chat_messages").insert({ user_id: userId, match_id: matchId, content: c });
    return { error };
  }, [matchId]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    return { error };
  }, []);

  return { messages, loading, send, remove };
}

// Per-match message counts (lightweight aggregate)
export function useMatchCommentCounts() {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("match_id")
        .not("match_id", "is", null);
      if (!mounted) return;
      const m = new Map<string, number>();
      ((data as { match_id: string }[]) ?? []).forEach((r) => {
        m.set(r.match_id, (m.get(r.match_id) ?? 0) + 1);
      });
      setCounts(m);
    };
    load();
    const unsub = subscribeRealtime("chat_messages", () => load());
    return () => { mounted = false; unsub(); };
  }, []);
  return counts;
}


// Global unread counter using localStorage last-seen timestamp
const LAST_SEEN_KEY = "chat_global_last_seen_at";

export function getLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(LAST_SEEN_KEY);
  return v ? Number(v) : 0;
}

export function setLastSeenNow() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
}

export function useGlobalUnread(messages: ChatMessage[], currentUserId: string | undefined, open: boolean) {
  const [lastSeen, setLastSeen] = useState<number>(() => getLastSeen());

  useEffect(() => {
    if (open) {
      setLastSeenNow();
      setLastSeen(Date.now());
    }
  }, [open, messages.length]);

  const unread = messages.filter(
    (m) => m.user_id !== currentUserId && new Date(m.created_at).getTime() > lastSeen
  ).length;
  return unread;
}
