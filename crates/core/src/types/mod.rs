// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared public types used across the Rust migration.
//!
//! These modules mirror the protocol surface that used to live in the
//! TypeScript workspace. Splitting them early keeps file size under control and
//! makes later phase work easier to review.

mod audit;
mod base;
mod config;
mod file;

pub use audit::{
    AuditEvent, AuditSummary, Diagnostic, FileResult, RelatedSpan, Rule, RuleReference,
};
pub use base::{DocSystem, RuleCategory, Severity, Span};
pub use config::{AuditConfig, PlatformHint, RuleOverride, RuleOverrideSeverity};
pub use file::FileRole;
