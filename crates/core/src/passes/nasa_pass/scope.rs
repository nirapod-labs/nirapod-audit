// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Scope- and usage-oriented NASA checks.

use super::helpers::{
    call_target_text, declaration_nodes, first_identifier_text, function_definitions,
    init_declarator_nodes, nasa_rule, node_text, returns_void,
};
use crate::{build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext};
use std::collections::BTreeMap;
use tree_sitter::Node;

pub(super) fn check_unchecked_returns(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let return_map = build_local_return_map(ctx);

    for function in function_definitions(ctx.tree.root_node()) {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };

        let mut statements = Vec::new();
        super::helpers::collect_nodes_by_kind(body, "expression_statement", &mut statements);
        for statement in statements {
            let Some(call) = statement.named_child(0) else {
                continue;
            };
            if call.kind() != "call_expression" {
                continue;
            }
            let Some(target) = call_target_text(call, &ctx.raw) else {
                continue;
            };
            if !return_map.get(target).copied().unwrap_or(false) {
                continue;
            }

            out.push(build_diagnostic(
                nasa_rule("NRP-NASA-008"),
                DiagnosticInit {
                    span: node_to_span(statement, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Return value from '{target}()' is discarded."),
                    notes: vec![
                        "Same-translation-unit non-void calls should not be silently ignored."
                            .to_owned(),
                    ],
                    help: Some(
                        "Use the returned value, handle the error, or cast intentionally to (void)."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_globals(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for declaration in declaration_nodes(ctx.tree.root_node()) {
        if declaration.parent().is_none_or(|parent| parent.kind() != "translation_unit") {
            continue;
        }

        let Some(text) = node_text(declaration, &ctx.raw) else {
            continue;
        };
        let normalized = text.trim();
        if normalized.starts_with("static ")
            || normalized.starts_with("const ")
            || normalized.starts_with("extern ")
            || normalized.starts_with("typedef ")
            || !normalized.contains('=')
        {
            continue;
        }

        let Some(name) = init_declarator_nodes(declaration)
            .into_iter()
            .find_map(|node| first_identifier_text(node, &ctx.raw))
        else {
            continue;
        };

        out.push(build_diagnostic(
            nasa_rule("NRP-NASA-011"),
            DiagnosticInit {
                span: node_to_span(declaration, ctx.path.display().to_string(), &ctx.lines),
                message: format!("Global variable '{name}' has broad file scope."),
                notes: vec![
                    "Prefer function parameters or module-private static storage when possible."
                        .to_owned(),
                ],
                help: Some(
                    "Narrow the scope of this state or make the ownership explicit.".to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_mutable_where_const(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for function in function_definitions(ctx.tree.root_node()) {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };

        for declaration in declarations_in_body(body) {
            let Some(text) = node_text(declaration, &ctx.raw) else {
                continue;
            };
            let normalized = text.trim();
            if normalized.starts_with("const ") || !normalized.contains('=') {
                continue;
            }

            let Some(name) = init_declarator_nodes(declaration)
                .into_iter()
                .find_map(|node| first_identifier_text(node, &ctx.raw))
            else {
                continue;
            };

            if is_mutated_after_declaration(name, declaration, body, &ctx.raw) {
                continue;
            }

            out.push(build_diagnostic(
                nasa_rule("NRP-NASA-012"),
                DiagnosticInit {
                    span: node_to_span(declaration, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Local variable '{name}' is never mutated after initialization."),
                    notes: vec![
                        "Values that never change should be marked const to document intent."
                            .to_owned(),
                    ],
                    help: Some("Add const to this declaration if the value is intentionally immutable.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

fn build_local_return_map(ctx: &FileContext) -> BTreeMap<String, bool> {
    let mut result = BTreeMap::new();

    for function in function_definitions(ctx.tree.root_node()) {
        let Some(name) = super::helpers::function_name(function, &ctx.raw) else {
            continue;
        };
        result.insert(name.to_owned(), !returns_void(function, &ctx.raw));
    }

    result
}

fn declarations_in_body<'tree>(body: Node<'tree>) -> Vec<Node<'tree>> {
    declaration_nodes(body)
        .into_iter()
        .filter(|node| is_descendant_of(*node, body))
        .collect()
}

fn is_descendant_of(node: Node<'_>, ancestor: Node<'_>) -> bool {
    let mut current = node.parent();
    while let Some(parent) = current {
        if parent == ancestor {
            return true;
        }
        current = parent.parent();
    }
    false
}

fn is_mutated_after_declaration(name: &str, declaration: Node<'_>, body: Node<'_>, raw: &str) -> bool {
    let Some(body_text) = node_text(body, raw) else {
        return false;
    };
    let Some(decl_text) = node_text(declaration, raw) else {
        return false;
    };
    let Some(offset) = body_text.find(decl_text) else {
        return false;
    };
    let after = &body_text[offset + decl_text.len()..];

    let assignment_patterns = [
        format!("{name} ="),
        format!("{name} +="),
        format!("{name} -="),
        format!("{name} *="),
        format!("{name} /="),
        format!("{name} %="),
        format!("{name} &="),
        format!("{name} |="),
        format!("{name} ^="),
        format!("{name} <<="),
        format!("{name} >>="),
        format!("{name}++"),
        format!("++{name}"),
        format!("{name}--"),
        format!("--{name}"),
    ];

    assignment_patterns.iter().any(|pattern| after.contains(pattern))
}
