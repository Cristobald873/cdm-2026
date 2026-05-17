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
          <li>Sauvegarde automatique. Verrouillage strict côté serveur à l'heure du match — peu importe ce que fait le navigateur.</li>
          <li>Tous les horaires sont affichés en <strong>heure de Paris</strong> (CEST, UTC+2 pendant le tournoi).</li>
          <li>Ajoute aussi tes pronos pré-tournoi avant le 11 juin 2026 à 21h00 (Paris).</li>
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
        <h2 className="font-display text-2xl">Prolongations & Tirs au but</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          En phase éliminatoire, ton pronostic compte sur le score à la fin du
          <strong> temps réglementaire (90 min) + prolongations (120 min)</strong>.
          Si le match se termine aux tirs au but, le score retenu reste celui à
          l'issue des prolongations (ex&nbsp;: <em>2–2 a.p.</em>). Dans ce cas,
          seul le score exact <em>2-2</em> est récompensé — il n'y a pas de
          «&nbsp;bon vainqueur&nbsp;» possible puisque les deux équipes sont à
          égalité à l'issue du temps de jeu. Les pénaltys servent uniquement à
          désigner le qualifié pour le tableau.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-display text-2xl">Pronostics pré-tournoi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ces pronostics sont verrouillés au coup d'envoi du premier match
          (11 juin 2026 à 21h Paris). Tu peux pronostiquer&nbsp;:
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>🔮 Les 2 équipes qualifiées de chaque groupe : <span className="text-gold">+2 pts</span> chacune</li>
          <li>🏆 Le vainqueur final du tournoi : <span className="text-gold">+15 pts</span></li>
          <li>⚽ Le meilleur buteur : <span className="text-gold">+10 pts</span></li>
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
