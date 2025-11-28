# CLAUDE.md

Ce fichier fournit des directives à Claude Code (claude.ai/code) lors du travail avec le code de ce dépôt.

## Vue d'ensemble du projet

Il s'agit d'un **projet de formation à la sécurité** qui démontre intentionnellement des vulnérabilités d'injection SQL. La base de code est une API TypeScript/Express avec persistance SQLite, construite pour illustrer à la fois les modèles vulnérables et les alternatives sécurisées à des fins pédagogiques.

**CRITIQUE** : `insertMessage()` et `findMessageById()` dans [src/lib/database.ts](src/lib/database.ts) contiennent des **vulnérabilités d'injection SQL intentionnelles**. Ne pas "corriger" ces fonctions sauf si vous mettez explicitement à jour le matériel de formation, car elles existent pour démontrer les risques de sécurité.

## Commandes de développement

```bash
# Développement (rechargement automatique)
npm run dev

# Démarrage en production
npm start

# Compiler TypeScript vers dist/
npm run build

# Exécuter les tests
npm test

# Linter
npm run lint

# Exécuter les tests avec base de données en mémoire (isolé)
SQLITE_DB_PATH=':memory:' npm test

# Nettoyer la sortie de build
npm run clean
```

## Variables d'environnement

- `PORT` : Port du serveur HTTP (par défaut : 3000)
- `SQLITE_DB_PATH` : Chemin du fichier de base de données (par défaut : `./data/app.db`, utiliser `:memory:` pour éphémère)

## Architecture

### Structure principale

- **[src/lib/index.ts](src/lib/index.ts)** - Bootstrap HTTP : lit l'env `PORT`, crée le serveur, aucune logique métier
- **[src/lib/app.ts](src/lib/app.ts)** - Instance Express, middleware, gestionnaires de routes (exportés pour les tests unitaires)
- **[src/lib/database.ts](src/lib/database.ts)** - Singleton Better-SQLite3, migrations, helpers de messages
- **[src/index.ts](src/index.ts)** - Réexporte les modules lib pour les consommateurs de la racine du package
- **[src/test/](src/test/)** - Fichiers de tests avec le suffixe `*.test.ts`

### Routes API

| Méthode | Route | Gestionnaire | Objectif |
|--------|-------|---------|---------|
| GET | `/messages` | `listMessagesHandler` | Liste les messages (du plus récent au plus ancien) |
| GET | `/messages/:id` | `getMessageHandler` | Retourne un message par id (vulnérable à l'injection) |
| POST | `/messages` | `createMessageHandler` | Crée un message (vulnérable à l'injection) |

### Conception du module Database

**Fonction sécurisée** : `executeParameterizedQuery(sql, params)` - Exécution SQL centralisée qui supporte les requêtes paramétrées. Cependant, les helpers vulnérables passent des chaînes concaténées à travers cette fonction, contournant sa sécurité.

**Fonctions vulnérables (intentionnelles)** :
- `insertMessage(body)` - Ligne 127 : Utilise la concaténation de chaînes brutes `INSERT INTO messages (body) VALUES ('${body}')`
- `findMessageById(id)` - Ligne 152 : Utilise la concaténation de chaînes brutes `WHERE id = ${id}`

**Fonctions sécurisées** :
- `listMessages()` - Utilise correctement les requêtes paramétrées
- `clearMessages()` - Helper de test pour réinitialiser l'état de la base de données

## Approche de test

- Utilise le `node:test` intégré de Node avec `assert/strict`
- Les tests invoquent directement les gestionnaires de routes avec des objets Express `Request`/`Response` simulés
- Évite l'ouverture de sockets HTTP pour des tests plus rapides et compatibles sandbox
- Définir `SQLITE_DB_PATH=':memory:'` pour l'isolation des tests
- Utiliser `clearMessages()` dans la configuration du test (`t.beforeEach`) pour garantir un état propre

Exemple de structure de test tiré de [src/test/app.test.ts](src/test/app.test.ts) :
```typescript
test('POST /messages handler', async (t) => {
  t.beforeEach(() => { clearMessages(); });

  await t.test('description', () => {
    // Implémentation du test
  });
});
```

## Style de code

- TypeScript strict via [tsconfig.json](tsconfig.json) : `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `strict`, `verbatimModuleSyntax`
- Modules ESM avec `"type": "module"` dans [package.json](package.json)
- Extensions `.js` explicites dans les chemins d'import (TypeScript résout à la compilation)
- Indentation de deux espaces, guillemets simples (sauf si interpolation nécessaire)
- camelCase pour les gestionnaires (`listMessagesHandler`), PascalCase pour les classes
- Garder les gestionnaires de routes légers ; centraliser la logique métier dans les modules `src/lib/`
- Helpers de style repository dans [database.ts](src/lib/database.ts) pour la persistance

## Conventions de commit

- Sujets courts et impératifs (ex : "Introduire les routes de session utilisateur")
- Rebase/squash le bruit avant de soumettre les PRs
- Les PRs doivent décrire la portée, les risques, les étapes de validation et lier les issues de suivi
- Inclure la sortie CLI ou des captures d'écran pour les changements de comportement
