// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Typed loading for `nirapod-audit.toml`.
//!
//! The migration plan calls for TOML-based configuration shared by the core
//! engine and the CLI. This module provides a small, typed loader built on the
//! `toml` crate so later passes do not need to parse ad hoc strings.

use crate::types::{AuditConfig, PlatformHint, RuleCategory, RuleOverride, RuleOverrideSeverity};
use serde::Deserialize;
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

/// Configuration filename searched by the loader.
pub const CONFIG_FILENAME: &str = "nirapod-audit.toml";

/// Fully loaded configuration plus the config file path when one was found.
///
/// # Examples
///
/// ```
/// use nirapod_audit_core::{LoadedConfig, PlatformHint};
///
/// let loaded = LoadedConfig::default();
/// assert_eq!(loaded.config.platform, PlatformHint::Auto);
/// assert!(loaded.config_path.is_none());
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadedConfig {
    /// Effective merged configuration.
    pub config: AuditConfig,
    /// Path to the file that supplied overrides, if one was found.
    pub config_path: Option<PathBuf>,
}

impl Default for LoadedConfig {
    fn default() -> Self {
        Self {
            config: AuditConfig::default(),
            config_path: None,
        }
    }
}

/// Errors that can occur while reading or parsing `nirapod-audit.toml`.
#[derive(Debug)]
pub enum LoadConfigError {
    /// The config file could not be read from disk.
    Io(std::io::Error),
    /// The config file existed but contained invalid TOML.
    Toml(toml::de::Error),
}

impl std::fmt::Display for LoadConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(error) => write!(f, "failed to read nirapod-audit.toml: {error}"),
            Self::Toml(error) => write!(f, "failed to parse nirapod-audit.toml: {error}"),
        }
    }
}

impl std::error::Error for LoadConfigError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            Self::Toml(error) => Some(error),
        }
    }
}

impl From<std::io::Error> for LoadConfigError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<toml::de::Error> for LoadConfigError {
    fn from(error: toml::de::Error) -> Self {
        Self::Toml(error)
    }
}

/// Finds the nearest `nirapod-audit.toml` by walking up from `start_dir`.
///
/// # Examples
///
/// ```no_run
/// use nirapod_audit_core::find_config_file;
///
/// let config_path = find_config_file("./firmware/src");
/// if let Some(path) = config_path {
///     println!("{}", path.display());
/// }
/// ```
#[must_use]
pub fn find_config_file(start_dir: impl AsRef<Path>) -> Option<PathBuf> {
    let mut dir = start_dir.as_ref().to_path_buf();

    loop {
        let candidate = dir.join(CONFIG_FILENAME);
        if candidate.is_file() {
            return Some(candidate);
        }

        if !dir.pop() {
            return None;
        }
    }
}

/// Loads `nirapod-audit.toml` and merges it over the default configuration.
///
/// # Errors
///
/// Returns [`LoadConfigError::Io`] if the config file exists but cannot be
/// read, or [`LoadConfigError::Toml`] if the file is not valid TOML.
///
/// # Examples
///
/// ```no_run
/// use nirapod_audit_core::load_config;
///
/// let loaded = load_config(".")?;
/// println!("show_help = {}", loaded.config.show_help);
/// # Ok::<(), nirapod_audit_core::config::LoadConfigError>(())
/// ```
pub fn load_config(start_dir: impl AsRef<Path>) -> Result<LoadedConfig, LoadConfigError> {
    let Some(config_path) = find_config_file(start_dir) else {
        return Ok(LoadedConfig::default());
    };

    let content = fs::read_to_string(&config_path)?;
    let raw: RawConfig = toml::from_str(&content)?;

    let mut config = AuditConfig::default();

    if let Some(audit) = raw.audit {
        if let Some(platform) = audit.platform {
            config.platform = platform;
        }
        if let Some(max_function_lines) = audit.max_function_lines {
            config.max_function_lines = max_function_lines;
        }
        if let Some(min_assertions) = audit.min_assertions {
            config.min_assertions = min_assertions;
        }
    }

    if let Some(ignore) = raw.ignore {
        if let Some(paths) = ignore.paths {
            config.ignore_paths = paths;
        }
        if let Some(rules) = ignore.rules {
            config.ignore_rules = rules;
        }
    }

    if let Some(only) = raw.only {
        if let Some(categories) = only.categories {
            config.only_categories = categories;
        }
    }

    if let Some(output) = raw.output {
        if let Some(show_help) = output.show_help {
            config.show_help = show_help;
        }
        if let Some(show_notes) = output.show_notes {
            config.show_notes = show_notes;
        }
    }

    if let Some(rules) = raw.rules {
        if let Some(overrides) = rules.overrides {
            config.rule_overrides = overrides
                .into_iter()
                .map(|(id, severity)| (id, RuleOverride { severity }))
                .collect::<BTreeMap<_, _>>();
        }
    }

    Ok(LoadedConfig {
        config,
        config_path: Some(config_path),
    })
}

#[derive(Debug, Default, Deserialize)]
struct RawConfig {
    #[serde(default)]
    audit: Option<RawAuditConfig>,
    #[serde(default)]
    rules: Option<RawRulesConfig>,
    #[serde(default)]
    ignore: Option<RawIgnoreConfig>,
    #[serde(default)]
    only: Option<RawOnlyConfig>,
    #[serde(default)]
    output: Option<RawOutputConfig>,
}

#[derive(Debug, Default, Deserialize)]
struct RawAuditConfig {
    #[serde(default)]
    platform: Option<PlatformHint>,
    #[serde(default)]
    max_function_lines: Option<usize>,
    #[serde(default)]
    min_assertions: Option<usize>,
}

#[derive(Debug, Default, Deserialize)]
struct RawRulesConfig {
    #[serde(default)]
    overrides: Option<BTreeMap<String, RuleOverrideSeverity>>,
}

#[derive(Debug, Default, Deserialize)]
struct RawIgnoreConfig {
    #[serde(default)]
    paths: Option<Vec<String>>,
    #[serde(default)]
    rules: Option<Vec<String>>,
}

#[derive(Debug, Default, Deserialize)]
struct RawOnlyConfig {
    #[serde(default)]
    categories: Option<Vec<RuleCategory>>,
}

#[derive(Debug, Default, Deserialize)]
struct RawOutputConfig {
    #[serde(default)]
    show_help: Option<bool>,
    #[serde(default)]
    show_notes: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::{find_config_file, load_config, CONFIG_FILENAME};
    use crate::types::{PlatformHint, RuleCategory, RuleOverrideSeverity};
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn finds_config_by_walking_to_parent() {
        let root = test_dir("finds-config");
        let nested = root.join("a").join("b");
        fs::create_dir_all(&nested).expect("failed to create nested test directory");
        fs::write(root.join(CONFIG_FILENAME), "[audit]\nplatform = \"host\"\n")
            .expect("failed to write config file");

        let found = find_config_file(&nested).expect("expected config file");
        assert_eq!(found, root.join(CONFIG_FILENAME));

        fs::remove_dir_all(root).expect("failed to remove test directory");
    }

    #[test]
    fn loads_toml_overrides_over_defaults() {
        let root = test_dir("loads-overrides");
        fs::create_dir_all(&root).expect("failed to create test directory");
        fs::write(
            root.join(CONFIG_FILENAME),
            r#"
[audit]
platform = "esp32"
max_function_lines = 72
min_assertions = 3

[rules]
overrides = { NRP_STYLE_001 = "ignore", NRP_NASA_006 = "warning" }

[ignore]
paths = ["vendor/**", "generated/**"]
rules = ["NRP-STYLE-002"]

[only]
categories = ["NASA", "CRYPTO"]

[output]
show_help = false
show_notes = true
"#,
        )
        .expect("failed to write config file");

        let loaded = load_config(&root).expect("expected config to load");

        assert_eq!(loaded.config.platform, PlatformHint::Esp32);
        assert_eq!(loaded.config.max_function_lines, 72);
        assert_eq!(loaded.config.min_assertions, 3);
        assert_eq!(
            loaded.config.ignore_paths,
            vec!["vendor/**", "generated/**"]
        );
        assert_eq!(loaded.config.ignore_rules, vec!["NRP-STYLE-002"]);
        assert_eq!(
            loaded.config.only_categories,
            vec![RuleCategory::Nasa, RuleCategory::Crypto]
        );
        assert!(!loaded.config.show_help);
        assert!(loaded.config.show_notes);
        assert_eq!(
            loaded
                .config
                .rule_overrides
                .get("NRP_STYLE_001")
                .expect("missing override")
                .severity,
            RuleOverrideSeverity::Ignore
        );

        fs::remove_dir_all(root).expect("failed to remove test directory");
    }

    fn test_dir(label: &str) -> PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
    }
}
