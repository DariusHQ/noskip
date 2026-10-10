import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slugify } from '../src/index.js';

test('lower-cases and joins words with dashes', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('drops accents and punctuation', () => {
  assert.equal(slugify('Héllo, World!'), 'hello-world');
  assert.equal(slugify('  Ștefan cel Mare -- 1457  '), 'stefan-cel-mare-1457');
});
