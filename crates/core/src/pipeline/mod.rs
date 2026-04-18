// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Audit target discovery for the Phase 1 CLI scaffold.
//!
//! The pipeline does not execute rule passes yet. Its current job is to
//! normalize a target path, apply ignore patterns, and return the stable file
//! list that later phases will analyze.

pub mod pass;

use globset::{Glob, GlobSet, GlobSetBuilder};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Discovered audit target after file expansion and ignore filtering.
///
/// # Examples
///
/// ```no_run
/// use nirapod_audit_core::{discover_audit_target, AuditConfig};
///
/// let target = discover_audit_target(".", &AuditConfig::default().ignore_paths)?;
/// println!("{}", target.files.len());
/// # Ok::<(), nirapod_audit_core::DiscoverAuditTargetError>(())
/// ```
#[derive(Debug, Clone)]
pub struct AuditTarget {
    /// Root directory used for relative paths and future reports.
    pub root_dir: PathBuf,
    /// Files that remain after discovery and ignore filtering.
    pub files: Vec<PathBuf>,
}

/// Errors returned while preparing an audit target.
#[derive(Debug)]
pub enum DiscoverAuditTargetError {
    /// The target path does not exist.
    MissingPath(PathBuf),
    /// The target path exists but no supported files were found.
    NoSupportedFiles(PathBuf),
    /// An ignore glob failed to compile.
    Glob(globset::Error),
    /// A filesystem walk failed.
    Walk(walkdir::Error),
}

impl std::fmt::Display for DiscoverAuditTargetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingPath(path) => write!(f, "audit target does not exist: {}", path.display()),
            Self::NoSupportedFiles(path) => {
                write!(
                    f,
                    "no supported source files found under {}",
                    path.display()
                )
            }
            Self::Glob(error) => write!(f, "failed to compile ignore glob: {error}"),
            Self::Walk(error) => write!(f, "failed to walk audit target: {error}"),
        }
    }
}

impl std::error::Error for DiscoverAuditTargetError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Glob(error) => Some(error),
            Self::Walk(error) => Some(error),
            Self::MissingPath(_) | Self::NoSupportedFiles(_) => None,
        }
    }
}

impl From<globset::Error> for DiscoverAuditTargetError {
    fn from(error: globset::Error) -> Self {
        Self::Glob(error)
    }
}

impl From<walkdir::Error> for DiscoverAuditTargetError {
    fn from(error: walkdir::Error) -> Self {
        Self::Walk(error)
    }
}

/// Discovers the supported files under an audit target.
///
/// Supported files in Phase 1 are the same languages that detection already
/// recognizes. Unsupported extensions are ignored instead of failing the run.
///
/// # Errors
///
/// Returns [`DiscoverAuditTargetError::MissingPath`] if the target does not
/// exist, [`DiscoverAuditTargetError::NoSupportedFiles`] if discovery finds no
/// eligible files, or a glob/walk error if filtering fails.
pub fn discover_audit_target(
    target_path: impl AsRef<Path>,
    ignore_paths: &[String],
) -> Result<AuditTarget, DiscoverAuditTargetError> {
    let target_path = target_path.as_ref();
    let resolved = target_path
        .canonicalize()
        .unwrap_or_else(|_| target_path.to_path_buf());

    if !resolved.exists() {
        return Err(DiscoverAuditTargetError::MissingPath(resolved));
    }

    if resolved.is_file() {
        let files = match crate::detect_language(&resolved) {
            Some(_) => vec![resolved.clone()],
            None => Vec::new(),
        };

        if files.is_empty() {
            return Err(DiscoverAuditTargetError::NoSupportedFiles(resolved.clone()));
        }

        let root_dir = resolved
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from("."));

        return Ok(AuditTarget { root_dir, files });
    }

    let globset = compile_ignore_set(ignore_paths)?;
    let mut files = Vec::new();

    for entry in WalkDir::new(&resolved) {
        let entry = entry?;
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        if crate::detect_language(path).is_none() {
            continue;
        }

        let relative = path.strip_prefix(&resolved).unwrap_or(path);
        if globset.is_match(relative) {
            continue;
        }

        files.push(path.to_path_buf());
    }

    files.sort();

    if files.is_empty() {
        return Err(DiscoverAuditTargetError::NoSupportedFiles(resolved.clone()));
    }

    Ok(AuditTarget {
        root_dir: resolved,
        files,
    })
}

fn compile_ignore_set(ignore_paths: &[String]) -> Result<GlobSet, globset::Error> {
    let mut builder = GlobSetBuilder::new();
    for pattern in ignore_paths {
        builder.add(Glob::new(pattern)?);
    }
    builder.build()
}

#[cfg(test)]
mod tests {
    use super::discover_audit_target;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn discovers_fixture_file_from_directory() {
        let target = discover_audit_target(fixture_dir(), &[])
            .expect("failed to discover compliant fixture");
        assert_eq!(target.files.len(), 1);
    }

    #[test]
    fn filters_files_with_ignore_globs() {
        let root = temp_dir("pipeline-ignore");
        let nested = root.join("vendor");
        fs::create_dir_all(&nested).expect("failed to create test directory");
        fs::write(root.join("main.c"), "int main(void) { return 0; }\n")
            .expect("failed to write main fixture");
        fs::write(nested.join("skip.c"), "int skip(void) { return 1; }\n")
            .expect("failed to write skipped fixture");

        let target: crate::AuditTarget = discover_audit_target(&root, &[String::from("vendor/**")])
            .expect("failed to discover target");
        let expected = root
            .join("main.c")
            .canonicalize()
            .expect("failed to canonicalize expected file");

        assert_eq!(target.files, vec![expected]);

        fs::remove_dir_all(root).expect("failed to remove test directory");
    }

    fn fixture_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/compliant")
    }

    fn temp_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
    }
}
