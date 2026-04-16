/**
 * @file index.ts
 * @brief Shared wire-protocol types for nirapod-audit.
 *
 * Defines every type that crosses the boundary between the core analysis
 * engine and the CLI frontend. Both packages import exclusively from here,
 * so the boundary can be swapped (e.g. Rust binary replacing the TS core)
 * without touching either consumer.
 *
 * @remarks
 * No runtime code lives here — only type declarations and one frozen
 * `DEFAULT_CONFIG` constant. Tree-shake cost is zero.
 *
 * @see {@link AuditEvent} for the ndjson wire events streamed from core → CLI.
 * @see {@link Diagnostic} for the per-violation data structure.
 * @see {@link Language} for multi-ecosystem support.
 * @module Protocol
 *
 * @author Nirapod Team
 * @date 2026
 *
 * SPDX-License-Identifier: APACHE-2.0
 * SPDX-FileCopyrightText: 2026 Nirapod Contributors
 */

/**
 * Source language ecosystem.
 *
 * @remarks
 * Drives parser selection, pass filtering, and doc-system rules.
 * The pipeline detects language from file extensions. Each language maps
 * to a specific tree-sitter grammar and documentation system.
 */
export type Language =
  | "c"
  | "cpp"
  | "typescript"
  | "rust";

/**
 * Documentation system associated with a language ecosystem.
 *
 * @remarks
 * `"doxygen"` applies to C/C++, `"tsdoc"` to TypeScript, `"rustdoc"` to Rust.
 * Used by rules to declare which documentation system they validate.
 */
export type DocSystem =
  | "doxygen"
  | "tsdoc"
  | "rustdoc";

/**
 * Maps each language to its documentation system.
 *
 * @remarks
 * Used by the pipeline to select the correct pass family for each file.
 */
export const LANGUAGE_DOC_SYSTEM: Readonly<Record<Language, DocSystem>> = {
  c: "doxygen",
  cpp: "doxygen",
  typescript: "tsdoc",
  rust: "rustdoc",
};

/**
 * Structured reference to a documentation source.
 *
 * @remarks
 * Used in {@link Rule.references} instead of plain strings. When both
 * `file` and `section` are present, the `explain` command can open the
 * file directly and highlight the relevant section.
 */
export interface RuleReference {
  /**
   * Human-readable description of the reference.
   *
   * @remarks Shown as the label in diagnostic output and the `explain` command.
   */
  label: string;
  /**
   * Absolute or relative path to the reference document.
   *
   * @remarks `null` for external references (e.g. web URLs).
   */
  file: string | null;
  /**
   * Section or anchor within the document, e.g. `"## Part 1"` or `"Section 1.1"`.
   *
   * @remarks `null` when pointing to the entire document.
   */
  section: string | null;
  /**
   * External URL for web references (e.g. SPDX license list, RFCs).
   *
   * @remarks `null` for local file references.
   */
  url: string | null;
}

/**
 * Exact source location of a finding within a file.
 *
 * @remarks
 * All line and column values are 1-based to match editor conventions.
 * `snippet` holds the raw source text the span covers, capped at 3 lines
 * so diagnostics stay readable in the TUI.
 */
export interface Span {
  /** Absolute path to the source file. */
  file: string;
  /** Line number of the first character, 1-based. */
  startLine: number;
  /** Column number of the first character, 1-based. */
  startCol: number;
  /** Line number of the last character, 1-based. */
  endLine: number;
  /** Column number of the last character, 1-based. */
  endCol: number;
  /** Raw source text this span covers (max 3 lines). */
  snippet: string;
}

/**
 * Top-level grouping for audit rules.
 *
 * @remarks
 * Used by `AuditConfig.onlyCategories` to narrow which rule families run,
 * and by the compliance matrix to group results in the TUI.
 */
export type RuleCategory =
  | "LICENSE"
  | "DOXYGEN"
  | "TSDOC"
  | "RUSTDOC"
  | "NASA"
  | "CRYPTO"
  | "MEMORY"
  | "STYLE";

/**
 * How seriously a rule violation should be treated.
 *
 * @remarks
 * `error` causes exit code 1 and blocks CI. `warning` is reported but
 * does not affect exit code (unless `--strict` is passed). `info` is
 * informational only.
 */
export type Severity = "error" | "warning" | "info";

/**
 * Static descriptor for a single audit rule.
 *
 * @remarks
 * Rules are stateless singletons — one instance per rule ID shared across
 * every file analysis. The `check` logic lives in the pass, not here.
 */
export interface Rule {
  /** Unique rule identifier, e.g. `"NRP-NASA-006"`. */
  id: string;
  /** Top-level category this rule belongs to. */
  category: RuleCategory;
  /** Default severity; overridable via `AuditConfig.ruleOverrides`. */
  severity: Severity;
  /** Short machine-readable name, e.g. `"function-too-long"`. */
  title: string;
  /** One-sentence human description shown by `nirapod-audit rules`. */
  description: string;
  /** Why this rule exists — shown by `nirapod-audit explain <id>`. */
  rationale: string;
  /**
   * Structured references to documentation sources.
   *
   * @remarks
   * Points to actual files and sections within the skill references.
   * The `explain` command can resolve these to display inline docs.
   */
  references: RuleReference[];
  /**
   * Languages this rule applies to.
   *
   * @remarks
   * If empty or undefined, the rule applies to all languages.
   * Passes use this to skip irrelevant rules for a given file's language.
   */
  languages?: Language[];
}

/**
 * A secondary source location attached to a diagnostic for context.
 *
 * @remarks
 * Mirrors rustc's "note: ..." secondary spans. For example, when reporting
 * a missing null-check on a pointer, the related span points to where the
 * pointer was first declared.
 */
export interface RelatedSpan {
  /** The secondary source location. */
  span: Span;
  /** Short label rendered next to the span in the TUI, e.g. `"declared here"`. */
  label: string;
}

/**
 * One violation instance of one rule in one file.
 *
 * @remarks
 * Mirrors the rustc diagnostic format: a primary span, a human message,
 * optional notes with rationale, an actionable help suggestion, and optional
 * secondary spans for context. Every field is serialisable to JSON so the
 * same struct flows over the ndjson wire and into SARIF output.
 */
export interface Diagnostic {
  /** The rule that was violated. */
  rule: Rule;
  /** Primary source location of the violation. */
  span: Span;
  /**
   * Specific, contextual message describing this violation.
   *
   * @remarks
   * Must mention the concrete symbol name and measured value where applicable.
   * Good: `"Function 'encryptGcm' is 87 lines; limit is 60."`
   * Bad: `"Function is too long."`
   */
  message: string;
  /**
   * Additional context lines shown below the primary message.
   *
   * @remarks
   * Use for rule rationale, measured counts, or related facts.
   * Each string renders as one `note: …` line in the TUI.
   */
  notes: string[];
  /**
   * Actionable fix suggestion, or `null` if no mechanical fix applies.
   *
   * @remarks
   * Write for the engineer debugging at 2 am. Concrete beats generic:
   * name the split point, the correct API, or the exact replacement.
   */
  help: string | null;
  /** Secondary source locations that provide context for this violation. */
  relatedSpans: RelatedSpan[];
}

/**
 * Aggregated results for a single source file.
 */
export interface FileResult {
  /** Absolute path to the file. */
  path: string;
  /** All diagnostics found in this file, sorted by severity then line. */
  diagnostics: Diagnostic[];
  /** Count of `error`-severity diagnostics in this file. */
  errors: number;
  /** Count of `warning`-severity diagnostics in this file. */
  warnings: number;
  /** Count of `info`-severity diagnostics in this file. */
  infos: number;
  /** `true` if the file matched an `ignorePaths` pattern and was skipped. */
  skipped: boolean;
}

/**
 * Final aggregated statistics for a completed audit run.
 */
export interface AuditSummary {
  /** Total files discovered (including skipped). */
  totalFiles: number;
  /** Files actually analysed (excludes skipped). */
  scannedFiles: number;
  /** Files skipped due to `ignorePaths` patterns. */
  skippedFiles: number;
  /** Sum of `error`-level diagnostics across all files. */
  totalErrors: number;
  /** Sum of `warning`-level diagnostics across all files. */
  totalWarnings: number;
  /** Sum of `info`-level diagnostics across all files. */
  totalInfos: number;
  /** Files with zero errors and zero warnings. */
  passedFiles: number;
  /** Files with at least one error or warning. */
  failedFiles: number;
  /** Map of rule ID → hit count across all files. */
  ruleHits: Record<string, number>;
  /** Wall-clock duration of the full audit run in milliseconds. */
  durationMs: number;
}

/**
 * Events streamed from the core analysis engine to the CLI frontend.
 *
 * @remarks
 * Transmitted as newline-delimited JSON (ndjson) over stdout when the Rust
 * binary runner is used, or yielded directly from an `AsyncIterable` when
 * the TypeScript `TsRunner` is used. The CLI treats both sources identically.
 *
 * @see {@link CoreRunner} in `apps/cli/src/runner.ts` for the consumer interface.
 */
export type AuditEvent =
  | {
    type: "audit_start";
    /** Total number of files that will be analysed. */
    totalFiles: number;
    /** Active configuration for this run. */
    config: AuditConfig;
  }
  | {
    type: "file_start";
    /** Absolute path of the file about to be analysed. */
    file: string;
    /** 1-based index of this file in the overall scan order. */
    index: number;
    /** Total file count (same as `audit_start.totalFiles`). */
    total: number;
  }
  | {
    type: "diagnostic";
    /** The violation found during analysis. */
    data: Diagnostic;
  }
  | {
    type: "file_done";
    /** Absolute path of the file that was just analysed. */
    file: string;
    /** Number of `error`-level diagnostics found in this file. */
    errors: number;
    /** Number of `warning`-level diagnostics found in this file. */
    warnings: number;
    /** Number of `info`-level diagnostics found in this file. */
    infos: number;
  }
  | {
    type: "audit_done";
    /** Final aggregated statistics for the completed run. */
    summary: AuditSummary;
  }
  | {
    type: "error";
    /** Internal error message (parse failure, missing file, etc.). */
    message: string;
  };

/**
 * Target hardware platform.
 *
 * @remarks
 * Controls which platform-specific crypto rules are active. Set `"auto"` to
 * let the core infer the platform from `#include` directives and preprocessor
 * guards found in each file.
 */
export type PlatformHint =
  | "nrf52840"
  | "nrf5340"
  | "esp32"
  | "multi"
  | "host"
  | "auto";

/**
 * Per-rule severity override from `nirapod-audit.toml`.
 */
export interface RuleOverride {
  /**
   * New severity for the rule, or `"ignore"` to suppress it entirely.
   *
   * @remarks
   * Overriding an `error` to `"ignore"` does not affect exit code.
   * Downgrading to `"warning"` still reports the finding but does not
   * block CI unless `--strict` is passed.
   */
  severity: Severity | "ignore";
}

/**
 * Full configuration for a single audit run.
 *
 * @remarks
 * Loaded from `nirapod-audit.toml` in the project root and merged with
 * CLI flag overrides. CLI flags always win over the config file.
 *
 * @see {@link DEFAULT_CONFIG} for the baseline values.
 */
export interface AuditConfig {
  /** Platform hint for platform-specific rule activation. */
  platform: PlatformHint;
  /**
   * Maximum allowed non-blank, non-comment lines per function body.
   *
   * @remarks NASA JPL Rule 4. Default: 60 lines.
   * @minimum 10
   * @maximum 200
   */
  maxFunctionLines: number;
  /**
   * Minimum number of `NIRAPOD_ASSERT` calls required per non-trivial function.
   *
   * @remarks NASA JPL Rule 5. Default: 2.
   * @minimum 0
   * @maximum 10
   */
  minAssertions: number;
  /** Glob patterns for files and directories to exclude from analysis. */
  ignorePaths: string[];
  /**
   * If non-empty, only rules from these categories are run.
   *
   * @remarks An empty array means all categories are active.
   */
  onlyCategories: RuleCategory[];
  /** Rule IDs to suppress entirely, e.g. `["NRP-STYLE-001"]`. */
  ignoreRules: string[];
  /** Per-rule severity overrides keyed by rule ID. */
  ruleOverrides: Record<string, RuleOverride>;
  /** Whether to include `help:` fix suggestions in diagnostic output. */
  showHelp: boolean;
  /** Whether to include `note:` rationale lines in diagnostic output. */
  showNotes: boolean;
}

/**
 * Sensible baseline configuration used when no `nirapod-audit.toml` exists.
 *
 * @remarks
 * All rule categories active, platform auto-detected, help and notes shown.
 * NASA function-length limit 60 lines, minimum 2 assertions per function.
 */
export const DEFAULT_CONFIG: AuditConfig = {
  platform: "auto",
  maxFunctionLines: 60,
  minAssertions: 2,
  ignorePaths: [
    "build/**",
    "cmake-build-*/**",
    "**/vendor/**",
    "**/third_party/**",
    "**/third-party/**",
    "node_modules/**",
  ],
  onlyCategories: [],
  ignoreRules: [],
  ruleOverrides: {},
  showHelp: true,
  showNotes: true,
};

/**
 * Structural role of a source file, used to decide which rule subsets apply.
 *
 * @remarks
 * - `"public-header"`: strictest Doxygen and API rules (`.h` / `.hpp`).
 * - `"impl"`: implementation files (`.c` / `.cpp`). Doxygen rules relax for
 *    private symbols.
 * - `"test"`: test files. NASA allocation and assertion rules are relaxed.
 * - `"third-party"`: skipped entirely (matched by `ignorePaths` patterns).
 * - `"module-doc"`: `module-doc.h` files — must declare `@defgroup`.
 */
export type FileRole =
  | "public-header"
  | "impl"
  | "asm"
  | "cmake"
  | "config"
  | "module-doc"
  | "test"
  | "third-party"
  /* TypeScript roles (future) */
  | "ts-module"
  | "ts-component"
  | "ts-hook"
  | "ts-type"
  | "ts-entry"
  | "ts-test"
  /* Rust roles (future) */
  | "rs-lib"
  | "rs-bin"
  | "rs-mod"
  | "rs-test";
