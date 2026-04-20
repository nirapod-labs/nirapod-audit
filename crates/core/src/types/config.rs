// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Configuration-related protocol types.

use super::RuleCategory;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
