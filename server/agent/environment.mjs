// the server exposes its real local environment so the dashboard can offer real
// dispatch choices: actual folders on this machine + the models available here.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// current Claude models available via Claude Code / the API (see the claude-api ref)
export const AVAILABLE_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', note: 'Most capable', default: true },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: 'Balanced' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Fast' },
];

// scan one level under each root for real directories, surfacing git repos first
export function detectFolders(roots) {
  const home = homedir();
  const bases = roots?.length
    ? roots
    : [home, 'projects', 'code', 'dev', 'src', 'repos', 'Documents'].map((d) => (d === home ? d : join(home, d)));
  const seen = new Set();
  const out = [];

  const add = (path, git) => {
    if (seen.has(path)) return;
    seen.add(path);
    out.push({ path, git });
  };

  for (const base of bases) {
    if (!existsSync(base)) continue;
    if (existsSync(join(base, '.git'))) add(base, true); // base is itself a repo
    let entries = [];
    try { entries = readdirSync(base, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const p = join(base, e.name);
      let git = false;
      try { git = existsSync(join(p, '.git')); } catch { /* unreadable */ }
      add(p, git);
    }
  }

  out.sort((a, b) => Number(b.git) - Number(a.git) || a.path.localeCompare(b.path));
  return out.slice(0, 60);
}
