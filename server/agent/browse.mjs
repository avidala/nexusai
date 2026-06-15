// native folder picker — the dashboard (a browser) can't open a real OS file
// dialog, so it asks the server (this process, on the user's machine) to open it.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexecFile = promisify(execFile);

// open the native macOS Finder folder chooser and return the absolute path
export async function chooseFolderNative() {
  if (process.platform !== 'darwin') {
    throw new Error('native folder picker is only available on macOS');
  }
  const { stdout } = await pexecFile('osascript', [
    '-e', 'POSIX path of (choose folder with prompt "Select a working folder for NexusAI")',
  ], { timeout: 180000 });
  return stdout.trim().replace(/\/+$/, ''); // drop trailing slash
}
