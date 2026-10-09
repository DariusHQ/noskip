import path from 'node:path';

const EXT_LANG = {
  '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js',
  '.ts': 'js', '.tsx': 'js', '.mts': 'js', '.cts': 'js',
  '.vue': 'js', '.svelte': 'js', '.astro': 'js',
  '.py': 'py', '.pyi': 'py',
  '.go': 'go',
  '.rs': 'rs',
  '.java': 'java', '.kt': 'java', '.kts': 'java', '.groovy': 'java', '.scala': 'java',
  '.cs': 'cs',
  '.rb': 'rb',
  '.php': 'php',
  '.swift': 'swift',
  '.dart': 'dart',
  '.c': 'c', '.cc': 'c', '.cpp': 'c', '.cxx': 'c', '.h': 'c', '.hh': 'c', '.hpp': 'c', '.hxx': 'c',
  '.ex': 'ex', '.exs': 'ex',
};

const TS_EXT = new Set(['.ts', '.tsx', '.mts', '.cts']);

const TEST_PATH = [
  /(^|\/)(__tests__|__test__|tests?|specs?|testing|e2e|cypress|playwright|integration[-_]?tests?|unit[-_]?tests?|test[-_]?suite)\//i,
  /\.(test|spec|e2e|cy|it|unit|integration)\.[cm]?[jt]sx?$/i,
  /\.(test|spec)\.(vue|svelte)$/i,
  /(^|\/)test_[^/]+\.py$/,
  /_tests?\.py$/,
  /(^|\/)conftest\.py$/,
  /_test\.go$/,
  /(Test|Tests|IT|Spec|TestCase)\.(java|kt|kts|groovy|scala)$/,
  /Tests?\.cs$/,
  /_(spec|test)\.rb$/,
  /(^|\/)test_[^/]+\.rb$/,
  /Test\.php$/,
  /(Tests?|Spec)\.swift$/,
  /_test\.dart$/,
  /(^|\/)test_[^/]+\.(c|cc|cpp)$/,
  /_(test|unittest|tests)\.(c|cc|cpp)$/,
  /_test\.exs$/,
];

const SNAPSHOT_PATH = [
  /(^|\/)__snapshots__\//,
  /\.snap(\.new)?$/,
  /(^|\/)(golden|goldens|__golden__|snapshots)\//,
  /\.golden(\.\w+)?$/,
  /\.(approved|received)\.\w+$/,
  /(^|\/)testdata\/.+\.(golden|expected|out|want)$/,
];

const CI_PATH = [
  /^\.github\/workflows\/[^/]+\.ya?ml$/,
  /^\.github\/actions\/.+\/action\.ya?ml$/,
  /(^|\/)\.gitlab-ci\.ya?ml$/,
  /^\.gitlab\/ci\//,
  /^\.circleci\//,
  /(^|\/)azure-pipelines\.ya?ml$/,
  /(^|\/)Jenkinsfile$/,
  /(^|\/)bitbucket-pipelines\.ya?ml$/,
  /^\.buildkite\//,
  /(^|\/)\.travis\.ya?ml$/,
  /(^|\/)\.drone\.ya?ml$/,
  /^\.woodpecker(\.ya?ml|\/)/,
  /(^|\/)appveyor\.ya?ml$/,
  /(^|\/)cloudbuild\.ya?ml$/,
];

const SCRIPT_NAMES = /(^|\/)(Makefile|makefile|GNUmakefile|justfile|Justfile|\.justfile|Taskfile\.ya?ml|tox\.ini|noxfile\.py|lefthook\.ya?ml|\.lefthook\.ya?ml|\.pre-commit-config\.ya?ml|Rakefile|build\.gradle(\.kts)?|pom\.xml|Cargo\.toml|composer\.json|deno\.jsonc?|turbo\.json|nx\.json|project\.json|package\.json|pyproject\.toml|setup\.cfg|pytest\.ini|Dockerfile|Earthfile)$/;

const CONFIG_NAMES = /(^|\/)(tsconfig[^/]*\.json|jsconfig\.json|\.eslintrc(\.\w+)?|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.oxlintrc\.json|mypy\.ini|\.mypy\.ini|pyproject\.toml|setup\.cfg|ruff\.toml|\.ruff\.toml|pyrightconfig\.json|\.golangci\.ya?ml|\.golangci\.toml|clippy\.toml|\.clippy\.toml|[^/]+\.csproj|Directory\.Build\.props|phpstan\.neon(\.dist)?|psalm\.xml(\.dist)?|\.rubocop\.ya?ml|\.swiftlint\.ya?ml|analysis_options\.yaml|(jest|vitest|vite|karma|playwright|cypress)\.config\.[cm]?[jt]s|jest\.config\.json|\.nycrc(\.\w+)?|\.c8rc(\.\w+)?|codecov\.ya?ml|\.codecov\.ya?ml|\.coveragerc|sonar-project\.properties|package\.json|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|phpunit\.xml(\.dist)?|\.mocharc(\.\w+)?|tox\.ini|pytest\.ini|conftest\.py|\.pre-commit-config\.ya?ml|deno\.jsonc?)$/;

const GUARD_PATH = /(^|\/)(\.anticheat\.json|\.claude\/settings(\.local)?\.json|\.codex\/hooks\.json|\.codex\/config\.toml|\.gemini\/settings\.json|\.cursor\/hooks\.json|\.husky\/[^/]+|\.pre-commit-config\.ya?ml|\.?lefthook\.ya?ml)$/;

const VENDORED = [
  /(^|\/)(node_modules|vendor|deps|bower_components|jspm_packages|third[_-]?party|external|extern|Pods|Carthage|\.venv|venv|\.tox|\.nox|__pycache__|\.mypy_cache|\.pytest_cache|\.next|\.nuxt|\.svelte-kit|\.output|\.turbo|\.vercel|dist|build|out|target|coverage|\.gradle|\.dart_tool|\.git)\//,
  /\.min\.(js|css)$/,
  /\.(map|lock|lockb)$/,
  /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|uv\.lock|Pipfile\.lock|Gemfile\.lock|composer\.lock|go\.sum|packages\.lock\.json|pubspec\.lock|mix\.lock|flake\.lock|Package\.resolved)$/,
  /(^|\/)[^/]*\.generated\.[^/]+$/,
  /(^|\/)[^/]*_pb2(_grpc)?\.py$/,
  /\.pb\.go$/,
];

export function languageOf(p) {
  return EXT_LANG[path.posix.extname(p).toLowerCase()] ?? null;
}

export function isTypeScript(p) {
  return TS_EXT.has(path.posix.extname(p).toLowerCase());
}

export function isVendored(p) {
  return VENDORED.some((re) => re.test(p));
}

export function isSnapshotPath(p) {
  return SNAPSHOT_PATH.some((re) => re.test(p));
}

export function isTestPath(p, extra = []) {
  if (isSnapshotPath(p)) return false;
  return TEST_PATH.some((re) => re.test(p)) || extra.some((re) => re.test(p));
}

export function isCIPath(p) {
  return CI_PATH.some((re) => re.test(p));
}

export function isScriptPath(p) {
  return (
    isCIPath(p) ||
    SCRIPT_NAMES.test(p) ||
    /^\.husky\//.test(p) ||
    /\.(sh|bash|zsh|ps1|psm1|cmd|bat)$/i.test(p) ||
    /(^|\/)(scripts?|bin|ci|tools)\/[^/]+$/.test(p)
  );
}

export function isConfigPath(p) {
  return CONFIG_NAMES.test(p);
}

export function isGuardPath(p) {
  return GUARD_PATH.test(p) || isCIPath(p);
}

/** Files that configure tests or the environment, where test-awareness is expected. */
export function isTestSupportPath(p) {
  return (
    /(^|\/)(config|configs|settings|setup|scripts|tools|fixtures?|mocks?|__mocks__|__fixtures__|testing|test[-_]?utils?|test[-_]?helpers?|support|stubs?|fakes?)\//i.test(p) ||
    /(^|\/)[^/]*\.(config|conf|setup)\.[cm]?[jt]s$/i.test(p) ||
    /(^|\/)(setupTests|jest\.setup|vitest\.setup|test-setup|testSetup|conftest|settings|manage|wsgi|asgi)\.[a-z]+$/i.test(p) ||
    /(^|\/)(settings|config)[^/]*\.py$/i.test(p)
  );
}

/** Classify a changed path. */
export function classify(p, { extraTestPatterns = [] } = {}) {
  const lang = languageOf(p);
  const snapshot = isSnapshotPath(p);
  const test = !snapshot && isTestPath(p, extraTestPatterns);
  return {
    lang,
    ts: isTypeScript(p),
    test,
    snapshot,
    ci: isCIPath(p),
    script: isScriptPath(p),
    config: isConfigPath(p),
    guard: isGuardPath(p),
    vendored: isVendored(p),
    code: lang !== null,
    // Production code: a code file that is neither a test nor test/build support.
    source: lang !== null && !test && !snapshot && !isTestSupportPath(p) && !isScriptPath(p),
  };
}

/** "src/cart.test.ts" -> "cart", "tests/test_cart.py" -> "cart", "CartTest.java" -> "Cart". */
export function testStem(p) {
  const base = path.posix.basename(p);
  return base
    .replace(/\.(test|spec|e2e|cy|it|unit|integration)\.[^.]+$/i, '')
    .replace(/^test_/, '')
    .replace(/_(test|tests|spec|unittest)\.[^.]+$/i, '')
    .replace(/(Tests?|IT|Spec|TestCase)\.[^.]+$/, '')
    .replace(/\.[^.]+$/, '');
}

export function sourceStem(p) {
  const base = path.posix.basename(p).replace(/\.[^.]+$/, '');
  if (base === 'index' || base === '__init__' || base === 'mod' || base === 'lib' || base === 'main') {
    const dir = path.posix.basename(path.posix.dirname(p));
    return dir && dir !== '.' ? dir : base;
  }
  return base;
}
