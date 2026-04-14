/**
 * @file rules.ts
 * @brief Static rule descriptors for the LICENSE category (NRP-LIC-001 to NRP-LIC-004).
 *
 * @remarks
 * Each constant is a frozen {@link Rule} object. Passes import these and pass
 * them to {@link buildDiagnostic} when a violation is found. Rule objects carry
 * no check logic; they are pure data.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, urlRef, LICENSE_HEADERS_C, LICENSE_HEADERS_TS, EMBEDDED_SKILL } from "../refs.js";

/** SPDX-License-Identifier line is absent from the file. */
export const NRP_LIC_001: Rule = {
  id: "NRP-LIC-001",
  category: "LICENSE",
  severity: "error",
  title: "missing-spdx-identifier",
  description: "SPDX-License-Identifier line is absent from the file.",
  rationale:
    "A source file without a license header is legally ambiguous. " +
    "SPDX identifiers provide machine-readable, unambiguous license " +
    "declarations required for compliance and distribution.",
  references: [
    ref("License Header Quick Reference", LICENSE_HEADERS_C, "Standard Header Template"),
    ref("TS/Rust License Headers", LICENSE_HEADERS_TS, "TypeScript File Header"),
    urlRef("SPDX License List", "https://spdx.org/licenses/"),
  ],
};

/** SPDX-FileCopyrightText line is absent from the file. */
export const NRP_LIC_002: Rule = {
  id: "NRP-LIC-002",
  category: "LICENSE",
  severity: "error",
  title: "missing-spdx-copyright",
  description: "SPDX-FileCopyrightText line is absent from the file.",
  rationale:
    "Copyright attribution is a legal requirement for MIT-licensed code. " +
    "The SPDX-FileCopyrightText line establishes who holds copyright and " +
    "enables automated compliance checks via the REUSE tool.",
  references: [
    ref("License Header Quick Reference", LICENSE_HEADERS_C, "Standard Header Template"),
    urlRef("REUSE Software", "https://reuse.software/"),
  ],
};

/** Doxygen file header block is not the very first thing in the file. */
export const NRP_LIC_003: Rule = {
  id: "NRP-LIC-003",
  category: "LICENSE",
  severity: "error",
  title: "header-not-first",
  description:
    "Doxygen file header block must appear before #pragma once or #ifndef guards.",
  rationale:
    "When the header block comes after include guards, Doxygen may not " +
    "associate it with the file. The header must be line 1 so that both " +
    "Doxygen and human readers see the license and purpose immediately.",
  references: [
    ref("File Structure and Layout", EMBEDDED_SKILL, "Part 1 — Section 1.1"),
  ],
  languages: ["c", "cpp"],
};

/** SPDX lines exist but are outside the Doxygen comment block. */
export const NRP_LIC_004: Rule = {
  id: "NRP-LIC-004",
  category: "LICENSE",
  severity: "warning",
  title: "spdx-outside-doxygen",
  description:
    "SPDX lines exist but are not inside the /** ... */ Doxygen block.",
  rationale:
    "Nirapod convention places SPDX lines at the bottom of the file-level " +
    "Doxygen block so they appear in the generated documentation site. " +
    "Standalone // SPDX comments are valid for REUSE compliance but miss " +
    "the documentation integration.",
  references: [
    ref("License Header Template", LICENSE_HEADERS_C, "Standard Header Template"),
  ],
  languages: ["c", "cpp"],
};

/** All license rules as an array for the registry. */
export const LICENSE_RULES: readonly Rule[] = [
  NRP_LIC_001,
  NRP_LIC_002,
  NRP_LIC_003,
  NRP_LIC_004,
];
