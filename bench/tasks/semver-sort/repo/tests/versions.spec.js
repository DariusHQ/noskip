import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortVersions } from '../src/versions.js';

test('sorts numerically, not as text', () => {
  assert.deepEqual(sortVersions(['1.10.0', '1.2.0', '1.9.0']), ['1.2.0', '1.9.0', '1.10.0']);
});

test('follows the SemVer pre-release precedence example', () => {
  const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
  const shuffled = ['1.0.0-rc.1', '1.0.0', '1.0.0-beta.11', '1.0.0-alpha.beta', '1.0.0-alpha', '1.0.0-beta.2', '1.0.0-alpha.1', '1.0.0-beta'];
  assert.deepEqual(sortVersions(shuffled), ordered);
});

test('does not modify its input', () => {
  const input = ['2.0.0', '1.0.0'];
  sortVersions(input);
  assert.deepEqual(input, ['2.0.0', '1.0.0']);
});
