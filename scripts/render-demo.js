// Renders `anticheat demo` (real output, real colors) to assets/demo.svg for the README.
// Usage: node scripts/render-demo.js
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
const outFile = fileURLToPath(new URL('../assets/demo.svg', import.meta.url));

const res = spawnSync(process.execPath, [cli, 'demo'], { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '1' } });
if (res.status !== 0) throw new Error(res.stderr);
const lines = ('$ npx @dariushq/anticheat demo\n' + res.stdout.replace(/^\n/, '')).replace(/\n+$/, '').split('\n');

const PALETTE = {
  fg: '#e6edf3',
  31: '#ff7b72',
  32: '#3fb950',
  33: '#d29922',
  34: '#79c0ff',
  35: '#d2a8ff',
  36: '#56d4dd',
  90: '#8b949e',
};
const BG = { 41: '#da3633', 42: '#238636', 43: '#d29922', 100: '#30363d' };
const FG_ON_BG = { 30: '#0d1117', 97: '#ffffff' };

const CW = 8.6; // character width at 14px
const LH = 21;
const PAD_X = 22;
const TOP = 52;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const width = (ch) => (/\p{Extended_Pictographic}/u.test(ch) ? 2 : 1);

function parse(line) {
  const segs = [];
  const st = { bold: false, dim: false, italic: false, fg: null, bg: null };
  let text = '';
  const flush = () => {
    if (text) segs.push({ text, ...st });
    text = '';
  };
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\x1b' && line[i + 1] === '[') {
      const end = line.indexOf('m', i);
      flush();
      for (const code of line.slice(i + 2, end).split(';').map(Number)) {
        if (code === 0) Object.assign(st, { bold: false, dim: false, italic: false, fg: null, bg: null });
        else if (code === 1) st.bold = true;
        else if (code === 2) st.dim = true;
        else if (code === 22) st.bold = st.dim = false;
        else if (code === 3) st.italic = true;
        else if (code === 23) st.italic = false;
        else if (code === 39) st.fg = null;
        else if (code === 49) st.bg = null;
        else if (code in BG) st.bg = code;
        else if (code in FG_ON_BG && st.bg) st.fg = code;
        else if (code in PALETTE) st.fg = code;
      }
      i = end;
    } else text += line[i];
  }
  flush();
  return segs;
}

const body = [];
let maxCols = 0;
lines.forEach((line, row) => {
  const y = TOP + row * LH;
  let col = 0;
  for (const seg of parse(line)) {
    const chars = [...seg.text];
    const cols = chars.reduce((n, ch) => n + width(ch), 0);
    const x = PAD_X + col * CW;
    if (seg.bg) body.push(`<rect x="${x.toFixed(1)}" y="${y - 15}" width="${(cols * CW).toFixed(1)}" height="${LH - 1}" rx="3" fill="${BG[seg.bg]}"/>`);
    const fill = seg.bg ? FG_ON_BG[seg.fg] ?? '#ffffff' : PALETTE[seg.fg] ?? PALETTE.fg;
    const attrs = [`x="${x.toFixed(1)}"`, `y="${y}"`, `fill="${fill}"`];
    if (seg.bold) attrs.push('font-weight="700"');
    if (seg.italic) attrs.push('font-style="italic"');
    if (seg.dim) attrs.push('opacity="0.62"');
    if (row === 0) attrs.push('opacity="0.75"');
    if (seg.text.trim()) body.push(`<text ${attrs.join(' ')}>${esc(seg.text)}</text>`);
    col += cols;
  }
  maxCols = Math.max(maxCols, col);
});

const W = Math.ceil(PAD_X * 2 + maxCols * CW);
const H = TOP + lines.length * LH + 6;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="anticheat demo output: six shortcuts caught in an AI agent's diff">
<style>text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:14px;white-space:pre}</style>
<rect width="${W}" height="${H}" rx="10" fill="#0d1117"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="#30363d"/>
<circle cx="20" cy="18" r="6" fill="#ff5f57"/><circle cx="40" cy="18" r="6" fill="#febc2e"/><circle cx="60" cy="18" r="6" fill="#28c840"/>
${body.join('\n')}
</svg>
`;
writeFileSync(outFile, svg);
console.log(`wrote ${outFile} (${W}x${H}, ${lines.length} lines)`);
