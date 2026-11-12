# CoachOS · OWLS

Espace personnel de conception et présentation de systèmes de basket. React, TypeScript strict, Vite ; interface en français et palette claire bleu marine / bleu OWLS.

## État actuel : phase 2

Bibliothèque, lecture statique dans l’Éditeur et Présentation. Les cinq systèmes historiques et Stack sont migrés ; Pin Down Iso possède ses quatre lectures. Baseline et Losange restent des brouillons. Recherche et filtres de collections ; notes et rapports de migration visibles.

Les données sont enregistrées dans **IndexedDB, sur ce navigateur et cet appareil**. Une première ouverture initialise la bibliothèque à partir des sources ; les suivantes relisent le stockage validé. Une préférence d’affichage peut être modifiée et persiste après rechargement. Les conflits entre onglets et les échecs de stockage sont signalés sans écrasement silencieux. Pensez à une copie externe : effacer les données du navigateur peut effacer la bibliothèque locale.

Stack reste en coordonnées brutes : les acteurs, le porteur, les dimensions et les timings ne sont pas inventés. Les passes historiques dessinées restent optionnelles ; le ballon statique respecte les marqueurs de possession explicites.

Le bouton Gabarit entier affiche un terrain vide de 15 × 28 m ; il ne modifie ni ne convertit les systèmes. Vue source restitue leurs coordonnées historiques.

**À venir :** édition et sauvegarde des modifications de plays en phase 3, animation en phase 4, formats `.coachos`/PDF/PNG et restauration en phase 5, PWA et publication en phase 6. La copie JSON de secours actuelle contient les données affichées ; aucun réimport n’est encore proposé. Aucun compte, service distant ou déploiement automatique.

## Lancer et vérifier

Node.js 22.12+ (Node 24 recommandé) et npm.

```sh
npm ci
npm run dev
```

Ouvrir `/coachOS-dashboard/` à l’adresse affichée par Vite. Les routes hash permettent le rechargement sans réécriture serveur.

```sh
npm run format:check
npm run build
npx playwright install --with-deps chromium
npm test
npm run preview
```

Les tests incluent les modèles et transactions via fake-indexeddb, puis les parcours sur le build de production dans deux formats sous Chromium. Pour le navigateur système : `CHROMIUM_PATH=/usr/bin/chromium npm test`. Le format iPhone simulé ne remplace pas les essais Safari et sur iPhone réel.

## Sources et décisions

- `COACHOS_SPEC_V1.md` : exigences et phases avec validation entre chaque phase.
- `sources/index_original.html` et `sources/stack_user_v2.json` : originaux intacts.
- `docs/PHASE_0_AUDIT.md` et `docs/source-snapshot.json` : inventaire et références de non-régression.
- `docs/PHASE_1_REVIEW.md` : historique du socle initial.
- `docs/PHASE_2_REVIEW.md` : périmètre livré, tests, limites et parcours de validation.

Ne pas modifier les sources originales, inventer des déplacements ou déployer avant validation explicite.
