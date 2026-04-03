#!/usr/bin/env node

import { isInsideWorkTree } from './git.js';
import { popRedoable } from './stack.js';
import { redo } from './actions.js';
import { printRedoResult, printError } from './ui.js';

try {
  if (!isInsideWorkTree()) {
    printError('Not inside a git repository.');
    process.exit(1);
  }

  const entry = popRedoable();

  if (!entry) {
    printError('Nothing to redo.');
    process.exit(0);
  }

  const result = redo(entry);
  printRedoResult(result);
} catch (err) {
  printError(err.message || String(err));
  process.exit(1);
}
