import type { Message } from './message-repository.js';
import { loadTemplate } from './template-loader.js';

/**
 * Échappe les caractères HTML spéciaux pour éviter les injections XSS.
 * Convertit les caractères dangereux en entités HTML.
 *
 * @param text - Texte à échapper
 * @returns Texte avec caractères HTML échappés
 */
function escapeHtml(text: string | number): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char] ?? char);
}

/**
 * Génère la page HTML complète avec les messages.
 *
 * ⚠️ VULNÉRABILITÉ XSS INTENTIONNELLE :
 * Cette fonction injecte directement le contenu des messages dans le HTML
 * sans échappement. Le contenu utilisateur peut contenir du JavaScript qui
 * s'exécutera dans le navigateur. C'est une démonstration pédagogique des
 * risques du Cross-Site Scripting (XSS).
 *
 * Pour voir la vulnérabilité en action, consultez src/test/xss.test.ts
 *
 * @param messages - Liste des messages à afficher
 * @returns HTML complet de la page
 */
export async function generateHomePage(messages: Message[]): Promise<string> {
  // VULNÉRABILITÉ XSS INTENTIONNELLE :
  // Les messages sont concaténés directement dans le HTML sans échappement
  const messagesHtml = messages.map(msg => `
      <div class="message-item">
        <div class="message-id">Message #${msg.id}</div>
        <div class="message-body">${msg.body}</div>
      </div>
    `).join('');

  const emptyState = '<div class="empty-state">Aucun message pour le moment. Soyez le premier à en envoyer un !</div>';
  const messagesContent = messages.length === 0 ? emptyState : messagesHtml;

  // Charger le template et injecter le contenu des messages
  const template = await loadTemplate();
  return template.replace('{{MESSAGES_PLACEHOLDER}}', messagesContent);
}

/**
 * Génère une page HTML sécurisée avec protection XSS.
 *
 * ✅ BONNES PRATIQUES DE SÉCURITÉ :
 * - Tous les contenus utilisateurs sont échappés avec escapeHtml()
 * - Utilise un template sécurisé avec Content Security Policy (CSP)
 * - Ajoute des headers de sécurité additionnels
 * - Neutralise les tentatives d'injection HTML/JavaScript
 *
 * @param messages - Liste des messages à afficher
 * @returns HTML complet de la page sécurisée
 */
export async function generateSecureHomePage(messages: Message[]): Promise<string> {
  // ✅ SÉCURISÉ :
  // Les messages sont échappés avant d'être injectés dans le HTML
  const messagesHtml = messages.map(msg => `
      <div class="message-item">
        <div class="message-id">Message #${escapeHtml(String(msg.id))}</div>
        <div class="message-body">${escapeHtml(msg.body)}</div>
      </div>
    `).join('');

  const emptyState = '<div class="empty-state">Aucun message pour le moment. Soyez le premier à en envoyer un !</div>';
  const messagesContent = messages.length === 0 ? emptyState : messagesHtml;

  // Charger le template sécurisé et injecter le contenu des messages
  const templateContent = await loadTemplate('index-secure.html');
  return templateContent.replace('{{MESSAGES_PLACEHOLDER}}', messagesContent);
}
