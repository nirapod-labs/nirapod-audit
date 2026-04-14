/**
 * @file rules.ts
 * @brief CLI handler for the `rules` command.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { ALL_RULES } from "@nirapod-audit/core";

/**
 * Lists all rules in human-readable table format.
 */
export function runRulesHuman(): void {
  console.log(`\nnirapod-audit — Rule Catalog (${ALL_RULES.length} rules)\n`);
  console.log("  ID                  SEVERITY  CATEGORY  TITLE");
  console.log("  " + "─".repeat(70));
  for (const rule of ALL_RULES) {
    console.log(
      `  ${rule.id.padEnd(20)} ${rule.severity.padEnd(10)}${rule.category.padEnd(10)}${rule.title}`
    );
  }
  console.log();
  process.exit(0);
}

/**
 * Emits all rules as NDJSON.
 */
export function runRulesJson(): void {
  for (const rule of ALL_RULES) {
    console.log(JSON.stringify(rule));
  }
  process.exit(0);
}
