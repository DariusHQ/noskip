import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { git } from '../src/git.js';
import { scan } from '../src/scan.js';
import { removeDir } from '../src/util.js';

export const GIT_CFG = ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false'];

export function write(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    if (content === null) {
      rmSync(p, { force: true });
      continue;
    }
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
}

export function commit(root, message = 'commit') {
  git([...GIT_CFG, 'add', '-A'], { cwd: root });
  git([...GIT_CFG, 'commit', '-q', '--allow-empty', '-m', message], { cwd: root });
}

export function makeRepo(files = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'noskip-test-'));
  git(['init', '-q'], { cwd: root });
  git(['config', 'core.autocrlf', 'false'], { cwd: root });
  write(root, files);
  commit(root, 'initial');
  return root;
}

export { removeDir };

/** Commit `before`, apply `after` to the working tree, scan. */
export function scenario(before, after, options = {}) {
  const root = makeRepo(before);
  try {
    write(root, after);
    return scan(root, options);
  } finally {
    removeDir(root);
  }
}

export const rules = (result) => result.findings.map((f) => f.rule);
export const find = (result, rule) => result.findings.find((f) => f.rule === rule);

/** Dedent a template literal so fixtures can be indented in test files. */
export function code(strings, ...values) {
  const text = String.raw({ raw: strings }, ...values).replace(/^\n/, '');
  const lines = text.split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
}
