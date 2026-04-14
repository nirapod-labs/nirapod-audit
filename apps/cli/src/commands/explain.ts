/**
 * @file explain.ts
 * @brief CLI handler for the `explain <rule-id>` command.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { ALL_RULES } from "@nirapod-audit/core";

/**
 * Explains a rule in human-readable format.
 *
 * @param ruleId - Rule ID to explain (case-insensitive).
 */
export function runExplainHuman(ruleId: string): void {
  const rule = ALL_RULES.find((r) => r.id.toLowerCase() === ruleId.toLowerCase());
  if (!rule) {
    console.error(`error: unknown rule "${ruleId}". Run 'nirapod-audit rules' to list all.`);
    process.exit(2);
  }

  const icon = rule.severity === "error" ? "🔴" : rule.severity === "warning" ? "🟡" : "🔵";
  console.log();
  console.log(`  ${icon} ${rule.id} — ${rule.title}`);
  console.log(`  ${"─".repeat(60)}`);
  console.log();
  console.log(`  Severity:    ${rule.severity}`);
  console.log(`  Category:    ${rule.category}`);
  if (rule.languages) {
    console.log(`  Languages:   ${rule.languages.join(", ")}`);
  }
  console.log();
  console.log(`  Description:`);
  console.log(`    ${rule.description}`);
  console.log();
  console.log(`  Rationale:`);

  const words = rule.rationale.split(" ");
  let line = "    ";
  for (const word of words) {
    if (line.length + word.length + 1 > 76) {
      console.log(line);
      line = "    " + word;
    } else {
      line += (line.length > 4 ? " " : "") + word;
    }
  }
  if (line.trim()) console.log(line);
  console.log();

  if (rule.references && rule.references.length > 0) {
    console.log(`  References:`);
    for (const ref of rule.references) {
      if (ref.file) {
        const section = ref.section ? ` § ${ref.section}` : "";
        console.log(`    📄 ${ref.label}: ${ref.file}${section}`);
      } else if (ref.url) {
        console.log(`    🔗 ${ref.label}: ${ref.url}`);
      }
    }
    console.log();
  }

  process.exit(0);
}

/**
 * Explains a rule as JSON.
 *
 * @param ruleId - Rule ID to explain (case-insensitive).
 */
export function runExplainJson(ruleId: string): void {
  const rule = ALL_RULES.find((r) => r.id.toLowerCase() === ruleId.toLowerCase());
  if (!rule) {
    console.error(`error: unknown rule "${ruleId}".`);
    process.exit(2);
  }
  console.log(JSON.stringify(rule));
  process.exit(0);
}
