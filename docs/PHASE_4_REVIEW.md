# Phase 4 — Animation et présentation

## Livré

- Les PR #3 et #4 ont été fusionnées dans `main` après l’autorisation explicite de l’utilisateur. La phase 4 part de ce contenu validé.
- Lecteur partagé entre la Présentation et l’Aperçu animé de l’éditeur. Aucun contrôle de dessin pendant la lecture. Terrain et notes restent visibles ; interface compacte OWLS conservée.
- Lire, pause, reprise, recommencer, étape précédente/suivante, sélection d’étape, barre de progression et vitesses ×0,25 à ×3. Une pause fige le temps et la position ; modifier la vitesse ne réinitialise pas la progression.
- Courbes parcourues selon la même géométrie Catmull-Rom/Bézier que le SVG, avec interpolation par distance. Les trajectoires droites et les écrans avec déplacement utilisent leurs points enregistrés. Un écran historique sans trajet reste un marqueur placé.
- Durée d’étape et ordre/durée des actions réglables dans un panneau repliable de l’éditeur. La saisie accepte virgule ou point ; Entrée ou la sortie du champ valide la valeur sans interrompre la frappe. Les actions du même groupe commencent ensemble ; les groupes s’enchaînent. Les durées explicites d’action peuvent allonger la durée effective d’étape. Les durées par défaut sont identifiées comme un tempo de démonstration ; elles ne sont pas inscrites dans les sources.
- Ballon attaché suivant son porteur. Seule une passe confirmée et cohérente avec son départ, son destinataire et son calendrier produit un vol puis une réception. Les passes optionnelles ne transfèrent pas le ballon pendant l’animation.
- Les lectures reprennent leur tronc commun. Changer de lecture arrête la lecture en cours et revient à la première étape. La fin de séquence arrête l’horloge ; changer d’onglet met la lecture en pause.
- Plein écran natif lorsqu’il est disponible. Sinon, mode agrandi de repli avec arrière-plan inerte, focus contenu et sortie par Échap. Mise en page adaptée au portrait et au paysage.
- Préférence système de réduction des mouvements respectée : lecture animée désactivée, étapes toujours consultables manuellement. Un changement de cette préférence pendant la lecture arrête l’animation.

## Gestion des ambiguïtés

Avant chaque animation, le lecteur vérifie les acteurs, la continuité des trajets et leurs destinations, les déplacements simultanés d’un même joueur et la possession du ballon. Une étape ambiguë est montrée **statiquement dans son état source exact**, avec les points à confirmer. L’autoplay peut la présenter comme une diapositive ; aucun trajet manquant n’est inventé.

Stack reste dans son repère brut. Ses six étapes sont consultables et leurs tracés visibles ; tant que les acteurs et transitions ne sont pas précisés, elles restent statiques. Un changement de porteur historique sans passe confirmée est également statique. Un défenseur déplacé sans trajet enregistré empêche l’interpolation de l’étape.

## Données et compatibilité

Le schéma 3 ajoute uniquement les timings facultatifs d’étape et d’action ainsi que les groupes d’action. Les schémas 1 et 2 restent lisibles. Un play passe au schéma 3 lorsqu’un timing est enregistré ; les versions inconnues ou timings non finis/hors bornes sont refusés. Les sources originales, points, notes, identité et rapport d’origine sont conservés.

Le lecteur de présentation montre désormais le format réel du play, y compris le terrain entier créé dans l’éditeur. L’ancien gabarit vide de phase 2 est remplacé par cette vue réelle. La préférence historique de gabarit reste relisible dans le stockage pour compatibilité.

## Validation

- TypeScript strict, format et build Vite.
- 62 tests : 22 contrôles modèle/stockage et 20 parcours dans chacun des deux formats Chromium.
- Horloge déterministe : pause/reprise/vitesse sans saut ; groupes et durées ; parcours courbe ; bornes ; états de début/fin ; ballon attaché, passe optionnelle, vol et réception d’une passe confirmée.
- Comparaison du pion animé à la position mesurée sur le chemin SVG du navigateur, avec tolérance inférieure à 0,5 unité source.
- Parcours de lecture avec horloge navigateur contrôlée : pause stable, reprise, changement de vitesse, fin de séquence, scrub, sélection de lecture et tronc commun.
- Timings sauvegardés/rechargés, aperçu animé depuis l’éditeur, mouvements réduits, repli statique Stack, plein écran natif ou repli, focus et Échap.
- Absence de chevauchement des commandes en présentation agrandie à 390 × 844, 844 × 390 et 1440 × 1000. Les contrôles compacts de l’éditeur restent vérifiés entre 320 et 1440 pixels.
- Les tests existants de migration, des 65 vues historiques par format, d’édition, undo/redo, saisie rapide, quotas et sauvegarde restent inclus.
- Captures de présentation ordinateur/mobile inspectées. Safari et iPhone réel restent à tester avant validation mobile finale.

## Parcours de démo

1. Présenter Princeton et sélectionner « Cut de 1 : première option ».
2. Lire, mettre en pause au milieu de la coupe, changer la vitesse, puis reprendre.
3. Parcourir les étapes ; distinguer les trajets renseignés des étapes statiques à confirmer.
4. Choisir chacune des lectures de Pin Down Iso et vérifier le tronc commun.
5. Dans l’éditeur, régler Animation · ordre et durée, puis ouvrir Aperçu animé.
6. Sur un système créé dans l’éditeur, définir un porteur de départ, dessiner et confirmer une passe, puis observer le vol et la réception. Décaler le groupe de passe si le passeur doit finir son déplacement avant de donner.
7. Tester le plein écran en portrait/paysage, quitter avec le bouton ou Échap.
8. Activer la réduction des mouvements du système : utiliser la navigation manuelle.

## Suite

La phase 5 couvrira les fichiers `.coachos`, import/export éditable, copies et conflits, sauvegarde/restauration complète, PDF/PNG et partage natif facultatif. La PWA et la publication restent en phase 6. Aucun déploiement n’a été effectué.

Validation de phase 4 requise avant la phase 5, conformément à COACHOS_SPEC_V1.md, section 9.
