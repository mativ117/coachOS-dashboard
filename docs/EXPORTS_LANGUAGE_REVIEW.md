# Exports directs et version anglaise

## Parcours livré

- **Exporter** visible au-dessus du terrain de l’éditeur, dans le lecteur et sur chaque carte de bibliothèque.
- Une fenêtre commune propose **Image PNG** pour l’étape affichée et **PDF du système** pour toutes les étapes et lectures. Le nom du système et le titre de l’étape indiquent le contexte.
- L’éditeur exporte son état de travail affiché, même si la sauvegarde locale échoue. Le lecteur se met en pause avant l’ouverture. Le rendu PNG reste celui de l’étape statique, pas une image intermédiaire de l’animation.
- Téléchargement automatique après préparation, indication du dossier de téléchargement, bouton de partage explicite et téléchargement de repli. Fermer la fenêtre interrompt une préparation ; rouvrir ne montre pas l’ancien résultat.
- Le fichier modifiable `.coachos` est proposé dans un volet secondaire. La copie JSON de secours rejoint les outils de données ; elle reste disponible directement en cas d’erreur du stockage.
- Les PDF regroupant plusieurs systèmes gardent leur panneau dans la bibliothèque. Les cases de sélection n’apparaissent que dans ce mode ; « Sélectionner les résultats » respecte les filtres, « Toute la bibliothèque » sélectionne tous les systèmes.

## Langues

**Français / English** dans l’en-tête et les réglages de l’éditeur. Français par défaut, préférence locale `coachos.language`, indépendante d’IndexedDB et des sauvegardes. Un stockage des préférences indisponible ne bloque pas le changement pour la session.

Traductions embarquées de l’interface, des aides, du tutoriel, des libellés accessibles et des légendes d’export. Aucun service de traduction distant. Changer de langue garde le système et l’étape en cours. Les noms, consignes, annotations, descriptions et noms de collections existants restent tels qu’ils ont été saisis ou importés. Les nouvelles étapes reçoivent un titre par défaut dans la langue active.

Le tutoriel présente les nouveaux exports et explique où retrouver les fichiers. Une section anglaise du README décrit le parcours de départ.

## Vérifications

Build TypeScript strict, formatage, suite de modèles et parcours Chromium ordinateur / mobile simulé. Les nouveaux scénarios couvrent la préférence de langue, le tutoriel et les filtres en anglais, le rechargement hors ligne, l’absence de mutation de la bibliothèque, l’export PNG de l’étape courante, le PDF complet, la pause du lecteur, la remise à zéro du résultat précédent, l’export depuis une carte et la sélection filtrée. Contrôles axe sur le tuto anglais et la fenêtre d’export.

Les essais sur Safari et iPhone réel restent à effectuer. Le PDF conserve son moteur de rendu actuel ; texte sélectionnable et réduction de son poids restent dans le suivi d’audit.
