// Pattern rules: things that should never quietly appear in a diff that "fixes" tests.
import { forLang, netNewBlocks, netNewLines } from './helpers.js';

const SKIP = {
  js: [
    /\b(?:it|test|describe|suite|context|specify)\s*\.\s*(?:skip|skipIf|fixme)\s*\(/,
    /(?<![\w$.])(?:xit|xtest|xdescribe|xcontext|xspecify|xsuite)\s*\(/,
  ],
  py: [
    /@pytest\.mark\.(?:skip|skipif|xfail)\b/,
    /@(?:unittest\.)?(?:skip|skipIf|skipUnless|expectedFailure)\b/,
    /\bpytest\.(?:skip|xfail)\s*\(/,
    /\bself\.skipTest\s*\(/,
    /\braise\s+(?:unittest\.)?SkipTest\b/,
    /^\s*pytestmark\s*=.*\bpytest\.mark\.(?:skip|skipif|xfail)\b/,
  ],
  go: [/\b[tb]\.Skip(?:f|Now)?\s*\(/],
  rs: [/#\[\s*ignore\b/],
  java: [/@Disabled\w*\b/, /@Ignore\b/, /\bassumeTrue\s*\(\s*false\b/, /\bAssumptions\s*\.\s*abort\s*\(/],
  cs: [
    /\[\s*(?:Fact|Theory|Test|TestMethod|TestCase|SkippableFact)\s*\([^\]]*\bSkip\s*=/,
    /\[\s*(?:[\w.]+\s*,\s*)*Ignore\b/,
    /\bAssert\s*\.\s*(?:Inconclusive|Ignore)\s*\(/,
    /\[\s*Explicit\b/,
    /\bSkip\s*\.\s*(?:If|IfNot|Unless)\s*\(/,
  ],
  rb: [
    /^\s*(?:xit|xspecify|xdescribe|xcontext|xscenario|xfeature|xexample)\b/,
    /^\s*skip(?:\s+["']|\s*$|\s*\()/,
    /^\s*pending(?:\s+["']|\s*$|\s*\()/,
    /\bskip:\s*(?:true|["'])/,
    /:skip\s*=>/,
  ],
  php: [/\bmarkTest(?:Skipped|Incomplete)\s*\(/, /(?:\)|^)\s*->\s*(?:skip|todo)\s*\(/],
  swift: [/\bXCTSkip(?:If|Unless)?\s*\(/, /\.disabled\s*\(/],
  dart: [/\bskip\s*:\s*(?:true|['"])/],
  c: [
    /\bGTEST_SKIP\s*\(/,
    /\b(?:TEST|TEST_F|TEST_P|TYPED_TEST)\s*\(\s*\w+\s*,\s*DISABLED_\w+/,
    /\b(?:TEST|TEST_F|TEST_P|TYPED_TEST)\s*\(\s*DISABLED_\w+/,
    /\bSKIP\s*\(/,
    /\bTEST_CASE\s*\([^)]*\[\.\]/,
  ],
  ex: [/@(?:module|describe)?tag\s+(?::skip\b|skip:)/],
};

// Skips that only apply under a condition (platform, missing tool, …) are usually environment
// guards written by humans. Still worth a look, but not a block.
const CONDITIONAL_SKIP = [
  /\bskip(?:If|Unless)\b|\bskipif\b|\bXCTSkip(?:If|Unless)\b|\bSkip\s*\.\s*(?:If|IfNot|Unless)\b/,
  /@(?:Disabled|Enabled)(?:On|If)\w*/,
  /\b(?:test|it)\s*\.\s*(?:skip|fixme)\s*\(\s*(?![\s'"`)])/,
];
const RUNTIME_SKIP =
  /\bpytest\.(?:skip|xfail)\s*\(|\bself\.skipTest\s*\(|\b[tb]\.Skip(?:f|Now)?\s*\(|\bGTEST_SKIP\s*\(|\bSKIP\s*\(|\bXCTSkip\s*\(|\bmarkTest(?:Skipped|Incomplete)\s*\(|\bAssert\s*\.\s*Inconclusive\s*\(|^\s*skip\b|\bthrow\s+XCTSkip\b/;
const GUARD = /\b(?:if|elif|else|unless|except|catch|rescue|when|guard)\b|\?\s*\w/;

function isConditionalSkip(f, hit) {
  const text = f.newLines?.[hit.line - 1] ?? hit.snippet;
  if (CONDITIONAL_SKIP.some((re) => re.test(text))) return true;
  if (!RUNTIME_SKIP.test(text)) return false;
  if (GUARD.test(text.replace(RUNTIME_SKIP, ''))) return true;
  // Walk back through a (possibly multi-line) condition until the previous statement ends.
  for (let l = hit.line - 2, seen = 0; l >= 0 && seen < 4; l--) {
    const prev = f.newLines?.[l];
    if (prev === undefined) break;
    if (!prev.trim()) continue;
    seen++;
    if (GUARD.test(prev)) return true;
    if (/[;{}:]\s*$/.test(prev)) return false;
  }
  return false;
}

const ONLY = {
  js: [
    /\b(?:it|test|describe|suite|context|specify)\s*\.\s*only\s*\(/,
    /(?<![\w$.])(?:fit|fdescribe|fcontext|ftest|fspecify)\s*\(/,
  ],
  rb: [/^\s*(?:fit|fdescribe|fcontext|fspecify|fscenario|fexample)\b/, /\bfocus:\s*true\b/, /:focus\s*=>\s*true/],
  dart: [/\bsolo\s*:\s*true\b/],
  php: [/(?:\)|^)\s*->\s*only\s*\(/],
};

// Assertions that cannot fail. Distinctive enough to check in every test file, whatever the language.
const TAUTOLOGY = [
  /\bexpect\s*\(\s*(true|false|null|undefined|-?\d+(?:\.\d+)?|'[^'\n]*'|"[^"\n]*")\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\(\s*\1\s*\)/,
  /\bexpect\s*\(\s*(?:true|[1-9]\d*|'[^'\n]+'|"[^"\n]+")\s*\)\s*\.\s*(?:toBeTruthy|toBeDefined)\s*\(\s*\)/,
  /\bexpect\s*\(\s*(?:false|0|null|undefined|''|"")\s*\)\s*\.\s*toBeFalsy\s*\(\s*\)/,
  /\bexpect\s*\(\s*([A-Za-z_$][\w$.]*)\s*\)\s*\.\s*(?:toBe|toEqual|toStrictEqual)\s*\(\s*\1\s*\)/,
  /\bexpect\s*\(\s*true\s*\)\s*\.\s*to\s*\.\s*(?:be\s*\.\s*true|equal\s*\(\s*true\s*\))/,
  /\bassert(?:\s*\.\s*ok)?\s*\(\s*(?:true|1|!0|!!1)\s*\)/,
  /\bassert\s*\.\s*(?:equal|strictEqual|deepEqual|deepStrictEqual)\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /^\s*assert\s+(?:True|1|not\s+False|not\s+None|\(\s*True\s*\))\s*(?:,.*)?$/,
  /^\s*assert\s+([\w.[\]'"]+)\s*==\s*\1\s*(?:,.*)?$/,
  /\bself\s*\.\s*assert(?:True|_)\s*\(\s*(?:True|1)\s*[,)]/,
  /\bself\s*\.\s*assertFalse\s*\(\s*(?:False|0|None)\s*[,)]/,
  /\bself\s*\.\s*assert(?:Equal|Equals|Is)\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bassert(?:True|That)\s*\(\s*true\s*[,)]/,
  /\bassertFalse\s*\(\s*false\s*[,)]/,
  /\bassert(?:Equals|Same)\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bassertThat\s*\(\s*true\s*\)\s*\.\s*isTrue\s*\(\s*\)/,
  /\bAssert\s*\.\s*(?:True|IsTrue)\s*\(\s*true\s*[,)]/,
  /\bAssert\s*\.\s*(?:False|IsFalse)\s*\(\s*false\s*[,)]/,
  /\bAssert\s*\.\s*(?:Equal|AreEqual|Same|AreSame)\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bAssert\s*\.\s*Pass\s*\(/,
  /\b(?:assert|require)\s*\.\s*True\s*\(\s*t\s*,\s*true\s*[,)]/,
  /\b(?:assert|require)\s*\.\s*(?:Equal|Exactly|EqualValues)\s*\(\s*t\s*,\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bassert!\s*\(\s*true\s*[,)]/,
  /\bassert_eq!\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bexpect\s*\(\s*true\s*\)\s*\.\s*to\s+(?:be\s*\(?\s*true|be_truthy|eq\s*\(?\s*true)/,
  /^\s*assert\s*\(?\s*true\s*\)?\s*$/,
  /\bassert_equal\s*\(?\s*([^,()\n]+?)\s*,\s*\1\s*\)?\s*$/,
  /\$this\s*->\s*assertTrue\s*\(\s*true\s*[,)]/,
  /\$this\s*->\s*assertFalse\s*\(\s*false\s*[,)]/,
  /\$this\s*->\s*assert(?:Equals|Same)\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /\bexpect\s*\(\s*true\s*\)\s*->\s*toBeTrue\s*\(\s*\)/,
  /\bXCTAssert(?:True)?\s*\(\s*true\s*[,)]/,
  /\bXCTAssertEqual\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*[,)]/,
  /#expect\s*\(\s*true\s*\)/,
  /\b(?:EXPECT|ASSERT)_TRUE\s*\(\s*(?:true|1)\s*\)/,
  /\b(?:EXPECT|ASSERT)_EQ\s*\(\s*([^,()\n]+?)\s*,\s*\1\s*\)/,
  /\b(?:REQUIRE|CHECK)\s*\(\s*true\s*\)/,
  /\bexpect\s*\(\s*true\s*,\s*(?:isTrue|true)\s*\)/,
];

const TEST_ENV = {
  js: [
    /\bprocess\.env\.NODE_ENV\s*[!=]==?\s*['"`]test['"`]/,
    /['"`]test['"`]\s*[!=]==?\s*process\.env\.NODE_ENV\b/,
    /\bprocess\.env\.(?:JEST_WORKER_ID|VITEST|VITEST_WORKER_ID|VITEST_POOL_ID|MOCHA_WORKER_ID|AVA_PATH)\b/,
    /\bprocess\.env\[\s*['"](?:JEST_WORKER_ID|VITEST|VITEST_WORKER_ID|NODE_ENV)['"]\s*\]\s*[!=]==?\s*['"`]?(?:test|true|1)?/,
    /\bimport\.meta\.env\.(?:VITEST|TEST)\b/,
    /\bimport\.meta\.env\.MODE\s*[!=]==?\s*['"]test['"]/,
    /\btypeof\s+(?:jest|vi|describe|it|expect|mocha)\s*[!=]==?\s*['"]undefined['"]/,
    /\bglobalThis\s*\.\s*(?:__vitest_\w+__|jest|__jest\w*)\b/,
  ],
  py: [
    /['"](?:pytest|unittest|_pytest)['"]\s+in\s+sys\.modules/,
    /\bos\.environ(?:\.get)?\s*[[(]\s*['"](?:PYTEST_CURRENT_TEST|PYTEST_VERSION|PYTEST_XDIST_WORKER|TESTING|UNITTEST)['"]/,
    /\bos\.getenv\s*\(\s*['"](?:PYTEST_CURRENT_TEST|PYTEST_VERSION|PYTEST_XDIST_WORKER|TESTING)['"]/,
    /['"](?:PYTEST_CURRENT_TEST|PYTEST_VERSION)['"]\s+in\s+os\.environ/,
    /\bsys\.argv\s*\[\s*0\s*\].*\bpytest\b/,
    /\bsettings\.TESTING\b/,
  ],
  go: [
    /\btesting\.Testing\s*\(\s*\)/,
    /\bflag\.Lookup\s*\(\s*"test\.v"\s*\)/,
    /strings\.HasSuffix\s*\(\s*os\.Args\s*\[\s*0\s*\]\s*,\s*"\.test"\s*\)/,
  ],
  rs: [/\bcfg!\s*\(\s*test\s*\)/],
  rb: [
    /\bRails\.env\.test\?/,
    /\bENV\s*\[\s*['"](?:RAILS_ENV|RACK_ENV|APP_ENV)['"]\s*\]\s*==\s*['"]test['"]/,
    /\bdefined\?\s*\(?\s*RSpec\b/,
  ],
  php: [
    /\bapp\(\)\s*->\s*(?:runningUnitTests\s*\(|environment\s*\(\s*['"]testing['"])/,
    /\bApp::(?:runningUnitTests\s*\(|environment\s*\(\s*['"]testing['"])/,
    /\bdefined\s*\(\s*['"]PHPUNIT_\w+['"]\s*\)/,
    /\$_(?:ENV|SERVER)\s*\[\s*['"]APP_ENV['"]\s*\]\s*===?\s*['"]testing['"]/,
  ],
  java: [/\bSystem\s*\.\s*getProperty\s*\(\s*"(?:junit|test)[\w.]*"/, /\bClass\s*\.\s*forName\s*\(\s*"org\.junit/],
  cs: [
    /\bAppDomain\s*\.\s*CurrentDomain\s*\.\s*GetAssemblies\s*\(\s*\)[^\n]*(?:xunit|nunit|mstest)/i,
    /\bEnvironment\s*\.\s*GetEnvironmentVariable\s*\(\s*"(?:VSTEST_\w+|XUNIT_\w+)"/,
  ],
  swift: [/\bNSClassFromString\s*\(\s*"XCTest/, /\bXCTestConfigurationFilePath\b/],
  dart: [/\bFLUTTER_TEST\b/],
  ex: [/\bMix\s*\.\s*env\s*\(\s*\)\s*==\s*:test\b/],
};

const TYPE_SUPPRESSED = [
  /@ts-(?:ignore|nocheck|expect-error)\b/,
  /#\s*type:\s*ignore\b/,
  /#\s*pyright:\s*(?:ignore|basic)\b/,
  /#\s*mypy:\s*ignore-errors\b/,
  /@SuppressWarnings\s*\(/,
  /@Suppress\s*\(/,
  /#\s*pragma\s+warning\s+disable\b/,
  /#\s*nullable\s+disable\b/,
  /\[\s*(?:assembly:\s*)?SuppressMessage\s*\(/,
  /@phpstan-ignore(?:-line|-next-line)?\b/,
  /@psalm-suppress\b/,
  /#\s*pragma\s+(?:GCC|clang)\s+diagnostic\s+ignored\b/,
];

const LINT_SUPPRESSED = [
  /\beslint-disable(?:-next-line|-line)?\b/,
  /\bbiome-ignore\b/,
  /\boxlint-disable\b/,
  /\btslint:disable\b/,
  /\bdeno-lint-ignore\b/,
  /#\s*noqa\b/,
  /#\s*(?:pylint|ruff|flake8):\s*(?:disable|noqa)\b/,
  /#\s*nosec\b/,
  /\/\/\s*nolint\b/i,
  /\bNOSONAR\b/,
  /#!?\[\s*allow\s*\(/,
  /#\s*rubocop:\s*disable\b/,
  /\/\/\s*swiftlint:disable\b/,
  /\/\/\s*ignore(?:_for_file)?:\s*\w+/,
  /\bphpcs:(?:ignore|disable)\b/,
];

const ANY_CAST = [/\bas\s+any\b/, /<any>\s*[\w(]/, /\bas\s+unknown\s+as\b/];

const IGNORE_MARKER = [/\banticheat-(?:ignore|disable)\b/i];

const NO_VERIFY = [
  /--no-verify\b/,
  /\b(?:HUSKY|LEFTHOOK)=0\b/,
  /\bHUSKY_SKIP_HOOKS=(?:1|true)\b/,
  /\bSKIP=\S+[^\n]*\bgit\s+commit\b/,
  /\bcore\.hooksPath(?:=|\s+)(?:\/dev\/null|NUL\b|''|"")/,
];

const EQUALITY_OVERRIDE = [
  /def\s+__eq__\s*\([^)]*\)\s*(?:->\s*bool\s*)?:\s*(?:#[^\n]*)?\n?\s*return\s+True\b/,
  /__eq__\s*=\s*lambda\b[^:\n]*:\s*True\b/,
  /def\s+__ne__\s*\([^)]*\)\s*(?:->\s*bool\s*)?:\s*(?:#[^\n]*)?\n?\s*return\s+False\b/,
  /\bequals\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{\s*return\s+true\s*;?\s*\}/,
  /\bfun\s+equals\s*\([^)]*\)\s*(?::\s*Boolean\s*)?=\s*true\b/,
  /\bbool\s+Equals\s*\([^)]*\)\s*(?:=>\s*true\s*;|\{\s*return\s+true\s*;\s*\})/,
  /\boperator\s*==\s*\([^)]*\)\s*(?:const\s*)?(?:=>\s*true\s*;|\{\s*return\s+true\s*;\s*\})/,
  /\bfn\s+eq\s*\(\s*&self\s*,[^)]*\)\s*->\s*bool\s*\{\s*true\s*\}/,
  /\bstatic\s+func\s*==\s*\([^)]*\)\s*->\s*Bool\s*\{\s*(?:return\s+)?true\s*\}/,
  /\bdef\s+==\s*\(?\s*\w*\s*\)?\s*(?:;\s*|\n\s*)true\s*(?:;\s*|\n\s*)end\b/,
  /\bfunc\s*\([^)]*\)\s*Equal\s*\([^)]*\)\s*bool\s*\{\s*return\s+true\s*\}/,
];

const ERROR_SWALLOWED = [
  /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/,
  /\.catch\s*\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>\s*(?:\{\s*\}|null|undefined|void 0|false|\[\])\s*\)/,
  /\.catch\s*\(\s*(?:noop|_\.noop)\s*\)/,
  /^[ \t]*except\b[^\n:]*:[ \t]*(?:#[^\n]*)?\n[ \t]+(?:pass|\.\.\.)[ \t]*(?:#[^\n]*)?$/m,
  /^[ \t]*except\b[^\n:]*:[ \t]*(?:pass|\.\.\.)[ \t]*$/m,
  /\brescue\s+nil\b/,
  /^[ \t]*rescue\b[^\n]*\n[ \t]*end\b/m,
  /\bif\s+err\s*!=\s*nil\s*\{\s*\}/,
  /\bErr\s*\(\s*_\s*\)\s*=>\s*(?:\{\s*\}|\(\s*\))/,
];

const ASSERTION_IN_TRY = [
  /\btry\s*\{(?:(?!\btry\b)[^]){0,1500}?\b(?:expect|assert\w*|should)\b(?:(?!\btry\b)[^]){0,1500}?\}\s*catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*|\/\*[^]*?\*\/\s*|console\.\w+\([^)\n]*\)\s*;?\s*)*\}/,
  /^([ \t]*)try:[ \t]*\n(?:\1[ \t]+[^\n]*\n|[ \t]*\n){0,60}?\1[ \t]+[^\n]*\bassert\b[^\n]*\n(?:\1[ \t]+[^\n]*\n|[ \t]*\n){0,60}?\1except\b[^\n]*:[ \t]*\n\1[ \t]+(?:pass|\.\.\.|print\([^\n]*\))[ \t]*$/m,
];

export const patternRules = [
  {
    id: 'skip-added',
    severity: 'high',
    category: 'disabled-tests',
    title: 'Test disabled with a skip marker',
    hint: 'Remove the skip and fix the code the test exercises.',
    applies: (f) => f.kind.test || f.lang === 'rs',
    check: (f) =>
      netNewLines(f, forLang(SKIP, f.lang), { codeOnly: true }).map((h) =>
        isConditionalSkip(f, h)
          ? { ...h, severity: 'medium', message: 'Test skipped under a condition: make sure it is about the environment, not the result' }
          : h,
      ),
  },
  {
    id: 'only-added',
    severity: 'high',
    category: 'disabled-tests',
    title: 'Test focused with .only: every other test silently stops running',
    hint: 'Remove .only / fit / fdescribe before finishing.',
    applies: (f) => f.kind.test,
    check: (f) => netNewLines(f, forLang(ONLY, f.lang), { codeOnly: true }),
  },
  {
    id: 'tautology-added',
    severity: 'high',
    category: 'weakened-tests',
    title: 'Assertion that can never fail',
    hint: 'Assert on the real result of the code under test.',
    applies: (f) => f.kind.test || f.lang === 'rs',
    check: (f) => netNewLines(f, TAUTOLOGY, { codeOnly: true }),
  },
  {
    id: 'assertion-in-try',
    severity: 'high',
    category: 'weakened-tests',
    title: 'Assertion wrapped in a try/catch that swallows the failure',
    hint: 'Let the assertion fail. Use the framework’s throws/raises helper if an error is expected.',
    applies: (f) => f.kind.test && f.newText !== null && f.newText.length < 400_000,
    check: (f) => netNewBlocks(f, ASSERTION_IN_TRY),
  },
  {
    id: 'test-env-check',
    severity: 'high',
    category: 'gamed-code',
    title: 'Production code checks whether it is running under test',
    hint: 'Code should behave the same in tests and in production. Fix the logic or inject the dependency instead.',
    applies: (f) => f.kind.source,
    check: (f) => netNewLines(f, forLang(TEST_ENV, f.lang), { codeOnly: true }),
  },
  {
    id: 'equality-override',
    severity: 'high',
    category: 'gamed-code',
    title: 'Equality overridden to always succeed',
    hint: 'Compare the actual fields; an equality that always returns true makes every assertion pass.',
    applies: (f) => f.kind.code,
    // In C++, Rust and Swift an always-true == is a real idiom (unit types, sentinel iterators).
    check: (f) => netNewBlocks(f, EQUALITY_OVERRIDE).map((h) => (['c', 'rs', 'swift'].includes(f.lang) ? { ...h, severity: 'medium' } : h)),
  },
  {
    id: 'no-verify',
    severity: 'high',
    category: 'bypassed-checks',
    title: 'Git hooks bypassed',
    hint: 'Run the hooks and fix what they report instead of skipping them.',
    applies: (f) => f.kind.script || f.kind.ci,
    check: (f) => netNewLines(f, NO_VERIFY),
  },
  {
    id: 'error-swallowed',
    severity: 'medium',
    category: 'gamed-code',
    title: 'Error silently swallowed',
    hint: 'Handle the error or let it propagate; an empty catch hides the failure the tests should see.',
    applies: (f) => f.kind.source,
    check: (f) => netNewBlocks(f, ERROR_SWALLOWED),
  },
  {
    id: 'type-suppressed',
    severity: 'medium',
    category: 'bypassed-checks',
    title: 'Type checker silenced',
    hint: 'Fix the type error instead of suppressing it.',
    applies: (f) => f.kind.code,
    check: (f) => netNewLines(f, TYPE_SUPPRESSED),
  },
  {
    id: 'ignore-marker-added',
    severity: 'medium',
    category: 'tampering',
    title: 'anticheat-ignore marker added',
    hint: 'Ignore markers need a human decision. Leave them out of agent-written changes.',
    applies: (f) => f.newText !== null,
    check: (f) => netNewLines(f, IGNORE_MARKER),
  },
  {
    id: 'lint-suppressed',
    severity: 'low',
    category: 'bypassed-checks',
    title: 'Linter silenced',
    hint: 'Fix the lint error, or justify the suppression in a comment.',
    applies: (f) => f.kind.code,
    check: (f) => netNewLines(f, LINT_SUPPRESSED),
  },
  {
    id: 'any-cast',
    severity: 'low',
    category: 'bypassed-checks',
    title: 'Type escape hatch (as any)',
    hint: 'Give the value a real type.',
    applies: (f) => f.kind.ts,
    check: (f) => netNewLines(f, ANY_CAST, { codeOnly: true }),
  },
];
