// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Diagnostic, rule, and event protocol types.

use super::{AuditConfig, RuleCategory, Severity, Span};
use crate::SourceLanguage;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Structured reference to a documentation source.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::RuleReference;
///
/// let reference = RuleReference {
///     label: String::from("Rustdoc guide"),
///     file: None,
///     section: None,
///     url: Some(String::from("https://doc.rust-lang.org/rustdoc/")),
/// };
/// assert_eq!(reference.label, "Rustdoc guide");
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuleReference {
    /// Human-readable description of the reference.
    pub label: String,
    /// Absolute or relative path to a local reference document.
    pub file: Option<String>,
    /// Section or anchor within the document.
    pub section: Option<String>,
    /// External URL for web references.
    pub url: Option<String>,
}

/// Static descriptor for a single audit rule.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{Rule, RuleCategory, Severity};
///
/// let rule = Rule {
///     id: String::from("NRP-NASA-006"),
///     category: RuleCategory::Nasa,
///     severity: Severity::Error,
///     title: String::from("function-too-long"),
///     description: String::from("Function body exceeds the configured limit."),
///     rationale: String::from("Long functions are harder to review."),
///     references: Vec::new(),
///     languages: None,
/// };
/// assert_eq!(rule.id, "NRP-NASA-006");
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rule {
    /// Unique rule identifier, such as `NRP-NASA-006`.
    pub id: String,
    /// Top-level category this rule belongs to.
    pub category: RuleCategory,
    /// Default severity before config overrides.
    pub severity: Severity,
    /// Short machine-readable name.
    pub title: String,
    /// One-sentence human description shown by `nirapod-audit rules`.
    pub description: String,
    /// Why the rule exists.
    pub rationale: String,
    /// Structured references to documentation sources.
    pub references: Vec<RuleReference>,
    /// Languages this rule applies to. `None` means all languages.
    pub languages: Option<Vec<SourceLanguage>>,
}

/// A secondary source location attached to a diagnostic for context.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{RelatedSpan, Span};
///
/// let related = RelatedSpan {
///     span: Span::new("a.c", 1, 1, 1, 4, "int"),
///     label: String::from("declared here"),
/// };
/// assert_eq!(related.label, "declared here");
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RelatedSpan {
    /// The secondary source location.
    pub span: Span,
    /// Short label rendered next to the span in the UI.
    pub label: String,
}

/// One violation instance of one rule in one file.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{Diagnostic, Rule, RuleCategory, Severity, Span};
///
/// let diagnostic = Diagnostic {
///     rule: Rule {
///         id: String::from("NRP-NASA-006"),
///         category: RuleCategory::Nasa,
///         severity: Severity::Error,
///         title: String::from("function-too-long"),
///         description: String::from("Function body exceeds the configured limit."),
///         rationale: String::from("Long functions are harder to review."),
///         references: Vec::new(),
///         languages: None,
///     },
///     span: Span::new("a.c", 10, 1, 10, 12, "int main() {"),
///     message: String::from("Function 'main' is too long."),
///     notes: vec![String::from("limit is 60 lines")],
///     help: None,
///     related_spans: Vec::new(),
/// };
/// assert_eq!(diagnostic.notes.len(), 1);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Diagnostic {
    /// The rule that was violated.
    pub rule: Rule,
    /// Primary source location of the violation.
    pub span: Span,
    /// Specific contextual message describing the violation.
    pub message: String,
    /// Additional note lines shown below the primary message.
    pub notes: Vec<String>,
    /// Actionable fix suggestion, if one exists.
    pub help: Option<String>,
    /// Secondary source locations that provide context.
    pub related_spans: Vec<RelatedSpan>,
}

/// Aggregated results for a single source file.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::FileResult;
///
/// let result = FileResult {
///     path: String::from("src/lib.rs"),
///     diagnostics: Vec::new(),
///     errors: 0,
///     warnings: 0,
///     infos: 0,
///     skipped: false,
/// };
/// assert!(!result.skipped);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FileResult {
    /// Absolute path to the file.
    pub path: String,
    /// All diagnostics found in this file.
    pub diagnostics: Vec<Diagnostic>,
    /// Count of `error` severity diagnostics.
    pub errors: usize,
    /// Count of `warning` severity diagnostics.
    pub warnings: usize,
    /// Count of `info` severity diagnostics.
    pub infos: usize,
    /// `true` if the file was skipped.
    pub skipped: bool,
}

/// Final aggregated statistics for a completed audit run.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::AuditSummary;
/// use std::collections::BTreeMap;
///
/// let summary = AuditSummary {
///     total_files: 10,
///     scanned_files: 8,
///     skipped_files: 2,
///     total_errors: 1,
///     total_warnings: 3,
///     total_infos: 0,
///     passed_files: 6,
///     failed_files: 2,
///     rule_hits: BTreeMap::new(),
///     duration_ms: 120,
/// };
/// assert_eq!(summary.total_files, 10);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuditSummary {
    /// Total files discovered, including skipped files.
    pub total_files: usize,
    /// Files actually analyzed.
    pub scanned_files: usize,
    /// Files skipped due to ignore rules.
    pub skipped_files: usize,
    /// Sum of `error`-level diagnostics.
    pub total_errors: usize,
    /// Sum of `warning`-level diagnostics.
    pub total_warnings: usize,
    /// Sum of `info`-level diagnostics.
    pub total_infos: usize,
    /// Files with zero errors and zero warnings.
    pub passed_files: usize,
    /// Files with at least one error or warning.
    pub failed_files: usize,
    /// Map of rule ID to hit count across the run.
    pub rule_hits: BTreeMap<String, usize>,
    /// Wall-clock duration of the audit run in milliseconds.
    pub duration_ms: u128,
}

/// Events streamed from the core analysis engine to the CLI frontend.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{AuditConfig, AuditEvent};
///
/// let event = AuditEvent::AuditStart {
///     total_files: 4,
///     config: AuditConfig::default(),
/// };
/// assert!(matches!(event, AuditEvent::AuditStart { .. }));
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AuditEvent {
    /// Audit run is starting.
    AuditStart {
        /// Total number of files that will be analyzed.
        #[serde(rename = "totalFiles")]
        total_files: usize,
        /// Active configuration for the run.
        config: AuditConfig,
    },
    /// A file is about to be analyzed.
    FileStart {
        /// Absolute path of the file about to be analyzed.
        file: String,
        /// 1-based index of this file in the overall scan order.
        index: usize,
        /// Total number of files in the run.
        total: usize,
    },
    /// A diagnostic was produced.
    Diagnostic {
        /// The violation found during analysis.
        data: Diagnostic,
    },
    /// A file has finished analysis.
    FileDone {
        /// Absolute path of the file that finished.
        file: String,
        /// Number of `error`-level diagnostics in this file.
        errors: usize,
        /// Number of `warning`-level diagnostics in this file.
        warnings: usize,
        /// Number of `info`-level diagnostics in this file.
        infos: usize,
    },
    /// The full audit run has finished.
    AuditDone {
        /// Final aggregated statistics for the run.
        summary: AuditSummary,
    },
    /// Internal non-rule failure.
    Error {
        /// Error message explaining what went wrong.
        message: String,
    },
}
