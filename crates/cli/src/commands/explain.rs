// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Explain command handler.
//!
//! This command prints the full detail for one migrated rule, including the
//! current configuration override path and reference links.

use anyhow::{bail, Result};
use nirapod_audit_core::{find_rule, Rule, RuleReference, RuleOverrideSeverity, SourceLanguage};
use std::fmt::Write;

/// Prints detailed information for a stable rule identifier.
///
/// # Errors
///
/// Returns an error if the requested rule ID does not exist.
pub fn run(id: &str) -> Result<()> {
    let Some(rule) = find_rule(id) else {
        bail!("unknown rule ID: {id}");
    };

    print!("{}", render_rule_detail(rule));
    Ok(())
}

fn render_rule_detail(rule: &Rule) -> String {
    let mut output = String::new();

    writeln!(&mut output, "{}", rule.id).expect("write to string");
    writeln!(&mut output, "category: {}", rule.category.as_str()).expect("write to string");
    writeln!(&mut output, "severity: {}", rule.severity.as_str()).expect("write to string");
    writeln!(&mut output, "languages: {}", format_languages(rule)).expect("write to string");
    writeln!(
        &mut output,
        "config: rules.overrides.{}.severity = \"{}|{}|{}|{}\"",
        rule.id,
        RuleOverrideSeverity::Error.as_str(),
        RuleOverrideSeverity::Warning.as_str(),
        RuleOverrideSeverity::Info.as_str(),
        RuleOverrideSeverity::Ignore.as_str()
    )
    .expect("write to string");
    writeln!(&mut output).expect("write to string");

    writeln!(&mut output, "title:").expect("write to string");
    writeln!(&mut output, "{}", rule.title).expect("write to string");
    writeln!(&mut output).expect("write to string");

    writeln!(&mut output, "description:").expect("write to string");
    writeln!(&mut output, "{}", rule.description).expect("write to string");
    writeln!(&mut output).expect("write to string");

    writeln!(&mut output, "rationale:").expect("write to string");
    writeln!(&mut output, "{}", rule.rationale).expect("write to string");
    writeln!(&mut output).expect("write to string");

    writeln!(&mut output, "references:").expect("write to string");
    for reference in &rule.references {
        writeln!(&mut output, "- {}", format_reference(reference)).expect("write to string");
    }

    output
}

fn format_languages(rule: &Rule) -> String {
    match &rule.languages {
        None => String::from("all"),
        Some(languages) => languages
            .iter()
            .map(|language| match language {
                SourceLanguage::C => "c",
                SourceLanguage::Cpp => "cpp",
                SourceLanguage::Rust => "rust",
                SourceLanguage::TypeScript => "typescript",
            })
            .collect::<Vec<_>>()
            .join(", "),
    }
}

fn format_reference(reference: &RuleReference) -> String {
    let mut parts = vec![reference.label.clone()];

    if let Some(file) = &reference.file {
        parts.push(format!("file: {file}"));
    }
    if let Some(section) = &reference.section {
        parts.push(format!("section: {section}"));
    }
    if let Some(url) = &reference.url {
        parts.push(format!("url: {url}"));
    }

    parts.join(" | ")
}

#[cfg(test)]
mod tests {
    use super::render_rule_detail;
    use nirapod_audit_core::find_rule;

    #[test]
    fn renders_rule_details() {
        let rule = find_rule("NRP-LIC-001").expect("expected license rule");
        let rendered = render_rule_detail(rule);

        assert!(rendered.contains("category: LICENSE"));
        assert!(rendered.contains("config: rules.overrides.NRP-LIC-001.severity"));
        assert!(rendered.contains("SPDX License List"));
    }

    #[test]
    fn renders_language_scope_for_doxygen_rule() {
        let rule = find_rule("NRP-DOX-012").expect("expected doxygen rule");
        let rendered = render_rule_detail(rule);

        assert!(rendered.contains("languages: c, cpp"));
    }
}
