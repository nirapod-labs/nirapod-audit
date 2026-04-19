// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Static rule descriptors for the `CRYPTO` category.

use crate::{Rule, RuleCategory, Severity, SourceLanguage};
use std::sync::LazyLock;

use super::refs::{local_ref, EMBEDDED_SKILL, PLATFORM_CRYPTO};

const LANG_C_CPP: &[SourceLanguage] = &[SourceLanguage::C, SourceLanguage::Cpp];

/// All crypto rules in stable registry order.
pub static CRYPTO_RULES: LazyLock<Vec<Rule>> = LazyLock::new(|| {
    vec![
        Rule {
            id: "NRP-CRYPTO-001".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "memset-zeroization".to_owned(),
            description:
                "memset() used to clear a crypto buffer (may be optimized away).".to_owned(),
            rationale: concat!(
                "Compilers may optimize away memset-based zeroization when the buffer is not ",
                "read again. Key material must be cleared with routines that are guaranteed ",
                "to remain in the final binary."
            )
            .to_owned(),
            references: vec![
                local_ref(
                    "Memory Safety Checklist",
                    EMBEDDED_SKILL,
                    Some("Part 6 - Memory Safety Checklist"),
                ),
                local_ref("Platform Crypto Reference", PLATFORM_CRYPTO, Some("Zeroization")),
            ],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-002".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "key-in-log".to_owned(),
            description:
                "Key handle, key buffer, or entropy variable passed to a log/print function."
                    .to_owned(),
            rationale: concat!(
                "Logs often outlive the running process and can end up in flash, crash reports, ",
                "or UART traces. Secrets and secret-derived material should never be logged."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("Key Material Handling"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-003".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "crypto-buf-not-zeroed".to_owned(),
            description:
                "Local crypto buffer exits function on some path without being zeroed.".to_owned(),
            rationale: concat!(
                "Crypto buffers left on the stack can survive into later frames. Every return path ",
                "must clear sensitive buffers before handing control back."
            )
            .to_owned(),
            references: vec![
                local_ref(
                    "Memory Safety Checklist",
                    EMBEDDED_SKILL,
                    Some("Part 6 - Memory Safety Checklist"),
                ),
                local_ref("Platform Crypto Reference", PLATFORM_CRYPTO, Some("Zeroization")),
            ],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-004".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "flash-buf-to-nrf-crypto".to_owned(),
            description: "const (flash-resident) buffer passed directly to nrf_crypto_* API."
                .to_owned(),
            rationale: concat!(
                "CryptoCell DMA must read from RAM, not flash-backed buffers. Passing const data ",
                "straight into nrf_crypto APIs can fault or corrupt crypto operations."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("CC310/CC312 DMA Constraints"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-005".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Warning,
            title: "esp32-no-mutex".to_owned(),
            description:
                "Hardware crypto function called without visible mutex acquire in function scope."
                    .to_owned(),
            rationale: concat!(
                "Hardware crypto engines are usually not reentrant. A visible mutex or lock ",
                "around peripheral access makes that serialization reviewable."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("Thread Safety"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-006".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "cc312-direct-register".to_owned(),
            description: "Direct CC312 register write in non-secure context.".to_owned(),
            rationale: concat!(
                "On TrustZone-enabled nRF5340 systems, direct non-secure register access to CC312 ",
                "is not allowed. Use the secure wrapper APIs instead."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("nRF5340 TrustZone"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-007".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "iv-reuse".to_owned(),
            description:
                "Same IV/nonce variable used in two consecutive encrypt calls in the same scope."
                    .to_owned(),
            rationale: concat!(
                "IV reuse breaks the security assumptions of modern AEAD and counter modes. ",
                "Every encryption operation needs a fresh nonce under a given key."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("IV/Nonce Management"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-008".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "interrupt-crypto".to_owned(),
            description: "nrf_crypto_* call inside interrupt handler (ISR function)."
                .to_owned(),
            rationale: concat!(
                "Crypto operations can block or take variable time. Running them in an ISR hurts ",
                "latency and can destabilize the rest of the system."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("ISR Constraints"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
        Rule {
            id: "NRP-CRYPTO-009".to_owned(),
            category: RuleCategory::Crypto,
            severity: Severity::Error,
            title: "raw-key-in-api".to_owned(),
            description: "uint8_t key parameter (not KeyHandle) on a public API function."
                .to_owned(),
            rationale: concat!(
                "Public APIs should not force callers to move raw key bytes around. Key handles ",
                "make ownership and storage policy explicit while reducing exposure."
            )
            .to_owned(),
            references: vec![local_ref(
                "Platform Crypto Reference",
                PLATFORM_CRYPTO,
                Some("Key Handle Pattern"),
            )],
            languages: Some(LANG_C_CPP.to_vec()),
        },
    ]
});

#[cfg(test)]
mod tests {
    use super::CRYPTO_RULES;
    use crate::{RuleCategory, Severity};

    #[test]
    fn exposes_crypto_rules() {
        assert_eq!(CRYPTO_RULES.len(), 9);
        assert_eq!(CRYPTO_RULES[0].category, RuleCategory::Crypto);
        assert_eq!(CRYPTO_RULES[4].severity, Severity::Warning);
    }
}
