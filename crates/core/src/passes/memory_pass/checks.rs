// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Heuristic memory-safety checks.

use super::helpers::{
    code_portion, collect_nodes_by_kind, function_name, is_comment_line, memory_rule, node_text,
    pointer_params,
};
use crate::{build_diagnostic, line_span, node_to_span, Diagnostic, DiagnosticInit, FileContext};

pub(super) fn check_pointer_null_guard(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(declarator) = function.child_by_field_name("declarator") else {
            continue;
        };
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let start_row = body.start_position().row;
        let end_row = body.end_position().row.min(ctx.lines.len().saturating_sub(1));
        let body_text = ctx.lines[start_row..=end_row]
            .iter()
            .enumerate()
            .filter_map(|(offset, line)| {
                let line_index = start_row + offset;
                (!is_comment_line(&ctx.lines, line_index)).then_some(code_portion(line).trim_end())
            })
            .collect::<Vec<_>>()
            .join("\n");

        for param_name in pointer_params(declarator, &ctx.raw) {
            let has_null_check =
                body_text.contains(&format!("NIRAPOD_ASSERT({param_name} != NULL)"))
                    || body_text.contains(&format!("NIRAPOD_ASSERT({param_name} != nullptr)"))
                    || body_text.contains(&format!("assert({param_name} != NULL)"))
                    || body_text.contains(&format!("assert({param_name} != nullptr)"))
                    || body_text.contains(&format!("if ({param_name} == NULL)"))
                    || body_text.contains(&format!("if ({param_name} == nullptr)"))
                    || body_text.contains(&format!("if (!{param_name})"));
            if has_null_check {
                continue;
            }

            let deref_patterns = [
                format!("{param_name}->"),
                format!("*{param_name}"),
                format!("* {param_name}"),
            ];
            if !deref_patterns.iter().any(|pattern| body_text.contains(pattern)) {
                continue;
            }

            let name = function_name(function, &ctx.raw).unwrap_or("anonymous");
            out.push(build_diagnostic(
                memory_rule("NRP-MEM-002"),
                DiagnosticInit {
                    span: node_to_span(function, ctx.path.display().to_string(), &ctx.lines),
                    message: format!(
                        "Pointer parameter '{param_name}' dereferenced without null check in '{name}'."
                    ),
                    notes: vec!["Pointer parameters should be asserted or guarded before dereference.".to_owned()],
                    help: Some(format!("Add NIRAPOD_ASSERT({param_name} != NULL); near function entry.")),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_size_narrowing(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let start_row = body.start_position().row;
        let end_row = body.end_position().row.min(ctx.lines.len().saturating_sub(1));

        for index in start_row..=end_row {
            let line = &ctx.lines[index];
            let has_narrowing_cast = line.contains("(int)")
                || line.contains("(uint32_t)")
                || line.contains("(int32_t)")
                || line.contains("static_cast<int>")
                || line.contains("static_cast<uint32_t>")
                || line.contains("static_cast<int32_t>");
            if !has_narrowing_cast || !mentions_size_word(line) {
                continue;
            }

            let range_check_present = ctx.lines[start_row.max(index.saturating_sub(5))..index]
                .iter()
                .any(|prev| {
                    (prev.contains("NIRAPOD_ASSERT")
                        || prev.contains("assert(")
                        || prev.contains("if ("))
                        && mentions_size_word(prev)
                        && (prev.contains('<') || prev.contains('>'))
                });
            if range_check_present {
                continue;
            }

            out.push(build_diagnostic(
                memory_rule("NRP-MEM-004"),
                DiagnosticInit {
                    span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                    message: "size_t narrowed to int/uint32_t without range check.".to_owned(),
                    notes: vec!["Narrowing size values should be preceded by an explicit upper-bound check.".to_owned()],
                    help: Some("Add NIRAPOD_ASSERT(size <= UINT32_MAX); before the cast.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_array_bounds(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut subscripts = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "subscript_expression", &mut subscripts);

    for subscript in subscripts {
        let Some(index_node) = subscript
            .child_by_field_name("index")
            .or_else(|| subscript.named_child(1))
        else {
            continue;
        };
        let Some(index_text) = node_text(index_node, &ctx.raw) else {
            continue;
        };
        let index_text = index_text.trim();
        if index_text.is_empty() || index_text.chars().all(|ch| ch.is_ascii_digit()) {
            continue;
        }

        let line_index = subscript.start_position().row.min(ctx.lines.len().saturating_sub(1));
        if is_comment_line(&ctx.lines, line_index) {
            continue;
        }

        let prior_window = ctx.lines[line_index.saturating_sub(5)..line_index]
            .iter()
            .map(|line| code_portion(line))
            .collect::<Vec<_>>()
            .join("\n");
        let has_bound_check = prior_window.contains(&format!("{index_text} <"))
            || prior_window.contains(&format!("{index_text}<"))
            || prior_window.contains(&format!("{index_text} >"))
            || prior_window.contains(&format!("{index_text}>"))
            || prior_window.contains(&format!("assert({index_text}"))
            || prior_window.contains(&format!("NIRAPOD_ASSERT({index_text}"));
        if has_bound_check {
            continue;
        }

            out.push(build_diagnostic(
                memory_rule("NRP-MEM-001"),
                DiagnosticInit {
                    span: line_span(ctx.path.display().to_string(), line_index + 1, &ctx.lines),
                    message: format!("Array subscript uses index '{index_text}' without visible bounds check."),
                    notes: vec!["Array indices should be guarded before the access site.".to_owned()],
                    help: Some(format!("Add NIRAPOD_ASSERT({index_text} < size); before the subscript expression.")),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_size_overflow(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for (index, line) in ctx.lines.iter().enumerate() {
        let trimmed = code_portion(line).trim();
        if is_comment_line(&ctx.lines, index) || !mentions_size_word(trimmed) || !trimmed.contains('+') {
            continue;
        }

        let prior_window = ctx.lines[index.saturating_sub(5)..index].join("\n");
        if prior_window.contains("SIZE_MAX") || prior_window.contains("UINT32_MAX") {
            continue;
        }

        out.push(build_diagnostic(
            memory_rule("NRP-MEM-003"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                message: "size_t addition appears without an overflow guard.".to_owned(),
                notes: vec!["Size arithmetic should be paired with a visible upper-bound assertion.".to_owned()],
                help: Some("Add NIRAPOD_ASSERT(b <= SIZE_MAX - a); before the addition.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

fn mentions_size_word(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    ["size", "len", "length", "count", "num", "capacity"]
        .iter()
        .any(|needle| lower.contains(needle))
}
