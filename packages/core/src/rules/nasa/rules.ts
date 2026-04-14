/**
 * @file rules.ts
 * @brief Static rule descriptors for the NASA category (NRP-NASA-001 to NRP-NASA-012).
 *
 * @remarks
 * Based on the NASA JPL "Power of 10" coding rules for safety-critical software.
 * These rules forbid constructs that make static verification impossible or
 * impractical: goto, recursion, unbounded loops, dynamic allocation, and
 * overly complex functions.
 *
 * All NASA rules apply exclusively to C/C++ files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, NASA_SAFETY, EMBEDDED_SKILL } from "../refs.js";

/** Shared language scope for all NASA rules. */
const LANG_C_CPP = ["c", "cpp"] as const;

/** goto statement found. */
export const NRP_NASA_001: Rule = {
  id: "NRP-NASA-001",
  category: "NASA",
  severity: "error",
  title: "no-goto",
  description: "goto statement found.",
  rationale:
    "goto disrupts structured control flow and makes static analysis " +
    "unverifiable. Every control flow path must be expressible as loops, " +
    "conditionals, and function calls.",
  references: [
    ref("NASA JPL Rule 1", NASA_SAFETY, "Rule 1 — Simple Control Flow"),
    ref("Embedded Skill", EMBEDDED_SKILL, "Part 4 — NASA Safety Rules"),
  ],
  languages: [...LANG_C_CPP],
};

/** setjmp() or longjmp() call found. */
export const NRP_NASA_002: Rule = {
  id: "NRP-NASA-002",
  category: "NASA",
  severity: "error",
  title: "no-setjmp-longjmp",
  description: "setjmp() or longjmp() call found.",
  rationale:
    "setjmp/longjmp are non-local jumps that bypass stack unwinding and " +
    "RAII destructors. They make control flow unanalyzable and break " +
    "exception-safety guarantees.",
  references: [
    ref("NASA JPL Rule 1", NASA_SAFETY, "Rule 1 — Simple Control Flow"),
  ],
  languages: [...LANG_C_CPP],
};

/** Function calls itself directly (same translation unit). */
export const NRP_NASA_003: Rule = {
  id: "NRP-NASA-003",
  category: "NASA",
  severity: "error",
  title: "no-direct-recursion",
  description: "Function calls itself directly (same translation unit).",
  rationale:
    "Recursion makes stack depth unbounded. In embedded systems with fixed " +
    "stack sizes, unbounded recursion causes stack overflow. Every algorithm " +
    "must use iteration with a provable upper bound.",
  references: [
    ref("NASA JPL Rule 1", NASA_SAFETY, "Rule 1 — Simple Control Flow"),
  ],
  languages: [...LANG_C_CPP],
};

/** Loop with no documented upper bound. */
export const NRP_NASA_004: Rule = {
  id: "NRP-NASA-004",
  category: "NASA",
  severity: "error",
  title: "loop-unbound",
  description: "for/while/do loop with no documented upper bound comment.",
  rationale:
    "Every loop must have a provable upper bound on iterations. Without it, " +
    "worst-case execution time cannot be determined and the loop may hang " +
    "the system. Document the bound in a comment above the loop.",
  references: [
    ref("NASA JPL Rule 2", NASA_SAFETY, "Rule 2 — Fixed Upper Bound for Loops"),
  ],
  languages: [...LANG_C_CPP],
};

/** Dynamic allocation function called. */
export const NRP_NASA_005: Rule = {
  id: "NRP-NASA-005",
  category: "NASA",
  severity: "error",
  title: "dynamic-alloc-post-init",
  description: "malloc/calloc/realloc/free/new/delete called.",
  rationale:
    "Dynamic allocation after initialization introduces fragmentation, " +
    "non-deterministic timing, and out-of-memory conditions. All memory " +
    "must be statically allocated or allocated only during system init.",
  references: [
    ref("NASA JPL Rule 3", NASA_SAFETY, "Rule 3 — No Dynamic Allocation After Init"),
  ],
  languages: [...LANG_C_CPP],
};

/** Function body exceeds line limit. */
export const NRP_NASA_006: Rule = {
  id: "NRP-NASA-006",
  category: "NASA",
  severity: "error",
  title: "function-too-long",
  description: "Function body exceeds 60 non-blank, non-comment lines.",
  rationale:
    "Long functions are harder to test, review, and verify. The 60-line " +
    "limit forces decomposition into testable units. Each function should " +
    "fit on one screen without scrolling.",
  references: [
    ref("NASA JPL Rule 4", NASA_SAFETY, "Rule 4 — Functions Fit on One Screen"),
  ],
  languages: [...LANG_C_CPP],
};

/** Non-trivial function has fewer than 2 assertions. */
export const NRP_NASA_007: Rule = {
  id: "NRP-NASA-007",
  category: "NASA",
  severity: "warning",
  title: "insufficient-assertions",
  description: "Non-trivial function (>5 lines) has fewer than 2 NIRAPOD_ASSERT calls.",
  rationale:
    "Assertions are the primary tool for catching logic errors at runtime. " +
    "The cost of an assertion is near zero; the cost of a missed invariant " +
    "is a field failure. Two assertions per function is a floor, not a ceiling.",
  references: [
    ref("NASA JPL Rule 5", NASA_SAFETY, "Rule 5 — Minimum Two Assertions per Function"),
  ],
  languages: [...LANG_C_CPP],
};

/** Non-void call result discarded without explicit (void) cast. */
export const NRP_NASA_008: Rule = {
  id: "NRP-NASA-008",
  category: "NASA",
  severity: "error",
  title: "unchecked-return-value",
  description: "Non-void call result discarded without explicit (void) cast.",
  rationale:
    "Ignoring a return value silently drops error information. If the return " +
    "value is intentionally unused, cast to (void) to document the decision.",
  references: [
    ref("NASA JPL Rule 7", NASA_SAFETY, "Rule 7 — Check All Return Values"),
  ],
  languages: [...LANG_C_CPP],
};

/** #define used for a constant (use constexpr). */
export const NRP_NASA_009: Rule = {
  id: "NRP-NASA-009",
  category: "NASA",
  severity: "error",
  title: "macro-for-constant",
  description: "#define used for a constant value (use constexpr instead).",
  rationale:
    "#define constants have no type, no scope, and no debugger visibility. " +
    "constexpr provides type safety, scoping, and debuggability while " +
    "producing identical machine code.",
  references: [
    ref("NASA JPL Rule 8", NASA_SAFETY, "Rule 8 — Restrict Preprocessor Use"),
  ],
  languages: [...LANG_C_CPP],
};

/** #define used for function-like macro (use inline). */
export const NRP_NASA_010: Rule = {
  id: "NRP-NASA-010",
  category: "NASA",
  severity: "error",
  title: "macro-for-function",
  description: "#define used for function-like macro (use inline function).",
  rationale:
    "Function-like macros bypass type checking, can't be debugged, and " +
    "produce confusing error messages. Use inline functions or templates.",
  references: [
    ref("NASA JPL Rule 8", NASA_SAFETY, "Rule 8 — Restrict Preprocessor Use"),
  ],
  languages: [...LANG_C_CPP],
};

/** Unnecessary global variable. */
export const NRP_NASA_011: Rule = {
  id: "NRP-NASA-011",
  category: "NASA",
  severity: "warning",
  title: "unnecessary-global",
  description: "Global variable declared where module-private static or parameter would suffice.",
  rationale:
    "Global variables create hidden data dependencies between functions. " +
    "Every global is a potential data race in concurrent systems. Prefer " +
    "function parameters or file-scoped static variables.",
  references: [
    ref("NASA JPL Rule 6", NASA_SAFETY, "Rule 6 — Restrict Scope of Data"),
  ],
  languages: [...LANG_C_CPP],
};

/** Variable never modified but not declared const. */
export const NRP_NASA_012: Rule = {
  id: "NRP-NASA-012",
  category: "NASA",
  severity: "info",
  title: "mutable-where-const",
  description: "Variable is never modified after initialization but not declared const.",
  rationale:
    "A variable that is never written should be const. This communicates " +
    "intent, enables compiler optimizations, and prevents accidental mutation.",
  references: [
    ref("NASA JPL Rule 6", NASA_SAFETY, "Rule 6 — Restrict Scope of Data"),
  ],
  languages: [...LANG_C_CPP],
};

/** All NASA rules as an array for the registry. */
export const NASA_RULES: readonly Rule[] = [
  NRP_NASA_001, NRP_NASA_002, NRP_NASA_003, NRP_NASA_004,
  NRP_NASA_005, NRP_NASA_006, NRP_NASA_007, NRP_NASA_008,
  NRP_NASA_009, NRP_NASA_010, NRP_NASA_011, NRP_NASA_012,
];
