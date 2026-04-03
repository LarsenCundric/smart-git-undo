# git-undo

A smart CLI tool that figures out what you probably want to undo. Just type `git undo`.

No flags to remember, no man pages to read. It looks at your recent git state and does the right thing.

## What it does

```
$ git commit -m "whoops"
$ git undo

🔍 Detected: Revert commit a1b2c3d ("whoops")
   Type: commit

✅ Reverted commit a1b2c3d ("whoops"). Changes are preserved in your working tree.
```

It detects and undoes these situations:

| You just did... | `git undo` will... |
|---|---|
| `git add` files | Unstage them |
| Started a merge with conflicts | `git merge --abort` |
| Completed a rebase | Restore pre-rebase state from reflog |
| Merged a branch | Undo the merge commit |
| Deleted a branch | Restore it from reflog |
| Made a commit | Soft reset (keeps your changes) |

Detection is prioritized in that order — if you staged files and also have a recent commit, it unstages first.

## Install

```bash
npm install -g git-undo
```

Or run without installing:

```bash
npx git-undo
```

Once installed, git finds it automatically as a subcommand:

```bash
git undo          # undo the last thing
git redo          # went too far? redo it
git undo --dry-run    # see what it would do without doing it
git undo --history    # see your undo/redo history
```

## Usage

### Undo

```bash
git undo
```

Analyzes your recent git state and performs the most likely undo. Commits are soft-reset so your changes stay in the working tree.

### Dry run

```bash
git undo --dry-run
```

Shows what would be undone and the exact git command, without changing anything.

```
👁️  Dry run — nothing will be changed

🔍 Detected: Revert commit a1b2c3d ("bad commit")
   Type: commit

   Would execute: git reset --soft HEAD~1
```

### Redo

```bash
git redo
```

Reverses the last undo. Useful when you undo too far.

### History

```bash
git undo --history
```

Shows your full undo/redo timeline:

```
📜 Undo/Redo History

   Actions (newest first):
   ↪️  Redo: Reverted commit a1b2c3d: "bad commit" — 4/2/2026, 3:21:00 PM
   ↩️  Reverted commit a1b2c3d: "bad commit" — 4/2/2026, 3:20:58 PM
```

## How it works

1. **Detector** (`src/detector.js`) checks git state in priority order: staged files → in-progress merge → recent rebase → merge commit → deleted branch → recent commit
2. **Actions** (`src/actions.js`) performs the undo safely — commits use soft reset to preserve changes, merges and rebases use hard reset
3. **Stack** (`src/stack.js`) records every undo in `.git/undo-stack/stack.json` so redo and history work across sessions

The undo stack lives inside `.git/` so it's per-repo and never gets committed.

## Platform support

- **macOS** — supported
- **Linux** — supported
- **Windows** — should work in Git Bash / WSL (not tested)

## License

MIT
