// `noskip audit`: replay a repository's history and show the commits that gamed the tests.
import { CONFIG_FILE, DEFAULT_CONFIG, parseConfig } from './config.js';
import { git, readBlobs, resolveCommit, resolveTrees } from './git.js';
import { parseAllowTrailers, scanTrees } from './scan.js';
import { HOMEPAGE, makeColors, plural, truncate, VERSION } from './util.js';

// Tool names, matched against the *name* in a trailer or bot account (never an email domain:
// a person with an @openai.com address is not Codex).
const TOOLS = [
  ['Claude Code', /\bclaude\b/i],
  ['Copilot', /\bcopilot\b/i],
  ['Codex', /\bcodex\b|\bchatgpt\b/i],
  ['Cursor', /\bcursor\b/i],
  ['Gemini', /\bgemini\b|\bjules\b/i],
  ['Devin', /\bdevin\b/i],
  ['Aider', /\baider\b/i],
  ['Windsurf', /\bwindsurf\b|\bcascade\b/i],
  ['OpenCode', /\bopen\s?code\b/i],
  ['Amp', /^amp\b|\bampcode\b/i],
  ['Kiro', /\bkiro\b/i],
  ['Junie', /\bjunie\b/i],
  ['OpenHands', /\bopenhands\b/i],
  ['Grok', /\bgrok\b/i],
  ['Qwen Code', /\bqwen\b/i],
];
const TOOL_EMAILS = [
  ['Claude Code', /noreply@anthropic\.com/i],
  ['Cursor', /cursoragent@cursor\.com/i],
  ['Copilot', /\+copilot@users\.noreply\.github\.com/i],
];

const toolIn = (name) => TOOLS.find(([, re]) => re.test(name))?.[0] ?? null;

/**
 * Which AI tool a commit credits, from explicit signals only: co-author / assisted-by trailers,
 * a bot author, or a tool footer. Never guessed from the code or the writing style.
 */
export function detectAgent(author, message) {
  let declared = false;
  for (const m of message.matchAll(/^(co-authored-by|assisted-by|generated-by|co-developed-by|ai-assisted-by):[ \t]*([^\n]+)$/gim)) {
    const [name, email = ''] = m[2].split('<');
    const hit = toolIn(name) ?? TOOL_EMAILS.find(([, re]) => re.test(email))?.[0];
    if (hit) return hit;
    // "Assisted-by" / "Generated-by" credit tools by convention (Linux kernel, Node.js), never people.
    if (/^(assisted-by|generated-by|ai-assisted-by)$/i.test(m[1])) declared = true;
  }
  if (declared) return 'AI';
  const bot = /^([\w.-]+)\[bot\]/i.exec(author);
  if (bot) {
    const hit = toolIn(bot[1].replace(/[-_]/g, ' '));
    if (hit) return hit;
  }
  const footer = /(?:🤖\s*)?generated with \[?([^\]\n(]+)/i.exec(message);
  if (footer) return toolIn(footer[1]) ?? (/🤖/.test(message) ? 'AI' : null);
  if (/^aider: /im.test(message)) return 'Aider';
  if (/^ai-assisted:[ \t]*(?:yes|true)\b/im.test(message)) return 'AI';
  return null;
}

export function listCommits(root, { ref = 'HEAD', last = 100, since, author } = {}) {
  if (!resolveCommit(root, ref)) throw new Error(`unknown revision: ${ref}`);
  const args = ['log', '--no-merges', `--max-count=${last}`, '--format=%H%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%s%x1f%B%x1e'];
  if (since) args.push(`--since=${since}`);
  if (author) args.push(`--author=${author}`);
  args.push(ref, '--');
  const out = git(args, { cwd: root }).stdout;
  return out
    .split('\x1e')
    .map((e) => e.replace(/^\n+/, ''))
    .filter(Boolean)
    .map((e) => {
      const [sha, parents, name, email, date, subject, body = ''] = e.split('\x1f');
      const author = `${name} <${email}>`;
      return { sha, parent: parents.split(' ').filter(Boolean)[0] ?? null, author: name, email, date, subject, body, agent: detectAgent(author, body) };
    });
}

/** Scan each commit against its first parent. `onProgress(i, total, commit)` is optional. */
export function audit(root, options = {}, onProgress) {
  const started = Date.now();
  let commits = listCommits(root, options);
  if (options.aiOnly) commits = commits.filter((c) => c.agent);
  const results = [];
  let skipped = 0;
  // A root commit has no "before": importing a codebase can't game its tests.
  commits = commits.filter((c) => c.parent);
  // Batch the per-commit lookups (trees, configs) so each commit costs only its diff.
  const trees = resolveTrees(root, commits.flatMap((c) => [c.sha, c.parent]));
  const configSpecs = [...new Set(commits.map((c) => trees.get(c.parent)).filter(Boolean))].map((t) => `${t}:${CONFIG_FILE}`);
  const configTexts = readBlobs(root, configSpecs);
  commits.forEach((c, i) => {
    onProgress?.(i, commits.length, c);
    const newTree = trees.get(c.sha);
    const oldTree = trees.get(c.parent);
    if (!newTree || !oldTree) {
      skipped++; // shallow clone boundary
      return;
    }
    let config;
    try {
      const text = configTexts.get(`${oldTree}:${CONFIG_FILE}`);
      config = text ? parseConfig(text) : { ...DEFAULT_CONFIG };
    } catch {
      config = { ...DEFAULT_CONFIG };
    }
    const r = scanTrees({ root, oldTree, newTree, config, allowed: parseAllowTrailers(c.body, c.sha) });
    results.push({ ...c, verdict: r.verdict, counts: r.counts, findings: r.findings });
  });
  const flagged = results.filter((r) => r.counts.high || r.counts.medium);
  const rules = {};
  for (const r of flagged) for (const f of r.findings) if (f.severity !== 'low') rules[f.rule] = (rules[f.rule] ?? 0) + 1;
  const agents = {};
  for (const r of results) if (r.agent) agents[r.agent] = (agents[r.agent] ?? 0) + 1;
  return {
    ref: options.ref ?? 'HEAD',
    audited: results.length,
    skipped,
    aiAssisted: results.filter((r) => r.agent).length,
    agents,
    busted: results.filter((r) => r.counts.high).length,
    suspicious: results.filter((r) => !r.counts.high && r.counts.medium).length,
    rules,
    commits: results,
    flagged,
    ms: Date.now() - started,
  };
}

const sorted = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

export function formatAudit(a, { color = false } = {}) {
  const c = makeColors(color);
  const out = [''];
  const ai = a.aiAssisted
    ? ` · ${a.aiAssisted} AI-assisted ${c.dim(`(${sorted(a.agents).map(([n, k]) => `${n} ${k}`).join(', ')})`)}`
    : '';
  out.push(`${c.bold('noskip audit')}  ${plural(a.audited, 'commit')} on ${a.ref}${ai}`, '');
  const label = { high: (s) => c.bgRed(c.bold(` ${s} `)), medium: (s) => c.bgYellow(c.bold(` ${s} `)) };
  for (const r of a.flagged) {
    const icon = r.counts.high ? '🚨' : '🟡';
    const who = r.agent ? c.magenta(r.agent) : c.dim('human');
    out.push(`${icon} ${c.yellow(r.sha.slice(0, 7))}  ${c.dim(r.date.slice(0, 10))}  ${who}  ${c.bold(`“${truncate(r.subject, 60)}”`)}`);
    for (const f of r.findings.filter((x) => x.severity !== 'low').slice(0, 6)) {
      out.push(`   ${label[f.severity](f.severity === 'high' ? 'HIGH' : 'MED ')} ${f.rule.padEnd(20)} ${c.cyan(`${f.path}:${f.line}`)}  ${c.dim(truncate(f.message, 70))}`);
    }
    const more = r.findings.filter((x) => x.severity !== 'low').length - 6;
    if (more > 0) out.push(c.dim(`   …and ${more} more (noskip ${r.sha.slice(0, 7)}~1 --head ${r.sha.slice(0, 7)})`));
    out.push('');
  }
  if (!a.flagged.length) out.push(`${c.bgGreen(c.bold(' ✔ CLEAN '))}  no commit gamed the tests`, '');
  const aiBusted = a.flagged.filter((r) => r.counts.high && r.agent).length;
  const summary = a.busted
    ? `${c.bgRed(c.bold(` 🚨 ${plural(a.busted, 'commit')} gamed the tests `))}${aiBusted ? ` ${c.dim(`(${aiBusted} AI-assisted)`)}` : ''}`
    : `${c.bgGreen(c.bold(' ✔ nothing blocking '))}`;
  out.push(`${summary}  ${a.suspicious} suspicious · ${a.audited} audited in ${(a.ms / 1000).toFixed(1)}s${a.skipped ? c.dim(` · ${a.skipped} skipped (shallow clone)`) : ''}`);
  const rules = sorted(a.rules).slice(0, 4);
  if (rules.length) out.push(c.dim(`Most common: ${rules.map(([r, n]) => `${r} ×${n}`).join(' · ')}`));
  if (a.flagged.length) out.push(`Catch the next one before it lands:  ${c.cyan('npx noskip install')}`);
  out.push('');
  return out.join('\n');
}

export function formatAuditJSON(a) {
  const { flagged, ...rest } = a;
  return JSON.stringify(
    {
      tool: 'noskip',
      version: VERSION,
      ...rest,
      commits: a.commits.map(({ body, ...cm }) => cm),
    },
    null,
    2,
  );
}

export function formatAuditMarkdown(a) {
  const md = (s) => String(s).replace(/\|/g, '&#124;').replace(/</g, '&lt;');
  const lines = [
    `### noskip audit: ${a.busted} of ${a.audited} commits gamed the tests`,
    '',
    `${a.aiAssisted} AI-assisted commits · ${a.suspicious} suspicious`,
    '',
  ];
  if (a.flagged.length) {
    lines.push('| Commit | Date | Author | Findings |', '|---|---|---|---|');
    for (const r of a.flagged) {
      const fs = r.findings
        .filter((f) => f.severity !== 'low')
        .map((f) => `${f.severity === 'high' ? '🔴' : '🟡'} \`${f.rule}\` ${md(f.path)}:${f.line}`)
        .join('<br>');
      lines.push(`| \`${r.sha.slice(0, 7)}\` ${md(truncate(r.subject, 50))} | ${r.date.slice(0, 10)} | ${r.agent ?? 'human'} | ${fs} |`);
    }
  }
  lines.push('', `<sub>[noskip](${HOMEPAGE}) v${VERSION}</sub>`, '');
  return lines.join('\n');
}
