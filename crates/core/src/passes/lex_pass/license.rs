// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! SPDX and header-ordering lexical checks.

use super::helpers::{is_in_doc_comment, is_include_guard, license_rule};
use crate::{build_diagnostic, line_span, Diagnostic, DiagnosticInit, FileContext};

pub(super) fn check_spdx(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let has_spdx_id = ctx.raw.contains("SPDX-License-Identifier:");
    let has_spdx_copyright = ctx.raw.contains("SPDX-FileCopyrightText:");

    if !has_spdx_id {
        out.push(build_diagnostic(
            license_rule("NRP-LIC-001"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), 1, &ctx.lines),
                message: "Missing SPDX-License-Identifier line.".to_owned(),
                notes: vec![
                    "Every Nirapod source file must declare its license via SPDX.".to_owned(),
                ],
                help: Some(
                    "Add SPDX-License-Identifier: APACHE-2.0 inside the file-level Doxygen block."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }

    if !has_spdx_copyright {
        out.push(build_diagnostic(
            license_rule("NRP-LIC-002"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), 1, &ctx.lines),
                message: "Missing SPDX-FileCopyrightText line.".to_owned(),
                notes: vec![
                    "Copyright attribution is required for Nirapod source files.".to_owned(),
                ],
                help: Some(
                    "Add SPDX-FileCopyrightText: 2026 Nirapod Contributors inside the file-level Doxygen block."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }

    if has_spdx_id || has_spdx_copyright {
        for (index, line) in ctx.lines.iter().enumerate() {
            if (line.contains("SPDX-License-Identifier:")
                || line.contains("SPDX-FileCopyrightText:"))
                && !is_in_doc_comment(&ctx.lines, index)
            {
                out.push(build_diagnostic(
                    license_rule("NRP-LIC-004"),
                    DiagnosticInit {
                        span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                        message: "SPDX line found outside the file-level Doxygen block."
                            .to_owned(),
                        notes: vec![
                            "Nirapod convention keeps SPDX lines inside the file-level documentation block."
                                .to_owned(),
                        ],
                        help: Some(
                            "Move this SPDX line inside the top-level /** ... */ block."
                                .to_owned(),
                        ),
                        related_spans: Vec::new(),
                    },
                ));
                break;
            }
        }
    }
}

pub(super) fn check_header_ordering(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for (index, raw_line) in ctx.lines.iter().enumerate() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with("//") {
            continue;
        }

        if line.starts_with("/**") {
            break;
        }

        if is_include_guard(line) {
            out.push(build_diagnostic(
                license_rule("NRP-LIC-003"),
                DiagnosticInit {
                    span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                    message: format!(
                        "Include guard found at line {} before the file-level Doxygen block.",
                        index + 1
                    ),
                    notes: vec![
                        "The file header must be the first meaningful thing in the file."
                            .to_owned(),
                    ],
                    help: Some(
                        "Move the /** @file ... */ block before #pragma once or #ifndef guards."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
            break;
        }
    }
}
