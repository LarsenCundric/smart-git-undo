import { git, gitLines, getCurrentBranch, getHeadSha, getShortSha, getCommitMessage } from './git.js';

/**
 * Analyzes recent git state and returns the most likely "undo" action.
 * Priority order:
 *   1. Staged files (user just ran git add)
 *   2. In-progress merge (MERGE_HEAD exists)
 *   3. Recent rebase (check reflog for rebase entries)
 *   4. Recent merge commit (HEAD is a merge)
 *   5. Recent branch deletion (check reflog)
 *   6. Recent commit (most common case)
 *
 * Returns: { type, description, details } or null
 */
export function detect() {
  // 1. Staged files?
  const staged = detectStaged();
  if (staged) return staged;

  // 2. In-progress merge? (MERGE_HEAD present)
  const mergingNow = detectInProgressMerge();
  if (mergingNow) return mergingNow;

  // 3. Recent rebase?
  const rebase = detectRebase();
  if (rebase) return rebase;

  // 4. HEAD is a merge commit?
  const merge = detectMergeCommit();
  if (merge) return merge;

  // 5. Deleted branch recently?
  const branch = detectDeletedBranch();
  if (branch) return branch;

  // 6. Recent commit
  const commit = detectCommit();
  if (commit) return commit;

  return null;
}

function detectStaged() {
  const staged = gitLines('diff --cached --name-only', { allowFailure: true });
  if (staged.length === 0) return null;

  return {
    type: 'staged',
    description: `Unstage ${staged.length} file${staged.length > 1 ? 's' : ''}`,
    details: { files: staged },
  };
}

function detectInProgressMerge() {
  const mergeHead = git('rev-parse MERGE_HEAD', { silent: true, allowFailure: true });
  if (!mergeHead) return null;

  const branch = git('name-rev --name-only --no-undefined MERGE_HEAD', { silent: true, allowFailure: true }) || getShortSha(mergeHead);

  return {
    type: 'in-progress-merge',
    description: `Abort in-progress merge from ${branch}`,
    details: { mergeHead, branch },
  };
}

function detectRebase() {
  // Check reflog for recent rebase finish (within last 10 entries)
  const reflog = gitLines('reflog --format=%H:%gs -n 10', { allowFailure: true });

  for (let i = 0; i < reflog.length; i++) {
    const [sha, ...msgParts] = reflog[i].split(':');
    const msg = msgParts.join(':');

    if (/rebase.*finished|rebase.*onto/.test(msg)) {
      // Find the pre-rebase state: the entry right before the rebase started
      // Look for the reflog entry before the rebase sequence
      const preRebase = findPreRebaseState(reflog, i);
      if (preRebase) {
        return {
          type: 'rebase',
          description: 'Undo recent rebase',
          details: { preRebaseSha: preRebase, currentSha: getHeadSha() },
        };
      }
    }
  }

  return null;
}

function findPreRebaseState(reflog, rebaseIdx) {
  // Walk backwards from the rebase to find where HEAD was before
  for (let i = rebaseIdx + 1; i < reflog.length; i++) {
    const [sha, ...msgParts] = reflog[i].split(':');
    const msg = msgParts.join(':');
    // The entry just before the rebase operations is the pre-rebase state
    if (!/rebase/.test(msg)) {
      return sha;
    }
  }
  // If all 10 entries are rebase, look further back
  const deeper = gitLines('reflog --format=%H:%gs -n 50', { allowFailure: true });
  for (const line of deeper) {
    const [sha, ...msgParts] = line.split(':');
    const msg = msgParts.join(':');
    if (!/rebase/.test(msg)) {
      return sha;
    }
  }
  return null;
}

function detectMergeCommit() {
  const parents = git('cat-file -p HEAD', { silent: true, allowFailure: true });
  if (!parents) return null;

  const parentLines = parents.split('\n').filter(l => l.startsWith('parent '));
  if (parentLines.length < 2) return null; // not a merge

  const headSha = getHeadSha();
  const msg = getCommitMessage(headSha);

  return {
    type: 'merge',
    description: `Undo merge commit: "${msg}"`,
    details: { sha: headSha, message: msg },
  };
}

function detectDeletedBranch() {
  // Look in reflog for recent branch deletions
  // When a branch is deleted, there's usually a reflog entry referencing it
  const reflog = gitLines('reflog --format=%H:%gs -n 20', { allowFailure: true });

  for (const line of reflog) {
    const [sha, ...msgParts] = line.split(':');
    const msg = msgParts.join(':');

    // Branch delete shows up via the branch's last known reflog
    // But we can also check stale branch references
  }

  // Better approach: check for recently deleted branches from all reflogs
  const allRefs = git('for-each-ref --sort=-committerdate --format=%(refname:short) refs/heads/', { silent: true, allowFailure: true });

  // Check if there are orphaned reflog entries that don't have matching branches
  // This is complex — we'll look for the pattern in `git reflog` that mentions branch deletion
  const fullReflog = gitLines('reflog --all --format=%gd:%H:%gs -n 30', { allowFailure: true });

  for (const line of fullReflog) {
    const parts = line.split(':');
    if (parts.length >= 3) {
      const msg = parts.slice(2).join(':');
      if (/Branch: deleted/.test(msg) || /branch: Reset.*delete/.test(msg)) {
        const sha = parts[1];
        const branchMatch = msg.match(/refs\/heads\/(\S+)/);
        const branchName = branchMatch ? branchMatch[1] : null;
        if (branchName && sha) {
          return {
            type: 'deleted-branch',
            description: `Restore deleted branch "${branchName}"`,
            details: { sha, branch: branchName },
          };
        }
      }
    }
  }

  return null;
}

function detectCommit() {
  const headSha = getHeadSha();
  if (!headSha) return null;

  // Make sure there's a parent (not the initial commit)
  const parentSha = git('rev-parse HEAD~1', { silent: true, allowFailure: true });
  if (!parentSha) return null;

  const msg = getCommitMessage(headSha);
  const short = getShortSha(headSha);

  return {
    type: 'commit',
    description: `Revert commit ${short} ("${msg}")`,
    details: { sha: headSha, parentSha, message: msg, shortSha: short },
  };
}
