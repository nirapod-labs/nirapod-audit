// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Class and enum Doxygen checks for C++ headers.

use super::helpers::{collect_nodes_by_kind, doc_comment_before, doxygen_rule, has_tag, node_text};
use crate::{build_diagnostic, node_to_span, Diagnostic, DiagnosticInit, FileContext};

pub(super) fn check_classes(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut classes = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "class_specifier", &mut classes);

    for class_node in classes {
        let Some(name_node) = class_node.child_by_field_name("name") else {
            continue;
        };
        let class_name = node_text(name_node, &ctx.raw).unwrap_or("class");

        let Some(doc) = doc_comment_before(class_node, &ctx.lines) else {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-006"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Class '{class_name}' has no Doxygen block."),
                    notes: vec![
                        "Public classes in headers should have a @class block before the declaration."
                            .to_owned(),
                    ],
                    help: Some(format!(
                        "Add a /** @class {class_name}\n * @brief ... */ block before the class."
                    )),
                    related_spans: Vec::new(),
                },
            ));
            continue;
        };

        let missing = [
            (!has_tag(&doc.text, "details"), "@details"),
            (!has_tag(&doc.text, "see"), "@see"),
        ]
        .into_iter()
        .filter_map(|(missing, tag)| missing.then_some(tag))
        .collect::<Vec<_>>();

        if !missing.is_empty() {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-007"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!(
                        "Class '{class_name}' doc is incomplete: missing {}.",
                        missing.join(", ")
                    ),
                    notes: vec![
                        "Class docs should carry deeper context and cross-references.".to_owned(),
                    ],
                    help: Some(format!("Add {} to the @class block.", missing.join(", "))),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

pub(super) fn check_enums(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    let mut enums = Vec::new();
    collect_nodes_by_kind(ctx.tree.root_node(), "enum_specifier", &mut enums);

    for enum_node in enums {
        let Some(name_node) = enum_node.child_by_field_name("name") else {
            continue;
        };
        let enum_name = node_text(name_node, &ctx.raw).unwrap_or("enum");

        if doc_comment_before(enum_node, &ctx.lines).is_none() {
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-010"),
                DiagnosticInit {
                    span: node_to_span(name_node, ctx.path.display().to_string(), &ctx.lines),
                    message: format!("Enum '{enum_name}' has no Doxygen block."),
                    notes: vec![
                        "Public enums should have a @enum block before the declaration.".to_owned(),
                    ],
                    help: Some(format!(
                        "Add a /** @enum {enum_name}\n * @brief ... */ block before the enum."
                    )),
                    related_spans: Vec::new(),
                },
            ));
        }

        if ctx.is_cpp {
            let enum_line = ctx
                .lines
                .get(enum_node.start_position().row)
                .map_or("", String::as_str);
            if !enum_line.contains("enum class") && !enum_line.contains("enum struct") {
                out.push(build_diagnostic(
                    doxygen_rule("NRP-DOX-011"),
                    DiagnosticInit {
                        span: node_to_span(enum_node, ctx.path.display().to_string(), &ctx.lines),
                        message: format!("Enum '{enum_name}' is a plain enum, not enum class."),
                        notes: vec![
                            "Scoped enums avoid namespace pollution and implicit conversions."
                                .to_owned(),
                        ],
                        help: Some(format!(
                            "Change this declaration to 'enum class {enum_name}'."
                        )),
                        related_spans: Vec::new(),
                    },
                ));
            }
        }
    }
}
