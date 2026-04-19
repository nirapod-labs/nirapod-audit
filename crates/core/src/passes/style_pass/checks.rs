// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Documentation-style checks that need more context than the lexical pass.

use super::helpers::{
    crypto_function_name_after_block, doc_blocks, has_hardware_word, is_generic_brief, style_rule,
    tag_content, tag_line,
};
use crate::{build_diagnostic, line_span, Diagnostic, DiagnosticInit, FileContext};

pub(super) fn check_generic_briefs(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for block in doc_blocks(&ctx.lines) {
        if block.text.contains("@file") {
            continue;
        }

        let brief = tag_content(&block.text, "brief");
        if brief.is_empty() || !is_generic_brief(&brief) {
            continue;
        }

        let line = tag_line(&block, "brief").unwrap_or(block.start_line);
        out.push(build_diagnostic(
            style_rule("NRP-STYLE-003"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), line + 1, &ctx.lines),
                message: format!("@brief text is too generic: \"{brief}\"."),
                notes: vec![
                    "The brief should describe behavior, not only the kind of declaration."
                        .to_owned(),
                ],
                help: Some("Rewrite @brief as one direct sentence about what this API does.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_crypto_hardware_words(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for block in doc_blocks(&ctx.lines) {
        let Some(function_name) = crypto_function_name_after_block(&block, &ctx.lines) else {
            continue;
        };

        let details = tag_content(&block.text, "details");
        if has_hardware_word(&details) {
            continue;
        }

        let line = tag_line(&block, "details")
            .or_else(|| tag_line(&block, "brief"))
            .unwrap_or(block.start_line);
        out.push(build_diagnostic(
            style_rule("NRP-STYLE-004"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), line + 1, &ctx.lines),
                message: format!(
                    "Crypto function '{function_name}' documentation does not name the hardware backend."
                ),
                notes: vec![
                    "Crypto API docs should state whether they rely on CC310, CC312, or ESP32 hardware."
                        .to_owned(),
                ],
                help: Some(
                    "Add an @details line that names the relevant backend, such as CC310 or ESP32."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }
}
