// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared public types used across the Rust migration.
//!
//! These data structures mirror the core protocol concepts that already exist
//! in the TypeScript implementation. They are deliberately small in the first
//! migration step so the workspace can compile before parser and pipeline code
//! lands.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// Exact source location of a finding within a file.
///
/// The coordinates are 1-based to match editor and compiler diagnostics.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::Span;
///
/// let span = Span::new("src/lib.rs", 1, 1, 1, 10, "fn main() {");
/// assert_eq!(span.start_line, 1);
/// assert_eq!(span.end_col, 10);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Span {
    /// Absolute or project-relative source path.
    pub file: String,
    /// First covered line number, 1-based.
    pub start_line: usize,
    /// First covered column number, 1-based.
    pub start_col: usize,
    /// Last covered line number, 1-based.
    pub end_line: usize,
    /// Last covered column number, 1-based.
    pub end_col: usize,
    /// Short source snippet rendered with the diagnostic.
    pub snippet: String,
}

impl Span {
    /// Creates a new [`Span`] from explicit source coordinates.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::Span;
    ///
    /// let span = Span::new("a.c", 3, 5, 3, 12, "return err;");
    /// assert_eq!(span.file, "a.c");
    /// ```
    #[must_use]
    pub fn new(
        file: impl Into<String>,
        start_line: usize,
        start_col: usize,
        end_line: usize,
        end_col: usize,
        snippet: impl Into<String>,
    ) -> Self {
        Self {
            file: file.into(),
            start_line,
            start_col,
            end_line,
            end_col,
            snippet: snippet.into(),
        }
    }
}

/// Top-level grouping for audit rules.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::RuleCategory;
///
/// assert_eq!(RuleCategory::Nasa.as_str(), "NASA");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleCategory {
    /// License and SPDX compliance rules.
    #[serde(rename = "LICENSE")]
    License,
    /// C and C++ Doxygen rules.
    #[serde(rename = "DOXYGEN")]
    Doxygen,
    /// NASA/JPL-inspired structural safety rules.
    #[serde(rename = "NASA")]
    Nasa,
    /// Cryptographic and platform rules.
    #[serde(rename = "CRYPTO")]
    Crypto,
    /// Memory-safety rules.
    #[serde(rename = "MEMORY")]
    Memory,
    /// General style and wording rules.
    #[serde(rename = "STYLE")]
    Style,
}

impl RuleCategory {
    /// Returns the stable CLI label for this category.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::RuleCategory;
    ///
    /// assert_eq!(RuleCategory::Crypto.as_str(), "CRYPTO");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::License => "LICENSE",
            Self::Doxygen => "DOXYGEN",
            Self::Nasa => "NASA",
            Self::Crypto => "CRYPTO",
            Self::Memory => "MEMORY",
            Self::Style => "STYLE",
        }
    }
}

/// Severity level assigned to a rule or diagnostic.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::Severity;
///
/// assert_eq!(Severity::Warning.as_str(), "warning");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    /// Blocks CI and results in a non-zero audit exit code.
    Error,
    /// Requires attention but does not fail a non-strict run.
    Warning,
    /// Provides additional context without affecting outcome.
    Info,
}

impl Severity {
    /// Returns the stable lowercase label for this severity.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::Severity;
    ///
    /// assert_eq!(Severity::Info.as_str(), "info");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Error => "error",
            Self::Warning => "warning",
            Self::Info => "info",
        }
    }
}

/// Runtime configuration shared by the future parser and CLI layers.
///
/// The defaults reflect the limits described in the migration plan and can be
/// expanded as new rule controls land.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{AuditConfig, PlatformHint};
///
/// let config = AuditConfig::default();
/// assert_eq!(config.max_function_lines, 60);
/// assert_eq!(config.min_assertions, 2);
/// assert_eq!(config.platform, PlatformHint::Auto);
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuditConfig {
    /// Platform hint used to enable or suppress platform-specific rules.
    pub platform: PlatformHint,
    /// Maximum allowed non-comment, non-blank lines in a function body.
    pub max_function_lines: usize,
    /// Minimum number of meaningful assertions expected in critical functions.
    pub min_assertions: usize,
    /// Glob patterns excluded from analysis.
    pub ignore_paths: Vec<String>,
    /// Active category subset. An empty list means all categories.
    pub only_categories: Vec<RuleCategory>,
    /// Stable rule IDs suppressed entirely.
    pub ignore_rules: Vec<String>,
    /// Per-rule severity overrides keyed by stable rule ID.
    pub rule_overrides: BTreeMap<String, RuleOverride>,
    /// Whether help text should be emitted with diagnostics.
    pub show_help: bool,
    /// Whether explanatory note text should be emitted with diagnostics.
    pub show_notes: bool,
}

impl Default for AuditConfig {
    fn default() -> Self {
        Self {
            platform: PlatformHint::Auto,
            max_function_lines: 60,
            min_assertions: 2,
            ignore_paths: vec![
                "build/**".to_owned(),
                "cmake-build-*/**".to_owned(),
                "**/vendor/**".to_owned(),
                "**/third_party/**".to_owned(),
                "**/third-party/**".to_owned(),
                "node_modules/**".to_owned(),
            ],
            only_categories: Vec::new(),
            ignore_rules: Vec::new(),
            rule_overrides: BTreeMap::new(),
            show_help: true,
            show_notes: true,
        }
    }
}

/// Target hardware platform used for platform-specific rule activation.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::PlatformHint;
///
/// assert_eq!(PlatformHint::Esp32.as_str(), "esp32");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlatformHint {
    /// Nordic nRF52840 targets.
    #[serde(rename = "nrf52840")]
    Nrf52840,
    /// Nordic nRF5340 targets.
    #[serde(rename = "nrf5340")]
    Nrf5340,
    /// Espressif ESP32-family targets.
    #[serde(rename = "esp32")]
    Esp32,
    /// Mixed-platform repositories.
    #[serde(rename = "multi")]
    Multi,
    /// Host-only code with no hardware-specific rules.
    #[serde(rename = "host")]
    Host,
    /// Automatic per-file inference.
    #[serde(rename = "auto")]
    Auto,
}

impl PlatformHint {
    /// Returns the stable lowercase representation used in TOML.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::PlatformHint;
    ///
    /// assert_eq!(PlatformHint::Nrf5340.as_str(), "nrf5340");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Nrf52840 => "nrf52840",
            Self::Nrf5340 => "nrf5340",
            Self::Esp32 => "esp32",
            Self::Multi => "multi",
            Self::Host => "host",
            Self::Auto => "auto",
        }
    }
}

/// Severity override applied through configuration.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::RuleOverrideSeverity;
///
/// assert_eq!(RuleOverrideSeverity::Ignore.as_str(), "ignore");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleOverrideSeverity {
    /// Treat the rule as an error.
    #[serde(rename = "error")]
    Error,
    /// Treat the rule as a warning.
    #[serde(rename = "warning")]
    Warning,
    /// Treat the rule as informational.
    #[serde(rename = "info")]
    Info,
    /// Suppress the rule entirely.
    #[serde(rename = "ignore")]
    Ignore,
}

impl RuleOverrideSeverity {
    /// Returns the stable lowercase representation used in TOML.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::RuleOverrideSeverity;
    ///
    /// assert_eq!(RuleOverrideSeverity::Warning.as_str(), "warning");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Error => "error",
            Self::Warning => "warning",
            Self::Info => "info",
            Self::Ignore => "ignore",
        }
    }
}

/// Per-rule override loaded from `nirapod-audit.toml`.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{RuleOverride, RuleOverrideSeverity};
///
/// let rule_override = RuleOverride {
///     severity: RuleOverrideSeverity::Info,
/// };
/// assert_eq!(rule_override.severity.as_str(), "info");
/// ```
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuleOverride {
    /// Replacement severity for the configured rule.
    pub severity: RuleOverrideSeverity,
}
