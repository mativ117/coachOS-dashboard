# Phase 5 — Fichiers, sauvegarde et exports

## Livré

La PR #5 (animation) a été fusionnée après validation explicite. Cette phase ajoute :

- Export/import éditable `.coachos` et sauvegarde complète `.coachos-backup`, enveloppes version 1. Les anciens JSON de secours restent importables. Les plays des schémas 1 à 3 restent lisibles ; le schéma de bibliothèque 2 ajoute profil et préférences d’export sans modifier les sources.
- Aperçu avant toute écriture : systèmes nouveaux, identiques ou en conflit, révisions et dates. Un conflit exige remplacer ou conserver les deux ; annuler reste le choix initial. Les copies régénèrent les identifiants internes et recâblent branches, étapes et actions.
- Fusion de sauvegarde ou restauration complète explicitement confirmée. La fusion préserve le profil/préférences locaux sauf choix contraire. Les écritures sont atomiques et contrôlées par révision ; un aperçu périmé ou un quota ne modifie pas la bibliothèque. Un précédent état est conservé dans la même transaction et peut être prévisualisé puis restauré. Il s’agit d’un point de récupération local, pas d’un historique illimité.
- Création, renommage et suppression de collections sans supprimer leurs systèmes ; affectation multiple et duplication de système.
- PNG haute résolution de l’étape choisie ; PDF de plusieurs systèmes, tronc commun puis toutes les lectures, notes et conseils paginés. Le rendu réutilise le composant SVG de présentation et conserve courbes et écrans en T. Les annotations hors du cadre initial sont incluses dans les limites de taille.
- Orientation automatique ou imposée, notes facultatives, profil coach/équipe et logo local. PNG/JPEG uniquement pour le logo, dimensions et taille bornées, normalisation PNG. Les SVG et URL arbitraires sont refusés.
- Partage natif uniquement sur action utilisateur lorsque disponible ; téléchargement de repli. Annuler le partage ne lance pas de téléchargement.
- Panneaux compacts repliables et actions désactivées pendant une écriture atomique.

## Validation

- 82 tests réussis : 30 contrôles modèle/stockage et 26 parcours dans chacun des deux formats Chromium.
- Aller-retour éditable, fichier identique sans écriture, remplacement, copie avec références recâblées, sauvegarde complète et récupération précédente.
- Corruption, version inconnue, références invalides, fichiers trop volumineux, quota, conflit de révision et absence de mutation en cas d’échec.
- Export PNG réellement décodé et vérifié ; PDF multi-systèmes relu avec pdf-lib, branches et longues notes sur plusieurs pages.
- Contrôles de chevauchement avec tous les panneaux ouverts de 320 à 1440 px ; non-régressions sur les 65 vues historiques par format, édition et animation.
- TypeScript strict, build et format vérifiés. Audit des dépendances de production : zéro vulnérabilité signalée.
- Inspection visuelle des pages du PDF Pin Down Iso (17 pages), dont une lecture alternative. Sources historiques et snapshot inchangés.

## Démo

1. Bibliothèque → Options d’un système → exporter `.coachos`, puis réimporter : identique.
2. Modifier le système local puis réimporter : comparer, annuler, remplacer ou conserver les deux.
3. Sauvegarder la bibliothèque ; modifier profil et collections ; importer la sauvegarde et choisir fusion ou restauration complète.
4. Ouvrir le point de récupération précédent et examiner son aperçu avant restauration.
5. Sélectionner plusieurs cartes pour le PDF, ou choisir un système/lecture/étape pour le PNG.
6. Ajouter équipe/logo dans les réglages, tester orientation et notes, puis partager ou télécharger.

## Limites et suite

Les données et le point de récupération restent propres au navigateur/appareil : conserver une sauvegarde externe. Le PDF est un document visuel avec diagrammes et notes rendus en images ; le format éditable est `.coachos`. Les exports volumineux sont bornés pour éviter un canevas excessif. Safari, iPhone réel et leur partage natif restent à vérifier ; les tests mobiles Chromium ne les remplacent pas.

Aucun déploiement effectué. Phase 6 : PWA, hors ligne, accessibilité/sécurité, GitHub Pages et documentation Capacitor, après validation conformément à la section 9 de COACHOS_SPEC_V1.md.
