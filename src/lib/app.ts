import express, { type RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { type MessageRepository } from './message-repository.js';
import { swaggerSpec } from './swagger.js';

export function createApp(messageRepository: MessageRepository) {
  const app = express();

  const listMessagesHandler: RequestHandler = (_req, res) => {
    const messages = messageRepository.listMessages();
    res.json(messages);
  };

  const getMessageHandler: RequestHandler = (req, res) => {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({ error: 'paramètre id requis' });
      return;
    }

    const message = messageRepository.findMessageById(id);

    if (!message) {
      res.status(404).json({ error: 'Message non trouvé' });
      return;
    }

    res.json(message);
  };

  const createMessageHandler: RequestHandler = (req, res) => {
    const bodyValue = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!bodyValue) {
      res.status(400).json({ error: 'Le corps du message est requis.' });
      return;
    }

    const message = messageRepository.insertMessage(bodyValue);
    if (message === undefined) {
      res.status(500).json({ error: 'Échec de la création du message.' });
      return;
    }
    res.status(201).json(message);
  };

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Pour parser les formulaires

  /**
   * Route principale - Affiche la page web avec les messages
   * VULNÉRABLE AU XSS : Le contenu des messages est injecté directement dans le HTML
   */
  const homeHandler: RequestHandler = (_req, res) => {
    const messages = messageRepository.listMessages();

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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  };

  /**
   * Route POST / - Traite le formulaire de création de message
   */
  const homePostHandler: RequestHandler = (req, res) => {
    let bodyValue: string = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

    if (!bodyValue) {
      res.redirect('/');
      return;
    }
    if (messageRepository.constructor.name === 'VulnerableMessageRepository') {
      // Injection SQL vulnérable
      bodyValue = bodyValue.replaceAll("'", "''"); // Échappement simple pour l'injection SQL
    }
    messageRepository.insertMessage(bodyValue);
    res.redirect('/');
  };

  app.get('/', homeHandler);
  app.post('/', homePostHandler);

  // Documentation Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
  }));

  // Route pour obtenir le spec JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  /**
   * @openapi
   * /messages:
   *   get:
   *     summary: Liste tous les messages
   *     description: Retourne tous les messages du plus récent au plus ancien. Cet endpoint utilise des requêtes paramétrées et est **sécurisé**.
   *     tags:
   *       - Messages
   *     responses:
   *       200:
   *         description: Liste des messages
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                     description: ID unique du message
   *                     example: 1
   *                   body:
   *                     type: string
   *                     description: Contenu du message
   *                     example: "Bonjour le monde"
   *                   created_at:
   *                     type: string
   *                     format: date-time
   *                     description: Date de création (ISO 8601)
   *                     example: "2025-01-15T10:30:00.000Z"
   */
  app.get('/messages', listMessagesHandler);

  /**
   * @openapi
   * /messages/{id}:
   *   get:
   *     summary: Récupère un message par ID
   *     description: |
   *       ⚠️ **VULNÉRABLE À L'INJECTION SQL** - À des fins pédagogiques uniquement.
   *
   *       Cet endpoint utilise la concaténation de chaînes au lieu de requêtes paramétrées.
   *
   *       **Exemples d'injection :**
   *       - `1 OR 1=1` - Retourne le premier message
   *       - `1 UNION SELECT id, body, created_at FROM messages` - Extraction de données
   *     tags:
   *       - Messages
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID du message (vulnérable à l'injection SQL)
   *         example: "1"
   *     responses:
   *       200:
   *         description: Message trouvé
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: integer
   *                   example: 1
   *                 body:
   *                   type: string
   *                   example: "Bonjour le monde"
   *                 created_at:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-01-15T10:30:00.000Z"
   *       404:
   *         description: Message non trouvé
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Message non trouvé"
   *       400:
   *         description: Paramètre ID manquant
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "paramètre id requis"
   */
  app.get('/messages/:id', getMessageHandler);

  /**
   * @openapi
   * /messages:
   *   post:
   *     summary: Crée un nouveau message
   *     description: |
   *       ⚠️ **VULNÉRABLE À L'INJECTION SQL** - À des fins pédagogiques uniquement.
   *
   *       Cet endpoint utilise la concaténation de chaînes au lieu de requêtes paramétrées.
   *
   *       **Exemples d'injection :**
   *       - `'); DELETE FROM messages; --` - Supprime tous les messages
   *     tags:
   *       - Messages
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - body
   *             properties:
   *               body:
   *                 type: string
   *                 description: Contenu du message (vulnérable à l'injection SQL)
   *                 example: "Mon nouveau message"
   *     responses:
   *       201:
   *         description: Message créé avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: integer
   *                   example: 42
   *                 body:
   *                   type: string
   *                   example: "Mon nouveau message"
   *                 created_at:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-01-15T10:30:00.000Z"
   *       400:
   *         description: Corps du message manquant ou vide
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Le corps du message est requis."
   *       500:
   *         description: Erreur lors de la création du message
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Échec de la création du message."
   */
  app.post('/messages', createMessageHandler);

  return app;
}
