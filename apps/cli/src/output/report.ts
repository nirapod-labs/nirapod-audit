/**
 * @file report.ts
 * @brief Detailed audit report output for the CLI.
 *
 * @remarks
 * Generates a comprehensive, human-readable report to stdout with:
 * per-file breakdown, top violated rules, hotspot files, category
 * stats, and remediation priorities. Designed for terminal display
 * and piping to markdown files.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { runPipeline, ALL_RULES } from "@nirapod-audit/core";
import type { AuditConfig, Diagnostic, AuditSummary } from "@nirapod-audit/protocol";
import path from "node:path";

/** Severity colour codes for terminal. */
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
};

/**
 * Runs the audit and outputs a detailed report.
 *
 * @param targetPath - Absolute path to audit target.
 * @param config - Active audit configuration.
 */
export async function runReportMode(
  targetPath: string,
  config: AuditConfig,
): Promise<void> {
  const rootDir = path.resolve(targetPath);
  const allDiags: Diagnostic[] = [];
  let summary: AuditSummary | null = null;

  const fileStats: Map<string, { errors: number; warnings: number; infos: number }> = new Map();

  for await (const event of runPipeline(targetPath, config)) {
    if (event.type === "diagnostic") {
      allDiags.push(event.data);
    }
    if (event.type === "file_done") {
      const rel = path.relative(rootDir, event.file);
      fileStats.set(rel, { errors: event.errors, warnings: event.warnings, infos: event.infos });
    }
    if (event.type === "audit_done") {
      summary = event.summary;
    }
  }

  if (!summary) {
    console.error("error: audit did not complete.");
    process.exit(2);
  }

  const passed = summary.totalErrors === 0;
  const targetName = path.basename(rootDir);

  // ── Header ──
  console.log();
  console.log(`${C.magenta}${C.bold}  ▓▓ nirapod-audit${C.reset}${C.dim} v0.1.0${C.reset}`);
  console.log(`${C.dim}  Detailed Audit Report — ${targetName}${C.reset}`);
  console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);
  console.log();

  // ── Executive Summary ──
  const statusIcon = passed ? `${C.bgGreen}${C.bold} PASS ${C.reset}` : `${C.bgRed}${C.bold} FAIL ${C.reset}`;
  console.log(`  ${statusIcon}  ${summary.totalFiles} files · ${summary.durationMs} ms`);
  console.log();
  console.log(`  ${C.red}${C.bold}${summary.totalErrors}${C.reset} errors  ${C.yellow}${summary.totalWarnings}${C.reset} warnings  ${C.cyan}${summary.totalInfos}${C.reset} info`);
  console.log();

  // ── Category Breakdown ──
  console.log(`${C.bold}  CATEGORY BREAKDOWN${C.reset}`);
  console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);
  console.log(`  ${"Category".padEnd(12)} ${"Rules".padStart(6)} ${"Errors".padStart(8)} ${"Warn".padStart(7)} ${"Info".padStart(6)}  Status`);
  console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);

  const categories = ["LICENSE", "DOXYGEN", "NASA", "CRYPTO", "MEMORY", "STYLE"] as const;
  for (const cat of categories) {
    const rulesInCat = ALL_RULES.filter((r) => r.category === cat);
    let catErrors = 0;
    let catWarnings = 0;
    let catInfos = 0;
    for (const rule of rulesInCat) {
      const hits = summary.ruleHits[rule.id] ?? 0;
      if (rule.severity === "error") catErrors += hits;
      else if (rule.severity === "warning") catWarnings += hits;
      else catInfos += hits;
    }
    const status = catErrors > 0 ? `${C.red}✗ FAIL${C.reset}` :
      catWarnings > 0 ? `${C.yellow}~ WARN${C.reset}` :
        `${C.green}✓ PASS${C.reset}`;
    const errStr = catErrors > 0 ? `${C.red}${C.bold}${String(catErrors).padStart(8)}${C.reset}` : `${C.dim}${String(catErrors).padStart(8)}${C.reset}`;
    const warnStr = catWarnings > 0 ? `${C.yellow}${String(catWarnings).padStart(7)}${C.reset}` : `${C.dim}${String(catWarnings).padStart(7)}${C.reset}`;
    const infoStr = catInfos > 0 ? `${C.cyan}${String(catInfos).padStart(6)}${C.reset}` : `${C.dim}${String(catInfos).padStart(6)}${C.reset}`;

    console.log(`  ${cat.padEnd(12)} ${C.dim}${String(rulesInCat.length).padStart(6)}${C.reset} ${errStr} ${warnStr} ${infoStr}  ${status}`);
  }
  console.log();

  // ── Top Violated Rules ──
  const topRules = Object.entries(summary.ruleHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  if (topRules.length > 0) {
    console.log(`${C.bold}  TOP VIOLATED RULES${C.reset}`);
    console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);
    console.log(`  ${"#".padStart(3)}  ${"Rule".padEnd(18)} ${"Hits".padStart(5)}  ${"Sev".padEnd(8)} Description`);
    console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);

    topRules.forEach(([id, count], i) => {
      const rule = ALL_RULES.find((r) => r.id === id);
      if (!rule) return;
      const sevColor = rule.severity === "error" ? C.red : rule.severity === "warning" ? C.yellow : C.cyan;
      const desc = rule.description.length > 40 ? rule.description.slice(0, 37) + "..." : rule.description;
      console.log(
        `  ${String(i + 1).padStart(3)}  ${id.padEnd(18)} ${C.bold}${String(count).padStart(5)}${C.reset}  ${sevColor}${rule.severity.padEnd(8)}${C.reset} ${desc}`
      );
    });
    console.log();
  }

  // ── Hotspot Files ──
  const fileList = [...fileStats.entries()]
    .map(([file, stats]) => ({ file, total: stats.errors + stats.warnings + stats.infos, ...stats }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total);

  if (fileList.length > 0) {
    console.log(`${C.bold}  FILE BREAKDOWN${C.reset} (${fileList.length} files with findings)`);
    console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);
    console.log(`  ${"File".padEnd(50)} ${"Err".padStart(5)} ${"Warn".padStart(6)} ${"Info".padStart(6)}`);
    console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);

    for (const f of fileList) {
      const name = f.file.length > 48 ? "…" + f.file.slice(-(47)) : f.file;
      const errStr = f.errors > 0 ? `${C.red}${String(f.errors).padStart(5)}${C.reset}` : `${C.dim}${String(f.errors).padStart(5)}${C.reset}`;
      const warnStr = f.warnings > 0 ? `${C.yellow}${String(f.warnings).padStart(6)}${C.reset}` : `${C.dim}${String(f.warnings).padStart(6)}${C.reset}`;
      const infoStr = f.infos > 0 ? `${C.cyan}${String(f.infos).padStart(6)}${C.reset}` : `${C.dim}${String(f.infos).padStart(6)}${C.reset}`;
      console.log(`  ${name.padEnd(50)} ${errStr} ${warnStr} ${infoStr}`);
    }
    console.log();
  }

  // ── Per-rule detail for each category ──
  for (const cat of categories) {
    const rulesInCat = ALL_RULES.filter((r) => r.category === cat);
    const firedRules = rulesInCat.filter((r) => (summary.ruleHits[r.id] ?? 0) > 0);
    if (firedRules.length === 0) continue;

    const catColor = firedRules.some((r) => r.severity === "error") ? C.red :
      firedRules.some((r) => r.severity === "warning") ? C.yellow : C.cyan;

    console.log(`${C.bold}  ${catColor}${cat} DETAILS${C.reset}`);
    console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);

    for (const rule of firedRules) {
      const count = summary.ruleHits[rule.id] ?? 0;
      const sevColor = rule.severity === "error" ? C.red : rule.severity === "warning" ? C.yellow : C.cyan;
      console.log(`  ${sevColor}${rule.id}${C.reset} × ${C.bold}${count}${C.reset} — ${rule.title}`);
      console.log(`${C.dim}    ${rule.description}${C.reset}`);
      if (rule.rationale.length <= 120) {
        console.log(`${C.dim}    ↳ ${rule.rationale}${C.reset}`);
      }
      console.log();
    }
  }

  // ── Footer ──
  console.log(`${C.dim}  ${"─".repeat(60)}${C.reset}`);
  console.log(`  ${C.dim}Duration: ${summary.durationMs} ms · Files: ${summary.totalFiles} · Passed: ${summary.passedFiles} · Failed: ${summary.failedFiles}${C.reset}`);
  console.log(`  ${C.dim}Exit: ${passed ? "0 (PASS)" : "1 (FAIL)"}${C.reset}`);
  console.log();

  process.exit(passed ? 0 : 1);
}
