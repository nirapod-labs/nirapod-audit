// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Memory-safety checks.

use crate::{Diagnostic, FileContext, Pass, SourceLanguage};

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

    fn run(&self, _ctx: &FileContext) -> Vec<Diagnostic> {
        Vec::new()
    }
}
