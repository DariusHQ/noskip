import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/rules/index.js';
import { commit, makeRepo, removeDir, write } from './helpers.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const TEST = "it('adds', () => {\n  expect(add(2, 3)).toBe(5);\n});\n";

function run(args, cwd, env = {}) {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', GITHUB_ACTIONS: '', GITHUB_STEP_SUMMARY: '', ...env },
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

function cheatingRepo() {
  const root = makeRepo({ 'test/add.test.js': TEST });
  write(root, { 'test/add.test.js': TEST.replace("it('adds'", "it.skip('adds'") });
  return root;
}

describe('cli', () => {
  test('exits 1 on high findings and prints the verdict', () => {
    const root = cheatingRepo();
    try {
      const res = run([], root);
      assert.equal(res.code, 1, res.stderr);
      assert.match(res.stdout, /skip-added/);
      assert.match(res.stdout, /BUSTED/);
    } finally {
      removeDir(root);
    }
  });

  test('--fail-on never exits 0; --json is machine readable', () => {
    const root = cheatingRepo();
    try {
      assert.equal(run(['--fail-on', 'never'], root).code, 0);
      const res = run(['--json'], root);
      const data = JSON.parse(res.stdout);
      assert.equal(data.verdict, 'busted');
      assert.equal(data.findings[0].rule, 'skip-added');
      assert.equal(data.findings[0].path, 'test/add.test.js');
    } finally {
      removeDir(root);
    }
  });

  test('--staged only sees what is staged', () => {
    const root = cheatingRepo();
    try {
      assert.equal(run(['--staged'], root).code, 0);
      commit(root, 'wip'); // stages + commits the cheat
      assert.equal(run(['HEAD~1', '--head', 'HEAD'], root).code, 1);
    } finally {
      removeDir(root);
    }
  });

  test('--base compares against the merge-base', () => {
    const root = makeRepo({ 'test/add.test.js': TEST });
    try {
      spawnSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: root });
      write(root, { 'test/add.test.js': TEST.replace("it('adds'", "it.only('adds'") });
      commit(root, 'feature work');
      const res = run(['--base', 'HEAD~1', '--format', 'markdown'], root);
      assert.equal(res.code, 1);
      assert.match(res.stdout, /### 🚨 noskip: BUSTED/);
      assert.match(res.stdout, /`only-added`/);
    } finally {
      removeDir(root);
    }
  });

  test('github and sarif formats', () => {
    const root = cheatingRepo();
    try {
      const gh = run(['--format', 'github'], root);
      assert.match(gh.stdout, /^::error file=test\/add\.test\.js,line=1,title=noskip\/skip-added::/m);
      const sarif = JSON.parse(run(['--format', 'sarif'], root).stdout);
      assert.equal(sarif.version, '2.1.0');
      assert.equal(sarif.runs[0].results[0].ruleId, 'skip-added');
      assert.equal(sarif.runs[0].results[0].level, 'error');
    } finally {
      removeDir(root);
    }
  });

  test('clean repo exits 0', () => {
    const root = makeRepo({ 'test/add.test.js': TEST });
    try {
      const res = run([], root);
      assert.equal(res.code, 0);
      assert.match(res.stdout, /CLEAN/);
      assert.equal(run(['-q'], root).stdout, '');
    } finally {
      removeDir(root);
    }
  });

  test('usage errors exit 2', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'noskip-nogit-'));
    try {
      assert.equal(run([], dir).code, 2);
      assert.equal(run(['--bogus'], dir).code, 2);
      assert.equal(run(['--format', 'xml'], dir).code, 2);
    } finally {
      removeDir(dir);
    }
  });

  test('rules, badge, version, help and demo', () => {
    const cwd = os.tmpdir();
    const rules = run(['rules'], cwd).stdout;
    for (const r of RULES) assert.match(rules, new RegExp(`\\b${r.id}\\b`));
    assert.match(run(['badge'], cwd).stdout, /img\.shields\.io/);
    assert.match(run(['--version'], cwd).stdout, /^\d+\.\d+\.\d+/);
    assert.match(run(['--help'], cwd).stdout, /Usage/);
    const demo = run(['demo'], cwd);
    assert.equal(demo.code, 0, demo.stderr);
    for (const id of ['skip-added', 'test-removed', 'matcher-weakened', 'hardcoded-answer', 'ci-ignore-failure', 'coverage-lowered']) {
      assert.match(demo.stdout, new RegExp(id));
    }
  });

  test('hook command reads JSON from stdin', () => {
    const res = spawnSync(process.execPath, [CLI, 'hook', 'claude', 'pretool'], {
      input: JSON.stringify({ tool_input: { command: 'git commit --no-verify' } }),
      encoding: 'utf8',
    });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /noskip blocked/);
  });
});
