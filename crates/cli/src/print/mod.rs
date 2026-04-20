// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Plain terminal rendering helpers for the CLI.
//!
//! Phase 2 keeps the printer text-based and stable. Richer output modes can be
//! added later without growing the command handlers into formatting modules.

pub mod diagnostic;
pub mod progress;
pub mod summary;
