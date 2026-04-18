// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Rules command handler.
//!
//! This command prints the migrated Rust rule catalog in stable registry order.
//! The remaining rule families will appear here as later migration phases port
//! them into the core registry.

use anyhow::Result;
use nirapod_audit_core::ALL_RULES;
use std::fmt::Write;

/// Prints the currently migrated rules.
///
/// # Errors
///
/// Returns an error if writing command output fails.
pub fn run() -> Result<()> {
    print!("{}", render_rule_list());
    Ok(())
}

fn render_rule_list() -> String {
    let mut output = String::new();
    writeln!(&mut output, "{} migrated rules", ALL_RULES.len()).expect("write to string");
    writeln!(&mut output).expect("write to string");

    for rule in ALL_RULES.iter() {
        writeln!(
            &mut output,
            "{:<12} {:<8} {:<7} {}",
            rule.id,
            rule.category.as_str(),
            rule.severity.as_str(),
            rule.title
        )
        .expect("write to string");
        writeln!(&mut output, "  {}", rule.description).expect("write to string");
    }

    output
}

#[cfg(test)]
mod tests {
    use super::render_rule_list;

    #[test]
    fn renders_rule_catalog() {
        let rendered = render_rule_list();
        assert!(rendered.contains("28 migrated rules"));
        assert!(rendered.contains("NRP-LIC-001"));
        assert!(rendered.contains("missing-spdx-identifier"));
        assert!(rendered.contains("NRP-DOX-022"));
    }
}
