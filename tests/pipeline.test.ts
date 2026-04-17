/**
 * @file pipeline.test.ts
 * @brief Integration tests for the nirapod-audit pipeline.
 *
 * @remarks
 * Runs the full pipeline against test fixture files and verifies
 * that the correct rules fire with the correct counts. Each fixture
 * is audited once and results are shared across assertions to avoid
 * cache interference.
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { runPipeline, ALL_RULES } from "../packages/core/src/index.js";
import { DEFAULT_CONFIG } from "../packages/protocol/src/index.js";
import type { AuditConfig, Diagnostic, AuditSummary } from "../packages/protocol/src/index.js";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const FIXTURES = path.resolve(import.meta.dir, "violations");
const COMPLIANT = path.resolve(import.meta.dir, "fixtures/compliant");

/** Clears cache file if it exists. */
function clearCache(dir: string): void {
  const cache = path.join(dir, ".nirapod", "audit", "cache.json");
  if (existsSync(cache)) unlinkSync(cache);
}

/** Run audit on a path, clearing cache first. */
async function auditFile(filePath: string, overrides?: Partial<AuditConfig>) {
  const resolvedPath = path.resolve(filePath);
  const dir = resolvedPath.match(/\.(h|hpp|c|cpp|cc)$/i)
    ? path.dirname(resolvedPath)
    : resolvedPath;
  clearCache(dir);

  const config: AuditConfig = { ...DEFAULT_CONFIG, ignorePaths: [], ...overrides };
  const diagnostics: Diagnostic[] = [];
  let summary: AuditSummary | null = null;

  for await (const event of runPipeline(filePath, config)) {
    if (event.type === "diagnostic") {
      diagnostics.push(event.data);
    }
    if (event.type === "audit_done") {
      summary = event.summary;
    }
  }

  // Clean up cache after test
  clearCache(dir);

  return { diagnostics, summary };
}

/** Count diagnostics by rule ID prefix. */
function countByPrefix(diags: Diagnostic[], prefix: string): number {
  return diags.filter((d) => d.rule.id.startsWith(prefix)).length;
}

/** Count diagnostics for a specific rule ID. */
function countById(diags: Diagnostic[], id: string): number {
  return diags.filter((d) => d.rule.id === id).length;
}

// ── Registry Tests ──

describe("Rule Registry", () => {
  test("has 72 rules total (22 base + 17 advanced DOXYGEN)", () => {
    expect(ALL_RULES.length).toBe(72);
  });

  test("has correct category counts", () => {
    expect(ALL_RULES.filter((r) => r.category === "LICENSE").length).toBe(4);
    expect(ALL_RULES.filter((r) => r.category === "DOXYGEN").length).toBe(39);
    expect(ALL_RULES.filter((r) => r.category === "NASA").length).toBe(12);
    expect(ALL_RULES.filter((r) => r.category === "CRYPTO").length).toBe(9);
    expect(ALL_RULES.filter((r) => r.category === "MEMORY").length).toBe(4);
    expect(ALL_RULES.filter((r) => r.category === "STYLE").length).toBe(4);
  });

  test("every rule has required fields", () => {
    for (const rule of ALL_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.title).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.rationale).toBeTruthy();
    }
  });

  test("every rule has a valid ID format", () => {
    for (const rule of ALL_RULES) {
      expect(rule.id.startsWith("NRP-")).toBe(true);
    }
  });

  test("no duplicate rule IDs", () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── LICENSE Tests ──

describe("LICENSE rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-LIC-001-no-spdx.h"));
    diags = result.diagnostics;
  });

  test("NRP-LIC-001 fires on missing SPDX identifier", () => {
    expect(countById(diags, "NRP-LIC-001")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-LIC-002 fires on missing copyright", () => {
    expect(countById(diags, "NRP-LIC-002")).toBeGreaterThanOrEqual(1);
  });
});

// ── Doxygen Tests ──

describe("DOXYGEN rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-DOX-001-no-file-header.h"));
    diags = result.diagnostics;
  });

  test("NRP-DOX-001 fires on missing file header", () => {
    expect(countById(diags, "NRP-DOX-001")).toBeGreaterThanOrEqual(1);
  });
});

// ── NASA Tests ──

describe("NASA rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-NASA-violations.h"));
    diags = result.diagnostics;
  });

  test("NRP-NASA-001 fires on goto", () => {
    expect(countById(diags, "NRP-NASA-001")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-NASA-005 fires on dynamic allocation", () => {
    expect(countById(diags, "NRP-NASA-005")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-NASA-009 fires on macro constants", () => {
    expect(countById(diags, "NRP-NASA-009")).toBeGreaterThanOrEqual(1);
  });

  test("total NASA findings >= 5", () => {
    expect(countByPrefix(diags, "NRP-NASA")).toBeGreaterThanOrEqual(5);
  });
});

// ── Crypto Tests ──

describe("CRYPTO rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-CRYPTO-violations.h"));
    diags = result.diagnostics;
  });

  test("NRP-CRYPTO-001 fires on memset zeroization", () => {
    expect(countById(diags, "NRP-CRYPTO-001")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-CRYPTO-002 fires on key-in-log", () => {
    expect(countById(diags, "NRP-CRYPTO-002")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-CRYPTO-005 fires on missing mutex", () => {
    expect(countById(diags, "NRP-CRYPTO-005")).toBeGreaterThanOrEqual(1);
  });

  test("NRP-CRYPTO-007 fires on IV reuse", () => {
    expect(countById(diags, "NRP-CRYPTO-007")).toBeGreaterThanOrEqual(1);
  });
});

// ── Memory Tests ──

describe("MEMORY rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-MEM-violations.h"));
    diags = result.diagnostics;
  });

  test("NRP-MEM-004 fires on size narrowing", () => {
    expect(countById(diags, "NRP-MEM-004")).toBeGreaterThanOrEqual(1);
  });
});

// ── Style Tests ──

describe("STYLE rules", () => {
  let diags: Diagnostic[];

  beforeAll(async () => {
    const result = await auditFile(path.join(FIXTURES, "NRP-STYLE-001-banned-words.h"));
    diags = result.diagnostics;
  });

  test("NRP-STYLE-001 fires on banned words", () => {
    expect(countById(diags, "NRP-STYLE-001")).toBeGreaterThanOrEqual(1);
  });
});

// ── Compliant Tests ──

describe("Compliant fixture", () => {
  test("produces zero errors on compliant files", async () => {
    const { summary } = await auditFile(COMPLIANT);
    expect(summary).toBeTruthy();
    expect(summary!.totalErrors).toBe(0);
  });
});

// ── Config Tests ──

describe("Config filtering", () => {
  test("onlyCategories filters to selected category", async () => {
    const { diagnostics } = await auditFile(
      path.join(FIXTURES, "NRP-NASA-violations.h"),
      { onlyCategories: ["NASA"] },
    );
    for (const d of diagnostics) {
      expect(d.rule.category).toBe("NASA");
    }
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  test("ignoreRules suppresses specific rule", async () => {
    const { diagnostics } = await auditFile(
      path.join(FIXTURES, "NRP-LIC-001-no-spdx.h"),
      { ignoreRules: ["NRP-LIC-001"] },
    );
    expect(countById(diagnostics, "NRP-LIC-001")).toBe(0);
  });
});

// ── Summary Tests ──

describe("Summary structure", () => {
  test("summary has all required fields", async () => {
    const { summary } = await auditFile(
      path.join(FIXTURES, "NRP-NASA-violations.h"),
    );
    expect(summary).toBeTruthy();
    expect(summary!.totalFiles).toBeGreaterThanOrEqual(1);
    expect(summary!.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof summary!.totalErrors).toBe("number");
    expect(typeof summary!.totalWarnings).toBe("number");
    expect(typeof summary!.ruleHits).toBe("object");
  });
});
