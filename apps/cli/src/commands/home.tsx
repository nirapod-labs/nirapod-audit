/**
 * @file home.tsx
 * @brief Interactive home screen TUI for nirapod-audit.
 *
 * @remarks
 * Full-screen dashboard with arrow-key navigation. Shows project info,
 * last report, config status, and lets users launch audit, browse rules,
 * view reports, and more. Styled to match claude-code / gemini-cli quality.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { spawnSync } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { ALL_RULES } from "@nirapod-audit/core";

// ── Helpers ────────────────────────────────────────────────────────────────────

function findLastReport(dir: string): string | null {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("nirapod-report-") && f.endsWith(".md"))
      .sort().reverse();
    return files[0] ? path.join(dir, files[0]) : null;
  } catch { return null; }
}

function findConfig(dir: string): string | null {
  const c = [path.join(dir, "nirapod-audit.toml"), path.join(dir, ".nirapod", "audit.toml")];
  return c.find(existsSync) ?? null;
}

function findCacheSize(dir: string): string {
  const f = path.join(dir, ".nirapod", "audit", "cache.json");
  try {
    const s = statSync(f);
    return `${(s.size / 1024).toFixed(1)} KB`;
  } catch { return "none"; }
}

function countSourceFiles(dir: string): number {
  let count = 0;
  try {
    const scan = (d: string) => {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "build") continue;
        if (e.isDirectory()) scan(path.join(d, e.name));
        else if (/\.(h|hpp|c|cpp|cc)$/.test(e.name)) count++;
      }
    };
    scan(dir);
  } catch {}
  return count;
}

// ── Menu definition ────────────────────────────────────────────────────────────

interface MenuItem { id: string; label: string; desc: string; key: string; divider?: boolean; }

const MENU: MenuItem[] = [
  { id: "audit",   label: "Run Audit",         desc: "Scan C/C++ files with all rules",         key: "a" },
  { id: "report",  label: "Open Last Report",  desc: "View latest nirapod-report-*.md",          key: "r", divider: true },
  { id: "rules",   label: "Browse Rules",      desc: `All ${ALL_RULES.length} rules with rationale`, key: "R" },
  { id: "explain", label: "Explain Rule",      desc: "Look up a specific rule ID",               key: "e", divider: true },
  { id: "json",    label: "Audit → JSON",      desc: "Run audit and emit NDJSON",                key: "j" },
  { id: "sarif",   label: "Audit → SARIF",     desc: "Run audit and emit SARIF 2.1.0",           key: "s" },
  { id: "markdown",label: "Audit → Markdown",  desc: "Run audit and write .md report",           key: "m", divider: true },
  { id: "exit",    label: "Exit",              desc: "Quit nirapod-audit",                        key: "q" },
];

// ── BigHeader ──────────────────────────────────────────────────────────────────

function BigHeader(): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box borderStyle="round" borderColor="magentaBright" paddingX={2} paddingY={0}>
        <Box flexDirection="column">
          <Text bold color="magentaBright">
            {"⬡  nirapod-audit"}
            <Text dimColor bold={false}>{"  v0.2.0"}</Text>
          </Text>
          <Text dimColor>{"Deterministic C/C++ linter · NASA JPL · Crypto · Doxygen · Memory"}</Text>
        </Box>
      </Box>
    </Box>
  );
}

// ── InfoPanel ─────────────────────────────────────────────────────────────────

interface InfoPanelProps {
  cwd: string;
  lastReport: string | null;
  configPath: string | null;
  cacheSize: string;
  fileCount: number;
}

function InfoPanel({ cwd, lastReport, configPath, cacheSize, fileCount }: InfoPanelProps): React.ReactElement {
  const project = path.basename(cwd);
  return (
    <Box
      borderStyle="single"
      borderColor="dim"
      paddingX={1}
      marginBottom={0}
      flexDirection="column"
    >
      <Text dimColor bold>{"  Project Info"}</Text>
      <Box flexDirection="column" marginTop={0}>
        <Text>
          <Text dimColor>{"  project   "}</Text>
          <Text bold color="blueBright">{project}</Text>
        </Text>
        <Text>
          <Text dimColor>{"  path      "}</Text>
          <Text dimColor>{cwd.length > 60 ? "…" + cwd.slice(-59) : cwd}</Text>
        </Text>
        <Text>
          <Text dimColor>{"  config    "}</Text>
          {configPath
            ? <Text color="green">{path.basename(configPath)}</Text>
            : <Text dimColor>none (using defaults)</Text>}
        </Text>
        <Text>
          <Text dimColor>{"  sources   "}</Text>
          <Text>{fileCount} C/C++ files</Text>
        </Text>
        <Text>
          <Text dimColor>{"  rules     "}</Text>
          <Text>{ALL_RULES.length} rules active</Text>
        </Text>
        <Text>
          <Text dimColor>{"  cache     "}</Text>
          <Text dimColor>{cacheSize}</Text>
        </Text>
        <Text>
          <Text dimColor>{"  report    "}</Text>
          {lastReport
            ? <Text color="cyan">{path.basename(lastReport)}</Text>
            : <Text dimColor>no previous report</Text>}
        </Text>
      </Box>
    </Box>
  );
}

// ── MenuPanel ─────────────────────────────────────────────────────────────────

interface MenuPanelProps { selected: number; }

function MenuPanel({ selected }: MenuPanelProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="dim"
      paddingX={1}
      marginBottom={0}
    >
      <Text dimColor bold>{"  Actions"}</Text>
      {MENU.map((item, i) => {
        const isSelected = i === selected;
        const isExit     = item.id === "exit";
        return (
          <React.Fragment key={item.id}>
            {item.divider && <Text dimColor>{"  ─────────────────────────────────────────────────"}</Text>}
            <Box>
              <Text>
                <Text bold color={isSelected ? "magentaBright" : "white"}>
                  {isSelected ? "  ▶ " : "    "}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? "white" : "dim"}
                >
                  {`[${item.key}] `}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? "white" : "dim"}
                >
                  {item.label.padEnd(18)}
                </Text>
                <Text dimColor>{item.desc}</Text>
              </Text>
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
}

// ── StatusBar ─────────────────────────────────────────────────────────────────

function StatusBar({ message }: { message: string | null }): React.ReactElement {
  return (
    <Box flexDirection="column" marginTop={0} paddingLeft={2}>
      {message && (
        <Text color="yellow">{"  ⚠  "}{message}</Text>
      )}
      <Text dimColor>{"  ↑↓ navigate   enter/key select   q quit"}</Text>
    </Box>
  );
}

// ── HomeApp ───────────────────────────────────────────────────────────────────

function HomeApp(): React.ReactElement {
  const [selected, setSelected] = useState(0);
  const [status, setStatus]     = useState<string | null>(null);
  const { exit } = useApp();

  const cwd        = process.cwd();
  const lastReport = findLastReport(cwd);
  const configPath = findConfig(cwd);
  const cacheSize  = findCacheSize(cwd);
  const [fileCount] = useState(() => countSourceFiles(cwd));

  useInput((input, key) => {
    // Arrow navigation
    if (key.upArrow)   { setSelected((s) => Math.max(0, s - 1)); setStatus(null); }
    if (key.downArrow) { setSelected((s) => Math.min(MENU.length - 1, s + 1)); setStatus(null); }

    // Single-key shortcuts
    const byKey = MENU.findIndex((m) => m.key === input);
    if (byKey >= 0) {
      setSelected(byKey);
      handleAction(MENU[byKey]!.id);
      return;
    }

    if (key.escape) { exit(); return; }
    if (key.return) handleAction(MENU[selected]!.id);
  });

  function handleAction(id: string): void {
    const bunBin = process.execPath;
    const script  = process.argv[1]!;

    switch (id) {
      case "exit":
        exit();
        break;

      case "audit":
        exit();
        spawnSync(bunBin, [script, "audit", "."], { stdio: "inherit" });
        break;

      case "markdown":
        exit();
        spawnSync(bunBin, [script, "audit", ".", "--output", "markdown"], { stdio: "inherit" });
        break;

      case "json":
        exit();
        spawnSync(bunBin, [script, "audit", ".", "--output", "json"], { stdio: "inherit" });
        break;

      case "sarif":
        exit();
        spawnSync(bunBin, [script, "audit", ".", "--output", "sarif"], { stdio: "inherit" });
        break;

      case "report": {
        if (!lastReport) {
          setStatus("No report found. Run an audit first (press a).");
          return;
        }
        exit();
        const pager = process.env.PAGER ?? "less";
        spawnSync(pager, [lastReport], { stdio: "inherit" });
        break;
      }

      case "rules":
        exit();
        spawnSync(bunBin, [script, "rules"], { stdio: "inherit" });
        break;

      case "explain":
        setStatus("Usage: nirapod-audit explain <rule-id>  e.g. NRP-NASA-006");
        break;

      default:
        break;
    }
  }

  return (
    <Box flexDirection="column" paddingTop={0}>
      <BigHeader />
      <InfoPanel
        cwd={cwd}
        lastReport={lastReport}
        configPath={configPath}
        cacheSize={cacheSize}
        fileCount={fileCount}
      />
      <MenuPanel selected={selected} />
      <StatusBar message={status} />
    </Box>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Launches the interactive home TUI.
 * Renders until the user exits or selects an action.
 */
export function runHome(): void {
  const { waitUntilExit } = render(<HomeApp />);
  waitUntilExit().catch(() => {});
}
