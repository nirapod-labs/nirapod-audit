// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Control-flow-oriented NASA checks.

use super::helpers::{
    call_target_text, collect_nodes_by_kind, function_name, has_loop_bound_comment,
    has_static_loop_bound, nasa_rule,
};
use crate::{build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext};

const SETJMP_FUNCTIONS: &[&str] = &["setjmp", "longjmp", "_setjmp", "_longjmp"];
const ALLOC_FUNCTIONS: &[&str] = &[
    "malloc",
    "calloc",
    "realloc",
    "free",
    "aligned_alloc",
    "posix_memalign",
    "strdup",
    "strndup",
];

pub(super) fn check_goto(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut nodes = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "goto_statement", &mut nodes);

    for node in nodes {
        out.push(build_diagnostic(
            nasa_rule("NRP-NASA-001"),
            DiagnosticInit {
                span: node_to_span(node, ctx.path.display().to_string(), &ctx.lines),
                message: "goto statement found.".to_owned(),
                notes: vec!["Structured control flow is required for safety-critical firmware.".to_owned()],
                help: Some("Rewrite this path with a loop, early return, or a state variable.".to_owned()),
                related_spans: Vec::new(),
            },
        ));
    }
}

pub(super) fn check_setjmp_longjmp(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut calls = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "call_expression", &mut calls);

    for call in calls {
        let Some(target) = call_target_text(call, &ctx.raw) else {
            continue;
        };
        if SETJMP_FUNCTIONS.contains(&target) {
            out.push(build_diagnostic(
                nasa_rule("NRP-NASA-002"),
                DiagnosticInit {
                    span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("{target}() call found."),
                    notes: vec!["Non-local jumps make control flow and stack behavior harder to verify.".to_owned()],
                    help: Some("Use structured error handling with return values or explicit state.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_recursion(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut functions = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "function_definition", &mut functions);

    for function in functions {
        let Some(name) = function_name(function, &ctx.raw) else {
            continue;
        };
        let Some(body) = function.child_by_field_name("body") else {
            continue;
        };

        let mut calls = Vec::new();
        collect_nodes_by_kind(body, "call_expression", &mut calls);
        for call in calls {
            if call_target_text(call, &ctx.raw) == Some(name) {
                out.push(build_diagnostic(
                    nasa_rule("NRP-NASA-003"),
                    DiagnosticInit {
                        span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                        message: format!("Function '{name}' calls itself directly."),
                        notes: vec!["Recursive stack depth is not bounded well enough for embedded review.".to_owned()],
                        help: Some("Replace recursion with an iterative algorithm and a bounded worklist.".to_owned()),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }
    }
}

pub(super) fn check_loop_bounds(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    for kind in ["for_statement", "while_statement", "do_statement"] {
        let mut loops = Vec::new();
        collect_nodes_by_kind(ctx.tree.root_node(), kind, &mut loops);

        for loop_node in loops {
            if kind == "for_statement" && has_static_loop_bound(loop_node, &ctx.raw) {
                continue;
            }
            let loop_row = loop_node.start_position().row;
            if has_loop_bound_comment(&ctx.lines, loop_row) {
                continue;
            }

            out.push(build_diagnostic(
                nasa_rule("NRP-NASA-004"),
                DiagnosticInit {
                    span: node_to_span(loop_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("{} has no documented upper bound.", kind.replace('_', " ")),
                    notes: vec!["Loops should state their maximum iteration count in a nearby comment.".to_owned()],
                    help: Some("Add a bound comment such as `// max: 256 iterations` above the loop.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_dynamic_alloc(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut calls = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "call_expression", &mut calls);

    for call in calls {
        let Some(target) = call_target_text(call, &ctx.raw) else {
            continue;
        };
        if ALLOC_FUNCTIONS.contains(&target) {
            out.push(build_diagnostic(
                nasa_rule("NRP-NASA-005"),
                DiagnosticInit {
                    span: node_to_span(call, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Dynamic allocation function '{target}()' called."),
                    notes: vec!["Post-init allocation can introduce fragmentation and timing jitter.".to_owned()],
                    help: Some("Use statically allocated storage or allocate once during initialization.".to_owned()),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}
