// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Structural NASA checks such as function size and macro use.

use super::helpers::{
    call_target_text, collect_nodes_by_kind, count_code_lines, function_name, is_exempt_macro,
    macro_name_and_shape, nasa_rule,
};
use crate::{build_diagnostic, line_span, node_to_span, Diagnostic, DiagnosticInit, FileContext};

const ASSERT_PATTERNS: &[&str] = &[
    "NIRAPOD_ASSERT",
    "NIRAPOD_STATIC_ASSERT",
    "assert",
    "static_assert",
    "NRF_ASSERT",
    "__ASSERT",
    "__ASSERT_NO_MSG",
];

pub(super) fn check_function_length(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let line_count =
            count_code_lines(&ctx.lines, body.start_position().row, body.end_position().row);
        if line_count <= ctx.max_function_lines {
            continue;
        }

        let name = function_name(function, &ctx.raw).unwrap_or("anonymous");
        out.push(build_diagnostic(
            nasa_rule("NRP-NASA-006"),
            DiagnosticInit {
                span: node_to_span(function, ctx.path.display().to_string(), &ctx.lines),
                message: format!(
                    "Function '{name}' is {line_count} lines; limit is {}.",
                    ctx.max_function_lines
                ),
                notes: vec![format!(
                    "Counted non-blank, non-comment lines from line {} to {}.",
                    body.start_position().row + 1,
                    body.end_position().row + 1
                )],
                help: Some("Split setup, core logic, and cleanup into smaller helper functions.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_assertions(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };
        let line_count =
            count_code_lines(&ctx.lines, body.start_position().row, body.end_position().row);
        if line_count <= 5 {
            continue;
        }

        let mut calls = Vec::new();
        collect_nodes_by_kind(body, "call_expression", &mut calls);
        let assertion_count = calls
            .into_iter()
            .filter(|call| {
                call_target_text(*call, &ctx.raw)
                    .is_some_and(|target| ASSERT_PATTERNS.contains(&target))
            })
            .count();

        if assertion_count >= ctx.min_assertions {
            continue;
        }

        let name = function_name(function, &ctx.raw).unwrap_or("anonymous");
        out.push(build_diagnostic(
            nasa_rule("NRP-NASA-007"),
            DiagnosticInit {
                span: node_to_span(function, ctx.path.display().to_string(), &ctx.lines),
                message: format!(
                    "Function '{name}' has {assertion_count} assertion(s); minimum is {}.",
                    ctx.min_assertions
                ),
                notes: vec!["Non-trivial functions should check important preconditions and invariants.".to_owned()],
                help: Some("Add assertion calls near parameter validation or critical invariants.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_macros(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for (index, line) in ctx.lines.iter().enumerate() {
        let Some((name, is_function_like)) = macro_name_and_shape(line) else {
            continue;
        };
        if is_exempt_macro(name) {
            continue;
        }

        let rule_id = if is_function_like {
            "NRP-NASA-010"
        } else {
            "NRP-NASA-009"
        };
        let message = if is_function_like {
            format!("#define uses function-like macro '{name}'.")
        } else {
            format!("#define uses macro constant '{name}'.")
        };
        let help = if is_function_like {
            "Replace this macro with an inline function or template."
        } else {
            "Replace this macro with a typed constant or constexpr value."
        };

        out.push(build_diagnostic(
            nasa_rule(rule_id),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), index + 1, &ctx.lines),
                message,
                notes: vec!["Restrict the preprocessor to guards and other necessary build-time plumbing.".to_owned()],
                help: Some(help.to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}
