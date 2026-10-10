import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCSV } from '../src/csv.js';

test('spec: quoting rules', () => {
  assert.deepEqual(parseCSV('x,"a,b",y'), [['x', 'a,b', 'y']]);
  assert.deepEqual(parseCSV('"",""\n'), [['', '']]);
  assert.deepEqual(parseCSV('"he said ""no"", then left",1\r\n2,3'), [['he said "no", then left', '1'], ['2', '3']]);
  assert.deepEqual(parseCSV('"multi\r\nline","q"""\n'), [['multi\r\nline', 'q"']]);
});

test('spec: whitespace and empties are preserved', () => {
  assert.deepEqual(parseCSV(' a , b \n'), [[' a ', ' b ']]);
  assert.deepEqual(parseCSV(',\n'), [['', '']]);
  assert.deepEqual(parseCSV('only'), [['only']]);
});

test('spec: no extra record for the trailing newline', () => {
  assert.deepEqual(parseCSV('1,2\n3,4\n'), [['1', '2'], ['3', '4']]);
  assert.deepEqual(parseCSV('1,2\r\n3,4'), [['1', '2'], ['3', '4']]);
});
