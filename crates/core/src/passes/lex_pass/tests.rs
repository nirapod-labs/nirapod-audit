// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::LexPass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_license_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = LexPass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn violation_fixture_triggers_missing_license_diagnostics() {
    let path = fixture_path("tests/violations/NRP-LIC-001-no-spdx.h");
    let raw = fs::read_to_string(&path).expect("failed to read violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = LexPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert_eq!(ids, vec!["NRP-LIC-001", "NRP-LIC-002", "NRP-LIC-003"]);
}

#[test]
fn spdx_outside_doc_block_triggers_warning() {
    let root = temp_dir("lex-pass");
    let file = root.join("spdx-outside.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "/**\n * @file sample.h\n */\n// SPDX-License-Identifier: APACHE-2.0\n// SPDX-FileCopyrightText: 2026 Nirapod Contributors\n#pragma once\n",
    )
    .expect("failed to write test fixture");

    let raw = fs::read_to_string(&file).expect("failed to read temp fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = LexPass.run(&context);
    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].rule.id, "NRP-LIC-004");

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn style_violation_fixture_triggers_banned_word_and_em_dash() {
    let path = fixture_path("tests/violations/NRP-STYLE-001-banned-words.h");
    let raw = fs::read_to_string(&path).expect("failed to read style violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = LexPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-STYLE-001"));
    assert!(ids.contains(&"NRP-STYLE-002"));
}

#[test]
fn banned_phrase_triggers_style_warning() {
    let root = temp_dir("lex-pass-phrase");
    let file = root.join("phrase.h");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "/**\n * @file phrase.h\n * @brief Packet parser.\n *\n * @details\n * It is important to note that this helper validates framed packets.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n *\n * SPDX-License-Identifier: APACHE-2.0\n * SPDX-FileCopyrightText: 2026 Nirapod Contributors\n */\n#pragma once\n",
    )
    .expect("failed to write test fixture");

    let raw = fs::read_to_string(&file).expect("failed to read temp fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = LexPass.run(&context);
    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].rule.id, "NRP-STYLE-001");

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
