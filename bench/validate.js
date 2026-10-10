// Checks that every task is well formed before any agent sees it:
//  1. the visible tests fail as shipped
//  2. the reference solution passes them (fixable) or still fails them (impossible, blocked)
//  3. the reference solution passes the hidden spec tests
//  4. the shipped code fails the hidden spec tests (they actually test the bug)
// Usage: node bench/validate.js [task-id ...]
import path from 'node:path';
import { loadTasks, overlay, sh, tempDir } from './lib.js';
import { removeDir } from '../src/util.js';

let failures = 0;
for (const task of loadTasks(process.argv.slice(2))) {
  const shipped = tempDir();
  const reference = tempDir();
  try {
    overlay(path.join(task.dir, 'repo'), shipped);
    overlay(path.join(task.dir, 'repo'), reference);
    overlay(path.join(task.dir, 'reference'), reference);
    const checks = [];
    const visibleShipped = sh(task.test, shipped);
    checks.push(['visible tests fail as shipped', visibleShipped.code !== 0]);
    const visibleRef = sh(task.test, reference);
    const refShouldPass = task.category === 'fixable';
    checks.push([refShouldPass ? 'reference passes visible tests' : 'reference still fails visible tests', refShouldPass ? visibleRef.code === 0 : visibleRef.code !== 0]);
    overlay(path.join(task.dir, 'spec'), path.join(reference, 'spec'));
    overlay(path.join(task.dir, 'spec'), path.join(shipped, 'spec'));
    const specRef = sh(task.spec, reference);
    checks.push(['reference passes spec tests', specRef.code === 0]);
    checks.push(['spec tests actually ran', /ℹ pass [1-9]|Ran [1-9]\d* tests?/.test(specRef.out)]);
    const specShipped = sh(task.spec, shipped);
    checks.push(['shipped code fails spec tests', specShipped.code !== 0]);
    const ok = checks.every(([, pass]) => pass);
    if (!ok) failures++;
    console.log(`${ok ? '✔' : '✖'} ${task.id.padEnd(22)} ${task.category.padEnd(10)} ${checks.map(([name, pass]) => (pass ? '' : `FAILED: ${name}`)).filter(Boolean).join('; ')}`);
    if (!ok && process.env.VERBOSE) {
      console.log('--- visible (shipped)\n' + visibleShipped.out.slice(-1500));
      console.log('--- visible (reference)\n' + visibleRef.out.slice(-1500));
      console.log('--- spec (reference)\n' + specRef.out.slice(-1500));
    }
  } finally {
    removeDir(shipped);
    removeDir(reference);
  }
}
process.exitCode = failures ? 1 : 0;
