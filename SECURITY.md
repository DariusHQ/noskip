# Security

noskip runs as a git hook, an agent hook and a CI step, so a bug in it can matter. It is designed to:

- make no network requests and run no LLM;
- never modify your files, index or HEAD (snapshots use a temporary git index);
- fail open: if noskip crashes, your agent or commit carries on.

## Reporting a vulnerability

Please report security issues privately through
[GitHub security advisories](https://github.com/DariusHQ/noskip/security/advisories/new), not in a public issue.
Include the version (`npx noskip --version`), your OS and the steps to reproduce.
You will get a reply within a few days.

## Scope

In scope: anything that lets a diff, a commit message, a config file or hook input make noskip
execute code, write outside `.git/noskip/` and `~/.noskip/`, or hang an agent.

A way for an agent to game the tests without being caught is not a security issue. It is still very
welcome: open a [missed cheat](https://github.com/DariusHQ/noskip/issues/new?template=new-cheat.yml) issue.
