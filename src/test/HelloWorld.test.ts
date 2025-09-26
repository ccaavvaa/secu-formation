import assert from 'node:assert';
import test from 'node:test';
import { HelloWorld } from '../lib/HelloWorld.js';

test('HelloWorld', () => {
  const helloWorld = new HelloWorld();
  assert.strictEqual(helloWorld.sayHello(), 'Hello, world!');
});
