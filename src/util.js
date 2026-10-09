import { chmodSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const VERSION = pkg.version;
export const HOMEPAGE = String(pkg.homepage || 'https://github.com/DariusHQ/noskip').replace(/#.*$/, '');

export const SEVERITIES = ['low', 'medium', 'high'];

export function severityRank(severity) {
  return SEVERITIES.indexOf(severity);
}

export function atLeast(severity, threshold) {
  if (threshold === 'never') return false;
  return severityRank(severity) >= severityRank(threshold);
}

export function supportsColor(stream = process.stdout) {
  const env = process.env;
  if ('NO_COLOR' in env) return false;
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false';
  return Boolean(stream && stream.isTTY) && env.TERM !== 'dumb';
}

export function makeColors(enabled) {
  const wrap = (open, close) => (enabled ? (s) => `\x1b[${open}m${s}\x1b[${close}m` : (s) => String(s));
  return {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    italic: wrap(3, 23),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    blue: wrap(34, 39),
    magenta: wrap(35, 39),
    cyan: wrap(36, 39),
    gray: wrap(90, 39),
    bgRed: wrap('41;97', '49;39'),
    bgGreen: wrap('42;30', '49;39'),
    bgYellow: wrap('43;30', '49;39'),
    bgGray: wrap('100;97', '49;39'),
  };
}

/** Collapse whitespace so moved or re-indented lines compare equal. */
export function normalizeLine(text) {
  return text.trim().replace(/\s+/g, ' ');
}

/** Count matches of a regex in a string (forces the global flag). */
export function countMatches(text, regex) {
  if (!text) return 0;
  const re = regex.global ? regex : new RegExp(regex.source, regex.flags + 'g');
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text) !== null) {
    n++;
    if (re.lastIndex === 0) break;
  }
  re.lastIndex = 0;
  return n;
}

export function testRegex(regex, text) {
  regex.lastIndex = 0;
  const ok = regex.test(text);
  regex.lastIndex = 0;
  return ok;
}

/** Offsets of each line start, for mapping a match index to a 1-based line number. */
export function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

export function lineAt(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Comment-only lines are ignored by rules that look for code. */
export function isCommentLine(text) {
  return /^\s*(?:\/\/|\/\*|\*(?:\s|\/|$)|<!--|#(?![[!]|pragma\b|if\b|include\b|define\b|expect\b|require\b))/.test(text);
}

/** Split a call's argument string on top-level commas. */
export function splitArgs(text) {
  const out = [];
  let depth = 0;
  let quote = null;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') {
        cur += text[++i] ?? '';
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      cur += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      cur += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Given the index of an opening paren, return the index of its matching close (or -1). */
export function matchParen(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** rm -rf that survives Windows' read-only git object files. Never throws. */
export function removeDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
    return;
  } catch {
    /* fall through: clear read-only bits and retry */
  }
  const walk = (p) => {
    try {
      for (const e of readdirSync(p, { withFileTypes: true })) {
        const child = path.join(p, e.name);
        if (e.isDirectory()) walk(child);
        else chmodSync(child, 0o666);
      }
    } catch {
      /* best effort */
    }
  };
  walk(dir);
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* leave it for the OS temp cleaner */
  }
}

export function truncate(text, max = 120) {
  const t = text.trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export function plural(n, word, pluralWord = word + 's') {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
