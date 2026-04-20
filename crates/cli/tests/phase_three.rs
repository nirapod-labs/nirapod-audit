// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use std::{path::PathBuf, process::Command};

#[test]
fn audit_memory_violation_fixture_reports_memory_findings() {
    let output = Command::new(env!("CARGO_BIN_EXE_nirapod-audit"))
        .current_dir(repo_root())
        .args(["audit", "tests/violations/NRP-MEM-violations.h"])
        .output()
        .expect("failed to run memory violation audit");

    assert!(!output.status.success());

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("NRP-MEM-002"));
    assert!(stdout.contains("NRP-MEM-004"));
}

#[test]
fn audit_crypto_violation_fixture_reports_crypto_findings() {
    let output = Command::new(env!("CARGO_BIN_EXE_nirapod-audit"))
        .current_dir(repo_root())
        .args(["audit", "tests/violations/NRP-CRYPTO-violations.h"])
        .output()
        .expect("failed to run crypto violation audit");

    assert!(!output.status.success());

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("NRP-CRYPTO-001"));
    assert!(stdout.contains("NRP-CRYPTO-007"));
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}
