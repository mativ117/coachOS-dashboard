# Export d’un play complet, priorité aux visuels

Le PDF contenait déjà le tronc commun et toutes les lectures. Le premier choix PNG de la fenêtre exportait seulement l’étape affichée : il ne correspondait pas à l’attente d’exporter tout le play.

Les deux choix principaux exportent maintenant le play complet :

- **PDF du système** : une page par étape, avec le terrain au premier plan. Les consignes sont limitées à 220 caractères puis deux lignes maximum ; aucune page de texte supplémentaire, ni ajout automatique des longs conseils et avertissements source. Les données originales restent intactes. La préférence existante permet de désactiver les consignes.
- **Tous les visuels PNG (.zip)** : un PNG par étape commune et par étape de chaque lecture. Les fichiers sont numérotés dans l’ordre, avec le nom de l’étape ; l’en-tête du PNG précise la lecture. Le tronc commun apparaît une fois. Un brouillon vide reçoit un fichier explicatif, sans inventer de dessin.

La fenêtre affiche les nombres d’étapes communes, de lectures et d’étapes totales. L’image de l’étape courante est conservée dans une option secondaire **Seulement l’étape affichée**.

Dans la bibliothèque, PDF et ZIP peuvent porter sur tous les plays sélectionnés. **Toute la bibliothèque** choisit explicitement tous les plays ; **Sélectionner les résultats** respecte les filtres. L’image isolée est également secondaire.

Le ZIP est généré localement avec fflate, sans service distant. Les nouveaux modules font partie du précache hors ligne. Progression et annulation sont conservées ; un seul téléchargement évite les téléchargements multiples bloqués par certains navigateurs.

La recette couvre un play à quatre lectures : nombre et noms de tous les PNG, signatures PNG réelles, ZIP préparé hors ligne, PDF avec exactement une page illustrée par étape, absence de mutation des données. Un export de toute la bibliothèque vérifie le total de pages de tous les plays, brouillons compris. Le cas des notes très longues vérifie qu’elles ne créent plus de pages supplémentaires.
