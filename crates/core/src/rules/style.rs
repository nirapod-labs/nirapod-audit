// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the lexical `STYLE` migration slice.
//!
//! Phase 2 only needs the lexical style checks that run in [`crate::LexPass`].
//! The remaining style rules will land later with the dedicated style pass.

use crate::{Rule, RuleCategory, Severity};
use std::sync::LazyLock;

use super::refs::{local_ref, AI_PATTERNS_DB, DOC_SKILL, WORD_TIERS, WRITE_LIKE_HUMAN};

/// All lexical style rules currently defined in the Rust registry.
pub static STYLE_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-STYLE-001".to_owned(),
            category: RuleCategory::Style,
            severity: Severity::Warning,
            title: "banned-word".to_owned(),
            description: concat!(
                "Words like \"robust\", \"seamlessly\", \"leverage\", ",
                "\"delve\", \"utilize\" found in doc comment."
            )
            .to_owned(),
            rationale: concat!(
                "These words appear far more often in AI-generated text than in ",
                "human technical writing. The fix is plain language that says ",
                "what the code does, not how impressive it sounds."
            )
            .to_owned(),
            references: vec![
                local_ref("Writing Style", DOC_SKILL, Some("Part 5 - Writing Style")),
                local_ref("Write-Like-Human Reference", WRITE_LIKE_HUMAN, None),
                local_ref(
                    "Tier 1 Banned Words",
                    WORD_TIERS,
                    Some("Tier 1 - Never use"),
                ),
                local_ref(
                    "AI Phrase Patterns",
                    AI_PATTERNS_DB,
                    Some("Phrase patterns"),
                ),
            ],
            languages: None,
        },
        Rule {
            id: "NRP-STYLE-002".to_owned(),
            category: RuleCategory::Style,
            severity: Severity::Warning,
            title: "em-dash-in-doc".to_owned(),
            description: "Em-dash character (\u{2014}) found in a documentation comment."
                .to_owned(),
            rationale: concat!(
                "Em dashes in technical docs are a strong AI-tell in this codebase. ",
                "Replace them with a comma, colon, period, or a clearer sentence split."
            )
            .to_owned(),
            references: vec![
                local_ref("Writing Style", DOC_SKILL, Some("Part 5 - Writing Style")),
                local_ref("Write-Like-Human Reference", WRITE_LIKE_HUMAN, None),
                local_ref(
                    "Em Dash Detection Signal",
                    AI_PATTERNS_DB,
                    Some("Very high detection signal"),
                ),
            ],
            languages: None,
        },
    ]
});

#[cfg(test)]
mod tests {
    use super::STYLE_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_lexical_style_rules() {
        assert_eq!(STYLE_RULES.len(), 2);
        assert_eq!(STYLE_RULES[0].category, RuleCategory::Style);
        assert_eq!(STYLE_RULES[1].severity, Severity::Warning);
    }
}
