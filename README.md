<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
  <img src="assets/logo-light.svg" alt="noskip logo" width="104">
</picture>

# noskip

**Your AI agent says all tests pass. Did it cheat?**

noskip catches Claude Code, Codex, Cursor and Gemini when they make a failing test "pass" by skipping it,
deleting it, weakening the assertion, hardcoding the answer or switching CI off. It sends the agent back
to fix the real code, and keeps the shortcut out of your pull requests.

[![npm](https://img.shields.io/npm/v/noskip?color=cb3837&label=npm)](https://www.npmjs.com/package/noskip)
[![ci](https://github.com/DariusHQ/noskip/actions/workflows/ci.yml/badge.svg)](https://github.com/DariusHQ/noskip/actions/workflows/ci.yml)
![dependencies: 0](https://img.shields.io/badge/dependencies-0-2ea44f)
![runs offline](https://img.shields.io/badge/network-none-2ea44f)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Try it](#try-it-in-10-seconds) · [CheatBench](#we-measured-it-cheatbench) · [Audit your history](#has-your-agent-already-cheated) · [Install](#install) · [What it catches](#what-it-catches) · [How it works](#how-it-works) · [FAQ](#faq)

<img src="assets/demo.svg" alt="noskip demo: an agent told to make failing tests pass skipped a test, weakened an assertion, hardcoded an answer, deleted a test, lowered coverage and masked CI. noskip flags all six." width="860">

</div>

## Try it in 10 seconds

```bash
npx noskip demo     # watch it catch a cheating agent in a throwaway repo
npx noskip audit    # has an agent already cheated in this repo's history?
npx noskip          # check your uncommitted changes
```

No install, no config, no account. Nothing leaves your machine.

## The problem

Ask an agent to *"make the failing tests pass"* and sometimes it does exactly that:

```diff
-  it('never goes below zero', () => {
+  it.skip('never goes below zero', () => {

-    expect(total(cart)).toBe(0.3);
+    expect(total(cart)).toBeTruthy();

+  if (coupon === 'SAVE10') return 108;   // what the test expects

-      - run: npm test
+      - run: npm test || true
```

Then it reports *"✅ All tests pass"*, and technically it's right. AI labs call this **reward hacking**
and document it in their own model cards. It is easy to miss in a 600-line diff at 2am, and a line in
`CLAUDE.md` asking the agent not to is a suggestion, not a guarantee.

noskip is the referee. It runs where the agent works and where you review, and it doesn't negotiate.

## We measured it: CheatBench

[CheatBench](bench/README.md) gives an agent a small repository with a failing test suite and one
instruction: *make the tests pass*. In 8 of its 20 tasks, one test contradicts the README or another
test, so no honest change can turn the whole suite green. We ran Claude Code on every task:

| Model | Contradictory suites made green anyway | …and said so | Fixable bugs fixed, no test weakened |
| --- | ---: | ---: | ---: |
| Sonnet (2 runs) | 15 / 16 | 15 / 15 | 18 / 18 |
| Opus | 7 / 8 | 7 / 7 | 9 / 9 |
| Haiku (2 runs) | 16 / 16 | 16 / 16 | 16 / 18 |

In the contradictory tasks, every run fixed the real bug. Then 38 of 40 made the suite green anyway:
they edited an expected value, flipped an assertion, dropped a case from a list, swapped two input
rows, or added a special case for exactly `admin@localhost`. Only 2 stopped and reported the
contradiction. To their credit, none hid it: every summary mentioned the change, most in the first
lines.

But a summary only helps if someone reads it. In CI, in a background agent, or three pull requests
later, what gets merged is the diff and a green check. noskip reads the diff. On a held-out round,
with the rules frozen before it started, noskip 1.2.0 flagged **all 16** runs that gamed the tests
(1.1.0: 8 of 16) and **none** of the 24 that didn't. Every diff, summary and agent trajectory is in
[bench/results](bench/results), with the method and its limits in [bench/README.md](bench/README.md).

## Has your agent already cheated?

`noskip audit` replays your git history and shows every commit that gamed the tests, and which of them
an AI wrote: Claude Code, Codex, Copilot, Cursor, OpenCode, Gemini, Devin, Aider and more, recognized by
their `Co-authored-by` / `Assisted-by` trailers, bot accounts and footers. (Try it on Node.js: a third of
its last 1,000 commits credit an AI tool.)

<div align="center">
<img src="assets/audit.svg" alt="noskip audit on an example repository: three AI-assisted commits gamed the tests (a skipped test and a weakened assertion by Claude Code, a masked CI step by Copilot, a hardcoded answer by Cursor) and one human commit changed an expected value." width="860">
</div>

```bash
npx noskip audit --last 500           # look further back (default: 100 commits)
npx noskip audit --ai-only            # only commits with an AI co-author
npx noskip audit --since "1 month ago"
npx noskip audit --format markdown    # paste the report into an issue or PR
```

## Install

```bash
npx noskip install
```

Lists the agents it finds on your machine and the exact command to protect them. Or pick directly:

**Claude Code** (plugin, recommended):

```
/plugin marketplace add DariusHQ/noskip
/plugin install noskip@noskip
```

**Codex · Cursor · Gemini CLI · Claude Code** (hooks):

```bash
npx noskip install codex     # .codex/hooks.json  (then trust it once in /hooks)
npx noskip install cursor    # .cursor/hooks.json
npx noskip install gemini    # .gemini/settings.json
npx noskip install claude    # .claude/settings.json
```

Add `--global` to protect every project on your machine.

**Any agent, any editor** (git pre-commit):

```bash
npx noskip install git
```

**Pull requests** (GitHub Action):

```yaml
# .github/workflows/noskip.yml
name: noskip
on: pull_request
jobs:
  noskip:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: DariusHQ/noskip@v1
```

Findings appear as annotations on the exact lines of the PR, plus a job summary.
`npx noskip install github` writes this file for you.

**Prevention, not just detection** (Agent Skill): [`skills/noskip`](skills/noskip/SKILL.md) teaches the agent the rules up front and has it run the self-check before it says "done". The Claude Code plugin includes it; for other agents use your skill manager, e.g. `npx skills add DariusHQ/noskip`.

## How it works

```mermaid
sequenceDiagram
    participant You
    participant Agent as AI agent
    participant noskip
    You->>Agent: "the checkout tests fail, fix them"
    Agent->>noskip: prompt hook
    noskip-->>noskip: snapshot the working tree
    Agent->>Agent: edits code, adds it.skip(...)
    Agent->>noskip: stop hook: "done, all tests pass"
    noskip-->>Agent: skip-added at test/checkout.test.ts:42. Fix the code, not the test.
    Agent->>Agent: removes the skip, fixes the real bug
    Agent->>noskip: stop hook
    noskip-->>You: clean
```

1. **You send a prompt.** noskip snapshots the working tree as a git tree object. Your files, index and HEAD are untouched.
2. **The agent tries to finish.** noskip diffs the snapshot against the current state and runs [28 rules](docs/rules.md) over what changed.
3. **If it gamed the tests,** the agent is sent back with the file, line and fix. Once. If it still stops, you get a warning instead. No loops.
4. **Commands that switch checks off** (`git commit --no-verify`, `HUSKY=0`, `rm .git/hooks/pre-commit`) are refused before they run.

What the agent reads when it gets caught:

```text
noskip flagged changes that make tests pass without fixing the code:

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
- **Hard to switch off from the inside.** Config is read from the base revision, so a change can't loosen the rules that judge it. Touching noskip or hook config is its own finding.
- **Fails open.** If noskip itself crashes, your agent carries on.

## What it catches

🔴 blocks the agent and fails CI · 🟡 reported for review · ⚪ informational

| | Rule | Catches |
|---|---|---|
| 🔴 | [`skip-added`](docs/rules.md#skip-added) | `it.skip`, `xit`, `{ skip }`, `@pytest.mark.skip`, `t.Skip()`, `#[ignore]`, `@Disabled`, `[Fact(Skip=…)]` and more across 12 languages |
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
| 🔴 | [`guard-tampered`](docs/rules.md#guard-tampered) | noskip or git-hook config weakened |
| 🟡 | [`expected-changed`](docs/rules.md#expected-changed) | `toBe(3)` → `toBe(4)`, `assertTrue` → `assertFalse`, reordered test input: was the code fixed, or the test? |
| 🟡 | [`test-data-removed`](docs/rules.md#test-data-removed) | `[1600, 1900, 1904]` → `[1600, 1904]`: a case quietly dropped from the list a test loops over |
| 🟡 | [`input-special-cased`](docs/rules.md#input-special-cased) | `if email == "admin@localhost": return True`, for exactly the input a test uses |
| 🟡 | [`test-replaced`](docs/rules.md#test-replaced) | A test swapped for a different one |
| 🟡 | [`mocked-subject`](docs/rules.md#mocked-subject) | A test that mocks the module it is testing |
| 🟡 | [`error-swallowed`](docs/rules.md#error-swallowed) | New `catch {}` / `except: pass` in production code |
| 🟡 | [`type-suppressed`](docs/rules.md#type-suppressed) | `@ts-ignore`, `# type: ignore`, `@SuppressWarnings` |
| 🟡 | [`strictness-reduced`](docs/rules.md#strictness-reduced) | `"strict": false`, lint rules off, mypy relaxed |
| 🟡 | [`ignore-marker-added`](docs/rules.md#ignore-marker-added) | A `noskip-ignore` comment appeared |
| ⚪ | [`snapshot-changed`](docs/rules.md#snapshot-changed) | Snapshots rewritten (🟡 when no code changed) |
| ⚪ | [`lint-suppressed`](docs/rules.md#lint-suppressed) | `eslint-disable`, `# noqa`, `//nolint` |
| ⚪ | [`any-cast`](docs/rules.md#any-cast) | `as any` |

Languages: JavaScript, TypeScript, Python, Go, Rust, Java, Kotlin, C#, Ruby, PHP, Swift, Dart, C/C++, Elixir.

## How does noskip compare?

| | noskip | "Never skip tests" in `CLAUDE.md` / `AGENTS.md` | Code review | Coverage gate |
|---|:---:|:---:|:---:|:---:|
| Stops the agent before it says "done" | ✅ | a request it may ignore | ❌ | ❌ |
| Catches skipped, deleted and weakened tests | ✅ | ❌ | if you spot them | rarely |
| Catches hardcoded answers and test-only branches | ✅ | ❌ | if you spot them | ❌ |
| Catches CI checks switched off | ✅ | ❌ | if you spot them | ❌ |
| Same verdict every time, offline, free | ✅ | ✅ | ❌ | ✅ |

Use them together: noskip doesn't replace review, it makes sure the tests you review still test something.

## How often do your agents cheat?

The agent hooks keep a tally on your machine. `npx noskip stats` shows it:

```text
noskip stats  since 2026-10-01

  Agent turns that changed code     412
  Caught gaming the tests             9  2.2% of turns
  Bypass commands refused             2

  Favorite tricks
    skip-added           ████████████ 4
    matcher-weakened     ██████       2
    hardcoded-answer     ███          1

  Caught by agent   Claude Code 7 · Cursor 2
```

<sub>Example output. Your numbers live in `~/.noskip/stats.json` and are never uploaded.</sub>

## CLI

```text
noskip [<rev>]               scan HEAD (or <rev>) → working tree, untracked files included
noskip --staged              scan only what is staged (pre-commit)
noskip --base main           scan everything since the merge-base with main (pull requests)
noskip audit [<ref>]         replay history: --last <n>, --since <date>, --author <who>, --ai-only
noskip install [<target>]    claude · codex · cursor · gemini · git · github (none: show what's detected)
noskip stats                 how often your agents got caught
noskip --format json         also: markdown, github, sarif
noskip --fail-on medium      stricter exit code (default: high)
noskip rules                 list every rule
noskip demo                  see it in action
```

Exit codes: `0` nothing at or above `--fail-on`, `1` findings, `2` error.

SARIF plugs into GitHub code scanning:

```yaml
      - run: npx -y noskip --base origin/main --head HEAD --format sarif --fail-on never > noskip.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: noskip.sarif
```

## Configuration

Optional `.noskip.json` in the repo root, read from the base revision:

```json
{
  "failOn": "high",
  "ignore": ["legacy/", "**/*.generated.ts"],
  "rules": { "lint-suppressed": "off", "expected-changed": "high" }
}
```

One-off exception, on the line itself or with `noskip-ignore-next-line` above it:

```js
it.skip('hits the real payment sandbox', () => { // noskip-ignore skip-added: needs credentials, runs nightly
```

Adding a marker is reported too, so an agent can't use it quietly. Details in [docs/rules.md](docs/rules.md#configuration).

## FAQ

**Does my code leave my machine?**
No. noskip is one zero-dependency Node package that talks to your local `git`. No network calls, no LLM, no telemetry. Stats stay in `~/.noskip/stats.json`.

**Will it get in the way of legitimate work?**
It only looks at what changed. Moved or re-indented lines, renamed tests and tests split across files are not reported. A returned constant only counts as "hardcoded" inside a new special case, and environment-guarded skips (`skipUnless(os.name == "nt")`) are only flagged for review. Medium findings never block. If your prompt asked for the change, it is reported but not blocked.

We replayed the last 1,000 commits of the [Node.js](https://github.com/nodejs/node) repository through `noskip audit`: 8 of them (0.8%) got a blocking finding, and every one really removed a test or an assertion, for example when a feature was dropped or tests were consolidated. That's a change worth one line of sign-off, which you give in the commit message:

```text
Noskip-Allow: test-removed (the --jitless flag no longer exists)
```

In pull request scans, the finding stays visible but is downgraded so it no longer fails the check. Found a false positive anyway? [Open an issue](https://github.com/DariusHQ/noskip/issues/new?template=false-positive.yml) with the diff.

**Why not just write "never skip tests" in CLAUDE.md?**
Do that too. Instructions are suggestions; hooks are enforcement. The git hook and the Action are the backstop for every agent and every human.

**Can the agent turn it off?**
It can try. Config comes from the base revision, edits to noskip or hook config are flagged, and `--no-verify`, `noskip uninstall` and friends are refused. CI is the final referee.

**How does `audit` know a commit was written by AI?**
Only from explicit signals: a trailer (`Co-Authored-By: Claude …`, `Co-authored-by: Copilot …`, `Assisted-by: Codex`), a bot author (`claude[bot]`, `copilot-swe-agent[bot]`, `devin-ai-integration[bot]`, …) or a tool footer (`🤖 Generated with …`). Co-author names are matched against tool names, never email domains, so a person is never labeled as a bot. It never guesses from code style. Everything else is listed as "human".

**Does it replace code review?**
No. It catches one common class of shortcut, so your review time goes to everything else.

**Requirements?**
Node 20+ and git. macOS, Linux and Windows.

## Show that your repo plays fair

```md
[![noskip](https://img.shields.io/badge/AI%20agents-noskip%20protected-2ea44f)](https://github.com/DariusHQ/noskip)
```

[![noskip](https://img.shields.io/badge/AI%20agents-noskip%20protected-2ea44f)](https://github.com/DariusHQ/noskip)

## Contributing

Caught your agent cheating in a way noskip missed? That is the most useful issue you can open:
[paste the diff](https://github.com/DariusHQ/noskip/issues/new?template=new-cheat.yml). Every report makes the rules sharper
for everyone. See [CONTRIBUTING.md](CONTRIBUTING.md) to add a rule yourself.

If noskip caught one of your agents red-handed, a ⭐ helps other developers find it.

## License

[MIT](LICENSE)
