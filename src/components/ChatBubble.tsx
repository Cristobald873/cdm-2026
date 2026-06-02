import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Trash2, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePlayers } from "@/lib/use-players";
import { useChatMessages, useGlobalUnread, type ChatMessage } from "@/lib/use-chat";
import { toast } from "sonner";

type Pos = { x: number; y: number; hidden: boolean };
const POS_KEY = "chat_bubble_pos_v1";
const BUBBLE = 56;
const HIDDEN_SHOW = 18; // pixels of tab visible when hidden

function loadPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0, hidden: false };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { x: window.innerWidth - BUBBLE - 16, y: window.innerHeight - BUBBLE - 80, hidden: false };
}

export function ChatBubble() {
  const { user, profile } = useAuth();
  const { players } = usePlayers();
  const [open, setOpen] = useState(false);
  const { messages, send, remove } = useChatMessages(null);
  const unread = useGlobalUnread(messages, user?.id, open);
  const [pos, setPos] = useState<Pos>(() => loadPos());
  const [text, setText] = useState("");
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(POS_KEY, JSON.stringify(pos)); }, [pos]);
  useEffect(() => {
    const onResize = () => setPos((p) => ({
      ...p,
      x: Math.min(Math.max(0, p.x), window.innerWidth - BUBBLE),
      y: Math.min(Math.max(0, p.y), window.innerHeight - BUBBLE),
    }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  const profilesById = new Map(players.map((p) => [p.id, p]));

  const onPointerDown = (e: React.PointerEvent) => {
    if (pos.hidden) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    setPos({
      x: Math.min(Math.max(0, d.origX + dx), window.innerWidth - BUBBLE),
      y: Math.min(Math.max(0, d.origY + dy), window.innerHeight - BUBBLE),
      hidden: false,
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      setOpen((o) => !o);
      return;
    }
    // Snap to nearest horizontal edge; hide if dropped against right edge
    setPos((p) => {
      const W = window.innerWidth;
      const nearRight = p.x + BUBBLE > W - 24;
      if (nearRight && e.clientX > W - 40) {
        return { ...p, x: W - HIDDEN_SHOW, hidden: true };
      }
      const snappedX = p.x < W / 2 ? 8 : W - BUBBLE - 8;
      return { ...p, x: snappedX, hidden: false };
    });
  };

  const onSend = async () => {
    if (!user) return;
    const t = text.trim();
    if (!t) return;
    setText("");
    const { error } = await send(user.id, t);
    if (error) toast.error("Erreur d'envoi");
  };

  if (!user) return null;

  return (
    <>
      {/* Bubble / tab */}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={(e) => e.preventDefault()}
        aria-label="Chat global"
        className={`fixed z-[60] flex items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-primary-foreground shadow-lg shadow-gold/30 transition-transform active:scale-95 ${pos.hidden ? "rounded-l-2xl rounded-r-none" : ""}`}
        style={{
          left: pos.x,
          top: pos.y,
          width: pos.hidden ? HIDDEN_SHOW + 8 : BUBBLE,
          height: BUBBLE,
          touchAction: "none",
        }}
      >
        <MessageCircle className="h-6 w-6" style={pos.hidden ? { marginLeft: -4 } : undefined} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && !pos.hidden && (
        <div className="fixed inset-x-2 bottom-2 z-[59] flex max-h-[80vh] flex-col rounded-2xl border border-border bg-card shadow-2xl sm:bottom-4 sm:right-4 sm:left-auto sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display text-lg text-gold">Chat global</h2>
              <p className="text-xs text-muted-foreground">{messages.length} message{messages.length > 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <MessageList ref={listRef} messages={messages} profilesById={profilesById} currentUserId={user.id} isAdmin={!!profile?.is_admin} onDelete={async (id) => { await remove(id); }} />
          <ChatInput value={text} onChange={setText} onSend={onSend} />
        </div>
      )}

      {pos.hidden && (
        <button
          onClick={() => setPos((p) => ({ ...p, x: window.innerWidth - BUBBLE - 8, hidden: false }))}
          className="fixed z-[58] flex h-10 w-5 items-center justify-center rounded-l-md bg-muted text-muted-foreground"
          style={{ right: 0, top: pos.y + BUBBLE + 4 }}
          aria-label="Ramener le chat"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      )}
    </>
  );
}

import { forwardRef } from "react";

const MessageList = forwardRef<HTMLDivElement, {
  messages: ChatMessage[];
  profilesById: Map<string, { pseudo: string; avatar: string; color: string }>;
  currentUserId: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}>(function MessageList({ messages, profilesById, currentUserId, isAdmin, onDelete }, ref) {
  return (
    <div ref={ref} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.length === 0 && (
        <p className="text-center text-sm italic text-muted-foreground">Aucun message. Lance la discussion !</p>
      )}
      {messages.map((m) => {
        const p = profilesById.get(m.user_id);
        const mine = m.user_id === currentUserId;
        return (
          <div key={m.id} className="group flex items-start gap-2">
            <span className="text-lg leading-none">{p?.avatar ?? "👤"}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-semibold" style={{ color: p?.color }}>{p?.pseudo ?? "Joueur"}</span>
                <span className="text-muted-foreground">{formatTime(m.created_at)}</span>
              </div>
              <p className="break-words text-sm text-foreground">{m.content}</p>
            </div>
            {(mine || isAdmin) && (
              <button onClick={() => onDelete(m.id)} className="opacity-0 transition group-hover:opacity-100" aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});

function ChatInput({ value, onChange, onSend }: { value: string; onChange: (v: string) => void; onSend: () => void }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSend(); }}
      className="flex items-center gap-2 border-t border-border p-3"
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écris un message…"
        maxLength={2000}
        className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button type="submit" disabled={!value.trim()} className="rounded-md bg-gold p-2 text-primary-foreground disabled:opacity-40">
        <Send className="h-4 w-4" />
      </button>
    </form>
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
