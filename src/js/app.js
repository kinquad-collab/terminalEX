/* TerminalEX — application shell: tabs, sessions, themes, settings, persistence, drawer */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tx.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tx.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('tx.' + k); } catch (e) { /* ignore */ } },
  };

  // ------------------------------------------------------------------ themes
  const TANGO = ['#2E3436', '#CC0000', '#4E9A06', '#C4A000', '#3465A4', '#75507B', '#06989A', '#D3D7CF', '#555753', '#EF2929', '#8AE234', '#FCE94F', '#729FCF', '#AD7FA8', '#34E2E2', '#EEEEEC'];
  const CAMPBELL = ['#0C0C0C', '#C50F1F', '#13A10E', '#C19C00', '#0037DA', '#881798', '#3A96DD', '#CCCCCC', '#767676', '#E74856', '#16C60C', '#F9F1A5', '#3B78FF', '#B4009E', '#61D6D6', '#F2F2F2'];
  const THEMES = {
    ubuntu: { name: 'Ubuntu', bg: '#300A24', fg: '#FFFFFF', cursor: '#FFFFFF', sel: '#B5D5FF55', pal: TANGO },
    macos: { name: 'macOS Terminal', bg: '#1E1E1E', fg: '#E5E5E5', cursor: '#9A9A9A', sel: '#3F638B88', pal: ['#000000', '#C23621', '#25BC24', '#ADAD27', '#492EE1', '#D338D3', '#33BBC8', '#CBCCCD', '#818383', '#FC391F', '#31E722', '#EAEC23', '#5833FF', '#F935F8', '#14F0F0', '#E9EBEB'] },
    campbell: { name: 'Campbell', bg: '#0C0C0C', fg: '#CCCCCC', cursor: '#FFFFFF', sel: '#FFFFFF44', pal: CAMPBELL },
    powershell: { name: 'Campbell PowerShell', bg: '#012456', fg: '#CCCCCC', cursor: '#FFFFFF', sel: '#FFFFFF44', pal: CAMPBELL },
    mintty: { name: 'Git Bash (mintty)', bg: '#000000', fg: '#BFBFBF', cursor: '#BFBFBF', sel: '#FFFFFF44', pal: ['#000000', '#BF0000', '#00BF00', '#BFBF00', '#0000BF', '#BF00BF', '#00BFBF', '#BFBFBF', '#404040', '#FF4040', '#40FF40', '#FFFF40', '#6060FF', '#FF40FF', '#40FFFF', '#FFFFFF'] },
    dracula: { name: 'Dracula', bg: '#282A36', fg: '#F8F8F2', cursor: '#F8F8F2', sel: '#44475A', pal: ['#21222C', '#FF5555', '#50FA7B', '#F1FA8C', '#BD93F9', '#FF79C6', '#8BE9FD', '#F8F8F2', '#6272A4', '#FF6E6E', '#69FF94', '#FFFFA5', '#D6ACFF', '#FF92DF', '#A4FFFF', '#FFFFFF'] },
    tokyo: { name: 'Tokyo Night', bg: '#1A1B26', fg: '#C0CAF5', cursor: '#C0CAF5', sel: '#33467C', pal: ['#15161E', '#F7768E', '#9ECE6A', '#E0AF68', '#7AA2F7', '#BB9AF7', '#7DCFFF', '#A9B1D6', '#414868', '#F7768E', '#9ECE6A', '#E0AF68', '#7AA2F7', '#BB9AF7', '#7DCFFF', '#C0CAF5'] },
    nord: { name: 'Nord', bg: '#2E3440', fg: '#D8DEE9', cursor: '#D8DEE9', sel: '#434C5E', pal: ['#3B4252', '#BF616A', '#A3BE8C', '#EBCB8B', '#81A1C1', '#B48EAD', '#88C0D0', '#E5E9F0', '#4C566A', '#BF616A', '#A3BE8C', '#EBCB8B', '#81A1C1', '#B48EAD', '#8FBCBB', '#ECEFF4'] },
    solarized: { name: 'Solarized Dark', bg: '#002B36', fg: '#839496', cursor: '#93A1A1', sel: '#073642', pal: ['#073642', '#DC322F', '#859900', '#B58900', '#268BD2', '#D33682', '#2AA198', '#EEE8D5', '#586E75', '#CB4B16', '#859900', '#B58900', '#268BD2', '#6C71C4', '#2AA198', '#FDF6E3'] },
    gruvbox: { name: 'Gruvbox', bg: '#282828', fg: '#EBDBB2', cursor: '#EBDBB2', sel: '#504945', pal: ['#282828', '#CC241D', '#98971A', '#D79921', '#458588', '#B16286', '#689D6A', '#A89984', '#928374', '#FB4934', '#B8BB26', '#FABD2F', '#83A598', '#D3869B', '#8EC07C', '#EBDBB2'] },
    light: { name: 'One Half Light', bg: '#FAFAFA', fg: '#383A42', cursor: '#4F525D', sel: '#BFCEFF', pal: ['#383A42', '#E45649', '#50A14F', '#C18401', '#0184BC', '#A626A4', '#0997B3', '#8A8C94', '#4F525D', '#DF6C75', '#6FAD57', '#C18301', '#61AFEF', '#C577DD', '#56B5C1', '#FFFFFF'] },
    retro: { name: 'Retro Green CRT', bg: '#0A120A', fg: '#39FF6A', cursor: '#39FF6A', sel: '#1F5F2E', pal: ['#0A120A', '#39FF6A', '#39FF6A', '#9DFFB0', '#2FCB55', '#39FF6A', '#9DFFB0', '#39FF6A', '#1E8F3A', '#9DFFB0', '#9DFFB0', '#CFFFD8', '#39FF6A', '#9DFFB0', '#CFFFD8', '#E8FFEC'] },
    freebsd: { name: 'FreeBSD console', bg: '#000000', fg: '#C0C0C0', cursor: '#C0C0C0', sel: '#FFFFFF44', pal: ['#000000', '#AA0000', '#00AA00', '#AA5500', '#0000AA', '#AA00AA', '#00AAAA', '#AAAAAA', '#555555', '#FF5555', '#55FF55', '#FFFF55', '#5555FF', '#FF55FF', '#55FFFF', '#FFFFFF'] },
    solaris: { name: 'Solaris dtterm (CDE)', bg: '#1B1F2B', fg: '#E8E4D8', cursor: '#F29111', sel: '#F2911155', pal: ['#1B1F2B', '#E0533B', '#8CB369', '#F29111', '#5B8FD9', '#B67FD0', '#4FB3BF', '#D8D4C8', '#6B7280', '#FF6B4F', '#A6D17F', '#FFB347', '#7AA9F0', '#CF99E6', '#6FD0DB', '#FFFFFF'] },
    dos: { name: 'MS-DOS (VGA text mode)', bg: '#000000', fg: '#AAAAAA', cursor: '#AAAAAA', sel: '#AAAAAA55', pal: ['#000000', '#AA0000', '#00AA00', '#AA5500', '#0000AA', '#AA00AA', '#00AAAA', '#AAAAAA', '#555555', '#FF5555', '#55FF55', '#FFFF55', '#5555FF', '#FF55FF', '#55FFFF', '#FFFFFF'] },
    teletype: { name: 'Teletype paper (1979)', bg: '#F3EEDC', fg: '#2B2A26', cursor: '#2B2A26', sel: '#2B2A2633', pal: ['#2B2A26', '#8B1E1E', '#2E5E2E', '#7A5A10', '#23406E', '#6A2E6A', '#245E66', '#2B2A26', '#5A574E', '#8B1E1E', '#2E5E2E', '#7A5A10', '#23406E', '#6A2E6A', '#245E66', '#000000'] },
    amber: { name: 'Retro Amber', bg: '#140C00', fg: '#FFB000', cursor: '#FFB000', sel: '#5F4100', pal: ['#140C00', '#FFB000', '#FFB000', '#FFCC66', '#E09A00', '#FFB000', '#FFCC66', '#FFB000', '#8F6200', '#FFCC66', '#FFCC66', '#FFE0A3', '#FFB000', '#FFCC66', '#FFE0A3', '#FFF3D9'] },
  };
  const FONTS = {
    auto: null,
    jetbrains: "'JetBrains Mono', monospace", cascadia: "'Cascadia Mono', 'Cascadia Code', Consolas, monospace", ubuntu: "'Ubuntu Mono', monospace", fira: "'Fira Code', monospace", source: "'Source Code Pro', monospace", plex: "'IBM Plex Mono', monospace",
  };

  // ------------------------------------------------------------------ shells (defined in shells.js)
  const SHELLS = TX.SHELLS;

  // ------------------------------------------------------------------ Session
  let sessionSeq = 0;
  class Session {
    constructor(app, kind, opts = {}) {
      this.app = app;
      this.kind = kind;
      this.opts = opts;
      this.def = SHELLS[kind];
      this.id = ++sessionSeq;
      this.pid = 2230 + this.id * 7;
      this.pane = document.createElement('div');
      this.pane.className = 'pane';
      this.pane.dataset.os = this.def.os;
      this.pane.innerHTML = windowBar(this.def.os) + '<div class="term-host"></div>';
      this.term = new TX.Terminal(this.pane.querySelector('.term-host'));
      this.stack = [];
      this.gen = 0;
      this.pane.querySelector('.wb-close').addEventListener('click', () => app.closeTab(this));
      const max = this.pane.querySelector('.wb-max');
      if (max) max.addEventListener('click', () => app.toggleFullscreen());
      const min = this.pane.querySelector('.wb-min');
      if (min) min.addEventListener('click', () => app.showLauncher());
    }
    historyFor(key) { return this.app.historyFor(key); }
    get top() { return this.stack[this.stack.length - 1]; }
    machine() { return this.app.machine(this.def.machine); }
    makeRoot() {
      return TX.makeShell(this.kind, this, this.machine(), this.opts.admin ? { admin: true } : {});
    }
    pushShell(sh, ssh) {
      this.stack.push(sh);
      if (ssh && sh.kind === 'posix') {
        const m = sh.m;
        if (sh.wsl) this.term.write(`Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 5.15.153.1-microsoft-standard-WSL2 x86_64)\n\n * Documentation:  https://help.ubuntu.com\n\n${C.dim('(WSL: you are now in Linux inside Windows. Type exit to go back.)')}\n\n`);
        else this.term.write((m.kind === 'linux' ? `Welcome to Ubuntu 24.04.1 LTS (GNU/Linux ${m.hw.kernel} x86_64)\n\n * Documentation:  https://help.ubuntu.com\n\nLast login: ${TX.unixDate(Date.now() - 3600000 * 20).replace(/ EDT/, '')} from 192.168.1.57\n` : `Last login: ${TX.unixDate(Date.now() - 3600000 * 5).replace(/ EDT \d+$/, '')} from 192.168.1.42\n`));
      } else if (sh.banner && sh.kind !== 'posix') this.term.write(sh.banner());
      this.refreshTitle();
    }
    async start() {
      const gen = ++this.gen;
      this.stack = [];
      this.term.clear();
      const root = this.makeRoot();
      this.stack.push(root);
      this.term.write(root.banner ? root.banner() : '');
      this.refreshTitle();
      this.applyTheme();
      if (TX.UI) TX.UI.visit(this.kind);
      if (root.boot) { try { await root.boot(); } catch (e) { console.error(e); } }
      while (gen === this.gen) {
        const sh = this.top;
        if (!sh) break;
        if (sh.reportJobs) sh.reportJobs();
        this.refreshTitle();
        let line;
        // UNIX V7 (1979) and MS-DOS without DOSKEY had no arrow-key history and no Tab completion.
        const old = sh.noLineEditing || (sh.m && sh.m.def && sh.m.def.noLineEditing);
        const hl = this.app.settings.highlight && sh.highlight && !old ? (s) => sh.highlight(s) : null;
        line = await this.term.readLine({ prompt: sh.prompt(), history: old ? [] : sh.history, completer: sh.completer && !old ? (b, p) => sh.completer(b, p) : null, highlight: hl, onEOF: sh.kind === 'posix', escClears: sh.kind !== 'posix' });
        if (gen !== this.gen) break;
        if (line === null) continue;
        if (line === '\x04') { line = 'exit'; this.term.write(sh.kind === 'posix' && sh.flavor !== 'zsh' ? 'exit\n' : '\n'); }
        if (sh.kind === 'posix') {
          while (TX.posixNeedsMore(line)) {
            const more = await this.term.readLine({ prompt: '> ', history: [] });
            if (more === null) { line = null; break; }
            line += (/\\$/.test(line) ? '' : '\n') + more;
            if (/\\$/.test(line)) line = line.slice(0, -1);
          }
          if (line === null) continue;
        }
        if (line.trim()) {
          const H = sh.history;
          if (H[H.length - 1] !== line) H.push(line);
          if (H.length > 1000) H.shift();
          this.app.logCommand(this.trackKey(), line.trim());
        }
        try {
          if (sh.kind === 'ps') await sh.exec(line);
          else await sh.exec(line);
          if (sh.kind === 'posix' && sh.flavor === 'gitbash') { /* git bash prints an empty line before the prompt via prompt() */ }
        } catch (e) {
          if (e && e.exitShell) {
            this.stack.pop();
            if (sh.sshFrom) this.term.write(`logout\nConnection to ${sh.sshFrom} closed.\n`);
            if (!this.stack.length) { this.app.onSessionExit(this, e.code); return; }
            continue;
          }
          if (e && e.interrupt) { this.term.write('\n'); continue; }
          if (e && e.user) { this.term.write(e.message + '\n'); continue; }
          console.error(e);
          this.term.write(C.red('TerminalEX internal error: ' + (e && e.message ? e.message : e)) + '\n' + C.dim('(This is a bug in the simulator, not your fault! Try a different command.)') + '\n');
        }
        this.app.afterCommand(this);
      }
    }
    trackKey() { return TX.trackOf(this.kind); }
    refreshTitle() {
      const sh = this.top;
      let t = this.def.label;
      if (sh) t = sh.customTitle || (sh.title ? sh.title() : t);
      if (this.stack[0] && this.stack[0].customTitle) t = this.stack[0].customTitle;
      this.title = t;
      const wt = this.pane.querySelector('.wb-title');
      if (wt) wt.textContent = t;
      if (this.tabEl) { this.tabEl.querySelector('.tab-title').textContent = this.opts.admin && !/^Administrator/.test(t) ? 'Administrator: ' + t : t; }
      if (this.app.active === this) document.title = t + ' — TerminalEX';
    }
    applyTheme() {
      const s = this.app.settings;
      const key = s.theme === 'auto' ? this.def.theme : s.theme;
      const th = THEMES[key] || THEMES.campbell;
      const host = this.pane;
      host.style.setProperty('--bg', th.bg);
      host.style.setProperty('--fg', th.fg);
      host.style.setProperty('--cursor', th.cursor);
      host.style.setProperty('--selection', th.sel);
      th.pal.forEach((c, i) => host.style.setProperty('--ansi' + i, c));
      const font = s.font === 'auto' ? this.def.font : FONTS[s.font] || this.def.font;
      host.style.setProperty('--term-font', font);
      host.style.setProperty('--term-size', Math.round(s.fontSize * (s.font === 'auto' ? this.def.fontScale : 1)) + 'px');
      host.classList.toggle('crt', !!s.crt || key === 'retro' || key === 'amber');
      host.classList.toggle('noblink', !s.cursorBlink);
      host.classList.toggle('light-theme', key === 'light' || key === 'teletype');
      if (this.colorOverride) this.setColors(this.colorOverride[0], this.colorOverride[1]);
      requestAnimationFrame(() => this.term.measure());
    }
    setColors(bg, fg) {
      if (bg === null && fg === null) { this.colorOverride = null; this.pane.style.removeProperty('--bg-override'); this.applyTheme(); return; }
      this.colorOverride = [bg, fg];
      if (bg !== null) this.pane.style.setProperty('--bg', `var(--ansi${bg})`);
      if (fg !== null) this.pane.style.setProperty('--fg', `var(--ansi${fg})`);
    }
    focus() { this.term.focus(); }
  }

  function windowBar(os) {
    const btn = (cls, svg) => `<button class="wb-btn ${cls}" aria-label="${cls.slice(3)}">${svg}</button>`;
    const minus = '<svg viewBox="0 0 10 10"><path d="M1 5h8" stroke="currentColor" stroke-width="1.2"/></svg>';
    const box = '<svg viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
    const x = '<svg viewBox="0 0 10 10"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.2"/></svg>';
    if (os === 'mac') return `<div class="window-bar wb-mac"><div class="wb-lights">${btn('wb-close', '')}${btn('wb-min', '')}${btn('wb-max', '')}</div><div class="wb-title"></div><div class="wb-spacer"></div></div>`;
    if (os === 'linux') return `<div class="window-bar wb-linux"><div class="wb-left"><span class="wb-ico">⊞</span></div><div class="wb-title"></div><div class="wb-right">${btn('wb-min', minus)}${btn('wb-max', box)}${btn('wb-close', x)}</div></div>`;
    if (os === 'dos') return `<div class="window-bar wb-dos"><div class="wb-left"><span class="wb-appico dos">C:\\</span><span class="wb-title"></span></div><div class="wb-right">${btn('wb-min', '▼')}${btn('wb-max', '▲')}${btn('wb-close', x)}</div></div>`;
    if (os === 'tty') return `<div class="window-bar wb-tty"><div class="wb-left"><span class="wb-ico">DEC VT100</span></div><div class="wb-title"></div><div class="wb-right">${btn('wb-close', x)}</div></div>`;
    if (os === 'solaris') return `<div class="window-bar wb-cde"><div class="wb-left"><span class="wb-ico">☀</span></div><div class="wb-title"></div><div class="wb-right">${btn('wb-min', '<span class="cde-min"></span>')}${btn('wb-max', '<span class="cde-max"></span>')}${btn('wb-close', x)}</div></div>`;
    if (os === 'bsd') return `<div class="window-bar wb-linux wb-bsd"><div class="wb-left"><span class="wb-ico">😈</span></div><div class="wb-title"></div><div class="wb-right">${btn('wb-min', minus)}${btn('wb-max', box)}${btn('wb-close', x)}</div></div>`;
    if (os === 'gitbash') return `<div class="window-bar wb-win wb-mintty"><div class="wb-left"><span class="wb-appico gb">◆</span><span class="wb-title"></span></div><div class="wb-right">${btn('wb-min', minus)}${btn('wb-max', box)}${btn('wb-close', x)}</div></div>`;
    return `<div class="window-bar wb-win"><div class="wb-left"><span class="wb-appico">&gt;_</span><span class="wb-title"></span></div><div class="wb-right">${btn('wb-min', minus)}${btn('wb-max', box)}${btn('wb-close', x)}</div></div>`;
  }

  // ------------------------------------------------------------------ App
  const DEFAULT_SETTINGS = { theme: 'auto', font: 'auto', fontSize: 15, crt: false, highlight: true, bell: true, cursorBlink: true, showAnswers: true };
  const App = {
    machines: {},
    sessions: [],
    active: null,
    histories: store.get('history', {}),
    log: store.get('log', {}),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {})),
    saveTimer: null,

    init() {
      const remotes = store.get('remotes', null);
      if (remotes) Object.assign(TX.gitRemotes, remotes);
      TX.psExecPolicy = store.get('psExecPolicy', null) || undefined;
      const UI = TX.UI;
      UI.settleOpenTests();
      UI.onChange = () => { this.renderDrawer(); if (!$('#launcher').classList.contains('hidden')) UI.renderHome(); this.renderStudent(); };
      this.buildLauncher();
      this.buildNewMenu();
      this.bindUI();
      this.renderDrawer();
      const open = store.get('openTabs', []);
      if (open.length) open.forEach((k) => this.newTab(k, {}, true));
      if (this.sessions.length) this.activate(this.sessions[0]); else this.showLauncher(true);
      this.renderStudent();
      if (!UI.state.name) setTimeout(() => UI.welcome(), 300);
      window.addEventListener('beforeunload', () => { this.saveNow(); UI.saveNow(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveNow(); });
    },

    machine(kind) {
      if (this.machines[kind]) return this.machines[kind];
      const saved = (this.restored && this.restored[kind]) || store.get('fs.' + kind, null);
      if (this.restored) delete this.restored[kind];
      let m;
      if (saved && saved.root) {
        try {
          m = new TX.Machine(kind, saved.root);
          if (saved.installed) m.installed = new Set(saved.installed);
          if (saved.users) m.users = saved.users;
          if (saved.disks) m.disks = saved.disks;
          if (saved.hostname) m.net.hostname = saved.hostname;
          if (saved.extra) m.extra = saved.extra;
          if (saved.services) m.services = saved.services;
        } catch (e) { console.warn('Could not restore machine', kind, e); m = null; }
      }
      if (!m) {
        m = new TX.Machine(kind);
        const url = 'https://github.com/student/hello-web.git';
        if (m.vfs.get(m.home.concat('projects'))) { try { TX.git.seedRepo(m.vfs, m.home.concat('projects', 'hello-web'), 'student', url); } catch (e) { console.warn(e); } }
      }
      m.vfs.onChange = () => this.save();
      this.machines[kind] = m;
      return m;
    },
    resetMachine(kind) {
      store.del('fs.' + kind);
      delete this.machines[kind];
      this.sessions.filter((s) => s.def.machine === kind).forEach((s) => { s.colorOverride = null; s.start(); });
      this.renderDrawer();
      this.toast('♻️  Machine reset to factory settings');
    },
    // A progress file was loaded: swap in its pretend computers and remotes now, in place. (Reloading the page
    // instead would let beforeunload save the old in-memory machines over the restored ones.)
    loadWork(w) {
      const machines = (w && w.machines) || {};
      this.restored = this.restored || {};
      Object.keys(machines).forEach((k) => {
        delete this.machines[k];
        this.restored[k] = machines[k]; // used even if this browser won't store it
        store.set('fs.' + k, machines[k]);
      });
      if (w && w.remotes) { Object.keys(TX.gitRemotes).forEach((u) => delete TX.gitRemotes[u]); Object.assign(TX.gitRemotes, w.remotes); }
      this.sessions.filter((s) => machines[s.def.machine]).forEach((s) => { s.colorOverride = null; s.start(); });
      this.saveNow();
      this.renderDrawer();
    },
    trackOfMission(id) { for (const k of Object.keys(TX.missions.tracks)) if (TX.missions.tracks[k].list.some((m) => m.id === id)) return k; return null; },
    save() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow(), 800); },
    saveNow() {
      clearTimeout(this.saveTimer);
      Object.keys(this.machines).forEach((k) => {
        const m = this.machines[k];
        const ok = store.set('fs.' + k, { root: m.vfs.root, installed: [...m.installed], users: m.users, disks: m.disks, hostname: m.net.hostname, extra: m.extra, services: m.family === 'unix' && m.kind !== 'linux' && m.kind !== 'mac' ? m.services : undefined });
        if (!ok && !this.warnedQuota) { this.warnedQuota = true; this.toast('⚠️ Browser storage is full — changes may not be saved. Try reset-machine.'); }
      });
      store.set('remotes', TX.gitRemotes);
      store.set('history', this.histories);
      store.set('log', this.log);
      store.set('openTabs', this.sessions.map((s) => s.kind));
      if (TX.psExecPolicy) store.set('psExecPolicy', TX.psExecPolicy);
    },
    historyFor(key) { if (!this.histories[key]) this.histories[key] = []; return this.histories[key]; },
    logCommand(track, cmd) { const L = (this.log[track] = this.log[track] || []); L.push(cmd); if (L.length > 400) L.shift(); },
    activeShell() { return this.active ? this.active.top : null; },

    // ---------------- tabs
    newTab(kind, opts = {}, silent) {
      if (!SHELLS[kind]) return null;
      const s = new Session(this, kind, opts);
      this.sessions.push(s);
      $('#panes').appendChild(s.pane);
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.setAttribute('role', 'tab');
      tab.innerHTML = `<span class="tab-badge" style="--c:${SHELLS[kind].color}">${badge(kind)}</span><span class="tab-title">${SHELLS[kind].label}</span><button class="tab-close" title="Close tab" aria-label="Close tab">×</button>`;
      tab.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); this.closeTab(s); } });
      tab.addEventListener('click', (e) => { if (e.target.closest('.tab-close')) { this.closeTab(s); return; } this.activate(s); });
      s.tabEl = tab;
      $('#tabs').appendChild(tab);
      s.start();
      this.activate(s);
      this.hideLauncher();
      if (!silent) this.save();
      return s;
    },
    activate(s) {
      this.active = s;
      this.sessions.forEach((x) => { x.pane.classList.toggle('active', x === s); x.tabEl.classList.toggle('active', x === s); x.tabEl.setAttribute('aria-selected', x === s ? 'true' : 'false'); });
      s.applyTheme();
      s.refreshTitle();
      this.renderDrawer();
      setTimeout(() => { s.term.measure(); s.focus(); s.term.scrollBottom(); }, 30);
    },
    closeTab(s) {
      const i = this.sessions.indexOf(s);
      if (i < 0) return;
      s.gen++;
      if (s.term.pending) { const p = s.term.pending; s.term.pending = null; p.resolve(null); }
      if (s.term.app && s.term.app.exit) s.term.app.exit();
      s.term.signal.abort();
      s.pane.remove(); s.tabEl.remove();
      this.sessions.splice(i, 1);
      if (this.active === s) { const n = this.sessions[Math.min(i, this.sessions.length - 1)]; if (n) this.activate(n); else { this.active = null; this.showLauncher(true); document.title = 'TerminalEX'; } }
      this.save();
    },
    onSessionExit(s) { this.closeTab(s); },
    afterCommand(s) {
      this.checkMissions(s);
      this.save();
    },

    // ---------------- missions
    missionCtx(track) {
      const shellDef = SHELLS[track] || SHELLS.bash;
      const m = this.machine(shellDef.machine);
      return { log: this.log[track] || [], m, vfs: m.vfs };
    },
    checkMissions(s) {
      const track = s.trackKey();
      const t = TX.missions.tracks[track];
      if (!t) return;
      const ctx = this.missionCtx(track);
      const won = [];
      t.list.forEach((mi) => {
        if (TX.UI.isDone(mi.id)) return;
        let ok = false;
        try { ok = mi.check(ctx); } catch (e) { ok = false; }
        if (ok) won.push([mi, TX.UI.completeMission(mi)]);
      });
      if (!won.length) return;
      // One command can finish several missions at once; show one combined toast instead of a stack.
      if (won.length === 1) this.toast(`🏁 Mission complete: <b>${TX.escapeHtml(won[0][0].title)}</b> <span class="xp">+${won[0][1]} XP</span>`, true);
      else this.toast(`🏁 ${won.length} missions complete: <b>${won.slice(0, 3).map(([mi]) => TX.escapeHtml(mi.title)).join(', ')}${won.length > 3 ? ', …' : ''}</b> <span class="xp">+${won.reduce((a, [, x]) => a + x, 0)} XP</span>`, true);
      this.confetti();
      this.renderDrawer();
    },

    // ---------------- UI building
    buildLauncher() { TX.UI.renderHome(); },
    renderStudent() {
      const b = $('#btn-student'); if (!b) return;
      const st = TX.UI.state, lv = TX.UI.level(st.xp);
      b.innerHTML = st.name ? `<span class="st-name">${TX.escapeHtml(st.name.split(' ')[0])}</span><span class="st-lv">Lv ${lv.n}</span>` : '<span class="st-name">Sign in</span>';
      b.title = st.name ? `${st.name} · Level ${lv.n} ${lv.title} · ${st.xp} XP` : 'Type your name to start earning XP';
    },
    buildNewMenu() {
      const menu = $('#new-menu');
      menu.innerHTML = TX.SHELL_ORDER.map((k, i) => `<button class="menu-item" data-kind="${k}"><span class="tab-badge" style="--c:${SHELLS[k].color}">${badge(k)}</span>${SHELLS[k].label}<kbd>Alt+${(i + 1) % 10}</kbd></button>`).join('') + '<div class="menu-sep"></div><button class="menu-item" data-kind="powershell" data-admin="1"><span class="tab-badge" style="--c:#2671BE">🛡</span>PowerShell (Administrator)</button><button class="menu-item" data-act="launcher"><span class="tab-badge" style="--c:#888">⌂</span>Start page<kbd>Alt+T</kbd></button>';
      menu.addEventListener('click', (e) => {
        const b = e.target.closest('.menu-item');
        if (!b) return;
        menu.classList.remove('open');
        if (b.dataset.act === 'launcher') { this.showLauncher(); return; }
        this.newTab(b.dataset.kind, { admin: !!b.dataset.admin });
      });
    },
    bindUI() {
      $('#btn-new').addEventListener('click', () => this.showLauncher());
      $('#btn-new-menu').addEventListener('click', (e) => { e.stopPropagation(); $('#new-menu').classList.toggle('open'); });
      document.addEventListener('click', (e) => { if (!e.target.closest('#new-menu') && !e.target.closest('#btn-new-menu')) $('#new-menu').classList.remove('open'); });
      $('#btn-missions').addEventListener('click', () => this.toggleDrawer('missions'));
      $('#btn-cheat').addEventListener('click', () => TX.UI.openCheatSheet());
      $('#btn-history').addEventListener('click', () => TX.UI.openHistory());
      $('#btn-home').addEventListener('click', () => { TX.UI.closePage(); this.showLauncher(); });
      $('#btn-student').addEventListener('click', () => (TX.UI.state.name ? TX.UI.studentMenu() : TX.UI.welcome()));
      $('.brand').addEventListener('click', () => { TX.UI.closePage(); this.showLauncher(); });
      $('#btn-settings').addEventListener('click', () => this.openSettings());
      $('#btn-full').addEventListener('click', () => this.toggleFullscreen());
      $('#launcher-close').addEventListener('click', () => this.hideLauncher());
      $('#drawer-close').addEventListener('click', () => this.toggleDrawer(null));
      $$('.drawer-tab').forEach((b) => b.addEventListener('click', () => { this.drawerTab = b.dataset.tab; this.renderDrawer(); }));
      $('#settings-close').addEventListener('click', () => this.closeSettings());
      $('#modal-settings').addEventListener('click', (e) => { if (e.target.id === 'modal-settings') this.closeSettings(); });
      document.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('testing')) return;
        if (e.key === 'Escape' && !$('#page').hidden && !document.querySelector('.ux-overlay')) { TX.UI.closePage(); e.preventDefault(); return; }
        if (e.key === 'Escape') { if ($('#modal-settings').classList.contains('open')) { this.closeSettings(); e.preventDefault(); return; } if (!$('#launcher').classList.contains('hidden') && this.sessions.length) { this.hideLauncher(); e.preventDefault(); return; } }
        if (!e.altKey || e.ctrlKey || e.metaKey) return;
        const k = e.key.toLowerCase();
        const kinds = TX.SHELL_ORDER;
        if (/^[0-9]$/.test(k)) { e.preventDefault(); this.newTab(kinds[k === '0' ? 9 : +k - 1]); }
        else if (k === 't') { e.preventDefault(); this.showLauncher(); }
        else if (k === 'w') { e.preventDefault(); if (this.active) this.closeTab(this.active); }
        else if (k === 'arrowright' || k === 'arrowleft') { e.preventDefault(); if (!this.active) return; const i = this.sessions.indexOf(this.active); const n = this.sessions[(i + (k === 'arrowright' ? 1 : -1) + this.sessions.length) % this.sessions.length]; this.activate(n); }
        else if (k === '=' || k === '+') { e.preventDefault(); this.setSetting('fontSize', Math.min(32, this.settings.fontSize + 1)); }
        else if (k === '-') { e.preventDefault(); this.setSetting('fontSize', Math.max(9, this.settings.fontSize - 1)); }
        else if (k === 'm') { e.preventDefault(); this.toggleDrawer('missions'); }
        else if (k === 'c') { e.preventDefault(); TX.UI.openCheatSheet(); }
        else if (k === 'h') { e.preventDefault(); TX.UI.closePage(); this.showLauncher(); }
        else if (k === 'enter') { e.preventDefault(); this.toggleFullscreen(); }
      });
      // touch helper keys
      const keys = $('#touch-keys');
      keys.addEventListener('pointerdown', (e) => {
        const b = e.target.closest('button');
        if (!b || !this.active) return;
        e.preventDefault();
        const t = this.active.term;
        const spec = b.dataset.k;
        const ev = { key: spec, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, preventDefault() {} };
        if (spec.startsWith('C-')) { ev.key = spec.slice(2); ev.ctrlKey = true; }
        if (spec.length === 1 && !ev.ctrlKey) { t.kbd.value = spec; t.onInput(); } else t.onKey(ev);
        t.focus();
      });
      if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
      window.addEventListener('resize', () => { if (this.active) this.active.term.measure(); });
    },
    showLauncher(noClose) {
      TX.UI.renderHome();
      $('#launcher').classList.remove('hidden');
      $('#launcher-close').style.display = noClose || !this.sessions.length ? 'none' : '';
      const first = $('#launcher .launch-card');
      if (first) first.focus();
    },
    hideLauncher() {
      if (!this.sessions.length) return;
      $('#launcher').classList.add('hidden');
      if (this.active) this.active.focus();
    },
    toggleFullscreen() {
      const el = document.documentElement;
      try { if (!document.fullscreenElement) el.requestFullscreen(); else document.exitFullscreen(); } catch (e) { /* not allowed */ }
    },
    toggleDrawer(tab, forceOpen) {
      const d = $('#drawer');
      if (!tab || (!forceOpen && d.classList.contains('open') && this.drawerTab === tab)) { d.classList.remove('open'); document.body.classList.remove('drawer-open'); }
      else { this.drawerTab = tab; d.classList.add('open'); document.body.classList.add('drawer-open'); }
      this.renderDrawer();
      setTimeout(() => { if (this.active) { this.active.term.measure(); this.active.focus(); } }, 260);
    },
    renderDrawer() {
      const tab = this.drawerTab || 'missions';
      $$('.drawer-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
      const body = $('#drawer-body');
      if (!body) return;
      if (tab === 'missions') body.innerHTML = this.missionsHTML();
      else if (tab === 'cheat') body.innerHTML = this.cheatHTML();
      else body.innerHTML = this.keysHTML();
      this.bindDrawer(body, tab);
      $('#xp-count').textContent = TX.UI.state.xp;
      this.renderStudent();
    },
    missionsHTML() {
      const UI = TX.UI;
      const track = this.active ? this.active.trackKey() : 'bash';
      const t = TX.missions.tracks[track] || TX.missions.tracks.bash;
      const tracks = [['bash', 'Linux'], ['zsh', 'macOS'], ['freebsd', 'FreeBSD'], ['solaris', 'Solaris'], ['cmd', 'cmd'], ['powershell', 'PowerShell'], ['gitbash', 'Git Bash'], ['dos', 'MS-DOS'], ['unix', 'UNIX V7']];
      const list = t.list;
      const doneN = list.filter((m) => UI.isDone(m.id)).length;
      const pct = Math.round((doneN / list.length) * 100);
      const groups = [];
      list.forEach((m) => { const L = TX.lessons.ofMission(m.id); const key = L ? L.id : 'other'; let g = groups.find((x) => x.key === key); if (!g) groups.push((g = { key, L, items: [] })); g.items.push(m); });
      const firstOpen = list.find((x) => !UI.isDone(x.id));
      const item = (m, i) => {
        const done = UI.isDone(m.id), h = UI.state.hints[m.id] || 0;
        return `<li class="m-item ${done ? 'done' : ''}" data-id="${m.id}"><details ${firstOpen === m ? 'open' : ''}><summary><span class="m-dot">${done ? '✓' : i + 1}</span><span class="m-name">${TX.escapeHtml(m.title)}</span><span class="m-xp">${done ? UI.state.done[m.id].xp : UI.reward(m)} XP</span></summary>
          <div class="m-body"><p>${TX.escapeHtml(m.text)}</p><div class="m-actions"><button class="m-hint">💡 Hint${h & 1 || done ? '' : ' <small>(−20% XP)</small>'}</button>${this.settings.showAnswers ? `<button class="m-ans">Show answer${h & 2 || done ? '' : ' <small>(−30% XP)</small>'}</button>` : ''}</div><p class="m-hint-text" ${h & 1 ? '' : 'hidden'}>${TX.escapeHtml(m.hint)}</p><p class="m-ans-text" ${h & 2 ? '' : 'hidden'}><code class="ins" data-cmd="${TX.escapeHtml(m.answer)}">${TX.escapeHtml(m.answer)}</code></p></div></details></li>`;
      };
      let n = 0;
      return `<div class="m-head"><div class="m-track">${tracks.map(([k, l]) => `<button class="m-chip ${k === track ? 'on' : ''}" data-open="${k}" title="Open a ${l} tab">${l}</button>`).join('')}</div>
        <div class="m-title">${TX.escapeHtml(t.name)} missions</div>
        <div class="m-progress"><div class="m-bar"><span style="width:${pct}%"></span></div><span>${doneN}/${list.length}</span></div>
        <p class="m-note">Missions check your work automatically as you type in a <b>${TX.escapeHtml(t.name)}</b> tab. A hint costs 20% of a mission's XP.</p></div>
        ${groups.map((g) => `${g.L ? `<div class="m-lesson"><span>${g.L.icon} Lesson ${g.L.n}: ${TX.escapeHtml(g.L.title)}</span><button class="linkish" data-guide="${g.L.id}">📖 guide</button>${UI.lessonDone(g.L) ? `<button class="linkish" data-test="${g.L.id}">🎓 ${UI.state.certs[g.L.id] ? 'certificate' : 'test'}</button>` : ''}</div>` : ''}<ol class="m-list">${g.items.map((m) => item(m, n++)).join('')}</ol>`).join('')}`;
    },
    cheatHTML() {
      const R = TX.reference;
      const k = this.active ? TX.trackOf(this.active.kind) : 'bash';
      const plat = R.PLATS.find((p) => p.k === (k === 'gitbash' ? 'bash' : k)) || R.PLATS[0];
      return `<p class="m-note">Quick reference for <b>${TX.escapeHtml(plat.label)}</b>. Click a command to type it. <button class="linkish" id="open-cs">Open the full Interactive Cheat Sheet (all systems, ▶ Run) →</button></p>
        ${R.CATS.map(([cat, icon, label]) => { const rows = R.TASKS.filter((t) => t.cat === cat).map((t) => [t, R.cell(t, plat.k)]).filter(([, c]) => c.c); return rows.length ? `<div class="m-lesson"><span>${icon} ${TX.escapeHtml(label)}</span></div><table class="cheat">${rows.map(([t, c]) => `<tr><td>${TX.escapeHtml(t.task)}</td><td><code class="ins" data-cmd="${TX.escapeHtml(c.c.split('\n')[0])}">${TX.escapeHtml(c.c.split('\n')[0])}</code></td></tr>`).join('')}</table>` : ''; }).join('')}`;
    },
    keysHTML() {
      const rows = [['Tab', 'Complete a command or file name (press twice to list options in bash)'], ['↑ / ↓', 'Scroll through command history'], ['Ctrl+R', 'Search history (type to search, Enter to run)'], ['Ctrl+C', 'Stop the running command (or copy selected text)'], ['Ctrl+L', 'Clear the screen'], ['Ctrl+A / Ctrl+E', 'Jump to start / end of the line'], ['Ctrl+U / Ctrl+K', 'Delete to start / end of the line'], ['Ctrl+W', 'Delete the previous word (browsers may close the tab — careful!)'], ['Ctrl+D', 'Exit the shell (bash/zsh, on an empty line)'], ['Right-click', 'Paste (or copy, if text is selected)'], ['Alt+1 … Alt+0', 'Open ' + TX.SHELL_ORDER.map((k) => SHELLS[k].label).join(', ')], ['Alt+T / Alt+W', 'Home page / close tab'], ['Alt+← / Alt+→', 'Switch tabs'], ['Alt+= / Alt+-', 'Bigger / smaller text'], ['Alt+M / Alt+C', 'Missions / Interactive Cheat Sheet'], ['Alt+H', 'Home: lessons, tests, certificates'], ['Alt+Enter', 'Full screen']];
      return `<table class="keys">${rows.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>
      <div class="m-note"><p><b>Passwords</b> in this simulator: <code>student</code> (sudo, ssh), <code>teacher</code> (su teacher). GitHub pushes want a token: anything starting with <code>ghp_</code>.</p>
      <p><b>Machines</b>: Linux <code>ubuntu-lab</code> (192.168.1.42), Mac <code>MacBook-Pro</code> (192.168.1.57), Windows <code>DESKTOP-LAB42</code> (192.168.1.105), FreeBSD <code>freebsd-lab</code>, Solaris <code>sol-lab</code> (SPARC), a 1994 MS-DOS PC and a 1979 PDP-11 running UNIX V7. Root's password on FreeBSD, Solaris and V7 is <code>student</code>. cmd, PowerShell and Git Bash share the same Windows disk — make a file in one and see it in the others! Try <code>ssh student@ubuntu-lab</code> from the Mac, or <code>wsl</code> from Windows.</p>
      <p><b>Broke something?</b> Type <code>reset-machine</code> in any shell (or use Settings) to restore factory files.</p></div>`;
    },
    bindDrawer(body, tab) {
      body.querySelectorAll('.ins').forEach((el) => el.addEventListener('click', () => { if (!this.active) return; this.active.term.paste(el.dataset.cmd); this.active.focus(); }));
      const cs = body.querySelector('#open-cs'); if (cs) cs.addEventListener('click', () => TX.UI.openCheatSheet());
      if (tab === 'missions') {
        const hint = (b, kind, sel) => { const id = b.closest('.m-item').dataset.id; if (!TX.UI.isDone(id)) TX.UI.useHint(id, kind); const p = b.closest('.m-body').querySelector(sel); p.hidden = false; b.querySelector('small') && b.querySelector('small').remove(); const xp = b.closest('.m-item').querySelector('.m-xp'); const mi = TX.lessons.mission(id); if (!TX.UI.isDone(id)) xp.textContent = TX.UI.reward(mi) + ' XP'; };
        body.querySelectorAll('.m-hint').forEach((b) => b.addEventListener('click', () => hint(b, 'hint', '.m-hint-text')));
        body.querySelectorAll('.m-ans').forEach((b) => b.addEventListener('click', () => hint(b, 'answer', '.m-ans-text')));
        body.querySelectorAll('[data-guide]').forEach((b) => b.addEventListener('click', () => TX.UI.showGuide(TX.lessons.byId(b.dataset.guide))));
        body.querySelectorAll('[data-test]').forEach((b) => b.addEventListener('click', () => { const L = TX.lessons.byId(b.dataset.test); if (TX.UI.state.certs[L.id]) TX.UI.showCertificate(L); else TX.UI.startTest(L); }));
        body.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.open; const ex = this.sessions.find((s) => s.trackKey() === k); if (ex) this.activate(ex); else this.newTab(k); }));
      }
    },

    // ---------------- settings
    openSettings() {
      const s = this.settings;
      const themeOpts = [['auto', 'Authentic (matches each OS)']].concat(Object.keys(THEMES).map((k) => [k, THEMES[k].name]));
      const fontOpts = [['auto', 'Authentic (matches each OS)'], ['jetbrains', 'JetBrains Mono'], ['cascadia', 'Cascadia Mono'], ['ubuntu', 'Ubuntu Mono'], ['fira', 'Fira Code'], ['source', 'Source Code Pro'], ['plex', 'IBM Plex Mono']];
      $('#settings-body').innerHTML = `
        <label class="field"><span>Color theme</span><select id="set-theme">${themeOpts.map(([k, n]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="theme-swatches">${Object.keys(THEMES).map((k) => `<button class="swatch ${s.theme === k ? 'on' : ''}" data-theme="${k}" title="${THEMES[k].name}" style="background:${THEMES[k].bg};color:${THEMES[k].fg}"><span style="background:${THEMES[k].pal[1]}"></span><span style="background:${THEMES[k].pal[2]}"></span><span style="background:${THEMES[k].pal[4]}"></span>Aa</button>`).join('')}</div>
        <label class="field"><span>Font</span><select id="set-font">${fontOpts.map(([k, n]) => `<option value="${k}" ${s.font === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span>Text size <b id="size-val">${s.fontSize}px</b></span><input id="set-size" type="range" min="10" max="28" value="${s.fontSize}"></label>
        <label class="check"><input type="checkbox" id="set-hl" ${s.highlight ? 'checked' : ''}> Syntax-highlight what I type (green = known command, red = unknown)</label>
        <label class="check"><input type="checkbox" id="set-blink" ${s.cursorBlink ? 'checked' : ''}> Blinking cursor</label>
        <label class="check"><input type="checkbox" id="set-crt" ${s.crt ? 'checked' : ''}> Retro CRT effect (scanlines + glow)</label>
        <label class="check"><input type="checkbox" id="set-ans" ${s.showAnswers ? 'checked' : ''}> Show "answer" buttons in missions (turn off for tests)</label>
        <div class="danger"><div><b>Reset a machine</b><br><span class="muted">Restores all files, installed packages and git repos to factory defaults.</span></div>
          <div class="reset-row"><button data-reset="linux">Ubuntu</button><button data-reset="mac">Mac</button><button data-reset="windows">Windows</button><button data-reset="freebsd">FreeBSD</button><button data-reset="solaris">Solaris</button><button data-reset="dos">MS-DOS</button><button data-reset="unix">UNIX V7</button><button data-reset="all" class="bad">Everything (files only)</button></div></div>`;
      $('#modal-settings').classList.add('open');
      const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
      on('#set-theme', 'change', (e) => this.setSetting('theme', e.target.value));
      on('#set-font', 'change', (e) => this.setSetting('font', e.target.value));
      on('#set-size', 'input', (e) => { $('#size-val').textContent = e.target.value + 'px'; this.setSetting('fontSize', +e.target.value); });
      on('#set-hl', 'change', (e) => this.setSetting('highlight', e.target.checked));
      on('#set-blink', 'change', (e) => this.setSetting('cursorBlink', e.target.checked));
      on('#set-crt', 'change', (e) => this.setSetting('crt', e.target.checked));
      on('#set-ans', 'change', (e) => { this.setSetting('showAnswers', e.target.checked); this.renderDrawer(); });
      $$('.swatch').forEach((b) => b.addEventListener('click', () => { this.setSetting('theme', b.dataset.theme); $('#set-theme').value = b.dataset.theme; $$('.swatch').forEach((x) => x.classList.toggle('on', x === b)); }));
      $$('[data-reset]').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.reset;
        if (!confirm(k === 'all' ? 'Reset the files on EVERY pretend computer? (Your XP, missions and certificates are kept.)' : `Reset the ${b.textContent} machine to factory settings?`)) return;
        if (k === 'all') { try { Object.keys(localStorage).filter((x) => x.startsWith('tx.')).forEach((x) => localStorage.removeItem(x)); } catch (e) { /* ignore */ } location.reload(); return; }
        this.resetMachine(k);
        this.closeSettings();
      }));
    },
    closeSettings() { $('#modal-settings').classList.remove('open'); if (this.active) this.active.focus(); },
    setSetting(k, v) {
      this.settings[k] = v;
      store.set('settings', this.settings);
      this.sessions.forEach((s) => s.applyTheme());
    },

    // ---------------- feedback
    toast(html, big) {
      const t = document.createElement('div');
      t.className = 'toast' + (big ? ' big' : '');
      t.innerHTML = html;
      const box = $('#toasts');
      box.appendChild(t);
      while (box.children.length > 3) box.firstElementChild.remove();
      requestAnimationFrame(() => t.classList.add('in'));
      setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, big ? 4200 : 3200);
    },
    confetti() {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const layer = document.createElement('div');
      layer.className = 'confetti';
      const colors = ['#E95420', '#5391FE', '#16C60C', '#F9F1A5', '#F05032', '#B4009E'];
      for (let i = 0; i < 60; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = colors[i % colors.length]; p.style.animationDelay = Math.random() * 0.4 + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`; layer.appendChild(p); }
      document.body.appendChild(layer);
      setTimeout(() => layer.remove(), 2600);
    },
  };

  function badge(kind) {
    const map = { bash: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#E95420"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="18.6" cy="12" r="1.9" fill="#fff"/><circle cx="8.7" cy="6.3" r="1.9" fill="#fff"/><circle cx="8.7" cy="17.7" r="1.9" fill="#fff"/></svg>', zsh: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="4" fill="#3a3a3c"/><path d="M6 9l3 3-3 3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 15h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>', cmd: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2" fill="#0c0c0c" stroke="#8a8a8a"/><text x="4.2" y="15.5" font-size="8" font-family="Consolas,monospace" fill="#ccc">C:\\</text></svg>', powershell: '<svg viewBox="0 0 24 24"><path d="M5 3h16l-3 18H2z" fill="#2671BE"/><path d="M7 8l5 4-6 4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16h4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>', pwsh: '<svg viewBox="0 0 24 24"><path d="M5 3h16l-3 18H2z" fill="#1d2a3d" stroke="#5391FE" stroke-width="1.2"/><path d="M7 8l5 4-6 4" stroke="#5391FE" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16h4" stroke="#5391FE" stroke-width="1.8" stroke-linecap="round"/></svg>', gitbash: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2.5" transform="rotate(45 12 12)" fill="#F05032"/><circle cx="12" cy="8" r="1.6" fill="#fff"/><circle cx="12" cy="16" r="1.6" fill="#fff"/><circle cx="15.5" cy="12" r="1.6" fill="#fff"/><path d="M12 8v8M12 9.5l3.5 2.5" stroke="#fff" stroke-width="1.3"/></svg>' };
    Object.assign(map, {
      freebsd: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8.5" fill="#AB2B28"/><path d="M4.2 4.5c1.8-.4 3.5.3 4.3 1.6M19.8 4.5c-1.8-.4-3.5.3-4.3 1.6" stroke="#AB2B28" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="9.3" cy="12" r="1.3" fill="#fff"/><circle cx="14.7" cy="12" r="1.3" fill="#fff"/><path d="M9 16.2c1.8 1.3 4.2 1.3 6 0" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>',
      solaris: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="#F29111"/><g stroke="#F29111" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g></svg>',
      dos: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="1" fill="#000" stroke="#00A8A8"/><text x="4" y="15.5" font-size="8" font-family="Consolas,monospace" fill="#AAAAAA">C&gt;_</text></svg>',
      unix: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2" fill="#F3EEDC" stroke="#8a7f62"/><text x="4.5" y="15.5" font-size="8.5" font-family="Courier New,monospace" font-weight="700" fill="#2B2A26">$ _</text></svg>',
    });
    return map[kind] || '>_';
  }

  App.badge = badge;
  TX.app = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
})();
