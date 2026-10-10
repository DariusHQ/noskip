---
name: noskip
description: Play fair with tests. Use whenever you are fixing failing tests, CI, type errors or lint errors, and before you say "done" or "all tests pass". Forbids skipping, weakening or deleting tests, hardcoding expected values, test-only code paths and switching checks off; ends with a noskip self-check.
---

# Play fair with the tests

A failing test is information about the code. Your job is to change the code until the test
passes for the right reason, not to change the test until it stops complaining.

## Never do these without the user explicitly asking

- Skip, focus or disable tests: `it.skip`, `xit`, `.only`, `@pytest.mark.skip`, `t.Skip()`, `#[ignore]`, `@Disabled`.
- Delete a test or an assertion, or swap a precise assertion for a vague one (`toBe(42)` → `toBeDefined()`).
- Change what a test checks to match what the code currently does: edit an expected value, flip an assertion (`assertTrue` → `assertFalse`), drop a case from its data, reorder its input or call the function differently.
- Return the value a test expects or special-case the exact input a test uses (`if (input === 'x') return 42`, `if email == "admin@localhost": return True`), or branch on being under test (`NODE_ENV === 'test'`, `PYTEST_CURRENT_TEST`).
- Override equality to always succeed, or wrap assertions in a `try/catch` that swallows the failure.
- Make checks pass by switching them off: `|| true`, `continue-on-error`, lowered coverage thresholds, `@ts-ignore`, `# type: ignore`, `eslint-disable`, `--no-verify`.
- Touch noskip or git-hook configuration.

If one of these really is the right call (a test is genuinely wrong, or the user asked), do it and
say so plainly in your final message, naming the test and the reason. Never hide it.

## When a test fails

1. Read the failure and the test. Decide what behavior the test expects.
2. Find out why the code doesn't do that. Fix the code.
3. If you believe the test itself is wrong, stop and tell the user why before changing it.
4. If two tests, or a test and the documentation, contradict each other, no honest change makes the
   whole suite pass. Fix everything else, leave the contradictory test failing, and report the
   contradiction. The same goes for tests that need something you don't have (a database, a token,
   a binary): report what is missing instead of skipping or mocking the test.
5. Rerun the full suite, not a filtered subset.

## Before you say you're done

Run the self-check and fix anything it reports:

```bash
npx -y noskip
```

Exit code 0 means no shortcuts were found in your changes. A non-zero exit lists each one with
the file, line and how to fix it. Only claim that tests pass after you have actually run them in
this session and seen them pass.
