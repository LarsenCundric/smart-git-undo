import { execSync } from 'node:child_process';

export function git(args, { silent = false, allowFailure = false } = {}) {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    if (allowFailure) return null;
    throw err;
  }
}

export function gitLines(args, opts) {
  const out = git(args, { silent: true, ...opts });
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

export function getGitDir() {
  return git('rev-parse --git-dir', { silent: true });
}

export function isInsideWorkTree() {
  try {
    git('rev-parse --is-inside-work-tree', { silent: true });
    return true;
  } catch {
    return false;
  }
}

export function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD', { silent: true, allowFailure: true });
}

export function getHeadSha() {
  return git('rev-parse HEAD', { silent: true, allowFailure: true });
}

export function getShortSha(sha) {
  return git(`rev-parse --short ${sha}`, { silent: true, allowFailure: true });
}

export function getCommitMessage(sha) {
  return git(`log -1 --format=%s ${sha}`, { silent: true, allowFailure: true });
}
