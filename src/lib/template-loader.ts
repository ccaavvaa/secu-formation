import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let cachedTemplate: string | null = null;

/**
 * Charge le template HTML de manière asynchrone et le met en cache.
 * En développement, relance la lecture à chaque fois pour pouvoir modifier le fichier.
 * En production (dist), utilise le cache pour les performances.
 *
 * @returns Le contenu du fichier template HTML
 */
export async function loadTemplate(): Promise<string> {
  // En développement, toujours relire (fichier source)
  const isDev = import.meta.url.includes('/src/');

  if (!isDev && cachedTemplate) {
    return cachedTemplate;
  }

  // Construire le chemin vers le template
  // En développement : src/templates/index.html
  // En production : dist/templates/index.html
  const templatePath = join(__dirname, isDev ? '../templates/index.html' : '../templates/index.html');

  try {
    const content = await readFile(templatePath, 'utf-8');
    if (!isDev) {
      cachedTemplate = content;
    }
    return content;
  } catch (error) {
    throw new Error(`Erreur lors du chargement du template: ${error instanceof Error ? error.message : String(error)}`);
  }
}
