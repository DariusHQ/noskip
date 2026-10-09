# Changelog

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
