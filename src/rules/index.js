import { configRules } from './config.js';
import { patternRules } from './patterns.js';
import { sourceRules } from './source.js';
import { testRules } from './tests.js';

export { analyzeTests } from './tests.js';

export const CATEGORIES = {
  'disabled-tests': 'Tests that stopped running',
  'weakened-tests': 'Tests that stopped checking',
  'gamed-code': 'Code that games the tests',
  'bypassed-checks': 'Checks switched off',
  tampering: 'Tampering with the referee',
};

const ORDER = [
  'skip-added',
  'only-added',
  'test-file-deleted',
  'test-removed',
  'test-run-narrowed',
  'tautology-added',
  'assertions-removed',
  'matcher-weakened',
  'assertion-in-try',
  'hardcoded-answer',
  'test-env-check',
  'equality-override',
  'ci-ignore-failure',
  'coverage-lowered',
  'no-verify',
  'guard-tampered',
  'expected-changed',
  'test-data-removed',
  'test-replaced',
  'mocked-subject',
  'input-special-cased',
  'error-swallowed',
  'type-suppressed',
  'strictness-reduced',
  'ignore-marker-added',
  'snapshot-changed',
  'lint-suppressed',
  'any-cast',
];

const all = [...patternRules, ...testRules, ...sourceRules, ...configRules];

export const RULES = ORDER.map((id) => {
  const rule = all.find((r) => r.id === id);
  if (!rule) throw new Error(`rule ${id} is not defined`);
  return rule;
});

if (RULES.length !== all.length) throw new Error('every rule must be listed in ORDER');

export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]));
