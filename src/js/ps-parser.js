/* TerminalEX — PowerShell language parser (produces an AST) */
(function () {
  'use strict';
  const TX = window.TX;

  const KEYWORDS = ['if', 'elseif', 'else', 'foreach', 'for', 'while', 'do', 'until', 'switch', 'function', 'filter', 'return', 'break', 'continue', 'exit', 'throw', 'try', 'catch', 'finally', 'param', 'begin', 'process', 'end', 'in', 'trap'];
  const BIN_OPS = ['and', 'or', 'xor', 'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains', 'in', 'notin', 'replace', 'split', 'join', 'is', 'isnot', 'as', 'f', 'band', 'bor', 'bxor', 'shl', 'shr'];
  const CMP = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'notlike', 'match', 'notmatch', 'contains', 'notcontains', 'in', 'notin', 'replace', 'split', 'join', 'is', 'isnot', 'as'];
  const CMP_ALL = new Set(CMP.concat(CMP.map((x) => 'i' + x), CMP.map((x) => 'c' + x)));

  class PSSyntaxError extends Error {
    constructor(msg, pos, src) { super(msg); this.pos = pos; this.src = src; this.psSyntax = true; }
  }
  TX.PSSyntaxError = PSSyntaxError;

  class Parser {
    constructor(src) { this.s = src; this.i = 0; }
    err(msg) { throw new PSSyntaxError(msg, this.i, this.s); }
    get c() { return this.s[this.i]; }
    at(str, ci) { const sub = this.s.substr(this.i, str.length); return ci ? sub.toLowerCase() === str.toLowerCase() : sub === str; }
    eof() { return this.i >= this.s.length; }
    ws() {
      while (this.i < this.s.length) {
        const ch = this.s[this.i];
        if (ch === ' ' || ch === '\t' || ch === '\r') { this.i++; continue; }
        if (ch === '`' && (this.s[this.i + 1] === '\n' || this.s[this.i + 1] === '\r')) { this.i += 2; continue; }
        if (ch === '#') { while (this.i < this.s.length && this.s[this.i] !== '\n') this.i++; continue; }
        if (ch === '<' && this.s[this.i + 1] === '#') { const j = this.s.indexOf('#>', this.i + 2); this.i = j < 0 ? this.s.length : j + 2; continue; }
        break;
      }
    }
    wsNl() { while (true) { this.ws(); if (this.c === '\n' || this.c === ';' && false) { this.i++; continue; } break; } }
    word() { const m = /^[A-Za-z_][\w-]*/.exec(this.s.slice(this.i)); return m ? m[0] : null; }
    keywordAt(kw) { const w = this.word(); return w && w.toLowerCase() === kw; }

    // ------------------------------------------------------------ statements
    parseScript() {
      const body = this.parseStatementList(null);
      if (!this.eof()) this.err(`Unexpected token '${this.s.slice(this.i, this.i + 10).split('\n')[0]}' in expression or statement.`);
      return body;
    }
    parseStatementList(end) {
      const list = [];
      while (true) {
        this.wsNl();
        while (this.c === ';' || this.c === '\n') { this.i++; this.wsNl(); }
        if (this.eof()) { if (end) this.err(`Missing closing '${end}' in statement block or type definition.`); break; }
        if (end && this.c === end) break;
        const st = this.parseStatement();
        list.push(st);
        this.ws();
        if (this.c === ';' || this.c === '\n') { this.i++; continue; }
        if (st.t === 'param' || st.t === 'function') continue;
        if (this.eof() || (end && this.c === end)) continue;
        if (this.c === '}' || this.c === ')') break;
        this.err(`Unexpected token '${this.s.slice(this.i, this.i + 12).split('\n')[0]}' in expression or statement.`);
      }
      return list;
    }
    parseBlock() {
      this.wsNl();
      if (this.c !== '{') this.err("Missing statement block. Expected '{'.");
      this.i++;
      const start = this.i;
      const body = this.parseStatementList('}');
      const text = this.s.slice(start, this.i);
      this.i++;
      return { t: 'block', body, text };
    }
    parseCond() {
      this.ws();
      if (this.c !== '(') this.err("Missing '(' after keyword.");
      this.i++;
      this.wsNl();
      const e = this.parseStatement();
      this.wsNl();
      if (this.c !== ')') this.err("Missing closing ')' after expression.");
      this.i++;
      return e;
    }
    parseStatement() {
      this.ws();
      const w = (this.word() || '').toLowerCase();
      const after = this.s[this.i + w.length];
      const kwBoundary = w && (after === undefined || /[\s({;]/.test(after));
      if (kwBoundary) {
        switch (w) {
          case 'if': {
            this.i += 2;
            const clauses = [{ cond: this.parseCond(), body: this.parseBlock() }];
            let els = null;
            while (true) {
              const save = this.i;
              this.wsNl();
              if (this.keywordAt('elseif')) { this.i += 6; clauses.push({ cond: this.parseCond(), body: this.parseBlock() }); continue; }
              if (this.keywordAt('else')) { this.i += 4; els = this.parseBlock(); break; }
              this.i = save; break;
            }
            return { t: 'if', clauses, els };
          }
          case 'foreach': {
            this.i += 7; this.ws();
            if (this.c !== '(') break;
            this.i++; this.ws();
            if (this.c !== '$') this.err("Missing variable name after foreach.");
            const v = this.parseVariable();
            this.ws();
            if (!this.keywordAt('in')) this.err("Missing 'in' after variable in foreach loop.");
            this.i += 2; this.wsNl();
            const coll = this.parsePipeline();
            this.wsNl();
            if (this.c !== ')') this.err("Missing closing ')' in foreach statement.");
            this.i++;
            return { t: 'foreach', v: v.name, coll, body: this.parseBlock() };
          }
          case 'for': {
            this.i += 3; this.ws();
            if (this.c !== '(') break;
            this.i++; this.wsNl();
            const init = this.c === ';' ? null : this.parseStatement(); this.wsNl(); if (this.c === ';') this.i++; this.wsNl();
            const cond = this.c === ';' ? null : this.parseStatement(); this.wsNl(); if (this.c === ';') this.i++; this.wsNl();
            const step = this.c === ')' ? null : this.parseStatement(); this.wsNl();
            if (this.c !== ')') this.err("Missing closing ')' after expression in 'for' statement.");
            this.i++;
            return { t: 'for', init, cond, step, body: this.parseBlock() };
          }
          case 'while': { this.i += 5; const cond = this.parseCond(); return { t: 'while', cond, body: this.parseBlock() }; }
          case 'do': {
            this.i += 2;
            const body = this.parseBlock();
            this.wsNl();
            const kw = (this.word() || '').toLowerCase();
            if (kw !== 'while' && kw !== 'until') this.err("Missing while or until keyword in do loop.");
            this.i += kw.length;
            return { t: 'do', body, cond: this.parseCond(), until: kw === 'until' };
          }
          case 'switch': {
            this.i += 6; this.ws();
            const opts = {};
            while (this.c === '-') { const m = /^-(\w+)/.exec(this.s.slice(this.i)); opts[m[1].toLowerCase()] = true; this.i += m[0].length; this.ws(); }
            const val = this.parseCond();
            this.wsNl();
            if (this.c !== '{') this.err("Missing '{' in switch statement.");
            this.i++;
            const cases = [];
            while (true) {
              this.wsNl();
              while (this.c === ';' || this.c === '\n') { this.i++; this.wsNl(); }
              if (this.c === '}') { this.i++; break; }
              if (this.eof()) this.err("Missing '}' in switch statement.");
              let test;
              if (this.keywordAt('default')) { this.i += 7; test = { t: 'default' }; }
              else if (this.c === '{') test = { t: 'sb', block: this.parseScriptBlockLiteral() };
              else if (/[\w]/.test(this.c) && !/^\d/.test(this.c)) { const m = /^[^\s{]+/.exec(this.s.slice(this.i)); test = { t: 'str', v: m[0] }; this.i += m[0].length; }
              else test = this.parseUnary();
              cases.push({ test, body: this.parseBlock() });
            }
            return { t: 'switch', val, cases, opts };
          }
          case 'function': case 'filter': {
            this.i += w.length; this.ws();
            const m = /^[\w\-:.]+/.exec(this.s.slice(this.i));
            if (!m) this.err('Function name is missing.');
            this.i += m[0].length; this.ws();
            let params = null;
            if (this.c === '(') { this.i++; params = this.parseParamList(')'); }
            const block = this.parseBlock();
            return { t: 'function', name: m[0], params, block };
          }
          case 'return': { this.i += 6; this.ws(); const v = this.atStatementEnd() ? null : this.parsePipeline(); return { t: 'return', v }; }
          case 'break': this.i += 5; return { t: 'break' };
          case 'continue': this.i += 8; return { t: 'continue' };
          case 'exit': { this.i += 4; this.ws(); const v = this.atStatementEnd() ? null : this.parseExpression(); return { t: 'exit', v }; }
          case 'throw': { this.i += 5; this.ws(); const v = this.atStatementEnd() ? null : this.parsePipeline(); return { t: 'throw', v }; }
          case 'try': {
            this.i += 3;
            const body = this.parseBlock();
            const catches = [];
            let fin = null;
            while (true) {
              const save = this.i; this.wsNl();
              if (this.keywordAt('catch')) { this.i += 5; this.ws(); let type = null; if (this.c === '[') { const j = this.s.indexOf(']', this.i); type = this.s.slice(this.i + 1, j); this.i = j + 1; } catches.push({ type, body: this.parseBlock() }); continue; }
              if (this.keywordAt('finally')) { this.i += 7; fin = this.parseBlock(); continue; }
              this.i = save; break;
            }
            return { t: 'try', body, catches, fin };
          }
          case 'param': { this.i += 5; this.ws(); if (this.c !== '(') this.err('Missing ( after param'); this.i++; return { t: 'param', params: this.parseParamList(')') }; }
        }
      }
      return this.parseChain();
    }
    atStatementEnd() { this.ws(); return this.eof() || this.c === ';' || this.c === '\n' || this.c === '}' || this.c === ')' || this.c === '|'; }
    parseParamList(end) {
      const params = [];
      while (true) {
        this.wsNl();
        if (this.c === end) { this.i++; break; }
        if (this.c === ',') { this.i++; continue; }
        const types = [];
        while (this.c === '[') {
          let depth = 0, j = this.i;
          do { if (this.s[j] === '[') depth++; else if (this.s[j] === ']') depth--; j++; } while (depth > 0 && j < this.s.length);
          const txt = this.s.slice(this.i + 1, j - 1);
          if (!/^Parameter|^Alias|^Validate|^CmdletBinding/i.test(txt)) types.push(txt);
          this.i = j; this.wsNl();
        }
        if (this.c !== '$') this.err('Missing parameter variable.');
        const v = this.parseVariable();
        this.ws();
        let def = null;
        if (this.c === '=') { this.i++; this.ws(); def = this.parseExpression(); }
        params.push({ name: v.name, type: types[0] || null, def });
      }
      return params;
    }
    parseChain() {
      let left = this.parseAssignmentOrPipeline();
      while (true) {
        const save = this.i;
        this.ws();
        if (this.at('&&') || this.at('||')) { const op = this.s.substr(this.i, 2); this.i += 2; this.wsNl(); const right = this.parseAssignmentOrPipeline(); left = { t: 'chain', op, left, right }; continue; }
        this.i = save;
        return left;
      }
    }
    parseAssignmentOrPipeline() {
      this.ws();
      const save = this.i;
      if (this.c === '$' || this.c === '[' || this.c === '(') {
        try {
          let target = this.c === '[' ? this.parseUnary() : this.parsePostfix(this.parsePrimary());
          this.ws();
          const m = /^(=(?!=)|\+=|-=|\*=|\/=|%=)/.exec(this.s.slice(this.i));
          if (m && (target.t === 'var' || target.t === 'member' || target.t === 'index' || target.t === 'cast')) {
            this.i += m[0].length;
            this.wsNl();
            if (this.i >= this.s.length || /^[;})]/.test(this.s[this.i])) { const e = new PSSyntaxError(`You must provide a value expression following the '${m[0]}' operator.`, this.i, this.s); e.final = true; throw e; }
            const rhs = this.parseStatement();
            return { t: 'assign', op: m[0], target, value: rhs };
          }
          if ((this.at('++') || this.at('--')) && (target.t === 'var' || target.t === 'member' || target.t === 'index')) {
            const op = this.s.substr(this.i, 2); this.i += 2;
            return { t: 'incr', op, target, stmt: true };
          }
        } catch (e) { if (!e.psSyntax || e.final) throw e; }
        this.i = save;
      }
      return this.parsePipeline();
    }
    parsePipeline() {
      const elements = [this.parseElement()];
      while (true) {
        const save = this.i;
        this.ws();
        if (this.c === '|' && this.s[this.i + 1] !== '|') { this.i++; this.wsNl(); elements.push(this.parseElement()); continue; }
        this.i = save;
        break;
      }
      const redirs = [];
      while (true) {
        const save = this.i;
        this.ws();
        const m = /^([2*]?>>?|[2*]>&1|>&2)/.exec(this.s.slice(this.i));
        if (!m) { this.i = save; break; }
        this.i += m[0].length;
        if (/&/.test(m[0])) { redirs.push({ op: m[0] }); continue; }
        this.ws();
        const target = this.parseArgument();
        redirs.push({ op: m[0], target });
      }
      return { t: 'pipeline', elements, redirs };
    }
    isCommandStart() {
      const ch = this.c;
      if (ch === undefined) return false;
      if (ch === '&') return true;
      if ((ch === '?' || ch === '%') && /\s/.test(this.s[this.i + 1] || '')) return true;
      if (ch === '.' && /[\s\\/.]/.test(this.s[this.i + 1] || '')) return true;
      if (/[A-Za-z_\\/~]/.test(ch)) return true;
      if (ch === '.' && /\\|\//.test(this.s[this.i + 1] || '')) return true;
      return false;
    }
    parseElement() {
      this.ws();
      if (this.isCommandStart()) return this.parseCommand();
      const e = this.parseExpression();
      return { t: 'expr', e };
    }
    parseCommand() {
      const start = this.i;
      let callOp = null;
      if (this.c === '&') { callOp = '&'; this.i++; this.ws(); }
      else if (this.c === '.' && /\s/.test(this.s[this.i + 1] || '')) { callOp = '.'; this.i++; this.ws(); }
      let name;
      if (callOp && /["'$({]/.test(this.c)) name = this.parsePostfix(this.parsePrimary());
      else {
        const m = /^[^\s|;(){}<>,&]+/.exec(this.s.slice(this.i));
        if (!m) this.err('Missing command name.');
        name = { t: 'str', v: m[0] };
        this.i += m[0].length;
      }
      const args = [];
      while (true) {
        this.ws();
        const ch = this.c;
        if (ch === undefined || ch === '|' || ch === ';' || ch === '\n' || ch === ')' || ch === '}' || this.at('&&') || this.at('||')) break;
        if (/^([2*]?>>?|[2*]>&1)/.test(this.s.slice(this.i))) break;
        if (ch === '-' && /[A-Za-z_?]/.test(this.s[this.i + 1] || '')) {
          const m = /^-([A-Za-z_?][\w-]*)(:?)/.exec(this.s.slice(this.i));
          this.i += m[0].length;
          if (m[2]) { this.ws(); args.push({ param: m[1], value: this.parseArgument(), colon: true }); }
          else args.push({ param: m[1] });
          continue;
        }
        if (ch === '-' && this.s[this.i + 1] === '-' && /\s|$/.test(this.s[this.i + 2] || '')) { this.i += 2; args.push({ value: { t: 'str', v: '--' } }); continue; }
        args.push({ value: this.parseArgument() });
      }
      return { t: 'command', name, args, callOp, text: this.s.slice(start, this.i) };
    }
    parseArgument() {
      this.ws();
      let first = this.parseArgValue();
      this.ws();
      if (this.c === ',') {
        const items = [first];
        while (this.c === ',') { this.i++; this.wsNl(); items.push(this.parseArgValue()); this.ws(); }
        return { t: 'array', items };
      }
      return first;
    }
    parseArgValue() {
      const ch = this.c;
      if (ch === '$' || ch === '(' || ch === '@' || ch === '"' || ch === "'" || ch === '{' || ch === '[') {
        if (ch === '[') { const save = this.i; try { return this.parseUnary(); } catch (e) { this.i = save; } }
        else {
          const p = this.parsePostfix(this.parsePrimary());
          // allow things like $home\Documents in argument mode
          if (/[^\s|;(){},<>&]/.test(this.c || ' ') && p.t === 'var') {
            const m = /^[^\s|;(){},<>&]+/.exec(this.s.slice(this.i));
            this.i += m[0].length;
            return { t: 'concat', parts: [p, { t: 'str', v: m[0] }] };
          }
          return p;
        }
      }
      const m = /^[^\s|;(){},<>&]+/.exec(this.s.slice(this.i));
      if (!m) this.err(`Missing argument in parameter list.`);
      this.i += m[0].length;
      const w = m[0];
      const num = /^-?(0x[0-9a-f]+|\d+(\.\d+)?(e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i.exec(w);
      if (num) return { t: 'num', v: parseNum(w) };
      if (w.includes('$')) return this.expandableFromBare(w);
      return { t: 'str', v: w, bare: true };
    }
    expandableFromBare(w) { const p = new Parser('"' + w.replace(/"/g, '`"') + '"'); return p.parsePrimary(); }

    // ------------------------------------------------------------ expressions
    parseExpression() { return this.parseLogical(); }
    peekOp() {
      const save = this.i;
      this.ws();
      const m = /^-([A-Za-z]+)(?![\w-])/.exec(this.s.slice(this.i));
      this.i = save;
      return m ? m[1].toLowerCase() : null;
    }
    eatOp(op) { this.ws(); this.i += op.length + 1; this.wsNl(); }
    parseLogical() {
      let l = this.parseComparison();
      while (true) {
        const op = this.peekOp();
        if (op === 'and' || op === 'or' || op === 'xor') { this.eatOp(op); l = { t: 'bin', op, l, r: this.parseComparison() }; continue; }
        return l;
      }
    }
    parseComparison() {
      let l = this.parseBitwise();
      while (true) {
        const op = this.peekOp();
        if (op && CMP_ALL.has(op)) { this.eatOp(op); l = { t: 'bin', op, l, r: this.parseBitwise() }; continue; }
        return l;
      }
    }
    parseBitwise() {
      let l = this.parseAdditive();
      while (true) {
        const op = this.peekOp();
        if (op === 'band' || op === 'bor' || op === 'bxor' || op === 'shl' || op === 'shr') { this.eatOp(op); l = { t: 'bin', op, l, r: this.parseAdditive() }; continue; }
        return l;
      }
    }
    parseAdditive() {
      let l = this.parseMultiplicative();
      while (true) {
        const save = this.i;
        this.ws();
        if ((this.c === '+' || this.c === '-') && this.s[this.i + 1] !== '=' && !(this.c === '-' && /[A-Za-z]/.test(this.s[this.i + 1] || '')) && this.s[this.i + 1] !== this.c) {
          const op = this.c; this.i++; this.wsNl();
          l = { t: 'bin', op, l, r: this.parseMultiplicative() };
          continue;
        }
        this.i = save;
        return l;
      }
    }
    parseMultiplicative() {
      let l = this.parseFormat();
      while (true) {
        const save = this.i;
        this.ws();
        if ((this.c === '*' || this.c === '/' || this.c === '%') && this.s[this.i + 1] !== '=') { const op = this.c; this.i++; this.wsNl(); l = { t: 'bin', op, l, r: this.parseFormat() }; continue; }
        this.i = save;
        return l;
      }
    }
    parseFormat() {
      let l = this.parseRange();
      while (this.peekOp() === 'f') { this.eatOp('f'); l = { t: 'bin', op: 'f', l, r: this.parseRange() }; }
      return l;
    }
    parseRange() {
      const l = this.parseComma();
      const save = this.i;
      this.ws();
      if (this.at('..')) { this.i += 2; this.ws(); return { t: 'range', l, r: this.parseComma() }; }
      this.i = save;
      return l;
    }
    parseComma() {
      const first = this.parseUnary();
      const save = this.i;
      this.ws();
      if (this.c === ',') {
        const items = [first];
        while (this.c === ',') { this.i++; this.wsNl(); items.push(this.parseUnary()); const s2 = this.i; this.ws(); if (this.c !== ',') { this.i = s2; break; } }
        return { t: 'array', items };
      }
      this.i = save;
      return first;
    }
    parseUnary() {
      this.ws();
      const ch = this.c;
      if (ch === '!') { this.i++; return { t: 'not', e: this.parseUnary() }; }
      if (ch === ',') { this.i++; return { t: 'array', items: [this.parseUnary()] }; }
      if (ch === '-' || ch === '+') {
        if (this.at('++') || this.at('--')) { const op = this.s.substr(this.i, 2); this.i += 2; return { t: 'incr', op, target: this.parseUnary(), prefix: true }; }
        const m = /^-([A-Za-z]+)(?![\w-])/.exec(this.s.slice(this.i));
        if (m) {
          const op = m[1].toLowerCase();
          if (op === 'not') { this.i += m[0].length; this.ws(); return { t: 'not', e: this.parseUnary() }; }
          if (op === 'split' || op === 'join' || op === 'bnot') { this.i += m[0].length; this.ws(); return { t: 'unop', op, e: this.parseUnary() }; }
        }
        this.i++;
        return { t: 'neg', op: ch, e: this.parseUnary() };
      }
      if (ch === '[') {
        const save = this.i;
        const type = this.readTypeLiteral();
        if (type) {
          if (this.at('::')) { this.i += 2; return this.parsePostfix({ t: 'static', type, member: this.readMemberName() }, true); }
          const s2 = this.i;
          this.ws();
          const nc = this.c;
          if (nc !== undefined && /[$("'@\d[\-.{]/.test(nc) && !(nc === '-' && /[A-Za-z]/.test(this.s[this.i + 1] || ''))) return { t: 'cast', type, e: this.parseUnary() };
          this.i = s2;
          return { t: 'type', type };
        }
        this.i = save;
      }
      return this.parsePostfix(this.parsePrimary());
    }
    readTypeLiteral() {
      if (this.c !== '[') return null;
      let depth = 0, j = this.i;
      do { if (this.s[j] === '[') depth++; else if (this.s[j] === ']') depth--; j++; } while (depth > 0 && j < this.s.length);
      const txt = this.s.slice(this.i + 1, j - 1).trim();
      if (!/^[A-Za-z_][\w.`,\[\] ]*$/.test(txt)) return null;
      this.i = j;
      return txt;
    }
    readMemberName() {
      if (this.c === '"' || this.c === "'") return this.parsePrimary();
      const m = /^[A-Za-z_]\w*/.exec(this.s.slice(this.i));
      if (!m) this.err('Missing property name after reference operator.');
      this.i += m[0].length;
      return m[0];
    }
    parsePostfix(e, isStatic) {
      while (true) {
        const ch = this.c;
        if (ch === '.' && this.s[this.i + 1] !== '.' && /[A-Za-z_"'$]/.test(this.s[this.i + 1] || '')) {
          this.i++;
          const name = this.c === '$' ? this.parsePrimary() : this.readMemberName();
          if (this.c === '(') { this.i++; e = { t: 'call', obj: e, name, args: this.parseCallArgs() }; }
          else e = { t: 'member', obj: e, name };
          continue;
        }
        if (ch === '?' && this.s[this.i + 1] === '.') { this.i += 2; const name = this.readMemberName(); e = this.c === '(' ? (this.i++, { t: 'call', obj: e, name, args: this.parseCallArgs(), nullSafe: true }) : { t: 'member', obj: e, name, nullSafe: true }; continue; }
        if (ch === ':' && this.s[this.i + 1] === ':') { this.i += 2; const name = this.readMemberName(); e = this.c === '(' ? (this.i++, { t: 'call', obj: e, name, args: this.parseCallArgs(), static: true }) : { t: 'member', obj: e, name, static: true }; continue; }
        if (ch === '(' && e.t === 'static' && isStatic) { this.i++; e = { t: 'call', obj: { t: 'type', type: e.type }, name: e.member, args: this.parseCallArgs(), static: true }; isStatic = false; continue; }
        if (ch === '[') { this.i++; this.wsNl(); const idx = this.parseExpression(); this.wsNl(); if (this.c !== ']') this.err("Array index expression is missing or not valid."); this.i++; e = { t: 'index', obj: e, idx }; continue; }
        if ((this.at('++') || this.at('--')) && (e.t === 'var' || e.t === 'member' || e.t === 'index')) { const op = this.s.substr(this.i, 2); this.i += 2; e = { t: 'incr', op, target: e, postfix: true }; continue; }
        return e;
      }
    }
    parseCallArgs() {
      const args = [];
      this.wsNl();
      if (this.c === ')') { this.i++; return args; }
      while (true) {
        this.wsNl();
        args.push(this.parseLogicalNoComma());
        this.wsNl();
        if (this.c === ',') { this.i++; continue; }
        if (this.c === ')') { this.i++; return args; }
        this.err("Missing ')' in method call.");
      }
    }
    parseLogicalNoComma() {
      // method arguments: comma separates arguments, not array elements
      const save = this.parseComma;
      this.parseComma = () => this.parseUnary();
      try { return this.parseLogical(); } finally { this.parseComma = save; }
    }
    parseVariable() {
      // at '$'
      this.i++;
      if (this.c === '{') { const j = this.s.indexOf('}', this.i); const name = this.s.slice(this.i + 1, j); this.i = j + 1; return { t: 'var', name }; }
      const m = /^(?:[A-Za-z_]\w*:)?[A-Za-z_\w]+|^[?$^_]/.exec(this.s.slice(this.i));
      if (!m) { return { t: 'str', v: '$' }; }
      this.i += m[0].length;
      return { t: 'var', name: m[0] };
    }
    parsePrimary() {
      this.ws();
      const ch = this.c;
      if (ch === undefined) this.err('You must provide a value expression following the operator.');
      if (ch === '$') {
        if (this.s[this.i + 1] === '(') { this.i += 2; const body = this.parseStatementList(')'); this.i++; return { t: 'subexpr', body }; }
        return this.parseVariable();
      }
      if (ch === '@') {
        const n = this.s[this.i + 1];
        if (n === '(') { this.i += 2; const body = this.parseStatementList(')'); this.i++; return { t: 'arrsub', body }; }
        if (n === '{') { this.i += 2; return this.parseHashtable(); }
        if (n === '"' || n === "'") return this.parseHereString();
        if (/[A-Za-z_]/.test(n || '')) { this.i++; const m = /^\w+/.exec(this.s.slice(this.i)); this.i += m[0].length; return { t: 'splat', name: m[0] }; }
      }
      if (ch === '(') { this.i++; this.wsNl(); const e = this.parseStatement(); this.wsNl(); if (this.c !== ')') this.err("Missing closing ')' in expression."); this.i++; return { t: 'paren', e }; }
      if (ch === '{') return this.parseScriptBlockLiteral();
      if (ch === "'" || ch === '‘' || ch === '’') {
        let j = this.i + 1, s = '';
        while (true) {
          if (j >= this.s.length) this.err('The string is missing the terminator: \'.');
          if (this.s[j] === "'" || this.s[j] === '’') { if (this.s[j + 1] === "'") { s += "'"; j += 2; continue; } break; }
          s += this.s[j++];
        }
        this.i = j + 1;
        return { t: 'str', v: s, quoted: true };
      }
      if (ch === '"' || ch === '“' || ch === '”') return this.parseExpandable();
      const num = /^(0x[0-9a-f]+|\d+(\.\d+)?(e[+-]?\d+)?|\.\d+)(kb|mb|gb|tb|pb)?(?![\w])/i.exec(this.s.slice(this.i));
      if (num) { this.i += num[0].length; return { t: 'num', v: parseNum(num[0]) }; }
      if (ch === '[') { const t = this.readTypeLiteral(); if (t) { if (this.at('::')) { this.i += 2; return this.parsePostfix({ t: 'static', type: t, member: this.readMemberName() }, true); } return { t: 'type', type: t }; } }
      const w = this.word();
      if (w) this.err(`Unexpected token '${w}' in expression or statement.`);
      this.err(`Unexpected token '${ch}' in expression or statement.`);
    }
    parseScriptBlockLiteral() {
      const start = this.i + 1;
      this.i++;
      this.wsNl();
      let params = null;
      if (this.keywordAt('param')) { this.i += 5; this.ws(); this.i++; params = this.parseParamList(')'); }
      const body = this.parseStatementList('}');
      const text = this.s.slice(start, this.i);
      this.i++;
      return { t: 'sb', body, params, text };
    }
    parseHashtable() {
      const entries = [];
      while (true) {
        this.wsNl();
        while (this.c === ';' || this.c === '\n') { this.i++; this.wsNl(); }
        if (this.c === '}') { this.i++; break; }
        if (this.eof()) this.err("Missing '}' in hash literal.");
        let key;
        if (this.c === '"' || this.c === "'") key = this.parsePrimary();
        else if (this.c === '$' || this.c === '(') key = this.parsePrimary();
        else { const m = /^[^\s=;}]+/.exec(this.s.slice(this.i)); this.i += m[0].length; key = { t: 'str', v: m[0] }; }
        this.ws();
        if (this.c !== '=') this.err("Missing '=' operator after key in hash literal.");
        this.i++;
        this.wsNl();
        const value = this.parseStatement();
        entries.push({ key, value });
      }
      return { t: 'hash', entries };
    }
    parseHereString() {
      const q = this.s[this.i + 1];
      const start = this.s.indexOf('\n', this.i) + 1;
      const endMark = '\n' + q + '@';
      const end = this.s.indexOf(endMark, start);
      if (end < 0) this.err('The string is missing the terminator: ' + q + '@.');
      const raw = this.s.slice(start, end);
      this.i = end + endMark.length;
      if (q === "'") return { t: 'str', v: raw, quoted: true };
      return new Parser('"' + raw.replace(/"/g, '`"') + '"').parseExpandable();
    }
    parseExpandable() {
      this.i++;
      const parts = [];
      let buf = '';
      const flush = () => { if (buf) { parts.push({ t: 'str', v: buf }); buf = ''; } };
      while (true) {
        if (this.i >= this.s.length) this.err('The string is missing the terminator: ".');
        const ch = this.s[this.i];
        if (ch === '"' || ch === '”' || ch === '“') { if (this.s[this.i + 1] === '"') { buf += '"'; this.i += 2; continue; } this.i++; break; }
        if (ch === '`') {
          const n = this.s[this.i + 1];
          buf += { n: '\n', t: '\t', r: '\r', 0: '\0', a: '\x07', b: '\b', e: '\x1b', f: '\f', v: '\v' }[n] ?? n;
          this.i += 2; continue;
        }
        if (ch === '$') {
          const n = this.s[this.i + 1];
          if (n === '(') { flush(); this.i += 2; const body = this.parseStatementList(')'); this.i++; parts.push({ t: 'subexpr', body }); continue; }
          if (n === '{' || /[A-Za-z_?$^]/.test(n || '')) {
            flush();
            const v = this.parseVariable();
            // property access is NOT expanded in strings except via $(), but $var[0] isn't either
            parts.push(v);
            continue;
          }
        }
        buf += ch; this.i++;
      }
      flush();
      if (!parts.length) return { t: 'str', v: '', quoted: true };
      if (parts.length === 1 && parts[0].t === 'str') return Object.assign(parts[0], { quoted: true });
      return { t: 'expstr', parts };
    }
  }
  function parseNum(w) {
    let m = /^(-?)(0x[0-9a-f]+|\d*\.?\d+(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i.exec(w);
    if (!m) return Number(w);
    let v = /^0x/i.test(m[2]) ? parseInt(m[2], 16) : parseFloat(m[2]);
    if (m[3]) v *= Math.pow(1024, ['kb', 'mb', 'gb', 'tb', 'pb'].indexOf(m[3].toLowerCase()) + 1);
    return m[1] ? -v : v;
  }

  TX.PSParser = Parser;
  TX.psParse = (src) => new Parser(src).parseScript();
  TX.PS_KEYWORDS = KEYWORDS;
  TX.PS_BIN_OPS = BIN_OPS;
})();
