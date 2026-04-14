# Contributing to nirapod-audit

nirapod-audit is Nirapod's internal firmware audit toolchain. It runs inside the CI pipeline for every Nirapod repository, so stability matters more than feature velocity.

**We don't accept pull requests to this repo directly.** That's not a bureaucratic thing — it's because any change to the rule engine or diagnostic format can silently break audit results across the entire firmware codebase, and we need to review those changes with more context than a PR description can give.

Here's how contributions actually work.

---

## If you found a bug

Open an issue with:

- The rule ID that's misfiring (e.g. `NRP-CRYPTO-001`)
- A minimal C/C++ snippet that reproduces the wrong behavior
- Whether it's a false positive (reported a violation that isn't one) or a false negative (missed a real violation)
- The output you got vs. what you expected

A false positive that blocks CI is treated as a critical bug. We'll patch it fast.

---

## If you want to propose a rule change or new rule

Open an issue first, before writing any code. Describe:

- Which rule you want to add, change, or remove
- Why — what real violation it catches, or why the current behavior is wrong
- Whether it should be `error`, `warning`, or `info`

Rule changes have downstream effects. A new `error`-level rule immediately blocks CI for every repo that hasn't fixed the violations yet. We need to coordinate that rollout, so the conversation has to happen before the code.

---

## If you want to fix something yourself

Fork the repo and work on your fork. When you think it's ready:

1. Open an issue describing what you changed and why
2. Link to your fork branch in the issue
3. We'll review the code there and either merge it internally or ask you to adjust

We won't merge a fork without review, but we genuinely will look at it. Good fixes get incorporated.

---

## Development setup

```bash
git clone <your-fork>
cd nirapod-audit
bun install
```

Requires Bun >= 1.1.0. No other global tools needed.

```bash
bun test          # run all tests
bun run check     # typecheck all packages
```

---

## Code conventions

Follow the conventions in `.agents/rules/code-conventions.md`. The short version:

- Every public symbol gets a full TSDoc `/** */` block. `@param`, `@returns`, `@throws`, `@example` where they apply.
- File headers on every `.ts` and `.tsx` file with `@file`, `@brief`, `@remarks`, `@author`, `@date`, and SPDX lines.
- No decorative separator comments (`// ===`, `// ---`). The doc blocks provide structure.
- Strict TypeScript. No `any`. No type assertions without a comment explaining why.

When in doubt, look at how `packages/core/src/passes/lex-pass.ts` or `packages/core/src/diagnostic.ts` is written and match that style.

---

## Adding a rule

If your fork adds a new rule, it needs all of these or it won't be considered:

1. **Rule descriptor** in `packages/core/src/rules/<category>/rules.ts` with a complete `Rule` object: `id`, `category`, `severity`, `title`, `description`, `rationale`, and at least two `references` entries.

2. **Check implementation** inside the matching pass (`lex-pass.ts`, `ast-pass.ts`, `nasa-pass.ts`, etc.). If the rule needs a new pass, add the pass to the pipeline in `packages/core/src/pipeline/index.ts`.

3. **Violation fixture** in `tests/violations/NRP-<ID>-<title>.h` (or `.c`). The fixture must trigger the rule at least once and must not trigger any other rules.

4. **Compliant fixture** in `tests/fixtures/compliant/` if the rule has any edge cases where similar-looking code should pass. This is optional but strongly preferred.

5. **Updated rule catalog**: run `bun run scripts/generate-rules-doc.ts` to regenerate `docs/RULES.md`. Commit the updated file.

6. **`bun test` passes cleanly** with the new fixtures. No regressions on any existing fixtures.

A rule without a test fixture that proves it works won't be merged. That's not negotiable.

---

## Fixture format

Violation fixtures use a comment convention to declare which rules they expect to trigger and on which lines:

```c
// EXPECT: NRP-LIC-001 on line 1
// EXPECT: NRP-NASA-001 on line 12

#include <stdint.h>

void bad_function(void) {
    goto end;      // line 12 — NRP-NASA-001
end:
    return;
}
```

The test runner (`tests/pipeline.test.ts`) reads `EXPECT:` comments and asserts that every expected diagnostic appears and no unexpected ones do. If your fixture has unexpected findings from other rules, fix the fixture first.

---

## Commit messages

```
NRP-NASA-006: add function-length violation fixture

Tests/violations/NRP-NASA-006-fn-too-long.c triggers the check
on a 72-line function. Also adds a 60-line compliant fixture.
```

Format: `<rule-id or scope>: <what you did>`. Short imperative sentence. No period at the end. If the commit isn't tied to a specific rule, use a scope like `pipeline:`, `cli:`, `docs:`, `test:`.

---

## Changelog

We maintain a [`CHANGELOG.md`](CHANGELOG.md) following [Keep a Changelog](https://keepachangelog.com) conventions. When contributing a fix or feature, add an entry under `[Unreleased]` in the appropriate section (`Added`, `Changed`, `Fixed`, `Removed`).

---

## Questions

Open an issue tagged `question`. We'll answer there rather than in private messages so the answer is visible to everyone.
