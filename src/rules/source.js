// hardcoded-answer: production code that returns exactly what a test expects.
import { sourceStem, testStem } from '../classify.js';
import { countMatches, truncate } from '../util.js';

const LIT = String.raw`(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|\x60(?:\\.|[^\x60\\$\n])*\x60)`;

const EXPECTED_IN_TEST = [
  new RegExp(String.raw`\.\s*(?:toBe|toEqual|toStrictEqual|eq|eql|equal|equals|isEqualTo|toBeCloseTo)\s*\(\s*` + LIT + String.raw`\s*[,)]`, 'g'),
  new RegExp(String.raw`\bto\s+eq\s*\(?\s*` + LIT, 'g'),
  new RegExp(String.raw`^\s*assert\s+[^\n]*?==\s*` + LIT + String.raw`\s*(?:,|$)`, 'gm'),
  new RegExp(String.raw`^\s*assert\s+` + LIT + String.raw`\s*==`, 'gm'),
  new RegExp(String.raw`\b(?:assert(?:Equals|Same)|assert_equal|Assert\s*\.\s*(?:Equal|AreEqual)|XCTAssertEqual|EXPECT_EQ|ASSERT_EQ|(?:assert|require)\s*\.\s*(?:Equal|Exactly|EqualValues)\s*\(\s*t\s*,)\s*\(?\s*` + LIT + String.raw`\s*,`, 'g'),
  new RegExp(String.raw`\b(?:assertEqual|assert_eq!|assert\s*\.\s*(?:equal|strictEqual|deepEqual)|XCTAssertEqual|Assert\s*\.\s*Equal|EXPECT_EQ|ASSERT_EQ|(?:assert|require)\s*\.\s*Equal\s*\(\s*t)\s*\(?[^,\n]*,\s*` + LIT + String.raw`\s*[,)]`, 'g'),
  new RegExp(String.raw`\b(?:want|wanted|expected|expect|exp)\w*\s*(?::=|=|:)\s*` + LIT + String.raw`\s*[,;]?\s*$`, 'gim'),
  new RegExp(String.raw`\b(?:got|result|actual|res)\s*!=\s*` + LIT, 'g'),
];

const BORING_STRINGS = new Set(['', 'true', 'false', 'null', 'none', 'nil', 'undefined', 'ok', 'yes', 'no', 'error', 'test', 'foo', 'bar', 'baz', 'a', 'b', 'c']);
const BORING_NUMBERS = new Set([0, 1, -1, 2, 3, 10, 100, 1000]);

export function literalKey(lit) {
  const q = lit[0];
  if (q === '"' || q === "'" || q === '`') {
    const s = lit.slice(1, -1);
    if (s.trim().length < 3 || BORING_STRINGS.has(s.trim().toLowerCase())) return null;
    return 's:' + s;
  }
  const n = Number(lit);
  if (!Number.isFinite(n) || BORING_NUMBERS.has(n)) return null;
  if (Number.isInteger(n) && Math.abs(n) < 10) return null;
  // Powers of two are sizes, widths and limits everywhere; too common to mean anything.
  if (Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0) return null;
  return 'n:' + n;
}

export function expectedLiterals(text) {
  const out = new Map(); // key -> index of first occurrence
  if (!text) return out;
  for (const re of EXPECTED_IN_TEST) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const lit = m[1];
      const key = literalKey(lit);
      if (key && !out.has(key)) out.set(key, m.index);
    }
  }
  return out;
}

const RETURN_LIT = new RegExp(String.raw`(?:\breturn\s+|=>\s*)` + LIT + String.raw`(?=\s*(?:[;,)}\]]|$|\/\/|#|\bif\b|\?|\|\|))`, 'g');
const BRANCH = /\b(?:if|elif|elsif|else\s+if|case|when|switch|match|unless)\b|\?\s*[^:]+:|=>\s*$/;

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

const stemOf = (p, fn) => fn(p).toLowerCase().replace(/[-_]/g, '');

/** The tests that cover the given source files, matched by name: path -> { stem, text }. */
function relatedTests(ctx, sourcePaths) {
  const stems = new Set(sourcePaths.map((p) => stemOf(p, sourceStem)));
  const tests = new Map();
  for (const f of ctx.files) {
    const stem = f.kind.test && f.newText ? stemOf(f.path, testStem) : null;
    if (stem && stems.has(stem)) tests.set(f.path, { stem, text: f.newText });
  }
  const related = ctx.listNewTree().filter((p) => {
    if (tests.has(p) || !stems.has(stemOf(p, testStem))) return false;
    const kind = ctx.classifyPath(p);
    return kind.test && !kind.vendored;
  });
  for (const [p, text] of ctx.readNew(related.slice(0, 40))) if (text) tests.set(p, { stem: stemOf(p, testStem), text });
  return tests;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where a test mentions a literal: `'x'`, `"x"` and `` `x` `` count as the same string. */
function literalInTest(text, literal) {
  const q = literal[0];
  const re =
    q === '"' || q === "'" || q === '`'
      ? new RegExp(`(['"\`])${escapeRe(literal.slice(1, -1))}\\1`)
      : new RegExp(`(?<![\\w.])${escapeRe(literal)}(?![\\w.])`);
  const m = re.exec(text);
  return m ? lineOf(text, m.index) : 0;
}

/**
 * Specific enough that branching on it singles out one input: `'admin@localhost'` or `1900`, but
 * not a type tag or keyword such as `'bigint'` or `'utf8'`, which real code compares with all the time.
 */
function distinctive(literal) {
  if (!literalKey(literal)) return false;
  if (!/^['"`]/.test(literal)) return true;
  const s = literal.slice(1, -1);
  return /[^\w]/.test(s) || s.length >= 12;
}

const LIT_ANY = LIT.slice(1, -1);
const NAME = String.raw`[A-Za-z_$][\w$]*`;
const LIST = String.raw`[\[({]\s*((?:${LIT_ANY})(?:\s*,\s*(?:${LIT_ANY}))*)\s*,?\s*[\])}]`;
const literalsIn = (list) => [...list.matchAll(new RegExp(LIT, 'g'))].map((m) => m[1]);

// The values a branch singles out: `x === LIT`, `x == NAME`, `case LIT:`, `x in NAME`,
// `NAME.has(x)`, `x in (LIT, LIT)`, `[LIT, LIT].includes(x)`.
const COMPARED = new RegExp(
  [
    String.raw`(?<![!=<>])={2,3}\s*(${LIT_ANY}|${NAME})`,
    LIT + String.raw`\s*={2,3}(?!=)`,
    String.raw`\b(?:case|when)\s+` + LIT,
    String.raw`(?<!\bnot\s)\bin\s+(${NAME})\b(?!\s*\()`,
    String.raw`\b(${NAME})\s*\.\s*(?:has|includes|contains)\s*\(`,
    String.raw`(?<!\bnot\s)\bin\s*` + LIST,
    String.raw`\[\s*((?:${LIT_ANY})(?:\s*,\s*(?:${LIT_ANY}))*)\s*,?\s*\]\s*\.\s*includes\s*\(`,
  ].join('|'),
  'g',
);
// `INTERNAL_ADMIN = "admin@localhost"`, `ADMINS = {"admin@localhost"}`, `const SPECIAL = new Set([1900])`:
// constants this change introduces.
const CONSTANT = new RegExp(
  String.raw`^\s*(?:export\s+)?(?:(?:const|let|var|final|static|private|public|readonly)\s+)*(${NAME})\s*(?::\s*[\w.<>\[\], ]+\s*)?=\s*` +
    String.raw`(?:(?:new\s+Set|frozenset|set|tuple|Set\.of|List\.of)\s*\(\s*)?(?:` + LIT + '|' + LIST + String.raw`)\s*\)?\s*;?\s*$`,
);

export const sourceRules = [
  {
    id: 'hardcoded-answer',
    severity: 'high',
    category: 'gamed-code',
    title: 'Code returns the exact value a test expects',
    hint: 'Compute the result. Returning the test’s expected value passes the test without fixing anything.',
    checkAll(ctx) {
      const candidates = [];
      for (const file of ctx.files) {
        if (!file.kind.source || !file.added.length) continue;
        const addedByLine = new Map(file.added.map((a) => [a.line, a]));
        for (const hunk of file.hunks) {
          const replacedLogic = hunk.removed.some((r) => /\breturn\b(?!\s*;?\s*$)/.test(r.text));
          for (const a of hunk.added) {
            RETURN_LIT.lastIndex = 0;
            for (const m of a.text.matchAll(RETURN_LIT)) {
              const key = literalKey(m[1]);
              if (!key) continue;
              const prev = addedByLine.get(a.line - 1);
              const special = BRANCH.test(a.text) || (prev && BRANCH.test(prev.text)) || replacedLogic;
              if (!special) continue;
              const pattern = new RegExp(String.raw`(?:\breturn\s+|=>\s*)` + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
              if (countMatches(file.newText, pattern) <= countMatches(file.oldText, pattern)) continue;
              candidates.push({ file, line: a.line, text: a.text, key, literal: m[1] });
            }
          }
        }
      }
      if (!candidates.length) return [];

      // Expected values come only from the tests that cover each file (matched by name).
      const testTexts = relatedTests(ctx, candidates.map((c) => c.file.path));

      const expected = new Map(); // stem -> Map(key -> { path, line })
      for (const [p, { stem, text }] of testTexts) {
        const byKey = expected.get(stem) ?? new Map();
        for (const [key, index] of expectedLiterals(text)) if (!byKey.has(key)) byKey.set(key, { path: p, line: lineOf(text, index) });
        expected.set(stem, byKey);
      }

      const out = [];
      for (const c of candidates) {
        const where = expected.get(stemOf(c.file.path, sourceStem))?.get(c.key);
        if (!where) continue;
        out.push({
          file: c.file,
          line: c.line,
          snippet: truncate(c.text),
          message: `Returns ${truncate(c.literal, 40)}, the exact value ${where.path}:${where.line} expects`,
        });
      }
      return out;
    },
  },
  {
    id: 'input-special-cased',
    severity: 'medium',
    category: 'gamed-code',
    title: 'Code special-cases an input the tests use',
    hint: 'Handle the general case. An early return for one test input makes that test pass without fixing the logic.',
    checkAll(ctx) {
      const candidates = [];
      for (const file of ctx.files) {
        if (!file.kind.source || !file.added.length) continue;
        const constants = new Map(); // NAME -> literals, for constants this change adds
        for (const a of file.added) {
          const m = CONSTANT.exec(a.text);
          if (m) constants.set(m[1], m[2] !== undefined ? [m[2]] : literalsIn(m[3]));
        }
        const isName = (v) => new RegExp(`^${NAME}$`).test(v);
        const byLine = new Map(file.added.map((a) => [a.line, a]));
        for (const a of file.added) {
          if (!BRANCH.test(a.text)) continue;
          // The special-case shape: a branch on one value that returns right away.
          if (!/\breturn\b/.test(a.text) && !/^\s*return\b/.test(byLine.get(a.line + 1)?.text ?? '')) continue;
          for (const m of a.text.matchAll(COMPARED)) {
            const [, eq, lhs, label, inName, hasName, inList, includesList] = m;
            const list = inList ?? includesList;
            const name = eq ?? inName ?? hasName;
            const values = list !== undefined ? literalsIn(list) : constants.get(name) ?? [eq ?? lhs ?? label].filter((v) => v !== undefined && !isName(v));
            for (const literal of values) {
              if (!distinctive(literal)) continue;
              const pattern = new RegExp(escapeRe(literal));
              if (countMatches(file.newText, pattern) <= countMatches(file.oldText ?? '', pattern)) continue;
              candidates.push({ file, line: a.line, text: a.text, literal });
            }
          }
        }
      }
      if (!candidates.length) return [];

      const testTexts = [...relatedTests(ctx, candidates.map((c) => c.file.path))];
      const out = [];
      const seen = new Set();
      for (const c of candidates) {
        const stem = stemOf(c.file.path, sourceStem);
        for (const [p, t] of testTexts) {
          const line = t.stem === stem ? literalInTest(t.text, c.literal) : 0;
          if (!line || seen.has(`${c.file.path}:${c.line}`)) continue;
          seen.add(`${c.file.path}:${c.line}`);
          out.push({
            file: c.file,
            line: c.line,
            snippet: truncate(c.text),
            message: `Special-cases ${truncate(c.literal, 40)}, an input ${p}:${line} uses`,
          });
        }
      }
      return out;
    },
  },
];
