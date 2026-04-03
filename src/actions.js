import { git, getHeadSha, getShortSha, getCurrentBranch } from './git.js';
import { recordUndo, recordRedo } from './stack.js';

export function undoStaged(details) {
  const { files } = details;
  git('reset HEAD -- ' + files.map(f => `"${f}"`).join(' '));

  recordUndo({
    type: 'staged',
    description: `Unstaged ${files.length} file(s)`,
    restore: { files },
  });

  return `Unstaged ${files.length} file(s).`;
}

export function undoInProgressMerge(details) {
  const { mergeHead, branch } = details;
  git('merge --abort');

  recordUndo({
    type: 'in-progress-merge',
    description: `Aborted merge from ${branch}`,
    restore: { mergeHead, branch },
  });

  return `Aborted in-progress merge from ${branch}.`;
}

export function undoRebase(details) {
  const { preRebaseSha, currentSha } = details;
  const branch = getCurrentBranch();
  git(`reset --hard ${preRebaseSha}`);

  recordUndo({
    type: 'rebase',
    description: `Undid rebase on ${branch}`,
    restore: { postRebaseSha: currentSha, branch },
  });

  return `Restored ${branch} to pre-rebase state (${getShortSha(preRebaseSha)}).`;
}

export function undoMerge(details) {
  const { sha, message } = details;
  git('reset --hard HEAD~1');

  recordUndo({
    type: 'merge',
    description: `Undid merge: "${message}"`,
    restore: { sha },
  });

  return `Undid merge commit (${getShortSha(sha)}): "${message}".`;
}

export function undoDeletedBranch(details) {
  const { sha, branch } = details;
  git(`branch ${branch} ${sha}`);

  recordUndo({
    type: 'deleted-branch',
    description: `Restored branch "${branch}"`,
    restore: { sha, branch },
  });

  return `Restored branch "${branch}" at ${getShortSha(sha)}.`;
}

export function undoCommit(details) {
  const { sha, parentSha, message, shortSha } = details;
  git('reset --soft HEAD~1');

  recordUndo({
    type: 'commit',
    description: `Reverted commit ${shortSha}: "${message}"`,
    restore: { sha, message },
  });

  return `Reverted commit ${shortSha} ("${message}"). Changes are preserved in your working tree.`;
}

export function redo(entry) {
  const { type, restore } = entry;
  let result;

  switch (type) {
    case 'staged':
      git('add -- ' + restore.files.map(f => `"${f}"`).join(' '));
      result = `Re-staged ${restore.files.length} file(s).`;
      break;
    case 'in-progress-merge':
      git(`merge ${restore.mergeHead}`);
      result = `Re-started merge from ${restore.branch}.`;
      break;
    case 'rebase':
      git(`reset --hard ${restore.postRebaseSha}`);
      result = `Restored post-rebase state on ${restore.branch}.`;
      break;
    case 'merge':
      git(`reset --hard ${restore.sha}`);
      result = `Restored merge commit ${getShortSha(restore.sha)}.`;
      break;
    case 'deleted-branch':
      git(`branch -D ${restore.branch}`);
      result = `Re-deleted branch "${restore.branch}".`;
      break;
    case 'commit':
      git(`commit -m "${restore.message.replace(/"/g, '\\"')}"`);
      result = `Re-committed: "${restore.message}".`;
      break;
    default:
      return `Unknown undo type "${type}" — cannot redo.`;
  }

  recordRedo({ type, description: `Redo: ${entry.description}`, restore });
  return result;
}

export function performUndo(detection) {
  const { type, details } = detection;

  switch (type) {
    case 'staged': return undoStaged(details);
    case 'in-progress-merge': return undoInProgressMerge(details);
    case 'rebase': return undoRebase(details);
    case 'merge': return undoMerge(details);
    case 'deleted-branch': return undoDeletedBranch(details);
    case 'commit': return undoCommit(details);
    default: return `Unknown action type: ${type}`;
  }
}
