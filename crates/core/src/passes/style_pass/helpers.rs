// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for documentation-style checks.

use crate::find_rule;

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
    "crypto driver",
    "aes driver",
    "parser",
];
const CRYPTO_NAME_HINTS: &[&str] = &[
    "aes",
    "sha",
    "crypto",
    "cc310",
    "cc312",
    "ecdsa",
    "ecdh",
    "mbedtls",
    "nrf_crypto",
    "esp_aes",
];
const HARDWARE_WORDS: &[&str] = &["cc310", "cc312", "esp32"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct DocBlock {
    pub(super) text: String,
    pub(super) start_line: usize,
    pub(super) end_line: usize,
}

pub(super) fn style_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing style rule in registry")
}

pub(super) fn doc_blocks(lines: &[String]) -> Vec<DocBlock> {
    let mut blocks = Vec::new();
    let mut start_line = None;

    for (index, line) in lines.iter().enumerate() {
        if start_line.is_none() && line.contains("/**") {
            start_line = Some(index);
        }

        if let Some(start) = start_line {
            if line.contains("*/") {
                blocks.push(DocBlock {
                    text: lines[start..=index].join("\n"),
                    start_line: start,
                    end_line: index,
                });
                start_line = None;
            }
        }
    }

    blocks
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

pub(super) fn tag_line(block: &DocBlock, tag: &str) -> Option<usize> {
    let marker = format!("@{tag}");
    block.text.lines().enumerate().find_map(|(offset, line)| {
        line.trim_start()
            .contains(&marker)
            .then_some(block.start_line + offset)
    })
}

pub(super) fn is_generic_brief(brief: &str) -> bool {
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
        || GENERIC_BRIEFS.contains(&normalized_text.as_str())
}

pub(super) fn crypto_function_name_after_block(block: &DocBlock, lines: &[String]) -> Option<String> {
    let signature = next_signature_line(block, lines)?;
    let function_name = function_name_from_signature(signature)?;
    let lowered = function_name.to_ascii_lowercase();

    CRYPTO_NAME_HINTS
        .iter()
        .any(|needle| lowered.contains(needle))
        .then_some(function_name.to_owned())
}

pub(super) fn has_hardware_word(details: &str) -> bool {
    let lowered = details.to_ascii_lowercase();
    HARDWARE_WORDS
        .iter()
        .any(|word| lowered.contains(word))
}

fn next_signature_line<'a>(block: &DocBlock, lines: &'a [String]) -> Option<&'a str> {
    let mut index = block.end_line + 1;
    while index < lines.len() {
        let trimmed = lines[index].trim();
        if trimmed.is_empty() || trimmed.starts_with("//") {
            index += 1;
            continue;
        }
        return Some(trimmed);
    }
    None
}

fn function_name_from_signature(signature: &str) -> Option<&str> {
    let open_paren = signature.find('(')?;
    let before = &signature[..open_paren];
    before
        .split(|ch: char| !ch.is_ascii_alphanumeric() && ch != '_')
        .rev()
        .find(|token| {
            !token.is_empty()
                && token
                    .chars()
                    .next()
                    .is_some_and(|ch| ch.is_ascii_alphabetic() || ch == '_')
        })
}
