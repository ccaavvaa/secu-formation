# Historique du projet Codex

1. ajouter fonctionnalité suppression tous messages et exemples XSS pédagogiques
2. ajouter consigne d'approbation utilisateur avant commits
3. externaliser le template HTML dans un fichier dédié
4. ajouter commandes personnalisées Claude Code
5. extraire la génération HTML vers un module templates dédié
6. mettre à jour la documentation (README.md et AGENTS.md)
7. ajouter démonstration de vulnérabilité Cross-Site Scripting (XSS)
8. ajouter Swagger UI pour la documentation interactive de l'API
9. migrer les tests vers supertest et améliorer l'architecture
10. introduire le pattern Repository pour la gestion des messages
11. documenter les mécanismes d'injection SQL dans les tests
12. traduire l'interface en français
13. ajouter guidance documentation pour Claude Code
14. documenter la vue d'ensemble du projet
15. paramétrer les requêtes de base de données
16. utilisation de /init pour créer AGENTS.md et lier AGENTS.md au README.md
17. scaffolding du point d'entrée du serveur Express, gestionnaires et tests
18. relocalisation des fichiers d'entrée Express dans src/lib
19. intégration de la persistance Better-SQLite3 avec les routes de messages
20. modification de la logique d'insertion SQLite pour démontrer la vulnérabilité d'injection SQL
21. ajout de la route de recherche `/messages/:id` utilisant la concaténation SQL vulnérable
22. ajout d'un test illustrant la fuite de schéma via un payload id injecté
23. suppression des routes legacy hello/health pour se concentrer sur les scénarios d'injection SQL
24. suppression du scaffold HelloWorld inutilisé
25. réorganisation des tests pour la lisibilité en utilisant des sous-tests groupés
26. mise à jour du gestionnaire POST /messages pour retourner le payload de message brut
27. mise à jour du gestionnaire GET /messages pour retourner le tableau directement
28. mise à jour du gestionnaire GET /messages/:id pour retourner le message brut
29. refactorisation de l'accès à la base de données pour passer par executeParameterizedQuery
