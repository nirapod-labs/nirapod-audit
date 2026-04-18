// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Helpers for constructing diagnostics from parser ranges and source lines.
//!
//! Every pass should use these helpers rather than hand-rolling spans and
//! diagnostic structs inline. That keeps the shape of findings stable across
//! the whole engine.

use crate::{Diagnostic, RelatedSpan, Rule, Span};
use tree_sitter::Node;

/// Input bag for [`build_diagnostic`].
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{DiagnosticInit, Span};
///
/// let init = DiagnosticInit {
///     span: Span::new("src/lib.rs", 1, 1, 1, 3, "use"),
///     message: String::from("Example message."),
///     notes: vec![String::from("example note")],
///     help: None,
///     related_spans: Vec::new(),
/// };
/// assert_eq!(init.notes.len(), 1);
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DiagnosticInit {
    /// Primary source location for the diagnostic.
    pub span: Span,
    /// Specific, contextual message describing the finding.
    pub message: String,
    /// Additional note lines rendered below the primary message.
    pub notes: Vec<String>,
    /// Actionable fix suggestion, if one exists.
    pub help: Option<String>,
    /// Secondary source locations that provide context.
    pub related_spans: Vec<RelatedSpan>,
}

/// Constructs a fully-populated [`Diagnostic`] from a rule and init bag.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{
///     build_diagnostic, DiagnosticInit, Rule, RuleCategory, Severity, Span,
/// };
///
/// let diagnostic = build_diagnostic(
///     &Rule {
///         id: String::from("NRP-NASA-006"),
///         category: RuleCategory::Nasa,
///         severity: Severity::Error,
///         title: String::from("function-too-long"),
///         description: String::from("Function body exceeds the configured limit."),
///         rationale: String::from("Long functions are harder to review."),
///         references: Vec::new(),
///         languages: None,
///     },
///     DiagnosticInit {
///         span: Span::new("a.c", 1, 1, 1, 4, "int"),
///         message: String::from("Function is too long."),
///         notes: vec![String::from("limit is 60 lines")],
///         help: Some(String::from("split the function")),
///         related_spans: Vec::new(),
///     },
/// );
/// assert_eq!(diagnostic.rule.id, "NRP-NASA-006");
/// ```
#[must_use]
pub fn build_diagnostic(rule: &Rule, init: DiagnosticInit) -> Diagnostic {
    Diagnostic {
        rule: rule.clone(),
        span: init.span,
        message: init.message,
        notes: init.notes,
        help: init.help,
        related_spans: init.related_spans,
    }
}

/// Converts a tree-sitter node into a [`Span`].
///
/// Snippets are capped at 3 lines so large signatures do not flood terminal
/// output later.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{build_parser, node_to_span, SourceLanguage};
///
/// let mut parser = build_parser(SourceLanguage::C)?;
/// let source = "int main(void) { return 0; }\n";
/// let tree = parser.parse(source, None).expect("failed to parse source");
/// let span = node_to_span(tree.root_node(), "main.c", &[source.to_owned()]);
/// assert_eq!(span.start_line, 1);
/// # Ok::<(), nirapod_audit_core::ParserError>(())
/// ```
#[must_use]
pub fn node_to_span(node: Node<'_>, file_path: impl Into<String>, lines: &[String]) -> Span {
    let snippet_lines = lines
        .iter()
        .skip(node.start_position().row)
        .take(
            node.end_position()
                .row
                .saturating_sub(node.start_position().row)
                + 1,
        )
        .take(3)
        .cloned()
        .collect::<Vec<_>>();

    Span {
        file: file_path.into(),
        start_line: node.start_position().row + 1,
        start_col: node.start_position().column + 1,
        end_line: node.end_position().row + 1,
        end_col: node.end_position().column + 1,
        snippet: snippet_lines.join("\n"),
    }
}

/// Builds a span that covers a single source line.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::line_span;
///
/// let lines = vec![String::from("int main(void);")];
/// let span = line_span("main.h", 1, &lines);
/// assert_eq!(span.end_col, 16);
/// ```
#[must_use]
pub fn line_span(file_path: impl Into<String>, line_number: usize, lines: &[String]) -> Span {
    let text = lines
        .get(line_number.saturating_sub(1))
        .cloned()
        .unwrap_or_default();

    Span {
        file: file_path.into(),
        start_line: line_number,
        start_col: 1,
        end_line: line_number,
        end_col: text.len() + 1,
        snippet: text,
    }
}

#[cfg(test)]
mod tests {
    use super::{line_span, node_to_span};
    use crate::{build_parser, parse_source, SourceLanguage};

    #[test]
    fn builds_line_span_from_raw_lines() {
        let lines = vec![String::from("int main(void);")];
        let span = line_span("main.h", 1, &lines);
        assert_eq!(span.start_col, 1);
        assert_eq!(span.end_col, 16);
    }

    #[test]
    fn converts_parser_root_node_to_span() {
        let source = "int main(void) {\n  return 0;\n}\n";
        let tree = parse_source(SourceLanguage::C, source).expect("failed to parse source");
        let lines = source.lines().map(str::to_owned).collect::<Vec<_>>();
        let span = node_to_span(tree.root_node(), "main.c", &lines);

        assert_eq!(span.start_line, 1);
        assert_eq!(span.end_line, 4);
        assert!(span.snippet.contains("return 0;"));
    }

    #[test]
    fn parser_can_still_be_constructed_for_span_tests() {
        let parser = build_parser(SourceLanguage::Cpp).expect("failed to build parser");
        let _ = parser;
    }
}
