// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Audit command handler.
//!
//! Phase 2 runs the migrated lexical and Doxygen passes over each discovered
//! source file and streams diagnostics directly to the terminal.

use crate::print::{
    diagnostic::render_diagnostic,
    summary::{render_summary, AuditSummaryView},
};
use anyhow::{Context, Result};
use nirapod_audit_core::{
    build_file_context, build_project_context, discover_audit_target, load_config, AstPass,
    ContextBuildError, Diagnostic, LexPass, ParserError, Pass, Severity,
};
use std::{fs, path::Path};

/// Prepares an audit target and prints the discovery summary.
///
/// # Errors
///
/// Returns an error if config loading, file reads, or parsing fails.
pub fn run(path: &Path) -> Result<()> {
    let loaded = load_config(path)?;
    let target = discover_audit_target(path, &loaded.config.ignore_paths)?;
    let project = build_project_context(
        &target.root_dir,
        target.files.clone(),
        loaded.config.clone(),
    );
    let config_source = loaded
        .config_path
        .as_ref()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| String::from("defaults"));
    let lex = LexPass;
    let ast = AstPass;
    let passes: [&dyn Pass; 2] = [&lex, &ast];
    let mut summary = AuditSummaryView {
        scanned_files: 0,
        skipped_files: 0,
        errors: 0,
        warnings: 0,
        infos: 0,
    };

    println!(
        "auditing {} with {} files using {}",
        target.root_dir.display(),
        target.files.len(),
        config_source
    );

    for (index, file) in target.files.iter().enumerate() {
        let relative = file.strip_prefix(&target.root_dir).unwrap_or(file);
        println!("[{}/{}] {}", index + 1, target.files.len(), relative.display());

        let raw = fs::read_to_string(file)
            .with_context(|| format!("failed to read source file {}", file.display()))?;
        let ctx = match build_file_context(file, &raw, &project) {
            Ok(ctx) => ctx,
            Err(ContextBuildError::Parse(ParserError::UnsupportedLanguage(_))) => {
                summary.skipped_files += 1;
                println!("  skipped: language detected but parser not ported yet");
                continue;
            }
            Err(error) => return Err(error.into()),
        };

        summary.scanned_files += 1;
        let diagnostics = run_passes(&passes, &ctx);
        update_summary(&mut summary, &diagnostics);

        for diagnostic in diagnostics {
            print!("{}", render_diagnostic(&diagnostic));
        }
    }

    print!("{}", render_summary(summary));

    Ok(())
}

fn run_passes(passes: &[&dyn Pass], ctx: &nirapod_audit_core::FileContext) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();

    for pass in passes {
        let applies = pass
            .languages()
            .is_none_or(|languages| languages.contains(&ctx.language));
        if applies {
            diagnostics.extend(pass.run(ctx));
        }
    }

    diagnostics.sort_by(|left, right| {
        left.span
            .file
            .cmp(&right.span.file)
            .then(left.span.start_line.cmp(&right.span.start_line))
            .then(left.span.start_col.cmp(&right.span.start_col))
            .then(left.rule.id.cmp(&right.rule.id))
    });
    diagnostics
}

fn update_summary(summary: &mut AuditSummaryView, diagnostics: &[Diagnostic]) {
    for diagnostic in diagnostics {
        match diagnostic.rule.severity {
            Severity::Error => summary.errors += 1,
            Severity::Warning => summary.warnings += 1,
            Severity::Info => summary.infos += 1,
        }
    }
}
