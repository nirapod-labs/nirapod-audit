// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Writing-style lexical checks.

use super::helpers::{contains_word, is_in_doc_comment, style_rule};
use crate::{build_diagnostic, line_span, Diagnostic, DiagnosticInit, FileContext};

const EM_DASH: char = '\u{2014}';
const BANNED_WORDS: &[(&str, &str)] = &[
    (
        "robust",
        "Say what makes it reliable instead of calling it robust.",
    ),
    ("seamless", "Say which failure modes are handled and how."),
    ("seamlessly", "Say which failure modes are handled and how."),
    (
        "leverage",
        "Use plain language such as use, call, or rely on.",
    ),
    ("utilize", "Just say use."),
    ("delve", "Say look at, read, or examine."),
    ("multifaceted", "Say what the actual facets are."),
    ("holistic", "Say which parts are covered."),
    (
        "ensure",
        "Say check or verify instead of implying a guarantee.",
    ),
    ("tapestry", "Use plain technical language instead."),
    ("paradigm", "Use plain technical language instead."),
    ("testament", "Use plain technical language instead."),
    ("beacon", "Use plain technical language instead."),
    ("cornerstone", "Use plain technical language instead."),
    ("catalyst", "Use plain technical language instead."),
    ("foster", "Say encourage or build."),
    ("underscore", "Say show or highlight."),
    ("showcase", "Say show or demo."),
    ("harness", "Say use."),
    ("embark", "Say start."),
    ("spearhead", "Say lead."),
    ("pivotal", "Say important or key."),
    ("groundbreaking", "Say what is actually new."),
    ("transformative", "Say what it changes exactly."),
    ("meticulous", "Say careful or detailed."),
    ("vibrant", "Irrelevant in technical documentation."),
    ("innovative", "Say new."),
    ("unprecedented", "Say first or new if it is literally true."),
    ("ubiquitous", "Say common or widespread."),
];
const BANNED_PHRASES: &[&str] = &[
    "in today's fast-paced",
    "in today's digital age",
    "delve into the world of",
    "pave the way",
    "at the forefront",
    "harness the power",
    "game-changer",
    "unlock the power",
    "stay ahead of the curve",
    "it is important to note that",
    "it goes without saying",
];

pub(super) fn check_banned_words(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for (index, line) in ctx.lines.iter().enumerate() {
        if !is_in_doc_comment(&ctx.lines, index) {
            continue;
        }

        let lower_line = line.to_ascii_lowercase();

        for (word, help) in BANNED_WORDS {
            if contains_word(&lower_line, word) {
                out.push(build_diagnostic(
                    style_rule("NRP-STYLE-001"),
                    DiagnosticInit {
                        span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                        message: format!("Banned word \"{word}\" found in documentation comment."),
                        notes: vec![
                            "These words are strong AI-tell signals in technical writing."
                                .to_owned(),
                        ],
                        help: Some((*help).to_owned()),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }

        for phrase in BANNED_PHRASES {
            if lower_line.contains(phrase) {
                out.push(build_diagnostic(
                    style_rule("NRP-STYLE-001"),
                    DiagnosticInit {
                        span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                        message: format!(
                            "Banned phrase \"{phrase}\" found in documentation comment."
                        ),
                        notes: vec![
                            "Template marketing phrases are not acceptable in Nirapod docs."
                                .to_owned(),
                        ],
                        help: Some(
                            "Rewrite this line in plain, direct technical language.".to_owned(),
                        ),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }
    }
}

pub(super) fn check_em_dash(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for (index, line) in ctx.lines.iter().enumerate() {
        if is_in_doc_comment(&ctx.lines, index) && line.contains(EM_DASH) {
            out.push(build_diagnostic(
                style_rule("NRP-STYLE-002"),
                DiagnosticInit {
                    span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                    message: "Em-dash character (\u{2014}) found in documentation comment."
                        .to_owned(),
                    notes: vec![
                        "Em dashes are forbidden in this codebase's documentation style."
                            .to_owned(),
                    ],
                    help: Some(
                        "Replace it with a comma, colon, period, or a shorter sentence.".to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}
