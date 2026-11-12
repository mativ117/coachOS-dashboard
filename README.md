# CoachOS

Espace personnel de conception et présentation de systèmes de basket. React, TypeScript strict, Vite ; interface en français, adaptée au tactile et à l’ordinateur.

## État actuel : phase 1

Socle navigable : **Bibliothèque / Éditeur / Présentation**, recherche et filtres sur l’inventaire documentaire, terrain SVG demi/entier, cinq pions de démonstration. Les liens hash permettent de recharger un espace sous le chemin GitHub Pages `/coachOS-dashboard/` sans configuration de réécriture serveur.

**L’aperçu ne représente pas encore les mouvements des plays.** Migration des sources et IndexedDB : phase 2. Édition : phase 3. Animation : phase 4. Exports : phase 5. PWA et déploiement : phase 6. Aucune donnée n’est enregistrée par cette version ; aucun compte ni service distant requis. Aucun déploiement automatique configuré.

## Lancer et vérifier

Node.js 22.12+ (Node 24 recommandé) et npm.

```sh
npm ci
npm run dev
```

Ouvrir l’URL `/coachOS-dashboard/` affichée par Vite.

```sh
npm run format:check
npm run build
npx playwright install --with-deps chromium
npm test
npm run preview
```

Playwright teste le build de production, avec un écran ordinateur et un format iPhone simulé sous Chromium. Pour utiliser un Chromium système : `CHROMIUM_PATH=/usr/bin/chromium npm test`. Un test sur appareil iPhone réel reste à effectuer avant la validation mobile de la V1.

## Sources et décisions

- `COACHOS_SPEC_V1.md` : exigences et phases avec validation entre chaque phase.
- `sources/index_original.html` : dashboard historique intact.
- `sources/stack_user_v2.json` : Stack à six étapes et 24 tracés, intact.
- `docs/PHASE_0_AUDIT.md` et `docs/source-snapshot.json` : inventaire et références de non-régression.
- `docs/PHASE_1_REVIEW.md` : périmètre livré et parcours de validation.

Ne pas modifier les sources originales. La migration doit conserver les intentions fournies et signaler les ambiguïtés plutôt que créer des déplacements non validés. Ne pas déployer avant validation explicite.
