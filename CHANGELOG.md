# Changelog

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
