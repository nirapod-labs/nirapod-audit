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

/**
 * Props for the {@link ProgressBar} component.
 */
interface ProgressBarProps {
  /** Current file index (1-based). */
  current: number;
  /** Total file count. */
  total: number;
  /** Relative path of the file currently being analysed. */
  currentFile: string;
  /** Number of findings so far. */
  findings: number;
}

/** Spinner frames for the animation. */
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Renders a live progress bar with spinner, percentage, and file name.
 *
 * @param props - Component props.
 * @returns Ink elements for the progress indicator.
 */
export function ProgressBar({
  current,
  total,
  currentFile,
  findings,
}: ProgressBarProps): React.ReactElement {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const barWidth = 20;
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);

  // Animate spinner based on current file index
  const frame = SPINNER[current % SPINNER.length]!;

  return (
    <Box marginTop={1} flexDirection="column">
      <Box>
        <Text color="magentaBright">{frame} </Text>
        <Text dimColor>[</Text>
        <Text color="magentaBright">{bar}</Text>
        <Text dimColor>]</Text>
        <Text bold> {pct}%</Text>
        <Text dimColor> ({current}/{total})</Text>
        {findings > 0 && (
          <Text color="yellow"> · {findings} findings</Text>
        )}
      </Box>
      <Text dimColor>  → {currentFile}</Text>
    </Box>
  );
}
