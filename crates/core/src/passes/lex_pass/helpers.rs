// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Shared helpers for lexical checks.

use crate::find_rule;

pub(super) fn is_in_doc_comment(lines: &[String], line_index: usize) -> bool {
    let mut in_doc = false;

    for (index, line) in lines.iter().enumerate() {
        if line.contains("/**") {
            in_doc = true;
        }

        if index == line_index && in_doc {
            return true;
        }

        if in_doc && line.contains("*/") {
            in_doc = false;
        }
    }

    false
}

pub(super) fn is_include_guard(line: &str) -> bool {
    line.starts_with("#pragma once") || line.starts_with("#ifndef ")
}

pub(super) fn contains_word(line: &str, word: &str) -> bool {
    line.match_indices(word).any(|(index, _)| {
        let before = line[..index].chars().next_back();
        let after = line[index + word.len()..].chars().next();
        !is_word_char(before) && !is_word_char(after)
    })
}

fn is_word_char(ch: Option<char>) -> bool {
    ch.is_some_and(|value| value.is_ascii_alphanumeric() || value == '_')
}

pub(super) fn license_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing license rule in registry")
}

pub(super) fn style_rule(id: &str) -> &'static crate::Rule {
    find_rule(id).expect("missing style rule in registry")
}
