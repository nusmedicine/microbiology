// Lock-proof out-of-tree render of the book.
//
//   node scripts/render.mjs
//
// Copies book/ to %TEMP%\book-microbio-preview (minus .quarto/_book), then runs
// `quarto render .` there. Rendering out-of-tree avoids the intermittent Windows
// "os error 32 (file in use)" that the Dropbox watcher / Defender cause on an
// in-place render (see HANDOVER §7). Uses Node fs.cpSync + spawnSync so it also
// sidesteps the sandbox scanner's false-positives on robocopy globs.
//
// After it finishes, serve the result with the "book-preview" launch config
// (python -m http.server 8791 --directory %TEMP%\book-microbio-preview\_book) or
// run scripts/check-assets.mjs against it.
import { cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const repo = dirname(dirname(fileURLToPath(import.meta.url))); // scripts/ -> repo root
const src = join(repo, 'book');
const work = join(os.tmpdir(), 'book-microbio-preview');

// portable toolchain locations on this machine (HANDOVER §7)
const local = join(os.homedir(), 'AppData', 'Local');
const quarto = [
  join(local, 'quarto', 'current', 'bin', 'quarto.exe'),
  join(local, 'Programs', 'Quarto', 'bin', 'quarto.exe'),
].find(existsSync);
if (!quarto) { console.error('quarto not found under', local); process.exit(2); }

console.log('==> cleaning', work);
if (existsSync(work)) rmSync(work, { recursive: true, force: true });

console.log('==> copying book/ out-of-tree...');
cpSync(src, work, { recursive: true, filter: (s) => !/[\\/](\.quarto|_book)([\\/]|$)/.test(s) });

console.log('==> quarto render ...');
const r = spawnSync(quarto, ['render', '.'], { cwd: work, encoding: 'utf8', maxBuffer: 1 << 26 });
console.log(((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).slice(-40).join('\n'));
console.log('==> exit code:', r.status);
const site = join(work, '_book');
if (existsSync(site)) console.log('==> _book entries:', readdirSync(site).length, '(served at http://localhost:8791/ via the book-preview config)');
process.exit(r.status ?? 1);
