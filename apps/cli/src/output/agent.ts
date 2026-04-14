/**
 * @file agent.ts
 * @brief NDJSON output mode for AI agent consumption.
 *
 * @remarks
 * Streams audit events as newline-delimited JSON to stdout.
 * Each line is a self-contained JSON object with full rule context
 * inlined, so agents can resolve issues without follow-up queries.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { runPipeline } from "@nirapod-audit/core";
import type { AuditConfig } from "@nirapod-audit/protocol";

/**
 * Runs the audit and emits NDJSON to stdout.
 *
 * @param targetPath - Absolute path to audit target.
 * @param config - Active audit configuration.
 */
export async function runAgentMode(
  targetPath: string,
  config: AuditConfig,
): Promise<void> {
  let hasErrors = false;

  for await (const event of runPipeline(targetPath, config)) {
    console.log(JSON.stringify(event));

    if (event.type === "diagnostic" && event.data.rule.severity === "error") {
      hasErrors = true;
    }

    if (event.type === "audit_done") {
      hasErrors = event.summary.totalErrors > 0;
    }
  }

  process.exit(hasErrors ? 1 : 0);
}
