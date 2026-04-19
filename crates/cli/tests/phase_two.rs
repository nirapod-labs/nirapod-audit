// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use std::{path::PathBuf, process::Command};

#[test]
fn audit_compliant_fixture_succeeds() {
    let output = Command::new(env!("CARGO_BIN_EXE_nirapod-audit"))
        .current_dir(repo_root())
        .args(["audit", "tests/fixtures/compliant"])
        .output()
        .expect("failed to run compliant audit");

    assert!(output.status.success());

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("summary"));
    assert!(stdout.contains("errors: 0"));
    assert!(stdout.contains("warnings: 0"));
}

#[test]
fn audit_violation_fixture_directory_reports_license_and_doxygen_findings() {
    let output = Command::new(env!("CARGO_BIN_EXE_nirapod-audit"))
        .current_dir(repo_root())
        .args(["audit", "tests/violations"])
        .output()
        .expect("failed to run violation audit");

    assert!(!output.status.success());

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("NRP-LIC-001"));
    assert!(stdout.contains("NRP-DOX-001"));
    assert!(stdout.contains("summary"));
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}
