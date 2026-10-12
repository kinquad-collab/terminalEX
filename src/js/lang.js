/* TerminalEX — tiny language runtimes: a mini Python 3 interpreter and a Node.js REPL */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;

  // ================================================================= Python
  class PyFloat { constructor(v) { this.v = v; } }
  class PyTuple { constructor(items) { this.items = items; } }
  class PyFunc { constructor(name, params, body, closure, interp) { Object.assign(this, { name, params, body, closure, interp }); } }
  class PyErr extends Error { constructor(type, msg, line) { super(msg); this.pyType = type; this.line = line; } }
  class Ret { constructor(v) { this.v = v; } }
  const BREAK = { brk: 1 }, CONT = { cont: 1 };
  const isF = (x) => x instanceof PyFloat;
  const num = (x) => (isF(x) ? x.v : typeof x === 'boolean' ? (x ? 1 : 0) : x);
  const isNum = (x) => typeof x === 'number' || isF(x) || typeof x === 'boolean';
  const typeName = (x) => (x === null ? 'NoneType' : typeof x === 'boolean' ? 'bool' : typeof x === 'number' ? 'int' : isF(x) ? 'float' : typeof x === 'string' ? 'str' : Array.isArray(x) ? 'list' : x instanceof PyTuple ? 'tuple' : x instanceof Map ? 'dict' : x instanceof Set ? 'set' : x instanceof PyFunc || typeof x === 'function' ? 'function' : x && x.__module ? 'module' : 'object');
  function fmtFloat(v) {
    if (!isFinite(v)) return isNaN(v) ? 'nan' : v > 0 ? 'inf' : '-inf';
    if (Number.isInteger(v) && Math.abs(v) < 1e16) return v.toFixed(1);
    let s = String(v);
    if (/e/.test(s)) s = s.replace(/e\+?(-?)(\d)$/, 'e$10$2').replace('e+', 'e+');
    return s;
  }
  function repr(x) {
    if (typeof x === 'string') return x.includes("'") && !x.includes('"') ? '"' + x + '"' : "'" + x.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\t/g, '\\t') + "'";
    return str(x);
  }
  function str(x) {
    if (x === null || x === undefined) return 'None';
    if (x === true) return 'True'; if (x === false) return 'False';
    if (typeof x === 'number') return String(x);
    if (isF(x)) return fmtFloat(x.v);
    if (typeof x === 'string') return x;
    if (Array.isArray(x)) return '[' + x.map(repr).join(', ') + ']';
    if (x instanceof PyTuple) return '(' + x.items.map(repr).join(', ') + (x.items.length === 1 ? ',' : '') + ')';
    if (x instanceof Map) return '{' + [...x.entries()].map(([k, v]) => repr(k) + ': ' + repr(v)).join(', ') + '}';
    if (x instanceof Set) return x.size ? '{' + [...x].map(repr).join(', ') + '}' : 'set()';
    if (x instanceof PyFunc) return `<function ${x.name} at 0x7f${TX.sha1(x.name).slice(0, 10)}>`;
    if (typeof x === 'function') return `<built-in function ${x.pyName || 'fn'}>`;
    if (x && x.__module) return `<module '${x.__module}' (built-in)>`;
    return String(x);
  }
  function truthy(x) { if (x === null || x === undefined || x === false || x === 0 || x === '') return false; if (isF(x)) return x.v !== 0; if (Array.isArray(x)) return x.length > 0; if (x instanceof PyTuple) return x.items.length > 0; if (x instanceof Map || x instanceof Set) return x.size > 0; return true; }
  function iter(x) {
    if (typeof x === 'string') return [...x];
    if (Array.isArray(x)) return x.slice();
    if (x instanceof PyTuple) return x.items.slice();
    if (x instanceof Map) return [...x.keys()];
    if (x instanceof Set) return [...x];
    if (x && x.__range) return x.__range();
    throw new PyErr('TypeError', `'${typeName(x)}' object is not iterable`);
  }
  function eq(a, b) {
    if (isNum(a) && isNum(b)) return num(a) === num(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => eq(x, b[i]));
    if (a instanceof PyTuple && b instanceof PyTuple) return a.items.length === b.items.length && a.items.every((x, i) => eq(x, b.items[i]));
    return a === b;
  }
  function cmp(a, b) {
    if (isNum(a) && isNum(b)) return num(a) - num(b);
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
    if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmp(a[i], b[i]); if (c) return c; } return a.length - b.length; }
    if (a instanceof PyTuple && b instanceof PyTuple) return cmp(a.items, b.items);
    throw new PyErr('TypeError', `'<' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
  }
  const mkNum = (v, float) => (float || !Number.isInteger(v) ? new PyFloat(v) : v);

  // ---------------- tokenizer
  function tokenize(src) {
    const lines = src.replace(/\r/g, '').split('\n');
    const toks = [];
    const indents = [0];
    let depth = 0;
    let lineNo = 0;
    let i = 0;
    const text = lines.join('\n') + '\n';
    let atLineStart = true;
    while (i < text.length) {
      if (atLineStart && depth === 0) {
        let j = i, col = 0;
        while (text[j] === ' ' || text[j] === '\t') { col += text[j] === '\t' ? 4 : 1; j++; }
        if (text[j] === '\n' || text[j] === '#') { while (text[j] !== '\n') j++; i = j + 1; lineNo++; continue; }
        if (col > indents[indents.length - 1]) { indents.push(col); toks.push({ t: 'INDENT', line: lineNo + 1 }); }
        while (col < indents[indents.length - 1]) { indents.pop(); toks.push({ t: 'DEDENT', line: lineNo + 1 }); }
        if (col !== indents[indents.length - 1]) throw new PyErr('IndentationError', 'unindent does not match any outer indentation level', lineNo + 1);
        i = j; atLineStart = false;
      }
      const ch = text[i];
      if (ch === '\n') { lineNo++; i++; if (depth === 0) { toks.push({ t: 'NL', line: lineNo }); atLineStart = true; } continue; }
      if (ch === ' ' || ch === '\t') { i++; continue; }
      if (ch === '#') { while (text[i] !== '\n') i++; continue; }
      if (ch === '\\' && text[i + 1] === '\n') { i += 2; lineNo++; continue; }
      const line = lineNo + 1;
      let m = /^([rRfFbB]{0,2})("""|'''|"|')/.exec(text.slice(i, i + 5));
      if (m && (m[1] === '' || /^[rRfFbB]+$/.test(m[1]))) {
        const prefix = m[1].toLowerCase(), q = m[2];
        let j = i + m[0].length, s = '';
        while (j < text.length && text.slice(j, j + q.length) !== q) {
          if (text[j] === '\n' && q.length === 1) throw new PyErr('SyntaxError', 'unterminated string literal (detected at line ' + line + ')', line);
          if (text[j] === '\\' && !prefix.includes('r')) { const n = text[j + 1]; s += { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', 0: '\0', r: '\r' }[n] ?? '\\' + n; j += 2; continue; }
          if (text[j] === '\n') lineNo++;
          s += text[j++];
        }
        if (j >= text.length) throw new PyErr('SyntaxError', 'unterminated string literal (detected at line ' + line + ')', line);
        i = j + q.length;
        toks.push({ t: prefix.includes('f') ? 'FSTR' : 'STR', v: s, line });
        continue;
      }
      m = /^(\d+\.\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|\d+e[+-]?\d+|0x[0-9a-f]+|0b[01]+|\d[\d_]*)/i.exec(text.slice(i));
      if (m) { const s = m[0].replace(/_/g, ''); const isFloat = /[.e]/i.test(s) && !/^0x/i.test(s); toks.push({ t: 'NUM', v: isFloat ? new PyFloat(parseFloat(s)) : /^0b/i.test(s) ? parseInt(s.slice(2), 2) : Number(s), line }); i += m[0].length; continue; }
      m = /^[A-Za-z_]\w*/.exec(text.slice(i));
      if (m) { toks.push({ t: 'NAME', v: m[0], line }); i += m[0].length; continue; }
      m = /^(\*\*=|\/\/=|>>=|<<=|\*\*|\/\/|==|!=|<=|>=|->|\+=|-=|\*=|\/=|%=|&=|\|=|:=|<<|>>|[-+*/%<>=()[\]{}:,.;&|^~@])/.exec(text.slice(i));
      if (m) {
        if ('([{'.includes(m[0])) depth++;
        if (')]}'.includes(m[0])) depth = Math.max(0, depth - 1);
        toks.push({ t: 'OP', v: m[0], line }); i += m[0].length; continue;
      }
      throw new PyErr('SyntaxError', `invalid character '${ch}' (U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`, line);
    }
    while (indents.length > 1) { indents.pop(); toks.push({ t: 'DEDENT', line: lineNo }); }
    toks.push({ t: 'EOF', line: lineNo });
    return toks;
  }

  // ---------------- parser
  class Parser {
    constructor(toks) { this.toks = toks; this.i = 0; }
    get p() { return this.toks[this.i]; }
    isOp(v) { return this.p.t === 'OP' && this.p.v === v; }
    isName(v) { return this.p.t === 'NAME' && this.p.v === v; }
    eat(v) { if (!this.isOp(v) && !this.isName(v)) throw new PyErr('SyntaxError', this.p.t === 'EOF' || this.p.t === 'NL' ? `expected '${v}'` : 'invalid syntax', this.p.line); return this.toks[this.i++]; }
    program() { const body = []; while (this.p.t !== 'EOF') { if (this.p.t === 'NL') { this.i++; continue; } body.push(...this.statement()); } return body; }
    block() {
      if (this.p.t !== 'NL') return this.simpleLine();
      this.i++;
      while (this.p.t === 'NL') this.i++;
      if (this.p.t !== 'INDENT') throw new PyErr('IndentationError', 'expected an indented block', this.p.line);
      this.i++;
      const body = [];
      while (this.p.t !== 'DEDENT' && this.p.t !== 'EOF') { if (this.p.t === 'NL') { this.i++; continue; } body.push(...this.statement()); }
      if (this.p.t === 'DEDENT') this.i++;
      return body;
    }
    simpleLine() {
      const out = [this.simple()];
      while (this.isOp(';')) { this.i++; if (this.p.t === 'NL' || this.p.t === 'EOF') break; out.push(this.simple()); }
      if (this.p.t === 'NL') this.i++;
      else if (this.p.t !== 'EOF' && this.p.t !== 'DEDENT') throw new PyErr('SyntaxError', 'invalid syntax', this.p.line);
      return out;
    }
    statement() {
      const t = this.p, line = t.line;
      if (t.t === 'NAME') {
        switch (t.v) {
          case 'if': { this.i++; const clauses = [{ cond: this.expr(), body: (this.eat(':'), this.block()) }]; let els = null; while (this.isName('elif')) { this.i++; clauses.push({ cond: this.expr(), body: (this.eat(':'), this.block()) }); } if (this.isName('else')) { this.i++; this.eat(':'); els = this.block(); } return [{ k: 'if', clauses, els, line }]; }
          case 'while': { this.i++; const cond = this.expr(); this.eat(':'); const body = this.block(); let els = null; if (this.isName('else')) { this.i++; this.eat(':'); els = this.block(); } return [{ k: 'while', cond, body, els, line }]; }
          case 'for': { this.i++; const target = this.targetList(); this.eat('in'); const it = this.exprList(); this.eat(':'); const body = this.block(); let els = null; if (this.isName('else')) { this.i++; this.eat(':'); els = this.block(); } return [{ k: 'for', target, it, body, els, line }]; }
          case 'def': {
            this.i++; const name = this.p.v; this.i++; this.eat('(');
            const params = [];
            while (!this.isOp(')')) { let star = ''; if (this.isOp('*') || this.isOp('**')) star = this.toks[this.i++].v; const pn = this.p.v; this.i++; if (this.isOp(':')) { this.i++; this.expr(); } let def = null; if (this.isOp('=')) { this.i++; def = this.expr(); } params.push({ name: pn, def, star }); if (this.isOp(',')) this.i++; }
            this.eat(')'); if (this.isOp('->')) { this.i++; this.expr(); } this.eat(':');
            return [{ k: 'def', name, params, body: this.block(), line }];
          }
          case 'class': { this.i++; const name = this.p.v; this.i++; if (this.isOp('(')) { while (!this.isOp(')')) this.i++; this.i++; } this.eat(':'); return [{ k: 'class', name, body: this.block(), line }]; }
          case 'try': {
            this.i++; this.eat(':'); const body = this.block(); const handlers = []; let fin = null, els = null;
            while (this.isName('except')) { this.i++; let type = null, as = null; if (!this.isOp(':')) { type = this.expr(); if (this.isName('as')) { this.i++; as = this.p.v; this.i++; } } this.eat(':'); handlers.push({ type, as, body: this.block() }); }
            if (this.isName('else')) { this.i++; this.eat(':'); els = this.block(); }
            if (this.isName('finally')) { this.i++; this.eat(':'); fin = this.block(); }
            return [{ k: 'try', body, handlers, els, fin, line }];
          }
          case 'with': { this.i++; this.expr(); if (this.isName('as')) { this.i += 2; } this.eat(':'); return this.block(); }
        }
      }
      return this.simpleLine();
    }
    simple() {
      const t = this.p, line = t.line;
      if (t.t === 'NAME') {
        switch (t.v) {
          case 'pass': this.i++; return { k: 'pass', line };
          case 'break': this.i++; return { k: 'break', line };
          case 'continue': this.i++; return { k: 'continue', line };
          case 'return': { this.i++; const v = this.p.t === 'NL' || this.isOp(';') || this.p.t === 'EOF' ? null : this.exprList(); return { k: 'return', v, line }; }
          case 'global': case 'nonlocal': { this.i++; const names = [this.p.v]; this.i++; while (this.isOp(',')) { this.i++; names.push(this.p.v); this.i++; } return { k: 'global', names, line }; }
          case 'import': { this.i++; const names = []; do { if (this.isOp(',')) this.i++; let n = this.p.v; this.i++; while (this.isOp('.')) { this.i++; n += '.' + this.p.v; this.i++; } let as = n; if (this.isName('as')) { this.i++; as = this.p.v; this.i++; } names.push([n, as]); } while (this.isOp(',')); return { k: 'import', names, line }; }
          case 'from': { this.i++; const mod = this.p.v; this.i++; this.eat('import'); const names = []; if (this.isOp('*')) { this.i++; names.push(['*', '*']); } else do { if (this.isOp(',')) this.i++; const n = this.p.v; this.i++; let as = n; if (this.isName('as')) { this.i++; as = this.p.v; this.i++; } names.push([n, as]); } while (this.isOp(',')); return { k: 'from', mod, names, line }; }
          case 'raise': { this.i++; const v = this.p.t === 'NL' || this.p.t === 'EOF' ? null : this.expr(); return { k: 'raise', v, line }; }
          case 'del': { this.i++; return { k: 'del', target: this.expr(), line }; }
          case 'assert': { this.i++; const cond = this.expr(); let msg = null; if (this.isOp(',')) { this.i++; msg = this.expr(); } return { k: 'assert', cond, msg, line }; }
        }
      }
      const e = this.exprList();
      if (this.isOp('=')) {
        const targets = [e];
        let v;
        while (this.isOp('=')) { this.i++; v = this.exprList(); targets.push(v); }
        v = targets.pop();
        return { k: 'assign', targets, v, line };
      }
      if (this.p.t === 'OP' && /^(\+|-|\*|\/|\/\/|%|\*\*|&|\||\^|>>|<<)=$/.test(this.p.v)) { const op = this.toks[this.i++].v.slice(0, -1); return { k: 'aug', target: e, op, v: this.exprList(), line }; }
      if (this.isOp(':')) { this.i++; this.expr(); if (this.isOp('=')) { this.i++; return { k: 'assign', targets: [e], v: this.expr(), line }; } return { k: 'pass', line }; }
      return { k: 'expr', e, line };
    }
    targetList() { const first = this.bitor(); if (this.isOp(',')) { const items = [first]; while (this.isOp(',')) { this.i++; if (this.isName('in')) break; items.push(this.bitor()); } return { k: 'tuple', items }; } return first; }
    exprList() {
      const first = this.expr();
      if (this.isOp(',')) { const items = [first]; while (this.isOp(',')) { this.i++; if (this.p.t === 'NL' || this.isOp('=') || this.isOp(')') || this.p.t === 'EOF') break; items.push(this.expr()); } return { k: 'tuple', items }; }
      return first;
    }
    expr() {
      if (this.isName('lambda')) { this.i++; const params = []; while (!this.isOp(':')) { params.push({ name: this.p.v, def: null }); this.i++; if (this.isOp(',')) this.i++; } this.i++; return { k: 'lambda', params, body: this.expr() }; }
      const e = this.orExpr();
      if (this.isName('if')) { this.i++; const cond = this.orExpr(); this.eat('else'); return { k: 'ternary', cond, a: e, b: this.expr() }; }
      return e;
    }
    orExpr() { let l = this.andExpr(); while (this.isName('or')) { this.i++; l = { k: 'or', l, r: this.andExpr() }; } return l; }
    andExpr() { let l = this.notExpr(); while (this.isName('and')) { this.i++; l = { k: 'and', l, r: this.notExpr() }; } return l; }
    notExpr() { if (this.isName('not')) { this.i++; return { k: 'not', e: this.notExpr() }; } return this.comparison(); }
    comparison() {
      const first = this.bitor();
      const ops = [], rest = [];
      while (true) {
        let op = null;
        if (this.p.t === 'OP' && ['<', '>', '==', '>=', '<=', '!='].includes(this.p.v)) op = this.toks[this.i++].v;
        else if (this.isName('in')) { this.i++; op = 'in'; }
        else if (this.isName('not') && this.toks[this.i + 1].v === 'in') { this.i += 2; op = 'not in'; }
        else if (this.isName('is')) { this.i++; if (this.isName('not')) { this.i++; op = 'is not'; } else op = 'is'; }
        if (!op) break;
        ops.push(op); rest.push(this.bitor());
      }
      return ops.length ? { k: 'cmp', first, ops, rest } : first;
    }
    bitor() { let l = this.arith(); while (this.p.t === 'OP' && ['|', '&', '^', '<<', '>>'].includes(this.p.v)) { const op = this.toks[this.i++].v; l = { k: 'bin', op, l, r: this.arith() }; } return l; }
    arith() { let l = this.term(); while (this.isOp('+') || this.isOp('-')) { const op = this.toks[this.i++].v; l = { k: 'bin', op, l, r: this.term() }; } return l; }
    term() { let l = this.factor(); while (this.p.t === 'OP' && ['*', '/', '//', '%', '@'].includes(this.p.v)) { const op = this.toks[this.i++].v; l = { k: 'bin', op, l, r: this.factor() }; } return l; }
    factor() { if (this.isOp('-') || this.isOp('+') || this.isOp('~')) { const op = this.toks[this.i++].v; return { k: 'unary', op, e: this.factor() }; } return this.power(); }
    power() { const b = this.postfix(); if (this.isOp('**')) { this.i++; return { k: 'bin', op: '**', l: b, r: this.factor() }; } return b; }
    postfix() {
      let e = this.atom();
      while (true) {
        if (this.isOp('(')) { this.i++; const args = [], kw = []; while (!this.isOp(')')) { if (this.p.t === 'NAME' && this.toks[this.i + 1].v === '=' && this.toks[this.i + 1].t === 'OP') { const n = this.p.v; this.i += 2; kw.push([n, this.expr()]); } else if (this.isOp('*')) { this.i++; args.push({ k: 'star', e: this.expr() }); } else { const a = this.expr(); if (this.isName('for')) { args.push(this.comprehension(a, 'gen')); } else args.push(a); } if (this.isOp(',')) this.i++; else break; } this.eat(')'); e = { k: 'call', f: e, args, kw, line: this.p.line }; continue; }
        if (this.isOp('[')) {
          this.i++;
          const part = () => (this.isOp(':') || this.isOp(']') ? null : this.expr());
          let a = part();
          if (this.isOp(':')) { this.i++; const b = part(); let c = null; if (this.isOp(':')) { this.i++; c = part(); } this.eat(']'); e = { k: 'slice', obj: e, a, b, c }; continue; }
          if (this.isOp(',')) { const items = [a]; while (this.isOp(',')) { this.i++; items.push(this.expr()); } a = { k: 'tuple', items }; }
          this.eat(']'); e = { k: 'index', obj: e, idx: a }; continue;
        }
        if (this.isOp('.')) { this.i++; e = { k: 'attr', obj: e, name: this.p.v }; this.i++; continue; }
        return e;
      }
    }
    comprehension(el, kind, valEl) {
      const fors = [];
      while (this.isName('for')) { this.i++; const target = this.targetList(); this.eat('in'); const it = this.orExpr(); const conds = []; while (this.isName('if')) { this.i++; conds.push(this.orExpr()); } fors.push({ target, it, conds }); }
      return { k: 'comp', kind, el, valEl, fors };
    }
    atom() {
      const t = this.p;
      if (t.t === 'NUM') { this.i++; return { k: 'lit', v: t.v }; }
      if (t.t === 'STR' || t.t === 'FSTR') {
        const parts = [];
        while (this.p.t === 'STR' || this.p.t === 'FSTR') { const s = this.toks[this.i++]; parts.push(s.t === 'FSTR' ? this.fstring(s.v, s.line) : { k: 'lit', v: s.v }); }
        return parts.length === 1 ? parts[0] : { k: 'concat', parts };
      }
      if (t.t === 'NAME') {
        this.i++;
        if (t.v === 'True') return { k: 'lit', v: true }; if (t.v === 'False') return { k: 'lit', v: false }; if (t.v === 'None') return { k: 'lit', v: null };
        if (['if', 'else', 'elif', 'while', 'for', 'def', 'return', 'in', 'and', 'or', 'import', 'class'].includes(t.v)) throw new PyErr('SyntaxError', 'invalid syntax', t.line);
        return { k: 'name', v: t.v, line: t.line };
      }
      if (this.isOp('(')) {
        this.i++;
        if (this.isOp(')')) { this.i++; return { k: 'tuple', items: [] }; }
        const e = this.expr();
        if (this.isName('for')) { const c = this.comprehension(e, 'gen'); this.eat(')'); return c; }
        if (this.isOp(',')) { const items = [e]; while (this.isOp(',')) { this.i++; if (this.isOp(')')) break; items.push(this.expr()); } this.eat(')'); return { k: 'tuple', items }; }
        this.eat(')');
        return e;
      }
      if (this.isOp('[')) {
        this.i++;
        const items = [];
        if (!this.isOp(']')) { const first = this.expr(); if (this.isName('for')) { const c = this.comprehension(first, 'list'); this.eat(']'); return c; } items.push(first); while (this.isOp(',')) { this.i++; if (this.isOp(']')) break; items.push(this.expr()); } }
        this.eat(']');
        return { k: 'list', items };
      }
      if (this.isOp('{')) {
        this.i++;
        if (this.isOp('}')) { this.i++; return { k: 'dict', pairs: [] }; }
        const first = this.expr();
        if (this.isOp(':')) {
          this.i++; const v = this.expr();
          if (this.isName('for')) { const c = this.comprehension(first, 'dict', v); this.eat('}'); return c; }
          const pairs = [[first, v]];
          while (this.isOp(',')) { this.i++; if (this.isOp('}')) break; const k = this.expr(); this.eat(':'); pairs.push([k, this.expr()]); }
          this.eat('}'); return { k: 'dict', pairs };
        }
        if (this.isName('for')) { const c = this.comprehension(first, 'set'); this.eat('}'); return c; }
        const items = [first]; while (this.isOp(',')) { this.i++; if (this.isOp('}')) break; items.push(this.expr()); }
        this.eat('}'); return { k: 'set', items };
      }
      if (t.t === 'NL' || t.t === 'EOF') throw new PyErr('SyntaxError', 'invalid syntax', t.line);
      throw new PyErr('SyntaxError', 'invalid syntax', t.line);
    }
    fstring(s, line) {
      const parts = [];
      let i = 0, buf = '';
      while (i < s.length) {
        if (s[i] === '{' && s[i + 1] === '{') { buf += '{'; i += 2; continue; }
        if (s[i] === '}' && s[i + 1] === '}') { buf += '}'; i += 2; continue; }
        if (s[i] === '{') {
          if (buf) { parts.push({ k: 'lit', v: buf }); buf = ''; }
          let depth = 1, j = i + 1;
          while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; if (depth) j++; }
          let inner = s.slice(i + 1, j);
          let spec = null, conv = null;
          const cm = /^(.*?)(?:!([rsa]))?(?::([^:]*))?$/s.exec(inner);
          if (cm && !/[[(]/.test(cm[3] || '')) { inner = cm[1]; conv = cm[2] || null; spec = cm[3] || null; }
          let selfDoc = false;
          if (inner.endsWith('=')) { selfDoc = true; inner = inner.slice(0, -1); }
          const ep = new Parser(tokenize(inner.trim()));
          const e = ep.exprList();
          if (selfDoc) parts.push({ k: 'lit', v: inner + '=' });
          parts.push({ k: 'fmt', e, spec, conv: selfDoc && !conv ? 'r' : conv });
          i = j + 1;
          continue;
        }
        buf += s[i++];
      }
      if (buf) parts.push({ k: 'lit', v: buf });
      void line;
      return { k: 'concat', parts };
    }
  }

  function formatSpec(v, spec) {
    if (!spec) return str(v);
    const m = /^(?:(.)?([<>^=]))?([+\- ])?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
    if (!m) return str(v);
    const [, fill = ' ', align, sign, , zero, width, group, prec, type] = m;
    let s;
    const n = num(v);
    switch (type) {
      case 'f': case 'F': s = n.toFixed(prec !== undefined ? +prec : 6); break;
      case 'e': s = n.toExponential(prec !== undefined ? +prec : 6).replace(/e([+-])(\d)$/, 'e$10$2'); break;
      case '%': s = (n * 100).toFixed(prec !== undefined ? +prec : 6) + '%'; break;
      case 'd': s = String(Math.trunc(n)); break;
      case 'x': s = Math.trunc(n).toString(16); break; case 'X': s = Math.trunc(n).toString(16).toUpperCase(); break;
      case 'b': s = Math.trunc(n).toString(2); break; case 'o': s = Math.trunc(n).toString(8); break;
      case 'g': s = String(Number(n.toPrecision(prec !== undefined ? +prec || 1 : 6))); break;
      default: s = isNum(v) && prec !== undefined ? n.toFixed(+prec) : str(v); if (typeof v === 'string' && prec !== undefined) s = v.slice(0, +prec);
    }
    if (group) { const [ip, fp] = s.split('.'); s = ip.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (fp !== undefined ? '.' + fp : ''); }
    if (sign === '+' && n >= 0 && isNum(v)) s = '+' + s;
    if (width) {
      const w = +width;
      const f = zero && !align ? '0' : fill;
      const al = align || (isNum(v) ? '>' : '<');
      if (s.length < w) {
        const padN = w - s.length;
        if (al === '<') s = s + f.repeat(padN);
        else if (al === '^') s = f.repeat(Math.floor(padN / 2)) + s + f.repeat(Math.ceil(padN / 2));
        else if (zero && s[0] === '-') s = '-' + f.repeat(padN) + s.slice(1);
        else s = f.repeat(padN) + s;
      }
    }
    return s;
  }

  // ---------------- interpreter
  class PyInterp {
    constructor(ctx) {
      this.ctx = ctx;
      this.globals = new Map();
      this.globals.set('__name__', '__main__');
      this.builtins = this.makeBuiltins();
      this.steps = 0;
    }
    write(s) { this.ctx.out(s); }
    makeBuiltins() {
      const I = this;
      const B = {
        print: async (args, kw) => { const sep = kw.sep !== undefined ? str(kw.sep) : ' ', end = kw.end !== undefined ? str(kw.end) : '\n'; I.write(args.map(str).join(sep) + end); return null; },
        input: async (args) => { const l = await I.ctx.readLine(args.length ? str(args[0]) : ''); return l; },
        len: (a) => { const x = a[0]; if (typeof x === 'string' || Array.isArray(x)) return x.length; if (x instanceof PyTuple) return x.items.length; if (x instanceof Map || x instanceof Set) return x.size; if (x && x.__range) return x.__range().length; throw new PyErr('TypeError', `object of type '${typeName(x)}' has no len()`); },
        range: (a) => { const [s, e, st] = a.length === 1 ? [0, num(a[0]), 1] : [num(a[0]), num(a[1]), a.length > 2 ? num(a[2]) : 1]; if (st === 0) throw new PyErr('ValueError', 'range() arg 3 must not be zero'); return { __range: () => { const out = []; for (let i = s; st > 0 ? i < e : i > e; i += st) { out.push(i); if (out.length > 5e6) throw new PyErr('MemoryError', ''); } return out; }, toString() { return `range(${s}, ${e}${st !== 1 ? ', ' + st : ''})`; } }; },
        str: (a) => (a.length ? str(a[0]) : ''),
        repr: (a) => repr(a[0]),
        int: (a) => { const x = a[0]; if (x === undefined) return 0; if (typeof x === 'string') { const base = a[1] !== undefined ? num(a[1]) : 10; const t = x.trim(); if (!(base === 10 ? /^[-+]?\d+$/ : /^[-+]?[0-9a-z]+$/i).test(t)) throw new PyErr('ValueError', `invalid literal for int() with base ${base}: ${repr(x)}`); return parseInt(t, base); } return Math.trunc(num(x)); },
        float: (a) => { const x = a[0]; if (x === undefined) return new PyFloat(0); if (typeof x === 'string') { const t = x.trim().toLowerCase(); if (t === 'inf' || t === 'infinity') return new PyFloat(Infinity); if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(t)) throw new PyErr('ValueError', `could not convert string to float: ${repr(x)}`); return new PyFloat(parseFloat(t)); } return new PyFloat(num(x)); },
        bool: (a) => truthy(a[0]),
        list: (a) => (a.length ? iter(a[0]) : []),
        tuple: (a) => new PyTuple(a.length ? iter(a[0]) : []),
        set: (a) => new Set(a.length ? iter(a[0]) : []),
        dict: (a, kw) => { const m = new Map(); if (a[0] instanceof Map) a[0].forEach((v, k) => m.set(k, v)); else if (a[0]) iter(a[0]).forEach((p) => { const it = iter(p); m.set(it[0], it[1]); }); Object.keys(kw).forEach((k) => m.set(k, kw[k])); return m; },
        type: (a) => ({ __pyType: typeName(a[0]), toString() { return `<class '${typeName(a[0])}'>`; } }),
        abs: (a) => (isF(a[0]) ? new PyFloat(Math.abs(a[0].v)) : Math.abs(num(a[0]))),
        round: (a) => { const x = num(a[0]); if (a[1] === undefined || a[1] === null) { const f = Math.floor(x); const d = x - f; return d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); } const p = num(a[1]); return new PyFloat(Number(x.toFixed(p))); },
        min: (a, kw) => { const xs = a.length === 1 ? iter(a[0]) : a; if (!xs.length) throw new PyErr('ValueError', 'min() arg is an empty sequence'); return xs.reduce((m, x) => (cmp(x, m) < 0 ? x : m)); },
        max: (a, kw) => { const xs = a.length === 1 ? iter(a[0]) : a; if (!xs.length) throw new PyErr('ValueError', 'max() arg is an empty sequence'); return xs.reduce((m, x) => (cmp(x, m) > 0 ? x : m)); },
        sum: (a) => { const xs = iter(a[0]); let f = false; let s = a[1] !== undefined ? num(a[1]) : 0; xs.forEach((x) => { if (!isNum(x)) throw new PyErr('TypeError', `unsupported operand type(s) for +: 'int' and '${typeName(x)}'`); if (isF(x)) f = true; s += num(x); }); return mkNum(s, f); },
        sorted: async (a, kw) => { const xs = iter(a[0]); return I.sortList(xs, kw); },
        reversed: (a) => iter(a[0]).reverse(),
        enumerate: (a) => iter(a[0]).map((x, i) => new PyTuple([i + (a[1] !== undefined ? num(a[1]) : 0), x])),
        zip: (a) => { const ls = a.map(iter); const n = Math.min(...ls.map((l) => l.length)); return Array.from({ length: n }, (_, i) => new PyTuple(ls.map((l) => l[i]))); },
        ord: (a) => str(a[0]).charCodeAt(0),
        chr: (a) => String.fromCharCode(num(a[0])),
        isinstance: (a) => { const t = a[1] && a[1].__pyTypeName; return t ? typeName(a[0]) === t : false; },
        hex: (a) => '0x' + num(a[0]).toString(16), bin: (a) => '0b' + num(a[0]).toString(2), oct: (a) => '0o' + num(a[0]).toString(8),
        divmod: (a) => new PyTuple([Math.floor(num(a[0]) / num(a[1])), ((num(a[0]) % num(a[1])) + num(a[1])) % num(a[1])]),
        pow: (a) => mkNum(Math.pow(num(a[0]), num(a[1])), isF(a[0]) || isF(a[1]) || num(a[1]) < 0),
        any: (a) => iter(a[0]).some(truthy), all: (a) => iter(a[0]).every(truthy),
        map: async (a) => { const out = []; for (const x of iter(a[1])) out.push(await I.callFn(a[0], [x], {})); return out; },
        filter: async (a) => { const out = []; for (const x of iter(a[1])) if (a[0] === null ? truthy(x) : truthy(await I.callFn(a[0], [x], {}))) out.push(x); return out; },
        exit: () => { throw new PyErr('SystemExit', ''); }, quit: () => { throw new PyErr('SystemExit', ''); },
        help: () => { I.write('Welcome to Python 3.12\'s help utility! (TerminalEX mini-Python supports: print, input, variables, if/elif/else, while, for, def, lists, dicts, f-strings, and more.)\n'); return null; },
        id: (a) => parseInt(TX.sha1(str(a[0])).slice(0, 8), 16),
        open: (a) => {
          const segs = I.ctx.resolve(str(a[0]));
          const mode = a[1] ? str(a[1]) : 'r';
          const vfs = I.ctx.vfs;
          let buf = mode.startsWith('a') && vfs.get(segs) ? vfs.content(vfs.get(segs)) : '';
          if (mode.startsWith('r')) { const n = vfs.get(segs); if (!n) throw new PyErr('FileNotFoundError', `[Errno 2] No such file or directory: ${repr(str(a[0]))}`); buf = vfs.content(n); }
          const f = { __file: true, read: () => buf, readlines: () => buf.split(/(?<=\n)/), write: (s) => { buf += str(s[0]); return str(s[0]).length; }, close: () => { if (/[wa]/.test(mode)) vfs.writeFile(segs, buf, { owner: I.ctx.user, user: I.ctx.user }); return null; }, __iter: () => buf.split(/(?<=\n)/) };
          return f;
        },
      };
      Object.keys(B).forEach((k) => { B[k].pyName = k; });
      ['int', 'str', 'float', 'list', 'dict', 'bool', 'tuple', 'set'].forEach((t) => { B[t].__pyTypeName = t; });
      return B;
    }
    async sortList(xs, kw) {
      let keys = xs;
      if (kw.key) { keys = []; for (const x of xs) keys.push(await this.callFn(kw.key, [x], {})); }
      const idx = xs.map((_, i) => i);
      idx.sort((a, b) => cmp(keys[a], keys[b]) || a - b);
      const out = idx.map((i) => xs[i]);
      if (kw.reverse && truthy(kw.reverse)) out.reverse();
      return out;
    }
    module(name) {
      const I = this;
      if (name === 'math') return { __module: 'math', pi: new PyFloat(Math.PI), e: new PyFloat(Math.E), tau: new PyFloat(Math.PI * 2), inf: new PyFloat(Infinity), sqrt: (a) => new PyFloat(Math.sqrt(num(a[0]))), floor: (a) => Math.floor(num(a[0])), ceil: (a) => Math.ceil(num(a[0])), pow: (a) => new PyFloat(Math.pow(num(a[0]), num(a[1]))), sin: (a) => new PyFloat(Math.sin(num(a[0]))), cos: (a) => new PyFloat(Math.cos(num(a[0]))), tan: (a) => new PyFloat(Math.tan(num(a[0]))), log: (a) => new PyFloat(a[1] !== undefined ? Math.log(num(a[0])) / Math.log(num(a[1])) : Math.log(num(a[0]))), log10: (a) => new PyFloat(Math.log10(num(a[0]))), log2: (a) => new PyFloat(Math.log2(num(a[0]))), factorial: (a) => { let r = 1; for (let i = 2; i <= num(a[0]); i++) r *= i; return r; }, gcd: (a) => { let x = Math.abs(num(a[0])), y = Math.abs(num(a[1])); while (y) [x, y] = [y, x % y]; return x; }, fabs: (a) => new PyFloat(Math.abs(num(a[0]))), isclose: (a) => Math.abs(num(a[0]) - num(a[1])) < 1e-9, radians: (a) => new PyFloat(num(a[0]) * Math.PI / 180), degrees: (a) => new PyFloat(num(a[0]) * 180 / Math.PI), hypot: (a) => new PyFloat(Math.hypot(...a.map(num))) };
      if (name === 'random') return { __module: 'random', random: () => new PyFloat(Math.random()), randint: (a) => num(a[0]) + Math.floor(Math.random() * (num(a[1]) - num(a[0]) + 1)), choice: (a) => { const l = iter(a[0]); if (!l.length) throw new PyErr('IndexError', 'Cannot choose from an empty sequence'); return l[Math.floor(Math.random() * l.length)]; }, shuffle: (a) => { const l = a[0]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return null; }, uniform: (a) => new PyFloat(num(a[0]) + Math.random() * (num(a[1]) - num(a[0]))), randrange: (a) => { const [s, e] = a.length === 1 ? [0, num(a[0])] : [num(a[0]), num(a[1])]; return s + Math.floor(Math.random() * (e - s)); }, sample: (a) => { const l = iter(a[0]).slice(); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l.slice(0, num(a[1])); }, seed: () => null };
      if (name === 'time') return { __module: 'time', time: () => new PyFloat(Date.now() / 1000), sleep: async (a) => { await TX.sleep(num(a[0]) * 1000, I.ctx.signal); return null; }, ctime: () => new Date().toString().slice(0, 24), perf_counter: () => new PyFloat(performance.now() / 1000) };
      if (name === 'os') return { __module: 'os', getcwd: () => I.ctx.fmt(I.ctx.cwd), listdir: (a) => { const segs = a.length ? I.ctx.resolve(str(a[0])) : I.ctx.cwd; const n = I.ctx.vfs.get(segs); if (!n || n.t !== 'd') throw new PyErr('FileNotFoundError', `[Errno 2] No such file or directory: ${repr(a.length ? str(a[0]) : '.')}`); return Object.keys(n.ch).sort(); }, name: I.ctx.m.kind === 'windows' ? 'nt' : 'posix', sep: I.ctx.m.kind === 'windows' ? '\\' : '/', getenv: (a) => null, path: { __module: 'os.path', exists: (a) => !!I.ctx.vfs.get(I.ctx.resolve(str(a[0]))), join: (a) => a.map(str).join('/') } };
      if (name === 'sys') return { __module: 'sys', version: '3.12.3 (main, Sep 11 2024, 14:17:37) [GCC 13.2.0]', platform: I.ctx.m.kind === 'windows' ? 'win32' : I.ctx.m.kind === 'mac' ? 'darwin' : 'linux', argv: I.argv || [''], exit: () => { throw new PyErr('SystemExit', ''); }, maxsize: 9223372036854775807 };
      if (name === 'datetime') { const dt = { now: () => ({ __str: TX.isoDate(Date.now()) + '.' + String(new Date().getMilliseconds()).padStart(3, '0') + '000', year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate(), hour: new Date().getHours(), minute: new Date().getMinutes(), strftime: (a) => str(a[0]).replace(/%([YmdHMSAaBbp])/g, (_, k) => { const d = new Date(); return { Y: d.getFullYear(), m: TX.p2(d.getMonth() + 1), d: TX.p2(d.getDate()), H: TX.p2(d.getHours()), M: TX.p2(d.getMinutes()), S: TX.p2(d.getSeconds()), A: TX.DAYS[d.getDay()], a: TX.DAY[d.getDay()], B: TX.MONTHS[d.getMonth()], b: TX.MON[d.getMonth()], p: d.getHours() >= 12 ? 'PM' : 'AM' }[k]; }), toString() { return this.__str; } }) }; dt.today = dt.now; return { __module: 'datetime', datetime: dt, date: { today: () => ({ toString() { return TX.isoDate(Date.now()).slice(0, 10); } }) } }; }
      if (name === 'turtle' || name === 'tkinter' || name === 'pygame') throw new PyErr('ModuleNotFoundError', `No module named '${name}' (graphics modules need a real desktop — TerminalEX is text-only)`);
      throw new PyErr('ModuleNotFoundError', `No module named '${name}'`);
    }
    lookup(name, env, line) {
      for (let e = env; e; e = e.parent) if (e.vars.has(name)) return e.vars.get(name);
      if (this.globals.has(name)) return this.globals.get(name);
      if (name in this.builtins) return this.builtins[name];
      const sugg = TX.suggest(name, [...this.globals.keys()].concat(Object.keys(this.builtins)), 1);
      throw new PyErr('NameError', `name '${name}' is not defined${sugg ? `. Did you mean: '${sugg}'?` : ''}`, line);
    }
    assignName(name, v, env) { if (env && !(env.globalNames && env.globalNames.has(name))) env.vars.set(name, v); else this.globals.set(name, v); }
    async assign(target, v, env) {
      if (target.k === 'name') { this.assignName(target.v, v, env); return; }
      if (target.k === 'tuple' || target.k === 'list') {
        const vals = iter(v);
        if (vals.length !== target.items.length) throw new PyErr('ValueError', vals.length > target.items.length ? `too many values to unpack (expected ${target.items.length})` : `not enough values to unpack (expected ${target.items.length}, got ${vals.length})`);
        for (let i = 0; i < vals.length; i++) await this.assign(target.items[i], vals[i], env);
        return;
      }
      if (target.k === 'index') {
        const obj = await this.eval(target.obj, env), idx = await this.eval(target.idx, env);
        if (Array.isArray(obj)) { let i = num(idx); if (i < 0) i += obj.length; if (i < 0 || i >= obj.length) throw new PyErr('IndexError', 'list assignment index out of range'); obj[i] = v; return; }
        if (obj instanceof Map) { obj.set(this.key(idx), v); return; }
        throw new PyErr('TypeError', `'${typeName(obj)}' object does not support item assignment`);
      }
      if (target.k === 'attr') { const obj = await this.eval(target.obj, env); obj[target.name] = v; return; }
      throw new PyErr('SyntaxError', 'cannot assign to expression');
    }
    key(k) { if (isF(k) && Number.isInteger(k.v)) return k.v; if (k instanceof PyTuple) return str(k); return k; }
    async run(src, file = '<stdin>') {
      this.file = file;
      const ast = new Parser(tokenize(src)).program();
      return this.execBlock(ast, null);
    }
    async execBlock(stmts, env) {
      let last;
      for (const s of stmts) last = await this.exec(s, env);
      return last;
    }
    async tick() { if (++this.steps % 500 === 0) { await new Promise((r) => setTimeout(r, 0)); if (this.ctx.signal.aborted) throw new PyErr('KeyboardInterrupt', ''); } }
    async exec(s, env) {
      this.line = s.line || this.line;
      switch (s.k) {
        case 'expr': { const v = await this.eval(s.e, env); if (this.interactive && !env && v !== null && v !== undefined && s.e.k !== 'call' || (this.interactive && !env && s.e.k === 'call' && v !== null && v !== undefined)) this.write(repr(v) + '\n'); return; }
        case 'assign': { const v = await this.eval(s.v, env); for (const t of s.targets) await this.assign(t, v, env); return; }
        case 'aug': { const cur = await this.eval(s.target, env); const v = await this.eval(s.v, env); const r = this.binop(s.op, cur, v); if (Array.isArray(cur) && s.op === '+') { cur.push(...iter(v)); return; } await this.assign(s.target, r, env); return; }
        case 'pass': return;
        case 'if': { for (const c of s.clauses) if (truthy(await this.eval(c.cond, env))) return this.execBlock(c.body, env); if (s.els) return this.execBlock(s.els, env); return; }
        case 'while': {
          while (truthy(await this.eval(s.cond, env))) {
            await this.tick();
            try { await this.execBlock(s.body, env); } catch (e) { if (e === BREAK) return; if (e === CONT) continue; throw e; }
          }
          if (s.els) await this.execBlock(s.els, env);
          return;
        }
        case 'for': {
          const it = await this.eval(s.it, env);
          const items = it && it.__file ? it.__iter() : iter(it);
          for (const x of items) {
            await this.tick();
            await this.assign(s.target, x, env);
            try { await this.execBlock(s.body, env); } catch (e) { if (e === BREAK) return; if (e === CONT) continue; throw e; }
          }
          if (s.els) await this.execBlock(s.els, env);
          return;
        }
        case 'break': throw BREAK;
        case 'continue': throw CONT;
        case 'def': this.assignName(s.name, new PyFunc(s.name, s.params, s.body, env, this), env); return;
        case 'class': { const cls = { __class: s.name }; this.assignName(s.name, cls, env); return; }
        case 'return': throw new Ret(s.v ? await this.eval(s.v, env) : null);
        case 'global': if (env) { env.globalNames = env.globalNames || new Set(); s.names.forEach((n) => env.globalNames.add(n)); } return;
        case 'import': for (const [n, as] of s.names) this.assignName(as.split('.')[0], this.module(n.split('.')[0]), env); return;
        case 'from': { const mod = this.module(s.mod); for (const [n, as] of s.names) { if (n === '*') Object.keys(mod).filter((k) => !k.startsWith('__')).forEach((k) => this.assignName(k, mod[k], env)); else { if (!(n in mod)) throw new PyErr('ImportError', `cannot import name '${n}' from '${s.mod}'`); this.assignName(as, mod[n], env); } } return; }
        case 'raise': { const v = s.v ? await this.eval(s.v, env) : null; if (v && v.__exc) throw new PyErr(v.__exc, v.msg); throw new PyErr('RuntimeError', 'No active exception to reraise'); }
        case 'del': { const t = s.target; if (t.k === 'index') { const obj = await this.eval(t.obj, env), idx = await this.eval(t.idx, env); if (Array.isArray(obj)) obj.splice(num(idx) < 0 ? obj.length + num(idx) : num(idx), 1); else if (obj instanceof Map) { if (!obj.has(this.key(idx))) throw new PyErr('KeyError', repr(idx)); obj.delete(this.key(idx)); } } else if (t.k === 'name') { if (env) env.vars.delete(t.v); else this.globals.delete(t.v); } return; }
        case 'assert': if (!truthy(await this.eval(s.cond, env))) throw new PyErr('AssertionError', s.msg ? str(await this.eval(s.msg, env)) : ''); return;
        case 'try': {
          try { await this.execBlock(s.body, env); if (s.els) await this.execBlock(s.els, env); }
          catch (e) {
            if (!(e instanceof PyErr) || e.pyType === 'SystemExit' || e.pyType === 'KeyboardInterrupt') throw e;
            let handled = false;
            for (const h of s.handlers) {
              let match = !h.type;
              if (h.type) { const names = h.type.k === 'tuple' ? h.type.items.map((x) => x.v) : [h.type.v]; match = names.some((n) => n === e.pyType || n === 'Exception' || (n === 'ArithmeticError' && e.pyType === 'ZeroDivisionError') || (n === 'LookupError' && /Index|Key/.test(e.pyType)) || (n === 'OSError' && e.pyType === 'FileNotFoundError')); }
              if (match) { if (h.as) this.assignName(h.as, { __exc: e.pyType, msg: e.message, toString() { return e.message; } }, env); await this.execBlock(h.body, env); handled = true; break; }
            }
            if (!handled) throw e;
          } finally { if (s.fin) await this.execBlock(s.fin, env); }
          return;
        }
      }
      throw new PyErr('SyntaxError', 'unsupported statement');
    }
    binop(op, a, b) {
      if (op === '+') {
        if (typeof a === 'string' && typeof b === 'string') return a + b;
        if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
        if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple(a.items.concat(b.items));
        if (isNum(a) && isNum(b)) return mkNum(num(a) + num(b), isF(a) || isF(b));
        throw new PyErr('TypeError', typeof a === 'string' ? `can only concatenate str (not "${typeName(b)}") to str` : `unsupported operand type(s) for +: '${typeName(a)}' and '${typeName(b)}'`);
      }
      if (op === '*') {
        if (typeof a === 'string' && typeof b === 'number') return a.repeat(Math.max(0, b));
        if (typeof b === 'string' && typeof a === 'number') return b.repeat(Math.max(0, a));
        if (Array.isArray(a) && typeof b === 'number') { let r = []; for (let i = 0; i < b; i++) r = r.concat(a); return r; }
        if (isNum(a) && isNum(b)) return mkNum(num(a) * num(b), isF(a) || isF(b));
        throw new PyErr('TypeError', `can't multiply sequence by non-int of type '${typeName(b)}'`);
      }
      if (op === '%' && typeof a === 'string') { const vals = b instanceof PyTuple ? b.items : [b]; let k = 0; return a.replace(/%([-0-9.]*)([sdfr%])/g, (_, f, t) => (t === '%' ? '%' : t === 'd' ? String(Math.trunc(num(vals[k++]))) : t === 'f' ? num(vals[k++]).toFixed(f.includes('.') ? +f.split('.')[1] : 6) : t === 'r' ? repr(vals[k++]) : str(vals[k++]))); }
      if (!isNum(a) || !isNum(b)) throw new PyErr('TypeError', `unsupported operand type(s) for ${op}: '${typeName(a)}' and '${typeName(b)}'`);
      const x = num(a), y = num(b), f = isF(a) || isF(b);
      switch (op) {
        case '-': return mkNum(x - y, f);
        case '/': if (y === 0) throw new PyErr('ZeroDivisionError', 'division by zero'); return new PyFloat(x / y);
        case '//': if (y === 0) throw new PyErr('ZeroDivisionError', 'integer division or modulo by zero'); return mkNum(Math.floor(x / y), f);
        case '%': if (y === 0) throw new PyErr('ZeroDivisionError', 'integer modulo by zero'); return mkNum(((x % y) + y) % y, f);
        case '**': return mkNum(Math.pow(x, y), f || y < 0);
        case '&': return x & y; case '|': return x | y; case '^': return x ^ y; case '<<': return x << y; case '>>': return x >> y;
      }
      throw new PyErr('TypeError', 'bad operand');
    }
    async eval(e, env) {
      switch (e.k) {
        case 'lit': return e.v;
        case 'name': return this.lookup(e.v, env, e.line);
        case 'concat': { let s = ''; for (const p of e.parts) s += p.k === 'fmt' ? await this.fmt(p, env) : str(await this.eval(p, env)); return s; }
        case 'list': { const out = []; for (const x of e.items) out.push(await this.eval(x, env)); return out; }
        case 'tuple': { const out = []; for (const x of e.items) out.push(await this.eval(x, env)); return new PyTuple(out); }
        case 'set': { const out = new Set(); for (const x of e.items) out.add(await this.eval(x, env)); return out; }
        case 'dict': { const m = new Map(); for (const [k, v] of e.pairs) m.set(this.key(await this.eval(k, env)), await this.eval(v, env)); return m; }
        case 'comp': {
          const out = e.kind === 'dict' ? new Map() : e.kind === 'set' ? new Set() : [];
          const cenv = { vars: new Map(), parent: env };
          const rec = async (i) => {
            if (i === e.fors.length) { const v = await this.eval(e.el, cenv); if (e.kind === 'dict') out.set(this.key(v), await this.eval(e.valEl, cenv)); else if (e.kind === 'set') out.add(v); else out.push(v); return; }
            const f = e.fors[i];
            for (const x of iter(await this.eval(f.it, cenv))) { await this.tick(); await this.assign(f.target, x, cenv); let ok = true; for (const c of f.conds) if (!truthy(await this.eval(c, cenv))) { ok = false; break; } if (ok) await rec(i + 1); }
          };
          await rec(0);
          return out;
        }
        case 'ternary': return truthy(await this.eval(e.cond, env)) ? this.eval(e.a, env) : this.eval(e.b, env);
        case 'or': { const l = await this.eval(e.l, env); return truthy(l) ? l : this.eval(e.r, env); }
        case 'and': { const l = await this.eval(e.l, env); return truthy(l) ? this.eval(e.r, env) : l; }
        case 'not': return !truthy(await this.eval(e.e, env));
        case 'unary': { const v = await this.eval(e.e, env); if (!isNum(v)) throw new PyErr('TypeError', `bad operand type for unary ${e.op}: '${typeName(v)}'`); return e.op === '-' ? mkNum(-num(v), isF(v)) : e.op === '~' ? ~num(v) : v; }
        case 'bin': return this.binop(e.op, await this.eval(e.l, env), await this.eval(e.r, env));
        case 'cmp': {
          let l = await this.eval(e.first, env);
          for (let i = 0; i < e.ops.length; i++) {
            const r = await this.eval(e.rest[i], env);
            const op = e.ops[i];
            let ok;
            switch (op) {
              case '==': ok = eq(l, r); break; case '!=': ok = !eq(l, r); break;
              case '<': ok = cmp(l, r) < 0; break; case '>': ok = cmp(l, r) > 0; break; case '<=': ok = cmp(l, r) <= 0; break; case '>=': ok = cmp(l, r) >= 0; break;
              case 'in': case 'not in': { let has; if (typeof r === 'string') has = r.includes(str(l)); else if (r instanceof Map) has = r.has(this.key(l)); else has = iter(r).some((x) => eq(x, l)); ok = op === 'in' ? has : !has; break; }
              case 'is': ok = l === r || (l === null && r === null); break; case 'is not': ok = !(l === r); break;
            }
            if (!ok) return false;
            l = r;
          }
          return true;
        }
        case 'index': {
          const obj = await this.eval(e.obj, env), idx = await this.eval(e.idx, env);
          if (typeof obj === 'string' || Array.isArray(obj) || obj instanceof PyTuple) {
            const arr = obj instanceof PyTuple ? obj.items : obj;
            if (!isNum(idx)) throw new PyErr('TypeError', `${typeName(obj)} indices must be integers or slices, not ${typeName(idx)}`);
            let i = num(idx); if (i < 0) i += arr.length;
            if (i < 0 || i >= arr.length) throw new PyErr('IndexError', `${typeName(obj)} index out of range`);
            return arr[i];
          }
          if (obj instanceof Map) { const k = this.key(idx); if (!obj.has(k)) throw new PyErr('KeyError', repr(idx)); return obj.get(k); }
          throw new PyErr('TypeError', `'${typeName(obj)}' object is not subscriptable`);
        }
        case 'slice': {
          const obj = await this.eval(e.obj, env);
          const arr = typeof obj === 'string' ? [...obj] : obj instanceof PyTuple ? obj.items : obj;
          const n = arr.length;
          const st = e.c ? num(await this.eval(e.c, env)) : 1;
          const norm = (v, d) => { if (v === null || v === undefined) return d; v = num(v); if (v < 0) v += n; return Math.max(st > 0 ? 0 : -1, Math.min(v, st > 0 ? n : n - 1)); };
          const a = norm(e.a ? await this.eval(e.a, env) : null, st > 0 ? 0 : n - 1), b = norm(e.b ? await this.eval(e.b, env) : null, st > 0 ? n : -1);
          const out = [];
          for (let i = a; st > 0 ? i < b : i > b; i += st) out.push(arr[i]);
          return typeof obj === 'string' ? out.join('') : obj instanceof PyTuple ? new PyTuple(out) : out;
        }
        case 'attr': {
          const obj = await this.eval(e.obj, env);
          if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Map) && e.name in obj) return obj[e.name];
          return this.method(obj, e.name);
        }
        case 'lambda': return new PyFunc('<lambda>', e.params, [{ k: 'return', v: e.body }], env, this);
        case 'call': {
          const f = await this.eval(e.f, env);
          const args = [];
          for (const a of e.args) { if (a.k === 'star') args.push(...iter(await this.eval(a.e, env))); else args.push(await this.eval(a, env)); }
          const kw = {};
          for (const [k, v] of e.kw) kw[k] = await this.eval(v, env);
          return this.callFn(f, args, kw, e.line);
        }
      }
      throw new PyErr('SyntaxError', 'invalid syntax');
    }
    async fmt(p, env) { const v = await this.eval(p.e, env); const s = p.conv === 'r' ? repr(v) : null; return s !== null ? s : formatSpec(v, p.spec); }
    method(obj, name) {
      const I = this;
      const bind = (fn) => { fn.pyName = name; return fn; };
      if (typeof obj === 'string') {
        const m = {
          upper: () => obj.toUpperCase(), lower: () => obj.toLowerCase(), title: () => obj.replace(/\b\w/g, (c) => c.toUpperCase()), capitalize: () => obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase(), swapcase: () => [...obj].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
          strip: (a) => (a[0] ? obj.replace(new RegExp(`^[${esc(a[0])}]+|[${esc(a[0])}]+$`, 'g'), '') : obj.trim()), lstrip: (a) => (a[0] ? obj.replace(new RegExp(`^[${esc(a[0])}]+`), '') : obj.replace(/^\s+/, '')), rstrip: (a) => (a[0] ? obj.replace(new RegExp(`[${esc(a[0])}]+$`), '') : obj.replace(/\s+$/, '')),
          split: (a) => (a[0] === undefined || a[0] === null ? obj.trim().split(/\s+/).filter((x) => x !== '') : obj.split(str(a[0]))), splitlines: () => obj.split(/\r?\n/), join: (a) => iter(a[0]).map((x) => { if (typeof x !== 'string') throw new PyErr('TypeError', `sequence item 0: expected str instance, ${typeName(x)} found`); return x; }).join(obj),
          replace: (a) => obj.split(str(a[0])).join(str(a[1])), find: (a) => obj.indexOf(str(a[0])), index: (a) => { const i = obj.indexOf(str(a[0])); if (i < 0) throw new PyErr('ValueError', 'substring not found'); return i; }, count: (a) => obj.split(str(a[0])).length - 1,
          startswith: (a) => obj.startsWith(str(a[0])), endswith: (a) => obj.endsWith(str(a[0])), isdigit: () => /^\d+$/.test(obj), isalpha: () => /^[a-z]+$/i.test(obj), isalnum: () => /^[a-z0-9]+$/i.test(obj), isupper: () => /[A-Z]/.test(obj) && obj === obj.toUpperCase(), islower: () => /[a-z]/.test(obj) && obj === obj.toLowerCase(), isspace: () => /^\s+$/.test(obj), isnumeric: () => /^\d+$/.test(obj),
          format: (a, kw) => { let k = 0; return obj.replace(/\{([^{}]*)\}/g, (_, spec) => { const [key, fs] = spec.split(':'); const v = key === '' ? a[k++] : /^\d+$/.test(key) ? a[+key] : kw[key]; return formatSpec(v, fs); }); },
          center: (a) => { const w = num(a[0]), f = a[1] ? str(a[1]) : ' '; const pad = Math.max(0, w - obj.length); return f.repeat(Math.floor(pad / 2)) + obj + f.repeat(Math.ceil(pad / 2)); }, ljust: (a) => obj.padEnd(num(a[0]), a[1] ? str(a[1]) : ' '), rjust: (a) => obj.padStart(num(a[0]), a[1] ? str(a[1]) : ' '), zfill: (a) => obj.padStart(num(a[0]), '0'), encode: () => obj,
        };
        if (m[name]) return bind(m[name]);
      }
      if (Array.isArray(obj)) {
        const m = {
          append: (a) => { obj.push(a[0]); return null; }, extend: (a) => { obj.push(...iter(a[0])); return null; }, insert: (a) => { obj.splice(num(a[0]), 0, a[1]); return null; },
          pop: (a) => { if (!obj.length) throw new PyErr('IndexError', 'pop from empty list'); if (a.length) { let i = num(a[0]); if (i < 0) i += obj.length; if (i >= obj.length || i < 0) throw new PyErr('IndexError', 'pop index out of range'); return obj.splice(i, 1)[0]; } return obj.pop(); },
          remove: (a) => { const i = obj.findIndex((x) => eq(x, a[0])); if (i < 0) throw new PyErr('ValueError', 'list.remove(x): x not in list'); obj.splice(i, 1); return null; },
          index: (a) => { const i = obj.findIndex((x) => eq(x, a[0])); if (i < 0) throw new PyErr('ValueError', `${repr(a[0])} is not in list`); return i; }, count: (a) => obj.filter((x) => eq(x, a[0])).length,
          sort: async (a, kw) => { const s = await I.sortList(obj, kw); obj.splice(0, obj.length, ...s); return null; }, reverse: () => { obj.reverse(); return null; }, clear: () => { obj.length = 0; return null; }, copy: () => obj.slice(),
        };
        if (m[name]) return bind(m[name]);
      }
      if (obj instanceof Map) {
        const m = { keys: () => [...obj.keys()], values: () => [...obj.values()], items: () => [...obj.entries()].map(([k, v]) => new PyTuple([k, v])), get: (a) => (obj.has(I.key(a[0])) ? obj.get(I.key(a[0])) : a[1] === undefined ? null : a[1]), pop: (a) => { const k = I.key(a[0]); if (!obj.has(k)) { if (a.length > 1) return a[1]; throw new PyErr('KeyError', repr(a[0])); } const v = obj.get(k); obj.delete(k); return v; }, update: (a) => { a[0].forEach((v, k) => obj.set(k, v)); return null; }, clear: () => { obj.clear(); return null; }, setdefault: (a) => { const k = I.key(a[0]); if (!obj.has(k)) obj.set(k, a[1] === undefined ? null : a[1]); return obj.get(k); }, copy: () => new Map(obj) };
        if (m[name]) return bind(m[name]);
      }
      if (obj instanceof Set) { const m = { add: (a) => { obj.add(a[0]); return null; }, remove: (a) => { obj.delete(a[0]); return null; }, discard: (a) => { obj.delete(a[0]); return null; } }; if (m[name]) return bind(m[name]); }
      if (obj && obj.__file) { const f = obj[name]; if (f) return bind((a) => f(a)); }
      if (obj && typeof obj === 'object' && obj[name] !== undefined) return obj[name];
      throw new PyErr('AttributeError', `'${typeName(obj)}' object has no attribute '${name}'`);
    }
    async callFn(f, args, kw, line) {
      if (typeof f === 'function') return f(args, kw);
      if (f && f.__pyType) return this.builtins[f.__pyType] ? this.builtins[f.__pyType](args, kw) : null;
      if (f && f.__class) { const o = { __cls: f.__class }; return o; }
      if (!(f instanceof PyFunc)) throw new PyErr('TypeError', `'${typeName(f)}' object is not callable`, line);
      const env = { vars: new Map(), parent: f.closure };
      const pos = args.slice();
      for (const p of f.params) {
        if (p.star === '*') { env.vars.set(p.name, new PyTuple(pos.splice(0))); continue; }
        if (p.star === '**') { const m = new Map(); Object.keys(kw).forEach((k) => m.set(k, kw[k])); env.vars.set(p.name, m); continue; }
        if (pos.length) env.vars.set(p.name, pos.shift());
        else if (p.name in kw) env.vars.set(p.name, kw[p.name]);
        else if (p.def) env.vars.set(p.name, await this.eval(p.def, f.closure));
        else throw new PyErr('TypeError', `${f.name}() missing 1 required positional argument: '${p.name}'`, line);
      }
      if (pos.length) throw new PyErr('TypeError', `${f.name}() takes ${f.params.length} positional argument${f.params.length === 1 ? '' : 's'} but ${args.length} were given`, line);
      this.depth = (this.depth || 0) + 1;
      if (this.depth > 400) { this.depth = 0; throw new PyErr('RecursionError', 'maximum recursion depth exceeded'); }
      try { await this.execBlock(f.body, env); return null; }
      catch (e) { if (e instanceof Ret) return e.v; throw e; }
      finally { this.depth--; }
    }
  }
  function esc(s) { return str(s).replace(/[\]\\^-]/g, '\\$&'); }

  function pyTrace(e, file, src) {
    const line = e.line || 1;
    const code = src ? (src.split('\n')[line - 1] || '').trim() : '';
    if (e.pyType === 'SyntaxError' || e.pyType === 'IndentationError') return `  File "${file}", line ${line}\n    ${code}\n    ${'^'.repeat(Math.max(1, Math.min(code.length, 4)))}\n${e.pyType}: ${e.message}\n`;
    return `Traceback (most recent call last):\n  File "${file}", line ${line}, in <module>${code && file !== '<stdin>' ? '\n    ' + code : ''}\n${e.pyType}${e.message ? ': ' + e.message : ''}\n`;
  }

  async function python(ctx, args) {
    const interp = new PyInterp(ctx);
    const files = args.filter((a) => !a.startsWith('-'));
    if (args.includes('--version') || args.includes('-V')) { ctx.out('Python 3.12.3\n'); return 0; }
    if (args[0] === '-c') { try { await interp.run(args.slice(1).join(' '), '<string>'); return 0; } catch (e) { if (e instanceof PyErr) { ctx.err(pyTrace(e, '<string>', args[1])); return 1; } throw e; } }
    if (files.length) {
      let src;
      try { src = ctx.vfs.readFile(ctx.resolve(files[0])); } catch (e) { ctx.err(`python3: can't open file '${ctx.fmt(ctx.resolve(files[0]))}': [Errno 2] No such file or directory\n`); return 2; }
      interp.argv = files;
      try { await interp.run(src, files[0]); return 0; }
      catch (e) {
        if (e instanceof PyErr) { if (e.pyType === 'SystemExit') return 0; if (e.pyType === 'KeyboardInterrupt') { ctx.err('Traceback (most recent call last):\n  File "' + files[0] + '", line ' + (interp.line || 1) + '\nKeyboardInterrupt\n'); return 130; } ctx.err(pyTrace(e, files[0], src)); return 1; }
        if (e.interrupt) { ctx.err('\nKeyboardInterrupt\n'); return 130; }
        throw e;
      }
    }
    if (ctx.stdin != null) { try { await interp.run(ctx.stdin); } catch (e) { if (e instanceof PyErr) ctx.err(pyTrace(e, '<stdin>', ctx.stdin)); } return 0; }
    ctx.out(`Python 3.12.3 (main, Sep 11 2024, 14:17:37) [GCC 13.2.0] on ${ctx.m.kind === 'windows' ? 'win32' : ctx.m.kind === 'mac' ? 'darwin' : 'linux'}\nType "help", "copyright", "credits" or "license" for more information.\n${C.dim('(TerminalEX mini-Python: great for practicing basics. Type exit() or press Ctrl+D to leave.)')}\n`);
    interp.interactive = true;
    let buf = [];
    while (true) {
      let line;
      try { line = await ctx.term.readLine({ prompt: buf.length ? '... ' : '>>> ', onEOF: true, history: ctx.pyHistory || (ctx.pyHistory = []) }); } catch (e) { return 0; }
      if (line === null) { ctx.out('KeyboardInterrupt\n'); buf = []; continue; }
      if (line === '\x04') return 0;
      if (line.trim()) (ctx.pyHistory || []).push(line);
      buf.push(line);
      const src = buf.join('\n');
      const needMore = buf.length === 1 ? /:\s*$/.test(line) || /[([{]\s*$/.test(line) || /\\$/.test(line) : line.trim() !== '';
      if (needMore) continue;
      buf = [];
      try { await interp.run(src + '\n'); }
      catch (e) {
        if (e instanceof PyErr) { if (e.pyType === 'SystemExit') return 0; ctx.err(pyTrace(e, '<stdin>', src)); continue; }
        if (e.interrupt) { ctx.out('\nKeyboardInterrupt\n'); continue; }
        ctx.err('InternalError: ' + e.message + '\n');
      }
    }
  }

  // ================================================================= Node.js
  function nodeInspect(v, depth = 0) {
    if (v === undefined) return C.gray('undefined');
    if (v === null) return C.bold('null');
    if (typeof v === 'string') return depth ? C.green("'" + v + "'") : C.green("'" + v + "'");
    if (typeof v === 'number' || typeof v === 'bigint') return C.yellow(String(v) + (typeof v === 'bigint' ? 'n' : ''));
    if (typeof v === 'boolean') return C.yellow(String(v));
    if (typeof v === 'function') return C.cyan(`[Function: ${v.name || '(anonymous)'}]`);
    if (typeof v === 'symbol') return C.green(v.toString());
    if (Array.isArray(v)) { if (depth > 2) return C.cyan('[Array]'); return '[ ' + v.slice(0, 50).map((x) => nodeInspect(x, depth + 1)).join(', ') + (v.length > 50 ? `, ... ${v.length - 50} more items` : '') + ' ]'; }
    if (v instanceof Date) return C.magenta(v.toISOString());
    if (v instanceof Map) return `Map(${v.size}) { ` + [...v.entries()].map(([k, x]) => nodeInspect(k, depth + 1) + ' => ' + nodeInspect(x, depth + 1)).join(', ') + ' }';
    if (v instanceof Set) return `Set(${v.size}) { ` + [...v].map((x) => nodeInspect(x, depth + 1)).join(', ') + ' }';
    if (v instanceof Error) return v.stack ? v.stack.split('\n').slice(0, 1).join('\n') : String(v);
    if (typeof v === 'object') { if (depth > 2) return C.cyan('[Object]'); const ks = Object.keys(v); if (!ks.length) return '{}'; return '{ ' + ks.slice(0, 30).map((k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : "'" + k + "'") + ': ' + nodeInspect(v[k], depth + 1)).join(', ') + ' }'; }
    return String(v);
  }
  async function node(ctx, args) {
    if (args.includes('--version') || args.includes('-v')) { ctx.out('v18.19.1\n'); return 0; }
    const scope = Object.create(null);
    const out = (...a) => ctx.out(a.map((x) => (typeof x === 'string' ? x : TX.stripAnsi(nodeInspect(x)))).join(' ') + '\n');
    const consoleObj = { log: out, info: out, warn: out, error: out, table: (x) => out(x), clear: () => ctx.term.clear() };
    const sandbox = new Proxy(scope, {
      has: () => true,
      get: (t, k) => { if (k === Symbol.unscopables) return undefined; if (k === 'console') return consoleObj; if (k === 'require') return (m) => { if (m === 'fs') return { readFileSync: (p) => ctx.vfs.readFile(ctx.resolve(String(p))), writeFileSync: (p, d) => ctx.vfs.writeFile(ctx.resolve(String(p)), String(d), { owner: ctx.user }) }; if (m === 'os') return { platform: () => (ctx.m.kind === 'windows' ? 'win32' : ctx.m.kind === 'mac' ? 'darwin' : 'linux'), hostname: () => ctx.m.net.hostname, cpus: () => Array(ctx.m.hw.threads).fill({ model: ctx.m.hw.cpu }) }; throw new Error(`Cannot find module '${m}'`); }; if (k === 'process') return { argv: ['node'].concat(args), platform: ctx.m.kind === 'windows' ? 'win32' : ctx.m.kind === 'mac' ? 'darwin' : 'linux', version: 'v18.19.1', exit: () => { throw new TX.ExitShell(0); } }; if (k in t) return t[k]; if (k in window && ['Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'parseInt', 'parseFloat', 'isNaN', 'Map', 'Set', 'Promise', 'setTimeout', 'Symbol', 'RegExp', 'Error', 'Boolean', 'BigInt', 'Infinity', 'NaN', 'undefined', 'encodeURIComponent', 'decodeURIComponent'].includes(k)) return window[k]; if (typeof k === 'string') throw new ReferenceError(`${k} is not defined`); return undefined; },
      set: (t, k, v) => { t[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    const runner = new Function('sandbox', 'code', 'with (sandbox) { return eval(code); }');
    const prep = (code) => code.replace(/^\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=/gm, '$1 =').replace(/^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm, '$1 = function $1(').replace(/^\s*class\s+([A-Za-z_$][\w$]*)/gm, '$1 = class $1');
    const files = args.filter((a) => !a.startsWith('-'));
    if (files.length) {
      let src;
      try { src = ctx.vfs.readFile(ctx.resolve(files[0])); } catch (e) { ctx.err(`node:internal/modules/cjs/loader:1148\n  throw err;\n  ^\n\nError: Cannot find module '${ctx.fmt(ctx.resolve(files[0]))}'\n    at Module._resolveFilename (node:internal/modules/cjs/loader:1145:15)\n\nNode.js v18.19.1\n`); return 1; }
      try { runner(sandbox, prep(src)); return 0; } catch (e) { if (e.exitShell) return 0; ctx.err(`${ctx.fmt(ctx.resolve(files[0]))}:1\n\n${e.name}: ${e.message}\n\nNode.js v18.19.1\n`); return 1; }
    }
    ctx.out(`Welcome to Node.js v18.19.1.\nType ".help" for more information.\n`);
    while (true) {
      let line;
      try { line = await ctx.term.readLine({ prompt: '> ', onEOF: true, history: ctx.nodeHistory || (ctx.nodeHistory = []), highlight: null }); } catch (e) { return 0; }
      if (line === null) { ctx.out('(To exit, press Ctrl+C again or Ctrl+D or type .exit)\n'); continue; }
      if (line === '\x04' || line.trim() === '.exit') return 0;
      if (line.trim() === '.help') { ctx.out('.break    Sometimes you get stuck, this gets you out\n.clear    Alias for .break\n.editor   Enter editor mode\n.exit     Exit the REPL\n.help     Print this help message\n'); continue; }
      if (!line.trim()) continue;
      ctx.nodeHistory.push(line);
      try { const v = runner(sandbox, prep(line)); ctx.out(nodeInspect(v) + '\n'); }
      catch (e) { if (e.exitShell) return 0; ctx.out(`Uncaught ${e.name}: ${e.message}\n`); }
    }
  }

  TX.langs = { python, node };
  // register as POSIX commands
  const posixCtx = (c) => ({ out: c.out, err: c.err, term: c.term, vfs: c.vfs, m: c.m, user: c.user, tty: c.tty, stdin: c.stdin, signal: c.signal, resolve: (p) => c.sh.resolve(p), fmt: (s) => c.sh.fmt(s), cwd: c.sh.cwd, readLine: c.readLine });
  TX.defPosix('python3 python', (c) => python(posixCtx(c), c.args), { pkg: 'python3' });
  TX.defPosix('node nodejs', (c) => node(posixCtx(c), c.args), { pkg: 'node' });
})();
