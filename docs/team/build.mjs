// Builds the Team pages from lib/team.mjs, so the instructions on the site are the app's own text.
// Run from the repo root after changing a built-in: node docs/team/build.mjs
// Writes docs/team.html (the directory), docs/team/<id>.html (one per specialist) and
// docs/team/agents/<id>.md (a ready Claude Code subagent file).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.dirname(here);
const site = 'https://aahannp.github.io/relay';

// The BUILT_IN array literal, read as text (importing lib/team.mjs would load the app's store) and
// evaluated: it's this repo's own source, plain object literals.
const src = fs.readFileSync(path.join(docs, '../lib/team.mjs'), 'utf8');
const literal = src.slice(src.indexOf('[', src.indexOf('export const BUILT_IN')), src.indexOf('\n];', src.indexOf('export const BUILT_IN')) + 3);
const team = new Function(`return ${literal}`)();

// What the app doesn't hold: tags, an example prompt and related specialists, for the site only.
const extra = {
  christie: { tags: ['learning', 'teaching', 'exercises'], ask: 'Teach me how git worktrees work, one small step at a time.', related: ['scout', 'browner', 'archie'] },
  browner: { tags: ['frontend', 'accessibility', 'performance'], ask: 'Make the settings page work at phone width and with a keyboard.', related: ['tess', 'vera', 'scout'] },
  scout: { tags: ['search', 'code reading', 'quick answers'], ask: 'Where is the Reply button handled, and what calls it?', related: ['archie', 'sherlock', 'christie'] },
  archie: { tags: ['design', 'planning', 'tasks'], ask: 'Design a task status history feature and split it into tasks.', related: ['vera', 'nova', 'scout'] },
  vera: { tags: ['code review', 'bugs', 'diffs'], ask: 'Review the diff on this branch before we merge it.', related: ['sherlock', 'tess', 'archie'] },
  sherlock: { tags: ['debugging', 'root cause', 'tests'], ask: 'Reply to selection does nothing. Find why, then fix it.', related: ['tess', 'vera', 'scout'] },
  tess: { tags: ['testing', 'verification'], ask: "Prove that a typed message can't answer a permission prompt.", related: ['sherlock', 'vera', 'browner'] },
  cassie: { tags: ['critique', 'architecture', 'research'], ask: 'Critique this benchmark plan. What would you cut?', related: ['nova', 'archie', 'vera'] },
  nova: { tags: ['strategy', 'product', 'research'], ask: "Review what we've built so far and rank what to build next.", related: ['cassie', 'archie', 'christie'] },
};
for (const s of team) {
  if (!extra[s.id]) throw new Error(`No site extras for ${s.id}: add it to extra in docs/team/build.mjs`);
  const i = s.role.indexOf(': ');
  Object.assign(s, extra[s.id], { title: s.role.slice(0, i), when: s.role[i + 2].toUpperCase() + s.role.slice(i + 3) + '.' });
}
const byId = Object.fromEntries(team.map(s => [s.id, s]));

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const access = s => (s.readOnly ? 'Read-only' : 'Can edit');

// A Claude Code subagent file: frontmatter, then the instructions as the system prompt.
const agentFile = s => [
  '---',
  `name: ${s.id}`,
  `description: ${JSON.stringify(s.role)}`,
  `model: ${s.model}`,
  ...(s.readOnly ? ['disallowedTools: Edit, Write, NotebookEdit'] : []),
  '---',
  '',
  s.instructions,
  '',
].join('\n');

const page = ({ up, title, desc, url, nav, body }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="color-scheme" content="dark light">
<link rel="canonical" href="${site}/${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${site}/assets/relay-og.png">
<link rel="icon" href="${up}assets/relay-favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}assets/relay-180.png">
<script>try { const t = localStorage.getItem('theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch {}</script>
<link rel="stylesheet" href="${up}team/team.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap">
    <a class="brand" href="${up || './'}"><span class="mark" aria-hidden="true"></span>Relay</a>
    <nav class="nav-links" aria-label="Site">
      <a href="${up || './'}">Home</a>
      <a href="${up}team.html"${nav === 'team' ? ' aria-current="page"' : ''}>Team</a>
    </nav>
    <button class="theme" id="themeToggle" type="button" aria-label="Switch to light mode">
      <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
    <a class="pill sm" data-download href="https://github.com/aahannp/relay/releases/latest">Download</a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer>
  <div class="wrap">
    <p class="top">Claude Code is a trademark of Anthropic. Mac and Apple silicon are trademarks of Apple Inc.</p>
    <div class="row">
      <span>Relay · MIT licence</span>
      <nav aria-label="Footer">
        <a href="${up || './'}">Home</a>
        <a href="${up}team.html">Team</a>
        <a href="https://github.com/aahannp/relay">GitHub</a>
        <a href="https://github.com/aahannp/relay/releases">Releases</a>
        <a href="https://github.com/aahannp/relay/issues">Issues</a>
        <a href="${up}verify.html">Verify a download</a>
        <a href="https://github.com/aahannp/relay/blob/main/LICENSE">Licence</a>
      </nav>
    </div>
  </div>
</footer>
<script src="${up}team/team.js"></script>
</body>
</html>
`;

const card = (s, up) => `<a class="card" href="${up}team/${s.id}.html" data-model="${s.model}" data-access="${s.readOnly ? 'read' : 'edit'}" data-find="${esc([s.name, s.role, ...s.tags].join(' ').toLowerCase())}">
  <span class="card-main">
    <span class="card-name"><b>${esc(s.name)}</b>${s.readOnly ? '<span class="badge">Read-only</span>' : ''}</span>
    <span class="card-role">${esc(s.title)}. ${esc(s.when)}</span>
    <span class="tags">${s.tags.map(t => `<span>${esc(t)}</span>`).join('')}</span>
  </span>
  <span class="card-run">${s.model}<small>${s.effort} effort</small></span>
</a>`;

const copyBox = (id, text, lang) => `<div class="cmd"><code id="${id}"${lang ? ` class="${lang}"` : ''}>${esc(text)}</code><button type="button" class="copy" data-copy="${id}">Copy</button></div>`;

const filter = (name, label, opts) => `<fieldset class="seg"><legend>${label}</legend>${opts.map(([v, t], i) => `<label><input type="radio" name="${name}" value="${v}"${i ? '' : ' checked'}><span>${t}</span></label>`).join('')}</fieldset>`;

// The directory.
const models = [...new Set(team.map(s => s.model))];
fs.writeFileSync(path.join(docs, 'team.html'), page({
  up: '', nav: 'team', url: 'team.html', title: 'The team · Relay',
  desc: `Relay's ${team.length} built-in specialists: what each is for, its model and effort, and its full instructions. Use them in Relay, or as Claude Code subagents.`,
  body: `<div class="wrap">
  <header class="head">
    <h1>The team.</h1>
    <p class="lede">Relay ships a team of built-in specialists. You hand one a job with a clear prompt. Each has its own instructions, model and effort. A lead agent can start several in parallel, each in its own git worktree.</p>
  </header>
  <div class="dir">
    <aside class="side" aria-label="Filter specialists">
      <label class="lbl" for="q">Search</label>
      <input id="q" type="search" placeholder="Try: review, tests, UI" autocomplete="off" spellcheck="false">
      ${filter('access', 'Access', [['', 'All'], ['edit', 'Can edit'], ['read', 'Read-only']])}
      ${filter('model', 'Model', [['', 'All'], ...models.map(m => [m, m])])}
      <p class="fine" id="count" aria-live="polite">${team.length} specialists</p>
    </aside>
    <div class="list" id="list">
      ${team.map(s => card(s, '')).join('\n      ')}
      <p class="none" id="none" hidden>No specialist matches. Clear the search or pick All.</p>
    </div>
  </div>

  <section class="stories" id="practice" aria-labelledby="practiceTitle">
    <h2 id="practiceTitle">How it works in practice</h2>
    <p class="sub">Three real stories from the last few days of building Relay with Relay.</p>
    <article class="story">
      <span class="kicker">Relay 1.10.10 → 1.10.11</span>
      <h3>A reply bug, fixed the same day</h3>
      <ol class="steps">
        <li>A user reported: <b>"Reply to selection does nothing."</b></li>
        <li><a href="team/sherlock.html"><b>Sherlock</b></a> reproduced it in a hidden window against the real Claude Code.</li>
        <li>The cause: Claude Code runs full screen and takes the mouse, so the terminal had no selection.</li>
        <li>The fix uses the text Claude sends when you release the mouse, with a test that drags, right-clicks and opens the box.</li>
        <li>A follow-up: the Reply button stayed on screen after sending. It got a test that failed first, then the fix.</li>
      </ol>
    </article>
    <article class="story">
      <span class="kicker">Relay 1.10.8</span>
      <h3>A message can't answer a permission prompt</h3>
      <ol class="steps">
        <li><a href="team/cassie.html"><b>Cassie</b></a>'s critique ranked it a top risk.</li>
        <li><a href="team/sherlock.html"><b>Sherlock</b></a> built the fix.</li>
        <li><a href="team/vera.html"><b>Vera</b></a>'s review found one serious issue and three smaller ones. One example: a pane could stay marked "needs you" for good.</li>
        <li><b>Sherlock</b> fixed all four, each with a test.</li>
        <li><a href="team/tess.html"><b>Tess</b></a> proved it against the real Claude Code permission dialog: 36 timed runs, and none answered the dialog.</li>
      </ol>
    </article>
    <article class="story">
      <span class="kicker">Cassie</span>
      <h3>Doing less</h3>
      <ol class="steps">
        <li>A design for a benchmark suite had four parts.</li>
        <li><a href="team/cassie.html"><b>Cassie</b></a>'s review asked of each number: <b>"If it came out high or low, what would you do differently?"</b></li>
        <li>That cut it to two small pieces: CI time and task status history. A speed script that measured the wrong layer was dropped.</li>
      </ol>
    </article>
    <p class="fine">Workflow numbers, like reopened tasks and time to done, are being collected from Relay 1.10.9 and will be added here later.</p>
  </section>

  <section class="get">
    <h2>Meet them in Relay</h2>
    <a class="pill" data-download href="https://github.com/aahannp/relay/releases/latest">Download for Mac</a>
    <p class="fine">Free and open source under the MIT licence. For Macs with Apple silicon on macOS 13 or later. Requires Claude Code.</p>
  </section>
</div>`,
}));

// One page per specialist, plus its subagent file.
fs.mkdirSync(path.join(here, 'agents'), { recursive: true });
for (const s of team) {
  const file = agentFile(s);
  fs.writeFileSync(path.join(here, 'agents', `${s.id}.md`), file);
  const tool = `start_agent {"specialist": "${s.name}", "prompt": ${JSON.stringify(s.ask)}}`;
  const install = `mkdir -p .claude/agents && curl -fsSL ${site}/team/agents/${s.id}.md -o .claude/agents/${s.id}.md`;
  fs.writeFileSync(path.join(here, `${s.id}.html`), page({
    up: '../', nav: 'team', url: `team/${s.id}.html`, title: `${s.name}, ${s.title.toLowerCase()} · Relay`,
    desc: `${s.name}: ${s.role}. A Relay built-in specialist, also usable as a Claude Code subagent.`,
    body: `<div class="wrap narrow">
  <a class="back" href="../team.html">‹ All specialists</a>
  <header class="spec">
    <h1>${esc(s.name)} <span class="badge">${access(s)}</span></h1>
    <p class="lede">${esc(s.title)}. ${esc(s.when)}</p>
    <p class="meta"><span>By Relay built-in</span><span>${s.model} · ${s.effort} effort</span></p>
    <p class="tags">${s.tags.map(t => `<span>${esc(t)}</span>`).join('')}</p>
    <p class="lbl">Works with</p>
    <p class="tags works"><span>Claude Code</span><span class="relay">Relay</span></p>
  </header>

  <dl class="runs">
    <div><dt>Model</dt><dd>${s.model}</dd></div>
    <div><dt>Effort</dt><dd>${s.effort}</dd></div>
    <div><dt>Access</dt><dd>${s.readOnly ? 'Read-only: looks and reports, never edits files' : 'Can edit files in its own worktree'}</dd></div>
  </dl>

  <section class="use" aria-labelledby="useTitle">
    <h2 id="useTitle" class="sr-only">Use it</h2>
    <div class="tabs" role="tablist" aria-label="Where to use ${esc(s.name)}">
      <button type="button" role="tab" id="t-relay" aria-controls="p-relay" aria-selected="true">In Relay</button>
      <button type="button" role="tab" id="t-cc" aria-controls="p-cc" aria-selected="false" tabindex="-1">Claude Code subagent</button>
    </div>
    <div class="panel" role="tabpanel" id="p-relay" aria-labelledby="t-relay">
      <p class="lbl">Ask the lead</p>
      ${copyBox('askLead', `Have ${s.name} do this: ${s.ask}`)}
      <p class="lbl">Or have an agent call the tool</p>
      ${copyBox('tool', tool)}
      <p class="fine">${s.name} is built in: there's nothing to install. Change its model, effort or instructions in Relay's Team settings.</p>
    </div>
    <div class="panel" role="tabpanel" id="p-cc" aria-labelledby="t-cc">
      <p class="lbl">Install into this project</p>
      ${copyBox('install', install)}
      <p class="fine">Saves <code>.claude/agents/${s.id}.md</code> in the current project; use <code>~/.claude/agents/</code> for every project. Outside Relay, the Relay-only tools it mentions (like start_agent or save_artifact) aren't there; the rest works as is.</p>
    </div>
  </section>

  <p class="acts">
    <button type="button" class="ghost" data-copy="file">Copy ${s.id}.md</button>
    <a class="ghost" href="agents/${s.id}.md" download="${s.id}.md">Download ${s.id}.md</a>
  </p>

  <section class="viewer" aria-labelledby="fileTitle">
    <header><h2 id="fileTitle">.claude/agents/${s.id}.md</h2><button type="button" class="copy" data-copy="file">Copy</button></header>
    <pre tabindex="0" aria-label="${esc(s.name)}'s subagent file, with its full instructions"><code id="file">${esc(file)}</code></pre>
  </section>

  <section class="when" aria-labelledby="whenTitle">
    <h2 id="whenTitle">When to use it</h2>
    <p>${esc(s.when)}</p>
    <p class="lbl">Example prompt</p>
    ${copyBox('ask', s.ask)}
  </section>

  <section class="related" aria-labelledby="relTitle">
    <h2 id="relTitle">Related specialists</h2>
    <div class="list">
      ${s.related.map(id => card(byId[id], '../')).join('\n      ')}
    </div>
    <a class="more" href="../team.html">All specialists</a>
  </section>
</div>`,
  }));
}
console.log(`Wrote team.html and ${team.length} specialist pages.`);
