// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::CryptoPass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass, PlatformHint};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_crypto_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn crypto_violation_fixture_triggers_main_rules() {
    let path = fixture_path("tests/violations/NRP-CRYPTO-violations.h");
    let raw = fs::read_to_string(&path).expect("failed to read crypto violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-CRYPTO-001"));
    assert!(ids.contains(&"NRP-CRYPTO-002"));
    assert!(ids.contains(&"NRP-CRYPTO-005"));
    assert!(ids.contains(&"NRP-CRYPTO-007"));
}

#[test]
fn nrf_crypto_const_buffer_is_reported() {
    let root = temp_dir("crypto-const");
    let file = root.join("const-buf.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "void use_const(void) {\n    static const uint8_t key_buf[16] = {0};\n    nrf_crypto_aes_init(key_buf, 0, 0);\n}\n",
    )
    .expect("failed to write crypto const fixture");

    let raw = fs::read_to_string(&file).expect("failed to read crypto const fixture");
    let mut config = AuditConfig::default();
    config.platform = PlatformHint::Nrf52840;
    let project = build_project_context(&root, vec![file.clone()], config);
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-CRYPTO-004"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn cc312_register_access_is_reported() {
    let root = temp_dir("crypto-cc312");
    let file = root.join("cc312.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(&file, "void poke(void) {\n    NRF_CRYPTOCELL->ENABLE = 1;\n}\n")
        .expect("failed to write crypto cc312 fixture");

    let raw = fs::read_to_string(&file).expect("failed to read crypto cc312 fixture");
    let mut config = AuditConfig::default();
    config.platform = PlatformHint::Nrf5340;
    let project = build_project_context(&root, vec![file.clone()], config);
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-CRYPTO-006"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn crypto_in_interrupt_handler_is_reported() {
    let root = temp_dir("crypto-isr");
    let file = root.join("isr.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "void rng_irq_handler(void) {\n    nrf_crypto_aes_init(0, 0, 0);\n}\n",
    )
    .expect("failed to write crypto isr fixture");

    let raw = fs::read_to_string(&file).expect("failed to read crypto isr fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-CRYPTO-008"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn raw_key_parameter_in_public_api_is_reported() {
    let root = temp_dir("crypto-api");
    let file = root.join("api.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "/**\n * @brief Encrypts payload.\n * @details Uses CC310 backend.\n */\nint encrypt_payload(const uint8_t *key, size_t len);\n",
    )
    .expect("failed to write crypto api fixture");

    let raw = fs::read_to_string(&file).expect("failed to read crypto api fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = CryptoPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-CRYPTO-009"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

fn fixture_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("../../{relative}"))
}

fn temp_dir(label: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_nanos();
    std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
}
