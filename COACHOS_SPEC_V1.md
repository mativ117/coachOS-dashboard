# CoachOS VNext — Spécification de référence V1.0

**Statut : prêt pour préparation du développement, sans build initié.** 25 décisions validées (Q1–Q25). Date de consolidation : 11 novembre 2026. Langue initiale de l'interface : français. Utilisateur prioritaire : coach de basket, sur iPhone et ordinateur.

## 0. Autorité des sources et règle de fidélité

- `sources/index_original.html` : source historique **intacte**, version OWLS à cinq systèmes. Ne jamais l'écraser.
- `sources/stack_user_v2.json` : transcription fidèle du JSON Stack fourni dans le chat : six étapes, 24 tracés, cinq positions par étape et notes. Conserver les données source intactes.
- Ce document est la spécification de la **future** application et non la description de fonctions déjà implémentées.
- En cas de contradiction entre une inférence du développeur et les sources, **préserver la source**, créer une indication « à confirmer » et demander une validation tactique ultérieure. Ne jamais inventer les déplacements manquants.

## 1. Vision et scope

Une application légère de conception et présentation de systèmes basket, à usage personnel d'abord. Trois espaces majeurs : **Bibliothèque / Éditeur / Présentation**. Profil facultatif. Fonctionne sans connexion à un service ni compte, avec sauvegardes locales exportables. Thème light minimal : blanc cassé, bleu marine, gris doux et terrain clair. PWA GitHub Pages installable d'abord ; architecture compatible avec un packaging Capacitor iOS/Android ultérieur.

### Hors périmètre initial

Authentification, comptes multi-utilisateurs, synchronisation automatique cloud, partage par URL publique, collaboration simultanée, statistiques d'équipe, coaching vidéo, stores mobiles en V1. Ne pas confondre « adapter le code à Capacitor » et « livrer une application App Store ».

## 2. Journal des décisions 25/25

| ID | Décision validée |
|---|---|
| Q1 | Bibliothèque personnelle organisée en collections |
| Q2 | Sauvegarde locale + import/export de fichiers éditables |
| Q3 | Profil de coach facultatif : nom, équipe, logo |
| Q4 | PNG d'une étape, PDF d'un play, PDF d'une sélection de plays |
| Q5 | Tronc commun de play + lectures alternatives en branches |
| Q6 | Éditeur adaptatif : appui mobile ; glisser-déposer disponible PC |
| Q7 | Animation fluide : lecture manuelle/auto, pause, vitesse réglable |
| Q8 | Mode présentation dédié, terrain grand et outils d'édition masqués |
| Q9 | Partage par fichiers PDF/PNG/CoachOS ; partage natif si pris en charge |
| Q10 | Un play appartient à plusieurs collections sans duplication des données |
| Q11 | En conflit d'import même ID : Remplacer / Conserver les deux / Annuler |
| Q12 | Export/restauration intégrale bibliothèque, rappels discrets, confirmation destructive |
| Q13 | Une étape commune modifiée se propage aux branches dépendantes, avertissement si nécessaire |
| Q14 | Réimport reconnaît identité et versions et permet décision sans écrasement silencieux |
| Q15 | Bibliothèque / Éditeur / Présentation ; bibliothèque en page d'accueil |
| Q16 | Thème clair minimal : off-white, navy, gris et terrain clair |
| Q17 | Grand terrain central, outils compacts contextuels, timeline en bas, notes repliables |
| Q18 | Paramètres simples : profil, équipe, préférences d'export ; pas d'onboarding imposé |
| Q19 | React + TypeScript + Vite |
| Q20 | IndexedDB avec sauvegarde automatique |
| Q21 | Fichier `.coachos` versionné à structure JSON, import rétrocompatible |
| Q22 | PWA GitHub Pages V1, Capacitor pour iOS/Android dans une phase suivante |
| Q23 | Demi-terrain et terrain entier au choix par play |
| Q24 | Animation générée selon mouvements/étapes, ordre et durée ajustables |
| Q25 | Ballon libre ou attaché à un porteur, transfert sur passe validée |

**Exigences transversales supplémentaires :** lignes légèrement plus épaisses (cible environ 3,5 unités SVG sur vue de référence, ajustables), écrans dessinés sous forme de déplacement **et** barre terminale en T, trajectoires courbes ajustables, sécurité proportionnée basée sur bonnes pratiques OWASP.

## 3. Inventaire et migration des huit systèmes

| Play | Source | État requis en V1 |
|---|---|---|
| Princeton | `index_original.html` | Migré intégralement, 11 étapes |
| Pin Down Iso | `index_original.html` | Migré avec 2 étapes communes + quatre lectures (normal, mismatch, inside, outside) |
| Pin Down Cut | `index_original.html` | Migré intégralement, 8 étapes |
| Stagger Elevator | `index_original.html` | Migré intégralement, 13 étapes |
| SLOB Stagger Elevator | `index_original.html` | Migré intégralement, 10 étapes |
| Stack — Multi-lectures | `stack_user_v2.json` | Six étapes + 24 tracés, sans inventer les branches, le porteur ou les timings non fournis |
| Baseline | décision utilisateur | Brouillon nommé, dérivé du concept Play 4 ; aucune trajectoire non validée |
| Losange | décision utilisateur | Brouillon d'attaque de zone ; aucune trajectoire non validée |

### Conversion historique

La source HTML garde les coordonnées en vue SVG `750 × 655`. Son modèle : `start` par joueur, `steps` ou `base` et `variants`, `delta` positionnel, actions `m` (déplacement), `c` (cut), `p` (passe), `s` (écran), plus marqueurs de possession `ball`.

1. Parser **les structures de données** de la source sans exécuter aveuglément le HTML importé ; migrateur interne contrôlé pour le fichier historique connu.
2. Résoudre à chaque étape les positions cumulées (`start` + `delta` successifs) et garder positions de début et de fin.
3. Préserver **tous** les points de contrôle `via`, le type d'action, titres, descriptions, notes, ordre, étiquette des variantes et choix du ballon.
4. Représenter les trajets anciens selon les mêmes courbes que l'original ou préserver les points nécessaires pour un rendu équivalent ; comparaison visuelle avant validation.
5. Pour les écrans `S(id)`, préserver l'écran associé à un joueur même si la trajectoire du poseur est absente. Ne pas créer un trajet fictif. L'éditeur pourra ajouter celui-ci ultérieurement.
6. Les actions `P(a,b)` sont **options tactiques** dans certaines étapes : ne pas considérer toute passe dessinée comme exécutée. Transférer la possession uniquement lors d'une passe validée pour l'animation.
7. Pour Stack V2, les tracés sont **libres** et ne précisent pas toujours l'acteur ; préserver points et types. Les rendre visibles ; demander explicitement une association joueur/action avant certaines animations.
8. Émettre pour chaque play un rapport de migration : nombre d'étapes, branches, actions importées, éléments ambigus/non animables, aucune suppression silencieuse.
9. Garder le fichier source d'origine disponible pour vérification et rollback, jamais le modifier.

## 4. UX : parcours minimaux

### Bibliothèque

Accueil avec recherche, filtre collection, cartes de plays (miniature terrain, titre, type, nombre d'étapes, statut brouillon), bouton Nouveau, Importer, Sauvegarder la bibliothèque ; collections référencent les IDs des plays. Ouvrir en éditer ou présenter. Une copie garde nouvel ID. Ajout/suppression de collection sans effacer ses plays par défaut.

### Éditeur

Grand terrain centré, joueurs numérotés 1–5, défenseurs facultatifs, ballon distinct ; demi-terrain ou terrain complet par play. Toolbar compacte Course / Courbe / Passe / Écran / Écran courbe / Sélection / Effacer / Annotation, couleur cohérente, épaisseur légèrement renforcée. Écran = **trajectoire + barre terminale T** ; s'il est déjà placé sans trajet dans un ancien play, préserver ce cas. Ajustement ultérieur de toute courbe par points de contrôle. Timeline et branches sous terrain, notes repliables. Undo/redo ; autosave indiqué.

Mobile : sélection d'un pion puis appui à l'arrivée ; tracé par 2 ou 3 appuis, sans interaction qui fait défiler la page. Desktop : glisser-déposer et appui possibles. Ne pas exiger des gestes de précision irréalistes sur petit écran.

### Animation

Les étapes constituent une timeline ; interpolation fluide et reproductible des positions ; réglage de vitesse et ordre/durée facultatifs. Pauses et reprises sans saut de positions. Les branches reprennent leur tronc commun. Si acteurs ou possession ambigus, marquer une animation comme à vérifier et préserver la représentation statique correcte.

### Présentation

Terrain très lisible, étape et instruction visible, variantes choisissables, commandes discrètes, aucun contrôle d'édition, orientation mobile adaptée. Fonctionne hors ligne après installation PWA et mise en cache requise.

### Export et import

- PNG haute résolution d'une étape choisie ; rendu cohérent avec l'éditeur, police et traits visibles.
- PDF : play entier (y compris indication des branches), ou sélection de plusieurs plays ; titres, étapes, notes utiles, pagination et orientation automatiques lisibles.
- `.coachos` : **données éditables**, pas image/pdf ; roundtrip export/import conservant toutes les données sémantiques.
- Sauvegarde complète : un format versionné distinct du fichier play, contenant plays, collections, profil/préférences et liens de références ; restauration avec aperçu des changements, import atomique, gestion des conflits.
- Partage via les fichiers et la feuille de partage native lorsque possible ; aucun partage public obligatoire.

## 5. Schéma de données logique (contrat, pas code d'implémentation)

- `Play {id, schemaVersion, revision, createdAt, updatedAt, name, status, court, initialState, commonSteps[], branches[], metadata}`
- `Court {kind: half|full, orientation, coordinateSpace}` ; positions normalisées ou repérées dans un espace documenté, sans perte de précision à l'import.
- `Step {id, title, note, beforeState, afterState, actions[], timing?, flags[]}`
- `Action {id, kind: run|cut|pass|screen|annotation|other, actorId?, recipientId?, geometry, order?, duration?, status}` ; geometry avec segments, lignes, courbes, points de contrôle, repères de T pour écran.
- `BallState {mode: free|attached, position?, carrierId?}` ; une passe optionnelle n'implique pas un changement automatique de possession tant qu'elle n'est pas validée.
- `Branch {id, name, forkStepId, steps[]}` ; références au tronc commun, pas duplication.
- `Collection {id, name, playIds[]}` ; un play dans plusieurs collections.
- `Profile {coachName?, team?, logo?, exportPreferences?}` ; facultatif.
- `Backup {backupSchemaVersion, createdAt, plays[], collections[], profile?, preferences?}`.

Privilégier les IDs stables, la validation des références et des migrations explicites `schemaVersion`. Un import « conserver les deux » régénère les IDs nécessaires et recâble les références internes.

## 6. Architecture envisagée

React, TypeScript strict, Vite, modules `library`, `editor`, `animation`, `presentation`, `import-export`, `storage`, `migration`, `design-system`. Affichage terrain et annotations via SVG (interopérable en export) ; logique métier indépendante du DOM. Stockage IndexedDB avec transactions et gestion d'échec. Services de conversion PDF/PNG exécutés dans le navigateur si possible ; aucune ressource réseau obligatoire à l'exécution hors ligne. Manifest PWA + service worker et cache versionné. Déploiement statique GitHub Pages avec `base` correct pour chemin du dépôt ; possibilité future de wrapper Capacitor, sans dépendre d'API web indisponibles en WebView.

Ne pas introduire de serveur, comptes ou synchronisation sans nouvelle décision. Ne pas faire de la page GitHub une base de données : modification du navigateur = IndexedDB, pas commit automatique.

## 7. Exigences de sécurité, intégrité et accessibilité

- Pas d'exécution de script/HTML contenu dans les fichiers importés ; validation de schéma stricte et versionnée, nombres bornés et finis, profondeur et taille maximales, aucune URL arbitraire exécutée.
- Traitement sécurisé des logos ; formats, dimensions et taille limités, aucun SVG actif non nettoyé.
- Politique CSP pertinente pour production statique ; éviter `eval` et injections HTML ; encodage de texte, dépendances épinglées et mises à jour surveillées, aucun jeton dans le bundle.
- Transactions de sauvegarde et restauration ; conserver un point de restauration/export avant action destructrice ; jamais d'écrasement silencieux.
- Gestion quota IndexedDB, mode privé/non persistant, erreurs de stockage, changements de version PWA et sauvegarde complète externe.
- Contraste accessible, tailles de cible adaptées au tactile, intitulés de commandes, clavier sur PC, préférence `reduced-motion` et fallback statique.
- Respect des données personnelles : profil facultatif et local, export volontaire ; aucune télémétrie ni tracking par défaut.

## 8. Critères d'acceptation vérifiables

- **AC01** Ajouter cinq joueurs, enregistrer et rouvrir : positions identiques.
- **AC02** iPhone : sélection + appui pour déplacer, sans scroll involontaire ; PC : drag/drop.
- **AC03** Dessiner, modifier et recharger une courbe avec points de contrôle conservés.
- **AC04** Un écran neuf possède trajet et barre T ; rendu identique en PNG/PDF.
- **AC05** Ballon libre/attaché ; attached suit le porteur.
- **AC06** Passe validée : possession et animation de ballon cohérentes ; passe optionnelle ne force pas le transfert.
- **AC07** Modifier une étape du tronc commun : chaque branche dépendante reflète la modification.
- **AC08** Branche nouvelle : bon point de départ et étapes autonomes.
- **AC09** Play, pause, reprendre, ajuster vitesse et étape sans saut.
- **AC10** Présentation : terrain étendu, notes visibles, aucun outil d'édition.
- **AC11** PNG/PDF avec tracés, textes, positions complets sans coupure.
- **AC12** Export/import `.coachos` aller-retour : même structure tactique (identité/version gérées explicitement).
- **AC13** Conflit d'ID : Remplacer / Conserver les deux / Annuler, bibliothèque préservée si annulation.
- **AC14** Backup/restauration globale : plays, collections, profil et préférences conservés ; preview obligatoire.
- **AC15** Fermer/revenir : données sauvegardées présentes ; échec explicite si stockage indisponible.
- **AC16** PWA installée et chargée préalablement : lecture, édition, sauvegarde et présentation hors ligne.
- **AC17** Import malformé/hostile/trop grand : refus explicite, aucune mutation.
- **AC18** Stack : six étapes et 24 tracés + notes + positions inchangés après migration.
- **AC19** Export PDF multi-plays : branches identifiables, pages lisibles.
- **AC20** Demi et plein terrain : géométrie cohérente, sauvegarde et réouverture.
- **AC21** Migration historique : cinq plays et Pin Down Iso avec ses quatre lectures ; conserver les étapes et leurs points de passage.
- **AC22** Undo/redo et sauvegarde automatique : pas de modification fantôme ou de perte d'étape.
- **AC23** Sauvegarde locale échouée : message visible et export de secours possible.
- **AC24** Tests sur mobile réel : aucune interaction critique reposant uniquement sur un glisser-déposer.
- **AC25** Déploiement GitHub Pages : chargement sous chemin de dépôt, PWA, routes et ressources valides.

**Gate de sortie V1 :** tous les AC bloquants réussis ; aucune perte silencieuse de données ; migration visuellement comparée à la source ; aucun risque élevé de sécurité ouvert sans décision explicite.

## 9. Plan Codex, séquencé avec portes de validation

**Phase 0 — Préparation / inspection des sources (documentation seulement, à valider).** Recenser données exactes des cinq plays HTML et Stack, établir snapshots et tests de référence, spécifier les ambiguïtés ; aucune correction tactique implicite.

**Phase 1 — Socle.** Vite/React/TypeScript, routing 3 espaces, design system clair responsive, terrain demi/entier en SVG, tests automatisés ; démontrer la navigation.

**Phase 2 — Modèle et migration.** Types + validateurs + stockage IndexedDB, migrateurs source historique et Stack, rapport de migration, tests de non-régression sur données d'origine ; vérifier les six systèmes renseignés.

**Phase 3 — Éditeur.** Pions, ballon, passes, écran T, courbes modifiables, timeline, branches, notes, undo/redo, sauvegarde ; tester les gestes iPhone et PC.

**Phase 4 — Animation et présentation.** Play/pause/vitesse, parcours des branches, possession cohérente, fullscreen ; réduire les mouvements si OS le demande.

**Phase 5 — Fichiers et PDF/PNG.** Import/export `.coachos`, backup/restauration, duplications, versioning, exports PDF/PNG, partage natif facultatif, tests corruption et conflits.

**Phase 6 — PWA et qualité.** Hors ligne, manifest, service worker, tests E2E, accessibilité, sécurité, GitHub Pages, régression de migration. Préparer une documentation Capacitor sans livrer d'app native en V1.

**Chaque phase :** démo fonctionnelle, critères d'acceptation associés, tests, validation avant phase suivante. Ne pas optimiser prématurément ni ajouter de modules absents du périmètre.

## 10. Prérequis restant et lancement

- **Pas de blocage documentaire majeur** : les sources historiques et le Stack sont dans ce paquet.
- Les ambiguïtés des mouvements ne bloquent pas la construction d'un éditeur ; elles bloquent uniquement la validation tacitement « correcte » d'animations non renseignées.
- **Décision nécessaire avant action :** autorisation explicite de démarrer le build Codex et accès au dépôt GitHub cible, ou choix d'un nouveau dépôt. Ne jamais publier ni écrire dans un dépôt externe sans autorisation.
- Baseline et Losange restent brouillons nommés jusqu'à définition avec le coach.
