// Structural rules over test files: deleted tests, fewer assertions, moved goalposts.
import { testStem } from '../classify.js';
import { isCommentLine, matchParen, normalizeLine, splitArgs, testRegex, truncate } from '../util.js';

const STR = String.raw`(['"\x60])((?:\\.|(?!\1)[^\\])*)\1`;

const NAME_PATTERNS = {
  js: [
    {
      re: new RegExp(
        String.raw`\b(?:it|test|specify)(?:\s*\.\s*(?:only|skip|concurrent|sequential|failing|fails|todo|fixme|skipIf\([^)]*\)|runIf\([^)]*\)|each\s*(?:\([^)]*\)|\x60[^\x60]*\x60)))*\s*\(\s*` + STR,
        'g',
      ),
      pick: (m) => m[2],
    },
  ],
  py: [{ re: /^[ \t]*(?:async[ \t]+)?def[ \t]+(test\w*)[ \t]*\(/gm }],
  go: [
    { re: /^func\s+(?:\([^)]*\)\s*)?((?:Test|Benchmark|Fuzz|Example)\w*)\s*\(/gm },
    { re: /\bt\.Run\(\s*"((?:\\.|[^"\\])*)"/g },
    { re: /\bname:\s*"((?:\\.|[^"\\])*)"/g },
  ],
  rs: [{ re: /#\[(?:[\w:]+::)?test\b[^\]]*\]\s*(?:#\[[^\]]*\]\s*)*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+(\w+)/g }],
  java: [
    {
      re: /@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b[^\n]*\n(?:\s*@[^\n]*\n)*\s*(?:(?:public|private|protected|internal|open|override|suspend|static|final)\s+)*(?:void\s+|fun\s+)?`?([^`(\n]+?)`?\s*\(/g,
    },
    { re: /\bvoid\s+(test\w+)\s*\(/g },
  ],
  cs: [
    {
      re: /\[\s*(?:Fact|Theory|Test|TestMethod|TestCase|TestCaseSource|SkippableFact)\b[^\]]*\]\s*(?:\[[^\]]*\]\s*)*(?:(?:public|private|protected|internal|async|static|virtual|override)\s+)*[\w<>[\],.?]+\s+(\w+)\s*\(/g,
    },
  ],
  rb: [
    { re: new RegExp(String.raw`^\s*(?:it|specify|scenario|example|test)\s*\(?\s*` + STR, 'gm'), pick: (m) => m[2] },
    { re: /^\s*def\s+(test_\w+)/gm },
  ],
  php: [
    { re: /function\s+(test\w+)\s*\(/g },
    { re: /(?:#\[Test\]|@test\b)[^]{0,200}?function\s+(\w+)\s*\(/g },
    { re: new RegExp(String.raw`\b(?:it|test)\s*\(\s*` + STR, 'g'), pick: (m) => m[2] },
  ],
  swift: [{ re: /func\s+(test\w+)\s*\(/g }, { re: /@Test\b(?:\([^)]*\))?\s*(?:@\w+(?:\([^)]*\))?\s*)*func\s+(\w+)\s*\(/g }],
  dart: [{ re: new RegExp(String.raw`\b(?:test|testWidgets)\s*\(\s*` + STR, 'g'), pick: (m) => m[2] }],
  c: [
    { re: /\b(?:TEST|TEST_F|TEST_P|TYPED_TEST)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, pick: (m) => `${m[1]}.${m[2]}` },
    { re: /\bTEST_CASE\s*\(\s*"((?:\\.|[^"\\])*)"/g },
  ],
  ex: [{ re: /\btest\s+"((?:\\.|[^"\\])*)"/g }],
};

/** Map of test name -> { count, index } (index of first occurrence, for line lookup). */
export function extractTestNames(text, lang) {
  const names = new Map();
  if (!text) return names;
  for (const { re, pick } of NAME_PATTERNS[lang] ?? []) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const name = (pick ? pick(m) : m[m.length - 1] ?? m[1])?.trim();
      if (!name) continue;
      const entry = names.get(name);
      if (entry) entry.count++;
      else names.set(name, { count: 1, index: m.index });
    }
  }
  return names;
}

// `assert(...)` calls and statement-form `assert x` / `assert_equal a, b`, but not `const assert = require(...)`.
const ASSERTION = /\bexpect\s*\(|\bassert\w*!?\s*\(|^\s*assert(?:_\w+)?\s+(?![=:])|\bAssert\s*\.\s*\w+\s*\(|\bXCTAssert\w*\s*\(|#(?:expect|require)\s*\(|\b(?:EXPECT|ASSERT)_[A-Z_]+\s*\(|\b(?:REQUIRE|CHECK)(?:_\w+)?\s*\(|\bt\s*\.\s*(?:Error|Errorf|Fatal|Fatalf|Fail|FailNow)\s*\(|\bassert\s*\.\s*\w+\s*\(|\brequire\s*\.\s*[A-Z]\w*\s*\(|\.should\b|\bshould\s*\(|\$this\s*->\s*assert\w*\s*\(|\bself\s*\.\s*assert\w*\s*\(|\bassertThat\s*\(|\bverify\s*\(/;

export function isAssertionLine(text) {
  return !isCommentLine(text) && testRegex(ASSERTION, text);
}

function countAssertions(lines) {
  if (!lines) return 0;
  let n = 0;
  for (const l of lines) if (isAssertionLine(l)) n++;
  return n;
}

const NAME_STOPWORDS = new Set(['a', 'an', 'the', 'is', 'are', 'it', 'to', 'of', 'on', 'in', 'and', 'or', 'when', 'if', 'with', 'for', 'should', 'be', 'not', 'still', 'that', 'does', 'do', 'test']);

function nameTokens(name) {
  return new Set(name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t)));
}

/**
 * Do two test names describe the same behavior? Used to tell a test that was split or moved
 * to another file under a new name from one that simply disappeared.
 */
export function similarNames(a, b) {
  const A = nameTokens(a);
  const B = nameTokens(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared >= 2 && shared / Math.min(A.size, B.size) >= 0.5;
}

/** Map a line number in the old file to the closest line in the new file. */
export function oldToNewLine(file, oldLine) {
  let offset = 0;
  for (const h of file.hunks) {
    const oldEnd = h.oldStart + h.removed.length;
    if (oldLine < h.oldStart) break;
    if (oldLine < oldEnd) return Math.max(1, h.newStart);
    offset += h.added.length - h.removed.length;
  }
  return Math.max(1, oldLine + offset);
}

function lineOfIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// ---------- assertion parsing (for "moved goalposts" detection) ----------

const STRONG = new Set([
  'toBe', 'toEqual', 'toStrictEqual', 'toMatchObject', 'toHaveBeenCalledWith', 'toHaveBeenNthCalledWith',
  'toHaveBeenLastCalledWith', 'toHaveBeenCalledTimes', 'toHaveLength', 'toHaveProperty', 'toThrow', 'toThrowError',
  'toMatch', 'toContainEqual', 'toBeCloseTo', 'equal', 'equals', 'eql', 'eq', 'isEqualTo', 'containsExactly',
  'hasSize', 'isSameAs', 'assertEqual', 'assertEquals', 'assertSame', 'assertIs', 'assertDictEqual',
  'assertListEqual', 'assertCountEqual', 'assertAlmostEqual', 'assertRaises', 'assertStrictEqual', 'assert_equal',
  'assert_eq!', 'Equal', 'Equals', 'AreEqual', 'Same', 'Exactly', 'EqualValues', 'StrictEqual', 'deepEqual',
  'deepStrictEqual', 'strictEqual', 'XCTAssertEqual', 'EXPECT_EQ', 'ASSERT_EQ', 'to eq', 'to eql', 'to equal',
  'to match', 'to raise_error', '==',
]);

const WEAK = new Set([
  'toBeDefined', 'toBeTruthy', 'toBeFalsy', 'toBeInstanceOf', 'toBeTypeOf', 'toHaveBeenCalled', 'not.toBeNull',
  'not.toBeUndefined', 'ok', 'exist', 'exists', 'isNotNull', 'isNotEmpty', 'isInstanceOf', 'assertTrue', 'assertFalse',
  'assertIsNotNone', 'assertIsInstance', 'assertIn', 'assertNotNull', 'assertNotNil', 'assert_not_nil', 'assert',
  'assert!', 'NotNil', 'NotNull', 'NotEmpty', 'True', 'IsNotNull', 'IsTrue', 'XCTAssertNotNil', 'XCTAssertTrue',
  'EXPECT_TRUE', 'ASSERT_TRUE', 'to be_truthy', 'to be_present', 'not_to be_nil', 'to_not be_nil', 'is not',
  'truthy',
]);

const norm = (s) => normalizeLine(String(s ?? '')).replace(/;$/, '').replace(/\s*,\s*$/, '');

function parseExpectStyle(t, opener) {
  const m = opener.exec(t);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const close = matchParen(t, open);
  if (close < 0) return null;
  const subject = t.slice(open + 1, close);
  const rest = t.slice(close + 1).replace(/->/g, '.');
  // JS / AssertJ / Pest: .not.toBe(…)
  let mm = /^\s*((?:\.\s*(?:not|resolves|rejects|to|be|been|is|deep|own|nested|and|has|have)\s*)*)\.\s*(\w+)\s*\(/.exec(rest);
  if (mm) {
    const argOpen = mm[0].length - 1;
    const argClose = matchParen(rest, argOpen);
    const chain = mm[1].replace(/\s+/g, '').replace(/^\./, '');
    const matcher = (chain ? chain + '.' : '') + mm[2];
    const args = argClose > 0 ? rest.slice(argOpen + 1, argClose) : rest.slice(argOpen + 1);
    return { kind: 'expect', subject: norm(subject), matcher, args: norm(args) };
  }
  // RSpec: .to eq(…) / .not_to be_nil
  mm = /^\s*\.\s*(to|not_to|to_not)\s+(\w+)\s*\(?(.*?)\)?\s*$/.exec(rest);
  if (mm) return { kind: 'expect', subject: norm(subject), matcher: `${mm[1]} ${mm[2]}`, args: norm(mm[3]) };
  return null;
}

const CALL_OPENER =
  /(?:^|[^\w.$])((?:self\s*\.\s*|this\s*\.\s*|\$this\s*->\s*)?(?:assert[A-Z_]\w*|assert_\w+|assert_eq!|assert_ne!|assert!)|(?:assert|Assert|require)\s*\.\s*\w+|XCTAssert\w*|(?:EXPECT|ASSERT)_[A-Z_]+)\s*\(/;

function parseCallStyle(t) {
  const m = CALL_OPENER.exec(t);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  const close = matchParen(t, open);
  if (close < 0) return null;
  let fn = m[1].replace(/\s+/g, '').replace(/^(?:self\.|this\.|\$this->)/, '');
  let args = splitArgs(t.slice(open + 1, close)).map(norm);
  if (/^(?:assert|require)\./.test(fn) && /^[A-Z]/.test(fn.split('.')[1] ?? '') && args[0] === 't') args = args.slice(1); // Go testify
  fn = fn.replace(/^(?:assert|Assert|require)\./, '');
  return { kind: 'call', matcher: fn, args };
}

function parsePyAssert(t) {
  const m = /^assert\s+(.+)$/.exec(t);
  if (!m) return null;
  const cond = splitArgs(m[1])[0] ?? '';
  const op = /\s(==|!=|<=|>=|is not|is|not in|in)\s/.exec(cond);
  if (!op) return { kind: 'py', subject: norm(cond), matcher: 'assert', args: '' };
  const left = cond.slice(0, op.index);
  const right = cond.slice(op.index + op[0].length);
  if (op[1] === 'is not' && /^None$/.test(right.trim())) return { kind: 'py', subject: norm(left), matcher: 'is not', args: 'None' };
  return { kind: 'py', subject: norm(left), matcher: op[1], args: norm(right) };
}

const KV = /^\s*(?:(?:const|let|var|val|final|auto|my)\s+)?["']?((?:want|wanted|expected|expect|exp|golden|answer)\w*)["']?\s*(?::=|=|:)\s*(.+?)\s*[,;]?\s*$/i;

export function parseAssertion(text) {
  const t = text.trim().replace(/;\s*$/, '');
  if (!t || isCommentLine(t)) return null;
  return (
    parseExpectStyle(t, /\bexpect\s*\(/) ||
    parseExpectStyle(t, /\bassertThat\s*\(/) ||
    parseCallStyle(t) ||
    parsePyAssert(t) ||
    (() => {
      const m = KV.exec(t);
      return m ? { kind: 'kv', subject: m[1].toLowerCase(), matcher: 'kv', args: norm(m[2]) } : null;
    })()
  );
}

const LITERALISH = /^(?:-?\d[\d_.]*n?|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`[^`$]*`|true|false|null|undefined|None|True|False|nil|\/.+\/[a-z]*|\{[^()]*\}|\[[^()]*\]|[A-Z][A-Z0-9_]+)$/;

/** Expression with literals blanked out: `count + 3` and `count + 4` share a shape. */
function shapeOf(s) {
  return s
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, 'S')
    .replace(/\b\d+(?:\.\d+)?n?\b/g, '#');
}

/**
 * Did the *expectation* change, or just the expression that computes the actual value?
 * `46 → 47`, `'warning' → 'info'`, `n + 3 → n + 4` move the goalposts; `getStore(r) → r.store` doesn't.
 */
function goalpostMoved(before, after) {
  return LITERALISH.test(before) || LITERALISH.test(after) || shapeOf(before) === shapeOf(after);
}

// Assertions that check opposite things: swapping one for the other flips the expectation.
const OPPOSITES = new Map(
  [
    ['assertTrue', 'assertFalse'], ['assertEqual', 'assertNotEqual'], ['assertEquals', 'assertNotEquals'],
    ['assertIs', 'assertIsNot'], ['assertIn', 'assertNotIn'], ['assertIsNone', 'assertIsNotNone'],
    ['assertNull', 'assertNotNull'], ['assertSame', 'assertNotSame'], ['assertRegex', 'assertNotRegex'],
    ['assertIsInstance', 'assertNotIsInstance'], ['assert_equal', 'refute_equal'], ['assert_nil', 'refute_nil'],
    ['assert_eq!', 'assert_ne!'], ['equal', 'notEqual'], ['strictEqual', 'notStrictEqual'], ['deepEqual', 'notDeepEqual'],
    ['deepStrictEqual', 'notDeepStrictEqual'], ['throws', 'doesNotThrow'], ['rejects', 'doesNotReject'],
    ['match', 'doesNotMatch'], ['True', 'False'], ['Equal', 'NotEqual'], ['Nil', 'NotNil'], ['Error', 'NoError'],
    ['Empty', 'NotEmpty'], ['Contains', 'NotContains'], ['Zero', 'NotZero'], ['IsTrue', 'IsFalse'],
    ['AreEqual', 'AreNotEqual'], ['IsNull', 'IsNotNull'], ['XCTAssertTrue', 'XCTAssertFalse'],
    ['XCTAssertEqual', 'XCTAssertNotEqual'], ['XCTAssertNil', 'XCTAssertNotNil'], ['EXPECT_TRUE', 'EXPECT_FALSE'],
    ['ASSERT_TRUE', 'ASSERT_FALSE'], ['EXPECT_EQ', 'EXPECT_NE'], ['ASSERT_EQ', 'ASSERT_NE'],
  ].flatMap(([a, b]) => [[a, b], [b, a]]),
);

/** `x` vs `!x` / `not x`: one expression is the negation of the other. */
function negated(a, b) {
  const strip = (s) => {
    const m = /^(?:!\s*|not\s+)(.+)$/.exec(s);
    return m ? m[1].replace(/^\((.*)\)$/, '$1').trim() : null;
  };
  const unwrap = (s) => s.replace(/^\((.*)\)$/, '$1').trim();
  return strip(a) === unwrap(b) || strip(b) === unwrap(a);
}

/** `f(x)` → `f(x, opts)`: the same function, called with arguments added or dropped at the end. */
function callArgsExtended(before, after) {
  const call = (s) => {
    const m = /^([\w$.]+)\s*\(/.exec(s);
    if (!m) return null;
    const close = matchParen(s, m[0].length - 1);
    if (close !== s.length - 1) return null;
    return { callee: m[1], args: splitArgs(s.slice(m[0].length, close)).map(norm).filter(Boolean) };
  };
  const b = call(before);
  const a = call(after);
  if (!b || !a || b.callee !== a.callee || b.args.length === a.args.length) return false;
  const [short, long] = b.args.length < a.args.length ? [b.args, a.args] : [a.args, b.args];
  return short.every((x, i) => x === long[i]);
}

const flipped = (r, a, show) => ({ type: 'changed', message: `Assertion flipped: ${truncate(show(r), 60)} → ${truncate(show(a), 60)}` });
const callChanged = (before, after) => ({
  type: 'changed',
  message: `Tested call changed, expected value kept: ${truncate(before, 50)} → ${truncate(after, 50)}`,
});

/** Compare a removed assertion with an added one. Returns null | {type, message}. */
export function compareAssertions(r, a) {
  if (r.kind === 'call' && a.kind === 'call') {
    const showCall = (x) => `${x.matcher}(${x.args.join(', ')})`;
    if (r.matcher === a.matcher && r.args.length === a.args.length && r.args.length >= 2) {
      const diffs = [0, 1].filter((i) => r.args[i] !== a.args[i]);
      if (diffs.length === 1) {
        const i = diffs[0];
        if (goalpostMoved(r.args[i], a.args[i])) {
          return { type: 'changed', message: `Expected value changed: ${truncate(r.args[i], 50)} → ${truncate(a.args[i], 50)}` };
        }
        return callArgsExtended(r.args[i], a.args[i]) ? callChanged(r.args[i], a.args[i]) : null;
      }
      return null;
    }
    if (r.matcher === a.matcher && r.args.length === 1 && a.args.length === 1 && negated(r.args[0], a.args[0])) return flipped(r, a, showCall);
    if (OPPOSITES.get(r.matcher) === a.matcher && r.args.length === a.args.length && r.args.every((x, i) => x === a.args[i])) {
      return flipped(r, a, showCall);
    }
    if (STRONG.has(r.matcher) && WEAK.has(a.matcher) && a.args.some((x) => r.args.slice(0, 2).includes(x))) {
      return { type: 'weakened', message: `${r.matcher}(…) replaced by ${a.matcher}(…)` };
    }
    return null;
  }
  if (r.kind === 'py' && a.kind === 'py' && r.matcher === 'assert' && a.matcher === 'assert' && negated(r.subject, a.subject)) {
    return flipped(r, a, (x) => `assert ${x.subject}`);
  }
  if (r.kind === a.kind && r.kind !== 'kv' && r.subject !== a.subject && r.matcher === a.matcher && r.args === a.args && callArgsExtended(r.subject, a.subject)) {
    return callChanged(r.subject, a.subject);
  }
  if (r.kind !== a.kind || r.subject === undefined || r.subject !== a.subject) return null;
  if (r.kind === 'kv') {
    if (r.args === a.args || !goalpostMoved(r.args, a.args)) return null;
    return { type: 'changed', message: `Expected value changed: ${r.subject} ${truncate(r.args, 50)} → ${truncate(a.args, 50)}` };
  }
  if (r.matcher === a.matcher) {
    if (r.args === a.args) return null;
    if (a.args === '' && r.args !== '') return { type: 'weakened', message: `${r.matcher}(${truncate(r.args, 40)}) loosened to ${a.matcher}()` };
    return { type: 'changed', message: `Expected value changed: ${truncate(r.args, 50)} → ${truncate(a.args, 50)}` };
  }
  const strongOld = STRONG.has(r.matcher) || STRONG.has(r.matcher.replace(/^not\./, ''));
  const weakNew = WEAK.has(a.matcher) || (r.kind === 'py' && (a.matcher === 'assert' || a.matcher === 'is not'));
  const show = (x) => (x.kind === 'py' ? `assert ${x.subject}${x.matcher === 'assert' ? '' : ` ${x.matcher} ${truncate(x.args, 40)}`}` : `${x.matcher}(${truncate(x.args, 40)})`);
  if (strongOld && weakNew) return { type: 'weakened', message: `${show(r)} weakened to ${show(a)}` };
  return { type: 'changed', message: `Assertion changed: ${show(r)} → ${show(a)}` };
}

// ---------- test tables (table-driven tests, parametrize lists, `for (x of [..])`) ----------

const STRING_SRC = String.raw`'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"`;
const LITERAL_SRC = String.raw`${STRING_SRC}|-?\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?|\b(?:true|false|null|undefined|None|True|False|nil)\b`;
const ROW_TOKEN = new RegExp(String.raw`(\s+)|((?:[A-Za-z_$][\w$]*|${STRING_SRC})\s*:(?!:))|(${LITERAL_SRC})|([[\](){},;])`, 'y');

/**
 * A line that is pure data, such as `[1900, true],`, `(1900, True),`, `{ in: 5, want: 120 },` or
 * `1900,`: returns its literals and its shape with the literals blanked out, or null.
 */
export function dataRow(text) {
  const t = text.trim();
  if (!t || !(/^[[({]/.test(t) || /,$/.test(t))) return null;
  const literals = [];
  let shape = '';
  let depth = 0;
  ROW_TOKEN.lastIndex = 0;
  while (ROW_TOKEN.lastIndex < t.length) {
    const m = ROW_TOKEN.exec(t);
    if (!m) return null;
    if (m[1]) continue;
    if (m[3]) {
      literals.push(m[3]);
      shape += 'L';
      continue;
    }
    if (m[4] && '[({'.includes(m[4])) depth++;
    if (m[4] && '])}'.includes(m[4]) && --depth < 0) return null; // the tail of a call: `{ name: 'X' });`
    shape += (m[2] ?? m[4]).replace(/\s+/g, '');
  }
  // Open brackets: the start of a multi-line value (`[true,`), not a row. A key with one value
  // (`code: 1,`) is an object property, not a row.
  if (depth !== 0 || !literals.length || (!/^[[({]/.test(t) && (literals.length > 1 || shape.includes(':')))) return null;
  return { literals, shape };
}

const INLINE_LIST = new RegExp(String.raw`\[\s*((?:${LITERAL_SRC})(?:\s*,\s*(?:${LITERAL_SRC}))*)\s*,?\s*\]`, 'g');

/** Literal lists inside a line, e.g. the `[1600, 1900]` of `for (const y of [1600, 1900])`. */
function inlineLists(text) {
  const lists = [];
  const shape = text.replace(INLINE_LIST, (_, items) => {
    lists.push(items.match(new RegExp(LITERAL_SRC, 'g')));
    return '[L]';
  });
  return { lists, shape: normalizeLine(shape) };
}

/** Is `small` what is left of `big` after removing some items (and nothing else)? */
function dropped(big, small) {
  if (small.length >= big.length) return null;
  const gone = [];
  let j = 0;
  for (const item of big) {
    if (j < small.length && small[j] === item) j++;
    else gone.push(item);
  }
  return j === small.length ? gone : null;
}

/**
 * Cases dropped from, or reordered in, the data of one test file. Whole rows that disappear from
 * multi-line tables are not reported: features get removed and tables shrink all the time, so
 * that signal is mostly noise. A list on one line losing an item while nothing else on the line
 * changes is not.
 */
function tableChanges(file) {
  const out = { dropped: [], changed: [] };
  // Lists inside a line: `for (const year of [1600, 1896, 1900])` losing 1900.
  for (const hunk of file.hunks) {
    const used = new Set();
    for (const r of hunk.removed) {
      if (parseAssertion(r.text) || dataRow(r.text)) continue;
      const before = inlineLists(r.text);
      if (!before.lists.length) continue;
      const a = hunk.added.find((x) => !used.has(x.line) && inlineLists(x.text).shape === before.shape);
      if (!a) continue;
      used.add(a.line);
      const after = inlineLists(a.text);
      before.lists.forEach((items, i) => {
        const gone = dropped(items, after.lists[i]);
        if (gone) out.dropped.push({ line: a.line, message: `${truncate(gone.join(', '), 40)} removed from a list in the test`, snippet: truncate(a.text) });
      });
    }
  }

  // Rows moved within their table: an order-sensitive test (sorting, dedupe, "first wins") now
  // checks a different case, although every row is still there.
  if (!file.oldLines || !file.newLines) return out;
  const key = (text) => normalizeLine(text).replace(/,$/, '');
  const rowLines = (lines) => lines.filter((l) => dataRow(l.text) && !parseAssertion(l.text));
  const table = (lines, at) => {
    let start = at - 1;
    let end = at - 1;
    while (start > 0 && dataRow(lines[start - 1])) start--;
    while (end < lines.length - 1 && dataRow(lines[end + 1])) end++;
    return lines.slice(start, end + 1).map(key);
  };
  const addedRows = rowLines(file.added);
  for (const r of rowLines(file.removed)) {
    const a = addedRows.find((x) => key(x.text) === key(r.text));
    if (!a) continue;
    const before = table(file.oldLines, r.line);
    const after = table(file.newLines, a.line);
    const sorted = (list) => [...list].sort().join('\n');
    if (before.join('\n') !== after.join('\n') && sorted(before) === sorted(after)) {
      out.changed.push({ line: a.line, message: `Test data reordered: ${truncate(key(r.text), 50)} moved within a test table`, snippet: truncate(a.text) });
      break;
    }
  }
  return out;
}

// ---------- rules ----------

function testFiles(ctx) {
  return ctx.files.filter((f) => f.kind.test && f.kind.code);
}

export const testRules = [
  {
    id: 'test-file-deleted',
    severity: 'high',
    category: 'disabled-tests',
    title: 'Test file deleted',
    hint: 'Restore the test file and make the code pass it.',
    checkAll(ctx) {
      return ctx.testDiff.deletedFiles.map(({ file, names }) => ({
        file,
        line: 1,
        severity: names.length ? 'high' : 'medium',
        message: names.length
          ? `Deleted ${file.path} with ${names.length} test${names.length === 1 ? '' : 's'}: ${names.slice(0, 4).map((n) => `“${n}”`).join(', ')}${names.length > 4 ? ', …' : ''}`
          : `Deleted test file ${file.path}`,
      }));
    },
  },
  {
    id: 'test-removed',
    severity: 'high',
    category: 'disabled-tests',
    title: 'Test case removed',
    hint: 'Put the test back. If the behavior really changed, update it instead of deleting it.',
    checkAll(ctx) {
      return ctx.testDiff.removed.map(({ file, name, line, source }) => ({ file, line, message: `Test “${name}” was removed`, snippet: source }));
    },
  },
  {
    id: 'test-replaced',
    severity: 'medium',
    category: 'disabled-tests',
    title: 'Test case replaced by a different one',
    hint: 'Check that the new test still covers what the old one did.',
    checkAll(ctx) {
      return ctx.testDiff.replaced.map(({ file, from, to, where, line }) => ({
        file,
        line,
        message: `Test “${from}” was replaced by “${to}”${where ? ` in ${where}` : ''}`,
        snippet: to,
      }));
    },
  },
  {
    id: 'assertions-removed',
    severity: 'high',
    category: 'weakened-tests',
    title: 'Assertions removed from a test file',
    hint: 'Keep the assertions; fix the code until they pass.',
    checkAll(ctx) {
      const out = [];
      // Assertions that show up in another test file were moved (e.g. a file split), not removed.
      const addedElsewhere = new Map();
      for (const f of testFiles(ctx)) {
        for (const a of f.added) {
          if (!isAssertionLine(a.text)) continue;
          const key = normalizeLine(a.text);
          addedElsewhere.set(key, (addedElsewhere.get(key) ?? 0) + 1);
        }
      }
      for (const file of testFiles(ctx)) {
        if (file.status === 'A' || file.status === 'D') continue;
        // Already explained: a removed test, or a test rewritten into another file.
        if (ctx.testDiff.removedIn.has(file.path)) continue;
        if (ctx.testDiff.replaced.some((r) => r.file === file && r.where)) continue;
        const before = countAssertions(file.oldLines);
        const after = countAssertions(file.newLines);
        if (after >= before) continue;
        const ownAdded = new Set(file.added.map((a) => normalizeLine(a.text)));
        let lost = 0;
        for (const r of file.removed) {
          if (!isAssertionLine(r.text)) continue;
          const key = normalizeLine(r.text);
          if (ownAdded.has(key)) continue;
          const n = addedElsewhere.get(key) ?? 0;
          if (n > 0) addedElsewhere.set(key, n - 1);
          else lost++;
        }
        if (Math.min(lost, before - after) <= 0) continue;
        // The cheat signature is a test file that only lost lines. If anything real was added
        // (a helper, a rewrite), it is more likely a refactor: report it for review instead.
        const pureDeletion = !file.added.some((a) => a.text.trim() && !isCommentLine(a.text));
        const addedNorm = new Set(file.added.map((a) => normalizeLine(a.text)));
        const gone = file.removed.filter((r) => isAssertionLine(r.text) && !addedNorm.has(normalizeLine(r.text)));
        const first = gone[0];
        out.push({
          file,
          line: first ? oldToNewLine(file, first.line) : 1,
          severity: pureDeletion ? 'high' : 'medium',
          message: `${Math.min(lost, before - after)} fewer assertion${Math.min(lost, before - after) === 1 ? '' : 's'} in ${file.path} (${before} → ${after})`,
          snippet: first ? truncate(first.text) : undefined,
        });
      }
      return out;
    },
  },
  {
    id: 'matcher-weakened',
    severity: 'high',
    category: 'weakened-tests',
    title: 'Assertion weakened',
    hint: 'Restore the precise assertion and fix the code to satisfy it.',
    checkAll: (ctx) => ctx.assertionChanges.filter((c) => c.type === 'weakened').map(toFinding),
  },
  {
    id: 'expected-changed',
    severity: 'medium',
    category: 'weakened-tests',
    title: 'Expected value or test data changed',
    hint: 'Confirm the new expectation is the correct behavior, not the current (buggy) output.',
    checkAll: (ctx) => ctx.assertionChanges.filter((c) => c.type === 'changed').map(toFinding),
  },
  {
    id: 'test-data-removed',
    severity: 'medium',
    category: 'disabled-tests',
    title: 'Case removed from a test table',
    hint: 'Put the case back. If it was wrong, fix the expectation and say why.',
    checkAll: (ctx) => ctx.testDiff.dropped.map(({ file, line, message, snippet }) => ({ file, line, message, snippet })),
  },
  {
    id: 'mocked-subject',
    severity: 'medium',
    category: 'weakened-tests',
    title: 'Test mocks the module it is supposed to test',
    hint: 'Mock the dependencies, not the unit under test.',
    checkAll(ctx) {
      const out = [];
      for (const file of testFiles(ctx)) {
        if (file.lang !== 'js') continue;
        const stem = testStem(file.path).toLowerCase();
        for (const a of file.added) {
          const m = /\b(?:jest|vi)\s*\.\s*(?:mock|doMock|unstable_mockModule)\s*\(\s*['"]([^'"]+)['"]/.exec(a.text);
          if (!m || !m[1].startsWith('.')) continue;
          const mod = m[1].replace(/\/index(\.[^/.]+)?$/, '').replace(/\.[cm]?[jt]sx?$/, '').split('/').pop().toLowerCase();
          if (mod === stem) out.push({ file, line: a.line, snippet: truncate(a.text), message: `Mocks “${m[1]}”, the module this test file covers` });
        }
      }
      return out;
    },
  },
  {
    id: 'snapshot-changed',
    severity: 'low',
    category: 'weakened-tests',
    title: 'Snapshot or golden file changed',
    hint: 'Review the new snapshot output; make sure it is correct, not just current.',
    checkAll(ctx) {
      const snaps = ctx.files.filter((f) => f.kind.snapshot && f.status !== 'A');
      if (!snaps.length) return [];
      const codeChanged = ctx.files.some((f) => f.kind.source);
      return snaps.slice(0, 10).map((file) => ({
        file,
        line: file.hunks[0]?.newStart ?? 1,
        severity: codeChanged ? 'low' : 'medium',
        message: codeChanged
          ? `${file.status === 'D' ? 'Deleted' : 'Updated'} snapshot ${file.path}`
          : `Snapshot ${file.status === 'D' ? 'deleted' : 'updated'} with no source change: the expectation moved, not the code`,
      }));
    },
  },
];

function toFinding(c) {
  return { file: c.file, line: c.line, message: c.message, snippet: c.snippet };
}

/** Pre-compute test-name and assertion deltas once per scan; several rules share them. */
export function analyzeTests(ctx) {
  const perFile = [];
  const addedPool = new Map(); // name -> count across all test files
  for (const file of testFiles(ctx)) {
    const oldNames = extractTestNames(file.oldText, file.lang);
    const newNames = extractTestNames(file.newText, file.lang);
    const removed = [];
    const added = [];
    for (const [name, { count, index }] of oldNames) {
      const now = newNames.get(name)?.count ?? 0;
      for (let i = now; i < count; i++) removed.push({ name, index });
    }
    for (const [name, { count, index }] of newNames) {
      const before = oldNames.get(name)?.count ?? 0;
      for (let i = before; i < count; i++) added.push({ name, index });
      if (count > before) addedPool.set(name, (addedPool.get(name) ?? 0) + (count - before));
    }
    perFile.push({ file, removed, added, oldCount: [...oldNames.values()].reduce((s, e) => s + e.count, 0) });
  }

  const result = { deletedFiles: [], removed: [], replaced: [], dropped: [], removedIn: new Set() };
  // A test that disappears from one file but appears in another was moved, not removed.
  for (const entry of perFile) {
    entry.removed = entry.removed.filter(({ name }) => {
      const n = addedPool.get(name) ?? 0;
      if (n === 0) return true;
      addedPool.set(name, n - 1);
      return false;
    });
  }
  for (const { file, removed, oldCount } of perFile) {
    if (file.status === 'D') {
      // All of its tests moved elsewhere: a legitimate reorganization.
      if (removed.length > 0 || oldCount === 0) {
        result.deletedFiles.push({ file, names: removed.map((r) => r.name) });
        result.removedIn.add(file.path);
      }
    }
  }
  // Tests still unaccounted for. A removed test that a similarly named new test replaces is
  // reported as replaced: in the same file (a rename), or in another file (a split or move).
  const addedIn = (pred) => perFile.filter((e) => e.file.status !== 'D' && pred(e.file)).flatMap((e) => e.added.map((a) => ({ ...a, file: e.file })));
  const take = (list, pick) => {
    const i = list.findIndex((a) => (addedPool.get(a.name) ?? 0) > 0 && pick(a));
    if (i < 0) return null;
    const [hit] = list.splice(i, 1);
    addedPool.set(hit.name, addedPool.get(hit.name) - 1);
    return hit;
  };
  for (const { file, removed } of perFile) {
    if (file.status === 'D') continue;
    const own = addedIn((f) => f === file);
    const elsewhere = addedIn((f) => f !== file);
    for (const r of removed) {
      const oldLine = lineOfIndex(file.oldText, r.index);
      const replacement = take(own, () => true) ?? take(elsewhere, (a) => similarNames(r.name, a.name));
      if (replacement) {
        result.replaced.push({
          file,
          from: r.name,
          to: replacement.name,
          where: replacement.file === file ? null : replacement.file.path,
          line: lineOfIndex(file.newText, replacement.index),
        });
      } else {
        const source = file.oldLines?.[oldLine - 1] !== undefined ? truncate(file.oldLines[oldLine - 1]) : undefined;
        result.removed.push({ file, name: r.name, line: oldToNewLine(file, oldLine), source });
        result.removedIn.add(file.path);
      }
    }
  }
  ctx.testDiff = result;

  const changes = [];
  for (const file of testFiles(ctx)) {
    for (const hunk of file.hunks) {
      if (!hunk.removed.length || !hunk.added.length) continue;
      const rem = hunk.removed.map((r) => ({ ...r, a: parseAssertion(r.text) })).filter((x) => x.a);
      const add = hunk.added.map((x) => ({ ...x, a: parseAssertion(x.text) })).filter((x) => x.a);
      const used = new Set();
      for (const r of rem) {
        for (const a of add) {
          if (used.has(a.line)) continue;
          if (normalizeLine(r.text) === normalizeLine(a.text)) {
            used.add(a.line);
            break;
          }
          const cmp = compareAssertions(r.a, a.a);
          if (!cmp) continue;
          used.add(a.line);
          changes.push({ file, line: a.line, type: cmp.type, message: cmp.message, snippet: truncate(a.text) });
          break;
        }
      }
    }
  }

  // Test data: cases dropped or reordered. Files that lost whole tests are already reported.
  for (const file of testFiles(ctx)) {
    if (file.status !== 'M' || result.removedIn.has(file.path)) continue;
    const { dropped: gone, changed } = tableChanges(file);
    for (const d of gone) result.dropped.push({ file, ...d });
    for (const c of changed) changes.push({ file, type: 'changed', ...c });
  }
  ctx.assertionChanges = changes;
}
