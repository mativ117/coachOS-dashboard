# CoachOS · OWLS

Espace personnel de conception et présentation de systèmes de basket. React, TypeScript strict, Vite ; interface en français et palette claire bleu marine / bleu OWLS.

## État actuel : phase 3

Bibliothèque, éditeur tactile/PC et présentation statique. Cinq systèmes historiques et Stack migrés ; Pin Down Iso garde ses quatre lectures. Baseline et Losange restent des brouillons jusqu’à leur initialisation volontaire.

L’éditeur compact propose sélection/appui ou glisser-déposer, cinq joueurs, défenseurs, course droite/courbe, passe, écran en T droit/courbe, annotations, points réglables, ballon libre/attaché, timeline, lectures, notes, annuler/rétablir et sauvegarde automatique. Notes et réglages sont repliables ; la timeline défile dans son propre espace. Les parcours et l’absence de chevauchement sont contrôlés de 320 à 1440 pixels.

Les données sont enregistrées dans **IndexedDB, sur ce navigateur et cet appareil**. Les écritures sont sérialisées et atomiques ; les conflits entre onglets sont signalés. Une erreur conserve les données de travail affichées et permet leur export JSON de secours. Effacer les données du navigateur peut effacer la bibliothèque locale : gardez une copie externe.

Les plays de schéma 1 sont relus sans modification. L’édition passe le play au schéma 2 en conservant son rapport d’origine. Les versions inconnues sont refusées, sans remise à zéro silencieuse.

Stack reste en coordonnées brutes. Ses acteurs doivent être associés explicitement et ses dimensions ne sont pas inventées. Une passe dessinée est optionnelle ; sa confirmation exige un porteur de départ cohérent. Le ballon statique suit les décisions explicites. Le terrain entier est enregistrable par play, sans transformer les coordonnées historiques.

**À venir :** animation en phase 4 ; `.coachos`, PDF/PNG, import et restauration en phase 5 ; PWA et publication en phase 6. Aucun compte, service distant ni déploiement automatique.

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

Les tests incluent modèles, transactions via fake-indexeddb et parcours sur le build de production dans deux formats Chromium. Navigateur système : `CHROMIUM_PATH=/usr/bin/chromium npm test`. Le format iPhone simulé ne remplace pas les essais Safari et iPhone réel.

## Sources et décisions

- `COACHOS_SPEC_V1.md` : exigences et phases avec validation entre chaque phase.
- `sources/index_original.html` et `sources/stack_user_v2.json` : originaux intacts.
- `docs/PHASE_0_AUDIT.md` et `docs/source-snapshot.json` : inventaire et références.
- `docs/PHASE_1_REVIEW.md`, `docs/PHASE_2_REVIEW.md` : étapes précédentes.
- `docs/PHASE_3_REVIEW.md` : périmètre livré, tests, limites et démo de l’éditeur.

Ne pas modifier les sources originales, inventer des déplacements ou déployer avant validation explicite.
