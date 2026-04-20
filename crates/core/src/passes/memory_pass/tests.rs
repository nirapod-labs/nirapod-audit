// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::MemoryPass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_memory_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = MemoryPass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn memory_violation_fixture_triggers_existing_rules() {
    let path = fixture_path("tests/violations/NRP-MEM-violations.h");
    let raw = fs::read_to_string(&path).expect("failed to read memory violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = MemoryPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-MEM-002"));
    assert!(ids.contains(&"NRP-MEM-004"));
}

#[test]
fn array_index_without_guard_is_reported() {
    let root = temp_dir("mem-bounds");
    let file = root.join("bounds.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "void read_buf(int *buf, size_t idx, size_t len) {\n    int value = buf[idx];\n}\n",
    )
    .expect("failed to write bounds fixture");

    let raw = fs::read_to_string(&file).expect("failed to read bounds fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = MemoryPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-MEM-001"));

    fs::remove_dir_all(root).expect("failed to remove temp directory");
}

#[test]
fn size_addition_without_guard_is_reported() {
    let root = temp_dir("mem-size");
    let file = root.join("size.c");
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(
        &file,
        "size_t total_size(size_t header_len, size_t payload_len) {\n    size_t total = header_len + payload_len;\n    return total;\n}\n",
    )
    .expect("failed to write size fixture");

    let raw = fs::read_to_string(&file).expect("failed to read size fixture");
    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, &raw, &project).expect("failed to build context");

    let diagnostics = MemoryPass.run(&context);
    assert!(diagnostics.iter().any(|diagnostic| diagnostic.rule.id == "NRP-MEM-003"));

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
