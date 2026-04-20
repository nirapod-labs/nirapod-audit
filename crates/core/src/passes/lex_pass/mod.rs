// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Lexical-level checks on raw source text.
//!
//! The lexical pass stays split by concern so SPDX checks and writing-style
//! checks can grow independently without turning into one large file.

mod helpers;
mod license;
mod style;
#[cfg(test)]
mod tests;

use crate::{Diagnostic, FileContext, FileRole, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 1: lexical checks on raw text and source lines.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{LexPass, Pass, SourceLanguage};
///
/// let pass = LexPass;
/// assert_eq!(pass.name(), "lex");
/// assert_eq!(pass.languages(), Some(&[SourceLanguage::C, SourceLanguage::Cpp][..]));
/// ```
#[derive(Debug, Default, Clone, Copy)]
pub struct LexPass;

impl Pass for LexPass {
    fn name(&self) -> &'static str {
        "lex"
    }

    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        Some(C_CPP_LANGUAGES)
    }

    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic> {
        if matches!(ctx.role, FileRole::ThirdParty | FileRole::Asm) {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();
        license::check_spdx(ctx, &mut diagnostics);
        license::check_header_ordering(ctx, &mut diagnostics);
        style::check_banned_words(ctx, &mut diagnostics);
        style::check_em_dash(ctx, &mut diagnostics);
        diagnostics
    }
}
