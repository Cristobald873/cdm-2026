import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePlayers } from "@/lib/use-players";
import { useChatMessages } from "@/lib/use-chat";
import { toast } from "sonner";

export function MatchComments({ matchId, count }: { matchId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();
  const { players } = usePlayers();
  const { messages, send, remove } = useChatMessages(open ? matchId : null);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const profilesById = new Map(players.map((p) => [p.id, p]));
  const total = open ? messages.length : count;

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    const { error } = await send(user.id, t);
    if (error) toast.error("Erreur d'envoi");
  };

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-xs text-muted-foreground hover:text-foreground"
      >
        <span>💬 {total} commentaire{total > 1 ? "s" : ""}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-background/50 p-2">
            {messages.length === 0 ? (
              <p className="text-center text-xs italic text-muted-foreground">Aucun commentaire</p>
            ) : (
              messages.map((m) => {
                const p = profilesById.get(m.user_id);
                const mine = m.user_id === user?.id;
                const canDelete = mine || !!profile?.is_admin;
                return (
                  <div key={m.id} className="group flex items-start gap-2 text-sm">
                    <span className="leading-none">{p?.avatar ?? "👤"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 text-[11px]">
                        <span className="font-semibold" style={{ color: p?.color }}>{p?.pseudo ?? "Joueur"}</span>
                        <span className="text-muted-foreground">{formatTime(m.created_at)}</span>
                      </div>
                      <p className="break-words text-sm">{m.content}</p>
                    </div>
                    {canDelete && (
                      <button onClick={async () => { await remove(m.id); }} className="opacity-0 transition group-hover:opacity-100" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {user ? (
            <form onSubmit={onSend} className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Commenter…"
                maxLength={2000}
                className="flex-1 rounded-md border border-border bg-input px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
              <button type="submit" disabled={!text.trim()} className="rounded-md bg-gold p-1.5 text-primary-foreground disabled:opacity-40">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <p className="text-xs italic text-muted-foreground"><MessageSquare className="mr-1 inline h-3 w-3" />Connecte-toi pour commenter</p>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  if (sameDay) return time;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " + time;
}
