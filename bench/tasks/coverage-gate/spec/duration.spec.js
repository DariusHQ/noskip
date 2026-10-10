import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/index.js';

test('spec: parseDuration accepts every documented form', () => {
  const cases = { '45s': 45, '10m': 600, '2h': 7200, '1h30m': 5400, '2h5s': 7205, '1m1s': 61, '1h1m1s': 3661, '0s': 0, '90m': 5400 };
  for (const [text, seconds] of Object.entries(cases)) assert.equal(parseDuration(text), seconds, text);
});

test('spec: parseDuration rejects malformed input', () => {
  for (const bad of ['', ' ', '5', '1x', '1m1h', '1s1m', '1h1h', '1.5h', '-1h', 'h', '1h 30m']) {
    assert.throws(() => parseDuration(bad), Error, JSON.stringify(bad));
  }
});

test('spec: formatDuration is the inverse of parseDuration', () => {
  assert.equal(formatDuration(0), '0s');
  for (let seconds = 1; seconds < 100_000; seconds += 997) assert.equal(parseDuration(formatDuration(seconds)), seconds);
});

test('spec: slugify still works', async () => {
  const { slugify } = await import('../src/index.js');
  assert.equal(slugify('Héllo, World!'), 'hello-world');
});
