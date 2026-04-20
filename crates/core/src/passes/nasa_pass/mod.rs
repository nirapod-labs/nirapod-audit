// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! NASA/JPL safety checks for deterministic embedded firmware.

mod control_flow;
mod helpers;
mod scope;
mod structure;
#[cfg(test)]
mod tests;

use crate::{Diagnostic, FileContext, FileRole, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 3: NASA/JPL safety checks.
#[derive(Debug, Default, Clone, Copy)]
pub struct NasaPass;

impl Pass for NasaPass {
    fn name(&self) -> &'static str {
        "nasa"
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
        control_flow::check_goto(ctx, &mut diagnostics);
        control_flow::check_setjmp_longjmp(ctx, &mut diagnostics);
        control_flow::check_recursion(ctx, &mut diagnostics);
        control_flow::check_loop_bounds(ctx, &mut diagnostics);
        control_flow::check_dynamic_alloc(ctx, &mut diagnostics);
        structure::check_function_length(ctx, &mut diagnostics);
        structure::check_assertions(ctx, &mut diagnostics);
        structure::check_macros(ctx, &mut diagnostics);
        scope::check_unchecked_returns(ctx, &mut diagnostics);
        scope::check_globals(ctx, &mut diagnostics);
        scope::check_mutable_where_const(ctx, &mut diagnostics);
        diagnostics
    }
}
