#!/bin/sh
# SPDX-License-Identifier: APACHE-2.0
# SPDX-FileCopyrightText: 2026 Nirapod Contributors

set -eu

if [ "$#" -ne 1 ]; then
  printf '%s\n' "usage: sh scripts/commitlint.sh <commit-message-file>" >&2
  exit 2
fi

message_file="$1"

if [ ! -f "$message_file" ]; then
  printf '%s\n' "error: commit message file not found: $message_file" >&2
  exit 2
fi

subject_line="$(sed -n '1p' "$message_file" | tr -d '\r')"

pattern='^(feat|fix|docs|refactor|test|chore|ci|build|perf|revert)(\([a-z0-9][a-z0-9./_-]*\))?!?: [a-z0-9][a-z0-9 ,:+#/_-]*$'

if printf '%s\n' "$subject_line" | grep -Eq "$pattern"; then
  exit 0
fi

cat >&2 <<'EOF'
error: invalid commit subject

expected:
  type(scope): subject

allowed types:
  feat fix docs refactor test chore ci build perf revert

examples:
  feat(rust): bootstrap workspace
  feat(rust): port config loading
  chore(repo): add commit message linting

rules:
  - subject must be on the first line
  - subject must start lowercase
  - scope is optional but recommended
  - keep the subject direct and specific
EOF

printf '\nactual:\n  %s\n' "$subject_line" >&2
exit 1
