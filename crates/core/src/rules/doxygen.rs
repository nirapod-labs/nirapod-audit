// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the current `DOXYGEN` migration slice.
//!
//! This registry grows in phase-aligned chunks. The current slice covers
//! file-header checks plus the first public struct and function documentation
//! rules.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, DOXYGEN_FULL};

/// All Doxygen rules currently defined in the Rust registry.
pub static DOXYGEN_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-DOX-001".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-file-header".to_owned(),
            description: "No @file Doxygen block found at all.".to_owned(),
            rationale: concat!(
                "The file-level Doxygen block is the front door of the file. ",
                "Without it, Doxygen skips the file entirely and engineers lose ",
                "the high-level summary and audit context."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Structure and Layout",
                DOXYGEN_FULL,
                Some("Part 1 - Section 1.1"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-002".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Error,
            title: "missing-file-brief".to_owned(),
            description: "@file block has no @brief.".to_owned(),
            rationale: concat!(
                "The @brief line is the one-sentence summary shown in Doxygen's ",
                "file list. Without it, the generated docs surface an empty or ",
                "uninformative file entry."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Header @brief",
                DOXYGEN_FULL,
                Some("Part 1 - Section 1.1"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-003".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "brief-too-generic".to_owned(),
            description: "@brief is one word or uses a known-generic phrase such as 'driver'."
                .to_owned(),
            rationale: concat!(
                "A generic brief tells the reader what the file is, not what it ",
                "does. The brief should communicate purpose, behavior, or domain ",
                "context in a single precise sentence."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Header @brief",
                DOXYGEN_FULL,
                Some("Part 1 - Section 1.1"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-004".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "missing-file-details".to_owned(),
            description: "@file block has no @details section.".to_owned(),
            rationale: concat!(
                "The @details section captures design context that does not fit ",
                "into the short summary. Without it, future reviewers lose the ",
                "why behind the file's architecture and constraints."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Header @details",
                DOXYGEN_FULL,
                Some("Part 1 - Section 1.1"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-DOX-005".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "missing-file-meta".to_owned(),
            description: "@author, @date, or @version absent from @file block.".to_owned(),
            rationale: concat!(
                "File metadata is part of audit traceability. Attribution and ",
                "version markers make ownership and document evolution visible ",
                "without digging through VCS history."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Header Metadata",
                DOXYGEN_FULL,
                Some("Part 1 - Section 1.2"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
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

#[cfg(test)]
mod tests {
    use super::DOXYGEN_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_current_doxygen_rules() {
        assert_eq!(DOXYGEN_RULES.len(), 11);
        assert_eq!(DOXYGEN_RULES[0].category, RuleCategory::Doxygen);
        assert_eq!(DOXYGEN_RULES[2].severity, Severity::Warning);
        assert_eq!(DOXYGEN_RULES[10].severity, Severity::Error);
    }
}
