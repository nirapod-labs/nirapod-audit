// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Centralized reference path helpers for rule documentation.

use crate::RuleReference;

/// C and C++ license and headers reference.
pub const LICENSE_HEADERS_C: &str = concat!(
    ".agents/skills/nirapod-embedded-engineering/references",
    "/license-and-headers.md"
);

/// TypeScript and Rust license and headers reference.
pub const LICENSE_HEADERS_TS: &str = concat!(
    ".agents/skills/write-documented-code/references",
    "/license-and-headers-ts-rust.md"
);

/// Full Doxygen reference used by the embedded engineering skill.
pub const DOXYGEN_FULL: &str = concat!(
    ".agents/skills/nirapod-embedded-engineering/references",
    "/doxygen-full.md"
);

/// NASA JPL safety-rules reference used by the embedded engineering skill.
pub const NASA_SAFETY: &str = concat!(
    ".agents/skills/nirapod-embedded-engineering/references",
    "/nasa-safety-rules.md"
);

/// Embedded-engineering writing style reference.
pub const WRITE_LIKE_HUMAN: &str = concat!(
    ".agents/skills/nirapod-embedded-engineering/references",
    "/write-like-human-tech.md"
);

/// Embedded engineering skill main instructions.
pub const EMBEDDED_SKILL: &str = ".agents/skills/nirapod-embedded-engineering/SKILL.md";

/// Write-documented-code skill main instructions.
pub const DOC_SKILL: &str = ".agents/skills/write-documented-code/SKILL.md";

/// Write-like-human skill main instructions.
pub const WLH_SKILL: &str = ".agents/skills/write-like-human/SKILL.md";

/// AI word tier reference for banned-word rules.
pub const WORD_TIERS: &str = ".agents/skills/write-like-human/references/word-tiers.md";

/// AI phrase-pattern reference for lexical style checks.
pub const AI_PATTERNS_DB: &str =
    ".agents/skills/write-like-human/references/ai-patterns-database.md";

/// Builds a structured local file reference.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::rules::refs::{local_ref, LICENSE_HEADERS_C};
///
/// let reference = local_ref("License Header Quick Reference", LICENSE_HEADERS_C, Some("Standard Header Template"));
/// assert_eq!(reference.file.as_deref(), Some(LICENSE_HEADERS_C));
/// ```
#[must_use]
pub fn local_ref(label: &str, file: &str, section: Option<&str>) -> RuleReference {
    RuleReference {
        label: label.to_owned(),
        file: Some(file.to_owned()),
        section: section.map(str::to_owned),
        url: None,
    }
}

/// Builds a structured external URL reference.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::rules::refs::url_ref;
///
/// let reference = url_ref("SPDX License List", "https://spdx.org/licenses/");
/// assert_eq!(reference.url.as_deref(), Some("https://spdx.org/licenses/"));
/// ```
#[must_use]
pub fn url_ref(label: &str, url: &str) -> RuleReference {
    RuleReference {
        label: label.to_owned(),
        file: None,
        section: None,
        url: Some(url.to_owned()),
    }
}

#[cfg(test)]
mod tests {
    use super::{local_ref, url_ref, LICENSE_HEADERS_C};

    #[test]
    fn builds_local_reference() {
        let reference = local_ref(
            "License Header Quick Reference",
            LICENSE_HEADERS_C,
            Some("Standard Header Template"),
        );
        assert_eq!(
            reference.section.as_deref(),
            Some("Standard Header Template")
        );
    }

    #[test]
    fn builds_url_reference() {
        let reference = url_ref("SPDX License List", "https://spdx.org/licenses/");
        assert_eq!(reference.url.as_deref(), Some("https://spdx.org/licenses/"));
    }
}
