/* TerminalEX — full-screen terminal apps: less, nano, vim, notepad, top/htop, watch, sl, cmatrix */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const INV = (s) => '\x1b[7m' + s + '\x1b[0m';
  const apps = (TX.apps = {});
  const pad = (s, n) => TX.padR(s, n).slice(0, n + (String(s).length - TX.visLen(s)));
  const isPrintable = (e) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  const btn = (key, label, desc, ctrl) => `<span class="app-btn" data-key="${key}"${ctrl ? ' data-ctrl="1"' : ''}><b>${TX.escapeHtml(label)}</b> ${TX.escapeHtml(desc)}</span>`;

  // hard-wrap a line of ANSI-free text
  function wrap(line, w) { if (line.length <= w) return [line]; const out = []; for (let i = 0; i < line.length; i += w) out.push(line.slice(i, i + w)); return out; }

  // ================================================================ pager (less / more / man)
  apps.pager = (term, text, status = ':') => {
    const raw = text.replace(/\n$/, '').split('\n');
    const app = {
      top: 0, search: null, typing: null, msg: '',
      start() { this.build(); },
      build() { this.lines = []; raw.forEach((l) => { const plain = TX.stripAnsi(l); if (plain.length <= this.cols || l !== plain) this.lines.push(l); else this.lines.push(...wrap(l, this.cols)); }); },
      resize() { this.build(); },
      page() { return this.rows - 1; },
      maxTop() { return Math.max(0, this.lines.length - this.page()); },
      draw() {
        const out = [];
        for (let i = 0; i < this.page(); i++) {
          let l = this.lines[this.top + i];
          if (l === undefined) { out.push(C.style(['bold', 'blue'], '~')); continue; }
          if (this.search) l = l.replace(new RegExp(this.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => INV(m));
          out.push(l);
        }
        let st;
        if (this.typing !== null) st = { text: '/' + this.typing, cursor: this.typing.length + 1 };
        else if (this.msg) st = INV(this.msg);
        else if (this.top >= this.maxTop()) st = INV('(END)');
        else st = INV(status.replace('%L', String(this.top + 1)));
        out.push(st);
        return out;
      },
      find(dir) {
        if (!this.search) return;
        const q = this.search.toLowerCase();
        for (let i = this.top + dir; i >= 0 && i < this.lines.length; i += dir) if (TX.stripAnsi(this.lines[i]).toLowerCase().includes(q)) { this.top = Math.min(i, this.maxTop()); this.msg = ''; return; }
        this.msg = 'Pattern not found  (press RETURN)';
      },
      onKey(e) {
        const k = e.key;
        if (this.typing !== null) {
          if (k === 'Enter') { this.search = this.typing; this.typing = null; this.find(1); return; }
          if (k === 'Escape' || (e.ctrlKey && k === 'c')) { this.typing = null; return; }
          if (k === 'Backspace') { if (!this.typing) this.typing = null; else this.typing = this.typing.slice(0, -1); return; }
          if (isPrintable(e)) this.typing += k;
          return;
        }
        this.msg = '';
        const P = this.page();
        switch (k) {
          case 'q': case 'Q': case 'Escape': this.exit(); return;
          case ' ': case 'f': case 'PageDown': case 'z': this.top = Math.min(this.maxTop(), this.top + P); if (this.top >= this.maxTop() && k === ' ' && status === ':more') this.exit(); return;
          case 'b': case 'PageUp': case 'w': this.top = Math.max(0, this.top - P); return;
          case 'j': case 'ArrowDown': case 'Enter': case 'e': this.top = Math.min(this.maxTop(), this.top + 1); return;
          case 'k': case 'ArrowUp': case 'y': this.top = Math.max(0, this.top - 1); return;
          case 'd': this.top = Math.min(this.maxTop(), this.top + Math.floor(P / 2)); return;
          case 'u': this.top = Math.max(0, this.top - Math.floor(P / 2)); return;
          case 'g': case 'Home': case '<': this.top = 0; return;
          case 'G': case 'End': case '>': this.top = this.maxTop(); return;
          case '/': this.typing = ''; return;
          case 'n': this.find(1); return;
          case 'N': this.find(-1); return;
          case 'h': case 'H': this.msg = 'SPACE/f next page · b previous page · j/k line · g/G top/bottom · /word search · n next · q quit'; return;
          case 'c': if (e.ctrlKey) this.exit(); return;
        }
      },
    };
    return term.runApp(app);
  };

  // ================================================================ text buffer editor base
  function Editor(vfs, segs, opts) {
    this.vfs = vfs; this.segs = segs; this.opts = opts || {};
    this.name = segs ? segs[segs.length - 1] : '';
    this.display = opts.name || this.name;
    let text = '';
    this.isNew = true;
    if (segs) {
      const n = vfs.get(segs);
      if (n && n.t === 'f') { try { text = vfs.readFile(segs, { user: opts.user }); this.isNew = false; } catch (e) { this.readErr = e; } }
    }
    this.lines = text.split('\n');
    if (this.lines.length > 1 && this.lines[this.lines.length - 1] === '') this.lines.pop();
    this.r = 0; this.c = 0; this.top = 0; this.dirty = false; this.clip = [];
  }
  Editor.prototype.text = function () { return this.lines.join('\n') + '\n'; };
  Editor.prototype.save = function (segs) {
    segs = segs || this.segs;
    try {
      const n = this.vfs.writeFile(segs, this.text(), { user: this.opts.user, owner: this.opts.user });
      void n;
      this.segs = segs; this.name = segs[segs.length - 1]; this.dirty = false; this.isNew = false;
      return null;
    } catch (e) { return TX.FS_MSG[e.code] || e.message; }
  };
  Editor.prototype.clamp = function () {
    this.r = Math.max(0, Math.min(this.r, this.lines.length - 1));
    this.c = Math.max(0, Math.min(this.c, this.lines[this.r].length));
  };
  Editor.prototype.scrollTo = function (h) {
    if (this.r < this.top) this.top = this.r;
    if (this.r >= this.top + h) this.top = this.r - h + 1;
  };
  Editor.prototype.insert = function (s) {
    const L = this.lines[this.r];
    this.lines[this.r] = L.slice(0, this.c) + s + L.slice(this.c);
    this.c += s.length; this.dirty = true;
  };
  Editor.prototype.newline = function (indent) {
    const L = this.lines[this.r];
    const ind = indent ? /^\s*/.exec(L)[0] : '';
    this.lines.splice(this.r + 1, 0, ind + L.slice(this.c));
    this.lines[this.r] = L.slice(0, this.c);
    this.r++; this.c = ind.length; this.dirty = true;
  };
  Editor.prototype.backspace = function () {
    if (this.c > 0) { const L = this.lines[this.r]; this.lines[this.r] = L.slice(0, this.c - 1) + L.slice(this.c); this.c--; this.dirty = true; }
    else if (this.r > 0) { const prev = this.lines[this.r - 1]; this.c = prev.length; this.lines[this.r - 1] = prev + this.lines[this.r]; this.lines.splice(this.r, 1); this.r--; this.dirty = true; }
  };
  Editor.prototype.del = function () {
    const L = this.lines[this.r];
    if (this.c < L.length) { this.lines[this.r] = L.slice(0, this.c) + L.slice(this.c + 1); this.dirty = true; }
    else if (this.r < this.lines.length - 1) { this.lines[this.r] = L + this.lines[this.r + 1]; this.lines.splice(this.r + 1, 1); this.dirty = true; }
  };
  Editor.prototype.move = function (k) {
    switch (k) {
      case 'ArrowUp': this.r--; break;
      case 'ArrowDown': this.r++; break;
      case 'ArrowLeft': if (this.c > 0) this.c--; else if (this.r > 0) { this.r--; this.c = this.lines[this.r].length; return; } break;
      case 'ArrowRight': if (this.c < this.lines[this.r].length) this.c++; else if (this.r < this.lines.length - 1) { this.r++; this.c = 0; return; } break;
      case 'Home': this.c = 0; break;
      case 'End': this.c = this.lines[this.r].length; break;
      default: return false;
    }
    this.clamp();
    return true;
  };
  // render a line with horizontal scroll and optional cursor
  function viewLine(line, width, cursorCol, left) {
    const vis = line.replace(/\t/g, '    ');
    const seg = vis.slice(left, left + width);
    if (cursorCol == null) return seg;
    return { text: seg, cursor: cursorCol - left };
  }

  // ================================================================ nano (and Notepad / MS Edit skins)
  apps.nano = (term, vfs, segs, opts = {}) => {
    const ed = new Editor(vfs, segs, opts);
    const notepad = !!opts.notepad;
    const app = {
      prompt: null, msg: '', confirm: null, search: '',
      start() {
        if (ed.readErr) this.msg = `[ Error reading ${ed.display}: ${TX.FS_MSG[ed.readErr.code] || 'error'} ]`;
        else if (segs && !ed.isNew) this.msg = notepad ? '' : `[ Read ${ed.lines.length} line${ed.lines.length === 1 ? '' : 's'} ]`;
        else if (segs) this.msg = notepad ? '' : '[ New File ]';
      },
      bodyH() { return this.rows - (notepad ? 3 : 4); },
      draw() {
        const W = this.cols;
        const out = [];
        const title = ed.name || (notepad ? 'Untitled' : 'New Buffer');
        if (notepad) {
          out.push({ html: `<div class="np-title"><span>${ed.dirty ? '*' : ''}${TX.escapeHtml(title)} - ${opts.dosEdit ? 'MS-DOS Editor' : opts.edit ? 'Microsoft Edit' : 'Notepad'}</span><span class="np-menu">${btn('s', 'File', '→ Save (Ctrl+S)', true)} ${btn('Escape', 'Close', '(Esc)')}</span></div>` });
        } else {
          const left = '  GNU nano 7.2', right = ed.dirty ? 'Modified  ' : '';
          const mid = title;
          const gap = Math.max(1, Math.floor((W - mid.length) / 2) - left.length);
          out.push(INV(pad(left + ' '.repeat(gap) + mid + ' '.repeat(Math.max(1, W - left.length - gap - mid.length - right.length)) + right, W)));
        }
        const H = this.bodyH();
        ed.scrollTo(H);
        for (let i = 0; i < H; i++) {
          const li = ed.top + i;
          if (li >= ed.lines.length) { out.push(''); continue; }
          const isCur = li === ed.r && !this.prompt && !this.confirm;
          const col = ed.lines[li].slice(0, ed.c).replace(/\t/g, '    ').length;
          const left = isCur && col >= W ? col - W + 1 : 0;
          out.push(viewLine(ed.lines[li], W, isCur ? col : null, left));
        }
        // status line
        if (this.confirm) out.push(INV(pad(this.confirm.text, W)));
        else if (this.prompt) { const p = this.prompt; out.push({ text: INV(p.label) + ' ' + p.value, cursor: p.label.length + 1 + p.pos }); }
        else if (notepad) out.push(C.dim(pad(`Ln ${ed.r + 1}, Col ${ed.c + 1}${' '.repeat(6)}${this.msg ? '· ' + this.msg : ''}`, W)));
        else out.push(this.msg ? TX.center(INV(this.msg), W) : '');
        if (notepad) {
          out.push({ html: `<div class="app-bar">${btn('s', '^S', 'Save', true)}${btn('f', '^F', 'Find', true)}${btn('Escape', 'Esc', 'Close')}</div>` });
        } else if (this.confirm) {
          out.push({ html: `<div class="app-bar">${btn('y', ' Y', 'Yes')}${btn('n', ' N', 'No')}</div>` });
          out.push({ html: `<div class="app-bar">${btn('c', '^C', 'Cancel', true)}</div>` });
        } else if (this.prompt) {
          out.push({ html: `<div class="app-bar">${btn('Enter', '⏎', 'Confirm')}${btn('c', '^C', 'Cancel', true)}</div>` });
          out.push('');
        } else {
          out.push({ html: `<div class="app-bar">${btn('g', '^G', 'Help', true)}${btn('o', '^O', 'Write Out', true)}${btn('w', '^W', 'Where Is', true)}${btn('k', '^K', 'Cut', true)}${btn('t', '^T', 'Execute', true)}${btn('c', '^C', 'Location', true)}</div>` });
          out.push({ html: `<div class="app-bar">${btn('x', '^X', 'Exit', true)}${btn('r', '^R', 'Read File', true)}${btn('\\', '^\\', 'Replace', true)}${btn('u', '^U', 'Paste', true)}${btn('j', '^J', 'Justify', true)}${btn('_', '^_', 'Go To Line', true)}</div>` });
        }
        return out;
      },
      ask(label, value, cb) { this.prompt = { label, value, pos: value.length, cb }; },
      doSave(after) {
        this.ask(notepad ? 'Save as:' : 'File Name to Write:', ed.segs ? (opts.name || ed.name) : '', (v) => {
          if (!v) { this.msg = 'Cancelled'; return; }
          const target = ed.segs && v === (opts.name || ed.name) ? ed.segs : (TX.app.activeShell() ? TX.app.activeShell().resolve(v) : [v]);
          const err = ed.save(target);
          if (err) { this.msg = `[ Error writing ${v}: ${err} ]`; return; }
          opts.name = v;
          this.msg = notepad ? 'Saved' : `[ Wrote ${ed.lines.length} line${ed.lines.length === 1 ? '' : 's'} ]`;
          if (after) after();
        });
      },
      quit() {
        if (!ed.dirty) { this.exit(); return; }
        if (notepad) { this.confirm = { text: `Do you want to save changes to ${ed.name || 'Untitled'}?  (Y)es / (N)o / Esc cancel`, yes: () => this.doSave(() => this.exit()), no: () => this.exit() }; return; }
        this.confirm = { text: 'Save modified buffer?', yes: () => this.doSave(() => this.exit()), no: () => this.exit() };
      },
      onPaste(t) { if (this.prompt) { this.prompt.value += t; this.prompt.pos = this.prompt.value.length; return; } t.replace(/\r/g, '').split('\n').forEach((part, i) => { if (i) ed.newline(false); ed.insert(part); }); },
      onKey(e) {
        const k = e.key, ctrl = e.ctrlKey || e.metaKey;
        if (this.confirm) {
          const cf = this.confirm;
          if (/^y$/i.test(k)) { this.confirm = null; cf.yes(); }
          else if (/^n$/i.test(k)) { this.confirm = null; cf.no(); }
          else if ((ctrl && k === 'c') || k === 'Escape') { this.confirm = null; this.msg = 'Cancelled'; }
          return;
        }
        if (this.prompt) {
          const p = this.prompt;
          if (k === 'Enter') { this.prompt = null; p.cb(p.value); return; }
          if ((ctrl && k === 'c') || k === 'Escape') { this.prompt = null; this.msg = 'Cancelled'; return; }
          if (k === 'Backspace') { if (p.pos > 0) { p.value = p.value.slice(0, p.pos - 1) + p.value.slice(p.pos); p.pos--; } return; }
          if (k === 'ArrowLeft') { p.pos = Math.max(0, p.pos - 1); return; }
          if (k === 'ArrowRight') { p.pos = Math.min(p.value.length, p.pos + 1); return; }
          if (isPrintable(e)) { p.value = p.value.slice(0, p.pos) + k + p.value.slice(p.pos); p.pos++; }
          return;
        }
        this.msg = '';
        if (k === 'F2') return this.quit();
        if (k === 'F3') return this.doSave();
        if (k === 'Escape' && notepad) return this.quit();
        if (ctrl) {
          switch (k.toLowerCase()) {
            case 'x': case 'q': return this.quit();
            case 'o': case 's': if (notepad && k === 's' && ed.segs) { const err = ed.save(); this.msg = err ? 'Error: ' + err : 'Saved'; return; } if (k === 's' && ed.segs) { const err = ed.save(); this.msg = err ? `[ Error writing: ${err} ]` : `[ Wrote ${ed.lines.length} lines ]`; return; } return this.doSave();
            case 'k': ed.clip = [ed.lines[ed.r]]; if (ed.lines.length > 1) ed.lines.splice(ed.r, 1); else ed.lines[0] = ''; ed.dirty = true; ed.clamp(); return;
            case 'u': if (ed.clip.length) { ed.lines.splice(ed.r, 0, ...ed.clip); ed.r += ed.clip.length; ed.dirty = true; ed.clamp(); } return;
            case 'w': case 'f': return this.ask(notepad ? 'Find:' : 'Search:', this.search, (v) => { this.search = v || this.search; if (!this.search) return; for (let i = 1; i <= ed.lines.length; i++) { const li = (ed.r + i) % ed.lines.length; const idx = ed.lines[li].toLowerCase().indexOf(this.search.toLowerCase()); if (idx >= 0) { ed.r = li; ed.c = idx; return; } } this.msg = `"${this.search}" not found`; });
            case '\\': return this.ask('Search (to replace):', '', (a) => { if (!a) return; this.ask('Replace with:', '', (b) => { let n = 0; ed.lines = ed.lines.map((l) => l.split(a).join((n += l.split(a).length - 1, b))); if (n) ed.dirty = true; this.msg = `[ Replaced ${n} occurrence${n === 1 ? '' : 's'} ]`; }); });
            case 'c': this.msg = `[ line ${ed.r + 1}/${ed.lines.length} (${Math.round(((ed.r + 1) / ed.lines.length) * 100)}%), col ${ed.c + 1}/${ed.lines[ed.r].length + 1} ]`; return;
            case 'g': this.msg = 'Arrows move · type to edit · ^O save · ^X exit · ^K cut line · ^U paste · ^W search (or click the buttons below)'; return;
            case '_': return this.ask('Enter line number, column number:', '', (v) => { const [l, cc] = v.split(/[ ,]/).map((x) => parseInt(x, 10)); if (l) { ed.r = l - 1; ed.c = (cc || 1) - 1; ed.clamp(); } });
            case 'a': ed.c = 0; return;
            case 'e': ed.c = ed.lines[ed.r].length; return;
            case 't': this.msg = '[ Execute Command is not available in TerminalEX ]'; return;
            case 'r': this.msg = '[ Read File is not available in TerminalEX ]'; return;
            case 'j': this.msg = '[ Justified ]'; return;
            case 'z': return;
          }
          return;
        }
        if (ed.move(k)) return;
        switch (k) {
          case 'PageDown': ed.r += this.bodyH() - 2; ed.clamp(); return;
          case 'PageUp': ed.r -= this.bodyH() - 2; ed.clamp(); return;
          case 'Enter': ed.newline(!notepad); return;
          case 'Backspace': ed.backspace(); return;
          case 'Delete': ed.del(); return;
          case 'Tab': ed.insert(notepad ? '    ' : '\t'); return;
        }
        if (isPrintable(e)) ed.insert(k);
      },
    };
    return term.runApp(app);
  };

  // ================================================================ vim
  apps.vim = (term, vfs, segs, opts = {}) => {
    const ed = new Editor(vfs, segs, opts);
    const app = {
      mode: 'normal', cmd: '', msg: '', pending: '', number: false, undo: [], count: '', lastSearch: '',
      start() {
        if (segs && !ed.isNew) { const t = ed.text(); this.msg = `"${ed.display}" ${ed.lines.length}L, ${t.length}B`; }
        else if (segs) this.msg = `"${ed.display}" [New]`;
        else this.msg = 'VIM - Vi IMproved 9.1 · type  i  to insert text, Esc then  :wq  to save & quit, or  :q!  to quit';
      },
      snapshot() { this.undo.push({ lines: ed.lines.slice(), r: ed.r, c: ed.c }); if (this.undo.length > 100) this.undo.shift(); },
      draw() {
        const W = this.cols, H = this.rows - 1;
        ed.scrollTo(H);
        const out = [];
        const gw = this.number ? String(ed.lines.length).length + 2 : 0;
        for (let i = 0; i < H; i++) {
          const li = ed.top + i;
          if (li >= ed.lines.length) { out.push(C.style(['bold', 'blue'], '~')); continue; }
          const gutter = this.number ? C.yellow(String(li + 1).padStart(gw - 1) + ' ') : '';
          const isCur = li === ed.r && this.mode !== 'command' && this.mode !== 'search';
          let col = ed.lines[li].slice(0, ed.c).replace(/\t/g, '    ').length;
          if (this.mode === 'normal' && col >= ed.lines[li].length && col > 0) col = ed.lines[li].length - 1;
          const avail = W - gw;
          const left = isCur && col >= avail ? col - avail + 1 : 0;
          const v = viewLine(ed.lines[li], avail, isCur ? col : null, left);
          out.push(isCur ? { text: gutter + v.text, cursor: v.cursor + gw } : gutter + v);
        }
        const pos = `${ed.r + 1},${ed.c + 1}`;
        const frac = ed.lines.length <= H ? 'All' : ed.top === 0 ? 'Top' : ed.top + H >= ed.lines.length ? 'Bot' : Math.round((ed.top / (ed.lines.length - H)) * 100) + '%';
        if (this.mode === 'command' || this.mode === 'search') out.push({ text: (this.mode === 'command' ? ':' : '/') + this.cmd, cursor: this.cmd.length + 1 });
        else {
          const left = this.mode === 'insert' ? C.bold('-- INSERT --') : this.msg;
          out.push(TX.padR(left, Math.max(TX.visLen(left) + 1, W - 18)) + TX.padR(pos, 14) + frac);
        }
        return out;
      },
      exec(line) {
        const m = /^(\d+)$/.exec(line);
        if (m) { ed.r = parseInt(m[1], 10) - 1; ed.clamp(); return; }
        const [c0, ...rest] = line.trim().split(/\s+/);
        const arg = rest.join(' ');
        const write = (name) => {
          let target = ed.segs;
          if (name) target = TX.app.activeShell() ? TX.app.activeShell().resolve(name) : [name];
          if (!target) { this.msg = C.style(['bold', 'white', 'bgRed'], 'E32: No file name'); return false; }
          const err = ed.save(target);
          if (err) { this.msg = C.style(['bold', 'white', 'bgRed'], `"${name || ed.display}" E212: Can't open file for writing${err === 'Permission denied' ? ' (Permission denied — try sudo vim)' : ''}`); return false; }
          this.msg = `"${name || ed.display}" ${ed.isNew ? '[New] ' : ''}${ed.lines.length}L, ${ed.text().length}B written`;
          return true;
        };
        switch (c0) {
          case 'w': write(arg); return;
          case 'wq': case 'x': case 'wq!': if (write(arg)) this.exit(); return;
          case 'q': if (ed.dirty) { this.msg = C.style(['bold', 'white', 'bgRed'], 'E37: No write since last change (add ! to override)'); return; } this.exit(); return;
          case 'q!': case 'qa!': case 'qa': case 'cq': this.exit(); return;
          case 'set': if (/^(nu|number)$/.test(arg)) this.number = true; else if (/^(nonu|nonumber)$/.test(arg)) this.number = false; return;
          case 'syntax': case 'colorscheme': return;
          case 'help': this.msg = 'i=insert · Esc=normal mode · :w save · :q quit · :wq save+quit · :q! quit without saving · dd delete line · u undo'; return;
          case '$': ed.r = ed.lines.length - 1; ed.clamp(); return;
          case 'noh': return;
        }
        const sub = /^%?s\/(.*?)\/(.*?)\/(g?)$/.exec(line.trim());
        if (sub) {
          this.snapshot();
          const re = new RegExp(sub[1], sub[3] ? 'g' : '');
          const all = line.trim().startsWith('%');
          let n = 0;
          ed.lines = ed.lines.map((l, i) => { if (!all && i !== ed.r) return l; const nl = l.replace(re, () => { n++; return sub[2]; }); return nl; });
          if (n) ed.dirty = true;
          this.msg = n ? `${n} substitution${n > 1 ? 's' : ''}` : C.style(['bold', 'white', 'bgRed'], `E486: Pattern not found: ${sub[1]}`);
          return;
        }
        this.msg = C.style(['bold', 'white', 'bgRed'], `E492: Not an editor command: ${line}`);
      },
      searchNext(dir) {
        const q = this.lastSearch;
        if (!q) return;
        for (let i = 1; i <= ed.lines.length; i++) {
          const li = (ed.r + i * dir + ed.lines.length * 2) % ed.lines.length;
          const idx = ed.lines[li].indexOf(q);
          if (idx >= 0) { ed.r = li; ed.c = idx; this.msg = '/' + q; return; }
        }
        this.msg = C.style(['bold', 'white', 'bgRed'], `E486: Pattern not found: ${q}`);
      },
      onPaste(t) { if (this.mode === 'insert') t.replace(/\r/g, '').split('\n').forEach((p, i) => { if (i) ed.newline(false); ed.insert(p); }); else if (this.mode === 'command' || this.mode === 'search') this.cmd += t.split('\n')[0]; },
      onKey(e) {
        const k = e.key, ctrl = e.ctrlKey || e.metaKey;
        if (this.mode === 'command' || this.mode === 'search') {
          if (k === 'Enter') { const l = this.cmd; const md = this.mode; this.mode = 'normal'; this.cmd = ''; if (md === 'command') this.exec(l); else { this.lastSearch = l || this.lastSearch; this.searchNext(1); } return; }
          if (k === 'Escape' || (ctrl && k === 'c')) { this.mode = 'normal'; this.cmd = ''; return; }
          if (k === 'Backspace') { if (!this.cmd) this.mode = 'normal'; else this.cmd = this.cmd.slice(0, -1); return; }
          if (isPrintable(e)) this.cmd += k;
          return;
        }
        if (this.mode === 'insert') {
          if (k === 'Escape' || (ctrl && k === '[') || (ctrl && k === 'c')) { this.mode = 'normal'; if (ed.c > 0) ed.c--; this.msg = ''; return; }
          if (ed.move(k)) return;
          if (k === 'Enter') { ed.newline(true); return; }
          if (k === 'Backspace') { ed.backspace(); return; }
          if (k === 'Delete') { ed.del(); return; }
          if (k === 'Tab') { ed.insert('\t'); return; }
          if (isPrintable(e)) ed.insert(k);
          return;
        }
        // normal mode
        if (ctrl && k === 'c') { this.msg = 'Type  :qa!  and press <Enter> to abandon all changes and exit Vim'; return; }
        if (ctrl && (k === 'f' || k === 'd')) { ed.r += Math.floor((this.rows - 2) / (k === 'd' ? 2 : 1)); ed.clamp(); return; }
        if (ctrl && (k === 'b' || k === 'u')) { ed.r -= Math.floor((this.rows - 2) / (k === 'u' ? 2 : 1)); ed.clamp(); return; }
        if (ctrl && k === 'r') { return; }
        if (/^[1-9]$/.test(k) || (k === '0' && this.count)) { this.count += k; return; }
        const n = parseInt(this.count || '1', 10);
        this.count = '';
        const p = this.pending;
        this.pending = '';
        const lineLen = () => ed.lines[ed.r].length;
        const clampN = () => { ed.clamp(); if (ed.c >= lineLen() && lineLen() > 0) ed.c = lineLen() - 1; };
        if (p === 'd') {
          if (k === 'd') { this.snapshot(); ed.clip = ed.lines.splice(ed.r, n); ed.clipLine = true; if (!ed.lines.length) ed.lines = ['']; ed.dirty = true; clampN(); if (n > 2) this.msg = `${n} fewer lines`; return; }
          if (k === 'w') { this.snapshot(); const L = ed.lines[ed.r]; const m = /^\S*\s*/.exec(L.slice(ed.c)); ed.lines[ed.r] = L.slice(0, ed.c) + L.slice(ed.c + m[0].length); ed.dirty = true; clampN(); return; }
          if (k === '$') { this.snapshot(); ed.lines[ed.r] = ed.lines[ed.r].slice(0, ed.c); ed.dirty = true; clampN(); return; }
          return;
        }
        if (p === 'y') { if (k === 'y') { ed.clip = ed.lines.slice(ed.r, ed.r + n); ed.clipLine = true; if (n > 2) this.msg = `${n} lines yanked`; } return; }
        if (p === 'g') { if (k === 'g') { ed.r = 0; ed.c = 0; } return; }
        if (p === 'Z') { if (k === 'Z') { if (ed.dirty) { const err = ed.save(); if (err) { this.msg = 'E212: Can\'t open file for writing'; return; } } this.exit(); } if (k === 'Q') this.exit(); return; }
        if (p === 'r') { if (isPrintable(e)) { this.snapshot(); const L = ed.lines[ed.r]; ed.lines[ed.r] = L.slice(0, ed.c) + k + L.slice(ed.c + 1); ed.dirty = true; } return; }
        this.msg = '';
        switch (k) {
          case 'h': case 'ArrowLeft': case 'Backspace': ed.c = Math.max(0, ed.c - n); return;
          case 'l': case 'ArrowRight': case ' ': ed.c = Math.min(Math.max(0, lineLen() - 1), ed.c + n); return;
          case 'j': case 'ArrowDown': case 'Enter': ed.r += n; clampN(); return;
          case 'k': case 'ArrowUp': ed.r -= n; clampN(); return;
          case '0': case 'Home': ed.c = 0; return;
          case '^': ed.c = /^\s*/.exec(ed.lines[ed.r])[0].length; return;
          case '$': case 'End': ed.c = Math.max(0, lineLen() - 1); return;
          case 'w': { for (let t = 0; t < n; t++) { const L = ed.lines[ed.r]; const m = /\S*\s+/.exec(L.slice(ed.c)); if (m && ed.c + m[0].length < L.length) ed.c += m[0].length; else if (ed.r < ed.lines.length - 1) { ed.r++; ed.c = /^\s*/.exec(ed.lines[ed.r])[0].length; } } return; }
          case 'b': { for (let t = 0; t < n; t++) { const L = ed.lines[ed.r].slice(0, ed.c); const m = /\S+\s*$/.exec(L); if (m) ed.c = m.index; else if (ed.r > 0) { ed.r--; ed.c = Math.max(0, ed.lines[ed.r].length - 1); } } return; }
          case 'G': ed.r = this.count ? n - 1 : ed.lines.length - 1; if (n > 1) ed.r = n - 1; clampN(); return;
          case 'g': case 'd': case 'y': case 'Z': case 'r': this.pending = k; return;
          case 'x': case 'Delete': { this.snapshot(); const L = ed.lines[ed.r]; ed.lines[ed.r] = L.slice(0, ed.c) + L.slice(ed.c + n); ed.dirty = true; clampN(); return; }
          case 'D': this.snapshot(); ed.lines[ed.r] = ed.lines[ed.r].slice(0, ed.c); ed.dirty = true; clampN(); return;
          case 'J': if (ed.r < ed.lines.length - 1) { this.snapshot(); ed.c = ed.lines[ed.r].length; ed.lines[ed.r] += ' ' + ed.lines[ed.r + 1].trim(); ed.lines.splice(ed.r + 1, 1); ed.dirty = true; } return;
          case 'p': if (ed.clip.length) { this.snapshot(); if (ed.clipLine) { ed.lines.splice(ed.r + 1, 0, ...ed.clip); ed.r++; ed.c = 0; } ed.dirty = true; } return;
          case 'P': if (ed.clip.length) { this.snapshot(); ed.lines.splice(ed.r, 0, ...ed.clip); ed.c = 0; ed.dirty = true; } return;
          case 'u': { const s = this.undo.pop(); if (!s) { this.msg = 'Already at oldest change'; return; } ed.lines = s.lines; ed.r = s.r; ed.c = s.c; ed.dirty = true; this.msg = '1 change; before #' + (this.undo.length + 1); return; }
          case 'i': this.snapshot(); this.mode = 'insert'; return;
          case 'I': this.snapshot(); ed.c = /^\s*/.exec(ed.lines[ed.r])[0].length; this.mode = 'insert'; return;
          case 'a': this.snapshot(); ed.c = Math.min(lineLen(), ed.c + 1); this.mode = 'insert'; return;
          case 'A': this.snapshot(); ed.c = lineLen(); this.mode = 'insert'; return;
          case 'o': this.snapshot(); ed.lines.splice(ed.r + 1, 0, ''); ed.r++; ed.c = 0; ed.dirty = true; this.mode = 'insert'; return;
          case 'O': this.snapshot(); ed.lines.splice(ed.r, 0, ''); ed.c = 0; ed.dirty = true; this.mode = 'insert'; return;
          case 's': this.snapshot(); ed.lines[ed.r] = ed.lines[ed.r].slice(0, ed.c) + ed.lines[ed.r].slice(ed.c + 1); ed.dirty = true; this.mode = 'insert'; return;
          case ':': this.mode = 'command'; this.cmd = ''; return;
          case '/': this.mode = 'search'; this.cmd = ''; return;
          case 'n': this.searchNext(1); return;
          case 'N': this.searchNext(-1); return;
          case 'PageDown': ed.r += this.rows - 2; clampN(); return;
          case 'PageUp': ed.r -= this.rows - 2; clampN(); return;
          case 'Escape': return;
          case 'v': case 'V': this.msg = 'Visual mode is not simulated in TerminalEX'; return;
        }
      },
    };
    return term.runApp(app);
  };

  // ================================================================ top / htop
  apps.top = (term, m, o = {}) => {
    if (o.batch) {
      const snap = apps.top(null, m, Object.assign({}, o, { batch: false, build: true }));
      snap.cols = o.cols || 120; snap.rows = o.rows || 40;
      m.tickProcs();
      return snap.draw().map((l) => (typeof l === 'string' ? l : l.text || '')).filter((l) => !/app-bar/.test(l)).join('\n');
    }
    const app = {
      sort: 'cpu', sel: 0, prompt: null, msg: '', timer: null,
      start() { m.tickProcs(); this.timer = setInterval(() => { m.tickProcs(); term.renderApp(); }, o.htop ? 1500 : 3000); },
      stop() { clearInterval(this.timer); },
      procs() {
        const P = m.procs.slice();
        if (this.sort === 'cpu') P.sort((a, b) => b.cpu - a.cpu || a.pid - b.pid);
        else if (this.sort === 'mem') P.sort((a, b) => b.rss - a.rss);
        else if (this.sort === 'pid') P.sort((a, b) => a.pid - b.pid);
        return P;
      },
      bar(label, frac, W, colorFn) {
        const inner = W - label.length - 3;
        const n = Math.round(Math.min(1, frac) * inner);
        const pct = (frac * 100).toFixed(1) + '%';
        let fill = '|'.repeat(n);
        const body = TX.padR(fill, inner - pct.length) + pct;
        return C.cyan(label) + C.bold('[') + colorFn(body.slice(0, n)) + C.dim(body.slice(n)) + C.bold(']');
      },
      draw() {
        const W = this.cols, H = this.rows;
        const mem = m.memory();
        const P = this.procs();
        const load = m.load();
        const out = [];
        const total = mem.total;
        if (o.htop) {
          const half = Math.floor(W / 2) - 1;
          const n = Math.min(8, m.hw.threads);
          for (let i = 0; i < n; i += 2) {
            const a = this.bar(String(i).padStart(3), Math.random() * 0.35 + (i === 0 ? 0.1 : 0), half, C.green);
            const b = this.bar(String(i + 1).padStart(3), Math.random() * 0.3, half, C.green);
            out.push(TX.padR(a, half + 1) + ' ' + b);
          }
          const memBar = this.bar('Mem', mem.used / total, half, C.green).replace(/[\d.]+%\]/, `${(mem.used / 1048576).toFixed(2)}G/${(total / 1048576).toFixed(1)}G]`);
          const running = P.filter((p) => p.cpu > 3).length + 1;
          out.push(TX.padR(memBar, half + 1) + ' ' + C.cyan('Tasks: ') + C.bold(String(P.length + 200)) + ', ' + C.bold(String(1051)) + ' thr; ' + C.green(String(running) + ' running'));
          out.push(TX.padR(this.bar('Swp', 0.001, half, C.red), half + 1) + ' ' + C.cyan('Load average: ') + C.bold(load[0].toFixed(2)) + ' ' + load[1].toFixed(2) + ' ' + load[2].toFixed(2));
          out.push(' '.repeat(half + 2) + C.cyan('Uptime: ') + C.bold(TX.uptimeStr(m.boot).replace(/ days?, /, 'd ')));
          out.push('');
          const hdr = '    PID USER       PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command';
          out.push('\x1b[30;42m' + TX.padR(hdr.replace(this.sort === 'cpu' ? 'CPU%' : 'MEM%', this.sort === 'cpu' ? 'CPU%▽' : 'MEM%▽').slice(0, W), W) + '\x1b[0m');
          const rowsAvail = H - out.length - 1;
          this.sel = Math.max(0, Math.min(this.sel, P.length - 1));
          const start = Math.max(0, this.sel - rowsAvail + 1);
          P.slice(start, start + rowsAvail).forEach((p, i) => {
            const idx = start + i;
            const virt = TX.human((p.vsz || 0) * 1024), res = TX.human((p.rss || 0) * 1024), shr = TX.human((p.rss || 0) * 300);
            const t = Math.floor((p.cpu || 0) * 9 + p.pid % 50);
            const line = `${String(p.pid).padStart(7)} ${(p.user || 'root').padEnd(10).slice(0, 10)} ${' 20'}   0 ${virt.padStart(5)} ${res.padStart(5)} ${shr.padStart(5)} ${p.cpu > 3 ? 'R' : 'S'} ${(p.cpu || 0).toFixed(1).padStart(5)} ${((p.rss / total) * 100).toFixed(1).padStart(4)} ${Math.floor(t / 60)}:${TX.p2(t % 60)}.${TX.p2(p.pid % 100)}  ${p.cmd}`;
            out.push(idx === this.sel ? '\x1b[30;46m' + TX.padR(line.slice(0, W), W) + '\x1b[0m' : (p.user === 'root' ? line.slice(0, W) : C.bold(line.slice(0, W))));
          });
          while (out.length < H - 1) out.push('');
          if (this.prompt) out.push({ text: this.prompt.label + this.prompt.value, cursor: this.prompt.label.length + this.prompt.value.length });
          else out.push({ html: `<div class="app-bar htop-bar">${[['F1', 'Help'], ['F2', 'Setup'], ['F3', 'Search'], ['F4', 'Filter'], ['F5', 'Tree'], ['F6', 'SortBy'], ['F7', 'Nice -'], ['F8', 'Nice +'], ['F9', 'Kill'], ['F10', 'Quit']].map(([f, l]) => `<span class="app-btn" data-key="${f}"><b>${f}</b>${l}</span>`).join('')}${this.msg ? '<span class="app-msg">' + TX.escapeHtml(this.msg) + '</span>' : ''}</div>` });
          return out;
        }
        const d = new Date();
        const running = P.filter((p) => p.cpu > 3).length + 1;
        const us = P.reduce((a, p) => a + p.cpu, 0) / m.hw.threads;
        if (o.mac) {
          out.push(`Processes: ${P.length + 500} total, ${running} running, ${P.length + 500 - running} sleeping, 2311 threads          ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())}`);
          out.push(`Load Avg: ${load.map((x) => x.toFixed(2)).join(', ')}  CPU usage: ${us.toFixed(2)}% user, ${(us / 2).toFixed(2)}% sys, ${(100 - us * 1.5).toFixed(2)}% idle`);
          out.push(`SharedLibs: 612M resident, 118M data, 64M linkedit.`);
          out.push(`PhysMem: ${Math.round(mem.used / 1048576)}G used (${(mem.used / 3145728).toFixed(0)}G wired, 612M compressor), ${Math.round((total - mem.used) / 1024)}M unused.`);
          out.push(`Networks: packets: 1284311/1.6G in, 402117/61M out.`);
          out.push('');
          out.push(INV(TX.padR('PID    COMMAND          %CPU  TIME     #TH   #WQ  #PORT MEM    PURG  CMPRS  PGRP  PPID  STATE', W)));
          P.slice(0, H - out.length).forEach((p) => out.push(`${String(p.pid).padEnd(6)} ${p.name.slice(0, 16).padEnd(16)} ${(p.cpu || 0).toFixed(1).padEnd(5)} ${psT(p).padEnd(8)} ${String(p.threads || 4).padEnd(5)} ${String(TX.randInt(1, 4)).padEnd(4)} ${String(TX.randInt(30, 900)).padEnd(5)} ${TX.human((p.rss || 0) * 1024).padEnd(6)} 0B    0B     ${String(p.pid).padEnd(5)} 1     sleeping`.slice(0, W)));
          return out;
        }
        out.push(`top - ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} up ${TX.uptimeStr(m.boot)},  1 user,  load average: ${load.map((x) => x.toFixed(2)).join(', ')}`);
        out.push(`Tasks: ${C.bold(String(P.length + 294))} total,   ${C.bold(String(running))} running, ${C.bold(String(P.length + 294 - running))} sleeping,   ${C.bold('0')} stopped,   ${C.bold('0')} zombie`);
        out.push(`%Cpu(s): ${C.bold(us.toFixed(1).padStart(4))} us, ${C.bold((us / 3).toFixed(1).padStart(4))} sy,  ${C.bold('0.0')} ni, ${C.bold((100 - us * 1.4).toFixed(1))} id,  ${C.bold('0.1')} wa,  ${C.bold('0.0')} hi,  ${C.bold('0.1')} si,  ${C.bold('0.0')} st`);
        out.push(`MiB Mem : ${C.bold((total / 1024).toFixed(1).padStart(8))} total, ${C.bold((mem.free / 1024).toFixed(1).padStart(8))} free, ${C.bold((mem.used / 1024).toFixed(1).padStart(8))} used, ${C.bold(((mem.cache + mem.buffers) / 1024).toFixed(1).padStart(8))} buff/cache`);
        out.push(`MiB Swap: ${C.bold((mem.swapTotal / 1024).toFixed(1).padStart(8))} total, ${C.bold((mem.swapTotal / 1024).toFixed(1).padStart(8))} free, ${C.bold('0.0'.padStart(8))} used. ${C.bold((mem.avail / 1024).toFixed(1).padStart(8))} avail Mem`);
        out.push(this.prompt ? { text: this.prompt.label + this.prompt.value, cursor: this.prompt.label.length + this.prompt.value.length } : (this.msg ? C.bold(this.msg) : ''));
        out.push(INV(TX.padR('    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND', W)));
        P.slice(0, H - out.length).forEach((p) => {
          const line = `${String(p.pid).padStart(7)} ${(p.user || 'root').padEnd(9).slice(0, 9)} ${'20'.padStart(3)} ${'0'.padStart(3)} ${String(p.vsz || 0).padStart(7)} ${String(p.rss || 0).padStart(6)} ${String(Math.round((p.rss || 0) * 0.3)).padStart(6)} ${p.cpu > 3 ? 'R' : 'S'} ${(p.cpu || 0).toFixed(1).padStart(5)} ${((p.rss / total) * 100).toFixed(1).padStart(5)} ${psT(p).padStart(9)} ${p.name}`;
          out.push(p.cpu > 3 ? C.bold(line.slice(0, W)) : line.slice(0, W));
        });
        return out;
      },
      onKey(e) {
        const k = e.key;
        if (this.prompt) {
          const pr = this.prompt;
          if (k === 'Enter') { this.prompt = null; pr.cb(pr.value); return; }
          if (k === 'Escape') { this.prompt = null; return; }
          if (k === 'Backspace') { pr.value = pr.value.slice(0, -1); return; }
          if (isPrintable(e)) pr.value += k;
          return;
        }
        this.msg = '';
        const killPid = (pid) => {
          const p = m.procs.find((x) => x.pid === pid);
          if (!p) { this.msg = 'No such process'; return; }
          if (p.user !== 'student') { this.msg = `Failed signal pid '${pid}' with '15': Operation not permitted`; return; }
          m.kill(pid);
        };
        if (k === 'q' || k === 'F10' || (e.ctrlKey && k === 'c') || k === 'Escape') { this.exit(); return; }
        if (k === 'M') { this.sort = 'mem'; return; }
        if (k === 'P') { this.sort = 'cpu'; return; }
        if (k === 'N') { this.sort = 'pid'; return; }
        if (k === 'F6') { this.sort = this.sort === 'cpu' ? 'mem' : this.sort === 'mem' ? 'pid' : 'cpu'; return; }
        if (k === 'ArrowDown' || k === 'j') { this.sel++; return; }
        if (k === 'ArrowUp' || k === 'k' && o.htop) { this.sel = Math.max(0, this.sel - 1); return; }
        if (k === 'F1' || k === 'h' || k === '?') { this.msg = o.htop ? 'Arrows select · F9 kill · F6 sort · q quit' : 'P sort by CPU · M sort by memory · k kill · q quit'; return; }
        if (k === 'F9' || (k === 'k' && !o.htop)) {
          if (o.htop) { const p = this.procs()[this.sel]; if (p) this.prompt = { label: `Send signal 15 (SIGTERM) to ${p.pid} ${p.name}? [y/N] `, value: '', cb: (v) => { if (/^y/i.test(v)) killPid(p.pid); } }; return; }
          this.prompt = { label: 'PID to signal/kill [default pid = ' + this.procs()[0].pid + '] ', value: '', cb: (v) => killPid(parseInt(v, 10) || this.procs()[0].pid) };
          return;
        }
        if (k === 'F3' || k === '/') { this.prompt = { label: 'Search: ', value: '', cb: (v) => { const i = this.procs().findIndex((p) => p.name.includes(v)); if (i >= 0) this.sel = i; } }; }
      },
    };
    function psT(p) { const t = Math.floor((p.cpu || 0) * 9 + p.pid % 50); return `${Math.floor(t / 60)}:${TX.p2(t % 60)}.${TX.p2(p.pid % 100)}`; }
    if (o.build) return app;
    return term.runApp(app);
  };

  // ================================================================ watch
  apps.watch = (term, sh, cmd, interval, header) => {
    const app = {
      output: '', timer: null, busy: false,
      async refresh() {
        if (this.busy) return;
        this.busy = true;
        let buf = '';
        const io = { tty: false, stdin: null, out: (s) => { buf += s; }, err: (s) => { buf += s; } };
        try { await sh.run(cmd, io); } catch (e) { buf += String(e.message || e); }
        this.output = buf;
        this.busy = false;
        term.renderApp();
      },
      start() { this.refresh(); this.timer = setInterval(() => this.refresh(), Math.max(0.5, interval) * 1000); },
      stop() { clearInterval(this.timer); },
      draw() {
        const out = [];
        if (header) { const l = `Every ${interval.toFixed(1)}s: ${cmd}`, r = `${sh.m.net.hostname}: ${TX.unixDate(Date.now())}`; out.push(TX.padR(l, this.cols - r.length) + r); out.push(''); }
        return out.concat(this.output.split('\n').slice(0, this.rows - out.length));
      },
      onKey(e) { if (e.key === 'q' || (e.ctrlKey && e.key === 'c')) this.exit(); },
    };
    return term.runApp(app);
  };

  // ================================================================ sl
  apps.sl = (term) => {
    const train = [
      '      ====        ________                ___________ ',
      '  _D _|  |_______/        \\__I_I_____===__|_________| ',
      '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
      '   /     |  |   H  |  |     |   |         ||_| |_||   ',
      '  |      |  |   H  |__--------------------| [___] |   ',
      '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
      '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
    ];
    const wheels = [
      ['__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ', ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ', '  \\_/      \\O=====O=====O=====O_/      \\_/            '],
      ['__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__ ', ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ', '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/            '],
    ];
    const smoke = ['                    (  ) (@@) ( )  (@)  ()    @@    O     @     O     @      O', '               (@@@)', '           (    )', '        (@@@@)', '      (   )', '                   '];
    const app = {
      x: 0, t: 0, timer: null,
      start() { this.x = this.cols; this.timer = setInterval(() => { this.x -= 2; this.t++; if (this.x < -60) { this.exit(); return; } term.renderApp(); }, 45); },
      stop() { clearInterval(this.timer); },
      draw() {
        const art = smoke.slice(0, 3).concat(train, wheels[this.t % 2]);
        const top = Math.max(0, Math.floor((this.rows - art.length) / 2));
        const out = [];
        for (let i = 0; i < this.rows; i++) {
          const a = art[i - top];
          if (a === undefined) { out.push(''); continue; }
          let line = '';
          if (this.x >= 0) line = ' '.repeat(this.x) + a;
          else line = a.slice(-this.x);
          out.push(line.slice(0, this.cols));
        }
        return out;
      },
      onKey() { /* sl ignores your keys, just like the real one */ },
    };
    return term.runApp(app);
  };

  // ================================================================ cmatrix
  apps.cmatrix = (term) => {
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF@#$%&*+=<>';
    const app = {
      cols2: [], grid: [], timer: null,
      start() {
        this.init();
        this.timer = setInterval(() => { this.step(); term.renderApp(); }, 60);
      },
      init() {
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(' '));
        this.drops = Array.from({ length: this.cols }, () => ({ y: -Math.floor(Math.random() * this.rows), len: 4 + Math.floor(Math.random() * 16), speed: Math.random() < 0.5 ? 1 : 2 }));
      },
      resize() { this.init(); },
      stop() { clearInterval(this.timer); },
      step() {
        this.t = (this.t || 0) + 1;
        for (let x = 0; x < this.cols; x += 2) {
          const d = this.drops[x];
          if (this.t % d.speed) continue;
          d.y++;
          if (d.y - d.len > this.rows) { d.y = -Math.floor(Math.random() * 10); d.len = 4 + Math.floor(Math.random() * 16); }
        }
      },
      draw() {
        const out = [];
        for (let y = 0; y < this.rows; y++) {
          let line = '';
          for (let x = 0; x < this.cols; x++) {
            const d = this.drops[x];
            if (x % 2 || !d) { line += ' '; continue; }
            const dist = d.y - y;
            if (dist === 0) line += '\x1b[1;97m' + chars[Math.floor(Math.random() * chars.length)] + '\x1b[0m';
            else if (dist > 0 && dist < d.len) line += (dist < 3 ? '\x1b[1;92m' : '\x1b[32m') + chars[(x * 7 + y * 3 + Math.floor(this.t / 3)) % chars.length] + '\x1b[0m';
            else line += ' ';
          }
          out.push(line);
        }
        return out;
      },
      onKey(e) { if (e.key === 'q' || e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) this.exit(); },
    };
    return term.runApp(app);
  };
})();
