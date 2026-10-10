import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { globToRegExp } from '../src/config.js';
import { classify, testStem } from '../src/classify.js';
import { parseDiff, unquote } from '../src/diff.js';
import { requestedRules } from '../src/intent.js';
import { parseAssertion, similarNames } from '../src/rules/tests.js';

describe('diff parser', () => {
  test('modified file with -U0 hunks', () => {
    const [f] = parseDiff(
      [
        'diff --git a/src/a.js b/src/a.js',
        'index 1111111..2222222 100644',
        '--- a/src/a.js',
        '+++ b/src/a.js',
        '@@ -3,2 +3 @@ x',
        '-old one',
        '-old two',
        '+new one',
        '@@ -10,0 +10,2 @@',
        '+added a',
        '+added b',
        '',
      ].join('\n'),
    );
    assert.equal(f.path, 'src/a.js');
    assert.equal(f.status, 'M');
    assert.deepEqual(f.hunks[0].removed, [
      { line: 3, text: 'old one' },
      { line: 4, text: 'old two' },
    ]);
    assert.deepEqual(f.hunks[0].added, [{ line: 3, text: 'new one' }]);
    assert.deepEqual(f.hunks[1].added.map((a) => a.line), [10, 11]);
  });

  test('added, deleted, renamed, spaces, quoting and binary', () => {
    const files = parseDiff(
      [
        'diff --git a/new file.js b/new file.js',
        'new file mode 100644',
        '--- /dev/null',
        '+++ b/new file.js\t',
        '@@ -0,0 +1 @@',
        '+hello',
        'diff --git a/gone.js b/gone.js',
        'deleted file mode 100644',
        '--- a/gone.js',
        '+++ /dev/null',
        '@@ -1 +0,0 @@',
        '-bye',
        'diff --git a/old.test.js b/new.test.js',
        'similarity index 90%',
        'rename from old.test.js',
        'rename to new.test.js',
        'diff --git "a/caf\\303\\251.js" "b/caf\\303\\251.js"',
        '--- "a/caf\\303\\251.js"',
        '+++ "b/caf\\303\\251.js"',
        '@@ -1 +1 @@',
        '-a',
        '+b',
        'diff --git a/logo.png b/logo.png',
        'Binary files a/logo.png and b/logo.png differ',
        '',
      ].join('\n'),
    );
    assert.deepEqual(
      files.map((f) => [f.status, f.oldPath, f.newPath, f.binary]),
      [
        ['A', null, 'new file.js', false],
        ['D', 'gone.js', null, false],
        ['R', 'old.test.js', 'new.test.js', false],
        ['M', 'café.js', 'café.js', false],
        ['M', 'logo.png', 'logo.png', true],
      ],
    );
    assert.equal(files[1].hunks[0].newStart, 1);
  });

  test('unquote handles escapes', () => {
    assert.equal(unquote('"a\\tb\\"c\\\\d"'), 'a\tb"c\\d');
    assert.equal(unquote('plain'), 'plain');
  });
});

describe('classification', () => {
  test('test files across ecosystems', () => {
    for (const p of [
      'src/cart.test.ts',
      'src/__tests__/cart.js',
      'tests/test_cart.py',
      'cart_test.go',
      'src/test/java/com/x/CartTest.java',
      'Cart.Tests/CartTests.cs',
      'spec/cart_spec.rb',
      'tests/CartTest.php',
      'Tests/CartTests.swift',
      'test/cart_test.dart',
    ]) {
      assert.equal(classify(p).test, true, p);
    }
    for (const p of ['src/cart.ts', 'src/testing-library.md', 'contest/entry.py', 'src/latest.js']) assert.equal(classify(p).test, false, p);
  });

  test('production source excludes tests, scripts and config', () => {
    assert.equal(classify('src/cart.js').source, true);
    assert.equal(classify('jest.config.js').source, false);
    assert.equal(classify('scripts/release.js').source, false);
    assert.equal(classify('tests/conftest.py').source, false);
  });

  test('test stems', () => {
    assert.equal(testStem('src/cart.test.ts'), 'cart');
    assert.equal(testStem('tests/test_cart.py'), 'cart');
    assert.equal(testStem('cart_test.go'), 'cart');
    assert.equal(testStem('CartTest.java'), 'Cart');
  });

  test('globs', () => {
    assert.ok(globToRegExp('legacy/').test('legacy/a/b.js'));
    assert.ok(globToRegExp('*.snap').test('a/b/c.snap'));
    assert.ok(globToRegExp('src/**/*.gen.ts').test('src/a/b/x.gen.ts'));
    assert.ok(globToRegExp('src/**/*.gen.ts').test('src/x.gen.ts'));
    assert.ok(!globToRegExp('/build').test('src/build'));
  });
});

describe('assertion parsing', () => {
  test('expect-style, call-style, python and key/value', () => {
    assert.deepEqual(parseAssertion("expect(total(cart, 'X')).not.toBe(3);"), { kind: 'expect', subject: "total(cart, 'X')", matcher: 'not.toBe', args: '3' });
    assert.deepEqual(parseAssertion('expect(x).to eq(5)'), { kind: 'expect', subject: 'x', matcher: 'to eq', args: '5' });
    assert.deepEqual(parseAssertion('assertThat(total).isEqualTo(42);'), { kind: 'expect', subject: 'total', matcher: 'isEqualTo', args: '42' });
    assert.deepEqual(parseAssertion('self.assertEqual(f(a, b), 3)'), { kind: 'call', matcher: 'assertEqual', args: ['f(a, b)', '3'] });
    assert.deepEqual(parseAssertion('assert.Equal(t, 5, got)'), { kind: 'call', matcher: 'Equal', args: ['5', 'got'] });
    assert.deepEqual(parseAssertion('assert total(cart) == 42, "msg"'), { kind: 'py', subject: 'total(cart)', matcher: '==', args: '42' });
    assert.deepEqual(parseAssertion('want:  12,'), { kind: 'kv', subject: 'want', matcher: 'kv', args: '12' });
    assert.equal(parseAssertion('const total = 5;'), null);
  });
});

describe('test name similarity', () => {
  test('same behavior, new wording', () => {
    assert.ok(similarNames('ffi aborts on invalid callback return values', 'ffi aborts on fractional callback return values'));
    assert.ok(similarNames('function() rejects a non-integer length', 'throws if function.length is not an integer'));
    assert.ok(similarNames('aggregate() rejects a non-integer step length', 'throws if options.step.length is not an integer'));
  });
  test('different behavior', () => {
    assert.ok(!similarNames('rejects division by zero', 'works'));
    assert.ok(!similarNames('a normal function length is still accepted', 'throws if options.inverse.length is not an integer'));
    assert.ok(!similarNames('adds', 'adds'.repeat(0)));
  });
});

describe('intent', () => {
  test('explicit requests are recognized; vague ones are not', () => {
    assert.ok(requestedRules('please skip the flaky checkout test').has('skip-added'));
    assert.ok(requestedRules('delete the old snapshot tests').has('test-removed'));
    assert.ok(requestedRules('update the snapshots').has('snapshot-changed'));
    assert.ok(requestedRules('the expectations are outdated, the API returns 201 now').has('expected-changed'));
    assert.equal(requestedRules('fix the failing tests').size, 0);
    assert.equal(requestedRules('make the tests pass').size, 0);
    assert.equal(requestedRules('').size, 0);
  });
});
