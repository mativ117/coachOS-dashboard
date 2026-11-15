# CoachOS · OWLS

Espace personnel de conception et présentation de systèmes de basket. React, TypeScript strict, Vite ; interface en français et palette claire bleu marine / bleu OWLS.

## État actuel : phase 4

Bibliothèque, éditeur tactile/PC et présentation animée. Les cinq systèmes historiques et Stack sont migrés ; Pin Down Iso garde ses quatre lectures. Baseline et Losange restent des brouillons jusqu’à leur initialisation volontaire.

L’éditeur compact propose joueurs, défenseurs, courses/courbes, passes, écrans en T, annotations, points réglables, ballon libre/attaché, timeline, lectures, notes, undo/redo et autosave. Le panneau Animation règle durée d’étape et groupe/durée des actions. Aperçu animé partage le même lecteur que la Présentation.

Le lecteur propose lire/pause/reprise, vitesse, progression, étapes et branches. La pause et le changement de vitesse conservent le temps courant. Les groupes identiques jouent ensemble ; les suivants attendent la fin des précédents. Les timings par défaut sont un tempo de démonstration, jamais une décision tactique importée.

Une passe optionnelle ne transfère pas le ballon pendant l’animation. Une passe confirmée, dont la possession et le calendrier sont cohérents, produit un vol suivi d’une réception. Toute étape ambiguë reste statique, dans son état source, avec une indication à confirmer. Stack conserve donc sa lecture statique tant que ses acteurs et transitions ne sont pas précisés.

Plein écran natif si disponible, sinon mode agrandi avec gestion du focus et d’Échap. La réduction des mouvements désactive l’animation et conserve la navigation manuelle. Les notes restent visibles, les outils d’édition sont masqués en présentation.

Les données sont enregistrées dans **IndexedDB, sur ce navigateur et cet appareil**. Les écritures sont sérialisées, atomiques et contrôlées par révision. En cas d’échec, le brouillon affiché reste exportable en JSON de secours. Effacer les données du navigateur peut effacer la bibliothèque locale : gardez une copie externe.

Les schémas 1 et 2 restent lisibles ; le schéma 3 ajoute les timings facultatifs. Les versions inconnues sont refusées sans remise à zéro. Les deux fichiers sources restent intacts. Le terrain entier est enregistré dans le play et présenté comme tel, sans transformation arbitraire des coordonnées.

**À venir :** `.coachos`, PDF/PNG, import et restauration en phase 5 ; PWA et publication en phase 6. Aucun compte, service distant ni déploiement automatique.

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

Les tests couvrent modèles, horloge, géométries, transactions via fake-indexeddb et parcours sur le build de production dans deux formats Chromium. Navigateur système : `CHROMIUM_PATH=/usr/bin/chromium npm test`. Le format iPhone simulé ne remplace pas les essais Safari et iPhone réel.

## Sources et décisions

- `COACHOS_SPEC_V1.md` : exigences et validation entre chaque phase.
- `sources/index_original.html` et `sources/stack_user_v2.json` : originaux intacts.
- `docs/PHASE_0_AUDIT.md` et `docs/source-snapshot.json` : inventaire et références.
- `docs/PHASE_1_REVIEW.md` à `docs/PHASE_3_REVIEW.md` : étapes précédentes.
- `docs/PHASE_4_REVIEW.md` : périmètre livré, tests, limites et parcours de démo.

Ne pas modifier les sources originales, inventer des déplacements ou déployer avant validation explicite.
