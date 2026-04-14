/**
 * @file pass.ts
 * @brief The `Pass` interface that every analysis pass must implement.
 *
 * @remarks
 * A pass is a stateless object with a single `run` method. It receives a
 * `FileContext` (parsed tree + metadata) and returns all diagnostics it found.
 * Passes never mutate `FileContext`; they only read it.
 *
 * @module Core
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import type { Diagnostic } from "@nirapod-audit/protocol";
import type { Language } from "@nirapod-audit/protocol";
import type { FileContext } from "../context.js";

/**
 * A single analysis pass in the audit pipeline.
 *
 * @remarks
 * Implement this interface for every rule family. Each pass may check multiple
 * related rules so that the CST is traversed once per family, not once per rule.
 *
 * @example
 * ```typescript
 * class LexPass implements Pass {
 *   readonly name = "LexPass";
 *   run(ctx: FileContext): Diagnostic[] {
 *     const results: Diagnostic[] = [];
 *     // regex-based checks on ctx.raw / ctx.lines
 *     return results;
 *   }
 * }
 * ```
 */
export interface Pass {
  /**
   * Human-readable name shown in verbose output.
   *
   * @remarks Use PascalCase, e.g. `"LexPass"`, `"NasaPass"`.
   */
  readonly name: string;

  /**
   * Run all checks for this pass against one source file.
   *
   * @param ctx - Read-only file context produced by `buildFileContext`.
   * @returns All diagnostics found; empty array if the file is clean for this pass.
   *
   * @remarks Must not throw — catch and surface errors via the pipeline runner.
   */
  run(ctx: FileContext): Diagnostic[];

  /**
   * Languages this pass applies to.
   *
   * @remarks
   * If undefined, the pass runs on all files. If set, the pipeline skips
   * this pass for files whose language is not in the list. For example,
   * `LexPass` runs on all languages (SPDX headers are universal), while
   * `AstPass` (Doxygen checks) runs only on `["c", "cpp"]`.
   */
  readonly languages?: readonly Language[];
}
