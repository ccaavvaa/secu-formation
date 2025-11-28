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
    if(message === undefined) {
      res.status(500).json({ error: 'Échec de la création du message.' });
      return;
    }
    res.status(201).json(message);
  };

  app.use(express.json());

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
