// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for the crypto safety pass.

use crate::{find_rule, FileContext, PlatformHint};
use tree_sitter::Node;

pub(super) const CRYPTO_BUF_WORDS: &[&str] = &[
    "key_buf",
    "key_handle",
    "key_material",
    "plaintext",
    "ciphertext",
    "entropy",
    "derived_",
    "secret",
    "nonce_buf",
    "iv_buf",
    "hmac_buf",
    "aes_key",
    "private_key",
    "shared_secret",
    "key",
    "nonce",
    "iv",
];

pub(super) const LOG_FUNCTIONS: &[&str] = &[
    "printf",
    "printk",
    "fprintf",
    "snprintf",
    "sprintf",
    "LOG_ERR",
    "LOG_WRN",
    "LOG_DBG",
    "LOG_INF",
    "log_error",
    "log_warn",
    "log_debug",
    "log_info",
    "ESP_LOGE",
    "ESP_LOGW",
    "ESP_LOGD",
    "ESP_LOGI",
    "ESP_LOGV",
    "NRF_LOG_ERROR",
    "NRF_LOG_WARNING",
    "NRF_LOG_INFO",
    "NRF_LOG_DEBUG",
];

pub(super) fn crypto_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing crypto rule in registry")
}

pub(super) fn collect_nodes_by_kind<'tree>(
    node: Node<'tree>,
    kind: &str,
    out: &mut Vec<Node<'tree>>,
) {
    if node.kind() == kind {
        out.push(node);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_nodes_by_kind(child, kind, out);
    }
}

pub(super) fn node_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    node.utf8_text(raw.as_bytes()).ok()
}

pub(super) fn call_target_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    let function = node.child_by_field_name("function")?;
    node_text(function, raw)
}

pub(super) fn first_identifier_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    if node.kind() == "identifier" {
        return node_text(node, raw);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if let Some(found) = first_identifier_text(child, raw) {
            return Some(found);
        }
    }

    None
}

pub(super) fn doc_comment_before(node: Node<'_>, lines: &[String]) -> Option<String> {
    let declaration_line = node.start_position().row;
    let mut end_line = None;

    for index in (0..declaration_line).rev().take(6) {
        let trimmed = lines.get(index).map_or("", String::as_str).trim();
        if trimmed.is_empty() {
            continue;
        }
        if trimmed.ends_with("*/") {
            end_line = Some(index);
        }
        break;
    }

    let end_line = end_line?;
    for start_line in (0..=end_line).rev() {
        if lines[start_line].contains("/**") {
            return Some(lines[start_line..=end_line].join("\n"));
        }
    }

    None
}

pub(super) fn has_tag(block: &str, tag: &str) -> bool {
    block
        .lines()
        .any(|line| line.trim_start().contains(&format!("@{tag}")))
}

pub(super) fn tag_content(block: &str, tag: &str) -> String {
    let marker = format!("@{tag}");
    block.lines()
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

pub(super) fn text_mentions_crypto_buffer(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    CRYPTO_BUF_WORDS
        .iter()
        .any(|needle| lower.contains(&needle.to_ascii_lowercase()))
}

pub(super) fn nrf_platform(ctx: &FileContext) -> bool {
    matches!(
        ctx.platform,
        PlatformHint::Nrf52840 | PlatformHint::Nrf5340 | PlatformHint::Multi
    ) || ctx.raw.contains("nrf_crypto_")
        || ctx.raw.contains("nrf_cc3xx_")
}

pub(super) fn esp32_platform(ctx: &FileContext) -> bool {
    matches!(ctx.platform, PlatformHint::Esp32 | PlatformHint::Multi)
        || ctx.raw.contains("esp_aes_")
        || ctx.raw.contains("ESP_LOG")
}
