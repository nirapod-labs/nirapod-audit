// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! tree-sitter parser helpers and embedded query files.
//!
//! Phase 1 only parses C and C++ sources because that is what the existing
//! fixtures cover. Rust and TypeScript detection are already modeled so later
//! phases can add those grammars without changing the public API again.

use serde::{Deserialize, Serialize};
use std::path::Path;
use streaming_iterator::StreamingIterator;
use tree_sitter::{Language, Parser, Query, QueryCursor, Tree};

/// Source language detected from a file extension.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::SourceLanguage;
///
/// assert_eq!(SourceLanguage::Cpp.family_label(), "c/c++");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SourceLanguage {
    /// C source and header files.
    #[serde(rename = "c")]
    C,
    /// C++ source and header files.
    #[serde(rename = "cpp")]
    Cpp,
    /// Rust source files.
    #[serde(rename = "rust")]
    Rust,
    /// TypeScript source files.
    #[serde(rename = "typescript")]
    TypeScript,
}

impl SourceLanguage {
    /// Returns a short human label for the language family.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::SourceLanguage;
    ///
    /// assert_eq!(SourceLanguage::Rust.family_label(), "rust");
    /// ```
    #[must_use]
    pub const fn family_label(self) -> &'static str {
        match self {
            Self::C | Self::Cpp => "c/c++",
            Self::Rust => "rust",
            Self::TypeScript => "typescript",
        }
    }
}

/// Embedded query names carried over from the TypeScript implementation.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::QueryText;
///
/// assert!(matches!(QueryText::Functions, QueryText::Functions));
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryText {
    /// Function definitions and declarations.
    Functions,
    /// Class declarations.
    Classes,
    /// Struct declarations.
    Structs,
    /// Enum declarations.
    Enums,
    /// Loop statements.
    Loops,
    /// Macro definitions.
    Macros,
    /// Function call expressions.
    Calls,
}

/// Errors returned by parser bootstrap helpers.
#[derive(Debug)]
pub enum ParserError {
    /// The selected language has no Phase 1 parser yet.
    UnsupportedLanguage(SourceLanguage),
    /// tree-sitter rejected the selected grammar.
    Language(tree_sitter::LanguageError),
    /// tree-sitter failed to compile an embedded query.
    Query(tree_sitter::QueryError),
    /// tree-sitter produced no syntax tree.
    ParseFailed(SourceLanguage),
}

impl std::fmt::Display for ParserError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnsupportedLanguage(language) => write!(
                f,
                "language {} is detected but not parse-enabled in Phase 1",
                language.family_label()
            ),
            Self::Language(error) => write!(f, "failed to configure tree-sitter language: {error}"),
            Self::Query(error) => write!(f, "failed to compile tree-sitter query: {error}"),
            Self::ParseFailed(language) => write!(
                f,
                "tree-sitter returned no parse tree for {}",
                language.family_label()
            ),
        }
    }
}

impl std::error::Error for ParserError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Language(error) => Some(error),
            Self::Query(error) => Some(error),
            Self::UnsupportedLanguage(_) | Self::ParseFailed(_) => None,
        }
    }
}

impl From<tree_sitter::LanguageError> for ParserError {
    fn from(error: tree_sitter::LanguageError) -> Self {
        Self::Language(error)
    }
}

impl From<tree_sitter::QueryError> for ParserError {
    fn from(error: tree_sitter::QueryError) -> Self {
        Self::Query(error)
    }
}

/// Detects the source language from a filesystem path.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{detect_language, SourceLanguage};
///
/// assert_eq!(detect_language("src/main.cpp"), Some(SourceLanguage::Cpp));
/// assert_eq!(detect_language("include/api.h"), Some(SourceLanguage::C));
/// ```
#[must_use]
pub fn detect_language(path: impl AsRef<Path>) -> Option<SourceLanguage> {
    let path = path.as_ref();
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase());

    match extension.as_deref() {
        Some("c") | Some("h") => Some(SourceLanguage::C),
        Some("cpp") | Some("cc") | Some("hpp") => Some(SourceLanguage::Cpp),
        Some("rs") => Some(SourceLanguage::Rust),
        Some("ts") | Some("tsx") => Some(SourceLanguage::TypeScript),
        _ => None,
    }
}

/// Returns the embedded text for a tree-sitter query.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{query_text, QueryText};
///
/// assert!(query_text(QueryText::Functions).contains("@fn.name"));
/// ```
#[must_use]
pub const fn query_text(query: QueryText) -> &'static str {
    match query {
        QueryText::Functions => include_str!("queries/functions.scm"),
        QueryText::Classes => include_str!("queries/classes.scm"),
        QueryText::Structs => include_str!("queries/structs.scm"),
        QueryText::Enums => include_str!("queries/enums.scm"),
        QueryText::Loops => include_str!("queries/loops.scm"),
        QueryText::Macros => include_str!("queries/macros.scm"),
        QueryText::Calls => include_str!("queries/calls.scm"),
    }
}

/// Builds a configured tree-sitter parser for the selected language.
///
/// # Errors
///
/// Returns [`ParserError::UnsupportedLanguage`] if the selected language does
/// not yet have a parser in Phase 1, or [`ParserError::Language`] if the
/// grammar could not be installed.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{build_parser, SourceLanguage};
///
/// let parser = build_parser(SourceLanguage::C)?;
/// # let _ = parser;
/// # Ok::<(), nirapod_audit_core::ParserError>(())
/// ```
pub fn build_parser(language: SourceLanguage) -> Result<Parser, ParserError> {
    let mut parser = Parser::new();

    match language {
        SourceLanguage::C => {
            let grammar: Language = tree_sitter_c::LANGUAGE.into();
            parser.set_language(&grammar)?;
        }
        SourceLanguage::Cpp => {
            let grammar: Language = tree_sitter_cpp::LANGUAGE.into();
            parser.set_language(&grammar)?;
        }
        SourceLanguage::Rust | SourceLanguage::TypeScript => {
            return Err(ParserError::UnsupportedLanguage(language));
        }
    }

    Ok(parser)
}

/// Parses source text with tree-sitter for a supported language.
///
/// # Errors
///
/// Returns any parser-setup error from [`build_parser`] or
/// [`ParserError::ParseFailed`] if tree-sitter returned no syntax tree.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{parse_source, SourceLanguage};
///
/// let tree = parse_source(SourceLanguage::C, "int main(void) { return 0; }")?;
/// assert_eq!(tree.root_node().kind(), "translation_unit");
/// # Ok::<(), nirapod_audit_core::ParserError>(())
/// ```
pub fn parse_source(language: SourceLanguage, source: &str) -> Result<Tree, ParserError> {
    let mut parser = build_parser(language)?;
    parser
        .parse(source, None)
        .ok_or(ParserError::ParseFailed(language))
}

/// Counts function items matched by the carried-over function query.
///
/// The function query intentionally counts both definitions and declarations,
/// because later phases use both.
///
/// # Errors
///
/// Returns any parse error from [`parse_source`] or query-compilation error
/// from [`ParserError::Query`].
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{count_function_items, SourceLanguage};
///
/// let count = count_function_items(SourceLanguage::C, "int main(void);")?;
/// assert_eq!(count, 1);
/// # Ok::<(), nirapod_audit_core::ParserError>(())
/// ```
pub fn count_function_items(language: SourceLanguage, source: &str) -> Result<usize, ParserError> {
    let tree = parse_source(language, source)?;

    let query_language: Language = match language {
        SourceLanguage::C => tree_sitter_c::LANGUAGE.into(),
        SourceLanguage::Cpp => tree_sitter_cpp::LANGUAGE.into(),
        SourceLanguage::Rust | SourceLanguage::TypeScript => {
            return Err(ParserError::UnsupportedLanguage(language));
        }
    };

    let query = Query::new(&query_language, function_query_source(language))?;
    let mut cursor = QueryCursor::new();
    let count = cursor
        .matches(&query, tree.root_node(), source.as_bytes())
        .count();

    Ok(count)
}

fn function_query_source(language: SourceLanguage) -> &'static str {
    match language {
        SourceLanguage::C => {
            r#"
(function_definition
  declarator: (function_declarator
    declarator: (identifier) @fn.name)
  body: (compound_statement) @fn.body) @fn.decl

(declaration
  declarator: (function_declarator
    declarator: (identifier) @fn_decl.name
    parameters: (parameter_list) @fn_decl.params)) @fn_decl.decl
"#
        }
        SourceLanguage::Cpp => query_text(QueryText::Functions),
        SourceLanguage::Rust | SourceLanguage::TypeScript => "",
    }
}

#[cfg(test)]
mod tests {
    use super::{count_function_items, detect_language, parse_source, QueryText, SourceLanguage};
    use crate::query_text;
    use std::{fs, path::PathBuf};

    #[test]
    fn detects_languages_from_extensions() {
        assert_eq!(detect_language("src/main.cpp"), Some(SourceLanguage::Cpp));
        assert_eq!(detect_language("src/lib.rs"), Some(SourceLanguage::Rust));
        assert_eq!(detect_language("README.md"), None);
    }

    #[test]
    fn parses_c_header_fixture() {
        let source = fs::read_to_string(fixture_path()).expect("failed to read compliant fixture");
        let tree = parse_source(SourceLanguage::C, &source).expect("failed to parse fixture");
        assert_eq!(tree.root_node().kind(), "translation_unit");
        assert!(!tree.root_node().has_error());
    }

    #[test]
    fn counts_function_query_matches_in_fixture() {
        let source = fs::read_to_string(fixture_path()).expect("failed to read compliant fixture");
        let count = count_function_items(SourceLanguage::C, &source)
            .expect("failed to count function query matches");
        assert_eq!(count, 1);
    }

    #[test]
    fn carries_over_function_query_text() {
        assert!(query_text(QueryText::Functions).contains("@fn_decl.name"));
    }

    fn fixture_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/compliant/good-header.h")
    }
}
