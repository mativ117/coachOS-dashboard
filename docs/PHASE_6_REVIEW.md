# Phase 6 — PWA et qualité

## Livré pour validation

La PR #6 a été fusionnée après validation explicite. Le dépôt reste public. Cette phase prépare l’application pour GitHub Pages, sans déclencher sa publication.

- Manifest français avec chemin de dépôt, mode autonome, couleurs OWLS, icônes 192/512 et icône Apple 180. Instructions d’installation discrètes, sans onboarding obligatoire.
- Service worker généré au build, cache versionné par contenu de tous les fichiers et limité au périmètre de l’application. HTML, scripts, CSS, icônes et modules PDF/PNG différés sont précachés ; aucune police externe nécessaire.
- Installation atomique du cache : un fichier manquant refuse la nouvelle version sans toucher au cache actif. Une mise à jour attend la fermeture des onglets ; aucun rechargement imposé pendant l’édition. Les anciens caches du même périmètre sont supprimés à l’activation, sans effacer IndexedDB ni les caches des autres applications.
- Indicateur de disponibilité hors ligne et de réseau, message de mise à jour, demande facultative de persistance du stockage et rappel de sauvegarde externe. Un refus de persistance n’empêche pas l’usage.
- CSP de production : scripts et connexions limités à l’origine, objets actifs interdits, aucune exécution inline de script. Les styles inline nécessaires au SVG et les images locales data/blob restent autorisés pour les exports. Aucun compte, tracking ou secret ajouté.
- Contrôle axe automatisé des trois espaces. Intitulé accessible de l’accueil corrigé ; clavier, focus, réduction des mouvements et gestes tactiles existants conservés.
- Workflow Pages manuel, limité à `main`, avec format/build/tests/audit obligatoires et artefact `dist/` uniquement. Permissions Pages limitées au job de déploiement. Aucun déploiement à la fusion.
- Documentation publication/rollback et préparation Capacitor, sans installer de plateforme native ni livrer une app de store.

## Validation automatisée

90 tests : 30 modèle/stockage, 30 parcours ordinateur et 30 parcours mobile Chromium. Le build de production tourne sous `/coachOS-dashboard/`.

Les nouveaux parcours vérifient :

1. Cache prêt, rechargement sans réseau, modification d’une note, sauvegarde IndexedDB et relecture après rechargement.
2. Présentation et exports PNG, PDF et backup sans réseau, avant tout chargement en ligne du module PDF.
3. Refus CSP d’un script inline et d’une connexion externe ; navigation clavier.
4. Nouvelle version incomplète refusée, version active préservée ; mise à jour complète en attente sans perte de l’écran courant ; activation et nettoyage après fermeture des onglets.
5. Aucun défaut axe sérieux ou critique détecté sur Bibliothèque, Éditeur et Présentation dans les deux formats.

La suite conserve les comparaisons géométriques des 65 vues historiques par format, les invariants Stack, les branches Pin Down Iso, édition/animation, import/conflits, quotas et restauration atomique. Les deux sources et le snapshot de référence restent inchangés.

Manifest final reconnu par Chromium dans un profil standard : aucune erreur de manifest ou d’installabilité ; identité et scope propres à `/coachOS-dashboard/`. Cela ne remplace pas un essai d’installation sur iPhone.

TypeScript strict, format et build vérifiés. Audit npm de toutes les dépendances : zéro vulnérabilité signalée au moment du contrôle. Le contrôle axe est un outil de détection, pas une certification d’accessibilité.

## Critères et limites de sortie

| Critères | Preuves / statut |
|---|---|
| AC01–AC15, AC17–AC23 | Régression modèle/stockage et E2E des phases précédentes maintenue ; rendu comparé aux sources |
| AC16 | Parcours offline de bout en bout réussi sur Chromium ordinateur/mobile ; installation réelle iOS à confirmer |
| AC24 | **À vérifier sur iPhone réel** : la simulation Chromium ne remplace pas Safari/VoiceOver |
| AC25 | Chemin du dépôt, routes, assets et PWA vérifiés sur serveur statique ; URL GitHub Pages **à vérifier après publication autorisée** |

La sortie V1 complète ne doit pas être déclarée tant que les essais réels et la vérification de l’URL publiée restent ouverts. Le mode privé, l’éviction de stockage par le système et le partage natif varient selon le navigateur. Une PWA ne synchronise pas les appareils et ne remplace pas une sauvegarde externe.

## Démo et vérifications restantes

1. Ouvrir Bibliothèque et attendre « Disponible hors ligne » ; ouvrir son panneau pour l’installation et le stockage.
2. Passer hors connexion, recharger, éditer puis présenter Princeton, télécharger PNG/PDF/backup.
3. Rouvrir et vérifier les données. Mettre à jour une version : fermer tous les onglets après sauvegarde avant de rouvrir.
4. Après publication autorisée, vérifier l’URL HTTPS, les huit cartes, routes rechargées, manifest/icônes et absence de 404.
5. Sur iPhone réel Safari puis PWA installée : appuis sans scroll parasite, courbe/écran, clavier des notes, rotation, fermeture/réouverture offline, import depuis Fichiers, partage/export, VoiceOver et comportement du stockage. Tester aussi le lecteur et les menus avec clavier sur ordinateur.

Publication et retour arrière : [DEPLOYMENT.md](DEPLOYMENT.md). Préparation native ultérieure : [CAPACITOR.md](CAPACITOR.md).
