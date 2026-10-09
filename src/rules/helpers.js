import { isCommentLine, lineAt, testRegex, truncate } from '../util.js';

function toGlobal(re) {
  return re.global ? re : new RegExp(re.source, re.flags + 'g');
}

function countLines(lines, re, codeOnly) {
  if (!lines) return 0;
  let n = 0;
  for (const line of lines) {
    if (codeOnly && isCommentLine(line)) continue;
    if (testRegex(re, line)) n++;
  }
  return n;
}

/**
 * Added lines matching any of `regexes`, but only as many as the file *gained*:
 * a skip marker that merely moved or got re-indented is not reported.
 */
export function netNewLines(file, regexes, { codeOnly = false } = {}) {
  const hits = new Map();
  for (const raw of regexes) {
    const re = new RegExp(raw.source, raw.flags.replace('g', ''));
    const delta = countLines(file.newLines, re, codeOnly) - countLines(file.oldLines, re, codeOnly);
    if (delta <= 0) continue;
    let found = 0;
    for (const a of file.added) {
      if (codeOnly && isCommentLine(a.text)) continue;
      if (re.test(a.text)) {
        if (!hits.has(a.line)) hits.set(a.line, { line: a.line, snippet: truncate(a.text), match: a.text.match(re)[0] });
        if (++found >= delta) break;
      }
    }
  }
  return [...hits.values()].sort((x, y) => x.line - y.line);
}

/**
 * netNewLines with an arbitrary predicate `(text, index, lines) => boolean`, for checks that
 * need the surrounding file (e.g. which CI step a line belongs to).
 */
export function netNewLinesWhere(file, predicate, { message } = {}) {
  const count = (lines) => (lines ? lines.reduce((n, t, i) => n + (predicate(t, i, lines) ? 1 : 0), 0) : 0);
  let delta = count(file.newLines) - count(file.oldLines);
  if (delta <= 0 || !file.newLines) return [];
  const hits = [];
  for (const a of file.added) {
    if (delta <= 0) break;
    if (predicate(a.text, a.line - 1, file.newLines)) {
      hits.push({ line: a.line, snippet: truncate(a.text), ...(message ? { message } : {}) });
      delta--;
    }
  }
  return hits;
}

/** Like netNewLines, for patterns that may span lines; matched against whole-file text. */
export function netNewBlocks(file, regexes) {
  if (!file.newText) return [];
  const added = file.addedSet;
  const hits = new Map();
  for (const raw of regexes) {
    const re = toGlobal(raw);
    const newMatches = [...file.newText.matchAll(re)];
    const oldCount = file.oldText ? [...file.oldText.matchAll(re)].length : 0;
    let delta = newMatches.length - oldCount;
    if (delta <= 0) continue;
    for (const m of newMatches) {
      if (delta <= 0) break;
      const start = lineAt(file.newStarts, m.index);
      const end = lineAt(file.newStarts, m.index + Math.max(0, m[0].length - 1));
      let touched = false;
      for (let l = start; l <= end && !touched; l++) touched = added.has(l);
      if (!touched) continue;
      delta--;
      if (!hits.has(start)) hits.set(start, { line: start, snippet: truncate(m[0].replace(/\s*\n\s*/g, ' ')) });
    }
  }
  return [...hits.values()].sort((x, y) => x.line - y.line);
}

/** Pick per-language regexes, falling back to an `all` bucket. */
export function forLang(table, lang) {
  return [...(table[lang] ?? []), ...(table.all ?? [])];
}
