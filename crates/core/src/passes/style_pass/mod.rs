// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Higher-level documentation style checks.

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

    fn run(&self, _ctx: &FileContext) -> Vec<Diagnostic> {
        Vec::new()
    }
}
