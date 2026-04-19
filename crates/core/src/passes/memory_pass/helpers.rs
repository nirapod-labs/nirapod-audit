// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for the memory-safety pass.

use crate::find_rule;
use tree_sitter::Node;

pub(super) fn memory_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing memory rule in registry")
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

pub(super) fn function_name<'a>(node: Node<'_>, raw: &'a str) -> Option<&'a str> {
    let declarator = node.child_by_field_name("declarator")?;
    first_identifier_text(declarator, raw)
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

pub(super) fn pointer_params(declarator: Node<'_>, raw: &str) -> Vec<String> {
    let mut function_declarator = declarator;
    while function_declarator.kind() != "function_declarator"
        && function_declarator.named_child_count() > 0
    {
        let Some(child) = function_declarator
            .child_by_field_name("declarator")
            .or_else(|| function_declarator.named_child(0))
        else {
            break;
        };
        function_declarator = child;
    }

    if function_declarator.kind() != "function_declarator" {
        return Vec::new();
    }
    let Some(parameters) = function_declarator.child_by_field_name("parameters") else {
        return Vec::new();
    };

    let mut result = Vec::new();
    for param in parameters.named_children(&mut parameters.walk()) {
        if param.kind() != "parameter_declaration" {
            continue;
        }
        let Some(text) = node_text(param, raw) else {
            continue;
        };
        if let Some(name) = pointer_name_from_text(text) {
            result.push(name);
        }
    }

    if !result.is_empty() {
        return result;
    }

    let Some(text) = node_text(function_declarator, raw) else {
        return result;
    };
    if let Some(start) = text.find('(') {
        if let Some(end) = text.rfind(')') {
            for segment in text[start + 1..end].split(',') {
                if let Some(name) = pointer_name_from_text(segment) {
                    result.push(name);
                }
            }
        }
    }

    result
}

fn pointer_name_from_text(text: &str) -> Option<String> {
    if !text.contains('*') {
        return None;
    }

    let tail = text.rsplit('*').next().unwrap_or(text);
    tail.split(|ch: char| !ch.is_ascii_alphanumeric() && ch != '_')
        .rev()
        .find(|part| is_param_name(part))
        .map(str::to_owned)
}

fn is_param_name(token: &&str) -> bool {
    !token.is_empty()
        && token
            .chars()
            .next()
            .is_some_and(|ch| ch.is_ascii_alphabetic() || ch == '_')
        && !matches!(
            *token,
            "const" | "volatile" | "restrict" | "struct" | "class" | "enum"
        )
}

pub(super) fn is_comment_line(lines: &[String], index: usize) -> bool {
    let trimmed = lines.get(index).map_or("", String::as_str).trim();
    if trimmed.starts_with("//") || trimmed.starts_with('*') || trimmed.starts_with("/*") {
        return true;
    }

    let mut in_doc = false;
    for (line_index, line) in lines.iter().enumerate() {
        if line.contains("/**") {
            in_doc = true;
        }
        if line_index == index {
            return in_doc;
        }
        if in_doc && line.contains("*/") {
            in_doc = false;
        }
    }

    false
}

pub(super) fn code_portion(line: &str) -> &str {
    line.split_once("//")
        .map_or(line, |(code, _)| code)
        .split_once("/*")
        .map_or(line.split_once("//").map_or(line, |(code, _)| code), |(code, _)| code)
}
