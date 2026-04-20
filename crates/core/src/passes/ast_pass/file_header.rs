// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! File-level Doxygen header checks.

use super::helpers::{doxygen_rule, first_doc_block, has_tag, is_generic_brief, tag_content};
use crate::{build_diagnostic, line_span, Diagnostic, DiagnosticInit, FileContext, FileRole};

pub(super) fn check_file_header(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let Some(header) = first_doc_block(&ctx.lines) else {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-001"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), 1, &ctx.lines),
                message: "No file-level Doxygen block was found.".to_owned(),
                notes: vec![
                    "Every audited C/C++ file should start with a /** @file ... */ block."
                        .to_owned(),
                ],
                help: Some(
                    "Add a top-level Doxygen block with @file, @brief, @details, and metadata."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
        return;
    };

    if !has_tag(&header.text, "file") {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-001"),
            DiagnosticInit {
                span: line_span(
                    ctx.path.display().to_string(),
                    header.start_line + 1,
                    &ctx.lines,
                ),
                message: "Top-level Doxygen block is missing the @file tag.".to_owned(),
                notes: vec![
                    "A file header without @file is not treated as the canonical file-level block."
                        .to_owned(),
                ],
                help: Some("Add @file <filename> to the first Doxygen block.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
        return;
    }

    let brief = tag_content(&header.text, "brief");
    if brief.is_empty() {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-002"),
            DiagnosticInit {
                span: line_span(
                    ctx.path.display().to_string(),
                    header.start_line + 1,
                    &ctx.lines,
                ),
                message: "File header is missing an @brief summary.".to_owned(),
                notes: vec![
                    "The @brief line should explain what the file does in one sentence.".to_owned(),
                ],
                help: Some(
                    "Add an @brief line directly under @file with a concrete summary.".to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    } else if is_generic_brief(&brief) {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-003"),
            DiagnosticInit {
                span: line_span(
                    ctx.path.display().to_string(),
                    header.start_line + 1,
                    &ctx.lines,
                ),
                message: format!("File @brief is too generic: \"{brief}\"."),
                notes: vec![
                    "The brief should describe behavior or responsibility, not just the artifact type."
                        .to_owned(),
                ],
                help: Some(
                    "Rewrite @brief so it names the file's purpose, constraints, or domain role."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }

    if !has_tag(&header.text, "details") {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-004"),
            DiagnosticInit {
                span: line_span(
                    ctx.path.display().to_string(),
                    header.start_line + 1,
                    &ctx.lines,
                ),
                message: "File header is missing an @details section.".to_owned(),
                notes: vec![
                    "Nirapod file headers carry architecture or protocol context in @details."
                        .to_owned(),
                ],
                help: Some(
                    "Add @details with the important design context for this file.".to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }

    let missing_meta = [
        (!has_tag(&header.text, "author"), "@author"),
        (!has_tag(&header.text, "date"), "@date"),
        (!has_tag(&header.text, "version"), "@version"),
    ]
    .into_iter()
    .filter_map(|(missing, tag)| missing.then_some(tag))
    .collect::<Vec<_>>();

    if !missing_meta.is_empty() {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-005"),
            DiagnosticInit {
                span: line_span(
                    ctx.path.display().to_string(),
                    header.start_line + 1,
                    &ctx.lines,
                ),
                message: format!(
                    "File header is missing metadata tags: {}.",
                    missing_meta.join(", ")
                ),
                notes: vec!["File-level metadata is required for audit traceability.".to_owned()],
                help: Some(
                    "Add the missing @author, @date, and @version tags to the file header."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_module_doc(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    if ctx.role != FileRole::ModuleDoc || ctx.raw.contains("@defgroup") {
        return;
    }

    out.push(build_diagnostic(
        doxygen_rule("NRP-DOX-021"),
        DiagnosticInit {
            span: line_span(ctx.path.display().to_string(), 1, &ctx.lines),
            message: "module-doc.h file has no @defgroup.".to_owned(),
            notes: vec!["module-doc.h exists specifically to declare a Doxygen group.".to_owned()],
            help: Some("Add a /** @defgroup GroupName Group Title\n * @{ */ block.".to_owned()),
            related_spans: Vec::new(),
        },
    ));
}
