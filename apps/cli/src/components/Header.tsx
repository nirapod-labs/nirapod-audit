/**
 * @file Header.tsx
 * @brief Branded TUI header with live audit counters and status indicator.
 *
 * @remarks
 * Two-row header: brand line with version + target, then a live stats row
 * showing error/warning/info counts updating in real time as diagnostics stream.
 * Shown above all streamed diagnostics. Styled to match claude-code quality.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import React from "react";
import { Text, Box } from "ink";

interface HeaderProps {
  targetPath?: string;
  configPath?: string | null;
  errors?: number;
  warnings?: number;
  infos?: number;
  done?: boolean;
}

/** Colored severity counter pill. */
function StatPill({ count, label, color, dimColor }: {
  count: number; label: string; color: string; dimColor?: boolean;
}): React.ReactElement {
  if (count === 0) {
    return (
      <Text dimColor>
        <Text dimColor bold>{"0"}</Text>
        <Text dimColor>{" " + label}</Text>
      </Text>
    );
  }
  return (
    <Text>
      <Text color={color} bold>{String(count)}</Text>
      <Text dimColor>{" " + label + (count !== 1 && label !== "info" ? "s" : "")}</Text>
    </Text>
  );
}

export function Header({
  targetPath,
  configPath,
  errors = 0,
  warnings = 0,
  infos = 0,
  done = false,
}: HeaderProps): React.ReactElement {
  const hasStats = errors > 0 || warnings > 0 || infos > 0;
  const statusColor = done ? (errors > 0 ? "red" : "green") : "magentaBright";
  const statusText = done ? (errors > 0 ? "FAIL" : "PASS") : "scanning…";

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={done ? (errors > 0 ? "red" : "green") : "magentaBright"}
      paddingX={1}
      marginBottom={1}
    >
      {/* Brand row */}
      <Box>
        <Text bold color="magentaBright">{"⬡  nirapod-audit"}</Text>
        <Text dimColor>{"  v0.2.0"}</Text>
        {targetPath && (
          <>
            <Text dimColor>{"  ·  "}</Text>
            <Text color="blueBright" bold>{targetPath}</Text>
          </>
        )}
        <Text dimColor>{"  ·  "}</Text>
        <Text bold color={statusColor}>{statusText}</Text>
      </Box>

      {/* Stats row */}
      {hasStats && (
        <Box marginTop={0}>
          <StatPill count={errors}   label="error"   color="red" />
          <Text dimColor>{"   "}</Text>
          <StatPill count={warnings} label="warning"  color="yellow" />
          <Text dimColor>{"   "}</Text>
          <StatPill count={infos}    label="info"     color="cyan" />
          {configPath && (
            <>
              <Text dimColor>{"   ·   config: "}</Text>
              <Text dimColor>{configPath}</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
