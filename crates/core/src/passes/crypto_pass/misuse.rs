// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Misuse-oriented crypto checks.

use super::helpers::{
    call_target_text, collect_nodes_by_kind, crypto_rule, text_mentions_crypto_buffer,
};
use crate::{
    build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext,
};

const HW_CRYPTO_PREFIXES: &[&str] = &[
    "nrf_crypto_",
    "nrf_cc3xx_",
    "mbedtls_aes_",
    "mbedtls_gcm_",
    "esp_aes_",
    "esp_gcm_",
];
const MUTEX_MARKERS: &[&str] = &[
    "mutex_lock",
    "k_mutex_lock",
    "xSemaphoreTake",
    "pthread_mutex_lock",
    "nrf_crypto_mutex",
];

pub(super) fn check_memset_zeroization(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut calls = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "call_expression", &mut calls);

    for call in calls {
        if call_target_text(call, &ctx.raw) != Some("memset") {
            continue;
        }
        let Some(arguments) = call.child_by_field_name("arguments") else {
            continue;
        };
        let args = arguments.named_children(&mut arguments.walk()).collect::<Vec<_>>();
        if args.len() < 2 {
            continue;
        }

        let Some(buffer_text) = args.first().and_then(|node| node.utf8_text(ctx.raw.as_bytes()).ok()) else {
            continue;
        };
        let Some(value_text) = args.get(1).and_then(|node| node.utf8_text(ctx.raw.as_bytes()).ok()) else {
            continue;
        };
        if value_text.trim() != "0" || !text_mentions_crypto_buffer(buffer_text) {
            continue;
        }

        out.push(build_diagnostic(
            crypto_rule("NRP-CRYPTO-001"),
            DiagnosticInit {
                span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                message: format!("memset() used to zero crypto buffer '{buffer_text}'."),
                notes: vec!["memset-based zeroization can be optimized away by the compiler.".to_owned()],
                help: Some("Use mbedtls_platform_zeroize(), explicit_bzero(), or another non-elidable wipe primitive.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_key_in_log(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut calls = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "call_expression", &mut calls);

    for call in calls {
        let Some(target) = call_target_text(call, &ctx.raw) else {
            continue;
        };
        if !super::helpers::LOG_FUNCTIONS.contains(&target) {
            continue;
        }
        let Some(arguments) = call.child_by_field_name("arguments") else {
            continue;
        };

        for arg in arguments.named_children(&mut arguments.walk()) {
            let Some(text) = arg.utf8_text(ctx.raw.as_bytes()).ok() else {
                continue;
            };
            let trimmed = text.trim();
            if trimmed.starts_with('"') || trimmed.starts_with('\'') {
                continue;
            }
            if !text_mentions_crypto_buffer(text) {
                continue;
            }

            out.push(build_diagnostic(
                crypto_rule("NRP-CRYPTO-002"),
                DiagnosticInit {
                    span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Key material '{text}' passed to log function '{target}()'."),
                    notes: vec!["Logs should report status, not secrets or secret-derived values.".to_owned()],
                    help: Some("Remove the secret-bearing argument from the log call.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
            break;
        }
    }
}

pub(super) fn check_mutex_before_crypto(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let Some(body_text) = body.utf8_text(ctx.raw.as_bytes()).ok() else {
            continue;
        };
        if MUTEX_MARKERS.iter().any(|marker| body_text.contains(marker)) {
            continue;
        }

        let mut calls = Vec::new();
        collect_nodes_by_kind(body, "call_expression", &mut calls);
        for call in calls {
            let Some(target) = call_target_text(call, &ctx.raw) else {
                continue;
            };
            if !HW_CRYPTO_PREFIXES.iter().any(|prefix| target.starts_with(prefix)) {
                continue;
            }

            out.push(build_diagnostic(
                crypto_rule("NRP-CRYPTO-005"),
                DiagnosticInit {
                    span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                    message: format!(
                        "Hardware crypto call '{target}()' without visible mutex acquire in function."
                    ),
                    notes: vec!["Crypto peripherals should be accessed under a visible synchronization primitive.".to_owned()],
                    help: Some("Add k_mutex_lock(), xSemaphoreTake(), or the project-local crypto lock before the hardware call.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
            break;
        }
    }
}

pub(super) fn check_iv_reuse(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let mut calls = Vec::new();
        collect_nodes_by_kind(body, "call_expression", &mut calls);
        let mut seen: std::collections::BTreeMap<String, tree_sitter::Node<'_>> =
            std::collections::BTreeMap::new();

        for call in calls {
            let Some(target) = call_target_text(call, &ctx.raw) else {
                continue;
            };
            if !["encrypt", "gcm_crypt", "aes_crypt", "ctr_crypt", "ccm_encrypt"]
                .iter()
                .any(|needle| target.contains(needle))
            {
                continue;
            }

            let Some(arguments) = call.child_by_field_name("arguments") else {
                continue;
            };
            for arg in arguments.named_children(&mut arguments.walk()) {
                let Some(text) = arg.utf8_text(ctx.raw.as_bytes()).ok() else {
                    continue;
                };
                let lowered = text.to_ascii_lowercase();
                if !(lowered == "iv"
                    || lowered == "nonce"
                    || lowered.contains("iv_")
                    || lowered.contains("_iv")
                    || lowered.contains("nonce_")
                    || lowered.contains("_nonce"))
                {
                    continue;
                }

                if let Some(previous) = seen.get(text) {
                    out.push(build_diagnostic(
                        crypto_rule("NRP-CRYPTO-007"),
                        DiagnosticInit {
                            span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                            message: format!("IV/nonce '{text}' reused in a second encrypt call."),
                            notes: vec![format!(
                                "The first use appeared at line {}.",
                                previous.start_position().row + 1
                            )],
                            help: Some("Generate a fresh IV or nonce for each encryption operation.".to_owned()),
                            related_spans: Vec::new(),
                        },
                    ));
                } else {
                    seen.insert(text.to_owned(), call);
                }
            }
        }
    }
}
