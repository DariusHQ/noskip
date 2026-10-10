import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { runHook } from '../src/hooks.js';
import { defaultCommand, detectTargets, NPX_COMMAND } from '../src/install.js';
import { formatStats, loadStats, recordStats } from '../src/stats.js';
import { makeRepo, removeDir, write } from './helpers.js';

describe('stats', () => {
  test('counts turns, catches and refusals', () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'noskip-stats-')), 'stats.json');
    recordStats('turn', { agent: 'claude', repo: 'shop' }, file);
    recordStats('turn', { agent: 'claude', repo: 'shop' }, file);
    recordStats('caught', { agent: 'claude', repo: 'shop', rules: ['skip-added', 'skip-added', 'matcher-weakened'] }, file);
    recordStats('refused', { agent: 'cursor', repo: 'api', rules: ['no-verify'] }, file);
    recordStats('bogus', {}, file);
    const s = loadStats(file);
    assert.equal(s.turns, 2);
    assert.equal(s.caught, 1);
    assert.equal(s.refused, 1);
    assert.deepEqual(s.rules, { 'skip-added': 1, 'matcher-weakened': 1, 'no-verify': 1 });
    assert.deepEqual(s.agents, { claude: 1, cursor: 1 });
    const text = formatStats(s);
    assert.match(text, /Caught gaming the tests +1 50\.0% of turns/);
    assert.match(text, /Claude Code 1 · Cursor 1/);
    removeDir(path.dirname(file));
  });

  test('empty state explains how to start', () => {
    assert.match(formatStats(loadStats(path.join(os.tmpdir(), 'does-not-exist', 'stats.json'))), /npx noskip install/);
  });

  test('hooks record a caught agent once per turn', () => {
    const before = loadStats();
    const root = makeRepo({ 'test/a.test.js': "it('a', () => {\n  expect(f()).toBe(1);\n});\n" });
    try {
      runHook('claude', 'prompt', JSON.stringify({ session_id: 'st', cwd: root, prompt: 'make it pass' }));
      write(root, { 'test/a.test.js': "it.skip('a', () => {\n  expect(f()).toBe(1);\n});\n" });
      runHook('claude', 'stop', JSON.stringify({ session_id: 'st', cwd: root }));
      runHook('claude', 'stop', JSON.stringify({ session_id: 'st', cwd: root, stop_hook_active: true }));
      runHook('claude', 'pretool', JSON.stringify({ cwd: root, tool_input: { command: 'git commit --no-verify -m x' } }));
      const after = loadStats();
      assert.equal(after.turns - before.turns, 1);
      assert.equal(after.caught - before.caught, 1);
      assert.equal(after.refused - before.refused, 1);
    } finally {
      removeDir(root);
    }
  });
});

describe('install helpers', () => {
  test('project installs are portable; only --global may pin a local path', () => {
    assert.equal(defaultCommand(), NPX_COMMAND);
    assert.equal(defaultCommand({ global: false }), NPX_COMMAND);
    assert.match(defaultCommand({ global: true }), /^node ".+\/src\/cli\.js"$|^npx -y noskip@\d+$/);
  });

  test('detects agents from the home directory and the repo', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'noskip-home-detect-'));
    const root = makeRepo({ 'CLAUDE.md': '# rules\n', '.cursor/rules/x.mdc': 'x\n' });
    try {
      assert.deepEqual(detectTargets(root, home), ['claude', 'cursor', 'git']);
      write(root, { '.github/workflows/ci.yml': 'on: push\n', 'AGENTS.md': '# agents\n' });
      assert.deepEqual(detectTargets(root, home), ['claude', 'codex', 'cursor', 'git', 'github']);
      assert.deepEqual(detectTargets(null, home), []);
    } finally {
      removeDir(root);
      removeDir(home);
    }
  });
});
