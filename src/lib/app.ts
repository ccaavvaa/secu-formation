import express, { type RequestHandler } from 'express';
import { findMessageById, insertMessage, listMessages } from './database.js';

export const listMessagesHandler: RequestHandler = (_req, res) => {
  const messages = listMessages();
  res.json(messages);
};

export const getMessageHandler: RequestHandler = (req, res) => {
  const { id } = req.params;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'id param required' });
    return;
  }

  const message = findMessageById(id);

  if (!message) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json(message);
};

export const createMessageHandler: RequestHandler = (req, res) => {
  const bodyValue = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

  if (!bodyValue) {
    res.status(400).json({ error: 'Message body is required.' });
    return;
  }

  const message = insertMessage(bodyValue);
  if(message === undefined) {
    res.status(500).json({ error: 'Failed to create message.' });
    return;
  }
  res.status(201).json(message);
};

export function createApp() {
  const app = express();

  app.use(express.json());
  app.get('/messages', listMessagesHandler);
  app.get('/messages/:id', getMessageHandler);
  app.post('/messages', createMessageHandler);

  return app;
}
