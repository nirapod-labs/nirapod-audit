/**
 * @file Header.tsx
 * @brief Branded header banner with live audit statistics.
 *
 * @remarks
 * Shows the tool name, version, target path, and — once scanning starts —
 * a live running count of errors, warnings, and info findings. The counts
 * update in real time as the pipeline emits diagnostics.
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

export function Header({
  targetPath,
  configPath,
  errors = 0,
  warnings = 0,
  infos = 0,
  done = false,
}: HeaderProps): React.ReactElement {
  const hasStats = errors > 0 || warnings > 0 || infos > 0;
  const statusColor = done
    ? errors > 0 ? "red" : "green"
    : "magentaBright";

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Brand + target */}
      <Box>
        <Text bold color="magentaBright">{"▓▓ "}</Text>
        <Text bold color="magentaBright">nirapod-audit</Text>
        <Text dimColor> v0.1.0</Text>
        {targetPath && (
          <>
            <Text dimColor>{" · "}</Text>
            <Text color="blueBright">{targetPath}</Text>
          </>
        )}
        {done && (
          <>
            <Text dimColor>{" · "}</Text>
            <Text bold color={statusColor}>
              {errors > 0 ? "FAIL" : "PASS"}
            </Text>
          </>
        )}
      </Box>

      {/* Live stats row — only shown after first finding or when done */}
      {hasStats && (
        <Box marginLeft={3}>
          {errors > 0 ? (
            <Text color="red" bold>{errors} error{errors !== 1 ? "s" : ""}</Text>
          ) : (
            <Text dimColor>0 errors</Text>
          )}
          <Text dimColor>{"  ·  "}</Text>
          {warnings > 0 ? (
            <Text color="yellow">{warnings} warning{warnings !== 1 ? "s" : ""}</Text>
          ) : (
            <Text dimColor>0 warnings</Text>
          )}
          {infos > 0 && (
            <>
              <Text dimColor>{"  ·  "}</Text>
              <Text color="cyan">{infos} info</Text>
            </>
          )}
        </Box>
      )}

      {/* Config path */}
      {configPath && (
        <Text dimColor>   config: {configPath}</Text>
      )}
    </Box>
  );
}
