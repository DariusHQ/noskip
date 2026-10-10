// Turns ANSI-colored terminal output into a crisp, optionally animated SVG "screenshot".
// Every text run gets a textLength, so columns line up with any monospace font.

const PALETTE = { fg: '#e6edf3', 31: '#ff7b72', 32: '#3fb950', 33: '#d29922', 34: '#79c0ff', 35: '#d2a8ff', 36: '#56d4dd', 90: '#8b949e' };
const BG = { 41: '#da3633', 42: '#238636', 43: '#d29922', 100: '#30363d' };
const FG_ON_BG = { 30: '#0d1117', 97: '#ffffff' };

const CW = 8.4; // column width at 14px
const LH = 21;
const PAD_X = 22;
const TOP = 54;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const width = (ch) => (ch === '️' ? 0 : /\p{Extended_Pictographic}/u.test(ch) ? 2 : 1);

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

/**
 * lines:    ANSI text lines; the first one is the prompt line ("$ npx noskip demo")
 * animate:  type the prompt, then reveal output lines one by one, hold, loop
 */
export function terminalSvg(lines, { label, animate = true, cycle = 16 } = {}) {
  const body = [];
  const styles = [];
  let maxCols = 0;
  lines.forEach((line, row) => {
    const y = TOP + row * LH;
    const parts = [];
    let col = 0;
    for (const seg of parse(line)) {
      const chars = [...seg.text];
      const cols = chars.reduce((n, ch) => n + width(ch), 0);
      const x = PAD_X + col * CW;
      if (seg.bg) parts.push(`<rect x="${x.toFixed(1)}" y="${y - 15}" width="${(cols * CW).toFixed(1)}" height="${LH - 1}" rx="3" fill="${BG[seg.bg]}"/>`);
      if (seg.text.trim()) {
        const lead = seg.text.length - seg.text.trimStart().length;
        const trimmed = seg.text.trim();
        const tcols = [...trimmed].reduce((n, ch) => n + width(ch), 0);
        const fill = seg.bg ? FG_ON_BG[seg.fg] ?? '#ffffff' : PALETTE[seg.fg] ?? PALETTE.fg;
        const attrs = [`x="${(x + lead * CW).toFixed(1)}"`, `y="${y}"`, `fill="${fill}"`];
        // Pin the run to the grid; emoji keep their natural width.
        if (!/\p{Extended_Pictographic}/u.test(trimmed) && tcols > 1) attrs.push(`textLength="${(tcols * CW).toFixed(1)}"`, 'lengthAdjust="spacingAndGlyphs"');
        if (seg.bold) attrs.push('font-weight="700"');
        if (seg.italic) attrs.push('font-style="italic"');
        if (seg.dim || row === 0) attrs.push(`opacity="${row === 0 ? 0.8 : 0.62}"`);
        parts.push(`<text ${attrs.join(' ')}>${esc(trimmed)}</text>`);
      }
      col += cols;
    }
    maxCols = Math.max(maxCols, col);
    if (!parts.length) return;
    if (!animate) {
      body.push(parts.join(''));
      return;
    }
    if (row === 0) {
      // Typing effect for the command, then a short pause before output starts.
      const end = ((1.2 / cycle) * 100).toFixed(2);
      styles.push(`@keyframes type{0%,3%{clip-path:inset(0 100% 0 0)}${end}%,96%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 100% 0 0)}}`);
      styles.push(`.l0{animation:type ${cycle}s steps(${Math.max(1, [...line].length)},end) infinite}`);
    } else {
      const t = 1.7 + (row - 1) * 0.11;
      const p = ((t / cycle) * 100).toFixed(2);
      const q = (((t + 0.15) / cycle) * 100).toFixed(2);
      styles.push(`@keyframes a${row}{0%,${p}%{opacity:0}${q}%,96%{opacity:1}100%{opacity:0}}.l${row}{animation:a${row} ${cycle}s linear infinite}`);
    }
    body.push(`<g class="l${row}">${parts.join('')}</g>`);
  });
  const W = Math.ceil(PAD_X * 2 + maxCols * CW);
  const H = TOP + lines.length * LH + 4;
  const css = [
    "text{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono','DejaVu Sans Mono',monospace;font-size:14px;white-space:pre}",
    ...styles,
    '@media (prefers-reduced-motion:reduce){g{animation:none!important}}',
  ].join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label ?? 'terminal output')}">
<style>
${css}
</style>
<rect width="${W}" height="${H}" rx="10" fill="#0d1117"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="#30363d"/>
<circle cx="20" cy="18" r="6" fill="#ff5f57"/><circle cx="40" cy="18" r="6" fill="#febc2e"/><circle cx="60" cy="18" r="6" fill="#28c840"/>
${body.join('\n')}
</svg>
`;
}
