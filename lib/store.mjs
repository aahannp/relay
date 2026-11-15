// Everything Relay remembers between runs: projects, tasks, worktrees and settings, in one JSON file.
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

// Emits 'event' with { type: 'projects' | 'tasks' | 'settings' | 'sessions' | 'voice', ...details }; pages refetch on it.
export const bus = new EventEmitter();

export const DEFAULTS = {
  projects: [], // { path, name, addedAt, repos? }: repos are other git repos this project's agents changed
  tasks: [],
  chats: [], // every agent conversation, kept after it stops so it can be resumed
  shells: [], // shell panes open at quit, { id, project, cwd, name, createdAt }: Relay opens a fresh one in the same folder
  artifacts: [], // pages and reports agents saved; the HTML itself is in <data>/artifacts
  artifactFolders: [], // names of the Artifacts tab's folders, in order; a page's folder is its `folder` (none = Unfiled)
  messages: [], // the last 500 messages between agents, for the Graph: { at, project, fromId, fromName, toId, toName, via } (never the text)
  groups: [], // named groups on the Graph: { id, project, name, color, members: [chatId, or session id for shells] }
  workersOnSonnet: true, // see load
  removedSpecialists: [], // ids of built-in specialists you removed, so a newer Relay doesn't add them back
  worktrees: {}, // worktree path -> { root, branch, base, taskId, by?, from? } (by and from: a worktree an agent made itself)
  settings: {
    theme: 'midnight',
    accent: '',
    fontSize: 13,
    defaultAgent: 'claude',
    permissionMode: 'default',
    worktreeByDefault: true,
    voiceLang: 'en-US',
    fancyCursor: true,
    lastProject: '',
    browserPanes: {}, // project path -> [{ id, url }]
    pages: null, // { account, repo } last published to on GitHub Pages
    agentsCanSpawn: true, // agents may start other agents (start_agent, start_task)
    agentsCanMessage: true, // agents may message each other (message_agent)
    agentsCanEditTeam: true, // agents may edit a specialist's profile when you ask (update_specialist)
    agentsAutonomous: true, // they message and copy each other without asking you each time
    // Workers on Sonnet; '' = your Claude Code's own. compactWindow: the auto-compact window in tokens (100K–1M) each kind
    // gets, unless your Claude Code sets one (see hookSettingsFile in lib/sessions.mjs).
    agentDefaults: { claude: { model: 'sonnet', effort: '', compactWindow: 300_000 }, lead: { model: 'opus', effort: 'high', compactWindow: 400_000 } },
    // Compact a lead at compactAt % of its window (the lead's compactWindow), and replace it after replaceAfter compactions.
    leadUpkeep: { on: false, compactAt: 70, replaceAfter: 3 },
    scrollSpeed: 1, // terminal scrolling, times how far the trackpad moved
    sidebarHidden: false,
    openSpaces: [], // project paths open side by side in the Agents grid; the first is the current one (none = just the current one)
    agentsAware: true, // agents get a short brief of the workspace at the start, and what changed before each turn
    spacesCanAsk: true, // agents may ask another project folder a question (ask_space) and answer one
    autoUpdate: true, // the Mac app downloads new versions and installs them when you quit it (lib/update.mjs)
    artifactEditModel: 'haiku', // the model behind an artifact's "Edit with AI" chat: small page edits rarely need more
  },
};

let file;
export let db = structuredClone(DEFAULTS);

// The saved object, undefined when there's no file, null when it's corrupt: not JSON (cut short, a stray comma), or not
// shaped like a save (every save has projects and tasks, and each list is a list). A file it may not open throws, as it is.
const shaped = d => d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.projects) && Array.isArray(d.tasks)
  && Object.keys(DEFAULTS).every(k => !(k in d) || Array.isArray(d[k]) === Array.isArray(DEFAULTS[k]));
const read = f => {
  let text;
  try { text = fs.readFileSync(f, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return undefined; throw e; }
  try { const data = JSON.parse(text); return shaped(data) ? data : null; } catch { return null; }
};

// A desk.json that can't be read never stops Relay: the copy from before the last save (desk.json.bak) is loaded instead,
// or, when that's bad too, Relay starts empty. The bad file is kept aside as desk.json.corrupt-<time> either way, so the
// next save can't turn it into the .bak.
export function load(dataDir) {
  file = path.join(dataDir, 'desk.json');
  let saved = read(file);
  if (saved === null) {
    const aside = `${file}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.renameSync(file, aside);
    saved = read(`${file}.bak`);
    console.error(`Relay: ${file} could not be read; kept it as ${aside}. ${saved ? `Loaded ${file}.bak, the copy from before the last save.` : 'No good backup either, so Relay starts empty.'}`);
  } else if (saved === undefined) saved = read(`${file}.bak`); // a save stopped between its two renames
  if (!saved) return;
  db = migrate({ ...structuredClone(DEFAULTS), ...saved, settings: { ...DEFAULTS.settings, ...saved.settings } });
  // Workers moved to Sonnet by default (Opus re-reading context was most of the spend). Once, for the old
  // '' default saved before that; a model you pick in Settings afterwards stays.
  // Teams saved before built-ins were tracked: the first three built-ins missing from yours, you removed.
  if (saved.specialists && !saved.removedSpecialists) db.removedSpecialists = ['christie', 'browner', 'scout'].filter(id => !saved.specialists.some(s => s.id === id));
  if (!saved.workersOnSonnet && db.settings.agentDefaults?.claude?.model === '') db.settings.agentDefaults.claude.model = 'sonnet';
}

// Settings saved by an older version, renamed or reshaped. Exported for check.mjs.
export function migrate(data) {
  const { settings } = data;
  // "Departments" became "spaces": if you turned asking off, it stays off.
  if ('departmentsCanAsk' in settings) {
    settings.spacesCanAsk = settings.departmentsCanAsk !== false;
    delete settings.departmentsCanAsk;
  }
  // "Every folder in one grid" became a list of the spaces open side by side: on means all of them.
  if ('mixFolders' in settings) {
    if (settings.mixFolders === true && !settings.openSpaces?.length) settings.openSpaces = [settings.lastProject, ...data.projects.map(p => p.path)];
    delete settings.mixFolders;
  }
  // The auto-compact window moved next to model and effort, one per kind of agent. Lead upkeep's own window cap only
  // ever lowered the 200K window, so a cap under 200K becomes the lead's (at least Claude Code's 100K); the cap goes either way.
  const had = 'compactWindow' in (settings.agentDefaults?.lead ?? {});
  settings.agentDefaults = Object.fromEntries(['claude', 'lead'].map(k =>
    [k, { compactWindow: DEFAULTS.settings.agentDefaults[k].compactWindow, ...settings.agentDefaults?.[k] }]));
  if (settings.leadUpkeep && 'windowCap' in settings.leadUpkeep) {
    const { windowCap, ...rest } = settings.leadUpkeep;
    if (!had && Number.isInteger(windowCap) && windowCap < 200_000) settings.agentDefaults.lead.compactWindow = Math.max(100_000, windowCap);
    settings.leadUpkeep = rest;
  }
  pruneSpaces(data);
  return data;
}

// Only folders still in the list stay open in the Agents grid, each once.
export function pruneSpaces(data) {
  data.settings.openSpaces = [...new Set(data.settings.openSpaces)].filter(p => data.projects.some(x => x.path === p));
}

// Save, then tell every open page what changed.
export function changed(kind) {
  if (kind !== 'sessions' && file) {
    // Write a temp file, flush it to disk, then rename it over desk.json: a crash or power loss mid-save leaves the old
    // file or the new one, never half. The old one becomes desk.json.bak, which load falls back to.
    const fd = fs.openSync(`${file}.tmp`, 'w');
    try {
      fs.writeFileSync(fd, JSON.stringify(db, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try { fs.renameSync(file, `${file}.bak`); } catch {} // the first save has no old file
    fs.renameSync(`${file}.tmp`, file);
  }
  bus.emit('event', { type: kind });
}
