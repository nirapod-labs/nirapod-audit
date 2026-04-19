// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Platform-sensitive crypto checks.

use super::helpers::{
    call_target_text, collect_nodes_by_kind, crypto_rule, esp32_platform, nrf_platform,
    text_mentions_crypto_buffer,
};
use crate::{build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext, PlatformHint};

pub(super) fn check_flash_buf_to_nrf_crypto(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    if !nrf_platform(ctx) {
        return;
    }

    let const_names = collect_const_names(ctx);
    let mut calls = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "call_expression", &mut calls);

    for call in calls {
        let Some(target) = call_target_text(call, &ctx.raw) else {
            continue;
        };
        if !target.starts_with("nrf_crypto_") {
            continue;
        }
        let Some(arguments) = call.child_by_field_name("arguments") else {
            continue;
        };
        for arg in arguments.named_children(&mut arguments.walk()) {
            let Some(text) = arg.utf8_text(ctx.raw.as_bytes()).ok() else {
                continue;
            };
            if text.starts_with('"') || const_names.contains(text) {
                out.push(build_diagnostic(
                    crypto_rule("NRP-CRYPTO-004"),
                    DiagnosticInit {
                        span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                        message: format!(
                            "Flash-resident or const buffer '{text}' passed directly to {target}()."
                        ),
                        notes: vec!["CryptoCell DMA expects RAM-backed buffers.".to_owned()],
                        help: Some("Copy the input into a mutable RAM buffer before calling nrf_crypto.".to_owned()),
                        related_spans: Vec::new(),
                    },
                ));
                break;
            }
        }
    }
}

pub(super) fn check_cc312_direct_register(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    if ctx.platform != PlatformHint::Nrf5340 {
        return;
    }

    for (index, line) in ctx.lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("//") || trimmed.starts_with('*') {
            continue;
        }
        if (trimmed.contains("CC312") || trimmed.contains("NRF_CRYPTOCELL"))
            && (trimmed.contains("->") || trimmed.contains('['))
        {
            out.push(build_diagnostic(
                crypto_rule("NRP-CRYPTO-006"),
                DiagnosticInit {
                    span: crate::line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                    message: "Direct CC312 register access found in non-secure source.".to_owned(),
                    notes: vec!["CC312 access should go through the secure platform wrapper API.".to_owned()],
                    help: Some("Use nrf_cc3xx_platform_* helpers instead of touching CC312 registers directly.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_interrupt_crypto(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(declarator) = function.child_by_field_name("declarator") else {
            continue;
        };
        let Some(name) = declarator.utf8_text(ctx.raw.as_bytes()).ok() else {
            continue;
        };
        let lowered = name.to_ascii_lowercase();
        if !(lowered.contains("irq") || lowered.contains("isr") || lowered.contains("handler")) {
            continue;
        }
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let mut calls = Vec::new();
        collect_nodes_by_kind(body, "call_expression", &mut calls);
        for call in calls {
            let Some(target) = call_target_text(call, &ctx.raw) else {
                continue;
            };
            if target.starts_with("nrf_crypto_")
                || target.starts_with("nrf_cc3xx_")
                || target.starts_with("esp_aes_")
            {
                out.push(build_diagnostic(
                    crypto_rule("NRP-CRYPTO-008"),
                    DiagnosticInit {
                        span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                        message: format!("Crypto call '{target}()' found inside interrupt handler '{name}'."),
                        notes: vec!["ISR paths should defer slow or locking crypto work to thread context.".to_owned()],
                        help: Some("Queue the work to a task or worker thread instead of running crypto in the ISR.".to_owned()),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }
    }
}

pub(super) fn active_for_hardware_mutex(ctx: &FileContext) -> bool {
    nrf_platform(ctx) || esp32_platform(ctx) || text_mentions_crypto_buffer(&ctx.raw)
}

fn collect_const_names(ctx: &FileContext) -> std::collections::BTreeSet<String> {
    let mut declarations = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "declaration", &mut declarations);
    let mut result = std::collections::BTreeSet::new();

    for declaration in declarations {
        let Some(text) = declaration.utf8_text(ctx.raw.as_bytes()).ok() else {
            continue;
        };
        if !text.contains("const ") {
            continue;
        }
        let mut ids = Vec::new();
        collect_nodes_by_kind(declaration, "identifier", &mut ids);
        if let Some(identifier) = ids.last().and_then(|node| node.utf8_text(ctx.raw.as_bytes()).ok())
        {
            result.insert(identifier.to_owned());
        }
    }

    result
}
