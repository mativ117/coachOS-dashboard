# Audit UX CoachOS — novembre 2026

## Méthode et références en ligne

Revue heuristique des parcours création, placement/ballon, dessin, étapes, présentation et export. Comparaison des recommandations et de documentation produit officielle ; il ne s’agit pas d’un classement mesuré des applications ni d’un test avec des coachs recrutés.

- [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) : présenter les actions fréquentes, révéler les réglages spécialisés à la demande. Application : accueil plus court, import/sauvegarde regroupés, réglages détaillés des passes repliés.
- [NN/g — Recognition and Recall](https://www.nngroup.com/articles/recognition-and-recall/) : rendre les possibilités reconnaissables dans le contexte plutôt que demander de mémoriser un tutoriel. Application : retour explicite quand le ballon est sélectionné et validation de passe près du dessin.
- [W3C — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) : le critère AA indique 24 px ou des exceptions d’espacement. Les nouveaux boutons de navigation utilisent 44 px ; ce choix produit ne constitue pas une certification WCAG de tout le terrain.
- [W3C — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) : préserver les alternatives au glisser. CoachOS garde le placement par sélection/appui et les déplacements au clavier.
- [TacticalPad — Quick Training](https://tacticalpad.com/edu/formation.php) : documentation organisée autour du placement, du dessin, des planches animées et du partage. Ces tâches orientent la revue ; nous n’avons pas testé son application connectée.
- [FastDraw — guide officiel](https://download.fastmodelsports.com/support/FastDrawBasicUserGuide.pdf) : aperçu de recherche du guide consulté pour ses frames et outils de dessin. Le document complet n’a pas été chargé par l’outil web, et aucune conclusion comparative de performance n’en est tirée.

## Problèmes observés et correctifs appliqués

| Priorité | Observation sur CoachOS | Correction |
|---|---|---|
| P1 | À 390 px, après une passe, sa validation se trouvait vers y=1014, après un terrain situé vers y=408. | Validation et indication de transfert juste avant le terrain ; paramètres acteur/destinataire toujours disponibles dans Sélection, repliés. Aucune passe confirmée automatiquement. |
| P1 | La saisie d’annotation se trouvait vers y=1185, alors qu’il faut ensuite revenir toucher le terrain. | Saisie contextuelle avant le terrain, focus clavier à l’ouverture, instruction courte ; aucune deuxième méthode de dessin ajoutée. |
| P1 | Changer le porteur demande de se souvenir de sélectionner le ballon en premier. | Après sélection du ballon, message local indiquant d’appuyer sur le destinataire ou un emplacement libre. Geste conservé. |
| P2 | Sur les longues séquences, il faut rechercher et faire défiler les pastilles pour avancer/reculer. | Précédent/suivant et repère d’étape dans la même ligne que les commandes existantes ; accès direct par pastilles conservé. |
| P2 | Le texte historique des plays de départ occupe l’accueil à chaque visite. | Informations conservées dans un volet fermé, clairement nommé. |
| P2 | Import et sauvegarde concurrencent visuellement création et export. | Regroupement sous Importer et sauvegarder ; export reste visible, sauvegardes et restauration conservées. |
| P2 | Le ballon agrandit sa zone tactile sur le porteur. Un test par cible DOM était intercepté. | Vérification par coordonnées : le code arbitre déjà par proximité, donc pas de preuve d’un mauvais transfert réel. En mode dessin, le ballon ne capture plus les pointeurs destinés aux joueurs ; le comportement de sélection reste inchangé. |

La première comparaison après déplacement des contrôles place la validation vers y=434 et la saisie vers y=429 ; le retrait de l’aide générique redondante les rapproche encore du haut de l’écran.

Les positions ci-dessus proviennent de la fenêtre de test (390×844), pas d’une moyenne de temps utilisateur. Captures et relevé de référence dans l’espace de travail `/workspace/coachos-ux-audit/`.

## Fonctionnalités conservées

Dessin explicite avec nettoyage des courbes/angles, placement sans mouvement implicite, branchements, validation explicite des passes, annuler/rétablir, notes, réglages avancés, présentation, PDF complet et ZIP de tous les PNG. Les modifications portent sur l’interface ; pas de migration du modèle ni de traduction des textes utilisateur. Français et anglais, hors ligne et clavier restent couverts.

## Suite recommandée

- Tester les gestes avec quelques coachs sur leurs vrais appareils et mesurer réussite, erreurs et demandes d’aide. La présente revue ne permet pas de chiffrer un gain de temps.
- Vérifier les cibles des joueurs et du ballon sur iPhone/Safari réel, y compris les éléments proches. Le format mobile Chromium simulé ne remplace pas ce test.
- Garder le suivi existant pour l’historique entre espaces, le formulaire de profil non enregistré et les gros volumes. Le problème D01 de taille des sauvegardes reste un lot de fiabilité distinct ; il n’est pas déclaré corrigé ici.
- Envisager ensuite les vignettes d’étapes et le renommage des lectures, après observation des usages. Aucun nouveau mode « simple/expert » ni nouvelle couche de menus globale n’a été ajouté.
