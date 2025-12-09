# Directives du dépôt

Ce document fournit les directives d'architecture, de style et de développement pour le projet de formation à la sécurité `secu-form`.

## Architecture du projet

### Structure des modules

- **`src/lib/index.ts`** : Bootstrap HTTP, lit `PORT` de l'environnement, crée le serveur. Reste libre de logique métier.
- **`src/lib/app.ts`** : Configure l'instance Express, middleware et gestionnaires de routes. Routes actuelles :
  - `GET /` et `POST /` : Interface web (vulnérable XSS)
  - `GET /messages`, `GET /messages/:id`, `POST /messages` : API REST (injection SQL sur les endpoints avec `:id` et POST)
  - `/api-docs` : Documentation Swagger UI
- **`src/lib/database.ts`** : Connexion Better-SQLite3, migrations et helpers de messages avec SQL intentionnellement vulnérable
- **`src/lib/message-repository.ts`** : Pattern Repository avec deux implémentations :
  - `VulnerableMessageRepository` : Utilise la concaténation de chaînes (vulnérable)
  - `SecureMessageRepository` : Utilise des requêtes paramétrées (sécurisé)
- **`src/lib/swagger.ts`** : Configuration OpenAPI/Swagger pour la documentation interactive
- **`src/index.ts`** : Réexporte les modules lib pour les consommateurs important depuis la racine
- **`src/test/`** : Tests unitaires avec suffix `*.test.ts`
  - `app.test.ts` : Tests d'injection SQL (9 scénarios)
  - `xss.test.ts` : Tests XSS (8 vecteurs d'attaque)

### Séparation des responsabilités

- La logique métier réside sous `src/lib/` et doit rester indépendante du framework
- Les gestionnaires Express doivent rester légers et déléguer aux repositories
- Privilégier les tests unitaires au niveau des gestionnaires plutôt que l'ouverture de sockets HTTP
- La sortie TypeScript compilée va dans `dist/`

## Vulnérabilités intentionnelles

⚠️ **CRITIQUE** : Ne pas "corriger" ces vulnérabilités sauf mise à jour explicite du matériel pédagogique.

### 1. Injection SQL

**Localisation** : `src/lib/message-repository.ts` (classe `VulnerableMessageRepository`)
- `insertMessage()` : Ligne ~60, utilise `INSERT INTO messages (body) VALUES ('${body}')`
- `findMessageById()` : Ligne ~85, utilise `WHERE id = ${id}`

**Fonctionnement** :
- Concaténation de chaînes brutes au lieu de requêtes paramétrées
- Passe les chaînes concaténées à `executeParameterizedQuery()`, contournant sa sécurité
- Exploitable via l'API REST sur `POST /messages` et `GET /messages/:id`

**Code sécurisé disponible** : `SecureMessageRepository` démontre l'utilisation correcte des requêtes paramétrées

### 2. Cross-Site Scripting (XSS)

**Localisation** : `src/lib/templates.ts`
- `generateHomePage()` : Génère du HTML côté serveur en injectant directement le contenu utilisateur
- **Injection du contenu** : `<div class="message-body">${msg.body}</div>` sans échappement

**Fonctionnement** :
- Template strings injectent directement le contenu utilisateur dans le HTML
- Aucun échappement ni sanitization des balises HTML/JavaScript
- Exploitable via le formulaire sur `GET /` et `POST /`

**Contre-mesure recommandée** : Échapper les caractères HTML (`<` → `&lt;`, `>` → `&gt;`, etc.)

## Commandes de build, test et développement

```bash
# Démarrage
npm start              # Lance le serveur Express en production
npm run dev            # Développement avec rechargement automatique (tsx watch)

# Build
npm run build          # Transpile TypeScript dans dist/
npm run clean          # Nettoie le répertoire dist/

# Tests et qualité
npm test               # Exécute tous les tests (*.test.ts)
npm run lint           # ESLint sur les fichiers .ts
npm run lint && npm test  # Vérification complète avant PR
```

### Variables d'environnement

- `PORT` : Port du serveur HTTP (défaut: 3000)
- `SQLITE_DB_PATH` : Chemin de la base de données
  - Défaut : `./data/app.db`
  - `:memory:` pour les tests isolés

## Style de code et conventions

### TypeScript strict

- Configuration stricte via `tsconfig.json` :
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
  - `strict`
  - `verbatimModuleSyntax`
- ESLint avec ruleset TypeScript partagé

### Formatage

- **Indentation** : 2 espaces
- **Guillemets** : Simples (`'`) sauf pour interpolation (template strings)
- **Extensions** : `.js` explicites dans les imports ESM (TypeScript résout à la compilation)
- **Point-virgules** : Requis à la fin des instructions

### Conventions de nommage

- **Gestionnaires de routes** : camelCase avec suffix `Handler`
  - Exemple : `homeHandler`, `createMessageHandler`
- **Classes** : PascalCase
  - Exemple : `VulnerableMessageRepository`, `SecureMessageRepository`
- **Fichiers** : camelCase descriptif
  - Exemple : `message-repository.ts`, `swagger.ts`
- **Constantes** : UPPER_SNAKE_CASE pour les vraies constantes globales

### Organisation du code

- Centraliser les helpers inter-routes dans `src/lib/`
- Éviter la logique métier inline dans les gestionnaires Express
- Privilégier le pattern Repository pour la persistance
- Garder les gestionnaires légers : validation → délégation au repository → réponse

## Directives de tests

### Framework et style

- Utiliser le `node:test` intégré de Node.js avec `assert/strict`
- Privilégier `supertest` pour tester les routes HTTP
- Simuler les objets Express `Request`/`Response` uniquement si nécessaire
- Viser un comportement déterministe

### Organisation des tests

```typescript
// Exemple de structure (src/test/xss.test.ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../lib/app.js';
import { VulnerableMessageRepository } from '../lib/message-repository.js';

test('Description de la suite', async (t) => {
  let app: Express;
  const repository = new VulnerableMessageRepository();

  t.beforeEach(() => {
    repository.clearMessages(); // État propre
    app = createApp(repository);
  });

  await t.test('Cas de test spécifique', async () => {
    // Test avec supertest
    const response = await request(app)
      .post('/')
      .type('form')
      .send({ body: '<script>alert("XSS")</script>' })
      .expect(302);

    // Assertions
    assert(response.text.includes('expected'));
  });
});
```

### Bonnes pratiques

- Ajouter les tests à côté de leurs cibles : `src/lib/feature.ts` → `src/test/feature.test.ts`
- Utiliser `clearMessages()` pour garantir un état SQLite propre
- Définir `SQLITE_DB_PATH=':memory:'` pour l'isolation complète
- Documenter les exploits avec des commentaires détaillés (voir tests existants)
- Exécuter `npm run lint && npm test` avant chaque commit

### Tests de vulnérabilités

Les tests doivent **démontrer et documenter** les vulnérabilités :

```typescript
await t.test('XSS via balise script', async () => {
  /**
   * PAYLOAD XSS : <script>alert('XSS')</script>
   *
   * VULNÉRABILITÉ CIBLÉE : src/lib/app.ts:62
   * Le code utilise une template string sans échappement :
   *   <div class="message-body">${msg.body}</div>
   *
   * RÉSULTAT : Le script est présent dans le HTML et s'exécutera
   */
  const xssPayload = "<script>alert('XSS')</script>";

  await request(app)
    .post('/')
    .type('form')
    .send({ body: xssPayload })
    .expect(302);

  const response = await request(app)
    .get('/')
    .expect(200);

  assert(response.text.includes(xssPayload),
    'Le payload XSS devrait être présent sans échappement');
});
```

## Directives de commit et pull request

### Messages de commit

- **Format** : Sujets courts et impératifs (50 caractères max)
  - ✅ `Ajouter démonstration XSS via rendu côté serveur`
  - ❌ `Added some XSS stuff`
- **Corps** : Description détaillée si nécessaire
  - Expliquer le "pourquoi", pas le "quoi"
  - Référencer les issues avec `#123`
  - Lister les changements importants

### Exemple de commit structuré

```
Ajouter démonstration de vulnérabilité XSS

Implémente une interface web avec rendu côté serveur vulnérable au XSS
à des fins pédagogiques.

Fonctionnalités :
- Route GET / : Page web avec formulaire
- Route POST / : Traitement du formulaire
- Tests XSS avec 8 vecteurs d'attaque

Vulnérabilité (src/lib/app.ts:62) :
Le contenu est injecté sans échappement : ${msg.body}

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pull requests

Avant de soumettre une PR :

1. **Tester localement** : `npm run lint && npm test`
2. **Rebase/squash** : Nettoyer l'historique des commits de travail
3. **Description claire** :
   - Portée des changements
   - Risques potentiels
   - Étapes de validation
   - Lien vers les issues de suivi
4. **Captures d'écran** : Inclure pour les changements de comportement visible
5. **Commandes exécutées** : Documenter les tests effectués

### Template de PR

```markdown
## Description
[Description concise des changements]

## Type de changement
- [ ] Nouvelle fonctionnalité
- [ ] Correction de bug
- [ ] Refactoring
- [ ] Documentation
- [ ] Tests

## Vulnérabilités touchées
- [ ] Injection SQL
- [ ] XSS
- [ ] Aucune (améliorations générales)

## Tests effectués
```bash
npm run lint
npm test
npm start  # Vérification manuelle
```

## Captures d'écran
[Si applicable]

## Checklist
- [ ] Le code suit les conventions du projet
- [ ] Les tests passent localement
- [ ] La documentation est mise à jour
- [ ] Les vulnérabilités intentionnelles sont documentées
```

## Pattern Repository

Le projet utilise le pattern Repository pour séparer la logique de persistance :

### Interface commune

```typescript
export type MessageRepository = {
  listMessages: () => Message[];
  findMessageById: (id: string) => Message | undefined;
  insertMessage: (body: string) => Message | undefined;
  clearMessages: () => void;
};
```

### Implémentations

1. **VulnerableMessageRepository** (démonstration)
   - Utilise la concaténation de chaînes
   - Expose intentionnellement aux injections SQL

2. **SecureMessageRepository** (contre-mesure)
   - Utilise des requêtes paramétrées
   - Démontre les bonnes pratiques

### Utilisation dans les routes

```typescript
export function createApp(messageRepository: MessageRepository) {
  // L'app reçoit le repository en injection de dépendances
  // Permet de tester avec différentes implémentations
}
```

## Ressources additionnelles

- **Documentation détaillée** : [CLAUDE.md](CLAUDE.md)
- **Guide utilisateur** : [README.md](README.md)
- **Tests annotés** : Voir `src/test/app.test.ts` et `src/test/xss.test.ts`
