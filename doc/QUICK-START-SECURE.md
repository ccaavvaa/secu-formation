# Guide de démarrage rapide - Version sécurisée XSS

## 🚀 Accès rapide

### Version vulnérable (démo pédagogique)
```
http://localhost:3000
```

### Version sécurisée (protégée contre XSS)
```
http://localhost:3000/secure
```

## 🎓 Démonstration pratique (5 minutes)

### Étape 1 : Démarrer l'application
```bash
npm install
npm start
```

### Étape 2 : Tester le XSS vulnérable
1. Ouvrir `http://localhost:3000`
2. Cliquer sur le bouton jaune `<script>` sous le formulaire
3. Cliquer "Envoyer le message"
4. ✅ Observer : Une boîte d'alerte JavaScript s'affiche

### Étape 3 : Tester la version sécurisée
1. Ouvrir `http://localhost:3000/secure`
2. Copier/coller le même payload : `<script>alert('XSS')</script>`
3. Cliquer "Envoyer le message"
4. ✅ Observer : Le texte s'affiche comme du texte brut (pas d'alerte)

### Étape 4 : Comparer le HTML source
1. **Version vulnérable** (`/`) : Inspecter le HTML
   ```html
   <div class="message-body"><script>alert('XSS')</script></div>
   ```

2. **Version sécurisée** (`/secure`) : Inspecter le HTML
   ```html
   <div class="message-body">&lt;script&gt;alert('XSS')&lt;/script&gt;</div>
   ```

## 🛡️ Protections visibles

### Version vulnérable - Couleur : Violet 🟣
```
⚠️ ATTENTION : Application Vulnérable au XSS
```

### Version sécurisée - Couleur : Vert 🟢
```
✅ Version Sécurisée - Protection contre XSS
```

## 🧪 Payloads à tester

| Payload | Vulnérable | Sécurisé |
|---------|-----------|---------|
| `<script>alert('XSS')</script>` | 🔴 Alerte | 🟢 Texte |
| `<img src=x onerror="alert('XSS')">` | 🔴 Alerte | 🟢 Texte |
| `<svg onload="alert('XSS')"></svg>` | 🔴 Alerte | 🟢 Texte |
| `<iframe src="javascript:alert()"></iframe>` | 🔴 Alerte | 🟢 Texte |

## 📊 Architecture

```
Routes disponibles :
  GET  /             (vulnérable)
  POST /             (vulnérable)
  GET  /secure       (SÉCURISÉE) ✨
  POST /secure       (SÉCURISÉE) ✨
  GET  /messages     (API JSON)
```

## 🔒 Couches de protection (version sécurisée)

### Couche 1️⃣ : Escaping HTML
```
Entrée  : <script>alert('XSS')</script>
Sortie  : &lt;script&gt;alert('XSS')&lt;/script&gt;
Affichage : <script>alert('XSS')</script> (texte brut)
```

### Couche 2️⃣ : Content Security Policy (CSP)
- Pas de scripts externes
- Pas d'inline scripts dangereux
- Pas d'embedding dans iframes

### Couche 3️⃣ : Headers de sécurité
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block

## 📁 Fichiers clés

```
src/lib/
  ├── app.ts                 ← Routes /secure ajoutées
  ├── templates.ts           ← generateSecureHomePage() ✨
  └── template-loader.ts     ← Support multiples templates

src/templates/
  ├── index.html             (vulnérable)
  └── index-secure.html      (sécurisé) ✨

doc/
  ├── XSS-FIXES.md           (documentation détaillée)
  └── SECURE-VERSION-SUMMARY.md
```

## 📈 Comparaison de sécurité

| Aspect | Vulnérable | Sécurisé |
|--------|-----------|---------|
| Escaping HTML | ❌ | ✅ |
| CSP | ❌ | ✅ |
| Headers sécurité | ❌ | ✅ |
| Protection XSS | ❌ | ✅ |

## 🔐 Vérification rapide

### En inspectant le code HTML (F12)
```javascript
// Version vulnérable : script exécuté
// Version sécurisée : &lt;script&gt;...&lt;/script&gt; (texte)
```

## 🧩 Fonction clé

```typescript
function escapeHtml(text: string | number): string {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, c => map[c] ?? c);
}
```

## 🚀 Commandes utiles

```bash
npm run dev      # Développement (rechargement auto)
npm start        # Production
npm test         # Tests (25/25 passent ✅)
npm run build    # Build pour production
```

## 📚 Documentation complète

- [XSS-FIXES.md](XSS-FIXES.md) - Guide complet
- [SECURE-VERSION-SUMMARY.md](SECURE-VERSION-SUMMARY.md) - Résumé technique

## ⚠️ Important

**À des fins pédagogiques uniquement**

- ✅ Utiliser `/` pour apprendre les vulnérabilités
- ✅ Utiliser `/secure` pour apprendre à les corriger
- ❌ Ne jamais utiliser le pattern vulnérable en production
- ✅ Appliquer toujours les protections en production

---

**Bon apprentissage de la sécurité web ! 🔐**
