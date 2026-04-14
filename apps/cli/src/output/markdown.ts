/**
 * @file markdown.ts
 * @brief Super-level Markdown audit report generator.
 *
 * @remarks
 * Writes a fully-structured .md file with:
 *   - Executive summary table
 *   - Compliance matrix per category
 *   - Top-violated-rules table
 *   - Per-file breakdown (sorted by severity)
 *   - Every finding rendered with rustc-style snippet + caret + note + help
 *   - Hotspot files table
 *   - Remediation priority guide
 *
 * The file is written to the cwd as nirapod-report-YYYY-MM-DD-HH-MM-SS.md.
 * The terminal only receives a compact summary line — NO overflow.
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
import type { AuditConfig, AuditSummary, Diagnostic } from "@nirapod-audit/protocol";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Zero-pad a number to two digits. */
function pad2(n: number): string { return String(n).padStart(2, "0"); }

/** Build a timestamp string safe for filenames. */
function timestamp(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    pad2(d.getMonth() + 1),
    pad2(d.getDate()),
    pad2(d.getHours()),
    pad2(d.getMinutes()),
    pad2(d.getSeconds()),
  ].join("-");
}

/** Escape pipe chars inside markdown table cells. */
function esc(s: string): string { return s.replace(/\|/g, "\\|"); }

/** Severity badge for markdown. */
function sevBadge(sev: string): string {
  switch (sev) {
    case "error":   return "🔴 error";
    case "warning": return "🟡 warning";
    case "info":    return "🔵 info";
    default:        return sev;
  }
}

/** Status badge for markdown compliance matrix. */
function statusBadge(errors: number, warnings: number): string {
  if (errors > 0)   return "❌ FAIL";
  if (warnings > 0) return "⚠️ WARN";
  return "✅ PASS";
}

// ── Caret builder ──────────────────────────────────────────────────────────────

/**
 * Builds the caret line (^^^) aligned to the span column.
 * Used inside fenced code blocks in the markdown output.
 */
function buildCaret(
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
  return indent + "^".repeat(Math.max(1, width));
}

// ── Section builders ───────────────────────────────────────────────────────────

const CATEGORIES = [
  "LICENSE", "DOXYGEN", "TSDOC", "RUSTDOC", "NASA", "CRYPTO", "MEMORY", "STYLE",
] as const;

type CatName = typeof CATEGORIES[number];

interface CatStats {
  cat: CatName;
  ruleCount: number;
  errors: number;
  warnings: number;
  infos: number;
}

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

// ── Section: Executive Summary ─────────────────────────────────────────────────

function sectionExecSummary(
  summary: AuditSummary,
  targetName: string,
  ts: string,
  outFile: string,
): string {
  const passed = summary.totalErrors === 0;
  const statusLine = passed
    ? "✅ **PASSED** — no errors found"
    : `❌ **FAILED** — ${summary.totalErrors} error${summary.totalErrors !== 1 ? "s" : ""} found`;

  return [
    `# 🔍 Nirapod Audit Report`,
    ``,
    `**Project:** \`${targetName}\`  `,
    `**Generated:** ${ts.replace(/-/g, "-")}  `,
    `**Report file:** \`${path.basename(outFile)}\`  `,
    `**Status:** ${statusLine}`,
    ``,
    `---`,
    ``,
    `## Executive Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Files scanned | ${summary.scannedFiles} |`,
    `| Files cached (skipped) | ${summary.skippedFiles} |`,
    `| Total files | ${summary.totalFiles} |`,
    `| 🔴 Errors | **${summary.totalErrors}** |`,
    `| 🟡 Warnings | **${summary.totalWarnings}** |`,
    `| 🔵 Info | **${summary.totalInfos}** |`,
    `| Duration | ${summary.durationMs} ms |`,
    `| Exit code | ${summary.totalErrors > 0 ? "1 (FAIL)" : "0 (PASS)"} |`,
    ``,
  ].join("\n");
}

// ── Section: Compliance Matrix ─────────────────────────────────────────────────

function sectionComplianceMatrix(catStats: CatStats[]): string {
  const header = `## Compliance Matrix\n\n| Category | Rules | 🔴 Errors | 🟡 Warnings | 🔵 Info | Status |\n|----------|------:|----------:|------------:|--------:|--------|\n`;
  const rows = catStats.map(({ cat, ruleCount, errors, warnings, infos }) =>
    `| ${cat} | ${ruleCount} | ${errors || "—"} | ${warnings || "—"} | ${infos || "—"} | ${statusBadge(errors, warnings)} |`
  ).join("\n");
  return header + rows + "\n\n---\n\n";
}

// ── Section: Top Violated Rules ────────────────────────────────────────────────

function sectionTopRules(summary: AuditSummary): string {
  const top = Object.entries(summary.ruleHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  if (top.length === 0) return "";

  const header = `## Top Violated Rules\n\n| # | Rule ID | Hits | Severity | Description |\n|---|---------|-----:|---------:|-------------|\n`;
  const rows = top.map(([id, count], i) => {
    const rule = ALL_RULES.find((r) => r.id === id);
    const desc = rule ? esc(rule.description.slice(0, 60)) : "—";
    const sev  = rule ? sevBadge(rule.severity) : "—";
    return `| ${i + 1} | \`${id}\` | **${count}** | ${sev} | ${desc} |`;
  }).join("\n");

  return header + rows + "\n\n---\n\n";
}

// ── Section: Hotspot Files ─────────────────────────────────────────────────────

interface FileStat { file: string; errors: number; warnings: number; infos: number; total: number }

function sectionHotspotFiles(fileStats: Map<string, FileStat>): string {
  const sorted = [...fileStats.values()]
    .filter((f) => f.total > 0)
    .sort((a, b) => b.errors - a.errors || b.total - a.total);

  if (sorted.length === 0) return "";

  const header = `## Hotspot Files\n\n| File | 🔴 Errors | 🟡 Warnings | 🔵 Info | Total |\n|------|----------:|------------:|--------:|------:|\n`;
  const rows = sorted.map((f) =>
    `| \`${esc(f.file)}\` | ${f.errors || "—"} | ${f.warnings || "—"} | ${f.infos || "—"} | **${f.total}** |`
  ).join("\n");

  return header + rows + "\n\n---\n\n";
}

// ── Section: Per-file findings ─────────────────────────────────────────────────

/**
 * Renders a single diagnostic in full rustc-style markdown.
 *
 * Produces:
 *   #### severity[RULE-ID]: message
 *   ```
 *     --> file:line:col
 *   line | snippet
 *        | ^^^^^^
 *   ```
 *   > note: ...
 *   > help: ...
 */
function renderDiagnostic(diag: Diagnostic, rootDir: string): string {
  const { rule, span, message, notes, help } = diag;
  const relPath = path.relative(rootDir, span.file);
  const singleLine = span.startLine === span.endLine;
  const lineNumWidth = Math.max(3, String(span.startLine).length);
  const gutter = " ".repeat(lineNumWidth + 1) + "| ";

  const lines: string[] = [];

  // Heading
  lines.push(`#### ${rule.severity}[${rule.id}]: ${message}`);
  lines.push(``);

  // Code block with snippet
  lines.push("```");
  lines.push(`  --> ${relPath}:${span.startLine}:${span.startCol}`);
  lines.push(`   ${gutter.trimEnd()}`);

  if (span.snippet) {
    const snippetLines = span.snippet.split("\n");
    snippetLines.forEach((snippetLine, i) => {
      const lineNo = String(span.startLine + i).padStart(lineNumWidth);
      lines.push(`${lineNo} | ${snippetLine}`);
      // Caret line on first snippet line only
      if (i === 0) {
        const caret = buildCaret(snippetLine, span.startCol, span.endCol, singleLine);
        lines.push(`${gutter}${caret}`);
      }
    });
  } else {
    lines.push(`${String(span.startLine).padStart(lineNumWidth)} | (no snippet available)`);
  }

  lines.push(`   ${gutter.trimEnd()}`);
  lines.push("```");
  lines.push(``);

  // Notes
  if (notes && notes.length > 0) {
    for (const note of notes) {
      lines.push(`> **note:** ${note}  `);
    }
  }

  // Help
  if (help) {
    lines.push(`> **help:** ${help}  `);
  }

  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  return lines.join("\n");
}

/**
 * Builds the full per-file section: groups diagnostics by file, sorted by
 * file severity then line number.
 */
function sectionFindingsByFile(
  allDiags: Diagnostic[],
  rootDir: string,
): string {
  // Group by file
  const byFile = new Map<string, Diagnostic[]>();
  for (const d of allDiags) {
    const rel = path.relative(rootDir, d.span.file);
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel)!.push(d);
  }

  if (byFile.size === 0) return "";

  // Sort files: most errors first, then most warnings
  const sortedFiles = [...byFile.entries()].sort(([, a], [, b]) => {
    const aErr = a.filter((d) => d.rule.severity === "error").length;
    const bErr = b.filter((d) => d.rule.severity === "error").length;
    if (bErr !== aErr) return bErr - aErr;
    return b.length - a.length;
  });

  const out: string[] = ["## Findings by File\n"];

  for (const [file, diags] of sortedFiles) {
    // Sort diagnostics within file by line
    const sorted = [...diags].sort((a, b) => a.span.startLine - b.span.startLine);
    const errors   = sorted.filter((d) => d.rule.severity === "error").length;
    const warnings = sorted.filter((d) => d.rule.severity === "warning").length;
    const infos    = sorted.filter((d) => d.rule.severity === "info").length;

    const parts: string[] = [];
    if (errors)   parts.push(`**${errors} error${errors !== 1 ? "s" : ""}**`);
    if (warnings) parts.push(`**${warnings} warning${warnings !== 1 ? "s" : ""}**`);
    if (infos)    parts.push(`**${infos} info**`);

    out.push(`### \`${file}\``);
    out.push(``);
    out.push(parts.join(" · "));
    out.push(``);
    out.push(`---`);
    out.push(``);

    for (const diag of sorted) {
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

  const lines: string[] = ["## Remediation Guide\n"];

  if (errorRules.length > 0) {
    lines.push(`### Priority 1 — Errors (${errorRules.reduce((s, r) => s + r.count, 0)} findings)\n`);
    for (const { id, count, rule } of errorRules) {
      if (!rule) continue;
      lines.push(`#### \`${id}\` — ${esc(rule.title)} (×${count})\n`);
      lines.push(`${esc(rule.description)}\n`);
      lines.push(`**Why it matters:** ${esc(rule.rationale)}\n`);
      if (rule.references && rule.references.length > 0) {
        const refs = rule.references.map((r) => `[${esc(r.title ?? r.url)}](${r.url})`).join(", ");
        lines.push(`**References:** ${refs}\n`);
      }
    }
  }

  if (warnRules.length > 0) {
    lines.push(`### Priority 2 — Warnings (${warnRules.reduce((s, r) => s + r.count, 0)} findings)\n`);
    for (const { id, count, rule } of warnRules) {
      if (!rule) continue;
      lines.push(`#### \`${id}\` — ${esc(rule.title)} (×${count})\n`);
      lines.push(`${esc(rule.description)}\n`);
    }
  }

  return lines.join("\n");
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function sectionFooter(summary: AuditSummary): string {
  return [
    `---`,
    ``,
    `*Generated by **nirapod-audit v0.1.0** · ${new Date().toUTCString()}*  `,
    `*${summary.scannedFiles} files scanned · ${summary.durationMs} ms · exit ${summary.totalErrors > 0 ? 1 : 0}*`,
    ``,
  ].join("\n");
}

// ── Assemble & write ───────────────────────────────────────────────────────────

/**
 * Runs the audit pipeline, assembles a full markdown report, writes it to
 * disk, and prints a compact one-line summary to stdout.
 *
 * @param targetPath - Absolute path to audit target.
 * @param config - Active audit configuration.
 * @returns The path of the written report file.
 */
export async function runMarkdownMode(
  targetPath: string,
  config: AuditConfig,
): Promise<string> {
  const rootDir = path.resolve(targetPath);
  const targetName = path.basename(rootDir);
  const allDiags: Diagnostic[] = [];
  const fileStats = new Map<string, FileStat>();
  let summary: AuditSummary | null = null;

  for await (const event of runPipeline(targetPath, config)) {
    if (event.type === "diagnostic") {
      allDiags.push(event.data);
    }
    if (event.type === "file_done") {
      const rel = path.relative(rootDir, event.file);
      const total = event.errors + event.warnings + event.infos;
      fileStats.set(rel, { file: rel, errors: event.errors, warnings: event.warnings, infos: event.infos, total });
    }
    if (event.type === "audit_done") {
      summary = event.summary;
    }
  }

  if (!summary) throw new Error("audit did not complete");

  const ts = timestamp();
  const outFile = path.join(process.cwd(), `nirapod-report-${ts}.md`);

  const catStats = buildCategoryStats(summary);

  const md = [
    sectionExecSummary(summary, targetName, ts, outFile),
    sectionComplianceMatrix(catStats),
    sectionTopRules(summary),
    sectionHotspotFiles(fileStats),
    sectionFindingsByFile(allDiags, rootDir),
    sectionRemediation(summary),
    sectionFooter(summary),
  ].join("");

  writeFileSync(outFile, md, "utf8");

  // Compact terminal summary (NO overflow)
  const C = {
    reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
    red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
    cyan: "\x1b[36m", magenta: "\x1b[35m",
  };
  const passed = summary.totalErrors === 0;
  const statusStr = passed
    ? `${C.green}${C.bold}PASS${C.reset}`
    : `${C.red}${C.bold}FAIL${C.reset}`;

  console.log();
  console.log(`  ${C.magenta}${C.bold}▓▓ nirapod-audit${C.reset}${C.dim} v0.1.0${C.reset}  ${statusStr}`);
  console.log(`  ${C.dim}${summary.scannedFiles} files · ${summary.durationMs} ms${C.reset}`);
  console.log(`  ${C.red}${C.bold}${summary.totalErrors}${C.reset} errors  ${C.yellow}${summary.totalWarnings}${C.reset} warnings  ${C.cyan}${summary.totalInfos}${C.reset} info`);
  console.log();
  console.log(`  ${C.bold}Report written to:${C.reset}`);
  console.log(`  ${C.cyan}${outFile}${C.reset}`);
  console.log();

  process.exit(passed ? 0 : 1);
}
