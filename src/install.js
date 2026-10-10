import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitPath } from './git.js';
import { VERSION } from './util.js';

export const TARGETS = ['claude', 'codex', 'gemini', 'cursor', 'git', 'github'];

const OURS = /\bnoskip\b/;
const MAJOR = VERSION.split('.')[0];

export const NPX_COMMAND = `npx -y noskip@${MAJOR}`;

/**
 * How hooks should launch noskip.
 * - Project config is usually committed and shared, so it gets the portable `npx` form.
 * - A user-level (--global) install from a stable location (global npm install, checkout)
 *   gets a direct `node <path>` call, which skips npm's startup on every hook.
 */
export function defaultCommand({ global = false } = {}) {
  const cli = fileURLToPath(new URL('./cli.js', import.meta.url));
  const ephemeral = /[\\/](_npx|npm-cache|\.npm|pnpm[\\/]dlx|bunx-[^\\/]*)[\\/]/i.test(cli) || process.env.npm_command === 'exec';
  if (!global || ephemeral) return NPX_COMMAND;
  return `node "${cli.replace(/\\/g, '/')}"`;
}

function readJSON(file, fallback) {
  if (!existsSync(file)) return fallback;
  const text = readFileSync(file, 'utf8');
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`could not parse ${file} (${err.message}); add the hooks by hand, see the README`);
  }
}

function writeJSON(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

/** Claude Code / Codex / Gemini share the event -> [{matcher, hooks:[{type, command}]}] shape. */
function setNestedHooks(settings, events) {
  settings.hooks ??= {};
  for (const [event, spec] of Object.entries(events)) {
    const groups = (settings.hooks[event] ?? [])
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !OURS.test(h.command ?? '')) }))
      .filter((g) => g.hooks.length);
    if (spec) {
      const handler = { type: 'command', command: spec.command };
      if (spec.timeout) handler.timeout = spec.timeout;
      groups.push({ ...(spec.matcher ? { matcher: spec.matcher } : {}), hooks: [handler] });
    }
    if (groups.length) settings.hooks[event] = groups;
    else delete settings.hooks[event];
  }
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  return settings;
}

function setCursorHooks(settings, events) {
  settings.version ??= 1;
  settings.hooks ??= {};
  for (const [event, spec] of Object.entries(events)) {
    const list = (settings.hooks[event] ?? []).filter((h) => !OURS.test(h.command ?? ''));
    if (spec) list.push({ command: spec.command, ...(spec.extra ?? {}) });
    if (list.length) settings.hooks[event] = list;
    else delete settings.hooks[event];
  }
  return settings;
}

function agentFile(target, root, global) {
  const base = global ? os.homedir() : root;
  return {
    claude: path.join(base, '.claude', 'settings.json'),
    codex: path.join(base, '.codex', 'hooks.json'),
    gemini: path.join(base, '.gemini', 'settings.json'),
    cursor: path.join(base, '.cursor', 'hooks.json'),
  }[target];
}

function agentEvents(target, cmd, remove = false) {
  const h = (event, extra = {}) => (remove ? null : { command: `${cmd} hook ${target} ${event}`, ...extra });
  switch (target) {
    case 'claude':
      return {
        UserPromptSubmit: h('prompt', { timeout: 30 }),
        Stop: h('stop', { timeout: 120 }),
        PreToolUse: h('pretool', { matcher: 'Bash', timeout: 10 }),
      };
    case 'codex':
      return {
        UserPromptSubmit: h('prompt', { timeout: 30 }),
        Stop: h('stop', { timeout: 120 }),
        PreToolUse: h('pretool', { timeout: 10 }),
      };
    case 'gemini':
      return {
        BeforeAgent: h('prompt', { timeout: 30000 }),
        AfterAgent: h('stop', { timeout: 120000 }),
        BeforeTool: h('pretool', { matcher: 'run_shell_command', timeout: 10000 }),
      };
    case 'cursor':
      return {
        beforeSubmitPrompt: h('prompt'),
        stop: h('stop', { extra: { loop_limit: 1 } }),
        beforeShellExecution: h('pretool'),
      };
    default:
      throw new Error(`unknown target ${target}`);
  }
}

const NOTES = {
  claude: 'Claude Code: active in new sessions. Tip: `/plugin` install is even simpler, see the README.',
  codex: 'Codex: open `/hooks` once and trust the noskip hooks (Codex skips untrusted hooks).',
  gemini: 'Gemini CLI: active in new sessions.',
  cursor: 'Cursor: reload the window to pick up .cursor/hooks.json.',
};

function installAgent(target, { root, global, command, remove }) {
  const file = agentFile(target, root, global);
  if (remove && !existsSync(file)) return { target, file, changed: false };
  const before = readJSON(file, {});
  const settings = structuredClone(before);
  const events = agentEvents(target, command, remove);
  if (target === 'cursor') setCursorHooks(settings, events);
  else setNestedHooks(settings, events);
  const changed = JSON.stringify(before) !== JSON.stringify(settings);
  if (changed) writeJSON(file, settings);
  return { target, file, changed, note: remove ? undefined : NOTES[target] };
}

const GIT_MARK = '# noskip: block commits that game the tests';

function installGit({ root, command, remove }) {
  const husky = path.join(root, '.husky');
  const file = existsSync(husky) ? path.join(husky, 'pre-commit') : path.join(gitPath(root, 'hooks'), 'pre-commit');
  const line = `${command} --staged`;
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (remove) {
    if (!current || !current.includes(GIT_MARK)) return { target: 'git', file, changed: false };
    const next = current.replace(new RegExp(`\\n?${GIT_MARK}\\n[^\\n]*\\n?`), '\n');
    writeFileSync(file, next);
    return { target: 'git', file, changed: true };
  }
  if (current && current.includes(GIT_MARK)) return { target: 'git', file, changed: false };
  let next;
  if (current === null) next = `${file.includes('.husky') ? '' : '#!/bin/sh\n'}${GIT_MARK}\n${line}\n`;
  else next = `${current.replace(/\s*$/, '')}\n\n${GIT_MARK}\n${line}\n`;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, next);
  try {
    chmodSync(file, 0o755);
  } catch {
    /* Windows */
  }
  const note = current && /^\s*exit\s+0\s*$/m.test(current) ? `Your existing hook has an \`exit 0\`; move the noskip line above it.` : undefined;
  return { target: 'git', file, changed: true, note };
}

export const WORKFLOW = `name: noskip
on:
  pull_request:
permissions:
  contents: read
jobs:
  noskip:
    name: Catch test-gaming changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: DariusHQ/noskip@v${MAJOR}
`;

function installGitHub({ root, remove }) {
  const file = path.join(root, '.github', 'workflows', 'noskip.yml');
  if (remove) return { target: 'github', file, changed: false, note: `Delete ${file} by hand if you no longer want it.` };
  if (existsSync(file)) return { target: 'github', file, changed: false };
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, WORKFLOW);
  return { target: 'github', file, changed: true, note: 'Commit the workflow; it runs on every pull request.' };
}

/** Which agents look present on this machine / in this project. */
export function detectTargets(root, home = os.homedir()) {
  const has = (...parts) => parts.some((p) => p && existsSync(p));
  const found = [];
  if (has(path.join(home, '.claude'), root && path.join(root, '.claude'), root && path.join(root, 'CLAUDE.md'))) found.push('claude');
  if (has(path.join(home, '.codex'), root && path.join(root, '.codex'), root && path.join(root, 'AGENTS.md'))) found.push('codex');
  if (has(path.join(home, '.cursor'), root && path.join(root, '.cursor'))) found.push('cursor');
  if (has(path.join(home, '.gemini'), root && path.join(root, '.gemini'), root && path.join(root, 'GEMINI.md'))) found.push('gemini');
  if (root) found.push('git');
  if (root && has(path.join(root, '.github'))) found.push('github');
  return found;
}

export function install(target, { root, global = false, command = defaultCommand({ global }), remove = false } = {}) {
  if (!TARGETS.includes(target)) throw new Error(`unknown target "${target}". Choose from: ${TARGETS.join(', ')}`);
  if (target === 'git') {
    if (!root) throw new Error('not inside a git repository');
    return installGit({ root, command, remove });
  }
  if (target === 'github') {
    if (!root) throw new Error('not inside a git repository');
    return installGitHub({ root, remove });
  }
  if (!global && !root) throw new Error('not inside a git repository (use --global for a user-level install)');
  return installAgent(target, { root, global, command, remove });
}
