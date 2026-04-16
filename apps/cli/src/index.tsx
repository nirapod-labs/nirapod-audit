#!/usr/bin/env bun
/**
 * @file index.tsx
 * @brief CLI entry point for nirapod-audit.
 *
 * @remarks
 * Routing:
 *   nirapod-audit               → interactive home TUI
 *   nirapod-audit audit <path>  → TUI audit (default) or other output format
 *   nirapod-audit rules         → rule catalog
 *   nirapod-audit explain <id>  → rule explanation
 *
 * Output formats:
 *   tui       (default) — Ink TUI, auto-writes .md report on completion
 *   markdown  — headless, writes nirapod-report-*.md, compact stdout
 *   json      — raw NDJSON stream
 *   sarif     — SARIF 2.1.0 single JSON document
 *   report    — ANSI terminal report (legacy)
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadConfig } from "@nirapod-audit/core";
import { runAuditTui } from "./commands/audit.js";
import { runHome } from "./commands/home.js";
import { runRulesHuman, runRulesJson } from "./commands/rules.js";
import { runExplainHuman, runExplainJson } from "./commands/explain.js";
import { runAgentMode } from "./output/agent.js";
import { runSarifMode } from "./output/sarif.js";
import { runReportMode } from "./output/report.js";
import { runMarkdownMode } from "./output/markdown.js";

type OutputFormat = "tui" | "markdown" | "json" | "sarif" | "report";

const VALID_FORMATS = new Set<string>(["tui", "human", "markdown", "json", "sarif", "report"]);

function parseOutputFormat(argv: string[]): { format: OutputFormat; rest: string[] } {
  const idx = argv.indexOf("--output");
  if (idx >= 0 && argv[idx + 1]) {
    const value = argv[idx + 1] as string;
    if (!VALID_FORMATS.has(value)) {
      console.error(`error: unsupported format "${value}". Use: tui, markdown, json, sarif, report`);
      process.exit(2);
    }
    const rest = [...argv.slice(0, idx), ...argv.slice(idx + 2)];
    const fmt: OutputFormat = value === "human" ? "tui" : value as OutputFormat;
    return { format: fmt, rest };
  }
  return { format: "tui", rest: argv };
}

function showHelp(): never {
  console.log(`
nirapod-audit v0.2.0 — Deterministic C/C++ auditor

Usage:
  nirapod-audit                  Interactive home screen
  nirapod-audit audit <path>     Audit a file or directory
  nirapod-audit rules            List all rules
  nirapod-audit explain <id>     Explain a rule in detail

Output formats (--output <format>):
  tui        Live TUI with streaming diagnostics, auto-saves .md (default)
  markdown   Headless: writes nirapod-report-*.md, compact stdout summary
  json       NDJSON stream — one JSON event per line
  sarif      SARIF 2.1.0 — for GitHub Code Scanning
  report     ANSI terminal report

Examples:
  nirapod-audit audit ./src
  nirapod-audit audit ./src --output markdown
  nirapod-audit audit ./src --output sarif > audit.sarif
  nirapod-audit explain NRP-NASA-006
  nirapod-audit rules --output json
`);
  process.exit(0);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const { format, rest } = parseOutputFormat(args);
const command = rest[0];

// No command → interactive home
if (!command) {
  await runHome();
  process.exit(0);
}

if (command === "--help" || command === "-h") {
  showHelp();
}

switch (command) {
  case "audit": {
    const targetPath = rest[1];
    if (!targetPath) {
      console.error("error: missing target path. Usage: nirapod-audit audit <path>");
      process.exit(2);
    }

    const resolvedTarget = path.resolve(targetPath);

    // Enforce nirapod-skills existence
    const findRoot = (startDir: string) => {
      let dir = startDir;
      while (true) {
        if (existsSync(path.join(dir, ".agents")) || existsSync(path.join(dir, "package.json"))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      return startDir;
    };
    const rootDir = findRoot(resolvedTarget);
    const skillPaths = [
      path.join(rootDir, ".agents", "skills"),
      path.join(rootDir, ".claude", "skills"),
      path.join(rootDir, ".cursor", "skills"),
    ];
    const hasSkills = skillPaths.some((p) => existsSync(p));
    if (!hasSkills) {
      console.warn("⚠  Nirapod Agent Skills missing (checked .agents, .claude, .cursor).");
      console.warn("   Auto-installing via bunx…\n");
      const result = spawnSync("bunx", ["skills", "nirapod-labs/nirapod-skills"], { stdio: "inherit" });
      if (result.error || result.status !== 0) {
        console.error("\nFailed to auto-install nirapod-skills.");
        process.exit(1);
      }
      console.log("\n✓ Skills synced!\n");
    }

    const { config, configPath } = loadConfig(resolvedTarget);

    switch (format) {
      case "json":       runAgentMode(resolvedTarget, config);                          break;
      case "sarif":      runSarifMode(resolvedTarget, config);                          break;
      case "markdown":   runMarkdownMode(resolvedTarget, config);                       break;
      case "report":     runReportMode(resolvedTarget, config);                         break;
      default:           runAuditTui(resolvedTarget, config, configPath);               break;
    }
    break;
  }

  case "rules":
    if (format === "json") runRulesJson();
    else runRulesHuman();
    break;

  case "explain": {
    const ruleId = rest[1];
    if (!ruleId) {
      console.error("error: missing rule ID. Usage: nirapod-audit explain <rule-id>");
      process.exit(2);
    }
    if (format === "json") runExplainJson(ruleId);
    else runExplainHuman(ruleId);
    break;
  }

  default:
    console.error(`error: unknown command "${command}". Run nirapod-audit --help for usage.`);
    process.exit(2);
}
