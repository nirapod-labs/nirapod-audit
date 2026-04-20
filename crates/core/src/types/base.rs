// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Low-level shared types that do not depend on the rest of the protocol.

use serde::{Deserialize, Serialize};

/// Documentation system associated with a source language.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::DocSystem;
///
/// assert_eq!(DocSystem::Rustdoc.as_str(), "rustdoc");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocSystem {
    /// Doxygen for C and C++.
    #[serde(rename = "doxygen")]
    Doxygen,
    /// TSDoc for TypeScript.
    #[serde(rename = "tsdoc")]
    Tsdoc,
    /// rustdoc for Rust.
    #[serde(rename = "rustdoc")]
    Rustdoc,
}

impl DocSystem {
    /// Returns the stable lowercase representation used in configuration and JSON.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::DocSystem;
    ///
    /// assert_eq!(DocSystem::Doxygen.as_str(), "doxygen");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Doxygen => "doxygen",
            Self::Tsdoc => "tsdoc",
            Self::Rustdoc => "rustdoc",
        }
    }
}

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
    /// TypeScript documentation rules.
    #[serde(rename = "TSDOC")]
    Tsdoc,
    /// Rust documentation rules.
    #[serde(rename = "RUSTDOC")]
    Rustdoc,
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
            Self::Tsdoc => "TSDOC",
            Self::Rustdoc => "RUSTDOC",
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
