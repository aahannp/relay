// Relay in a VS Code tab: runs Relay's own server inside the extension host and shows its page in a webview.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { randomBytes } = require('node:crypto');
const vscode = require('vscode');

let relay = null; // the server this window started: { url, token, close }
let panel = null;

// The .vsix carries the server next to this file (see build.mjs); run from the repo, it is one folder up.
const serverFile = () => [path.join(__dirname, 'server.mjs'), path.join(__dirname, '..', 'server.mjs')].find(f => fs.existsSync(f));

async function alive(port, token) {
  try {
    return (await fetch(`http://127.0.0.1:${port}/api/info`, { headers: { 'x-desk-token': token }, signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
}

// Every VS Code window shares one data folder, so a second window uses the first one's server instead of
// starting another that would write the same files.
async function server(dataDir) {
  if (relay) return relay;
  const portFile = path.join(dataDir, 'vscode-port');
  const token = (() => { try { return fs.readFileSync(path.join(dataDir, 'token'), 'utf8').trim(); } catch { return ''; } })();
  const port = Number((() => { try { return fs.readFileSync(portFile, 'utf8'); } catch { return 0; } })());
  if (port && token && await alive(port, token)) return { url: `http://127.0.0.1:${port}`, token };
  const { start } = await import(pathToFileURL(serverFile()).href);
  const s = await start({ port: 0, dataDir, vscode: true }); // never 4848/4849, the Mac apps' ports
  fs.writeFileSync(portFile, String(s.port));
  return (relay = { url: `http://127.0.0.1:${s.port}`, token: s.token, close: s.close });
}

async function open(context) {
  if (panel) return panel.reveal();
  const dataDir = context.globalStorageUri.fsPath;
  const s = await server(dataDir);
  // The open folder becomes the project (a space), as if added with New space.
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (folder) {
    await fetch(`${s.url}/api/projects`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-desk-token': s.token }, body: JSON.stringify({ path: folder }),
    });
  }
  const page = new URL(`${s.url}/`);
  page.searchParams.set('t', s.token);
  if (folder) page.searchParams.set('project', folder);
  const src = (await vscode.env.asExternalUri(vscode.Uri.parse(page.href))).toString(true);
  const origin = new URL(src).origin;

  panel = vscode.window.createWebviewPanel('relay', 'Relay', vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
  panel.onDidDispose(() => { panel = null; });
  // Relay asks to open links here (VS Code's frame blocks popups); only web links go to the browser.
  panel.webview.onDidReceiveMessage(m => {
    if (/^https?:\/\//i.test(m?.open ?? '')) vscode.env.openExternal(vscode.Uri.parse(m.open, true));
  });
  const nonce = randomBytes(16).toString('base64');
  panel.webview.html = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'">
<style>html, body, iframe { margin: 0; padding: 0; border: 0; width: 100%; height: 100%; overflow: hidden; display: block; }</style>
</head><body><iframe src="${src.replace(/"/g, '&quot;')}" allow="clipboard-read; clipboard-write"></iframe>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
addEventListener('message', e => { if (e.origin === ${JSON.stringify(origin)} && e.data && e.data.open) vscode.postMessage({ open: e.data.open }); });
</script></body></html>`;
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('relay.open', () => open(context).catch(e => {
    vscode.window.showErrorMessage(`Relay couldn't start: ${e.message}`);
  })));
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.text = '$(radio-tower) Relay';
  item.tooltip = 'Open Relay';
  item.command = 'relay.open';
  item.show();
  context.subscriptions.push(item);
}

function deactivate() {
  relay?.close(); // stops this window's agents and shells with it
}

module.exports = { activate, deactivate };
