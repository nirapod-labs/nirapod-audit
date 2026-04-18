// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! File-header and module-doc Doxygen rules.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::super::refs::{local_ref, DOXYGEN_FULL};

/// File-level Doxygen rules currently in the registry.
pub static FILE_HEADER_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
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
            id: "NRP-DOX-021".to_owned(),
            category: RuleCategory::Doxygen,
            severity: Severity::Warning,
            title: "missing-defgroup".to_owned(),
            description: "module-doc.h file exists but has no @defgroup.".to_owned(),
            rationale: concat!(
                "A module-doc header exists specifically to define Doxygen groups. ",
                "Without @defgroup, the file does not anchor group navigation or ",
                "the intended documentation hierarchy."
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
