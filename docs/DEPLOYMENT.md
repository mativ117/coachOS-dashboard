# Publication GitHub Pages

## État et destination

Le dépôt est public. L’application publiée rend accessibles le code et les systèmes initiaux déjà présents dans le dépôt ; les modifications, profils et logos restent dans IndexedDB sur l’appareil. Aucun serveur de données, compte, télémétrie ou synchronisation n’est ajouté.

URL prévue : https://mativ117.github.io/coachOS-dashboard/

Le workflow `.github/workflows/pages.yml` est **manuel uniquement** (`workflow_dispatch`) et limité à `main`. Une fusion seule ne publie rien. Il vérifie format, build, tests et audit, puis envoie uniquement `dist/` à GitHub Pages. Les sources historiques et fichiers de développement ne font pas partie de cet artefact.

## Publication après validation explicite

1. Fusionner la PR validée et vérifier la CI de `main`.
2. Settings → Pages → Source : GitHub Actions. Ne pas ajouter de domaine personnalisé.
3. Actions → Publier CoachOS sur GitHub Pages → Run workflow → `main`.
4. Vérifier l’URL HTTPS : huit systèmes, quatre lectures de Pin Down Iso, routes Éditeur/Présentation après rechargement, manifest et icônes sans 404.
5. Attendre « Disponible hors ligne », couper le réseau, fermer/rouvrir et vérifier lecture, édition, autosave et PDF/PNG.
6. Effectuer les essais Safari/iPhone réel du document PHASE_6_REVIEW.md avant de déclarer AC24 et la sortie V1 validés.

## Mise à jour et retour arrière

Le cache inclut HTML, JavaScript principal, modules d’export différés, CSS, manifest et icônes. Son nom dépend du contenu de tous les fichiers et du chemin de l’application. Une installation incomplète est refusée ; le cache actif reste intact. Seules les ressources statiques listées du même périmètre sont servies depuis ce cache. IndexedDB n’est jamais ajouté au cache.

Une nouvelle version attend la fermeture de tous les onglets CoachOS ; aucun `skipWaiting`, rechargement automatique ou reset de bibliothèque. Le panneau hors ligne annonce la mise à jour en attente. Fermer après « Enregistré sur cet appareil », puis rouvrir. Les anciens caches du même périmètre sont retirés à l’activation ; les caches d’autres applications ne sont pas supprimés.

En cas de régression : suspendre la publication, préparer un revert des seuls changements de code sur une nouvelle PR, vérifier la compatibilité des schémas et relancer le workflow sur le `main` corrigé. Les versions déjà installées appliqueront ce retour lors d’une nouvelle ouverture connectée et après fermeture des onglets. Ne pas effacer les données du site pour réparer une version : cela efface la bibliothèque. Faire une sauvegarde externe avant toute manipulation de stockage.

## Limites des tests

Les tests automatisés utilisent un serveur statique et le chemin de dépôt réel. Ils ne prouvent pas la configuration GitHub Pages d’un déploiement non lancé, ni l’installation iOS réelle. La CSP est dans une balise meta : elle bloque scripts/connexions externes et objets, mais GitHub Pages ne permet pas de configurer ici des en-têtes comme `frame-ancestors` ou HSTS. Aucun secret ne doit entrer dans les variables `VITE_*`, qui sont publiques dans le bundle.
