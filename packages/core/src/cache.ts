/**
 * @file cache.ts
 * @brief File hash cache for incremental audit mode.
 *
 * @remarks
 * Stores SHA-256 hashes of previously audited files alongside their
 * diagnostic counts. On subsequent runs, unchanged files (same hash)
 * are skipped entirely, saving parsing and analysis time.
 *
 * The cache lives in `.nirapod-audit-cache.json` in the project root.
 * Delete it to force a full re-audit.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Cache directory relative to the project root.
 */
const CACHE_DIR = path.join(".nirapod", "audit");

/**
 * Cache file name within the cache directory.
 */
const CACHE_FILENAME = "cache.json";

/**
 * Per-file cache entry.
 *
 * @remarks
 * Stores the SHA-256 hash of the file content at the time of the last audit,
 * plus the error/warning counts so skipped files can still contribute
 * accurate totals.
 */
export interface CacheEntry {
  /** SHA-256 hex digest of the file content. */
  hash: string;
  /** Number of errors found in the last audit. */
  errors: number;
  /** Number of warnings found in the last audit. */
  warnings: number;
  /** Number of info diagnostics found in the last audit. */
  infos: number;
  /** Per-rule hit counts for category breakdown reconstruction. */
  ruleHits: Record<string, number>;
  /** ISO timestamp of the last audit. */
  lastAudit: string;
}

/**
 * Full cache structure persisted to disk.
 */
export interface AuditCache {
  /** Cache format version for forward compatibility. */
  version: number;
  /** Map of relative file paths to their cache entries. */
  files: Record<string, CacheEntry>;
}

/**
 * Computes SHA-256 hash of a string.
 *
 * @param content - File content to hash.
 * @returns Hex-encoded SHA-256 digest.
 *
 * @example
 * ```typescript
 * const h = await hashContent("hello world");
 * // → "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */
export async function hashContent(content: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return hasher.digest("hex");
}

/**
 * Loads the cache from disk.
 *
 * @param rootDir - Project root directory.
 * @returns The loaded cache, or a fresh empty cache if the file doesn't exist.
 */
export function loadCache(rootDir: string): AuditCache {
  const cacheDir = path.join(rootDir, CACHE_DIR);
  const cachePath = path.join(cacheDir, CACHE_FILENAME);
  if (!existsSync(cachePath)) {
    return { version: 1, files: {} };
  }

  try {
    const raw = readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(raw) as AuditCache;
    if (parsed.version !== 1) {
      return { version: 1, files: {} };
    }
    return parsed;
  } catch {
    return { version: 1, files: {} };
  }
}

/**
 * Saves the cache to disk.
 *
 * @param rootDir - Project root directory.
 * @param cache - Cache object to persist.
 */
export function saveCache(rootDir: string, cache: AuditCache): void {
  const cacheDir = path.join(rootDir, CACHE_DIR);
  const cachePath = path.join(cacheDir, CACHE_FILENAME);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Checks if a file can be skipped based on its cached hash.
 *
 * @param cache - Current audit cache.
 * @param relPath - Relative path of the file (used as cache key).
 * @param currentHash - SHA-256 hash of the current file content.
 * @returns The cached entry if unchanged, or `null` if re-audit is needed.
 */
export function getCachedResult(
  cache: AuditCache,
  relPath: string,
  currentHash: string,
): CacheEntry | null {
  const entry = cache.files[relPath];
  if (entry && entry.hash === currentHash) {
    return entry;
  }
  return null;
}

/**
 * Updates the cache with fresh results for a file.
 *
 * @param cache - Cache to update (mutated in place).
 * @param relPath - Relative path of the file.
 * @param hash - SHA-256 hash of the current file content.
 * @param errors - Number of errors found.
 * @param warnings - Number of warnings found.
 * @param infos - Number of info diagnostics found.
 */
export function updateCacheEntry(
  cache: AuditCache,
  relPath: string,
  hash: string,
  errors: number,
  warnings: number,
  infos: number,
  ruleHits: Record<string, number>,
): void {
  cache.files[relPath] = {
    hash,
    errors,
    warnings,
    infos,
    ruleHits,
    lastAudit: new Date().toISOString(),
  };
}
