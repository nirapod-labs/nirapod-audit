/**
 * @file home.tsx
 * @brief Interactive TUI home screen for nirapod-audit.
 *
 * @remarks
 * Renders a full-screen dashboard with arrow-key navigation. Allows
 * launching an audit, viewing the last markdown report, browsing rules,
 * toggling output format, and exiting. Mirrors the UX quality of
 * claude-code / gemini-cli interactive home screens.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React, { useState } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

// ── Menu definition ────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  desc: string;
  shortcut: string;
  dividerAfter?: boolean;
}

const MENU: MenuItem[] = [
  { id: "audit",   label: "Run Audit",         desc: "Scan all C/C++ files in project",     shortcut: "a" },
  { id: "watch",   label: "Watch Mode",         desc: "Auto-audit on every file save",        shortcut: "w", dividerAfter: true },
  { id: "report",  label: "View Last Report",   desc: "Open latest nirapod-report-*.md",      shortcut: "r" },
  { id: "rules",   label: "Rules Explorer",     desc: "Browse all 40+ audit rules",           shortcut: "R", dividerAfter: true },
  { id: "json",    label: "Output → JSON",      desc: "Next audit will emit NDJSON",          shortcut: "j" },
  { id: "sarif",   label: "Output → SARIF",     desc: "Next audit will emit SARIF 2.1.0",     shortcut: "s", dividerAfter: true },
  { id: "exit",    label: "Exit",               desc: "Quit nirapod-audit",                   shortcut: "q" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function findLastReport(dir: string): string | null {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("nirapod-report-") && f.endsWith(".md"))
      .sort()
      .reverse();
    return files[0] ? path.join(dir, files[0]) : null;
  } catch {
    return null;
  }
}

function findConfig(dir: string): string | null {
  const candidates = [
    path.join(dir, "nirapod-audit.toml"),
    path.join(dir, ".nirapod", "audit.toml"),
  ];
  return candidates.find(existsSync) ?? null;
}

// ── Divider ────────────────────────────────────────────────────────────────────

function Divider({ width = 60 }: { width?: number }): React.ReactElement {
  return <Text dimColor> {"─".repeat(width)}</Text>;
}

// ── Big branded header ─────────────────────────────────────────────────────────

function BigHeader(): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={0}>
      <Text color="magentaBright" bold>
        {"╭─────────────────────────────────────────────────────────────╮"}
      </Text>
      <Text color="magentaBright" bold>
        {"│"}
        <Text color="magentaBright" bold>{"  ⬡  NIRAPOD AUDIT"}</Text>
        <Text dimColor>{"  v0.1.0"}</Text>
        <Text dimColor>{"                                    "}</Text>
        <Text color="magentaBright" bold>{"│"}</Text>
      </Text>
      <Text color="magentaBright" bold>
        {"│"}
        <Text dimColor>{"  Deterministic C/C++ linter · NASA JPL · Crypto · Doxygen  "}</Text>
        <Text color="magentaBright" bold>{"│"}</Text>
      </Text>
      <Text color="magentaBright" bold>
        {"╰─────────────────────────────────────────────────────────────╯"}
      </Text>
    </Box>
  );
}

// ── Info panel ─────────────────────────────────────────────────────────────────

interface InfoPanelProps {
  lastReport: string | null;
  configPath: string | null;
}

function InfoPanel({ lastReport, configPath }: InfoPanelProps): React.ReactElement {
  const cwd = process.cwd();
  const project = path.basename(cwd);

  return (
    <Box flexDirection="column" marginLeft={2} marginBottom={1} marginTop={1}>
      <Text>
        <Text dimColor>{"  Project  "}</Text>
        <Text bold color="blueBright">{project}</Text>
      </Text>
      <Text>
        <Text dimColor>{"  Path     "}</Text>
        <Text dimColor>{cwd}</Text>
      </Text>
      <Text>
        <Text dimColor>{"  Config   "}</Text>
        {configPath
          ? <Text color="green">{path.basename(configPath)}</Text>
          : <Text dimColor>none (using defaults)</Text>}
      </Text>
      <Text>
        <Text dimColor>{"  Report   "}</Text>
        {lastReport
          ? <Text color="cyan">{path.basename(lastReport)}</Text>
          : <Text dimColor>no previous report</Text>}
      </Text>
    </Box>
  );
}

// ── Menu panel ─────────────────────────────────────────────────────────────────

interface MenuPanelProps {
  selected: number;
}

function MenuPanel({ selected }: MenuPanelProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="dim"
      paddingX={1}
      marginX={0}
    >
      <Text dimColor bold>{"  Actions"}</Text>
      <Divider width={62} />
      {MENU.map((item, i) => {
        const isSelected = i === selected;
        const isExit = item.id === "exit";
        return (
          <React.Fragment key={item.id}>
            <Box paddingY={0}>
              <Text>
                <Text color={isSelected ? "magentaBright" : ""} bold={isSelected}>
                  {isSelected ? "  ▶ " : "    "}
                </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? "white" : isExit ? "dim" : ""}
                >
                  {item.label.padEnd(24)}
                </Text>
                <Text dimColor>{item.desc}</Text>
              </Text>
            </Box>
            {item.dividerAfter && <Divider width={62} />}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

// ── Status bar ─────────────────────────────────────────────────────────────────

interface StatusBarProps {
  message: string | null;
}

function StatusBar({ message }: StatusBarProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginLeft={2} marginTop={1}>
      {message && (
        <Box marginBottom={0}>
          <Text color="yellow">{"⚠  "}</Text>
          <Text color="yellow">{message}</Text>
        </Box>
      )}
      <Text dimColor>
        {"  ↑↓ Navigate   Enter Select   a Audit   r Report   q Quit"}
      </Text>
    </Box>
  );
}

// ── Main home app ──────────────────────────────────────────────────────────────

function HomeApp(): React.ReactElement {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const { exit } = useApp();

  const cwd = process.cwd();
  const lastReport = findLastReport(cwd);
  const configPath = findConfig(cwd);

  useInput((input, key) => {
    // Navigation
    if (key.upArrow)   setSelected((s) => Math.max(0, s - 1));
    if (key.downArrow) setSelected((s) => Math.min(MENU.length - 1, s + 1));

    // Shortcut keys
    const byShortcut = MENU.findIndex((m) => m.shortcut === input);
    if (byShortcut >= 0) {
      setSelected(byShortcut);
      handleAction(MENU[byShortcut]!.id);
      return;
    }

    if (key.escape) { exit(); return; }
    if (key.return) handleAction(MENU[selected]!.id);
  });

  function handleAction(id: string): void {
    switch (id) {
      case "exit":
        exit();
        break;

      case "audit": {
        exit();
        // Launch audit in TUI mode on cwd
        const bunBin = process.execPath;
        spawnSync(bunBin, [process.argv[1]!, "audit", "."], { stdio: "inherit" });
        break;
      }

      case "watch": {
        exit();
        const bunBin = process.execPath;
        spawnSync(bunBin, [process.argv[1]!, "audit", ".", "--watch"], { stdio: "inherit" });
        break;
      }

      case "report": {
        if (!lastReport) {
          setStatus("No report found. Run an audit first (press a).");
          return;
        }
        exit();
        const pager = process.env.PAGER ?? process.env.EDITOR ?? "less";
        spawnSync(pager, [lastReport], { stdio: "inherit" });
        break;
      }

      case "rules": {
        exit();
        const bunBin = process.execPath;
        spawnSync(bunBin, [process.argv[1]!, "rules"], { stdio: "inherit" });
        break;
      }

      case "json":
        setStatus("Tip: run  nirapod-audit audit <path> --output json  for NDJSON.");
        break;

      case "sarif":
        setStatus("Tip: run  nirapod-audit audit <path> --output sarif  for SARIF 2.1.0.");
        break;

      default:
        break;
    }
  }

  return (
    <Box flexDirection="column" paddingTop={0}>
      <BigHeader />
      <InfoPanel lastReport={lastReport} configPath={configPath} />
      <MenuPanel selected={selected} />
      <StatusBar message={status} />
    </Box>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────

/**
 * Launches the interactive home TUI.
 *
 * @remarks
 * Renders the home screen and waits until the user exits (q/Escape) or
 * selects an action that transitions to another command.
 */
export function runHome(): void {
  const { waitUntilExit } = render(<HomeApp />);
  waitUntilExit().catch(() => {});
}
