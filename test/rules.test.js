import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { scan } from '../src/scan.js';
import { code, commit, find, makeRepo, removeDir, rules, scenario, write } from './helpers.js';

const JS_TEST = code`
  import { add, div } from '../src/math.js';

  describe('math', () => {
    it('adds', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('divides', () => {
      expect(div(10, 4)).toBe(2.5);
    });

    it('rejects division by zero', () => {
      expect(() => div(1, 0)).toThrow('division by zero');
    });
  });
`;

const JS_SRC = code`
  export function add(a, b) {
    return a + b;
  }

  export function div(a, b) {
    if (b === 0) throw new Error('division by zero');
    return a / b;
  }
`;

const base = { 'src/math.js': JS_SRC, 'test/math.test.js': JS_TEST };

describe('disabled tests', () => {
  test('it.skip is caught', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('divides'", "it.skip('divides'") });
    assert.deepEqual(rules(r), ['skip-added']);
    assert.equal(find(r, 'skip-added').line, 8);
    assert.equal(r.verdict, 'busted');
  });

  test('xit and describe.skip are caught', () => {
    const r = scenario(base, {
      'test/math.test.js': JS_TEST.replace("it('adds'", "xit('adds'").replace("describe('math'", "describe.skip('math'"),
    });
    assert.equal(rules(r).filter((x) => x === 'skip-added').length, 2);
  });

  test('a moved skip is not reported', () => {
    const before = { ...base, 'test/math.test.js': JS_TEST.replace("it('adds'", "it.skip('adds'") };
    const swapped = code`
      import { add, div } from '../src/math.js';

      describe('math', () => {
        it('divides', () => {
          expect(div(10, 4)).toBe(2.5);
        });

        it.skip('adds', () => {
          expect(add(2, 3)).toBe(5);
        });

        it('rejects division by zero', () => {
          expect(() => div(1, 0)).toThrow('division by zero');
        });
      });
    `;
    assert.deepEqual(rules(scenario(before, { 'test/math.test.js': swapped })), []);
  });

  test('skip markers in comments and production code are ignored', () => {
    const r = scenario(base, {
      'test/math.test.js': JS_TEST.replace("describe('math'", "// it.skip('old', ...) was removed long ago\ndescribe('math'"),
      'src/math.js': JS_SRC + '\nexport const skip = (it) => it.skip;\n',
    });
    assert.deepEqual(rules(r), []);
  });

  test('.only is caught', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('adds'", "it.only('adds'") });
    assert.deepEqual(rules(r), ['only-added']);
  });

  test('python skip and xfail markers', () => {
    const py = code`
      from app import total

      def test_total():
          assert total([1, 2]) == 3

      def test_empty():
          assert total([]) == 0
    `;
    const after = py.replace('def test_total', '@pytest.mark.skip(reason="flaky")\ndef test_total').replace('def test_empty', '@pytest.mark.xfail\ndef test_empty');
    const r = scenario({ 'app.py': 'def total(xs):\n    return sum(xs)\n', 'tests/test_app.py': py }, { 'tests/test_app.py': after });
    assert.equal(rules(r).filter((x) => x === 'skip-added').length, 2);
  });

  test('go t.Skip, rust #[ignore], java @Disabled, c# Skip=, ruby xit', () => {
    const r = scenario(
      {
        'calc_test.go': 'package calc\n\nfunc TestAdd(t *testing.T) {\n\tif Add(1, 2) != 3 {\n\t\tt.Fatal("bad")\n\t}\n}\n',
        'src/lib.rs': '#[cfg(test)]\nmod tests {\n    #[test]\n    fn adds() {\n        assert_eq!(2 + 2, 4);\n    }\n}\n',
        'src/test/java/CalcTest.java': 'class CalcTest {\n  @Test\n  void adds() {\n    assertEquals(4, Calc.add(2, 2));\n  }\n}\n',
        'Calc.Tests/CalcTests.cs': 'public class CalcTests {\n  [Fact]\n  public void Adds() {\n    Assert.Equal(4, Calc.Add(2, 2));\n  }\n}\n',
        'spec/calc_spec.rb': "describe Calc do\n  it 'adds' do\n    expect(Calc.add(2, 2)).to eq(4)\n  end\nend\n",
      },
      {
        'calc_test.go': 'package calc\n\nfunc TestAdd(t *testing.T) {\n\tt.Skip("later")\n\tif Add(1, 2) != 3 {\n\t\tt.Fatal("bad")\n\t}\n}\n',
        'src/lib.rs': '#[cfg(test)]\nmod tests {\n    #[test]\n    #[ignore]\n    fn adds() {\n        assert_eq!(2 + 2, 4);\n    }\n}\n',
        'src/test/java/CalcTest.java': 'class CalcTest {\n  @Test\n  @Disabled\n  void adds() {\n    assertEquals(4, Calc.add(2, 2));\n  }\n}\n',
        'Calc.Tests/CalcTests.cs': 'public class CalcTests {\n  [Fact(Skip = "flaky")]\n  public void Adds() {\n    Assert.Equal(4, Calc.Add(2, 2));\n  }\n}\n',
        'spec/calc_spec.rb': "describe Calc do\n  xit 'adds' do\n    expect(Calc.add(2, 2)).to eq(4)\n  end\nend\n",
      },
    );
    const paths = r.findings.filter((f) => f.rule === 'skip-added').map((f) => f.path).sort();
    assert.deepEqual(paths, ['Calc.Tests/CalcTests.cs', 'calc_test.go', 'spec/calc_spec.rb', 'src/lib.rs', 'src/test/java/CalcTest.java']);
  });
});

describe('conditional skips', () => {
  test('environment guards are medium, unconditional skips are high', () => {
    const py = 'import os, unittest\n\nclass T(unittest.TestCase):\n    def test_a(self):\n        self.assertEqual(f(), 1)\n\n    def test_b(self):\n        self.assertEqual(g(), 2)\n';
    const after = py
      .replace('    def test_a', '    @unittest.skipUnless(os.name == "nt", "needs Windows")\n    def test_a')
      .replace('        self.assertEqual(g(), 2)', '        try:\n            os.symlink("a", "b")\n        except OSError as exc:\n            self.skipTest(f"no symlinks: {exc}")\n        self.assertEqual(g(), 2)');
    const r = scenario({ 'tests/test_t.py': py }, { 'tests/test_t.py': after });
    assert.deepEqual(r.findings.map((f) => [f.rule, f.severity]), [['skip-added', 'medium'], ['skip-added', 'medium']]);
  });

  test('gtest: guarded GTEST_SKIP is medium, bare GTEST_SKIP is high', () => {
    const before = 'TEST(Sandbox, A) {\n  EXPECT_EQ(f(), 1);\n}\n\nTEST(Sandbox, B) {\n  EXPECT_EQ(g(), 2);\n}\n';
    const after = before.replace('TEST(Sandbox, A) {\n', 'TEST(Sandbox, A) {\n  if (!HardwareSupport()) GTEST_SKIP();\n').replace('TEST(Sandbox, B) {\n', 'TEST(Sandbox, B) {\n  GTEST_SKIP();\n');
    const r = scenario({ 'test/sandbox_unittest.cc': before }, { 'test/sandbox_unittest.cc': after });
    assert.deepEqual(r.findings.map((f) => f.severity).sort(), ['high', 'medium']);
  });

  test('playwright test.skip(condition) is medium', () => {
    const before = "test('checkout', async ({ page }) => {\n  await page.goto('/');\n});\n";
    const after = "test('checkout', async ({ page, browserName }) => {\n  test.skip(browserName === 'webkit', 'no webkit on CI');\n  await page.goto('/');\n});\n";
    const r = scenario({ 'e2e/checkout.spec.ts': before }, { 'e2e/checkout.spec.ts': after });
    assert.deepEqual(r.findings.map((f) => [f.rule, f.severity]), [['skip-added', 'medium']]);
  });
});

describe('removed tests', () => {
  test('deleting a test case is caught', () => {
    const after = JS_TEST.replace(/\n  it\('rejects division by zero'[\s\S]*?\n  \}\);\n/, '\n');
    const r = scenario(base, { 'test/math.test.js': after });
    const f = find(r, 'test-removed');
    assert.ok(f, JSON.stringify(r.findings));
    assert.match(f.message, /rejects division by zero/);
    assert.ok(!rules(r).includes('assertions-removed'), 'assertion loss is explained by the removed test');
  });

  test('deleting a test file is caught', () => {
    const r = scenario(base, { 'test/math.test.js': null });
    const f = find(r, 'test-file-deleted');
    assert.equal(f.severity, 'high');
    assert.match(f.message, /3 tests/);
  });

  test('moving tests to another file is fine', () => {
    const r = scenario(base, { 'test/math.test.js': null, 'test/arithmetic.test.js': JS_TEST.replace("describe('math'", "describe('arithmetic'") + '\n// moved\n' });
    assert.deepEqual(rules(r), []);
  });

  test('renaming a test is reported as a replacement, not a removal', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('adds'", "it('adds two numbers'") });
    assert.deepEqual(rules(r), ['test-replaced']);
    assert.equal(find(r, 'test-replaced').severity, 'medium');
  });

  test('python test function removed', () => {
    const py = 'def test_a():\n    assert f() == 1\n\n\ndef test_b():\n    assert g() == 2\n';
    const r = scenario({ 'tests/test_x.py': py }, { 'tests/test_x.py': 'def test_a():\n    assert f() == 1\n' });
    assert.deepEqual(rules(r), ['test-removed']);
  });

  test('go table-driven case removed', () => {
    const before = 'package x\n\nfunc TestAbs(t *testing.T) {\n\tcases := []struct{ name string; in, want int }{\n\t\t{name: "positive", in: 1, want: 1},\n\t\t{name: "negative", in: -1, want: 1},\n\t}\n\t_ = cases\n}\n';
    const r = scenario({ 'abs_test.go': before }, { 'abs_test.go': before.replace('\t\t{name: "negative", in: -1, want: 1},\n', '') });
    assert.ok(rules(r).includes('test-removed'));
  });
});

describe('weakened tests', () => {
  test('removing an assertion is caught', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("    expect(div(10, 4)).toBe(2.5);\n", '') });
    assert.deepEqual(rules(r), ['assertions-removed']);
    assert.equal(find(r, 'assertions-removed').severity, 'high');
  });

  test('assertions moved into another file (a split) are not removals', () => {
    const before = "const assert = require('assert');\nassert.strictEqual(run('a'), 1);\nassert.strictEqual(run('b'), 2);\nassert.strictEqual(run('c'), 3);\n";
    const r = scenario(
      { 'test/parallel/test-run.js': before },
      {
        'test/parallel/test-run.js': "const assert = require('assert');\nassert.strictEqual(run('a'), 1);\n",
        'test/parallel/test-run-more.js': "const assert = require('assert');\nassert.strictEqual(run('b'), 2);\nassert.strictEqual(run('c'), 3);\n",
      },
    );
    assert.deepEqual(rules(r), []);
  });

  test('assertions removed alongside a refactor are only flagged for review', () => {
    const before = "it('runs', () => {\n  const out = run();\n  assert.strictEqual(out.status, 0);\n  assert.ok(out.done);\n});\n";
    const after = "it('runs', () => {\n  const out = runAndCheckExit();\n  assert.ok(out.done);\n});\n";
    const r = scenario({ 'test/run.test.js': before }, { 'test/run.test.js': after });
    assert.deepEqual(r.findings.map((f) => [f.rule, f.severity]), [['assertions-removed', 'medium']]);
  });

  test('tautologies are caught', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace('expect(add(2, 3)).toBe(5);', 'expect(add(2, 3)).toBe(5);\n    expect(true).toBe(true);') });
    assert.deepEqual(rules(r), ['tautology-added']);
  });

  test('python and rust tautologies', () => {
    const r = scenario(
      { 'tests/test_x.py': 'def test_a():\n    assert f() == 1\n', 'tests/it.rs': '#[test]\nfn a() {\n    assert_eq!(f(), 1);\n}\n' },
      { 'tests/test_x.py': 'def test_a():\n    assert True\n', 'tests/it.rs': '#[test]\nfn a() {\n    let x = f();\n    assert_eq!(x, x);\n}\n' },
    );
    assert.equal(rules(r).filter((x) => x === 'tautology-added').length, 2);
  });

  test('real assertions are not tautologies', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace('expect(add(2, 3)).toBe(5);', 'const ok = add(2, 3) === 5;\n    expect(ok).toBe(true);') });
    assert.ok(!rules(r).includes('tautology-added'));
  });

  test('toBe(x) -> toBeDefined() is a weakened matcher', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace('expect(div(10, 4)).toBe(2.5);', 'expect(div(10, 4)).toBeDefined();') });
    assert.deepEqual(rules(r), ['matcher-weakened']);
    assert.match(find(r, 'matcher-weakened').message, /toBe\(2\.5\) weakened to toBeDefined\(\)/);
  });

  test('toThrow(message) -> toThrow() is weakened', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace(".toThrow('division by zero')", '.toThrow()') });
    assert.deepEqual(rules(r), ['matcher-weakened']);
  });

  test('python == assertion reduced to truthiness', () => {
    const r = scenario({ 'tests/test_x.py': 'def test_a():\n    assert total(cart) == 42\n' }, { 'tests/test_x.py': 'def test_a():\n    assert total(cart)\n' });
    assert.deepEqual(rules(r), ['matcher-weakened']);
  });

  test('junit assertEquals -> assertNotNull', () => {
    const r = scenario(
      { 'src/test/java/ATest.java': 'class ATest {\n  @Test\n  void a() {\n    assertEquals(42, total(cart));\n  }\n}\n' },
      { 'src/test/java/ATest.java': 'class ATest {\n  @Test\n  void a() {\n    assertNotNull(total(cart));\n  }\n}\n' },
    );
    assert.deepEqual(rules(r), ['matcher-weakened']);
  });

  test('changing an expected value is flagged for review', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace('toBe(2.5)', 'toBe(2)') });
    assert.deepEqual(rules(r), ['expected-changed']);
    assert.equal(find(r, 'expected-changed').severity, 'medium');
    assert.match(find(r, 'expected-changed').message, /2\.5 → 2/);
  });

  test('changed expected values in unittest and go tables', () => {
    const r = scenario(
      {
        'tests/test_x.py': 'class T(unittest.TestCase):\n    def test_a(self):\n        self.assertEqual(total(), 3)\n',
        'x_test.go': 'package x\n\nvar cases = []struct{ in, want int }{\n\t{\n\t\tin:   1,\n\t\twant: 5,\n\t},\n}\n',
      },
      {
        'tests/test_x.py': 'class T(unittest.TestCase):\n    def test_a(self):\n        self.assertEqual(total(), 4)\n',
        'x_test.go': 'package x\n\nvar cases = []struct{ in, want int }{\n\t{\n\t\tin:   1,\n\t\twant: 6,\n\t},\n}\n',
      },
    );
    assert.equal(rules(r).filter((x) => x === 'expected-changed').length, 2);
  });

  test('assertion swallowed by try/catch', () => {
    const r = scenario(base, {
      'test/math.test.js': JS_TEST.replace('expect(add(2, 3)).toBe(5);', 'try {\n      expect(add(2, 3)).toBe(5);\n    } catch (e) {}'),
    });
    assert.ok(rules(r).includes('assertion-in-try'), JSON.stringify(rules(r)));
  });

  test('python assertion swallowed by try/except', () => {
    const r = scenario(
      { 'tests/test_x.py': 'def test_a():\n    assert total() == 3\n' },
      { 'tests/test_x.py': 'def test_a():\n    try:\n        assert total() == 3\n    except AssertionError:\n        pass\n' },
    );
    assert.ok(rules(r).includes('assertion-in-try'), JSON.stringify(rules(r)));
  });

  test('asserting on a caught error is fine', () => {
    const r = scenario(base, {
      'test/math.test.js': JS_TEST.replace(
        "expect(() => div(1, 0)).toThrow('division by zero');",
        "try {\n      div(1, 0);\n    } catch (e) {\n      expect(e.message).toBe('division by zero');\n    }",
      ),
    });
    assert.ok(!rules(r).includes('assertion-in-try'));
  });

  test('mocking the module under test', () => {
    const r = scenario(base, { 'test/math.test.js': "vi.mock('../src/math.js');\n" + JS_TEST });
    assert.deepEqual(rules(r), ['mocked-subject']);
  });

  test('snapshot updated without any code change', () => {
    const r = scenario(
      { 'src/view.js': 'export const v = 1;\n', 'test/__snapshots__/view.test.js.snap': 'exports[`view 1`] = `"a"`;\n' },
      { 'test/__snapshots__/view.test.js.snap': 'exports[`view 1`] = `"b"`;\n' },
    );
    assert.equal(find(r, 'snapshot-changed').severity, 'medium');
  });
});

describe('gamed code', () => {
  test('production code that detects the test runner', () => {
    const r = scenario(base, { 'src/math.js': JS_SRC.replace('if (b === 0)', "if (process.env.NODE_ENV === 'test') return 2.5;\n  if (b === 0)") });
    assert.ok(rules(r).includes('test-env-check'));
  });

  test('python code that checks for pytest', () => {
    const r = scenario({ 'app/core.py': 'def f():\n    return compute()\n' }, { 'app/core.py': 'import os\n\ndef f():\n    if os.environ.get("PYTEST_CURRENT_TEST"):\n        return 42\n    return compute()\n' });
    assert.deepEqual(rules(r), ['test-env-check']);
  });

  test('test-awareness in setup and config files is fine', () => {
    const r = scenario(base, {
      'jest.setup.js': "if (process.env.NODE_ENV === 'test') globalThis.fetch = () => null;\n",
      'src/config/env.js': "export const isTest = process.env.NODE_ENV === 'test';\n",
    });
    assert.deepEqual(rules(r), []);
  });

  test('hardcoded expected value in a special case', () => {
    const r = scenario(base, { 'src/math.js': JS_SRC.replace('if (b === 0)', 'if (a === 10 && b === 4) return 2.5;\n  if (b === 0)') });
    const f = find(r, 'hardcoded-answer');
    assert.ok(f, JSON.stringify(r.findings));
    assert.match(f.message, /test\/math\.test\.js:\d+/);
  });

  test('a constant function that a test checks is not flagged', () => {
    const r = scenario(
      { 'src/name.js': 'export const x = 1;\n', 'test/name.test.js': "it('names', () => {\n  expect(name()).toBe('shopkeeper');\n});\n" },
      { 'src/name.js': "export const x = 1;\nexport function name() {\n  return 'shopkeeper';\n}\n" },
    );
    assert.ok(!rules(r).includes('hardcoded-answer'));
  });

  test('hardcoded-answer only trusts tests that cover the file', () => {
    const r = scenario(
      { 'src/math.js': JS_SRC, 'test/math.test.js': JS_TEST, 'src/other.js': 'export const o = 1;\n' },
      { 'src/other.js': 'export function o(x) {\n  if (x) return 2.5;\n  return 1;\n}\n' },
    );
    assert.ok(!rules(r).includes('hardcoded-answer'), JSON.stringify(r.findings));
  });

  test('always-true equality is an idiom in C++/Rust (medium), a cheat elsewhere (high)', () => {
    const r = scenario(
      { 'src/iter.cpp': '#include "iter.h"\n', 'app/money.py': 'class Money:\n    pass\n' },
      {
        'src/iter.cpp': '#include "iter.h"\nbool operator==(const End&, const End&) { return true; }\n',
        'app/money.py': 'class Money:\n    def __eq__(self, other):\n        return True\n',
      },
    );
    assert.deepEqual(r.findings.map((f) => [f.path, f.severity]), [['app/money.py', 'high'], ['src/iter.cpp', 'medium']]);
  });

  test('equality that always succeeds', () => {
    const r = scenario(
      { 'app/money.py': 'class Money:\n    pass\n', 'src/Money.java': 'class Money {}\n' },
      {
        'app/money.py': 'class Money:\n    def __eq__(self, other):\n        return True\n',
        'src/Money.java': 'class Money {\n  @Override\n  public boolean equals(Object o) { return true; }\n}\n',
      },
    );
    assert.equal(rules(r).filter((x) => x === 'equality-override').length, 2);
  });

  test('swallowed errors in production code', () => {
    const r = scenario(
      { 'src/io.js': 'export function load() {\n  return read();\n}\n', 'app/io.py': 'def load():\n    return read()\n' },
      {
        'src/io.js': 'export function load() {\n  try {\n    return read();\n  } catch (e) {\n  }\n}\n',
        'app/io.py': 'def load():\n    try:\n        return read()\n    except Exception:\n        pass\n',
      },
    );
    assert.deepEqual(rules(r), ['error-swallowed', 'error-swallowed']);
    assert.equal(r.verdict, 'suspicious');
  });

  test('handled errors are fine', () => {
    const r = scenario({ 'src/io.js': 'export function load() {\n  return read();\n}\n' }, { 'src/io.js': 'export function load() {\n  try {\n    return read();\n  } catch (e) {\n    log(e);\n    throw e;\n  }\n}\n' });
    assert.deepEqual(rules(r), []);
  });
});

describe('checks switched off', () => {
  test('type and lint suppressions', () => {
    const r = scenario(
      { 'src/a.ts': 'export const a: number = f();\n', 'app/b.py': 'x = f()\n' },
      { 'src/a.ts': '// @ts-ignore\nexport const a: number = f() as any;\n// eslint-disable-next-line\nexport const b = 1;\n', 'app/b.py': 'x = f()  # type: ignore\n' },
    );
    assert.deepEqual(rules(r).sort(), ['any-cast', 'lint-suppressed', 'type-suppressed', 'type-suppressed']);
  });

  test('CI step made non-failing', () => {
    const wf = 'on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n      - run: npm run lint\n';
    const r = scenario({ '.github/workflows/ci.yml': wf }, { '.github/workflows/ci.yml': wf.replace('npm test', 'npm test || true').replace('      - run: npm run lint\n', '      - run: npm run lint\n        continue-on-error: true\n') });
    assert.deepEqual(rules(r), ['ci-ignore-failure', 'ci-ignore-failure']);
  });

  test('|| true on a non-check command is fine', () => {
    const wf = 'on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n';
    const r = scenario({ '.github/workflows/ci.yml': wf }, { '.github/workflows/ci.yml': wf + '      - run: rm -rf dist || true\n' });
    assert.deepEqual(rules(r), []);
  });

  test('guards and soft-failing non-check steps are fine', () => {
    const wf = 'on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: ctest --output-on-failure\n';
    const after =
      wf +
      '      - name: Show test log\n        run: |\n          [ -f ctest.log ] || exit 0\n          cat ctest.log\n' +
      '      - uses: actions/cache@v4\n        continue-on-error: true\n        with:\n          path: ~/.cache\n' +
      '      - run: rsync -a --exclude=tmp build/ out/test-results/\n';
    const r = scenario({ '.github/workflows/ci.yml': wf }, { '.github/workflows/ci.yml': after });
    assert.deepEqual(rules(r), []);
  });

  test('a new package.json script with filters is fine; narrowing the existing one is not', () => {
    const before = '{\n  "scripts": {\n    "test": "vitest run"\n  }\n}\n';
    const added = '{\n  "scripts": {\n    "test": "vitest run",\n    "test:fast": "vitest run --exclude e2e"\n  }\n}\n';
    assert.deepEqual(rules(scenario({ 'package.json': before }, { 'package.json': added })), []);
  });

  test('test script replaced with a no-op', () => {
    const r = scenario({ 'package.json': '{\n  "scripts": {\n    "test": "vitest run"\n  }\n}\n' }, { 'package.json': '{\n  "scripts": {\n    "test": "echo \\"ok\\""\n  }\n}\n' });
    assert.deepEqual(rules(r), ['ci-ignore-failure']);
  });

  test('test run narrowed', () => {
    const r = scenario(
      { 'package.json': '{\n  "scripts": {\n    "test": "jest"\n  }\n}\n', 'pytest.ini': '[pytest]\naddopts = -q\n' },
      { 'package.json': '{\n  "scripts": {\n    "test": "jest --testPathIgnorePatterns checkout"\n  }\n}\n', 'pytest.ini': '[pytest]\naddopts = -q --ignore=tests/test_checkout.py\n' },
    );
    assert.deepEqual(rules(r), ['test-run-narrowed', 'test-run-narrowed']);
  });

  test('test command removed from CI', () => {
    const wf = 'on: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm ci\n      - run: npm test\n';
    const r = scenario({ '.github/workflows/ci.yml': wf }, { '.github/workflows/ci.yml': wf.replace('      - run: npm test\n', '') });
    assert.deepEqual(rules(r), ['test-run-narrowed']);
    assert.match(find(r, 'test-run-narrowed').message, /removed from CI/);
  });

  test('coverage threshold lowered', () => {
    const r = scenario(
      { 'jest.config.js': 'module.exports = {\n  coverageThreshold: {\n    global: {\n      lines: 90,\n    },\n  },\n};\n', 'pyproject.toml': '[tool.coverage.report]\nfail_under = 90\n' },
      { 'jest.config.js': 'module.exports = {\n  coverageThreshold: {\n    global: {\n      lines: 50,\n    },\n  },\n};\n', 'pyproject.toml': '[tool.coverage.report]\nfail_under = 70\n' },
    );
    assert.deepEqual(rules(r), ['coverage-lowered', 'coverage-lowered']);
  });

  test('raising coverage is fine', () => {
    const r = scenario({ 'pyproject.toml': '[tool.coverage.report]\nfail_under = 70\n' }, { 'pyproject.toml': '[tool.coverage.report]\nfail_under = 90\n' });
    assert.deepEqual(rules(r), []);
  });

  test('strict mode turned off', () => {
    const r = scenario({ 'tsconfig.json': '{\n  "compilerOptions": {\n    "strict": true\n  }\n}\n' }, { 'tsconfig.json': '{\n  "compilerOptions": {\n    "strict": false\n  }\n}\n' });
    assert.deepEqual(rules(r), ['strictness-reduced']);
  });

  test('--no-verify written into a script', () => {
    const r = scenario({ 'package.json': '{\n  "scripts": {\n    "ship": "git commit -am wip"\n  }\n}\n' }, { 'package.json': '{\n  "scripts": {\n    "ship": "git commit -am wip --no-verify"\n  }\n}\n' });
    assert.deepEqual(rules(r), ['no-verify']);
  });
});

describe('tampering', () => {
  test('noskip removed from agent hooks', () => {
    const settings = '{\n  "hooks": {\n    "Stop": [\n      { "hooks": [{ "type": "command", "command": "npx -y noskip hook claude stop" }] }\n    ]\n  }\n}\n';
    const r = scenario({ '.claude/settings.json': settings }, { '.claude/settings.json': '{}\n' });
    assert.deepEqual(rules(r), ['guard-tampered']);
  });

  test('changing .noskip.json is flagged', () => {
    const r = scenario({ '.noskip.json': '{ "rules": {} }\n' }, { '.noskip.json': '{ "rules": { "skip-added": "off" } }\n' });
    assert.deepEqual(rules(r), ['guard-tampered']);
  });

  test('an noskip-ignore marker suppresses the finding but is itself reported', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('divides'", "it.skip('divides' /* noskip-ignore */") });
    assert.deepEqual(rules(r), ['ignore-marker-added']);
  });
});

describe('configuration', () => {
  test('config comes from the base revision, so a change cannot disable its own checks', () => {
    const r = scenario(base, {
      '.noskip.json': '{ "rules": { "skip-added": "off" } }\n',
      'test/math.test.js': JS_TEST.replace("it('adds'", "it.skip('adds'"),
    });
    assert.deepEqual(rules(r), ['skip-added']);
  });

  test('committed config can turn rules off, change severity and ignore paths', () => {
    const r = scenario(
      { ...base, '.noskip.json': '{ "rules": { "skip-added": "off", "only-added": "low" }, "ignore": ["legacy/"] }\n', 'legacy/old.test.js': JS_TEST },
      {
        'test/math.test.js': JS_TEST.replace("it('adds'", "it.skip('adds'").replace("it('divides'", "it.only('divides'"),
        'legacy/old.test.js': JS_TEST.replace("it('adds'", "it.only('adds'"),
      },
    );
    assert.deepEqual(r.findings.map((f) => [f.rule, f.severity, f.path]), [['only-added', 'low', 'test/math.test.js']]);
  });

  test('vendored and generated files are ignored', () => {
    const r = scenario(base, {
      'node_modules/x/x.test.js': "it.skip('x', () => {});\n",
      'dist/math.test.js': "it.skip('x', () => {});\n",
      'deps/v8/test/a.test.js': "it.skip('x', () => {});\n",
      'third_party/lib/test/b.test.js': "it.skip('x', () => {});\n",
    });
    assert.deepEqual(rules(r), []);
  });

  test('an Noskip-Allow trailer signs off on a finding in a commit range', () => {
    const root = makeRepo(base);
    try {
      write(root, { 'test/math.test.js': JS_TEST.replace(/\n  it\('rejects division by zero'[\s\S]*?\n  \}\);\n/, '\n') });
      commit(root, 'Drop the division-by-zero check\n\nNoskip-Allow: test-removed (division by zero now returns Infinity, see #42)');
      const r = scan(root, { base: 'HEAD~1', head: 'HEAD' });
      const f = find(r, 'test-removed');
      assert.equal(f.severity, 'medium');
      assert.match(f.allowed, /^allowed in [0-9a-f]{7}: division by zero now returns Infinity, see #42$/);
      assert.equal(r.verdict, 'suspicious');
      // Not in the range scanned: no effect.
      assert.equal(find(scan(root, { base: 'HEAD~1', head: 'HEAD~1' }), 'test-removed'), undefined);
    } finally {
      removeDir(root);
    }
  });
});

describe('verdicts', () => {
  test('an honest fix is clean', () => {
    const r = scenario(base, {
      'src/math.js': JS_SRC.replace('return a / b;', 'return Math.round((a / b) * 100) / 100;'),
      'test/math.test.js': JS_TEST.replace("  it('rejects division by zero'", "  it('rounds to cents', () => {\n    expect(div(1, 3)).toBe(0.33);\n  });\n\n  it('rejects division by zero'"),
    });
    assert.equal(r.verdict, 'clean');
    assert.equal(r.score, 100);
  });

  test('requested changes are downgraded, not hidden', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('divides'", "it.skip('divides'") }, { prompt: 'Please skip the flaky divides test for now' });
    assert.equal(find(r, 'skip-added').severity, 'medium');
    assert.equal(find(r, 'skip-added').requested, true);
  });

  test('"fix the failing test" does not excuse moving the goalposts', () => {
    const r = scenario(base, { 'test/math.test.js': JS_TEST.replace("it('divides'", "it.skip('divides'") }, { prompt: 'fix the failing test' });
    assert.equal(find(r, 'skip-added').severity, 'high');
  });
});
