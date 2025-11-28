# Historique du projet Codex
1. utilisation de /init pour créer AGENTS.md et lier AGENTS.md au README.md
2. scaffolding du point d'entrée du serveur Express, gestionnaires et tests
3. relocalisation des fichiers d'entrée Express dans src/lib
4. intégration de la persistance Better-SQLite3 avec les routes de messages
5. modification de la logique d'insertion SQLite pour démontrer la vulnérabilité d'injection SQL
6. ajout de la route de recherche `/messages/:id` utilisant la concaténation SQL vulnérable
7. ajout d'un test illustrant la fuite de schéma via un payload id injecté
8. suppression des routes legacy hello/health pour se concentrer sur les scénarios d'injection SQL
9. suppression du scaffold HelloWorld inutilisé
10. réorganisation des tests pour la lisibilité en utilisant des sous-tests groupés
11. mise à jour du gestionnaire POST /messages pour retourner le payload de message brut
12. mise à jour du gestionnaire GET /messages pour retourner le tableau directement
13. mise à jour du gestionnaire GET /messages/:id pour retourner le message brut
14. refactorisation de l'accès à la base de données pour passer par executeParameterizedQuery
