# Audit : outils de tracé et séparation des plays

Demande : retrouver les tracés manuels et proposés sur chaque étape, et ouvrir la bibliothèque sur les plays personnels. Revue du code de la version publiée, sans modification des données ni déploiement fonctionnel dans cet audit.

## Constat vérifié

| Besoin | État actuel | Correction proposée |
|---|---|---|
| Main levée, angles et courbes conservés | Accessible via Tracer, avec nettoyage du geste | Conserver ce fonctionnement et ses géométries |
| Droite proposée | Une ligne à deux points est comprise par le modèle ; pas de choix explicite Droite | Proposer un outil à deux appuis, indépendant du nettoyage automatique |
| Courbe proposée | Le type `curve` et les trois appuis sont conservés ; bouton exclu par le filtre de la barre | Rétablir le choix et son aperçu départ/courbure/arrivée |
| Écran fixe | La géométrie à un point `legacy-screen` est lue et rendue pour les anciens plays ; aucun outil de création dédié | Ajouter une commande de pose d’écran fixe, sans inventer une course du poseur |
| Déplacement d’écran | Écran disponible comme trajet manuel terminé par une barre ; `screen-curve` existe mais n’est pas proposé | Nommer explicitement le déplacement et proposer manuel/droit/courbe |
| Passe | Accessible, deux joueurs requis ; transfert uniquement après validation explicite | Conserver les règles de possession et l’accès contextuel à la validation |
| Tracer sur toute étape | Les étapes courantes et les lectures acceptent les actions ; Placement masque les outils | Autoriser le premier dessin via conversion atomique de Placement en première étape d’action |
| Mes plays séparés des exemples | Bibliothèque filtrée sur tous les plays ; catégories et collections ne distinguent pas l’appartenance | Mes plays par défaut, Exemples séparés, vue Tous explicite |

Le problème est donc principalement une régression d’accès aux capacités existantes. L’écran fixe demande en plus une vraie commande de création.

## Emplacements examinés

- `src/editor/Editor.tsx` : liste complète `tools`, filtre limité à select/run/pass, sous-menu limité à screen/annotation, conditions `step.purpose` et remise en sélection pour Placement.
- `src/editor/EditorCanvas.tsx` : run/screen/pass utilisent le geste manuel ; courbes utilisent trois appuis ; un outil à deux appuis peut être distinct du geste libre. Les gestes inachevés sont déjà réinitialisés au changement d’étape ou d’outil.
- `src/editor/commands.ts` : ajout d’action et propagation `finish/rebase`, états avant/après et mise à jour spéciale du placement initial.
- `src/model/validate.ts` : Placement doit être la première étape commune, sans action et avec états avant/après identiques. Masquer simplement la condition dans l’interface produirait des données invalides.
- `src/components/PlayDiagram.tsx`, `src/animation/engine.ts`, `src/files/graphics.tsx` : rendus, lecture et exports à couvrir pour chaque outil.
- `src/files/LibraryWorkspace.tsx` : liste globale avant les filtres et sélection PDF/ZIP.
- `src/model/types.ts`, `src/files/import-plan.ts` : provenance technique de migration, imports, duplication. Le statut edited n’est pas un propriétaire ; les exemples modifiés ne doivent pas disparaître.

## Interface recommandée

### Dessin

Conserver les trois actions principales **Déplacer**, **Tracer**, **Passe**. Un sélecteur visible **Type de tracé**, près de Tracer, expose Main levée, Droite, Courbe, Écran fixe et Déplacement d’écran. Ce dernier propose sa forme manuel/droit/courbe au même endroit. Annotation reste secondaire.

Chaque outil affiche une seule consigne courte et un aperçu pendant la saisie. Même accès sur Placement, sur les étapes anciennes et sur les lectures alternatives. Les points d’un tracé restent ajustables. Échap annule un geste inachevé ; Annuler restaure une action complète. Aucun mouvement n’est déduit du simple déplacement d’un pion.

**Placement :** au premier tracé validé, retirer son marqueur `purpose: setup` dans la même transaction que l’ajout de l’action. Garder l’état initial et les positions de départ ; la destination appartient à l’état après l’action. Un geste annulé ne convertit rien. Undo doit restaurer le placement pur. Aucune étape cachée ne doit être insérée pour contourner cette règle. Le titre saisi par l’utilisateur reste intact.

**Écran fixe :** une pose à un point n’est pas un déplacement terminé en T. Sa création ne doit pas déplacer automatiquement le poseur. L’association éventuelle à un joueur doit être cohérente avec sa position, son rendu statique et son comportement pendant les étapes suivantes.

### Bibliothèque

Ouvrir sur **Mes plays**, avec **Exemples** à côté et **Tous** comme choix explicite. Ne pas basculer automatiquement sur les exemples quand Mes plays est vide : proposer Créer un play et Voir les exemples.

Définition fonctionnelle : les créations personnelles, copies d’exemples et imports volontaires doivent figurer dans Mes plays. Les exemples fournis restent consultables séparément. Pour utiliser un exemple, proposer **Copier dans mes plays**. La copie conserve toutes les étapes et lectures et recâble les identifiants existants.

Il faut une appartenance explicite, indépendante de la catégorie, du nom, du statut edited et de la provenance de migration. À la première classification, préserver les créations/imports/copies identifiables ; conserver les exemples déjà modifiés du côté personnel ou dans une zone À classer visible. Ne pas masquer silencieusement du travail ambigu. La compatibilité des anciens fichiers et sauvegardes doit faire partie de cette évolution.

Recherche et compteurs portent sur la vue active. **Sélectionner les résultats** suit la vue et les filtres. **Toute la bibliothèque** garde sa portée globale clairement indiquée. Aucun play n’est supprimé lors de cette séparation ; les exports complets et la suppression avec récupération restent disponibles.

## Ordre d’application

1. Tests de non-régression des capacités existantes, puis restauration des outils proposés.
2. Conversion atomique de Placement, commande d’écran fixe et validation des états.
3. Interface commune de choix des tracés sur toutes les étapes, guides FR/EN et aides mises à jour.
4. Appartenance explicite et reprise prudente des données existantes ; vues Mes plays/Exemples/Tous.
5. Vérification complète puis publication d’un ensemble cohérent.

## Critères de recette

- Chaque outil testé sur la première étape, une étape intermédiaire et une lecture alternative, sur ordinateur et tactile.
- Droite réellement droite ; courbe restant courbe ; angles manuels préservés ; écran fixe sans déplacement implicite ; déplacement d’écran avec barre finale ; passe optionnelle/validée respectant la possession.
- Changement d’étape pendant un tracé : aucun point résiduel ni action fantôme ; limites demi/complet et zoom sans déformation tactique.
- Placement : validation du modèle, départ conservé, propagation aux étapes/lectures, annulation du geste et Undo, rechargement fidèle.
- Rendu statique, animation, PNG, PDF et ZIP cohérents pour tous les outils ; aucun tracé perdu à l’import/export ou hors ligne.
- Bibliothèque : exemples initiaux séparés, créations et imports visibles, exemples modifiés conservés, copie sans collision, comptes/recherche/sélections cohérents, suppression/annulation, persistance et sauvegarde/restauration.
- Même terminologie en français/anglais, accès clavier et absence de chevauchement à 320/390/768/1440 px.

## Résultat de cet audit

Aucun correctif fonctionnel n’est déclaré livré ici. Le moteur conserve une grande partie des outils, mais leur accès a été trop réduit. La correction demande de restaurer les choix visibles et de traiter explicitement Placement et l’appartenance des plays ; une simple réapparition de quelques boutons ne couvre pas tous les besoins.

## Application

La mise en œuvre et les critères de vérification sont décrits dans `DRAWING_LIBRARY_IMPLEMENTATION.md`. Les constats ci-dessus décrivent la version avant correction.
