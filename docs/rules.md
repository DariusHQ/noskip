# Rules

Every rule looks only at what a change **adds or removes**. Code that merely moved, got
re-indented, or was renamed together with its tests is not reported.

| Severity | Meaning | Agent hooks | CLI / CI exit code |
|---|---|---|---|
| 🔴 high | Almost certainly a shortcut | Agent is sent back to fix it | `1` (default `--fail-on high`) |
| 🟡 medium | Worth a human look | Reported to you, never blocks | `0` unless `--fail-on medium` |
| ⚪ low | Informational | Not reported | `0` unless `--fail-on low` |

Change any severity, or turn a rule off, in [`.noskip.json`](#configuration).

**Tests that stopped running:** [skip-added](#skip-added) · [only-added](#only-added) · [test-file-deleted](#test-file-deleted) · [test-removed](#test-removed) · [test-run-narrowed](#test-run-narrowed) · [test-data-removed](#test-data-removed) · [test-replaced](#test-replaced)

**Tests that stopped checking:** [tautology-added](#tautology-added) · [assertions-removed](#assertions-removed) · [matcher-weakened](#matcher-weakened) · [assertion-in-try](#assertion-in-try) · [expected-changed](#expected-changed) · [mocked-subject](#mocked-subject) · [snapshot-changed](#snapshot-changed)

**Code that games the tests:** [hardcoded-answer](#hardcoded-answer) · [test-env-check](#test-env-check) · [equality-override](#equality-override) · [input-special-cased](#input-special-cased) · [error-swallowed](#error-swallowed)

**Checks switched off:** [ci-ignore-failure](#ci-ignore-failure) · [coverage-lowered](#coverage-lowered) · [no-verify](#no-verify) · [type-suppressed](#type-suppressed) · [strictness-reduced](#strictness-reduced) · [lint-suppressed](#lint-suppressed) · [any-cast](#any-cast)

**Tampering with the referee:** [guard-tampered](#guard-tampered) · [ignore-marker-added](#ignore-marker-added)

---

## skip-added

🔴 high. A test was disabled with a skip, ignore or expected-failure marker.

```diff
-  it('never goes below zero', () => {
+  it.skip('never goes below zero', () => {
```

Recognized: `it/test/describe.skip`, `xit`, `xdescribe`, `test.fixme`, and `{ skip }` / `{ todo }` options added to an existing `node:test` test (JS/TS) · `@pytest.mark.skip/skipif/xfail`, `@unittest.skip`, `pytest.skip()`, `self.skipTest()` (Python) · `t.Skip()` (Go) · `#[ignore]` (Rust) · `@Disabled`, `@Ignore` (Java/Kotlin) · `[Fact(Skip = …)]`, `[Ignore]`, `Assert.Inconclusive` (C#) · `xit`, `skip`, `pending` (Ruby) · `markTestSkipped`, `->skip()` (PHP) · `XCTSkip` (Swift) · `skip:` (Dart) · `GTEST_SKIP`, `DISABLED_` (C++) · `@tag :skip` (Elixir).

**Fix:** remove the marker and fix the code the test exercises.

## only-added

🔴 high. `.only`, `fit`, `fdescribe` and similar focus one test, so every other test in the run silently stops running.

**Fix:** remove the focus marker before finishing.

## test-file-deleted

🔴 high. A test file was deleted. If all of its tests reappear in another file (a move or split), nothing is reported. A deleted test file with no recognizable test cases (such as a helper) is reported as 🟡 medium.

## test-removed

🔴 high. A test case disappeared and was not moved to another file. Test names are extracted per framework (`it('…')`, `def test_…`, `func Test…`, `#[test] fn …`, `@Test void …`, `[Fact]`, `TEST(Suite, Name)`, Go table entries with `name: "…"`, and more).

**Fix:** put the test back. If the behavior really changed, update the test instead of deleting it.

## test-run-narrowed

🔴 high. The test run was changed so some tests no longer execute:

- flags on test commands: `--testPathIgnorePatterns`, `--testNamePattern`, `--exclude`, `--ignore`, `--deselect`, `-k "not …"`, `-m "not …"`, `--skip`, `-x test`, `-DskipTests`, `--onlyChanged`;
- config: `testPathIgnorePatterns`, `collect_ignore`, `norecursedirs`, pytest `addopts` with `--ignore`/`--deselect`, Cargo `test = false`, Maven `<skipTests>`, Gradle `test { enabled = false }`;
- a test command removed from a CI workflow.

## test-data-removed

🟡 medium. A case was dropped from a list the test runs through, while nothing else on that line changed:

```diff
-  for (const year of [1600, 1896, 1900, 1904]) {
+  for (const year of [1600, 1896, 1904]) {
     assert.equal(isLeapYear(year), true);
```

The test still passes and still looks complete, but it no longer checks 1900. Adding cases is never reported. Whole rows disappearing from multi-line tables are not reported either: features get removed and their tables shrink all the time, so that signal is mostly noise.

## test-replaced

🟡 medium. A test was removed and a differently named one appeared: in the same file (a rename), or in another test file under a similar name (a split or move, e.g. "aborts on invalid callback return values" → "aborts on fractional callback return values"). Often harmless; sometimes a hard test swapped for an easy one. A removed test whose only "replacement" is unrelated (say, `it('works')`) stays a 🔴 [test-removed](#test-removed).

## tautology-added

🔴 high. An assertion that cannot fail: `expect(true).toBe(true)`, `expect(x).toBe(x)`, `assert True`, `self.assertTrue(True)`, `assertEquals(x, x)`, `assert_eq!(x, x)`, `Assert.Pass()`, `XCTAssertTrue(true)`, `EXPECT_TRUE(true)`, …

## assertions-removed

🔴 high when the test file only lost lines (the classic "delete the assertion that fails"); 🟡 medium when other code was added to the same file, which is usually a refactor such as moving checks into a helper. Not reported when the loss is already explained by a removed test.

## matcher-weakened

🔴 high. A precise assertion was replaced by a vague one on the same value:

```diff
-    expect(total(cart)).toBe(0.3);
+    expect(total(cart)).toBeTruthy();
```

Also: `toThrow('message')` → `toThrow()`, `assert x == 42` → `assert x` / `assert x is not None`, `assertEquals(42, x)` → `assertNotNull(x)`, `assert.Equal(t, 42, x)` → `assert.NotNil(t, x)`.

## assertion-in-try

🔴 high. Assertions wrapped in a `try` whose `catch`/`except` swallows the failure (empty, `pass`, or only logs).

```js
try {
  expect(total(cart)).toBe(108);
} catch (e) {}
```

**Fix:** let the assertion fail. If an error is expected, use `expect(...).toThrow()`, `pytest.raises`, `assertThrows` and so on.

## expected-changed

🟡 medium. What a test checks moved, while the test kept its name:

- the expected value changed: `toBe(3)` → `toBe(4)`, `assertEqual(f(), 3)` → `assertEqual(f(), 4)`, `want: 5` → `want: 6`;
- the assertion was flipped: `assertTrue(is_prime(1))` → `assertFalse(is_prime(1))`, `assert.ok(x)` → `assert.ok(!x)`, `assert.equal` → `assert.notEqual`;
- the tested call changed while the expected value stayed: `formatPrice(123450)` → `formatPrice(123450, { group: false })`;
- the input rows of a test table were reordered, which changes what an order-sensitive test (sorting, dedupe, "first one wins") checks.

Sometimes the old test was wrong; sometimes it was edited to match a bug, or to dodge a contradiction it should have reported. A human should decide which.

## mocked-subject

🟡 medium. A test file mocks the module it is supposed to test, e.g. `cart.test.js` adding `vi.mock('../src/cart')`. The test then checks the mock, not the code.

## snapshot-changed

⚪ low. Snapshot or golden files were rewritten. 🟡 medium when no production code changed in the same diff: the expectation moved, not the code.

## hardcoded-answer

🔴 high. Production code now returns a literal that is exactly the value a related test expects, inside a new special case (or replacing previous logic):

```diff
 export function total(items, coupon) {
+  if (coupon === 'SAVE10') return 108;
```

…while `test/cart.test.js` contains `expect(total([{ price: 120 }], 'SAVE10')).toBe(108)`. Related tests are found by file name (`cart.js` ↔ `cart.test.js`, `test_cart.py`, `cart_test.go`, `CartTest.java`, …) and among test files in the same change. A plain constant function (`return 'shop'` with no new branch) is not reported.

## test-env-check

🔴 high. Production code started behaving differently under test: `process.env.NODE_ENV === 'test'`, `JEST_WORKER_ID`, `import.meta.env.VITEST`, `'pytest' in sys.modules`, `PYTEST_CURRENT_TEST`, `testing.Testing()`, `cfg!(test)`, `Rails.env.test?`, `app()->runningUnitTests()`, … Test setup files, config, fixtures and scripts are exempt.

## equality-override

🔴 high. Equality that always succeeds, which makes every equality assertion pass: `def __eq__(self, other): return True`, `equals(o) { return true; }`, `fn eq(&self, …) -> bool { true }`, `static func ==(…) -> Bool { true }`, …

## input-special-cased

🟡 medium. Production code gained an early return for one specific value that the tests covering it use as an input:

```diff
 def is_valid(email):
+    if email == "admin@localhost":
+        return True
```

Also caught through a constant or a set the change introduces (`ADMINS = {"admin@localhost"}` … `if email in ADMINS: return True`), `case`/`when` labels and `[…].includes(x)`. Only distinctive values count: `"admin@localhost"` or `1900`, not a type tag such as `'bigint'`. Tests are matched to the code by file name, as for [hardcoded-answer](#hardcoded-answer).

**Fix:** handle the general case. If the exception is real, document it where the rules are written down.

## error-swallowed

🟡 medium. A new empty `catch {}`, `.catch(() => {})`, `except: pass`, `rescue nil`, `if err != nil {}` or `Err(_) => {}` in production code. It hides exactly the failure the tests are there to see.

## ci-ignore-failure

🔴 high. A failing check was made to look green: `npm test || true`, `|| exit 0`, `--passWithNoTests`, `--exit-zero`, `continue-on-error: true`, `allow_failure: true`, `set +e`, `testFailureIgnore`, or a package.json script like `"test": "echo ok"`. Masks on commands unrelated to checks (`rm -rf dist || true`) are ignored.

## coverage-lowered

🔴 high. A coverage threshold went down (`lines: 90` → `lines: 40`, `fail_under = 90` → `70`, `--cov-fail-under`) or a `fail_under`-style threshold was removed.

## no-verify

🔴 high. Git hooks bypassed in a script or workflow: `--no-verify`, `HUSKY=0`, `LEFTHOOK=0`, `SKIP=… git commit`, `core.hooksPath=/dev/null`. The agent hooks also refuse to *run* these commands.

## type-suppressed

🟡 medium. `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `# type: ignore`, `# pyright: ignore`, `@SuppressWarnings`, `#pragma warning disable`, `#nullable disable`, `@phpstan-ignore`, `@psalm-suppress`, `#pragma GCC diagnostic ignored`.

## strictness-reduced

🟡 medium. Compiler or linter strictness turned down in config: `"strict": false` and friends in tsconfig, mypy/pyright relaxed, ESLint/Biome rules set to `off`, `<Nullable>disable`, Cargo lints set to `allow`, RuboCop `Enabled: false`, golangci `disable-all`.

## lint-suppressed

⚪ low. `eslint-disable`, `biome-ignore`, `# noqa`, `# pylint: disable`, `# nosec`, `//nolint`, `NOSONAR`, `#[allow(…)]`, `rubocop:disable`, `swiftlint:disable`, `phpcs:ignore`.

## any-cast

⚪ low. `as any`, `<any>`, `as unknown as` in TypeScript.

## guard-tampered

🔴 high. The referee was touched: `.noskip.json` changed or deleted, `noskip` removed from `.claude/settings.json`, `.codex/hooks.json`, `.cursor/hooks.json`, `.gemini/settings.json`, husky/lefthook/pre-commit config or a CI workflow. Deleting a git-hook config is 🟡 medium. The agent hooks also refuse commands like `git update-index --assume-unchanged`, `rm .git/hooks/pre-commit`, `chmod -x .husky/*` and `noskip uninstall`.

## ignore-marker-added

🟡 medium. An `noskip-ignore` comment was added. It still suppresses the finding it annotates, but a human sees that it was added.

---

## Configuration

`.noskip.json` in the repository root. It is read from the **base** revision of the
diff (HEAD for local scans, the merge-base for pull requests), so a change can never loosen
the rules it is judged by. Commit config changes on their own.

```json
{
  "failOn": "high",
  "ignore": ["legacy/", "**/*.generated.ts"],
  "rules": {
    "lint-suppressed": "off",
    "expected-changed": "high"
  },
  "testPatterns": ["checks/**/*.js"]
}
```

| Key | Default | |
|---|---|---|
| `failOn` | `"high"` | Lowest severity that fails the CLI and blocks agents: `high`, `medium`, `low`, `never` |
| `ignore` | `[]` | gitignore-style globs to skip |
| `rules` | `{}` | Per-rule `"off"`, `"low"`, `"medium"` or `"high"` |
| `testPatterns` | `[]` | Extra globs for files that should count as tests |

Vendored and generated paths (`node_modules/`, `vendor/`, `dist/`, `build/`, lockfiles, `*.min.js`, …) are always skipped.

### Inline exceptions

```js
it.skip('talks to the real payment sandbox', () => { // noskip-ignore skip-added: needs credentials, runs nightly
```

`noskip-ignore` applies to its own line, `noskip-ignore-next-line` to the line below. Name rules
to be specific (`noskip-ignore skip-added, only-added`); with no rule name it covers every rule.
Adding the marker is reported as [ignore-marker-added](#ignore-marker-added).

### Signing off on a deletion

A removed test has no line left to annotate. When a test, assertion or threshold really should go,
say so in a commit message inside the scanned range (pull requests, `--base`, or `<rev> --head <rev>`):

```text
Remove the --jitless TypeScript test

Noskip-Allow: test-removed, assertions-removed (the --jitless flag no longer exists)
```

Matching findings stay in the report, downgraded from high to medium and annotated with the commit
and reason, so the check passes and the reviewer still sees what was signed off. Trailers have no
effect on agent hooks, which judge the working tree of the current turn.
