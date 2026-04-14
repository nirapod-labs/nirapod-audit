/**
 * @file index.ts
 * @brief Public API for the @nirapod-audit/core analysis engine.
 *
 * @remarks
 * Re-exports the essential types and functions that the CLI and any
 * external consumer needs. Everything else is internal to the core package.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

export { runPipeline } from "./pipeline/index.js";
export { buildFileContext, detectLanguage } from "./context.js";
export type { FileContext, ProjectContext } from "./context.js";
export type { Pass } from "./pipeline/pass.js";
export { buildDiagnostic, nodeToSpan, lineSpan } from "./diagnostic.js";
export { ALL_RULES, findRule } from "./rules/index.js";
export { LexPass } from "./passes/lex-pass.js";
export { AstPass } from "./passes/ast-pass.js";
export { NasaPass } from "./passes/nasa-pass.js";
export { CryptoPass } from "./passes/crypto-pass.js";
export { MemoryPass } from "./passes/memory-pass.js";
export { loadConfig, findConfigFile } from "./config.js";
export { loadCache, saveCache, hashContent } from "./cache.js";
