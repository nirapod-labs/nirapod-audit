// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Pass trait shared by every analysis pass.

use crate::{Diagnostic, FileContext, SourceLanguage};

/// A single analysis pass over one parsed source file.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{Diagnostic, FileContext, Pass, SourceLanguage};
///
/// struct NoOpPass;
///
/// impl Pass for NoOpPass {
///     fn name(&self) -> &'static str {
///         "no-op"
///     }
///
///     fn run(&self, _ctx: &FileContext) -> Vec<Diagnostic> {
///         Vec::new()
///     }
/// }
///
/// assert_eq!(NoOpPass.name(), "no-op");
/// assert!(NoOpPass.languages().is_none());
/// ```
pub trait Pass: Send + Sync {
    /// Stable name used in logs and test output.
    fn name(&self) -> &'static str;

    /// Language filter for the pass. `None` means all languages.
    fn languages(&self) -> Option<&'static [SourceLanguage]> {
        None
    }

    /// Runs the pass against one file context and returns any diagnostics found.
    fn run(&self, ctx: &FileContext) -> Vec<Diagnostic>;
}
