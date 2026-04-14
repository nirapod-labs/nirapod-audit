# Changelog

All notable changes to nirapod-audit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

Breaking changes that affect CI exit codes or diagnostic output are marked **[BREAKING]**.

---

## [Unreleased]

Nothing yet.

---

## [0.1.0] — 2026-04-14

First working release. The audit pipeline runs end-to-end, all 55 rules are implemented and tested against fixtures, and the CLI produces all four output formats.

### Added

**Core engine**

- `packages/protocol` — shared wire-protocol types: `Span`, `Rule`, `Diagnostic`, `AuditEvent`, `AuditConfig`, `FileResult`, `AuditSummary`. Zero runtime code; pure types.
- `packages/core` — analysis engine built on tree-sitter (C and C++ grammars).
  - `buildFileContext()` — parses a source file and auto-detects platform hint and file role.
  - `runPipeline()` — async generator that yields `AuditEvent` objects as files are analysed.
  - Incremental mode: SHA-256 file hashes cached in `.nirapod/audit/cache.json`. Unchanged files are skipped on re-runs.
  - S-expression query files for functions, structs, classes, enums, loops, macros, and call expressions.
  - Lightweight CFG builder for backward dataflow analysis (used by `NRP-CRYPTO-003`).

**Analysis passes (6 passes, 55 rules)**

- `LexPass` — raw-text checks before tree-sitter: SPDX identifiers, file header order, banned style words, em-dash detection. Rules: `NRP-LIC-001..004`, `NRP-STYLE-001..004`.
- `AstPass` — Doxygen structure validation via CST queries: file headers, class/struct/enum blocks, function parameter and return documentation, `@ingroup` cross-reference validation. Rules: `NRP-DOX-001..022`.
- `NasaPass` — NASA/JPL Power of 10 enforcement: no goto, no recursion, bounded loops, no post-init allocation, function length limit, minimum assertions, unchecked return values, no `#define` for constants or function-like macros. Rules: `NRP-NASA-001..012`.
- `CryptoPass` — platform-aware crypto safety: memset zeroization, key material in logs, crypto buffer zeroization on every exit path (CFG dataflow), flash buffer to nrf_crypto, ESP32 mutex, CC312 direct register access, IV reuse. Rules: `NRP-CRYPTO-001..009`.
- `MemoryPass` — memory safety: array bounds checks, pointer null checks, `size_t` overflow guards, unsafe casts. Rules: `NRP-MEM-001..004`.
- Rule overrides and `onlyCategories` filtering applied after each file.

**CLI (`apps/cli`)**

- `nirapod-audit audit <path>` — audit a file or directory.
- `nirapod-audit rules` — list all 55 rules in a table.
- `nirapod-audit explain <id>` — print full rule descriptor with rationale and references.
- `--output report` (default) — full coloured summary with category table, top rules, per-file breakdown.
- `--output tui` — live Ink TUI with progress bar and streaming diagnostics.
- `--output json` — newline-delimited JSON (`AuditEvent` objects).
- `--output sarif` — SARIF 2.1.0 for GitHub Code Scanning.
- `loadConfig()` — reads `nirapod-audit.toml` from project root; merges with CLI flag overrides.

**Tests**

- `tests/fixtures/compliant/good-header.h` — fully compliant header that must produce zero findings across all passes.
- `tests/violations/NRP-LIC-001-no-spdx.h` — missing SPDX identifier.
- `tests/violations/NRP-DOX-001-no-file-header.h` — missing file Doxygen block.
- `tests/violations/NRP-NASA-violations.h` — goto, recursion, unbounded loop, malloc, oversized function.
- `tests/violations/NRP-CRYPTO-violations.h` — memset zeroization, key in log, IV reuse.
- `tests/violations/NRP-MEM-violations.h` — missing bounds check, missing null check.
- `tests/violations/NRP-STYLE-001-banned-words.h` — banned words in doc comments.
- `tests/pipeline.test.ts` — integration tests that run the full pipeline against every fixture.

**Docs and CI**

- `docs/RULES.md` — auto-generated full rule catalog with rationale and references (55 rules).
- `docs/PLAN.md` — architecture decisions: pass design, CFG approach, Rust migration path.
- `nirapod-audit.toml.example` — annotated configuration template.
- `.github/workflows/ci.yml` — TypeScript typecheck, `bun test`, self-audit on fixtures, SARIF upload.
- `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- `scripts/generate-rules-doc.ts` — regenerates `docs/RULES.md` from the live rule registry.

---

[Unreleased]: https://github.com/nirapod/nirapod-audit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nirapod/nirapod-audit/releases/tag/v0.1.0
