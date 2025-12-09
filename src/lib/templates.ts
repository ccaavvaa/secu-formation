import type { Message } from './message-repository.js';

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
export function generateHomePage(messages: Message[]): string {
  // VULNÉRABILITÉ XSS INTENTIONNELLE :
  // Les messages sont concaténés directement dans le HTML sans échappement
  const messagesHtml = messages.map(msg => `
      <div class="message-item">
        <div class="message-id">Message #${msg.id}</div>
        <div class="message-body">${msg.body}</div>
      </div>
    `).join('');

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Messages - Démonstration XSS</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .warning-banner {
      background: #ff6b6b;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      border-left: 4px solid #c92a2a;
    }

    .warning-banner h2 {
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    .warning-banner p {
      font-size: 0.9rem;
      opacity: 0.95;
    }

    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 2rem;
      margin-bottom: 2rem;
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 1.5rem;
      font-size: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      color: #555;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-family: inherit;
      font-size: 1rem;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.3s;
    }

    textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    .messages-list {
      margin-top: 2rem;
    }

    .message-item {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 4px;
      transition: transform 0.2s;
    }

    .message-item:hover {
      transform: translateX(4px);
    }

    .message-id {
      color: #999;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    .message-body {
      color: #2c3e50;
      line-height: 1.6;
      word-wrap: break-word;
    }

    .empty-state {
      text-align: center;
      color: #999;
      padding: 3rem 0;
      font-style: italic;
    }

    code {
      background: #2c3e50;
      color: #a6e22e;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="warning-banner">
      <h2>⚠️ ATTENTION : Application Vulnérable au XSS</h2>
      <p>
        Cette application contient <strong>intentionnellement</strong> une vulnérabilité de type
        Cross-Site Scripting (XSS) à des fins pédagogiques. N'utilisez JAMAIS ce code en production.
      </p>
      <p style="margin-top: 0.5rem;">
        Essayez d'injecter du JavaScript, par exemple : <code>&lt;script&gt;alert('XSS')&lt;/script&gt;</code>
      </p>
    </div>

    <div class="card">
      <h1>💬 Messagerie</h1>

      <form method="POST" action="/">
        <div class="form-group">
          <label for="message-body">Votre message :</label>
          <textarea
            id="message-body"
            name="body"
            placeholder="Écrivez votre message ici... ou tentez une injection XSS 😈"
            required
          ></textarea>
        </div>
        <button type="submit">Envoyer le message</button>
      </form>

      <div class="messages-list">
        <h2 style="color: #2c3e50; margin-bottom: 1rem;">Messages récents</h2>
        <div id="messages-container">
          ${messages.length === 0 ? '<div class="empty-state">Aucun message pour le moment. Soyez le premier à en envoyer un !</div>' : messagesHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}
