#!/usr/bin/env bash
# Vibeweave installer (macOS / Linux / Git Bash) — a thin wrapper around the cross-platform Node installer.
#
#   ./install.sh                                    # detect IDEs in the current project and install for them
#   ./install.sh --agent cursor,copilot,codex       # specific IDEs (see --list)
#   ./install.sh --agent all --global               # every supported IDE, user-wide
#   ./install.sh --project ~/my-app                 # into another project
#   ./install.sh --skills vibeweave,ui-test --link  # subset of skills, symlinked (git pull updates them)
#   ./install.sh --no-agents --no-rules --no-usage  # skip subagents / rule files / Claude usage hook
#   ./install.sh --dry-run · --uninstall · --list · --force (replace same-named files Vibeweave didn't create)
# Same as: npx vibeweave …   (Node ≥ 18 required — the helper scripts need it anyway)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then echo "Node.js 18+ is required: https://nodejs.org" >&2; exit 2; fi
exec node "$DIR/bin/vibeweave.mjs" "$@"
