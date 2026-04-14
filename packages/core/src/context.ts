/**
 * @file context.ts
 * @brief FileContext and ProjectContext construction for the analysis pipeline.
 *
 * Parses each source file with tree-sitter and attaches metadata that every
 * analysis pass needs: the CST, raw lines, file role, and platform hint. All
 * passes receive a `FileContext` and must not re-parse the file themselves.
 *
 * @remarks
 * Two parser singletons are kept alive for the process lifetime — one for C,
 * one for C++. tree-sitter parsers are not thread-safe, so parallel file
 * analysis must create separate parser instances or serialize access.
 *
 * @see {@link buildFileContext} for the main entry point.
 * @see {@link ProjectContext} for the cross-file shared state.
 * @module Core
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import Parser from "tree-sitter";
import C from "tree-sitter-c";
import Cpp from "tree-sitter-cpp";
import path from "node:path";
import type { AuditConfig, FileRole, Language, PlatformHint } from "@nirapod-audit/protocol";

const cParser = new Parser();
cParser.setLanguage(C);

const cppParser = new Parser();
cppParser.setLanguage(Cpp);

/**
 * All data a single analysis pass needs to inspect one source file.
 *
 * @remarks
 * Built once per file by {@link buildFileContext} and then passed read-only
 * to every pass in the pipeline. Passes must not mutate any field.
 */
export interface FileContext {
  /** Absolute path to the source file. */
  path: string;
  /** Raw file content as a single string. */
  raw: string;
  /** File content split on `"\n"`, for line-number-based lookups. */
  lines: string[];
  /** tree-sitter parse tree (CST). */
  tree: Parser.Tree;
  /** Root node of the CST — entry point for all queries. */
  rootNode: Parser.SyntaxNode;
  /** Structural role of this file, used to gate rule subsets. */
  role: FileRole;
  /**
   * Detected or configured hardware platform.
   *
   * @remarks
   * Drives platform-specific crypto rules (CC310 vs CC312 vs ESP32).
   * Derived from `#include` guards and preprocessor macros when config is
   * `"auto"`.
   */
  platform: PlatformHint;
  /**
   * Detected source language.
   *
   * @remarks
   * Drives parser selection and determines which pass families apply to
   * this file. For example, Doxygen rules run only on `"c"` | `"cpp"` files,
   * while TSDoc rules run only on `"typescript"` files.
   */
  language: Language;
  /** `true` when the file extension is `.cpp`, `.cc`, or `.hpp`. */
  isCpp: boolean;
  /** Project-wide shared state (symbol table, config, file list). */
  project: ProjectContext;
}

/**
 * Shared state built once for an entire audit run and handed to every pass.
 *
 * @remarks
 * `definedGroups` and `definedSymbols` are populated during the pre-scan
 * phase (first pass over all headers) so that cross-file checks like
 * `@ingroup` target validation can run during the main analysis phase.
 */
export interface ProjectContext {
  /** Absolute path to the project root directory. */
  rootDir: string;
  /** Absolute paths of every file that will be analysed. */
  allFiles: string[];
  /** Active configuration for this run. */
  config: AuditConfig;
  /**
   * All `@defgroup` names declared anywhere in the project headers.
   *
   * @remarks Populated during the pre-scan phase; used by `NRP-DOX-020`.
   */
  definedGroups: Set<string>;
  /**
   * All public function and class names declared in project headers.
   *
   * @remarks Used to validate `@see` cross-references.
   */
  definedSymbols: Set<string>;
}

/**
 * Determines the structural role of a file from its path and content.
 *
 * @param filePath - Absolute path to the file.
 * @param _raw - Raw file content (reserved for future content-based detection).
 * @returns The {@link FileRole} that controls which rule subsets apply.
 */
function detectRole(filePath: string, _raw: string): FileRole {
  const base = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (base === "module-doc.h") return "module-doc";
  if (/(?:test[_-]|[_-]test\.|_tests?\.)/.test(base)) return "test";
  if (
    filePath.includes("third_party") ||
    filePath.includes("nordic_sdk") ||
    filePath.includes("nrf_cc310") ||
    filePath.includes("CMSIS")
  ) return "third-party";

  if (ext === ".s" || ext === ".S") return "asm";
  if (base === "CMakeLists.txt" || ext === ".cmake") return "cmake";
  if (base === "Kconfig" || base === "Doxyfile") return "config";
  if (ext === ".h" || ext === ".hpp") return "public-header";
  return "impl";
}

/**
 * Infers the target hardware platform from preprocessor includes and macros.
 *
 * @param raw - Raw file content to scan for platform markers.
 * @param configHint - Platform value from `nirapod-audit.toml`; returned
 *   unchanged unless it is `"auto"`.
 * @returns The resolved {@link PlatformHint}.
 *
 * @remarks
 * Detection order: nRF5340 markers → nRF52840 markers → ESP32 markers →
 * `"host"` fallback. The first match wins.
 */
function detectPlatform(raw: string, configHint: PlatformHint): PlatformHint {
  if (configHint !== "auto") return configHint;
  if (raw.includes("nrf5340") || raw.includes("NRF5340") || raw.includes("CC312")) return "nrf5340";
  if (raw.includes("nrf52840") || raw.includes("NRF52840") || raw.includes("CC310")) return "nrf52840";
  if (raw.includes("esp_aes.h") || raw.includes("IDF_TARGET_ESP32")) return "esp32";
  return "host";
}

/**
 * Detects the source language from a file extension.
 *
 * @param filePath - Absolute path to the source file.
 * @returns The detected {@link Language}, or `null` for unsupported files.
 *
 * @remarks
 * Extension mapping:
 * - `.c`, `.h` → `"c"`
 * - `.cpp`, `.cc`, `.hpp` → `"cpp"`
 * - `.ts`, `.tsx` → `"typescript"`
 * - `.rs` → `"rust"`
 *
 * The pipeline skips files that return `null` (config files, Makefiles, etc.).
 */
export function detectLanguage(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".c":
    case ".h":
      return "c";
    case ".cpp":
    case ".cc":
    case ".hpp":
      return "cpp";
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".rs":
      return "rust";
    default:
      return null;
  }
}

/**
 * Builds a fully-populated {@link FileContext} for one source file.
 *
 * @param filePath - Absolute path to the file to analyse.
 * @param raw - Raw file content (caller reads with `Bun.file().text()`).
 * @param project - Shared project-wide context (config, symbol table, etc.).
 * @returns A read-only context object ready to pass to each analysis pass.
 *
 * @remarks
 * Selects the C++ parser for `.cpp`, `.cc`, and `.hpp` files; falls back to
 * the C parser for everything else. Both parsers are module-level singletons.
 *
 * @throws {Error} If tree-sitter fails to parse the file (malformed source).
 *
 * @example
 * ```typescript
 * const raw = await Bun.file(filePath).text();
 * const ctx = buildFileContext(filePath, raw, projectCtx);
 * for (const pass of passes) {
 *   diagnostics.push(...pass.run(ctx));
 * }
 * ```
 */
export function buildFileContext(
  filePath: string,
  raw: string,
  project: ProjectContext,
): FileContext {
  const ext = path.extname(filePath).toLowerCase();
  const isCpp = ext === ".cpp" || ext === ".cc" || ext === ".hpp";
  const language = detectLanguage(filePath) ?? (isCpp ? "cpp" : "c");
  const parser = isCpp ? cppParser : cParser;
  const tree = parser.parse(raw);

  return {
    path: filePath,
    raw,
    lines: raw.split("\n"),
    tree,
    rootNode: tree.rootNode,
    role: detectRole(filePath, raw),
    platform: detectPlatform(raw, project.config.platform),
    language,
    isCpp,
    project,
  };
}
