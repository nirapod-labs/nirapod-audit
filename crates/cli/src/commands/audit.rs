// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Audit command handler.
//!
//! Phase 2 runs the migrated lexical and Doxygen passes over each discovered
//! source file and streams diagnostics directly to the terminal.

use crate::print::{
    diagnostic::render_diagnostic,
    progress::ProgressReporter,
    summary::{render_summary, AuditSummaryView},
};
use anyhow::{Context, Result};
use nirapod_audit_core::{
    build_file_context, build_project_context, discover_audit_target, load_config, AstPass,
    ContextBuildError, CryptoPass, Diagnostic, LexPass, MemoryPass, NasaPass, ParserError, Pass,
    Severity, StylePass,
};
use std::{fs, path::Path, process::ExitCode};

/// Prepares an audit target and prints the discovery summary.
///
/// # Errors
///
/// Returns an error if config loading, file reads, or parsing fails.
pub fn run(path: &Path) -> Result<ExitCode> {
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
    let nasa = NasaPass;
    let crypto = CryptoPass;
    let memory = MemoryPass;
    let style = StylePass;
    let passes: [&dyn Pass; 6] = [&lex, &ast, &nasa, &crypto, &memory, &style];
    let mut summary = AuditSummaryView {
        scanned_files: 0,
        skipped_files: 0,
        errors: 0,
        warnings: 0,
        infos: 0,
    };
    let mut progress = ProgressReporter::new();

    progress.emit(&format!(
        "auditing {} with {} files using {}",
        target.root_dir.display(),
        target.files.len(),
        config_source
    ))?;
    progress.emit("\n")?;

    for (index, file) in target.files.iter().enumerate() {
        let relative = file.strip_prefix(&target.root_dir).unwrap_or(file);
        progress.update(index + 1, target.files.len(), &relative.display().to_string())?;

        let raw = fs::read_to_string(file)
            .with_context(|| format!("failed to read source file {}", file.display()))?;
        let ctx = match build_file_context(file, &raw, &project) {
            Ok(ctx) => ctx,
            Err(ContextBuildError::Parse(ParserError::UnsupportedLanguage(_))) => {
                summary.skipped_files += 1;
                progress.emit("  skipped: language detected but parser not ported yet\n")?;
                continue;
            }
            Err(error) => return Err(error.into()),
        };

        summary.scanned_files += 1;
        let diagnostics = run_passes(&passes, &ctx);
        update_summary(&mut summary, &diagnostics);

        for diagnostic in diagnostics {
            progress.emit(&render_diagnostic(&diagnostic))?;
        }
    }

    progress.finish()?;
    progress.emit(&render_summary(summary))?;

    Ok(if summary.errors == 0 {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    })
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
