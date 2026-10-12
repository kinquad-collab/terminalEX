/* TerminalEX — terminal emulator widget: ANSI output, line editor, completion, full-screen apps */
(function () {
  'use strict';
  const TX = window.TX;

  // xterm 256-color palette (indices 16..255)
  function c256(n) {
    if (n < 16) return 'var(--ansi' + n + ')';
    if (n < 232) { n -= 16; const v = [0, 95, 135, 175, 215, 255]; return `rgb(${v[Math.floor(n / 36)]},${v[Math.floor(n / 6) % 6]},${v[n % 6]})`; }
    const g = 8 + (n - 232) * 10; return `rgb(${g},${g},${g})`;
  }

  // ---------------------------------------------------------------- ANSI -> cells
  function newStyle() { return { fg: null, bg: null, b: 0, d: 0, i: 0, u: 0, inv: 0 }; }
  function applySGR(st, params) {
    if (!params.length) params = [0];
    for (let k = 0; k < params.length; k++) {
      const p = params[k];
      if (p === 0) Object.assign(st, newStyle());
      else if (p === 1) st.b = 1; else if (p === 2) st.d = 1; else if (p === 3) st.i = 1; else if (p === 4) st.u = 1; else if (p === 7) st.inv = 1;
      else if (p === 22) { st.b = 0; st.d = 0; } else if (p === 23) st.i = 0; else if (p === 24) st.u = 0; else if (p === 27) st.inv = 0;
      else if (p >= 30 && p <= 37) st.fg = 'var(--ansi' + (p - 30) + ')';
      else if (p >= 90 && p <= 97) st.fg = 'var(--ansi' + (p - 90 + 8) + ')';
      else if (p >= 40 && p <= 47) st.bg = 'var(--ansi' + (p - 40) + ')';
      else if (p >= 100 && p <= 107) st.bg = 'var(--ansi' + (p - 100 + 8) + ')';
      else if (p === 39) st.fg = null; else if (p === 49) st.bg = null;
      else if (p === 38 || p === 48) {
        const key = p === 38 ? 'fg' : 'bg';
        if (params[k + 1] === 5) { st[key] = c256(params[k + 2]); k += 2; }
        else if (params[k + 1] === 2) { st[key] = `rgb(${params[k + 2]},${params[k + 3]},${params[k + 4]})`; k += 4; }
      }
    }
  }
  function styleKey(st) { return st.fg + '|' + st.bg + '|' + st.b + st.d + st.i + st.u + st.inv; }
  function cellsToHTML(cells, cursorAt = -1) {
    let html = '', run = '', key = null, cur = null;
    const flush = () => {
      if (!run) return;
      html += cur ? spanOpen(cur) + run + '</span>' : run;
      run = '';
    };
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (i === cursorAt) { flush(); key = null; html += '<span class="cursor">' + TX.escapeHtml(c.ch) + '</span>'; continue; }
      const k = c.st ? c.key : '';
      if (k !== key) { flush(); key = k; cur = c.st && k !== 'null|null|00000' ? c.st : null; }
      run += TX.escapeHtml(c.ch);
    }
    flush();
    if (cursorAt >= cells.length) html += '<span class="cursor"> </span>';
    return html;
  }
  function spanOpen(st) {
    let fg = st.fg, bg = st.bg;
    if (st.inv) { const t = fg; fg = bg || 'var(--bg)'; bg = t || 'var(--fg)'; }
    let css = '';
    if (fg) css += 'color:' + fg + ';';
    if (bg) css += 'background:' + bg + ';';
    if (st.b) css += 'font-weight:bold;';
    if (st.d) css += 'opacity:.65;';
    if (st.i) css += 'font-style:italic;';
    if (st.u) css += 'text-decoration:underline;';
    return '<span style="' + css + '">';
  }
  // parse a full ANSI string to cells (no cursor movement except \r handled as reset)
  function ansiToCells(str) {
    const cells = [];
    const st = newStyle();
    let key = styleKey(st), snap = null;
    const re = /\x1b\[([0-9;?]*)([A-Za-z])/y;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '\x1b') {
        re.lastIndex = i;
        const m = re.exec(str);
        if (m) {
          if (m[2] === 'm') { applySGR(st, m[1] ? m[1].split(';').map(Number) : []); key = styleKey(st); snap = null; }
          i = re.lastIndex - 1;
          continue;
        }
      }
      if (!snap) snap = Object.assign({}, st);
      cells.push({ ch, st: snap, key });
    }
    return cells;
  }
  TX.ansiToHTML = (s) => String(s).split('\n').map((l) => cellsToHTML(ansiToCells(l))).join('\n');

  // ---------------------------------------------------------------- Terminal
  class Terminal {
    constructor(host) {
      this.host = host;
      host.classList.add('terminal');
      host.innerHTML = '<div class="term-scroll"><div class="term-output"></div><div class="term-input"></div></div><div class="term-screen hidden"></div><textarea class="term-kbd" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Terminal input"></textarea><span class="term-measure">MMMMMMMMMM</span>';
      this.scroll = host.querySelector('.term-scroll');
      this.outEl = host.querySelector('.term-output');
      this.inEl = host.querySelector('.term-input');
      this.screenEl = host.querySelector('.term-screen');
      this.kbd = host.querySelector('.term-kbd');
      this.measureEl = host.querySelector('.term-measure');
      this.cur = [];      // current (unfinished) output line cells
      this.col = 0;
      this.st = newStyle();
      this.stKey = styleKey(this.st);
      this.curEl = null;
      this.pending = null; // active line read
      this.keyWaiter = null;
      this.app = null;
      this.typeahead = [];
      this.signal = new TX.Signal();
      this.maxLines = 4000;
      this.flushQueued = false;
      this.onTitle = null;
      this.bell = () => { host.classList.remove('bell'); void host.offsetWidth; host.classList.add('bell'); };

      host.addEventListener('mouseup', () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) this.focus();
      });
      host.addEventListener('contextmenu', async (e) => {
        // right-click paste like Windows Terminal / PuTTY
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) { try { await navigator.clipboard.writeText(sel.toString()); sel.removeAllRanges(); } catch (err) { /* ignore */ } e.preventDefault(); return; }
        try { const t = await navigator.clipboard.readText(); if (t) { e.preventDefault(); this.paste(t); } } catch (err) { /* permission denied: allow menu */ }
      });
      this.screenEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-key]');
        if (!b || !this.app) return;
        const key = b.dataset.key;
        this.app.onKey({ key, ctrlKey: b.dataset.ctrl === '1', metaKey: false, altKey: false, shiftKey: false, preventDefault() {} });
        this.renderApp();
        this.focus();
      });
      this.kbd.addEventListener('keydown', (e) => this.onKey(e));
      this.kbd.addEventListener('input', () => this.onInput());
      this.kbd.addEventListener('paste', (e) => { e.preventDefault(); this.paste((e.clipboardData || window.clipboardData).getData('text')); });
      this.kbd.addEventListener('focus', () => host.classList.add('focused'));
      this.kbd.addEventListener('blur', () => host.classList.remove('focused'));
      this.resizeObs = new ResizeObserver(() => { this.measure(); if (this.app && this.app.resize) { this.app.resize(); this.renderApp(); } });
      this.resizeObs.observe(host);
      this.measure();
    }

    focus() { this.kbd.focus({ preventScroll: true }); }
    measure() {
      const r = this.measureEl.getBoundingClientRect();
      this.charW = r.width / 10 || 8.4;
      this.charH = r.height || 18;
      const w = (this.host.clientWidth || this.scroll.clientWidth) - 24 - (this.scroll.offsetWidth - this.scroll.clientWidth || 0), h = (this.host.clientHeight || this.scroll.clientHeight) - 16;
      this.cols = Math.max(20, Math.floor(w / this.charW));
      this.rows = Math.max(8, Math.floor(h / (this.charH * 1.0)));
    }

    // ------------------------------------------------ output
    write(str) {
      if (str == null) return;
      str = String(str);
      for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === '\x1b') {
          const m = /^\x1b\[([0-9;?]*)([A-Za-z])/.exec(str.slice(i, i + 24));
          if (m) {
            i += m[0].length - 1;
            const cmd = m[2], args = m[1];
            if (cmd === 'm') { applySGR(this.st, args ? args.split(';').map(Number) : []); this.stKey = styleKey(this.st); }
            else if (cmd === 'K') { if (args === '2') { this.cur = []; } else this.cur.length = Math.min(this.cur.length, this.col); }
            else if (cmd === 'J' && (args === '2' || args === '3')) { this.clear(); }
            else if (cmd === 'G') this.col = Math.max(0, (parseInt(args, 10) || 1) - 1);
            else if (cmd === 'D') this.col = Math.max(0, this.col - (parseInt(args, 10) || 1));
            continue;
          }
        }
        if (ch === '\n') { this.newline(); continue; }
        if (ch === '\r') { if (str[i + 1] === '\n') continue; this.col = 0; continue; }
        if (ch === '\b') { this.col = Math.max(0, this.col - 1); continue; }
        if (ch === '\x07') { this.bell(); continue; }
        if (ch === '\t') { const n = 8 - (this.col % 8); for (let k = 0; k < n; k++) this.putc(' '); continue; }
        this.putc(ch);
      }
      this.queueFlush();
    }
    putc(ch) {
      const cell = { ch, st: Object.assign({}, this.st), key: this.stKey };
      while (this.cur.length < this.col) this.cur.push({ ch: ' ', st: null, key: '' });
      this.cur[this.col] = cell;
      this.col++;
    }
    newline() {
      if (!this.curEl) { this.curEl = document.createElement('div'); this.curEl.className = 'line'; this.outEl.appendChild(this.curEl); }
      this.curEl.innerHTML = cellsToHTML(this.cur) || '';
      if (!this.cur.length) this.curEl.innerHTML = '&#8203;';
      this.curEl = null;
      this.cur = [];
      this.col = 0;
      this.lineCount = (this.lineCount || 0) + 1;
      if (this.lineCount > this.maxLines) {
        let n = 200; while (n-- && this.outEl.firstChild) this.outEl.removeChild(this.outEl.firstChild);
        this.lineCount -= 200;
      }
    }
    queueFlush() {
      if (this.flushQueued) return;
      this.flushQueued = true;
      requestAnimationFrame(() => this.flush());
    }
    flush() {
      this.flushQueued = false;
      if (this.cur.length) {
        if (!this.curEl) { this.curEl = document.createElement('div'); this.curEl.className = 'line'; this.outEl.appendChild(this.curEl); }
        this.curEl.innerHTML = cellsToHTML(this.cur);
      } else if (this.curEl) { this.curEl.remove(); this.curEl = null; }
      this.scrollBottom();
    }
    scrollBottom() { this.scroll.scrollTop = this.scroll.scrollHeight; }
    clear() {
      this.outEl.innerHTML = '';
      this.cur = []; this.col = 0; this.curEl = null; this.lineCount = 0;
    }
    // text the cursor sits after on the current output line (used as inline prompt prefix)
    takeCurrentLine() {
      const cells = this.cur;
      if (this.curEl) { this.curEl.remove(); this.curEl = null; }
      this.cur = []; this.col = 0;
      return cells;
    }

    // ------------------------------------------------ input
    readLine(opts = {}) {
      return new Promise((resolve) => {
        this.flush();
        const prefix = this.takeCurrentLine();
        const promptCells = prefix.concat(ansiToCells(opts.prompt || ''));
        this.pending = {
          resolve, opts, promptCells, buf: '', pos: 0, histIdx: -1, draft: '',
          history: opts.history || [], tabCount: 0, cycle: null, search: null,
        };
        this.renderInput();
        if (this.typeahead.length) {
          const line = this.typeahead.shift();
          this.pending.buf = line; this.pending.pos = line.length;
          setTimeout(() => this.submit(), 15);
        }
      });
    }
    readKey() {
      return new Promise((resolve) => { this.flush(); this.keyWaiter = resolve; });
    }
    renderInput() {
      const p = this.pending;
      if (!p) { this.inEl.innerHTML = ''; return; }
      let cells;
      if (p.search) {
        const s = p.search;
        const pre = ansiToCells(`(reverse-i-search)\`${s.q}': `);
        const m = s.match || '';
        cells = pre.concat(ansiToCells(m));
        this.inEl.innerHTML = cellsToHTML(cells, pre.length + Math.max(0, s.match ? s.match.indexOf(s.q) : 0) + (s.match ? 0 : 0));
        this.scrollBottom();
        return;
      }
      let shown = p.opts.hidden ? '' : p.buf;
      let body = shown;
      if (!p.opts.hidden && p.opts.highlight) { try { body = p.opts.highlight(shown); } catch (e) { body = shown; } }
      const bodyCells = ansiToCells(body);
      cells = p.promptCells.concat(bodyCells);
      const cursorAt = p.promptCells.length + (p.opts.hidden ? 0 : p.pos);
      this.inEl.innerHTML = cellsToHTML(cells, cursorAt);
      this.scrollBottom();
    }
    echoLine(extra = '') {
      // commit prompt+buffer to output
      const p = this.pending;
      const body = p.opts.hidden ? '' : (p.opts.highlight ? p.opts.highlight(p.buf) : p.buf);
      const el = document.createElement('div');
      el.className = 'line';
      el.innerHTML = cellsToHTML(p.promptCells.concat(ansiToCells(body + extra))) || '&#8203;';
      this.outEl.appendChild(el);
      this.lineCount = (this.lineCount || 0) + 1;
    }
    submit() {
      const p = this.pending;
      if (!p) return;
      this.echoLine();
      this.pending = null;
      this.inEl.innerHTML = '';
      this.signal = new TX.Signal();
      p.resolve(p.buf);
    }
    paste(text) {
      if (this.app) { if (this.app.onPaste) { this.app.onPaste(text); this.renderApp(); } return; }
      if (!this.pending) return;
      const lines = text.replace(/\r\n?/g, '\n').split('\n');
      const p = this.pending;
      p.buf = p.buf.slice(0, p.pos) + lines[0] + p.buf.slice(p.pos);
      p.pos += lines[0].length;
      if (lines.length > 1) {
        const rest = lines.slice(1);
        if (rest[rest.length - 1] === '') rest.pop();
        this.typeahead.push(...rest);
        this.submit();
      } else this.renderInput();
    }
    onInput() {
      const v = this.kbd.value;
      this.kbd.value = '';
      if (!v) return;
      if (this.app) { for (const ch of v) this.app.onKey({ key: ch, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, preventDefault() {} }); this.renderApp(); return; }
      if (this.keyWaiter) { const w = this.keyWaiter; this.keyWaiter = null; w(v[0]); return; }
      const p = this.pending;
      if (!p) return;
      if (p.search) { p.search.q += v; this.searchHistory(false); this.renderInput(); return; }
      p.buf = p.buf.slice(0, p.pos) + v + p.buf.slice(p.pos);
      p.pos += v.length;
      p.tabCount = 0; p.cycle = null;
      this.renderInput();
    }
    onKey(e) {
      if (this.app) {
        if (e.key === 'Unidentified' || e.isComposing || ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'OS'].includes(e.key)) return;
        const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
        if (printable) return; // handled by input event
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') return; // allow paste
        e.preventDefault();
        const ev = { key: (e.ctrlKey || e.metaKey) && e.key.length === 1 ? e.key.toLowerCase() : e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, preventDefault() {} };
        this.app.onKey(ev);
        this.renderApp();
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key;
      // copy when selection exists
      if (ctrl && (k === 'c' || k === 'C')) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString()) return; // native copy
      }
      if (ctrl && (k === 'v' || k === 'V')) return; // native paste -> paste event
      if (this.keyWaiter) {
        if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); const w = this.keyWaiter; this.keyWaiter = null; w('\x03'); return; }
        if (['Enter', 'Escape', ' ', 'q', 'Backspace'].includes(k) || k.length === 1) { if (k.length === 1) return; e.preventDefault(); const w = this.keyWaiter; this.keyWaiter = null; w(k === 'Enter' ? '\n' : k === 'Escape' ? '\x1b' : k); }
        return;
      }
      const p = this.pending;
      if (!p) {
        // command running
        if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); this.write('^C'); this.signal.abort(); }
        else if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); this.write('^Z'); this.signal.abort(); }
        return;
      }
      if (p.search) return this.onSearchKey(e);
      if (k !== 'Tab') { p.tabCount = 0; if (k !== 'Shift') p.cycle = null; }
      const setBuf = (b, pos) => { p.buf = b; p.pos = pos == null ? b.length : pos; this.renderInput(); };
      if (ctrl && !e.altKey) {
        const lk = k.toLowerCase();
        const handled = true;
        switch (lk) {
          case 'c': e.preventDefault(); this.echoLine(p.opts.hidden ? '' : '^C'); this.pending = null; this.inEl.innerHTML = ''; p.resolve(null); return;
          case 'd':
            e.preventDefault();
            if (!p.buf.length && p.opts.onEOF) { this.echoLine(); this.pending = null; this.inEl.innerHTML = ''; p.resolve('\x04'); return; }
            setBuf(p.buf.slice(0, p.pos) + p.buf.slice(p.pos + 1), p.pos); return;
          case 'l': e.preventDefault(); this.clear(); this.renderInput(); return;
          case 'a': e.preventDefault(); p.pos = 0; this.renderInput(); return;
          case 'e': e.preventDefault(); p.pos = p.buf.length; this.renderInput(); return;
          case 'u': e.preventDefault(); setBuf(p.buf.slice(p.pos), 0); return;
          case 'k': e.preventDefault(); setBuf(p.buf.slice(0, p.pos), p.pos); return;
          case 'w': { e.preventDefault(); const left = p.buf.slice(0, p.pos).replace(/\S+\s*$/, ''); setBuf(left + p.buf.slice(p.pos), left.length); return; }
          case 'r': if (!p.opts.hidden) { e.preventDefault(); p.search = { q: '', match: '', idx: p.history.length }; this.renderInput(); } return;
          case 'arrowleft': { e.preventDefault(); const m = /\S*\s*$/.exec(p.buf.slice(0, p.pos)); p.pos -= m ? Math.max(1, m[0].length) : 1; if (p.pos < 0) p.pos = 0; this.renderInput(); return; }
          case 'arrowright': { e.preventDefault(); const m = /^\s*\S*/.exec(p.buf.slice(p.pos)); p.pos += m ? Math.max(1, m[0].length) : 1; if (p.pos > p.buf.length) p.pos = p.buf.length; this.renderInput(); return; }
          default: if (handled && lk.length === 1 && !['c', 'x'].includes(lk)) { /* let browser shortcuts through */ } return;
        }
      }
      switch (k) {
        case 'Enter': e.preventDefault(); this.submit(); return;
        case 'Backspace': e.preventDefault(); if (p.pos > 0) setBuf(p.buf.slice(0, p.pos - 1) + p.buf.slice(p.pos), p.pos - 1); else this.bell(); return;
        case 'Delete': e.preventDefault(); setBuf(p.buf.slice(0, p.pos) + p.buf.slice(p.pos + 1), p.pos); return;
        case 'ArrowLeft': e.preventDefault(); if (p.pos > 0) p.pos--; this.renderInput(); return;
        case 'ArrowRight': e.preventDefault(); if (p.pos < p.buf.length) p.pos++; this.renderInput(); return;
        case 'Home': e.preventDefault(); p.pos = 0; this.renderInput(); return;
        case 'End': e.preventDefault(); p.pos = p.buf.length; this.renderInput(); return;
        case 'ArrowUp': e.preventDefault(); this.histMove(-1); return;
        case 'ArrowDown': e.preventDefault(); this.histMove(1); return;
        case 'PageUp': e.preventDefault(); this.scroll.scrollTop -= this.scroll.clientHeight * 0.8; return;
        case 'PageDown': e.preventDefault(); this.scroll.scrollTop += this.scroll.clientHeight * 0.8; return;
        case 'Escape': e.preventDefault(); if (p.opts.escClears) setBuf('', 0); return;
        case 'Tab': e.preventDefault(); this.complete(e.shiftKey); return;
        default:
      }
    }
    onSearchKey(e) {
      const p = this.pending, s = p.search;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && k.toLowerCase() === 'r') { e.preventDefault(); this.searchHistory(true); this.renderInput(); return; }
      if (k === 'Backspace') { e.preventDefault(); s.q = s.q.slice(0, -1); s.idx = p.history.length; this.searchHistory(false); this.renderInput(); return; }
      if (k === 'Enter') { e.preventDefault(); p.buf = s.match || ''; p.pos = p.buf.length; p.search = null; this.submit(); return; }
      if ((ctrl && (k.toLowerCase() === 'c' || k.toLowerCase() === 'g')) || k === 'Escape') { e.preventDefault(); p.search = null; this.renderInput(); return; }
      if (k.startsWith('Arrow') || k === 'Tab' || k === 'Home' || k === 'End') { e.preventDefault(); p.buf = s.match || p.buf; p.pos = p.buf.length; p.search = null; this.renderInput(); }
    }
    searchHistory(older) {
      const p = this.pending, s = p.search;
      if (!s.q) { s.match = ''; return; }
      let i = older ? s.idx - 1 : Math.min(s.idx, p.history.length - 1);
      for (; i >= 0; i--) {
        if (p.history[i].includes(s.q)) { s.match = p.history[i]; s.idx = i; return; }
      }
      this.bell();
    }
    histMove(d) {
      const p = this.pending;
      const H = p.history;
      if (!H.length) return;
      if (p.histIdx === -1) { if (d > 0) return; p.draft = p.buf; p.histIdx = H.length; }
      let i = p.histIdx + d;
      if (i < 0) { i = 0; this.bell(); }
      if (i >= H.length) { p.histIdx = -1; p.buf = p.draft; p.pos = p.buf.length; this.renderInput(); return; }
      p.histIdx = i;
      p.buf = H[i]; p.pos = p.buf.length;
      this.renderInput();
    }
    complete(reverse) {
      const p = this.pending;
      if (!p.opts.completer) return;
      // cycling mode (cmd / PowerShell)
      if (p.cycle) {
        const c = p.cycle;
        c.idx = (c.idx + (reverse ? -1 : 1) + c.cands.length) % c.cands.length;
        const val = c.cands[c.idx];
        p.buf = c.before + val + c.after; p.pos = (c.before + val).length;
        this.renderInput();
        return;
      }
      let res;
      try { res = p.opts.completer(p.buf, p.pos); } catch (err) { console.error(err); return; }
      if (!res || !res.cands || !res.cands.length) { this.bell(); return; }
      const before = p.buf.slice(0, res.start), after = p.buf.slice(p.pos);
      if (res.mode === 'cycle') {
        const cands = res.cands;
        p.cycle = { cands, idx: reverse ? cands.length - 1 : 0, before, after };
        const val = cands[p.cycle.idx];
        p.buf = before + val + after; p.pos = (before + val).length;
        this.renderInput();
        return;
      }
      const cands = res.cands;
      if (cands.length === 1) {
        const val = cands[0];
        const suffix = val.endsWith('/') || res.noSpace ? '' : ' ';
        p.buf = before + val + suffix + after; p.pos = (before + val + suffix).length;
        this.renderInput();
        return;
      }
      // common prefix
      let pre = cands[0];
      for (const c of cands) { let i = 0; while (i < pre.length && i < c.length && (res.ci ? pre[i].toLowerCase() === c[i].toLowerCase() : pre[i] === c[i])) i++; pre = pre.slice(0, i); }
      const typed = p.buf.slice(res.start, p.pos);
      if (pre.length > typed.length) {
        p.buf = before + pre + after; p.pos = (before + pre).length; p.tabCount = 0;
        this.renderInput();
        return;
      }
      p.tabCount++;
      if (p.tabCount < 2) { this.bell(); return; }
      // list candidates
      this.echoLine();
      const shown = (res.display || cands).slice(0, 300);
      this.write(TX.columns(shown, this.cols) + '\n');
      this.flush();
      this.renderInput();
      p.tabCount = 0;
    }

    // ------------------------------------------------ full-screen apps
    runApp(app) {
      return new Promise((resolve) => {
        this.flush();
        this.measure();
        this.app = app;
        app.term = this;
        app.exit = (v) => { this.app = null; this.screenEl.classList.add('hidden'); this.scroll.classList.remove('hidden'); this.screenEl.innerHTML = ''; if (app.stop) app.stop(); resolve(v); this.focus(); };
        this.scroll.classList.add('hidden');
        this.screenEl.classList.remove('hidden');
        this.measure();
        this.rowsFull = Math.max(10, Math.floor((this.host.clientHeight - 12) / this.charH));
        app.cols = this.cols; app.rows = this.rowsFull;
        app.resize = () => { this.rowsFull = Math.max(10, Math.floor((this.host.clientHeight - 12) / this.charH)); app.cols = this.cols; app.rows = this.rowsFull; };
        if (app.start) app.start();
        this.renderApp();
        this.focus();
      });
    }
    renderApp() {
      if (!this.app) return;
      const lines = this.app.draw();
      let html = '';
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (typeof l === 'object' && l && l.html != null) html += l.html;
        else if (typeof l === 'object' && l && l.cursor != null) html += '<div class="line">' + (cellsToHTML(ansiToCells(l.text), l.cursor) || '&#8203;') + '</div>';
        else html += '<div class="line">' + (cellsToHTML(ansiToCells(l)) || '&#8203;') + '</div>';
      }
      this.screenEl.innerHTML = html;
    }
  }
  TX.Terminal = Terminal;
  TX.ansiToCells = ansiToCells;
})();
