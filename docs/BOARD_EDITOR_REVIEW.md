# Éditeur sur le terrain — lot livré

## Parcours retenu

L’utilisateur a demandé une seule surface de placement, centrée sur le board et les étapes, puis a explicitement choisi **de dessiner les mouvements**. Aucun déplacement de pion ou de ballon ne doit inventer une course ou une passe.

1. Nouveau système → étape **Placement** directement ouverte avec les joueurs et le ballon. Les brouillons historiques vides conservent leur initialisation volontaire. Déplacer les joueurs et le ballon directement sur le terrain, par glisser-déposer ou sélection puis appui. Le ballon peut être déposé sur un joueur ou libre sur le terrain.
2. **+ Étape suivante** reprend les positions et la possession de l’étape précédente ; aucun tracé n’est ajouté.
3. Trois outils principaux : **Déplacer, Tracer, Passe**. Écran et Annotation restent dans Autres. Dessiner au doigt ou à la souris nettoie le geste au relâchement : tremblements réduits, trait presque droit redressé, zigzag angulaire conservé, courbe douce lissée. Aucun choix droit/courbe à faire. Les extrémités restent exactes ; le résultat contient au plus 96 points. Les coordonnées et sélecteurs d’élément/étape redondants ont été retirés.
4. Les étapes se choisissent dans une timeline unique au-dessus du terrain. Le lecteur rapide est ouvert par Lire l’étape ; les commandes secondaires sont regroupées dans Réglages et Vue. Les notes et les réglages de tracé sont repliables. Pour les données existantes sans étape Placement, un correcteur de possession reste accessible dans les réglages avancés. Il n’est pas présenté dans le nouveau parcours.
5. Une passe dessinée est optionnelle tant que « Exécuter cette passe » n’est pas validé. Le ballon ne change pas de porteur à cause d’un tracé optionnel. Une étape ambiguë garde son rendu statique.

Les éléments interactifs du terrain sont accessibles au clavier : Tab, Entrée/Espace et flèches, Maj pour un pas plus grand. Échap annule un tracé en cours. Les poignées de passes attachées ne proposent plus une modification d’extrémité qui serait immédiatement recalculée par le modèle.

## Terrain et caméra

- Un même groupe SVG de panier est utilisé deux fois, par rotation exacte à 180° : arcs, pointillés, cercle, couleur et épaisseurs identiques. La ligne et le cercle centraux sont séparés.
- Les proportions du gabarit historique et les coordonnées des systèmes ne sont pas normalisées implicitement. La normalisation FIBA entre tous les gabarits reste un choix distinct dans le suivi de l’audit.
- Terrain complet plus haut ; zoom, déplacement de la vue, vue entière et recadrage sur les éléments. Ces actions modifient la caméra, jamais les données tactiques.
- Avant de passer en demi-terrain, confirmation si des éléments de n’importe quelle étape/lecture sont hors du cadre. Annuler n’écrit rien. Confirmer conserve les positions, signale les éléments masqués et permet de recadrer.
- La cible tactile du ballon est élargie sans prendre la priorité sur un pion plus proche. Les mouvements restent explicites, y compris lorsque le ballon est déplacé vers un joueur.

## Corrections liées au parcours

- L’étape et la lecture actives figurent dans la route pour les retrouver après rechargement, sans ajouter une entrée d’historique à chaque sélection. Cela ne rend pas l’historique Undo persistant entre espaces.
- La création d’une lecture utilise l’étape courante comme point de départ, même lorsque le formulaire replié existait déjà avant le changement d’étape.
- Un point intermédiaire de courbe n’est plus attiré vers un joueur voisin. La tolérance de sélection des joueurs reste disponible au départ et pour les passes.
- La possession de départ d’une étape située après Placement peut être corrigée sans casser l’égalité des états du placement initial.

## Données et compatibilité

Le schéma Play **4** ajoute le champ facultatif `Step.purpose: "setup"` et la géométrie `polyline` pour conserver les angles des gestes tracés. Les courbes douces utilisent la géométrie Catmull-Rom existante ; les segments angulaires sont parcourus par distance sur toute la ligne en animation et restent identiques à l’affichage/export. Il est réservé à la première étape commune, sans action et avec états de début/fin identiques. Les nouveaux parcours initialisés l’utilisent ; les systèmes existants des schémas 1, 2 et 3 restent relus sans réécriture forcée. Les versions inconnues et placements incohérents sont refusés. Les originaux et le snapshot restent intacts.

Le placement est conservé dans les exports éditables, sauvegardes et copies. Un ancien build ne connaissant pas le schéma 4 refusera ces nouvelles données : après utilisation de cette version, un retour de code doit conserver la lecture du schéma 4. Ne pas effacer IndexedDB pour revenir à un ancien build. Exporter une sauvegarde externe avant toute opération de retour arrière.

## Vérifications

- Régression complète : 112 tests, dont 38 modèle/stockage et 37 parcours dans chacun des formats Chromium ordinateur/mobile.
- Nettoyage vérifié : petits tremblements, angles de zigzag, boucle, bornes, comportement au zoom, gestes souris et tactiles CDP, courbe réellement tracée conservée après nettoyage/rechargement et animation comparée au chemin SVG, annulation d’un geste interrompu, undo/redo en une action, rechargement, roundtrip et animation sur les segments. Le nettoyage concerne uniquement le geste en cours, jamais les dessins historiques ou importés.
- Nouveaux tests : placement versionné, héritage des états et des lectures, dessin explicite, possession, aller-retour éditable, refus des placements incohérents, symétrie des géométries et styles, garde-fou de cadre avec annulation sans écriture, zoom/déplacement sans mutation, état de navigation restauré.
- Les tests existants couvrent courbes/écrans en T, passes exécutées et optionnelles, ballon libre, notes, Undo/Redo, saisie rapide, quotas et secours, imports/conflits/restauration, exports PNG/PDF, PWA et absence de défaut axe sérieux/critique.
- Comparaison des 65 vues historiques dans chacun des deux formats ; parcours de navigation de l’éditeur adapté à la timeline unique.
- Absence de chevauchement entre 320 et 1440 px, y compris panneaux ouverts ; TypeScript strict, build, format et diff vérifiés. Captures ordinateur/mobile de Placement, étape dessinée et terrain complet inspectées.
- Safari/iPhone réel restent à vérifier. Les points de l’audit hors de ce lot sont recensés dans [AUDIT_FOLLOWUP.md](AUDIT_FOLLOWUP.md).

## Revue avant publication

Sur un système d’essai : placer joueur et ballon, créer une étape, tracer un zigzag en un geste puis une courbe et une passe, vérifier le nettoyage et l’annulation en une action, créer l’étape suivante et vérifier l’héritage ; recharger. Tester le terrain complet, zoomer, déplacer la vue, puis tester le garde-fou demi-terrain. Ouvrir un système historique et vérifier les tracés/lectures.

Cette branche est destinée à une revue avant fusion/publication. Le workflow Pages reste manuel ; aucune publication n’est déclenchée par la PR.


## Publication et recette du 16 novembre 2026

PR #8 fusionnée et version `10a701337508de18e22992a016bd1ac551454a62` publiée sur https://mativ117.github.io/coachOS-dashboard/ après réussite des 112 tests, du build, du format et de l’audit de production. Workflow : https://github.com/mativ117/coachOS-dashboard/actions/runs/43834254364.

Recette réelle de l’URL publiée dans deux profils Chromium isolés (1440 × 1000 et 390 × 844) : huit systèmes initiaux, nouveau placement, courbe conservée après nettoyage et rechargement, zigzag angulaire, lecture/pause, export PNG de l’étape courbe et PDF de trois pages ; édition et exports réalisés après coupure du réseau. Aucune erreur JavaScript ni réponse HTTP en erreur relevée. L’essai sur iPhone/Safari réel reste à effectuer ; les suites de l’audit restent dans AUDIT_FOLLOWUP.md.
