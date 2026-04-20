// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Rustc-style diagnostic rendering helpers.

use nirapod_audit_core::Diagnostic;
use std::fmt::Write;

/// Renders one diagnostic in a terminal-friendly multi-line format.
///
/// # Examples
///
/// ```
/// use nirapod_audit::print::diagnostic::render_diagnostic;
/// use nirapod_audit_core::{Diagnostic, Rule, RuleCategory, Severity, Span};
///
/// let diagnostic = Diagnostic {
///     rule: Rule {
///         id: String::from("NRP-LIC-001"),
///         category: RuleCategory::License,
///         severity: Severity::Error,
///         title: String::from("missing-spdx-identifier"),
///         description: String::from("SPDX line missing."),
///         rationale: String::from("License clarity matters."),
///         references: Vec::new(),
///         languages: None,
///     },
///     span: Span::new("a.h", 1, 1, 1, 3, "int"),
///     message: String::from("missing SPDX header"),
///     notes: vec![String::from("add SPDX lines inside the file header")],
///     help: Some(String::from("use the standard header template")),
///     related_spans: Vec::new(),
/// };
///
/// let rendered = render_diagnostic(&diagnostic);
/// assert!(rendered.contains("error[NRP-LIC-001]"));
/// ```
#[must_use]
pub fn render_diagnostic(diagnostic: &Diagnostic) -> String {
    let mut output = String::new();
    let span = &diagnostic.span;
    let line_no_width = span.end_line.max(span.start_line).to_string().len();

    writeln!(
        &mut output,
        "{}[{}]: {}",
        diagnostic.rule.severity.as_str(),
        diagnostic.rule.id,
        diagnostic.message
    )
    .expect("write to string");
    writeln!(
        &mut output,
        "  --> {}:{}:{}",
        span.file, span.start_line, span.start_col
    )
    .expect("write to string");
    writeln!(&mut output, "{:>width$} |", "", width = line_no_width).expect("write to string");
    writeln!(
        &mut output,
        "{:>width$} | {}",
        span.start_line,
        span.snippet,
        width = line_no_width
    )
    .expect("write to string");
    writeln!(
        &mut output,
        "{:>width$} | {} {}",
        "",
        caret_marker(span.start_col, span.end_col, span.start_line == span.end_line),
        diagnostic.rule.title,
        width = line_no_width
    )
    .expect("write to string");

    for note in &diagnostic.notes {
        writeln!(&mut output, "  = note: {note}").expect("write to string");
    }
    if let Some(help) = &diagnostic.help {
        writeln!(&mut output, "  = help: {help}").expect("write to string");
    }

    output
}

fn caret_marker(start_col: usize, end_col: usize, same_line: bool) -> String {
    let padding = " ".repeat(start_col.saturating_sub(1));
    let width = if same_line {
        end_col.saturating_sub(start_col).max(1)
    } else {
        1
    };

    format!("{padding}{}", "^".repeat(width))
}

#[cfg(test)]
mod tests {
    use super::render_diagnostic;
    use nirapod_audit_core::{Diagnostic, Rule, RuleCategory, Severity, Span};

    #[test]
    fn renders_rustc_style_block() {
        let diagnostic = Diagnostic {
            rule: Rule {
                id: String::from("NRP-LIC-001"),
                category: RuleCategory::License,
                severity: Severity::Error,
                title: String::from("missing-spdx-identifier"),
                description: String::from("SPDX line missing."),
                rationale: String::from("License clarity matters."),
                references: Vec::new(),
                languages: None,
            },
            span: Span::new("a.h", 1, 1, 1, 4, "int"),
            message: String::from("missing SPDX header"),
            notes: vec![String::from("add SPDX lines inside the file header")],
            help: Some(String::from("use the standard header template")),
            related_spans: Vec::new(),
        };

        let rendered = render_diagnostic(&diagnostic);
        assert!(rendered.contains("error[NRP-LIC-001]: missing SPDX header"));
        assert!(rendered.contains("--> a.h:1:1"));
        assert!(rendered.contains("= help: use the standard header template"));
    }
}
