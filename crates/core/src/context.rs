// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! File and project context builders for the analysis pipeline.
//!
//! Each source file is parsed once and handed to later passes through a
//! read-only [`FileContext`]. That keeps parser setup centralized and avoids
//! repeated parse work inside every rule pass.

use crate::{parse_source, AuditConfig, FileRole, ParserError, PlatformHint, SourceLanguage};
use std::path::{Path, PathBuf};
use tree_sitter::Tree;

/// Shared state built once for an audit target.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{build_project_context, AuditConfig};
/// use std::path::PathBuf;
///
/// let project = build_project_context(".", vec![PathBuf::from("src/lib.rs")], AuditConfig::default());
/// assert_eq!(project.all_files.len(), 1);
/// ```
#[derive(Debug, Clone)]
pub struct ProjectContext {
    /// Root directory of the audit target.
    pub root_dir: PathBuf,
    /// Discovered source files in stable order.
    pub all_files: Vec<PathBuf>,
    /// Active audit configuration.
    pub config: AuditConfig,
}

/// Parsed context for one source file.
pub struct FileContext {
    /// Source path.
    pub path: PathBuf,
    /// Raw source content.
    pub raw: String,
    /// Source split into lines for later span work.
    pub lines: Vec<String>,
    /// Parsed tree-sitter tree.
    pub tree: Tree,
    /// Structural role assigned to the file.
    pub role: FileRole,
    /// Resolved platform hint for the file.
    pub platform: PlatformHint,
    /// Detected source language.
    pub language: SourceLanguage,
    /// `true` for C++ sources and headers.
    pub is_cpp: bool,
}

/// Errors returned while constructing a [`FileContext`].
#[derive(Debug)]
pub enum ContextBuildError {
    /// The file path does not map to a supported source language.
    UnsupportedPath(PathBuf),
    /// Parsing the source failed.
    Parse(ParserError),
}

impl std::fmt::Display for ContextBuildError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnsupportedPath(path) => write!(
                f,
                "file path does not map to a supported source language: {}",
                path.display()
            ),
            Self::Parse(error) => write!(f, "{error}"),
        }
    }
}

impl std::error::Error for ContextBuildError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Parse(error) => Some(error),
            Self::UnsupportedPath(_) => None,
        }
    }
}

impl From<ParserError> for ContextBuildError {
    fn from(error: ParserError) -> Self {
        Self::Parse(error)
    }
}

/// Builds a project context from a root directory, file list, and config.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{build_project_context, AuditConfig};
/// use std::path::PathBuf;
///
/// let project = build_project_context("tests", vec![PathBuf::from("tests/example.h")], AuditConfig::default());
/// assert_eq!(project.root_dir, PathBuf::from("tests"));
/// ```
#[must_use]
pub fn build_project_context(
    root_dir: impl AsRef<Path>,
    all_files: Vec<PathBuf>,
    config: AuditConfig,
) -> ProjectContext {
    ProjectContext {
        root_dir: root_dir.as_ref().to_path_buf(),
        all_files,
        config,
    }
}

/// Detects a file role from its path and filename.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{detect_file_role, FileRole};
///
/// assert_eq!(detect_file_role("include/module-doc.h"), FileRole::ModuleDoc);
/// assert_eq!(detect_file_role("src/crypto_test.cpp"), FileRole::Test);
/// ```
#[must_use]
pub fn detect_file_role(path: impl AsRef<Path>) -> FileRole {
    let path = path.as_ref();
    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let normalized = path
        .to_string_lossy()
        .replace('\\', "/")
        .to_ascii_lowercase();
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase());

    if file_name == "module-doc.h" {
        return FileRole::ModuleDoc;
    }
    if normalized.contains("third_party/")
        || normalized.contains("third-party/")
        || normalized.contains("vendor/")
        || normalized.contains("nordic_sdk/")
    {
        return FileRole::ThirdParty;
    }
    if file_name == "cmakelists.txt" || extension.as_deref() == Some("cmake") {
        return FileRole::Cmake;
    }
    if file_name == "kconfig" || file_name == "doxyfile" {
        return FileRole::Config;
    }
    if matches!(extension.as_deref(), Some("s" | "asm")) {
        return FileRole::Asm;
    }
    if file_name.contains("test") {
        return FileRole::Test;
    }
    if matches!(extension.as_deref(), Some("h" | "hpp")) {
        return FileRole::PublicHeader;
    }
    FileRole::Implementation
}

/// Resolves a platform hint from source text and config.
///
/// The config value wins unless it is [`PlatformHint::Auto`].
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{resolve_platform_hint, PlatformHint};
///
/// let hint = resolve_platform_hint("uses CC312 here", PlatformHint::Auto);
/// assert_eq!(hint, PlatformHint::Nrf5340);
/// ```
#[must_use]
pub fn resolve_platform_hint(raw: &str, config_hint: PlatformHint) -> PlatformHint {
    if config_hint != PlatformHint::Auto {
        return config_hint;
    }
    if raw.contains("nrf5340") || raw.contains("NRF5340") || raw.contains("CC312") {
        return PlatformHint::Nrf5340;
    }
    if raw.contains("nrf52840") || raw.contains("NRF52840") || raw.contains("CC310") {
        return PlatformHint::Nrf52840;
    }
    if raw.contains("IDF_TARGET_ESP32") || raw.contains("esp_aes.h") {
        return PlatformHint::Esp32;
    }
    PlatformHint::Host
}

/// Builds a parsed file context for one supported source file.
///
/// # Errors
///
/// Returns [`ContextBuildError::UnsupportedPath`] when the file extension is
/// not supported by the current migration phase, or [`ContextBuildError::Parse`]
/// if tree-sitter parsing fails.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{build_file_context, build_project_context, AuditConfig};
/// use std::path::PathBuf;
///
/// let project = build_project_context(".", vec![PathBuf::from("example.h")], AuditConfig::default());
/// let ctx = build_file_context("example.h", "int api(void);", &project)?;
/// assert_eq!(ctx.lines.len(), 1);
/// # Ok::<(), nirapod_audit_core::ContextBuildError>(())
/// ```
pub fn build_file_context(
    path: impl AsRef<Path>,
    raw: &str,
    project: &ProjectContext,
) -> Result<FileContext, ContextBuildError> {
    let path = path.as_ref();
    let language = crate::detect_language(path)
        .ok_or_else(|| ContextBuildError::UnsupportedPath(path.into()))?;
    let tree = parse_source(language, raw)?;

    Ok(FileContext {
        path: path.to_path_buf(),
        raw: raw.to_owned(),
        lines: raw.lines().map(str::to_owned).collect(),
        tree,
        role: detect_file_role(path),
        platform: resolve_platform_hint(raw, project.config.platform),
        language,
        is_cpp: language == SourceLanguage::Cpp,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        build_file_context, build_project_context, detect_file_role, resolve_platform_hint,
        FileRole,
    };
    use crate::{AuditConfig, PlatformHint};
    use std::{fs, path::PathBuf};

    #[test]
    fn detects_common_file_roles() {
        assert_eq!(
            detect_file_role("include/module-doc.h"),
            FileRole::ModuleDoc
        );
        assert_eq!(detect_file_role("src/crypto_test.cpp"), FileRole::Test);
        assert_eq!(detect_file_role("vendor/sdk/aes.c"), FileRole::ThirdParty);
    }

    #[test]
    fn resolves_platform_from_source_markers() {
        assert_eq!(
            resolve_platform_hint("CC312 backend", PlatformHint::Auto),
            PlatformHint::Nrf5340
        );
        assert_eq!(
            resolve_platform_hint("CC310 backend", PlatformHint::Auto),
            PlatformHint::Nrf52840
        );
    }

    #[test]
    fn builds_file_context_for_fixture() {
        let fixture = fixture_path();
        let source = fs::read_to_string(&fixture).expect("failed to read compliant fixture");
        let project = build_project_context(
            fixture.parent().expect("fixture without parent"),
            vec![fixture.clone()],
            AuditConfig::default(),
        );
        let context =
            build_file_context(&fixture, &source, &project).expect("failed to build file context");

        assert_eq!(context.role, FileRole::PublicHeader);
        assert_eq!(context.platform, PlatformHint::Nrf5340);
        assert_eq!(context.lines.len(), source.lines().count());
    }

    fn fixture_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/compliant/good-header.h")
    }
}
