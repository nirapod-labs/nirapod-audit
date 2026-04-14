/**
 * @file sarif.ts
 * @brief SARIF 2.1.0 output formatter for nirapod-audit.
 *
 * @remarks
 * Generates a Static Analysis Results Interchange Format (SARIF) report
 * from audit events. SARIF is consumed by GitHub Code Scanning, VS Code
 * SARIF Viewer, and other analysis platforms.
 *
 * @see https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Diagnostic, Rule, AuditConfig } from "@nirapod-audit/protocol";
import { ALL_RULES } from "@nirapod-audit/core";
import { runPipeline } from "@nirapod-audit/core";
import path from "node:path";

/**
 * SARIF severity level.
 *
 * @remarks Maps nirapod severity → SARIF level.
 */
function toSarifLevel(severity: string): string {
  switch (severity) {
    case "error": return "error";
    case "warning": return "warning";
    case "info": return "note";
    default: return "note";
  }
}

/**
 * Generates a complete SARIF 2.1.0 JSON object from collected diagnostics.
 *
 * @param diagnostics - All diagnostics from the audit run.
 * @param rootDir - Absolute base directory for relative URI computation.
 * @param durationMs - Total audit duration in milliseconds.
 * @returns SARIF JSON object ready for `JSON.stringify()`.
 *
 * @example
 * ```typescript
 * const sarif = buildSarif(diagnostics, "/path/to/project", 42);
 * writeFileSync("audit.sarif", JSON.stringify(sarif, null, 2));
 * ```
 */
export function buildSarif(
  diagnostics: Diagnostic[],
  rootDir: string,
  durationMs: number,
): Record<string, unknown> {
  // Build rule descriptors (only include rules that actually fired)
  const firedRuleIds = new Set(diagnostics.map((d) => d.rule.id));
  const rules = ALL_RULES
    .filter((r) => firedRuleIds.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.title,
      shortDescription: { text: r.description },
      fullDescription: { text: r.rationale },
      defaultConfiguration: {
        level: toSarifLevel(r.severity),
      },
      helpUri: r.references?.[0]?.url ?? undefined,
      properties: {
        category: r.category,
        languages: r.languages ?? [],
      },
    }));

  // Build results
  const results = diagnostics.map((d) => {
    const relUri = path.relative(rootDir, d.span.file).replace(/\\/g, "/");

    const result: Record<string, unknown> = {
      ruleId: d.rule.id,
      level: toSarifLevel(d.rule.severity),
      message: {
        text: d.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: relUri,
              uriBaseId: "%SRCROOT%",
            },
            region: {
              startLine: d.span.startLine,
              startColumn: d.span.startCol,
              endLine: d.span.endLine,
              endColumn: d.span.endCol,
              snippet: { text: d.span.snippet },
            },
          },
        },
      ],
    };

    // Add fix suggestions if available
    if (d.help) {
      (result as Record<string, unknown>)["fixes"] = [
        {
          description: { text: d.help },
        },
      ];
    }

    // Add notes as relatedLocations
    if (d.notes && d.notes.length > 0) {
      (result as Record<string, unknown>)["properties"] = {
        notes: d.notes,
      };
    }

    return result;
  });

  return {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "nirapod-audit",
            version: "0.2.0",
            informationUri: "https://github.com/nirapod/nirapod-audit",
            rules,
          },
        },
        results,
        invocations: [
          {
            executionSuccessful: diagnostics.filter((d) => d.rule.severity === "error").length === 0,
            properties: {
              durationMs,
            },
          },
        ],
        originalUriBaseIds: {
          "%SRCROOT%": {
            uri: `file://${rootDir}/`,
          },
        },
      },
    ],
  };
}

/**
 * Runs the audit pipeline and outputs SARIF 2.1.0 JSON.
 *
 * @param targetPath - Absolute path to audit target.
 * @param config - Active audit configuration.
 *
 * @remarks
 * Collects all diagnostics first, then outputs a single SARIF JSON object
 * (not streaming). This is intentional — SARIF requires the complete result
 * set in a single document.
 */
export async function runSarifMode(
  targetPath: string,
  config: AuditConfig,
): Promise<void> {
  const allDiags: Diagnostic[] = [];
  let durationMs = 0;
  const rootDir = path.resolve(targetPath);

  for await (const event of runPipeline(targetPath, config)) {
    if (event.type === "diagnostic") {
      allDiags.push(event.data);
    }
    if (event.type === "audit_done") {
      durationMs = event.summary.durationMs;
    }
  }

  const sarif = buildSarif(allDiags, path.dirname(rootDir), durationMs);
  console.log(JSON.stringify(sarif, null, 2));

  const hasErrors = allDiags.some((d) => d.rule.severity === "error");
  process.exit(hasErrors ? 1 : 0);
}
