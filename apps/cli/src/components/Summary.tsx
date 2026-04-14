/**
 * @file Summary.tsx
 * @brief Final audit summary with per-category compliance matrix.
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

interface SummaryProps {
  summary: AuditSummary;
  reportPath?: string | null;
}

const CATEGORIES: readonly RuleCategory[] = [
  "LICENSE","DOXYGEN","TSDOC","RUSTDOC","NASA","CRYPTO","MEMORY","STYLE",
];

function StatusBadge({ status }: { status: string }): React.ReactElement {
  if (status === "FAIL") return <Text color="red"  bold>✗ FAIL</Text>;
  if (status === "WARN") return <Text color="yellow" bold>⚠ WARN</Text>;
  return <Text color="green" bold>✓ PASS</Text>;
}

export function Summary({ summary, reportPath }: SummaryProps): React.ReactElement {
  const passed = summary.totalErrors === 0;

  const catStats = CATEGORIES.map((cat) => {
    const rules = ALL_RULES.filter((r) => r.category === cat);
    let errors = 0, warnings = 0;
    for (const rule of rules) {
      const hits = summary.ruleHits[rule.id] ?? 0;
      if (rule.severity === "error")   errors   += hits;
      if (rule.severity === "warning") warnings += hits;
    }
    const status = errors > 0 ? "FAIL" : warnings > 0 ? "WARN" : "PASS";
    return { cat, rules: rules.length, errors, warnings, status };
  });

  const topRules = Object.entries(summary.ruleHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={passed ? "green" : "red"}
      paddingX={1}
      marginTop={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={passed ? "green" : "red"}>
          {passed ? "✓ " : "✗ "}AUDIT {passed ? "PASSED" : "FAILED"}
        </Text>
        <Text dimColor>{"  —  "}</Text>
        <Text color="red" bold>{summary.totalErrors}</Text>
        <Text dimColor>{" errors  "}</Text>
        <Text color="yellow">{summary.totalWarnings}</Text>
        <Text dimColor>{" warnings  "}</Text>
        <Text color="cyan">{summary.totalInfos}</Text>
        <Text dimColor>{" info"}</Text>
      </Box>

      {/* Category table */}
      <Text dimColor>{"  ─".repeat(24)}</Text>
      <Text>
        <Text bold dimColor>{"  Category     "}</Text>
        <Text bold dimColor>{"Rules "}</Text>
        <Text bold dimColor>{"  Errors "}</Text>
        <Text bold dimColor>{"  Warn "}</Text>
        <Text bold dimColor>{"  Status"}</Text>
      </Text>
      <Text dimColor>{"  ─".repeat(24)}</Text>

      {catStats.map(({ cat, rules, errors, warnings, status }) => (
        <Text key={cat}>
          {"  "}{cat.padEnd(13)}
          <Text dimColor>{String(rules).padStart(5)}</Text>
          {errors > 0
            ? <Text color="red" bold>{String(errors).padStart(9)}</Text>
            : <Text dimColor>{String(errors).padStart(9)}</Text>}
          {warnings > 0
            ? <Text color="yellow">{String(warnings).padStart(7)}</Text>
            : <Text dimColor>{String(warnings).padStart(7)}</Text>}
          {"  "}<StatusBadge status={status} />
        </Text>
      ))}

      <Text dimColor>{"  ─".repeat(24)}</Text>

      {/* Stats */}
      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text dimColor>{"  Files:  "}</Text>
          <Text>{summary.scannedFiles} scanned</Text>
          {summary.skippedFiles > 0 && <Text dimColor>{" · "}{summary.skippedFiles} cached</Text>}
        </Text>
        {topRules.length > 0 && (
          <Text>
            <Text dimColor>{"  Top:    "}</Text>
            {topRules.map(([id, count], i) => (
              <React.Fragment key={id}>
                {i > 0 && <Text dimColor>{", "}</Text>}
                <Text dimColor>{id}</Text>
                <Text color="yellow">{"×"}{count}</Text>
              </React.Fragment>
            ))}
          </Text>
        )}
        <Text>
          <Text dimColor>{"  Time:   "}</Text>
          <Text>{summary.durationMs} ms</Text>
        </Text>
        {reportPath && (
          <Text>
            <Text dimColor>{"  Report: "}</Text>
            <Text color="cyan">{reportPath}</Text>
          </Text>
        )}
        <Text>
          <Text dimColor>{"  Exit:   "}</Text>
          <Text bold color={passed ? "green" : "red"}>
            {passed ? "0 (PASS)" : "1 (FAIL)"}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
