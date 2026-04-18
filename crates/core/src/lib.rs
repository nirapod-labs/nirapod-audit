// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Analysis engine scaffolding for `nirapod-audit`.
//!
//! This crate will replace the current TypeScript core with a single Rust
//! library that owns parsing, rule execution, diagnostics, and reporting
//! types. The initial workspace slice keeps the surface area intentionally
//! small so the migration can proceed in safe, reviewable commits.
//!
//! ## Architecture
//!
//! ```text
//! Source tree
//!     |
//!     v
//! [nirapod-audit-core]
//!     |
//!     +-- types      Shared diagnostic and config data models
//!     +-- parser     tree-sitter integration (planned)
//!     +-- pipeline   Pass orchestration (planned)
//!     +-- rules      Static rule registry (planned)
//! ```
//!
//! ## Status
//!
//! The crate currently exposes the foundational shared types needed by the
//! future parser and CLI layers. More modules will be added as each migration
//! phase lands.
//!
//! ## Configuration
//!
//! The first migration slices already expose typed configuration loading via
//! [`load_config`]. This keeps CLI bootstrap work and future rule execution on
//! the same validated config model.
//!
//! ## Example
//!
//! ```
//! use nirapod_audit_core::{AuditConfig, PlatformHint, Severity};
//!
//! let config = AuditConfig::default();
//! assert_eq!(config.max_function_lines, 60);
//! assert_eq!(config.platform, PlatformHint::Auto);
//! assert_eq!(Severity::Error.as_str(), "error");
//! ```

#![warn(missing_docs)]
#![warn(rustdoc::missing_crate_level_docs)]
#![warn(rustdoc::broken_intra_doc_links)]
#![deny(unsafe_code)]

pub mod config;
pub mod types;

pub use config::{find_config_file, load_config, LoadedConfig, CONFIG_FILENAME};
pub use types::{
    AuditConfig, PlatformHint, RuleCategory, RuleOverride, RuleOverrideSeverity, Severity, Span,
};
