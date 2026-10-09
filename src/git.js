import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

export class GitError extends Error {}

const MAX_BUFFER = 512 * 1024 * 1024;

// Neutralize user config that would change the shape of diff output.
const DIFF_CONFIG = [
  '-c', 'core.quotePath=false',
  '-c', 'diff.noprefix=false',
  '-c', 'diff.mnemonicPrefix=false',
  '-c', 'diff.relative=false',
  '-c', 'color.ui=false',
];

export function git(args, { cwd, input, env, allowFail = false, buffer = false } = {}) {
  const res = spawnSync('git', args, {
    cwd,
    input: typeof input === 'string' ? Buffer.from(input, 'utf8') : input,
    env: env ? { ...process.env, ...env } : process.env,
    maxBuffer: MAX_BUFFER,
    encoding: buffer ? 'buffer' : 'utf8',
    windowsHide: true,
  });
  if (res.error) {
    if (res.error.code === 'ENOENT') throw new GitError('git is not installed or not on PATH');
    throw new GitError(`git ${args[0]} failed: ${res.error.message}`);
  }
  if (res.status !== 0 && !allowFail) {
    const stderr = String(res.stderr || '').trim().split('\n').slice(-3).join('\n');
    throw new GitError(`git ${args.join(' ')} failed (exit ${res.status})${stderr ? `: ${stderr}` : ''}`);
  }
  return res;
}

export function repoRoot(cwd) {
  const res = git(['rev-parse', '--show-toplevel'], { cwd, allowFail: true });
  if (res.status !== 0) return null;
  return path.resolve(res.stdout.trim());
}

/** Resolve a path inside the git dir (handles worktrees and core.hooksPath-free layouts). */
export function gitPath(root, name) {
  const out = git(['rev-parse', '--git-path', name], { cwd: root }).stdout.trim();
  return path.resolve(root, out);
}

export function resolveCommit(root, rev) {
  const res = git(['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { cwd: root, allowFail: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

export function resolveTree(root, rev) {
  const res = git(['rev-parse', '--verify', '--quiet', `${rev}^{tree}`], { cwd: root, allowFail: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

export function emptyTree(root) {
  return git(['mktree'], { cwd: root, input: '' }).stdout.trim();
}

export function headTree(root) {
  return resolveTree(root, 'HEAD') || emptyTree(root);
}

export function mergeBase(root, a, b = 'HEAD') {
  const res = git(['merge-base', a, b], { cwd: root, allowFail: true });
  return res.status === 0 ? res.stdout.trim() : null;
}

/** The staged snapshot (what `git commit` would record). */
export function indexTree(root) {
  return git(['write-tree'], { cwd: root }).stdout.trim();
}

/**
 * Snapshot the whole working tree (tracked + untracked, honoring .gitignore) as a tree
 * object, without touching the real index, HEAD or any file on disk.
 */
export function worktreeTree(root) {
  const dir = gitPath(root, 'anticheat');
  mkdirSync(dir, { recursive: true });
  const tmpIndex = path.join(dir, `index-${process.pid}-${Date.now()}`);
  const realIndex = gitPath(root, 'index');
  try {
    // Seeding from the real index keeps git's stat cache, so only changed files get re-hashed.
    if (existsSync(realIndex)) copyFileSync(realIndex, tmpIndex);
    const env = { GIT_INDEX_FILE: tmpIndex };
    // --ignore-errors: an unreadable file (locked, permission denied) must not hide every other change.
    git(['add', '--all', '--ignore-errors', '--', '.'], { cwd: root, env, allowFail: true });
    return git(['write-tree'], { cwd: root, env }).stdout.trim();
  } finally {
    rmSync(tmpIndex, { force: true });
    rmSync(tmpIndex + '.lock', { force: true });
  }
}

export function diffTrees(root, oldTree, newTree) {
  return git(
    [
      ...DIFF_CONFIG,
      'diff',
      '--no-color',
      '--no-ext-diff',
      '--no-textconv',
      '--find-renames',
      '--unified=0',
      '--src-prefix=a/',
      '--dst-prefix=b/',
      oldTree,
      newTree,
      '--',
    ],
    { cwd: root },
  ).stdout;
}

export function listTree(root, tree) {
  const out = git(['ls-tree', '-r', '-z', '--name-only', tree], { cwd: root }).stdout;
  return out.split('\0').filter(Boolean);
}

/**
 * Read many blobs in one `git cat-file --batch` call.
 * Returns Map<spec, string|null>; null for missing, binary or oversized blobs.
 */
export function readBlobs(root, specs, { maxBytes = 2 * 1024 * 1024 } = {}) {
  const result = new Map();
  const unique = [...new Set(specs)].filter((s) => !/[\n\r]/.test(s));
  if (unique.length === 0) return result;
  const out = git(['cat-file', '--batch'], { cwd: root, input: unique.join('\n') + '\n', buffer: true }).stdout;
  let pos = 0;
  for (const spec of unique) {
    const nl = out.indexOf(10, pos);
    if (nl === -1) break;
    const header = out.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const m = /^([0-9a-f]+) (\w+) (\d+)$/.exec(header);
    if (!m) {
      result.set(spec, null); // "<spec> missing" or "ambiguous"
      continue;
    }
    const size = Number(m[3]);
    const body = out.subarray(pos, pos + size);
    pos += size + 1; // trailing LF after each object
    if (m[2] !== 'blob' || size > maxBytes || looksBinary(body)) {
      result.set(spec, null);
      continue;
    }
    result.set(spec, body.toString('utf8'));
  }
  return result;
}

function looksBinary(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return true;
  return false;
}
