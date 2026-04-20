// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the `MEMORY` category.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, EMBEDDED_SKILL, NASA_SAFETY};

const LANG_C_CPP: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// All memory-safety rules in stable registry order.
pub static MEMORY_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-MEM-001".to_owned(),
            category: RuleCategory::Memory,
            severity: Severity::Error,
            title: "array-no-bounds-check".to_owned(),
            description:
                "Array subscript used without prior NIRAPOD_ASSERT(idx < size) guard.".to_owned(),
            rationale: concat!(
                "Unchecked array indices can corrupt adjacent memory silently. Embedded systems ",
                "rarely have protection mechanisms that make these faults easy to recover from."
            )
            .to_owned(),
            references: vec![local_ref(
                "Memory Safety Checklist",
                EMBEDDED_SKILL,
                Some("Part 6 - Memory Safety Checklist"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-MEM-002".to_owned(),
            category: RuleCategory::Memory,
            severity: Severity::Error,
            title: "ptr-no-null-check".to_owned(),
            description:
                "Pointer parameter dereferenced without prior NIRAPOD_ASSERT(ptr != NULL)."
                    .to_owned(),
            rationale: concat!(
                "Null pointer dereferences tend to become hard faults on embedded targets. ",
                "Critical pointer parameters should be validated near function entry."
            )
            .to_owned(),
            references: vec![
                local_ref(
                    "Memory Safety Checklist",
                    EMBEDDED_SKILL,
                    Some("Part 6 - Memory Safety Checklist"),
                ),
                local_ref(
                    "NASA JPL Rule 5",
                    NASA_SAFETY,
                    Some("Rule 5 - Minimum Two Assertions per Function"),
                ),
            ],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-MEM-003".to_owned(),
            category: RuleCategory::Memory,
            severity: Severity::Error,
            title: "size-overflow-unchecked".to_owned(),
            description:
                "size_t addition a + b without NIRAPOD_ASSERT(b <= SIZE_MAX - a) guard."
                    .to_owned(),
            rationale: concat!(
                "Silent size_t overflow can wrap allocation sizes and produce undersized buffers. ",
                "Every size arithmetic site should have a visible overflow guard."
            )
            .to_owned(),
            references: vec![local_ref(
                "Memory Safety Checklist",
                EMBEDDED_SKILL,
                Some("Part 6 - Memory Safety Checklist"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-MEM-004".to_owned(),
            category: RuleCategory::Memory,
            severity: Severity::Warning,
            title: "size-to-int-cast".to_owned(),
            description: "size_t cast to int/uint32_t without range check.".to_owned(),
            rationale: concat!(
                "Narrowing size_t values can silently truncate large buffer sizes, especially ",
                "in mixed 32-bit and 64-bit build environments."
            )
            .to_owned(),
            references: vec![local_ref(
                "Memory Safety Checklist",
                EMBEDDED_SKILL,
                Some("Part 6 - Memory Safety Checklist"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
    ]
});

#[cfg(test)]
mod tests {
    use super::MEMORY_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_memory_rules() {
        assert_eq!(MEMORY_RULES.len(), 4);
        assert_eq!(MEMORY_RULES[0].category, RuleCategory::Memory);
        assert_eq!(MEMORY_RULES[3].severity, Severity::Warning);
    }
}
