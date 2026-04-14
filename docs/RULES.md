# nirapod-audit — Rule Catalog

> Auto-generated on 2026-04-14. Do not edit manually.
> **55 rules** across 6 categories.

---

## Table of Contents

- [License Rules](#license) (4 rules)
- [Doxygen Rules](#doxygen) (22 rules)
- [NASA / JPL Rules](#nasa) (12 rules)
- [Crypto / Platform Rules](#crypto) (9 rules)
- [Memory Safety Rules](#memory) (4 rules)
- [Style Rules](#style) (4 rules)

---

## License Rules {#license}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-LIC-001` | missing-spdx-identifier | 🔴 error | SPDX-License-Identifier line is absent from the file. |
| `NRP-LIC-002` | missing-spdx-copyright | 🔴 error | SPDX-FileCopyrightText line is absent from the file. |
| `NRP-LIC-003` | header-not-first | 🔴 error | Doxygen file header block must appear before #pragma once or #ifndef guards. |
| `NRP-LIC-004` | spdx-outside-doxygen | 🟡 warning | SPDX lines exist but are not inside the /** ... */ Doxygen block. |

### `NRP-LIC-001` — missing-spdx-identifier

**Severity:** error | **Category:** LICENSE

SPDX-License-Identifier line is absent from the file.

**Rationale:** A source file without a license header is legally ambiguous. SPDX identifiers provide machine-readable, unambiguous license declarations required for compliance and distribution.

**References:**
- 📄 License Header Quick Reference: `.agents/skills/nirapod-embedded-engineering/references/license-and-headers.md` (Standard Header Template)
- 📄 TS/Rust License Headers: `.agents/skills/write-documented-code/references/license-and-headers-ts-rust.md` (TypeScript File Header)
- 🔗 [SPDX License List](https://spdx.org/licenses/)

---

### `NRP-LIC-002` — missing-spdx-copyright

**Severity:** error | **Category:** LICENSE

SPDX-FileCopyrightText line is absent from the file.

**Rationale:** Copyright attribution is a legal requirement for MIT-licensed code. The SPDX-FileCopyrightText line establishes who holds copyright and enables automated compliance checks via the REUSE tool.

**References:**
- 📄 License Header Quick Reference: `.agents/skills/nirapod-embedded-engineering/references/license-and-headers.md` (Standard Header Template)
- 🔗 [REUSE Software](https://reuse.software/)

---

### `NRP-LIC-003` — header-not-first

**Severity:** error | **Category:** LICENSE | **Languages:** c, cpp

Doxygen file header block must appear before #pragma once or #ifndef guards.

**Rationale:** When the header block comes after include guards, Doxygen may not associate it with the file. The header must be line 1 so that both Doxygen and human readers see the license and purpose immediately.

**References:**
- 📄 File Structure and Layout: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 1 — Section 1.1)

---

### `NRP-LIC-004` — spdx-outside-doxygen

**Severity:** warning | **Category:** LICENSE | **Languages:** c, cpp

SPDX lines exist but are not inside the /** ... */ Doxygen block.

**Rationale:** Nirapod convention places SPDX lines at the bottom of the file-level Doxygen block so they appear in the generated documentation site. Standalone // SPDX comments are valid for REUSE compliance but miss the documentation integration.

**References:**
- 📄 License Header Template: `.agents/skills/nirapod-embedded-engineering/references/license-and-headers.md` (Standard Header Template)

---

## Doxygen Rules {#doxygen}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-DOX-001` | missing-file-header | 🔴 error | No @file Doxygen block found at all. |
| `NRP-DOX-002` | missing-file-brief | 🔴 error | @file block has no @brief. |
| `NRP-DOX-003` | brief-too-generic | 🟡 warning | @brief is one word or uses a known-generic phrase (e.g. 'AES driver'). |
| `NRP-DOX-004` | missing-file-details | 🟡 warning | @file block has no @details section. |
| `NRP-DOX-005` | missing-file-meta | 🟡 warning | @author, @date, or @version absent from @file block. |
| `NRP-DOX-006` | missing-class-doc | 🔴 error | Class/struct declaration in .h has no preceding /** @class */ block. |
| `NRP-DOX-007` | class-doc-incomplete | 🟡 warning | @class block missing @details, @note, @par, or @see. |
| `NRP-DOX-008` | missing-struct-doc | 🔴 error | Struct in .h has no @struct block. |
| `NRP-DOX-009` | struct-field-undoc | 🔴 error | Struct field has no ///< inline documentation. |
| `NRP-DOX-010` | missing-enum-doc | 🔴 error | Enum in .h has no @enum block. |
| `NRP-DOX-011` | plain-enum | 🔴 error | enum not declared as enum class. |
| `NRP-DOX-012` | missing-fn-doc | 🔴 error | Public function in .h has no Doxygen block. |
| `NRP-DOX-013` | missing-fn-brief | 🔴 error | Function block has no @brief. |
| `NRP-DOX-014` | missing-fn-param | 🔴 error | @param missing for one or more function parameters. |
| `NRP-DOX-015` | missing-fn-return | 🔴 error | @return missing on non-void function. |
| `NRP-DOX-016` | return-incomplete | 🟡 warning | @return documented but not all error codes listed. |
| `NRP-DOX-017` | missing-fn-pre-post | 🟡 warning | Public API function missing @pre or @post. |
| `NRP-DOX-018` | missing-fn-see | 🔵 info | Function block missing any @see cross-reference. |
| `NRP-DOX-019` | missing-ingroup | 🟡 warning | Class/struct/fn in .h not tagged with @ingroup. |
| `NRP-DOX-020` | ingroup-undefined | 🔴 error | @ingroup references a group name not defined anywhere in the project. |
| `NRP-DOX-021` | missing-defgroup | 🟡 warning | module-doc.h file exists but has no @defgroup. |
| `NRP-DOX-022` | warning-missing-for-constraint | 🟡 warning | Hardware/thread constraint in @details but no @warning or @note block. |

### `NRP-DOX-001` — missing-file-header

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

No @file Doxygen block found at all.

**Rationale:** The file-level Doxygen block is the front door of the file. Without it, Doxygen skips the file entirely and engineers have no summary.

**References:**
- 📄 File Structure and Layout: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 1 — Section 1.1)

---

### `NRP-DOX-002` — missing-file-brief

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

@file block has no @brief.

**Rationale:** @brief is the one-sentence summary that appears in Doxygen's file list. Without it, the file shows up as undocumented.

**References:**
- 📄 File Header @brief: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 1 — Section 1.1)

---

### `NRP-DOX-003` — brief-too-generic

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

@brief is one word or uses a known-generic phrase (e.g. 'AES driver').

**Rationale:** A generic brief tells the reader nothing. The brief must say what the file does, not what it is.

**References:**
- 📄 File Header @brief: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 1 — Section 1.1)

---

### `NRP-DOX-004` — missing-file-details

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

@file block has no @details section.

**Rationale:** @details provides the deep context that the @brief can't cover: architecture, protocols, and design constraints.

**References:**
- 📄 File Header @details: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 1 — Section 1.1)

---

### `NRP-DOX-005` — missing-file-meta

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

@author, @date, or @version absent from @file block.

**Rationale:** Attribution and version tracking are required for audit traceability.

**References:**
- 📄 File Header Metadata: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 1 — Section 1.2)

---

### `NRP-DOX-006` — missing-class-doc

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Class/struct declaration in .h has no preceding /** @class */ block.

**Rationale:** Public API types must be documented. A class without a doc block is invisible in the generated documentation.

**References:**
- 📄 Class Documentation: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 2 — Class Documentation)

---

### `NRP-DOX-007` — class-doc-incomplete

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

@class block missing @details, @note, @par, or @see.

**Rationale:** A @class block with only @brief is minimally useful. @details, @note, and @see add the context engineers need.

**References:**
- 📄 Class Documentation: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 2 — Class Documentation)

---

### `NRP-DOX-008` — missing-struct-doc

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Struct in .h has no @struct block.

**Rationale:** Wire-format structs and configuration types must be documented for protocol correctness.

**References:**
- 📄 Struct Documentation: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 3 — Struct Documentation)

---

### `NRP-DOX-009` — struct-field-undoc

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Struct field has no ///< inline documentation.

**Rationale:** Every field in a public struct must document its units, valid ranges, and byte-order.

**References:**
- 📄 Struct Field Docs: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 3 — Struct Documentation)

---

### `NRP-DOX-010` — missing-enum-doc

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Enum in .h has no @enum block.

**Rationale:** Enum values represent protocol states and error codes. Their semantics must be documented.

**References:**
- 📄 Enum Documentation: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 4 — Enum Documentation)

---

### `NRP-DOX-011` — plain-enum

**Severity:** error | **Category:** DOXYGEN | **Languages:** cpp

enum not declared as enum class.

**Rationale:** Plain enums pollute the enclosing scope. enum class provides type safety and prevents implicit conversions.

**References:**
- 📄 Enum Class Enforcement: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 4 — Enum Documentation (C++ only))

---

### `NRP-DOX-012` — missing-fn-doc

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Public function in .h has no Doxygen block.

**Rationale:** Every public API function must be documented. Without it, the function is invisible in the API reference.

**References:**
- 📄 Function Documentation: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-013` — missing-fn-brief

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

Function block has no @brief.

**Rationale:** @brief is the one-line summary shown in Doxygen function listings. Required for every documented function.

**References:**
- 📄 Function @brief: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-014` — missing-fn-param

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

@param missing for one or more function parameters.

**Rationale:** Every parameter must be documented with direction ([in], [out], [in,out]), name, and semantics.

**References:**
- 📄 Function @param: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-015` — missing-fn-return

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

@return missing on non-void function.

**Rationale:** The return value documentation must list all possible return codes and their meanings.

**References:**
- 📄 Function @return: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-016` — return-incomplete

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

@return documented but not all error codes listed.

**Rationale:** Incomplete return value documentation leads to unhandled error codes in callers.

**References:**
- 📄 Function @retval: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-017` — missing-fn-pre-post

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

Public API function missing @pre or @post.

**Rationale:** @pre and @post document the contract. Without them, callers guess at preconditions.

**References:**
- 📄 Function Contracts: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-018` — missing-fn-see

**Severity:** info | **Category:** DOXYGEN | **Languages:** c, cpp

Function block missing any @see cross-reference.

**Rationale:** @see helps engineers discover related functions. Especially valuable in crypto drivers.

**References:**
- 📄 Function @see: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

### `NRP-DOX-019` — missing-ingroup

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

Class/struct/fn in .h not tagged with @ingroup.

**Rationale:** @ingroup organizes the Doxygen module page. Without it, symbols end up in the global namespace.

**References:**
- 📄 Group Architecture: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 7 — Group Architecture)

---

### `NRP-DOX-020` — ingroup-undefined

**Severity:** error | **Category:** DOXYGEN | **Languages:** c, cpp

@ingroup references a group name not defined anywhere in the project.

**Rationale:** A dangling @ingroup points to a non-existent group. The symbol disappears from navigation.

**References:**
- 📄 Group Architecture: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 7 — Group Architecture)

---

### `NRP-DOX-021` — missing-defgroup

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

module-doc.h file exists but has no @defgroup.

**Rationale:** module-doc.h files exist specifically to define Doxygen groups. Without @defgroup, the file is pointless.

**References:**
- 📄 Group Architecture: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 7 — Group Architecture)

---

### `NRP-DOX-022` — warning-missing-for-constraint

**Severity:** warning | **Category:** DOXYGEN | **Languages:** c, cpp

Hardware/thread constraint in @details but no @warning or @note block.

**Rationale:** Constraints like 'do not call from ISR' or 'CC310 only' must be in a @warning or @note block so they stand out.

**References:**
- 📄 Function @warning: `.agents/skills/nirapod-embedded-engineering/references/doxygen-full.md` (Part 5 — Function Documentation)

---

## NASA / JPL Rules {#nasa}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-NASA-001` | no-goto | 🔴 error | goto statement found. |
| `NRP-NASA-002` | no-setjmp-longjmp | 🔴 error | setjmp() or longjmp() call found. |
| `NRP-NASA-003` | no-direct-recursion | 🔴 error | Function calls itself directly (same translation unit). |
| `NRP-NASA-004` | loop-unbound | 🔴 error | for/while/do loop with no documented upper bound comment. |
| `NRP-NASA-005` | dynamic-alloc-post-init | 🔴 error | malloc/calloc/realloc/free/new/delete called. |
| `NRP-NASA-006` | function-too-long | 🔴 error | Function body exceeds 60 non-blank, non-comment lines. |
| `NRP-NASA-007` | insufficient-assertions | 🟡 warning | Non-trivial function (>5 lines) has fewer than 2 NIRAPOD_ASSERT calls. |
| `NRP-NASA-008` | unchecked-return-value | 🔴 error | Non-void call result discarded without explicit (void) cast. |
| `NRP-NASA-009` | macro-for-constant | 🔴 error | #define used for a constant value (use constexpr instead). |
| `NRP-NASA-010` | macro-for-function | 🔴 error | #define used for function-like macro (use inline function). |
| `NRP-NASA-011` | unnecessary-global | 🟡 warning | Global variable declared where module-private static or parameter would suffice. |
| `NRP-NASA-012` | mutable-where-const | 🔵 info | Variable is never modified after initialization but not declared const. |

### `NRP-NASA-001` — no-goto

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

goto statement found.

**Rationale:** goto disrupts structured control flow and makes static analysis unverifiable. Every control flow path must be expressible as loops, conditionals, and function calls.

**References:**
- 📄 NASA JPL Rule 1: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 1 — Simple Control Flow)
- 📄 Embedded Skill: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 4 — NASA Safety Rules)

---

### `NRP-NASA-002` — no-setjmp-longjmp

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

setjmp() or longjmp() call found.

**Rationale:** setjmp/longjmp are non-local jumps that bypass stack unwinding and RAII destructors. They make control flow unanalyzable and break exception-safety guarantees.

**References:**
- 📄 NASA JPL Rule 1: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 1 — Simple Control Flow)

---

### `NRP-NASA-003` — no-direct-recursion

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

Function calls itself directly (same translation unit).

**Rationale:** Recursion makes stack depth unbounded. In embedded systems with fixed stack sizes, unbounded recursion causes stack overflow. Every algorithm must use iteration with a provable upper bound.

**References:**
- 📄 NASA JPL Rule 1: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 1 — Simple Control Flow)

---

### `NRP-NASA-004` — loop-unbound

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

for/while/do loop with no documented upper bound comment.

**Rationale:** Every loop must have a provable upper bound on iterations. Without it, worst-case execution time cannot be determined and the loop may hang the system. Document the bound in a comment above the loop.

**References:**
- 📄 NASA JPL Rule 2: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 2 — Fixed Upper Bound for Loops)

---

### `NRP-NASA-005` — dynamic-alloc-post-init

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

malloc/calloc/realloc/free/new/delete called.

**Rationale:** Dynamic allocation after initialization introduces fragmentation, non-deterministic timing, and out-of-memory conditions. All memory must be statically allocated or allocated only during system init.

**References:**
- 📄 NASA JPL Rule 3: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 3 — No Dynamic Allocation After Init)

---

### `NRP-NASA-006` — function-too-long

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

Function body exceeds 60 non-blank, non-comment lines.

**Rationale:** Long functions are harder to test, review, and verify. The 60-line limit forces decomposition into testable units. Each function should fit on one screen without scrolling.

**References:**
- 📄 NASA JPL Rule 4: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 4 — Functions Fit on One Screen)

---

### `NRP-NASA-007` — insufficient-assertions

**Severity:** warning | **Category:** NASA | **Languages:** c, cpp

Non-trivial function (>5 lines) has fewer than 2 NIRAPOD_ASSERT calls.

**Rationale:** Assertions are the primary tool for catching logic errors at runtime. The cost of an assertion is near zero; the cost of a missed invariant is a field failure. Two assertions per function is a floor, not a ceiling.

**References:**
- 📄 NASA JPL Rule 5: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 5 — Minimum Two Assertions per Function)

---

### `NRP-NASA-008` — unchecked-return-value

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

Non-void call result discarded without explicit (void) cast.

**Rationale:** Ignoring a return value silently drops error information. If the return value is intentionally unused, cast to (void) to document the decision.

**References:**
- 📄 NASA JPL Rule 7: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 7 — Check All Return Values)

---

### `NRP-NASA-009` — macro-for-constant

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

#define used for a constant value (use constexpr instead).

**Rationale:** #define constants have no type, no scope, and no debugger visibility. constexpr provides type safety, scoping, and debuggability while producing identical machine code.

**References:**
- 📄 NASA JPL Rule 8: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 8 — Restrict Preprocessor Use)

---

### `NRP-NASA-010` — macro-for-function

**Severity:** error | **Category:** NASA | **Languages:** c, cpp

#define used for function-like macro (use inline function).

**Rationale:** Function-like macros bypass type checking, can't be debugged, and produce confusing error messages. Use inline functions or templates.

**References:**
- 📄 NASA JPL Rule 8: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 8 — Restrict Preprocessor Use)

---

### `NRP-NASA-011` — unnecessary-global

**Severity:** warning | **Category:** NASA | **Languages:** c, cpp

Global variable declared where module-private static or parameter would suffice.

**Rationale:** Global variables create hidden data dependencies between functions. Every global is a potential data race in concurrent systems. Prefer function parameters or file-scoped static variables.

**References:**
- 📄 NASA JPL Rule 6: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 6 — Restrict Scope of Data)

---

### `NRP-NASA-012` — mutable-where-const

**Severity:** info | **Category:** NASA | **Languages:** c, cpp

Variable is never modified after initialization but not declared const.

**Rationale:** A variable that is never written should be const. This communicates intent, enables compiler optimizations, and prevents accidental mutation.

**References:**
- 📄 NASA JPL Rule 6: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 6 — Restrict Scope of Data)

---

## Crypto / Platform Rules {#crypto}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-CRYPTO-001` | memset-zeroization | 🔴 error | memset() used to clear a crypto buffer (may be optimized away). |
| `NRP-CRYPTO-002` | key-in-log | 🔴 error | Key handle, key buffer, or entropy variable passed to a log/print function. |
| `NRP-CRYPTO-003` | crypto-buf-not-zeroed | 🔴 error | Local crypto buffer exits function on some path without being zeroed. |
| `NRP-CRYPTO-004` | flash-buf-to-nrf-crypto | 🔴 error | const (flash-resident) buffer passed directly to nrf_crypto_* API. |
| `NRP-CRYPTO-005` | esp32-no-mutex | 🟡 warning | Hardware crypto function called without visible mutex acquire in function scope. |
| `NRP-CRYPTO-006` | cc312-direct-register | 🔴 error | Direct CC312 register write in non-secure context. |
| `NRP-CRYPTO-007` | iv-reuse | 🔴 error | Same IV/nonce variable used in two consecutive encrypt calls in the same scope. |
| `NRP-CRYPTO-008` | interrupt-crypto | 🔴 error | nrf_crypto_* call inside interrupt handler (ISR function). |
| `NRP-CRYPTO-009` | raw-key-in-api | 🔴 error | uint8_t key parameter (not KeyHandle) on a public API function. |

### `NRP-CRYPTO-001` — memset-zeroization

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

memset() used to clear a crypto buffer (may be optimized away).

**Rationale:** The compiler may optimize away memset() when the buffer is not read afterwards. Key material left in memory is a side-channel attack vector. Use explicit_bzero() or mbedtls_platform_zeroize() which are guaranteed not to be optimized out.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (Zeroization)

---

### `NRP-CRYPTO-002` — key-in-log

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

Key handle, key buffer, or entropy variable passed to a log/print function.

**Rationale:** Logging key material writes secrets to non-volatile storage (flash, UART, syslog). Even debug logs in development builds can leak into production. Never log key handles, buffers, or entropy sources.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (Key Material Handling)

---

### `NRP-CRYPTO-003` — crypto-buf-not-zeroed

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

Local crypto buffer exits function on some path without being zeroed.

**Rationale:** A crypto buffer left on the stack after function return can be read by subsequent function calls that reuse the same stack frame. Every crypto buffer must be zeroed on every exit path, including error paths.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (Zeroization)

---

### `NRP-CRYPTO-004` — flash-buf-to-nrf-crypto

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

const (flash-resident) buffer passed directly to nrf_crypto_* API.

**Rationale:** CryptoCell DMA cannot read from flash memory regions. Passing a const pointer (which the linker may place in flash) to nrf_crypto causes a hard fault or silent data corruption. Copy to a RAM buffer first.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (CC310/CC312 DMA Constraints)

---

### `NRP-CRYPTO-005` — esp32-no-mutex

**Severity:** warning | **Category:** CRYPTO | **Languages:** c, cpp

Hardware crypto function called without visible mutex acquire in function scope.

**Rationale:** CryptoCell and ESP32 hardware crypto peripherals are not reentrant. Concurrent access from multiple threads causes data corruption. Acquire a mutex before any hardware crypto operation.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (Thread Safety)

---

### `NRP-CRYPTO-006` — cc312-direct-register

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

Direct CC312 register write in non-secure context.

**Rationale:** On nRF5340, CC312 registers are only accessible from secure-world code. Direct register access from non-secure firmware causes a BusFault. Use the nrf_cc3xx_platform API instead.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (nRF5340 TrustZone)

---

### `NRP-CRYPTO-007` — iv-reuse

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

Same IV/nonce variable used in two consecutive encrypt calls in the same scope.

**Rationale:** Reusing an IV with the same key in AES-GCM or AES-CTR completely breaks confidentiality (XOR of two ciphertexts reveals XOR of plaintexts). Generate a fresh IV for every encryption operation.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (IV/Nonce Management)

---

### `NRP-CRYPTO-008` — interrupt-crypto

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

nrf_crypto_* call inside interrupt handler (ISR function).

**Rationale:** CryptoCell operations take variable time and may block. Calling crypto from an ISR blocks all lower-priority interrupts and can cause watchdog reset. Defer crypto work to a thread context.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (ISR Constraints)

---

### `NRP-CRYPTO-009` — raw-key-in-api

**Severity:** error | **Category:** CRYPTO | **Languages:** c, cpp

uint8_t key parameter (not KeyHandle) on a public API function.

**Rationale:** Public APIs that accept raw key bytes force callers to manage key material directly. Use an opaque KeyHandle type that references key material stored in a secure enclave or protected memory region.

**References:**
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md` (Key Handle Pattern)

---

## Memory Safety Rules {#memory}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-MEM-001` | array-no-bounds-check | 🔴 error | Array subscript used without prior NIRAPOD_ASSERT(idx < size) guard. |
| `NRP-MEM-002` | ptr-no-null-check | 🔴 error | Pointer parameter dereferenced without prior NIRAPOD_ASSERT(ptr != NULL). |
| `NRP-MEM-003` | size-overflow-unchecked | 🔴 error | size_t addition a + b without NIRAPOD_ASSERT(b <= SIZE_MAX - a) guard. |
| `NRP-MEM-004` | size-to-int-cast | 🟡 warning | size_t cast to int/uint32_t without range check. |

### `NRP-MEM-001` — array-no-bounds-check

**Severity:** error | **Category:** MEMORY | **Languages:** c, cpp

Array subscript used without prior NIRAPOD_ASSERT(idx < size) guard.

**Rationale:** Out-of-bounds array access is undefined behavior in C/C++. On embedded systems it silently corrupts adjacent memory, potentially overwriting crypto keys or control structures. Every array index must be bounds-checked.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)

---

### `NRP-MEM-002` — ptr-no-null-check

**Severity:** error | **Category:** MEMORY | **Languages:** c, cpp

Pointer parameter dereferenced without prior NIRAPOD_ASSERT(ptr != NULL).

**Rationale:** Null pointer dereference on embedded ARM Cortex-M causes a HardFault which resets the device. Check every pointer parameter at function entry unless the documentation explicitly marks it as non-nullable.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)
- 📄 NASA JPL Rule 5: `.agents/skills/nirapod-embedded-engineering/references/nasa-safety-rules.md` (Rule 5 — Minimum Two Assertions per Function)

---

### `NRP-MEM-003` — size-overflow-unchecked

**Severity:** error | **Category:** MEMORY | **Languages:** c, cpp

size_t addition a + b without NIRAPOD_ASSERT(b <= SIZE_MAX - a) guard.

**Rationale:** size_t overflow wraps silently to zero on most platforms. A buffer allocated with a wrapped size is too small, leading to heap corruption when the full write occurs. Guard every size arithmetic operation.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)

---

### `NRP-MEM-004` — size-to-int-cast

**Severity:** warning | **Category:** MEMORY | **Languages:** c, cpp

size_t cast to int/uint32_t without range check.

**Rationale:** On 64-bit hosts (development builds), size_t is 64 bits but int is 32. Truncation silently drops the high bits, causing incorrect buffer sizes and potential overflows. Check the range before casting.

**References:**
- 📄 Memory Safety Checklist: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 6 — Memory Safety Checklist)

---

## Style Rules {#style}

| ID | Title | Severity | Description |
|---|---|---|---|
| `NRP-STYLE-001` | banned-word | 🟡 warning | Words like "robust", "seamlessly", "leverage", "delve", "utilize" found in doc comment. |
| `NRP-STYLE-002` | em-dash-in-doc | 🟡 warning | Em-dash character (—) found in a documentation comment. |
| `NRP-STYLE-003` | brief-single-word | 🟡 warning | @brief is a single word or uses a known-generic phrase. |
| `NRP-STYLE-004` | hardware-word-missing | 🔵 info | Crypto driver function doc does not mention CC310, CC312, or ESP32 in @details. |

### `NRP-STYLE-001` — banned-word

**Severity:** warning | **Category:** STYLE

Words like "robust", "seamlessly", "leverage", "delve", "utilize" found in doc comment.

**Rationale:** These words appear far more often in AI-generated text than in human technical writing. Their presence signals the documentation was generated without thought. Say what the thing does, not how great it is.

**References:**
- 📄 Writing Style: `.agents/skills/write-documented-code/SKILL.md` (Part 5 — Writing Style)
- 📄 Write-Like-Human Reference: `.agents/skills/nirapod-embedded-engineering/references/write-like-human-tech.md`
- 📄 Tier 1 Banned Words: `.agents/skills/write-like-human/references/word-tiers.md` (Tier 1 - Never use)
- 📄 AI Phrase Patterns: `.agents/skills/write-like-human/references/ai-patterns-database.md` (Phrase patterns)

---

### `NRP-STYLE-002` — em-dash-in-doc

**Severity:** warning | **Category:** STYLE

Em-dash character (—) found in a documentation comment.

**Rationale:** Em dashes in documentation are the single strongest 'AI wrote this' signal. Replace with a comma, colon, period, or parenthetical.

**References:**
- 📄 Writing Style: `.agents/skills/write-documented-code/SKILL.md` (Part 5 — Writing Style)
- 📄 Write-Like-Human Reference: `.agents/skills/nirapod-embedded-engineering/references/write-like-human-tech.md`
- 📄 Em Dash Detection Signal: `.agents/skills/write-like-human/references/ai-patterns-database.md` (Very high detection signal)

---

### `NRP-STYLE-003` — brief-single-word

**Severity:** warning | **Category:** STYLE

@brief is a single word or uses a known-generic phrase.

**Rationale:** A single-word @brief like 'Driver' or 'Parser' tells the reader nothing. The brief must say what the file or function does, not what it is. 'Hardware-accelerated AES driver for CC310/CC312' is good.

**References:**
- 📄 File Structure and Layout: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 1 — Section 1.1)

---

### `NRP-STYLE-004` — hardware-word-missing

**Severity:** info | **Category:** STYLE | **Languages:** c, cpp

Crypto driver function doc does not mention CC310, CC312, or ESP32 in @details.

**Rationale:** Crypto driver documentation must specify which hardware backend is involved. An engineer debugging at 2am needs to know if the function touches CC310, CC312, ESP32, or mbedTLS without reading the source.

**References:**
- 📄 Platform-Specific Crypto Rules: `.agents/skills/nirapod-embedded-engineering/SKILL.md` (Part 5 — Platform-Specific Crypto Rules)
- 📄 Platform Crypto Reference: `.agents/skills/nirapod-embedded-engineering/references/platform-crypto.md`

---
