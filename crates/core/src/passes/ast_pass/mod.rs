// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! AST-phase Doxygen checks.
//!
//! The current migration slice covers file-header checks plus the first public
//! struct and function documentation rules. The implementation stays split by
//! responsibility so later Doxygen rules do not accumulate in one oversized
//! file.

mod declarations;
mod file_header;
mod grouping;
mod helpers;
#[cfg(test)]
mod tests;
mod types;

use crate::{Diagnostic, FileContext, FileRole, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 2: Doxygen structure checks built on the parsed file context.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{AstPass, Pass, SourceLanguage};
///
/// let pass = AstPass;
/// assert_eq!(pass.name(), "ast");
/// assert_eq!(pass.languages(), Some(&[SourceLanguage::C, SourceLanguage::Cpp][..]));
/// ```
#[derive(Debug, Default, Clone, Copy)]
pub struct AstPass;

impl Pass for AstPass {
    fn name(&self) -> &'static str {
        "ast"
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
        file_header::check_file_header(ctx, &mut diagnostics);
        file_header::check_module_doc(ctx, &mut diagnostics);
        if matches!(ctx.role, FileRole::PublicHeader) {
            grouping::check_ingroups(ctx, &mut diagnostics);
        }
        if matches!(ctx.role, FileRole::PublicHeader | FileRole::ModuleDoc) {
            types::check_classes(ctx, &mut diagnostics);
            declarations::check_structs(ctx, &mut diagnostics);
            types::check_enums(ctx, &mut diagnostics);
            declarations::check_function_declarations(ctx, &mut diagnostics);
        }
        diagnostics
    }
}
