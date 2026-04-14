/**
 * @file rules.ts
 * @brief Static rule descriptors for the MEMORY category (NRP-MEM-001 to NRP-MEM-004).
 *
 * @remarks
 * Memory safety rules catch common embedded C/C++ pitfalls: unchecked
 * array bounds, null pointer dereference, integer overflow on size
 * computations, and unsafe size_t-to-int narrowing casts.
 *
 * All memory rules apply exclusively to C/C++ files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, NASA_SAFETY, EMBEDDED_SKILL } from "../refs.js";

/** Shared language scope for all memory rules. */
const LANG_C_CPP = ["c", "cpp"] as const;

/** Array subscript used without prior bounds check. */
export const NRP_MEM_001: Rule = {
  id: "NRP-MEM-001",
  category: "MEMORY",
  severity: "error",
  title: "array-no-bounds-check",
  description: "Array subscript used without prior NIRAPOD_ASSERT(idx < size) guard.",
  rationale:
    "Out-of-bounds array access is undefined behavior in C/C++. On embedded " +
    "systems it silently corrupts adjacent memory, potentially overwriting " +
    "crypto keys or control structures. Every array index must be bounds-checked.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
  ],
  languages: [...LANG_C_CPP],
};

/** Pointer dereferenced without prior null check. */
export const NRP_MEM_002: Rule = {
  id: "NRP-MEM-002",
  category: "MEMORY",
  severity: "error",
  title: "ptr-no-null-check",
  description: "Pointer parameter dereferenced without prior NIRAPOD_ASSERT(ptr != NULL).",
  rationale:
    "Null pointer dereference on embedded ARM Cortex-M causes a HardFault " +
    "which resets the device. Check every pointer parameter at function entry " +
    "unless the documentation explicitly marks it as non-nullable.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
    ref("NASA JPL Rule 5", NASA_SAFETY, "Rule 5 — Minimum Two Assertions per Function"),
  ],
  languages: [...LANG_C_CPP],
};

/** size_t addition without overflow guard. */
export const NRP_MEM_003: Rule = {
  id: "NRP-MEM-003",
  category: "MEMORY",
  severity: "error",
  title: "size-overflow-unchecked",
  description: "size_t addition a + b without NIRAPOD_ASSERT(b <= SIZE_MAX - a) guard.",
  rationale:
    "size_t overflow wraps silently to zero on most platforms. A buffer " +
    "allocated with a wrapped size is too small, leading to heap corruption " +
    "when the full write occurs. Guard every size arithmetic operation.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
  ],
  languages: [...LANG_C_CPP],
};

/** size_t narrowed to int without range check. */
export const NRP_MEM_004: Rule = {
  id: "NRP-MEM-004",
  category: "MEMORY",
  severity: "warning",
  title: "size-to-int-cast",
  description: "size_t cast to int/uint32_t without range check.",
  rationale:
    "On 64-bit hosts (development builds), size_t is 64 bits but int is 32. " +
    "Truncation silently drops the high bits, causing incorrect buffer sizes " +
    "and potential overflows. Check the range before casting.",
  references: [
    ref("Memory Safety Checklist", EMBEDDED_SKILL, "Part 6 — Memory Safety Checklist"),
  ],
  languages: [...LANG_C_CPP],
};

/** All memory rules as an array for the registry. */
export const MEMORY_RULES: readonly Rule[] = [
  NRP_MEM_001, NRP_MEM_002, NRP_MEM_003, NRP_MEM_004,
];
