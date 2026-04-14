/**
 * @file markdown.ts
 * @brief Super-level Markdown audit report generator.
 *
 * @remarks
 * Writes a fully-structured .md file with per-finding code blocks (snippet,
 * caret, note, help), inline rule explanations, proper skill-file references,
 * compliance matrix, hotspot files, and remediation guide.
 *
 * Two entry points:
 *   buildMarkdownReport() — pure function, returns the markdown string
 *   runMarkdownMode()     — runs the pipeline, writes the file, exits
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { runPipeline, ALL_RULES } from "@nirapod-audit/core";
import type { AuditConfig, AuditSummary, Diagnostic, RuleReference } from "@nirapod-audit/protocol";

// ── Timestamp ──────────────────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}-${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;
}

// ── Escaping ───────────────────────────────────────────────────────────────────

/** Escape pipe characters for markdown table cells. */
function esc(s: string): string { return String(s ?? "").replace(/\|/g, "\\|"); }

/** Truncate a string for table display. */
function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function sevBadge(sev: string): string {
  return sev === "error" ? "🔴 error" : sev === "warning" ? "🟡 warning" : "🔵 info";
}

function statusBadge(errors: number, warnings: number): string {
  if (errors > 0)   return "❌ FAIL";
  if (warnings > 0) return "⚠️ WARN";
  return "✅ PASS";
}

// ── Reference renderer ─────────────────────────────────────────────────────────

/**
 * Renders a single RuleReference to a markdown string.
 * - URL refs → clickable link
 * - File refs → code path with optional section
 */
function renderRef(r: RuleReference): string {
  if (r.url) {
    return `[${esc(r.label)}](${r.url})`;
  }
  if (r.file) {
    const section = r.section ? ` — *${esc(r.section)}*` : "";
    return `📄 **${esc(r.label)}**: \`${esc(r.file)}\`${section}`;
  }
  return `${esc(r.label)}`;
}

// ── Caret builder ──────────────────────────────────────────────────────────────

function buildCaret(snippet: string, startCol: number, endCol: number, singleLine: boolean): string {
  const firstLine = snippet.split("\n")[0] ?? "";
  const indent = " ".repeat(Math.max(0, startCol - 1));
  const width = singleLine && endCol > startCol
    ? endCol - startCol
    : Math.max(1, firstLine.trimEnd().length - startCol + 1);
  return indent + "^".repeat(Math.max(1, width));
}

// ── Category stats ─────────────────────────────────────────────────────────────

const CATEGORIES = ["LICENSE","DOXYGEN","TSDOC","RUSTDOC","NASA","CRYPTO","MEMORY","STYLE"] as const;
type CatName = typeof CATEGORIES[number];

interface CatStats { cat: CatName; ruleCount: number; errors: number; warnings: number; infos: number; }

function buildCategoryStats(summary: AuditSummary): CatStats[] {
  return CATEGORIES.map((cat) => {
    const rules = ALL_RULES.filter((r) => r.category === cat);
    let errors = 0, warnings = 0, infos = 0;
    for (const r of rules) {
      const hits = summary.ruleHits[r.id] ?? 0;
      if (r.severity === "error")   errors   += hits;
      if (r.severity === "warning") warnings += hits;
      if (r.severity === "info")    infos    += hits;
    }
    return { cat, ruleCount: rules.length, errors, warnings, infos };
  });
}

// ── FileStat ───────────────────────────────────────────────────────────────────

interface FileStat { file: string; errors: number; warnings: number; infos: number; total: number; }

// ── Section: Executive Summary ─────────────────────────────────────────────────

function sectionExecSummary(summary: AuditSummary, projectName: string, ts: string): string {
  const passed = summary.totalErrors === 0;
  const status = passed
    ? "✅ **PASSED** — no errors found"
    : `❌ **FAILED** — ${summary.totalErrors} error${summary.totalErrors !== 1 ? "s" : ""} found`;

  return [
    `# 🔍 Nirapod Audit Report`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **Project** | \`${esc(projectName)}\` |`,
    `| **Generated** | ${ts.replace(/-/g, "-")} |`,
    `| **Status** | ${status} |`,
    `| **Files scanned** | ${summary.scannedFiles} |`,
    `| **Files cached** | ${summary.skippedFiles} |`,
    `| 🔴 Errors | **${summary.totalErrors}** |`,
    `| 🟡 Warnings | **${summary.totalWarnings}** |`,
    `| 🔵 Info | **${summary.totalInfos}** |`,
    `| **Duration** | ${summary.durationMs} ms |`,
    `| **Exit code** | ${summary.totalErrors > 0 ? "1 (FAIL)" : "0 (PASS)"} |`,
    ``,
    `---`,
    ``,
  ].join("\n");
}

// ── Section: Compliance Matrix ─────────────────────────────────────────────────

function sectionComplianceMatrix(catStats: CatStats[]): string {
  const rows = catStats.map(({ cat, ruleCount, errors, warnings, infos }) =>
    `| ${cat} | ${ruleCount} | ${errors > 0 ? `**${errors}**` : "—"} | ${warnings > 0 ? `**${warnings}**` : "—"} | ${infos > 0 ? infos : "—"} | ${statusBadge(errors, warnings)} |`
  ).join("\n");

  return [
    `## 📊 Compliance Matrix`,
    ``,
    `| Category | Rules | 🔴 Errors | 🟡 Warnings | 🔵 Info | Status |`,
    `|----------|------:|----------:|------------:|--------:|--------|`,
    rows,
    ``,
    `---`,
    ``,
  ].join("\n");
}

// ── Section: Top Violated Rules ────────────────────────────────────────────────

function sectionTopRules(summary: AuditSummary): string {
  const top = Object.entries(summary.ruleHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  if (top.length === 0) return "";

  const rows = top.map(([id, count], i) => {
    const rule = ALL_RULES.find((r) => r.id === id);
    if (!rule) return "";
    return `| ${i + 1} | \`${id}\` | **${count}** | ${sevBadge(rule.severity)} | ${esc(trunc(rule.description, 60))} |`;
  }).filter(Boolean).join("\n");

  return [
    `## 🏆 Top Violated Rules`,
    ``,
    `| # | Rule ID | Hits | Severity | Description |`,
    `|---|---------|-----:|----------|-------------|`,
    rows,
    ``,
    `---`,
    ``,
  ].join("\n");
}

// ── Section: Hotspot Files ─────────────────────────────────────────────────────

function sectionHotspotFiles(fileStats: Map<string, FileStat>): string {
  const sorted = [...fileStats.values()]
    .filter((f) => f.total > 0)
    .sort((a, b) => b.errors - a.errors || b.total - a.total);

  if (sorted.length === 0) return "";

  const rows = sorted.map((f) =>
    `| \`${esc(f.file)}\` | ${f.errors > 0 ? `**${f.errors}**` : "—"} | ${f.warnings > 0 ? `**${f.warnings}**` : "—"} | ${f.infos > 0 ? f.infos : "—"} | **${f.total}** |`
  ).join("\n");

  return [
    `## 🔥 Hotspot Files`,
    ``,
    `| File | 🔴 Errors | 🟡 Warnings | 🔵 Info | Total |`,
    `|------|----------:|------------:|--------:|------:|`,
    rows,
    ``,
    `---`,
    ``,
  ].join("\n");
}

// ── Diagnostic renderer ────────────────────────────────────────────────────────

/**
 * Renders a single diagnostic as a full rustc-style markdown block with:
 * - Code fence with snippet + caret line
 * - note: / help: lines
 * - Rule details: rationale + references
 */
function renderDiagnostic(diag: Diagnostic, rootDir: string): string {
  const { rule, span, message, notes, help } = diag;
  const relPath = path.relative(rootDir, span.file);
  const singleLine = span.startLine === span.endLine;
  const lineNumWidth = Math.max(3, String(span.startLine).length);
  const gutter = " ".repeat(lineNumWidth + 1) + "|";

  const out: string[] = [];

  // Anchor for linking
  const anchorId = `finding-${rule.id}-${span.startLine}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  out.push(`<a id="${anchorId}"></a>`);
  out.push(``);

  // Severity heading with rule ID
  const sevEmoji = rule.severity === "error" ? "🔴" : rule.severity === "warning" ? "🟡" : "🔵";
  out.push(`#### ${sevEmoji} \`${rule.id}\` — ${esc(message)}`);
  out.push(``);

  // Location line (bold)
  out.push(`**Location:** [\`${esc(relPath)}:${span.startLine}:${span.startCol}\`](./${relPath})`);
  out.push(``);

  // Code fence with rustc-style output
  out.push("```");
  out.push(`  --> ${relPath}:${span.startLine}:${span.startCol}`);
  out.push(`   ${gutter}`);

  if (span.snippet) {
    const snippetLines = span.snippet.split("\n");
    for (let i = 0; i < snippetLines.length; i++) {
      const lineNo = String(span.startLine + i).padStart(lineNumWidth);
      out.push(`${lineNo} | ${snippetLines[i]}`);
      if (i === 0) {
        const caret = buildCaret(snippetLines[0]!, span.startCol, span.endCol, singleLine);
        out.push(`   ${gutter} ${caret}`);
      }
    }
  } else {
    out.push(`${String(span.startLine).padStart(lineNumWidth)} | (no snippet)`);
  }

  out.push(`   ${gutter}`);

  // Notes inside the code fence
  if (notes && notes.length > 0) {
    for (const note of notes) {
      out.push(`   = note: ${note}`);
    }
  }

  // Help inside the code fence
  if (help) {
    out.push(`   = help: ${help}`);
  }

  out.push("```");
  out.push(``);

  // Rule details block
  out.push(`<details>`);
  out.push(`<summary>📖 Rule details: <code>${rule.id}</code> — ${esc(rule.title)}</summary>`);
  out.push(``);
  out.push(`**Category:** ${rule.category}  `);
  out.push(`**Severity:** ${sevBadge(rule.severity)}  `);
  out.push(``);
  out.push(`**Description:** ${esc(rule.description)}`);
  out.push(``);
  out.push(`**Rationale:** ${esc(rule.rationale)}`);
  out.push(``);

  if (rule.references && rule.references.length > 0) {
    const validRefs = rule.references.filter((r) => r.url || r.file);
    if (validRefs.length > 0) {
      out.push(`**References:**`);
      out.push(``);
      for (const ref of validRefs) {
        out.push(`- ${renderRef(ref)}`);
      }
      out.push(``);
    }
  }

  out.push(`</details>`);
  out.push(``);
  out.push(`---`);
  out.push(``);

  return out.join("\n");
}

// ── Section: Findings by file ──────────────────────────────────────────────────

function sectionFindingsByFile(allDiags: Diagnostic[], rootDir: string): string {
  if (allDiags.length === 0) return "";

  const byFile = new Map<string, Diagnostic[]>();
  for (const d of allDiags) {
    const rel = path.relative(rootDir, d.span.file);
    const arr = byFile.get(rel) ?? [];
    arr.push(d);
    byFile.set(rel, arr);
  }

  // Sort files: most errors first
  const sorted = [...byFile.entries()].sort(([, a], [, b]) => {
    const aE = a.filter((d) => d.rule.severity === "error").length;
    const bE = b.filter((d) => d.rule.severity === "error").length;
    if (bE !== aE) return bE - aE;
    return b.length - a.length;
  });

  const out: string[] = [`## 📋 Findings by File`, ``];

  for (const [file, diags] of sorted) {
    const byLine = [...diags].sort((a, b) => a.span.startLine - b.span.startLine);
    const errN = byLine.filter((d) => d.rule.severity === "error").length;
    const warnN = byLine.filter((d) => d.rule.severity === "warning").length;
    const infoN = byLine.filter((d) => d.rule.severity === "info").length;

    const badge = [
      errN > 0 ? `**${errN} error${errN !== 1 ? "s" : ""}**` : "",
      warnN > 0 ? `**${warnN} warning${warnN !== 1 ? "s" : ""}**` : "",
      infoN > 0 ? `${infoN} info` : "",
    ].filter(Boolean).join("  ·  ");

    out.push(`### \`${file}\``);
    out.push(``);
    out.push(badge);
    out.push(``);

    for (const diag of byLine) {
      out.push(renderDiagnostic(diag, rootDir));
    }
  }

  return out.join("\n");
}

// ── Section: Remediation guide ─────────────────────────────────────────────────

function sectionRemediation(summary: AuditSummary): string {
  const errorRules = Object.entries(summary.ruleHits)
    .map(([id, count]) => ({ id, count, rule: ALL_RULES.find((r) => r.id === id) }))
    .filter((x) => x.rule?.severity === "error" && x.count > 0)
    .sort((a, b) => b.count - a.count);

  const warnRules = Object.entries(summary.ruleHits)
    .map(([id, count]) => ({ id, count, rule: ALL_RULES.find((r) => r.id === id) }))
    .filter((x) => x.rule?.severity === "warning" && x.count > 0)
    .sort((a, b) => b.count - a.count);

  if (errorRules.length === 0 && warnRules.length === 0) return "";

  const out: string[] = [`## 🛠 Remediation Guide`, ``];

  if (errorRules.length > 0) {
    const total = errorRules.reduce((s, r) => s + r.count, 0);
    out.push(`### Priority 1 — Errors (${total} findings)`);
    out.push(``);

    for (const { id, count, rule } of errorRules) {
      if (!rule) continue;
      out.push(`#### \`${id}\` — ${esc(rule.title)} (×${count})`);
      out.push(``);
      out.push(`**Description:** ${esc(rule.description)}`);
      out.push(``);
      out.push(`**Rationale:** ${esc(rule.rationale)}`);
      out.push(``);

      const validRefs = (rule.references ?? []).filter((r) => r.url || r.file);
      if (validRefs.length > 0) {
        out.push(`**References:**`);
        for (const ref of validRefs) {
          out.push(`- ${renderRef(ref)}`);
        }
        out.push(``);
      }
    }
  }

  if (warnRules.length > 0) {
    const total = warnRules.reduce((s, r) => s + r.count, 0);
    out.push(`### Priority 2 — Warnings (${total} findings)`);
    out.push(``);

    for (const { id, count, rule } of warnRules) {
      if (!rule) continue;
      out.push(`#### \`${id}\` — ${esc(rule.title)} (×${count})`);
      out.push(``);
      out.push(`**Description:** ${esc(rule.description)}`);
      out.push(``);

      const validRefs = (rule.references ?? []).filter((r) => r.url || r.file);
      if (validRefs.length > 0) {
        out.push(`**References:**`);
        for (const ref of validRefs) {
          out.push(`- ${renderRef(ref)}`);
        }
        out.push(``);
      }
    }
  }

  out.push(`---`);
  out.push(``);
  return out.join("\n");
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function sectionFooter(summary: AuditSummary, outFile: string): string {
  return [
    `---`,
    ``,
    `*Generated by **nirapod-audit v0.1.0** · ${new Date().toUTCString()}*  `,
    `*${summary.scannedFiles} files scanned · ${summary.durationMs} ms · exit ${summary.totalErrors > 0 ? 1 : 0}*  `,
    `*Report: \`${path.basename(outFile)}\`*`,
    ``,
  ].join("\n");
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Pure function — assembles the complete markdown report string.
 * Does NOT write to disk or call process.exit().
 *
 * @param allDiags - All diagnostics from the audit run.
 * @param summary  - Aggregated summary from the pipeline.
 * @param rootDir  - Absolute root directory (for relative paths).
 * @param outFile  - Intended output path (used in footer).
 * @returns        The complete markdown report as a string.
 */
export function buildMarkdownReport(
  allDiags: Diagnostic[],
  summary: AuditSummary,
  rootDir: string,
  outFile: string,
): string {
  const ts = timestamp();
  const projectName = path.basename(rootDir);
  const catStats = buildCategoryStats(summary);

  // Build file stats from diagnostics (since we may not have file_done events here)
  const fileStats = new Map<string, FileStat>();
  for (const d of allDiags) {
    const rel = path.relative(rootDir, d.span.file);
    const s = fileStats.get(rel) ?? { file: rel, errors: 0, warnings: 0, infos: 0, total: 0 };
    if (d.rule.severity === "error")   s.errors++;
    if (d.rule.severity === "warning") s.warnings++;
    if (d.rule.severity === "info")    s.infos++;
    s.total++;
    fileStats.set(rel, s);
  }

  return [
    sectionExecSummary(summary, projectName, ts),
    sectionComplianceMatrix(catStats),
    sectionTopRules(summary),
    sectionHotspotFiles(fileStats),
    sectionFindingsByFile(allDiags, rootDir),
    sectionRemediation(summary),
    sectionFooter(summary, outFile),
  ].join("");
}

/**
 * Runs the audit pipeline, writes a markdown report to disk, and
 * prints a compact one-line summary to stdout (no overflow).
 *
 * @param targetPath - Absolute path to audit target.
 * @param config     - Active audit configuration.
 */
export async function runMarkdownMode(
  targetPath: string,
  config: AuditConfig,
): Promise<void> {
  const rootDir = path.resolve(targetPath);
  const allDiags: Diagnostic[] = [];
  let summary: AuditSummary | null = null;

  for await (const event of runPipeline(targetPath, config)) {
    if (event.type === "diagnostic") allDiags.push(event.data);
    if (event.type === "audit_done") summary = event.summary;
  }

  if (!summary) throw new Error("audit did not complete");

  const ts = timestamp();
  const reportDir = path.join(rootDir, ".nirapod", "audit");
  if (!require("node:fs").existsSync(reportDir)) {
    require("node:fs").mkdirSync(reportDir, { recursive: true });
  }
  const outFile = path.join(reportDir, `nirapod-report-${ts}.md`);
  const md = buildMarkdownReport(allDiags, summary, rootDir, outFile);
  writeFileSync(outFile, md, "utf8");

  // Compact terminal output — no overflow
  const R = "\x1b[0m", B = "\x1b[1m", D = "\x1b[2m";
  const RED = "\x1b[31m", GRN = "\x1b[32m", YLW = "\x1b[33m", CYN = "\x1b[36m", MAG = "\x1b[35m";
  const passed = summary.totalErrors === 0;
  const statusStr = passed ? `${GRN}${B}PASS${R}` : `${RED}${B}FAIL${R}`;

  console.log();
  console.log(`  ${MAG}${B}▓▓ nirapod-audit${R}${D} v0.1.0${R}  ${statusStr}`);
  console.log(`  ${D}${summary.scannedFiles} files · ${summary.durationMs} ms${R}`);
  console.log(`  ${RED}${B}${summary.totalErrors}${R} errors  ${YLW}${summary.totalWarnings}${R} warnings  ${CYN}${summary.totalInfos}${R} info`);
  console.log();
  console.log(`  ${B}📄 Report written to:${R}`);
  console.log(`  ${CYN}${outFile}${R}`);
  console.log();

  process.exit(passed ? 0 : 1);
}
