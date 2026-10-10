// Local, best-effort counters of what the agent hooks saw. Never leaves the machine.
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeColors } from './util.js';

const AGENT_NAMES = { claude: 'Claude Code', codex: 'Codex', gemini: 'Gemini CLI', cursor: 'Cursor' };
const MAX_DAYS = 400;

export function statsFile() {
  const home = process.env.NOSKIP_HOME || path.join(os.homedir(), '.noskip');
  return path.join(home, 'stats.json');
}

function emptyStats() {
  return { version: 1, since: null, turns: 0, caught: 0, refused: 0, rules: {}, agents: {}, repos: {}, days: {} };
}

export function loadStats(file = statsFile()) {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8'));
    if (s && s.version === 1) return { ...emptyStats(), ...s };
  } catch {
    /* missing or unreadable: start fresh */
  }
  return emptyStats();
}

/**
 * event: 'turn'    an agent turn that changed files was reviewed
 *        'caught'  the agent was sent back for gaming the tests
 *        'refused' a command that switches checks off was blocked
 */
export function recordStats(event, { agent, repo, rules = [] } = {}, file = statsFile()) {
  try {
    const s = loadStats(file);
    const day = new Date().toISOString().slice(0, 10);
    s.since ??= day;
    const d = (s.days[day] ??= { turns: 0, caught: 0, refused: 0 });
    if (event === 'turn') {
      s.turns++;
      d.turns++;
    } else if (event === 'caught' || event === 'refused') {
      s[event]++;
      d[event]++;
      if (agent) s.agents[agent] = (s.agents[agent] ?? 0) + 1;
      if (repo) s.repos[repo] = (s.repos[repo] ?? 0) + 1;
      for (const r of new Set(rules)) s.rules[r] = (s.rules[r] ?? 0) + 1;
    } else return;
    const days = Object.keys(s.days).sort();
    for (const k of days.slice(0, Math.max(0, days.length - MAX_DAYS))) delete s.days[k];
    mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(s));
    try {
      renameSync(tmp, file);
    } catch {
      rmSync(tmp, { force: true });
    }
  } catch {
    /* stats must never get in the agent's way */
  }
}

const top = (obj, n) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);

export function formatStats(s, { color = false } = {}) {
  const c = makeColors(color);
  if (!s.turns && !s.caught && !s.refused) {
    return [
      '',
      `${c.bold('noskip stats')}  ${c.dim('nothing recorded yet')}`,
      '',
      'Stats are collected by the agent hooks, locally, as your agents work.',
      `Set them up:  ${c.cyan('npx noskip install')}`,
      '',
    ].join('\n');
  }
  const pct = s.turns ? ` ${c.dim(`${((100 * s.caught) / s.turns).toFixed(1)}% of turns`)}` : '';
  const num = (n) => String(n).padStart(6);
  const out = [
    '',
    `${c.bold('noskip stats')}  ${c.dim(`since ${s.since}`)}`,
    '',
    `  Agent turns that changed code  ${c.bold(num(s.turns))}`,
    `  Caught gaming the tests        ${c.bold(c.red(num(s.caught)))}${pct}`,
    `  Bypass commands refused        ${c.bold(num(s.refused))}`,
  ];
  const rules = top(s.rules, 6);
  if (rules.length) {
    const max = rules[0][1];
    out.push('', c.bold('  Favorite tricks'));
    for (const [id, n] of rules) {
      const bar = '█'.repeat(Math.max(1, Math.round((12 * n) / max)));
      out.push(`    ${id.padEnd(20)} ${c.red(bar.padEnd(12))} ${n}`);
    }
  }
  const agents = top(s.agents, 4);
  if (agents.length) out.push('', `  ${c.bold('Caught by agent')}   ${agents.map(([a, n]) => `${AGENT_NAMES[a] ?? a} ${n}`).join(c.dim(' · '))}`);
  const repos = top(s.repos, 1);
  if (repos.length) out.push(`  ${c.bold('Busiest repo')}      ${repos[0][0]} ${c.dim(`(${repos[0][1]})`)}`);
  out.push('', c.dim(`  Stored locally in ${statsFile()}; nothing is ever uploaded.`), '');
  return out.join('\n');
}
