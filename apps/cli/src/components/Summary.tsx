/**
 * @file Summary.tsx
 * @brief Final audit summary with per-category compliance matrix.
 *
 * @remarks
 * Renders after all files are processed. Shows a bordered table of
 * rule categories with error/warning counts, pass/fail/warn badges,
 * file counts, totals, duration, and exit code.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React from "react";
import { Text, Box } from "ink";
import type { AuditSummary, RuleCategory } from "@nirapod-audit/protocol";
import { ALL_RULES } from "@nirapod-audit/core";

/**
 * Props for the {@link Summary} component.
 */
interface SummaryProps {
  /** Aggregated results from the completed audit run. */
  summary: AuditSummary;
  /** Path of the auto-written markdown report (null if write failed). */
  reportPath?: string | null;
}

/**
 * All categories in display order.
 */
const CATEGORIES: readonly RuleCategory[] = [
  "LICENSE", "DOXYGEN", "TSDOC", "RUSTDOC", "NASA", "CRYPTO", "MEMORY", "STYLE",
];

/**
 * Renders a status badge with icon and colour.
 */
function StatusBadge({ status }: { status: string }): React.ReactElement {
  switch (status) {
    case "FAIL":
      return <Text color="red" bold>✗ FAIL</Text>;
    case "WARN":
      return <Text color="yellow" bold>~ WARN</Text>;
    default:
      return <Text color="green" bold>✓ PASS</Text>;
  }
}

/**
 * Renders the final audit summary table.
 *
 * @param props - Component props with the audit summary.
 * @returns Ink elements showing per-category compliance and totals.
 */
export function Summary({ summary, reportPath }: SummaryProps): React.ReactElement {
  const categoryStats = CATEGORIES.map((cat) => {
    const rulesInCat = ALL_RULES.filter((r) => r.category === cat);
    let errors = 0;
    let warnings = 0;
    for (const rule of rulesInCat) {
      const hits = summary.ruleHits[rule.id] ?? 0;
      if (rule.severity === "error") errors += hits;
      else if (rule.severity === "warning") warnings += hits;
    }
    const status =
      errors > 0 ? "FAIL" : warnings > 0 ? "WARN" : "PASS";
    return { cat, rules: rulesInCat.length, errors, warnings, status };
  });

  const passed = summary.totalErrors === 0;
  const topRules = Object.entries(summary.ruleHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor={passed ? "green" : "red"} paddingX={1}>
      {/* Title bar */}
      <Box marginBottom={1}>
        <Text bold color={passed ? "green" : "red"}>
          {passed ? "✓ " : "✗ "}AUDIT {passed ? "PASSED" : "FAILED"}
        </Text>
      </Box>

      {/* Category table header */}
      <Text>
        <Text bold dimColor>{"  Category".padEnd(14)}</Text>
        <Text bold dimColor>{"Rules".padStart(7)}</Text>
        <Text bold dimColor>{"Errors".padStart(9)}</Text>
        <Text bold dimColor>{"Warn".padStart(7)}</Text>
        <Text bold dimColor>{"  Status"}</Text>
      </Text>
      <Text dimColor>  {"─".repeat(48)}</Text>

      {/* Category rows */}
      {categoryStats.map(({ cat, rules, errors, warnings, status }) => (
        <Text key={cat}>
          <Text>{"  "}{cat.padEnd(12)}</Text>
          <Text dimColor>{String(rules).padStart(7)}</Text>
          {errors > 0 ? (
            <Text color="red" bold>{String(errors).padStart(9)}</Text>
          ) : (
            <Text dimColor>{String(errors).padStart(9)}</Text>
          )}
          {warnings > 0 ? (
            <Text color="yellow">{String(warnings).padStart(7)}</Text>
          ) : (
            <Text dimColor>{String(warnings).padStart(7)}</Text>
          )}
          <Text>{"  "}</Text>
          <StatusBadge status={status} />
        </Text>
      ))}

      {/* Separator */}
      <Text dimColor>  {"─".repeat(48)}</Text>

      {/* Stats row */}
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text dimColor>  Files: </Text>
          <Text>{summary.scannedFiles} scanned</Text>
          {summary.skippedFiles > 0 && (
            <Text dimColor> · {summary.skippedFiles} cached</Text>
          )}
        </Text>
        <Text>
          <Text dimColor>  Total: </Text>
          <Text color="red" bold>{summary.totalErrors} errors</Text>
          <Text dimColor> · </Text>
          <Text color="yellow">{summary.totalWarnings} warnings</Text>
          <Text dimColor> · </Text>
          <Text color="cyan">{summary.totalInfos} info</Text>
        </Text>

        {/* Top violated rules (if any) */}
        {topRules.length > 0 && (
          <Text>
            <Text dimColor>  Top:   </Text>
            {topRules.map(([id, count], i) => (
              <React.Fragment key={id}>
                {i > 0 && <Text dimColor>, </Text>}
                <Text>{id}</Text>
                <Text dimColor>×{count}</Text>
              </React.Fragment>
            ))}
          </Text>
        )}

        <Text>
          <Text dimColor>  Time:  </Text>
          <Text>{summary.durationMs} ms</Text>
        </Text>
      </Box>

      {/* Auto-generated Markdown Report */}
      {reportPath && (
        <Box marginTop={1}>
          <Text>
            <Text dimColor>  Report: </Text>
            <Text color="cyan">{reportPath}</Text>
          </Text>
        </Box>
      )}

      {/* Exit code */}
      <Box marginTop={1}>
        <Text>
          <Text dimColor>  Exit:   </Text>
          <Text color={passed ? "green" : "red"} bold>
            {passed ? "0 (PASS)" : "1 (FAIL)"}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
