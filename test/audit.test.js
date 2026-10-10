import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { audit, detectAgent, formatAudit, formatAuditJSON, formatAuditMarkdown } from '../src/audit.js';
import { commit, makeRepo, removeDir, write } from './helpers.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const TEST = "it('adds', () => {\n  expect(add(2, 3)).toBe(5);\n});\n\nit('subtracts', () => {\n  expect(sub(5, 3)).toBe(2);\n});\n";

/** A small history: an honest commit, an AI commit that skips a test, a human one that edits an expectation. */
function history() {
  const root = makeRepo({ 'src/math.js': 'export const add = (a, b) => a + b;\n', 'test/math.test.js': TEST });
  write(root, { 'src/math.js': 'export const add = (a, b) => a + b;\nexport const sub = (a, b) => a - b;\n' });
  commit(root, 'add sub');
  write(root, { 'test/math.test.js': TEST.replace("it('subtracts'", "it.skip('subtracts'") });
  commit(root, 'fix failing tests\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
  write(root, { 'test/math.test.js': TEST.replace("it('subtracts'", "it.skip('subtracts'").replace('toBe(5)', 'toBe(6)') });
  commit(root, 'update expectation');
  return root;
}

describe('audit', () => {
  test('finds the commits that gamed the tests and who wrote them', () => {
    const root = history();
    try {
      const a = audit(root, { last: 10 });
      assert.equal(a.audited, 3);
      assert.equal(a.aiAssisted, 1);
      assert.equal(a.busted, 1);
      assert.equal(a.suspicious, 1);
      const [suspicious, busted] = [a.flagged[0], a.flagged[1]];
      assert.equal(busted.agent, 'Claude Code');
      assert.equal(busted.subject, 'fix failing tests');
      assert.deepEqual(busted.findings.map((f) => f.rule), ['skip-added']);
      assert.equal(suspicious.agent, null);
      assert.deepEqual(suspicious.findings.map((f) => f.rule), ['expected-changed']);
      assert.deepEqual(a.rules, { 'expected-changed': 1, 'skip-added': 1 });

      const text = formatAudit(a);
      assert.match(text, /3 commits on HEAD · 1 AI-assisted/);
      assert.match(text, /Claude Code {2}“fix failing tests”/);
      assert.match(text, /1 commit gamed the tests/);
      assert.equal(JSON.parse(formatAuditJSON(a)).busted, 1);
      assert.match(formatAuditMarkdown(a), /\| `[0-9a-f]{7}` fix failing tests \| [\d-]+ \| Claude Code \| 🔴 `skip-added`/);
    } finally {
      removeDir(root);
    }
  });

  test('--ai-only, --last and a clean history', () => {
    const root = history();
    try {
      assert.equal(audit(root, { aiOnly: true }).audited, 1);
      assert.equal(audit(root, { last: 1 }).audited, 1);
      const clean = audit(root, { ref: 'HEAD~2' });
      assert.equal(clean.flagged.length, 0);
      assert.match(formatAudit(clean), /CLEAN/);
    } finally {
      removeDir(root);
    }
  });

  test('CLI: exit 1 when a commit gamed the tests, JSON output, bad input', () => {
    const root = history();
    try {
      const run = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
      const res = run(['audit']);
      assert.equal(res.status, 1, res.stderr);
      assert.match(res.stdout, /noskip audit/);
      assert.equal(JSON.parse(run(['audit', '--json']).stdout).aiAssisted, 1);
      assert.equal(run(['audit', '--fail-on', 'never']).status, 0);
      assert.equal(run(['audit', '--last', 'zero']).status, 2);
      assert.equal(run(['audit', 'nope']).status, 2);
    } finally {
      removeDir(root);
    }
  });
});

describe('AI commit detection', () => {
  const cases = [
    ['Dev <d@x.io>', 'fix\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', 'Claude Code'],
    ['Dev <d@x.io>', 'feat\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)', 'Claude Code'],
    ['claude[bot] <209825114+claude[bot]@users.noreply.github.com>', 'fix tests', 'Claude Code'],
    ['Dev <d@x.io>', 'fix\n\nCo-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>', 'Copilot'],
    ['copilot-swe-agent[bot] <x@users.noreply.github.com>', 'Fix flaky test', 'Copilot'],
    ['Dev <d@x.io>', 'fix\n\nCo-authored-by: Cursor Agent <cursoragent@cursor.com>', 'Cursor'],
    ['devin-ai-integration[bot] <x@users.noreply.github.com>', 'fix', 'Devin'],
    ['google-labs-jules[bot] <x@users.noreply.github.com>', 'fix', 'Gemini'],
    ['Dev <d@x.io>', 'aider: fix the parser', 'Aider'],
  ];
  for (const [author, message, agent] of cases) test(`${agent}: ${message.split('\n').pop().slice(0, 40)}`, () => assert.equal(detectAgent(author, message), agent));

  test('ordinary commits are human', () => {
    assert.equal(detectAgent('Dev <d@x.io>', 'Add Claude Code plugin support'), null);
    assert.equal(detectAgent('Dev <d@x.io>', 'Co-authored-by: Ana <ana@x.io>'), null);
  });
});
