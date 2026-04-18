// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Central rule registry for the Rust migration.
//!
//! The registry starts small on purpose. Phase 2 only needs enough real rule
//! data to exercise `rules` and `explain` plumbing cleanly. Additional rule
//! families will be added in later commits instead of dumping the whole catalog
//! into one change.

pub mod doxygen;
pub mod license;
pub mod refs;
pub mod style;

use crate::Rule;
use std::sync::LazyLock;

pub use doxygen::DOXYGEN_RULES;
pub use license::LICENSE_RULES;
pub use style::STYLE_RULES;

/// Every rule currently defined in the Rust migration.
pub static ALL_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    LICENSE_RULES
        .iter()
        .chain(DOXYGEN_RULES.iter())
        .chain(STYLE_RULES.iter())
        .cloned()
        .collect()
});

/// Looks up a rule by its stable ID string.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::find_rule;
///
/// let rule = find_rule("NRP-LIC-001").expect("missing rule");
/// assert_eq!(rule.title, "missing-spdx-identifier");
/// ```
#[must_use]
pub fn find_rule(id: &str) -> Option<&'static Rule> {
    ALL_RULES.iter().find(|rule| rule.id == id)
}

#[cfg(test)]
mod tests {
    use super::{find_rule, ALL_RULES};

    #[test]
    fn collects_all_rules() {
        assert_eq!(ALL_RULES.len(), 17);
    }

    #[test]
    fn finds_rule_by_id() {
        let rule = find_rule("NRP-LIC-003").expect("expected license rule");
        assert_eq!(rule.title, "header-not-first");
    }

    #[test]
    fn finds_doxygen_rule_by_id() {
        let rule = find_rule("NRP-DOX-002").expect("expected doxygen rule");
        assert_eq!(rule.title, "missing-file-brief");
    }

    #[test]
    fn finds_style_rule_by_id() {
        let rule = find_rule("NRP-STYLE-001").expect("expected style rule");
        assert_eq!(rule.title, "banned-word");
    }
}
