// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Lexical-level checks on raw source text.
//!
//! This first Rust pass intentionally starts with the `LICENSE` rules because
//! they do not need AST work and they validate the parser/context/diagnostic
//! plumbing cleanly.

use crate::{
    build_diagnostic, find_rule, line_span, Diagnostic, DiagnosticInit, FileContext, FileRole,
    Pass, SourceLanguage,
};
const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 1: lexical checks on raw text and source lines.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{LexPass, Pass, SourceLanguage};
///
/// let pass = LexPass;
/// assert_eq!(pass.name(), "lex");
/// assert_eq!(pass.languages(), Some(&[SourceLanguage::C, SourceLanguage::Cpp][..]));
/// ```
#[derive(Debug, Default, Clone, Copy)]
pub struct LexPass;

impl Pass for LexPass {
    fn name(&self) -> &'static str {
        "lex"
    }

    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        Some(C_CPP_LANGUAGES)
    }

    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic> {
        if matches!(ctx.role, FileRole::ThirdParty | FileRole::Asm) {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();
        self.check_spdx(ctx, &mut diagnostics);
        self.check_header_ordering(ctx, &mut diagnostics);
        diagnostics
    }
}

impl LexPass {
    fn check_spdx(&self, ctx: &FileContext, out: &mut Vec<Diagnostic>) {
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
                            message:
                                "SPDX line found outside the file-level Doxygen block.".to_owned(),
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

    fn check_header_ordering(&self, ctx: &FileContext, out: &mut Vec<Diagnostic>) {
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
}

fn is_in_doc_comment(lines: &[String], line_index: usize) -> bool {
    let mut in_doc = false;

    for (index, line) in lines.iter().enumerate() {
        if line.contains("/**") {
            in_doc = true;
        }

        if index == line_index && in_doc {
            return true;
        }

        if in_doc && line.contains("*/") {
            in_doc = false;
        }
    }

    false
}

fn is_include_guard(line: &str) -> bool {
    line.starts_with("#pragma once") || line.starts_with("#ifndef ")
}

fn license_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing license rule in registry")
}

#[cfg(test)]
mod tests {
    use super::LexPass;
    use crate::{build_file_context, build_project_context, AuditConfig, Pass};
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn compliant_fixture_has_no_license_findings() {
        let path = fixture_path("tests/fixtures/compliant/good-header.h");
        let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
        let project = build_project_context(
            path.parent().expect("fixture without parent"),
            vec![path.clone()],
            AuditConfig::default(),
        );
        let context = build_file_context(&path, &raw, &project).expect("failed to build context");

        let diagnostics = LexPass.run(&context);
        assert!(diagnostics.is_empty());
    }

    #[test]
    fn violation_fixture_triggers_missing_license_diagnostics() {
        let path = fixture_path("tests/violations/NRP-LIC-001-no-spdx.h");
        let raw = fs::read_to_string(&path).expect("failed to read violation fixture");
        let project = build_project_context(
            path.parent().expect("fixture without parent"),
            vec![path.clone()],
            AuditConfig::default(),
        );
        let context = build_file_context(&path, &raw, &project).expect("failed to build context");

        let diagnostics = LexPass.run(&context);
        let ids = diagnostics
            .iter()
            .map(|diagnostic| diagnostic.rule.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, vec!["NRP-LIC-001", "NRP-LIC-002", "NRP-LIC-003"]);
    }

    #[test]
    fn spdx_outside_doc_block_triggers_warning() {
        let root = temp_dir("lex-pass");
        let file = root.join("spdx-outside.h");
        fs::create_dir_all(&root).expect("failed to create temp directory");
        fs::write(
            &file,
            "/**\n * @file sample.h\n */\n// SPDX-License-Identifier: APACHE-2.0\n// SPDX-FileCopyrightText: 2026 Nirapod Contributors\n#pragma once\n",
        )
        .expect("failed to write test fixture");

        let raw = fs::read_to_string(&file).expect("failed to read temp fixture");
        let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
        let context = build_file_context(&file, &raw, &project).expect("failed to build context");

        let diagnostics = LexPass.run(&context);
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].rule.id, "NRP-LIC-004");

        fs::remove_dir_all(root).expect("failed to remove temp directory");
    }

    fn fixture_path(relative: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("../../{relative}"))
    }

    fn temp_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
    }
}
