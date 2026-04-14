/**
 * @file diagnostic.ts
 * @brief Helpers for constructing {@link Diagnostic} objects from tree-sitter nodes.
 *
 * Every analysis pass uses these helpers rather than constructing diagnostics
 * inline, so the span format and message conventions stay consistent across
 * all 45 rules.
 *
 * @remarks
 * Snippets are capped at 3 source lines so the TUI remains readable for
 * multi-line constructs like function signatures.
 *
 * @see {@link buildDiagnostic} for the primary construction helper.
 * @module Core
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type Parser from "tree-sitter";
import type { Diagnostic, Rule, Span, RelatedSpan } from "@nirapod-audit/protocol";

/**
 * Input bag for {@link buildDiagnostic}.
 *
 * @remarks
 * All fields except `span` and `message` are optional so call sites only
 * specify what they actually know.
 */
export interface DiagnosticInit {
  /** Primary source location (use {@link nodeToSpan} or {@link lineSpan}). */
  span: Span;
  /**
   * Specific, contextual message describing this violation.
   *
   * @remarks Must name the concrete symbol and measured value where applicable.
   */
  message: string;
  /** Rationale and context lines rendered as `note: …` in the TUI. */
  notes?: string[];
  /**
   * Actionable fix suggestion shown as `help: …` in the TUI.
   *
   * @remarks `null` when no mechanical fix applies.
   */
  help?: string | null;
  /** Secondary spans that provide additional context. */
  relatedSpans?: RelatedSpan[];
}

/**
 * Constructs a fully-populated {@link Diagnostic} from a rule and an init bag.
 *
 * @param rule - The rule that was violated.
 * @param init - Location, message, and optional enrichment data.
 * @returns A diagnostic ready to push into the pass result array.
 *
 * @example
 * ```typescript
 * return buildDiagnostic(rules.NASA_006, {
 *   span: nodeToSpan(fnNode, ctx.path, ctx.lines),
 *   message: `Function '${name}' is ${lineCount} lines; limit is ${max}.`,
 *   notes: ["NASA JPL Rule 4: No function body exceeds 60 lines."],
 *   help:  `Split at the backend-dispatch boundary around line ${splitHint}.`,
 * });
 * ```
 */
export function buildDiagnostic(rule: Rule, init: DiagnosticInit): Diagnostic {
  return {
    rule,
    span: init.span,
    message: init.message,
    notes: init.notes ?? [],
    help: init.help ?? null,
    relatedSpans: init.relatedSpans ?? [],
  };
}

/**
 * Converts a tree-sitter `SyntaxNode` into a {@link Span}.
 *
 * @param node - The CST node whose range to capture.
 * @param filePath - Absolute path of the file containing the node.
 * @param lines - File content split on `"\n"` (from `FileContext.lines`).
 * @returns A span with 1-based line/col values and up to 3 snippet lines.
 *
 * @remarks
 * Snippets are truncated to 3 lines so multi-line function signatures stay
 * readable in the TUI without consuming too much vertical space.
 */
export function nodeToSpan(
  node: Parser.SyntaxNode,
  filePath: string,
  lines: string[],
): Span {
  const startLine = node.startPosition.row + 1;
  const startCol = node.startPosition.column + 1;
  const endLine = node.endPosition.row + 1;
  const endCol = node.endPosition.column + 1;

  const snippetLines = lines.slice(
    node.startPosition.row,
    Math.min(node.endPosition.row + 1, node.startPosition.row + 3),
  );

  return {
    file: filePath,
    startLine,
    startCol,
    endLine,
    endCol,
    snippet: snippetLines.join("\n"),
  };
}

/**
 * Builds a {@link Span} that covers a single source line.
 *
 * @param filePath - Absolute path of the source file.
 * @param lineNumber - 1-based line number to point at.
 * @param lines - File content split on `"\n"` (from `FileContext.lines`).
 * @returns A span where `startLine === endLine === lineNumber`.
 *
 * @remarks
 * Used by the LexPass for regex-based findings that have no tree-sitter node.
 */
export function lineSpan(
  filePath: string,
  lineNumber: number,
  lines: string[],
): Span {
  const text = lines[lineNumber - 1] ?? "";
  return {
    file: filePath,
    startLine: lineNumber,
    startCol: 1,
    endLine: lineNumber,
    endCol: text.length + 1,
    snippet: text,
  };
}
