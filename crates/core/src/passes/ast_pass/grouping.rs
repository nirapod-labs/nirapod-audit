// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Doxygen group-tag checks.

use super::helpers::{collect_nodes_by_kind, doxygen_rule, first_descendant_by_kind};
use crate::{build_diagnostic, line_span, Diagnostic, DiagnosticInit, FileContext};
use std::{collections::BTreeSet, fs, path::Path};

pub(super) fn check_ingroups(ctx: &FileContext, out: &mut Vec<Diagnostic>) {
    if !has_groupable_declarations(ctx) {
        return;
    }

    let ingroups = collect_group_tags(&ctx.raw, "@ingroup");
    if ingroups.is_empty() {
        out.push(build_diagnostic(
            doxygen_rule("NRP-DOX-019"),
            DiagnosticInit {
                span: line_span(ctx.path.display().to_string(), 1, &ctx.lines),
                message: "Header file has no @ingroup tag.".to_owned(),
                notes: vec![
                    "Public headers should attach their API surface to a Doxygen group.".to_owned(),
                ],
                help: Some(
                    "Add @ingroup GroupName to the file header or symbol-level doc blocks."
                        .to_owned(),
                ),
                related_spans: Vec::new(),
            },
        ));
        return;
    }

    let defined_groups = collect_defined_groups(&ctx.root_dir);
    if defined_groups.is_empty() {
        return;
    }

    for group in ingroups {
        if !defined_groups.contains(&group) {
            let line = tag_line(&ctx.lines, "@ingroup", &group).unwrap_or(1);
            out.push(build_diagnostic(
                doxygen_rule("NRP-DOX-020"),
                DiagnosticInit {
                    span: line_span(ctx.path.display().to_string(), line, &ctx.lines),
                    message: format!("@ingroup '{group}' references an undefined group."),
                    notes: vec![
                        "The referenced group must be declared via @defgroup somewhere in the audit target."
                            .to_owned(),
                    ],
                    help: Some(format!(
                        "Define @defgroup {group} in a module-doc.h file or fix the group name."
                    )),
                    related_spans: Vec::new(),
                },
            ));
        }
    }
}

fn collect_defined_groups(root_dir: &Path) -> BTreeSet<String> {
    let mut groups = BTreeSet::new();
    let mut stack = vec![root_dir.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
                continue;
            }

            if !is_source_file(&path) {
                continue;
            }

            let Ok(raw) = fs::read_to_string(&path) else {
                continue;
            };

            groups.extend(collect_group_tags(&raw, "@defgroup"));
        }
    }

    groups
}

fn collect_group_tags(raw: &str, tag: &str) -> Vec<String> {
    raw.lines()
        .filter_map(|line| {
            let marker_index = line.find(tag)?;
            let suffix = &line[marker_index + tag.len()..];
            suffix.split_whitespace().next().map(str::to_owned)
        })
        .collect()
}

fn tag_line(lines: &[String], tag: &str, group: &str) -> Option<usize> {
    lines.iter().enumerate().find_map(|(index, line)| {
        line.contains(tag)
            .then_some(line)
            .filter(|current| current.contains(group))
            .map(|_| index + 1)
    })
}

fn is_source_file(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|value| value.to_str()),
        Some("h" | "hpp" | "c" | "cc" | "cpp")
    )
}

fn has_groupable_declarations(ctx: &FileContext) -> bool {
    let root = ctx.tree.root_node();

    let mut classes = Vec::new();
    collect_nodes_by_kind(root, "class_specifier", &mut classes);
    if !classes.is_empty() {
        return true;
    }

    let mut structs = Vec::new();
    collect_nodes_by_kind(root, "struct_specifier", &mut structs);
    if !structs.is_empty() {
        return true;
    }

    let mut enums = Vec::new();
    collect_nodes_by_kind(root, "enum_specifier", &mut enums);
    if !enums.is_empty() {
        return true;
    }

    let mut declarations = Vec::new();
    collect_nodes_by_kind(root, "declaration", &mut declarations);
    declarations
        .into_iter()
        .any(|declaration| first_descendant_by_kind(declaration, "function_declarator").is_some())
}
