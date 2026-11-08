// Builds dist/relay-<version>.vsix: this extension plus Relay's server, page and the production node_modules
// they load. Not published anywhere; teammates install the file.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.dirname(import.meta.dirname);
// npm masks id-like folder names (this repo often sits under one) in what it prints, and vsce reads npm's
// output to find node_modules, so the package is put together in a temp folder.
const STAGE = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-vsix-'));
// As the Mac app's build leaves out: source maps, monaco's unused builds, node-pty's sources and Windows binaries.
const SKIP = /\.map$|\.DS_Store$|\.zsh_history$|\/monaco-editor\/(esm|dev)(\/|$)|\/node-pty\/(deps|src|third_party|prebuilds\/win32-[^/]*)(\/|$)/;
const { version, dependencies } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const copy = (from, to = from) => fs.cpSync(path.join(ROOT, from), path.join(STAGE, to), { recursive: true, filter: f => !SKIP.test(f) });
for (const f of ['server.mjs', 'lib', 'public', 'shell', 'LICENSE']) copy(f);
for (const f of ['extension.cjs', 'README.md']) copy(`vscode/${f}`, f);
const deps = execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: ROOT }).toString().trim().split('\n').slice(1);
for (const dir of deps) copy(dir.slice(dir.indexOf('/node_modules/') + 1));
// The server reads its version from the package.json beside lib/, so it is Relay's.
const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify({ ...manifest, version, dependencies }, null, 2));
const vsix = path.join(import.meta.dirname, 'dist', `relay-${version}.vsix`);
fs.mkdirSync(path.dirname(vsix), { recursive: true });
try {
  execFileSync('npx', ['--yes', '@vscode/vsce@4.0.0', 'package', '--out', vsix], { cwd: STAGE, stdio: 'inherit' });
} finally {
  fs.rmSync(STAGE, { recursive: true, force: true });
}
