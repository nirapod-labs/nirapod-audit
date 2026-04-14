/**
 * @file DiagnosticItem.tsx
 * @brief Ink component that renders a single diagnostic in rustc format.
 *
 * @remarks
 * Mirrors the rustc diagnostic output format exactly: severity badge,
 * rule ID, message, file location arrow, source snippet with line
 * numbers, caret highlighting under the offending span, note lines,
 * and help suggestion. Caret width matches the span column range.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React from "react";
import { Text, Box } from "ink";
import type { Diagnostic } from "@nirapod-audit/protocol";
import path from "node:path";

interface DiagnosticItemProps {
  diagnostic: Diagnostic;
  rootDir: string;
  showHelp: boolean;
  showNotes: boolean;
}

/** Maps severity to an Ink color name. */
function severityColor(severity: string): string {
  switch (severity) {
    case "error":   return "red";
    case "warning": return "yellow";
    case "info":    return "cyan";
    default:        return "white";
  }
}

/**
 * Builds the caret string (^^^) aligned to the span column range.
 *
 * @param snippet - First source line of the span.
 * @param startCol - 1-based start column.
 * @param endCol - 1-based end column (may equal startCol for zero-width).
 * @param singleLine - True when span covers only one source line.
 * @returns A string of spaces and carets ready to render under the snippet.
 */
function buildCaretLine(
  snippet: string,
  startCol: number,
  endCol: number,
  singleLine: boolean,
): string {
  const firstLine = snippet.split("\n")[0] ?? "";
  const indent = " ".repeat(Math.max(0, startCol - 1));
  const width = singleLine && endCol > startCol
    ? endCol - startCol
    : Math.max(1, firstLine.trimEnd().length - startCol + 1);
  const carets = "^".repeat(Math.max(1, width));
  return indent + carets;
}

/**
 * Renders a single diagnostic in rustc-style format with caret highlighting.
 *
 * @example
 * ```
 * error[NRP-NASA-006]: function 'encryptGcm' is 87 lines; limit is 60
 *   --> src/crypto/aes_driver.cpp:142:1
 *    |
 * 142| NirapodError AesDriver::encryptGcm(AesContext* ctx, ...) {
 *    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *    |
 *    = note: NASA JPL Rule 4: counted 87 non-blank lines
 *    = help: split at the backend-dispatch boundary around line 191
 * ```
 */
export function DiagnosticItem({
  diagnostic,
  rootDir,
  showHelp,
  showNotes,
}: DiagnosticItemProps): React.ReactElement {
  const { rule, span, message, notes, help } = diagnostic;
  const relPath = path.relative(rootDir, span.file);
  const color = severityColor(rule.severity);
  const lineNumWidth = Math.max(3, String(span.startLine).length);
  const gutter = " ".repeat(lineNumWidth) + " | ";
  const singleLine = span.startLine === span.endLine;

  const snippetLines = span.snippet ? span.snippet.split("\n") : [];

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header: severity[RULE-ID]: message */}
      <Text>
        <Text color={color} bold>{rule.severity}[{rule.id}]</Text>
        <Text>: {message}</Text>
      </Text>

      {/* Location arrow */}
      <Text>
        <Text color="blueBright">{"  --> "}</Text>
        <Text color="blueBright">{relPath}:{span.startLine}:{span.startCol}</Text>
      </Text>

      {/* Gutter divider */}
      <Text dimColor>{gutter}</Text>

      {/* Source snippet with line numbers */}
      {snippetLines.map((line, i) => (
        <React.Fragment key={i}>
          <Text>
            <Text dimColor>
              {String(span.startLine + i).padStart(lineNumWidth)} {"| "}
            </Text>
            <Text>{line}</Text>
          </Text>
          {/* Caret line — only on the first line of the span */}
          {i === 0 && (
            <Text>
              <Text dimColor>{gutter}</Text>
              <Text color={color} bold>
                {buildCaretLine(line, span.startCol, span.endCol, singleLine)}
              </Text>
            </Text>
          )}
        </React.Fragment>
      ))}

      {/* Closing gutter */}
      <Text dimColor>{gutter}</Text>

      {/* Notes */}
      {showNotes && notes.map((note, i) => (
        <Text key={`note-${i}`}>
          <Text dimColor>{"   = "}</Text>
          <Text color="cyan">{"note: "}</Text>
          <Text dimColor>{note}</Text>
        </Text>
      ))}

      {/* Help */}
      {showHelp && help && (
        <Text>
          <Text dimColor>{"   = "}</Text>
          <Text color="green">{"help: "}</Text>
          <Text>{help}</Text>
        </Text>
      )}
    </Box>
  );
}
