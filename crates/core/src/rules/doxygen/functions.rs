// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Function-specific Doxygen rules.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::super::refs::{local_ref, DOXYGEN_FULL};

/// Function-level Doxygen rules currently in the registry.
pub static FUNCTION_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
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
        Rule {
            id: "NRP-DOX-016".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "return-incomplete".to_owned(),
            description: "@return documented but not all error codes listed.".to_owned(),
            rationale: concat!(
                "When a status-returning API documents only a high-level return summary, ",
                "callers still cannot tell which error codes may appear. @retval entries ",
                "make the contract concrete."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @retval",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-017".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "missing-fn-pre-post".to_owned(),
            description: "Public API function missing @pre or @post.".to_owned(),
            rationale: concat!(
                "Function contracts belong in the docs, not just in caller folklore. ",
                "@pre and @post tell readers what must be true before the call and ",
                "what the API guarantees afterward."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function Contracts",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-018".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Info,
            title: "missing-fn-see".to_owned(),
            description: "Function block missing any @see cross-reference.".to_owned(),
            rationale: concat!(
                "@see links help engineers navigate related APIs and nearby concepts. ",
                "Without them, the docs become a flat list instead of a usable reference."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @see",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-022".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "warning-missing-for-constraint".to_owned(),
            description: "Hardware/thread constraint in @details but no @warning or @note block."
                .to_owned(),
            rationale: concat!(
                "Important operational constraints should stand out visually. ",
                "If @details mentions ISR, backend, or threading restrictions, a ",
                "@warning or @note block should make that visible."
            )
            .to_owned(),
            references: vec![local_ref(
                "Function @warning",
                DOXYGEN_FULL,
                Some("Part 5 - Function Documentation"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
    ]
});
