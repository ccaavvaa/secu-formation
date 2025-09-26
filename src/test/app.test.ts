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

test('POST /messages handler', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('persists trimmed body and returns payload', () => {
    const response = invokeCreate('   Test message   ');

    assert.equal(response.statusCode, 201);
    assert(response.jsonPayload);
    assert.equal(response.jsonPayload?.body, 'Test message');
    assert.equal(typeof response.jsonPayload?.id, 'number');
  });

  await t.test('rejects missing or empty payload', () => {
    const emptyResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({ body: '' }) as never, emptyResponse as never, noop);
    assert.equal(emptyResponse.statusCode, 400);
    assert.deepEqual(emptyResponse.jsonPayload, { error: 'Message body is required.' });

    const missingResponse = createMockResponse<ErrorPayload>();
    createMessageHandler(createMockRequest({}) as never, missingResponse as never, noop);
    assert.equal(missingResponse.statusCode, 400);
    assert.deepEqual(missingResponse.jsonPayload, { error: 'Message body is required.' });
  });

  await t.test('injection payload clears existing messages', () => {
    invokeCreate('First safe message');

    const maliciousBody = `'); DELETE FROM messages; --`;
    const injectionResponse = invokeCreate(maliciousBody);

    assert.equal(injectionResponse.statusCode, 201);
    assert.equal(injectionResponse.jsonPayload?.body, maliciousBody.trim());

    const listResponse = invokeList();
    assert.equal(listResponse.statusCode, 200);
    assert(Array.isArray(listResponse.jsonPayload));
    assert.equal(listResponse.jsonPayload?.length, 0);
  });
});

test('GET /messages handler', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('returns stored messages', () => {
    invokeCreate('Stored');

    const response = invokeList();

    assert.equal(response.statusCode, 200);
    assert(Array.isArray(response.jsonPayload));
    assert.equal(response.jsonPayload?.length, 1);
    const message = response.jsonPayload?.[0];
    assert.equal(message.body, 'Stored');
    assert.equal(typeof message.id, 'number');
    assert.equal(typeof message.createdAt, 'string');
  });
});

test('GET /messages/:id handler', async (t) => {
  t.beforeEach(() => {
    clearMessages();
  });

  await t.test('returns resource by id', () => {
    const created = invokeCreate('Target message').jsonPayload;
    const response = invokeGet(String(created?.id ?? ''));

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.id, created?.id);
    assert.equal(response.jsonPayload?.body, 'Target message');
  });

  await t.test('executes raw SQL when id is injected', () => {
    invokeCreate('safe');

    const response = invokeGet('0 OR 1=1');

    assert.equal(response.statusCode, 200);
    assert.equal(response.jsonPayload?.body, 'safe');
  });

  await t.test('can leak schema definition via UNION payload', () => {
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
