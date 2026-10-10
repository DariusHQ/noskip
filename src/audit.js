// `noskip audit`: replay a repository's history and show the commits that gamed the tests.
import { CONFIG_FILE, DEFAULT_CONFIG, parseConfig } from './config.js';
import { git, readBlobs, resolveCommit, resolveTrees } from './git.js';
import { parseAllowTrailers, scanTrees } from './scan.js';
import { HOMEPAGE, makeColors, plural, truncate, VERSION } from './util.js';

// Only explicit signals: co-author trailers, bot authors, tool footers. No guessing from style.
const AI_SIGNS = [
  ['Claude Code', /co-authored-by:\s*claude\b|noreply@anthropic\.com|generated with \[?claude|^claude\[bot\]/im],
  ['Copilot', /co-authored-by:[^\n]*\bcopilot\b|copilot-swe-agent|^copilot\b[^\n]*<[^>]*copilot/im],
  ['Cursor', /co-authored-by:\s*cursor\b|cursoragent@cursor\.com|^cursor agent\b/im],
  ['Codex', /co-authored-by:[^\n]*\bcodex\b|chatgpt-codex-connector|codex@openai\.com/im],
  ['Gemini', /co-authored-by:[^\n]*\bgemini\b|gemini-code-assist|google-labs-jules|jules@google/im],
  ['Devin', /devin-ai-integration|co-authored-by:\s*devin\b/im],
  ['Aider', /co-authored-by:\s*aider\b|^aider: /im],
  ['Windsurf', /co-authored-by:\s*(?:windsurf|cascade)\b/im],
  ['Amp', /co-authored-by:\s*amp\b|ampcode\.com/im],
  ['AI', /🤖 generated with|^ai-assisted:\s*yes\b/im],
];

export function detectAgent(author, message) {
  const text = `${author}\n${message}`;
  for (const [name, re] of AI_SIGNS) if (re.test(text)) return name;
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
