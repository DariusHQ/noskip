#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
import { audit, formatAudit, formatAuditJSON, formatAuditMarkdown } from './audit.js';
import { runDemo } from './demo.js';
import { repoRoot, resolveTree } from './git.js';
import { runHook } from './hooks.js';
import { detectTargets, install, TARGETS } from './install.js';
import { formatGitHub, formatJSON, formatMarkdown, formatPretty, formatRules, formatSARIF } from './report.js';
import { scan } from './scan.js';
import { formatStats, loadStats } from './stats.js';
import { atLeast, HOMEPAGE, makeColors, supportsColor, VERSION } from './util.js';

const HELP = `
noskip ${VERSION}: anti-cheat for AI coding agents

Catches the shortcuts agents take to make tests pass: skipped, weakened or deleted
tests, hardcoded answers, test-only code paths, and CI checks switched off.

Usage
  noskip [<rev>] [options]        Scan changes (default: HEAD → working tree)
  noskip demo                     Watch it catch a cheating agent
  noskip audit [<ref>]            Find commits in your history that gamed the tests
  noskip install [<target...>]    Set up: claude codex gemini cursor git github
  noskip uninstall <target...>    Remove what install added
  noskip stats                    How often your agents got caught
  noskip rules                    List every rule
  noskip badge                    Print a README badge

Options
  --staged            Scan staged changes (for pre-commit)
  --base <ref>        Scan everything since the merge-base with <ref> (pull requests)
  --head <rev>        Scan a commit instead of the working tree
  --format <name>     pretty | json | markdown | github | sarif
  --json              Same as --format json
  --fail-on <level>   Exit 1 at this severity: high (default) | medium | low | never
  --config <file>     Use this config instead of .noskip.json from the base revision
  -q, --quiet         Print nothing when there is nothing to report
  --no-color          Disable colors

Audit options
  --last <n>          How many commits to replay (default: 100)
  --since <date>      Only commits after this date ("2 weeks ago", 2026-09-01)
  --author <pattern>  Only commits by this author
  --ai-only           Only commits with an AI co-author, bot author or tool footer

Install options
  --global            Write user-level agent config instead of the project's
  --command <cmd>     How hooks should launch noskip

  -h, --help          Show this help
  -v, --version       Show the version

Exit codes: 0 = nothing at or above --fail-on, 1 = findings, 2 = error.
Docs: ${HOMEPAGE}
`;

class UsageError extends Error {}

const TAKES_VALUE = new Set(['--base', '--head', '--format', '--fail-on', '--config', '--command', '--last', '--since', '--author']);

function parseArgs(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      opts._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--') && a.includes('=')) {
      const [k, ...v] = a.split('=');
      if (!TAKES_VALUE.has(k)) throw new UsageError(`unknown option ${k}`);
      opts[k.slice(2)] = v.join('=');
    } else if (TAKES_VALUE.has(a)) {
      if (i + 1 >= argv.length) throw new UsageError(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-v' || a === '--version') opts.version = true;
    else if (a === '-q' || a === '--quiet') opts.quiet = true;
    else if (a === '--json') opts.format = 'json';
    else if (a === '--staged' || a === '--cached') opts.staged = true;
    else if (a === '--global') opts.global = true;
    else if (a === '--ai-only') opts.aiOnly = true;
    else if (a === '--no-color') opts.color = false;
    else if (a === '--color') opts.color = true;
    else if (a.startsWith('-') && a !== '-') throw new UsageError(`unknown option ${a}`);
    else opts._.push(a);
  }
  return opts;
}

function readStdin() {
  if (process.stdin.isTTY) return ''; // run by hand: don't wait for input that never comes
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function failOnOf(opts) {
  const f = opts['fail-on'];
  if (f && !['high', 'medium', 'low', 'never'].includes(f)) throw new UsageError('--fail-on must be high, medium, low or never');
  return f;
}

function requireRepo() {
  const root = repoRoot(process.cwd());
  if (!root) throw new UsageError('not inside a git repository');
  return root;
}

function render(result, format, color, quiet) {
  switch (format) {
    case 'json':
      return formatJSON(result);
    case 'markdown':
    case 'md':
      return formatMarkdown(result);
    case 'github':
      return formatGitHub(result);
    case 'sarif':
      return formatSARIF(result);
    case 'pretty':
    case undefined:
      return formatPretty(result, { color, quiet });
    default:
      throw new UsageError(`unknown format "${format}" (pretty, json, markdown, github, sarif)`);
  }
}

function write(text) {
  if (text) process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}

function cmdScan(opts, color) {
  const root = requireRepo();
  if (opts._.length > 1) throw new UsageError(`expected at most one revision, got: ${opts._.join(' ')}`);
  const rev = opts._[0];
  if (rev && !resolveTree(root, rev)) {
    throw new UsageError(`"${rev}" is neither a command nor a revision. Run "noskip --help" for commands.`);
  }
  const failOn = failOnOf(opts);
  const result = scan(root, { base: rev, mergeBaseRef: opts.base, head: opts.head, staged: opts.staged, configFile: opts.config });
  if (failOn) result.failOn = failOn;
  const format = opts.format ?? (process.env.GITHUB_ACTIONS === 'true' ? 'github' : undefined);
  write(render(result, format, color, opts.quiet));
  if (format === 'github' && process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatMarkdown(result) + '\n');
    } catch {
      /* summary is best-effort */
    }
  }
  return result.findings.some((f) => atLeast(f.severity, result.failOn)) ? 1 : 0;
}

function cmdAudit(opts, color) {
  const root = requireRepo();
  if (opts._.length > 2) throw new UsageError(`expected at most one ref, got: ${opts._.slice(1).join(' ')}`);
  const last = opts.last === undefined ? 100 : Number(opts.last);
  if (!Number.isInteger(last) || last < 1) throw new UsageError('--last must be a positive whole number');
  const failOn = failOnOf(opts) ?? 'high';
  const showProgress = process.stderr.isTTY && !opts.format;
  const result = audit(
    root,
    { ref: opts._[1] ?? 'HEAD', last, since: opts.since, author: opts.author, aiOnly: opts.aiOnly },
    showProgress ? (i, n, c) => process.stderr.write(`\r\x1b[2K  auditing ${i + 1}/${n}  ${c.sha.slice(0, 7)}`) : undefined,
  );
  if (showProgress) process.stderr.write('\r\x1b[2K');
  const format = opts.format ?? 'pretty';
  if (format === 'json') write(formatAuditJSON(result));
  else if (format === 'markdown' || format === 'md') write(formatAuditMarkdown(result));
  else if (format === 'pretty') write(formatAudit(result, { color }));
  else throw new UsageError(`unknown format "${format}" for audit (pretty, json, markdown)`);
  return result.commits.some((r) => r.findings.some((f) => atLeast(f.severity, failOn))) ? 1 : 0;
}

function cmdInstall(opts, color, remove) {
  const c = makeColors(color);
  const root = repoRoot(process.cwd());
  const targets = opts._.slice(1);
  if (!targets.length) {
    if (remove) throw new UsageError(`which target? ${TARGETS.join(' | ')}  (e.g. noskip uninstall claude git)`);
    const found = detectTargets(root);
    const agents = found.filter((t) => !['git', 'github'].includes(t));
    console.log(`\n${c.bold('noskip install')}  pick where noskip should referee:\n`);
    const rows = [
      ['claude', 'Claude Code', 'hooks in .claude/settings.json (or the /plugin, see README)'],
      ['codex', 'Codex', 'hooks in .codex/hooks.json'],
      ['cursor', 'Cursor', 'hooks in .cursor/hooks.json'],
      ['gemini', 'Gemini CLI', 'hooks in .gemini/settings.json'],
      ['git', 'git', 'pre-commit hook: any agent, any editor'],
      ['github', 'GitHub', 'workflow that checks every pull request'],
    ];
    for (const [id, name, what] of rows) {
      const mark = found.includes(id) ? c.green('●') : c.dim('○');
      console.log(`  ${mark} ${c.bold(id.padEnd(7))} ${name.padEnd(12)} ${c.dim(what)}`);
    }
    const suggestion = [...agents, ...(root ? ['git'] : [])];
    console.log(`\n  ${c.green('●')} ${c.dim('detected on this machine / in this repo')}`);
    if (suggestion.length) console.log(`\nRecommended:  ${c.cyan(`npx noskip install ${suggestion.join(' ')}`)}`);
    console.log(c.dim('Add --global to protect every project on this machine.\n'));
    return 0;
  }
  let failed = false;
  for (const target of targets) {
    try {
      const res = install(target, { root, global: opts.global, ...(opts.command ? { command: opts.command } : {}), remove });
      const verb = remove ? (res.changed ? 'removed from' : 'nothing to remove in') : res.changed ? 'installed in' : 'already set up in';
      console.log(`${res.changed ? c.green('✔') : c.dim('•')} ${c.bold(target)}: ${verb} ${c.cyan(res.file)}`);
      if (res.note) console.log(`  ${c.dim(res.note)}`);
    } catch (err) {
      failed = true;
      console.error(`${c.red('✖')} ${c.bold(target)}: ${err.message}`);
    }
  }
  return failed ? 2 : 0;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    console.error(`noskip: ${err.message}\nRun "noskip --help" for usage.`);
    return 2;
  }
  const color = opts.color ?? supportsColor(process.stdout);
  if (opts.version) {
    console.log(VERSION);
    return 0;
  }
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  const command = opts._[0];
  try {
    switch (command) {
      case 'hook': {
        const [, agent, event] = opts._;
        const res = runHook(agent, event, readStdin());
        if (res.stdout) process.stdout.write(res.stdout);
        if (res.stderr) process.stderr.write(res.stderr + '\n');
        return res.code;
      }
      case 'demo': {
        const c = makeColors(color);
        console.log(`\n${c.bold('An AI agent was told:')} ${c.italic('"the cart tests are failing, make them pass"')}`);
        console.log(c.dim('It reported: "All tests pass ✅". Here is what noskip found in its diff:'));
        process.stdout.write(formatPretty(runDemo(), { color }));
        console.log(`${c.bold('Your turn:')}  npx noskip audit ${c.dim('(check your own history)')}  ·  npx noskip install ${c.dim('(stop the next one)')}\n`);
        return 0;
      }
      case 'audit':
        return cmdAudit(opts, color);
      case 'stats':
        write(opts.format === 'json' ? JSON.stringify(loadStats(), null, 2) : formatStats(loadStats(), { color }));
        return 0;
      case 'install':
      case 'uninstall':
        return cmdInstall(opts, color, command === 'uninstall');
      case 'rules':
        process.stdout.write(formatRules(color));
        return 0;
      case 'badge':
        console.log(`[![noskip](https://img.shields.io/badge/AI%20agents-noskip%20protected-2ea44f)](${HOMEPAGE})`);
        return 0;
      default:
        return cmdScan(opts, color);
    }
  } catch (err) {
    if (process.env.NOSKIP_DEBUG) console.error(err);
    console.error(`noskip: ${err.message}`);
    return 2;
  }
}

process.exitCode = main(process.argv.slice(2));
