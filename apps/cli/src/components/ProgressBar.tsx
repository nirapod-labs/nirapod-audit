/**
 * @file ProgressBar.tsx
 * @brief Animated progress indicator with ETA and live findings count.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";

interface ProgressBarProps {
  current: number;
  total: number;
  currentFile: string;
  findings: number;
  errors: number;
  warnings: number;
  startedAt?: number;
}

const SPINNER = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const BAR_WIDTH = 28;

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function ProgressBar({
  current,
  total,
  currentFile,
  findings,
  errors,
  warnings,
  startedAt,
}: ProgressBarProps): React.ReactElement {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER.length), 80);
    return () => clearInterval(t);
  }, []);

  const pct    = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round((current / Math.max(total, 1)) * BAR_WIDTH);
  const empty  = BAR_WIDTH - filled;
  const bar    = "█".repeat(filled) + "░".repeat(empty);

  let etaStr = "";
  if (startedAt && current > 0 && current < total) {
    const elapsed = Date.now() - startedAt;
    const eta = Math.round((elapsed / current) * (total - current));
    etaStr = `  eta ${formatMs(eta)}`;
  }

  const maxFile = 55;
  const displayFile = currentFile.length > maxFile
    ? "…" + currentFile.slice(-(maxFile - 1))
    : currentFile;

  const barColor = errors > 0 ? "red" : warnings > 0 ? "yellow" : "magentaBright";

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="dim" paddingX={1}>
      {/* Progress bar row */}
      <Box>
        <Text color="magentaBright" bold>{SPINNER[frame]!} </Text>
        <Text dimColor>{"["}</Text>
        <Text color={barColor}>{bar}</Text>
        <Text dimColor>{"]"}</Text>
        <Text bold>{" "}{String(pct).padStart(3)}%</Text>
        <Text dimColor>{"  "}{current}/{total} files</Text>
        {findings > 0 && (
          <>
            <Text dimColor>{"  ·  "}</Text>
            {errors > 0 && <Text color="red" bold>{errors} err</Text>}
            {errors > 0 && warnings > 0 && <Text dimColor>{" "}</Text>}
            {warnings > 0 && <Text color="yellow">{warnings} warn</Text>}
          </>
        )}
        {etaStr && <Text dimColor>{etaStr}</Text>}
      </Box>
      {/* Current file row */}
      <Box>
        <Text dimColor>{"  → "}</Text>
        <Text dimColor>{displayFile}</Text>
      </Box>
    </Box>
  );
}
