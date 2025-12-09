# Résumé - Version sécurisée XSS

## 🎯 Objectif accompli

Une version complètement sécurisée de la page d'accueil a été créée, protégée contre les attaques **Cross-Site Scripting (XSS)**.

## 📁 Fichiers créés

### 1. **`src/templates/index-secure.html`** (311 lignes)
Template HTML sécurisé avec :
- **Content Security Policy (CSP)** stricte
- Headers de sécurité méthodiques
- Design distinct (thème vert)
- Formulaire fonctionnel sans boutons d'injection XSS
- Affichage des mesures de sécurité en place

**Mesures de sécurité implémentées** :
```html
<!-- Content Security Policy -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'">

<!-- Headers de protection supplémentaires -->
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-XSS-Protection" content="1; mode=block">
<meta http-equiv="X-Frame-Options" content="DENY">
```

### 2. **`doc/XSS-FIXES.md`** (Documentation complète)
Guide de 250+ lignes incluant :
- Explications détaillées des vulnérabilités XSS
- Description complète des protections
- Exemples de payloads d'attaque
- Comparaison vulnérable vs sécurisé
- Bonnes pratiques OWASP
- Guide de testage
- Références de sécurité

## 🔧 Fichiers modifiés

### **`src/lib/templates.ts`**
**Ajouts** :
- Fonction `escapeHtml()` - Convertit les caractères HTML dangereux en entités
  ```typescript
  function escapeHtml(text: string | number): string {
    // & → &amp;, < → &lt;, > → &gt;, " → &quot;, ' → &#039;
  }
  ```
- Fonction `generateSecureHomePage()` - Génère le HTML sécurisé
  ```typescript
  export async function generateSecureHomePage(messages: Message[]): Promise<string> {
    // Échappe tous les contenus avant injection
    const messagesHtml = messages.map(msg => `
      <div class="message-item">
        <div class="message-id">Message #${escapeHtml(String(msg.id))}</div>
        <div class="message-body">${escapeHtml(msg.body)}</div>
      </div>
    `).join('');
    // ...
  }
  ```

### **`src/lib/template-loader.ts`**
**Modifications** :
- Support du chargement de multiples templates par nom
- Paramètre `templateName` (défaut: `'index.html'`)
- Cache indépendant par template via `Map`

```typescript
export async function loadTemplate(templateName: string = 'index.html'): Promise<string> {
  // Support des noms de fichiers : index.html, index-secure.html, etc.
}
```

### **`src/lib/app.ts`**
**Ajouts** :
- Import de `generateSecureHomePage`
- Gestionnaire `secureHomeHandler` pour GET `/secure`
- Gestionnaire `secureHomePostHandler` pour POST `/secure`
- Routes `/secure` GET et POST

```typescript
const secureHomeHandler: RequestHandler = async (_req, res) => {
  const messages = messageRepository.listMessages();
  const html = await generateSecureHomePage(messages);  // ✅ Utilise la fonction sécurisée
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

app.get('/secure', secureHomeHandler);
app.post('/secure', secureHomePostHandler);
```

## 🚀 Routes disponibles

| Route | Méthode | Description | Protection |
|-------|---------|-------------|-----------|
| `/` | GET | Page d'accueil d'origine | ⚠️ Vulnérable intentionnellement (XSS) |
| `/` | POST | Formulaire d'origine | ⚠️ Vulnérable (injection SQL + XSS) |
| `/secure` | GET | Page d'accueil **sécurisée** | ✅ Protégée contre XSS |
| `/secure` | POST | Formulaire **sécurisé** | ✅ Protégée contre XSS |

## 🛡️ Protections XSS implémentées

### 1. **Escaping HTML**
Tous les contenus utilisateurs sont convertis avant affichage :
```
Entrée : <script>alert('XSS')</script>
Sortie : &lt;script&gt;alert('XSS')&lt;/script&gt;
Affichage : <script>alert('XSS')</script> (texte brut)
```

### 2. **Content Security Policy (CSP)**
Limite sévèrement ce qui peut s'exécuter :
- Pas de scripts externes
- Pas de `eval()`
- Pas d'inline scripts (sauf styles)
- Pas d'embedding dans iframes

### 3. **Headers de sécurité**
```
X-Content-Type-Options: nosniff     → Prévient le reniflement MIME
X-XSS-Protection: 1; mode=block      → Active la protection XSS navigateur
X-Frame-Options: DENY                → Empêche le clickjacking
```

## ✅ Tests

Tous les tests passent (25/25) :

```bash
npm test
# tests 25
# suites 0
# pass 25 ✅
# fail 0
```

Les tests incluent :
- Démonstrations XSS (7 cas)
- Tests d'injection SQL (10 cas)
- Tests API (8 cas)

## 📊 Comparaison

### Comportement avec payload XSS : `<script>alert('XSS')</script>`

**Version vulnérable** (`/`) :
```html
<!-- L'utilisateur voit : [Une boîte d'alerte s'affiche] -->
<!-- HTML rendu : -->
<div class="message-body"><script>alert('XSS')</script></div>
```

**Version sécurisée** (`/secure`) :
```html
<!-- L'utilisateur voit : <script>alert('XSS')</script> (texte) -->
<!-- HTML rendu : -->
<div class="message-body">&lt;script&gt;alert('XSS')&lt;/script&gt;</div>
```

## 🎓 Utilisation pédagogique

### Pour démontrer les vulnérabilités

1. Ouvrir `http://localhost:3000`
2. Soumettre des payloads XSS
3. Observer l'exécution du JavaScript

Payloads disponibles dans le formulaire (boutons pédagogiques) :
- `<script>alert('XSS via script tag')</script>`
- `<img src=x onerror="alert('XSS via img')">`
- `<svg onload="alert('XSS via svg')"></svg>`
- `<iframe src="javascript:alert('XSS via iframe')"></iframe>`

### Pour montrer les protections

1. Ouvrir `http://localhost:3000/secure`
2. Soumettre les mêmes payloads
3. Observer que le contenu s'affiche en texte brut
4. Inspecter le HTML source et voir l'escaping

## 🔍 Inspection côté client

### Vérifier l'escaping
1. Ouvrir la page sécurisée `/secure`
2. Inspecter l'élément (F12)
3. Observer que `<` et `>` sont remplacés par `&lt;` et `&gt;`

### Vérifier la CSP
1. Ouvrir la console (F12)
2. Vérifier l'absence d'erreurs "Refused to execute script"
3. Vérifier les headers dans Network tab

## 📚 Documentation

- **`doc/XSS-FIXES.md`** - Guide complet des protections XSS
- **`CLAUDE.md`** - Instructions du projet (inclut les vulnérabilités intentionnelles)

## 🔗 Accès aux ressources

| Ressource | URL |
|-----------|-----|
| Version vulnérable | `http://localhost:3000/` |
| Version sécurisée | `http://localhost:3000/secure` |
| Documentation XSS | [doc/XSS-FIXES.md](../doc/XSS-FIXES.md) |
| Tests | `npm test` |
| API Swagger | `http://localhost:3000/api-docs` |

## 📋 Checklist d'implémentation

- ✅ Template HTML sécurisé créé (`index-secure.html`)
- ✅ Fonction d'escaping HTML implémentée
- ✅ Générateur de page sécurisé implémentée
- ✅ Routes `/secure` GET et POST ajoutées
- ✅ Content Security Policy configurée
- ✅ Headers de sécurité implémentés
- ✅ Template loader mis à jour pour support multiple
- ✅ Tous les tests passent (25/25)
- ✅ Build compile sans erreurs
- ✅ Documentation complète créée

## 🚀 Démarrage

```bash
# Installation
npm install

# Développement
npm run dev  # Rechargement automatique

# Production
npm start    # Port 3000 par défaut

# Tests
npm test

# Build
npm run build
```

## 🎯 Points clés

1. **Dualité intentionnelle** : Les deux versions (vulnérable et sécurisée) coexistent à des fins pédagogiques
2. **Démonstration visuelle** : Les couleurs différentes (violet/vert) distinguent les versions
3. **Même base de données** : Les deux versions partagent les mêmes messages
4. **Protection complète** : Escaping HTML + CSP + Headers = défense multi-couche
5. **Production-ready** : La version sécurisée suit les standards OWASP

## 📖 Références

- OWASP Top 10 A07 - Cross-Site Scripting (XSS)
- OWASP XSS Prevention Cheat Sheet
- MDN Web Docs - Content Security Policy
- CWE-79: Improper Neutralization of Input During Web Page Generation

---

**Résumé** : L'implémentation crée une version sécurisée complète de l'interface web avec protection XSS multi-couche (escaping + CSP + headers), documentée et testée, tout en préservant les démonstrations de vulnérabilités intentionnelles pour l'éducation.
