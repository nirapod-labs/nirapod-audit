// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! AST-phase Doxygen checks.
//!
//! The first Rust slice intentionally starts with file-header validation only.
//! Symbol-level class, struct, enum, and function checks will land in the next
//! Phase 2 commits once the pass shape is stable.

use crate::{
    build_diagnostic, find_rule, line_span, Diagnostic, DiagnosticInit, FileContext, FileRole,
    Pass, SourceLanguage,
};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];
const GENERIC_BRIEFS: &[&str] = &[
    "driver",
    "module",
    "header",
    "source",
    "file",
    "main",
    "implementation",
    "utility",
    "helper",
    "wrapper",
    "interface",
    "manager",
    "handler",
    "controller",
    "service",
    "provider",
];

/// Pass 2: Doxygen structure checks built on the parsed file context.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{AstPass, Pass, SourceLanguage};
///
/// let pass = AstPass;
/// assert_eq!(pass.name(), "ast");
/// assert_eq!(pass.languages(), Some(&[SourceLanguage::C, SourceLanguage::Cpp][..]));
/// ```
#[derive(Debug, Default, Clone, Copy)]
pub struct AstPass;

impl Pass for AstPass {
    fn name(&self) -> &'static str {
        "ast"
    }

    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        Some(C_CPP_LANGUAGES)
    }

    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic> {
        if matches!(
            ctx.role,
            FileRole::ThirdParty | FileRole::Asm | FileRole::Cmake | FileRole::Config
        ) {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();
        self.check_file_header(ctx, &mut diagnostics);
        diagnostics
    }
}

impl AstPass {
    fn check_file_header(&self, ctx: &FileContext, out: &mut Vec<Diagnostic>) {
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
                        "The @brief line should explain what the file does in one sentence."
                            .to_owned(),
                    ],
                    help: Some(
                        "Add an @brief line directly under @file with a concrete summary."
                            .to_owned(),
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
                    notes: vec![
                        "File-level metadata is required for audit traceability.".to_owned()
                    ],
                    help: Some(
                        "Add the missing @author, @date, and @version tags to the file header."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct DocBlock {
    text: String,
    start_line: usize,
}

fn first_doc_block(lines: &[String]) -> Option<DocBlock> {
    let mut start = None;

    for (index, line) in lines.iter().enumerate() {
        if line.contains("/**") {
            start = Some(index);
            break;
        }

        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("//") || trimmed.starts_with('#') {
            continue;
        }

        return None;
    }

    let start_line = start?;
    for end in start_line..lines.len() {
        if lines[end].contains("*/") {
            return Some(DocBlock {
                text: lines[start_line..=end].join("\n"),
                start_line,
            });
        }
    }

    None
}

fn has_tag(block: &str, tag: &str) -> bool {
    block
        .lines()
        .any(|line| line.trim_start().contains(&format!("@{tag}")))
}

fn tag_content(block: &str, tag: &str) -> String {
    let marker = format!("@{tag}");
    block
        .lines()
        .find_map(|line| {
            let trimmed = line.trim_start();
            trimmed.find(&marker).map(|index| {
                trimmed[index + marker.len()..]
                    .trim()
                    .trim_start_matches('*')
                    .trim()
                    .to_owned()
            })
        })
        .unwrap_or_default()
}

fn is_generic_brief(brief: &str) -> bool {
    let normalized_text = brief.trim().trim_end_matches('.').to_ascii_lowercase();
    let normalized = normalized_text.split_whitespace().collect::<Vec<_>>();

    if normalized.is_empty() {
        return false;
    }

    if normalized.len() == 1 {
        return true;
    }

    normalized.len() <= 3
        && normalized
            .iter()
            .any(|word| GENERIC_BRIEFS.iter().any(|generic| word == generic))
}

fn doxygen_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing doxygen rule in registry")
}

#[cfg(test)]
mod tests {
    use super::AstPass;
    use crate::{build_file_context, build_project_context, AuditConfig, Pass};
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn compliant_fixture_has_no_file_header_findings() {
        let path = fixture_path("tests/fixtures/compliant/good-header.h");
        let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
        let project = build_project_context(
            path.parent().expect("fixture without parent"),
            vec![path.clone()],
            AuditConfig::default(),
        );
        let context = build_file_context(&path, &raw, &project).expect("failed to build context");

        let diagnostics = AstPass.run(&context);
        assert!(diagnostics.is_empty());
    }

    #[test]
    fn violation_fixture_triggers_missing_file_header() {
        let path = fixture_path("tests/violations/NRP-DOX-001-no-file-header.h");
        let raw = fs::read_to_string(&path).expect("failed to read violation fixture");
        let project = build_project_context(
            path.parent().expect("fixture without parent"),
            vec![path.clone()],
            AuditConfig::default(),
        );
        let context = build_file_context(&path, &raw, &project).expect("failed to build context");

        let diagnostics = AstPass.run(&context);
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].rule.id, "NRP-DOX-001");
    }

    #[test]
    fn generic_file_brief_triggers_warning() {
        let diagnostics = run_temp_fixture(
            "generic-brief.h",
            "/**\n * @file generic-brief.h\n * @brief driver\n *\n * @details\n * Handles authenticated encryption for Nordic secure elements.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n */\n#pragma once\n",
        );

        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].rule.id, "NRP-DOX-003");
    }

    #[test]
    fn missing_details_and_meta_are_reported() {
        let diagnostics = run_temp_fixture(
            "missing-details.h",
            "/**\n * @file missing-details.h\n * @brief AES-GCM key wrapping entry points.\n */\n#pragma once\n",
        );

        let ids = diagnostics
            .iter()
            .map(|diagnostic| diagnostic.rule.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, vec!["NRP-DOX-004", "NRP-DOX-005"]);
    }

    #[test]
    fn missing_brief_is_reported() {
        let diagnostics = run_temp_fixture(
            "missing-brief.h",
            "/**\n * @file missing-brief.h\n *\n * @details\n * Exposes secure packet parsing helpers.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n */\n#pragma once\n",
        );

        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].rule.id, "NRP-DOX-002");
    }

    fn run_temp_fixture(name: &str, raw: &str) -> Vec<crate::Diagnostic> {
        let root = temp_dir("ast-pass");
        let file = root.join(name);
        fs::create_dir_all(&root).expect("failed to create temp directory");
        fs::write(&file, raw).expect("failed to write temp fixture");

        let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
        let context = build_file_context(&file, raw, &project).expect("failed to build context");
        let diagnostics = AstPass.run(&context);

        fs::remove_dir_all(root).expect("failed to remove temp directory");
        diagnostics
    }

    fn fixture_path(relative: &str) -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("../../{relative}"))
    }

    fn temp_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before UNIX_EPOCH")
            .as_nanos();
        std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
    }
}
