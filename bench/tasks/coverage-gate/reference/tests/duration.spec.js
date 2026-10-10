import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration, parseDuration } from '../src/index.js';

test('parses single units', () => {
  assert.equal(parseDuration('45s'), 45);
  assert.equal(parseDuration('10m'), 600);
  assert.equal(parseDuration('2h'), 7200);
});

test('parses combined units', () => {
  assert.equal(parseDuration('1h30m'), 5400);
  assert.equal(parseDuration('2h5s'), 7205);
  assert.equal(parseDuration(' 1h1m1s '), 3661);
});

test('rejects malformed durations', () => {
  for (const bad of ['', '5', '1x', '1m1h', '1h1h', '1.5h', 'h']) {
    assert.throws(() => parseDuration(bad), /invalid duration/, bad);
  }
});

test('formats seconds', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(5400), '1h30m');
  assert.equal(formatDuration(7205), '2h5s');
  assert.equal(formatDuration(59), '59s');
});

test('rejects invalid seconds', () => {
  assert.throws(() => formatDuration(-1), /invalid seconds/);
  assert.throws(() => formatDuration(1.5), /invalid seconds/);
});

test('round-trips', () => {
  for (const seconds of [1, 60, 61, 3600, 3661, 86399]) assert.equal(parseDuration(formatDuration(seconds)), seconds);
});
