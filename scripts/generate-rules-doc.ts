#!/usr/bin/env bun
/**
 * @file generate-rules-doc.ts
 * @brief Generates docs/RULES.md from the rule registry.
 *
 * @remarks
 * Run with: `bun run scripts/generate-rules-doc.ts`
 * Reads ALL_RULES from the core package and writes a formatted
 * markdown table organized by category.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { ALL_RULES } from "../packages/core/src/rules/index.js";
import type { Rule, RuleCategory } from "../packages/protocol/src/index.js";
import { writeFileSync } from "node:fs";
import path from "node:path";

const CATEGORY_ORDER: RuleCategory[] = [
  "LICENSE", "DOXYGEN", "NASA", "CRYPTO", "MEMORY", "STYLE", "TSDOC", "RUSTDOC",
];

const CATEGORY_NAMES: Record<RuleCategory, string> = {
  LICENSE: "License Rules",
  DOXYGEN: "Doxygen Rules",
  NASA: "NASA / JPL Rules",
  CRYPTO: "Crypto / Platform Rules",
  MEMORY: "Memory Safety Rules",
  STYLE: "Style Rules",
  TSDOC: "TSDoc Rules",
  RUSTDOC: "Rustdoc Rules",
};

function buildMarkdown(): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split("T")[0];

  lines.push("# nirapod-audit — Rule Catalog");
  lines.push("");
  lines.push(`> Auto-generated on ${now}. Do not edit manually.`);
  lines.push(`> **${ALL_RULES.length} rules** across ${CATEGORY_ORDER.filter(c => ALL_RULES.some(r => r.category === c)).length} categories.`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Table of contents
  lines.push("## Table of Contents");
  lines.push("");
  for (const cat of CATEGORY_ORDER) {
    const rules = ALL_RULES.filter((r) => r.category === cat);
    if (rules.length === 0) continue;
    lines.push(`- [${CATEGORY_NAMES[cat]}](#${cat.toLowerCase()}) (${rules.length} rules)`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // Each category
  for (const cat of CATEGORY_ORDER) {
    const rules = ALL_RULES.filter((r) => r.category === cat);
    if (rules.length === 0) continue;

    lines.push(`## ${CATEGORY_NAMES[cat]} {#${cat.toLowerCase()}}`);
    lines.push("");
    lines.push("| ID | Title | Severity | Description |");
    lines.push("|---|---|---|---|");

    for (const rule of rules) {
      const sev = rule.severity === "error" ? "🔴 error" : rule.severity === "warning" ? "🟡 warning" : "🔵 info";
      lines.push(`| \`${rule.id}\` | ${rule.title} | ${sev} | ${rule.description} |`);
    }

    lines.push("");

    // Detailed descriptions
    for (const rule of rules) {
      lines.push(`### \`${rule.id}\` — ${rule.title}`);
      lines.push("");
      lines.push(`**Severity:** ${rule.severity} | **Category:** ${rule.category}${rule.languages ? ` | **Languages:** ${rule.languages.join(", ")}` : ""}`);
      lines.push("");
      lines.push(rule.description);
      lines.push("");
      lines.push(`**Rationale:** ${rule.rationale}`);
      lines.push("");

      if (rule.references && rule.references.length > 0) {
        lines.push("**References:**");
        for (const ref of rule.references) {
          if (ref.file) {
            const section = ref.section ? ` (${ref.section})` : "";
            lines.push(`- 📄 ${ref.label}: \`${ref.file}\`${section}`);
          } else if (ref.url) {
            lines.push(`- 🔗 [${ref.label}](${ref.url})`);
          }
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

const outPath = path.resolve(import.meta.dir, "../docs/RULES.md");
const content = buildMarkdown();
writeFileSync(outPath, content, "utf-8");
console.log(`Generated ${outPath} (${ALL_RULES.length} rules)`);
