// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Top-level CLI command handlers.
//!
//! Each subcommand lives in its own module so the binary entry point stays
//! focused on parsing and dispatch. This keeps line counts low as the Phase 2
//! CLI grows real behavior.

pub mod audit;
pub mod explain;
pub mod rules;
