# 🔒 Version Sécurisée - Protection XSS

Une version complètement sécurisée de l'application a été implémentée avec protection contre les attaques **Cross-Site Scripting (XSS)**.

## 📍 Accès

- **Vulnérable (démo)** : `http://localhost:3000`
- **Sécurisée** : `http://localhost:3000/secure`

## 🎯 Résumé rapide

| Aspect | Détail |
|--------|--------|
| **Nouveau endpoint** | `GET /secure` et `POST /secure` |
| **Protection** | HTML Escaping + CSP + Headers sécurité |
| **Fichiers créés** | `index-secure.html` + documentation |
| **Fichiers modifiés** | `app.ts`, `templates.ts`, `template-loader.ts` |
| **Tests** | ✅ 25/25 passent |
| **Build** | ✅ Compile sans erreurs |

## 🛡️ Protections implémentées

### 1. HTML Escaping
```typescript
// Convertit les caractères dangereux en entités HTML
escapeHtml('<script>alert("XSS")</script>')
// → &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

### 2. Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  ...
">
```

### 3. Headers de sécurité
- `X-Frame-Options: DENY` - Prévient le clickjacking
- `X-Content-Type-Options: nosniff` - Prévient le reniflement MIME
- `X-XSS-Protection: 1; mode=block` - Protection XSS navigateur

## 📁 Fichiers créés/modifiés

### ✨ Créés
- **`src/templates/index-secure.html`** - Template HTML sécurisé
- **`doc/XSS-FIXES.md`** - Documentation détaillée (250+ lignes)
- **`doc/SECURE-VERSION-SUMMARY.md`** - Résumé technique
- **`doc/QUICK-START-SECURE.md`** - Guide de démarrage rapide

### 🔧 Modifiés
- **`src/lib/templates.ts`**
  - ➕ Fonction `escapeHtml()`
  - ➕ Fonction `generateSecureHomePage()`

- **`src/lib/template-loader.ts`**
  - ➕ Support du paramètre `templateName`
  - ➕ Cache par template via `Map`

- **`src/lib/app.ts`**
  - ➕ Routes `/secure` GET et POST
  - ➕ Gestionnaires `secureHomeHandler` et `secureHomePostHandler`

## 🧪 Démo en 3 étapes

### 1. Démarrer
```bash
npm start
```

### 2. Vulnérable (`/`)
- Ouvrir `http://localhost:3000`
- Soumettre : `<script>alert('XSS')</script>`
- Résultat : 🔴 Une alerte s'affiche

### 3. Sécurisé (`/secure`)
- Ouvrir `http://localhost:3000/secure`
- Soumettre : `<script>alert('XSS')</script>`
- Résultat : 🟢 Le texte s'affiche comme du texte brut

## 📊 Tableau comparatif

```
Payload : <script>alert('XSS')</script>

Version vulnérable (/)
├─ HTML : <div>${msg.body}</div>
├─ Résultat : <div><script>alert('XSS')</script></div>
└─ Effet : ⚠️ Script exécuté (XSS)

Version sécurisée (/secure)
├─ HTML : <div>${escapeHtml(msg.body)}</div>
├─ Résultat : <div>&lt;script&gt;...&lt;/script&gt;</div>
└─ Effet : ✅ Texte affiché (sûr)
```

## 🔑 Points clés

1. **Dualité intentionnelle**
   - Version vulnérable pour apprendre les risques
   - Version sécurisée pour apprendre les solutions

2. **Multi-couche de défense**
   - Escaping HTML (première ligne)
   - CSP (limite l'impact)
   - Headers (protection supplémentaire)

3. **Production-ready**
   - Suit les standards OWASP
   - Tous les tests passent
   - Code compilé sans erreurs

## 📚 Documentation

Pour une compréhension complète :

1. **[QUICK-START-SECURE.md](doc/QUICK-START-SECURE.md)** (5 min)
   - Guide de démarrage rapide
   - Démo pratique immédiate

2. **[SECURE-VERSION-SUMMARY.md](doc/SECURE-VERSION-SUMMARY.md)** (15 min)
   - Résumé technique
   - Architecture et implémentation

3. **[XSS-FIXES.md](doc/XSS-FIXES.md)** (30 min)
   - Documentation complète
   - Explications détaillées
   - Bonnes pratiques OWASP

## 🚀 Démarrage

```bash
# Installation
npm install

# Développement (rechargement auto)
npm run dev

# Production
npm start

# Tests
npm test          # ✅ 25/25 passent

# Build
npm run build     # ✅ Compile sans erreurs
```

## ✅ Checklist

- ✅ Template HTML sécurisé créé
- ✅ Fonction d'escaping HTML implémentée
- ✅ Générateur de page sécurisé créé
- ✅ Routes `/secure` GET/POST ajoutées
- ✅ CSP configurée
- ✅ Headers de sécurité implémentés
- ✅ Template loader mis à jour
- ✅ Tous les tests passent
- ✅ Build compile sans erreurs
- ✅ Documentation complète

## 🎓 Utilisation pédagogique

### Pour l'enseignement
```
Montrer les vulnérabilités : GET http://localhost:3000
Montrer les corrections : GET http://localhost:3000/secure
Comparer le code source : Lire doc/XSS-FIXES.md
```

### Pour l'audit
```
Tester la sécurité : POST http://localhost:3000/secure avec payloads
Vérifier l'escaping : Inspecter le HTML source
Valider la CSP : Vérifier les headers
```

## 🔐 Sécurité

**Cette application est à des fins éducatives uniquement**

- ✅ Utiliser `/` pour apprendre les vulnérabilités
- ✅ Utiliser `/secure` pour apprendre à les corriger
- ❌ Ne jamais déployer le code vulnérable en production
- ✅ Appliquer toujours les protections du `/secure` en production

## 📖 Références

- [OWASP Top 10 - A07 XSS](https://owasp.org/Top10/A07_2021-Cross_Site_Scripting/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)

---

**Pour commencer** : Lire [doc/QUICK-START-SECURE.md](doc/QUICK-START-SECURE.md)

**Pour le détail technique** : Lire [doc/XSS-FIXES.md](doc/XSS-FIXES.md)
