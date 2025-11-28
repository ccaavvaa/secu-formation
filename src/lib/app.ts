import express, { type RequestHandler } from 'express';
import { type MessageRepository } from './message-repository.js';

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
  app.get('/messages', listMessagesHandler);
  app.get('/messages/:id', getMessageHandler);
  app.post('/messages', createMessageHandler);

  return app;
}
