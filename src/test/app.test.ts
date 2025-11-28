import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMessageHandler,
  getMessageHandler,
  listMessagesHandler,
} from '../lib/app.js';
import { clearMessages, type Message } from '../lib/database.js';

process.env.SQLITE_DB_PATH = ':memory:';

const noop = () => {};

type MockResponse<T> = {
  statusCode: number;
  jsonPayload: T | undefined;
  status(code: number): MockResponse<T>;
  json(payload: T): MockResponse<T>;
};

type ErrorPayload = { error: string };

test('Gestionnaire POST /messages', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('persiste le corps nettoyé et retourne le payload', () => {
    const response = invokeCreate('   Message de test   ');

    assert.equal(response.statusCode, 201);
    assert(response.jsonPayload);
    assert.equal(response.jsonPayload?.body, 'Message de test');
    assert.equal(typeof response.jsonPayload?.id, 'number');
  });

  await t.test('rejette les payloads manquants ou vides', () => {
    const emptyResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({ body: '' }) as never, emptyResponse as never, noop);
    assert.equal(emptyResponse.statusCode, 400);
    assert.deepEqual(emptyResponse.jsonPayload, { error: 'Le corps du message est requis.' });

    const missingResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({}) as never, missingResponse as never, noop);
    assert.equal(missingResponse.statusCode, 400);
    assert.deepEqual(missingResponse.jsonPayload, { error: 'Le corps du message est requis.' });
  });

  await t.test('le payload d\'injection efface les messages existants', () => {
    invokeCreate('Premier message sûr');

    const maliciousBody = `'); DELETE FROM messages; --`;
    const injectionResponse = invokeCreate(maliciousBody);

    assert.equal(injectionResponse.statusCode, 500);

    const listResponse = invokeList();
    assert.equal(listResponse.statusCode, 200);
    assert(Array.isArray(listResponse.jsonPayload));
    assert.equal(listResponse.jsonPayload?.length, 0);
  });
});

test('Gestionnaire GET /messages', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('retourne les messages stockés', () => {
    invokeCreate('Stocké');

    const response = invokeList();

    assert.equal(response.statusCode, 200);
    assert(Array.isArray(response.jsonPayload));
    assert.equal(response.jsonPayload?.length, 1);
    const message = response.jsonPayload?.[0];
    assert.equal(message.body, 'Stocké');
    assert.equal(typeof message.id, 'number');
    assert.equal(typeof message.createdAt, 'string');
  });
});

test('Gestionnaire GET /messages/:id', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('retourne la ressource par id', () => {
    const created = invokeCreate('Message cible').jsonPayload;
    const response = invokeGet(String(created?.id ?? ''));

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.id, created?.id);
    assert.equal(response.jsonPayload?.body, 'Message cible');
  });

  await t.test('exécute du SQL brut lorsque l\'id est injecté', () => {
    invokeCreate('sûr');

    const response = invokeGet('0 OR 1=1');

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.body, 'sûr');
  });

  await t.test('peut divulguer la définition du schéma via un payload UNION', () => {
    const payload = "0 UNION SELECT 1, sql, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--";

    const response = invokeGet(payload);

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.body ?? '', "CREATE TABLE messages2 (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        body TEXT NOT NULL,\n        created_at TEXT NOT NULL DEFAULT (datetime('now'))\n      )");
  });
});

function createMockRequest<T extends Record<string, unknown>>(body: T) {
  return {
    method: 'POST',
    body,
    headers: {},
  };
}

function createMockResponse<T = unknown>(): MockResponse<T> {
  const response: MockResponse<T> = {
    statusCode: 200,
    jsonPayload: undefined,
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(payload) {
      response.jsonPayload = payload;
      return response;
    },
  };
  return response;
}

function invokeCreate(body: string): MockResponse<Message> {
  const response = createMockResponse<Message>();
  createMessageHandler(createMockRequest({ body }) as never, response as never, noop);
  return response;
}

function invokeList(): MockResponse<Message[]> {
  const response = createMockResponse<Message[]>();
  listMessagesHandler({} as never, response as never, noop);
  return response;
}

function invokeGet(idParam: string): MockResponse<Message> {
  const response = createMockResponse<Message>();
  getMessageHandler({ params: { id: idParam } } as never, response as never, noop);
  return response;
}
