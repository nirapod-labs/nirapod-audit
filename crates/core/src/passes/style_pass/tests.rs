// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::StylePass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_style_pass_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = StylePass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn generic_brief_is_reported() {
    let root = temp_dir("style-brief");
    let file = root.join("generic.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "/**\n * @brief Driver\n */\nvoid generic_driver(void);\n",
    )
    .expect("failed to write style fixture");

    let raw = fs::read_to_string(&file).expect("failed to read style fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = StylePass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-STYLE-003"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn crypto_doc_without_hardware_word_is_reported() {
    let root = temp_dir("style-hardware-missing");
    let file = root.join("crypto.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        concat!(
            "/**\n",
            " * @brief Encrypt payload blocks.\n",
            " * @details Uses the hardware accelerator for block encryption.\n",
            " */\n",
            "void crypto_encrypt_block(void);\n",
        ),
    )
    .expect("failed to write style fixture");

    let raw = fs::read_to_string(&file).expect("failed to read style fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = StylePass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-STYLE-004"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn crypto_doc_with_hardware_word_is_allowed() {
    let root = temp_dir("style-hardware-ok");
    let file = root.join("crypto_ok.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        concat!(
            "/**\n",
            " * @brief Encrypt payload blocks.\n",
            " * @details Uses the CC310 hardware backend for block encryption.\n",
            " */\n",
            "void crypto_encrypt_block(void);\n",
        ),
    )
    .expect("failed to write style fixture");

    let raw = fs::read_to_string(&file).expect("failed to read style fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = StylePass.run(&context);
    assert!(!diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-STYLE-004"));

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
