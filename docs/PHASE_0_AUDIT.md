# Phase 0 — Inspection des sources

Statut : inspection documentaire terminée ; validation demandée avant la phase 1. Aucun build ni déploiement effectué.

## Inventaire vérifié

| Système | Étapes communes ou linéaires | Lectures après le tronc commun | Actions communes ou linéaires |
|---|---:|---|---:|
| Princeton | 11 | — | 19 |
| Pin Down Iso | 2 | normal (Jeu classique) : 4 étapes, 6 actions; mismatch (Mismatch 5) : 3 étapes, 4 actions; inside (Drive intérieur) : 4 étapes, 5 actions; outside (Drive extérieur) : 4 étapes, 5 actions | 3 |
| Pin Down Cut | 8 | — | 13 |
| Stagger Elevator | 13 | — | 24 |
| SLOB Stagger Elevator | 10 | — | 19 |
| Stack — Multi-lectures | 6 | Aucune branche déclarée | 24 tracés libres |
| Baseline | 0 | Brouillon à définir, dérivé du concept Play 4 | 0 |
| Losange | 0 | Brouillon d’attaque de zone à définir | 0 |

Les actions comptent les déplacements, cuts, passes et marqueurs d’écran ; un marqueur ne constitue pas une trajectoire supplémentaire. Chaque lecture de Pin Down Iso reprend les deux étapes communes.

## Référence de non-régression

`source-snapshot.json` conserve les données des cinq systèmes HTML et le JSON Stack. Les clés `sourceHashes` identifient les originaux par SHA-256. L’extraction a utilisé un parseur limité aux littéraux et aux constructeurs F/M/C/P/S, sans exécuter le HTML ni son JavaScript.

Contrôles effectués : cinq systèmes historiques ; 11/2/8/13/10 étapes communes ou linéaires ; quatre lectures de Pin Down Iso ; six étapes Stack ; cinq positions par étape Stack ; 24 tracés Stack. Les titres, descriptions, delta, points via, actions, porteurs et labels de lecture figurent dans le snapshot.

Ces contrôles vérifient l’inventaire, pas encore l’équivalence visuelle d’un rendu migré. Celle-ci devra être testée en phase 2.

## Ambiguïtés et contraintes de migration

- Les passes P(a,b) dessinées ne sont pas toutes exécutées. Les marqueurs `ball` explicites restent la référence de possession ; aucune passe optionnelle ne doit transférer automatiquement le ballon.
- Les écrans S(id) sont des marqueurs associés à un joueur. Sans action de déplacement fournie, conserver un écran placé sans lui inventer de trajet.
- Les points `via` des actions M/C doivent rester dans leur ordre, avec le calcul de courbe historique. Les positions sont cumulées depuis `start`, puis `delta` ; les branches partent du tronc commun.
- Stack ne donne ni dimensions de son espace de coordonnées, ni acteur pour les tracés, ni porteur, ni timing, ni branches. Conserver les coordonnées brutes et notes ; ne pas supposer un acteur ou un facteur d’échelle définitif.
- Les notes Stack décrivent parfois plusieurs options ; elles ne suffisent pas à créer des branches validées. Tout rapprochement entre note, numéro de joueur et tracé doit être confirmé dans l’éditeur.
- Baseline et Losange restent des brouillons nommés. Aucune trajectoire n’est fournie.
- Les durées de l’ancien lecteur (animation et intervalle) décrivent son interface, pas des timings tactiques validés.

## Prochaine phase proposée

Phase 1 : socle React/TypeScript/Vite, navigation Bibliothèque / Éditeur / Présentation, design clair adaptatif, terrain SVG demi et plein terrain et vérification de la navigation. Les fonctions non encore livrées doivent être identifiées comme telles. La migration complète et le stockage relèvent de la phase 2.
