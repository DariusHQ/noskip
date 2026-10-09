import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { checkCommand } from '../src/commands.js';
import { runHook } from '../src/hooks.js';
import { makeRepo, removeDir, write } from './helpers.js';

const TEST = "it('adds', () => {\n  expect(add(2, 3)).toBe(5);\n});\n";
const SKIPPED = TEST.replace("it('adds'", "it.skip('adds'");

function withRepo(fn) {
  const root = makeRepo({ 'src/add.js': 'export const add = (a, b) => a + b;\n', 'test/add.test.js': TEST });
  try {
    return fn(root);
  } finally {
    removeDir(root);
  }
}

const json = (s) => (s ? JSON.parse(s) : null);

describe('stop hook', () => {
  for (const [agent, check] of [
    ['claude', (out) => assert.equal(out.decision, 'block')],
    ['codex', (out) => assert.equal(out.decision, 'block')],
    ['gemini', (out) => assert.equal(out.decision, 'deny')],
    ['cursor', (out) => assert.match(out.followup_message, /skip-added/)],
  ]) {
    test(`${agent}: sends the agent back once when it cheats`, () =>
      withRepo((root) => {
        const id = agent === 'cursor' ? { conversation_id: 's1', workspace_roots: [root] } : { session_id: 's1', cwd: root };
        runHook(agent, 'prompt', JSON.stringify({ ...id, prompt: 'make the tests pass' }));
        write(root, { 'test/add.test.js': SKIPPED });
        const first = runHook(agent, 'stop', JSON.stringify({ ...id, status: 'completed', loop_count: 0 }));
        assert.equal(first.code, 0);
        const out = json(first.stdout);
        check(out);
        const reason = out.reason ?? out.followup_message;
        assert.match(reason, /skip-added at test\/add\.test\.js:1/);

        // Second stop in the same turn: never loop, just tell the user.
        const again = runHook(agent, 'stop', JSON.stringify({ ...id, stop_hook_active: true, loop_count: 1, status: 'completed' }));
        const second = json(again.stdout);
        assert.ok(!second.decision && !second.followup_message, again.stdout);
        if (agent !== 'cursor') assert.match(second.systemMessage, /anticheat: 1 high/);
      }));
  }

  test('changes made before the prompt are not blamed on the agent', () =>
    withRepo((root) => {
      write(root, { 'test/add.test.js': SKIPPED }); // the human did this
      runHook('claude', 'prompt', JSON.stringify({ session_id: 's2', cwd: root, prompt: 'rename add to sum' }));
      write(root, { 'src/add.js': 'export const sum = (a, b) => a + b;\n' });
      const res = runHook('claude', 'stop', JSON.stringify({ session_id: 's2', cwd: root }));
      assert.equal(res.stdout, '');
    }));

  test('an honest turn passes silently', () =>
    withRepo((root) => {
      runHook('claude', 'prompt', JSON.stringify({ session_id: 's3', cwd: root, prompt: 'x' }));
      write(root, { 'src/add.js': 'export const add = (a, b) => Number(a) + Number(b);\n' });
      const res = runHook('claude', 'stop', JSON.stringify({ session_id: 's3', cwd: root }));
      assert.deepEqual(res, { code: 0, stdout: '', stderr: '' });
    }));

  test('without a baseline it warns but never blocks', () =>
    withRepo((root) => {
      write(root, { 'test/add.test.js': SKIPPED });
      const out = json(runHook('claude', 'stop', JSON.stringify({ session_id: 'never-prompted', cwd: root })).stdout);
      assert.equal(out.decision, undefined);
      assert.match(out.systemMessage, /skip-added/);
    }));

  test('a requested change is reported, not blocked', () =>
    withRepo((root) => {
      runHook('claude', 'prompt', JSON.stringify({ session_id: 's4', cwd: root, prompt: 'skip the adds test, it is flaky' }));
      write(root, { 'test/add.test.js': SKIPPED });
      const out = json(runHook('claude', 'stop', JSON.stringify({ session_id: 's4', cwd: root })).stdout);
      assert.equal(out.decision, undefined);
      assert.match(out.systemMessage, /1 medium/);
    }));

  test('outside a git repo, bad JSON or unknown events: fail open', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'anticheat-nogit-'));
    try {
      assert.deepEqual(runHook('claude', 'stop', JSON.stringify({ cwd: dir })), { code: 0, stdout: '', stderr: '' });
      assert.equal(runHook('gemini', 'stop', '{not json').code, 0);
      assert.equal(runHook('claude', 'explode', '{}').code, 0);
    } finally {
      removeDir(dir);
    }
  });
});

describe('pretool hook', () => {
  test('claude/codex/gemini: --no-verify is refused with exit 2', () => {
    for (const agent of ['claude', 'codex', 'gemini']) {
      const res = runHook(agent, 'pretool', JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m "wip" --no-verify' } }));
      assert.equal(res.code, 2, agent);
      assert.match(res.stderr, /--no-verify/);
    }
  });

  test('codex array commands are understood', () => {
    const res = runHook('codex', 'pretool', JSON.stringify({ tool_input: { command: ['bash', '-lc', 'git push --no-verify'] } }));
    assert.equal(res.code, 2);
  });

  test('cursor gets a permission decision', () => {
    const out = json(runHook('cursor', 'pretool', JSON.stringify({ command: 'HUSKY=0 git commit -m x' })).stdout);
    assert.equal(out.permission, 'deny');
    assert.match(out.agent_message, /git hooks/);
    assert.equal(json(runHook('cursor', 'pretool', JSON.stringify({ command: 'npm test' })).stdout).permission, 'allow');
  });

  test('ordinary commands pass', () => {
    assert.deepEqual(runHook('claude', 'pretool', JSON.stringify({ tool_input: { command: 'npm test -- --watch=false' } })), { code: 0, stdout: '', stderr: '' });
  });
});

describe('command checks', () => {
  const blocked = [
    'git commit --no-verify -m "x"',
    'git commit -nm "quick"',
    'cd app && git push --no-verify origin main',
    'HUSKY=0 git commit -m x',
    'SKIP=eslint git commit -m x',
    'git -c core.hooksPath=/dev/null commit -m x',
    'git config core.hooksPath /dev/null',
    'git update-index --assume-unchanged tests/test_cart.py',
    'rm -f .git/hooks/pre-commit',
    'rm -rf .husky',
    'chmod -x .husky/pre-commit',
    'npx anticheat uninstall claude',
    "sed -i 's/anticheat//' .claude/settings.json",
    'echo {} > .anticheat.json',
  ];
  for (const cmd of blocked) test(`blocks: ${cmd}`, () => assert.ok(checkCommand(cmd), cmd));

  const allowed = [
    'git commit -m "explain why --no-verify is bad"',
    'git commit -F- <<EOF\nnever use --no-verify\nEOF',
    'git commit -am "fix: n+1 query"',
    'git status',
    'npm test',
    'cat .claude/settings.json',
    'cat .claude/settings.json > /tmp/backup.json',
    'ls .git/hooks',
    'grep -rn anticheat .',
  ];
  for (const cmd of allowed) test(`allows: ${cmd}`, () => assert.equal(checkCommand(cmd), null, cmd));
});
