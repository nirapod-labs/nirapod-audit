// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! API-oriented crypto checks.

use super::helpers::{
    collect_nodes_by_kind, crypto_rule, doc_comment_before, first_identifier_text, has_tag,
    tag_content,
};
use crate::{
    build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext, FileRole,
};

pub(super) fn check_raw_key_in_api(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    if ctx.role != FileRole::PublicHeader {
        return;
    }

    let mut declarations = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_declarator", &mut declarations);

    for declarator in declarations {
        let Some(parent) = declarator.parent() else {
            continue;
        };
        if parent.kind() != "function_declaration" && parent.kind() != "declaration" {
            continue;
        }
        let Some(doc) = doc_comment_before(parent, &ctx.lines) else {
            continue;
        };
        if !has_tag(&doc, "brief") {
            continue;
        }

        let mut params = Vec::new();
        collect_nodes_by_kind(declarator, "parameter_declaration", &mut params);
        for param in params {
            let Some(text) = param.utf8_text(ctx.raw.as_bytes()).ok() else {
                continue;
            };
            let lowered = text.to_ascii_lowercase();
            if !(lowered.contains("uint8_t")
                && lowered.contains('*')
                && lowered.contains("key")
                && !lowered.contains("handle"))
            {
                continue;
            }

            let name = first_identifier_text(param, &ctx.raw).unwrap_or("key");
            out.push(build_diagnostic(
                crypto_rule("NRP-CRYPTO-009"),
                DiagnosticInit {
                    span: node_to_span(param, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Public API parameter '{name}' exposes raw key bytes."),
                    notes: vec![format!(
                        "The function brief is \"{}\".",
                        tag_content(&doc, "brief")
                    )],
                    help: Some(
                        "Expose a key handle or opaque key reference instead of raw key bytes."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}
