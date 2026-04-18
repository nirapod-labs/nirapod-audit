// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the `LICENSE` category.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, url_ref, EMBEDDED_SKILL, LICENSE_HEADERS_C, LICENSE_HEADERS_TS};

/// All license rules in stable registry order.
pub static LICENSE_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-LIC-001".to_owned(),
            category: RuleCategory::License,
            severity: Severity::Error,
            title: "missing-spdx-identifier".to_owned(),
            description: "SPDX-License-Identifier line is absent from the file.".to_owned(),
            rationale: concat!(
                "A source file without a license header is legally ambiguous. ",
                "SPDX identifiers provide machine-readable, unambiguous license ",
                "declarations required for compliance and distribution."
            )
            .to_owned(),
            references: vec![
                local_ref(
                    "License Header Quick Reference",
                    LICENSE_HEADERS_C,
                    Some("Standard Header Template"),
                ),
                local_ref(
                    "TS/Rust License Headers",
                    LICENSE_HEADERS_TS,
                    Some("TypeScript File Header"),
                ),
                url_ref("SPDX License List", "https://spdx.org/licenses/"),
            ],
            languages: None,
        },
        Rule {
            id: "NRP-LIC-002".to_owned(),
            category: RuleCategory::License,
            severity: Severity::Error,
            title: "missing-spdx-copyright".to_owned(),
            description: "SPDX-FileCopyrightText line is absent from the file.".to_owned(),
            rationale: concat!(
                "Copyright attribution is a legal requirement for MIT-licensed code. ",
                "The SPDX-FileCopyrightText line establishes who holds copyright and ",
                "enables automated compliance checks via the REUSE tool."
            )
            .to_owned(),
            references: vec![
                local_ref(
                    "License Header Quick Reference",
                    LICENSE_HEADERS_C,
                    Some("Standard Header Template"),
                ),
                url_ref("REUSE Software", "https://reuse.software/"),
            ],
            languages: None,
        },
        Rule {
            id: "NRP-LIC-003".to_owned(),
            category: RuleCategory::License,
            severity: Severity::Error,
            title: "header-not-first".to_owned(),
            description:
                "Doxygen file header block must appear before #pragma once or #ifndef guards."
                    .to_owned(),
            rationale: concat!(
                "When the header block comes after include guards, Doxygen may not ",
                "associate it with the file. The header must be line 1 so that both ",
                "Doxygen and human readers see the license and purpose immediately."
            )
            .to_owned(),
            references: vec![local_ref(
                "File Structure and Layout",
                EMBEDDED_SKILL,
                Some("Part 1 - Section 1.1"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
        Rule {
            id: "NRP-LIC-004".to_owned(),
            category: RuleCategory::License,
            severity: Severity::Warning,
            title: "spdx-outside-doxygen".to_owned(),
            description: "SPDX lines exist but are not inside the /** ... */ Doxygen block."
                .to_owned(),
            rationale: concat!(
                "Nirapod convention places SPDX lines at the bottom of the file-level ",
                "Doxygen block so they appear in the generated documentation site. ",
                "Standalone // SPDX comments are valid for REUSE compliance but miss ",
                "the documentation integration."
            )
            .to_owned(),
            references: vec![local_ref(
                "License Header Template",
                LICENSE_HEADERS_C,
                Some("Standard Header Template"),
            )],
            languages: Some(vec![SourceLanguage::C, SourceLanguage::Cpp]),
        },
    ]
});

#[cfg(test)]
mod tests {
    use super::LICENSE_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_all_license_rules() {
        assert_eq!(LICENSE_RULES.len(), 4);
        assert_eq!(LICENSE_RULES[0].category, RuleCategory::License);
        assert_eq!(LICENSE_RULES[3].severity, Severity::Warning);
    }
}
