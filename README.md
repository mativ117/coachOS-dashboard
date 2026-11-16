# CoachOS · OWLS

Espace personnel de conception et présentation de systèmes de basket. React, TypeScript strict, Vite ; interface en français et palette claire bleu marine / bleu OWLS.

## État actuel : PWA publiée, éditeur simplifié et dessin nettoyé

Bibliothèque, éditeur tactile/PC et présentation animée. Les cinq systèmes historiques et Stack sont migrés ; Pin Down Iso garde ses quatre lectures. Baseline et Losange restent des brouillons jusqu’à leur initialisation volontaire.

L’éditeur utilise le terrain comme surface de placement : joueurs, défenseurs, ballon et points de tracés se déplacent directement. Les nouveaux systèmes commencent par Placement ; chaque étape suivante reprend l’état précédent. Les mouvements sont dessinés explicitement au doigt ou à la souris ; le geste est nettoyé en conservant ses angles ou ses courbes. Déplacer un pion ne génère pas une action. Trois outils principaux : Déplacer, Tracer, Passe ; écrans et annotations dans Autres. Les étapes sont au-dessus du terrain, les notes sont repliables et les commandes secondaires sont dans Réglages et Vue. Undo/redo, autosave et aperçu animé sont conservés. Voir `docs/BOARD_EDITOR_REVIEW.md`.

Le lecteur propose lire/pause/reprise, vitesse, progression, étapes et branches. La pause et le changement de vitesse conservent le temps courant. Les groupes identiques jouent ensemble ; les suivants attendent la fin des précédents. Les timings par défaut sont un tempo de démonstration, jamais une décision tactique importée.

Une passe optionnelle ne transfère pas le ballon pendant l’animation. Une passe confirmée, dont la possession et le calendrier sont cohérents, produit un vol suivi d’une réception. Toute étape ambiguë reste statique, dans son état source, avec une indication à confirmer. Stack conserve donc sa lecture statique tant que ses acteurs et transitions ne sont pas précisés.

Plein écran natif si disponible, sinon mode agrandi avec gestion du focus et d’Échap. La réduction des mouvements désactive l’animation et conserve la navigation manuelle. Les notes restent visibles, les outils d’édition sont masqués en présentation.

Les données sont enregistrées dans **IndexedDB, sur ce navigateur et cet appareil**. Les écritures sont sérialisées, atomiques et contrôlées par révision. En cas d’échec, le brouillon affiché reste exportable en JSON de secours. Effacer les données du navigateur peut effacer la bibliothèque locale : gardez une copie externe.

Les schémas 1 à 3 restent lisibles ; le schéma 4 ajoute le placement initial explicite et les tracés angulaires des nouveaux gestes. Les versions inconnues sont refusées sans remise à zéro. Les deux fichiers sources restent intacts. Le terrain entier est enregistré dans le play et présenté comme tel, sans transformation arbitraire des coordonnées.

Les fichiers `.coachos` transportent un système éditable ; `.coachos-backup` sauvegarde toute la bibliothèque, les collections, le profil et les préférences. Chaque import affiche un aperçu : annuler, remplacer ou conserver les deux. Une restauration complète nécessite un choix explicite et garde le précédent état local récupérable. Les copies recâblent leurs identifiants internes.

PNG haute résolution de l’étape choisie et PDF de plusieurs systèmes, avec toutes leurs lectures, notes paginées, orientation et profil/équipe/logo. Le partage natif est facultatif, avec téléchargement de repli. Les panneaux repliables gardent un format compact. Le profil reste local ; seuls les exports demandés l’incluent.

PWA installable avec manifest et icônes. Attendre **Disponible hors ligne** avant de couper le réseau : édition, présentation, sauvegarde et modules PDF/PNG sont alors mis en cache. Le panneau donne les instructions iPhone/ordinateur et permet de demander la protection du stockage si le navigateur la propose. Une mise à jour attend la fermeture des onglets, sans rechargement automatique.

PWA publiée : https://mativ117.github.io/coachOS-dashboard/. Le workflow GitHub Pages reste manuel ; aucun déploiement automatique à la fusion. L’éditeur simplifié et le dessin à main levée nettoyé sont publiés. Voir `docs/DEPLOYMENT.md`. Aucun compte ni service distant. Les essais Safari/iPhone réel restent à effectuer.

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
- `docs/PHASE_4_REVIEW.md` : animation et présentation.
- `docs/PHASE_5_REVIEW.md` : fichiers et exports.
- `docs/PHASE_6_REVIEW.md` : PWA et qualité.
- `docs/BOARD_EDITOR_REVIEW.md` : éditeur simplifié, terrain et compatibilité.
- `docs/AUDIT_FOLLOWUP.md` : suivi des propositions restantes de l’audit.
- `docs/DEPLOYMENT.md` : publication et retour arrière.
- `docs/CAPACITOR.md` : préparation native ultérieure, sans app native livrée.

Ne pas modifier les sources originales, inventer des déplacements ou déployer avant validation explicite.
