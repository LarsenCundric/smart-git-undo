#!/usr/bin/env node

import { isInsideWorkTree } from './git.js';
import { detect } from './detector.js';
import { performUndo } from './actions.js';
import { getHistory } from './stack.js';
import { printDetection, printDryRun, printResult, printError, printNothing, printHistory } from './ui.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const showHistory = args.includes('--history');

try {
  if (!isInsideWorkTree()) {
    printError('Not inside a git repository.');
    process.exit(1);
  }

  if (showHistory) {
    printHistory(getHistory());
    process.exit(0);
  }

  const detection = detect();

  if (!detection) {
    printNothing();
    process.exit(0);
  }

  if (dryRun) {
    printDryRun(detection);
    process.exit(0);
  }

  printDetection(detection);
  const result = performUndo(detection);
  printResult(result);
} catch (err) {
  printError(err.message || String(err));
  process.exit(1);
}
