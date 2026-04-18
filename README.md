# nirapod-audit

A deterministic, zero-AI code auditor for Nirapod firmware. Parses C/C++ with tree-sitter, runs 55 rules across 6 categories, and streams structured diagnostics to a live TUI or CI pipeline.

No language models. No heuristics. Every finding is a concrete, reproducible violation with a source span, a reason, and a fix suggestion.

---

## What it checks

| Category | Rules | What it covers |
|---|---|---|
| `LICENSE` | 4 | SPDX identifiers, copyright headers, block order |
| `DOXYGEN` | 22 | `@file`, `@brief`, `@param`, `@return`, `@ingroup`, struct field docs |
| `NASA` | 12 | No goto, bounded loops, no post-init alloc, function length, return checks |
| `CRYPTO` | 9 | No memset for zeroization, no key in logs, IV reuse, CC312 direct register access |
| `MEMORY` | 4 | Bounds checks, null checks, size_t overflow guards |
| `STYLE` | 4 | Banned words in doc comments, em-dash, plain enum, generic `@brief` |

Full rule catalog: [`docs/RULES.md`](docs/RULES.md)

---

## Install

Requires [Bun](https://bun.sh) >= 1.1.0.

```bash
git clone https://github.com/nirapod/nirapod-audit
cd nirapod-audit
bun install
```

No global install needed. All commands run through `bun run`.

---

## Usage

```bash
# Audit a directory (recursive, all .h .hpp .c .cpp .cc)
bun run audit firmware/src

# Audit a single file
bun run audit firmware/src/crypto/aes_driver.cpp

# Live TUI with progress bar
bun run audit firmware/src --output tui

# SARIF for GitHub Code Scanning
bun run audit firmware/src --output sarif > audit.sarif

# Machine-readable NDJSON (pipe to jq, scripts, etc.)
bun run audit firmware/src --output json | jq .

# List all rules
bun run audit rules

# Explain a specific rule
bun run audit explain NRP-NASA-006
```

### Output formats

`report` (default) prints a full coloured summary: categories, top violations, per-file breakdown. Good for local dev.

`tui` renders a live progress bar and streams diagnostics as they're found. Same look as running tests with Bun.

`json` emits newline-delimited JSON, one event per line. Every `audit_start`, `diagnostic`, `file_done`, and `audit_done` event comes through in real time.

`sarif` emits SARIF 2.1.0 as a single JSON document. Drop it into GitHub Actions and violations appear inline in the PR diff.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No errors, no warnings |
| `1` | One or more `error`-level violations |
| `2` | Bad arguments or config parse error |
| `3` | Internal error (tree-sitter parse failure, unreadable file) |

---

## Configuration

Drop a `nirapod-audit.toml` in your project root. The tool discovers it automatically.

```toml
[audit]
platform = "nrf5340"        # nrf52840 | nrf5340 | esp32 | multi | auto
max_function_lines = 60     # NASA Rule 4
min_assertions = 2          # NASA Rule 5

[ignore]
paths = [
  "third_party/**",
  "nordic_sdk/**",
  "build/**",
]

[rules.overrides]
"NRP-STYLE-001" = "info"   # downgrade to info
"NRP-DOX-018" = "ignore"   # suppress entirely
```

See [`nirapod-audit.toml.example`](nirapod-audit.toml.example) for every available option.

---

## Incremental mode

File hashes (SHA-256) are cached in `.nirapod/audit/cache.json`. Unchanged files are skipped on subsequent runs, so auditing a large codebase after a small change is fast.

Delete the cache file to force a full re-audit:

```bash
rm -rf .nirapod/audit/
```

---

## Diagnostic format

Diagnostics mirror rustc's output format. Every finding has a rule ID, severity, exact source location, a specific message, optional notes, and a concrete fix suggestion.

```
error[NRP-NASA-006]: function 'encryptGcm' is 87 lines; limit is 60
  --> src/crypto/aes_driver.cpp:142:1
   |
142|   NirapodError AesDriver::encryptGcm(AesContext* ctx, ...) {
   |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: NASA JPL Rule 4: no function body exceeds 60 lines
   = note: counted 87 lines (142 to 228), excluding blank and comment lines
   = help: split at the backend-dispatch boundary around line 191 into
           encryptGcm() for dispatch and buildAesGcmContext() for setup

warning[NRP-CRYPTO-001]: memset() used to clear crypto buffer 'key_buf'
  --> src/crypto/aes_driver.cpp:220:5
   |
220|     memset(key_buf, 0, sizeof(key_buf));
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: memset() may be optimized away — the buffer goes out of scope immediately
   = help: replace with mbedtls_platform_zeroize(key_buf, sizeof(key_buf));
```

---

## Project structure

```
nirapod-audit/
├── packages/
│   ├── protocol/          shared types — AuditEvent, Diagnostic, Rule, Span, AuditConfig
│   └── core/              analysis engine — tree-sitter parser, 6 passes, 55 rules, pipeline
│       └── src/
│           ├── passes/    lex-pass, ast-pass, nasa-pass, crypto-pass, memory-pass
│           ├── rules/     one file per rule category, all rule descriptors
│           ├── parser/    tree-sitter setup, S-expression queries (.scm files)
│           ├── cfg/       control-flow graph builder for CryptoZeroPass
│           └── pipeline/  orchestrator, pass interface, file discovery
├── apps/
│   └── cli/               Ink TUI, commands (audit, rules, explain), output formatters
│       └── src/
│           ├── commands/  audit.tsx, rules.ts, explain.ts
│           ├── components/  DiagnosticItem, ProgressBar, Summary, Header
│           └── output/    agent.ts (json), sarif.ts, report.ts
├── tests/
│   ├── fixtures/compliant/    C/C++ files that must produce zero findings
│   └── violations/            C/C++ files with deliberate violations, one per rule
└── docs/
    ├── RULES.md               auto-generated rule catalog (bun run scripts/generate-rules-doc.ts)
    └── PLAN.md                architecture decisions and implementation plan
```

---

## Development

```bash
# Install dependencies
bun install

# Type-check all packages
bun run check

# Run tests
bun test

# Watch mode (re-runs on save)
bun --watch run apps/cli/src/index.tsx audit tests/fixtures/compliant/

# Regenerate docs/RULES.md after changing rule descriptors
bun run scripts/generate-rules-doc.ts
```

### Adding a rule

1. Add the rule descriptor to the appropriate `packages/core/src/rules/<category>/rules.ts` file.
2. Add the check logic inside the corresponding pass (`packages/core/src/passes/<category>-pass.ts`).
3. Add a fixture file to `tests/violations/NRP-<ID>-<title>.h` that triggers the rule.
4. Add a passing fixture to `tests/fixtures/compliant/` if needed.
5. Run `bun run scripts/generate-rules-doc.ts` to regenerate `docs/RULES.md`.
6. Run `bun test` to confirm the new fixture is caught.

### Commit messages

This repo uses a small conventional-commit style lint rule for commit subjects.

Expected format:

```text
type(scope): subject
```

Allowed types:

```text
feat fix docs refactor test chore ci build perf revert
```

Examples:

```text
feat(rust): bootstrap workspace
feat(rust): port config loading
chore(repo): add commit message linting
```

Install the local hook once per clone:

```bash
git config core.hooksPath .githooks
```

You can also run the check manually:

```bash
printf 'feat(rust): bootstrap workspace\n' > /tmp/commit-msg.txt
bun run commitlint /tmp/commit-msg.txt
```

---

## CI

The CI pipeline runs on every push to `main` and `develop` and on every pull request to `main`.

```
typecheck   tsc --noEmit on core and cli
test        bun test (all fixtures)
audit-self  audit tests/fixtures/compliant/ (must exit 0)
            audit tests/violations/ → upload SARIF to GitHub
```

The self-audit step on violation fixtures uploads findings to GitHub Code Scanning so they appear inline in the repository's Security tab.

---

## Rust migration path

The core analysis engine (`packages/core`) is deliberately isolated behind a `CoreRunner` interface. The CLI never imports core directly — it consumes an `AsyncIterable<AuditEvent>` stream.

If the core ever needs to be rewritten in Rust for performance, the Rust binary just needs to emit the same NDJSON events to stdout. The CLI switches from `TsRunner` to `BinaryRunner` in one line. Nothing else changes.

---

## License

Apache 2.0. See [LICENSE](LICENSE).
