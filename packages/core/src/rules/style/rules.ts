/**
 * @file rules.ts
 * @brief Static rule descriptors for the STYLE category (NRP-STYLE-001 to NRP-STYLE-004).
 *
 * @remarks
 * Style rules enforce the write-like-human documentation standard. They check
 * for AI-tell words, em-dashes, generic briefs, and missing hardware context
 * in crypto driver documentation.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Rule } from "@nirapod-audit/protocol";
import { ref, WRITE_LIKE_HUMAN, EMBEDDED_SKILL, DOC_SKILL, PLATFORM_CRYPTO, WLH_SKILL, WORD_TIERS, AI_PATTERNS_DB } from "../refs.js";

/** Banned AI-tell word found in documentation comment. */
export const NRP_STYLE_001: Rule = {
  id: "NRP-STYLE-001",
  category: "STYLE",
  severity: "warning",
  title: "banned-word",
  description:
    'Words like "robust", "seamlessly", "leverage", "delve", "utilize" found in doc comment.',
  rationale:
    "These words appear far more often in AI-generated text than in human " +
    "technical writing. Their presence signals the documentation was " +
    "generated without thought. Say what the thing does, not how great it is.",
  references: [
    ref("Writing Style", DOC_SKILL, "Part 5 — Writing Style"),
    ref("Write-Like-Human Reference", WRITE_LIKE_HUMAN),
    ref("Tier 1 Banned Words", WORD_TIERS, "Tier 1 - Never use"),
    ref("AI Phrase Patterns", AI_PATTERNS_DB, "Phrase patterns"),
  ],
};

/** Em-dash character found in documentation comment. */
export const NRP_STYLE_002: Rule = {
  id: "NRP-STYLE-002",
  category: "STYLE",
  severity: "warning",
  title: "em-dash-in-doc",
  description: "Em-dash character (\u2014) found in a documentation comment.",
  rationale:
    "Em dashes in documentation are the single strongest 'AI wrote this' " +
    "signal. Replace with a comma, colon, period, or parenthetical.",
  references: [
    ref("Writing Style", DOC_SKILL, "Part 5 — Writing Style"),
    ref("Write-Like-Human Reference", WRITE_LIKE_HUMAN),
    ref("Em Dash Detection Signal", AI_PATTERNS_DB, "Very high detection signal"),
  ],
};

/** @brief tag contains only a single word (too generic). */
export const NRP_STYLE_003: Rule = {
  id: "NRP-STYLE-003",
  category: "STYLE",
  severity: "warning",
  title: "brief-single-word",
  description: "@brief is a single word or uses a known-generic phrase.",
  rationale:
    "A single-word @brief like 'Driver' or 'Parser' tells the reader " +
    "nothing. The brief must say what the file or function does, not " +
    "what it is. 'Hardware-accelerated AES driver for CC310/CC312' is good.",
  references: [
    ref("File Structure and Layout", EMBEDDED_SKILL, "Part 1 — Section 1.1"),
  ],
};

/** Crypto driver function missing hardware platform mention in @details. */
export const NRP_STYLE_004: Rule = {
  id: "NRP-STYLE-004",
  category: "STYLE",
  severity: "info",
  title: "hardware-word-missing",
  description:
    "Crypto driver function doc does not mention CC310, CC312, or ESP32 in @details.",
  rationale:
    "Crypto driver documentation must specify which hardware backend is " +
    "involved. An engineer debugging at 2am needs to know if the function " +
    "touches CC310, CC312, ESP32, or mbedTLS without reading the source.",
  references: [
    ref("Platform-Specific Crypto Rules", EMBEDDED_SKILL, "Part 5 — Platform-Specific Crypto Rules"),
    ref("Platform Crypto Reference", PLATFORM_CRYPTO),
  ],
  languages: ["c", "cpp"],
};

/** All style rules as an array for the registry. */
export const STYLE_RULES: readonly Rule[] = [
  NRP_STYLE_001,
  NRP_STYLE_002,
  NRP_STYLE_003,
  NRP_STYLE_004,
];
