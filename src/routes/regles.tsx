import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/regles")({ component: Page });

function Page() {
  return (
    <section className="prose-invert mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-4xl text-gold">Règles du jeu</h1>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Comment jouer</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Inscris-toi avec un pseudo, un avatar et une couleur.</li>
          <li>Pronostique le score de chaque match avant le coup d'envoi.</li>
          <li>Sauvegarde automatique. Verrouillage strict à l'heure du match.</li>
          <li>Ajoute aussi tes pronos pré-tournoi avant le 11 juin 2026 21h.</li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Barème — Matchs</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="text-left">Résultat</th><th className="text-right">Points</th></tr></thead>
          <tbody>
            <tr><td>Score exact</td><td className="text-right text-gold">5 pts</td></tr>
            <tr><td>Bon vainqueur + bonne différence</td><td className="text-right text-gold">3 pts</td></tr>
            <tr><td>Bon vainqueur ou bon nul</td><td className="text-right text-gold">2 pts</td></tr>
            <tr><td>Mauvais pronostic</td><td className="text-right text-muted-foreground">0 pt</td></tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">× 2 pour les matchs éliminatoires.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Barème — Pré-tournoi</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Équipe qualifiée d'un groupe : <span className="text-gold">2 pts</span> chacune</li>
          <li>Vainqueur final correct : <span className="text-gold">10 pts</span></li>
          <li>Meilleur buteur correct : <span className="text-gold">5 pts</span></li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Format</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          48 équipes · 12 groupes de 4 · 16 premiers + 16 deuxièmes + 8 meilleurs 3es qualifiés pour les 32es de finale.
          11 juin → 19 juillet 2026.
        </p>
      </div>
    </section>
  );
}
