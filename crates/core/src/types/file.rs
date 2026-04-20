// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! File-role protocol types.

use serde::{Deserialize, Serialize};

/// Structural role of a source file.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::FileRole;
///
/// assert_eq!(FileRole::ModuleDoc.as_str(), "module-doc");
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileRole {
    /// Public header file.
    #[serde(rename = "public-header")]
    PublicHeader,
    /// Implementation file.
    #[serde(rename = "impl")]
    Implementation,
    /// Assembly source file.
    #[serde(rename = "asm")]
    Asm,
    /// CMake source file.
    #[serde(rename = "cmake")]
    Cmake,
    /// Generic configuration file.
    #[serde(rename = "config")]
    Config,
    /// Module documentation header such as `module-doc.h`.
    #[serde(rename = "module-doc")]
    ModuleDoc,
    /// Test file.
    #[serde(rename = "test")]
    Test,
    /// Third-party vendored file.
    #[serde(rename = "third-party")]
    ThirdParty,
    /// TypeScript module file.
    #[serde(rename = "ts-module")]
    TsModule,
    /// TypeScript component file.
    #[serde(rename = "ts-component")]
    TsComponent,
    /// TypeScript hook file.
    #[serde(rename = "ts-hook")]
    TsHook,
    /// TypeScript type file.
    #[serde(rename = "ts-type")]
    TsType,
    /// TypeScript entry-point file.
    #[serde(rename = "ts-entry")]
    TsEntry,
    /// TypeScript test file.
    #[serde(rename = "ts-test")]
    TsTest,
    /// Rust library crate root.
    #[serde(rename = "rs-lib")]
    RsLib,
    /// Rust binary crate root.
    #[serde(rename = "rs-bin")]
    RsBin,
    /// Rust module file.
    #[serde(rename = "rs-mod")]
    RsMod,
    /// Rust test file.
    #[serde(rename = "rs-test")]
    RsTest,
}

impl FileRole {
    /// Returns the stable lowercase label used in diagnostics and JSON.
    ///
    /// # Examples
    ///
    /// ```
    /// use nirapod_audit_core::FileRole;
    ///
    /// assert_eq!(FileRole::PublicHeader.as_str(), "public-header");
    /// ```
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PublicHeader => "public-header",
            Self::Implementation => "impl",
            Self::Asm => "asm",
            Self::Cmake => "cmake",
            Self::Config => "config",
            Self::ModuleDoc => "module-doc",
            Self::Test => "test",
            Self::ThirdParty => "third-party",
            Self::TsModule => "ts-module",
            Self::TsComponent => "ts-component",
            Self::TsHook => "ts-hook",
            Self::TsType => "ts-type",
            Self::TsEntry => "ts-entry",
            Self::TsTest => "ts-test",
            Self::RsLib => "rs-lib",
            Self::RsBin => "rs-bin",
            Self::RsMod => "rs-mod",
            Self::RsTest => "rs-test",
        }
    }
}
