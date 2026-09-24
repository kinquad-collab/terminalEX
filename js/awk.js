/* TerminalEX — a small but real AWK interpreter */
(function () {
  'use strict';
  const TX = window.TX;

  function tokenize(src) {
    const toks = [];
    let i = 0;
    const lastSignificant = () => { for (let k = toks.length - 1; k >= 0; k--) if (toks[k].t !== 'nl') return toks[k]; return null; };
    while (i < src.length) {
      const ch = src[i];
      if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
      if (ch === '\\' && src[i + 1] === '\n') { i += 2; continue; }
      if (ch === '\n' || ch === ';') { toks.push({ t: 'nl', v: ch }); i++; continue; }
      if (ch === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (ch === '"') {
        let s = ''; i++;
        while (i < src.length && src[i] !== '"') { if (src[i] === '\\') { const n = src[i + 1]; s += n === 'n' ? '\n' : n === 't' ? '\t' : n === '"' ? '"' : n === '\\' ? '\\' : n === '/' ? '/' : '\\' + n; i += 2; continue; } s += src[i++]; }
        i++; toks.push({ t: 'str', v: s }); continue;
      }
      if (ch === '/') {
        const prev = lastSignificant();
        const divCtx = prev && (prev.t === 'num' || prev.t === 'str' || prev.t === 'name' || prev.t === 'field' || (prev.t === 'op' && (prev.v === ')' || prev.v === ']')));
        if (!divCtx) {
          let s = ''; i++;
          while (i < src.length && src[i] !== '/') { if (src[i] === '\\' && src[i + 1] === '/') { s += '/'; i += 2; continue; } s += src[i++]; }
          i++; toks.push({ t: 're', v: s }); continue;
        }
      }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i)); toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if (/[A-Za-z_]/.test(ch)) { const m = /^[A-Za-z_]\w*/.exec(src.slice(i)); toks.push({ t: 'name', v: m[0] }); i += m[0].length; continue; }
      if (ch === '$') { toks.push({ t: 'op', v: '$' }); i++; continue; }
      const ops = ['&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '^=', '++', '--', '!~', '>>', '**'];
      const two = src.slice(i, i + 2);
      if (ops.includes(two)) { toks.push({ t: 'op', v: two === '**' ? '^' : two }); i += 2; continue; }
      if ('{}()[],+-*/%^!<>=~?:|'.includes(ch)) { toks.push({ t: 'op', v: ch }); i++; continue; }
      throw new Error(`syntax error at source line 1: unexpected character '${ch}'`);
    }
    return toks;
  }

  const BUILTIN_VARS = ['NR', 'NF', 'FS', 'OFS', 'ORS', 'RS', 'FILENAME', 'FNR'];

  function parse(toks) {
    let i = 0;
    const peek = (o = 0) => toks[i + o];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const isName = (v) => peek() && peek().t === 'name' && peek().v === v;
    const expect = (v) => { if (!isOp(v)) throw new Error(`syntax error: expected '${v}' near '${peek() ? peek().v : 'end'}'`); i++; };
    const skipNl = () => { while (peek() && peek().t === 'nl') i++; };
    const rules = [];
    const funcs = {};

    function block() {
      expect('{');
      const body = [];
      skipNl();
      while (!isOp('}')) {
        if (!peek()) throw new Error('syntax error: missing }');
        body.push(statement());
        skipNl();
      }
      expect('}');
      return { k: 'block', body };
    }
    function simpleOrBlock() { skipNl(); if (isOp('{')) return block(); const s = statement(); return s; }
    function statement() {
      const t = peek();
      if (t.t === 'op' && t.v === '{') return block();
      if (t.t === 'name') {
        switch (t.v) {
          case 'print': case 'printf': {
            i++;
            const args = [];
            let paren = false;
            if (isOp('(')) {
              // print(a,b) form
              const save = i;
              try { i++; if (!isOp(')')) { args.push(expr(true)); while (isOp(',')) { i++; args.push(expr(true)); } } expect(')'); paren = true; if (!(peek() === undefined || peek().t === 'nl' || isOp('}') || isOp('>') || isOp('>>') || isOp('|'))) { i = save; args.length = 0; paren = false; } } catch (e) { i = save; args.length = 0; }
            }
            if (!paren && !(peek() === undefined || peek().t === 'nl' || isOp('}'))) { args.push(expr(true)); while (isOp(',')) { i++; args.push(expr(true)); } }
            let redir = null;
            if (isOp('>') || isOp('>>')) { const op = toks[i++].v; redir = { op, target: primary() }; }
            return { k: t.v, args, redir };
          }
          case 'if': {
            i++; expect('('); const cond = expr(); expect(')');
            const then = simpleOrBlock();
            let save = i; skipNl();
            if (isName('else')) { i++; const els = simpleOrBlock(); return { k: 'if', cond, then, els }; }
            i = save;
            return { k: 'if', cond, then };
          }
          case 'while': { i++; expect('('); const cond = expr(); expect(')'); return { k: 'while', cond, body: simpleOrBlock() }; }
          case 'for': {
            i++; expect('(');
            if (peek().t === 'name' && peek(1) && peek(1).t === 'name' && peek(1).v === 'in') { const v = toks[i].v; i += 2; const arr = toks[i++].v; expect(')'); return { k: 'forin', v, arr, body: simpleOrBlock() }; }
            const init = isOp(';') || (peek().t === 'nl') ? null : expr(); if (peek().t === 'nl') i++;
            const cond = peek().t === 'nl' ? null : expr(); if (peek().t === 'nl') i++;
            const step = isOp(')') ? null : expr(); expect(')');
            return { k: 'for', init, cond, step, body: simpleOrBlock() };
          }
          case 'next': i++; return { k: 'next' };
          case 'exit': i++; return { k: 'exit', e: (peek() && peek().t !== 'nl' && !isOp('}')) ? expr() : null };
          case 'break': i++; return { k: 'break' };
          case 'continue': i++; return { k: 'continue' };
          case 'delete': { i++; const target = primary(); return { k: 'delete', target }; }
          case 'return': i++; return { k: 'return', e: (peek() && peek().t !== 'nl' && !isOp('}')) ? expr() : null };
          case 'getline': i++; return { k: 'expr', e: { k: 'num', v: 0 } };
        }
      }
      return { k: 'expr', e: expr() };
    }
    // expression precedence: ternary > || > && > in > ~ > comparison > concat > additive > mult > unary > power > postfix
    function expr(noGt) { return assignment(noGt); }
    function assignment(noGt) {
      const left = ternary(noGt);
      if (peek() && peek().t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '^='].includes(peek().v)) {
        if (!['var', 'field', 'index'].includes(left.k)) throw new Error('syntax error: invalid assignment');
        const op = toks[i++].v;
        return { k: 'assign', op, target: left, e: assignment(noGt) };
      }
      return left;
    }
    function ternary(noGt) { const c = or(noGt); if (isOp('?')) { i++; const a = assignment(noGt); expect(':'); const b = assignment(noGt); return { k: 'tern', c, a, b }; } return c; }
    function or(noGt) { let l = and(noGt); while (isOp('||')) { i++; skipNl(); l = { k: 'or', l, r: and(noGt) }; } return l; }
    function and(noGt) { let l = inOp(noGt); while (isOp('&&')) { i++; skipNl(); l = { k: 'and', l, r: inOp(noGt) }; } return l; }
    function inOp(noGt) { let l = match(noGt); while (isName('in')) { i++; const arr = toks[i++].v; l = { k: 'in', key: l, arr }; } return l; }
    function match(noGt) { let l = comparison(noGt); while (isOp('~') || isOp('!~')) { const neg = toks[i++].v === '!~'; l = { k: 'match', l, r: comparison(noGt), neg }; } return l; }
    function comparison(noGt) {
      const l = concat(noGt);
      const t = peek();
      if (t && t.t === 'op' && ['<', '<=', '==', '!=', '>=', '>'].includes(t.v) && !(noGt && t.v === '>')) { i++; return { k: 'cmp', op: t.v, l, r: concat(noGt) }; }
      return l;
    }
    function startsOperand() {
      const t = peek();
      if (!t) return false;
      if (t.t === 'num' || t.t === 'str' || t.t === 're') return true;
      if (t.t === 'name') return !['in', 'else'].includes(t.v);
      if (t.t === 'op') return ['$', '(', '!', '-', '+', '++', '--'].includes(t.v) && !(t.v === '-' || t.v === '+');
      return false;
    }
    function concat(noGt) {
      let l = additive();
      while (startsOperand()) l = { k: 'concat', l, r: additive() };
      void noGt;
      return l;
    }
    function additive() { let l = mult(); while (isOp('+') || isOp('-')) { const op = toks[i++].v; l = { k: 'bin', op, l, r: mult() }; } return l; }
    function mult() { let l = unary(); while (isOp('*') || isOp('/') || isOp('%')) { const op = toks[i++].v; l = { k: 'bin', op, l, r: unary() }; } return l; }
    function unary() {
      if (isOp('!')) { i++; return { k: 'not', e: unary() }; }
      if (isOp('-')) { i++; return { k: 'neg', e: unary() }; }
      if (isOp('+')) { i++; return { k: 'num1', e: unary() }; }
      return power();
    }
    function power() { const b = postfix(); if (isOp('^')) { i++; return { k: 'bin', op: '^', l: b, r: unary() }; } return b; }
    function postfix() {
      if (isOp('++') || isOp('--')) { const op = toks[i++].v; return { k: 'preinc', op, target: primary() }; }
      const p = primary();
      if ((isOp('++') || isOp('--')) && ['var', 'field', 'index'].includes(p.k)) { const op = toks[i++].v; return { k: 'postinc', op, target: p }; }
      return p;
    }
    function primary() {
      const t = toks[i++];
      if (!t) throw new Error('syntax error: unexpected end of program');
      if (t.t === 'num') return { k: 'num', v: t.v };
      if (t.t === 'str') return { k: 'str', v: t.v };
      if (t.t === 're') return { k: 're', v: t.v };
      if (t.t === 'op' && t.v === '$') { const e = isOp('(') ? primary() : (peek().t === 'num' ? { k: 'num', v: toks[i++].v } : primary()); return { k: 'field', e }; }
      if (t.t === 'op' && t.v === '(') { const e = expr(); if (isOp(',')) { const list = [e]; while (isOp(',')) { i++; list.push(expr()); } expect(')'); return { k: 'group', list }; } expect(')'); return e; }
      if (t.t === 'name') {
        if (isOp('(') && !BUILTIN_VARS.includes(t.v)) {
          i++;
          const args = [];
          if (!isOp(')')) { args.push(expr()); while (isOp(',')) { i++; args.push(expr()); } }
          expect(')');
          return { k: 'call', name: t.v, args };
        }
        if (['length'].includes(t.v)) return { k: 'call', name: 'length', args: [] };
        if (isOp('[')) { i++; const keys = [expr()]; while (isOp(',')) { i++; keys.push(expr()); } expect(']'); return { k: 'index', name: t.v, keys }; }
        return { k: 'var', name: t.v };
      }
      throw new Error(`syntax error near '${t.v}'`);
    }

    skipNl();
    while (i < toks.length) {
      skipNl();
      if (i >= toks.length) break;
      if (isName('function') || isName('func')) {
        i++; const name = toks[i++].v; expect('('); const params = [];
        while (!isOp(')')) { params.push(toks[i++].v); if (isOp(',')) i++; }
        expect(')'); skipNl();
        funcs[name] = { params, body: block() };
        continue;
      }
      let pattern = null, pattern2 = null;
      if (isName('BEGIN')) { i++; pattern = 'BEGIN'; }
      else if (isName('END')) { i++; pattern = 'END'; }
      else if (!isOp('{')) { pattern = expr(); if (isOp(',')) { i++; pattern2 = expr(); } }
      skipNl();
      const action = isOp('{') ? block() : null;
      rules.push({ pattern, pattern2, action });
      skipNl();
    }
    return { rules, funcs };
  }

  class Next { }
  class Exit { constructor(code) { this.code = code; } }
  class Break { }
  class Continue { }
  class Return { constructor(v) { this.v = v; } }

  TX.awk = function (src, inputs, opts) {
    const prog = parse(tokenize(src));
    const V = Object.assign({ FS: opts.FS, OFS: ' ', ORS: '\n', RS: '\n', NR: 0, NF: 0, FNR: 0, FILENAME: '', SUBSEP: '\x1c', RSTART: 0, RLENGTH: -1 }, opts.vars || {});
    const arrays = {};
    let fields = [''];
    let out = '';
    const write = (s) => { out += s; if (out.length > 4096) { opts.write(out); out = ''; } };
    const num = (v) => { if (typeof v === 'number') return v; const m = /^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(String(v)); return m ? parseFloat(m[0]) : 0; };
    const str = (v) => { if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6); return v == null ? '' : String(v); };
    const isNumStr = (v) => typeof v === 'number' || (typeof v === 'string' && /^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i.test(v));
    const splitFields = (line) => {
      const fs = V.FS;
      if (fs === ' ') return line.trim() === '' ? [] : line.trim().split(/[ \t]+/);
      if (fs.length === 1 && fs !== '\\') return line.split(fs);
      return line.split(new RegExp(fs));
    };
    const setRecord = (line) => { fields = [line].concat(splitFields(line)); V.NF = fields.length - 1; };
    const getField = (n) => { n = Math.floor(num(n)); if (n === 0) return fields[0]; return fields[n] === undefined ? '' : fields[n]; };
    const setField = (n, v) => {
      n = Math.floor(num(n));
      if (n === 0) { setRecord(str(v)); return; }
      while (fields.length <= n) fields.push('');
      fields[n] = str(v);
      V.NF = fields.length - 1;
      fields[0] = fields.slice(1).join(V.OFS);
    };
    const toRe = (e, locals) => (e.k === 're' ? new RegExp(TX.bre(e.v, true)) : new RegExp(str(ev(e, locals))));
    const lvalGet = (t, locals) => {
      if (t.k === 'var') return locals && t.name in locals ? locals[t.name] : t.name === 'NF' ? V.NF : V[t.name];
      if (t.k === 'field') return getField(ev(t.e, locals));
      const key = t.keys.map((k) => str(ev(k, locals))).join(V.SUBSEP);
      const arr = (locals && locals[t.name] && typeof locals[t.name] === 'object') ? locals[t.name] : (arrays[t.name] = arrays[t.name] || {});
      return arr[key];
    };
    const lvalSet = (t, v, locals) => {
      if (t.k === 'var') { if (locals && t.name in locals) locals[t.name] = v; else { if (t.name === 'NF') { const n = num(v); fields = fields.slice(0, n + 1); while (fields.length < n + 1) fields.push(''); V.NF = n; fields[0] = fields.slice(1).join(V.OFS); } else V[t.name] = v; } return v; }
      if (t.k === 'field') { setField(ev(t.e, locals), v); return v; }
      const key = t.keys.map((k) => str(ev(k, locals))).join(V.SUBSEP);
      const arr = (locals && locals[t.name] && typeof locals[t.name] === 'object') ? locals[t.name] : (arrays[t.name] = arrays[t.name] || {});
      arr[key] = v;
      return v;
    };
    const fmt = (args, locals) => TX.sprintf(str(ev(args[0], locals)).replace(/\\/g, '\\\\'), args.slice(1).map((a) => { const v = ev(a, locals); return typeof v === 'number' ? v : v; }));
    function call(name, args, locals) {
      const a = (k) => ev(args[k], locals);
      switch (name) {
        case 'length': return args.length ? (args[0].k === 'var' && arrays[args[0].name] ? Object.keys(arrays[args[0].name]).length : str(a(0)).length) : fields[0].length;
        case 'substr': { const s = str(a(0)); let st = Math.round(num(a(1))); const len = args.length > 2 ? Math.round(num(a(2))) : Infinity; let end = st + len; if (st < 1) st = 1; return s.slice(st - 1, Math.max(st - 1, end - 1)); }
        case 'index': return str(a(0)).indexOf(str(a(1))) + 1;
        case 'toupper': return str(a(0)).toUpperCase();
        case 'tolower': return str(a(0)).toLowerCase();
        case 'int': return Math.trunc(num(a(0)));
        case 'sqrt': return Math.sqrt(num(a(0)));
        case 'exp': return Math.exp(num(a(0)));
        case 'log': return Math.log(num(a(0)));
        case 'sin': return Math.sin(num(a(0)));
        case 'cos': return Math.cos(num(a(0)));
        case 'atan2': return Math.atan2(num(a(0)), num(a(1)));
        case 'rand': return Math.random();
        case 'srand': return 0;
        case 'sprintf': return fmt(args, locals);
        case 'systime': return Math.floor(Date.now() / 1000);
        case 'split': {
          const s = str(a(0)); const name2 = args[1].name;
          const sep = args.length > 2 ? (args[2].k === 're' ? new RegExp(args[2].v) : str(a(2))) : V.FS;
          const parts = sep === ' ' ? s.trim().split(/\s+/).filter((x) => x !== '') : s.split(sep);
          arrays[name2] = {}; parts.forEach((p, k) => { arrays[name2][k + 1] = p; });
          return parts.length;
        }
        case 'match': { const re = toRe(args[1], locals); const m = re.exec(str(a(0))); V.RSTART = m ? m.index + 1 : 0; V.RLENGTH = m ? m[0].length : -1; return V.RSTART; }
        case 'sub': case 'gsub': {
          const re = toRe(args[0], locals);
          const g = new RegExp(re.source, name === 'gsub' ? 'g' : '');
          const rep = str(a(1)).replace(/\\&/g, '\u0001').replace(/&/g, '$&').replace(/\u0001/g, '&');
          const target = args[2] || { k: 'field', e: { k: 'num', v: 0 } };
          const before = str(lvalGet(target, locals));
          let n = 0;
          const after = before.replace(g, (m) => { n++; return m.replace(new RegExp(re.source), rep); });
          if (n) lvalSet(target, after, locals);
          return n;
        }
      }
      if (prog.funcs[name]) {
        const fn = prog.funcs[name];
        const loc = {};
        fn.params.forEach((p, k) => { loc[p] = k < args.length ? (args[k].k === 'var' && arrays[args[k].name] ? arrays[args[k].name] : ev(args[k], locals)) : ''; });
        try { exec(fn.body, loc); } catch (e) { if (e instanceof Return) return e.v; throw e; }
        return '';
      }
      throw new Error(`calling undefined function ${name}`);
    }
    function compare(x, y) {
      if (isNumStr(x) && isNumStr(y)) return num(x) - num(y);
      const a = str(x), b = str(y);
      return a < b ? -1 : a > b ? 1 : 0;
    }
    function ev(e, locals) {
      switch (e.k) {
        case 'num': return e.v;
        case 'str': return e.v;
        case 're': return new RegExp(TX.bre(e.v, true)).test(fields[0]) ? 1 : 0;
        case 'var': { const v = lvalGet(e, locals); return v === undefined ? '' : v; }
        case 'field': return getField(ev(e.e, locals));
        case 'index': { const v = lvalGet(e, locals); return v === undefined ? '' : v; }
        case 'assign': {
          const r = ev(e.e, locals);
          if (e.op === '=') return lvalSet(e.target, r, locals);
          const cur = num(lvalGet(e.target, locals)), rv = num(r);
          const v = e.op === '+=' ? cur + rv : e.op === '-=' ? cur - rv : e.op === '*=' ? cur * rv : e.op === '/=' ? cur / rv : e.op === '%=' ? cur % rv : Math.pow(cur, rv);
          return lvalSet(e.target, v, locals);
        }
        case 'tern': return truthy(ev(e.c, locals)) ? ev(e.a, locals) : ev(e.b, locals);
        case 'or': return truthy(ev(e.l, locals)) || truthy(ev(e.r, locals)) ? 1 : 0;
        case 'and': return truthy(ev(e.l, locals)) && truthy(ev(e.r, locals)) ? 1 : 0;
        case 'in': { const key = e.key.k === 'group' ? e.key.list.map((k) => str(ev(k, locals))).join(V.SUBSEP) : str(ev(e.key, locals)); return arrays[e.arr] && key in arrays[e.arr] ? 1 : 0; }
        case 'match': { const re = toRe(e.r, locals); const r = re.test(str(ev(e.l, locals))); return (e.neg ? !r : r) ? 1 : 0; }
        case 'cmp': { const d = compare(ev(e.l, locals), ev(e.r, locals)); return ({ '<': d < 0, '<=': d <= 0, '==': d === 0, '!=': d !== 0, '>=': d >= 0, '>': d > 0 }[e.op]) ? 1 : 0; }
        case 'concat': return str(ev(e.l, locals)) + str(ev(e.r, locals));
        case 'bin': {
          const a = num(ev(e.l, locals)), b = num(ev(e.r, locals));
          switch (e.op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': if (b === 0) throw new Error('division by zero'); return a / b; case '%': return a % b; case '^': return Math.pow(a, b); }
          break;
        }
        case 'not': return truthy(ev(e.e, locals)) ? 0 : 1;
        case 'neg': return -num(ev(e.e, locals));
        case 'num1': return num(ev(e.e, locals));
        case 'preinc': { const v = num(lvalGet(e.target, locals)) + (e.op === '++' ? 1 : -1); lvalSet(e.target, v, locals); return v; }
        case 'postinc': { const v = num(lvalGet(e.target, locals)); lvalSet(e.target, v + (e.op === '++' ? 1 : -1), locals); return v; }
        case 'call': return call(e.name, e.args, locals);
        case 'group': return e.list.map((x) => str(ev(x, locals))).join(V.SUBSEP);
      }
      throw new Error('bad expression');
    }
    function truthy(v) { if (typeof v === 'number') return v !== 0; if (isNumStr(v) && v !== '') return num(v) !== 0; return v !== '' && v !== undefined; }
    const files = {};
    function exec(s, locals) {
      switch (s.k) {
        case 'block': for (const x of s.body) exec(x, locals); return;
        case 'print': case 'printf': {
          let text;
          if (s.k === 'print') text = (s.args.length ? s.args.map((a) => { const v = ev(a, locals); return typeof v === 'number' && !Number.isInteger(v) ? TX.sprintf('%.6g', [v]).replace(/\.?0+$/, '') : str(v); }).join(V.OFS) : fields[0]) + V.ORS;
          else text = fmt(s.args, locals);
          if (s.redir) { const name = str(ev(s.redir.target, locals)); files[name] = (files[name] !== undefined || s.redir.op === '>>') ? (files[name] || '') + text : text; if (opts.writeFile) opts.writeFile(name, files[name]); }
          else write(text);
          return;
        }
        case 'if': if (truthy(ev(s.cond, locals))) exec(s.then, locals); else if (s.els) exec(s.els, locals); return;
        case 'while': { let g = 0; while (truthy(ev(s.cond, locals))) { if (++g > 1e6) throw new Error('loop limit'); try { exec(s.body, locals); } catch (e) { if (e instanceof Break) break; if (e instanceof Continue) continue; throw e; } } return; }
        case 'for': { let g = 0; if (s.init) ev(s.init, locals); while (!s.cond || truthy(ev(s.cond, locals))) { if (++g > 1e6) throw new Error('loop limit'); try { exec(s.body, locals); } catch (e) { if (e instanceof Break) break; if (!(e instanceof Continue)) throw e; } if (s.step) ev(s.step, locals); } return; }
        case 'forin': { const arr = arrays[s.arr] || {}; for (const k of Object.keys(arr)) { lvalSet({ k: 'var', name: s.v }, k, locals); try { exec(s.body, locals); } catch (e) { if (e instanceof Break) break; if (!(e instanceof Continue)) throw e; } } return; }
        case 'next': throw new Next();
        case 'exit': throw new Exit(s.e ? num(ev(s.e, locals)) : 0);
        case 'break': throw new Break();
        case 'continue': throw new Continue();
        case 'return': throw new Return(s.e ? ev(s.e, locals) : '');
        case 'delete': if (s.target.k === 'index') { const key = s.target.keys.map((k) => str(ev(k, locals))).join(V.SUBSEP); if (arrays[s.target.name]) delete arrays[s.target.name][key]; } else delete arrays[s.target.name]; return;
        case 'expr': ev(s.e, locals); return;
      }
    }
    let exitCode = 0;
    const begin = prog.rules.filter((r) => r.pattern === 'BEGIN'), end = prog.rules.filter((r) => r.pattern === 'END'), main = prog.rules.filter((r) => r.pattern !== 'BEGIN' && r.pattern !== 'END');
    const rangeActive = new Map();
    try {
      for (const r of begin) exec(r.action, null);
      if (main.length || end.length) {
        outer: for (const inp of inputs) {
          V.FILENAME = inp.name === '-' ? '' : inp.name; V.FNR = 0;
          const recs = inp.text.split(V.RS === '\n' ? '\n' : V.RS);
          if (recs[recs.length - 1] === '') recs.pop();
          for (const line of recs) {
            V.NR++; V.FNR++;
            setRecord(line);
            try {
              for (const r of main) {
                let hit;
                if (r.pattern === null) hit = true;
                else if (r.pattern2) {
                  if (rangeActive.get(r)) { hit = true; if (truthy(ev(r.pattern2, null))) rangeActive.set(r, false); }
                  else if (truthy(ev(r.pattern, null))) { hit = true; if (!truthy(ev(r.pattern2, null))) rangeActive.set(r, true); }
                  else hit = false;
                } else hit = truthy(ev(r.pattern, null));
                if (!hit) continue;
                if (r.action) exec(r.action, null); else write(fields[0] + V.ORS);
              }
            } catch (e) { if (e instanceof Next) continue; if (e instanceof Exit) { exitCode = e.code; break outer; } throw e; }
          }
        }
      }
      for (const r of end) exec(r.action, null);
    } catch (e) {
      if (e instanceof Exit) exitCode = e.code;
      else { opts.write(out); throw e; }
    }
    opts.write(out);
    return exitCode;
  };
})();
