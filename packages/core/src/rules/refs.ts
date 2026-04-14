/**
 * @file refs.ts
 * @brief Centralized reference path constants for rule documentation.
 *
 * @remarks
 * All rule descriptors import reference paths from here instead of
 * hardcoding strings. This makes it trivial to relocate reference docs
 * or switch between absolute and relative paths. The `ref()` helper
 * builds structured {@link RuleReference} objects.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { RuleReference } from "@nirapod-audit/protocol";

/**
 * Base path to the nirapod-embedded-engineering skill references.
 *
 * @remarks Points to C/C++/Doxygen/NASA documentation files.
 */
const EMBEDDED_REFS = ".agents/skills/nirapod-embedded-engineering/references";

/**
 * Base path to the write-documented-code skill references.
 *
 * @remarks Points to TSDoc/Rustdoc/license documentation files.
 */
const DOC_CODE_REFS = ".agents/skills/write-documented-code/references";

/** C/C++ Doxygen full reference. */
export const DOXYGEN_FULL = `${EMBEDDED_REFS}/doxygen-full.md`;
/** C/C++ license and headers reference. */
export const LICENSE_HEADERS_C = `${EMBEDDED_REFS}/license-and-headers.md`;
/** NASA JPL safety rules reference. */
export const NASA_SAFETY = `${EMBEDDED_REFS}/nasa-safety-rules.md`;
/** Platform-specific crypto reference (CC310/CC312/ESP32). */
export const PLATFORM_CRYPTO = `${EMBEDDED_REFS}/platform-crypto.md`;
/** Write-like-human documentation style reference. */
export const WRITE_LIKE_HUMAN = `${EMBEDDED_REFS}/write-like-human-tech.md`;

/** TSDoc full reference. */
export const TSDOC_FULL = `${DOC_CODE_REFS}/tsdoc-full.md`;
/** Rustdoc full reference. */
export const RUSTDOC_FULL = `${DOC_CODE_REFS}/rustdoc-full.md`;
/** TS/Rust license and headers reference. */
export const LICENSE_HEADERS_TS = `${DOC_CODE_REFS}/license-and-headers-ts-rust.md`;

/**
 * Base path to the write-like-human skill references.
 *
 * @remarks Points to AI detection databases, word tiers, and cultural styles.
 */
const WLH_REFS = ".agents/skills/write-like-human/references";

/** Write-documented-code skill main instructions. */
export const DOC_SKILL = ".agents/skills/write-documented-code/SKILL.md";
/** Embedded engineering skill main instructions. */
export const EMBEDDED_SKILL = ".agents/skills/nirapod-embedded-engineering/SKILL.md";
/** Write-like-human skill main instructions. */
export const WLH_SKILL = ".agents/skills/write-like-human/SKILL.md";
/** AI word tier database (Tier 1/2/3 banned words). */
export const WORD_TIERS = `${WLH_REFS}/word-tiers.md`;
/** AI writing detection patterns database. */
export const AI_PATTERNS_DB = `${WLH_REFS}/ai-patterns-database.md`;

/**
 * Builds a structured {@link RuleReference} for a local documentation file.
 *
 * @param label - Human-readable reference label.
 * @param file - Relative path to the doc file from project root.
 * @param section - Section title within the file, or `null`.
 * @returns Structured reference object.
 *
 * @example
 * ```typescript
 * ref("File Structure and Layout", DOXYGEN_FULL, "Part 1 — Section 1.1")
 * ```
 */
export function ref(
  label: string,
  file: string,
  section: string | null = null,
): RuleReference {
  return { label, file, section, url: null };
}

/**
 * Builds a structured {@link RuleReference} for an external URL.
 *
 * @param label - Human-readable reference label.
 * @param url - External URL.
 * @returns Structured reference object.
 *
 * @example
 * ```typescript
 * urlRef("SPDX License List", "https://spdx.org/licenses/")
 * ```
 */
export function urlRef(label: string, url: string): RuleReference {
  return { label, file: null, section: null, url };
}
