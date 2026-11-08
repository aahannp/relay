# Relay for VS Code

Relay (agent panes, board, review, team) in a VS Code tab, without the Mac app. The extension runs Relay's own
server inside VS Code and shows its page, so it is the same Relay, with its own data.

## Install

You need VS Code 1.143 or newer on a Mac, and Claude Code (`claude`) on your PATH.

```sh
code --install-extension relay-1.10.1.vsix
```

Then run **Relay: Open** from the command palette (or click **Relay** in the status bar). The folder open in
VS Code becomes a space in Relay.

## Build the .vsix

From the repo root:

```sh
npm install
npm run vsix   # writes vscode/dist/relay-<version>.vsix
```

## How it differs from the Mac app

- Its data lives in VS Code's storage for the extension, never in the Mac app's, and it runs on a free port,
  so it can run beside the Mac app.
- Open VS Code windows share one Relay: the first window to open it runs it, and closing that window stops its
  agents and shells.
- No voice input and no in-app updates (install a newer .vsix instead). Screen capture depends on VS Code
  allowing it; pasting or dropping an image into Screenshots always works. Links open in your browser.
