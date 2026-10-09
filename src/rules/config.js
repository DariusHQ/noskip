// Rules over CI, scripts and tool config: making the checks themselves stop checking.
import path from 'node:path';
import { netNewLines, netNewLinesWhere } from './helpers.js';
import { oldToNewLine } from './tests.js';
import { normalizeLine, testRegex, truncate } from '../util.js';

/** A command that runs tests, linters or type checkers. */
const CHECK_COMMAND = new RegExp(
  [
    String.raw`\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|lint|check|typecheck|type-check|verify|ci)(?![\w-])`,
    String.raw`\b(?:npx|pnpx|bunx)\s+(?:-y\s+)?(?:jest|vitest|mocha|eslint|tsc|biome|playwright|cypress|ava)\b`,
    String.raw`(?:^|[\s"'/=])(?:jest|vitest|mocha|ava|eslint|tsc|biome|oxlint|mypy|pyright|ruff|flake8|pylint|rubocop|phpstan|psalm|golangci-lint|ctest|pytest|tox|nox|rspec|phpunit|pest|karma|playwright|cypress)(?=$|[\s"';&|)])`,
    String.raw`\bgo\s+(?:test|vet)\b`,
    String.raw`\bcargo\s+(?:test|nextest|clippy|check)\b`,
    String.raw`\bdotnet\s+test\b`,
    String.raw`\bmvnw?\s[^\n]*\b(?:test|verify|install|package)\b`,
    String.raw`\bgradlew?\s[^\n]*\b(?:test|check|build)\b`,
    String.raw`\bmake\s+(?:test|check|lint|ci)\b`,
    String.raw`\bswift\s+test\b`,
    String.raw`\b(?:flutter|dart)\s+(?:test|analyze)\b`,
    String.raw`\bmix\s+(?:test|credo|dialyzer)\b`,
    String.raw`\bpython3?\s+-m\s+(?:pytest|unittest|mypy|ruff|flake8|pylint)\b`,
    String.raw`\b(?:bundle\s+exec\s+)?rake\s+test\b`,
    String.raw`\bxcodebuild\b[^\n]*\btest\b`,
  ].join('|'),
);

const segmentsOf = (line) => line.split(/;|&&|\|\||\|/);

/** `npm test || true`, `pytest; exit 0`: a check whose failure is thrown away. */
const MASK = /\|\|\s*(?:true\b|exit\s+0\b|:(?=\s*(?:$|[;&|)'"]))|echo\b)|;\s*exit\s+0\b/;
function masksCheck(line) {
  const m = MASK.exec(line);
  if (!m) return false;
  const seg = segmentsOf(line.slice(0, m.index))
    .pop()
    .replace(/^\s*(?:-\s+)?(?:run:\s*)?(?:"[\w:.-]+"\s*:\s*)?["']?/, '')
    .trim();
  if (!seg || /^(?:\[|test\s|!|if\b)/.test(seg)) return false; // `[ -f x ] || exit 0` is a guard, not a mask
  return CHECK_COMMAND.test(seg);
}

/** Flags that make a check pass no matter what. */
const ALWAYS_PASS = [
  /--passWithNoTests\b/,
  /--pass-with-no-tests\b/,
  /--exit-zero\b/,
  /--no-fail-on-error\b/,
  /-DtestFailureIgnore=true\b/,
  /<testFailureIgnore>\s*true/,
  /\bignoreFailures\s*(?:=|:)\s*true\b/,
];

const CI_SOFT_FAIL = /^\s*(?:continue-on-error|allow_failure|continueOnError|soft_fail)\s*:\s*(?:true|\$\{\{\s*true\s*\}\})\s*(?:#.*)?$/;

/** The YAML block (step or job) that owns lines[idx]. */
function owningBlock(lines, idx) {
  const indent = (s) => s.length - s.trimStart().length;
  const own = indent(lines[idx]);
  let start = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (lines[i].trim() && indent(lines[i]) < own) {
      start = i;
      break;
    }
  }
  const ownerIndent = indent(lines[start]);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() && indent(lines[i]) <= ownerIndent) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

const softFailsCheck = (text, i, lines) => CI_SOFT_FAIL.test(text) && CHECK_COMMAND.test(owningBlock(lines, i));

const NOOP_SCRIPT = /"(?:test|test:[\w:.-]+|check|ci|verify|lint|typecheck|type-check)"\s*:\s*"\s*(?:echo\b[^"]*|exit 0|true|:)\s*"/;

const NARROW_FLAGS = [
  /--testPathIgnorePatterns\b/,
  /--testNamePattern\b/,
  /--test-name-pattern\b/,
  /--exclude(?:=|\s)/,
  /--ignore(?:-glob)?(?:=|\s)/,
  /--deselect\b/,
  /\s-k\s+["']?not\s/,
  /\s-m\s+["']?not\s/,
  /--skip(?:=|\s)/,
  /\s-skip\s/,
  /--grep-invert\b/,
  /--invert\b/,
  /\s-x\s+test\b/,
  /-DskipTests\b/,
  /-Dmaven\.test\.skip=true\b/,
  /--filter\s+["']?[\w.]+!=/,
  /--onlyChanged\b/,
  /--changedSince\b/,
];

/** A narrowing flag on the same command as a check, e.g. `jest --testPathIgnorePatterns e2e`. */
const narrowsCheck = (text) => segmentsOf(text).some((seg) => CHECK_COMMAND.test(seg) && NARROW_FLAGS.some((re) => re.test(seg)));

const SCRIPT_KEY = /^\s*"([^"]+)"\s*:\s*"/;

/** package.json: only flag existing scripts that gained a narrowing flag, not brand-new scripts. */
function narrowedScripts(f) {
  const before = new Map();
  for (const r of f.removed) {
    const m = SCRIPT_KEY.exec(r.text);
    if (m) before.set(m[1], r.text);
  }
  const out = [];
  for (const a of f.added) {
    const m = SCRIPT_KEY.exec(a.text);
    if (!m || !before.has(m[1])) continue;
    if (narrowsCheck(a.text) && !narrowsCheck(before.get(m[1]))) out.push({ line: a.line, snippet: truncate(a.text) });
  }
  return out;
}

const NARROW_CONFIG = [
  /\btestPathIgnorePatterns\b/,
  /\bcollect_ignore(?:_glob)?\s*(?:\+?=)/,
  /\bnorecursedirs\b/,
  /^\s*addopts\s*=.*(?:--ignore|--deselect|\s-k\s|-m\s+["']?not)/,
  /^\s*test\s*=\s*false\b/,
  /^\s*doctest\s*=\s*false\b/,
  /<skipTests>\s*true/,
  /<maven\.test\.skip>\s*true/,
  /\bexclude\s*:\s*\[[^\]]*(?:test|spec)/i,
  /<exclude>[^<]*(?:test|Test)/,
  /\btest\s*\{\s*enabled\s*=\s*false/,
  /\bwithType\s*\(\s*Test\b[^)]*\)\s*\{[^}]*enabled\s*=\s*false/,
];

const TEST_INVOCATION =
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b|\bnpx\s+(?:jest|vitest|mocha|playwright\s+test)\b|\b(?:jest|vitest|mocha)\b(?![.\w-])|\bpytest\b|\bpython3?\s+-m\s+(?:pytest|unittest)\b|\btox\b(?![.\w-])|\bnox\b(?![.\w-])|\bgo\s+test\b|\bcargo\s+(?:test|nextest)\b|\bmvnw?\b[^\n]*\b(?:test|verify|install)\b|\bgradlew?\b[^\n]*\b(?:test|check|build)\b|\bdotnet\s+test\b|\b(?:rspec|rake\s+test)\b|\bphpunit\b|\bvendor\/bin\/pest\b|\bswift\s+test\b|\bflutter\s+test\b|\bdart\s+test\b|\bmix\s+test\b|\bmake\s+(?:test|check)\b|\bctest\b/;

const COVERAGE_FILE = /(?:^|\/)(?:(?:jest|vitest|vite|karma)\.config\.[cm]?[jt]s|jest\.config\.json|package\.json|\.nycrc(?:\.\w+)?|\.c8rc(?:\.\w+)?|\.?codecov\.ya?ml|\.coveragerc|pyproject\.toml|setup\.cfg|tox\.ini|pytest\.ini|sonar-project\.properties|pom\.xml|build\.gradle(?:\.kts)?|Makefile|\.mocharc(?:\.\w+)?|\.gitlab-ci\.ya?ml)$|^\.github\/workflows\//;

const COV_KEY =
  /\b(fail[_-]?under|cov-fail-under|coverageThreshold|coverage_threshold|minimum_coverage|min_coverage|minimumCoverage|branches|functions|lines|statements|threshold|thresholds|target|minimum|coveredratio)\b["']?\s*[:=>]?\s*["']?(\d+(?:\.\d+)?)/i;
const STRONG_COV_KEY = /^(fail[_-]?under|cov-fail-under|coverage_threshold|minimum_coverage|min_coverage|minimumCoverage)$/i;

const STRICT_OFF = {
  tsconfig: [
    /"(?:strict|noImplicitAny|strictNullChecks|strictFunctionTypes|strictBindCallApply|strictPropertyInitialization|noImplicitReturns|noImplicitThis|alwaysStrict|noUncheckedIndexedAccess|exactOptionalPropertyTypes|useUnknownInCatchVariables|noFallthroughCasesInSwitch)"\s*:\s*false/,
  ],
  python: [
    /^\s*(?:ignore_errors|allow_untyped_defs|allow_untyped_calls|allow_incomplete_defs|allow_untyped_globals|allow_redefinition)\s*=\s*[Tt]rue\b/,
    /^\s*(?:strict|disallow_[a-z_]+|warn_[a-z_]+|check_untyped_defs|strict_optional|strict_equality)\s*=\s*[Ff]alse\b/,
    /"?typeCheckingMode"?\s*[:=]\s*["'](?:off|basic)["']/,
  ],
  eslint: [/^\s*["']?[@\w/-]+["']?\s*:\s*(?:["']off["']|0|\[\s*["']off["']|\[\s*0\b)/, /"recommended"\s*:\s*false/],
  dotnet: [/<Nullable>\s*disable\s*<\/Nullable>/, /<TreatWarningsAsErrors>\s*false\s*</, /<WarningLevel>\s*0\s*</],
  cargo: [/^\s*[\w:-]+\s*=\s*["']allow["']/, /^\s*[\w:-]+\s*=\s*\{\s*level\s*=\s*["']allow["']/],
  rubocop: [/^\s*Enabled:\s*false\b/],
  golangci: [/\bdisable-all:\s*true\b/],
};

function strictGroup(p) {
  const base = path.posix.basename(p);
  if (/^[tj]sconfig[^/]*\.json$/.test(base)) return 'tsconfig';
  if (/^(mypy\.ini|\.mypy\.ini|pyproject\.toml|setup\.cfg|pyrightconfig\.json)$/.test(base)) return 'python';
  if (/^(\.eslintrc(\.\w+)?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.oxlintrc\.json)$/.test(base)) return 'eslint';
  if (/\.csproj$|^Directory\.Build\.props$/.test(base)) return 'dotnet';
  if (/^(Cargo\.toml|clippy\.toml|\.clippy\.toml)$/.test(base)) return 'cargo';
  if (/^\.rubocop\.ya?ml$/.test(base)) return 'rubocop';
  if (/^\.golangci\.(ya?ml|toml)$/.test(base)) return 'golangci';
  return null;
}

function removedNotReadded(file, predicate) {
  const added = new Set(file.added.map((a) => normalizeLine(a.text)));
  return file.removed.filter((r) => predicate(r.text) && !added.has(normalizeLine(r.text)));
}

export const configRules = [
  {
    id: 'ci-ignore-failure',
    severity: 'high',
    category: 'bypassed-checks',
    title: 'Failing checks made to look green',
    hint: 'Let the step fail and fix the cause.',
    applies: (f) => f.newText !== null && (f.kind.ci || f.kind.script),
    check(f) {
      const hits = [
        ...netNewLinesWhere(f, masksCheck),
        ...netNewLines(f, /(^|\/)package\.json$/.test(f.path) ? [...ALWAYS_PASS, NOOP_SCRIPT] : ALWAYS_PASS),
      ];
      if (f.kind.ci) hits.push(...netNewLinesWhere(f, softFailsCheck));
      const seen = new Set();
      return hits.filter((h) => !seen.has(h.line) && seen.add(h.line)).sort((a, b) => a.line - b.line);
    },
  },
  {
    id: 'test-run-narrowed',
    severity: 'high',
    category: 'disabled-tests',
    title: 'Test run narrowed so some tests no longer run',
    hint: 'Run the whole suite; fix the tests you were about to exclude.',
    applies: (f) => f.kind.ci || f.kind.script || f.kind.config,
    check(f) {
      const hits = /(^|\/)package\.json$/.test(f.path) ? narrowedScripts(f) : netNewLinesWhere(f, narrowsCheck);
      if (f.kind.config) hits.push(...netNewLines(f, NARROW_CONFIG));
      if (f.kind.ci) {
        for (const r of removedNotReadded(f, (t) => testRegex(TEST_INVOCATION, t))) {
          const before = (f.oldLines ?? []).filter((l) => testRegex(TEST_INVOCATION, l)).length;
          const after = (f.newLines ?? []).filter((l) => testRegex(TEST_INVOCATION, l)).length;
          if (after >= before) break;
          hits.push({ line: oldToNewLine(f, r.line), snippet: truncate(r.text), message: 'Test command removed from CI' });
          break;
        }
      }
      return hits;
    },
  },
  {
    id: 'coverage-lowered',
    severity: 'high',
    category: 'bypassed-checks',
    title: 'Coverage threshold lowered',
    hint: 'Add tests to meet the threshold instead of lowering it.',
    applies: (f) => COVERAGE_FILE.test(f.path) && /cov/i.test((f.newText ?? '') + (f.oldText ?? '')),
    check(f) {
      const out = [];
      for (const hunk of f.hunks) {
        const before = new Map();
        for (const r of hunk.removed) {
          const m = COV_KEY.exec(r.text);
          if (m) before.set(m[1].toLowerCase(), { value: Number(m[2]), line: r.line, text: r.text });
        }
        const seen = new Set();
        for (const a of hunk.added) {
          const m = COV_KEY.exec(a.text);
          if (!m) continue;
          const key = m[1].toLowerCase();
          const old = before.get(key);
          seen.add(key);
          if (old && Number(m[2]) < old.value) {
            out.push({ line: a.line, snippet: truncate(a.text), message: `Coverage threshold lowered: ${m[1]} ${old.value} → ${m[2]}` });
          }
        }
        for (const [key, old] of before) {
          if (seen.has(key) || !STRONG_COV_KEY.test(key)) continue;
          out.push({ line: oldToNewLine(f, old.line), snippet: truncate(old.text), message: `Coverage threshold removed (${key} ${old.value})` });
        }
      }
      return out;
    },
  },
  {
    id: 'strictness-reduced',
    severity: 'medium',
    category: 'bypassed-checks',
    title: 'Compiler or linter strictness turned down',
    hint: 'Keep the strict setting and fix the errors it reports.',
    applies: (f) => f.newText !== null && strictGroup(f.path) !== null,
    check: (f) => netNewLines(f, STRICT_OFF[strictGroup(f.path)]),
  },
  {
    id: 'guard-tampered',
    severity: 'high',
    category: 'tampering',
    title: 'Anti-cheat or git hook configuration weakened',
    hint: 'Changes to anticheat and git-hook config need a human. Revert them.',
    checkAll(ctx) {
      const out = [];
      for (const f of ctx.files) {
        const base = path.posix.basename(f.path);
        if (base === '.anticheat.json' && f.status !== 'A') {
          out.push({ file: f, line: f.hunks[0]?.newStart ?? 1, message: f.status === 'D' ? 'Deleted .anticheat.json' : 'Changed .anticheat.json' });
          continue;
        }
        if (!f.kind.guard) continue;
        const count = (lines) => (lines ?? []).filter((l) => /anticheat/i.test(l)).length;
        if (count(f.newLines) < count(f.oldLines)) {
          const gone = removedNotReadded(f, (t) => /anticheat/i.test(t))[0];
          out.push({
            file: f,
            line: gone ? oldToNewLine(f, gone.line) : 1,
            snippet: gone ? truncate(gone.text) : undefined,
            message: f.status === 'D' ? `Deleted ${f.path}, which ran anticheat` : `anticheat removed from ${f.path}`,
          });
        } else if (f.status === 'D' && /(^|\/)(\.husky\/[^/]+|\.pre-commit-config\.ya?ml|\.?lefthook\.ya?ml)$/.test(f.path)) {
          out.push({ file: f, line: 1, severity: 'medium', message: `Deleted git hook config ${f.path}` });
        }
      }
      return out;
    },
  },
];
