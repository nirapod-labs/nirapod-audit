// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Memory-safety checks.

mod checks;
mod helpers;
#[cfg(test)]
mod tests;

use crate::{Diagnostic, FileContext, FileRole, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 5: memory-safety checks.
#[derive(Debug, Default, Clone, Copy)]
pub struct MemoryPass;

impl Pass for MemoryPass {
    fn name(&self) -> &'static str {
        "memory"
    }

    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        Some(C_CPP_LANGUAGES)
    }

    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic> {
        if matches!(
            ctx.role,
            FileRole::ThirdParty | FileRole::Asm | FileRole::Cmake | FileRole::Config
        ) {
            return Vec::new();
        }

        let mut diagnostics = Vec::new();
        checks::check_array_bounds(ctx, &mut diagnostics);
        checks::check_pointer_null_guard(ctx, &mut diagnostics);
        checks::check_size_overflow(ctx, &mut diagnostics);
        checks::check_size_narrowing(ctx, &mut diagnostics);
        diagnostics
    }
}
