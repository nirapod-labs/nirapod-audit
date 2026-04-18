// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the current `DOXYGEN` migration slice.
//!
//! The registry is split by responsibility so file-header rules, declaration
//! rules, and later group rules can grow without turning into one oversized
//! module.

mod declarations;
mod file_header;
mod functions;
mod grouping;

use crate::Rule;
use std::sync::LazyLock;

pub use declarations::DECLARATION_RULES;
pub use file_header::FILE_HEADER_RULES;
pub use functions::FUNCTION_RULES;
pub use grouping::GROUPING_RULES;

/// All Doxygen rules currently defined in the Rust registry.
pub static DOXYGEN_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    FILE_HEADER_RULES
        .iter()
        .chain(DECLARATION_RULES.iter())
        .chain(FUNCTION_RULES.iter())
        .chain(GROUPING_RULES.iter())
        .cloned()
        .collect()
});

#[cfg(test)]
mod tests {
    use super::DOXYGEN_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_current_doxygen_rules() {
        assert_eq!(DOXYGEN_RULES.len(), 22);
        assert_eq!(DOXYGEN_RULES[0].category, RuleCategory::Doxygen);
        assert_eq!(DOXYGEN_RULES[2].severity, Severity::Warning);
        let module_doc_rule = DOXYGEN_RULES
            .iter()
            .find(|rule| rule.id == "NRP-DOX-021")
            .expect("missing module-doc rule");
        assert_eq!(module_doc_rule.severity, Severity::Warning);
        let see_rule = DOXYGEN_RULES
            .iter()
            .find(|rule| rule.id == "NRP-DOX-018")
            .expect("missing function see rule");
        assert_eq!(see_rule.severity, Severity::Info);
        let ingroup_rule = DOXYGEN_RULES
            .iter()
            .find(|rule| rule.id == "NRP-DOX-020")
            .expect("missing ingroup rule");
        assert_eq!(ingroup_rule.severity, Severity::Error);
        let retval_rule = DOXYGEN_RULES
            .iter()
            .find(|rule| rule.id == "NRP-DOX-016")
            .expect("missing retval rule");
        assert_eq!(retval_rule.severity, Severity::Warning);
    }
}
