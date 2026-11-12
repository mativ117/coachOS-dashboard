# Phase 3 — Éditeur compact OWLS

## Livré

- Mise en page resserrée : barre latérale et en-tête réduits, terrain centré, huit outils regroupés, timeline horizontale défilante, réglages et notes repliables. Sur petit écran, les outils passent sur deux rangées ; les panneaux se placent en une colonne. Les commandes n’empiètent pas sur le terrain.
- Nouveau système et initialisation volontaire des cinq joueurs. Les brouillons Baseline et Losange restent vides tant que le coach ne les initialise pas.
- Sélection puis appui à l’arrivée sur mobile ; glisser-déposer sur ordinateur. Coordonnées numériques accessibles au clavier pour joueurs, défenseurs, ballon libre et points de tracés.
- Course droite ou courbe, passe, écran droit ou courbe avec barre terminale T, effacement et annotation texte. Ajustement des points de contrôle et de l’épaisseur. Les marqueurs d’écran historiques sans trajet sont conservés tant qu’ils ne sont pas modifiés.
- Ballon libre ou attaché à un porteur, état au départ et à l’arrivée. Une passe dessinée reste optionnelle. La confirmation nécessite un passeur et un destinataire explicites ainsi qu’un porteur de départ cohérent ; elle transfère la possession statique. L’animation de cette passe sera livrée en phase 4.
- Ajout et suppression d’étapes, création de lectures depuis une étape commune, notes et titre modifiables. Une modification commune recalcule les départs et les positions héritées des lectures ; les destinations explicites sont conservées. Un avertissement visible précise cette propagation. Pas de duplication du tronc commun.
- Défenseurs facultatifs. Stack reste dans son repère brut ; l’association d’un tracé à un acteur est volontaire et ses dimensions ne sont pas supposées.
- Historique annuler/rétablir borné à 50 états, saisie de texte regroupée, raccourcis Ctrl/Cmd Z et Ctrl/Cmd Maj Z hors champs texte. Les suppressions d’étapes demandent confirmation et restent annulables.
- Sauvegardes atomiques sérialisées : aucune modification rapide abandonnée parce qu’une écriture est déjà en cours. L’état d’enregistrement reste visible. En cas d’échec, le brouillon reste affiché et exportable ; une nouvelle tentative respecte toujours le contrôle de révision, sans écraser un autre onglet.

## Compatibilité et sources

Les plays importés restent en schéma 1 jusqu’à leur première modification. L’édition utilise le schéma 2, qui ajoute annotations, défenseurs, épaisseur, passes confirmées et rapport d’origine. L’application relit les schémas 1 et 2, et refuse les versions inconnues. Un ancien build de phase 2 refuse un play de schéma 2 sans remplacer le stockage.

Le rapport de migration d’origine est conservé à la première modification ; les compteurs courants sont recalculés. Les deux fichiers `sources/` et le snapshot de référence ne sont pas modifiés.

Le terrain entier est maintenant un choix enregistré dans le play édité, et les positions conservent leur repère : aucune conversion arbitraire des tracés. Pour Stack, ce choix reste indisponible tant que ses dimensions ne sont pas confirmées. Le gabarit de présentation de phase 2 reste une vue séparée.

## Validation

- TypeScript strict, build Vite et format.
- 40 tests automatisés : 14 tests de modèle/stockage et 13 parcours dans deux formats Chromium, ordinateur et mobile simulé.
- Héritage commun/lectures, maintien des destinations explicites, géométries et points, possession optionnelle/confirmée/réversible, défenseurs et ballon libre.
- Création complète d’un système ; appuis tactiles ; glisser-déposer ; modification des courbes ; notes ; annuler/rétablir ; rechargement des données.
- Saisie rapide sérialisée sans perte ; quota simulé à l’autosave, export du brouillon non enregistré puis nouvelle tentative réussie.
- Annotation contenant des balises affichée comme texte, sans exécution HTML.
- Contrôle des rectangles des commandes, tous panneaux ouverts, à 320, 390, 768 et 1440 pixels : aucun chevauchement ni débordement horizontal du document. La timeline possède son propre défilement.
- Non-régression des données et des 65 vues historiques par format : géométrie SVG identique à la source tant que le play n’est pas édité.
- Captures compactes inspectées sur ordinateur et mobile. Les essais Safari et iPhone réel restent requis avant la validation mobile finale.

## Parcours de démo

1. Depuis la bibliothèque, créer un système et initialiser les cinq joueurs.
2. En Sélection, appuyer sur un joueur puis sa destination. Essayer aussi le glisser-déposer et les coordonnées du panneau Sélection.
3. Choisir Courbe : départ sur un joueur, point de contrôle, arrivée. Ajuster le point central puis l’épaisseur.
4. Ajouter un écran courbe : vérifier le trajet et sa barre T.
5. Dans Ballon, définir le porteur au départ. Dessiner une passe entre deux joueurs, puis cocher Exécuter cette passe et observer le transfert du ballon.
6. Modifier une note, annuler, rétablir et recharger après l’indication Enregistré.
7. Ajouter une lecture depuis une étape commune. Modifier une position commune et vérifier les départs hérités.
8. Ouvrir les panneaux sur petit écran et parcourir la timeline : aucun outil ne recouvre le terrain ou un autre contrôle.

## Suite

Phase 4 : animation, pause/reprise, vitesse, ordre et durée, lecture des branches et présentation dédiée. PDF/PNG, format `.coachos`, restauration et PWA restent aux phases 5–6. Aucun déploiement.

La PR de phase 3 part de la branche de phase 2 ; la fusion de la PR #3 n’a pas été réalisée, car la vérification automatique a demandé une autorisation explicite portant sur cette fusion. La validation fonctionnelle et l’autorisation de fusion sont distinctes. Les changements sont disponibles pour revue avant toute écriture sur `main`.
