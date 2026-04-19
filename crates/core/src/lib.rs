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
//! ## Phase 1 parser bootstrap
//!
//! The crate now includes tree-sitter parser scaffolding, embedded query files,
//! file discovery, and file-context builders for C and C++ source trees. That
//! is enough for the CLI to validate an audit target before real passes land.
//!
//! ## Example
//!
//! ```
//! use nirapod_audit_core::{
//!     detect_language, discover_audit_target, AuditConfig, PlatformHint, Severity, SourceLanguage,
//! };
//! use std::path::PathBuf;
//!
//! let config = AuditConfig::default();
//! assert_eq!(config.max_function_lines, 60);
//! assert_eq!(config.platform, PlatformHint::Auto);
//! assert_eq!(detect_language("src/lib.rs"), Some(SourceLanguage::Rust));
//!
//! let fixture_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
//!     .join("../../tests/fixtures/compliant");
//! let target = discover_audit_target(&fixture_dir, &config.ignore_paths)?;
//! assert_eq!(target.files.len(), 1);
//! assert_eq!(Severity::Error.as_str(), "error");
//! # Ok::<(), Box<dyn std::error::Error>>(())
//! ```

#![warn(missing_docs)]
#![warn(rustdoc::missing_crate_level_docs)]
#![warn(rustdoc::broken_intra_doc_links)]
#![deny(unsafe_code)]

pub mod config;
pub mod context;
pub mod diagnostic;
pub mod parser;
pub mod passes;
pub mod pipeline;
pub mod rules;
pub mod types;

pub use config::{find_config_file, load_config, LoadedConfig, CONFIG_FILENAME};
pub use context::{
    build_file_context, build_project_context, detect_file_role, resolve_platform_hint,
    ContextBuildError, FileContext, ProjectContext,
};
pub use diagnostic::{build_diagnostic, line_span, node_to_span, DiagnosticInit};
pub use parser::{
    build_parser, count_function_items, detect_language, parse_source, query_text, ParserError,
    QueryText, SourceLanguage,
};
pub use passes::{AstPass, LexPass, NasaPass};
pub use pipeline::pass::Pass;
pub use pipeline::{discover_audit_target, AuditTarget, DiscoverAuditTargetError};
pub use rules::{
    find_rule, ALL_RULES, CRYPTO_RULES, DOXYGEN_RULES, LICENSE_RULES, MEMORY_RULES, NASA_RULES,
    STYLE_RULES,
};
pub use types::{
    AuditConfig, AuditEvent, AuditSummary, Diagnostic, DocSystem, FileResult, FileRole,
    PlatformHint, RelatedSpan, Rule, RuleCategory, RuleOverride, RuleOverrideSeverity,
    RuleReference, Severity, Span,
};
