/**
 * @file ProgressBar.tsx
 * @brief Animated progress indicator for file scanning.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React from "react";
import { Text, Box } from "ink";

interface ProgressBarProps {
  current: number;
  total: number;
  currentFile: string;
  findings: number;
  startedAt?: number;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BAR_WIDTH = 24;

/** Formats elapsed milliseconds as a short human string: 1.2s or 420ms */
function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function ProgressBar({
  current,
  total,
  currentFile,
  findings,
  startedAt,
}: ProgressBarProps): React.ReactElement {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = Math.round((current / total) * BAR_WIDTH);
  const empty  = BAR_WIDTH - filled;
  const bar    = "█".repeat(filled) + "░".repeat(empty);
  const frame  = SPINNER[current % SPINNER.length]!;

  // ETA estimate
  let etaStr = "";
  if (startedAt && current > 0 && current < total) {
    const elapsed = Date.now() - startedAt;
    const eta = Math.round((elapsed / current) * (total - current));
    etaStr = ` · ETA ${formatMs(eta)}`;
  }

  // Truncate long file paths from the left
  const maxFile = 60;
  const displayFile =
    currentFile.length > maxFile
      ? "…" + currentFile.slice(-(maxFile - 1))
      : currentFile;

  return (
    <Box marginTop={1} flexDirection="column">
      <Box>
        <Text color="magentaBright" bold>{frame} </Text>
        <Text dimColor>{"["}</Text>
        <Text color="magentaBright">{bar}</Text>
        <Text dimColor>{"] "}</Text>
        <Text bold>{String(pct).padStart(3)}%</Text>
        <Text dimColor>  {current}/{total}</Text>
        {findings > 0 && (
          <Text color="yellow"> · {findings} finding{findings !== 1 ? "s" : ""}</Text>
        )}
        <Text dimColor>{etaStr}</Text>
      </Box>
      <Text dimColor>  {"→ "}{displayFile}</Text>
    </Box>
  );
}
