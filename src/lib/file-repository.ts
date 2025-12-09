import { readFileSync } from 'node:fs';
import path from 'node:path';

export type FileContent = {
  filename: string;
  content: string;
};

/**
 * Interface définissant les opérations de serveur de fichiers.
 * Permet d'avoir différentes implémentations (vulnérable vs sécurisée).
 */
export interface FileRepository {
  /**
   * Récupère un fichier par son nom.
   * @param filename - Le nom du fichier à servir
   * @returns Le contenu du fichier ou undefined si non trouvé
   * @throws Error si l'accès au fichier échoue
   */
  getFile(filename: string): FileContent | undefined;
}

/**
 * Implémentation VULNÉRABLE utilisant la concaténation directe de chemins.
 * ⚠️ ATTENTION : Cette implémentation contient une vulnérabilité de traversée de répertoires
 * (path traversal / directory traversal) intentionnelle à des fins pédagogiques.
 * NE PAS UTILISER EN PRODUCTION.
 *
 * Un attaquant peut utiliser des séquences comme `../` pour accéder à des fichiers
 * en dehors du répertoire public prévu.
 */
export class VulnerableFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  /**
   * ⚠️ VULNÉRABLE À LA TRAVERSÉE DE RÉPERTOIRES
   * Ligne vulnérable : construit le chemin directement sans validation.
   * Exemple d'attaque : filename = "../../../package.json"
   * Résultat : Accès à des fichiers en dehors du répertoire public
   *
   * Autres variantes d'attaque :
   * - URL-encoded : "../" → "%2e%2e%2f" ou "%2e%2e/"
   * - Double-encoded : "%252e%252e%252f"
   * - Backslash (Windows) : "..\"
   * - Double-dot : "....//....//etc/passwd"
   * - Absolute paths : "/etc/passwd"
   * - Encoded slashes : "..%2fetc%2fpasswd"
   */
  getFile(filename: string): FileContent | undefined {
    try {
      const filePath = path.join(this.baseDir, filename);
      const content = readFileSync(filePath, 'utf-8');
      return {
        filename,
        content,
      };
    } catch {
      return undefined;
    }
  }
}

/**
 * Implémentation SÉCURISÉE utilisant la validation et la normalisation des chemins.
 * ✅ Cette implémentation protège contre les traversées de répertoires en vérifiant
 * que le chemin résolu reste dans le répertoire autorisé.
 */
export class SecureFileRepository implements FileRepository {
  constructor(private baseDir: string) {}

  /**
   * ✅ SÉCURISÉ : Valide que le chemin résolu reste dans le répertoire autorisé.
   *
   * Mécanismes de sécurité :
   * 1. path.resolve() - Résout tous les ".." et "." en chemin absolu
   * 2. Vérification que le chemin résolu commence par le répertoire autorisé
   * 3. Rejet si le chemin s'échappe du répertoire de base
   *
   * Cette approche bloque toutes les variantes d'attaque :
   * - "../../../package.json" → Détecté comme sortie du répertoire
   * - URL-encoded sequences → D'abord décodées par Node.js, puis validées
   * - Absolute paths → Comparaison échoue
   */
  getFile(filename: string): FileContent | undefined {
    try {
      const baseDirResolved = path.resolve(this.baseDir);
      const requestedPath = path.resolve(this.baseDir, filename);

      // Vérification critique : s'assurer que le chemin reste dans le répertoire autorisé
      // accepte le fichier si le chemin commence par baseDir/ ou est exactement baseDir
      const isInBaseDir =
        requestedPath.startsWith(baseDirResolved + path.sep) || requestedPath === baseDirResolved;

      if (!isInBaseDir) {
        // Path traversal attempt detected
        return undefined;
      }

      const content = readFileSync(requestedPath, 'utf-8');
      return {
        filename,
        content,
      };
    } catch {
      return undefined;
    }
  }
}
