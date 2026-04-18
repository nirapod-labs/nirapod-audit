// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

use super::AstPass;
use crate::{build_file_context, build_project_context, AuditConfig, Pass};
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

#[test]
fn compliant_fixture_has_no_file_header_findings() {
    let path = fixture_path("tests/fixtures/compliant/good-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read compliant fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = AstPass.run(&context);
    assert!(diagnostics.is_empty());
}

#[test]
fn violation_fixture_triggers_missing_file_header() {
    let path = fixture_path("tests/violations/NRP-DOX-001-no-file-header.h");
    let raw = fs::read_to_string(&path).expect("failed to read violation fixture");
    let project = build_project_context(
        path.parent().expect("fixture without parent"),
        vec![path.clone()],
        AuditConfig::default(),
    );
    let context = build_file_context(&path, &raw, &project).expect("failed to build context");

    let diagnostics = AstPass.run(&context);
    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-DOX-001"));
    assert!(ids.contains(&"NRP-DOX-008"));
    assert!(ids.contains(&"NRP-DOX-009"));
    assert!(ids.contains(&"NRP-DOX-012"));
}

#[test]
fn generic_file_brief_triggers_warning() {
    let diagnostics = run_temp_fixture(
        "generic-brief.h",
        "/**\n * @file generic-brief.h\n * @brief driver\n *\n * @details\n * Handles authenticated encryption for Nordic secure elements.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n */\n#pragma once\n",
    );

    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].rule.id, "NRP-DOX-003");
}

#[test]
fn missing_details_and_meta_are_reported() {
    let diagnostics = run_temp_fixture(
        "missing-details.h",
        "/**\n * @file missing-details.h\n * @brief AES-GCM key wrapping entry points.\n */\n#pragma once\n",
    );

    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert_eq!(ids, vec!["NRP-DOX-004", "NRP-DOX-005"]);
}

#[test]
fn missing_brief_is_reported() {
    let diagnostics = run_temp_fixture(
        "missing-brief.h",
        "/**\n * @file missing-brief.h\n *\n * @details\n * Exposes secure packet parsing helpers.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n */\n#pragma once\n",
    );

    assert_eq!(diagnostics.len(), 1);
    assert_eq!(diagnostics[0].rule.id, "NRP-DOX-002");
}

#[test]
fn function_doc_gaps_are_reported() {
    let diagnostics = run_temp_fixture(
        "missing-fn-tags.h",
        "/**\n * @file missing-fn-tags.h\n * @brief Packet authentication helpers.\n *\n * @details\n * Declares the public parser entry points.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n *\n * SPDX-License-Identifier: APACHE-2.0\n * SPDX-FileCopyrightText: 2026 Nirapod Contributors\n */\n#pragma once\n\n/**\n * @details\n * Parses one framed packet.\n */\nint parse_packet(const uint8_t *data, size_t len);\n",
    );

    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-DOX-013"));
    assert!(ids.contains(&"NRP-DOX-014"));
    assert!(ids.contains(&"NRP-DOX-015"));
}

#[test]
fn module_doc_without_defgroup_is_reported() {
    let diagnostics = run_temp_fixture(
        "module-doc.h",
        "/**\n * @file module-doc.h\n * @brief Crypto module documentation.\n *\n * @details\n * Collects the public API pages for the crypto subsystem.\n *\n * @author Nirapod Team\n * @date 2026\n * @version 0.1.0\n *\n * SPDX-License-Identifier: APACHE-2.0\n * SPDX-FileCopyrightText: 2026 Nirapod Contributors\n */\n#pragma once\n",
    );

    let ids = diagnostics
        .iter()
        .map(|diagnostic| diagnostic.rule.id.as_str())
        .collect::<Vec<_>>();

    assert!(ids.contains(&"NRP-DOX-021"));
}

fn run_temp_fixture(name: &str, raw: &str) -> Vec<crate::Diagnostic> {
    let root = temp_dir("ast-pass");
    let file = root.join(name);
    fs::create_dir_all(&root).expect("failed to create temp directory");
    fs::write(&file, raw).expect("failed to write temp fixture");

    let project = build_project_context(&root, vec![file.clone()], AuditConfig::default());
    let context = build_file_context(&file, raw, &project).expect("failed to build context");
    let diagnostics = AstPass.run(&context);

    fs::remove_dir_all(root).expect("failed to remove temp directory");
    diagnostics
}

fn fixture_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!("../../{relative}"))
}

fn temp_dir(label: &str) -> PathBuf {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time before UNIX_EPOCH")
        .as_nanos();
    std::env::temp_dir().join(format!("nirapod-audit-{label}-{timestamp}"))
}
