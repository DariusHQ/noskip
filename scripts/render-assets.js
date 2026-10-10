// Renders the README images from real noskip output:
//   assets/demo.svg   `noskip demo`
//   assets/audit.svg  `noskip audit` on a small example repo with a realistic history
// Usage: node scripts/render-assets.js
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { terminalSvg } from './svg-terminal.js';
import { git } from '../src/git.js';
import { removeDir } from '../src/util.js';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const asset = (name) => fileURLToPath(new URL(`../assets/${name}`, import.meta.url));

function run(args, cwd) {
  const res = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '1', NO_COLOR: undefined } });
  if (res.status === 2) throw new Error(res.stderr);
  return res.stdout.replace(/^\n+/, '').replace(/\n+$/, '').split('\n');
}

function render(file, prompt, lines, label) {
  writeFileSync(asset(file), terminalSvg([`$ ${prompt}`, ...lines], { label }));
  console.log(`wrote assets/${file} (${lines.length + 1} lines)`);
}

// ---- demo ----
render('demo.svg', 'npx noskip demo', run(['demo'], os.tmpdir()), "noskip demo: six shortcuts caught in an AI agent's diff");

// ---- audit: an example repo whose history mixes honest and test-gaming commits ----
const CART = `export function total(items, coupon) {
  let sum = items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0);
  if (coupon === 'SAVE10') sum *= 0.9;
  return Math.round(sum * 100) / 100;
}
`;
const CART_TEST = `import { expect, it } from 'vitest';
import { total } from '../src/cart.js';

it('sums prices', () => {
  expect(total([{ price: 10 }, { price: 5, qty: 2 }])).toBe(20);
});

it('applies SAVE10', () => {
  expect(total([{ price: 120 }], 'SAVE10')).toBe(108);
});

it('rounds to cents', () => {
  expect(total([{ price: 0.1 }, { price: 0.2 }])).toBe(0.3);
});
`;
const COUPON_TEST = `import { expect, it } from 'vitest';
import { discount } from '../src/coupons.js';

it('HALF takes half off', () => {
  expect(discount(50, 'HALF')).toBe(25);
});
`;
const CI = `name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm test
`;

const CO = {
  claude: '\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
  copilot: '\n\nCo-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>',
  cursor: '\n\nCo-authored-by: Cursor Agent <cursoragent@cursor.com>',
};

const steps = [
  ['2026-09-08', 'shop: cart and coupons', {
    'package.json': '{ "name": "shop", "type": "module", "scripts": { "test": "vitest run" } }\n',
    'src/cart.js': CART,
    'src/coupons.js': "export function discount(price, code) {\n  return code === 'HALF' ? price / 2 : price;\n}\n",
    'test/cart.test.js': CART_TEST,
    'test/coupons.test.js': COUPON_TEST,
    '.github/workflows/ci.yml': CI,
  }],
  ['2026-09-12', 'feat: support item quantities in the receipt', { 'src/receipt.js': "export const line = (i) => `${i.qty ?? 1} × ${i.name}`;\n" }],
  ['2026-09-16', `fix: make the cart tests pass${CO.claude}`, {
    'test/cart.test.js': CART_TEST.replace("it('rounds to cents'", "it.skip('rounds to cents'").replace('.toBe(20)', '.toBeDefined()'),
  }],
  ['2026-09-19', 'docs: explain coupon codes', { 'README.md': '# shop\n\nCoupons: SAVE10, HALF.\n' }],
  ['2026-09-23', `ci: unblock the pipeline${CO.copilot}`, { '.github/workflows/ci.yml': CI.replace('- run: npm test', '- run: npm test || true') }],
  ['2026-09-29', `fix: HALF coupon rounding${CO.cursor}`, {
    'src/coupons.js': "export function discount(price, code) {\n  if (code === 'HALF' && price === 50) return 25;\n  return code === 'HALF' ? Math.floor(price / 2) : price;\n}\n",
  }],
  ['2026-10-02', 'test: new SAVE10 rate', { 'test/cart.test.js': CART_TEST.replace("it('rounds to cents'", "it.skip('rounds to cents'").replace('.toBe(20)', '.toBeDefined()').replace('toBe(108)', 'toBe(102)') }],
  ['2026-10-06', `refactor: extract price formatting${CO.claude}`, { 'src/format.js': 'export const money = (n) => `$${n.toFixed(2)}`;\n' }],
];

const repo = mkdtempSync(path.join(os.tmpdir(), 'noskip-audit-'));
try {
  git(['init', '-q', '-b', 'main'], { cwd: repo });
  for (const [date, message, files] of steps) {
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
      writeFileSync(path.join(repo, rel), content);
    }
    const env = { GIT_AUTHOR_DATE: `${date}T10:00:00Z`, GIT_COMMITTER_DATE: `${date}T10:00:00Z` };
    const cfg = ['-c', 'user.name=Dev', '-c', 'user.email=dev@shop.test', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false'];
    git([...cfg, 'add', '-A'], { cwd: repo, env });
    git([...cfg, 'commit', '-q', '-m', message], { cwd: repo, env });
  }
  const lines = run(['audit'], repo).map((l) => l.replace(/audited in [\d.]+s/, 'audited in 0.4s'));
  render('audit.svg', 'npx noskip audit', lines, 'noskip audit: commits in a repository history that gamed the tests');
} finally {
  removeDir(repo);
}
