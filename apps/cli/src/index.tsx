#!/usr/bin/env bun
/**
 * @file index.tsx
 * @brief CLI entry point for nirapod-audit.
 *
 * @remarks
 * Thin entry point that parses arguments and routes to command handlers.
 * All TUI rendering lives in `commands/audit.tsx`, all output formatting
 * in `output/`, and all display components in `components/`.
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
import { runRulesHuman, runRulesJson } from "./commands/rules.js";
import { runExplainHuman, runExplainJson } from "./commands/explain.js";
import { runHome } from "./commands/home.js";
import { runAgentMode } from "./output/agent.js";
import { runSarifMode } from "./output/sarif.js";
import { runReportMode } from "./output/report.js";

/**
 * Supported output formats.
 *
 * @remarks
 * `"report"` outputs a detailed coloured report to stdout (default).
 * `"tui"` renders via Ink TUI with live progress bar.
 * `"json"` emits NDJSON to stdout.
 * `"sarif"` emits SARIF 2.1.0 JSON.
 */
type OutputFormat = "report" | "tui" | "json" | "sarif";

const VALID_FORMATS = new Set<string>(["report", "tui", "human", "json", "sarif"]);

/**
 * Extracts `--output <format>` from argv (defaults to `"human"`).
 *
 * @param argv - Raw CLI arguments.
 * @returns Parsed format and remaining arguments.
 */
function parseOutputFormat(argv: string[]): { format: OutputFormat; rest: string[] } {
  const idx = argv.indexOf("--output");
  if (idx >= 0 && argv[idx + 1]) {
    const value = argv[idx + 1] as string;
    if (!VALID_FORMATS.has(value)) {
      console.error(`error: unsupported format "${value}". Use: report, tui, json, sarif`);
      process.exit(2);
    }
    const rest = [...argv.slice(0, idx), ...argv.slice(idx + 2)];
    // "human" is an alias for "tui"
    const fmt = value === "human" ? "tui" : value;
    return { format: fmt as OutputFormat, rest };
  }
  return { format: "report", rest: argv };
}

/**
 * Prints the help text and exits.
 */
function showHelp(): never {
  console.log(`
nirapod-audit v0.1.0 — Deterministic C/C++ code auditor

Usage:
  nirapod-audit audit <path>     Audit a file or directory
  nirapod-audit rules            List all rules
  nirapod-audit explain <id>     Explain a rule in detail

Options:
  --output report                Detailed audit report (default)
  --output tui                   Live TUI with progress bar
  --output json                  Machine-readable NDJSON output
  --output sarif                 SARIF 2.1.0 for GitHub Code Scanning
  --help, -h                     Show this help message

Output Formats:
  report (default) Detailed coloured report: categories, top rules, per-file.
  tui              Live TUI with progress bar and streaming diagnostics.
  json             NDJSON: one JSON object per line to stdout.
  sarif            SARIF 2.1.0: single JSON document for GitHub Actions.

Config:
  Place nirapod-audit.toml in your project root to configure:
  platform, max_function_lines, ignore paths, rule overrides, etc.
  See nirapod-audit.toml.example for all options.

Incremental Mode:
  File hashes are cached in .nirapod/audit/cache.json.
  Unchanged files are skipped on subsequent runs.
  Delete the cache file to force a full re-audit.
`);
  process.exit(0);
}

// --- Main ---

const args = process.argv.slice(2);
const { format, rest } = parseOutputFormat(args);
const command = rest[0];

if (command === "--help" || command === "-h") {
  showHelp();
}

if (!command) {
  runHome();
} else {
  switch (command) {
  case "audit": {
    const targetPath = rest[1];
    if (!targetPath) {
      console.error("error: missing target path. Usage: nirapod-audit audit <path>");
      process.exit(2);
    }

    const resolvedTarget = path.resolve(targetPath);

    // Enforce nirapod-skills existence
    const skillPaths = [
      path.join(resolvedTarget, ".agents", "skills"),
      path.join(resolvedTarget, ".claude", "skills"),
      path.join(resolvedTarget, ".cursor", "skills")
    ];

    const hasSkills = skillPaths.some((p) => existsSync(p));
    if (!hasSkills) {
      console.warn(" Nirapod Agent Skills missing in target repository (checked .agents, .claude, .cursor).");
      console.warn("Auto-installing via bunx...\n");
      
      const result = spawnSync("bunx", ["skills", "nirapod-labs/nirapod-skills"], { 
        stdio: "inherit" 
      });

      if (result.error || result.status !== 0) {
        console.error("\nFailed to auto-install nirapod-skills. Please install them manually.");
        process.exit(1);
      }
      console.log("\n✓ Skills successfully synced!\n");
    }

    const { config, configPath } = loadConfig(resolvedTarget);

    switch (format) {
      case "json":
        runAgentMode(resolvedTarget, config);
        break;
      case "sarif":
        runSarifMode(resolvedTarget, config);
        break;
      case "tui":
        runAuditTui(resolvedTarget, config, configPath);
        break;
      default:
        runReportMode(resolvedTarget, config);
        break;
    }
    break;
  }

  case "rules": {
    if (format === "json") {
      runRulesJson();
    } else {
      runRulesHuman();
    }
    break;
  }

  case "explain": {
    const ruleId = rest[1];
    if (!ruleId) {
      console.error("error: missing rule ID. Usage: nirapod-audit explain <rule-id>");
      process.exit(2);
    }
    if (format === "json") {
      runExplainJson(ruleId);
    } else {
      runExplainHuman(ruleId);
    }
    break;
  }

  default: {
    console.error(`error: unknown command "${command}". Run with --help for usage.`);
    process.exit(2);
  }
}
}
