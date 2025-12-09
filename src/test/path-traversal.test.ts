import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { VulnerableFileRepository, SecureFileRepository } from '../lib/file-repository.js';

const publicDir = path.resolve('./public');

test('Path Traversal Vulnerability - VulnerableFileRepository (Direct)', async (t) => {
  const fileRepository = new VulnerableFileRepository(publicDir);

  await t.test('Direct: getFile() returns file content for valid filenames', async () => {
    // Test de fonctionnement normal : accès légitime à un fichier public
    const file = fileRepository.getFile('readme.txt');
    assert(file !== undefined);
    assert(file.content.includes('Public File Example'));
  });

  await t.test('Direct: getFile() returns nested file from subdirectory', async () => {
    // Test de fonctionnement normal : accès à un fichier dans un sous-répertoire
    const file = fileRepository.getFile('data/secret.txt');
    assert(file !== undefined);
    assert(file.content.includes('Secret Data'));
  });

  await t.test('Direct: getFile() returns undefined for non-existent files', async () => {
    // Test de validation : s'assurer que les fichiers inexistants retournent undefined
    const file = fileRepository.getFile('nonexistent.txt');
    assert(file === undefined);
  });

  await t.test('Direct: getFile() is VULNERABLE to classic path traversal ../', async () => {
    // DÉMONSTRATION D'ATTAQUE #1 : Traversée de répertoires classique
    //
    // Cette attaque exploite VulnerableFileRepository qui construit directement le chemin
    // avec path.join(baseDir, filename), où filename peut contenir "../"
    //
    // Attack payload : "../package.json"
    // Chemin résultant : /public/../package.json → /package.json
    // Impact : L'attaquant accède à des fichiers en dehors du répertoire public
    const file = fileRepository.getFile('../package.json');
    assert(file !== undefined);
    assert(file.content.includes('"type": "module"'));
  });

  await t.test('Direct: getFile() is VULNERABLE to multiple directory traversal sequences', async () => {
    // DÉMONSTRATION D'ATTAQUE #2 : Séquences multiples de "../"
    //
    // Un attaquant peut enchaîner plusieurs "../" pour remonter plus haut dans l'arborescence.
    // Cette attaque utilise une série de ".." pour accéder à des fichiers en dehors du répertoire public.
    //
    // Attack payload : "../CLAUDE.md" (same level as package.json)
    // Chemin résultant : /public/../CLAUDE.md → /CLAUDE.md
    const file = fileRepository.getFile('../CLAUDE.md');
    assert(file !== undefined);
    assert(file.content.includes('CLAUDE.md'));
  });

  await t.test('Direct: getFile() is VULNERABLE to accessing TSCONFIG.JSON', async () => {
    // DÉMONSTRATION D'ATTAQUE #3 : Accès à des fichiers sensibles du projet
    //
    // Un attaquant peut explorer le système de fichiers du serveur
    // et accéder à des fichiers sensibles comme tsconfig.json
    const file = fileRepository.getFile('../tsconfig.json');
    assert(file !== undefined);
    assert(file.content.includes('compilerOptions'));
  });

  await t.test('Direct: getFile() is VULNERABLE to accessing CLAUDE.md', async () => {
    // DÉMONSTRATION D'ATTAQUE #4 : Accès aux fichiers de documentation/configuration
    //
    // L'attaquant peut accéder à CLAUDE.md qui contient potentiellement
    // des informations sensibles sur l'architecture du projet
    const file = fileRepository.getFile('../CLAUDE.md');
    assert(file !== undefined);
    assert(file.content.includes('CLAUDE.md'));
  });
});

test('Path Traversal Protection - SecureFileRepository (Direct)', async (t) => {
  const fileRepository = new SecureFileRepository(publicDir);

  await t.test('Secure: getFile() returns file content for valid filenames', async () => {
    // Test de fonctionnement normal : accès légitime à un fichier public
    const file = fileRepository.getFile('readme.txt');
    assert(file !== undefined);
    assert(file.content.includes('Public File Example'));
  });

  await t.test('Secure: getFile() returns nested file from subdirectory', async () => {
    // Test de fonctionnement normal : accès à un fichier dans un sous-répertoire
    const file = fileRepository.getFile('data/secret.txt');
    assert(file !== undefined);
    assert(file.content.includes('Secret Data'));
  });

  await t.test('Secure: getFile() returns undefined for non-existent files', async () => {
    // Test de validation : fichiers inexistants retournent undefined
    const file = fileRepository.getFile('nonexistent.txt');
    assert(file === undefined);
  });

  await t.test('Secure: getFile() BLOCKS classic path traversal ../', async () => {
    // PROTECTION #1 : Blocage de la traversée de répertoires classique
    //
    // SecureFileRepository utilise path.resolve() pour normaliser le chemin,
    // puis vérifie que le chemin résolu reste dans le répertoire autorisé.
    //
    // Payload d'attaque : "../package.json"
    // Chemin résolu : /package.json
    // Vérification : /package.json n'est pas dans /public → REJETÉ
    const file = fileRepository.getFile('../package.json');
    assert(file === undefined);
  });

  await t.test('Secure: getFile() BLOCKS multiple directory traversal sequences', async () => {
    // PROTECTION #2 : Blocage de séquences multiples
    //
    // Payload d'attaque : "../CLAUDE.md"
    // Résultat : Toujours bloqué car sort du répertoire autorisé
    const file = fileRepository.getFile('../CLAUDE.md');
    assert(file === undefined);
  });

  await t.test('Secure: getFile() BLOCKS access to project files', async () => {
    // PROTECTION #3 : Blocage complet de l'accès aux fichiers projet sensibles
    //
    // Payload d'attaque : "../tsconfig.json"
    // Résultat : Accès refusé
    const file = fileRepository.getFile('../tsconfig.json');
    assert(file === undefined);
  });

  await t.test('Secure: getFile() BLOCKS access to documentation', async () => {
    // PROTECTION #4 : Blocage de l'accès aux fichiers de documentation
    //
    // Payload d'attaque : "../CLAUDE.md"
    // Résultat : Accès refusé
    const file = fileRepository.getFile('../CLAUDE.md');
    assert(file === undefined);
  });

  await t.test('Secure: getFile() allows legitimate subdirectory access', async () => {
    // Test de régression : Les chemins légitimes fonctionnent toujours
    //
    // Payload valide : "data/secret.txt"
    // Chemin résolu : /public/data/secret.txt
    // Vérification : Reste dans /public → ACCEPTÉ
    const file = fileRepository.getFile('data/secret.txt');
    assert(file !== undefined);
    assert(file.content.includes('Secret Data'));
  });
});
