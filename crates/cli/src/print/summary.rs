// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! End-of-run summary rendering helpers.

use std::fmt::Write;

/// Counts collected across one audit command run.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AuditSummaryView {
    /// Files successfully parsed and analyzed.
    pub scanned_files: usize,
    /// Files skipped because the current migration cannot analyze them yet.
    pub skipped_files: usize,
    /// Error diagnostics emitted during the run.
    pub errors: usize,
    /// Warning diagnostics emitted during the run.
    pub warnings: usize,
    /// Informational diagnostics emitted during the run.
    pub infos: usize,
}

/// Renders the end-of-run summary block.
#[must_use]
pub fn render_summary(summary: AuditSummaryView) -> String {
    let mut output = String::new();
    writeln!(&mut output).expect("write to string");
    writeln!(&mut output, "summary").expect("write to string");
    writeln!(&mut output, "  scanned files: {}", summary.scanned_files).expect("write to string");
    writeln!(&mut output, "  skipped files: {}", summary.skipped_files).expect("write to string");
    writeln!(&mut output, "  errors: {}", summary.errors).expect("write to string");
    writeln!(&mut output, "  warnings: {}", summary.warnings).expect("write to string");
    writeln!(&mut output, "  infos: {}", summary.infos).expect("write to string");
    output
}

#[cfg(test)]
mod tests {
    use super::{render_summary, AuditSummaryView};

    #[test]
    fn renders_summary_block() {
        let rendered = render_summary(AuditSummaryView {
            scanned_files: 4,
            skipped_files: 1,
            errors: 2,
            warnings: 3,
            infos: 1,
        });

        assert!(rendered.contains("scanned files: 4"));
        assert!(rendered.contains("skipped files: 1"));
        assert!(rendered.contains("warnings: 3"));
    }
}
