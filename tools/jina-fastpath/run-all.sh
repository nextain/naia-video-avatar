#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Jina Fastpath Run All ==="
echo "Worktree: $WORKTREE_DIR"

cd "$WORKTREE_DIR"
python3 "$SCRIPT_DIR/runner.py" "$@"
