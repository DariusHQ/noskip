// Agent hook entry points. One protocol per agent, one behavior:
//   prompt  -> snapshot the working tree (the turn's baseline) and remember the request
//   stop    -> scan baseline -> now; on high findings, send the agent back to fix them (once)
//   pretool -> refuse shell commands that switch the checks off
// Every path fails open: a crash here must never wedge someone's agent.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { checkCommand } from './commands.js';
import { DEFAULT_CONFIG } from './config.js';
import { gitPath, headTree, repoRoot, worktreeTree } from './git.js';
import { requestedRules } from './intent.js';
import { loadConfig, scanTrees } from './scan.js';
import { atLeast } from './util.js';

export const AGENTS = ['claude', 'codex', 'gemini', 'cursor'];
export const EVENTS = ['prompt', 'stop', 'pretool'];

const STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function stateDir(root) {
  return gitPath(root, 'anticheat/sessions');
}

function stateFile(root, sessionId) {
  return path.join(stateDir(root), `${sessionId}.json`);
}

function loadState(root, sessionId) {
  try {
    return JSON.parse(readFileSync(stateFile(root, sessionId), 'utf8'));
  } catch {
    return null;
  }
}

function saveState(root, sessionId, state) {
  const dir = stateDir(root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(stateFile(root, sessionId), JSON.stringify(state));
  try {
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (now - statSync(p).mtimeMs > STATE_TTL_MS) rmSync(p, { force: true });
    }
  } catch {
    /* housekeeping only */
  }
}

// ---------- per-agent output shapes ----------

function allow(agent, event) {
  if (agent === 'cursor') {
    if (event === 'prompt') return out('{"continue":true}');
    if (event === 'pretool') return out('{"permission":"allow"}');
    return out('{}');
  }
  if (agent === 'gemini') return out('{}');
  return out('');
}

function block(agent, reason) {
  if (agent === 'cursor') return out(JSON.stringify({ followup_message: reason }));
  if (agent === 'gemini') return out(JSON.stringify({ decision: 'deny', reason }));
  return out(JSON.stringify({ decision: 'block', reason }));
}

function notify(agent, message) {
  if (agent === 'cursor') return out('{}');
  return out(JSON.stringify({ systemMessage: message }));
}

function deny(agent, agentMessage, userMessage) {
  if (agent === 'cursor') {
    return out(JSON.stringify({ permission: 'deny', user_message: userMessage, agent_message: agentMessage }));
  }
  // Claude Code, Codex and Gemini CLI all treat exit 2 + stderr as "blocked, tell the model why".
  return { code: 2, stdout: '', stderr: agentMessage };
}

function out(stdout, code = 0) {
  return { code, stdout, stderr: '' };
}

// ---------- messages ----------

export function agentMessage(findings) {
  const lines = ['anticheat flagged changes that make tests pass without fixing the code:', ''];
  for (const f of findings.slice(0, 12)) {
    lines.push(`- [${f.severity}] ${f.rule} at ${f.path}:${f.line}: ${f.message}`);
    if (f.snippet) lines.push(`    ${f.snippet}`);
    if (f.hint) lines.push(`    fix: ${f.hint}`);
  }
  if (findings.length > 12) lines.push(`- …and ${findings.length - 12} more (run \`npx @dariushq/anticheat\` to see all)`);
  lines.push(
    '',
    'Undo these shortcuts and fix the underlying code instead.',
    'If the user explicitly asked for one of these changes, keep it and say so plainly in your reply so they can review it.',
  );
  return lines.join('\n');
}

export function userMessage(result) {
  const { counts, findings } = result;
  const top = findings
    .slice(0, 3)
    .map((f) => `${f.rule} ${f.path}:${f.line}`)
    .join(', ');
  return `anticheat: ${counts.high} high, ${counts.medium} medium finding${counts.high + counts.medium === 1 ? '' : 's'} in this turn (${top}${findings.length > 3 ? ', …' : ''}). Review with: npx @dariushq/anticheat`;
}

// ---------- input parsing ----------

function parseInput(raw) {
  try {
    const v = raw && raw.trim() ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function sessionIdOf(input) {
  const id = input.session_id ?? input.conversation_id ?? input.sessionId ?? 'default';
  return String(id).replace(/[^\w.-]/g, '_').slice(0, 120) || 'default';
}

function cwdOf(input) {
  if (typeof input.cwd === 'string' && input.cwd) return input.cwd;
  if (Array.isArray(input.workspace_roots) && input.workspace_roots[0]) return input.workspace_roots[0];
  return process.env.CLAUDE_PROJECT_DIR || process.env.GEMINI_PROJECT_DIR || process.cwd();
}

function commandOf(agent, input) {
  if (agent === 'cursor') return typeof input.command === 'string' ? input.command : null;
  const ti = input.tool_input ?? {};
  const cmd = ti.command ?? ti.cmd ?? null;
  if (Array.isArray(cmd)) return cmd.join(' ');
  return typeof cmd === 'string' ? cmd : null;
}

// ---------- events ----------

function onPrompt(agent, input, root) {
  const prompt = String(input.prompt ?? input.user_prompt ?? '').slice(0, 8000);
  saveState(root, sessionIdOf(input), { tree: worktreeTree(root), prompt, at: Date.now() });
  return allow(agent, 'prompt');
}

function onStop(agent, input, root) {
  if (agent === 'cursor' && input.status && input.status !== 'completed') return allow(agent, 'stop');
  const state = loadState(root, sessionIdOf(input));
  const oldTree = state?.tree ?? headTree(root);
  const newTree = worktreeTree(root);
  if (oldTree === newTree) return allow(agent, 'stop');

  let config;
  try {
    config = loadConfig(root, oldTree);
  } catch {
    config = { ...DEFAULT_CONFIG }; // a broken config must not wedge the agent; scan with defaults
  }
  const result = scanTrees({ root, oldTree, newTree, config, prompt: state?.prompt });
  if (!result.findings.length) return allow(agent, 'stop');

  const failOn = result.failOn ?? 'high';
  const retried = Boolean(input.stop_hook_active) || (agent === 'cursor' && Number(input.loop_count) > 0);
  // Without a baseline we can't tell this turn's edits from earlier ones, so only warn.
  const blocking = state ? result.findings.filter((f) => atLeast(f.severity, failOn)) : [];
  if (blocking.length && !retried) return block(agent, agentMessage(result.findings.filter((f) => f.severity !== 'low')));
  if (result.counts.high + result.counts.medium === 0) return allow(agent, 'stop');
  return notify(agent, userMessage(result));
}

function onPreTool(agent, input) {
  const cmd = commandOf(agent, input);
  const hit = checkCommand(cmd);
  if (!hit) return allow(agent, 'pretool'); // the hot path: no git, no disk
  let root = null;
  try {
    root = repoRoot(cwdOf(input));
  } catch {
    /* only needed to read what the user asked for */
  }
  const state = root ? loadState(root, sessionIdOf(input)) : null;
  if (requestedRules(state?.prompt).has(hit.rule)) return allow(agent, 'pretool');
  return deny(
    agent,
    `anticheat blocked this command: ${hit.message}. Fix what the checks report instead. If the user explicitly wants this, ask them to run it themselves.`,
    `anticheat blocked: ${hit.segment}`,
  );
}

/** Run one hook. Returns { code, stdout, stderr } so it can be tested without a process. */
export function runHook(agent, event, raw) {
  if (!AGENTS.includes(agent) || !EVENTS.includes(event)) {
    return { code: 0, stdout: '', stderr: `anticheat: unknown hook ${agent} ${event}` };
  }
  try {
    const input = parseInput(raw);
    if (event === 'pretool') return onPreTool(agent, input);
    const root = repoRoot(cwdOf(input));
    if (!root) return allow(agent, event);
    if (event === 'prompt') return onPrompt(agent, input, root);
    return onStop(agent, input, root);
  } catch (err) {
    const res = allow(agent, event);
    res.stderr = `anticheat: hook error (${err.message}); allowing.`;
    return res;
  }
}
