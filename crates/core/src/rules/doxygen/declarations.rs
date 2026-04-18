// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Declaration-level Doxygen rules for public headers.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::super::refs::{local_ref, DOXYGEN_FULL};

/// Declaration-level Doxygen rules currently in the registry.
pub static DECLARATION_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-DOX-008".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-struct-doc".to_owned(),
            description: "Struct in .h has no @struct block.".to_owned(),
            rationale: concat!(
                "Wire-format structs and configuration records need explicit ",
                "documentation so field meaning, units, and protocol shape stay ",
                "visible without reading every caller."
            )
            .to_owned(),
            references: vec![local_ref(
                "Struct Documentation",
                DOXYGEN_FULL,
                Some("Part 3 - Struct Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-009".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "struct-field-undoc".to_owned(),
            description: "Struct field has no ///< inline documentation.".to_owned(),
            rationale: concat!(
                "Every public struct field should explain units, valid values, or ",
                "protocol semantics. Inline field docs keep that meaning attached ",
                "to the declaration engineers actually read."
            )
            .to_owned(),
            references: vec![local_ref(
                "Struct Field Docs",
                DOXYGEN_FULL,
                Some("Part 3 - Struct Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-012".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-fn-doc".to_owned(),
            description: "Public function in .h has no Doxygen block.".to_owned(),
            rationale: concat!(
                "Public API functions that lack documentation are invisible in the ",
                "generated reference and force readers back into implementation code ",
                "to recover basic contract information."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function Documentation",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-013".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-fn-brief".to_owned(),
            description: "Function block has no @brief.".to_owned(),
            rationale: concat!(
                "The @brief line is the minimum summary required for API browsing. ",
                "Without it, even documented functions still read as incomplete in ",
                "generated output."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @brief",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-014".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-fn-param".to_owned(),
            description: "@param missing for one or more function parameters.".to_owned(),
            rationale: concat!(
                "Every parameter needs documented direction and meaning. Missing ",
                "@param entries turn otherwise valid APIs into guesswork for call ",
                "sites and reviewers."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @param",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-015".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-fn-return".to_owned(),
            description: "@return missing on non-void function.".to_owned(),
            rationale: concat!(
                "Non-void APIs must state what success and failure values mean. ",
                "Without return documentation, callers silently guess at error ",
                "semantics and propagate misuse."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @return",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
    ]
});
