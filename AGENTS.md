# Directives du dépôt

- `src/lib/index.ts` héberge le bootstrap HTTP : lit l'env `PORT`, crée le serveur, et reste libre de logique métier.
- `src/lib/app.ts` câble l'instance Express, le middleware partagé et les gestionnaires de routes (exporter les gestionnaires pour les tests unitaires directs). Routes actuelles : `/messages`, `/messages/:id`, et `POST /messages` pour la démonstration SQLi.
- `src/lib/database.ts` centralise la connexion Better-SQLite3 plus les migrations et les helpers de messages (incluant du SQL intentionnellement non sécurisé pour les démos).
- `src/index.ts` réexporte simplement les modules lib pour les consommateurs qui importent depuis la racine du package.
- La logique métier réside sous `src/lib/` et doit rester indépendante du framework (par ex., ajouter de nouveaux modules de fonctionnalités aux côtés des helpers de base de données).
- Les tests se trouvent dans `src/test/` à côté de la fonctionnalité qu'ils couvrent avec un suffixe `*.test.ts` ; privilégier les tests légers de gestionnaire/unitaires plutôt que d'ouvrir des sockets.
- La sortie TypeScript va dans `dist/` ; les assets générés et les fichiers de logs doivent être ignorés via `.gitignore`.

## Commandes de build, test et développement
- `npm start` → `node --import tsx src/index.ts`, lance le serveur Express contre les sources actuelles.
- `npm run dev` → `tsx watch src/index.ts` pour le rechargement automatique pendant le développement local.
- `npm run build` → transpile TypeScript après nettoyage de `dist/`.
- `npm test` → `node --import tsx --test src/test/app.test.ts` ; définir `SQLITE_DB_PATH=':memory:'` lorsque vous avez besoin d'exécutions isolées.
- `npm run lint` → ESLint sur les fichiers `.ts` avec le ruleset TypeScript partagé.

## Style de code et conventions de nommage
- Respecter les paramètres TypeScript stricts déjà appliqués par `tsconfig.json` et le preset ESLint.
- Indentation de deux espaces, guillemets simples sauf si l'interpolation rend les template strings plus claires, et extensions `.js` explicites dans les imports ESM.
- Nommer les gestionnaires de routes en camelCase (`healthRouteHandler`), les classes en PascalCase, et garder les noms de fichiers descriptifs (`userSession.service.ts`).
- Centraliser les helpers inter-routes dans `src/lib/` ; éviter les règles métier inline dans les gestionnaires Express.
- Privilégier les helpers de style repository (par ex., `database.ts`) pour la persistance afin de garder les gestionnaires légers.
- `insertMessage()` dans `src/lib/database.ts` utilise délibérément du SQL par chaîne brute pour démontrer les risques d'injection ; ne pas le "corriger" sauf si vous mettez à jour le matériel pédagogique.
- `findMessageById()` reproduit le même anti-pattern pour enseigner les exploits d'injection en lecture.
- `executeParameterizedQuery()` centralise l'exécution SQL paramétrée ; les scénarios vulnérables continuent d'y faire transiter des chaînes concaténées.

## Directives de tests
- Utiliser le `node:test` de Node avec `assert/strict`. Simuler l'objet Express `Response` comme fait dans `src/test/app.test.ts` pour garder les tests compatibles sandbox.
- Ajouter de nouvelles suites à côté de leurs cibles (par ex., `src/lib/user/UserService.ts` → `src/test/user/UserService.test.ts`) et les référencer depuis la commande `npm test` lorsque nécessaire.
- Cibler un comportement déterministe ; privilégier les tests de fonctions pures et les assertions au niveau des gestionnaires plutôt que les appels réseau.
- Utiliser le helper `clearMessages()` de `database.ts` lorsque les tests ont besoin d'un état SQLite propre, et exécuter lint/tests (`npm run lint && npm test`) avant d'ouvrir une pull request.

## Directives de commit et pull request
- Privilégier des sujets de commit courts et impératifs (par ex., `Introduire les routes de session utilisateur`) comme vu dans le log.
- Rebase ou squash le bruit avant de soumettre ; chaque PR doit décrire la portée, les risques, les étapes de validation et lier les issues de suivi.
- Inclure la sortie CLI ou des captures d'écran lorsque le comportement change (par ex., nouvelles routes ou réponses).
- Confirmer que le serveur démarre localement et référencer les commandes exécutées dans le template ou la description de la PR.
