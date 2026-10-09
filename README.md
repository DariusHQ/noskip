<div align="center">

# anticheat

### Your AI agent says all tests pass. Did it cheat?

Claude Code, Codex, Cursor and Gemini sometimes make a failing test "pass" by skipping it, deleting it,
weakening the assertion or hardcoding the answer. **anticheat** catches it in the diff, sends the agent
back to fix the real code, and keeps it out of your pull requests.

[![npm](https://img.shields.io/npm/v/noskip?color=cb3837&label=npm)](https://www.npmjs.com/package/noskip)
[![ci](https://github.com/DariusHQ/anticheat/actions/workflows/ci.yml/badge.svg)](https://github.com/DariusHQ/anticheat/actions/workflows/ci.yml)
![dependencies](https://img.shields.io/badge/dependencies-0-2ea44f)
![network](https://img.shields.io/badge/network-none-2ea44f)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

<img src="assets/demo.svg" alt="anticheat catching six shortcuts in an AI agent's diff" width="840">

</div>

## Try it

The npm package is [`noskip`](https://www.npmjs.com/package/noskip) (npm reserves the word "cheat").

```bash
npx noskip demo   # watch it catch a cheating agent in a throwaway repo
npx noskip        # scan your own uncommitted changes
```

## The problem

Ask an agent to *"make the failing tests pass"* and sometimes it does exactly that:

```diff
-  it('never goes below zero', () => {
+  it.skip('never goes below zero', () => {

-    expect(total(cart)).toBe(0.3);
+    expect(total(cart)).toBeTruthy();

+  if (coupon === 'SAVE10') return 108;     // the exact number the test expects

-      - run: npm test
+      - run: npm test || true
```

Then it reports *"✅ All tests pass"*, and technically it's right. AI labs call this **reward hacking**
and document it in their own model cards. It is easy to miss in a 600-line diff at 2am, and a line in
`CLAUDE.md` asking it not to is a suggestion, not a guarantee.

anticheat is the referee. It runs where the agent works and where you review, and it doesn't negotiate.

## Install

**Claude Code** (plugin):

```
/plugin marketplace add DariusHQ/anticheat
/plugin install anticheat@anticheat
```

**Codex · Cursor · Gemini CLI · Claude Code** (hooks):

```bash
npx noskip install codex     # .codex/hooks.json  (then trust it once in /hooks)
npx noskip install cursor    # .cursor/hooks.json
npx noskip install gemini    # .gemini/settings.json
npx noskip install claude    # .claude/settings.json
```

Add `--global` to protect every project on your machine.

**Prevention, not just detection** (Agent Skill): [`skills/anticheat`](skills/anticheat/SKILL.md) teaches the agent the rules up front and has it run the self-check before it says "done". The Claude Code plugin includes it; for other agents use your skill manager, e.g. `npx skills add DariusHQ/anticheat`.

**Any agent, any editor** (git pre-commit):

```bash
npx noskip install git
```

**Pull requests** (GitHub Action):

```yaml
# .github/workflows/anticheat.yml
name: anticheat
on: pull_request
jobs:
  anticheat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: DariusHQ/anticheat@v1
```

Findings appear as annotations on the exact lines of the PR, plus a job summary.
`npx noskip install github` writes this file for you.

## How it works

1. **You send a prompt.** anticheat snapshots the working tree as a git tree object. Your files, index and HEAD are untouched.
2. **The agent tries to finish.** anticheat diffs the snapshot against the current state and runs [26 rules](docs/rules.md) over what changed.
3. **If it gamed the tests,** the agent is sent back with the file, line and fix. Once. If it still stops, you get a warning instead. No loops.
4. **Commands that switch checks off** (`git commit --no-verify`, `HUSKY=0`, `rm .git/hooks/pre-commit`) are refused before they run.

What the agent reads when it gets caught:

```text
anticheat flagged changes that make tests pass without fixing the code:

- [high] skip-added at test/cart.test.js:17: Test disabled with a skip marker
    it.skip('never goes below zero', () => {
    fix: Remove the skip and fix the code the test exercises.
- [high] hardcoded-answer at src/cart.js:4: Returns 108, the exact value test/cart.test.js:10 expects
    if (coupon === 'SAVE10') return 108;
    fix: Compute the result. Returning the test’s expected value passes the test without fixing anything.

Undo these shortcuts and fix the underlying code instead.
If the user explicitly asked for one of these changes, keep it and say so plainly in your reply so they can review it.
```

### Guarantees

- **Local and deterministic.** No LLM, no network, no telemetry, zero dependencies. Same diff, same verdict.
- **Judges only the current turn.** Changes you made before the prompt are never blamed on the agent.
- **You are the boss.** If your prompt asks for it (*"skip the flaky checkout test"*), the finding is reported but doesn't block. *"Fix the failing test"* is not permission to edit the test.
- **Hard to switch off from the inside.** Config is read from the base revision, so a change can't loosen the rules that judge it. Touching anticheat or hook config is its own finding.
- **Fails open.** If anticheat itself crashes, your agent carries on.

## What it catches

🔴 blocks the agent and fails CI · 🟡 reported for review · ⚪ informational

| | Rule | Catches |
|---|---|---|
| 🔴 | [`skip-added`](docs/rules.md#skip-added) | `it.skip`, `xit`, `@pytest.mark.skip`, `t.Skip()`, `#[ignore]`, `@Disabled`, `[Fact(Skip=…)]` and more across 12 languages |
| 🔴 | [`only-added`](docs/rules.md#only-added) | `.only`, `fit`, `fdescribe`: every other test silently stops running |
| 🔴 | [`test-file-deleted`](docs/rules.md#test-file-deleted) | Deleted test files (moves and splits are fine) |
| 🔴 | [`test-removed`](docs/rules.md#test-removed) | Deleted test cases, including Go table entries |
| 🔴 | [`test-run-narrowed`](docs/rules.md#test-run-narrowed) | `--testPathIgnorePatterns`, `--deselect`, `-k "not …"`, `-DskipTests`, test step removed from CI |
| 🔴 | [`tautology-added`](docs/rules.md#tautology-added) | `expect(true).toBe(true)`, `assert True`, `assert_eq!(x, x)` |
| 🔴 | [`assertions-removed`](docs/rules.md#assertions-removed) | Assertions deleted from a test |
| 🔴 | [`matcher-weakened`](docs/rules.md#matcher-weakened) | `toBe(42)` → `toBeDefined()`, `assert x == 42` → `assert x`, `toThrow(Err)` → `toThrow()` |
| 🔴 | [`assertion-in-try`](docs/rules.md#assertion-in-try) | Assertions inside a `try/catch` that swallows the failure |
| 🔴 | [`hardcoded-answer`](docs/rules.md#hardcoded-answer) | `if (x === 'SAVE10') return 108` where 108 is what the test expects |
| 🔴 | [`test-env-check`](docs/rules.md#test-env-check) | Production code checking `NODE_ENV === 'test'`, `PYTEST_CURRENT_TEST`, `testing.Testing()` |
| 🔴 | [`equality-override`](docs/rules.md#equality-override) | `__eq__` / `equals()` that always returns true |
| 🔴 | [`ci-ignore-failure`](docs/rules.md#ci-ignore-failure) | `npm test \|\| true`, `continue-on-error: true`, `"test": "echo ok"` |
| 🔴 | [`coverage-lowered`](docs/rules.md#coverage-lowered) | Coverage threshold lowered or removed |
| 🔴 | [`no-verify`](docs/rules.md#no-verify) | `--no-verify`, `HUSKY=0`, `core.hooksPath=/dev/null` |
| 🔴 | [`guard-tampered`](docs/rules.md#guard-tampered) | anticheat or git-hook config weakened |
| 🟡 | [`expected-changed`](docs/rules.md#expected-changed) | `toBe(3)` → `toBe(4)`: was the code fixed, or the test? |
| 🟡 | [`test-replaced`](docs/rules.md#test-replaced) | A test swapped for a different one |
| 🟡 | [`mocked-subject`](docs/rules.md#mocked-subject) | A test that mocks the module it is testing |
| 🟡 | [`error-swallowed`](docs/rules.md#error-swallowed) | New `catch {}` / `except: pass` in production code |
| 🟡 | [`type-suppressed`](docs/rules.md#type-suppressed) | `@ts-ignore`, `# type: ignore`, `@SuppressWarnings` |
| 🟡 | [`strictness-reduced`](docs/rules.md#strictness-reduced) | `"strict": false`, lint rules off, mypy relaxed |
| 🟡 | [`ignore-marker-added`](docs/rules.md#ignore-marker-added) | An `anticheat-ignore` comment appeared |
| ⚪ | [`snapshot-changed`](docs/rules.md#snapshot-changed) | Snapshots rewritten (🟡 when no code changed) |
| ⚪ | [`lint-suppressed`](docs/rules.md#lint-suppressed) | `eslint-disable`, `# noqa`, `//nolint` |
| ⚪ | [`any-cast`](docs/rules.md#any-cast) | `as any` |

Languages: JavaScript, TypeScript, Python, Go, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Dart, C/C++, Elixir.

## CLI

```text
anticheat [<rev>]             scan HEAD (or <rev>) → working tree, untracked files included
anticheat --staged            scan only what is staged (pre-commit)
anticheat --base main         scan everything since the merge-base with main (pull requests)
anticheat --format json       also: markdown, github, sarif
anticheat --fail-on medium    stricter exit code (default: high)
anticheat rules               list every rule
anticheat demo                see it in action
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings, `2` error.

SARIF plugs into GitHub code scanning:

```yaml
      - run: npx -y noskip --base origin/main --head HEAD --format sarif --fail-on never > anticheat.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: anticheat.sarif
```

## Configuration

Optional `.anticheat.json` in the repo root, read from the base revision:

```json
{
  "failOn": "high",
  "ignore": ["legacy/", "**/*.generated.ts"],
  "rules": { "lint-suppressed": "off", "expected-changed": "high" }
}
```

One-off exception, on the line itself or with `anticheat-ignore-next-line` above it:

```js
it.skip('hits the real payment sandbox', () => { // anticheat-ignore skip-added: needs credentials, runs nightly
```

Adding a marker is reported too, so an agent can't use it quietly. Details in [docs/rules.md](docs/rules.md#configuration).

## FAQ

**Does my code leave my machine?**
No. anticheat is one zero-dependency Node package that talks to your local `git`. No network calls, no LLM, no telemetry.

**Will it get in the way of legitimate work?**
It only looks at what changed. Moved or re-indented lines, renamed tests and tests split across files are not reported. A returned constant only counts as "hardcoded" inside a new special case, and environment-guarded skips (`skipUnless(os.name == "nt")`) are only flagged for review. Medium findings never block. If your prompt asked for the change, it is reported but not blocked.

We replayed the last 1,000 commits of the [Node.js](https://github.com/nodejs/node) repository, written by humans, through anticheat: 9 of them (0.9%) got a blocking finding, and every one was a real deletion of a test or an assertion. That's a change worth one line of sign-off, which you give in the commit message:

```text
Anticheat-Allow: test-removed (the --jitless flag no longer exists)
```

In pull request scans, the finding stays visible but is downgraded so it no longer fails the check. Found a false positive anyway? [Open an issue](https://github.com/DariusHQ/anticheat/issues/new?template=false-positive.yml) with the diff.

**Why not just write "never skip tests" in CLAUDE.md?**
Do that too. Instructions are suggestions; hooks are enforcement. The git hook and the Action are the backstop for every agent and every human.

**Can the agent turn it off?**
It can try. Config comes from the base revision, edits to anticheat or hook config are flagged, and `--no-verify`, `anticheat uninstall` and friends are refused. CI is the final referee.

**Does it replace code review?**
No. It catches one common class of shortcut, so your review time goes to everything else.

**Requirements?**
Node 18+ and git. macOS, Linux and Windows.

## Show that your repo plays fair

```md
[![anticheat](https://img.shields.io/badge/AI%20agents-anticheat%20protected-2ea44f)](https://github.com/DariusHQ/anticheat)
```

[![anticheat](https://img.shields.io/badge/AI%20agents-anticheat%20protected-2ea44f)](https://github.com/DariusHQ/anticheat)

## Contributing

Caught your agent cheating in a way anticheat missed? That is the most useful issue you can open:
[paste the diff](https://github.com/DariusHQ/anticheat/issues/new?template=new-cheat.yml). See [CONTRIBUTING.md](CONTRIBUTING.md) to add a rule.

## License

MIT
