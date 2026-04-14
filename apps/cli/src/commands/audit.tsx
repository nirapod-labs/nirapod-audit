/**
 * @file audit.tsx
 * @brief Ink TUI for the `audit` command.
 *
 * @remarks
 * Renders the full interactive audit experience with live streaming diagnostics.
 * After completion, auto-writes a markdown report and shows its path in the
 * summary. The TUI uses <Static> for completed diagnostics (no scroll needed)
 * and a live progress bar pinned below.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, Static } from "ink";
import { writeFileSync } from "node:fs";
import { runPipeline } from "@nirapod-audit/core";
import type { AuditConfig, AuditSummary, Diagnostic } from "@nirapod-audit/protocol";
import { Header } from "../components/Header.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { DiagnosticItem } from "../components/DiagnosticItem.js";
import { Summary } from "../components/Summary.js";
import path from "node:path";

interface AuditAppProps {
  targetPath: string;
  config: AuditConfig;
  configPath: string | null;
}

function AuditApp({ targetPath, config, configPath }: AuditAppProps): React.ReactElement {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [currentFile, setCurrentFile]  = useState<string>("");
  const [progress, setProgress]        = useState({ current: 0, total: 0 });
  const [summary, setSummary]          = useState<AuditSummary | null>(null);
  const [errors, setErrors]            = useState<string[]>([]);
  const [errCount, setErrCount]        = useState(0);
  const [warnCount, setWarnCount]      = useState(0);
  const [infoCount, setInfoCount]      = useState(0);
  const [reportPath, setReportPath]    = useState<string | null>(null);
  const [startedAt]                    = useState(() => Date.now());
  const allDiagsRef                    = useRef<Diagnostic[]>([]);
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

          case "diagnostic": {
            allDiagsRef.current.push(event.data);
            setDiagnostics((prev) => [...prev, event.data]);
            const sev = event.data.rule.severity;
            if (sev === "error")   setErrCount((n) => n + 1);
            if (sev === "warning") setWarnCount((n) => n + 1);
            if (sev === "info")    setInfoCount((n) => n + 1);
            break;
          }

          case "audit_done": {
            setSummary(event.summary);
            // Auto-write markdown report after completion
            try {
              const { buildMarkdownReport } = await import("../output/markdown.js");
              const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
              const reportDir = path.join(rootDir, ".nirapod", "audit");
              if (!require("node:fs").existsSync(reportDir)) {
                require("node:fs").mkdirSync(reportDir, { recursive: true });
              }
              const out = path.join(reportDir, `nirapod-report-${ts}.md`);
              const md = buildMarkdownReport(allDiagsRef.current, event.summary, rootDir, out);
              writeFileSync(out, md, "utf8");
              setReportPath(out);
            } catch {
              /* non-fatal — TUI still shows summary */
            }
            break;
          }

          case "error":
            setErrors((prev) => [...prev, event.message]);
            break;
        }
      }
    };
    run().catch((err) => setErrors((prev) => [...prev, String(err)]));
  }, [targetPath]);

  const relTarget = path.basename(targetPath);

  return (
    <Box flexDirection="column">
      <Header
        targetPath={relTarget}
        configPath={configPath}
        errors={errCount}
        warnings={warnCount}
        infos={infoCount}
        done={!!summary}
      />

      {/* Completed diagnostics — Static means Ink never re-renders them */}
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

      {/* Live progress bar (disappears when done) */}
      {!summary && progress.total > 0 && (
        <ProgressBar
          current={progress.current}
          total={progress.total}
          currentFile={path.relative(rootDir, currentFile) || currentFile}
          findings={diagnostics.length}
          errors={errCount}
          warnings={warnCount}
          startedAt={startedAt}
        />
      )}

      {/* Internal errors */}
      {errors.map((err, i) => (
        <Box key={`err-${i}`} marginLeft={2}>
          <Text color="red" bold>internal error: </Text>
          <Text>{err}</Text>
        </Box>
      ))}

      {summary && <Summary summary={summary} reportPath={reportPath} />}
    </Box>
  );
}

export function runAuditTui(
  targetPath: string,
  config: AuditConfig,
  configPath: string | null,
): void {
  const { waitUntilExit } = render(
    <AuditApp targetPath={targetPath} config={config} configPath={configPath} />
  );
  waitUntilExit().then(() => {
    // Exit code based on summary is handled by the app itself via process.exitCode
  }).catch(() => {});
}
