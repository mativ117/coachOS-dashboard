# Retrouver et reprendre un play

Besoin retenu : retrouver rapidement les plays personnels et reprendre le travail, sans ajouter une nouvelle couche de classement.

- Une carte déjà consultée propose **Reprendre**, précise l’étape et la lecture et montre l’aperçu de cette étape. Les autres cartes conservent **Ouvrir**. L’accès Éditeur de la navigation utilise également la reprise valide.
- Le tri **Récents d’abord** combine dernière consultation et dernière modification. Le tri **Nom A → Z** est conservé comme autre choix. Les exemples restent séparés des plays personnels.
- Recherche, catégorie, collection et tri sont conservés pendant la session lors des allers-retours avec l’éditeur. Changer de vue efface les anciens filtres et sélections pour éviter une sélection cachée. Un reset reste visible : au-dessus des résultats ou dans l’état vide.
- La reprise est une préférence locale indépendante d’IndexedDB, du modèle tactique et des fichiers exportés. L’historique est borné à 100 plays distincts. Effacer cette préférence ne supprime aucun play. Elle mémorise l’étape et la lecture, pas l’historique Annuler ni un geste inachevé.
- Chaque reprise est vérifiée contre les étapes et lectures actuelles du play. Une étape supprimée, une lecture disparue ou un identifiant étranger produit un lien d’ouverture normal, sans URL invalide.
- Les filtres restent propres à la session de l’onglet ; les blocages du stockage des préférences ne bloquent pas l’édition.

Tests : reprise au bon endroit, recherche conservée après navigation/rechargement, lecture alternative, invalidation des curseurs périmés, données inchangées, tri mémorisé, clavier/axe et absence de débordement à 320–1440 px. La suite de régression couvre également les exports complets, suppression, migration et mode hors ligne.
