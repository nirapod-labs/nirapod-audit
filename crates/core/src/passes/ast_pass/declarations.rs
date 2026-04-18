// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Declaration-level Doxygen checks for headers.

use super::helpers::{
    collect_nodes_by_kind, doc_comment_before, doc_param_names, doxygen_rule,
    first_descendant_by_kind, first_identifier_node, first_identifier_text, has_tag, node_text,
    returns_void, source_param_names,
};
use crate::{build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext};

pub(super) fn check_structs(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut structs = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "struct_specifier", &mut structs);

    for struct_node in structs {
        let Some(name_node) = struct_node.child_by_field_name("name") else {
            continue;
        };
        let struct_name = node_text(name_node, &ctx.raw).unwrap_or("struct");

        if doc_comment_before(struct_node, &ctx.lines).is_none() {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-008"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Struct '{struct_name}' has no Doxygen block."),
                    notes: vec![
                        "Public structs in headers need a @struct block before the declaration."
                            .to_owned(),
                    ],
                    help: Some(format!(
                        "Add a /** @struct {struct_name}\n * @brief ... */ block before the struct."
                    )),
                    related_spans: Vec::new(),
                },
            ));
        }

        let mut fields = Vec::new();
        collect_nodes_by_kind(struct_node, "field_declaration", &mut fields);
        for field in fields {
            let field_line = field.end_position().row;
            let inline_line = ctx.lines.get(field_line).map_or("", String::as_str);
            let next_line = ctx.lines.get(field_line + 1).map_or("", String::as_str);
            let has_inline_doc =
                inline_line.contains("///<") || next_line.trim_start().starts_with("///<");

            if !has_inline_doc {
                let field_name = first_identifier_text(field, &ctx.raw).unwrap_or("unnamed");
                out.push(build_diagnostic(
                    doxygen_rule("NRP-DOX-009"),
                    DiagnosticInit {
                        span: node_to_span(field, ctx.path.display().to_string(), &ctx.lines),
                        message: format!(
                            "Struct field '{field_name}' has no ///< inline documentation."
                        ),
                        notes: vec![
                            "Public struct fields should document units, ranges, or wire semantics."
                                .to_owned(),
                        ],
                        help: Some("Add a ///< comment after the field declaration.".to_owned()),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }
    }
}

pub(super) fn check_function_declarations(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut declarations = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "declaration", &mut declarations);

    for declaration in declarations {
        let Some(function_declarator) =
            first_descendant_by_kind(declaration, "function_declarator")
        else {
            continue;
        };

        let Some(name_node) = first_identifier_node(function_declarator) else {
            continue;
        };
        let fn_name = node_text(name_node, &ctx.raw).unwrap_or("function");

        let Some(doc) = doc_comment_before(declaration, &ctx.lines) else {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-012"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Function '{fn_name}' has no Doxygen block."),
                    notes: vec![
                        "Public declarations in headers should have a Doxygen block immediately above them."
                            .to_owned(),
                    ],
                    help: Some(
                        "Add a /** @brief ...\n * @param ...\n * @return ... */ block."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
            continue;
        };

        if !has_tag(&doc.text, "brief") {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-013"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Function '{fn_name}' doc block has no @brief."),
                    notes: vec!["Every documented function needs a one-line summary.".to_owned()],
                    help: Some(
                        "Add @brief with a one-sentence description of the function.".to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }

        let source_params = source_param_names(function_declarator, &ctx.raw);
        let doc_params = doc_param_names(&doc.text);
        let missing_params = source_params
            .into_iter()
            .filter(|param| !doc_params.iter().any(|documented| documented == param))
            .collect::<Vec<_>>();

        if !missing_params.is_empty() {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-014"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!(
                        "Function '{fn_name}' is missing @param for: {}.",
                        missing_params.join(", ")
                    ),
                    notes: vec![
                        "Every declared parameter should appear in the Doxygen contract."
                            .to_owned(),
                    ],
                    help: Some(format!(
                        "Add @param entries for {}.",
                        missing_params.join(", ")
                    )),
                    related_spans: Vec::new(),
                },
            ));
        }

        if !returns_void(declaration, &ctx.raw)
            && !has_tag(&doc.text, "return")
            && !has_tag(&doc.text, "retval")
        {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-015"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Function '{fn_name}' returns non-void but has no @return."),
                    notes: vec![
                        "Return-value semantics need to be documented for callers.".to_owned()
                    ],
                    help: Some(
                        "Add @return documenting success values and error codes.".to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }

        if !has_tag(&doc.text, "pre") && !has_tag(&doc.text, "post") {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-017"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!(
                        "Function '{fn_name}' is missing @pre/@post contract documentation."
                    ),
                    notes: vec![
                        "Public APIs should document preconditions or postconditions.".to_owned(),
                    ],
                    help: Some(
                        "Add @pre and/or @post to describe the function contract.".to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }

        if !has_tag(&doc.text, "see") {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-018"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Function '{fn_name}' has no @see cross-reference."),
                    notes: vec!["Cross-references help readers navigate related APIs.".to_owned()],
                    help: Some(
                        "Add @see with related functions, types, or external references."
                            .to_owned(),
                    ),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}
