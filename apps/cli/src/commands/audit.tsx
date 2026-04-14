/**
 * @file audit.tsx
 * @brief Ink TUI for the `audit` command.
 *
 * @remarks
 * Renders the interactive audit experience: branded header, live progress
 * bar with spinner, streaming diagnostics, and a final compliance matrix.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React, { useState, useEffect } from "react";
import { render, Box, Text, Static } from "ink";
import { runPipeline } from "@nirapod-audit/core";
import type { AuditConfig, AuditSummary, Diagnostic } from "@nirapod-audit/protocol";
import { Header } from "../components/Header.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { DiagnosticItem } from "../components/DiagnosticItem.js";
import { Summary } from "../components/Summary.js";
import path from "node:path";

/**
 * Props for the {@link AuditApp} component.
 */
interface AuditAppProps {
  /** Absolute path to the audit target (file or directory). */
  targetPath: string;
  /** Merged audit configuration. */
  config: AuditConfig;
  /** Path to the loaded config file, if found. */
  configPath: string | null;
}

/**
 * Top-level Ink component for the audit TUI.
 *
 * @param props - Contains the target path, config, and config path.
 * @returns Ink elements showing header, progress, diagnostics, and summary.
 */
function AuditApp({ targetPath, config, configPath }: AuditAppProps): React.ReactElement {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [currentFile, setCurrentFile] = useState<string>("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const rootDir = path.resolve(targetPath);

  useEffect(() => {
    const run = async () => {
      for await (const event of runPipeline(targetPath, config)) {
        switch (event.type) {
          case "audit_start":
            setProgress((p) => ({ ...p, total: event.totalFiles }));
            break;
          case "file_start":
            setCurrentFile(event.file);
            setProgress((p) => ({ ...p, current: event.index }));
            break;
          case "diagnostic":
            setDiagnostics((prev) => [...prev, event.data]);
            break;
          case "file_done":
            break;
          case "audit_done":
            setSummary(event.summary);
            break;
          case "error":
            setErrors((prev) => [...prev, event.message]);
            break;
        }
      }
    };
    run().catch((err) =>
      setErrors((prev) => [...prev, String(err)]),
    );
  }, [targetPath]);

  const relTarget = path.basename(targetPath);

  return (
    <Box flexDirection="column">
      {/* Header banner */}
      <Header targetPath={relTarget} configPath={configPath} />

      {/* Completed diagnostics (static — Ink won't re-render them) */}
      <Static items={diagnostics}>
        {(diag, i) => (
          <DiagnosticItem
            key={i}
            diagnostic={diag}
            rootDir={rootDir}
            showHelp={config.showHelp}
            showNotes={config.showNotes}
          />
        )}
      </Static>

      {/* Live progress bar */}
      {!summary && progress.total > 0 && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          currentFile={path.relative(rootDir, currentFile) || currentFile}
          findings={diagnostics.length}
        />
      )}

      {/* Runtime errors */}
      {errors.map((err, i) => (
        <Box key={`err-${i}`} marginLeft={2}>
          <Text color="red" bold>internal error: </Text>
          <Text>{err}</Text>
        </Box>
      ))}

      {/* Summary compliance matrix */}
      {summary && <Summary summary={summary} />}
    </Box>
  );
}

/**
 * Launches the audit TUI.
 *
 * @param targetPath - Absolute path to audit target.
 * @param config - Active audit configuration.
 * @param configPath - Path to the loaded config file, or null.
 */
export function runAuditTui(
  targetPath: string,
  config: AuditConfig,
  configPath: string | null,
): void {
  const { waitUntilExit } = render(
    <AuditApp targetPath={targetPath} config={config} configPath={configPath} />
  );

  waitUntilExit().then(() => {
    // Exit code is handled by the pipeline summary
  });
}
