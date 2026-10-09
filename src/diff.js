/**
 * Parser for `git diff --unified=0` output.
 *
 * Returns one entry per changed path:
 *   { oldPath, newPath, path, status: 'A'|'M'|'D'|'R'|'C', binary, hunks: [{ oldStart, newStart, removed, added }] }
 * where removed/added are [{ line, text }] with 1-based line numbers in the old/new file.
 */
export function parseDiff(text) {
  const files = [];
  let file = null;
  let hunk = null;
  let oldLine = 0;
  let newLine = 0;

  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  for (const raw of lines) {
    if (raw.startsWith('diff --git ')) {
      file = {
        oldPath: null,
        newPath: null,
        status: 'M',
        binary: false,
        header: raw.slice('diff --git '.length),
        hunks: [],
      };
      files.push(file);
      hunk = null;
      continue;
    }
    if (!file) continue;

    if (hunk === null) {
      // Extended header lines, before the first @@.
      if (raw.startsWith('new file mode')) file.status = 'A';
      else if (raw.startsWith('deleted file mode')) file.status = 'D';
      else if (raw.startsWith('rename from ')) {
        file.status = 'R';
        file.oldPath = unquote(raw.slice('rename from '.length));
      } else if (raw.startsWith('rename to ')) {
        file.status = 'R';
        file.newPath = unquote(raw.slice('rename to '.length));
      } else if (raw.startsWith('copy from ')) {
        file.status = 'C';
        file.oldPath = unquote(raw.slice('copy from '.length));
      } else if (raw.startsWith('copy to ')) {
        file.status = 'C';
        file.newPath = unquote(raw.slice('copy to '.length));
      } else if (raw.startsWith('Binary files ') || raw.startsWith('GIT binary patch')) file.binary = true;
      else if (raw.startsWith('--- ')) {
        const p = stripPrefix(raw.slice(4), 'a/');
        if (p !== null) file.oldPath = p;
      } else if (raw.startsWith('+++ ')) {
        const p = stripPrefix(raw.slice(4), 'b/');
        if (p !== null) file.newPath = p;
      } else if (raw.startsWith('@@')) {
        hunk = startHunk(raw, file);
        if (hunk) {
          oldLine = hunk.oldStart;
          newLine = hunk.newStart;
        }
      }
      continue;
    }

    if (raw.startsWith('@@')) {
      hunk = startHunk(raw, file);
      if (hunk) {
        oldLine = hunk.oldStart;
        newLine = hunk.newStart;
      }
      continue;
    }
    const tag = raw[0];
    const content = raw.slice(1).replace(/\r$/, '');
    if (tag === '-') hunk.removed.push({ line: oldLine++, text: content });
    else if (tag === '+') hunk.added.push({ line: newLine++, text: content });
    else if (tag === ' ') {
      oldLine++;
      newLine++;
    }
    // '\' = "No newline at end of file"; ignore.
  }

  for (const f of files) finalizePaths(f);
  return files;
}

function startHunk(raw, file) {
  const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(raw);
  if (!m) return null;
  const hunk = {
    oldStart: Number(m[1]),
    oldCount: m[2] === undefined ? 1 : Number(m[2]),
    newStart: Number(m[3]),
    newCount: m[4] === undefined ? 1 : Number(m[4]),
    removed: [],
    added: [],
  };
  // With -U0 a pure deletion reports the line *before* the gap; a pure insertion likewise for old.
  if (hunk.oldCount === 0) hunk.oldStart += 1;
  if (hunk.newCount === 0) hunk.newStart += 1;
  file.hunks.push(hunk);
  return hunk;
}

function finalizePaths(f) {
  if (f.oldPath === null && f.newPath === null) {
    const [a, b] = splitHeader(f.header);
    f.oldPath = a;
    f.newPath = b;
  }
  if (f.status === 'A') f.oldPath = null;
  if (f.status === 'D') f.newPath = null;
  if (f.status === 'M' || f.status === 'R' || f.status === 'C') {
    f.oldPath = f.oldPath ?? f.newPath;
    f.newPath = f.newPath ?? f.oldPath;
  }
  f.path = f.newPath ?? f.oldPath;
  delete f.header;
}

function stripPrefix(name, prefix) {
  let n = name;
  if (n.endsWith('\t')) n = n.slice(0, -1); // git appends a TAB when the name contains a space
  if (n === '/dev/null') return null;
  n = unquote(n);
  return n.startsWith(prefix) ? n.slice(prefix.length) : n;
}

/** Split `a/x b/x` from the `diff --git` line (used only for binary/mode-only changes). */
function splitHeader(header) {
  if (header.startsWith('"')) {
    const [a, rest] = readQuoted(header);
    const b = rest.trim();
    return [stripPrefix(a, 'a/'), stripPrefix(b, 'b/')];
  }
  // Unquoted: "a/<p> b/<p>" where both halves are usually identical.
  const len = header.length;
  if ((len - 5) % 2 === 0) {
    const half = (len - 5) / 2;
    const a = header.slice(2, 2 + half);
    const b = header.slice(2 + half + 3);
    if (a === b) return [a, b];
  }
  const idx = header.indexOf(' b/');
  return [header.slice(2, idx), header.slice(idx + 3)];
}

function readQuoted(s) {
  let i = 1;
  let out = '"';
  while (i < s.length) {
    const ch = s[i];
    out += ch;
    if (ch === '\\') {
      out += s[i + 1];
      i += 2;
      continue;
    }
    i++;
    if (ch === '"') break;
  }
  return [out, s.slice(i)];
}

/** Undo git's C-style path quoting ("a/caf\303\251.js"). */
export function unquote(name) {
  if (!(name.startsWith('"') && name.endsWith('"') && name.length >= 2)) return name;
  const body = name.slice(1, -1);
  const bytes = [];
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch !== '\\') {
      bytes.push(...Buffer.from(ch, 'utf8'));
      continue;
    }
    const next = body[++i];
    const simple = { n: 10, t: 9, r: 13, '"': 34, '\\': 92, a: 7, b: 8, f: 12, v: 11 };
    if (next in simple) bytes.push(simple[next]);
    else if (/[0-7]/.test(next)) {
      const oct = body.slice(i, i + 3);
      bytes.push(parseInt(oct, 8));
      i += 2;
    } else bytes.push(...Buffer.from(next, 'utf8'));
  }
  return Buffer.from(bytes).toString('utf8');
}
