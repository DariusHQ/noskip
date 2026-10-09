// When the user explicitly asked for a change, it is not cheating. These patterns are
// deliberately narrow: "fix the failing test" must NOT excuse changing the test's expectations.

const NEAR = String.raw`[^.?!\n]{0,40}?`;
const TESTS = String.raw`\b(?:tests?|specs?|test cases?|test suite|it\s*\(|describe)\b`;

const INTENTS = [
  {
    rules: ['skip-added', 'only-added'],
    re: new RegExp(String.raw`\b(?:skip|skipping|disable|disabling|xfail|quarantine|focus|only run)\b${NEAR}${TESTS}|${TESTS}${NEAR}\b(?:skip|skipped|disable|disabled|xfail|quarantine)`, 'i'),
  },
  {
    rules: ['test-removed', 'test-file-deleted', 'test-replaced', 'assertions-removed'],
    re: new RegExp(
      String.raw`\b(?:remove|removing|delete|deleting|drop|dropping|get rid of|rewrite|rewriting|restructure|reorganize|refactor|refactoring|consolidate|merge|split|replace|replacing)\b${NEAR}(?:${TESTS}|\bassertions?\b)`,
      'i',
    ),
  },
  {
    rules: ['expected-changed', 'matcher-weakened', 'snapshot-changed'],
    re: new RegExp(
      String.raw`\b(?:update|updating|regenerate|regenerating|refresh|accept)\b${NEAR}\b(?:snapshots?|golden(?: files?)?|expected (?:values?|outputs?|results?)|expectations?|assertions?)\b|\b(?:tests?|assertions?|expectations?|snapshots?)\s+(?:is|are)\s+(?:wrong|outdated|incorrect|stale|out of date)\b`,
      'i',
    ),
  },
  { rules: ['type-suppressed', 'lint-suppressed', 'any-cast'], re: /\b(?:ts-ignore|ts-expect-error|ts-nocheck|eslint-disable|noqa|type:\s*ignore|nolint|suppress|silence)\b/i },
  { rules: ['ci-ignore-failure', 'test-run-narrowed'], re: /\b(?:continue-on-error|allow[_ ]failure|non-blocking|optional (?:step|job|check)|don'?t fail the build)\b/i },
  { rules: ['coverage-lowered'], re: /\b(?:lower|reduce|decrease|relax)\b[^.?!\n]{0,40}?\bcoverage\b/i },
  { rules: ['strictness-reduced'], re: /\b(?:disable|turn off|relax|loosen)\b[^.?!\n]{0,40}?\b(?:strict\w*|rule|lint|type ?check\w*|mypy|pyright|eslint)\b/i },
  { rules: ['no-verify'], re: /--no-verify|\bskip (?:the )?(?:git )?hooks\b|\bno-verify\b/i },
  { rules: ['guard-tampered', 'ignore-marker-added'], re: /\banti-?cheat\b/i },
  { rules: ['error-swallowed'], re: /\b(?:ignore|swallow|suppress)\b[^.?!\n]{0,30}?\b(?:errors?|exceptions?)\b/i },
];

/** Rule ids the prompt explicitly asks for. */
export function requestedRules(prompt) {
  const out = new Set();
  if (!prompt) return out;
  for (const { rules, re } of INTENTS) if (re.test(prompt)) rules.forEach((r) => out.add(r));
  return out;
}

/** Downgrade high findings the user asked for, so they are reported but never block. */
export function applyIntent(findings, prompt) {
  const requested = requestedRules(prompt);
  if (!requested.size) return findings;
  return findings.map((f) =>
    requested.has(f.rule) && f.severity === 'high' ? { ...f, severity: 'medium', requested: true } : requested.has(f.rule) ? { ...f, requested: true } : f,
  );
}
