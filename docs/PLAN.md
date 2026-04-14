# nirapod-audit — Architecture & Design Plan

> **Status:** Pre-implementation plan. No code yet.
> **Stack:** TypeScript + Bun + tree-sitter + Ink
> **Philosophy:** Zero AI/LLM. Deterministic. Like rustc, not like a chatbot.

---

## 0. Why Fully TypeScript + Bun

Rust diye korle faster hoto for huge codebases, but:

| Concern | Rust | TS + Bun |
|---|---|---|
| tree-sitter binding quality | `tree-sitter` Rust crate (good) | `tree-sitter` npm (official, excellent) |
| Ink UI | IPC bridge needed | Native, same process |
| Build complexity | Cross-compile, two toolchains | `bun build` — done |
| Dev iteration speed | Cargo compile wait | Instant |
| Type safety for rule engine | Excellent | Excellent with strict TS |
| Performance at Nirapod codebase scale | Overkill | More than enough |

**Decision: Full TypeScript + Bun. Single codebase. No bridges.**

Bun specific advantages:
- `Bun.file()`, `Bun.Glob` — fast native file I/O
- `bun:ffi` if we ever need C bindings
- `bun --watch` for dev
- Native `.tsx` support — Ink just works
- `bun compile` — single native binary for distribution

---

## 1. Philosophy & Design Goals

### The rustc Analogy

rustc ke intelligent banay kono AI diye na. Banay **structured analysis passes**:
- Source → AST → HIR → MIR → LLVM IR
- Har pass er nijer specific job ache
- Har pass rich diagnostics produce kore with exact source spans
- Rules are **decidable** — yes/no answer, no guessing

nirapod-audit o same:
- Source → CST (tree-sitter) → AuditAST → Pass results → Diagnostics
- Har rule er ID, severity, category ache
- Diagnostic te exact line:col, the violating snippet, the fix suggestion
- Exit code 1 if any ERROR level violation exists (CI-friendly)

### What Makes It "Super Intelligent" Without AI

1. **Multi-pass analysis** — lex-level, AST-level, dataflow-level, cross-file
2. **Rich diagnostics** — not just "missing @brief" but *which* function, *where*, *what to write*
3. **Context-aware rules** — rule behavior changes based on file type (hal vs app vs crypto)
4. **Cross-file analysis** — can check @see references actually exist, @ingroup targets are defined
5. **Control flow tracking** — knows which paths zero a buffer, which don't
6. **Symbol table** — knows which functions are public API vs private impl
7. **Incremental** — only re-analyze changed files (via file hash cache)

---

## 2. Project Structure

```
~/Developer/nirapod/nirapod-audit/
│
├── packages/
│   ├── core/                        # Analysis engine — pure TS, no Ink
│   │   ├── src/
│   │   │   ├── index.ts             # Public API
│   │   │   ├── types.ts             # All shared types (Diagnostic, Rule, Span, etc.)
│   │   │   ├── parser/
│   │   │   │   ├── index.ts         # tree-sitter setup, parse() function
│   │   │   │   ├── c-parser.ts      # C/C++ parser, CST → AuditAST
│   │   │   │   └── queries/         # tree-sitter S-expression queries
│   │   │   │       ├── functions.scm
│   │   │   │       ├── structs.scm
│   │   │   │       ├── classes.scm
│   │   │   │       ├── loops.scm
│   │   │   │       └── macros.scm
│   │   │   ├── pipeline/
│   │   │   │   ├── index.ts         # Orchestrator — runs passes in order
│   │   │   │   └── pass.ts          # Pass interface
│   │   │   ├── passes/
│   │   │   │   ├── lex-pass.ts      # Raw text checks (SPDX, file order, banned words)
│   │   │   │   ├── ast-pass.ts      # Doxygen structure (file header, class, fn blocks)
│   │   │   │   ├── nasa-pass.ts     # NASA Power of 10 (goto, loops, alloc, fn length...)
│   │   │   │   ├── crypto-pass.ts   # Platform crypto rules (memset, key leak, mutex...)
│   │   │   │   ├── memory-pass.ts   # Memory safety (bounds, null, overflow)
│   │   │   │   └── style-pass.ts    # Writing style (banned words, em-dash, enum class)
│   │   │   ├── rules/
│   │   │   │   ├── index.ts         # All rules registry
│   │   │   │   ├── nasa/            # One file per rule (NRP-NASA-001 etc.)
│   │   │   │   ├── doxygen/
│   │   │   │   ├── license/
│   │   │   │   ├── crypto/
│   │   │   │   ├── memory/
│   │   │   │   └── style/
│   │   │   ├── cfg/
│   │   │   │   ├── builder.ts       # CFG builder from AST
│   │   │   │   └── dataflow.ts      # Dataflow analysis (zeroization paths)
│   │   │   ├── symbols/
│   │   │   │   └── table.ts         # Symbol table: functions, classes, groups
│   │   │   ├── context.ts           # FileContext, ProjectContext
│   │   │   └── diagnostic.ts        # Diagnostic builder, formatter
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── cli/                         # TUI — Ink + Bun
│       ├── src/
│       │   ├── index.tsx            # Entry: parse args, render Ink app
│       │   ├── runner.ts            # Orchestrates audit, feeds results to UI
│       │   ├── commands/
│       │   │   ├── audit.tsx        # `nirapod-audit audit <path>`
│       │   │   ├── report.tsx       # `nirapod-audit report --format sarif|md|html`
│       │   │   └── rules.tsx        # `nirapod-audit rules` (list all rules)
│       │   └── components/
│       │       ├── AuditProgress.tsx   # Progress bar per file
│       │       ├── DiagnosticItem.tsx  # Single diagnostic (like rustc output)
│       │       ├── ComplianceMatrix.tsx # Rule × File compliance table
│       │       ├── Summary.tsx         # Final summary (errors, warnings, pass/fail)
│       │       └── RuleExplainer.tsx   # Explain a rule in detail
│       ├── package.json
│       └── tsconfig.json
│
├── tests/
│   ├── fixtures/                    # C/C++ snippets that should PASS
│   │   └── compliant/
│   ├── violations/                  # C/C++ snippets that should FAIL with specific rule
│   │   ├── NRP-NASA-001-goto.c
│   │   ├── NRP-DOX-001-no-file-header.h
│   │   └── ...
│   └── rules/                      # Unit tests for each rule
│       ├── nasa.test.ts
│       ├── doxygen.test.ts
│       └── ...
│
├── docs/
│   ├── RULES.md                    # Full rule catalog (auto-generated)
│   ├── ARCHITECTURE.md             # This file, essentially
│   └── CONTRIBUTING.md
│
├── bun.workspace.toml              # Bun workspace
├── package.json                    # Root scripts
└── README.md
```

---

## 3. Core Types

Every piece of the system shares these types. Define once in `core/src/types.ts`.

```typescript
// --- Span: exact source location ---
interface Span {
  file: string;         // absolute path
  startLine: number;    // 1-based
  startCol: number;     // 1-based
  endLine: number;
  endCol: number;
  snippet: string;      // the actual source text of this span
}

// --- Rule ---
type RuleCategory = "NASA" | "DOXYGEN" | "LICENSE" | "CRYPTO" | "MEMORY" | "STYLE";
type Severity = "error" | "warning" | "info";

interface Rule {
  id: string;           // "NRP-NASA-001"
  category: RuleCategory;
  severity: Severity;
  title: string;        // "no-goto"
  description: string;  // Human readable, for `nirapod-audit rules`
  rationale: string;    // Why this rule exists
  references: string[]; // Links to NASA doc, MISRA rule, SKILL.md section
}

// --- Diagnostic (one violation instance) ---
interface Diagnostic {
  rule: Rule;
  span: Span;           // Primary location
  message: string;      // Specific message: "Function 'encryptGcm' is 87 lines; max is 60"
  notes: string[];      // Additional context lines (like rustc's "note: ...")
  help: string | null;  // What to do: "Split this into encryptGcm() + buildAesContext()"
  relatedSpans: Array<{ span: Span; label: string }>; // like rustc's secondary spans
}

// --- Pass ---
interface Pass {
  name: string;
  run(ctx: FileContext): Diagnostic[];
}

// --- FileContext: everything a pass needs ---
interface FileContext {
  path: string;
  raw: string;           // raw file content
  lines: string[];       // raw.split('\n')
  tree: Tree;            // tree-sitter parse tree
  rootNode: SyntaxNode;  // tree.rootNode
  project: ProjectContext;
}

// --- ProjectContext: cross-file data ---
interface ProjectContext {
  rootDir: string;
  allFiles: string[];
  symbols: SymbolTable;  // built from first pass over all files
  config: AuditConfig;
}

// --- AuditResult: output of a full run ---
interface AuditResult {
  files: FileResult[];
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  passedFiles: number;
  failedFiles: number;
  ruleHits: Map<string, number>;  // ruleId → count
  durationMs: number;
}

interface FileResult {
  path: string;
  diagnostics: Diagnostic[];
  errors: number;
  warnings: number;
}
```

---

## 4. The Analysis Pipeline

### Pass Order (matters — later passes can use earlier results)

```
File Input
    │
    ▼
[0. Pre-parse]
    · Bun.file().text() — read raw content
    · Check file extension (.h .hpp .c .cpp .S)
    · tree-sitter parse → CST
    · Determine file type: header | impl | asm | cmake
    · Determine platform context: nrf52 | nrf5340 | esp32 | host | unknown
    │
    ▼
[Pass 1: LexPass]                  — operates on: raw text, lines[]
    · SPDX-License-Identifier check
    · SPDX-FileCopyrightText check
    · File header must come BEFORE #pragma once or #ifndef guard
    · Banned style words: "robust", "seamlessly", "leverage", "delve", "utilize"
    · Em-dash detection: — (U+2014) in doc comments
    · Tab character detection (spaces only)
    │
    ▼
[Pass 2: AstPass]                  — operates on: CST, raw text
    · @file tag present, matches filename
    · @brief present on file header block
    · @brief is ONE line (not generic: not "AES driver" alone)
    · @details present on file header
    · @author, @date, @version present
    · SPDX lines INSIDE the Doxygen block (not after)
    · Every class decl: @class block with @brief @details @note @par @see
    · Every struct: @struct block, every field has ///< inline doc
    · Every enum: @enum block (must be enum class not plain enum)
    · Every public function in .h: full block
      - @brief (one line)
      - @details
      - @param[in/out/inout] for EVERY parameter
      - @return for EVERY non-void function (list all error paths)
      - @pre conditions
      - @post conditions
      - @note for hardware constraints
      - @warning for safety violations
      - @see cross-reference
    · @ingroup on every class/struct/fn (cross-check: group must exist)
    · @defgroup in module-doc.h files
    │
    ▼
[Pass 3: NasaPass]                 — operates on: CST
    · Rule 1: No goto (search AST for goto_statement nodes)
    · Rule 1: No setjmp / longjmp (call_expression where callee = setjmp|longjmp)
    · Rule 1: No direct recursion (function A calls function A — same translation unit)
    · Rule 2: All loops have documented upper bound
             (every for/while/do_while must have a comment on the line above
              matching pattern /max.*\d|bound.*\d|\d.*iter/i  OR a static bound variable)
    · Rule 3: No malloc/calloc/realloc/free/new/delete/new[]/delete[]
              (call_expression where callee is one of these — including via #define aliases)
    · Rule 4: Function body ≤ 60 lines (count non-blank, non-comment lines)
    · Rule 5: Minimum 2 NIRAPOD_ASSERT per non-trivial function
              (trivial = getter/one-liner/wrapper ≤ 5 lines, exempt)
    · Rule 6: No unnecessary globals (global variable_declaration in non-singleton pattern)
    · Rule 7: Every non-void call's return value is used
              (call_expression result discarded unless preceded by explicit (void) cast)
    · Rule 8: No #define for constants → must be constexpr
    · Rule 8: No #define for function-like macros → must be inline
              (exception: NIRAPOD_ASSERT, NIRAPOD_STATIC_ASSERT, platform guards)
    │
    ▼
[Pass 4: CryptoPass]               — operates on: CST, FileContext.platformHint
    · memset() used on any buffer in a crypto function → ERROR
      (should be explicit_bzero or mbedtls_platform_zeroize)
    · LOG_ERR/LOG_WRN/LOG_DBG/printf/printk called with a variable that matches
      key_handle|key_buf|key_material|entropy|plaintext pattern → ERROR
    · Crypto buffer (key_buf, plaintext, derived_*) not zeroed on every return path
      (requires CFG analysis — see Pass 4a: CryptoZeroPass)
    · nrf_crypto_* called with a const (flash-resident) buffer directly → ERROR
    · ESP32 platform: nrf_crypto_aes_* called without mutex acquire before → WARNING
    · nRF5340 platform: direct NRF_CC312 register access from non-secure file → ERROR
    · IV/nonce variable reused across two encrypt calls (same variable, same scope) → ERROR
    │
    ▼
[Pass 4a: CryptoZeroPass]          — operates on: CFG (built by cfg/builder.ts)
    For every function that declares a local buffer matching crypto pattern:
    · Build CFG of the function
    · For every exit node (return statement), walk backwards
    · Check: is there an explicit_bzero/mbedtls_platform_zeroize call
             on EVERY path from entry to this exit?
    · If any path exits without zeroing: Diagnostic at that return statement
    │
    ▼
[Pass 5: MemoryPass]               — operates on: CST
    · Array access: arr[i] where no NIRAPOD_ASSERT(i < sizeof(arr)) exists before it
    · Pointer param used before NIRAPOD_ASSERT(ptr != NULL) — unless @param says nullable
    · size_t addition a + b without overflow guard
      NIRAPOD_ASSERT(b <= SIZE_MAX - a) pattern check
    · DMA buffer: passing const buffer to nrf_crypto_* functions → see CryptoPass
    │
    ▼
[Pass 6: StylePass]                — operates on: raw text (doc comments only)
    · Banned words in doc strings: robust, seamlessly, leverage, delve, utilize
    · Em-dash in doc strings
    · plain `enum` (not `enum class`) → must be enum class
    · @brief that is generic (single word or known-bad phrases like "AES driver")
    │
    ▼
[Aggregator]
    · Collect all Diagnostic[]
    · Sort: errors first, then warnings, then infos
    · Sort within severity: by file, then by line
    · Deduplicate (same rule + same span)
    · Build AuditResult
    │
    ▼
[Output]
    · JSON (streaming, newline-delimited) → consumed by Ink TUI
    · SARIF 2.1 → for GitHub Actions / VS Code Problems panel
    · Markdown → for PR comments
    · Exit 0 (all pass) or Exit 1 (any error)
```

---

## 5. Complete Rule Catalog

### 5.1 License Rules (NRP-LIC)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-LIC-001 | missing-spdx-identifier | error | SPDX-License-Identifier line absent |
| NRP-LIC-002 | missing-spdx-copyright | error | SPDX-FileCopyrightText line absent |
| NRP-LIC-003 | header-not-first | error | Doxygen block not the very first thing in file (before #pragma once) |
| NRP-LIC-004 | spdx-outside-doxygen | warning | SPDX lines exist but not inside /** ... */ block |

### 5.2 Doxygen Rules (NRP-DOX)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-DOX-001 | missing-file-header | error | No @file block at all |
| NRP-DOX-002 | missing-file-brief | error | @file block has no @brief |
| NRP-DOX-003 | brief-too-generic | warning | @brief is one word or in known-generic list |
| NRP-DOX-004 | missing-file-details | warning | @file block has no @details |
| NRP-DOX-005 | missing-file-meta | warning | @author, @date, or @version absent |
| NRP-DOX-006 | missing-class-doc | error | class/struct declaration in .h has no preceding /** @class */ block |
| NRP-DOX-007 | class-doc-incomplete | warning | @class block missing @details, @note, @par, or @see |
| NRP-DOX-008 | missing-struct-doc | error | struct in .h has no @struct block |
| NRP-DOX-009 | struct-field-undoc | error | struct field has no ///< inline doc |
| NRP-DOX-010 | missing-enum-doc | error | enum in .h has no @enum block |
| NRP-DOX-011 | plain-enum | error | enum not declared as enum class |
| NRP-DOX-012 | missing-fn-doc | error | Public function in .h has no Doxygen block |
| NRP-DOX-013 | missing-fn-brief | error | Function block has no @brief |
| NRP-DOX-014 | missing-fn-param | error | @param missing for one or more parameters |
| NRP-DOX-015 | missing-fn-return | error | @return missing on non-void function |
| NRP-DOX-016 | return-incomplete | warning | @return documented but not all error codes listed |
| NRP-DOX-017 | missing-fn-pre-post | warning | Public API function missing @pre or @post |
| NRP-DOX-018 | missing-fn-see | info | Function block missing any @see cross-reference |
| NRP-DOX-019 | missing-ingroup | warning | Class/struct/fn in .h not tagged with @ingroup |
| NRP-DOX-020 | ingroup-undefined | error | @ingroup references a group name not defined anywhere in project |
| NRP-DOX-021 | missing-defgroup | warning | module-doc.h file exists but has no @defgroup |
| NRP-DOX-022 | warning-missing-for-constraint | warning | Hardware/thread constraint in @details but no @warning or @note block |

### 5.3 NASA / JPL Rules (NRP-NASA)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-NASA-001 | no-goto | error | goto statement found |
| NRP-NASA-002 | no-setjmp-longjmp | error | setjmp() or longjmp() call found |
| NRP-NASA-003 | no-direct-recursion | error | Function calls itself directly (in same TU) |
| NRP-NASA-004 | loop-unbound | error | for/while/do loop with no documented upper bound comment |
| NRP-NASA-005 | dynamic-alloc-post-init | error | malloc/calloc/realloc/free/new/delete called |
| NRP-NASA-006 | function-too-long | error | Function body > 60 non-blank non-comment lines |
| NRP-NASA-007 | insufficient-assertions | warning | Non-trivial function (> 5 lines) has fewer than 2 NIRAPOD_ASSERT |
| NRP-NASA-008 | unchecked-return-value | error | Non-void call result discarded without explicit (void) cast |
| NRP-NASA-009 | macro-for-constant | error | #define used for a constant (use constexpr) |
| NRP-NASA-010 | macro-for-function | error | #define used for function-like macro (use inline) |
| NRP-NASA-011 | unnecessary-global | warning | Global variable declared where module-private static or param would suffice |
| NRP-NASA-012 | mutable-where-const | info | Variable never modified but not declared const |

### 5.4 Crypto / Platform Rules (NRP-CRYPTO)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-CRYPTO-001 | memset-zeroization | error | memset() used to clear crypto buffer (use explicit_bzero/mbedtls_platform_zeroize) |
| NRP-CRYPTO-002 | key-in-log | error | Key handle, key buffer, or entropy variable passed to any log/print function |
| NRP-CRYPTO-003 | crypto-buf-not-zeroed | error | Local crypto buffer exits function on some path without being zeroed |
| NRP-CRYPTO-004 | flash-buf-to-nrf-crypto | error | const buffer (flash-resident) passed directly to nrf_crypto_* API |
| NRP-CRYPTO-005 | esp32-no-mutex | warning | nrf_crypto_aes_* / HW AES function called without visible mutex acquire |
| NRP-CRYPTO-006 | cc312-direct-register | error | Direct CC312 register write in non-secure context (NRF_CC312 offset pattern) |
| NRP-CRYPTO-007 | iv-reuse | error | Same IV/nonce variable used in two consecutive encrypt calls |
| NRP-CRYPTO-008 | interrupt-crypto | error | nrf_crypto_* call inside interrupt handler (ISR function) |
| NRP-CRYPTO-009 | raw-key-in-api | error | uint8_t key parameter (not KeyHandle) on a public API function |

### 5.5 Memory Safety Rules (NRP-MEM)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-MEM-001 | array-no-bounds-check | error | Array subscript used without prior NIRAPOD_ASSERT(idx < size) |
| NRP-MEM-002 | ptr-no-null-check | error | Pointer dereferenced without prior NIRAPOD_ASSERT(ptr != NULL) |
| NRP-MEM-003 | size-overflow-unchecked | error | size_t addition a + b without NIRAPOD_ASSERT(b <= SIZE_MAX - a) guard |
| NRP-MEM-004 | size-to-int-cast | warning | size_t cast to int/uint32_t without range check |

### 5.6 Style Rules (NRP-STYLE)

| ID | Title | Severity | What it checks |
|---|---|---|---|
| NRP-STYLE-001 | banned-word | warning | "robust", "seamlessly", "leverage", "delve", "utilize" in doc comment |
| NRP-STYLE-002 | em-dash-in-doc | warning | Em-dash character (—) in any doc comment |
| NRP-STYLE-003 | brief-single-word | warning | @brief is a single word (too generic) |
| NRP-STYLE-004 | hardware-word-missing | info | Crypto driver function with no mention of CC310/CC312/ESP32 in @details |

**Total: 45 rules across 6 categories**

---

## 6. Diagnostic Format

The diagnostic format mirrors rustc's output. Engineers recognize it immediately.

```
error[NRP-NASA-006]: function 'encryptGcm' is 87 lines; limit is 60
  --> src/crypto/aes_driver.cpp:142:1
   |
142 |   NirapodError AesDriver::encryptGcm(AesContext* ctx, ...) {
   |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |   function body runs to line 228 (87 non-blank, non-comment lines)
   |
   = note: NASA JPL Rule 4: No function body exceeds 60 lines (not counting blank and comment lines)
   = note: counted 87 lines from line 142 to line 228
   = help: split into encryptGcm() for the dispatch logic and a helper like
           buildAesGcmContext() for the context setup. The key_handle resolution
           (lines 155-190) and the backend dispatch (lines 191-228) are natural split points.
   = ref: SKILL.md Part 4, Rule 4 — "Functions fit on one screen"

warning[NRP-CRYPTO-001]: memset() used to clear crypto buffer 'key_buf'
  --> src/crypto/aes_driver.cpp:220:5
   |
220 |     memset(key_buf, 0, sizeof(key_buf));
   |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: memset() for zeroization may be optimized away by the compiler
           (the optimizer sees the buffer goes out of scope immediately)
   = help: replace with:
           mbedtls_platform_zeroize(key_buf, sizeof(key_buf));
           or: explicit_bzero(key_buf, sizeof(key_buf));
   = ref: SKILL.md Part 6 — Memory Safety Checklist (Cryptographic memory hygiene)
```

---

## 7. tree-sitter Query System

tree-sitter er S-expression query language use korbo to find specific AST patterns.
This is the most powerful part — no regex, actual syntax-aware matching.

### Example queries (`.scm` files)

```scheme
; queries/functions.scm
; Finds all function definitions with their names and body spans
(function_definition
  declarator: (function_declarator
    declarator: (identifier) @fn.name)
  body: (compound_statement) @fn.body) @fn.decl

; queries/classes.scm
; Finds all class declarations
(class_specifier
  name: (type_identifier) @class.name
  body: (field_declaration_list) @class.body) @class.decl

; queries/loops.scm
; Finds all loop constructs
[(for_statement) (while_statement) (do_statement)] @loop

; queries/macros.scm
; Finds #define that looks like a constant (no parameters)
(preproc_def
  name: (identifier) @macro.name
  value: (_) @macro.value) @macro

; queries/calls.scm
; Finds all function calls
(call_expression
  function: [(identifier) (field_expression)] @call.fn
  arguments: (argument_list) @call.args) @call
```

### How rules use queries

```typescript
// nasa-pass.ts — Rule NRP-NASA-001: no-goto

class NoGotoRule implements Rule {
  id = "NRP-NASA-001";
  // ...

  check(ctx: FileContext): Diagnostic[] {
    // tree-sitter query for goto_statement nodes
    const query = ctx.project.queries.get("goto_statement");
    const matches = query.matches(ctx.rootNode);

    return matches.map(match => {
      const node = match.captures[0].node;
      return buildDiagnostic(this, {
        span: nodeToSpan(node, ctx.path, ctx.lines),
        message: `goto statement found`,
        help: `Rewrite using a loop, early return, or an explicit state variable.
               goto disrupts static analysis and makes control flow unverifiable.`,
        notes: ["NASA JPL Rule 1: Simple control flow only. No goto."],
      });
    });
  }
}
```

---

## 8. CFG Builder (for CryptoZeroPass)

```typescript
// cfg/builder.ts

// Builds a simple CFG from a function's compound_statement node
// Nodes: Entry, BasicBlock (list of statements), Exit, Branch
// Edges: sequential, true-branch, false-branch

interface BasicBlock {
  id: number;
  statements: SyntaxNode[];
  succs: number[];  // successor block IDs
}

interface CFG {
  entry: number;
  exit: number;
  blocks: Map<number, BasicBlock>;
}

function buildCFG(fnBody: SyntaxNode): CFG { ... }

// dataflow.ts
// For CryptoZeroPass: backward dataflow analysis
// Given a buffer name, determine if every path from entry to exit
// passes through an explicit_bzero/mbedtls_platform_zeroize call on that buffer

function isAlwaysZeroed(cfg: CFG, bufferName: string): {
  alwaysZeroed: boolean;
  unzeroedExits: number[];  // block IDs of exit nodes missing the zeroing
} { ... }
```

CFG is simple — we don't need SSA or full DFG for these checks. Just reachability.

---

## 9. CLI / TUI Design

### Commands

```bash
# Audit a directory (recursive, all .h .hpp .c .cpp)
nirapod-audit audit ./firmware/src

# Audit with specific rule categories only
nirapod-audit audit ./src --only nasa,crypto

# Audit, suppress specific rules
nirapod-audit audit ./src --ignore NRP-STYLE-001

# Output SARIF for GitHub Actions
nirapod-audit audit ./src --format sarif > audit.sarif

# Audit a single file
nirapod-audit audit ./src/crypto/aes_driver.cpp

# List all rules
nirapod-audit rules

# Explain a specific rule
nirapod-audit explain NRP-NASA-006

# Show compliance matrix (which files violate which rules)
nirapod-audit matrix ./src
```

### TUI Layout (Ink)

```
┌─────────────────────────────────────────────────────────────────┐
│  nirapod-audit  v0.1.0                           nRF5340 + ESP32 │
├─────────────────────────────────────────────────────────────────┤
│  Auditing: ./firmware/src                                        │
│  ████████████████████░░░░░░░░░░  62%  ( 31 / 50 files )         │
│  Current: src/crypto/aes_driver.cpp                              │
├─────────────────────────────────────────────────────────────────┤
│  ERRORS ──────────────────────────────────────────────────────   │
│                                                                   │
│  error[NRP-NASA-006] src/crypto/aes_driver.cpp:142               │
│    function 'encryptGcm' is 87 lines (limit: 60)                 │
│                                                                   │
│  error[NRP-CRYPTO-001] src/crypto/aes_driver.cpp:220             │
│    memset() used to clear crypto buffer 'key_buf'                │
│                                                                   │
│  error[NRP-DOX-014] src/hal/nordic/cc310_hal.h:89                │
│    @param missing for parameter 'aad_len'                        │
│                                                                   │
│  WARNINGS ─────────────────────────────────────────────────────  │
│  ...                                                              │
├─────────────────────────────────────────────────────────────────┤
│  [e] expand  [r] rules  [m] matrix  [q] quit                     │
└─────────────────────────────────────────────────────────────────┘
```

After audit completes:

```
┌────────────────────────────────────────────────────────────────┐
│  AUDIT COMPLETE                                                 │
├───────────────┬──────────┬──────────┬────────┬────────────────┤
│  Category     │  Rules   │  Errors  │  Warn  │  Status        │
├───────────────┼──────────┼──────────┼────────┼────────────────┤
│  LICENSE      │  4       │  0       │  0     │  ✓ PASS        │
│  DOXYGEN      │  22      │  3       │  8     │  ✗ FAIL        │
│  NASA         │  12      │  2       │  4     │  ✗ FAIL        │
│  CRYPTO       │  9       │  1       │  2     │  ✗ FAIL        │
│  MEMORY       │  4       │  0       │  1     │  ~ WARN        │
│  STYLE        │  4       │  0       │  3     │  ~ WARN        │
├───────────────┴──────────┴──────────┴────────┴────────────────┤
│  Total: 6 errors, 18 warnings across 50 files                  │
│  Exit code: 1                                                  │
└────────────────────────────────────────────────────────────────┘
```

### Component Tree

```
<App>
  ├── <Header />              — tool name, version, target platform
  ├── <AuditProgress />       — progress bar, current file, ETA
  ├── <Static>                — completed diagnostics (scrollable, static rendering)
  │     └── <DiagnosticItem /> × N
  ├── <Summary />             — shown after all files done
  │     └── <ComplianceMatrix />
  └── <KeyBindings />        — [e]xpand [r]ules [m]atrix [q]uit
```

---

## 10. Configuration File

`nirapod-audit.toml` in project root:

```toml
[audit]
# Platform context hint — affects which crypto rules are active
platform = "nrf5340"       # nrf52840 | nrf5340 | esp32 | multi | auto

# Max function length (NASA Rule 4)
max_function_lines = 60

# Minimum assertions per function (NASA Rule 5)
min_assertions = 2

[rules]
# Downgrade specific rules
[rules.overrides]
"NRP-STYLE-001" = "info"   # banned-word: downgrade to info
"NRP-DOX-018" = "ignore"   # missing-fn-see: ignore entirely

[ignore]
# Files/patterns to exclude from audit
paths = [
  "firmware/src/third_party/**",
  "firmware/src/nordic_sdk/**",
]

[output]
format = "pretty"          # pretty | json | sarif
show_help = true           # show help suggestions
show_notes = true          # show rule rationale
```

---

## 11. Technology Versions

```json
{
  "runtime": "bun >= 1.1.0",
  "language": "TypeScript 5.4 (strict)",

  "core dependencies": {
    "tree-sitter": "^0.21.0",
    "tree-sitter-c": "^0.21.0",
    "tree-sitter-cpp": "^0.22.0"
  },

  "cli dependencies": {
    "ink": "^5.0.1",
    "ink-spinner": "^5.0.0",
    "@inkjs/ui": "^2.0.0",
    "react": "^18.3.1",
    "meow": "^13.2.0",
    "chalk": "^5.3.0"
  },

  "dev dependencies": {
    "bun:test": "built-in",
    "@types/react": "^18"
  }
}
```

---

## 12. Implementation Phases

### Phase 1 — Foundation (Week 1)
- [ ] Bun workspace setup
- [ ] tree-sitter integration: parse a C file, print CST
- [ ] Core types defined (`types.ts`)
- [ ] FileContext + ProjectContext builders
- [ ] Pass interface + pipeline runner
- [ ] **LexPass** complete (SPDX, file order, banned words)
- [ ] DiagnosticItem Ink component
- [ ] Basic CLI: `nirapod-audit audit <path>` → prints diagnostics

### Phase 2 — Doxygen + License (Week 2)
- [ ] **AstPass** complete (all NRP-DOX-* and NRP-LIC-* rules)
- [ ] tree-sitter query files for classes, structs, enums, functions
- [ ] Symbol table (build @defgroup and @ingroup maps)
- [ ] Cross-file @ingroup validation
- [ ] TUI progress bar + static diagnostic output (Ink)
- [ ] Summary component
- [ ] `nirapod-audit rules` command

### Phase 3 — NASA Rules (Week 3)
- [ ] **NasaPass** complete (all NRP-NASA-*)
- [ ] Function line counter (skip blanks and comments)
- [ ] Recursion detector (call graph, same-TU only)
- [ ] Loop bound checker (query + comment pattern matching)
- [ ] Return value checker
- [ ] Macro detector

### Phase 4 — Crypto + Memory (Week 4)
- [ ] **CryptoPass** complete (NRP-CRYPTO-*)
- [ ] CFG builder (`cfg/builder.ts`)
- [ ] CryptoZeroPass: backward dataflow on CFG
- [ ] **MemoryPass** complete (NRP-MEM-*)
- [ ] Platform context detection (nrf52 vs nrf5340 vs esp32)

### Phase 5 — Polish + Output (Week 5)
- [ ] SARIF 2.1 output
- [ ] Markdown report
- [ ] ComplianceMatrix component
- [ ] `nirapod-audit explain <rule-id>` command
- [ ] `nirapod-audit matrix` command
- [ ] Incremental mode (file hash cache, skip unchanged files)
- [ ] `nirapod-audit.toml` config file support
- [ ] `bun compile` → single binary

### Phase 6 — Testing (Week 6)
- [ ] Fixture files for every rule (compliant + violating)
- [ ] Unit tests for every rule (`bun test`)
- [ ] Integration test: audit `nirapod-crypto` repo
- [ ] CI workflow (GitHub Actions)
- [ ] Auto-generate `docs/RULES.md` from rule registry

---

## 13. Key Design Decisions (with Rationale)

### Why tree-sitter instead of regex?

Regex can detect `memset(` but can't tell if it's inside a crypto function,
or if the buffer is a `key_buf` vs a `display_buf`. tree-sitter gives us the
full AST — we can query "all call_expressions named memset where the enclosing
function name matches the crypto function pattern AND the first argument is a
variable whose name matches key|crypto|plaintext".

### Why per-pass, not per-rule?

One tree-sitter parse per file. All passes share the same `ctx.tree` and
`ctx.rootNode`. Running rules independently would parse the file 45 times.
Passes batch related work together.

### Why Bun instead of Node?

- `Bun.file().text()` is faster than `fs.readFileSync`
- `Bun.Glob` walks directories faster than `glob` npm package
- `bun compile` outputs a single self-contained binary (easier to distribute)
- `bun test` built in (no jest config)
- TypeScript natively without ts-node or esbuild setup

### Why not use an existing tool (cppcheck, clang-tidy)?

These tools don't know about Nirapod's specific rules:
- They don't check for NIRAPOD_ASSERT patterns
- They don't check Doxygen structure
- They don't know about CC310/CC312/ESP32 platform constraints
- They don't check the write-like-human documentation style rules
- They can't cross-check @ingroup/@defgroup consistency
- They don't produce Nirapod-specific fix suggestions

nirapod-audit is a *domain-specific* auditor. cppcheck is a general tool.
We can still call cppcheck as a subprocess in a future phase and absorb its
output into our diagnostic stream — but our rules are not replaceable by it.

---

## 14. File Classification Logic

```typescript
type FileRole =
  | "public-header"    // .h / .hpp — public API, strictest doc rules
  | "impl"             // .c / .cpp — implementation
  | "asm"              // .S — assembly (doc rules relaxed)
  | "cmake"            // CMakeLists.txt / *.cmake
  | "config"           // Kconfig / Doxyfile
  | "third-party"      // matched by ignore.paths — skip entirely
  | "module-doc"       // module-doc.h — must have @defgroup
  | "test"             // *_test.c / test_*.c — NASA rules relaxed

// Platform detection from includes / CMake defines
type PlatformHint =
  | "nrf52840"         // #include <nrf52840.h> or CONFIG_SOC_NRF52840
  | "nrf5340"          // #include <nrf5340.h>
  | "esp32"            // #include <esp_aes.h> or IDF_TARGET_ESP32
  | "host"             // no hardware includes (test build)
  | "unknown"
```

---

## 15. Exit Codes (CI-Friendly)

```
0  — no errors, no warnings (or warnings with --exit-zero)
1  — one or more ERROR-level violations
2  — audit configuration error (bad path, parse error in .toml)
3  — tool internal error
```

---

## Summary

| What | Decision |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Bun |
| Parsing | tree-sitter + tree-sitter-c + tree-sitter-cpp |
| TUI | Ink v5 + @inkjs/ui |
| Rules | 45 rules, 6 categories |
| Analysis | 6 passes: Lex → AST → NASA → Crypto → Memory → Style |
| CFG | Bespoke lightweight builder for zeroization dataflow |
| Output | pretty (TUI), JSON, SARIF 2.1, Markdown |
| Distribution | `bun compile` → single binary |
| Testing | `bun test` + fixture files per rule |
| AI | None. Zero. Not needed. |