import express, { type RequestHandler } from 'express';
import { HelloWorld } from './HelloWorld.js';

const helloWorld = new HelloWorld();

export const helloRouteHandler: RequestHandler = (_req, res) => {
  res.json({ message: helloWorld.sayHello() });
};

export const healthRouteHandler: RequestHandler = (_req, res) => {
  res.json({ status: 'ok' });
};

export function createApp() {
  const app = express();

  app.use(express.json());
  app.get('/', helloRouteHandler);
  app.get('/health', healthRouteHandler);

  return app;
}
