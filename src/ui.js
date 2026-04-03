import chalk from 'chalk';

const ICONS = {
  detect: '\u{1F50D}',
  undo: '\u21A9\uFE0F ',
  redo: '\u21AA\uFE0F ',
  info: '\u2139\uFE0F ',
  warn: '\u26A0\uFE0F ',
  ok: '\u2705',
  staged: '\u{1F4E6}',
  commit: '\u{1F4DD}',
  merge: '\u{1F500}',
  rebase: '\u{1F504}',
  branch: '\u{1F33F}',
  history: '\u{1F4DC}',
  dry: '\u{1F441}\uFE0F ',
};

export function printDetection(detection) {
  const icon = getIcon(detection.type);
  console.log();
  console.log(chalk.cyan.bold(`${ICONS.detect} Detected: `) + chalk.white(detection.description));
  console.log(chalk.dim(`   Type: ${detection.type}`));

  if (detection.type === 'staged' && detection.details.files) {
    const files = detection.details.files;
    const shown = files.slice(0, 5);
    for (const f of shown) {
      console.log(chalk.dim(`   - ${f}`));
    }
    if (files.length > 5) {
      console.log(chalk.dim(`   ... and ${files.length - 5} more`));
    }
  }
}

export function printDryRun(detection) {
  console.log();
  console.log(chalk.yellow.bold(`${ICONS.dry} Dry run — nothing will be changed`));
  printDetection(detection);
  console.log();
  console.log(chalk.yellow(`   Would execute: `) + chalk.white(describeAction(detection)));
  console.log();
}

export function printResult(message) {
  console.log();
  console.log(chalk.green.bold(`${ICONS.ok} `) + chalk.white(message));
  console.log();
}

export function printRedoResult(message) {
  console.log();
  console.log(chalk.blue.bold(`${ICONS.redo} Redo: `) + chalk.white(message));
  console.log();
}

export function printError(message) {
  console.log();
  console.log(chalk.red.bold(`${ICONS.warn} `) + chalk.red(message));
  console.log();
}

export function printNothing() {
  console.log();
  console.log(chalk.yellow(`${ICONS.info} Nothing to undo.`));
  console.log(chalk.dim('   No recent git action detected that can be undone.'));
  console.log();
}

export function printHistory(history) {
  const { done, redoable } = history;

  console.log();
  console.log(chalk.cyan.bold(`${ICONS.history} Undo/Redo History`));
  console.log();

  if (done.length === 0 && redoable.length === 0) {
    console.log(chalk.dim('   No history yet.'));
    console.log();
    return;
  }

  if (done.length > 0) {
    console.log(chalk.green.bold('   Actions') + chalk.dim(' (newest first):'));
    for (let i = done.length - 1; i >= 0; i--) {
      const e = done[i];
      const time = new Date(e.timestamp).toLocaleString();
      const icon = e.action === 'redo' ? ICONS.redo : ICONS.undo;
      const color = e.action === 'redo' ? chalk.blue : chalk.green;
      console.log(color(`   ${icon} ${e.description}`) + chalk.dim(` — ${time}`));
    }
    console.log();
  }

  if (redoable.length > 0) {
    console.log(chalk.blue.bold('   Available to redo') + chalk.dim(` (${redoable.length}):`));
    for (let i = redoable.length - 1; i >= 0; i--) {
      const e = redoable[i];
      console.log(chalk.blue(`   ${ICONS.redo} ${e.description}`));
    }
    console.log();
  }
}

function getIcon(type) {
  const map = {
    staged: ICONS.staged,
    'in-progress-merge': ICONS.merge,
    rebase: ICONS.rebase,
    merge: ICONS.merge,
    'deleted-branch': ICONS.branch,
    commit: ICONS.commit,
  };
  return map[type] || ICONS.info;
}

function describeAction(detection) {
  switch (detection.type) {
    case 'staged':
      return `git reset HEAD -- <${detection.details.files.length} files>`;
    case 'in-progress-merge':
      return 'git merge --abort';
    case 'rebase':
      return `git reset --hard ${detection.details.preRebaseSha.slice(0, 7)}`;
    case 'merge':
      return 'git reset --hard HEAD~1';
    case 'deleted-branch':
      return `git branch ${detection.details.branch} ${detection.details.sha.slice(0, 7)}`;
    case 'commit':
      return 'git reset --soft HEAD~1';
    default:
      return '(unknown)';
  }
}
