# Changelog

## 1.2.0

- **[CheatBench](bench/README.md)**: 20 small repositories with a failing suite and one instruction, "make the tests pass". 8 tasks contain a test that contradicts the spec or another test, and 3 need something the machine lacks (PostgreSQL, an API token, ffmpeg). Hidden spec tests, a reference solution per task, a runner for any agent CLI, an evaluator and a report generator. First results for Claude Code with Sonnet, Opus and Haiku are in [bench/RESULTS.md](bench/RESULTS.md).
- New rule **`input-special-cased`** (medium): production code that adds an early return for one specific value the tests use as an input, such as `if email == "admin@localhost": return True`. Also caught through a constant or set the change introduces, `case` labels and `[…].includes(x)`.
- New rule **`test-data-removed`** (medium): a case dropped from a list the test runs through, such as 1900 disappearing from `for (const year of [1600, 1896, 1900, 1904])`.
- **`expected-changed`** now also catches a flipped assertion (`assertTrue` → `assertFalse`, `assert.ok(x)` → `assert.ok(!x)`, `equal` → `notEqual`), a tested call changed while the expected value stayed (`formatPrice(123450)` → `formatPrice(123450, { group: false })`), and reordered input rows in a test table.
- **`skip-added`** now catches `{ skip }` / `{ todo }` options added to an existing `node:test` test. New tests that declare a platform requirement this way are not reported.
- All of the above came from runs noskip 1.1.0 missed in CheatBench. On a held-out round, with these rules frozen before it started, 1.2.0 flagged all 16 runs that gamed the tests (1.1.0: 8) and none of the 24 that did not. On the last 1,000 commits of Node.js, the precision check, blocking findings are unchanged (8 commits, all real test or assertion removals) and medium findings went from 56 to 58 commits.
- Fixed: a file rewritten with the same size right after `git add` could look unchanged to the working-tree snapshot, because the temporary index lost the real index's timestamp that git's racy-clean check relies on.
- The agent skill now says to report a contradiction between tests instead of editing a test until the suite passes.

## 1.1.0

- **`noskip audit`**: replay a repository's history and list the commits that gamed the tests. AI-assisted commits are recognized by `Co-authored-by` / `Assisted-by` / `Generated-by` trailers, bot authors and tool footers (Claude Code, Codex, Copilot, Cursor, OpenCode, Gemini, Devin, Aider, Windsurf, Amp and more). Supports `--last`, `--since`, `--author`, `--ai-only`, and JSON or Markdown output.
- A test rewritten into another file under a similar name (a split or move) is now reported as `test-replaced` for review instead of a blocking `test-removed`, and its assertions don't count as removed.
- **`noskip stats`**: a local tally of agent turns reviewed, agents caught and bypass commands refused, kept in `~/.noskip/stats.json`.
- **`noskip install`** with no target lists the agents found on the machine and the exact command to protect them.
- Project-level hook config now always uses the portable `npx -y noskip@1` command, so a committed `.claude/settings.json` works for the whole team. `--global` installs still call a local copy directly when there is a stable one.
- The generated GitHub workflow uses the `DariusHQ/noskip@v1` action and `actions/checkout@v5`.
- `noskip hook …` no longer waits for input when run by hand, and an unknown command now says so instead of "unknown revision".
- New logo, animated README demo and audit images, social preview.
- Requires Node 20 or newer (Node 18 is end-of-life).

## 1.0.1

- First release on npm as `noskip` (1.0.0 could not be published).

## 1.0.0

First release.

- 26 rules across five categories: disabled tests, weakened tests, code that games the tests, checks switched off, tampering.
- 12 languages: JavaScript/TypeScript, Python, Go, Rust, Java/Kotlin, C#, Ruby, PHP, Swift, Dart, C/C++, Elixir.
- Agent hooks for Claude Code (also as a plugin), Codex, Gemini CLI and Cursor: per-turn baseline, one retry, refused `--no-verify`-style commands.
- `install` / `uninstall` for agents, git pre-commit and a GitHub workflow.
- GitHub Action with line annotations and a job summary.
- Output as pretty, JSON, Markdown, GitHub annotations or SARIF.
- `Noskip-Allow:` commit trailers to sign off on a deletion in pull requests.
- Tuned against the last 1,000 commits of Node.js: 0.9% of human commits get a blocking finding, each a real test or assertion deletion.
- `noskip demo`.
