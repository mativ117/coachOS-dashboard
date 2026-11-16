# Guide Tuto

## Contenu

Page `#/tutorial`, accessible par Tuto dans la navigation, sans onboarding imposé. Le guide explique : création/placement, déplacement des joueurs, sélection du ballon puis du joueur destinataire, ballon libre, héritage entre étapes, dessin nettoyé, passes optionnelles/exécutées, écrans en T, annotations, annulation, lecture, notes, fichiers et hors ligne.

Les explications suivent les gestes existants. Un clic sur un joueur seul le sélectionne : le changement de porteur commence par le petit ballon orange. Déplacer le ballon ne dessine pas de passe. Le tutoriel explique aussi Exécuter cette passe et la nécessité d’un passeur ayant le ballon au départ.

Les raccourcis de la page conduisent aux rubriques ou ouvrent le terrain d’entraînement. Le lien Revenir à mon espace conserve système, lecture et étape lorsque l’on vient de l’éditeur. Il ne promet pas de conserver l’historique Undo entre espaces.

## Terrain d’entraînement

Le même EditorCanvas et les mêmes commandes métier sont utilisés, dans un état React distinct. Aucun appel au stockage, à savePlay ou à commitLibrary. Déplacer, donner/libérer le ballon, tracer et recommencer sont possibles ; quitter le guide réinitialise cet exercice. Les systèmes réels ne sont pas modifiés.

La page et l’exercice sont inclus dans le build et le cache PWA : ils restent accessibles hors ligne après préparation, même si la bibliothèque est vide. Aucun fichier externe, compte ou suivi ajouté.

## Vérifications

- 120 tests : 38 modèle/stockage et 41 parcours par format Chromium ordinateur/mobile.
- Navigation, titre, raccourcis et retour à l’étape/lecture actives.
- Gestes réels souris/tactiles du ballon, porteur déplacé, ballon libre, dessin et remise à zéro dans l’exercice.
- Bibliothèque IndexedDB identique avant/après l’exercice, puis exercice remis à zéro au rechargement.
- Guide et exercice hors ligne et avec bibliothèque vide.
- Navigation sans chevauchement et sans débordement horizontal de 320 à 1440 px ; aucun défaut axe sérieux ou critique.
- Régression existante de l’éditeur, des courbes/zigzags, des sources historiques, des exports et de la PWA ; TypeScript strict, build et format.

La simulation mobile Chromium ne remplace pas la recette Safari/iPhone réel, qui reste suivie dans AUDIT_FOLLOWUP.md.
