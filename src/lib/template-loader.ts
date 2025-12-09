import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const cachedTemplates: Map<string, string> = new Map();

/**
 * Charge le template HTML de manière asynchrone et le met en cache.
 * En développement, relance la lecture à chaque fois pour pouvoir modifier le fichier.
 * En production (dist), utilise le cache pour les performances.
 *
 * @param templateName - Nom du template à charger (défaut: 'index.html')
 * @returns Le contenu du fichier template HTML
 */
export async function loadTemplate(templateName: string = 'index.html'): Promise<string> {
  // En développement, toujours relire (fichier source)
  const isDev = import.meta.url.includes('/src/');

  if (!isDev && cachedTemplates.has(templateName)) {
    return cachedTemplates.get(templateName)!;
  }

  // Construire le chemin vers le template
  // En développement : src/templates/{templateName}
  // En production : dist/templates/{templateName}
  const templatePath = join(__dirname, `../templates/${templateName}`);

  try {
    const content = await readFile(templatePath, 'utf-8');
    if (!isDev) {
      cachedTemplates.set(templateName, content);
    }
    return content;
  } catch (error) {
    throw new Error(`Erreur lors du chargement du template '${templateName}': ${error instanceof Error ? error.message : String(error)}`);
  }
}
