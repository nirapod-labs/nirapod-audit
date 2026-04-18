// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Command-line entry point for `nirapod-audit`.
//!
//! The first Rust slice exposes the planned command surface without analysis
//! logic yet. This keeps the migration honest: the binary compiles, the public
//! commands are visible, and later commits can fill in behavior incrementally.

#![warn(missing_docs)]
#![warn(rustdoc::missing_crate_level_docs)]
#![warn(rustdoc::broken_intra_doc_links)]
#![deny(unsafe_code)]

use anyhow::Result;
use clap::{Parser, Subcommand};
use nirapod_audit_core::load_config;
use std::path::PathBuf;

/// Rust CLI for the `nirapod-audit` migration.
///
/// # Examples
///
/// ```text
/// nirapod-audit audit ./src
/// nirapod-audit rules
/// nirapod-audit explain NRP-NASA-006
/// ```
#[derive(Debug, Parser)]
#[command(
    name = "nirapod-audit",
    version,
    about = "Deterministic firmware auditing for the Nirapod codebase."
)]
struct Cli {
    /// Subcommand to execute.
    #[command(subcommand)]
    command: Command,
}

/// Top-level CLI subcommands.
///
/// # Examples
///
/// ```text
/// nirapod-audit audit ./firmware
/// ```
#[derive(Debug, Subcommand)]
enum Command {
    /// Audits a file or directory.
    Audit {
        /// File or directory to scan.
        path: PathBuf,
    },
    /// Lists the available rules.
    Rules,
    /// Shows detailed information for one rule.
    Explain {
        /// Stable rule identifier, such as `NRP-NASA-006`.
        id: String,
    },
}

/// Parses CLI arguments and dispatches the requested subcommand.
///
/// # Errors
///
/// Returns an error if writing command output to stdout fails.
fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::Audit { path } => {
            let loaded = load_config(&path)?;
            match loaded.config_path {
                Some(config_path) => {
                    println!(
                        "audit command scaffolded for {} using {}",
                        path.display(),
                        config_path.display()
                    );
                }
                None => {
                    println!(
                        "audit command scaffolded for {} using defaults",
                        path.display()
                    );
                }
            }
        }
        Command::Rules => {
            println!("rules command scaffolded");
        }
        Command::Explain { id } => {
            println!("explain command scaffolded for {id}");
        }
    }

    Ok(())
}
