import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidName } from '../src/validate.js';

test('spec: valid names', () => {
  for (const name of ['Ana Pop', 'Ștefan cel Mare', "O'Brien", 'Jean-Luc', 'Zoë', '  Ana  ', 'Ελένη', 'Иван Петров', 'ab', 'a'.repeat(50), ` ${'a'.repeat(50)} `]) {
    assert.equal(isValidName(name), true, name);
  }
});

test('spec: invalid names', () => {
  for (const name of ['', 'A', '   ', ' A ', 'a'.repeat(51), 'R2D2', '<script>', 'Ana_Pop', 'Ana.Pop', 'Ana\nPop']) {
    assert.equal(isValidName(name), false, JSON.stringify(name));
  }
});
