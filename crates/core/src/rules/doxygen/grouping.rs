// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Doxygen group-architecture rules.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::super::refs::{local_ref, DOXYGEN_FULL};

/// Group-architecture Doxygen rules currently in the registry.
pub static GROUPING_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-DOX-019".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "missing-ingroup".to_owned(),
            description: "Header file has no @ingroup tag.".to_owned(),
            rationale: concat!(
                "@ingroup organizes the generated module pages. Without it, symbols ",
                "drift into ungrouped documentation and the intended API structure ",
                "becomes harder to navigate."
            )
            .to_owned(),
            references: vec![local_ref(
                "Group Architecture",
                DOXYGEN_FULL,
                Some("Part 7 - Group Architecture"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-020".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "ingroup-undefined".to_owned(),
            description: "@ingroup references a group name not defined anywhere in the project."
                .to_owned(),
            rationale: concat!(
                "A dangling @ingroup points to documentation that does not exist. ",
                "That breaks navigation and leaves symbols orphaned in generated output."
            )
            .to_owned(),
            references: vec![local_ref(
                "Group Architecture",
                DOXYGEN_FULL,
                Some("Part 7 - Group Architecture"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
    ]
});
