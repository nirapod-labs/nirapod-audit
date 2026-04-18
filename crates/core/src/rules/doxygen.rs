// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the first `DOXYGEN` migration slice.
//!
//! This file intentionally starts with the file-header rules only. The rest of
//! the Doxygen catalog will land in later phase-aligned commits instead of one
//! oversized registry dump.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, DOXYGEN_FULL};

/// All file-header Doxygen rules currently defined in the Rust registry.
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
    ]
});

#[cfg(test)]
mod tests {
    use super::DOXYGEN_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_file_header_doxygen_rules() {
        assert_eq!(DOXYGEN_RULES.len(), 5);
        assert_eq!(DOXYGEN_RULES[0].category, RuleCategory::Doxygen);
        assert_eq!(DOXYGEN_RULES[2].severity, Severity::Warning);
    }
}
