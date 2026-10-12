/* TerminalEX — the student's record: locked name, XP, levels, badges, mission hints, tests, certificates,
 * and ONE sealed progress file that is both the proof of work and the way back (same design as SheetEX).
 * Nothing is sent anywhere: the record lives in this browser and in the file the student saves. */
(function () {
  'use strict';
  const TX = window.TX;
  const UI = (TX.UI = {});
  const esc = (s) => TX.escapeHtml(String(s == null ? '' : s));
  UI.esc = esc;

  // ------------------------------------------------------------------ persistence
  // CORE is sealed with TX.seal, so editing it in the browser's storage makes the save invalid.
  const KEY = 'terminalex.v2';
  const CORE = ['name', 'sid', 'xp', 'done', 'hints', 'badges', 'visited', 'stats', 'tests', 'certs', 'guides', 'created'];
  const fresh = () => ({ name: '', sid: '', xp: 0, done: {}, hints: {}, badges: {}, visited: {}, stats: { refRuns: 0, historyNodes: 0, historySeen: 0, tests: 0 }, tests: {}, certs: {}, guides: {}, created: 0 });
  const get = (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  function lock(st) {
    if (st.name) ['name', 'sid'].forEach((k) => Object.defineProperty(st, k, { value: st[k], writable: false, enumerable: true, configurable: false }));
    return st;
  }
  const coreOf = (st) => { const c = {}; CORE.forEach((k) => { c[k] = st[k]; }); return c; };
  function serialize(st) { const core = JSON.stringify(coreOf(st)); return JSON.stringify({ v: 2, core, sig: TX.seal.mac('save|' + core) }); }
  UI.loadNotice = null;
  function load() {
    const raw = get(KEY);
    if (!raw) return migrate(fresh());
    try {
      const o = JSON.parse(raw);
      if (!o || o.v !== 2 || typeof o.core !== 'string' || TX.seal.mac('save|' + o.core) !== o.sig) throw new Error('bad seal');
      const st = fresh(); const core = JSON.parse(o.core);
      CORE.forEach((k) => { if (core[k] !== undefined) st[k] = core[k]; });
      st.stats = Object.assign(fresh().stats, st.stats);
      return lock(st);
    } catch (e) {
      UI.loadNotice = 'The progress saved in this browser was changed outside TerminalEX, so it could not be used. You are starting fresh — if you have a progress file, load it.';
      return fresh();
    }
  }
  // TerminalEX v1 kept mission progress unsealed: bring it across once.
  function migrate(st) {
    try { const old = JSON.parse(get('tx.missions') || '{}'); Object.keys(old).forEach((id) => { const mi = TX.lessons.mission(id); if (mi && !st.done[id]) { st.done[id] = { xp: mi.xp, at: old[id], hints: 0 }; st.xp += mi.xp; } }); } catch (e) { /* none */ }
    return st;
  }
  UI.state = load();
  UI.storageOk = set(KEY, serialize(UI.state));
  let saveTimer = null;
  UI.saveNow = () => { clearTimeout(saveTimer); if (!set(KEY, serialize(UI.state))) UI.storageOk = false; };
  UI.save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(UI.saveNow, 250); };

  // ------------------------------------------------------------------ levels & badges
  const LEVELS = [[0, 'Keyboard Rookie'], [60, 'Prompt Explorer'], [160, 'Path Finder'], [300, 'Pipe Fitter'], [480, 'Script Runner'], [700, 'Power User'], [980, 'Sysadmin'], [1300, 'Kernel Hacker'], [1700, 'Shell Wizard'], [2200, 'UNIX Greybeard']];
  UI.LEVELS = LEVELS;
  UI.level = (xp) => {
    let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
    const next = LEVELS[i + 1];
    return { n: i + 1, title: LEVELS[i][1], floor: LEVELS[i][0], next: next ? next[0] : null, pct: next ? Math.round((100 * (xp - LEVELS[i][0])) / (next[0] - LEVELS[i][0])) : 100 };
  };
  const BADGES = [
    { id: 'first', icon: '⌨️', name: 'Hello, Terminal', desc: 'Finish your first mission.', xp: 10 },
    { id: 'explorer', icon: '🧭', name: 'Explorer', desc: 'Open all ten terminals.', xp: 25 },
    { id: 'timetravel', icon: '⏳', name: 'Time Traveler', desc: 'Open both MS-DOS (1994) and UNIX V7 (1979).', xp: 15 },
    { id: 'polyglot', icon: '🌐', name: 'Polyglot', desc: 'Finish a mission on five different systems.', xp: 25 },
    { id: 'no-hints', icon: '🧠', name: 'No Hints Needed', desc: 'Finish 10 missions without hints.', xp: 25 },
    { id: 'researcher', icon: '📚', name: 'Researcher', desc: 'Run 15 examples in the Interactive Cheat Sheet.', xp: 15 },
    { id: 'historian', icon: '🌳', name: 'Historian', desc: 'Explore 10 systems on the family tree.', xp: 15 },
    { id: 'automator', icon: '🤖', name: 'Automator', desc: 'Finish the Automation Lab.', xp: 30 },
    { id: 'raid', icon: '🗄️', name: 'Mirror Maker', desc: 'Finish Disks & RAID.', xp: 30 },
    { id: 'retro', icon: '💾', name: 'Retro Computing', desc: 'Finish the MS-DOS and UNIX V7 lessons.', xp: 30 },
    { id: 'bigiron', icon: '☀️', name: 'Big Iron', desc: 'Finish the Solaris and FreeBSD lessons.', xp: 30 },
    { id: 'certified', icon: '🎓', name: 'Certified', desc: 'Pass your first certification test.', xp: 25 },
    { id: 'ace', icon: '💯', name: 'Perfect Score', desc: 'Score 10/10 on a certification test.', xp: 40 },
    { id: 'cert-5', icon: '🏛️', name: 'Five Certificates', desc: 'Earn 5 certificates.', xp: 50 },
    { id: 'all', icon: '🏆', name: 'Completionist', desc: 'Finish every mission in TerminalEX.', xp: 100 },
  ];
  UI.BADGES = BADGES;
  const toast = (h, big) => { if (TX.app && TX.app.toast) TX.app.toast(h, big); };
  UI.addXP = (n) => {
    if (!n) return;
    const before = UI.level(UI.state.xp);
    UI.state.xp += n;
    const after = UI.level(UI.state.xp);
    if (after.n > before.n) setTimeout(() => toast(`⬆️ Level ${after.n}: <b>${esc(after.title)}</b>`, true), 900);
    UI.save(); UI.refresh();
  };
  UI.badge = (id) => {
    if (UI.state.badges[id]) return;
    const b = BADGES.find((x) => x.id === id); if (!b) return;
    UI.state.badges[id] = Date.now();
    setTimeout(() => toast(`${b.icon} Badge: <b>${esc(b.name)}</b> <span class="xp">+${b.xp} XP</span>`, true), 600);
    UI.addXP(b.xp);
  };
  UI.refresh = () => { if (UI.onChange) UI.onChange(); };

  // ------------------------------------------------------------------ missions, hints, lessons
  // A hint costs 20% of a mission's XP; revealing the answer costs another 30%.
  UI.useHint = (mid, kind) => { const cur = UI.state.hints[mid] || 0; const v = kind === 'answer' ? cur | 2 : cur | 1; if (v !== cur) { UI.state.hints[mid] = v; UI.save(); } };
  UI.reward = (mi) => { const h = UI.state.hints[mi.id] || 0; return Math.max(1, Math.round(mi.xp * (1 - (h & 1 ? 0.2 : 0) - (h & 2 ? 0.3 : 0)))); };
  UI.isDone = (mid) => !!UI.state.done[mid];
  UI.completeMission = (mi) => {
    if (UI.state.done[mi.id]) return 0;
    const xp = UI.reward(mi);
    UI.state.done[mi.id] = { xp, at: Date.now(), hints: UI.state.hints[mi.id] || 0 };
    UI.addXP(xp);
    const done = Object.keys(UI.state.done);
    UI.badge('first');
    if (done.filter((id) => !UI.state.done[id].hints).length >= 10) UI.badge('no-hints');
    const tracks = new Set(done.map((id) => { const m = TX.lessons.mission(id); return m && m.track; }).filter(Boolean));
    if (tracks.size >= 5) UI.badge('polyglot');
    const L = TX.lessons.ofMission(mi.id);
    if (L && UI.lessonDone(L)) {
      setTimeout(() => toast(`📗 Lesson complete: <b>${esc(L.title)}</b> — the certification test is unlocked!`, true), 1600);
      if (L.id === 'automation') UI.badge('automator');
      if (L.id === 'raid') UI.badge('raid');
      if (['dos', 'unix'].every((x) => UI.lessonDone(TX.lessons.byId(x)))) UI.badge('retro');
      if (['solaris', 'freebsd'].every((x) => UI.lessonDone(TX.lessons.byId(x)))) UI.badge('bigiron');
    }
    if (TX.lessons.LIST.every((x) => UI.lessonDone(x))) UI.badge('all');
    return xp;
  };
  UI.lessonProgress = (L) => { const n = L.missions.filter((id) => UI.state.done[id]).length; return { done: n, total: L.missions.length, pct: L.missions.length ? Math.round((100 * n) / L.missions.length) : 100 }; };
  UI.lessonDone = (L) => (L.history ? UI.state.stats.historyNodes >= 6 : L.missions.every((id) => UI.state.done[id]));
  UI.visit = (kind) => {
    if (!UI.state.visited[kind]) { UI.state.visited[kind] = Date.now(); UI.save(); }
    if (TX.SHELL_ORDER.every((k) => UI.state.visited[k])) UI.badge('explorer');
    if (UI.state.visited.dos && UI.state.visited.unix) UI.badge('timetravel');
  };
  UI.stat = (k, n = 1) => { UI.state.stats[k] = (UI.state.stats[k] || 0) + n; UI.save(); if (k === 'refRuns' && UI.state.stats.refRuns >= 15) UI.badge('researcher'); if (k === 'historyNodes' && UI.state.stats.historyNodes >= 10) UI.badge('historian'); };

  // ------------------------------------------------------------------ identity
  UI.validName = (v) => {
    v = String(v || '').trim().replace(/\s+/g, ' ');
    if (v.length < 3 || v.length > 40 || !/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(v) || !/\S+ \S+/.test(v)) return null;
    return v;
  };
  function newSid() { let b = []; try { const a = new Uint8Array(9); window.crypto.getRandomValues(a); b = Array.from(a); } catch (e) { for (let i = 0; i < 9; i++) b.push(Math.floor(Math.random() * 256)); } return TX.seal.b64u(b); }
  UI.setIdentity = (name) => {
    if (UI.state.name) return false; // locked forever
    UI.state.name = name; UI.state.sid = newSid(); UI.state.created = UI.state.created || Date.now();
    lock(UI.state); UI.saveNow(); UI.refresh();
    return true;
  };

  // ------------------------------------------------------------------ certificates
  UI.makeCert = (L, t) => TX.seal.pack('TXCERT', { v: 1, name: UI.state.name, sid: UI.state.sid, lesson: L.id, title: L.title, n: L.n, score: t.passScore, of: t.of, attempt: t.passAttempt, missions: UI.lessonProgress(L).done, hints: L.missions.filter((id) => UI.state.done[id] && UI.state.done[id].hints).length, date: new Date(t.passed).toISOString().slice(0, 10) });
  UI.readCert = (code) => { const r = TX.seal.unpack('TXCERT', code); return r.ok ? { ok: true, cert: r.obj } : r; };

  // ------------------------------------------------------------------ the progress file
  // Holds the record AND the student's work (every pretend computer's files), sealed.
  const FILE_APP = 'TerminalEX', FILE_FORMAT = 2;
  const FILE_KEYS = ['app', 'format', 'student', 'id', 'savedAt', 'summary', 'progress', 'work', 'seal'];
  function summaryOf(p) {
    const lv = UI.level(p.xp);
    const all = TX.lessons.LIST.flatMap((L) => L.missions);
    return {
      level: lv.n + ' ' + lv.title, xp: p.xp, missions: Object.keys(p.done).length + '/' + all.length, badges: Object.keys(p.badges).length,
      certificates: TX.lessons.LIST.filter((L) => p.tests[L.id] && p.tests[L.id].passed).map((L) => { const t = p.tests[L.id]; return { lesson: L.n + '. ' + L.title, test: t.passScore + '/' + t.of, attempt: t.passAttempt, passed: new Date(t.passed).toISOString().slice(0, 10) }; }),
    };
  }
  function workNow() {
    if (TX.app && TX.app.saveNow) TX.app.saveNow();
    const machines = {};
    Object.keys(TX.MACHINE_KINDS).forEach((k) => { const raw = get('tx.fs.' + k); if (raw) { try { machines[k] = JSON.parse(raw); } catch (e) { /* skip */ } } });
    let remotes = null; try { remotes = JSON.parse(get('tx.remotes') || 'null'); } catch (e) { /* none */ }
    return { machines, remotes };
  }
  UI.progressFileText = () => {
    UI.saveNow();
    const st = UI.state;
    const f = { app: FILE_APP, format: FILE_FORMAT, student: st.name, id: st.sid, savedAt: new Date().toISOString(), summary: summaryOf(st), progress: JSON.parse(JSON.stringify(coreOf(st))), work: workNow() };
    f.seal = TX.seal.mac('file|' + JSON.stringify(f));
    return JSON.stringify(f, null, 2) + '\n';
  };
  UI.progressFileName = () => 'TerminalEX-' + UI.state.name.replace(/[^A-Za-z0-9]+/g, '-') + '.json';
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const isInt = (x, lo, hi) => typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi;
  function validProgress(p, f) {
    if (!isObj(p) || Object.keys(p).some((k) => !CORE.includes(k))) return 'unexpected fields';
    if (UI.validName(p.name) !== p.name || p.name !== f.student || p.sid !== f.id || !/^[A-Za-z0-9_-]{12}$/.test(p.sid)) return 'name';
    if (!isInt(p.xp, 0, 1e6)) return 'xp';
    const ids = new Set(TX.lessons.LIST.flatMap((L) => L.missions));
    if (!isObj(p.done) || Object.keys(p.done).some((k) => !ids.has(k) || !isObj(p.done[k]) || !isInt(p.done[k].xp, 0, 1000))) return 'missions';
    if (!isObj(p.badges) || Object.keys(p.badges).some((k) => !BADGES.some((b) => b.id === k))) return 'badges';
    if (!isObj(p.certs) || Object.keys(p.certs).some((k) => { const r = UI.readCert(p.certs[k].code); return !r.ok || r.cert.sid !== p.sid || r.cert.name !== p.name || r.cert.lesson !== k; })) return 'certificates';
    if (!isObj(p.tests) || Object.keys(p.tests).some((k) => !TX.lessons.byId(k))) return 'tests';
    return '';
  }
  UI.readProgressFile = (text) => {
    text = String(text == null ? '' : text).replace(/^﻿/, '').replace(/\r\n/g, '\n');
    if (!text.trim()) return { ok: false, why: 'The file is empty.' };
    let f;
    try { f = JSON.parse(text); } catch (e) { return { ok: false, why: 'That is not a TerminalEX progress file (it is not valid JSON).' }; }
    if (!isObj(f) || f.app !== FILE_APP) return { ok: false, why: 'That is not a TerminalEX progress file.' };
    if (f.format !== FILE_FORMAT) return { ok: false, why: 'This progress file was made by a different version of TerminalEX.' };
    if (Object.keys(f).join() !== FILE_KEYS.join() || typeof f.seal !== 'string') return { ok: false, why: 'This file does not have the exact layout TerminalEX writes. It was changed, so it cannot be used.' };
    if (JSON.stringify(f, null, 2) !== text.replace(/\n+$/, '')) return { ok: false, why: 'The formatting of this file was changed (spaces, line breaks or order). TerminalEX only accepts files exactly as it saved them.' };
    const seal = f.seal; delete f.seal;
    const good = TX.seal.mac('file|' + JSON.stringify(f));
    f.seal = seal;
    if (good !== seal) return { ok: false, why: 'This file was changed after TerminalEX saved it, or it was made by a different copy of TerminalEX. It cannot be used.' };
    const bad = validProgress(f.progress, f);
    if (bad || JSON.stringify(summaryOf(f.progress)) !== JSON.stringify(f.summary)) return { ok: false, why: 'This file is not in the exact format TerminalEX makes' + (bad ? ' (' + bad + ')' : '') + '.' };
    return { ok: true, file: f };
  };
  UI.restoreFromFile = (text) => {
    const r = UI.readProgressFile(text);
    if (!r.ok) return r;
    const p = r.file.progress;
    if (UI.state.name && UI.state.sid !== p.sid) return { ok: false, why: `This file belongs to ${p.name}, not to ${UI.state.name}. A name can never be changed, so it was not loaded.` };
    const st = fresh();
    CORE.forEach((k) => { if (p[k] !== undefined) st[k] = JSON.parse(JSON.stringify(p[k])); });
    if (UI.state.name) { // same student: never lower anything
      st.xp = Math.max(st.xp, UI.state.xp);
      ['done', 'badges', 'certs', 'visited', 'guides', 'hints'].forEach((k) => { st[k] = Object.assign({}, st[k], UI.state[k]); });
      Object.keys(UI.state.tests).forEach((k) => { const a = UI.state.tests[k], b = st.tests[k]; if (!b || (a.passed && !b.passed)) st.tests[k] = a; });
    }
    set(KEY, serialize(st));
    const w = r.file.work || {};
    Object.keys(w.machines || {}).forEach((k) => set('tx.fs.' + k, JSON.stringify(w.machines[k])));
    if (w.remotes) set('tx.remotes', JSON.stringify(w.remotes));
    return { ok: true, name: p.name, reload: true };
  };

  // ------------------------------------------------------------------ small UI helpers
  UI.modal = (title, body, buttons, opts = {}) => {
    const ov = document.createElement('div');
    ov.className = 'ux-overlay' + (opts.wide ? ' wide' : '');
    ov.innerHTML = `<div class="ux-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ux-modal-head"><h2>${title}</h2>${opts.sticky ? '' : '<button class="icon-btn ux-x" aria-label="Close">×</button>'}</div><div class="ux-modal-body">${body}</div>${buttons && buttons.length ? `<div class="ux-modal-foot">${buttons.map((b, i) => `<button class="ux-btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}" data-i="${i}">${b.text}</button>`).join('')}</div>` : ''}</div>`;
    const close = () => { ov.remove(); if (opts.onClose) opts.onClose(); };
    ov.addEventListener('click', (e) => {
      if (e.target === ov && !opts.sticky) close();
      if (e.target.closest('.ux-x')) close();
      const b = e.target.closest('[data-i]');
      if (b && b.closest('.ux-modal-foot')) { const def = buttons[+b.dataset.i]; if (!def.onclick || def.onclick(ov) !== false) close(); }
    });
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !opts.sticky) { e.stopPropagation(); close(); } });
    document.body.appendChild(ov);
    const f = ov.querySelector('input, textarea, .ux-btn.primary, button');
    if (f) setTimeout(() => f.focus(), 30);
    return { el: ov, close };
  };
  // Save a file; if the school blocks downloads, show the text with a Copy button instead.
  UI.download = (name, text, type) => {
    let ok = false;
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); ok = true; } catch (e) { ok = false; }
    if (!ok || UI.forceCopy) UI.modal('Copy your progress file', `<p>Downloads seem to be blocked. Copy this text and paste it into a document called <b>${esc(name)}</b>. You can paste it back in later to load it.</p><textarea class="ux-textarea" readonly>${esc(text)}</textarea>`, [{ text: 'Copy', primary: true, onclick: (ov) => { const t = ov.querySelector('textarea'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } return false; } }, { text: 'Done' }], { wide: true });
  };
  UI.pickFile = (cb) => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json,text/plain'; i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(String(r.result)); r.readAsText(f); }; i.click(); };
  UI.ansiToHtml = (s) => {
    // Colors from ANSI codes, safely escaped.
    const COL = { 30: 'a0', 31: 'a1', 32: 'a2', 33: 'a3', 34: 'a4', 35: 'a5', 36: 'a6', 37: 'a7', 90: 'a8', 91: 'a9', 92: 'a10', 93: 'a11', 94: 'a12', 95: 'a13', 96: 'a14', 97: 'a15' };
    let out = '', open = 0;
    String(s).replace(/\r/g, '').split(/(\x1b\[[0-9;]*m)/).forEach((part) => {
      const m = /^\x1b\[([0-9;]*)m$/.exec(part);
      if (!m) { out += esc(part); return; }
      const codes = m[1].split(';').map(Number);
      if (codes.includes(0) || !m[1]) { out += '</span>'.repeat(open); open = 0; return; }
      const cls = codes.map((c) => (COL[c] ? 'ansi-' + COL[c] : c === 1 ? 'ansi-b' : c === 2 ? 'ansi-dim' : '')).filter(Boolean).join(' ');
      if (cls) { out += `<span class="${cls}">`; open++; }
    });
    return out + '</span>'.repeat(open);
  };
})();
