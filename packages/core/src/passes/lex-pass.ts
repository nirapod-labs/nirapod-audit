/**
 * @file lex-pass.ts
 * @brief Pass 1 of the analysis pipeline: lexical-level checks on raw text.
 *
 * @remarks
 * LexPass operates on `FileContext.raw` and `FileContext.lines` without
 * touching the tree-sitter CST. It catches issues visible in raw text:
 * missing SPDX headers, file-header ordering, banned AI-tell words,
 * em-dash characters, and tab characters.
 *
 * This is the fastest pass because it uses only string searches and regex.
 * It runs first so license/style issues surface before slower AST passes.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Diagnostic } from "@nirapod-audit/protocol";
import type { FileContext } from "../context.js";
import type { Pass } from "../pipeline/pass.js";
import { buildDiagnostic, lineSpan } from "../diagnostic.js";
import {
  NRP_LIC_001,
  NRP_LIC_002,
  NRP_LIC_003,
  NRP_LIC_004,
} from "../rules/license/rules.js";
import {
  NRP_STYLE_001,
  NRP_STYLE_002,
} from "../rules/style/rules.js";

/**
 * Words that appear disproportionately in AI-generated documentation.
 *
 * @remarks
 * Matched case-insensitively against doc-comment text. Each word triggers
 * a NRP-STYLE-001 warning.
 */
const BANNED_WORDS: ReadonlyMap<string, string> = new Map([
  ["robust", 'say what makes it reliable instead of calling it "robust"'],
  ["seamless", "say which failure modes are handled and how"],
  ["seamlessly", "say which failure modes are handled and how"],
  ["leverage", 'use "use", "call", or "rely on"'],
  ["utilize", 'just say "use"'],
  ["delve", 'say "look at", "read", or "examine"'],
  ["multifaceted", "say the actual facets"],
  ["holistic", "say which parts are covered"],
  ["ensure", 'say "check" or "verify" (ensure implies a guarantee you may not have)'],
  ["tapestry", "use plain language instead"],
  ["paradigm", "use plain language instead"],
  ["testament", "use plain language instead"],
  ["beacon", "use plain language instead"],
  ["cornerstone", "use plain language instead"],
  ["catalyst", "use plain language instead"],
  ["foster", "say 'encourage' or 'build'"],
  ["underscore", "say 'show' or 'highlight'"],
  ["showcase", "say 'show' or 'demo'"],
  ["harness", "say 'use'"],
  ["embark", "say 'start'"],
  ["spearhead", "say 'lead'"],
  ["pivotal", "say 'important' or 'key'"],
  ["groundbreaking", "irrelevant in technical docs"],
  ["transformative", "say what it changes exactly"],
  ["meticulous", "say 'careful' or 'detailed'"],
  ["vibrant", "irrelevant in technical docs"],
  ["innovative", "say 'new'"],
  ["unprecedented", "say 'first-ever' or 'new'"],
  ["ubiquitous", "say 'common' or 'everywhere'"],
]);

/**
 * Phrases that are strong indicators of AI-generated text.
 *
 * @remarks
 * Matched case-insensitively. Triggers NRP-STYLE-001.
 */
const BANNED_PHRASES: readonly string[] = [
  "in today's fast-paced",
  "in today's digital age",
  "delve into the world of",
  "pave the way",
  "at the forefront",
  "harness the power",
  "game-changer",
  "unlock the power",
  "stay ahead of the curve",
  "it is important to note that",
  "it goes without saying",
];

/**
 * Em-dash character (U+2014).
 *
 * @remarks Strongest "AI wrote this" signal in documentation text.
 */
const EM_DASH = "\u2014";

/**
 * Regex matching the start of a Doxygen doc-comment block (`/**`).
 */
const DOC_COMMENT_START = /\/\*\*/;

/**
 * Regex matching `#pragma once` or `#ifndef` include guards.
 */
const INCLUDE_GUARD = /^#pragma\s+once|^#ifndef\s+\w+/;

/**
 * Checks if a line is inside a doc-comment block.
 *
 * @param lines - All source lines of the file.
 * @param lineIdx - 0-based index of the line to check.
 * @returns `true` if the line is between `/**` and `*‍/` (inclusive).
 */
function isInDocComment(lines: readonly string[], lineIdx: number): boolean {
  let inDoc = false;
  for (let i = 0; i <= lineIdx; i++) {
    const line = lines[i]!;
    if (DOC_COMMENT_START.test(line)) inDoc = true;
    if (inDoc && line.includes("*/")) {
      if (i === lineIdx) return true;
      inDoc = false;
    }
  }
  return inDoc;
}

/**
 * Pass 1: lexical-level checks on raw text.
 *
 * @remarks
 * Checks NRP-LIC-001 through NRP-LIC-004 and NRP-STYLE-001, NRP-STYLE-002.
 * Skips third-party and assembly files entirely.
 */
export class LexPass implements Pass {
  readonly name = "LexPass";

  /**
   * Run all lexical checks on one source file.
   *
   * @param ctx - File context with raw content and metadata.
   * @returns Diagnostics for SPDX, ordering, banned words, and em-dashes.
   */
  run(ctx: FileContext): Diagnostic[] {
    if (ctx.role === "third-party" || ctx.role === "asm") return [];

    const results: Diagnostic[] = [];
    const { raw, lines, path: filePath } = ctx;

    this.checkSpdx(raw, lines, filePath, results);
    this.checkHeaderOrdering(lines, filePath, results);
    this.checkBannedWords(lines, filePath, results);
    this.checkEmDash(lines, filePath, results);

    return results;
  }

  /**
   * NRP-LIC-001 and NRP-LIC-002: check SPDX header lines exist.
   * NRP-LIC-004: check SPDX lines are inside the Doxygen block.
   */
  private checkSpdx(
    raw: string,
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    const hasSpdxId = raw.includes("SPDX-License-Identifier:");
    const hasSpdxCopyright = raw.includes("SPDX-FileCopyrightText:");

    if (!hasSpdxId) {
      out.push(
        buildDiagnostic(NRP_LIC_001, {
          span: lineSpan(filePath, 1, lines as string[]),
          message: "Missing SPDX-License-Identifier line.",
          help: 'Add "SPDX-License-Identifier: APACHE-2.0" inside the file-level Doxygen block.',
          notes: [
            "Every Nirapod source file must declare its license via SPDX.",
            "See references/license-and-headers.md for the complete template.",
          ],
        }),
      );
    }

    if (!hasSpdxCopyright) {
      out.push(
        buildDiagnostic(NRP_LIC_002, {
          span: lineSpan(filePath, 1, lines as string[]),
          message: "Missing SPDX-FileCopyrightText line.",
          help: 'Add "SPDX-FileCopyrightText: 2026 Nirapod Contributors" inside the Doxygen block.',
          notes: [
            "Copyright attribution is required for MIT-licensed code.",
          ],
        }),
      );
    }

    if (hasSpdxId || hasSpdxCopyright) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (
          (line.includes("SPDX-License-Identifier:") ||
            line.includes("SPDX-FileCopyrightText:")) &&
          !isInDocComment(lines, i)
        ) {
          out.push(
            buildDiagnostic(NRP_LIC_004, {
              span: lineSpan(filePath, i + 1, lines as string[]),
              message:
                "SPDX line found outside the Doxygen /** ... */ block.",
              help: "Move this SPDX line inside the file-level /** ... */ comment block.",
              notes: [
                "Nirapod convention places SPDX at the bottom of the Doxygen block " +
                "so it appears in the generated documentation site.",
              ],
            }),
          );
          break;
        }
      }
    }
  }

  /**
   * NRP-LIC-003: Doxygen block must be the first thing in the file.
   */
  private checkHeaderOrdering(
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    let foundGuard = false;
    let foundDocBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === "" || line.startsWith("//")) continue;

      if (INCLUDE_GUARD.test(line)) {
        foundGuard = true;
        if (!foundDocBlock) {
          out.push(
            buildDiagnostic(NRP_LIC_003, {
              span: lineSpan(filePath, i + 1, lines as string[]),
              message: `Include guard found at line ${i + 1} before the file-level Doxygen block.`,
              help: "Move the /** @file ... */ Doxygen block before #pragma once or #ifndef guards.",
              notes: [
                "The file header must be the very first thing in the file.",
                "SKILL.md Part 1: 'The header must be the first thing in the file, before any include guards.'",
              ],
            }),
          );
        }
        break;
      }

      if (DOC_COMMENT_START.test(line)) {
        foundDocBlock = true;
        break;
      }
    }

    void foundGuard;
  }

  /**
   * NRP-STYLE-001: banned words in doc comments.
   */
  private checkBannedWords(
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      if (!isInDocComment(lines, i)) continue;
      const line = lines[i]!;
      const lowerLine = line.toLowerCase();

      // Check single words
      for (const [word, suggestion] of BANNED_WORDS) {
        const regex = new RegExp(`\\b${word}\\b`, "i");
        if (regex.test(line)) {
          out.push(
            buildDiagnostic(NRP_STYLE_001, {
              span: lineSpan(filePath, i + 1, lines as string[]),
              message: `Banned word "${word}" found in documentation comment.`,
              help: suggestion,
              notes: [
                "These words signal AI-generated text. Human documentation says what the thing does, not how great it is.",
              ],
            }),
          );
        }
      }

      // Check phrases
      for (const phrase of BANNED_PHRASES) {
        if (lowerLine.includes(phrase)) {
          out.push(
            buildDiagnostic(NRP_STYLE_001, {
              span: lineSpan(filePath, i + 1, lines as string[]),
              message: `Banned phrase "${phrase}" found in documentation comment.`,
              help: "Rewrite this phrase in plain, direct language.",
              notes: [
                "These template phrases are strong signals of AI generation.",
              ],
            }),
          );
        }
      }
    }
  }

  /**
   * NRP-STYLE-002: em-dash in doc comments.
   */
  private checkEmDash(
    lines: readonly string[],
    filePath: string,
    out: Diagnostic[],
  ): void {
    for (let i = 0; i < lines.length; i++) {
      if (!isInDocComment(lines, i)) continue;
      const line = lines[i]!;

      if (line.includes(EM_DASH)) {
        out.push(
          buildDiagnostic(NRP_STYLE_002, {
            span: lineSpan(filePath, i + 1, lines as string[]),
            message: "Em-dash character (\u2014) found in documentation comment.",
            help: "Replace with a comma, colon, period, or semicolon. Em dashes are the strongest AI-tell signal.",
            notes: [
              "SKILL.md Part 9: 'Em dashes are forbidden. Replace every em dash with a comma, colon, period, or parenthetical.'",
            ],
          }),
        );
      }
    }
  }
}
