# Phase 1 — Socle à valider

## Livré

- React + TypeScript strict + Vite, dépendances épinglées et lockfile npm.
- Trois espaces avec liens hash : bibliothèque, éditeur, présentation. Le système choisi reste dans l’URL ; retour navigateur et rechargement pris en charge.
- Thème clair off-white/navy, mise en page responsive, navigation clavier, lien d’évitement, noms accessibles des terrains, recherche et filtres.
- Inventaire de huit cartes issu de la phase 0, six sources à migrer et deux brouillons. Les miniatures sont génériques et identifiées comme telles.
- Terrain SVG repéré en centimètres : 15 × 14 m ou 15 × 28 m. En présentation, navigation latérale masquée et terrain agrandi. Aucun outil d’édition.
- Tests navigateur sur le build avec base `/coachOS-dashboard/`, et workflow CI sans déploiement.

## Vérification effectuée

- Compilation TypeScript stricte et build Vite réussis.
- Huit tests Playwright réussis : quatre parcours exécutés dans deux formats, ordinateur et iPhone simulé sous Chromium. Recherche/filtres/état vide, navigation/sélection/rechargement/historique, géométrie demi/entier et absence de débordement horizontal, clavier/route inconnue.
- Inspection des captures bibliothèque ordinateur/mobile, éditeur et présentation mobile.
- Les deux fichiers sources historiques sont inchangés par rapport à main.

Les AC complets de la V1 ne sont pas encore satisfaits. Les tests de cette phase portent sur le socle ; le format iPhone simulé ne vaut pas validation Safari ni test sur appareil réel.

## Parcours de démo

1. Démarrer le projet selon le README ; ouvrir la bibliothèque.
2. Chercher « Stack », puis tester le filtre « Brouillons » et réinitialiser.
3. Ouvrir Princeton ; vérifier l’annonce des positions de démonstration.
4. Passer du demi-terrain au terrain entier.
5. Choisir Présenter, puis Retour à l’éditeur ; recharger et utiliser le retour navigateur.
6. Refaire ces parcours sur petit écran et au clavier.

## Limites volontaires

Aucun mouvement tactique migré ; aucune édition, persistance, lecture animée, import/export, installation PWA ni publication. Les positions de joueurs sont génériques, sans possession ni trajectoires inventées. La phase 2 introduira les modèles, validateurs, stockage local et migrateurs avec rapports et tests de fidélité des sources.

Validation requise avant de commencer la phase 2, conformément à la section 9 de COACHOS_SPEC_V1.md.
