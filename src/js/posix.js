/* TerminalEX — POSIX shell core (bash on Linux, zsh on macOS, Git Bash on Windows) */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;

  const FS_MSG = { ENOENT: 'No such file or directory', ENOTDIR: 'Not a directory', EISDIR: 'Is a directory', EEXIST: 'File exists', ENOTEMPTY: 'Directory not empty', EACCES: 'Permission denied', EINVAL: 'Invalid argument', ELOOP: 'Too many levels of symbolic links' };
  TX.FS_MSG = FS_MSG;

  const KEYWORDS = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', '{', '}', 'function', '!']);

  // ------------------------------------------------------------------ lexer
  function lex(src) {
    const toks = [];
    let i = 0, word = '', wordStarted = false;
    const push = () => { if (wordStarted) toks.push({ t: 'w', v: word }); word = ''; wordStarted = false; };
    const readUntilClose = (open, close) => {
      // from position after an opening "$(" / "${" etc. returns content up to matching close
      let depth = 1, s = '';
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') { s += ch + (src[i + 1] || ''); i += 2; continue; }
        if (ch === "'" && open === '(') { const j = src.indexOf("'", i + 1); if (j < 0) throw new SyntaxError('unterminated'); s += src.slice(i, j + 1); i = j + 1; continue; }
        if (ch === open) depth++;
        else if (ch === close) { depth--; if (!depth) { i++; return s; } }
        s += ch; i++;
      }
      throw new SyntaxError('unterminated');
    };
    while (i < src.length) {
      const ch = src[i];
      if (ch === '\\') {
        if (src[i + 1] === '\n') { i += 2; continue; }
        word += ch + (src[i + 1] || ''); wordStarted = true; i += 2; continue;
      }
      if (ch === "'") {
        const j = src.indexOf("'", i + 1);
        if (j < 0) throw new SyntaxError('unterminated quote');
        word += src.slice(i, j + 1); wordStarted = true; i = j + 1; continue;
      }
      if (ch === '"') {
        let j = i + 1, s = '"';
        while (j < src.length && src[j] !== '"') {
          if (src[j] === '\\') { s += src[j] + (src[j + 1] || ''); j += 2; continue; }
          if (src[j] === '$' && src[j + 1] === '(') { const save = i; i = j + 2; const inner = readUntilClose('(', ')'); s += '$(' + inner + ')'; j = i; i = save; continue; }
          s += src[j]; j++;
        }
        if (j >= src.length) throw new SyntaxError('unterminated quote');
        word += s + '"'; wordStarted = true; i = j + 1; continue;
      }
      if (ch === '`') {
        const j = src.indexOf('`', i + 1);
        if (j < 0) throw new SyntaxError('unterminated backquote');
        word += src.slice(i, j + 1); wordStarted = true; i = j + 1; continue;
      }
      if (ch === '$' && src[i + 1] === '(') {
        i += 2;
        const inner = readUntilClose('(', ')');
        word += '$(' + inner + ')'; wordStarted = true; continue;
      }
      if (ch === '$' && src[i + 1] === '{') {
        i += 2;
        const inner = readUntilClose('{', '}');
        word += '${' + inner + '}'; wordStarted = true; continue;
      }
      if (ch === '#' && !wordStarted) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (ch === ' ' || ch === '\t') { push(); i++; continue; }
      if (ch === '\n') { push(); toks.push({ t: 'op', v: ';', nl: true }); i++; continue; }
      const three = src.slice(i, i + 3), two = src.slice(i, i + 2);
      if (three === '2>&' && src[i + 3] === '1' && (!wordStarted)) { push(); toks.push({ t: 'op', v: '2>&1' }); i += 4; continue; }
      if (two === '>&' && src[i + 2] === '2') { push(); toks.push({ t: 'op', v: '>&2' }); i += 3; continue; }
      if (ch === '>' || ch === '<') {
        let fd = null;
        if (wordStarted && /^[012]$/.test(word)) { fd = word; word = ''; wordStarted = false; }
        push();
        let op = ch;
        if (ch === '>' && src[i + 1] === '>') { op = '>>'; i++; }
        else if (ch === '<' && src[i + 1] === '<' && src[i + 2] === '<') { op = '<<<'; i += 2; }
        else if (ch === '<' && src[i + 1] === '<') { op = '<<'; i++; }
        i++;
        toks.push({ t: 'op', v: op, fd: fd || (ch === '>' ? '1' : '0') });
        continue;
      }
      if (two === '&>') { push(); toks.push({ t: 'op', v: '&>' }); i += 2; continue; }
      if (two === '&&' || two === '||' || two === ';;') { push(); toks.push({ t: 'op', v: two }); i += 2; continue; }
      if (ch === '|' || ch === '&' || ch === ';' || ch === '(' || ch === ')') {
        if (ch === '(' && src[i + 1] === '(' ) { push(); i += 2; const inner = readUntilClose('(', ')'); if (src[i] === ')') i++; toks.push({ t: 'arith', v: inner.replace(/\)$/, '') }); continue; }
        push(); toks.push({ t: 'op', v: ch }); i++; continue;
      }
      word += ch; wordStarted = true; i++;
    }
    push();
    return toks;
  }

  // ------------------------------------------------------------------ parser
  class Parser {
    constructor(toks) { this.toks = toks; this.i = 0; }
    peek() { return this.toks[this.i]; }
    next() { return this.toks[this.i++]; }
    isWord(v) { const t = this.peek(); return t && t.t === 'w' && t.v === v; }
    isOp(v) { const t = this.peek(); return t && t.t === 'op' && t.v === v; }
    skipSep() { while (this.peek() && this.peek().t === 'op' && (this.peek().v === ';')) this.i++; }
    expectWord(v) { this.skipSep(); if (!this.isWord(v)) throw new SyntaxError(`syntax error near unexpected token \`${this.peek() ? this.peek().v : 'newline'}'`); this.i++; }
    parseList(stops = []) {
      const items = [];
      this.skipSep();
      while (this.peek()) {
        const t = this.peek();
        if (t.t === 'w' && stops.includes(t.v)) break;
        if (t.t === 'op' && t.v === ')') break;
        const node = this.parseAndOr();
        let op = ';';
        if (this.peek() && this.peek().t === 'op' && (this.peek().v === ';' || this.peek().v === '&')) op = this.next().v;
        items.push({ node, op });
        this.skipSep();
      }
      return { type: 'list', items };
    }
    parseAndOr() {
      let left = this.parsePipeline();
      while (this.peek() && this.peek().t === 'op' && (this.peek().v === '&&' || this.peek().v === '||')) {
        const op = this.next().v;
        this.skipSep();
        const right = this.parsePipeline();
        left = { type: 'andor', op, left, right };
      }
      return left;
    }
    parsePipeline() {
      let bang = false;
      if (this.isWord('!')) { this.i++; bang = true; }
      const cmds = [this.parseCommand()];
      while (this.isOp('|')) { this.i++; this.skipSep(); cmds.push(this.parseCommand()); }
      return { type: 'pipeline', cmds, bang };
    }
    parseCommand() {
      const t = this.peek();
      if (!t) throw new SyntaxError('syntax error: unexpected end of file');
      if (t.t === 'arith') { this.i++; return { type: 'arith', expr: t.v }; }
      if (t.t === 'w') {
        if (t.v === 'if') return this.parseIf();
        if (t.v === 'for') return this.parseFor();
        if (t.v === 'while' || t.v === 'until') return this.parseWhile();
        if (t.v === '{') { this.i++; const body = this.parseList(['}']); this.expectWord('}'); return this.withRedirs({ type: 'group', body }); }
        if (t.v === 'function') { this.i++; const name = this.next().v; if (this.isOp('(')) { this.i++; this.i++; } this.skipSep(); this.expectWord('{'); const body = this.parseList(['}']); this.expectWord('}'); return { type: 'func', name, body }; }
        const n1 = this.toks[this.i + 1], n2 = this.toks[this.i + 2];
        if (n1 && n1.t === 'op' && n1.v === '(' && n2 && n2.t === 'op' && n2.v === ')') {
          this.i += 3; this.skipSep(); this.expectWord('{'); const body = this.parseList(['}']); this.expectWord('}');
          return { type: 'func', name: t.v, body };
        }
      }
      if (t.t === 'op' && t.v === '(') { this.i++; const body = this.parseList([]); if (!this.isOp(')')) throw new SyntaxError("syntax error: expected `)'"); this.i++; return this.withRedirs({ type: 'subshell', body }); }
      return this.parseSimple();
    }
    withRedirs(node) {
      node.redirs = [];
      while (this.peek() && this.peek().t === 'op' && /^(>|>>|<|<<<|&>|2>&1|>&2)$/.test(this.peek().v)) this.readRedir(node.redirs);
      return node;
    }
    readRedir(redirs) {
      const op = this.next();
      if (op.v === '2>&1' || op.v === '>&2') { redirs.push({ op: op.v }); return; }
      const target = this.next();
      if (!target || target.t !== 'w') throw new SyntaxError("syntax error near unexpected token `newline'");
      redirs.push({ op: op.v, fd: op.fd, target: target.v });
    }
    parseSimple() {
      const node = { type: 'simple', assigns: [], words: [], redirs: [] };
      while (this.peek()) {
        const t = this.peek();
        if (t.t === 'op') {
          if (/^(>|>>|<|<<<|&>|2>&1|>&2)$/.test(t.v)) { this.readRedir(node.redirs); continue; }
          if (t.v === '<<') { this.i++; const tag = this.next(); node.heredoc = tag ? tag.v.replace(/['"]/g, '') : 'EOF'; continue; }
          break;
        }
        if (t.t !== 'w') break;
        if (!node.words.length && /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/.test(t.v)) { node.assigns.push(t.v); this.i++; continue; }
        if (node.words.length === 0 && ['then', 'do', 'done', 'fi', 'else', 'elif', '}'].includes(t.v) && !node.assigns.length) throw new SyntaxError(`syntax error near unexpected token \`${t.v}'`);
        node.words.push(t.v); this.i++;
      }
      if (!node.words.length && !node.assigns.length && !node.redirs.length) {
        const t = this.peek();
        throw new SyntaxError(`syntax error near unexpected token \`${t ? t.v : 'newline'}'`);
      }
      return node;
    }
    parseIf() {
      this.i++;
      const clauses = [];
      const cond = this.parseList(['then']); this.expectWord('then');
      const body = this.parseList(['elif', 'else', 'fi']);
      clauses.push({ cond, body });
      let els = null;
      while (true) {
        this.skipSep();
        if (this.isWord('elif')) { this.i++; const c = this.parseList(['then']); this.expectWord('then'); const b = this.parseList(['elif', 'else', 'fi']); clauses.push({ cond: c, body: b }); continue; }
        if (this.isWord('else')) { this.i++; els = this.parseList(['fi']); }
        this.expectWord('fi');
        break;
      }
      return this.withRedirs({ type: 'if', clauses, els });
    }
    parseFor() {
      this.i++;
      const v = this.next();
      if (!v || v.t !== 'w') throw new SyntaxError("syntax error near unexpected token `newline'");
      let words = null;
      this.skipSep();
      if (this.isWord('in')) { this.i++; words = []; while (this.peek() && this.peek().t === 'w') words.push(this.next().v); }
      this.skipSep();
      this.expectWord('do');
      const body = this.parseList(['done']);
      this.expectWord('done');
      return this.withRedirs({ type: 'for', name: v.v, words, body });
    }
    parseWhile() {
      const until = this.next().v === 'until';
      const cond = this.parseList(['do']); this.expectWord('do');
      const body = this.parseList(['done']); this.expectWord('done');
      return this.withRedirs({ type: 'while', cond, body, until });
    }
  }

  // detect incomplete input for continuation prompts
  function needsMore(src) {
    try {
      const toks = lex(src);
      let depth = 0;
      for (const t of toks) {
        if (t.t !== 'w') continue;
        if (['if', 'for', 'while', 'until'].includes(t.v)) depth++;
        if (t.v === '{') depth++;
        if (['fi', 'done', '}'].includes(t.v)) depth--;
      }
      if (depth > 0) return true;
      const last = toks[toks.length - 1];
      if (last && last.t === 'op' && ['|', '&&', '||'].includes(last.v)) return true;
      if (/\\$/.test(src)) return true;
      return false;
    } catch (e) {
      return /unterminated/.test(e.message);
    }
  }

  // ------------------------------------------------------------------ integer arithmetic
  function arith(expr, getVar, setVar) {
    const toks = [];
    const re = /\s*(\d+|0x[0-9a-f]+|[A-Za-z_][A-Za-z0-9_]*|\*\*|<=|>=|==|!=|&&|\|\||\+\+|--|<<|>>|\+=|-=|\*=|\/=|[-+*/%()<>!=?:&|^~])/iy;
    let m, pos = 0;
    expr = String(expr).trim();
    while (pos < expr.length) {
      re.lastIndex = pos;
      m = re.exec(expr);
      if (!m) throw new Error(`syntax error in expression (error token is "${expr.slice(pos)}")`);
      toks.push(m[1]); pos = re.lastIndex;
      while (pos < expr.length && expr[pos] === ' ') pos++;
    }
    let i = 0;
    const peek = () => toks[i];
    const isName = (t) => /^[A-Za-z_]/.test(t || '');
    const val = (t) => { const v = getVar(t); const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
    function assign() {
      if (isName(peek()) && ['=', '+=', '-=', '*=', '/='].includes(toks[i + 1])) {
        const name = toks[i]; const op = toks[i + 1]; i += 2;
        const r = assign(); let v = r;
        if (op === '+=') v = val(name) + r; if (op === '-=') v = val(name) - r; if (op === '*=') v = val(name) * r; if (op === '/=') v = Math.trunc(val(name) / r);
        setVar(name, String(v)); return v;
      }
      return ternary();
    }
    function ternary() { const c = bin(0); if (peek() === '?') { i++; const a = assign(); if (toks[i++] !== ':') throw new Error('expected :'); const b = assign(); return c ? a : b; } return c; }
    const PREC = [['||'], ['&&'], ['|'], ['^'], ['&'], ['==', '!='], ['<', '>', '<=', '>='], ['<<', '>>'], ['+', '-'], ['*', '/', '%'], ['**']];
    function bin(level) {
      if (level >= PREC.length) return unary();
      let l = bin(level + 1);
      while (PREC[level].includes(peek())) {
        const op = toks[i++];
        const r = op === '**' ? bin(level) : bin(level + 1);
        switch (op) {
          case '||': l = l || r ? 1 : 0; break; case '&&': l = l && r ? 1 : 0; break;
          case '|': l |= r; break; case '^': l ^= r; break; case '&': l &= r; break;
          case '==': l = l === r ? 1 : 0; break; case '!=': l = l !== r ? 1 : 0; break;
          case '<': l = l < r ? 1 : 0; break; case '>': l = l > r ? 1 : 0; break; case '<=': l = l <= r ? 1 : 0; break; case '>=': l = l >= r ? 1 : 0; break;
          case '<<': l <<= r; break; case '>>': l >>= r; break;
          case '+': l += r; break; case '-': l -= r; break; case '*': l *= r; break;
          case '/': if (r === 0) throw new Error('division by 0 (error token is "' + r + '")'); l = Math.trunc(l / r); break;
          case '%': if (r === 0) throw new Error('division by 0'); l %= r; break;
          case '**': l = Math.pow(l, r); break;
        }
      }
      return l;
    }
    function unary() {
      const t = peek();
      if (t === '-') { i++; return -unary(); }
      if (t === '+') { i++; return unary(); }
      if (t === '!') { i++; return unary() ? 0 : 1; }
      if (t === '~') { i++; return ~unary(); }
      if (t === '++' || t === '--') { i++; const n = toks[i++]; const v = val(n) + (t === '++' ? 1 : -1); setVar(n, String(v)); return v; }
      return postfix();
    }
    function postfix() {
      const t = toks[i++];
      if (t === '(') { const v = assign(); if (toks[i++] !== ')') throw new Error('missing )'); return v; }
      if (t === undefined) throw new Error('syntax error: operand expected');
      if (/^\d/.test(t)) return t.startsWith('0x') ? parseInt(t, 16) : parseInt(t, 10);
      if (isName(t)) {
        if (peek() === '++' || peek() === '--') { const op = toks[i++]; const v = val(t); setVar(t, String(v + (op === '++' ? 1 : -1))); return v; }
        return val(t);
      }
      throw new Error(`syntax error: operand expected (error token is "${t}")`);
    }
    const r = toks.length ? assign() : 0;
    if (i < toks.length) throw new Error(`syntax error in expression (error token is "${toks.slice(i).join(' ')}")`);
    return r;
  }
  TX.arith = arith;

  // ------------------------------------------------------------------ option parsing
  // spec: string of flag letters; letter followed by ':' takes a value. longs: {name: letter|true}
  TX.getopt = function (args, spec = '', longs = {}) {
    const flags = {}, rest = [];
    const takes = new Set();
    for (let k = 0; k < spec.length; k++) if (spec[k + 1] === ':') takes.add(spec[k]);
    for (let k = 0; k < args.length; k++) {
      const a = args[k];
      if (a === '--') { rest.push(...args.slice(k + 1)); break; }
      if (a.startsWith('--') && a.length > 2) {
        const [name, val] = a.slice(2).split(/=(.*)/s);
        const map = longs[name];
        if (map === undefined) { flags['--' + name] = val === undefined ? true : val; continue; }
        const key = typeof map === 'string' ? map : name;
        if (typeof map === 'string' && takes.has(map)) flags[key] = val !== undefined ? val : args[++k];
        else flags[key] = val === undefined ? true : val;
        continue;
      }
      if (a[0] === '-' && a.length > 1 && !/^-\d+$/.test(a)) {
        for (let j = 1; j < a.length; j++) {
          const f = a[j];
          if (takes.has(f)) { flags[f] = a.slice(j + 1) || args[++k]; break; }
          flags[f] = (flags[f] === true || typeof flags[f] === 'number') ? (flags[f] === true ? 2 : flags[f] + 1) : true;
        }
        continue;
      }
      rest.push(a);
    }
    return { f: flags, rest };
  };

  // ------------------------------------------------------------------ shell
  class PosixShell {
    constructor(session, machine, flavor, opts = {}) {
      this.session = session;
      this.term = session.term;
      this.m = machine;
      this.vfs = machine.vfs;
      this.flavor = flavor; // bash | zsh | gitbash | sh (FreeBSD) | ksh (Solaris ksh93) | v7 (1979 Bourne shell)
      this.old = flavor === 'v7';
      this.kind = 'posix';
      this.paths = flavor === 'gitbash' ? TX.Paths.gitbash : TX.Paths.posix;
      this.user = opts.user || 'student';
      this.home = this.user === 'root' ? (machine.def.rootHome || (machine.kind === 'mac' ? ['var', 'root'] : ['root'])).slice() : machine.home.slice();
      this.cwd = opts.cwd ? opts.cwd.slice() : this.home.slice();
      this.history = session.historyFor(flavor + ':' + machine.kind);
      this.aliases = Object.assign({}, flavor === 'zsh' ? { ll: 'ls -lah', gs: 'git status', 'run-help': 'man' } : { ll: 'ls -alF', la: 'ls -A', l: 'ls -CF' });
      if (flavor === 'bash' || flavor === 'gitbash') { this.aliases.ls = 'ls --color=auto'; this.aliases.grep = 'grep --color=auto'; }
      if (flavor === 'sh') this.aliases = { h: 'fc -l', j: 'jobs', ll: 'ls -laFo', l: 'ls -l', m: 'more' };
      if (flavor === 'ksh') this.aliases = { ll: 'ls -l', la: 'ls -a', history: 'fc -l', r: 'fc -e -' };
      if (flavor === 'v7') this.aliases = {}; // the 1979 Bourne shell had no aliases at all
      if (flavor === 'gitbash') { this.aliases.node = 'winpty node.exe'; delete this.aliases.node; }
      this.funcs = {};
      this.jobs = [];
      this.params = [];
      this.lastCode = 0;
      this.sudoUntil = 0;
      this.startTime = Date.now();
      const hn = machine.net.hostname;
      const hf = this.paths.format(this.home);
      this.vars = {
        HOME: hf, USER: this.user, LOGNAME: this.user, SHELL: flavor === 'zsh' ? '/bin/zsh' : '/bin/bash', PWD: this.paths.format(this.cwd), OLDPWD: '',
        HOSTNAME: hn, TERM: 'xterm-256color', LANG: 'en_US.UTF-8', EDITOR: flavor === 'bash' ? 'nano' : 'vim',
        PATH: flavor === 'zsh' ? '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin' : flavor === 'gitbash' ? '/c/Users/student/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/c/Windows/system32:/c/Windows:/c/Program Files/Git/cmd' : '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin',
        UID: this.user === 'root' ? '0' : (machine.kind === 'mac' ? '501' : '1000'),
      };
      if (flavor === 'gitbash') Object.assign(this.vars, { MSYSTEM: 'MINGW64', COMPUTERNAME: hn, USERNAME: 'student', OS: 'Windows_NT', USERPROFILE: 'C:\\Users\\student' });
      if (flavor === 'zsh') this.vars.PROMPT = '%n@%m %1~ %# ';
      const prof = machine.def.shellVars && machine.def.shellVars(this);
      if (prof) { Object.assign(this.vars, prof); Object.keys(this.vars).forEach((k) => { if (this.vars[k] === null) delete this.vars[k]; }); }
      this.exported = new Set(Object.keys(this.vars));
      this.name = { zsh: 'zsh', sh: 'sh', ksh: 'ksh', v7: 'sh' }[flavor] || 'bash';
    }

    get env() { return this.vars; }
    title() { return flavor2title(this); }

    // -------------------------------------------------- paths helpers
    resolve(p) { return this.vfs.canon(this.paths.parse(p, this.cwd, this.home)); }
    fmt(segs) { return this.paths.format(segs); }
    pretty(segs) { return this.paths.pretty(segs, this.home); }

    // -------------------------------------------------- prompt
    gitBranch() {
      if (!TX.git) return null;
      try { return TX.git.branchFor(this.vfs, this.cwd); } catch (e) { return null; }
    }
    prompt() {
      const u = this.user, h = this.m.net.hostname;
      const root = u === 'root';
      if (this.flavor === 'v7') return root ? '# ' : '$ ';
      if (this.flavor === 'ksh' && !this.vars.PS1) return u + '@' + h + ':' + this.pretty(this.cwd) + (root ? '# ' : '$ ');
      if (this.flavor === 'sh' && !this.vars.PS1) return u + '@' + h + ':' + this.pretty(this.cwd) + (root ? ' # ' : ' $ ');
      if (this.vars.PS1 && this.flavor !== 'zsh') return this.expandPS1(this.vars.PS1);
      if (this.flavor === 'zsh') return this.expandZshPrompt(this.vars.PROMPT || '%n@%m %1~ %# ');
      if (this.flavor === 'gitbash') {
        const b = this.gitBranch();
        return '\n' + C.green(u + '@' + h) + ' ' + C.magenta('MINGW64') + ' ' + C.yellow(this.pretty(this.cwd)) + (b ? C.cyan(' (' + b + ')') : '') + '\n$ ';
      }
      return C.style(['bold', 'green'], u + '@' + h) + ':' + C.style(['bold', 'blue'], this.pretty(this.cwd)) + (root ? '# ' : '$ ');
    }
    expandPS1(ps) {
      const d = new Date();
      return ps.replace(/\\\[|\\\]/g, '').replace(/\\(e|033)\[([0-9;]*)m/g, (_, __, c) => '\x1b[' + c + 'm').replace(/\\([uhHwW$ntdA@\\])/g, (_, k) => {
        switch (k) {
          case 'u': return this.user; case 'h': return this.m.net.hostname.split('.')[0]; case 'H': return this.m.net.hostname;
          case 'w': return this.pretty(this.cwd); case 'W': return this.cwd.length ? (this.vfs.samePath(this.cwd, this.home) ? '~' : this.cwd[this.cwd.length - 1]) : '/';
          case '$': return this.user === 'root' ? '#' : '$'; case 'n': return '\n';
          case 't': return TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds());
          case 'A': return TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes());
          case 'd': return TX.DAY[d.getDay()] + ' ' + TX.MON[d.getMonth()] + ' ' + d.getDate();
          case '@': return TX.winTime(Date.now()).toLowerCase(); case '\\': return '\\';
        }
        return k;
      }).replace(/\$\(__git_ps1[^)]*\)/, () => { const b = this.gitBranch(); return b ? ' (' + b + ')' : ''; });
    }
    expandZshPrompt(ps) {
      const colors = { black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37 };
      return ps.replace(/%F\{(\w+)\}/g, (_, c) => '\x1b[' + (colors[c] || (/^\d+$/.test(c) ? '38;5;' + c : 39)) + 'm').replace(/%f/g, '\x1b[39m').replace(/%B/g, '\x1b[1m').replace(/%b/g, '\x1b[22m')
        .replace(/%(\d*)~|%([nmM#d/]|T|\*)/g, (all, n, k) => {
          if (n !== undefined && all.endsWith('~')) {
            const p = this.pretty(this.cwd);
            if (!n) return p;
            if (p === '~' || p === '/') return p;
            const parts = p.split('/').filter(Boolean);
            return parts.slice(-parseInt(n, 10)).join('/');
          }
          switch (k) {
            case 'n': return this.user; case 'm': return this.m.net.hostname.split('.')[0]; case 'M': return this.m.net.hostname;
            case '#': return this.user === 'root' ? '#' : '%'; case 'd': case '/': return this.fmt(this.cwd);
            case 'T': { const d = new Date(); return d.getHours() + ':' + TX.p2(d.getMinutes()); }
          }
          return all;
        });
    }
    banner() {
      if (this.flavor === 'bash' && this.m.kind === 'linux') {
        const mem = this.m.memory();
        return `Welcome to ${C.bold('Ubuntu 24.04.1 LTS')} (GNU/Linux ${this.m.hw.kernel} x86_64)\n\n * Documentation:  https://help.ubuntu.com\n * Management:     https://landscape.canonical.com\n * Support:        https://ubuntu.com/pro\n\n System information as of ${TX.unixDate(Date.now())}\n\n  System load:  ${this.m.load()[0].toFixed(2)}               Processes:             ${this.m.procs.length + 214}\n  Usage of /:   19.4% of 466.34GB   Users logged in:       1\n  Memory usage: ${Math.round((mem.used / mem.total) * 100)}%                IPv4 address for ${this.m.net.iface}: ${this.m.net.ip}\n  Swap usage:   0%\n\n${C.dim('Tip: type')} ${C.cyan('help')} ${C.dim('for a list of commands, or open the Missions panel.')}\n\nLast login: ${TX.unixDate(Date.now() - 1000 * 60 * 60 * 20).replace(/ EDT/, '')} from 192.168.1.57\n`;
      }
      if (this.flavor === 'zsh') return `Last login: ${TX.unixDate(Date.now() - 1000 * 60 * 60 * 3).replace(/ EDT \d+$/, '')} on ttys000\n${C.dim('Tip: type')} ${C.cyan('help')} ${C.dim('for a list of commands.')}\n`;
      if (this.m.def.banner) return this.m.def.banner(this);
      if (this.flavor === 'gitbash') return C.dim('Git Bash (MINGW64) — git version 2.46.0.windows.1. Type ') + C.cyan('help') + C.dim(' for commands.') + '\n';
      return '';
    }

    // -------------------------------------------------- highlighting & completion
    highlight(line) {
      let toks;
      try { toks = lex(line); } catch (e) { return line; }
      // simple char-based highlighter: color first word of each command
      let out = '', i = 0, cmdPos = true;
      const re = /(\s+)|("(?:[^"\\]|\\.)*"?|'[^']*'?)|(\|\||&&|[|;&])|(\$\{?[A-Za-z_?][A-Za-z0-9_]*\}?)|([^\s|;&'"$]+|\$)/g;
      let m;
      while ((m = re.exec(line))) {
        if (m[1]) { out += m[1]; continue; }
        if (m[2]) { out += C.yellow(m[2]); cmdPos = false; continue; }
        if (m[3]) { out += C.style(['bold', 'magenta'], m[3]); cmdPos = true; continue; }
        if (m[4]) { out += C.cyan(m[4]); cmdPos = false; continue; }
        const w = m[5];
        if (cmdPos) {
          if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) { out += C.cyan(w); continue; }
          const ok = this.lookup(w) || KEYWORDS.has(w) || w.includes('/');
          out += ok ? C.green(w) : C.red(w);
          cmdPos = KEYWORDS.has(w) || w === 'sudo' || w === 'time';
        } else out += w.startsWith('-') ? C.gray(w) : w;
      }
      void toks; void i;
      return out;
    }
    completer(buf, pos) {
      const left = buf.slice(0, pos);
      const m = /(?:^|[\s|;&])((?:\\ |[^\s|;&])*)$/.exec(left);
      const word = m ? m[1] : '';
      const start = pos - word.length;
      const before = left.slice(0, start).trim();
      const cmdPos = !before || /(\|\||&&|[|;&]|\bsudo|\btime|\bthen|\bdo|\belse)$/.test(before);
      const unesc = word.replace(/\\ /g, ' ');
      if (cmdPos && !unesc.includes('/')) {
        const names = new Set([...Object.keys(this.aliases), ...Object.keys(this.funcs), ...this.commandNames()]);
        const c = [...names].filter((n) => n.startsWith(unesc)).sort();
        return { start, cands: c };
      }
      // git subcommands
      const words = before.split(/\s+/);
      if (words[words.length - 1] === 'git' && !unesc.startsWith('-')) {
        const subs = ['add', 'branch', 'checkout', 'clone', 'commit', 'config', 'diff', 'fetch', 'init', 'log', 'merge', 'mv', 'pull', 'push', 'rebase', 'remote', 'reset', 'restore', 'revert', 'rm', 'show', 'stash', 'status', 'switch', 'tag'];
        return { start, cands: subs.filter((s) => s.startsWith(unesc)) };
      }
      if ((words[words.length - 2] === 'git' && ['checkout', 'switch', 'merge', 'branch'].includes(words[words.length - 1]))) {
        const br = TX.git ? TX.git.branches(this.vfs, this.cwd) : [];
        const c = br.filter((b) => b.startsWith(unesc));
        if (c.length) return { start, cands: c };
      }
      const dirsOnly = /(^|\s)(cd|pushd|rmdir)$/.test(before);
      return this.completePath(unesc, start, dirsOnly);
    }
    completePath(word, start, dirsOnly) {
      const slash = word.lastIndexOf('/');
      const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
      const base = slash >= 0 ? word.slice(slash + 1) : word;
      const dirSegs = this.paths.parse(dirPart || '.', this.cwd, this.home);
      const node = this.vfs.get(dirSegs);
      if (!node || node.t !== 'd') return null;
      const ci = this.vfs.ci;
      const cands = [], disp = [];
      for (const name of Object.keys(node.ch).sort()) {
        if (name[0] === '.' && !base.startsWith('.')) continue;
        if (ci ? !name.toLowerCase().startsWith(base.toLowerCase()) : !name.startsWith(base)) continue;
        const child = this.vfs.get(dirSegs.concat(name));
        const isDir = child && child.t === 'd';
        if (dirsOnly && !isDir) continue;
        cands.push((dirPart + name).replace(/ /g, '\\ ') + (isDir ? '/' : ''));
        disp.push(name + (isDir ? '/' : ''));
      }
      return { start, cands, display: disp, ci };
    }
    commandNames() {
      const out = [];
      for (const k in TX.posixCmds) if (this.available(k)) out.push(k);
      return out;
    }
    available(name) {
      const c = TX.posixCmds[name];
      if (!c) return false;
      if (c.only && !c.only.includes(this.flavor === 'gitbash' ? 'gitbash' : this.m.kind)) return false;
      if (c.not && c.not.includes(this.m.kind)) return false;
      if (this.m.def.allow && !this.m.def.allow.has(name)) return false;
      if (c.pkg && !this.m.installed.has(c.pkg)) return false;
      if (c.pkgLinux && this.m.kind === 'linux' && !this.m.installed.has(c.pkgLinux)) return false;
      if (c.pkgOn && c.pkgOn[this.m.kind] && !this.m.installed.has(c.pkgOn[this.m.kind])) return false;
      return true;
    }
    lookup(name) {
      if (this.aliases[name] || this.funcs[name]) return true;
      return this.available(name);
    }

    // -------------------------------------------------- execution
    async exec(line) {
      if (this.old) { const why = TX.v7Check && TX.v7Check(line); if (why) { this.term.write(why); this.lastCode = 2; return; } }
      // history expansion
      if (/(^|\s)!(!|-?\d+|[A-Za-z])/.test(line) && !/^\s*echo\s+'/.test(line)) {
        const H = this.history;
        let changed = false;
        line = line.replace(/!!|!(-?\d+)|!([A-Za-z][\w-]*)/g, (all, n, pre) => {
          let r = null;
          if (all === '!!') r = H[H.length - 2];
          else if (n) { const k = parseInt(n, 10); r = k < 0 ? H[H.length - 1 + k] : H[k - 1]; }
          else if (pre) { for (let k = H.length - 2; k >= 0; k--) if (H[k].startsWith(pre)) { r = H[k]; break; } }
          if (r == null) throw Object.assign(new Error((this.flavor === 'zsh' ? 'zsh: event not found: ' : 'bash: ') + all + (this.flavor === 'zsh' ? '' : ': event not found')), { user: true });
          changed = true; return r;
        });
        if (changed) { this.term.write(line + '\n'); H[H.length - 1] = line; }
      }
      return this.run(line, this.ttyIO());
    }
    ttyIO() {
      return { tty: true, stdin: null, out: (s) => this.term.write(s), err: (s) => this.term.write(s) };
    }
    async run(src, io) {
      let ast;
      try {
        let toks = lex(src);
        toks = this.expandAliases(toks);
        const p = new Parser(toks);
        ast = p.parseList([]);
        if (p.peek()) throw new SyntaxError(`syntax error near unexpected token \`${p.peek().v}'`);
      } catch (e) {
        io.err(`${this.name}: ${e.message}\n`);
        this.lastCode = 2;
        return 2;
      }
      return this.execList(ast, io);
    }
    expandAliases(toks, depth = 0) {
      if (depth > 5) return toks;
      const out = [];
      let cmdPos = true;
      for (let k = 0; k < toks.length; k++) {
        const t = toks[k];
        if (t.t === 'w' && cmdPos && this.aliases[t.v] !== undefined && !/^\\/.test(t.v)) {
          const sub = lex(this.aliases[t.v]);
          const first = sub[0];
          if (first && first.t === 'w' && first.v === t.v) { out.push(...sub); }
          else out.push(...this.expandAliases(sub, depth + 1));
          cmdPos = false;
          continue;
        }
        out.push(t);
        if (t.t === 'op') cmdPos = ['|', '||', '&&', ';', '&', '('].includes(t.v);
        else if (t.t === 'w') cmdPos = ['then', 'do', 'else', 'elif', 'sudo', 'time', '!', '{'].includes(t.v) || (cmdPos && /^[A-Za-z_]\w*=/.test(t.v));
      }
      return out;
    }
    async execList(list, io) {
      let code = this.lastCode;
      for (const { node, op } of list.items) {
        if (op === '&') { this.startJob(node); code = 0; continue; }
        code = await this.execNode(node, io);
        this.lastCode = code;
        if (this.breakFlag || this.returnFlag) break;
      }
      return code;
    }
    startJob(node) {
      const id = this.jobs.length ? Math.max(...this.jobs.map((j) => j.id)) + 1 : 1;
      const p = this.m.spawn(this.nodeText(node).split(' ')[0] || 'job');
      const job = { id, pid: p.pid, text: this.nodeText(node), done: false };
      this.jobs.push(job);
      this.term.write(`[${id}] ${p.pid}\n`);
      const io = { tty: true, stdin: null, out: (s) => this.term.write(s), err: (s) => this.term.write(s), bg: true };
      this.execNode(node, io).then((code) => { job.done = true; job.code = code; this.m.kill(p.pid); }).catch(() => { job.done = true; });
    }
    nodeText(node) {
      if (node.type === 'simple') return node.words.join(' ');
      if (node.type === 'pipeline') return node.cmds.map((c) => this.nodeText(c)).join(' | ');
      if (node.type === 'andor') return this.nodeText(node.left) + ' ' + node.op + ' ' + this.nodeText(node.right);
      return node.type;
    }
    reportJobs() {
      const done = this.jobs.filter((j) => j.done);
      if (!done.length) return;
      done.forEach((j) => this.term.write(`[${j.id}]+  ${j.code ? 'Exit ' + j.code : 'Done'}                    ${j.text}\n`));
      this.jobs = this.jobs.filter((j) => !j.done);
    }
    async execNode(node, io) {
      switch (node.type) {
        case 'andor': {
          const l = await this.execNode(node.left, io);
          this.lastCode = l;
          if ((node.op === '&&' && l === 0) || (node.op === '||' && l !== 0)) return this.execNode(node.right, io);
          return l;
        }
        case 'pipeline': return this.execPipeline(node, io);
        case 'simple': return this.execSimple(node, io);
        case 'arith': {
          try { const v = arith(await this.expandString(node.expr), (n) => this.vars[n], (n, v) => { this.vars[n] = v; }); return v ? 0 : 1; } catch (e) { io.err(`${this.name}: ((: ${e.message}\n`); return 1; }
        }
        case 'func': this.funcs[node.name] = node.body; return 0;
        case 'group': case 'subshell': return this.withRedirs(node, io, (io2) => this.execList(node.body, io2));
        case 'if': return this.withRedirs(node, io, async (io2) => {
          for (const cl of node.clauses) {
            const c = await this.execList(cl.cond, io2);
            if (c === 0) return this.execList(cl.body, io2);
          }
          if (node.els) return this.execList(node.els, io2);
          return 0;
        });
        case 'for': return this.withRedirs(node, io, async (io2) => {
          let items = [];
          if (node.words) for (const w of node.words) items.push(...(await this.expandWord(w)));
          else items = this.params.slice();
          let code = 0;
          for (const it of items) {
            this.checkAbort();
            this.vars[node.name] = it;
            code = await this.execList(node.body, io2);
            if (this.breakFlag) { this.breakFlag = false; break; }
            if (this.returnFlag) break;
          }
          return code;
        });
        case 'while': return this.withRedirs(node, io, async (io2) => {
          let code = 0, guard = 0;
          while (true) {
            this.checkAbort();
            if (++guard > 100000) { io2.err(`${this.name}: loop stopped after 100000 iterations (TerminalEX safety limit)\n`); break; }
            const c = await this.execList(node.cond, io2);
            if (node.until ? c === 0 : c !== 0) break;
            code = await this.execList(node.body, io2);
            if (this.breakFlag) { this.breakFlag = false; break; }
            if (this.returnFlag) break;
            if (guard % 50 === 0) await new Promise((r) => setTimeout(r, 0));
          }
          return code;
        });
      }
      return 0;
    }
    checkAbort() { if (this.term.signal.aborted) throw new TX.Interrupt(); }
    async withRedirs(node, io, fn) {
      if (!node.redirs || !node.redirs.length) return fn(io);
      const r = await this.setupRedirs(node.redirs, io);
      if (r.error) return 1;
      const code = await fn(r.io);
      await r.finish();
      return code;
    }
    async execPipeline(node, io) {
      const n = node.cmds.length;
      if (n === 1) {
        const cmd = node.cmds[0];
        let code = cmd.type === 'simple' ? await this.execSimple(cmd, io) : await this.execNode(cmd, io);
        if (node.bang) code = code === 0 ? 1 : 0;
        return code;
      }
      let input = io.stdin;
      let code = 0;
      for (let k = 0; k < n; k++) {
        const last = k === n - 1;
        let buf = '';
        const sub = last ? Object.assign({}, io, { stdin: input }) : { tty: false, stdin: input, out: (s) => { buf += s; }, err: io.err };
        if (!last) sub.pipeOut = true;
        const cmd = node.cmds[k];
        code = cmd.type === 'simple' ? await this.execSimple(cmd, sub) : await this.execNode(cmd, sub);
        input = buf;
      }
      if (node.bang) code = code === 0 ? 1 : 0;
      return code;
    }
    async setupRedirs(redirs, io) {
      let outBuf = null, errBuf = null, outTarget = null, errTarget = null, outAppend = false, errAppend = false;
      let stdin = io.stdin, mergeErr = false, errToOut = false;
      for (const r of redirs) {
        if (r.op === '2>&1') { mergeErr = true; continue; }
        if (r.op === '>&2') { errToOut = true; continue; }
        const [target] = await this.expandWord(r.target);
        if (target === undefined) { io.err(`${this.name}: ambiguous redirect\n`); return { error: true }; }
        if (r.op === '<') {
          if (target === '/dev/null') { stdin = ''; continue; }
          try { stdin = this.vfs.readFile(this.resolve(target), { user: this.user }); }
          catch (e) { io.err(`${this.name}: ${target}: ${FS_MSG[e.code] || e.message}\n`); return { error: true }; }
          continue;
        }
        if (r.op === '<<<') { stdin = target + '\n'; continue; }
        const isErr = r.fd === '2';
        const both = r.op === '&>';
        const append = r.op === '>>';
        if (target !== '/dev/null') {
          const segs = this.resolve(target);
          const node = this.vfs.get(segs);
          if (node && node.t === 'd') { io.err(`${this.name}: ${target}: Is a directory\n`); return { error: true }; }
          try { if (!append || !node) this.vfs.writeFile(segs, '', { user: this.user, owner: this.user }); }
          catch (e) { io.err(`${this.name}: ${target}: ${FS_MSG[e.code] || e.message}\n`); return { error: true }; }
        }
        if (isErr || both) { errTarget = target; errAppend = true; errBuf = ''; }
        if (!isErr || both) { outTarget = target; outAppend = true; outBuf = ''; }
        void append;
      }
      const nio = Object.assign({}, io, { stdin });
      if (outTarget !== null) { nio.out = (s) => { outBuf += s; }; nio.tty = false; }
      if (errTarget !== null) nio.err = (s) => { errBuf += s; };
      if (mergeErr) nio.err = nio.out;
      if (errToOut) nio.out = nio.err;
      const finish = async () => {
        const w = (t, b) => { if (t === '/dev/null' || b === null) return; try { this.vfs.writeFile(this.resolve(t), b, { append: true, user: this.user, owner: this.user }); } catch (e) { io.err(`${this.name}: ${t}: ${FS_MSG[e.code] || e.message}\n`); } };
        if (outTarget !== null && errTarget === outTarget) { w(outTarget, outBuf + errBuf); return; }
        if (outTarget !== null) w(outTarget, outBuf);
        if (errTarget !== null) w(errTarget, errBuf);
      };
      return { io: nio, finish };
    }

    async execSimple(node, io) {
      // expand assignments and words
      let argv = [];
      try {
        for (const w of node.words) argv.push(...(await this.expandWord(w)));
      } catch (e) {
        if (e.interrupt) throw e;
        io.err(`${this.name}: ${e.message}\n`); return 1;
      }
      const assigns = [];
      for (const a of node.assigns) {
        const eq = a.indexOf('=');
        const plus = a[eq - 1] === '+';
        const name = a.slice(0, plus ? eq - 1 : eq);
        const val = (await this.expandWord(a.slice(eq + 1), { noSplit: true, noGlob: true })).join(' ');
        assigns.push([name, plus ? (this.vars[name] || '') + val : val]);
      }
      if (!argv.length) {
        assigns.forEach(([k, v]) => { this.vars[k] = v; });
        if (node.redirs.length) { const r = await this.setupRedirs(node.redirs, io); if (r.error) return 1; await r.finish(); }
        return 0;
      }
      if (node.heredoc) {
        const body = await this.readHeredoc(node.heredoc, io);
        io = Object.assign({}, io, { stdin: body });
      }
      let saved = null;
      if (assigns.length) { saved = assigns.map(([k]) => [k, this.vars[k]]); assigns.forEach(([k, v]) => { this.vars[k] = v; }); }
      let r = { io, finish: async () => {} };
      if (node.redirs.length) { r = await this.setupRedirs(node.redirs, io); if (r.error) return 1; }
      let code;
      try {
        code = await this.invoke(argv, r.io);
      } finally {
        if (saved) saved.forEach(([k, v]) => { if (v === undefined) delete this.vars[k]; else this.vars[k] = v; });
      }
      await r.finish();
      return code;
    }
    async readHeredoc(tag, io) {
      if (this.scriptLines) {
        const lines = [];
        while (this.scriptLines.length) { const l = this.scriptLines.shift(); if (l.trim() === tag) break; lines.push(l); }
        return this.expandString(lines.join('\n') + '\n');
      }
      const lines = [];
      while (true) {
        const l = await this.term.readLine({ prompt: '> ' });
        if (l === null) throw new TX.Interrupt();
        if (l.trim() === tag) break;
        lines.push(l);
      }
      void io;
      return this.expandString(lines.join('\n') + '\n');
    }

    // run a command vector
    async invoke(argv, io, opts = {}) {
      const name = argv[0], args = argv.slice(1);
      if (this.funcs[name] && !opts.noFunc) {
        const savedParams = this.params;
        this.params = args;
        try { const c = await this.execList(this.funcs[name], io); this.returnFlag = false; return this.returnCode != null ? (() => { const r = this.returnCode; this.returnCode = null; return r; })() : c; }
        finally { this.params = savedParams; }
      }
      if (name.includes('/')) return this.runPath(name, args, io);
      if (io.bg && /^(nano|pico|vim?|view|nvim|top|htop|watch|less|more|man|sl|cmatrix|python3?|node|bc)$/.test(name)) { io.err(`\n[${this.jobs.length}]+  Stopped                 ${argv.join(' ')}\n`); return 148; }
      const cmd = TX.posixCmds[name];
      if (!cmd || !this.available(name)) {
        // a script file in a PATH folder ("" = the current folder, as in PATH=:/bin)
        if (this.flavor !== 'gitbash') {
          for (const dir of String(this.vars.PATH || '').split(':')) {
            const segs = (dir === '' || dir === '.' ? this.cwd : this.resolve(dir)).concat(name);
            const n = this.vfs.get(segs);
            if (n && n.t === 'f' && (n.mode & 0o111) && !n.sz) return this.runPath(this.fmt(segs), args, io);
          }
        }
        const hint = this.notFound(name);
        io.err(hint);
        return 127;
      }
      const ctx = this.makeCtx(name, args, io, opts);
      try {
        const res = await cmd.fn(ctx);
        return typeof res === 'number' ? res : 0;
      } catch (e) {
        if (e.interrupt) { if (!io.pipeOut) io.out(''); throw e; }
        if (e.exitShell) throw e;
        if (e instanceof TX.FsError) { io.err(`${name}: ${e.path ? this.displayErrPath(e.path) + ': ' : ''}${FS_MSG[e.code] || e.message}\n`); return 1; }
        console.error(e);
        io.err(`${name}: ${e.message}\n`);
        return 1;
      }
    }
    displayErrPath(p) { return p.startsWith('/') ? p : p; }
    notFound(name) {
      const pk = TX.posixCmds[name] && (TX.posixCmds[name].pkg || (this.m.kind === 'linux' && TX.posixCmds[name].pkgLinux));
      if (this.flavor === 'v7') return `${name}: not found\n`;
      if (this.flavor === 'ksh') return `ksh: ${name}: not found [No such file or directory]\n`;
      if (this.flavor === 'sh') { const s2 = this.m.def.pkgHint && this.m.def.pkgHint(name); return `sh: ${name}: not found\n` + (s2 || ''); }
      if (this.flavor === 'zsh') {
        if (pk) return `zsh: command not found: ${name}\n${C.dim(`(hint: install it with  brew install ${pk})`)}\n`;
        return `zsh: command not found: ${name}\n`;
      }
      if (this.m.kind === 'linux' && pk) return `Command '${name}' not found, but can be installed with:\nsudo apt install ${pk}\n`;
      const known = this.commandNames().concat(Object.keys(this.aliases));
      const s = TX.suggest(name, known);
      if (this.m.kind === 'linux' && s) return `Command '${name}' not found, did you mean:\n  command '${s}' from deb ${s}\nTry: sudo apt install <deb name>\n`;
      const winHint = this.flavor === 'gitbash' && TX.cmdNames && TX.cmdNames.includes(name.toLowerCase()) ? C.dim(`\n(hint: '${name}' is a cmd.exe command. Git Bash speaks Linux — try the bash equivalent, or run  cmd //c ${name})`) : '';
      return `bash: ${name}: command not found${winHint}\n`;
    }
    async runPath(p, args, io) {
      const segs = this.resolve(p);
      const node = this.vfs.get(segs);
      if (!node) { io.err(`${this.name}: ${p}: No such file or directory\n`); return 127; }
      if (node.t === 'd') { io.err(`${this.name}: ${p}: Is a directory\n`); return 126; }
      const exe = (node.mode & 0o111) || this.flavor === 'gitbash';
      if (!exe) { io.err(`${this.name}: ${p}: Permission denied\n`); return 126; }
      const content = this.vfs.content(node);
      if (/\.(exe|com)$/i.test(p)) { io.err(`${this.name}: ${p}: cannot run Windows programs in TerminalEX\n`); return 126; }
      return this.runScript(content, [p].concat(args), io);
    }
    async runScript(content, argv, io) {
      const savedParams = this.params, saved0 = this.vars['0'];
      this.params = argv.slice(1);
      this.vars['0'] = argv[0];
      try {
        const src = content.replace(/^#!.*\n/, '');
        return await this.run(src, io);
      } finally {
        this.params = savedParams; this.vars['0'] = saved0;
      }
    }
    makeCtx(name, args, io, opts = {}) {
      const sh = this;
      const ctx = {
        sh, name, args, io,
        stdin: io.stdin, tty: io.tty && !io.pipeOut, term: this.term, m: this.m, vfs: this.vfs,
        user: opts.user || this.user,
        signal: this.term.signal,
        out: (s) => io.out(s),
        outln: (s = '') => io.out(s + '\n'),
        err: (s) => io.err(s),
        fail(msg, code = 1) { io.err(name + ': ' + msg + '\n'); return code; },
        path: (p) => sh.resolve(p),
        fmt: (segs) => sh.fmt(segs),
        sleep: (ms) => TX.sleep(ms, sh.term.signal),
        abort() { if (sh.term.signal.aborted) throw new TX.Interrupt(); },
        async readLine(prompt, o = {}) { const l = await sh.term.readLine(Object.assign({ prompt }, o)); if (l === null) throw new TX.Interrupt(); return l; },
        // read stdin or given files; cb(text, label)
        input(files) {
          if (!files.length || (files.length === 1 && files[0] === '-')) return [{ name: '-', text: io.stdin == null ? '' : io.stdin }];
          return files.map((f) => {
            if (f === '-') return { name: '-', text: io.stdin || '' };
            try { return { name: f, text: sh.vfs.readFile(sh.resolve(f), { user: ctx.user }) }; }
            catch (e) { io.err(`${name}: ${f}: ${FS_MSG[e.code] || e.message}\n`); return { name: f, text: null }; }
          });
        },
        cols: this.term.cols,
      };
      return ctx;
    }

    // -------------------------------------------------- expansion
    getVar(name) {
      if (/^\d$/.test(name)) return name === '0' ? (this.vars['0'] || (this.flavor === 'zsh' ? 'zsh' : this.flavor === 'ksh' ? '-ksh' : this.flavor === 'bash' || this.flavor === 'gitbash' ? 'bash' : 'sh')) : (this.params[+name - 1] ?? '');
      switch (name) {
        case '?': return String(this.lastCode);
        case '$': return String(this.session.pid || 2230);
        case '#': return String(this.params.length);
        case '@': case '*': return this.params.join(' ');
        case 'RANDOM': return String(Math.floor(Math.random() * 32768));
        case 'SECONDS': return String(Math.floor((Date.now() - this.startTime) / 1000));
        case 'PWD': return this.fmt(this.cwd);
        case '!': return String(this.jobs.length ? this.jobs[this.jobs.length - 1].pid : '');
      }
      return this.vars[name] ?? '';
    }
    async cmdSubst(src) {
      let buf = '';
      const io = { tty: false, stdin: null, out: (s) => { buf += s; }, err: (s) => this.term.write(s) };
      const saved = this.lastCode;
      await this.run(src, io);
      void saved;
      return buf.replace(/\n+$/, '');
    }
    async expandParam(expr) {
      // ${...} forms
      let m;
      if ((m = /^#([A-Za-z_]\w*|[@*])$/.exec(expr))) return String(m[1] === '@' || m[1] === '*' ? this.params.length : this.getVar(m[1]).length);
      if ((m = /^([A-Za-z_]\w*|\d|[@*?#$])(?::?([-=+?])(.*))?$/s.exec(expr))) {
        const v = this.getVar(m[1]);
        if (!m[2]) return v;
        const word = await this.expandString(m[3]);
        const colon = expr.includes(':' + m[2]);
        const unset = colon ? v === '' : this.vars[m[1]] === undefined;
        if (m[2] === '-') return unset ? word : v;
        if (m[2] === '=') { if (unset) { this.vars[m[1]] = word; return word; } return v; }
        if (m[2] === '+') return unset ? '' : word;
        if (m[2] === '?') { if (unset) throw new Error(`${m[1]}: ${word || 'parameter null or not set'}`); return v; }
      }
      if ((m = /^([A-Za-z_]\w*):(-?\d+)(?::(\d+))?$/.exec(expr))) { const v = this.getVar(m[1]); let s = parseInt(m[2], 10); if (s < 0) s = Math.max(0, v.length + s); return m[3] !== undefined ? v.substr(s, parseInt(m[3], 10)) : v.slice(s); }
      if ((m = /^([A-Za-z_]\w*)(\/\/?)([^/]*)\/?(.*)$/.exec(expr))) { const v = this.getVar(m[1]); const re = TX.globToRegex(m[3]).source.slice(1, -1).replace(/\[\^\/\]\*/g, '.*'); return v.replace(new RegExp(re, m[2] === '//' ? 'g' : ''), m[4]); }
      if ((m = /^([A-Za-z_]\w*)(##?|%%?)(.*)$/.exec(expr))) {
        const v = this.getVar(m[1]); const pat = TX.globToRegex(m[3]).source.slice(1, -1).replace(/\[\^\/\]\*/g, m[2].length === 2 ? '.*' : '.*?');
        if (m[2][0] === '#') return v.replace(new RegExp('^' + pat), '');
        const greedy = m[2].length === 2;
        for (let k = greedy ? 0 : v.length; greedy ? k <= v.length : k >= 0; greedy ? k++ : k--) { if (new RegExp('^' + pat.replace(/\.\*\?/g, '.*') + '$').test(v.slice(k))) return v.slice(0, k); }
        return v;
      }
      if ((m = /^([A-Za-z_]\w*)(\^\^|,,)$/.exec(expr))) { const v = this.getVar(m[1]); return m[2] === '^^' ? v.toUpperCase() : v.toLowerCase(); }
      throw new Error(`\${${expr}}: bad substitution`);
    }
    // expand inside double quotes / heredoc (no splitting, no glob)
    async expandString(s) {
      let out = '';
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '\\' && '$`"\\'.includes(s[i + 1])) { out += s[i + 1]; i++; continue; }
        if (ch === '$') { const r = await this.readDollar(s, i); out += r.value; i = r.end - 1; continue; }
        if (ch === '`') { const j = s.indexOf('`', i + 1); out += await this.cmdSubst(s.slice(i + 1, j)); i = j; continue; }
        out += ch;
      }
      return out;
    }
    async readDollar(s, i) {
      // returns {value, end}
      const n = s[i + 1];
      if (n === '(' && s[i + 2] === '(') {
        let depth = 2, j = i + 3;
        for (; j < s.length; j++) { if (s[j] === '(') depth++; else if (s[j] === ')') { depth--; if (depth === 0) break; } }
        const expr = s.slice(i + 3, j - 1);
        const v = arith(await this.expandString(expr), (k) => this.getVar(k), (k, v2) => { this.vars[k] = v2; });
        return { value: String(v), end: j + 1 };
      }
      if (n === '(') {
        let depth = 1, j = i + 2, q = null;
        for (; j < s.length; j++) {
          const c = s[j];
          if (q) { if (c === q) q = null; continue; }
          if (c === "'" || c === '"') { q = c; continue; }
          if (c === '(') depth++; else if (c === ')') { depth--; if (!depth) break; }
        }
        return { value: await this.cmdSubst(s.slice(i + 2, j)), end: j + 1 };
      }
      if (n === '{') {
        let depth = 1, j = i + 2;
        for (; j < s.length; j++) { if (s[j] === '{') depth++; else if (s[j] === '}') { depth--; if (!depth) break; } }
        return { value: await this.expandParam(s.slice(i + 2, j)), end: j + 1 };
      }
      if (n && /[?$#@*!0-9]/.test(n)) return { value: this.getVar(n), end: i + 2 };
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i + 1));
      if (m) return { value: this.getVar(m[0]), end: i + 1 + m[0].length };
      return { value: '$', end: i + 1 };
    }
    braceExpand(w) {
      // find first unquoted {a,b} or {1..5}
      let q = null;
      for (let i = 0; i < w.length; i++) {
        const c = w[i];
        if (c === '\\') { i++; continue; }
        if (q) { if (c === q) q = null; continue; }
        if (c === "'" || c === '"') { q = c; continue; }
        if (c === '{' && w[i - 1] !== '$') {
          let depth = 1, j = i + 1;
          for (; j < w.length; j++) { if (w[j] === '{') depth++; else if (w[j] === '}') { depth--; if (!depth) break; } }
          if (j >= w.length) return [w];
          const inner = w.slice(i + 1, j), pre = w.slice(0, i), post = w.slice(j + 1);
          let m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(\d+))?$/.exec(inner);
          let parts = null;
          if (m) {
            const a = +m[1], b = +m[2], st = +(m[3] || 1); parts = [];
            const pad = (m[1].startsWith('0') && m[1].length > 1) ? m[1].length : 0;
            for (let k = a; a <= b ? k <= b : k >= b; k += a <= b ? st : -st) { parts.push(pad ? String(k).padStart(pad, '0') : String(k)); if (parts.length > 10000) break; }
          } else if ((m = /^([a-zA-Z])\.\.([a-zA-Z])$/.exec(inner))) {
            parts = []; const a = m[1].charCodeAt(0), b = m[2].charCodeAt(0);
            for (let k = a; a <= b ? k <= b : k >= b; k += a <= b ? 1 : -1) parts.push(String.fromCharCode(k));
          } else {
            // split on top-level commas
            const items = []; let d = 0, cur = '';
            for (const c of inner) { if (c === '{') d++; if (c === '}') d--; if (c === ',' && d === 0) { items.push(cur); cur = ''; } else cur += c; }
            items.push(cur);
            if (items.length > 1) parts = items;
          }
          if (!parts) { const rest = this.braceExpand(post); return rest.map((r) => pre + '{' + inner + '}' + r); }
          const out = [];
          for (const p of parts) out.push(...this.braceExpand(pre + p + post));
          return out;
        }
      }
      return [w];
    }
    // full word expansion -> array of fields
    async expandWord(raw, opts = {}) {
      const words = opts.noBrace ? [raw] : this.braceExpand(raw);
      const result = [];
      for (const w of words) result.push(...(await this.expandOne(w, opts)));
      return result;
    }
    async expandOne(w, opts) {
      // fields: array of arrays of {s, q(quoted), g(glob-active)}
      const fields = [[]];
      let hadQuoted = false, hadExpansion = false;
      const add = (s, quoted) => { if (s !== '') fields[fields.length - 1].push({ s, q: quoted }); };
      const addSplit = (s) => {
        hadExpansion = true;
        if (opts.noSplit) { add(s, false); return; }
        const parts = s.split(/[ \t\n]+/);
        parts.forEach((p, idx) => {
          if (idx > 0) fields.push([]);
          add(p, false);
        });
      };
      let i = 0;
      if (w[0] === '~' && (w.length === 1 || w[1] === '/')) { add(this.fmt(this.home), true); i = 1; }
      else if (w.startsWith('~root')) { add('/root', true); i = 5; }
      for (; i < w.length; i++) {
        const ch = w[i];
        if (ch === '\\') { add(w[i + 1] || '', true); i++; hadQuoted = true; continue; }
        if (ch === "'") { const j = w.indexOf("'", i + 1); add(w.slice(i + 1, j), true); hadQuoted = true; i = j; continue; }
        if (ch === '"') {
          let j = i + 1, inner = '';
          while (j < w.length && w[j] !== '"') {
            if (w[j] === '\\') { inner += w[j] + (w[j + 1] || ''); j += 2; continue; }
            if (w[j] === '$' && w[j + 1] === '(') { let d = 0; const st = j; for (; j < w.length; j++) { if (w[j] === '(') d++; else if (w[j] === ')') { d--; if (!d) break; } } inner += w.slice(st, j + 1); j++; continue; }
            inner += w[j]; j++;
          }
          add(await this.expandString(inner), true); hadQuoted = true; i = j; continue;
        }
        if (ch === '$' && i + 1 < w.length) {
          const r = await this.readDollar(w, i);
          if (w[i + 1] === '@' && false) { /* not reached */ }
          addSplit(r.value); i = r.end - 1; continue;
        }
        if (ch === '`') { const j = w.indexOf('`', i + 1); addSplit(await this.cmdSubst(w.slice(i + 1, j))); i = j; continue; }
        add(ch, false);
      }
      const out = [];
      for (const f of fields) {
        if (!f.length) { if (hadQuoted && fields.length === 1) out.push(''); continue; }
        const str = f.map((p) => p.s).join('');
        const globbable = !opts.noGlob && f.some((p) => !p.q && TX.hasGlob(p.s));
        if (globbable) {
          const pat = f.map((p) => (p.q ? p.s.replace(/[*?[]/g, '[$&]') : p.s)).join('');
          const matches = this.globExpand(pat);
          if (matches.length) { out.push(...matches); continue; }
          if (this.flavor === 'zsh') throw new Error('no matches found: ' + str);
        }
        out.push(str);
      }
      void hadExpansion;
      return out;
    }
    globExpand(pat) {
      const parts = pat.split('/');
      let k = parts.findIndex((p) => TX.hasGlob(p));
      if (k < 0) return [];
      const prefix = parts.slice(0, k).join('/');
      const abs = pat.startsWith('/');
      const baseStr = abs ? (prefix || '/') : (prefix || '.');
      const baseSegs = this.paths.parse(baseStr, this.cwd, this.home);
      const res = this.vfs.glob(baseSegs, parts.slice(k).filter((x) => x !== ''), false);
      return res.map((segs) => {
        const tail = segs.slice(baseSegs.length).join('/');
        if (abs) return (prefix === '' ? '' : prefix) + '/' + tail;
        return prefix ? prefix + '/' + tail : tail;
      }).sort();
    }
  }

  function flavor2title(sh) {
    if (sh.m.def.title) return sh.m.def.title(sh);
    return (sh.flavor === 'gitbash' ? 'MINGW64:' + sh.fmt(sh.cwd) : sh.user + '@' + sh.m.net.hostname + ': ' + sh.pretty(sh.cwd));
  }

  TX.PosixShell = PosixShell;
  TX.posixLex = lex;
  TX.posixNeedsMore = needsMore;
  TX.posixCmds = TX.posixCmds || {};
})();
