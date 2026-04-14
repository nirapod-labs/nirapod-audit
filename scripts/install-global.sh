#!/bin/bash
# Helper script to automatically install nirapod-audit globally on macOS/Linux.
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Nirapod Contributors

set -e

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}▓▓ Installing nirapod-audit globally...${NC}"

# Ensure bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC} Please install it first:"
    echo "curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Clone into Nirapod tools directory
INSTALL_DIR="$HOME/.nirapod/tools/nirapod-audit"

if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Updating existing installation in $INSTALL_DIR...${NC}"
    cd "$INSTALL_DIR"
    git fetch origin --tags --force
else
    echo -e "${YELLOW}Cloning nirapod-audit into $INSTALL_DIR...${NC}"
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone https://github.com/nirapod-labs/nirapod-audit.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    git fetch origin --tags --force
fi

# Detect latest tag
LATEST_TAG=$(git describe --tags $(git rev-list --tags --max-count=1))
echo -e "${CYAN}Checking out stable version: ${LATEST_TAG}${NC}"
git reset --hard HEAD
git clean -fd
git checkout -f "$LATEST_TAG"

echo -e "${YELLOW}Installing dependencies...${NC}"
bun install --frozen-lockfile

# Create symlink
BIN_DIR="/usr/local/bin"

if [ ! -w "$BIN_DIR" ]; then
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
fi

echo -e "${YELLOW}Creating symlink in $BIN_DIR...${NC}"
ln -sf "$INSTALL_DIR/apps/cli/src/index.tsx" "$BIN_DIR/nirapod-audit"
chmod +x "$INSTALL_DIR/apps/cli/src/index.tsx"

echo -e "${GREEN}✓ nirapod-audit successfully installed!${NC}"
echo -e "Try running: ${CYAN}nirapod-audit --help${NC}"

if [[ "$BIN_DIR" == "$HOME/.local/bin" && ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo -e "${RED}⚠️  Action Required: ${YELLOW}$HOME/.local/bin${NC} is not in your PATH."
    echo -e "Add this to your ~/.zshrc or ~/.bashrc:"
    echo -e "  ${CYAN}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
fi
