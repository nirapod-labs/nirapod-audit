/**
 * @file index.ts
 * @brief Pipeline orchestrator that runs analysis passes over source files.
 *
 * @remarks
 * The pipeline discovers source files under the target directory, builds a
 * `ProjectContext`, then runs each registered pass sequentially on every file.
 * Results are yielded as `AuditEvent` objects so the CLI can render them
 * incrementally.
 *
 * Pass ordering matters: LexPass runs before AstPass because file-header
 * violations are more fundamental than Doxygen-structure violations.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import path from "node:path";
import { Glob } from "bun";
import type {
  AuditConfig,
  AuditEvent,
  AuditSummary,
  Diagnostic,
  FileResult,
} from "@nirapod-audit/protocol";
import { buildFileContext, type ProjectContext } from "../context.js";
import type { Pass } from "./pass.js";
import { LexPass } from "../passes/lex-pass.js";
import { AstPass } from "../passes/ast-pass.js";
import { NasaPass } from "../passes/nasa-pass.js";
import { CryptoPass } from "../passes/crypto-pass.js";
import { MemoryPass } from "../passes/memory-pass.js";
import { loadCache, saveCache, getCachedResult, updateCacheEntry, hashContent } from "../cache.js";

/**
 * Source file extension patterns accepted by the pipeline.
 */
const SOURCE_GLOBS = ["**/*.h", "**/*.hpp", "**/*.c", "**/*.cpp", "**/*.cc"];

/**
 * Discovers all source files under `rootDir` matching C/C++ extensions.
 *
 * @param rootDir - Absolute path to the scan root.
 * @param ignorePaths - Glob patterns to exclude.
 * @returns Array of absolute file paths, sorted alphabetically.
 */
async function discoverFiles(
  rootDir: string,
  ignorePaths: readonly string[],
): Promise<string[]> {
  const files: string[] = [];

  for (const pattern of SOURCE_GLOBS) {
    const glob = new Glob(pattern);
    for await (const match of glob.scan({ cwd: rootDir, absolute: true })) {
      const relPath = path.relative(rootDir, match);
      const excluded = ignorePaths.some((ignore) => {
        const ignoreGlob = new Glob(ignore);
        return ignoreGlob.match(relPath);
      });
      if (!excluded) {
        files.push(match);
      }
    }
  }

  return [...new Set(files)].sort();
}

/**
 * Resolves the effective severity of a diagnostic, applying config overrides.
 *
 * @param diag - The diagnostic to resolve.
 * @param config - Active audit configuration.
 * @returns The diagnostic unchanged, or `null` if the rule is ignored.
 */
function applyOverrides(
  diag: Diagnostic,
  config: AuditConfig,
): Diagnostic | null {
  if (config.ignoreRules.includes(diag.rule.id)) return null;

  const override = config.ruleOverrides[diag.rule.id];
  if (override) {
    if (override.severity === "ignore") return null;
    return {
      ...diag,
      rule: { ...diag.rule, severity: override.severity },
    };
  }

  return diag;
}

/**
 * Builds all registered passes for Phase 1.
 *
 * @returns Ordered array of passes to execute on each file.
 *
 * @remarks
 * Later phases append AstPass, NasaPass, CryptoPass, MemoryPass, and StylePass.
 */
function buildPasses(): Pass[] {
  return [new LexPass(), new AstPass(), new NasaPass(), new CryptoPass(), new MemoryPass()];
}

/**
 * Runs the full audit pipeline and yields events incrementally.
 *
 * @param targetPath - Absolute path to a file or directory to audit.
 * @param config - Active audit configuration.
 * @yields {AuditEvent} Events for the CLI to render as they happen.
 *
 * @remarks
 * When `targetPath` is a single file, only that file is analysed.
 * When it is a directory, all `.h`, `.hpp`, `.c`, `.cpp`, `.cc` files
 * under it are discovered and analysed in sorted order.
 *
 * @example
 * ```typescript
 * for await (const event of runPipeline("/path/to/src", DEFAULT_CONFIG)) {
 *   console.log(event.type, event);
 * }
 * ```
 */
export async function* runPipeline(
  targetPath: string,
  config: AuditConfig,
): AsyncGenerator<AuditEvent> {
  const resolvedPath = path.resolve(targetPath);
  const stat = await Bun.file(resolvedPath).exists();

  let allFiles: string[];
  let rootDir: string;

  // Single file or directory
  const isFile = stat && resolvedPath.match(/\.(h|hpp|c|cpp|cc)$/i);
  if (isFile) {
    allFiles = [resolvedPath];
    rootDir = path.dirname(resolvedPath);
  } else {
    rootDir = resolvedPath;
    allFiles = await discoverFiles(rootDir, config.ignorePaths);
  }

  if (allFiles.length === 0) {
    yield { type: "error", message: `No source files found under ${resolvedPath}` };
    return;
  }

  const project: ProjectContext = {
    rootDir,
    allFiles,
    config,
    definedGroups: new Set(),
    definedSymbols: new Set(),
  };

  yield { type: "audit_start", totalFiles: allFiles.length, config };

  const passes = buildPasses();
  const fileResults: FileResult[] = [];
  const ruleHits: Record<string, number> = {};
  const startTime = performance.now();

  // Incremental mode: load file hash cache
  const cache = loadCache(rootDir);
  let cachedSkipCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i]!;
    yield { type: "file_start", file: filePath, index: i + 1, total: allFiles.length };

    let raw: string;
    try {
      raw = await Bun.file(filePath).text();
    } catch {
      yield { type: "error", message: `Could not read file: ${filePath}` };
      continue;
    }

    const ctx = buildFileContext(filePath, raw, project);

    // Incremental: skip unchanged files
    const relPath = path.relative(rootDir, filePath);
    const fileHash = await hashContent(raw);
    const cached = getCachedResult(cache, relPath, fileHash);

    if (cached) {
      cachedSkipCount++;
      // Merge cached ruleHits into the summary
      if (cached.ruleHits) {
        for (const [id, count] of Object.entries(cached.ruleHits)) {
          ruleHits[id] = (ruleHits[id] ?? 0) + count;
        }
      }
      fileResults.push({
        path: filePath,
        diagnostics: [],
        errors: cached.errors,
        warnings: cached.warnings,
        infos: cached.infos,
        skipped: false,
      });
      yield { type: "file_done", file: filePath, errors: cached.errors, warnings: cached.warnings, infos: cached.infos };
      continue;
    }

    const allDiags: Diagnostic[] = [];

    for (const pass of passes) {
      // Skip passes that don't apply to this file's language
      if (pass.languages && !pass.languages.includes(ctx.language)) {
        continue;
      }
      try {
        const diags = pass.run(ctx);
        allDiags.push(...diags);
      } catch (err) {
        yield {
          type: "error",
          message: `${pass.name} threw on ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Apply overrides and category filters
    const filtered: Diagnostic[] = [];
    for (const diag of allDiags) {
      if (
        config.onlyCategories.length > 0 &&
        !config.onlyCategories.includes(diag.rule.category)
      ) {
        continue;
      }
      const resolved = applyOverrides(diag, config);
      if (resolved) filtered.push(resolved);
    }

    // Emit diagnostics
    for (const diag of filtered) {
      yield { type: "diagnostic", data: diag };
      ruleHits[diag.rule.id] = (ruleHits[diag.rule.id] ?? 0) + 1;
    }

    const errors = filtered.filter((d) => d.rule.severity === "error").length;
    const warnings = filtered.filter((d) => d.rule.severity === "warning").length;
    const infos = filtered.filter((d) => d.rule.severity === "info").length;

    // Build per-file ruleHits for cache storage
    const fileRuleHits: Record<string, number> = {};
    for (const diag of filtered) {
      fileRuleHits[diag.rule.id] = (fileRuleHits[diag.rule.id] ?? 0) + 1;
    }

    // Update cache with fresh results including ruleHits
    updateCacheEntry(cache, relPath, fileHash, errors, warnings, infos, fileRuleHits);

    fileResults.push({
      path: filePath,
      diagnostics: filtered,
      errors,
      warnings,
      infos,
      skipped: ctx.role === "third-party",
    });

    yield { type: "file_done", file: filePath, errors, warnings, infos };
  }

  // Persist cache for next incremental run
  saveCache(rootDir, cache);

  const summary: AuditSummary = {
    totalFiles: allFiles.length,
    scannedFiles: fileResults.filter((f) => !f.skipped).length,
    skippedFiles: fileResults.filter((f) => f.skipped).length,
    totalErrors: fileResults.reduce((s, f) => s + f.errors, 0),
    totalWarnings: fileResults.reduce((s, f) => s + f.warnings, 0),
    totalInfos: fileResults.reduce((s, f) => s + f.infos, 0),
    passedFiles: fileResults.filter((f) => f.errors === 0 && f.warnings === 0).length,
    failedFiles: fileResults.filter((f) => f.errors > 0 || f.warnings > 0).length,
    ruleHits,
    durationMs: Math.round(performance.now() - startTime),
  };

  yield { type: "audit_done", summary };
}
