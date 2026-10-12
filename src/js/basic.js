/* TerminalEX — a small line-numbered BASIC for MS-DOS's QBASIC command.
 * Enough to type in and run the programs kids typed in from magazines: PRINT, INPUT, LET, IF/THEN/ELSE, GOTO, GOSUB/RETURN,
 * FOR/NEXT/STEP, END, REM, CLS, string variables (A$), and INT RND ABS SQR LEN LEFT$ RIGHT$ MID$ STR$ VAL CHR$ ASC UCASE$ LCASE$.
 * Immediate mode: RUN, LIST, NEW, LOAD "FILE.BAS", SAVE "FILE.BAS", SYSTEM (back to DOS). */
(function () {
  'use strict';
  const TX = window.TX;

  function lex(s) {
    const t = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"') { const j = s.indexOf('"', i + 1); t.push({ k: 's', v: s.slice(i + 1, j < 0 ? s.length : j) }); i = j < 0 ? s.length : j + 1; continue; }
      if (/[0-9.]/.test(ch)) { const m = /^\d*\.?\d+(E[+-]?\d+)?/i.exec(s.slice(i)); t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (/[A-Za-z]/.test(ch)) { const m = /^[A-Za-z][A-Za-z0-9_]*\$?/.exec(s.slice(i)); t.push({ k: 'w', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      const two = s.slice(i, i + 2);
      if (['<>', '<=', '>='].includes(two)) { t.push({ k: 'o', v: two }); i += 2; continue; }
      t.push({ k: 'o', v: ch }); i++;
    }
    return t;
  }
  const FN = {
    INT: (x) => Math.floor(x), ABS: Math.abs, SQR: Math.sqrt, RND: () => Math.random(), SGN: Math.sign, SIN: Math.sin, COS: Math.cos,
    LEN: (s) => String(s).length, 'LEFT$': (s, n) => String(s).slice(0, n), 'RIGHT$': (s, n) => (n > 0 ? String(s).slice(-n) : ''), 'MID$': (s, a, n) => String(s).substr(a - 1, n === undefined ? undefined : n),
    'STR$': (x) => (x >= 0 ? ' ' : '') + String(x), VAL: (s) => parseFloat(s) || 0, 'CHR$': (n) => String.fromCharCode(n), ASC: (s) => String(s).charCodeAt(0) || 0, 'UCASE$': (s) => String(s).toUpperCase(), 'LCASE$': (s) => String(s).toLowerCase(),
  };
  class Expr {
    constructor(toks, vars) { this.t = toks; this.i = 0; this.vars = vars; }
    peek() { return this.t[this.i]; }
    eat(v) { const x = this.t[this.i]; if (x && x.v === v) { this.i++; return true; } return false; }
    parse() { return this.or(); }
    or() { let a = this.and(); while (this.peek() && this.peek().v === 'OR') { this.i++; const b = this.and(); a = (a || b) ? -1 : 0; } return a; }
    and() { let a = this.not(); while (this.peek() && this.peek().v === 'AND') { this.i++; const b = this.not(); a = (a && b) ? -1 : 0; } return a; }
    not() { if (this.eat('NOT')) return this.not() ? 0 : -1; return this.cmp(); }
    cmp() {
      let a = this.add();
      const p = this.peek();
      if (p && ['=', '<>', '<', '>', '<=', '>='].includes(p.v)) { this.i++; const b = this.add(); const r = { '=': a === b, '<>': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[p.v]; a = r ? -1 : 0; }
      return a;
    }
    add() { let a = this.mul(); for (;;) { if (this.eat('+')) { const b = this.mul(); a = typeof a === 'string' || typeof b === 'string' ? String(a) + String(b) : a + b; } else if (this.eat('-')) a -= this.mul(); else return a; } }
    mul() { let a = this.pow(); for (;;) { if (this.eat('*')) a *= this.pow(); else if (this.eat('/')) { const b = this.pow(); if (b === 0) throw new Error('Division by zero'); a /= b; } else if (this.eat('MOD')) a %= this.pow(); else if (this.eat('\\')) a = Math.trunc(a / this.pow()); else return a; } }
    pow() { const a = this.unary(); if (this.eat('^')) return Math.pow(a, this.pow()); return a; }
    unary() { if (this.eat('-')) return -this.unary(); if (this.eat('+')) return this.unary(); return this.atom(); }
    atom() {
      const x = this.t[this.i++];
      if (!x) throw new Error('Syntax error');
      if (x.k === 'n' || x.k === 's') return x.v;
      if (x.v === '(') { const v = this.parse(); if (!this.eat(')')) throw new Error('Missing )'); return v; }
      if (x.k === 'w') {
        if (FN[x.v]) { const args = []; if (this.eat('(')) { if (!this.eat(')')) { do args.push(this.parse()); while (this.eat(',')); if (!this.eat(')')) throw new Error('Missing )'); } } return FN[x.v](...args); }
        return x.v in this.vars ? this.vars[x.v] : x.v.endsWith('$') ? '' : 0;
      }
      throw new Error('Syntax error');
    }
  }

  TX.basic = async function (c, sh) {
    const prog = {};
    const vars = {};
    const out = (s) => c.out(s);
    const fmt = (v) => (typeof v === 'number' ? (v >= 0 ? ' ' : '') + String(Math.round(v * 1e6) / 1e6) + ' ' : v);
    let col = 0;
    const print = (s) => { out(s); const nl = s.lastIndexOf('\n'); col = nl >= 0 ? s.length - nl - 1 : col + s.length; };
    const ask = async (p) => { const l = await c.readLine(p); col = 0; return l; };
    const sortedLines = () => Object.keys(prog).map(Number).sort((a, b) => a - b);
    function load(name) {
      const segs = sh.resolve(name);
      const t = sh.vfs.readFile(segs);
      Object.keys(prog).forEach((k) => delete prog[k]);
      t.split('\n').forEach((l) => { const m = /^\s*(\d+)\s*(.*)$/.exec(l); if (m) prog[m[1]] = m[2]; });
    }
    async function run() {
      Object.keys(vars).forEach((k) => delete vars[k]);
      const lines = sortedLines();
      const code = lines.map((n) => splitStatements(prog[n]));
      const forStack = [], gosub = [];
      let li = 0, si = 0, steps = 0;
      const jump = (n) => { const i = lines.indexOf(n); if (i < 0) throw new Error('Undefined line number'); li = i; si = 0; };
      const advance = () => { si++; if (si >= code[li].length) { li++; si = 0; } };
      while (li < lines.length) {
        if (!code[li].length) { li++; si = 0; continue; }
        if (++steps > 100000) throw new Error('Program stopped (TerminalEX limit: 100,000 steps)');
        if (steps % 400 === 0) await new Promise((r) => setTimeout(r, 0)); // let Ctrl+C through
        if (c.term && c.term.signal && c.term.signal.aborted) throw new TX.Interrupt();
        const r = await exec(code[li][si]);
        if (r === 'END') return;
        if (r && r.goto !== undefined) { jump(r.goto); continue; }
        if (r && r.gosub !== undefined) { advance(); gosub.push([li, si]); jump(r.gosub); continue; }
        if (r === 'RETURN') { if (!gosub.length) throw new Error('RETURN without GOSUB'); [li, si] = gosub.pop(); continue; }
        if (r && r.forv) { advance(); forStack.push({ v: r.forv, to: r.to, step: r.step, li, si }); continue; }
        if (r && r.next !== undefined) {
          const f = r.next ? forStack.filter((x) => x.v === r.next).pop() : forStack[forStack.length - 1];
          if (!f) throw new Error('NEXT without FOR');
          vars[f.v] += f.step;
          if ((f.step > 0 && vars[f.v] <= f.to) || (f.step < 0 && vars[f.v] >= f.to)) { li = f.li; si = f.si; continue; }
          forStack.splice(forStack.indexOf(f), 1);
        }
        advance();
      }
    }
    function splitStatements(s) { const out2 = []; let cur = '', q = false; for (const ch of s) { if (ch === '"') q = !q; if (ch === ':' && !q) { out2.push(cur); cur = ''; } else cur += ch; } out2.push(cur); return out2.map((x) => x.trim()).filter(Boolean); }
    async function exec(stmt) {
      const t = lex(stmt);
      if (!t.length) return null;
      const w = t[0].v;
      const ev = (toks) => new Expr(toks, vars).parse();
      if (w === 'REM' || stmt[0] === "'") return null;
      if (w === 'END' || w === 'STOP' || w === 'SYSTEM') return 'END';
      if (w === 'CLS') { if (c.term && c.term.clear) c.term.clear(); col = 0; return null; }
      if (w === 'PRINT' || w === '?') {
        const e = new Expr(t.slice(1), vars);
        let s = '', trailing = false;
        while (e.peek()) {
          if (e.eat(';')) { trailing = true; continue; }
          if (e.eat(',')) { s += ' '.repeat(14 - ((col + s.length) % 14)); trailing = true; continue; }
          s += fmt(e.parse()); trailing = false;
        }
        print(s + (trailing ? '' : '\n'));
        return null;
      }
      if (w === 'INPUT') {
        let i = 1, prompt = '? ';
        if (t[1] && t[1].k === 's') { prompt = t[1].v + (t[2] && t[2].v === ',' ? '' : '? '); i = 3; }
        const names = t.slice(i).filter((x) => x.k === 'w').map((x) => x.v);
        const ans = (await ask(prompt)).split(',');
        names.forEach((n, k) => { const a = (ans[k] || '').trim(); vars[n] = n.endsWith('$') ? a : (parseFloat(a) || 0); });
        return null;
      }
      if (w === 'GOTO') return { goto: t[1].v };
      if (w === 'GOSUB') return { gosub: t[1].v };
      if (w === 'RETURN') return 'RETURN';
      if (w === 'IF') {
        const thenAt = t.findIndex((x) => x.v === 'THEN');
        if (thenAt < 0) throw new Error('Syntax error (IF needs THEN)');
        const elseAt = t.findIndex((x) => x.v === 'ELSE');
        const cond = ev(t.slice(1, thenAt));
        const src = stmt.replace(/^\s*IF\s+.*?\s+THEN\s+/i, '');
        const [yes, no] = elseAt >= 0 ? src.split(/\s+ELSE\s+/i) : [src, null];
        const branch = cond ? yes : no;
        if (branch == null) return null;
        if (/^\d+$/.test(branch.trim())) return { goto: parseInt(branch, 10) };
        return exec(branch);
      }
      if (w === 'FOR') {
        const toAt = t.findIndex((x) => x.v === 'TO');
        const stepAt = t.findIndex((x) => x.v === 'STEP');
        const v = t[1].v;
        vars[v] = ev(t.slice(3, toAt));
        const to = ev(t.slice(toAt + 1, stepAt < 0 ? undefined : stepAt));
        const step = stepAt < 0 ? 1 : ev(t.slice(stepAt + 1));
        return { forv: v, to, step };
      }
      if (w === 'NEXT') return { next: t[1] ? t[1].v : '' };
      const assign = w === 'LET' ? t.slice(1) : t;
      if (assign[0] && assign[0].k === 'w' && assign[1] && assign[1].v === '=') { vars[assign[0].v] = ev(assign.slice(2)); return null; }
      throw new Error('Syntax error');
    }

    const runArg = c.args.findIndex((a) => /^\/run$/i.test(a));
    const file = c.args.find((a) => !a.startsWith('/'));
    try {
      if (file) load(file);
    } catch (e) { c.err('File not found\n'); return 1; }
    if (runArg >= 0) { try { await run(); } catch (e) { if (e.interrupt) throw e; c.outln(e.message); } return 0; }
    c.outln('QBasic (TerminalEX text mode)  —  type line-numbered lines to build a program.');
    c.outln('RUN runs it, LIST shows it, NEW erases it, SAVE "NAME.BAS" / LOAD "NAME.BAS", SYSTEM returns to DOS.');
    c.outln('Try:  10 PRINT "HELLO"   then   20 GOTO 10   then   RUN   (Ctrl+C stops it)\nOk');
    for (;;) {
      let l;
      try { l = await c.readLine(''); } catch (e) { c.outln(''); return 0; }
      if (l == null) return 0;
      const m = /^\s*(\d+)\s*(.*)$/.exec(l);
      if (m) { if (m[2]) prog[m[1]] = m[2]; else delete prog[m[1]]; continue; }
      const cmd = l.trim().toUpperCase();
      try {
        if (!cmd) continue;
        if (cmd === 'SYSTEM' || cmd === 'EXIT') return 0;
        if (cmd === 'LIST') sortedLines().forEach((n) => c.outln(n + ' ' + prog[n]));
        else if (cmd === 'NEW') Object.keys(prog).forEach((k) => delete prog[k]);
        else if (cmd === 'RUN') { try { await run(); } finally { if (col) c.out('\n'); col = 0; } }
        else if (/^SAVE\s+"?([^"]+)"?$/i.test(l.trim())) { const n = /^SAVE\s+"?([^"]+)"?$/i.exec(l.trim())[1]; sh.vfs.writeFile(sh.resolve(/\./.test(n) ? n : n + '.BAS'), sortedLines().map((k) => k + ' ' + prog[k]).join('\n') + '\n', { owner: 'student' }); }
        else if (/^LOAD\s+"?([^"]+)"?$/i.test(l.trim())) { const n = /^LOAD\s+"?([^"]+)"?$/i.exec(l.trim())[1]; load(/\./.test(n) ? n : n + '.BAS'); }
        else { const r = await exec(l.trim()); void r; }
        c.outln('Ok');
      } catch (e) { if (e.interrupt) { c.outln('Break'); continue; } c.outln(e.message); }
    }
  };
})();
