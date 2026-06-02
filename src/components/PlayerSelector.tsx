import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { PlayerProfile } from "@/lib/use-players";
import { useAuth } from "@/lib/auth-context";

type Props = {
  players: PlayerProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export function PlayerSelector({ players, selected, onToggle }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (players.length === 0) return null;
  const selectedCount = Array.from(selected).filter((id) => id !== user?.id).length;

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <span>
          👁 Voir les pronos des autres joueurs
          {!open && selectedCount > 0 && (
            <span className="ml-1 normal-case tracking-normal text-foreground">({selectedCount} sélectionné{selectedCount > 1 ? "s" : ""})</span>
          )}
        </span>
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap gap-1.5">
            {players.map((p) => {
              const isMe = p.id === user?.id;
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isMe}
                  onClick={() => onToggle(p.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    isMe
                      ? "cursor-default border-gold/40 bg-gold/10 text-gold"
                      : isSel
                        ? "border-primary bg-primary/20 text-foreground"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                  style={isSel && !isMe ? { borderColor: p.color } : undefined}
                >
                  <span>{p.avatar}</span>
                  <span>{p.pseudo}</span>
                  {isMe && <span className="ml-1 rounded bg-gold/30 px-1 text-[10px] font-bold">Moi</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
