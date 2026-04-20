// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Platform-specific cryptographic safety checks.

mod api;
mod helpers;
mod misuse;
mod platform;
#[cfg(test)]
mod tests;

use crate::{Diagnostic, FileContext, FileRole, Pass, SourceLanguage};

const C_CPP_LANGUAGES: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// Pass 4: cryptographic safety checks.
#[derive(Debug, Default, Clone, Copy)]
pub struct CryptoPass;

impl Pass for CryptoPass {
    fn name(&self) -> &'static str {
        "crypto"
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
        misuse::check_memset_zeroization(ctx, &mut diagnostics);
        misuse::check_key_in_log(ctx, &mut diagnostics);
        platform::check_flash_buf_to_nrf_crypto(ctx, &mut diagnostics);
        if platform::active_for_hardware_mutex(ctx) {
            misuse::check_mutex_before_crypto(ctx, &mut diagnostics);
        }
        platform::check_cc312_direct_register(ctx, &mut diagnostics);
        misuse::check_iv_reuse(ctx, &mut diagnostics);
        platform::check_interrupt_crypto(ctx, &mut diagnostics);
        api::check_raw_key_in_api(ctx, &mut diagnostics);
        diagnostics
    }
}
