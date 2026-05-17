## Plan — Améliorations Pronos CdM 2026

### 1. Schéma BDD (migration)
Ajout sur `matches` :
- `real_home_score_90`, `real_away_score_90` (int)
- `real_home_score_aet`, `real_away_score_aet` (int)
- `real_home_score_pens`, `real_away_score_pens` (int)
- `penalty_winner` (text 'home'/'away')
- `went_to_aet`, `went_to_penalties` (bool default false)

Mise à jour de `compute_match_points` :
- Utilise `real_home_score_aet/_away_aet` si `went_to_aet`, sinon `real_home_score_90/_away_90`.
- Garder `real_home_score`/`real_away_score` synchronisés (via trigger BEFORE UPDATE) pour rétro-compat affichage.

Mise à jour de `recompute_pre_tournament` :
- Vainqueur correct = **15 pts** (au lieu de 10)
- Meilleur buteur = **10 pts** (au lieu de 5)

Re-seed des `kickoff_at` des 72 matchs de poules (36 j1+j2 + 36 j3 simultanés) selon la liste fournie, convertie de CEST (Europe/Paris UTC+2) vers UTC.

### 2. Verrouillage strict côté serveur
Les RLS policies existantes (`predictions insert/update own pre-kickoff`) vérifient déjà `m.kickoff_at > now()` → OK, c'est la source de vérité. Vérifier que c'est bien le cas (déjà confirmé dans le schéma).

### 3. UI temps réel
- Ajouter un hook `useNow()` (tick toutes les 30s) utilisé dans `MatchCard` pour recalculer `locked` sans reload.
- Inputs en `readOnly` + désactivés dès `now >= kickoff_at`.

### 4. Affichage heure de Paris
- Helper `formatParis(date)` dans `src/lib/format.ts` :
  `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ... })`
- Utilisé dans `MatchCard`, `admin`, autres listes. Suffixe "(heure de Paris)" sur les en-têtes de liste.

### 5. Admin éliminatoires — saisie progressive
Refonte de `AdminMatchRow` pour stages ≠ GROUP :
- Étape 1 : score 90 min. Si égalité, bouton "Prolongations".
- Étape 2 : score après prolongations. Si égalité, bouton "Tirs au but".
- Étape 3 : score pénaltys + vainqueur auto-détecté.

Stages GROUP : inchangé (saisie simple 90 min uniquement, pas de prolong).

### 6. Affichage du score (MatchCard + classements)
4 cas via helper `formatMatchResult(match)` :
- Normal : `2 – 1`
- a.p. : `2 – 1 a.p.`
- TAB : `2 – 2 a.p.` + ligne `⚽ TAB 4 – 3` + nom vainqueur mis en avant (doré)
- Nul (poules) : `1 – 1`

### 7. Page /regles
Ajout des deux blocs : "Prolongations & Pénaltys" et mise à jour "Pronostics pré-tournoi" + barème (15/10).

### 8. Page /pronostics/pre-tournoi
Mettre à jour les libellés de points (15 / 10).

### Fichiers touchés
- migration SQL (nouvelle)
- `src/lib/format.ts` (nouveau)
- `src/lib/use-now.ts` (nouveau)
- `src/components/MatchCard.tsx`
- `src/routes/admin.tsx`
- `src/routes/regles.tsx`
- `src/routes/pronostics.pre-tournoi.tsx`
- `src/lib/use-matches.ts` (type Match étendu)
