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
    amber: { name: 'Retro Amber', bg: '#140C00', fg: '#FFB000', cursor: '#FFB000', sel: '#5F4100', pal: ['#140C00', '#FFB000', '#FFB000', '#FFCC66', '#E09A00', '#FFB000', '#FFCC66', '#FFB000', '#8F6200', '#FFCC66', '#FFCC66', '#FFE0A3', '#FFB000', '#FFCC66', '#FFE0A3', '#FFF3D9'] },
  };
  const FONTS = {
    auto: null,
    jetbrains: "'JetBrains Mono', monospace", cascadia: "'Cascadia Mono', 'Cascadia Code', Consolas, monospace", ubuntu: "'Ubuntu Mono', monospace", fira: "'Fira Code', monospace", source: "'Source Code Pro', monospace", plex: "'IBM Plex Mono', monospace",
  };

  // ------------------------------------------------------------------ shells
  const SHELLS = {
    bash: { label: 'Ubuntu', sub: 'bash 5.2 · Ubuntu 24.04 LTS', machine: 'linux', os: 'linux', theme: 'ubuntu', font: "'Ubuntu Mono', 'DejaVu Sans Mono', monospace", fontScale: 1.12, badge: '$_', color: '#E95420' },
    zsh: { label: 'macOS', sub: 'zsh 5.9 · macOS Sequoia 15', machine: 'mac', os: 'mac', theme: 'macos', font: "'SF Mono', Menlo, 'JetBrains Mono', monospace", fontScale: 1, badge: '%', color: '#A2AAAD' },
    cmd: { label: 'Command Prompt', sub: 'cmd.exe · Windows 11', machine: 'windows', os: 'windows', theme: 'campbell', font: "'Cascadia Mono', Consolas, monospace", fontScale: 1, badge: 'C:\\', color: '#9E9E9E' },
    powershell: { label: 'Windows PowerShell', sub: 'PowerShell 5.1 · Windows 11', machine: 'windows', os: 'windows', theme: 'powershell', font: "'Cascadia Mono', Consolas, monospace", fontScale: 1, badge: '>_', color: '#2671BE' },
    pwsh: { label: 'PowerShell 7', sub: 'pwsh 7.4 · cross-platform', machine: 'windows', os: 'windows', theme: 'campbell', font: "'Cascadia Mono', Consolas, monospace", fontScale: 1, badge: '❯_', color: '#5391FE' },
    gitbash: { label: 'Git Bash', sub: 'MINGW64 · Git for Windows 2.46', machine: 'windows', os: 'gitbash', theme: 'mintty', font: "Consolas, 'Lucida Console', 'Cascadia Mono', monospace", fontScale: 1, badge: '◆', color: '#F05032' },
  };
  TX.SHELLS = SHELLS;

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
      const m = this.machine();
      switch (this.kind) {
        case 'bash': return new TX.PosixShell(this, m, 'bash', {});
        case 'zsh': return new TX.PosixShell(this, m, 'zsh', {});
        case 'gitbash': return new TX.PosixShell(this, m, 'gitbash', {});
        case 'cmd': return new TX.CmdShell(this, m, { admin: this.opts.admin });
        case 'powershell': return new TX.PowerShell(this, m, { admin: this.opts.admin });
        case 'pwsh': return new TX.PowerShell(this, m, { pwsh: true, admin: this.opts.admin });
      }
      return null;
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
      while (gen === this.gen) {
        const sh = this.top;
        if (!sh) break;
        if (sh.reportJobs) sh.reportJobs();
        this.refreshTitle();
        let line;
        const hl = this.app.settings.highlight && sh.highlight ? (s) => sh.highlight(s) : null;
        line = await this.term.readLine({ prompt: sh.prompt(), history: sh.history, completer: sh.completer ? (b, p) => sh.completer(b, p) : null, highlight: hl, onEOF: sh.kind === 'posix', escClears: sh.kind !== 'posix' });
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
    trackKey() { const t = this.stack[0]; if (!t) return this.kind; return this.kind === 'pwsh' ? 'powershell' : this.kind; }
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
      host.classList.toggle('light-theme', key === 'light');
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
    done: store.get('missions', {}),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {})),
    saveTimer: null,

    init() {
      const remotes = store.get('remotes', null);
      if (remotes) Object.assign(TX.gitRemotes, remotes);
      TX.psExecPolicy = store.get('psExecPolicy', null) || undefined;
      this.buildLauncher();
      this.buildNewMenu();
      this.bindUI();
      this.renderDrawer();
      const open = store.get('openTabs', []);
      if (open.length) open.forEach((k) => this.newTab(k, {}, true));
      if (this.sessions.length) this.activate(this.sessions[0]); else this.showLauncher(true);
      window.addEventListener('beforeunload', () => this.saveNow());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.saveNow(); });
    },

    machine(kind) {
      if (this.machines[kind]) return this.machines[kind];
      const saved = store.get('fs.' + kind, null);
      let m;
      if (saved && saved.root) {
        try {
          m = new TX.Machine(kind, saved.root);
          if (saved.installed) m.installed = new Set(saved.installed);
          if (saved.users) m.users = saved.users;
          if (saved.disks) m.disks = saved.disks;
          if (saved.hostname) m.net.hostname = saved.hostname;
        } catch (e) { console.warn('Could not restore machine', kind, e); m = null; }
      }
      if (!m) {
        m = new TX.Machine(kind);
        const url = 'https://github.com/student/hello-web.git';
        try { TX.git.seedRepo(m.vfs, m.home.concat('projects', 'hello-web'), 'student', url); } catch (e) { console.warn(e); }
      }
      m.vfs.onChange = () => this.save();
      this.machines[kind] = m;
      return m;
    },
    resetMachine(kind) {
      store.del('fs.' + kind);
      delete this.machines[kind];
      this.sessions.filter((s) => s.def.machine === kind).forEach((s) => { s.colorOverride = null; s.start(); });
      Object.keys(this.done).forEach((id) => { const t = this.trackOfMission(id); if (t && SHELLS[t] && SHELLS[t].machine === kind) delete this.done[id]; });
      store.set('missions', this.done);
      this.renderDrawer();
      this.toast('♻️  Machine reset to factory settings');
    },
    trackOfMission(id) { for (const k of Object.keys(TX.missions.tracks)) if (TX.missions.tracks[k].list.some((m) => m.id === id)) return k; return null; },
    save() { clearTimeout(this.saveTimer); this.saveTimer = setTimeout(() => this.saveNow(), 800); },
    saveNow() {
      clearTimeout(this.saveTimer);
      Object.keys(this.machines).forEach((k) => {
        const m = this.machines[k];
        const ok = store.set('fs.' + k, { root: m.vfs.root, installed: [...m.installed], users: m.users, disks: m.disks, hostname: m.net.hostname });
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
        if (this.done[mi.id]) return;
        let ok = false;
        try { ok = mi.check(ctx); } catch (e) { ok = false; }
        if (ok) { this.done[mi.id] = Date.now(); won.push(mi); }
      });
      if (!won.length) return;
      // One command can finish several missions at once; show one combined toast instead of a stack.
      if (won.length === 1) this.toast(`🏁 Mission complete: <b>${TX.escapeHtml(won[0].title)}</b> <span class="xp">+${won[0].xp} XP</span>`, true);
      else this.toast(`🏁 ${won.length} missions complete: <b>${won.slice(0, 3).map((mi) => TX.escapeHtml(mi.title)).join(', ')}${won.length > 3 ? ', …' : ''}</b> <span class="xp">+${won.reduce((a, mi) => a + mi.xp, 0)} XP</span>`, true);
      this.confetti();
      store.set('missions', this.done); this.renderDrawer();
    },

    // ---------------- UI building
    buildLauncher() {
      const grid = $('#launcher-grid');
      grid.innerHTML = Object.keys(SHELLS).map((k) => {
        const d = SHELLS[k];
        return `<button class="launch-card" data-kind="${k}" style="--c:${d.color}"><span class="lc-badge">${badge(k)}</span><span class="lc-text"><span class="lc-name">${d.label}</span><span class="lc-sub">${d.sub}</span></span><span class="lc-go">Open →</span></button>`;
      }).join('');
      grid.addEventListener('click', (e) => { const b = e.target.closest('.launch-card'); if (b) this.newTab(b.dataset.kind); });
    },
    buildNewMenu() {
      const menu = $('#new-menu');
      menu.innerHTML = Object.keys(SHELLS).map((k, i) => `<button class="menu-item" data-kind="${k}"><span class="tab-badge" style="--c:${SHELLS[k].color}">${badge(k)}</span>${SHELLS[k].label}<kbd>Alt+${i + 1}</kbd></button>`).join('') + '<div class="menu-sep"></div><button class="menu-item" data-kind="powershell" data-admin="1"><span class="tab-badge" style="--c:#2671BE">🛡</span>PowerShell (Administrator)</button><button class="menu-item" data-act="launcher"><span class="tab-badge" style="--c:#888">⌂</span>Start page<kbd>Alt+T</kbd></button>';
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
      $('#btn-cheat').addEventListener('click', () => this.toggleDrawer('cheat'));
      $('#btn-settings').addEventListener('click', () => this.openSettings());
      $('#btn-full').addEventListener('click', () => this.toggleFullscreen());
      $('#launcher-close').addEventListener('click', () => this.hideLauncher());
      $('#drawer-close').addEventListener('click', () => this.toggleDrawer(null));
      $$('.drawer-tab').forEach((b) => b.addEventListener('click', () => { this.drawerTab = b.dataset.tab; this.renderDrawer(); }));
      $('#settings-close').addEventListener('click', () => this.closeSettings());
      $('#modal-settings').addEventListener('click', (e) => { if (e.target.id === 'modal-settings') this.closeSettings(); });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { if ($('#modal-settings').classList.contains('open')) { this.closeSettings(); e.preventDefault(); return; } if (!$('#launcher').classList.contains('hidden') && this.sessions.length) { this.hideLauncher(); e.preventDefault(); return; } }
        if (!e.altKey || e.ctrlKey || e.metaKey) return;
        const k = e.key.toLowerCase();
        const kinds = Object.keys(SHELLS);
        if (/^[1-6]$/.test(k)) { e.preventDefault(); this.newTab(kinds[+k - 1]); }
        else if (k === 't') { e.preventDefault(); this.showLauncher(); }
        else if (k === 'w') { e.preventDefault(); if (this.active) this.closeTab(this.active); }
        else if (k === 'arrowright' || k === 'arrowleft') { e.preventDefault(); if (!this.active) return; const i = this.sessions.indexOf(this.active); const n = this.sessions[(i + (k === 'arrowright' ? 1 : -1) + this.sessions.length) % this.sessions.length]; this.activate(n); }
        else if (k === '=' || k === '+') { e.preventDefault(); this.setSetting('fontSize', Math.min(32, this.settings.fontSize + 1)); }
        else if (k === '-') { e.preventDefault(); this.setSetting('fontSize', Math.max(9, this.settings.fontSize - 1)); }
        else if (k === 'm') { e.preventDefault(); this.toggleDrawer('missions'); }
        else if (k === 'c') { e.preventDefault(); this.toggleDrawer('cheat'); }
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
    toggleDrawer(tab) {
      const d = $('#drawer');
      if (!tab || (d.classList.contains('open') && this.drawerTab === tab)) { d.classList.remove('open'); document.body.classList.remove('drawer-open'); }
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
      const total = Object.values(TX.missions.tracks).filter((t, i, a) => a.indexOf(t) === i).reduce((a, t) => a + t.list.filter((m) => this.done[m.id]).reduce((x, m) => x + m.xp, 0), 0);
      $('#xp-count').textContent = total;
    },
    missionsHTML() {
      const track = this.active ? this.active.trackKey() : 'bash';
      const t = TX.missions.tracks[track];
      const tracks = [['bash', 'Linux'], ['zsh', 'macOS'], ['cmd', 'cmd'], ['powershell', 'PowerShell'], ['gitbash', 'Git Bash']];
      const list = t.list;
      const doneN = list.filter((m) => this.done[m.id]).length;
      const xp = list.filter((m) => this.done[m.id]).reduce((a, m) => a + m.xp, 0);
      const pct = Math.round((doneN / list.length) * 100);
      return `<div class="m-head"><div class="m-track">${tracks.map(([k, l]) => `<button class="m-chip ${k === track || (track === 'pwsh' && k === 'powershell') ? 'on' : ''}" data-open="${k}" title="Open a ${l} tab">${l}</button>`).join('')}</div>
        <div class="m-title">${t.name} missions</div>
        <div class="m-progress"><div class="m-bar"><span style="width:${pct}%"></span></div><span>${doneN}/${list.length} · ${xp} XP</span></div>
        <p class="m-note">Missions check your work automatically as you type commands in a <b>${t.name}</b> tab.</p></div>
        <ol class="m-list">${list.map((m, i) => {
          const done = !!this.done[m.id];
          return `<li class="m-item ${done ? 'done' : ''}" data-id="${m.id}"><details ${!done && list.findIndex((x) => !this.done[x.id]) === i ? 'open' : ''}><summary><span class="m-dot">${done ? '✓' : i + 1}</span><span class="m-name">${TX.escapeHtml(m.title)}</span><span class="m-xp">${m.xp} XP</span></summary>
          <div class="m-body"><p>${TX.escapeHtml(m.text)}</p><div class="m-actions"><button class="m-hint">💡 Hint</button>${this.settings.showAnswers ? '<button class="m-ans">Show answer</button>' : ''}</div><p class="m-hint-text" hidden>${TX.escapeHtml(m.hint)}</p><p class="m-ans-text" hidden><code class="ins" data-cmd="${TX.escapeHtml(m.answer)}">${TX.escapeHtml(m.answer)}</code></p></div></details></li>`;
        }).join('')}</ol>
        <div class="m-foot"><button class="linkish" id="m-reset">Reset mission progress</button></div>`;
    },
    cheatHTML() {
      const k = this.active ? this.active.kind : 'bash';
      const col = k === 'cmd' ? 2 : k === 'powershell' || k === 'pwsh' ? 3 : 1;
      return `<p class="m-note">Same task, three languages. Click any command to type it into the active terminal.</p><table class="cheat"><thead><tr><th>Task</th><th class="${col === 1 ? 'hl' : ''}">bash / zsh</th><th class="${col === 2 ? 'hl' : ''}">cmd</th><th class="${col === 3 ? 'hl' : ''}">PowerShell</th></tr></thead><tbody>${TX.docs.CHEAT.map((r) => `<tr><td>${TX.escapeHtml(r[0])}</td>${r.slice(1).map((c, i) => `<td class="${col === i + 1 ? 'hl' : ''}"><code class="ins" data-cmd="${TX.escapeHtml(c.replace(/\s+\(.*\)$/, '').split(/\s+\/\s+/)[0])}">${TX.escapeHtml(c)}</code></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    },
    keysHTML() {
      const rows = [['Tab', 'Complete a command or file name (press twice to list options in bash)'], ['↑ / ↓', 'Scroll through command history'], ['Ctrl+R', 'Search history (type to search, Enter to run)'], ['Ctrl+C', 'Stop the running command (or copy selected text)'], ['Ctrl+L', 'Clear the screen'], ['Ctrl+A / Ctrl+E', 'Jump to start / end of the line'], ['Ctrl+U / Ctrl+K', 'Delete to start / end of the line'], ['Ctrl+W', 'Delete the previous word (browsers may close the tab — careful!)'], ['Ctrl+D', 'Exit the shell (bash/zsh, on an empty line)'], ['Right-click', 'Paste (or copy, if text is selected)'], ['Alt+1 … Alt+6', 'Open Ubuntu, macOS, cmd, PowerShell, PowerShell 7, Git Bash'], ['Alt+T / Alt+W', 'Start page / close tab'], ['Alt+← / Alt+→', 'Switch tabs'], ['Alt+= / Alt+-', 'Bigger / smaller text'], ['Alt+M / Alt+C', 'Missions / cheat sheet'], ['Alt+Enter', 'Full screen']];
      return `<table class="keys">${rows.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>
      <div class="m-note"><p><b>Passwords</b> in this simulator: <code>student</code> (sudo, ssh), <code>teacher</code> (su teacher). GitHub pushes want a token: anything starting with <code>ghp_</code>.</p>
      <p><b>Machines</b>: Linux <code>ubuntu-lab</code> (192.168.1.42), Mac <code>MacBook-Pro</code> (192.168.1.57), Windows <code>DESKTOP-LAB42</code> (192.168.1.105). cmd, PowerShell and Git Bash share the same Windows disk — make a file in one and see it in the others! Try <code>ssh student@ubuntu-lab</code> from the Mac, or <code>wsl</code> from Windows.</p>
      <p><b>Broke something?</b> Type <code>reset-machine</code> in any shell (or use Settings) to restore factory files.</p></div>`;
    },
    bindDrawer(body, tab) {
      body.querySelectorAll('.ins').forEach((el) => el.addEventListener('click', () => { if (!this.active) return; this.active.term.paste(el.dataset.cmd); this.active.focus(); }));
      if (tab === 'missions') {
        body.querySelectorAll('.m-hint').forEach((b) => b.addEventListener('click', () => { const p = b.closest('.m-body').querySelector('.m-hint-text'); p.hidden = !p.hidden; }));
        body.querySelectorAll('.m-ans').forEach((b) => b.addEventListener('click', () => { const p = b.closest('.m-body').querySelector('.m-ans-text'); p.hidden = !p.hidden; }));
        body.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.open; const ex = this.sessions.find((s) => s.trackKey() === k); if (ex) this.activate(ex); else this.newTab(k); }));
        const r = body.querySelector('#m-reset');
        if (r) r.addEventListener('click', () => { if (!confirm('Reset all mission progress?')) return; this.done = {}; this.log = {}; store.set('missions', {}); store.set('log', {}); this.renderDrawer(); });
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
          <div class="reset-row"><button data-reset="linux">Ubuntu</button><button data-reset="mac">Mac</button><button data-reset="windows">Windows</button><button data-reset="all" class="bad">Everything</button></div></div>`;
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
        if (!confirm(k === 'all' ? 'Reset EVERYTHING (all machines, history, missions, settings)?' : `Reset the ${b.textContent} machine to factory settings?`)) return;
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
    return map[kind] || '>_';
  }

  TX.app = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
})();
