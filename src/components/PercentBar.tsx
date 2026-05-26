type Props = { label: string; count: number; total: number };

export function PercentBar({ label, count, total }: Props) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary sm:w-24">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right tabular-nums text-muted-foreground">{pct}%</span>
    </li>
  );
}
