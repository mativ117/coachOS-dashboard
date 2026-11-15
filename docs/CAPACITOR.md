# Préparation Capacitor — hors V1 native

Le build Vite produit une application statique : logique métier TypeScript, rendu React/SVG, IndexedDB et exports côté appareil. Aucune dépendance à un compte ou à un serveur. Capacitor n’est pas installé et aucun projet iOS/Android n’est livré.

Pour une phase native ultérieure, créer une branche dédiée, installer des versions épinglées de Capacitor/core/cli et des plateformes voulues, puis définir `webDir: "dist"`. Adapter le `base` Vite à `./` pour le build natif, sans changer le chemin du build Pages. Désactiver le service worker dans la WebView native : les mises à jour passeront par le paquet natif. Ne jamais utiliser `server.url` distant en production.

Prévoir des adaptateurs pour l’écriture et le partage des fichiers (Filesystem/Share), l’import via sélecteur natif, le fullscreen/orientation et les zones sûres. Ne pas supposer que `navigator.share`, le téléchargement par lien ou le mode PWA iOS se comportent à l’identique dans la WebView. Garder le format `.coachos` et les fonctions métier identiques.

Vérifier la persistance IndexedDB par origine de WebView et après mise à jour du paquet. Le stockage du site Safari/PWA ne migre pas automatiquement : transférer volontairement une sauvegarde `.coachos-backup`, avec aperçu et validation. Préserver l’ancienne bibliothèque jusqu’à confirmation du transfert.

Avant distribution : tests réels iOS/Android, partage/import/export, offline après démarrage à froid, reprise après arrière-plan, rotation, VoiceOver/TalkBack, permissions minimales et déclarations de confidentialité. Identifiants de bundle, signature, comptes développeur et distribution restent à décider avec le propriétaire. Aucun envoi aux stores en V1.
