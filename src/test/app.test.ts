import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SQLITE_DB_PATH = ':memory:';

const appModule = await import('../lib/app.js');
const databaseModule = await import('../lib/database.js');

const {
  listMessagesHandler,
  getMessageHandler,
  createMessageHandler,
} = appModule;
const { clearMessages } = databaseModule;

test('create message handler persists trimmed body and returns payload', () => {
  clearMessages();
  const resCreate = createMockResponse();
  const request = createMockRequest({ body: '   Test message   ' });

  createMessageHandler(request as never, resCreate as never, () => {});

  assert.equal(resCreate.statusCode, 201);
  assert(resCreate.jsonPayload);
  assert.equal(resCreate.jsonPayload?.data.body, 'Test message');
  assert.equal(typeof resCreate.jsonPayload?.data.id, 'number');
});

test('list messages handler returns stored messages', () => {
  clearMessages();

  const creationResponse = createMockResponse();
  createMessageHandler(createMockRequest({ body: 'Stored' }) as never, creationResponse as never, () => {});

  const resList = createMockResponse();
  listMessagesHandler({} as never, resList as never, () => {});

  assert.equal(resList.statusCode, 200);
  assert(Array.isArray(resList.jsonPayload?.data));
  assert.equal(resList.jsonPayload?.data.length, 1);
  const message = resList.jsonPayload?.data[0];
  assert.equal(message.body, 'Stored');
  assert.equal(typeof message.id, 'number');
  assert.equal(typeof message.createdAt, 'string');
});

test('get message handler returns resource by id', () => {
  clearMessages();

  const creationResponse = createMockResponse();
  createMessageHandler(createMockRequest({ body: 'Target message' }) as never, creationResponse as never, () => {});

  const id = creationResponse.jsonPayload?.data.id;
  const resGet = createMockResponse();
  getMessageHandler({ params: { id: String(id) } } as never, resGet as never, () => {});

  assert.equal(resGet.statusCode, 200);
  assert.equal(resGet.jsonPayload?.data.id, id);
  assert.equal(resGet.jsonPayload?.data.body, 'Target message');
});

test('get message handler executes raw SQL for id', () => {
  clearMessages();

  createMessageHandler(createMockRequest({ body: 'safe' }) as never, createMockResponse() as never, () => {});

  const resGet = createMockResponse();
  getMessageHandler({ params: { id: "0 OR 1=1" } } as never, resGet as never, () => {});

  assert.equal(resGet.statusCode, 200);
  assert.equal(resGet.jsonPayload?.data.body, 'safe');
});

test('get message handler injection can expose schema metadata', () => {
  clearMessages();

  const payload = "0 UNION SELECT 1, name, '1970-01-01T00:00:00' FROM sqlite_master WHERE type='table' LIMIT 1 OFFSET 1--";
  const resGet = createMockResponse();
  getMessageHandler({ params: { id: payload } } as never, resGet as never, () => {});

  assert.equal(resGet.statusCode, 200);
  assert.equal(resGet.jsonPayload?.data.body, 'messages2');
});

test('injection payload clears existing messages', () => {
  clearMessages();

  createMessageHandler(createMockRequest({ body: 'First safe message' }) as never, createMockResponse() as never, () => {});

  const maliciousBody = `'); DELETE FROM messages; --`;
  const resMalicious = createMockResponse();
  createMessageHandler(createMockRequest({ body: maliciousBody }) as never, resMalicious as never, () => {});

  assert.equal(resMalicious.statusCode, 201);
  assert.equal(resMalicious.jsonPayload?.data.body, maliciousBody.trim());

  const resList = createMockResponse();
  listMessagesHandler({} as never, resList as never, () => {});
  assert.equal(resList.statusCode, 200);
  assert.equal(resList.jsonPayload?.data.length, 0);
});

test('create message handler rejects missing or empty payload', () => {
  clearMessages();

  const resEmpty = createMockResponse();
  createMessageHandler(createMockRequest({ body: '' }) as never, resEmpty as never, () => {});
  assert.equal(resEmpty.statusCode, 400);
  assert.deepEqual(resEmpty.jsonPayload, { error: 'Message body is required.' });

  const resMissing = createMockResponse();
  createMessageHandler(createMockRequest({}) as never, resMissing as never, () => {});
  assert.equal(resMissing.statusCode, 400);
  assert.deepEqual(resMissing.jsonPayload, { error: 'Message body is required.' });
});

function createMockRequest(body: Record<string, unknown>) {
  return {
    method: 'POST',
    body,
    headers: {},
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    jsonPayload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonPayload = payload;
      return this;
    },
  };
}
