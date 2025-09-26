# Guide du projet et démonstrations d'injection SQL

## Objectif du dépôt
Ce dépôt propose une application Express minimaliste écrite en TypeScript pour illustrer les failles d'injection SQL. Le serveur expose trois routes REST :
- `POST /messages` pour insérer un message dans SQLite.
- `GET /messages` pour récupérer tous les messages.
- `GET /messages/:id` pour lire un message spécifique.

Les gestionnaires renvoient directement les objets/metadonnées récupérés par la base (`application/json`). La configuration TypeScript/ESM (`tsx`, `typescript`, `better-sqlite3`) est déjà prête pour être exécutée via `npm run dev`, `npm start`, ou compilée avec `npm run build`.

## Pourquoi les injections fonctionnent-elles ?
Le fichier `src/lib/database.ts` contient volontairement des requêtes construites par concaténation de chaînes :
- `insertMessage(body)` exécute `INSERT INTO messages (body) VALUES ('${body}')` sans paramètres.
- `findMessageById(id)` exécute `SELECT ... WHERE id = ${id}`.

Ces requêtes acceptent directement l'entrée utilisateur, ce qui permet au public d'expérimenter des charges utiles (`payloads`) classiques.

## Scénarios couverts dans les tests
Le fichier `src/test/app.test.ts` regroupe les démonstrations principales :
1. **Suppression de données** : `POST /messages` avec `'); DELETE FROM messages; --` vide la table.
2. **Bypass de filtrage** : `GET /messages/0 OR 1=1` retourne le premier enregistrement, même si l'ID demandé n'existe pas.
3. **Fuite de schéma** : une requête `GET /messages/0 UNION SELECT 1, name, ...` révèle le schéma `CREATE TABLE ...` de tables internes (`sqlite_master`).

Chaque scénario construit une requête malveillante, appelle directement les gestionnaires Express (sans serveur HTTP), et vérifie le comportement obtenu via des objets réponse simulés.

## Recommandations pédagogiques
- Utilisez `SQLITE_DB_PATH=':memory:'` pour isoler les sessions d'exécution.
- Montrez d'abord la route légitime, puis réexécutez la même route avec la charge utile injectée.
- Concluez en montrant comment des requêtes préparées évitent ces vulnérabilités, même si le dépôt n'applique pas ce correctif pour préserver l'exemple.
