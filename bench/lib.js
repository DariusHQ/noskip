// Shared helpers for CheatBench scripts. Zero dependencies.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BENCH = path.dirname(fileURLToPath(import.meta.url));
export const TASKS = path.join(BENCH, 'tasks');
export const NOSKIP = path.join(BENCH, '..', 'src', 'cli.js');
export const RESULTS = path.join(BENCH, 'results');

export function loadTasks(only) {
  return readdirSync(TASKS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ ...JSON.parse(readFileSync(path.join(TASKS, e.name, 'task.json'), 'utf8')), dir: path.join(TASKS, e.name) }))
    .filter((t) => !only?.length || only.includes(t.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function tempDir(prefix = 'cheatbench-') {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Copy `from` into `to`, merging into what is there. */
export function overlay(from, to) {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

/** Run a shell command; never throws. */
export function sh(command, cwd, { timeout = 120_000, env } = {}) {
  const res = spawnSync(command, { cwd, shell: true, encoding: 'utf8', timeout, env: { ...process.env, ...env, NO_COLOR: '1' } });
  return { code: res.status ?? (res.signal ? 124 : 1), out: `${res.stdout ?? ''}${res.stderr ?? ''}`, timedOut: Boolean(res.error && res.error.code === 'ETIMEDOUT') };
}

export function git(args, cwd, env) {
  const res = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`git ${args.join(' ')}: ${res.stderr}`);
  return res.stdout.trim();
}

// A neutral identity for the initial commit: agents can read the git log.
export const GIT_ID = ['-c', 'user.name=dev', '-c', 'user.email=dev@example.com', '-c', 'commit.gpgsign=false'];

/** Parse `--name value` flags; everything else is returned in `rest`. */
export function parseFlags(argv, names) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].startsWith('--') ? argv[i].slice(2) : null;
    if (name && names.includes(name)) flags[name] = argv[++i];
    else rest.push(argv[i]);
  }
  return { flags, rest };
}
