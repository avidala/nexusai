// compute the real file changes an agent made in the working dir, via git, so the
// dashboard can show actual diffs. Captures a baseline before the run, then diffs
// against it afterwards (covers both committed and uncommitted changes) plus
// untracked files. Returns the shape the FileDiffViewer expects.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const pexecFile = promisify(execFile);
const MAX_FILES = 40;
const MAX_BYTES = 200_000;

function resolveDir(dir) {
  if (!dir || dir === '~') return homedir();
  if (dir.startsWith('~/')) return dir.replace(/^~/, homedir());
  return dir;
}

async function git(cwd, args) {
  const { stdout } = await pexecFile('git', ['-C', cwd, ...args], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

// the commit the working dir is at before the run; null if not a git repo
export async function gitBaseline(workingDir) {
  try {
    return (await git(resolveDir(workingDir), ['rev-parse', 'HEAD'])).trim();
  } catch {
    return null;
  }
}

export async function collectChangedFiles(workingDir, baseline) {
  const cwd = resolveDir(workingDir);
  try {
    await git(cwd, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    return []; // not a git repo — nothing to diff
  }

  const files = new Map(); // path -> status
  if (baseline) {
    let out = '';
    try { out = await git(cwd, ['diff', '--name-status', baseline]); } catch { /* ignore */ }
    for (const line of out.split('\n').filter(Boolean)) {
      const parts = line.split('\t');
      const code = parts[0][0];
      const path = parts[parts.length - 1];
      files.set(path, code === 'A' ? 'added' : code === 'D' ? 'deleted' : 'modified');
    }
  }
  // untracked files (new, not yet added)
  let untracked = '';
  try { untracked = await git(cwd, ['ls-files', '--others', '--exclude-standard']); } catch { /* ignore */ }
  for (const p of untracked.split('\n').filter(Boolean)) if (!files.has(p)) files.set(p, 'added');

  const result = [];
  for (const [path, status] of files) {
    if (result.length >= MAX_FILES) break;
    let before = '';
    let after = '';
    if (status !== 'added' && baseline) {
      try { before = await git(cwd, ['show', `${baseline}:${path}`]); } catch { /* ignore */ }
    }
    if (status !== 'deleted') {
      try {
        const buf = await readFile(join(cwd, path));
        after = buf.length <= MAX_BYTES ? buf.toString('utf8') : '(file too large to preview)';
      } catch { /* ignore */ }
    }
    let additions = 0;
    let deletions = 0;
    try {
      const ns = (await git(cwd, ['diff', '--numstat', baseline || 'HEAD', '--', path])).trim().split('\t');
      if (ns.length >= 2 && ns[0] !== '-') { additions = parseInt(ns[0], 10) || 0; deletions = parseInt(ns[1], 10) || 0; }
      else if (status === 'added') additions = after ? after.split('\n').length : 0;
    } catch {
      if (status === 'added') additions = after ? after.split('\n').length : 0;
    }
    result.push({ path, status, before, after, additions, deletions });
  }
  return result;
}
