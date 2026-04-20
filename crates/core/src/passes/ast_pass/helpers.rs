// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for the AST Doxygen pass.

use crate::find_rule;
use tree_sitter::Node;

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct DocBlock {
    pub(super) text: String,
    pub(super) start_line: usize,
}

pub(super) fn doc_comment_before(node: Node<'_>, lines: &[String]) -> Option<DocBlock> {
    let declaration_line = node.start_position().row;
    let mut end_line = None;

    for index in (0..declaration_line).rev().take(4) {
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
            return Some(DocBlock {
                text: lines[start_line..=end_line].join("\n"),
                start_line,
            });
        }
    }

    None
}

pub(super) fn first_doc_block(lines: &[String]) -> Option<DocBlock> {
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

pub(super) fn has_tag(block: &str, tag: &str) -> bool {
    block
        .lines()
        .any(|line| line.trim_start().contains(&format!("@{tag}")))
}

pub(super) fn tag_content(block: &str, tag: &str) -> String {
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
}

pub(super) fn doxygen_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing doxygen rule in registry")
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

pub(super) fn first_descendant_by_kind<'tree>(
    node: Node<'tree>,
    kind: &str,
) -> Option<Node<'tree>> {
    if node.kind() == kind {
        return Some(node);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if let Some(found) = first_descendant_by_kind(child, kind) {
            return Some(found);
        }
    }

    None
}

pub(super) fn first_identifier_node(node: Node<'_>) -> Option<Node<'_>> {
    first_descendant_by_kind(node, "identifier")
}

pub(super) fn first_identifier_text<'a>(node: Node<'a>, raw: &'a str) -> Option<&'a str> {
    first_identifier_node(node).and_then(|identifier| node_text(identifier, raw))
}

pub(super) fn node_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    node.utf8_text(raw.as_bytes()).ok()
}

pub(super) fn doc_param_names(block: &str) -> Vec<String> {
    block
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim_start().trim_start_matches('*').trim();
            let mut parts = trimmed.split_whitespace();
            let tag = parts.next()?;
            if !tag.starts_with("@param") {
                return None;
            }
            parts.next().map(str::to_owned)
        })
        .collect()
}

pub(super) fn source_param_names(node: Node<'_>, raw: &str) -> Vec<String> {
    let mut params = Vec::new();
    collect_nodes_by_kind(node, "parameter_declaration", &mut params);

    params
        .into_iter()
        .filter_map(|param| {
            let text = node_text(param, raw)?.trim();
            if text == "void" {
                return None;
            }
            first_identifier_text(param, raw).map(str::to_owned)
        })
        .collect()
}

pub(super) fn returns_void(node: Node<'_>, raw: &str) -> bool {
    node.child_by_field_name("type")
        .and_then(|type_node| node_text(type_node, raw))
        .is_some_and(|text| text.trim() == "void")
}

pub(super) fn return_type_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    node.child_by_field_name("type")
        .and_then(|type_node| node_text(type_node, raw))
}
