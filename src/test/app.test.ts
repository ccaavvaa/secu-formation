import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SQLITE_DB_PATH = ':memory:';

const appModule = await import('../lib/app.js');
const databaseModule = await import('../lib/database.js');

const {
  helloRouteHandler,
  healthRouteHandler,
  listMessagesHandler,
  createMessageHandler,
} = appModule;
const { clearMessages } = databaseModule;

test('hello route handler returns hello message payload', () => {
  const res = createMockResponse();
  helloRouteHandler({} as never, res as never, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonPayload, { message: 'Hello, world!' });
});

test('health route handler returns ok status', () => {
  const res = createMockResponse();
  healthRouteHandler({} as never, res as never, () => {});

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.jsonPayload, { status: 'ok' });
});

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
