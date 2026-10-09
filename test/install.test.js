import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { install } from '../src/install.js';
import { makeRepo, removeDir } from './helpers.js';

const CMD = 'node "/opt/anticheat/src/cli.js"';
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

function withRepo(fn) {
  const root = makeRepo({ 'README.md': '# x\n' });
  try {
    return fn(root);
  } finally {
    removeDir(root);
  }
}

describe('install', () => {
  test('claude: adds three hooks, keeps existing ones, is idempotent, uninstalls cleanly', () =>
    withRepo((root) => {
      const file = path.join(root, '.claude', 'settings.json');
      mkdirSync(path.dirname(file), { recursive: true });
      const mine = { matcher: 'Write', hooks: [{ type: 'command', command: 'prettier --write' }] };
      writeFileSync(file, JSON.stringify({ model: 'opus', hooks: { PostToolUse: [mine] } }));

      const first = install('claude', { root, command: CMD });
      assert.equal(first.changed, true);
      const s = readJSON(file);
      assert.equal(s.model, 'opus');
      assert.deepEqual(s.hooks.PostToolUse, [mine]);
      assert.equal(s.hooks.UserPromptSubmit[0].hooks[0].command, `${CMD} hook claude prompt`);
      assert.equal(s.hooks.Stop[0].hooks[0].command, `${CMD} hook claude stop`);
      assert.equal(s.hooks.PreToolUse[0].matcher, 'Bash');

      assert.equal(install('claude', { root, command: CMD }).changed, false);

      install('claude', { root, command: CMD, remove: true });
      assert.deepEqual(readJSON(file), { model: 'opus', hooks: { PostToolUse: [mine] } });
    }));

  test('codex and gemini use their own event names', () =>
    withRepo((root) => {
      install('codex', { root, command: CMD });
      install('gemini', { root, command: CMD });
      const codex = readJSON(path.join(root, '.codex', 'hooks.json'));
      assert.deepEqual(Object.keys(codex.hooks).sort(), ['PreToolUse', 'Stop', 'UserPromptSubmit']);
      const gemini = readJSON(path.join(root, '.gemini', 'settings.json'));
      assert.deepEqual(Object.keys(gemini.hooks).sort(), ['AfterAgent', 'BeforeAgent', 'BeforeTool']);
      assert.equal(gemini.hooks.BeforeTool[0].matcher, 'run_shell_command');
    }));

  test('cursor writes hooks.json version 1 with a single follow-up', () =>
    withRepo((root) => {
      install('cursor', { root, command: CMD });
      const c = readJSON(path.join(root, '.cursor', 'hooks.json'));
      assert.equal(c.version, 1);
      assert.deepEqual(c.hooks.stop, [{ command: `${CMD} hook cursor stop`, loop_limit: 1 }]);
      assert.equal(c.hooks.beforeShellExecution[0].command, `${CMD} hook cursor pretool`);
    }));

  test('git: pre-commit hook, appended once to an existing hook', () =>
    withRepo((root) => {
      const hook = path.join(root, '.git', 'hooks', 'pre-commit');
      writeFileSync(hook, '#!/bin/sh\nnpm run lint\n');
      install('git', { root, command: CMD });
      install('git', { root, command: CMD });
      const text = readFileSync(hook, 'utf8');
      assert.match(text, /npm run lint/);
      assert.equal(text.split(`${CMD} --staged`).length - 1, 1);
      install('git', { root, command: CMD, remove: true });
      assert.doesNotMatch(readFileSync(hook, 'utf8'), /anticheat/);
    }));

  test('github: writes a pull_request workflow', () =>
    withRepo((root) => {
      install('github', { root });
      const wf = readFileSync(path.join(root, '.github', 'workflows', 'anticheat.yml'), 'utf8');
      assert.match(wf, /pull_request/);
      assert.match(wf, /fetch-depth: 0/);
      assert.match(wf, /--base "origin\/\$\{GITHUB_BASE_REF\}"/);
    }));

  test('unknown targets and unparsable settings are reported', () =>
    withRepo((root) => {
      assert.throws(() => install('vim', { root }), /unknown target/);
      const file = path.join(root, '.claude', 'settings.json');
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, '{ oops');
      assert.throws(() => install('claude', { root, command: CMD }), /could not parse/);
      assert.equal(existsSync(path.join(root, '.codex')), false);
    }));
});
