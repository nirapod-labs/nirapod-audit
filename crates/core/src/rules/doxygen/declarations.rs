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
            id: "NRP-DOX-006".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-class-doc".to_owned(),
            description: "Class declaration in .h has no preceding @class block.".to_owned(),
            rationale: concat!(
                "Public classes should expose intent and contract through Doxygen. ",
                "Without a class-level block, generated docs lose the primary entry ",
                "point for the type."
            )
            .to_owned(),
            references: vec![local_ref(
                "Class Documentation",
                DOXYGEN_FULL,
                Some("Part 2 - Class Documentation"),
            )],
            languages: Some(vec![SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-007".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "class-doc-incomplete".to_owned(),
            description: "@class block missing @details or @see.".to_owned(),
            rationale: concat!(
                "A class doc with only a short summary is not enough. It should ",
                "also explain deeper design intent and point readers at related APIs."
            )
            .to_owned(),
            references: vec![local_ref(
                "Class Documentation",
                DOXYGEN_FULL,
                Some("Part 2 - Class Documentation"),
            )],
            languages: Some(vec![SourceLanguage::Cpp]),
        },
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
            id: "NRP-DOX-010".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-enum-doc".to_owned(),
            description: "Enum in .h has no @enum block.".to_owned(),
            rationale: concat!(
                "Enums encode protocol states and option sets. Without an enum-level ",
                "doc block, the generated reference does not explain the role of the type."
            )
            .to_owned(),
            references: vec![local_ref(
                "Enum Documentation",
                DOXYGEN_FULL,
                Some("Part 4 - Enum Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-011".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "plain-enum".to_owned(),
            description: "C++ enum not declared as enum class.".to_owned(),
            rationale: concat!(
                "Plain enums pollute the surrounding scope and allow implicit integral ",
                "conversions. enum class keeps the type scoped and safer to use."
            )
            .to_owned(),
            references: vec![local_ref(
                "Enum Class Enforcement",
                DOXYGEN_FULL,
                Some("Part 4 - Enum Documentation (C++ only)"),
            )],
            languages: Some(vec![SourceLanguage::Cpp]),
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
