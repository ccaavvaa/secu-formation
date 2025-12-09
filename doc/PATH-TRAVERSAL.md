# Vulnérabilité de Traversée de Répertoires (Directory Traversal)

## Vue d'ensemble

**Traversée de Répertoires** (également connue sous le nom de **Directory Traversal**) est une vulnérabilité web qui permet aux attaquants d'accéder à des fichiers en dehors d'un répertoire prévu sur le serveur. En manipulant les paramètres de chemin de fichier, un attaquant peut s'échapper du répertoire confiné et lire des fichiers sensibles ou des données de configuration.

**Score CVSS** : 5.3 (Moyen)
**CWE-22** : Limitation incorrecte d'un chemin à un répertoire restreint ('Path Traversal')
**OWASP** : A01:2021 – Contrôle d'accès défaillant

---

## Mécanique de la vulnérabilité

### Comment fonctionne la traversée de répertoires

Lorsqu'une application construit des chemins de fichiers en concaténant directement l'entrée utilisateur sans validation appropriée :

```typescript
// ❌ VULNÉRABLE
const filePath = path.join(publicDir, userInput);
const content = readFileSync(filePath);
```

Un attaquant peut utiliser des séquences comme `../` pour remonter l'arborescence des répertoires :

```
publicDir: /var/www/app/public
userInput: ../../etc/passwd

Résultat : /var/www/app/public/../../etc/passwd
Après normalisation : /var/www/etc/passwd ou /etc/passwd
```

### Variantes d'attaques

1. **Traversée classique**
   - `../` (POSIX/Unix)
   - `..\` (Windows)
   - Séquences multiples : `../../../../etc/passwd`

2. **Contournement par encodage URL**
   - `%2e%2e%2f` → `../`
   - `%2e%2e/` → `../`
   - Encodage double : `%252e%252e%252f` → `%2e%2e%2f` → `../`

3. **Contournement par double point**
   - `....//....//etc/passwd` (exploite certains filtres naïfs qui suppriment `..|)
   - `..%252f..%252fetc%252fpasswd`

4. **Exploitation de rétro-barre** (multiplateforme)
   - `..\ ` (séparateur de chemin Windows)
   - Séparateurs mixtes sur les systèmes qui acceptent les deux

5. **Injection de null byte** (anciens systèmes)
   - `file.txt%00.jpg` (contournement des vérifications d'extension de fichier)
   - Les systèmes modernes rejettent les null bytes

6. **Normalisation Unicode**
   - Représentations Unicode alternatives de `/` ou `.`
   - Comportement dépendant du système

---

## Exemple de code vulnérable

### Dans ce projet

**Fichier** : [src/lib/file-repository.ts:31-45](../src/lib/file-repository.ts#L31-L45)

```typescript
export class VulnerableFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  getFile(filename: string): FileContent | undefined {
    try {
      // ❌ VULNÉRABLE : Concaténation directe sans validation
      const filePath = path.join(this.baseDir, filename);
      const content = readFileSync(filePath, 'utf-8');
      return { filename, content };
    } catch {
      return undefined;
    }
  }
}
```

### Démonstrations d'attaques

```bash
# Obtenir un fichier dans le répertoire public (légitime)
curl http://localhost:3000/files/readme.txt

# Traverser vers le répertoire parent (ATTAQUE)
curl http://localhost:3000/files/../package.json

# Traversées multiples (ATTAQUE)
curl http://localhost:3000/files/../../CLAUDE.md

# Traversée encodée en URL (ATTAQUE)
curl http://localhost:3000/files/%2e%2e/tsconfig.json

# Rétro-barre de style Windows (ATTAQUE)
curl http://localhost:3000/files/..\\package.json
```

### Impact

- **Divulgation d'informations** : Lire les fichiers sensibles (configuration, code source, identifiants)
- **Contournement d'authentification** : Accès aux fichiers de mot de passe ou aux jetons de session
- **Reconnaissance du système** : Énumération de la structure des répertoires (`/etc/passwd`, `/etc/hosts`)
- **Violations de conformité** : RGPD, PCI-DSS (accès non autorisé aux fichiers)

### Exemples réels

| Attaque | Cible | Conséquence |
|--------|-------|-------------|
| `/admin/download.php?file=../../../../etc/passwd` | Linux `/etc/passwd` | Liste des utilisateurs exposée |
| `/getfile?filename=../../web.config` | Configuration IIS | Identifiants de base de données divulgués |
| `/documents?id=../../../.env` | Fichier d'environnement | Clés API exposées |
| `/image?src=../../../../../../windows/win.ini` | Fichier système | Informations système divulguées |

---

## Implémentation de code sécurisé

### Solution 1 : Validation du chemin (Recommandée)

**Fichier** : [src/lib/file-repository.ts:61-84](../src/lib/file-repository.ts#L61-L84)

```typescript
export class SecureFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  getFile(filename: string): FileContent | undefined {
    try {
      const baseDirResolved = path.resolve(this.baseDir);
      const requestedPath = path.resolve(this.baseDir, filename);

      // ✅ SÉCURISÉ : Vérifier que le chemin résolu reste dans baseDir
      if (
        !requestedPath.startsWith(baseDirResolved + path.sep) &&
        requestedPath !== baseDirResolved
      ) {
        // Tentative de traversée de répertoires détectée
        return undefined;
      }

      const content = readFileSync(requestedPath, 'utf-8');
      return { filename, content };
    } catch {
      return undefined;
    }
  }
}
```

### Comment ça fonctionne

1. **`path.resolve(baseDir)`** - Obtenir le chemin absolu normalisé du répertoire autorisé
2. **`path.resolve(baseDir, filename)`** - Résoudre l'entrée utilisateur en chemin absolu (normalise `..` et `.`)
3. **Comparaison** - Vérifier que le chemin résolu commence par le répertoire de base
4. **Garde** : Rejeter tout chemin qui s'échappe du répertoire

### Test de la protection

```bash
# Accès légitime (fonctionne)
curl http://localhost:3000/secure-files/readme.txt

# Tentative de traversée (bloquée, retourne 404)
curl http://localhost:3000/secure-files/../package.json

# Traversée encodée en URL (bloquée)
curl http://localhost:3000/secure-files/%2e%2e/tsconfig.json

# Traversées multiples (bloquées)
curl http://localhost:3000/secure-files/../../CLAUDE.md
```

### Solution 2 : Approche par liste blanche

Si seuls des fichiers spécifiques doivent être accessibles :

```typescript
const ALLOWED_FILES = ['readme.txt', 'help.txt', 'license.txt'];

getFile(filename: string): FileContent | undefined {
  if (!ALLOWED_FILES.includes(filename)) {
    return undefined; // Rejet par liste blanche
  }
  // Ensuite, lire le fichier depuis un répertoire sûr
  const content = readFileSync(path.join(this.baseDir, filename), 'utf-8');
  return { filename, content };
}
```

### Solution 3 : Éviter la diffusion dynamique de fichiers

Au lieu de servir les fichiers dynamiquement, utilisez un middleware de fichiers statiques :

```typescript
// Le middleware static d'Express est intrinsèquement sûr
app.use(express.static('public')); // Prévient automatiquement la traversée
```

---

## Test de traversée de répertoires

### Test manuel

```bash
# Démarrer le serveur
npm start

# Tester le point de terminaison vulnérable avec différentes charges utiles
curl http://localhost:3000/files/readme.txt                    # OK
curl http://localhost:3000/files/../package.json               # ❌ VULNÉRABLE
curl http://localhost:3000/files/..%2fpackage.json             # ❌ VULNÉRABLE
curl http://localhost:3000/files/....//....//package.json      # ❌ VULNÉRABLE

# Tester le point de terminaison sécurisé (tous doivent retourner 404)
curl http://localhost:3000/secure-files/readme.txt             # OK
curl http://localhost:3000/secure-files/../package.json        # ✅ BLOQUÉ
curl http://localhost:3000/secure-files/..%2fpackage.json      # ✅ BLOQUÉ
```

### Test automatisé

```bash
# Exécuter la suite de tests de traversée de répertoires
npm test -- --grep "Path Traversal"
```

Les tests couvrent :
- Accès normal aux fichiers
- Séquences classiques `../`
- Niveaux de traversée multiples
- Variantes d'encodage URL
- Exploitation de rétro-barre
- Tentatives de chemin absolu
- Régression d'accès aux sous-répertoires

---

## Bonnes pratiques

### ✅ FAIRE

- ✅ Utiliser `path.resolve()` pour normaliser les chemins
- ✅ Vérifier que le chemin résolu reste dans le répertoire autorisé
- ✅ Utiliser des chemins absolus pour les comparaisons
- ✅ Implémenter la validation par liste blanche si applicable
- ✅ Utiliser le statut HTTP 403 Forbidden pour les tentatives de traversée rejetées
- ✅ Enregistrer toutes les tentatives de traversée de répertoires pour la surveillance de la sécurité
- ✅ Garder les permissions des répertoires restrictives (chmod 755)
- ✅ Utiliser les gestionnaires de fichiers statiques intégrés aux frameworks

### ❌ NE PAS FAIRE

- ❌ Faire confiance à l'entrée utilisateur pour les chemins de fichiers
- ❌ Utiliser la concaténation de chaînes pour construire les chemins
- ❌ Supposer que le décodage URL prévient les attaques
- ❌ Compter sur le filtrage de `..` (facile à contourner avec l'encodage)
- ❌ Servir l'intégralité du système de fichiers avec des chemins contrôlés par l'utilisateur
- ❌ Ignorer les liens symboliques vers les répertoires parents
- ❌ Utiliser la construction dynamique de chemins sans validation
- ❌ Désactiver l'enregistrement des événements de sécurité

---

## Protection spécifique aux frameworks

### Express.js (Recommandé)

```typescript
// ✅ SÛR : Middleware statique intégré
import express from 'express';
const app = express();

app.use(express.static('public')); // Automatiquement sûr

// ✅ SÛR : Validation manuelle
import path from 'path';
import { readFileSync } from 'fs';

app.get('/file/:name', (req, res) => {
  const baseDir = path.resolve('./public');
  const fullPath = path.resolve(baseDir, req.params.name);

  if (!fullPath.startsWith(baseDir)) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  res.sendFile(fullPath);
});
```

### En-têtes de sécurité Node.js

```typescript
// Ajouter des en-têtes de sécurité pour prévenir les exploits mis en cache
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  next();
});
```

---

## Vulnérabilités associées

| Vulnérabilité | Relation |
|---------------|----------|
| **XXE (XML External Entity)** | Peut être combinée avec la traversée de répertoires pour lire les fichiers XML |
| **LFI (Local File Inclusion)** | Vulnérabilité PHP/ASP similaire à la traversée de répertoires |
| **Divulgation d'informations** | La traversée de répertoires est une source commune de fuite d'informations sensibles |
| **Contournement d'authentification** | Peut exposer les fichiers de mot de passe ou le stockage des sessions |

---

## Références

- [CWE-22 : Traversée de répertoires](https://cwe.mitre.org/data/definitions/22.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP Testing for Path Traversal](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/01-Testing_Directory_Traversal_File_Include)
- [Documentation du chemin Node.js](https://nodejs.org/api/path.html)
- [PortSwigger Path Traversal](https://portswigger.net/web-security/file-path-traversal)

---

## Dans ce projet éducatif

### Fichiers impliqués

- **Vulnérable** : [src/lib/file-repository.ts](../src/lib/file-repository.ts) - `VulnerableFileRepository`
- **Sécurisé** : [src/lib/file-repository.ts](../src/lib/file-repository.ts) - `SecureFileRepository`
- **Routes** : [src/lib/app.ts](../src/lib/app.ts) - `GET /files/:filename`, `GET /secure-files/:filename`
- **Tests** : [src/test/path-traversal.test.ts](../src/test/path-traversal.test.ts)

### Exécution des tests

```bash
# Exécuter tous les tests de traversée de répertoires
npm test -- --grep "Path Traversal"

# Exécuter uniquement les tests vulnérables
npm test -- --grep "VulnerableFileRepository"

# Exécuter uniquement les tests sécurisés
npm test -- --grep "SecureFileRepository"
```

### Points de terminaison API

**Vulnérable** (à des fins éducatives) :
```
GET /files/readme.txt              → ✅ OK
GET /files/../package.json         → ❌ VULNÉRABLE - Expose le fichier
GET /files/../../CLAUDE.md         → ❌ VULNÉRABLE - Expose le fichier
```

**Sécurisé** :
```
GET /secure-files/readme.txt       → ✅ OK
GET /secure-files/../package.json  → ✅ BLOQUÉ - Retourne 404
GET /secure-files/../../CLAUDE.md  → ✅ BLOQUÉ - Retourne 404
```

Consultez la documentation Swagger à `http://localhost:3000/api-docs` pour un test interactif.
