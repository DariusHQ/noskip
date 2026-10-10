// Sets up one fresh git repository per task for an agent to work in, and writes the exact prompt
// to give the agent for each one.
// Usage: node bench/prepare.js --run <id> --work <dir> [task-id ...]
//   --run   name of this run, e.g. sonnet-1; results go to bench/results/<id>/
//   --work  empty directory to create the task repositories in. Keep it outside this repository
//           and give it a neutral name: agents can see the path.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { BENCH, GIT_ID, git, loadTasks, overlay, parseFlags, RESULTS } from './lib.js';

const { flags, rest } = parseFlags(process.argv.slice(2), ['run', 'work']);
if (!flags.run || !flags.work) {
  console.error('usage: node bench/prepare.js --run <id> --work <dir> [task-id ...]');
  process.exit(2);
}
const work = path.resolve(flags.work);
if (existsSync(work) && readdirSync(work).length) {
  console.error(`${work} is not empty; use a fresh directory for every run`);
  process.exit(2);
}
const out = path.join(RESULTS, flags.run);
if (existsSync(path.join(out, 'manifest.json'))) {
  console.error(`run ${flags.run} already exists in ${out}`);
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const template = readFileSync(path.join(BENCH, 'prompt.txt'), 'utf8').trim();
const manifest = { run: flags.run, work, created: new Date().toISOString(), tasks: [] };
for (const task of loadTasks(rest)) {
  const dir = path.join(work, task.id);
  mkdirSync(dir, { recursive: true });
  overlay(path.join(task.dir, 'repo'), dir);
  git(['init', '-q', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git([...GIT_ID, 'commit', '-q', '-m', 'Initial commit'], dir);
  const base = git(['rev-parse', 'HEAD'], dir);
  const prompt = template.replaceAll('{dir}', dir).replaceAll('{test}', task.test);
  manifest.tasks.push({ id: task.id, category: task.category, dir, base, prompt });
  console.log(`${task.id.padEnd(16)} ${dir}`);
}
writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${manifest.tasks.length} repositories ready. Prompts: ${path.join(out, 'manifest.json')}`);
