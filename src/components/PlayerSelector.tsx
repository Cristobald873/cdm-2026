import type { PlayerProfile } from "@/lib/use-players";
import { useAuth } from "@/lib/auth-context";

type Props = {
  players: PlayerProfile[];
  selected: Set<string>;
  onToggle: (id: string) => void;
};

export function PlayerSelector({ players, selected, onToggle }: Props) {
  const { user } = useAuth();
  if (players.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        👁 Voir les pronos d'autres joueurs
      </p>
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
  );
}
