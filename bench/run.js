// Runs a coding agent on every repository of a prepared run, one fresh process per task, with the
// task's prompt on stdin and the task repository as the working directory.
// Usage: node bench/run.js --run <id> --label <name> [--parallel 3] [--timeout 30] [task-id ...] -- <agent command...>
//   e.g. node bench/run.js --run sonnet --label "Claude Code · Sonnet" -- \
//          claude -p --model sonnet --permission-mode auto --output-format stream-json --verbose --no-session-persistence
//        node bench/run.js --run codex --label "Codex CLI" -- codex exec --full-auto -
// Output per task in bench/results/<id>/<task>/: summary.md (the agent's final message),
// agent.json (exit code, duration, turns, tokens), trajectory.md (condensed log, for labelling) and
// transcript.jsonl (raw output, git-ignored).
// A run cut short by a usage or rate limit is an infrastructure failure, not a result: the queue
// stops. Running the same command again skips the tasks that have a result and starts the others
// over from their initial commit.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { git, parseFlags, RESULTS } from './lib.js';

const split = process.argv.indexOf('--');
const { flags, rest } = parseFlags(process.argv.slice(2, split < 0 ? undefined : split), ['run', 'label', 'parallel', 'timeout']);
const command = split < 0 ? [] : process.argv.slice(split + 1);
const out = path.join(RESULTS, flags.run ?? '');
if (!flags.run || !flags.label || !command.length || !existsSync(path.join(out, 'manifest.json'))) {
  console.error('usage: node bench/run.js --run <id> --label <name> [--parallel 3] [--timeout 30] [task-id ...] -- <agent command...>');
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
manifest.agent = flags.label;
manifest.command = command.join(' ');
writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// Started from inside another agent session (e.g. Claude Code), drop that session's variables so the
// agent under test starts as a fresh, independent process.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !(process.env.CLAUDECODE && /^(CLAUDECODE$|CLAUDE_|MCP_|ANTHROPIC_BASE_URL$)/.test(k))),
);
const timeoutMs = Number(flags.timeout ?? 30) * 60_000;
const LIMIT = /hit your (?:session |usage |weekly |daily )?limit|usage limit reached|rate[ _-]?limit(?:ed| exceeded)|overloaded_error/i;
const quote = (arg) => (/^[\w@%+=:,./-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);

function cut(text, n) {
  text = String(text ?? '');
  return text.length > n ? `${text.slice(0, n)} …[${text.length - n} more chars]` : text;
}

/** A readable log of a Claude Code stream-json transcript: what the agent said, ran and edited. */
function trajectory(lines) {
  const md = [];
  for (const msg of lines) {
    for (const block of msg.message?.content ?? []) {
      if (msg.type === 'assistant' && block.type === 'text' && block.text.trim()) md.push(`**agent:** ${cut(block.text.trim(), 3000)}`, '');
      if (msg.type === 'assistant' && block.type === 'tool_use') {
        const { command: cmd, file_path: file, old_string: before, new_string: after, content, pattern } = block.input ?? {};
        md.push(`**${block.name}** ${cmd ? `\`${cut(cmd, 500)}\`` : file ?? pattern ?? ''}`);
        if (before !== undefined) md.push('```diff', ...cut(before, 1500).split('\n').map((l) => `- ${l}`), ...cut(after, 1500).split('\n').map((l) => `+ ${l}`), '```');
        else if (content !== undefined) md.push('```', cut(content, 2500), '```');
        md.push('');
      }
      if (msg.type === 'user' && block.type === 'tool_result') {
        const text = Array.isArray(block.content) ? block.content.map((c) => c.text ?? '').join('\n') : block.content;
        md.push('<details><summary>output</summary>', '', '```', cut(text, 1500), '```', '</details>', '');
      }
    }
  }
  return md.join('\n');
}

/** Finished with a real result, not cut short by a usage limit? */
function done(task) {
  try {
    return !JSON.parse(readFileSync(path.join(out, task.id, 'agent.json'), 'utf8')).infraError;
  } catch {
    return false;
  }
}

let stopped = false;

function runOne(task) {
  const dest = path.join(out, task.id);
  mkdirSync(dest, { recursive: true });
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command.map(quote).join(' '), { cwd: task.dir, env, shell: true, windowsHide: true });
    child.stdin.end(task.prompt);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      const lines = stdout
        .split('\n')
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      const result = lines.findLast((m) => m.type === 'result');
      const summary = `${(result ? result.result : stdout.slice(-4000)) ?? ''}`.trim();
      const meta = {
        exitCode: code,
        infraError: code !== 0 && (LIMIT.test(summary) || LIMIT.test(stderr)),
        timedOut: Date.now() - started >= timeoutMs,
        durationMs: Date.now() - started,
        model: lines.find((m) => m.type === 'system')?.model,
        turns: result?.num_turns,
        outputTokens: result?.usage?.output_tokens,
        terminalReason: result?.terminal_reason ?? result?.subtype,
        permissionDenials: result?.permission_denials?.length,
      };
      if (meta.infraError) stopped = true;
      writeFileSync(path.join(dest, 'transcript.jsonl'), stdout);
      if (stderr.trim()) writeFileSync(path.join(dest, 'stderr.txt'), stderr);
      writeFileSync(path.join(dest, 'summary.md'), summary + '\n');
      writeFileSync(path.join(dest, 'agent.json'), JSON.stringify(meta, null, 2) + '\n');
      if (lines.length) writeFileSync(path.join(dest, 'trajectory.md'), `# ${manifest.agent} · ${task.id}\n\n${trajectory(lines)}\n`);
      console.log(`${task.id.padEnd(16)} exit ${code}  ${Math.round(meta.durationMs / 1000)}s  ${meta.turns ?? '?'} turns${meta.infraError ? '  (usage limit: no result)' : ''}`);
      resolve(meta);
    });
  });
}

const selected = manifest.tasks.filter((t) => !rest.length || rest.includes(t.id));
const queue = selected.filter((t) => !done(t));
const workers = Array.from({ length: Math.max(1, Number(flags.parallel ?? 3)) }, async () => {
  while (queue.length && !stopped) {
    const task = queue.shift();
    // Start from the initial commit, undoing whatever an interrupted attempt left behind.
    git(['reset', '-q', '--hard', task.base], task.dir);
    git(['clean', '-qfdx'], task.dir);
    await runOne(task);
  }
});
await Promise.all(workers);
const missing = selected.filter((t) => !done(t)).map((t) => t.id);
if (missing.length) {
  console.log(`\nNo result yet for ${missing.length} task(s): ${missing.join(' ')}`);
  console.log('After the usage limit resets, run the same command again: finished tasks are skipped.');
  process.exitCode = 1;
} else {
  console.log(`\nDone. Next: node bench/evaluate.js --run ${flags.run}`);
}
