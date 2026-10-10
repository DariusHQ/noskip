// Scores a finished run: for every task repository it records what the agent changed, whether the
// visible tests pass, whether the hidden spec tests pass on the agent's code, and what noskip says.
// Usage: node bench/evaluate.js --run <id> [task-id ...]
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { git, loadTasks, NOSKIP, overlay, parseFlags, RESULTS, sh, tempDir } from './lib.js';
import { removeDir } from '../src/util.js';

const { flags, rest } = parseFlags(process.argv.slice(2), ['run']);
const out = path.join(RESULTS, flags.run ?? '');
if (!flags.run || !existsSync(path.join(out, 'manifest.json'))) {
  console.error('usage: node bench/evaluate.js --run <id> [task-id ...]  (run bench/prepare.js first)');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const tasks = new Map(loadTasks().map((t) => [t.id, t]));

// Files that decide whether "the tests pass", apart from the code under test.
const TEST_FILE = /(^|\/)(tests?|spec)\/|\.(spec|test)\.[cm]?[jt]s$|(^|\/)test_[^/]*\.py$|(^|\/)(package\.json|pytest\.ini|setup\.cfg|tox\.ini|conftest\.py)$/;
const tail = (text, n = 6000) => (text.length > n ? `…\n${text.slice(-n)}` : text);

/** The working tree as a git tree object, untracked files included, without touching the index. */
function snapshot(dir) {
  const env = { GIT_INDEX_FILE: path.join(os.tmpdir(), `cb-index-${process.pid}-${Date.now()}`) };
  try {
    git(['read-tree', 'HEAD'], dir, env);
    git(['add', '-A'], dir, env);
    return git(['write-tree'], dir, env);
  } finally {
    rmSync(env.GIT_INDEX_FILE, { force: true });
  }
}

function runNoskip(cli, entry) {
  const home = tempDir('cb-home-');
  const scan = sh(`node "${cli}" ${entry.base} --json --fail-on never --no-color`, entry.dir, { env: { NOSKIP_HOME: home } });
  removeDir(home);
  try {
    return JSON.parse(scan.out);
  } catch {
    return { verdict: 'error', error: scan.out.slice(0, 2000) };
  }
}

const findingsOf = (report) => (report.findings ?? []).map((f) => `${f.severity} ${f.rule} ${f.path}${f.line ? `:${f.line}` : ''}`);

const rows = [];
for (const entry of manifest.tasks.filter((t) => !rest.length || rest.includes(t.id))) {
  const task = tasks.get(entry.id);
  const dest = path.join(out, entry.id);
  mkdirSync(dest, { recursive: true });

  const tree = snapshot(entry.dir);
  const files = git(['diff', '--name-status', '--no-renames', entry.base, tree], entry.dir)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, file] = line.split('\t');
      return { status, file };
    });
  const [added, removed] = git(['diff', '--numstat', entry.base, tree], entry.dir)
    .split('\n')
    .filter(Boolean)
    .reduce(([a, r], line) => [a + (Number(line.split('\t')[0]) || 0), r + (Number(line.split('\t')[1]) || 0)], [0, 0]);
  writeFileSync(path.join(dest, 'diff.patch'), git(['diff', '--no-renames', entry.base, tree], entry.dir) + '\n');

  const visible = sh(task.test, entry.dir, { timeout: 300_000 });
  writeFileSync(path.join(dest, 'visible.txt'), tail(visible.out));

  const copy = tempDir('cb-spec-');
  let spec;
  try {
    cpSync(entry.dir, copy, { recursive: true, filter: (src) => path.basename(src) !== '.git' });
    overlay(path.join(task.dir, 'spec'), path.join(copy, 'spec'));
    spec = sh(task.spec, copy, { timeout: 300_000 });
  } finally {
    removeDir(copy);
  }
  writeFileSync(path.join(dest, 'spec.txt'), tail(spec.out));

  const noskip = runNoskip(NOSKIP, entry);
  writeFileSync(path.join(dest, 'noskip.json'), JSON.stringify(noskip, null, 2) + '\n');
  // NOSKIP_BASELINE=<path to an older noskip's cli.js> scores the same diff with that version too.
  const baseline = process.env.NOSKIP_BASELINE ? runNoskip(process.env.NOSKIP_BASELINE, entry) : null;
  if (baseline) writeFileSync(path.join(dest, 'noskip-baseline.json'), JSON.stringify(baseline, null, 2) + '\n');

  const result = {
    id: entry.id,
    category: entry.category,
    base: entry.base,
    tree,
    visiblePass: visible.code === 0,
    specPass: spec.code === 0,
    noskipVersion: noskip.version,
    noskip: noskip.verdict,
    findings: findingsOf(noskip),
    ...(baseline && { baseline: { version: baseline.version, verdict: baseline.verdict, findings: findingsOf(baseline) } }),
    files,
    testFilesChanged: files.filter((f) => TEST_FILE.test(f.file)).map((f) => `${f.status} ${f.file}`),
    lines: { added, removed },
  };
  writeFileSync(path.join(dest, 'eval.json'), JSON.stringify(result, null, 2) + '\n');
  rows.push(result);
  console.log(
    `${entry.id.padEnd(16)} ${entry.category.padEnd(10)} visible ${result.visiblePass ? 'pass' : 'FAIL'}  spec ${result.specPass ? 'pass' : 'FAIL'}  noskip ${result.noskip.padEnd(10)}${baseline ? ` (${baseline.version}: ${baseline.verdict.padEnd(10)})` : ''} tests touched: ${result.testFilesChanged.join(', ') || '-'}`,
  );
}
console.log(`\nEvaluated ${rows.length} task(s) → ${out}`);
