/**
 * @file Header.tsx
 * @brief Branded header banner for the nirapod-audit CLI.
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
 * Props for the {@link Header} component.
 */
interface HeaderProps {
  /** Path being audited, shown in the subtitle. */
  targetPath?: string;
  /** Optional config file path. */
  configPath?: string | null;
}

/**
 * Renders the branded header bar with version and target info.
 *
 * @param props - Component props.
 * @returns Ink elements for the header banner.
 */
export function Header({ targetPath, configPath }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="magentaBright">
          {"▓▓ "}
        </Text>
        <Text bold color="magentaBright">
          nirapod-audit
        </Text>
        <Text dimColor> v0.1.0</Text>
        {targetPath && (
          <>
            <Text dimColor> · </Text>
            <Text color="blueBright">{targetPath}</Text>
          </>
        )}
      </Box>
      {configPath && (
        <Text dimColor>   config: {configPath}</Text>
      )}
    </Box>
  );
}
