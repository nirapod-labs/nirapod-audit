// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Audit command handler.
//!
//! The initial audit command still only prepares the target. Later Phase 2
//! commits will replace this with real pass execution and diagnostic output.

use anyhow::Result;
use nirapod_audit_core::{discover_audit_target, load_config};
use std::path::Path;

/// Prepares an audit target and prints the discovery summary.
///
/// # Errors
///
/// Returns an error if config loading or target discovery fails.
pub fn run(path: &Path) -> Result<()> {
    let loaded = load_config(path)?;
    let target = discover_audit_target(path, &loaded.config.ignore_paths)?;
    let config_source = loaded
        .config_path
        .as_ref()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| String::from("defaults"));

    println!(
        "prepared audit target {} with {} files using {}",
        target.root_dir.display(),
        target.files.len(),
        config_source
    );

    Ok(())
}
