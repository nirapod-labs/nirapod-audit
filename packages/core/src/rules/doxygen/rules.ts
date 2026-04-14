/**
 * @file rules.ts
 * @brief Static rule descriptors for the DOXYGEN category (NRP-DOX-001 to NRP-DOX-022).
 *
 * @remarks
 * Covers file-level doc headers, class/struct/enum/function documentation,
 * parameter coverage, return value documentation, cross-references, and
 * `@ingroup`/`@defgroup` consistency checks. All DOXYGEN rules apply
 * exclusively to C/C++ files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, DOXYGEN_FULL, EMBEDDED_SKILL } from "../refs.js";

/** Shared language scope for all DOXYGEN rules. */
const LANG_C_CPP = ["c", "cpp"] as const;

export const NRP_DOX_001: Rule = { id: "NRP-DOX-001", category: "DOXYGEN", severity: "error", title: "missing-file-header", description: "No @file Doxygen block found at all.", rationale: "The file-level Doxygen block is the front door of the file. Without it, Doxygen skips the file entirely and engineers have no summary.", references: [ref("File Structure and Layout", DOXYGEN_FULL, "Part 1 — Section 1.1")], languages: [...LANG_C_CPP] };
export const NRP_DOX_002: Rule = { id: "NRP-DOX-002", category: "DOXYGEN", severity: "error", title: "missing-file-brief", description: "@file block has no @brief.", rationale: "@brief is the one-sentence summary that appears in Doxygen's file list. Without it, the file shows up as undocumented.", references: [ref("File Header @brief", DOXYGEN_FULL, "Part 1 — Section 1.1")], languages: [...LANG_C_CPP] };
export const NRP_DOX_003: Rule = { id: "NRP-DOX-003", category: "DOXYGEN", severity: "warning", title: "brief-too-generic", description: "@brief is one word or uses a known-generic phrase (e.g. 'AES driver').", rationale: "A generic brief tells the reader nothing. The brief must say what the file does, not what it is.", references: [ref("File Header @brief", DOXYGEN_FULL, "Part 1 — Section 1.1")], languages: [...LANG_C_CPP] };
export const NRP_DOX_004: Rule = { id: "NRP-DOX-004", category: "DOXYGEN", severity: "warning", title: "missing-file-details", description: "@file block has no @details section.", rationale: "@details provides the deep context that the @brief can't cover: architecture, protocols, and design constraints.", references: [ref("File Header @details", DOXYGEN_FULL, "Part 1 — Section 1.1")], languages: [...LANG_C_CPP] };
export const NRP_DOX_005: Rule = { id: "NRP-DOX-005", category: "DOXYGEN", severity: "warning", title: "missing-file-meta", description: "@author, @date, or @version absent from @file block.", rationale: "Attribution and version tracking are required for audit traceability.", references: [ref("File Header Metadata", DOXYGEN_FULL, "Part 1 — Section 1.2")], languages: [...LANG_C_CPP] };
export const NRP_DOX_006: Rule = { id: "NRP-DOX-006", category: "DOXYGEN", severity: "error", title: "missing-class-doc", description: "Class/struct declaration in .h has no preceding /** @class */ block.", rationale: "Public API types must be documented. A class without a doc block is invisible in the generated documentation.", references: [ref("Class Documentation", DOXYGEN_FULL, "Part 2 — Class Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_007: Rule = { id: "NRP-DOX-007", category: "DOXYGEN", severity: "warning", title: "class-doc-incomplete", description: "@class block missing @details, @note, @par, or @see.", rationale: "A @class block with only @brief is minimally useful. @details, @note, and @see add the context engineers need.", references: [ref("Class Documentation", DOXYGEN_FULL, "Part 2 — Class Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_008: Rule = { id: "NRP-DOX-008", category: "DOXYGEN", severity: "error", title: "missing-struct-doc", description: "Struct in .h has no @struct block.", rationale: "Wire-format structs and configuration types must be documented for protocol correctness.", references: [ref("Struct Documentation", DOXYGEN_FULL, "Part 3 — Struct Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_009: Rule = { id: "NRP-DOX-009", category: "DOXYGEN", severity: "error", title: "struct-field-undoc", description: "Struct field has no ///< inline documentation.", rationale: "Every field in a public struct must document its units, valid ranges, and byte-order.", references: [ref("Struct Field Docs", DOXYGEN_FULL, "Part 3 — Struct Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_010: Rule = { id: "NRP-DOX-010", category: "DOXYGEN", severity: "error", title: "missing-enum-doc", description: "Enum in .h has no @enum block.", rationale: "Enum values represent protocol states and error codes. Their semantics must be documented.", references: [ref("Enum Documentation", DOXYGEN_FULL, "Part 4 — Enum Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_011: Rule = { id: "NRP-DOX-011", category: "DOXYGEN", severity: "error", title: "plain-enum", description: "enum not declared as enum class.", rationale: "Plain enums pollute the enclosing scope. enum class provides type safety and prevents implicit conversions.", references: [ref("Enum Class Enforcement", DOXYGEN_FULL, "Part 4 — Enum Documentation (C++ only)")], languages: ["cpp"] };
export const NRP_DOX_012: Rule = { id: "NRP-DOX-012", category: "DOXYGEN", severity: "error", title: "missing-fn-doc", description: "Public function in .h has no Doxygen block.", rationale: "Every public API function must be documented. Without it, the function is invisible in the API reference.", references: [ref("Function Documentation", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_013: Rule = { id: "NRP-DOX-013", category: "DOXYGEN", severity: "error", title: "missing-fn-brief", description: "Function block has no @brief.", rationale: "@brief is the one-line summary shown in Doxygen function listings. Required for every documented function.", references: [ref("Function @brief", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_014: Rule = { id: "NRP-DOX-014", category: "DOXYGEN", severity: "error", title: "missing-fn-param", description: "@param missing for one or more function parameters.", rationale: "Every parameter must be documented with direction ([in], [out], [in,out]), name, and semantics.", references: [ref("Function @param", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_015: Rule = { id: "NRP-DOX-015", category: "DOXYGEN", severity: "error", title: "missing-fn-return", description: "@return missing on non-void function.", rationale: "The return value documentation must list all possible return codes and their meanings.", references: [ref("Function @return", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_016: Rule = { id: "NRP-DOX-016", category: "DOXYGEN", severity: "warning", title: "return-incomplete", description: "@return documented but not all error codes listed.", rationale: "Incomplete return value documentation leads to unhandled error codes in callers.", references: [ref("Function @retval", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_017: Rule = { id: "NRP-DOX-017", category: "DOXYGEN", severity: "warning", title: "missing-fn-pre-post", description: "Public API function missing @pre or @post.", rationale: "@pre and @post document the contract. Without them, callers guess at preconditions.", references: [ref("Function Contracts", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_018: Rule = { id: "NRP-DOX-018", category: "DOXYGEN", severity: "info", title: "missing-fn-see", description: "Function block missing any @see cross-reference.", rationale: "@see helps engineers discover related functions. Especially valuable in crypto drivers.", references: [ref("Function @see", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };
export const NRP_DOX_019: Rule = { id: "NRP-DOX-019", category: "DOXYGEN", severity: "warning", title: "missing-ingroup", description: "Class/struct/fn in .h not tagged with @ingroup.", rationale: "@ingroup organizes the Doxygen module page. Without it, symbols end up in the global namespace.", references: [ref("Group Architecture", DOXYGEN_FULL, "Part 7 — Group Architecture")], languages: [...LANG_C_CPP] };
export const NRP_DOX_020: Rule = { id: "NRP-DOX-020", category: "DOXYGEN", severity: "error", title: "ingroup-undefined", description: "@ingroup references a group name not defined anywhere in the project.", rationale: "A dangling @ingroup points to a non-existent group. The symbol disappears from navigation.", references: [ref("Group Architecture", DOXYGEN_FULL, "Part 7 — Group Architecture")], languages: [...LANG_C_CPP] };
export const NRP_DOX_021: Rule = { id: "NRP-DOX-021", category: "DOXYGEN", severity: "warning", title: "missing-defgroup", description: "module-doc.h file exists but has no @defgroup.", rationale: "module-doc.h files exist specifically to define Doxygen groups. Without @defgroup, the file is pointless.", references: [ref("Group Architecture", DOXYGEN_FULL, "Part 7 — Group Architecture")], languages: [...LANG_C_CPP] };
export const NRP_DOX_022: Rule = { id: "NRP-DOX-022", category: "DOXYGEN", severity: "warning", title: "warning-missing-for-constraint", description: "Hardware/thread constraint in @details but no @warning or @note block.", rationale: "Constraints like 'do not call from ISR' or 'CC310 only' must be in a @warning or @note block so they stand out.", references: [ref("Function @warning", DOXYGEN_FULL, "Part 5 — Function Documentation")], languages: [...LANG_C_CPP] };

/** All Doxygen rules as an array for the registry. */
export const DOXYGEN_RULES: readonly Rule[] = [
  NRP_DOX_001, NRP_DOX_002, NRP_DOX_003, NRP_DOX_004, NRP_DOX_005,
  NRP_DOX_006, NRP_DOX_007, NRP_DOX_008, NRP_DOX_009, NRP_DOX_010,
  NRP_DOX_011, NRP_DOX_012, NRP_DOX_013, NRP_DOX_014, NRP_DOX_015,
  NRP_DOX_016, NRP_DOX_017, NRP_DOX_018, NRP_DOX_019, NRP_DOX_020,
  NRP_DOX_021, NRP_DOX_022,
];
