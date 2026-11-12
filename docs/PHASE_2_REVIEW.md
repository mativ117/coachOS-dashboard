# Phase 2 — Sources, modèle et stockage local

## Périmètre livré

- Palette claire orientée OWLS : bleu marine, bleu royal, bleus pâles. Les cuts et avertissements conservent un accent ambre pour rester distincts des courses.
- Modèle TypeScript versionné : plays, étapes, états avant/après, ballon libre/attaché ou inconnu, géométries, lectures référencées au tronc commun, collections et préférences. IDs stables ; dates et révisions explicites.
- Validation stricte des champs, versions, tailles, profondeur, nombres finis et bornés, identifiants, références et continuité des états. Versions inconnues refusées ; aucune remise à zéro silencieuse d’un stockage invalide.
- Parseur interne des données du HTML historique connu : littéraux et constructeurs F/M/C/P/S seulement, sans eval, Function ou injection du HTML dans l’application.
- Cinq systèmes historiques migrés intégralement : Princeton 11 étapes ; Pin Down Iso 2 communes et lectures 4/3/4/4 ; Pin Down Cut 8 ; Stagger Elevator 13 ; SLOB 10. Titres, descriptions, conseils, actions, points via, écrans et marqueurs de possession conservés.
- Stack : 6 étapes, 24 tracés libres, positions et notes inchangées. Aucune attribution d’acteur, de porteur, de timing ni de branche déduite. Le cadrage englobe les coordonnées brutes ; aucun terrain métrique n’est superposé tant que les dimensions ne sont pas confirmées.
- Baseline et Losange : brouillons nommés, aucune étape ni position tactique inventée.
- Lecture statique des étapes et des quatre lectures Pin Down Iso, notes et rapport de migration par play. Miniatures issues des positions importées. Collections par références aux plays.
- IndexedDB : initialisation une seule fois, lecture validée, écriture atomique et contrôle de révision inter-onglets. La préférence de gabarit permet de vérifier un changement persistant depuis l’interface.
- Échec de stockage visible, données existantes préservées, export JSON de secours des données affichées. Ce fichier n’est pas encore le format `.coachos` ou une restauration complète de phase 5.

## Vérifications

- TypeScript strict, format et build Vite.
- 22 tests : 8 contrôles modèle/stockage et 7 parcours navigateur dans deux formats (ordinateur et iPhone simulé sous Chromium).
- Extraction comparée au snapshot de phase 0 ; empreintes SHA-256 des originaux vérifiées.
- Toutes les données migrées comparées aux données source : positions, actions, points de contrôle, textes, conseils et porteurs.
- Comparaison du rendu SVG au lecteur historique pour 65 vues d’étapes, y compris le tronc commun répété dans chaque lecture, sur ordinateur et petit écran : chemins de courbes, positions de joueurs, marqueurs d’écran et ballon identiques. Il s’agit d’une comparaison géométrique, pas d’une identité pixel à pixel après changement de thème.
- Stockage : fermeture/réouverture, révisions concurrentes, initialisation concurrente, quota simulé et refus de données invalides ; ancienne bibliothèque conservée après échec.
- Navigateur : recherche, collections, notes, étapes, rechargement, historique, préférence persistée, clavier, export de secours et stockage corrompu non remplacé.
- Captures inspectées avec la palette OWLS. Safari et iPhone réel restent à vérifier avant validation mobile V1.

## Parcours de validation

1. Lancer selon le README. Vérifier les cartes OWLS, filtrer Playbook OWLS et À confirmer.
2. Ouvrir Princeton, parcourir les étapes et consulter les notes et le rapport.
3. Ouvrir Pin Down Iso, choisir chacune des quatre lectures : elles reprennent leurs deux étapes communes.
4. Ouvrir Stack : vérifier notes et tracés, sans possession ni acteur supposé.
5. Choisir Gabarit entier puis recharger : la préférence revient. Cette vue est un gabarit vide ; elle ne convertit pas les coordonnées des plays. Revenir à Vue source pour les tracés.
6. Vérifier Baseline et Losange, encore sans étapes.
7. Tester le mode Présentation et la copie de secours JSON.

## Limites et suite

Cette phase ne livre pas encore de dessin, modification des plays ou collections, undo/redo, animation, PDF/PNG, import de fichiers utilisateur, restauration ou PWA. Les écrans historiques placés sans trajet sont conservés tels quels. Les passes optionnelles ne sont pas exécutées ; seuls les marqueurs explicites de possession déterminent le ballon statique.

La phase 3 construira l’éditeur tactile/PC, le ballon, les courbes et écrans T modifiables, les branches et l’autosave des modifications. Validation de cette phase requise avant la suivante selon COACHOS_SPEC_V1.md, section 9. Aucun déploiement effectué.
