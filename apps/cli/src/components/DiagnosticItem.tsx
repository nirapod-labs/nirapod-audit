/**
 * @file DiagnosticItem.tsx
 * @brief Ink component that renders a single diagnostic in rustc format.
 *
 * @remarks
 * Mirrors the rustc diagnostic output format: severity badge, rule ID,
 * message, file location with source snippet, note lines, and help
 * suggestion. Uses chalk colors for severity-based highlighting.
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

/**
 * Props for the {@link DiagnosticItem} component.
 */
interface DiagnosticItemProps {
  /** The diagnostic to render. */
  diagnostic: Diagnostic;
  /** Project root for computing relative paths. */
  rootDir: string;
  /** Whether to show help suggestions. */
  showHelp: boolean;
  /** Whether to show note lines. */
  showNotes: boolean;
}

/**
 * Maps severity to a chalk color name.
 *
 * @param severity - The severity level.
 * @returns Ink color string for the severity badge.
 */
function severityColor(severity: string): string {
  switch (severity) {
    case "error": return "red";
    case "warning": return "yellow";
    case "info": return "cyan";
    default: return "white";
  }
}

/**
 * Renders a single diagnostic in rustc-style format.
 *
 * @param props - Component props with the diagnostic data.
 * @returns Ink elements mimicking rustc's error output format.
 *
 * @example
 * ```
 * error[NRP-LIC-001]: Missing SPDX-License-Identifier line.
 *   --> src/crypto/aes_driver.h:1:1
 *    |
 *  1 | #pragma once
 *    |
 *    = note: Every Nirapod source file must declare its license via SPDX.
 *    = help: Add "SPDX-License-Identifier: APACHE-2.0" inside the file-level Doxygen block.
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

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header: severity[RULE-ID]: message */}
      <Text>
        <Text color={color} bold>
          {rule.severity}[{rule.id}]
        </Text>
        <Text>: {message}</Text>
      </Text>

      {/* Location: --> file:line:col */}
      <Text color="blue">
        {"  --> "}
        {relPath}:{span.startLine}:{span.startCol}
      </Text>

      {/* Source snippet */}
      {span.snippet ? (
        <Box flexDirection="column">
          <Text dimColor>{"   |"}</Text>
          {span.snippet.split("\n").map((line, i) => (
            <Text key={i}>
              <Text dimColor>
                {String(span.startLine + i).padStart(3)} {"| "}
              </Text>
              <Text>{line}</Text>
            </Text>
          ))}
          <Text dimColor>{"   |"}</Text>
        </Box>
      ) : null}

      {/* Notes */}
      {showNotes &&
        notes.map((note, i) => (
          <Text key={`note-${i}`}>
            <Text dimColor>{"   = "}</Text>
            <Text color="cyan">note: </Text>
            <Text>{note}</Text>
          </Text>
        ))}

      {/* Help */}
      {showHelp && help ? (
        <Text>
          <Text dimColor>{"   = "}</Text>
          <Text color="green">help: </Text>
          <Text>{help}</Text>
        </Text>
      ) : null}
    </Box>
  );
}
