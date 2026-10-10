# Contributing

Two kinds of reports keep noskip sharp:

- **A cheat it missed.** Paste the diff your agent produced ([template](https://github.com/DariusHQ/noskip/issues/new?template=new-cheat.yml)).
- **A false positive.** Paste the diff and the finding ([template](https://github.com/DariusHQ/noskip/issues/new?template=false-positive.yml)).

Precision matters more than recall: a rule that cries wolf gets switched off.

## Development

```bash
git clone https://github.com/DariusHQ/noskip && cd noskip
npm test                 # node:test, no dependencies to install
node src/cli.js demo
```

## Layout

```
src/cli.js            argument parsing and commands
src/scan.js           resolve the two trees, diff, run rules, apply config
src/git.js            all git plumbing (worktree snapshots via a temporary index)
src/diff.js           unified diff parser
src/classify.js       test / source / CI / config / vendored detection
src/rules/patterns.js line and block pattern rules
src/rules/tests.js    test names, assertion parsing, removed and weakened tests
src/rules/source.js   hardcoded-answer
src/rules/config.js   CI, coverage, strictness, tampering
src/hooks.js          agent hook protocols (Claude Code, Codex, Gemini CLI, Cursor)
src/commands.js       shell commands refused before they run
src/install.js        install / uninstall into agent configs, git hooks, workflows
src/audit.js          `noskip audit`: replay history, detect AI-assisted commits
src/stats.js          local tally behind `noskip stats`
scripts/              README images (render-assets.js) and the social preview
```

After changing output formats, regenerate the README images with `npm run assets`.

## Adding a rule

1. Add it to the right file in `src/rules/`. A pattern rule is `{ id, severity, category, title, hint, applies(file), check(file) }`; use `netNewLines` / `netNewBlocks` so moved code is never reported. Cross-file rules implement `checkAll(ctx)`.
2. List the id in `ORDER` in `src/rules/index.js`.
3. Add a positive **and** a negative test to `test/rules.test.js` (what must be caught, and the closest legitimate change that must not be).
4. Document it in `docs/rules.md` and the README table.

Rules must stay deterministic, offline and fast: no network, no LLM, no new dependencies.
