// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Explain command handler.
//!
//! Phase 1 only exposed the subcommand surface. A later commit will replace the
//! scaffold with real rule-detail output.

use anyhow::Result;

/// Placeholder implementation for the `explain` command.
///
/// # Errors
///
/// Returns an error if writing command output fails.
pub fn run(id: &str) -> Result<()> {
    println!("explain command scaffolded for {id}");
    Ok(())
}
