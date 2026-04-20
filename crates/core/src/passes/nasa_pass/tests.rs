// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::NasaPass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_nasa_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn violation_fixture_triggers_initial_nasa_rules() {
    let path = fixture_path("tests/violations/NRP-NASA-violations.h");
    let raw = fs::read_to_string(&path).expect("failed to read nasa violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-NASA-001"));
    assert!(ids.contains(&"NRP-NASA-002"));
    assert!(ids.contains(&"NRP-NASA-003"));
    assert!(ids.contains(&"NRP-NASA-004"));
    assert!(ids.contains(&"NRP-NASA-005"));
    assert!(ids.contains(&"NRP-NASA-006"));
    assert!(ids.contains(&"NRP-NASA-009"));
    assert!(ids.contains(&"NRP-NASA-010"));
}

#[test]
fn non_trivial_function_without_assertions_is_reported() {
    let root = temp_dir("nasa-assertions");
    let file = root.join("assertions.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "int validate(int value) {\n    int total = value;\n    total += 1;\n    total += 2;\n    total += 3;\n    total += 4;\n    return total;\n}\n",
    )
    .expect("failed to write nasa assertion fixture");

    let raw = fs::read_to_string(&file).expect("failed to read nasa assertion fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-NASA-007"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn discarded_non_void_local_call_is_reported() {
    let root = temp_dir("nasa-return");
    let file = root.join("unchecked.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "int status(void) {\n    return 1;\n}\n\nvoid caller(void) {\n    status();\n}\n",
    )
    .expect("failed to write nasa return fixture");

    let raw = fs::read_to_string(&file).expect("failed to read nasa return fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-NASA-008"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn initialized_global_is_reported() {
    let root = temp_dir("nasa-global");
    let file = root.join("global.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(&file, "int global_counter = 0;\n").expect("failed to write nasa global fixture");

    let raw = fs::read_to_string(&file).expect("failed to read nasa global fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-NASA-011"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn immutable_local_without_const_is_reported() {
    let root = temp_dir("nasa-const");
    let file = root.join("const.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "int compute(int input) {\n    int threshold = 10;\n    return input + threshold;\n}\n",
    )
    .expect("failed to write nasa const fixture");

    let raw = fs::read_to_string(&file).expect("failed to read nasa const fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = NasaPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-NASA-012"));

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
