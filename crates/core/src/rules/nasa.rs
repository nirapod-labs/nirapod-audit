// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the `NASA` safety category.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, EMBEDDED_SKILL, NASA_SAFETY};

const LANG_C_CPP: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// All NASA/JPL safety rules in stable registry order.
pub static NASA_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-NASA-001".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "no-goto".to_owned(),
            description: "goto statement found.".to_owned(),
            rationale: concat!(
                "goto disrupts structured control flow and makes static analysis ",
                "unverifiable. Every control-flow path must be expressed through ",
                "loops, conditionals, and function calls."
            )
            .to_owned(),
            references: vec![
                local_ref("NASA JPL Rule 1", NASA_SAFETY, Some("Rule 1 - Simple Control Flow")),
                local_ref(
                    "Embedded Skill",
                    EMBEDDED_SKILL,
                    Some("Part 4 - NASA Safety Rules"),
                ),
            ],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-002".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "no-setjmp-longjmp".to_owned(),
            description: "setjmp() or longjmp() call found.".to_owned(),
            rationale: concat!(
                "setjmp and longjmp are non-local jumps that bypass structured ",
                "control flow and make stack behavior difficult to reason about."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 1",
                NASA_SAFETY,
                Some("Rule 1 - Simple Control Flow"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-003".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "no-direct-recursion".to_owned(),
            description: "Function calls itself directly (same translation unit).".to_owned(),
            rationale: concat!(
                "Recursion makes stack depth unbounded. Embedded firmware needs a ",
                "provable upper bound on stack use, so recursive algorithms must be ",
                "rewritten as bounded iteration."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 1",
                NASA_SAFETY,
                Some("Rule 1 - Simple Control Flow"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-004".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "loop-unbound".to_owned(),
            description: "for/while/do loop with no documented upper bound comment.".to_owned(),
            rationale: concat!(
                "Every loop needs a provable upper bound. Without one, worst-case ",
                "execution time cannot be verified and runaway loops become harder ",
                "to detect during review."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 2",
                NASA_SAFETY,
                Some("Rule 2 - Fixed Upper Bound for Loops"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-005".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "dynamic-alloc-post-init".to_owned(),
            description: "malloc/calloc/realloc/free/new/delete called.".to_owned(),
            rationale: concat!(
                "Dynamic allocation after initialization introduces fragmentation, ",
                "timing jitter, and out-of-memory failure paths. Safety-critical ",
                "firmware should rely on static or init-time allocation instead."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 3",
                NASA_SAFETY,
                Some("Rule 3 - No Dynamic Allocation After Init"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-006".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "function-too-long".to_owned(),
            description: "Function body exceeds 60 non-blank, non-comment lines.".to_owned(),
            rationale: concat!(
                "Long functions are harder to test, review, and verify. The 60-line ",
                "limit forces decomposition into smaller, more inspectable units."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 4",
                NASA_SAFETY,
                Some("Rule 4 - Functions Fit on One Screen"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-007".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Warning,
            title: "insufficient-assertions".to_owned(),
            description: "Non-trivial function (>5 lines) has fewer than 2 NIRAPOD_ASSERT calls."
                .to_owned(),
            rationale: concat!(
                "Assertions help catch violated assumptions early. Non-trivial ",
                "functions should document and enforce important preconditions and ",
                "invariants with lightweight runtime checks."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 5",
                NASA_SAFETY,
                Some("Rule 5 - Minimum Two Assertions per Function"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-008".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "unchecked-return-value".to_owned(),
            description: "Non-void call result discarded without explicit (void) cast."
                .to_owned(),
            rationale: concat!(
                "Ignoring a return value silently discards error information. If the ",
                "result is intentionally ignored, an explicit cast documents that choice."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 7",
                NASA_SAFETY,
                Some("Rule 7 - Check All Return Values"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-009".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "macro-for-constant".to_owned(),
            description: "#define used for a constant value (use constexpr instead)."
                .to_owned(),
            rationale: concat!(
                "Macro constants have no type, no scope, and poor debugger support. ",
                "Typed constants or constexpr values keep the same code generation ",
                "without losing compile-time safety."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 8",
                NASA_SAFETY,
                Some("Rule 8 - Restrict Preprocessor Use"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-010".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Error,
            title: "macro-for-function".to_owned(),
            description: "#define used for function-like macro (use inline function)."
                .to_owned(),
            rationale: concat!(
                "Function-like macros bypass type checking, are harder to debug, and ",
                "can evaluate arguments unexpectedly. Inline functions keep intent ",
                "clear while preserving performance."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 8",
                NASA_SAFETY,
                Some("Rule 8 - Restrict Preprocessor Use"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-011".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Warning,
            title: "unnecessary-global".to_owned(),
            description:
                "Global variable declared where module-private static or parameter would suffice."
                    .to_owned(),
            rationale: concat!(
                "Global variables create hidden data dependencies. Tighter scope ",
                "reduces coupling and makes data ownership easier to review."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 6",
                NASA_SAFETY,
                Some("Rule 6 - Restrict Scope of Data"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-NASA-012".to_owned(),
            category: RuleCategory::Nasa,
            severity: Severity::Info,
            title: "mutable-where-const".to_owned(),
            description: "Variable is never modified after initialization but not declared const."
                .to_owned(),
            rationale: concat!(
                "Values that never change should be const. That documents intent and ",
                "reduces accidental mutation in later edits."
            )
            .to_owned(),
            references: vec![local_ref(
                "NASA JPL Rule 6",
                NASA_SAFETY,
                Some("Rule 6 - Restrict Scope of Data"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
    ]
});

#[cfg(test)]
mod tests {
    use super::NASA_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_nasa_rules() {
        assert_eq!(NASA_RULES.len(), 12);
        assert_eq!(NASA_RULES[0].category, RuleCategory::Nasa);
        assert_eq!(NASA_RULES[6].severity, Severity::Warning);
        assert_eq!(NASA_RULES[11].severity, Severity::Info);
    }
}
