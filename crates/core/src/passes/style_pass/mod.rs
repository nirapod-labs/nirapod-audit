// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Higher-level documentation style checks.

mod checks;
mod helpers;
#[cfg(test)]
mod tests;

use crate::{Diagnostic, FileContext, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 6: documentation style checks.
#[derive(Debug, Default, Clone, Copy)]
pub struct StylePass;

impl Pass for StylePass {
    fn name(&self) -> &'static str {
        "style"
    }

    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        Some(C_CPP_LANGUAGES)
    }

    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic> {
        let mut diagnostics = Vec::new();
        checks::check_generic_briefs(ctx, &mut diagnostics);
        checks::check_crypto_hardware_words(ctx, &mut diagnostics);
        diagnostics
    }
}
