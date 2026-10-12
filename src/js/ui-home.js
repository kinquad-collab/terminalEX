/* TerminalEX — home page, lessons and guides, the History & Lineage page, badges, and the student menu. */
(function () {
  'use strict';
  const TX = window.TX;
  const UI = TX.UI;
  const esc = UI.esc;
  const $ = (s, r = document) => r.querySelector(s);

  // ------------------------------------------------------------------ full-screen pages
  // One overlay (#page) shows the cheat sheet, the history page, badges, a test or a certificate.
  UI.openPage = (id, title, html, opts = {}) => {
    let p = $('#page');
    if (!p) { p = document.createElement('div'); p.id = 'page'; document.getElementById('app').appendChild(p); }
    p.className = 'page ' + (opts.cls || '');
    p.dataset.page = id;
    p.innerHTML = `<div class="page-bar"><button class="ux-btn ghost page-back">← ${opts.back || 'Back'}</button><h1>${title}</h1><div class="page-tools">${opts.tools || ''}</div></div><div class="page-body">${html}</div>`;
    p.hidden = false;
    document.body.classList.add('page-open');
    p.querySelector('.page-back').addEventListener('click', () => (opts.onBack ? opts.onBack() : UI.closePage()));
    p.scrollTop = 0;
    return p;
  };
  UI.closePage = () => { const p = $('#page'); if (p) { p.hidden = true; p.innerHTML = ''; } document.body.classList.remove('page-open'); if (TX.app && TX.app.active) TX.app.active.focus(); };

  // ------------------------------------------------------------------ welcome / name lock
  UI.welcome = () => {
    if (UI.state.name) return;
    const m = UI.modal('Welcome to TerminalEX', `
      <p>Type your <b>first and last name</b> as you want it on your certificates.</p>
      <input class="ux-input" id="w-name" maxlength="40" autocomplete="off" placeholder="First Last">
      <p class="ux-err" id="w-err" hidden></p>
      <p class="ux-dim">Your name is locked once you confirm it. Nothing is sent anywhere: your progress stays in this browser and in the progress file you save.</p>
      <p><button class="linkish" id="w-load">Coming back? Load your progress file</button></p>`, [{ text: 'Continue', primary: true, onclick: (ov) => {
      const v = UI.validName($('#w-name', ov).value);
      if (!v) { const e = $('#w-err', ov); e.hidden = false; e.textContent = 'Please type a first AND last name (letters only).'; return false; }
      UI.modal('Is this right?', `<p class="ux-big-name">${esc(v)}</p><p>This name goes on every certificate and <b>cannot be changed later</b>, not even by you.</p>`, [{ text: '← Fix it', onclick: () => { setTimeout(UI.welcome, 10); } }, { text: 'Yes, lock it in', primary: true, onclick: () => { UI.setIdentity(v); UI.renderHome(); } }], { sticky: true });
    } }], { sticky: true });
    $('#w-load', m.el).addEventListener('click', () => { m.close(); UI.loadFileFlow(() => setTimeout(UI.welcome, 10)); });
    $('#w-name', m.el).addEventListener('keydown', (e) => { if (e.key === 'Enter') m.el.querySelector('.ux-btn.primary').click(); });
  };
  UI.loadFileFlow = (onCancel) => {
    const m = UI.modal('Load your progress file', `<p>Pick your <b>TerminalEX-First-Last.json</b> file, or paste its text below.</p><button class="ux-btn" id="lf-pick">📂 Choose file…</button><textarea class="ux-textarea" id="lf-text" placeholder="…or paste the file's text here"></textarea><p class="ux-err" id="lf-err" hidden></p>`, [
      { text: 'Cancel', onclick: () => { if (onCancel) onCancel(); } },
      { text: 'Load', primary: true, onclick: (ov) => { go($('#lf-text', ov).value, ov); return false; } }], { wide: true, sticky: !UI.state.name });
    const go = (text, ov) => {
      const r = UI.restoreFromFile(text);
      if (!r.ok) { const e = $('#lf-err', ov); e.hidden = false; e.textContent = r.why; return; }
      m.close(); location.reload();
    };
    $('#lf-pick', m.el).addEventListener('click', () => UI.pickFile((t) => go(t, m.el)));
  };
  UI.checkFileFlow = () => {
    const m = UI.modal('Check a progress file (view only)', '<p>For teachers: pick or paste a student\'s file. Nothing is loaded or changed.</p><button class="ux-btn" id="cf-pick">📂 Choose file…</button><textarea class="ux-textarea" id="cf-text" placeholder="…or paste the text"></textarea><div id="cf-out"></div>', [{ text: 'Check', primary: true, onclick: (ov) => { show($('#cf-text', ov).value); return false; } }, { text: 'Close' }], { wide: true });
    const show = (text) => {
      const r = UI.readProgressFile(text);
      $('#cf-out', m.el).innerHTML = r.ok ? `<div class="ux-ok">✓ Genuine — made by this TerminalEX</div><pre class="ux-pre">${esc(JSON.stringify(Object.assign({ student: r.file.student, saved: r.file.savedAt }, r.file.summary), null, 2))}</pre>` : `<div class="ux-bad">✗ Refused: ${esc(r.why)}</div>`;
    };
    $('#cf-pick', m.el).addEventListener('click', () => UI.pickFile(show));
  };
  UI.studentMenu = () => {
    const lv = UI.level(UI.state.xp);
    UI.modal(esc(UI.state.name || 'Not signed in'), `
      <p>Level ${lv.n}: <b>${esc(lv.title)}</b> · ${UI.state.xp} XP · ${Object.keys(UI.state.done).length} missions · ${Object.keys(UI.state.certs).length} certificates</p>
      <div class="ux-stack">
        <button class="ux-btn primary" data-a="save">⬇ Download my progress file</button>
        <button class="ux-btn" data-a="load">📂 Load a progress file</button>
        <button class="ux-btn" data-a="badges">🏅 My badges</button>
        <button class="ux-btn" data-a="check">🔍 Check a progress file (teachers)</button>
        <button class="ux-btn danger" data-a="erase">Erase everything and start over</button>
      </div>
      <p class="ux-dim">Your progress file holds your name, XP, missions, test results, certificates and all your files on every pretend computer. Load it on any computer to pick up where you left off.</p>`, [{ text: 'Close' }]).el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const ov = e.currentTarget; ov.remove();
      if (a.dataset.a === 'save') { if (!UI.state.name) return UI.welcome(); UI.download(UI.progressFileName(), UI.progressFileText()); }
      if (a.dataset.a === 'load') UI.loadFileFlow();
      if (a.dataset.a === 'badges') UI.showBadges();
      if (a.dataset.a === 'check') UI.checkFileFlow();
      if (a.dataset.a === 'erase') UI.modal('Erase everything?', '<p>This deletes your name, XP, certificates and every file on every pretend computer <b>in this browser</b>. Download your progress file first if you might want it back.</p>', [{ text: 'Cancel' }, { text: 'Erase everything', danger: true, onclick: () => { try { Object.keys(localStorage).filter((k) => k.startsWith('tx.') || k.startsWith('terminalex')).forEach((k) => localStorage.removeItem(k)); } catch (err) { /* ignore */ } location.reload(); } }]);
    });
  };
  UI.showBadges = () => {
    UI.openPage('badges', '🏅 Badges', `<div class="badge-grid">${UI.BADGES.map((b) => { const got = UI.state.badges[b.id]; return `<div class="badge-card ${got ? 'got' : ''}"><div class="badge-icon">${b.icon}</div><div><b>${esc(b.name)}</b><div class="ux-dim">${esc(b.desc)}</div><div class="badge-xp">${got ? '✓ earned ' + new Date(got).toLocaleDateString() : '+' + b.xp + ' XP'}</div></div></div>`; }).join('')}</div>`);
  };

  // ------------------------------------------------------------------ the home page
  const open = (kind) => { UI.closePage(); TX.app.newTab(kind); };
  UI.renderHome = () => {
    const host = $('#launcher .launcher-inner');
    if (!host) return;
    const st = UI.state, lv = UI.level(st.xp);
    const shellCard = (k) => { const d = TX.SHELLS[k]; return `<button class="launch-card" data-kind="${k}" style="--c:${d.color}" title="${esc(d.blurb)}"><span class="lc-badge">${TX.app.badge(k)}</span><span class="lc-text"><span class="lc-name">${esc(d.label)}</span><span class="lc-sub">${esc(d.sub)}</span></span>${st.visited[k] ? '' : '<span class="lc-new">new</span>'}</button>`; };
    const lessonCard = (L) => {
      const p = UI.lessonProgress(L), done = UI.lessonDone(L), t = st.tests[L.id] || {}, cert = st.certs[L.id];
      const d = TX.SHELLS[L.shell];
      return `<div class="lesson-card ${cert ? 'certified' : done ? 'ready' : ''}" style="--c:${d.color}">
        <div class="lesson-top"><span class="lesson-icon">${L.icon}</span><div><div class="lesson-n">Lesson ${L.n}</div><div class="lesson-title">${esc(L.title)}</div></div></div>
        ${L.history ? `<div class="lesson-sub">Explore the family tree (${Math.min(st.stats.historyNodes || 0, 6)}/6 systems)</div>` : `<div class="m-bar"><span style="width:${p.pct}%"></span></div><div class="lesson-sub">${p.done}/${p.total} missions · ${esc(d.label)}</div>`}
        <div class="lesson-actions">
          <button class="ux-btn small" data-guide="${L.id}">📖 Guide</button>
          ${L.history ? `<button class="ux-btn small" data-history="1">🌳 Explore</button>` : `<button class="ux-btn small" data-practice="${L.id}">▶ Practice</button>`}
          ${cert ? `<button class="ux-btn small primary" data-cert="${L.id}">🎓 Certificate</button>` : `<button class="ux-btn small ${done ? 'primary' : ''}" data-test="${L.id}" ${done ? '' : 'disabled title="Finish the practice first"'}>${t.attempts ? '🔁 Retake test' : '🎓 Take test'}</button>`}
        </div>
        ${cert ? `<div class="lesson-pass">✓ Passed ${t.passScore}/${t.of}</div>` : t.attempts ? `<div class="lesson-sub">Best ${t.best || 0}/${t.of || 10} · ${t.attempts} attempt${t.attempts > 1 ? 's' : ''}</div>` : ''}
      </div>`;
    };
    host.innerHTML = `
      <button id="launcher-close" class="icon-btn" aria-label="Close start page" ${TX.app.sessions.length ? '' : 'style="display:none"'}>×</button>
      <div class="home-hero">
        <div class="hero-logo"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#20232b"/><path d="M8 11l6 5-6 5" stroke="#39d98a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22h8" stroke="#e6e6e6" stroke-width="3" stroke-linecap="round"/></svg></div>
        <div class="home-hero-text"><h1>Terminal<b>EX</b></h1><p>Ten real-feeling terminals from 1979 to today. Nothing you type can hurt a real computer.</p></div>
        <button class="student-card" id="home-student">${st.name ? `<span class="sc-name">${esc(st.name)}</span><span class="sc-level">Level ${lv.n} · ${esc(lv.title)}</span><span class="m-bar"><span style="width:${lv.pct}%"></span></span><span class="sc-xp">${st.xp} XP · ${Object.keys(st.badges).length} badges · ${Object.keys(st.certs).length} certificates</span>` : '<span class="sc-name">Sign in</span><span class="sc-level">Type your name to start earning XP</span>'}</button>
      </div>
      ${UI.loadNotice ? `<div class="ux-bad">${esc(UI.loadNotice)}</div>` : ''}${UI.storageOk ? '' : '<div class="ux-bad">This browser is not letting TerminalEX save. Everything works today, but download your progress file before you leave.</div>'}
      <div class="home-tools">
        <button class="tool-card" data-tool="cheat"><span>📘</span><b>Interactive Cheat Sheet</b><span class="ux-dim">${TX.reference.TASKS.length} tasks × 8 systems, each with ▶ Run</span></button>
        <button class="tool-card" data-tool="history"><span>🌳</span><b>History & Family Tree</b><span class="ux-dim">From UNIX (1969) and CP/M to today</span></button>
        <button class="tool-card" data-tool="automation"><span>🤖</span><b>Automation Lab</b><span class="ux-dim">Ready-made Python scripts + CSV data</span></button>
        <button class="tool-card" data-tool="badges"><span>🏅</span><b>Badges</b><span class="ux-dim">${Object.keys(st.badges).length}/${UI.BADGES.length} earned</span></button>
      </div>
      ${TX.SHELL_ERAS.map(([era, label]) => `<h2 class="home-h">${label}</h2><div class="launch-grid">${TX.SHELL_ORDER.filter((k) => TX.SHELLS[k].era === era).map(shellCard).join('')}</div>`).join('')}
      <h2 class="home-h">Lessons <span class="ux-dim">— practice missions → guide → certification test → certificate</span></h2>
      <div class="lesson-grid">${TX.lessons.LIST.map(lessonCard).join('')}</div>
      <div class="launch-tips">
        <div><b>New here?</b> Pick Lesson 1, press ▶ Practice. Missions check themselves as you type.</div>
        <div><b>It's all connected.</b> cmd, PowerShell and Git Bash share one Windows disk. <code>ssh student@ubuntu-lab</code> from the Mac.</div>
        <div><b>Can't break it.</b> <code>rm -rf</code> away — <code>reset-machine</code> brings everything back.</div>
      </div>
      <p class="home-foot">TerminalEX collects no student data: no accounts, no tracking, no network requests. Progress stays in this browser and in the progress file you save. <button class="linkish" id="home-check">Teachers: check a progress file</button></p>`;
    host.onclick = (e) => {
      const t = e.target;
      const c = t.closest('.launch-card'); if (c) return open(c.dataset.kind);
      if (t.closest('#launcher-close')) return TX.app.hideLauncher();
      if (t.closest('#home-student')) return st.name ? UI.studentMenu() : UI.welcome();
      if (t.closest('#home-check')) return UI.checkFileFlow();
      const tool = t.closest('[data-tool]');
      if (tool) { const k = tool.dataset.tool; if (k === 'cheat') return UI.openCheatSheet(); if (k === 'history') return UI.openHistory(); if (k === 'badges') return UI.showBadges(); if (k === 'automation') return UI.practice('automation'); }
      const b = t.closest('button[data-guide],button[data-practice],button[data-test],button[data-cert],button[data-history]');
      if (!b) return;
      if (b.dataset.guide) UI.showGuide(TX.lessons.byId(b.dataset.guide));
      if (b.dataset.practice) UI.practice(b.dataset.practice);
      if (b.dataset.history) UI.openHistory();
      if (b.dataset.test) UI.startTest(TX.lessons.byId(b.dataset.test));
      if (b.dataset.cert) UI.showCertificate(TX.lessons.byId(b.dataset.cert));
    };
  };
  // Open the lesson's terminal with its missions panel; show the guide the first time.
  UI.practice = (id) => {
    const L = TX.lessons.byId(id);
    TX.app.lessonFocus = id;
    const ex = TX.app.sessions.find((s) => s.kind === L.shell);
    UI.closePage();
    if (ex) TX.app.activate(ex); else TX.app.newTab(L.shell);
    TX.app.hideLauncher();
    TX.app.toggleDrawer('missions', true);
    if (id === 'automation') setTimeout(() => TX.app.toast('🤖 Start with:  <code>cd ~/automation</code>  then  <code>ls</code>', true), 600);
    if (!UI.state.guides[id]) UI.showGuide(L);
  };
  UI.showGuide = (L) => {
    UI.state.guides[L.id] = UI.state.guides[L.id] || Date.now(); UI.save();
    const g = L.guide;
    UI.modal(`${L.icon} Lesson ${L.n}: ${esc(L.title)}`, `
      <h3>Why it matters</h3><p>${esc(g.why)}</p>
      <h3>You will be able to</h3><ul>${L.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <h3>Vocabulary</h3><table class="guide-vocab">${g.vocab.map(([t, d, ex]) => `<tr><td><b>${esc(t)}</b></td><td>${esc(d)}${ex ? `<div><code>${esc(ex)}</code></div>` : ''}</td></tr>`).join('')}</table>
      <h3>Common traps</h3><ul class="guide-traps">${g.traps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="ux-dim">Practice: ${L.history ? 'explore 6 systems on the family tree' : L.missions.length + ' missions in the ' + esc(TX.SHELLS[L.shell].label) + ' terminal'} · Test: ${TX.certtest.COUNT} questions, no hints, ${TX.certtest.PASS} to pass.</p>`,
    [{ text: L.history ? '🌳 Explore the family tree' : '▶ Start practicing', primary: true, onclick: () => { if (L.history) UI.openHistory(); else if (!TX.app.active || TX.app.active.kind !== L.shell) UI.practice(L.id); } }, { text: 'Close' }], { wide: true });
  };

  // ------------------------------------------------------------------ History & Lineage
  UI.openHistory = () => {
    const H = TX.lessons.HISTORY, F = TX.lessons.FAMILIES;
    UI.state.stats.historySeen = (UI.state.stats.historySeen || 0) + 1; UI.save();
    const seen = new Set(UI.state.stats.historyVisited || []);
    const y0 = 1963, y1 = 2018, W = 940, colW = 108, top = 30, yScale = 16;
    const xOf = (n) => 50 + n.x * colW, yOf = (n) => top + (n.year - y0) * yScale;
    const byId = Object.fromEntries(H.map((n) => [n.id, n]));
    const lines = H.flatMap((n) => (n.parents || []).map((p) => byId[p] ? `<path d="M${xOf(byId[p]) + 46} ${yOf(byId[p]) + 26} C ${xOf(byId[p]) + 46} ${(yOf(byId[p]) + yOf(n)) / 2 + 13}, ${xOf(n) + 46} ${(yOf(byId[p]) + yOf(n)) / 2 + 13}, ${xOf(n) + 46} ${yOf(n)}" class="tree-link" style="stroke:${F[n.fam][0]}"/>` : '')).join('');
    const years = []; for (let y = 1965; y <= 2015; y += 5) years.push(`<text x="6" y="${top + (y - y0) * yScale + 4}" class="tree-year">${y}</text><line x1="40" x2="${W}" y1="${top + (y - y0) * yScale}" y2="${top + (y - y0) * yScale}" class="tree-grid"/>`);
    const nodes = H.map((n) => `<g class="tree-node ${seen.has(n.id) ? 'seen' : ''}" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(n.name)}, ${n.year}"><rect x="${xOf(n)}" y="${yOf(n)}" width="92" height="26" rx="7" style="fill:${F[n.fam][0]}22;stroke:${F[n.fam][0]}"/><text x="${xOf(n) + 46}" y="${yOf(n) + 12}" class="tree-name">${esc(n.name)}</text><text x="${xOf(n) + 46}" y="${yOf(n) + 22}" class="tree-y">${n.year}${n.shell ? ' · ▶' : ''}</text></g>`).join('');
    const svgH = top + (y1 - y0) * yScale;
    const COMPARE = [['List files', 'ls', 'DIR / dir', 'Get-ChildItem'], ['Print a file', 'cat', 'TYPE', 'Get-Content'], ['Search text', 'grep', 'FIND / findstr', 'Select-String'], ['Copy', 'cp', 'COPY', 'Copy-Item'], ['Admin rights', 'sudo / su / pfexec', '(none in DOS) / runas', 'Start-Process -Verb RunAs'], ['Path separator', '/', '\\', '\\ (or /)'], ['Options', '-l', '/W', '-Recurse']];
    const p = UI.openPage('history', '🌳 History & Lineage of the Terminal', `
      <p class="page-lead">Every terminal in TerminalEX belongs to one of two big families. <b>UNIX</b> (1969) gave us Linux, macOS, FreeBSD, Solaris and Android. <b>CP/M → MS-DOS</b> gave us Windows' Command Prompt and, later, PowerShell. Click a box to read its story; ▶ opens that terminal.</p>
      <div class="tree-legend">${Object.keys(F).map((k) => `<span><i style="background:${F[k][0]}"></i>${esc(F[k][1])}</span>`).join('')}</div>
      <div class="tree-wrap"><div class="tree-scroll"><svg viewBox="0 0 ${W} ${svgH}" width="${W}" height="${svgH}" class="tree-svg" role="img" aria-label="Family tree of operating systems and shells">${years.join('')}${lines}${nodes}</svg></div>
        <aside class="tree-info" id="tree-info"><h3>Pick a system</h3><p class="ux-dim">Explore at least 6 to unlock the History certification test (${Math.min(seen.size, 6)}/6).</p></aside></div>
      <h2 class="home-h">Eras of the command line</h2>
      <div class="era-grid">
        <div class="era"><b>1960s–70s · Time-sharing</b><p>Computers filled rooms and cost millions, so dozens of people shared one through typewriter-like terminals. Commands were short (ls, cp, mv) because typing was slow and loud. UNIX's ideas — small tools, pipes, "everything is a file" — come from here.</p></div>
        <div class="era"><b>1980s · The personal computer</b><p>Computers came home and to school desks: one person, one program at a time, floppy disks, MS-DOS. No passwords and no users. Batch files were the first automation most people ever wrote.</p></div>
        <div class="era"><b>1990s · Networks and free software</b><p>The internet grew up on UNIX. Linux (1991) and FreeBSD (1993) gave everyone a free UNIX. Windows NT replaced DOS underneath with cmd.exe on top.</p></div>
        <div class="era"><b>2000s–today · Servers, clouds, scripts</b><p>Macs became UNIX. PowerShell brought objects to the pipeline. Most of the internet runs on Linux servers that nobody touches with a mouse: everything is done in a terminal — usually by scripts.</p></div>
      </div>
      <h2 class="home-h">Same job, different families</h2>
      <table class="cheat compare"><thead><tr><th>Task</th><th>UNIX family</th><th>DOS / cmd</th><th>PowerShell</th></tr></thead><tbody>${COMPARE.map((r) => `<tr><td>${esc(r[0])}</td>${r.slice(1).map((c) => `<td><code>${esc(c)}</code></td>`).join('')}</tr>`).join('')}</tbody></table>
      <p><button class="ux-btn" data-guide="history">📖 Lesson 12 guide</button> <button class="ux-btn" id="hist-test">🎓 History certification test</button></p>`);
    const info = $('#tree-info', p);
    const pick = (id) => {
      const n = byId[id];
      if (!seen.has(id)) { seen.add(id); UI.state.stats.historyVisited = [...seen]; UI.stat('historyNodes'); if (seen.size === 6) setTimeout(() => TX.app.toast('🌳 History test unlocked! Find it on the home page.', true), 300); }
      p.querySelectorAll('.tree-node').forEach((g) => g.classList.toggle('on', g.dataset.id === id));
      const g = p.querySelector(`.tree-node[data-id="${id}"]`); if (g) g.classList.add('seen');
      const kids = H.filter((x) => (x.parents || []).includes(id)).map((x) => x.name);
      info.innerHTML = `<div class="tree-fam" style="color:${F[n.fam][0]}">${esc(F[n.fam][1])}</div><h3>${esc(n.name)} <span class="ux-dim">${n.year}</span></h3><p>${esc(n.text)}</p>${(n.parents || []).length ? `<p class="ux-dim">Came from: ${n.parents.map((x) => esc(byId[x] ? byId[x].name : x)).join(', ')}</p>` : ''}${kids.length ? `<p class="ux-dim">Led to: ${kids.map(esc).join(', ')}</p>` : ''}${n.shell ? `<button class="ux-btn primary" data-open="${n.shell}">▶ Open the ${esc(TX.SHELLS[n.shell].label)} terminal</button>` : ''}<p class="ux-dim">${Math.min(seen.size, 6)}/6 explored</p>`;
    };
    p.addEventListener('click', (e) => {
      const g = e.target.closest('.tree-node'); if (g) return pick(g.dataset.id);
      const o = e.target.closest('[data-open]'); if (o) return open(o.dataset.open);
      if (e.target.closest('[data-guide]')) UI.showGuide(TX.lessons.byId('history'));
      if (e.target.closest('#hist-test')) { const L = TX.lessons.byId('history'); if (UI.lessonDone(L)) UI.startTest(L); else TX.app.toast('Explore 6 systems on the tree first.'); }
    });
    p.addEventListener('keydown', (e) => { const g = e.target.closest('.tree-node'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(g.dataset.id); } });
  };
})();
