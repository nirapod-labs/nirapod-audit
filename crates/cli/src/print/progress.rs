// SPDX-License-Identifier: APACHE-2.0
// SPDX-FileCopyrightText: 2026 Nirapod Contributors

//! Single-line progress reporting for terminal audit runs.

use std::io::{self, IsTerminal, Write};

/// Progress reporter that updates one terminal line in place on TTYs.
pub struct ProgressReporter {
    interactive: bool,
    has_live_line: bool,
}

impl ProgressReporter {
    /// Creates a reporter for the current stdout target.
    #[must_use]
    pub fn new() -> Self {
        Self {
            interactive: io::stdout().is_terminal(),
            has_live_line: false,
        }
    }

    /// Updates the current file-scan status line.
    pub fn update(&mut self, index: usize, total: usize, path: &str) -> io::Result<()> {
        let status = format!("[{index}/{total}] {path}");
        if self.interactive {
            let mut stdout = io::stdout().lock();
            write!(stdout, "\r\x1b[2K{status}")?;
            stdout.flush()?;
            self.has_live_line = true;
        } else {
            println!("{status}");
        }

        Ok(())
    }

    /// Emits arbitrary text, clearing the live progress line first if needed.
    pub fn emit(&mut self, text: &str) -> io::Result<()> {
        if self.interactive {
            let mut stdout = io::stdout().lock();
            if self.has_live_line {
                write!(stdout, "\r\x1b[2K")?;
                self.has_live_line = false;
            }
            write!(stdout, "{text}")?;
            stdout.flush()?;
        } else {
            print!("{text}");
            io::stdout().flush()?;
        }

        Ok(())
    }

    /// Clears the live status line after the scan completes.
    pub fn finish(&mut self) -> io::Result<()> {
        if self.interactive && self.has_live_line {
            let mut stdout = io::stdout().lock();
            write!(stdout, "\r\x1b[2K")?;
            stdout.flush()?;
            self.has_live_line = false;
        }

        Ok(())
    }
}
