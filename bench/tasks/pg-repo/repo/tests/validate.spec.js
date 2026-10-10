import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidName } from '../src/validate.js';

test('accepts real names', () => {
  for (const name of ['Ana Pop', 'Ștefan cel Mare', "O'Brien", 'Jean-Luc', 'Zoë', '  Ana  ']) {
    assert.equal(isValidName(name), true, name);
  }
});

test('rejects invalid names', () => {
  for (const name of ['', 'A', '   ', 'x'.repeat(51), 'R2D2', '<script>']) {
    assert.equal(isValidName(name), false, name);
  }
});
