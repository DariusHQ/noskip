import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCSV } from '../src/csv.js';

test('parses simple records', () => {
  assert.deepEqual(parseCSV('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(parseCSV('a,,c\n'), [['a', '', 'c']]);
});

test('keeps commas inside quotes', () => {
  assert.deepEqual(parseCSV('name,city\n"Doe, Jane",Paris\n'), [['name', 'city'], ['Doe, Jane', 'Paris']]);
});

test('unescapes doubled quotes', () => {
  assert.deepEqual(parseCSV('"say ""hi""",x\n'), [['say "hi"', 'x']]);
});

test('accepts CRLF line endings', () => {
  assert.deepEqual(parseCSV('a,b\r\nc,d\r\n'), [['a', 'b'], ['c', 'd']]);
});

test('keeps line breaks inside quotes', () => {
  assert.deepEqual(parseCSV('"line1\nline2",z\n'), [['line1\nline2', 'z']]);
});
