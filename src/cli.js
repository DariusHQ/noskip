#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
import { runDemo } from './demo.js';
import { repoRoot } from './git.js';
import { runHook } from './hooks.js';
import { install, TARGETS } from './install.js';
import { formatGitHub, formatJSON, formatMarkdown, formatPretty, formatRules, formatSARIF } from './report.js';
import { scan } from './scan.js';
import { atLeast, HOMEPAGE, makeColors, supportsColor, VERSION } from './util.js';

const HELP = `
anticheat ${VERSION}: anti-cheat for AI coding agents

Catches the shortcuts agents take to make tests pass: skipped, weakened or deleted
tests, hardcoded answers, test-only code paths, and CI checks switched off.

Usage
  anticheat [<rev>] [options]        Scan changes (default: HEAD → working tree)
  anticheat demo                     Watch it catch a cheating agent
  anticheat install <target...>      Set up: claude codex gemini cursor git github
  anticheat uninstall <target...>    Remove what install added
  anticheat rules                    List every rule
  anticheat badge                    Print a README badge

Options
  --staged            Scan staged changes (for pre-commit)
  --base <ref>        Scan everything since the merge-base with <ref> (pull requests)
  --head <rev>        Scan a commit instead of the working tree
  --format <name>     pretty | json | markdown | github | sarif
  --json              Same as --format json
  --fail-on <level>   Exit 1 at this severity: high (default) | medium | low | never
  --config <file>     Use this config instead of .anticheat.json from the base revision
  --global            install: write user-level agent config instead of the project's
  --command <cmd>     install: how hooks should launch anticheat
  -q, --quiet         Print nothing when there is nothing to report
  --no-color          Disable colors
  -h, --help          Show this help
  -v, --version       Show the version

Exit codes: 0 = nothing at or above --fail-on, 1 = findings, 2 = error.
Docs: ${HOMEPAGE}
`;

function parseArgs(argv) {
  const opts = { _: [] };
  const takes = new Set(['--base', '--head', '--format', '--fail-on', '--config', '--command']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      opts._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--') && a.includes('=')) {
      const [k, ...v] = a.split('=');
      opts[k.slice(2)] = v.join('=');
    } else if (takes.has(a)) {
      if (i + 1 >= argv.length) throw new UsageError(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-v' || a === '--version') opts.version = true;
    else if (a === '-q' || a === '--quiet') opts.quiet = true;
    else if (a === '--json') opts.format = 'json';
    else if (a === '--staged' || a === '--cached') opts.staged = true;
    else if (a === '--global') opts.global = true;
    else if (a === '--no-color') opts.color = false;
    else if (a === '--color') opts.color = true;
    else if (a.startsWith('-') && a !== '-') throw new UsageError(`unknown option ${a}`);
    else opts._.push(a);
  }
  return opts;
}

class UsageError extends Error {}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
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

function cmdScan(opts, color) {
  const root = repoRoot(process.cwd());
  if (!root) throw new UsageError('not inside a git repository');
  if (opts._.length > 1) throw new UsageError(`expected at most one revision, got: ${opts._.join(' ')}`);
  const failOnArg = opts['fail-on'];
  if (failOnArg && !['high', 'medium', 'low', 'never'].includes(failOnArg)) throw new UsageError('--fail-on must be high, medium, low or never');
  const result = scan(root, {
    base: opts._[0],
    mergeBaseRef: opts.base,
    head: opts.head,
    staged: opts.staged,
    configFile: opts.config,
  });
  if (failOnArg) result.failOn = failOnArg;
  const format = opts.format ?? (process.env.GITHUB_ACTIONS === 'true' ? 'github' : undefined);
  const text = render(result, format, color, opts.quiet);
  if (text) process.stdout.write(text.endsWith('\n') ? text : text + '\n');
  if (format === 'github' && process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, formatMarkdown(result) + '\n');
    } catch {
      /* summary is best-effort */
    }
  }
  return result.findings.some((f) => atLeast(f.severity, result.failOn)) ? 1 : 0;
}

function cmdInstall(opts, color, remove) {
  const c = makeColors(color);
  const targets = opts._.slice(1);
  if (!targets.length) throw new UsageError(`which target? ${TARGETS.join(' | ')}  (e.g. anticheat ${remove ? 'uninstall' : 'install'} claude git)`);
  const root = repoRoot(process.cwd());
  let failed = false;
  for (const target of targets) {
    try {
      const res = install(target, { root, global: opts.global, command: opts.command, remove });
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
    console.error(`anticheat: ${err.message}\nRun "anticheat --help" for usage.`);
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
        console.log(c.dim('It reported: "All tests pass ✅". Here is what anticheat found in its diff:'));
        const result = runDemo();
        process.stdout.write(formatPretty(result, { color }));
        console.log(`${c.bold('Protect your repo:')}  npx anticheat install claude ${c.dim('(or codex, cursor, gemini, git, github)')}\n`);
        return 0;
      }
      case 'install':
      case 'uninstall':
        return cmdInstall(opts, color, command === 'uninstall');
      case 'rules':
        process.stdout.write(formatRules(color));
        return 0;
      case 'badge':
        console.log(`[![anticheat](https://img.shields.io/badge/AI%20agents-anticheat%20protected-2ea44f)](${HOMEPAGE})`);
        return 0;
      default:
        return cmdScan(opts, color);
    }
  } catch (err) {
    if (process.env.ANTICHEAT_DEBUG) console.error(err);
    console.error(`anticheat: ${err.message}`);
    return 2;
  }
}

process.exitCode = main(process.argv.slice(2));
