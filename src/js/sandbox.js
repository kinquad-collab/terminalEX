/* TerminalEX — the sandbox: run commands on a brand-new pretend computer with no screen.
 * Used by the Interactive Cheat Sheet (▶ Run), the certification tests (hands-on questions are RUN, not pattern-matched)
 * and the test suite. Machines are built with a seeded random generator, so the same command always gives the same output. */
(function () {
  'use strict';
  const TX = window.TX;

  function rng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Run fn with Math.random seeded (and restored afterwards, even if fn is async).
  function seeded(seed, fn) {
    const real = Math.random;
    Math.random = rng(seed);
    let r;
    try { r = fn(); } catch (e) { Math.random = real; throw e; }
    if (r && typeof r.then === 'function') return r.finally(() => { Math.random = real; });
    Math.random = real;
    return r;
  }

  const cache = {};
  function machine(kind, opts = {}) {
    const seed = opts.seed == null ? 42 : opts.seed;
    return seeded(seed, () => {
      const key = kind + ':' + seed;
      let m;
      if (cache[key]) { m = new TX.Machine(kind, JSON.parse(cache[key])); }
      else {
        m = new TX.Machine(kind);
        if (m.vfs.get(m.home.concat('projects')) && TX.git) { try { TX.git.seedRepo(m.vfs, m.home.concat('projects', 'hello-web'), 'student', 'https://github.com/student/hello-web.git'); } catch (e) { /* no git */ } }
        cache[key] = JSON.stringify(m.vfs.root);
      }
      if (opts.variant) opts.variant(m);
      return m;
    });
  }

  function fakeTerm(state) {
    return {
      cols: 100, rows: 30, signal: new TX.Signal(),
      write(s) { state.out += s; },
      clear() { /* keep the output so students can see it */ },
      async readLine(o = {}) { if (state.input.length) { const l = state.input.shift(); state.out += (o.prompt || '') + (o.hidden ? '' : l) + '\n'; return l; } if (o.prompt) state.out += o.prompt + '\n'; return null; },
      async readKey() { return state.input.length ? String(state.input.shift())[0] || ' ' : ' '; },
      runApp(app) { state.out += '[' + (app && app.title ? app.title : 'full-screen program') + ' — open a real terminal tab to use it]\n'; return Promise.resolve(); },
      renderApp() {}, bell() {}, focus() {}, measure() {}, scrollBottom() {}, paste() {},
    };
  }

  // Run commands. script: string (lines) or array. Returns { out, code, m, sh, timedOut }.
  async function run(shellKind, script, opts = {}) {
    const def = TX.SHELLS[shellKind];
    if (!def) throw new Error('Unknown shell ' + shellKind);
    const m = opts.machine || machine(def.machine, opts);
    const state = { out: '', input: (opts.input || []).slice() };
    const term = fakeTerm(state);
    const stack = [];
    const session = {
      term, pid: 2230, kind: shellKind, opts: {}, app: { settings: {} },
      historyFor: () => [], refreshTitle() {},
      pushShell(sh) { stack.push(sh); if (sh.banner && sh.kind !== 'posix') state.out += sh.banner(); },
    };
    const root = TX.makeShell(shellKind, session, m, opts.shellOpts || {});
    if (opts.cwd) root.cwd = opts.cwd.slice();
    stack.push(root);
    const lines = Array.isArray(script) ? script.slice() : String(script).split('\n');
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; term.signal.abort(); }, opts.timeout || 4000);
    const go = async () => {
      if (root.boot) { const keep = state.out; await root.boot({ tty: false, out: () => {}, err: () => {} }); state.out = keep; }
      while (lines.length) {
        let line = lines.shift();
        const sh = stack[stack.length - 1];
        if (!sh) break;
        if (sh.kind === 'posix') while (TX.posixNeedsMore(line) && lines.length) line += '\n' + lines.shift();
        if (opts.echo) state.out += (typeof opts.echo === 'string' ? opts.echo : '$ ') + line + '\n';
        try { await sh.exec(line); }
        catch (e) {
          if (e && e.exitShell) { stack.pop(); if (!stack.length) break; continue; }
          if (e && e.interrupt) { state.out += timedOut ? '\n[stopped: the command took too long]\n' : '^C\n'; if (timedOut) break; continue; }
          if (e && e.user) { state.out += e.message + '\n'; continue; }
          state.out += 'TerminalEX internal error: ' + (e && e.message ? e.message : e) + '\n';
          if (opts.throwOnBug) throw e;
        }
        if (timedOut) break;
      }
    };
    try { await seeded((opts.seed == null ? 42 : opts.seed) + 7, go); }
    finally { clearTimeout(timer); }
    const top = stack[stack.length - 1] || root;
    return { out: state.out, code: top.lastCode, m, sh: top, timedOut };
  }

  // Normalize output for comparing answers: no colors, no \r, no trailing spaces, no trailing blank lines.
  function norm(s) {
    return TX.stripAnsi(String(s)).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
  }

  TX.sandbox = { run, machine, seeded, norm, rng };
})();
