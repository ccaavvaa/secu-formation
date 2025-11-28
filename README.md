# secu-form

Projet de démonstration qui combine Express 5, TypeScript et SQLite pour illustrer les pièges courants liés aux injections SQL. L'API contient intentionnellement des requêtes construites par concaténation afin de permettre l'exploration, l'exploitation et le renforcement de ces vulnérabilités dans un environnement contrôlé.

## Démarrage rapide
- Installer les dépendances : `npm install`
- Lancer avec rechargement automatique : `npm run dev`
- Démarrer la version de production : `npm start`
- Exécuter lint + tests : `npm run lint && npm test`

Par défaut, le serveur HTTP écoute sur `http://localhost:3000`. Remplacer le port avec `PORT=<numéro>`. SQLite persiste dans `./data/app.db` ; définir `SQLITE_DB_PATH=':memory:'` pour des exécutions éphémères ou pointer vers n'importe quel chemin de fichier.

## API
| Méthode | Route | Objectif |
| --- | --- | --- |
| `GET` | `/messages` | Liste les messages triés du plus récent au plus ancien. |
| `GET` | `/messages/:id` | Retourne un message par id ; accepte des fragments SQL bruts pour les démonstrations d'injection. |
| `POST` | `/messages` | Insère un message ; vulnérable à l'injection via le champ `body`. |

Envoyer des payloads JSON comme `{ "body": "bonjour" }`. Des payloads tels que `"'); DELETE FROM messages; --"` illustrent l'injection destructive sur le chemin d'écriture, tandis que `0 OR 1=1` ou des payloads UNION ciblent le chemin de lecture.

## Structure du projet
- `src/lib/index.ts` – initialise le serveur Express et lit la variable d'environnement `PORT`.
- `src/lib/app.ts` – construit l'application Express, enregistre le middleware JSON, et expose les gestionnaires `/messages` pour les tests unitaires.
- `src/lib/database.ts` – centralise la connexion Better-SQLite3, les migrations et les fonctions helpers intentionnellement non sécurisées (`insertMessage`, `findMessageById`).
- `src/index.ts` – réexporte les points d'entrée de la bibliothèque pour les consommateurs.
- `src/test/app.test.ts` – suite de tests Node qui simule les réponses Express et démontre les scénarios d'exploitation ainsi que le comportement attendu.
- `data/` – emplacement SQLite sur disque par défaut lorsque `SQLITE_DB_PATH` n'est pas défini.
- `dist/` – sortie TypeScript générée après exécution de `npm run build`.

## Conseils de développement
- Utiliser `npm run dev` pendant les ateliers pour recharger les changements instantanément.
- Lors de l'ajout de nouvelles fonctionnalités, garder la logique indépendante du framework sous `src/lib/` et exposer des gestionnaires ou helpers testables.
- L'utilitaire `executeParameterizedQuery` est disponible pour des requêtes sécurisées ; les helpers non sécurisés existants restent inchangés pour supporter le contexte pédagogique.
- Réinitialiser l'état de la base de données dans les tests avec `clearMessages()` et privilégier les tests unitaires au niveau des gestionnaires plutôt que l'ouverture de sockets.

Pour les conventions de travail et les directives plus approfondies, voir [AGENTS.md](AGENTS.md).
