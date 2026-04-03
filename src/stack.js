import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getGitDir } from './git.js';

function getStackDir() {
  const dir = join(getGitDir(), 'undo-stack');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return fallback;
  }
}

function getStackPath() {
  return join(getStackDir(), 'stack.json');
}

function loadStack() {
  return readJson(getStackPath(), { done: [], redoable: [] });
}

function saveStack(stack) {
  writeFileSync(getStackPath(), JSON.stringify(stack, null, 2));
}

/**
 * Record that an undo was performed. The entry contains info to redo it.
 * This pushes to the redoable stack (user can redo) and records in done (history).
 */
export function recordUndo(entry) {
  const stack = loadStack();
  const timestamped = { ...entry, timestamp: new Date().toISOString() };
  stack.done.push(timestamped);
  stack.redoable.push(timestamped);
  saveStack(stack);
}

/**
 * Pop the most recent redoable entry. Returns null if nothing to redo.
 */
export function popRedoable() {
  const stack = loadStack();
  const entry = stack.redoable.pop();
  if (entry) {
    saveStack(stack);
  }
  return entry || null;
}

/**
 * Record that a redo was performed (goes into done history).
 */
export function recordRedo(entry) {
  const stack = loadStack();
  stack.done.push({ ...entry, timestamp: new Date().toISOString(), action: 'redo' });
  saveStack(stack);
}

export function getHistory() {
  const stack = loadStack();
  return {
    done: [...stack.done],
    redoable: [...stack.redoable],
  };
}
