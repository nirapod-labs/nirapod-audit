/**
 * @file config.ts
 * @brief Loads and merges `nirapod-audit.toml` configuration.
 *
 * @remarks
 * Searches for `nirapod-audit.toml` starting from the audit target directory
 * and walking up to the filesystem root. If found, parses the TOML and
 * merges it over {@link DEFAULT_CONFIG}. If not found, returns defaults.
 *
 * Uses Bun's built-in TOML parser via dynamic import of the file.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { AuditConfig, RuleCategory, Severity, PlatformHint, RuleOverride } from "@nirapod-audit/protocol";
import { DEFAULT_CONFIG } from "@nirapod-audit/protocol";

/**
 * Config file name searched by the loader.
 */
const CONFIG_FILENAME = "nirapod-audit.toml";

/**
 * Raw shape of the TOML config file after parsing.
 *
 * @remarks
 * All fields are optional. Missing fields fall back to {@link DEFAULT_CONFIG}.
 */
interface RawConfig {
  audit?: {
    platform?: string;
    max_function_lines?: number;
    min_assertions?: number;
  };
  rules?: {
    overrides?: Record<string, string>;
  };
  ignore?: {
    paths?: string[];
    rules?: string[];
  };
  only?: {
    categories?: string[];
  };
  output?: {
    show_help?: boolean;
    show_notes?: boolean;
  };
}

/**
 * Finds `nirapod-audit.toml` by walking up from `startDir`.
 *
 * @param startDir - Directory to start searching from.
 * @returns Absolute path to the config file, or `null` if not found.
 *
 * @example
 * ```typescript
 * const cfgPath = findConfigFile("/home/user/project/src");
 * // → "/home/user/project/nirapod-audit.toml" or null
 * ```
 */
export function findConfigFile(startDir: string): string | null {
  let dir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break; // Reached filesystem root
    dir = parent;
  }

  return null;
}

/**
 * Simple TOML parser for the subset we need.
 *
 * @param content - Raw TOML file content.
 * @returns Parsed key-value structure.
 *
 * @remarks
 * Handles `[section]`, `key = value` (strings, numbers, booleans),
 * and `key = [array]` syntax. Covers all config patterns we use.
 */
function parseToml(content: string): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  let currentSection = "_root";

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    // Section header: [audit] or [rules.overrides]
    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1]!;
      if (!result[currentSection]) result[currentSection] = {};
      continue;
    }

    // Key = value
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1]!;
    let value: unknown = kvMatch[2]!.trim();

    // Parse value type
    const strVal = value as string;
    if (strVal === "true") {
      value = true;
    } else if (strVal === "false") {
      value = false;
    } else if (/^\d+$/.test(strVal)) {
      value = parseInt(strVal, 10);
    } else if (strVal.startsWith('"') && strVal.endsWith('"')) {
      value = strVal.slice(1, -1);
    } else if (strVal.startsWith("[") && strVal.endsWith("]")) {
      // Array of strings
      value = strVal
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter((s) => s.length > 0);
    }

    if (!result[currentSection]) result[currentSection] = {};
    result[currentSection]![key] = value;
  }

  return result;
}

/**
 * Loads config from `nirapod-audit.toml` and merges with defaults.
 *
 * @param startDir - Directory to start searching for the config file.
 * @returns Merged configuration and the path to the config file (if found).
 *
 * @example
 * ```typescript
 * const { config, configPath } = loadConfig("/path/to/project");
 * console.log(config.maxFunctionLines); // 60 or overridden value
 * ```
 */
export function loadConfig(startDir: string): {
  config: AuditConfig;
  configPath: string | null;
} {
  const configPath = findConfigFile(startDir);
  if (!configPath) {
    return { config: { ...DEFAULT_CONFIG }, configPath: null };
  }

  const content = readFileSync(configPath, "utf-8");
  const raw = parseToml(content);

  const audit = raw["audit"] ?? {};
  const rules = raw["rules"] ?? {};
  const overrides = raw["rules.overrides"] ?? {};
  const ignore = raw["ignore"] ?? {};
  const only = raw["only"] ?? {};
  const output = raw["output"] ?? {};

  const ruleOverrides: Record<string, RuleOverride> = {};
  for (const [id, sev] of Object.entries(overrides)) {
    if (typeof sev === "string") {
      ruleOverrides[id] = { severity: sev as Severity | "ignore" };
    }
  }

  const config: AuditConfig = {
    platform: (audit["platform"] as PlatformHint) ?? DEFAULT_CONFIG.platform,
    maxFunctionLines:
      (audit["max_function_lines"] as number) ?? DEFAULT_CONFIG.maxFunctionLines,
    minAssertions:
      (audit["min_assertions"] as number) ?? DEFAULT_CONFIG.minAssertions,
    ignorePaths:
      (ignore["paths"] as string[]) ?? DEFAULT_CONFIG.ignorePaths,
    ignoreRules:
      (ignore["rules"] as string[]) ?? DEFAULT_CONFIG.ignoreRules,
    onlyCategories:
      ((only["categories"] as string[]) ?? DEFAULT_CONFIG.onlyCategories) as RuleCategory[],
    ruleOverrides,
    showHelp: (output["show_help"] as boolean) ?? DEFAULT_CONFIG.showHelp,
    showNotes: (output["show_notes"] as boolean) ?? DEFAULT_CONFIG.showNotes,
  };

  return { config, configPath };
}
