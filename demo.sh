#!/usr/bin/env bash
# demo.sh — walks through every git-undo feature in a temp repo
# Run: bash demo.sh
# Great for recording with asciinema or vhs

set -e

DEMO_DIR=$(mktemp -d)
TOOL="$(cd "$(dirname "$0")" && pwd)"

cleanup() { rm -rf "$DEMO_DIR"; }
trap cleanup EXIT

pause() {
  echo ""
  echo -e "\033[90m── press enter ──\033[0m"
  read -r
}

header() {
  echo ""
  echo -e "\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
  echo -e "\033[1;36m  $1\033[0m"
  echo -e "\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m"
}

cmd() {
  echo -e "\033[33m\$ $1\033[0m"
  eval "$1"
}

cd "$DEMO_DIR"
git init -q
git commit --allow-empty -q -m "initial commit"

# ─── 1. Undo a commit ───────────────────────────────────────────────
header "1. Undo a bad commit"
echo "Let's make a commit and then undo it."
pause

cmd 'echo "oops" > mistake.txt && git add mistake.txt && git commit -q -m "add mistake"'
echo ""
cmd "node $TOOL/src/index.js"
echo "Changes are still in the working tree:"
cmd "git status --short"
pause

# ─── 2. Redo ─────────────────────────────────────────────────────────
header "2. Redo — went too far"
echo "Actually, that commit was fine. Let's redo it."
pause

cmd "node $TOOL/src/redo.js"
cmd "git log --oneline -2"
pause

# ─── 3. Undo staged files ────────────────────────────────────────────
header "3. Undo staged files"
echo "Stage some files, then unstage them."
pause

cmd 'echo "a" > a.txt && echo "b" > b.txt && git add a.txt b.txt'
cmd "node $TOOL/src/index.js"
cmd "git status --short"
pause

# ─── 4. Undo a merge ─────────────────────────────────────────────────
header "4. Undo a merge commit"
echo "Create a feature branch, merge it, then undo the merge."
pause

cmd 'git checkout -q -b feature'
cmd 'echo "feature" > feature.txt && git add feature.txt && git commit -q -m "feature work"'
cmd 'git checkout -q main'
cmd 'git merge feature --no-ff -q -m "Merge feature"'
echo ""
echo "Now undo:"
cmd "node $TOOL/src/index.js"
cmd "git log --oneline -3"
pause

# ─── 5. Dry run ──────────────────────────────────────────────────────
header "5. Dry run"
echo "See what git undo would do without doing it."
pause

cmd 'echo "another" > another.txt && git add another.txt && git commit -q -m "another commit"'
cmd "node $TOOL/src/index.js --dry-run"
pause

# ─── 6. History ──────────────────────────────────────────────────────
header "6. Undo history"
cmd "node $TOOL/src/index.js --history"
pause

# ─── Done ─────────────────────────────────────────────────────────────
header "Done!"
echo "git-undo handles: commits, staged files, merges, rebases, deleted branches."
echo "Install: npm install -g git-undo"
echo ""
