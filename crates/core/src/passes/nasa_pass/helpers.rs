// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for the NASA safety pass.

use crate::find_rule;
use tree_sitter::Node;

const EXEMPT_MACROS: &[&str] = &[
    "NIRAPOD_ASSERT",
    "NIRAPOD_STATIC_ASSERT",
    "NRF_ASSERT",
    "__ASSERT",
    "__ASSERT_NO_MSG",
    "LOG_MODULE_REGISTER",
    "LOG_MODULE_DECLARE",
    "BUILD_ASSERT",
    "STATIC_ASSERT",
    "IS_ENABLED",
    "COND_CODE_1",
    "COND_CODE_0",
    "DT_CHOSEN",
    "DT_NODELABEL",
    "DT_PROP",
];

pub(super) fn nasa_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing nasa rule in registry")
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

pub(super) fn function_name<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    let declarator = node.child_by_field_name("declarator")?;
    first_identifier_text(declarator, raw)
}

pub(super) fn call_target_text<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    let function = node.child_by_field_name("function")?;
    node_text(function, raw)
}

pub(super) fn count_code_lines(lines: &[String], start_row: usize, end_row: usize) -> usize {
    let mut count = 0;
    let mut in_block_comment = false;

    for index in start_row..=end_row.min(lines.len().saturating_sub(1)) {
        let trimmed = lines[index].trim();

        if in_block_comment {
            if trimmed.contains("*/") {
                in_block_comment = false;
            }
            continue;
        }

        if trimmed.starts_with("/*") {
            if !trimmed.contains("*/") {
                in_block_comment = true;
            }
            continue;
        }

        if trimmed.is_empty() || trimmed.starts_with("//") {
            continue;
        }
        if trimmed == "{" || trimmed == "}" {
            continue;
        }

        count += 1;
    }

    count
}

pub(super) fn has_loop_bound_comment(lines: &[String], loop_row: usize) -> bool {
    let comment_window_start = loop_row.saturating_sub(3);

    for line in &lines[comment_window_start..loop_row.min(lines.len())] {
        let trimmed = line.trim();
        let is_comment = trimmed.starts_with("//")
            || trimmed.starts_with("/*")
            || trimmed.starts_with('*')
            || trimmed.starts_with("*/");
        if is_comment && mentions_bound(trimmed) {
            return true;
        }
    }

    lines.get(loop_row)
        .map(|line| (line.contains("//") || line.contains("/*")) && mentions_bound(line))
        .unwrap_or(false)
}

pub(super) fn has_static_loop_bound(loop_node: Node<'_>, raw: &str) -> bool {
    loop_node
        .child_by_field_name("condition")
        .and_then(|condition| node_text(condition, raw))
        .is_some_and(|text| {
            text.contains("sizeof")
                || text.contains("ARRAY_SIZE")
                || text.chars().any(|ch| ch.is_ascii_digit())
                || text
                    .split(|ch: char| !ch.is_ascii_alphanumeric() && ch != '_')
                    .any(|token| token.len() >= 2 && token.chars().all(|ch| ch.is_ascii_uppercase() || ch == '_'))
        })
}

pub(super) fn macro_name_and_shape(line: &str) -> Option<(&str, bool)> {
    let trimmed = line.trim();
    let rest = trimmed.strip_prefix("#define ")?.trim_start();
    let name_end = rest
        .find(|ch: char| ch.is_ascii_whitespace() || ch == '(')
        .unwrap_or(rest.len());
    let name = &rest[..name_end];
    if name.is_empty() {
        return None;
    }

    let suffix = &rest[name.len()..];
    let is_function_like = suffix.starts_with('(');
    Some((name, is_function_like))
}

pub(super) fn is_exempt_macro(name: &str) -> bool {
    EXEMPT_MACROS.contains(&name) || name.ends_with("_H") || name.ends_with("_H_")
}

fn mentions_bound(line: &str) -> bool {
    let lower = line.to_ascii_lowercase();
    ["max", "bound", "limit", "iter", "upper", "cap", "at most", "ceil"]
        .iter()
        .any(|needle| lower.contains(needle))
        || lower.chars().any(|ch| ch.is_ascii_digit())
}
