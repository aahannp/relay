// The Team pages: theme toggle, Copy buttons, Use-it tabs, the directory's filters and the Download link.
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Light/dark, shared with index.html through localStorage.
const themeBtn = $('#themeToggle');
const light = matchMedia('(prefers-color-scheme: light)');
const isDark = () => (root.dataset.theme || (light.matches ? 'light' : 'dark')) === 'dark';
const label = () => themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode');
themeBtn.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  label();
});
light.addEventListener('change', label);
label();

// Copy: data-copy names the element whose text goes on the clipboard; without clipboard access, select it.
for (const b of $$('[data-copy]')) b.addEventListener('click', () => {
  const code = document.getElementById(b.dataset.copy), was = b.textContent;
  navigator.clipboard.writeText(code.textContent).then(() => { b.textContent = 'Copied'; setTimeout(() => (b.textContent = was), 1500); }, () => getSelection().selectAllChildren(code));
});

// Tabs, with arrow keys between them. Without this script both panels simply show.
const tabs = $$('[role="tab"]');
const show = t => {
  for (const x of tabs) {
    const on = x === t;
    x.setAttribute('aria-selected', on);
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
  }
};
for (const t of tabs) {
  t.addEventListener('click', () => show(t));
  t.addEventListener('keydown', e => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    const next = tabs[(tabs.indexOf(t) + step + tabs.length) % tabs.length];
    show(next);
    next.focus();
  });
}
if (tabs.length) show(tabs[0]);

// Directory filters: search text, access and model.
const q = $('#q');
if (q) {
  const cards = $$('#list .card');
  const apply = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const access = $('input[name="access"]:checked').value, model = $('input[name="model"]:checked').value;
    let n = 0;
    for (const c of cards) {
      const ok = words.every(w => c.dataset.find.includes(w)) && (!access || c.dataset.access === access) && (!model || c.dataset.model === model);
      c.hidden = !ok;
      n += ok;
    }
    $('#count').textContent = `${n} of ${cards.length} specialists`;
    $('#none').hidden = n > 0;
  };
  q.addEventListener('input', apply);
  for (const r of $$('.seg input')) r.addEventListener('change', apply);
}

// Download links fetch the latest release's .dmg directly; without GitHub's API they keep the releases page.
fetch('https://api.github.com/repos/aahannp/relay/releases/latest')
  .then(r => r.ok ? r.json() : Promise.reject())
  .then(rel => {
    const dmg = (rel.assets || []).find(a => /\.dmg$/i.test(a.name));
    if (dmg) for (const a of $$('[data-download]')) a.href = dmg.browser_download_url;
  })
  .catch(() => {});
