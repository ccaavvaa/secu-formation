# Path Traversal (Directory Traversal) Vulnerability

## Overview

**Path Traversal** (also known as **Directory Traversal**) is a web vulnerability that allows attackers to access files outside an intended directory on the server. By manipulating file path parameters, an attacker can escape the confined directory and read sensitive files or configuration data.

**CVSS Score**: 5.3 (Medium)
**CWE-22**: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')
**OWASP**: A01:2021 – Broken Access Control

---

## Vulnerability Mechanics

### How Path Traversal Works

When an application constructs file paths by directly concatenating user input without proper validation:

```typescript
// ❌ VULNERABLE
const filePath = path.join(publicDir, userInput);
const content = readFileSync(filePath);
```

An attacker can use sequences like `../` to traverse up the directory tree:

```
publicDir: /var/www/app/public
userInput: ../../etc/passwd

Result: /var/www/app/public/../../etc/passwd
After normalization: /var/www/etc/passwd or /etc/passwd
```

### Attack Variants

1. **Classic Traversal**
   - `../` (POSIX/Unix)
   - `..\` (Windows)
   - Multiple sequences: `../../../../etc/passwd`

2. **URL Encoding Bypass**
   - `%2e%2e%2f` → `../`
   - `%2e%2e/` → `../`
   - Double encoding: `%252e%252e%252f` → `%2e%2e%2f` → `../`

3. **Double-Dot Bypass**
   - `....//....//etc/passwd` (exploits some naive filters that strip `..|)
   - `..%252f..%252fetc%252fpasswd`

4. **Backslash Exploitation** (cross-platform)
   - `..\ ` (Windows path separator)
   - Mixed separators on systems that accept both

5. **Null Byte Injection** (older systems)
   - `file.txt%00.jpg` (bypassed file extension checks)
   - Modern systems reject null bytes

6. **Unicode Normalization**
   - Alternative Unicode representations of `/` or `.`
   - System-dependent behavior

---

## Vulnerable Code Example

### In This Project

**File**: [src/lib/file-repository.ts:31-45](../src/lib/file-repository.ts#L31-L45)

```typescript
export class VulnerableFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  getFile(filename: string): FileContent | undefined {
    try {
      // ❌ VULNERABLE: Direct concatenation without validation
      const filePath = path.join(this.baseDir, filename);
      const content = readFileSync(filePath, 'utf-8');
      return { filename, content };
    } catch {
      return undefined;
    }
  }
}
```

### Attack Demonstrations

```bash
# Get a file in the public directory (legitimate)
curl http://localhost:3000/files/readme.txt

# Traverse to parent directory (ATTACK)
curl http://localhost:3000/files/../package.json

# Multiple traversals (ATTACK)
curl http://localhost:3000/files/../../CLAUDE.md

# URL-encoded traversal (ATTACK)
curl http://localhost:3000/files/%2e%2e/tsconfig.json

# Windows-style backslash (ATTACK)
curl http://localhost:3000/files/..\\package.json
```

### Impact

- **Information Disclosure**: Read sensitive files (config, source code, credentials)
- **Authentication Bypass**: Access password files or session tokens
- **System Reconnaissance**: Enumerate directory structure (`/etc/passwd`, `/etc/hosts`)
- **Compliance Violations**: GDPR, PCI-DSS (unauthorized file access)

### Real-World Examples

| Attack | Target | Consequence |
|--------|--------|-------------|
| `/admin/download.php?file=../../../../etc/passwd` | Linux `/etc/passwd` | User list exposed |
| `/getfile?filename=../../web.config` | IIS configuration | Database credentials leaked |
| `/documents?id=../../../.env` | Environment file | API keys exposed |
| `/image?src=../../../../../../windows/win.ini` | System file | System info disclosed |

---

## Secure Code Implementation

### Solution 1: Path Validation (Recommended)

**File**: [src/lib/file-repository.ts:61-84](../src/lib/file-repository.ts#L61-L84)

```typescript
export class SecureFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  getFile(filename: string): FileContent | undefined {
    try {
      const baseDirResolved = path.resolve(this.baseDir);
      const requestedPath = path.resolve(this.baseDir, filename);

      // ✅ SECURE: Verify the resolved path stays within baseDir
      if (
        !requestedPath.startsWith(baseDirResolved + path.sep) &&
        requestedPath !== baseDirResolved
      ) {
        // Path traversal attempt detected
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

### How It Works

1. **`path.resolve(baseDir)`** - Get absolute, normalized path of allowed directory
2. **`path.resolve(baseDir, filename)`** - Resolve user input to absolute path (normalizes `..` and `.`)
3. **Comparison** - Check that resolved path starts with base directory
4. **Guard**: Reject any path that escapes the directory

### Testing the Protection

```bash
# Legitimate access (works)
curl http://localhost:3000/secure-files/readme.txt

# Traversal attempt (blocked, returns 404)
curl http://localhost:3000/secure-files/../package.json

# URL-encoded traversal (blocked)
curl http://localhost:3000/secure-files/%2e%2e/tsconfig.json

# Multiple traversals (blocked)
curl http://localhost:3000/secure-files/../../CLAUDE.md
```

### Solution 2: Whitelist Approach

If only specific files should be accessible:

```typescript
const ALLOWED_FILES = ['readme.txt', 'help.txt', 'license.txt'];

getFile(filename: string): FileContent | undefined {
  if (!ALLOWED_FILES.includes(filename)) {
    return undefined; // Whitelist rejection
  }
  // Then read the file from a safe directory
  const content = readFileSync(path.join(this.baseDir, filename), 'utf-8');
  return { filename, content };
}
```

### Solution 3: Avoid Dynamic File Serving

Instead of serving files dynamically, use static file middleware:

```typescript
// Express static middleware is inherently safe
app.use(express.static('public')); // Automatically prevents traversal
```

---

## Testing Path Traversal

### Manual Testing

```bash
# Start the server
npm start

# Test vulnerable endpoint with various payloads
curl http://localhost:3000/files/readme.txt                    # OK
curl http://localhost:3000/files/../package.json               # ❌ VULNERABLE
curl http://localhost:3000/files/..%2fpackage.json             # ❌ VULNERABLE
curl http://localhost:3000/files/....//....//package.json      # ❌ VULNERABLE

# Test secure endpoint (should all return 404)
curl http://localhost:3000/secure-files/readme.txt             # OK
curl http://localhost:3000/secure-files/../package.json        # ✅ BLOCKED
curl http://localhost:3000/secure-files/..%2fpackage.json      # ✅ BLOCKED
```

### Automated Testing

```bash
# Run the path traversal test suite
npm test -- --grep "Path Traversal"
```

Tests cover:
- Normal file access
- Classic `../` sequences
- Multiple traversal levels
- URL encoding variants
- Backslash exploitation
- Absolute path attempts
- Subdirectory access regression

---

## Best Practices

### ✅ DO

- ✅ Use `path.resolve()` to normalize paths
- ✅ Verify resolved path stays within allowed directory
- ✅ Use absolute paths for comparisons
- ✅ Implement whitelist validation if applicable
- ✅ Use HTTP status 403 Forbidden for rejected traversal attempts
- ✅ Log all path traversal attempts for security monitoring
- ✅ Keep directory permissions restrictive (chmod 755)
- ✅ Use frameworks' built-in static file handlers

### ❌ DON'T

- ❌ Trust user input for file paths
- ❌ Use string concatenation to build paths
- ❌ Assume URL decoding prevents attacks
- ❌ Rely on filtering `..` (easy to bypass with encoding)
- ❌ Serve entire filesystem with user-controlled paths
- ❌ Ignore symlinks to parent directories
- ❌ Use dynamic path construction without validation
- ❌ Disable logging for security events

---

## Framework-Specific Protection

### Express.js (Recommended)

```typescript
// ✅ SAFE: Built-in static middleware
import express from 'express';
const app = express();

app.use(express.static('public')); // Automatically safe

// ✅ SAFE: Manual validation
import path from 'path';
import { readFileSync } from 'fs';

app.get('/file/:name', (req, res) => {
  const baseDir = path.resolve('./public');
  const fullPath = path.resolve(baseDir, req.params.name);

  if (!fullPath.startsWith(baseDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.sendFile(fullPath);
});
```

### Node.js Security Headers

```typescript
// Add security headers to prevent cached exploits
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  next();
});
```

---

## Related Vulnerabilities

| Vulnerability | Relationship |
|---------------|--------------|
| **XXE (XML External Entity)** | Can combine with path traversal to read XML files |
| **LFI (Local File Inclusion)** | PHP/ASP vulnerability similar to path traversal |
| **Information Disclosure** | Path traversal is a common source of sensitive info leak |
| **Authentication Bypass** | May expose password files or session storage |

---

## References

- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP Testing for Path Traversal](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/01-Testing_Directory_Traversal_File_Include)
- [Node.js Path Documentation](https://nodejs.org/api/path.html)
- [PortSwigger Path Traversal](https://portswigger.net/web-security/file-path-traversal)

---

## In This Educational Project

### Files Involved

- **Vulnerable**: [src/lib/file-repository.ts](../src/lib/file-repository.ts) - `VulnerableFileRepository`
- **Secure**: [src/lib/file-repository.ts](../src/lib/file-repository.ts) - `SecureFileRepository`
- **Routes**: [src/lib/app.ts](../src/lib/app.ts) - `GET /files/:filename`, `GET /secure-files/:filename`
- **Tests**: [src/test/path-traversal.test.ts](../src/test/path-traversal.test.ts)

### Running Tests

```bash
# Run all path traversal tests
npm test -- --grep "Path Traversal"

# Run vulnerable tests only
npm test -- --grep "VulnerableFileRepository"

# Run secure tests only
npm test -- --grep "SecureFileRepository"
```

### API Endpoints

**Vulnerable** (for educational purposes):
```
GET /files/readme.txt              → ✅ OK
GET /files/../package.json         → ❌ VULNERABLE - Exposes file
GET /files/../../CLAUDE.md         → ❌ VULNERABLE - Exposes file
```

**Secure**:
```
GET /secure-files/readme.txt       → ✅ OK
GET /secure-files/../package.json  → ✅ BLOCKED - Returns 404
GET /secure-files/../../CLAUDE.md  → ✅ BLOCKED - Returns 404
```

See the Swagger documentation at `http://localhost:3000/api-docs` for interactive testing.
