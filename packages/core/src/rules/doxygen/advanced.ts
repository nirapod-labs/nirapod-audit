/**
 * @file advanced.ts
 * @brief Static rule descriptors for the DOXYGEN-ADVANCED category (NRP-DOX-ADV-001 to NRP-DOX-ADV-011).
 *
 * @remarks
 * Advanced Doxygen rules that handle @copydoc resolution, @snippet verification,
 * Doxyfile configuration-aware checks (ALIASES, xrefitem, math, PlantUML,
 * @cite bibliography, TAG files, and @tableofcontents placement).
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, DOXYGEN_FULL } from "../refs.js";

const LANG_C_CPP = ["c", "cpp"] as const;

export const NRP_DOX_ADV_001: Rule = {
  id: "NRP-DOX-ADV-001",
  category: "DOXYGEN",
  severity: "error",
  title: "dangling-copydoc-reference",
  description: "@copydoc references a symbol not found in codebase.",
  rationale: "@copydoc target must exist in the project. A dangling reference means the copied documentation is missing.",
  references: [ref("@copydoc Resolution", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_002: Rule = {
  id: "NRP-DOX-ADV-002",
  category: "DOXYGEN",
  severity: "error",
  title: "copydoc-chain-depth-exceeded",
  description: "@copydoc chain exceeds 3 hops (maximum resolution depth).",
  rationale: "Deep @copydoc chains create maintenance problems and indicate potential circular references.",
  references: [ref("@copydoc Resolution", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_003: Rule = {
  id: "NRP-DOX-ADV-003",
  category: "DOXYGEN",
  severity: "error",
  title: "snippet-rot-detected",
  description: "@snippet file not found or tag marker missing (snippet rot).",
  rationale: "A @snippet reference to a missing file or tag means the snippet content is stale and not being verified.",
  references: [ref("@snippet Verification", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_004: Rule = {
  id: "NRP-DOX-ADV-004",
  category: "DOXYGEN",
  severity: "error",
  title: "undefined-alias-used",
  description: "Custom alias used in source but not defined in Doxyfile ALIASES.",
  rationale: "Aliases must be defined in the Doxyfile to be expanded. Undefined aliases are treated as literal text.",
  references: [ref("ALIASES Expansion", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_005: Rule = {
  id: "NRP-DOX-ADV-005",
  category: "DOXYGEN",
  severity: "error",
  title: "undefined-xrefitem-tag",
  description: "@xrefitem custom tag used but not defined in Doxyfile.",
  rationale: "Custom xrefitem tags must be defined via ALIASES in the Doxyfile before use.",
  references: [ref("@xrefitem Classification", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_005b: Rule = {
  id: "NRP-DOX-ADV-005b",
  category: "DOXYGEN",
  severity: "warning",
  title: "empty-xrefitem-annotation",
  description: "@xrefitem annotation tag has empty content.",
  rationale: "An empty xrefitem annotation provides no value and may indicate unfinished documentation.",
  references: [ref("@xrefitem Classification", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_006: Rule = {
  id: "NRP-DOX-ADV-006",
  category: "DOXYGEN",
  severity: "warning",
  title: "unknown-if-section-name",
  description: "@if uses section name not in Doxyfile ENABLED_SECTIONS.",
  rationale: "Unknown section names may indicate typos and cause conditional documentation to be always excluded.",
  references: [ref("@if/@endif Blocks", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_006b: Rule = {
  id: "NRP-DOX-ADV-006b",
  category: "DOXYGEN",
  severity: "error",
  title: "unclosed-if-block",
  description: "@if block with no matching @endif.",
  rationale: "Unclosed @if blocks cause the rest of the documentation to be conditionally excluded.",
  references: [ref("@if/@endif Blocks", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_007: Rule = {
  id: "NRP-DOX-ADV-007",
  category: "DOXYGEN",
  severity: "error",
  title: "unclosed-math-block",
  description: "Unclosed @f$ or @f[ math block.",
  rationale: "Math blocks must be properly paired. Unclosed math breaks LaTeX rendering.",
  references: [ref("Math Tags", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_007b: Rule = {
  id: "NRP-DOX-ADV-007b",
  category: "DOXYGEN",
  severity: "warning",
  title: "mathjax-disabled",
  description: "Math tags present but USE_MATHJAX not enabled in Doxyfile.",
  rationale: "Math tags without MathJax are rendered as literal text, not equations.",
  references: [ref("Math Tags", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_008: Rule = {
  id: "NRP-DOX-ADV-008",
  category: "DOXYGEN",
  severity: "error",
  title: "unclosed-plantuml",
  description: "@startuml without matching @enduml.",
  rationale: "PlantUML diagrams must be properly closed. Unclosed diagrams break the documentation build.",
  references: [ref("PlantUML Diagrams", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_008b: Rule = {
  id: "NRP-DOX-ADV-008b",
  category: "DOXYGEN",
  severity: "warning",
  title: "plantuml-not-configured",
  description: "PlantUML diagrams present but PLANTUML_JAR_PATH not set in Doxyfile.",
  rationale: "PlantUML diagrams without jar configuration are not rendered.",
  references: [ref("PlantUML Diagrams", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_009: Rule = {
  id: "NRP-DOX-ADV-009",
  category: "DOXYGEN",
  severity: "error",
  title: "undefined-cite-key",
  description: "@cite key not found in any .bib file specified in Doxyfile.",
  rationale: "Citation keys must exist in the bibliography files. Undefined keys are broken links.",
  references: [ref("@cite Bibliography", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_009b: Rule = {
  id: "NRP-DOX-ADV-009b",
  category: "DOXYGEN",
  severity: "info",
  title: "unused-citation",
  description: "Citation defined in .bib file but never used in codebase.",
  rationale: "Unused citations may indicate dead references or documentation rot.",
  references: [ref("@cite Bibliography", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_010: Rule = {
  id: "NRP-DOX-ADV-010",
  category: "DOXYGEN",
  severity: "error",
  title: "missing-tag-file",
  description: "TAGFILES references .tag file that does not exist on disk.",
  rationale: "Missing tag files break cross-project documentation links.",
  references: [ref("TAG Files", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_010b: Rule = {
  id: "NRP-DOX-ADV-010b",
  category: "DOXYGEN",
  severity: "warning",
  title: "tagfile-no-url-mapping",
  description: "TAG file entry has no URL mapping (only local path).",
  rationale: "Without URL mapping, cross-links will be broken in generated HTML docs.",
  references: [ref("TAG Files", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const NRP_DOX_ADV_011: Rule = {
  id: "NRP-DOX-ADV-011",
  category: "DOXYGEN",
  severity: "warning",
  title: "misplaced-tableofcontents",
  description: "@tableofcontents used outside @page context.",
  rationale: "@tableofcontents only has effect inside @page blocks. In other contexts it is ignored.",
  references: [ref("@tableofcontents Placement", DOXYGEN_FULL, "Advanced Features")],
  languages: [...LANG_C_CPP],
};

export const DOXYGEN_ADVANCED_RULES: readonly Rule[] = [
  NRP_DOX_ADV_001,
  NRP_DOX_ADV_002,
  NRP_DOX_ADV_003,
  NRP_DOX_ADV_004,
  NRP_DOX_ADV_005,
  NRP_DOX_ADV_005b,
  NRP_DOX_ADV_006,
  NRP_DOX_ADV_006b,
  NRP_DOX_ADV_007,
  NRP_DOX_ADV_007b,
  NRP_DOX_ADV_008,
  NRP_DOX_ADV_008b,
  NRP_DOX_ADV_009,
  NRP_DOX_ADV_009b,
  NRP_DOX_ADV_010,
  NRP_DOX_ADV_010b,
  NRP_DOX_ADV_011,
];