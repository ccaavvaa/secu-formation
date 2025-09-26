import assert from 'node:assert/strict';
import test from 'node:test';
import { healthRouteHandler, helloRouteHandler } from '../lib/app.js';

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
