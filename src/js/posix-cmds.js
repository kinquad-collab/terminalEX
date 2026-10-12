/* TerminalEX — POSIX commands: shell builtins, files, and text processing */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const FS_MSG = TX.FS_MSG;
  const cmds = (TX.posixCmds = TX.posixCmds || {});
  const def = (names, fn, opts = {}) => names.split(' ').forEach((n) => { cmds[n] = Object.assign({ fn }, opts); });
  TX.defPosix = def;
  const getopt = (...a) => TX.getopt(...a);
  const lines = TX.splitLines;

  // ------------------------------------------------------------------ helpers
  function permStr(node) {
    const t = node.t === 'd' ? 'd' : node.t === 'l' ? 'l' : '-';
    const m = node.mode;
    let s = '';
    for (const sh of [6, 3, 0]) s += ((m >> sh) & 4 ? 'r' : '-') + ((m >> sh) & 2 ? 'w' : '-') + ((m >> sh) & 1 ? 'x' : '-');
    return t + s;
  }
  TX.permStr = permStr;
  function isExec(node, sh) {
    if (node.t !== 'f') return false;
    if (sh && sh.flavor === 'gitbash') return /\.(exe|sh|bat|cmd|com)$/i.test(node.name);
    return !!(node.mode & 0o111);
  }
  function colorName(node, name, sh, target) {
    const n = target || node;
    if (node.t === 'l') return C.style(['bold', 'cyan'], name);
    if (n.t === 'd') return (n.mode & 0o002) ? '\x1b[30;42m' + name + '\x1b[0m' : C.style(['bold', 'blue'], name);
    if (isExec(n, sh)) return C.style(['bold', 'green'], name);
    if (/\.(tar|tgz|gz|zip|bz2|xz|7z|deb|rpm|iso|dmg|rar)$/i.test(name)) return C.style(['bold', 'red'], name);
    if (/\.(png|jpe?g|gif|bmp|svg|webp|mp4|mkv|mov|avi)$/i.test(name)) return C.style(['bold', 'magenta'], name);
    if (/\.(mp3|wav|flac|m4a|ogg|m3u)$/i.test(name)) return C.cyan(name);
    return name;
  }
  TX.colorName = colorName;
  function owner(sh, node) {
    if (sh.flavor === 'gitbash') return ['student', '197121'];
    if (sh.m.kind === 'mac') return [node.uid === 'root' ? 'root' : node.uid, node.uid === 'root' ? 'wheel' : (node.gid === node.uid ? 'staff' : node.gid)];
    return [node.uid, node.gid];
  }
  function nlinks(node) { if (node.t !== 'd') return 1; return 2 + Object.values(node.ch).filter((c) => c.t === 'd').length; }
  function fsErr(c, verb, p, e) {
    if (!(e instanceof TX.FsError)) throw e;
    if (c.sh.flavor === 'zsh' && c.m.kind === 'mac') return c.err(`${c.name}: ${p}: ${FS_MSG[e.code]}\n`);
    c.err(`${c.name}: ${verb ? verb + ' ' : ''}'${p}': ${FS_MSG[e.code] || e.message}\n`);
  }
  TX.fsErr = fsErr;
  function canEnter(sh, node, user) {
    if (user === 'root' || !node) return true;
    if (node.uid === user) return true;
    if (sh.flavor === 'gitbash') return true;
    return !!(node.mode & 0o001) || (node.gid === user && (node.mode & 0o010));
  }
  TX.canEnter = canEnter;
  // BRE -> JS regex source
  function bre(src, extended) {
    if (extended) return src;
    let out = '';
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '\\' && i + 1 < src.length) {
        const n = src[i + 1];
        if ('(){}|+?'.includes(n)) { out += n; i++; continue; }
        out += ch + n; i++; continue;
      }
      if ('(){}|+?'.includes(ch)) { out += '\\' + ch; continue; }
      out += ch;
    }
    return out;
  }
  function posixClasses(s) {
    return s.replace(/\[:alpha:\]/g, 'a-zA-Z').replace(/\[:digit:\]/g, '0-9').replace(/\[:alnum:\]/g, 'a-zA-Z0-9').replace(/\[:upper:\]/g, 'A-Z').replace(/\[:lower:\]/g, 'a-z').replace(/\[:space:\]/g, '\\s').replace(/\[:punct:\]/g, '!-\\/:-@\\[-`{-~');
  }
  TX.bre = (s, e) => posixClasses(bre(s, e));

  // ------------------------------------------------------------------ builtins
  def('cd', (c) => {
    const sh = c.sh;
    let target = c.args.filter((a) => a !== '-P' && a !== '-L')[0];
    if (c.args.length > 2 || (c.args.length === 2 && !c.args[0].startsWith('-'))) return c.fail('too many arguments');
    if (target === undefined || target === '') target = sh.fmt(sh.home);
    if (target === '-') { if (!sh.vars.OLDPWD) return c.fail('OLDPWD not set'); target = sh.vars.OLDPWD; c.outln(target); }
    const segs = sh.resolve(target);
    const node = sh.vfs.get(segs);
    const zsh = sh.flavor === 'zsh';
    if (!node) { c.err(zsh ? `cd: no such file or directory: ${target}\n` : `${c.sh.name}: cd: ${target}: No such file or directory\n`); return 1; }
    if (node.t !== 'd') { c.err(zsh ? `cd: not a directory: ${target}\n` : `${c.sh.name}: cd: ${target}: Not a directory\n`); return 1; }
    if (!canEnter(sh, node, c.user)) { c.err(zsh ? `cd: permission denied: ${target}\n` : `${c.sh.name}: cd: ${target}: Permission denied\n`); return 1; }
    sh.vars.OLDPWD = sh.fmt(sh.cwd);
    sh.cwd = segs;
    sh.vars.PWD = sh.fmt(segs);
    return 0;
  });
  def('pwd', (c) => { c.outln(c.sh.fmt(c.sh.cwd)); });
  function escapes(s) {
    return s.replace(/\\(0[0-7]{0,3}|x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|e|[abfnrtv\\c])/g, (all, k) => {
      switch (k[0]) {
        case 'n': return '\n'; case 't': return '\t'; case 'r': return '\r'; case 'a': return '\x07'; case 'b': return '\b'; case 'f': return '\f'; case 'v': return '\v'; case '\\': return '\\'; case 'e': return '\x1b'; case 'c': return '\u0000STOP';
        case '0': return String.fromCharCode(parseInt(k.slice(1) || '0', 8));
        case 'x': return String.fromCharCode(parseInt(k.slice(1), 16));
        case 'u': return String.fromCharCode(parseInt(k.slice(1), 16));
      }
      return all;
    });
  }
  TX.escapes = escapes;
  def('echo', (c) => {
    let a = c.args.slice(), nl = true, esc = c.sh.flavor === 'zsh';
    while (a.length && /^-[neE]+$/.test(a[0])) { const f = a.shift(); if (f.includes('n')) nl = false; if (f.includes('e')) esc = true; if (f.includes('E')) esc = false; }
    let s = a.join(' ');
    if (esc) { s = escapes(s); const k = s.indexOf('\u0000STOP'); if (k >= 0) { s = s.slice(0, k); nl = false; } }
    c.out(s + (nl ? '\n' : ''));
  });
  function sprintf(fmt, args) {
    let out = '', ai = 0, used = false;
    const run = () => {
      used = false;
      out += escapes(fmt).replace(/%([-+ 0#]*)(\d+|\*)?(?:\.(\d+))?([sdifxXoceEgGb%])/g, (all, fl, w, p, t) => {
        if (t === '%') return '%';
        used = true;
        let v = args[ai++];
        if (v === undefined) v = t === 's' || t === 'b' ? '' : '0';
        let s;
        switch (t) {
          case 'd': case 'i': s = String(Math.trunc(Number(v) || 0)); break;
          case 'f': s = (Number(v) || 0).toFixed(p === undefined ? 6 : +p); break;
          case 'e': case 'E': s = (Number(v) || 0).toExponential(p === undefined ? 6 : +p); if (t === 'E') s = s.toUpperCase(); break;
          case 'g': case 'G': s = String(Number(v) || 0); break;
          case 'x': s = (Math.trunc(Number(v)) >>> 0).toString(16); break; case 'X': s = (Math.trunc(Number(v)) >>> 0).toString(16).toUpperCase(); break;
          case 'o': s = (Math.trunc(Number(v)) >>> 0).toString(8); break;
          case 'c': s = String(v)[0] || ''; break;
          case 'b': s = escapes(String(v)); break;
          default: s = String(v); if (p !== undefined) s = s.slice(0, +p);
        }
        if (w) { const n = +w; if (fl.includes('-')) s = s.padEnd(n); else if (fl.includes('0') && t !== 's') s = s.padStart(n, '0'); else s = s.padStart(n); }
        return s;
      });
    };
    run();
    while (used && ai < args.length) run();
    return out;
  }
  TX.sprintf = sprintf;
  def('printf', (c) => { if (!c.args.length) return c.fail('usage: printf [-v var] format [arguments]', 2); c.out(sprintf(c.args[0], c.args.slice(1))); });
  def('export declare typeset', (c) => {
    const sh = c.sh;
    const args = c.args.filter((a) => !/^-[a-zA-Z]+$/.test(a));
    if (!args.length) {
      Object.keys(sh.vars).sort().forEach((k) => { if (c.name !== 'export' || sh.exported.has(k)) c.outln(`declare -x ${k}="${sh.vars[k]}"`); });
      return 0;
    }
    for (const a of args) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/s.exec(a);
      if (!m) { c.err(`${c.sh.name}: export: \`${a}': not a valid identifier\n`); return 1; }
      if (m[2] !== undefined) sh.vars[m[1]] = m[2];
      else if (sh.vars[m[1]] === undefined) sh.vars[m[1]] = '';
      if (c.name === 'export') sh.exported.add(m[1]);
    }
  });
  def('local readonly', (c) => { c.args.forEach((a) => { const m = /^([A-Za-z_]\w*)(?:=(.*))?$/s.exec(a); if (m) c.sh.vars[m[1]] = m[2] || ''; }); });
  def('unset', (c) => { c.args.filter((a) => !a.startsWith('-')).forEach((a) => { delete c.sh.vars[a]; delete c.sh.funcs[a]; c.sh.exported.delete(a); }); });
  def('set', (c) => {
    if (!c.args.length) { Object.keys(c.sh.vars).sort().forEach((k) => c.outln(`${k}='${c.sh.vars[k]}'`)); return; }
    if (c.args[0] === '--') { c.sh.params = c.args.slice(1); return; }
    if (!c.args[0].startsWith('-') && !c.args[0].startsWith('+')) c.sh.params = c.args.slice();
  });
  def('env printenv', (c) => {
    const sh = c.sh;
    if (c.name === 'printenv' && c.args.length) { let code = 1; c.args.forEach((k) => { if (sh.vars[k] !== undefined) { c.outln(sh.vars[k]); code = 0; } }); return code; }
    const assigns = [], rest = [];
    for (const a of c.args) { if (!rest.length && /^[A-Za-z_]\w*=/.test(a)) assigns.push(a); else rest.push(a); }
    if (rest.length && c.name === 'env') {
      const saved = {};
      assigns.forEach((a) => { const [k, v] = a.split(/=(.*)/s); saved[k] = sh.vars[k]; sh.vars[k] = v; });
      return sh.invoke(rest, c.io).finally(() => Object.keys(saved).forEach((k) => { if (saved[k] === undefined) delete sh.vars[k]; else sh.vars[k] = saved[k]; }));
    }
    [...sh.exported].sort().forEach((k) => { if (sh.vars[k] !== undefined) c.outln(k + '=' + sh.vars[k]); });
    assigns.forEach((a) => c.outln(a));
  });
  def('alias', (c) => {
    const sh = c.sh;
    if (!c.args.length || c.args[0] === '-p') { Object.keys(sh.aliases).sort().forEach((k) => c.outln(`alias ${k}='${sh.aliases[k]}'`)); return; }
    let code = 0;
    for (const a of c.args) {
      const eq = a.indexOf('=');
      if (eq < 0) { if (sh.aliases[a] !== undefined) c.outln(`alias ${a}='${sh.aliases[a]}'`); else { c.err(`${c.sh.name}: alias: ${a}: not found\n`); code = 1; } continue; }
      sh.aliases[a.slice(0, eq)] = a.slice(eq + 1);
    }
    return code;
  });
  def('unalias', (c) => { if (c.args[0] === '-a') { c.sh.aliases = {}; return; } c.args.forEach((a) => { if (c.sh.aliases[a] === undefined) c.err(`${c.sh.name}: unalias: ${a}: not found\n`); delete c.sh.aliases[a]; }); });
  def('history', (c) => {
    const H = c.sh.history;
    if (c.args[0] === '-c') { H.length = 0; return; }
    let n = parseInt(c.args[0], 10);
    const start = isNaN(n) ? 0 : Math.max(0, H.length - n);
    for (let i = start; i < H.length; i++) c.outln(String(i + 1).padStart(5) + '  ' + H[i]);
  });
  def('exit logout', (c) => { throw new TX.ExitShell(parseInt(c.args[0], 10) || 0); });
  def('source .', async (c) => {
    if (!c.args.length) return c.fail('filename argument required', 2);
    let text;
    try { text = c.vfs.readFile(c.path(c.args[0]), { user: c.user }); } catch (e) { c.err(`${c.sh.name}: ${c.args[0]}: ${FS_MSG[e.code]}\n`); return 1; }
    const saved = c.sh.params;
    c.sh.params = c.args.slice(1);
    try { return await c.sh.run(text.replace(/^#!.*\n/, ''), c.io); } finally { c.sh.params = saved; }
  });
  def('bash sh zsh', async (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    if (args[0] === '-c') return sh.run(args[1] || '', c.io);
    if (args[0] === '--version') { c.outln(c.name === 'zsh' ? 'zsh 5.9 (arm64-apple-darwin24.0)' : 'GNU bash, version 5.2.21(1)-release (x86_64-pc-linux-gnu)\nCopyright (C) 2022 Free Software Foundation, Inc.'); return; }
    if (args.length) {
      let text;
      try { text = c.vfs.readFile(c.path(args[0]), { user: c.user }); } catch (e) { c.err(`${c.name}: ${args[0]}: ${FS_MSG[e.code]}\n`); return 127; }
      return sh.runScript(text, args, c.io);
    }
    if (c.stdin != null) return sh.run(c.stdin, c.io);
    const flavor = c.name === 'zsh' ? 'zsh' : sh.flavor;
    sh.session.pushShell(new TX.PosixShell(sh.session, sh.m, flavor, { user: sh.user, cwd: sh.cwd }));
  }, { only: ['linux', 'mac', 'gitbash'] });
  def('type', (c) => {
    let code = 0;
    for (const n of c.args) {
      if (c.sh.aliases[n] !== undefined) c.outln(`${n} is aliased to \`${c.sh.aliases[n]}'`);
      else if (c.sh.funcs[n]) c.outln(`${n} is a function`);
      else if (['cd', 'echo', 'export', 'alias', 'pwd', 'history', 'exit', 'source', 'type', 'set', 'unset', 'read', 'test', 'printf', 'kill', 'jobs', 'true', 'false'].includes(n)) c.outln(`${n} is a shell builtin`);
      else if (['if', 'then', 'else', 'fi', 'for', 'while', 'do', 'done'].includes(n)) c.outln(`${n} is a shell keyword`);
      else if (c.sh.available(n)) c.outln(`${n} is ${binPath(c.sh, n)}`);
      else { c.err(`${c.sh.name}: type: ${n}: not found\n`); code = 1; }
    }
    return code;
  });
  function binPath(sh, n) {
    if (sh.flavor === 'gitbash') return '/usr/bin/' + n;
    if (sh.m.kind === 'mac') return (TX.posixCmds[n] && TX.posixCmds[n].pkg && !['git', 'curl', 'nano', 'vim', 'python3'].includes(TX.posixCmds[n].pkg) ? '/opt/homebrew/bin/' : '/usr/bin/') + n;
    return '/usr/bin/' + n;
  }
  TX.binPath = binPath;
  def('which', (c) => {
    let code = 0;
    for (const n of c.args.filter((a) => !a.startsWith('-'))) {
      if (c.sh.available(n)) c.outln(binPath(c.sh, n));
      else { code = 1; if (c.sh.flavor === 'zsh') c.outln(n + ' not found'); else if (c.sh.flavor === 'gitbash') c.err(`which: no ${n} in (${c.sh.vars.PATH})\n`); }
    }
    return code;
  });
  def('whereis', (c) => { c.args.forEach((n) => c.outln(n + ':' + (c.sh.available(n) ? ' ' + binPath(c.sh, n) + ' /usr/share/man/man1/' + n + '.1.gz' : ''))); });
  def('command', (c) => {
    if (c.args[0] === '-v') { const n = c.args[1]; if (c.sh.lookup(n)) { c.outln(c.sh.aliases[n] ? `alias ${n}='${c.sh.aliases[n]}'` : binPath(c.sh, n)); return 0; } return 1; }
    return c.sh.invoke(c.args, c.io, { noFunc: true });
  });
  def('true :', () => 0);
  def('false', () => 1);
  def('return', (c) => { c.sh.returnFlag = true; c.sh.returnCode = parseInt(c.args[0], 10) || 0; return c.sh.returnCode; });
  def('break continue', (c) => { if (c.name === 'break') c.sh.breakFlag = true; return 0; });
  def('shift', (c) => { c.sh.params = c.sh.params.slice(parseInt(c.args[0], 10) || 1); });
  def('eval', (c) => c.sh.run(c.args.join(' '), c.io));
  def('let', (c) => {
    let v = 0;
    try { for (const a of c.args) v = TX.arith(a, (k) => c.sh.vars[k], (k, x) => { c.sh.vars[k] = x; }); } catch (e) { return c.fail(e.message); }
    return v ? 0 : 1;
  });
  def('read', async (c) => {
    const { f, rest } = getopt(c.args, 'p:srn:t:a:d:');
    let line;
    if (c.stdin != null) {
      const L = c.stdin.split('\n');
      line = L.shift();
      c.io.stdin = L.join('\n');
      if (line === undefined || (line === '' && !L.length)) return 1;
    } else {
      if (f.p) c.term.write(f.p);
      line = await c.readLine('', { hidden: !!f.s });
      if (f.s) c.term.write('');
    }
    const names = rest.length ? rest : ['REPLY'];
    if (f.a) { c.sh.vars[f.a] = line; return 0; }
    const parts = line.trim().split(/\s+/);
    names.forEach((n, i) => { c.sh.vars[n] = i === names.length - 1 ? parts.slice(i).join(' ') : (parts[i] || ''); });
    return 0;
  });
  function test(args, c) {
    const sh = c.sh;
    const st = (p) => sh.vfs.get(sh.resolve(p));
    const un = { '-e': (p) => !!st(p), '-f': (p) => { const n = st(p); return !!n && n.t === 'f'; }, '-d': (p) => { const n = st(p); return !!n && n.t === 'd'; }, '-s': (p) => { const n = st(p); return !!n && sh.vfs.size(n) > 0; }, '-r': (p) => !!st(p), '-w': (p) => { try { sh.vfs.checkWrite(sh.resolve(p), c.user); return !!st(p); } catch (e) { return false; } }, '-x': (p) => { const n = st(p); return !!n && (n.t === 'd' || isExec(n, sh)); }, '-L': (p) => { const n = sh.vfs.get(sh.resolve(p), false); return !!n && n.t === 'l'; }, '-h': (p) => { const n = sh.vfs.get(sh.resolve(p), false); return !!n && n.t === 'l'; }, '-z': (s) => s === '', '-n': (s) => s !== '' };
    const num = (x) => { const n = parseInt(x, 10); if (isNaN(n)) throw new Error(`${x}: integer expression expected`); return n; };
    const bin = { '=': (a, b) => a === b, '==': (a, b) => a === b, '!=': (a, b) => a !== b, '-eq': (a, b) => num(a) === num(b), '-ne': (a, b) => num(a) !== num(b), '-lt': (a, b) => num(a) < num(b), '-le': (a, b) => num(a) <= num(b), '-gt': (a, b) => num(a) > num(b), '-ge': (a, b) => num(a) >= num(b), '<': (a, b) => a < b, '>': (a, b) => a > b, '=~': (a, b) => new RegExp(b).test(a) };
    function expr(a) {
      const orIdx = a.findIndex((x) => x === '-o' || x === '||');
      if (orIdx > 0) return expr(a.slice(0, orIdx)) || expr(a.slice(orIdx + 1));
      const andIdx = a.findIndex((x) => x === '-a' || x === '&&');
      if (andIdx > 0) return expr(a.slice(0, andIdx)) && expr(a.slice(andIdx + 1));
      if (a[0] === '!') return !expr(a.slice(1));
      if (a[0] === '(' && a[a.length - 1] === ')') return expr(a.slice(1, -1));
      if (a.length === 0) return false;
      if (a.length === 1) return a[0] !== '';
      if (a.length === 2 && un[a[0]]) return un[a[0]](a[1]);
      if (a.length === 3 && bin[a[1]]) return bin[a[1]](a[0], a[2]);
      throw new Error(`${a[0]}: unary operator expected`);
    }
    return expr(args);
  }
  def('test [ [[', (c) => {
    let a = c.args.slice();
    if (c.name === '[') { if (a[a.length - 1] !== ']') return c.fail("missing `]'", 2); a.pop(); }
    if (c.name === '[[') { if (a[a.length - 1] !== ']]') return c.fail("missing `]]'", 2); a.pop(); }
    try { return test(a, c) ? 0 : 1; } catch (e) { c.err(`${c.sh.name}: ${c.name}: ${e.message}\n`); return 2; }
  });
  def('sleep', async (c) => {
    if (!c.args.length) return c.fail('missing operand');
    let ms = 0;
    for (const a of c.args) { const m = /^(\d*\.?\d+)([smhd]?)$/.exec(a); if (!m) return c.fail(`invalid time interval '${a}'`); ms += parseFloat(m[1]) * ({ '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2]]) * 1000; }
    await c.sleep(Math.min(ms, 1000 * 60 * 10));
  });
  def('time', async (c) => {
    const t0 = performance.now();
    const code = c.args.length ? await c.sh.invoke(c.args, c.io) : 0;
    const s = (performance.now() - t0) / 1000;
    const f = (x) => Math.floor(x / 60) + 'm' + (x % 60).toFixed(3) + 's';
    c.err(`\nreal\t${f(s)}\nuser\t${f(s * 0.08)}\nsys\t${f(s * 0.03)}\n`);
    return code;
  });
  def('jobs', (c) => { c.sh.jobs.forEach((j) => c.outln(`[${j.id}]${j === c.sh.jobs[c.sh.jobs.length - 1] ? '+' : '-'}  ${j.done ? 'Done' : 'Running'}                 ${j.text}${j.done ? '' : ' &'}`)); c.sh.jobs = c.sh.jobs.filter((j) => !j.done); });
  def('fg bg wait', async (c) => {
    const j = c.sh.jobs[c.sh.jobs.length - 1];
    if (!j) return c.fail('current: no such job');
    if (c.name === 'bg') { c.outln(`[${j.id}]+ ${j.text} &`); return; }
    if (c.name === 'fg') c.outln(j.text);
    while (!j.done) await c.sleep(100);
  });
  def('clear reset', (c) => { c.term.clear(); });
  def('help', (c) => { c.out(TX.docs.posixHelp(c.sh)); });
  def('man', async (c) => {
    const n = c.args.filter((a) => !/^\d$/.test(a))[0];
    if (!n) { c.err('What manual page do you want?\nFor example, try \'man man\'.\n'); return 1; }
    const page = TX.docs.manPage(n, c.sh);
    if (!page) { c.err(`No manual entry for ${n}\n`); return 16; }
    if (!c.tty) { c.out(TX.stripAnsi(page)); return; }
    await TX.apps.pager(c.term, page, `Manual page ${n}(1) line %L (press h for help or q to quit)`);
  });
  def('whatis', (c) => { c.args.forEach((n) => { const d = TX.docs.get(n); c.outln(d ? `${n} (1)${' '.repeat(Math.max(1, 14 - n.length))}- ${d.summary}` : `${n}: nothing appropriate.`); }); });
  def('apropos', (c) => { const q = (c.args[0] || '').toLowerCase(); TX.docs.all().filter((d) => d.name.includes(q) || d.summary.toLowerCase().includes(q)).forEach((d) => c.outln(`${d.name} (1)${' '.repeat(Math.max(1, 14 - d.name.length))}- ${d.summary}`)); });

  // ------------------------------------------------------------------ ls
  def('ls', (c) => {
    const sh = c.sh;
    const { f, rest } = getopt(c.args, 'laAhR1tSrdFGiCsnog', { all: 'a', 'almost-all': 'A', 'human-readable': 'h', recursive: 'R', reverse: 'r', directory: 'd', classify: 'F', color: true, size: 's' });
    const color = c.tty && f['--color'] !== 'never' && (f['--color'] || f.G || ['bash', 'zsh', 'gitbash'].includes(sh.flavor) || !!sh.vars.CLICOLOR);
    const long = f.l || f.n || f.o || f.g;
    const targets = rest.length ? rest : ['.'];
    let code = 0;
    const fileTargets = [], dirTargets = [];
    for (const t of targets) {
      const segs = c.path(t);
      const lnode = sh.vfs.get(segs, false);
      const node = sh.vfs.get(segs);
      if (!lnode) {
        c.err(sh.m.kind === 'mac' ? `ls: ${t}: No such file or directory\n` : `ls: cannot access '${t}': No such file or directory\n`);
        code = 2; continue;
      }
      if (node && node.t === 'd' && !f.d && !(long && lnode.t === 'l' && !t.endsWith('/'))) dirTargets.push([t, segs, node]);
      else fileTargets.push({ name: t, node: lnode, segs });
    }
    const fmtEntries = (entries, dirSegs) => {
      entries = entries.slice();
      const key = (e) => e.name.replace(/^\.+/, '').toLowerCase();
      if (f.t) entries.sort((a, b) => b.node.mt - a.node.mt);
      else if (f.S) entries.sort((a, b) => sh.vfs.size(b.node) - sh.vfs.size(a.node));
      else entries.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : a.name < b.name ? -1 : 1));
      if (f.r) entries.reverse();
      const deco = (e) => {
        const target = e.node.t === 'l' ? sh.vfs.get(e.node.tgt) : null;
        let s = color ? colorName(e.node, e.name, sh, target) : e.name;
        if (e.name.includes(' ') && sh.m.kind === 'linux' && c.tty) s = "'" + s + "'";
        if (f.F) s += e.node.t === 'd' ? '/' : e.node.t === 'l' ? '@' : isExec(e.node, sh) ? '*' : '';
        return s;
      };
      if (long) {
        let total = 0;
        const rows = entries.map((e) => {
          const n = e.node;
          const sz = sh.vfs.size(n);
          total += Math.ceil(sz / 4096) * 4;
          const [o, g] = owner(sh, n);
          const sizeStr = f.h ? TX.human(sz) : String(sz);
          let name = deco(e);
          if (n.t === 'l') name += ' -> ' + n.target;
          const row = [permStr(n) + (sh.m.kind === 'mac' && e.name.startsWith('.') === false && n.t !== 'l' && Math.random() < 0 ? '@' : ''), String(nlinks(n))];
          if (!f.g) row.push(f.n ? (o === 'root' ? '0' : '1000') : o);
          if (!f.o) row.push(f.n ? (g === 'root' ? '0' : '1000') : g);
          row.push(sizeStr, TX.lsDate(n.mt), name);
          return row;
        });
        const out = [];
        if (dirSegs) out.push('total ' + (f.h ? TX.human(total * 1024) : total));
        if (rows.length) {
          const w = [];
          rows.forEach((r) => r.forEach((x, i) => { w[i] = Math.max(w[i] || 0, TX.visLen(x)); }));
          rows.forEach((r) => out.push(r.map((x, i) => (i === r.length - 1 ? x : i === 1 || i === r.length - 3 ? TX.padL(x, w[i]) : TX.padR(x, w[i]))).join(' ')));
        }
        return out.join('\n');
      }
      const items = entries.map(deco);
      if (f[1] || !c.tty) return items.join('\n');
      return TX.columns(items, c.cols);
    };
    const blocks = [];
    if (fileTargets.length) blocks.push(fmtEntries(fileTargets.map((e) => ({ name: e.name, node: e.node })), null));
    const listDir = (t, segs, node, header) => {
      if (!canEnter(sh, node, c.user) || (node.uid !== c.user && c.user !== 'root' && !(node.mode & 0o004) && sh.flavor !== 'gitbash')) {
        c.err(sh.m.kind === 'mac' ? `ls: ${t}: Permission denied\n` : `ls: cannot open directory '${t}': Permission denied\n`); code = 2; return;
      }
      let entries = Object.values(node.ch).map((n) => ({ name: n.name, node: n }));
      if (!f.a && !f.A) entries = entries.filter((e) => !e.name.startsWith('.') && !(sh.flavor === 'gitbash' && false));
      if (f.a) { entries.unshift({ name: '..', node: sh.vfs.get(segs.slice(0, -1)) || node }); entries.unshift({ name: '.', node }); }
      const body = fmtEntries(entries, segs);
      blocks.push((header ? t + ':\n' : '') + body);
      if (f.R) {
        entries.filter((e) => e.node.t === 'd' && e.name !== '.' && e.name !== '..').sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
          const sub = t === '.' && !header ? './' + e.name : t.replace(/\/$/, '') + '/' + e.name;
          listDir(sub, segs.concat(e.name), e.node, true);
        });
      }
    };
    const multi = targets.length > 1 || f.R;
    dirTargets.forEach(([t, segs, node]) => listDir(t, segs, node, multi));
    const text = blocks.filter((b) => b !== '').join('\n\n');
    if (text) c.outln(text);
    return code;
  });
  def('dir vdir', (c) => cmds.ls.fn(Object.assign({}, c, { args: (c.name === 'vdir' ? ['-l'] : ['-C']).concat(c.args) })), { only: ['linux', 'gitbash'] });

  // ------------------------------------------------------------------ file ops
  def('cat', (c) => {
    const { f, rest } = getopt(c.args, 'nbAsEvT', { number: 'n' });
    let code = 0, ln = 0;
    for (const inp of c.input(rest)) {
      if (inp.text === null) { code = 1; continue; }
      let t = inp.text;
      if (f.n || f.b || f.E || f.A || f.T) {
        const L = t.split('\n'); const endsNl = t.endsWith('\n'); if (endsNl) L.pop();
        t = L.map((l) => { if (f.T || f.A) l = l.replace(/\t/g, '^I'); if (f.E || f.A) l += '$'; if (f.b && l === '') return l; return (f.n || f.b ? String(++ln).padStart(6) + '\t' : '') + l; }).join('\n') + (endsNl ? '\n' : '');
      }
      c.out(t);
    }
    return code;
  });
  def('tac', (c) => { for (const inp of c.input(c.args)) if (inp.text !== null) { const L = lines(inp.text); c.out(L.reverse().join('\n') + (L.length ? '\n' : '')); } });
  def('rev', (c) => { for (const inp of c.input(c.args)) if (inp.text !== null) lines(inp.text).forEach((l) => c.outln([...l].reverse().join(''))); });
  def('nl', (c) => { let n = 0; for (const inp of c.input(c.args.filter((a) => !a.startsWith('-')))) if (inp.text !== null) lines(inp.text).forEach((l) => c.outln(l.trim() ? String(++n).padStart(6) + '\t' + l : '       ')); });
  function headTail(c, isTail) {
    let n = 10, bytes = null, from = false, follow = false;
    const files = [];
    const a = c.args;
    for (let i = 0; i < a.length; i++) {
      if (/^-\d+$/.test(a[i])) n = parseInt(a[i].slice(1), 10);
      else if (a[i] === '-n' || a[i] === '--lines') { const v = a[++i]; if (v && v[0] === '+') { from = true; n = parseInt(v.slice(1), 10); } else n = Math.abs(parseInt(v, 10)); }
      else if (/^-n[+-]?\d+$/.test(a[i])) { const v = a[i].slice(2); if (v[0] === '+') { from = true; n = parseInt(v.slice(1), 10); } else n = Math.abs(parseInt(v, 10)); }
      else if (a[i] === '-c') bytes = parseInt(a[++i], 10);
      else if (a[i] === '-f' || a[i] === '-F' || a[i] === '--follow') follow = true;
      else if (a[i] === '-q' || a[i] === '-v') continue;
      else files.push(a[i]);
    }
    if (isNaN(n)) return c.fail('invalid number of lines');
    const inputs = c.input(files);
    let code = 0;
    inputs.forEach((inp, idx) => {
      if (inp.text === null) { code = 1; return; }
      if (inputs.length > 1) c.out((idx ? '\n' : '') + `==> ${inp.name} <==\n`);
      if (bytes !== null) { c.out(isTail ? inp.text.slice(-bytes) : inp.text.slice(0, bytes)); return; }
      const L = lines(inp.text);
      const sel = isTail ? (from ? L.slice(Math.max(0, n - 1)) : L.slice(Math.max(0, L.length - n))) : L.slice(0, n);
      if (sel.length) c.out(sel.join('\n') + '\n');
    });
    if (isTail && follow) {
      return (async () => {
        const logLike = files.some((x) => /log/.test(x));
        try {
          while (true) {
            await c.sleep(TX.randInt(1200, 3500));
            if (logLike) {
              const d = new Date();
              const msgs = files.some((x) => /nginx|access/.test(x))
                ? `${TX.pick(['192.168.1.14', '10.0.0.8', '203.0.113.9'])} - - [${TX.p2(d.getDate())}/${TX.MON[d.getMonth()]}/${d.getFullYear()}:${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} -0400] "GET ${TX.pick(['/', '/login', '/api/grades', '/favicon.ico'])} HTTP/1.1" ${TX.pick([200, 200, 304, 404])} ${TX.randInt(200, 9000)} "-" "Mozilla/5.0"`
                : `${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} ${c.m.net.hostname} ${TX.pick(['systemd[1]: Started Session 42 of User student.', 'CRON[3310]: (student) CMD (backup.sh)', 'kernel: [UFW BLOCK] IN=enp0s3 SRC=203.0.113.9 DPT=23', 'NetworkManager[718]: <info> dhcp4 (enp0s3): state changed new lease', 'sshd[3321]: Accepted password for student from 192.168.1.57 port 52814 ssh2'])}`;
              c.outln(msgs);
            }
          }
        } catch (e) { if (e.interrupt) { c.out('\n'); return 130; } throw e; }
      })();
    }
    return code;
  }
  def('head', (c) => headTail(c, false));
  def('tail', (c) => headTail(c, true));
  def('less more most', async (c) => {
    const inp = c.input(c.args.filter((a) => !a.startsWith('-')));
    if (inp.some((x) => x.text === null)) return 1;
    const text = inp.map((x) => x.text).join('');
    if (!c.tty) { c.out(text); return; }
    await TX.apps.pager(c.term, text, c.args[0] ? c.args[0] + ' (press q to quit)' : ':');
  });
  def('touch', (c) => {
    const { rest } = getopt(c.args, 'acmd:t:r:');
    if (!rest.length) return c.fail('missing file operand');
    let code = 0;
    for (const p of rest) {
      try { c.vfs.touch(c.path(p), { user: c.user, owner: c.user }); }
      catch (e) { c.err(`touch: cannot touch '${p}': ${FS_MSG[e.code]}\n`); code = 1; }
    }
    return code;
  });
  def('mkdir', (c) => {
    const { f, rest } = getopt(c.args, 'pvm:', { parents: 'p', verbose: 'v' });
    if (!rest.length) return c.fail('missing operand');
    let code = 0;
    for (const p of rest) {
      try { c.vfs.mkdir(c.path(p), { parents: !!f.p, user: c.user, owner: c.user }); if (f.v) c.outln(`mkdir: created directory '${p}'`); }
      catch (e) { c.err(c.m.kind === 'mac' && c.sh.flavor === 'zsh' ? `mkdir: ${p}: ${FS_MSG[e.code]}\n` : `mkdir: cannot create directory '${p}': ${FS_MSG[e.code]}\n`); code = 1; }
    }
    return code;
  });
  def('rmdir', (c) => {
    const { f, rest } = getopt(c.args, 'pv', { parents: 'p' });
    let code = 0;
    for (const p of rest) {
      const segs = c.path(p);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`rmdir: failed to remove '${p}': No such file or directory\n`); code = 1; continue; }
      if (n.t !== 'd') { c.err(`rmdir: failed to remove '${p}': Not a directory\n`); code = 1; continue; }
      if (Object.keys(n.ch).length) { c.err(`rmdir: failed to remove '${p}': Directory not empty\n`); code = 1; continue; }
      try { c.vfs.remove(segs, { dirOk: true, user: c.user }); } catch (e) { c.err(`rmdir: failed to remove '${p}': ${FS_MSG[e.code]}\n`); code = 1; }
      void f;
    }
    return code;
  });
  def('rm', async (c) => {
    const { f, rest } = getopt(c.args, 'rRfivd', { recursive: 'r', force: 'f', interactive: 'i', verbose: 'v', 'no-preserve-root': true, dir: 'd' });
    const rec = f.r || f.R;
    if (!rest.length) { if (f.f) return 0; return c.fail('missing operand\nTry \'rm --help\' for more information.'); }
    let code = 0;
    for (const p of rest) {
      const segs = c.path(p);
      if (!segs.length || (c.sh.flavor === 'gitbash' && segs.length <= 1)) {
        if (!f['--no-preserve-root']) { c.err(`rm: it is dangerous to operate recursively on '${p}'\nrm: use --no-preserve-root to override this failsafe\n`); code = 1; continue; }
      }
      const n = c.vfs.get(segs, false);
      if (!n) { if (!f.f) { c.err(c.m.kind === 'mac' ? `rm: ${p}: No such file or directory\n` : `rm: cannot remove '${p}': No such file or directory\n`); code = 1; } continue; }
      if (n.t === 'd' && !rec && !f.d) { c.err(c.m.kind === 'mac' ? `rm: ${p}: is a directory\n` : `rm: cannot remove '${p}': Is a directory\n`); code = 1; continue; }
      if (f.i) {
        const ans = await c.readLine(`rm: remove ${n.t === 'd' ? 'directory' : 'regular file'} '${p}'? `);
        if (!/^y/i.test(ans)) continue;
      }
      if (!segs.length) {
        if (c.user !== 'root') { c.err(`rm: cannot remove '/': Permission denied\n`); return 1; }
        Object.keys(c.vfs.root.ch).forEach((k) => { if (f.v) c.outln(`removed directory '/${k}'`); delete c.vfs.root.ch[k]; });
        c.vfs.changed();
        c.err(C.red('\nYou just deleted the entire (virtual) filesystem. On a real computer this would be a disaster!\nType  reset-machine  to restore everything.\n'));
        continue;
      }
      try {
        c.vfs.remove(segs, { recursive: rec, user: c.user, force: f.f, dirOk: f.d });
        if (f.v) c.outln(`removed ${n.t === 'd' ? 'directory ' : ''}'${p}'`);
      } catch (e) { c.err(`rm: cannot remove '${p}': ${FS_MSG[e.code]}\n`); code = 1; }
    }
    return code;
  });
  def('cp', async (c) => {
    const { f, rest } = getopt(c.args, 'rRaivnpfu', { recursive: 'r', interactive: 'i', verbose: 'v', 'no-clobber': 'n', archive: 'a' });
    if (rest.length < 2) return c.fail(rest.length ? `missing destination file operand after '${rest[0]}'` : 'missing file operand');
    const dst = rest.pop();
    const dsegs = c.path(dst);
    const dnode = c.vfs.get(dsegs);
    if (rest.length > 1 && (!dnode || dnode.t !== 'd')) return c.fail(`target '${dst}' is not a directory`);
    let code = 0;
    for (const s of rest) {
      const ssegs = c.path(s);
      const sn = c.vfs.get(ssegs);
      if (!sn) { c.err(`cp: cannot stat '${s}': No such file or directory\n`); code = 1; continue; }
      if (sn.t === 'd' && !(f.r || f.R || f.a)) { c.err(`cp: -r not specified; omitting directory '${s}'\n`); code = 1; continue; }
      const finalSegs = dnode && dnode.t === 'd' ? dsegs.concat(sn.name) : dsegs;
      const exists = c.vfs.get(finalSegs);
      if (exists && f.n) continue;
      if (exists && f.i && sn.t === 'f') { const ans = await c.readLine(`cp: overwrite '${dst}'? `); if (!/^y/i.test(ans)) continue; }
      try { c.vfs.copy(ssegs, dsegs, { recursive: true, user: c.user, preserve: f.p || f.a }); if (f.v) c.outln(`'${s}' -> '${dnode && dnode.t === 'd' ? dst.replace(/\/$/, '') + '/' + sn.name : dst}'`); }
      catch (e) { c.err(`cp: cannot create ${sn.t === 'd' ? 'directory' : 'regular file'} '${dst}': ${FS_MSG[e.code]}\n`); code = 1; }
    }
    return code;
  });
  def('mv', async (c) => {
    const { f, rest } = getopt(c.args, 'ivnfu', { interactive: 'i', verbose: 'v', 'no-clobber': 'n', force: 'f' });
    if (rest.length < 2) return c.fail(rest.length ? `missing destination file operand after '${rest[0]}'` : 'missing file operand');
    const dst = rest.pop();
    const dsegs = c.path(dst);
    const dnode = c.vfs.get(dsegs);
    if (rest.length > 1 && (!dnode || dnode.t !== 'd')) return c.fail(`target '${dst}' is not a directory`);
    let code = 0;
    for (const s of rest) {
      const ssegs = c.path(s);
      const sn = c.vfs.get(ssegs, false);
      if (!sn) { c.err(`mv: cannot stat '${s}': No such file or directory\n`); code = 1; continue; }
      const finalSegs = dnode && dnode.t === 'd' ? dsegs.concat(sn.name) : dsegs;
      const exists = c.vfs.get(finalSegs);
      if (exists && f.n) continue;
      if (exists && f.i && exists !== sn) { const ans = await c.readLine(`mv: overwrite '${dst}'? `); if (!/^y/i.test(ans)) continue; }
      try { c.vfs.move(ssegs, dsegs, { user: c.user }); if (f.v) c.outln(`renamed '${s}' -> '${dst}'`); }
      catch (e) { c.err(e.code === 'EINVAL' ? `mv: cannot move '${s}' to a subdirectory of itself, '${dst}'\n` : `mv: cannot move '${s}' to '${dst}': ${FS_MSG[e.code]}\n`); code = 1; }
    }
    return code;
  });
  def('ln', (c) => {
    const { f, rest } = getopt(c.args, 'sfvn', { symbolic: 's', force: 'f' });
    if (rest.length < 1) return c.fail('missing file operand');
    const target = rest[0];
    let link = rest[1] || target.split('/').pop();
    let lsegs = c.path(link);
    const ln = c.vfs.get(lsegs);
    if (ln && ln.t === 'd') lsegs = lsegs.concat(target.split('/').pop());
    if (f.f && c.vfs.get(lsegs, false)) c.vfs.remove(lsegs, { user: c.user });
    const tsegs = target.startsWith('/') ? c.path(target) : c.sh.paths.parse(target, lsegs.slice(0, -1), c.sh.home);
    try {
      if (f.s) c.vfs.symlink(target, tsegs, lsegs, { user: c.user });
      else {
        const tn = c.vfs.get(tsegs);
        if (!tn) return c.fail(`failed to access '${target}': No such file or directory`);
        if (tn.t === 'd') return c.fail(`${target}: hard link not allowed for directory`);
        const dir = c.vfs.get(lsegs.slice(0, -1));
        dir.ch[lsegs[lsegs.length - 1]] = tn; c.vfs.changed();
      }
      if (f.v) c.outln(`'${link}' -> '${target}'`);
    } catch (e) { return c.fail(`failed to create ${f.s ? 'symbolic ' : ''}link '${link}': ${FS_MSG[e.code]}`); }
  });
  def('readlink realpath', (c) => {
    const { f, rest } = getopt(c.args, 'fems');
    let code = 0;
    rest.forEach((p) => {
      const segs = c.path(p);
      const n = c.vfs.get(segs, false);
      if (c.name === 'readlink' && !f.f && !f.e && !f.m) { if (n && n.t === 'l') c.outln(n.target); else code = 1; return; }
      if (!n && c.name === 'realpath' && !f.m) { c.err(`realpath: ${p}: No such file or directory\n`); code = 1; return; }
      let real = segs;
      if (n && n.t === 'l') real = n.tgt;
      c.outln(c.fmt(c.vfs.canon(real)));
    });
    return code;
  });
  def('basename', (c) => {
    const { f, rest } = getopt(c.args, 'as:z');
    const names = f.a || f.s ? rest : rest.slice(0, 1);
    const suffix = f.s || (!f.a ? rest[1] : null);
    names.forEach((p) => { let b = p.replace(/\/+$/, '').split('/').pop() || '/'; if (suffix && b.endsWith(suffix) && b !== suffix) b = b.slice(0, -suffix.length); c.outln(b); });
  });
  def('dirname', (c) => { c.args.forEach((p) => { const s = p.replace(/\/+$/, ''); const i = s.lastIndexOf('/'); c.outln(i < 0 ? '.' : i === 0 ? '/' : s.slice(0, i)); }); });
  def('stat', (c) => {
    const { rest } = getopt(c.args, 'Lcf:t');
    let code = 0;
    for (const p of rest) {
      const segs = c.path(p);
      const n = c.vfs.get(segs, false);
      if (!n) { c.err(`stat: cannot statx '${p}': No such file or directory\n`); code = 1; continue; }
      const sz = c.vfs.size(n);
      const typ = n.t === 'd' ? 'directory' : n.t === 'l' ? 'symbolic link' : sz ? 'regular file' : 'regular empty file';
      const [o, g] = owner(c.sh, n);
      const d = new Date(n.mt);
      const ts = TX.isoDate(n.mt) + '.' + String(d.getMilliseconds()).padStart(3, '0') + '000000 -0400';
      c.outln(`  File: ${p}${n.t === 'l' ? ' -> ' + n.target : ''}\n  Size: ${String(sz).padEnd(15)} Blocks: ${String(Math.ceil(sz / 4096) * 8).padEnd(10)} IO Block: 4096   ${typ}\nDevice: 259,3\tInode: ${parseInt(TX.sha1(segs.join('/')).slice(0, 6), 16)}     Links: ${nlinks(n)}\nAccess: (${(n.mode & 0o7777).toString(8).padStart(4, '0')}/${permStr(n)})  Uid: (${String(o === 'root' ? 0 : 1000).padStart(5)}/${o.padStart(8)})   Gid: (${String(g === 'root' ? 0 : 1000).padStart(5)}/${g.padStart(8)})\nAccess: ${ts}\nModify: ${ts}\nChange: ${ts}\n Birth: ${ts}`);
    }
    return code;
  });
  def('file', (c) => {
    for (const p of c.args.filter((a) => !a.startsWith('-'))) {
      const n = c.vfs.get(c.path(p), false);
      if (!n) { c.outln(`${p}: cannot open \`${p}' (No such file or directory)`); continue; }
      let t;
      if (n.t === 'd') t = 'directory';
      else if (n.t === 'l') t = 'symbolic link to ' + n.target;
      else {
        const name = n.name.toLowerCase(), txt = c.vfs.content(n);
        const map = [[/\.png$/, 'PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced'], [/\.jpe?g$/, 'JPEG image data, JFIF standard 1.01, resolution (DPI), density 72x72'], [/\.pdf$/, 'PDF document, version 1.7'], [/\.zip$/, 'Zip archive data, at least v2.0 to extract'], [/\.(tar\.gz|tgz|gz)$/, 'gzip compressed data, original size modulo 2^32 20480'], [/\.tar$/, 'POSIX tar archive (GNU)'], [/\.iso$/, "ISO 9660 CD-ROM filesystem data (DOS/MBR boot sector) 'Ubuntu 24.04.1 LTS amd64' (bootable)"], [/\.mp3$/, 'Audio file with ID3 version 2.4.0, contains: MPEG ADTS, layer III, v1, 320 kbps, 44.1 kHz, JntStereo'], [/\.mp4$/, 'ISO Media, MP4 v2 [ISO 14496-14]'], [/\.mkv$/, 'Matroska data'], [/\.exe$/, 'PE32+ executable (GUI) x86-64, for MS Windows'], [/\.docx$/, 'Microsoft Word 2007+'], [/\.xlsx$/, 'Microsoft Excel 2007+'], [/\.deb$/, 'Debian binary package (format 2.0)']];
        const hit = map.find(([re]) => re.test(name));
        if (hit) t = hit[1];
        else if (!txt && !n.sz) t = 'empty';
        else if (/^#!.*\b(bash|sh)\b/.test(txt)) t = 'Bourne-Again shell script, ASCII text executable';
        else if (/^#!.*python/.test(txt)) t = 'Python script, ASCII text executable';
        else if (/^<!DOCTYPE html|<html/i.test(txt)) t = 'HTML document, ASCII text';
        else if (/\.json$/.test(name)) t = 'JSON text data';
        else if (/\.csv$/.test(name)) t = 'CSV ASCII text';
        else if (/\.js$/.test(name)) t = 'JavaScript source, ASCII text';
        else if (/\.py$/.test(name)) t = 'Python script, ASCII text';
        else if (txt.startsWith('TXARCHIVE')) t = 'gzip compressed data';
        else t = /[^\x00-\x7f]/.test(txt) ? 'Unicode text, UTF-8 text' : 'ASCII text';
      }
      c.outln(`${p}: ${t}`);
    }
  });
  def('chmod', (c) => {
    const { f, rest } = getopt(c.args, 'Rvcf', { recursive: 'R' });
    if (rest.length < 2) return c.fail(rest.length ? `missing operand after '${rest[0]}'` : 'missing operand');
    const spec = rest.shift();
    let code = 0;
    const apply = (n) => {
      if (/^[0-7]{3,4}$/.test(spec)) { n.mode = parseInt(spec, 8); return; }
      for (const part of spec.split(',')) {
        const m = /^([ugoa]*)([+\-=])([rwxXst]*)$/.exec(part);
        if (!m) throw new Error(`invalid mode: '${spec}'`);
        const who = m[1] || 'a';
        let bits = 0;
        for (const p of m[3]) { const b = p === 'r' ? 4 : p === 'w' ? 2 : (p === 'x' || p === 'X') ? 1 : 0; if (who.includes('u') || who.includes('a')) bits |= b << 6; if (who.includes('g') || who.includes('a')) bits |= b << 3; if (who.includes('o') || who.includes('a')) bits |= b; }
        if (m[2] === '+') n.mode |= bits; else if (m[2] === '-') n.mode &= ~bits;
        else { let mask = 0; if (who.includes('u') || who.includes('a')) mask |= 0o700; if (who.includes('g') || who.includes('a')) mask |= 0o070; if (who.includes('o') || who.includes('a')) mask |= 0o007; n.mode = (n.mode & ~mask) | bits; }
      }
    };
    for (const p of rest) {
      const segs = c.path(p);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`chmod: cannot access '${p}': No such file or directory\n`); code = 1; continue; }
      if (c.user !== 'root' && n.uid !== c.user && c.sh.flavor !== 'gitbash') { c.err(`chmod: changing permissions of '${p}': Operation not permitted\n`); code = 1; continue; }
      try {
        if (f.R) c.vfs.walk(segs, (x) => apply(x)); else apply(n);
        if (f.v) c.outln(`mode of '${p}' changed to ${(n.mode & 0o7777).toString(8).padStart(4, '0')} (${permStr(n).slice(1)})`);
      } catch (e) { return c.fail(e.message); }
    }
    c.vfs.changed();
    return code;
  });
  def('chown chgrp', (c) => {
    const { f, rest } = getopt(c.args, 'Rvh', { recursive: 'R' });
    if (rest.length < 2) return c.fail('missing operand');
    const spec = rest.shift();
    let [u, g] = c.name === 'chgrp' ? [null, spec] : spec.split(':');
    const known = c.m.users.concat(['www-data', 'staff', 'wheel', 'adm', 'sudo', 'docker', 'mysql']);
    if (u && !known.includes(u)) return c.fail(`invalid user: '${spec}'`);
    let code = 0;
    for (const p of rest) {
      const segs = c.path(p);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`${c.name}: cannot access '${p}': No such file or directory\n`); code = 1; continue; }
      if (c.user !== 'root') { c.err(`${c.name}: changing ownership of '${p}': Operation not permitted\n`); code = 1; continue; }
      const ap = (x) => { if (u) x.uid = u; if (g) x.gid = g; };
      if (f.R) c.vfs.walk(segs, ap); else ap(n);
    }
    c.vfs.changed();
    return code;
  });

  // ------------------------------------------------------------------ find / du / tree
  def('find', async (c) => {
    const a = c.args.slice();
    const starts = [];
    while (a.length && !/^[-!(]/.test(a[0])) starts.push(a.shift());
    if (!starts.length) starts.push('.');
    let maxDepth = Infinity, minDepth = 0;
    const groups = [[]];
    let execCmd = null, del = false, printf = null;
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      const g = groups[groups.length - 1];
      let neg = false;
      let k = t;
      if (t === '!' || t === '-not') { neg = true; k = a[++i]; }
      const val = () => a[++i];
      let test = null;
      switch (k) {
        case '-name': { const re = TX.globToRegex(val(), false); test = (n) => re.test(n.name); break; }
        case '-iname': { const re = TX.globToRegex(val(), true); test = (n) => re.test(n.name); break; }
        case '-path': case '-wholename': { const re = TX.likeToRegex(val(), true); test = (n, p) => re.test(p); break; }
        case '-type': { const ty = val(); test = (n) => (ty === 'f' ? n.t === 'f' : ty === 'd' ? n.t === 'd' : ty === 'l' ? n.t === 'l' : false); break; }
        case '-size': {
          const m = /^([+-]?)(\d+)([ckMG]?)$/.exec(val() || '');
          if (!m) return c.fail('invalid -size argument');
          const mult = { c: 1, k: 1024, M: 1024 * 1024, G: 1024 ** 3, '': 512 }[m[3]];
          const lim = parseInt(m[2], 10) * mult;
          test = (n) => { if (n.t !== 'f') return false; const s = c.vfs.size(n); return m[1] === '+' ? s > lim : m[1] === '-' ? s < lim : Math.ceil(s / mult) === parseInt(m[2], 10); };
          break;
        }
        case '-empty': test = (n) => (n.t === 'd' ? !Object.keys(n.ch).length : c.vfs.size(n) === 0); break;
        case '-user': { const u = val(); test = (n) => n.uid === u; break; }
        case '-perm': { const p = parseInt(val().replace(/^[-/]/, ''), 8); test = (n) => (n.mode & 0o777) === p; break; }
        case '-mtime': case '-mmin': { const v = val(); const unit = k === '-mtime' ? 86400000 : 60000; const num = parseInt(v, 10); test = (n) => { const age = (Date.now() - n.mt) / unit; return v[0] === '-' ? age < -num : v[0] === '+' ? age > num : Math.floor(age) === num; }; break; }
        case '-newer': { const ref = c.vfs.get(c.path(val())); test = (n) => ref && n.mt > ref.mt; break; }
        case '-maxdepth': maxDepth = parseInt(val(), 10); continue;
        case '-mindepth': minDepth = parseInt(val(), 10); continue;
        case '-print': continue;
        case '-printf': printf = val(); continue;
        case '-delete': del = true; continue;
        case '-o': case '-or': groups.push([]); continue;
        case '-a': case '-and': continue;
        case '-exec': case '-ok': { const cmd = []; i++; while (i < a.length && a[i] !== ';' && a[i] !== '\\;' && a[i] !== '+') cmd.push(a[i++]); execCmd = cmd; continue; }
        default: return c.fail(`unknown predicate \`${k}'`);
      }
      g.push(neg ? (n, p) => !test(n, p) : test);
    }
    const matches = (n, p) => groups.some((g) => g.every((t) => t(n, p)));
    const found = [];
    let code = 0;
    for (const st of starts) {
      const segs = c.path(st);
      const root = c.vfs.get(segs);
      if (!root) { c.err(`find: '${st}': No such file or directory\n`); code = 1; continue; }
      const rec = (node, disp, depth) => {
        if (depth >= minDepth && matches(node, disp)) found.push([disp, node]);
        if (node.t === 'd' && depth < maxDepth) {
          if (!canEnter(c.sh, node, c.user) || (node.uid !== c.user && c.user !== 'root' && !(node.mode & 0o004) && c.sh.flavor !== 'gitbash')) { if (depth > 0 || true) { c.err(`find: '${disp}': Permission denied\n`); code = 1; } return; }
          Object.values(node.ch).sort((x, y) => x.name.localeCompare(y.name)).forEach((ch) => rec(ch, (disp === '/' ? '' : disp.replace(/\/$/, '')) + '/' + ch.name, depth + 1));
        }
      };
      rec(root, st, 0);
    }
    for (const [p, n] of found) {
      if (execCmd) {
        const argv = execCmd.map((x) => x.replace(/\{\}/g, p));
        await c.sh.invoke(argv, c.io);
      } else if (del) {
        try { c.vfs.remove(c.path(p), { recursive: true, user: c.user }); } catch (e) { /* already removed */ }
      } else if (printf) {
        c.out(TX.escapes(printf).replace(/%p/g, p).replace(/%f/g, n.name).replace(/%s/g, String(c.vfs.size(n))));
      } else c.outln(p);
    }
    return code;
  });
  def('du', (c) => {
    const { f, rest } = getopt(c.args, 'hsacd:k', { 'max-depth': 'd', summarize: 's', 'human-readable': 'h', all: 'a', total: 'c' });
    const targets = rest.length ? rest : ['.'];
    const blk = (b) => Math.ceil(b / 4096) * 4096;
    const fmt = (b) => (f.h ? TX.human(b) : String(Math.ceil(b / 1024)));
    const maxD = f.s ? 0 : f.d !== undefined ? parseInt(f.d, 10) : Infinity;
    let grand = 0;
    for (const t of targets) {
      const segs = c.path(t);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`du: cannot access '${t}': No such file or directory\n`); continue; }
      const rec = (node, disp, depth) => {
        if (node.t !== 'd') { const s = blk(c.vfs.size(node)); if ((f.a || depth === 0) && depth <= maxD) c.outln(fmt(s) + '\t' + disp); return s; }
        let s = 4096;
        Object.values(node.ch).sort((x, y) => x.name.localeCompare(y.name)).forEach((ch) => { s += rec(ch, disp.replace(/\/$/, '') + '/' + ch.name, depth + 1); });
        if (depth <= maxD) c.outln(fmt(s) + '\t' + disp);
        return s;
      };
      grand += rec(n, t, 0);
    }
    if (f.c) c.outln(fmt(grand) + '\ttotal');
  });
  def('tree', (c) => {
    const { f, rest } = getopt(c.args, 'adfL:I:C', {});
    const start = rest[0] || '.';
    const segs = c.path(start);
    const root = c.vfs.get(segs);
    if (!root) { c.outln(`${start}  [error opening dir]\n\n0 directories, 0 files`); return 2; }
    let nd = 0, nf = 0;
    const max = f.L ? parseInt(f.L, 10) : Infinity;
    const out = [c.tty ? C.style(['bold', 'blue'], start) : start];
    const ign = f.I ? TX.globToRegex(f.I) : null;
    const rec = (node, prefix, depth, p) => {
      let kids = Object.values(node.ch).filter((k) => (f.a || !k.name.startsWith('.')) && (!f.d || k.t === 'd') && !(ign && ign.test(k.name)));
      kids.sort((x, y) => x.name.localeCompare(y.name, 'en', { sensitivity: 'base' }));
      kids.forEach((k, i) => {
        const last = i === kids.length - 1;
        const name = f.f ? p + '/' + k.name : k.name;
        out.push(prefix + (last ? '└── ' : '├── ') + (c.tty ? colorName(k, name, c.sh) : name) + (k.t === 'l' ? ' -> ' + k.target : ''));
        if (k.t === 'd') { nd++; if (depth + 1 < max) rec(k, prefix + (last ? '    ' : '│   '), depth + 1, p + '/' + k.name); }
        else nf++;
      });
    };
    if (root.t === 'd') rec(root, '', 0, start);
    c.outln(out.join('\n') + `\n\n${nd} director${nd === 1 ? 'y' : 'ies'}${f.d ? '' : `, ${nf} file${nf === 1 ? '' : 's'}`}`);
  }, { pkg: 'tree' });

  // ------------------------------------------------------------------ text processing
  def('wc', (c) => {
    const { f, rest } = getopt(c.args, 'lwcmL', { lines: 'l', words: 'w', bytes: 'c', chars: 'm' });
    const all = !f.l && !f.w && !f.c && !f.m && !f.L;
    const rows = [];
    const tot = [0, 0, 0, 0];
    let code = 0;
    for (const inp of c.input(rest)) {
      if (inp.text === null) { code = 1; continue; }
      const t = inp.text;
      const l = (t.match(/\n/g) || []).length, w = (t.match(/\S+/g) || []).length, b = new TextEncoder().encode(t).length, L = Math.max(0, ...t.split('\n').map((x) => x.length));
      const r = [];
      if (all || f.l) r.push(l); if (all || f.w) r.push(w); if (f.m) r.push(t.length); if (all || f.c) r.push(b); if (f.L) r.push(L);
      tot[0] += l; tot[1] += w; tot[2] += b; tot[3] += t.length;
      rows.push([r, inp.name === '-' ? '' : inp.name]);
    }
    if (rows.length > 1) { const r = []; if (all || f.l) r.push(tot[0]); if (all || f.w) r.push(tot[1]); if (f.m) r.push(tot[3]); if (all || f.c) r.push(tot[2]); rows.push([r, 'total']); }
    const single = rows.length === 1 && rows[0][1] === '' && rows[0][0].length === 1;
    const width = single ? 0 : Math.max(c.m.kind === 'mac' ? 8 : 1, ...rows.map(([r]) => Math.max(...r.map((x) => String(x).length))));
    rows.forEach(([r, name]) => c.outln(r.map((x) => String(x).padStart(width)).join(c.m.kind === 'mac' ? '' : ' ') + (name ? ' ' + name : '')));
    return code;
  });
  def('sort', (c) => {
    const { f, rest } = getopt(c.args, 'rnufhk:t:Rbdo:MV', { reverse: 'r', 'numeric-sort': 'n', unique: 'u', 'ignore-case': 'f', 'human-numeric-sort': 'h', key: 'k', 'field-separator': 't', 'random-sort': 'R' });
    let L = [];
    for (const inp of c.input(rest)) { if (inp.text === null) return 2; L.push(...lines(inp.text)); }
    const keyOf = (l) => {
      if (!f.k) return l;
      const [a, b] = String(f.k).split(',');
      const s = parseInt(a, 10) - 1, e = b ? parseInt(b, 10) - 1 : null;
      const parts = f.t ? l.split(f.t) : l.trim().split(/\s+/);
      return (e !== null ? parts.slice(s, e + 1) : parts.slice(s)).join(f.t || ' ');
    };
    const hnum = (s) => { const m = /^\s*([\d.]+)\s*([KMGTP]?)/i.exec(s); if (!m) return 0; return parseFloat(m[1]) * Math.pow(1024, ' KMGTP'.indexOf((m[2] || ' ').toUpperCase())); };
    const cmp = (x, y) => {
      let a = keyOf(x), b = keyOf(y);
      if (f.n || f.g) { const d = (parseFloat(a) || 0) - (parseFloat(b) || 0); if (d) return d; return x < y ? -1 : x > y ? 1 : 0; }
      if (f.h) return hnum(a) - hnum(b);
      if (f.M) return TX.MON.indexOf(a.slice(0, 3)) - TX.MON.indexOf(b.slice(0, 3));
      if (f.f) { a = a.toLowerCase(); b = b.toLowerCase(); }
      return a.localeCompare(b, 'en', { sensitivity: f.f ? 'base' : 'variant' }) || (x < y ? -1 : x > y ? 1 : 0);
    };
    if (f.R) L.sort(() => Math.random() - 0.5); else L.sort(cmp);
    if (f.r) L.reverse();
    if (f.u) L = L.filter((l, i) => i === 0 || cmp(l, L[i - 1]) !== 0);
    const out = L.length ? L.join('\n') + '\n' : '';
    if (f.o) { c.vfs.writeFile(c.path(f.o), out, { user: c.user, owner: c.user }); return; }
    c.out(out);
  });
  def('uniq', (c) => {
    const { f, rest } = getopt(c.args, 'cdui', { count: 'c', repeated: 'd', unique: 'u', 'ignore-case': 'i' });
    const inp = c.input(rest.slice(0, 1))[0];
    if (inp.text === null) return 1;
    const L = lines(inp.text);
    const groups = [];
    for (const l of L) {
      const g = groups[groups.length - 1];
      if (g && (f.i ? g.line.toLowerCase() === l.toLowerCase() : g.line === l)) g.n++;
      else groups.push({ line: l, n: 1 });
    }
    const out = groups.filter((g) => (f.d ? g.n > 1 : f.u ? g.n === 1 : true)).map((g) => (f.c ? String(g.n).padStart(7) + ' ' : '') + g.line);
    if (out.length) c.out(out.join('\n') + '\n');
  });
  function parseList(spec) {
    const r = [];
    for (const part of String(spec).split(',')) {
      const m = /^(\d*)-(\d*)$/.exec(part);
      if (m) r.push([m[1] ? +m[1] : 1, m[2] ? +m[2] : Infinity]);
      else r.push([+part, +part]);
    }
    return (i) => r.some(([a, b]) => i >= a && i <= b);
  }
  def('cut', (c) => {
    const { f, rest } = getopt(c.args, 'd:f:c:b:s', { delimiter: 'd', fields: 'f', characters: 'c', bytes: 'b' });
    if (!f.f && !f.c && !f.b) return c.fail('you must specify a list of bytes, characters, or fields');
    const d = f.d === undefined ? '\t' : f.d;
    let code = 0;
    for (const inp of c.input(rest)) {
      if (inp.text === null) { code = 1; continue; }
      const out = [];
      for (const l of lines(inp.text)) {
        if (f.f) {
          const sel = parseList(f.f);
          if (!l.includes(d)) { if (!f.s) out.push(l); continue; }
          out.push(l.split(d).filter((_, i) => sel(i + 1)).join(d));
        } else {
          const sel = parseList(f.c || f.b);
          out.push([...l].filter((_, i) => sel(i + 1)).join(''));
        }
      }
      if (out.length) c.out(out.join('\n') + '\n');
    }
    return code;
  });
  function trSet(s) {
    s = TX.escapes(s).replace(/\[:upper:\]/g, 'A-Z').replace(/\[:lower:\]/g, 'a-z').replace(/\[:digit:\]/g, '0-9').replace(/\[:alpha:\]/g, 'a-zA-Z').replace(/\[:alnum:\]/g, 'a-zA-Z0-9').replace(/\[:space:\]/g, ' \t\n\r').replace(/\[:punct:\]/g, '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
    const out = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i + 1] === '-' && i + 2 < s.length) { for (let k = s.charCodeAt(i); k <= s.charCodeAt(i + 2); k++) out.push(String.fromCharCode(k)); i += 2; }
      else out.push(s[i]);
    }
    return out;
  }
  def('tr', (c) => {
    const { f, rest } = getopt(c.args, 'dscC', { delete: 'd', 'squeeze-repeats': 's', complement: 'c' });
    if (!rest.length) return c.fail('missing operand');
    const s1 = trSet(rest[0]), s2 = rest[1] !== undefined ? trSet(rest[1]) : [];
    let t = c.stdin || '';
    if (f.d) { const set = new Set(s1); t = [...t].filter((ch) => (f.c ? set.has(ch) : !set.has(ch))).join(''); }
    else if (s2.length) { const map = {}; s1.forEach((ch, i) => { map[ch] = s2[Math.min(i, s2.length - 1)]; }); t = [...t].map((ch) => (map[ch] !== undefined ? map[ch] : ch)).join(''); }
    if (f.s) { const set = new Set(s2.length ? s2 : s1); let out = ''; for (const ch of t) { if (set.has(ch) && out[out.length - 1] === ch) continue; out += ch; } t = out; }
    c.out(t);
  });
  def('grep egrep fgrep', (c) => {
    const { f, rest } = getopt(c.args, 'ivnclLrRwEFoHhqsxA:B:C:e:m:', { 'ignore-case': 'i', 'invert-match': 'v', 'line-number': 'n', count: 'c', 'files-with-matches': 'l', recursive: 'r', 'word-regexp': 'w', 'extended-regexp': 'E', 'fixed-strings': 'F', 'only-matching': 'o', quiet: 'q', color: true, colour: true, 'context': 'C', include: true });
    let pat = f.e !== undefined ? f.e : rest.shift();
    if (pat === undefined) { c.err('Usage: grep [OPTION]... PATTERNS [FILE]...\nTry \'grep --help\' for more information.\n'); return 2; }
    let src = f.F || c.name === 'fgrep' ? pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : TX.bre(pat, f.E || c.name === 'egrep');
    if (f.w) src = '\\b(?:' + src + ')\\b';
    if (f.x) src = '^(?:' + src + ')$';
    let re;
    try { re = new RegExp(src, 'g' + (f.i ? 'i' : '')); } catch (e) { return c.fail('Invalid regular expression', 2); }
    const color = c.tty && f.color !== 'never' && f.colour !== 'never';
    let files = rest;
    const rec = f.r || f.R;
    if (rec && !files.length) files = ['.'];
    const expanded = [];
    for (const p of files) {
      const segs = c.path(p);
      const n = c.vfs.get(segs);
      if (n && n.t === 'd') {
        if (!rec) { c.err(`grep: ${p}: Is a directory\n`); continue; }
        c.vfs.walk(segs, (node, s) => { if (node.t === 'f' && !node.sz && !node.gen) { const rel = s.slice(segs.length).join('/'); const inc = f.include ? TX.globToRegex(String(f.include)) : null; if (!inc || inc.test(node.name)) expanded.push(p === '.' && c.sh.m.kind !== 'mac' ? rel : p.replace(/\/$/, '') + '/' + rel); } if (node.name === '.git') return false; return undefined; });
      } else expanded.push(p);
    }
    const inputs = files.length ? c.input(expanded) : c.input([]);
    const showName = !f.h && (inputs.length > 1 || rec);
    let matched = 0, code = 1;
    const A = parseInt(f.A || f.C || 0, 10), B = parseInt(f.B || f.C || 0, 10);
    const maxCount = f.m ? parseInt(f.m, 10) : Infinity;
    for (const inp of inputs) {
      if (inp.text === null) { code = 2; continue; }
      const L = lines(inp.text);
      let cnt = 0;
      const out = [];
      let lastPrinted = -1;
      const name = color ? C.magenta(inp.name) + C.cyan(':') : inp.name + ':';
      const prefix = (i, sep = ':') => (showName ? (color ? C.magenta(inp.name) + C.cyan(sep) : inp.name + sep) : '') + (f.n ? (color ? C.green(String(i + 1)) + C.cyan(sep) : (i + 1) + sep) : '');
      for (let i = 0; i < L.length && cnt < maxCount; i++) {
        re.lastIndex = 0;
        const hit = re.test(L[i]);
        if (hit === !!f.v) continue;
        cnt++;
        if (f.q) return 0;
        if (f.l || f.c) continue;
        if (f.o && !f.v) { re.lastIndex = 0; let m; while ((m = re.exec(L[i]))) { if (!m[0]) { re.lastIndex++; continue; } out.push(prefix(i) + (color ? C.style(['bold', 'red'], m[0]) : m[0])); } continue; }
        for (let k = Math.max(lastPrinted + 1, i - B); k < i; k++) out.push(prefix(k, '-') + L[k]);
        if (lastPrinted >= 0 && i - B > lastPrinted + 1 && (A || B)) out.push(color ? C.cyan('--') : '--');
        const text = color && !f.v ? L[i].replace(re, (m) => C.style(['bold', 'red'], m)) : L[i];
        out.push(prefix(i) + text);
        lastPrinted = i;
        let k = i + 1;
        for (; k <= Math.min(L.length - 1, i + A); k++) { re.lastIndex = 0; if (re.test(L[k]) !== !!f.v) break; out.push(prefix(k, '-') + L[k]); lastPrinted = k; }
      }
      void name;
      if (cnt) { matched += cnt; code = code === 2 ? 2 : 0; }
      if (f.c) c.outln((showName ? (color ? C.magenta(inp.name) + C.cyan(':') : inp.name + ':') : '') + cnt);
      else if (f.l) { if (cnt) c.outln(color ? C.magenta(inp.name) : inp.name); }
      else if (out.length) c.out(out.join('\n') + '\n');
    }
    if (f.L) return 0;
    return matched ? 0 : code === 2 ? 2 : 1;
  });
  def('sed', (c) => {
    const { f, rest } = getopt(c.args, 'nEire:', { quiet: 'n', 'regexp-extended': 'E', 'in-place': 'i', expression: 'e' });
    const scripts = [];
    if (f.e) scripts.push(f.e);
    if (!scripts.length) { if (!rest.length) return c.fail('no script specified'); scripts.push(rest.shift()); }
    const ext = f.E || f.r;
    // parse commands
    const cmdsList = [];
    const parseAddr = (s, i) => {
      if (s[i] === '$') return [{ last: true }, i + 1];
      if (/\d/.test(s[i])) { let j = i; while (/\d/.test(s[j])) j++; return [{ line: parseInt(s.slice(i, j), 10) }, j]; }
      if (s[i] === '/') { let j = i + 1, r = ''; while (j < s.length && s[j] !== '/') { if (s[j] === '\\' && s[j + 1] === '/') { r += '/'; j += 2; continue; } r += s[j++]; } return [{ re: new RegExp(TX.bre(r, ext)) }, j + 1]; }
      return [null, i];
    };
    try {
      for (const script of scripts) {
        let s = script, i = 0;
        while (i < s.length) {
          while (i < s.length && /[\s;]/.test(s[i])) i++;
          if (i >= s.length) break;
          let a1, a2 = null;
          [a1, i] = parseAddr(s, i);
          if (a1 && s[i] === ',') [a2, i] = parseAddr(s, i + 1);
          let neg = false;
          if (s[i] === '!') { neg = true; i++; }
          const op = s[i++];
          const cmd = { a1, a2, neg, op };
          if (op === 's' || op === 'y') {
            const d = s[i++];
            const parts = [];
            let cur = '';
            while (i < s.length && parts.length < 2) { if (s[i] === '\\' && s[i + 1] === d) { cur += d; i += 2; continue; } if (s[i] === d) { parts.push(cur); cur = ''; i++; continue; } cur += s[i++]; }
            let flags = '';
            while (i < s.length && /[gipI0-9w]/.test(s[i])) flags += s[i++];
            if (op === 's') {
              const g = flags.includes('g'), ic = /[iI]/.test(flags);
              cmd.re = new RegExp(TX.bre(parts[0], ext), (g ? 'g' : '') + (ic ? 'i' : ''));
              cmd.nth = parseInt(flags.replace(/\D/g, ''), 10) || 0;
              cmd.rep = parts[1].replace(/\\(\d)/g, '$$$1').replace(/(^|[^\\])&/g, '$1$$&').replace(/\\&/g, '&').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
              cmd.print = flags.includes('p');
            } else { cmd.from = parts[0]; cmd.to = parts[1]; }
          } else if ('aic'.includes(op)) {
            let t = s.slice(i).replace(/^\\?\s*/, '');
            const end = t.indexOf(';') >= 0 && false ? t.indexOf(';') : t.length;
            cmd.text = t.slice(0, end); i += s.slice(i).length;
          } else if (op === 'q' || op === 'd' || op === 'p' || op === '=' || op === 'n' || op === 'G') { /* no args */ }
          else throw new Error(`-e expression #1, char ${i}: unknown command: \`${op}'`);
          cmdsList.push(cmd);
        }
      }
    } catch (e) { return c.fail(e.message); }
    const files = rest;
    const process = (text) => {
      const L = lines(text);
      const out = [];
      const ranges = new Map();
      let quit = false;
      for (let li = 0; li < L.length && !quit; li++) {
        let line = L[li];
        let deleted = false;
        const after = [];
        const isLast = li === L.length - 1;
        const matchAddr = (a) => (a.last ? isLast : a.line ? a.line === li + 1 : a.re.test(line));
        for (const cmd of cmdsList) {
          let sel = true;
          if (cmd.a1 && !cmd.a2) sel = matchAddr(cmd.a1);
          else if (cmd.a1 && cmd.a2) {
            const active = ranges.get(cmd);
            if (active) { sel = true; if (cmd.a2.line ? li + 1 >= cmd.a2.line : matchAddr(cmd.a2)) ranges.delete(cmd); }
            else if (matchAddr(cmd.a1)) { sel = true; if (!(cmd.a2.line && cmd.a2.line <= li + 1)) ranges.set(cmd, true); }
            else sel = false;
          }
          if (cmd.neg) sel = !sel;
          if (!sel) continue;
          switch (cmd.op) {
            case 's': {
              if (cmd.nth) { let k = 0; const re = new RegExp(cmd.re.source, cmd.re.flags.includes('g') ? cmd.re.flags : cmd.re.flags + 'g'); const nl = line.replace(re, (...m) => (++k === cmd.nth ? m[0].replace(new RegExp(cmd.re.source, cmd.re.flags.replace('g', '')), cmd.rep) : m[0])); if (nl !== line && cmd.print) out.push(nl); line = nl; }
              else { cmd.re.lastIndex = 0; const hit = cmd.re.test(line); cmd.re.lastIndex = 0; line = line.replace(cmd.re, cmd.rep); if (hit && cmd.print) out.push(line); }
              break;
            }
            case 'y': line = [...line].map((ch) => { const k = cmd.from.indexOf(ch); return k >= 0 ? cmd.to[k] : ch; }).join(''); break;
            case 'd': deleted = true; break;
            case 'p': out.push(line); break;
            case '=': out.push(String(li + 1)); break;
            case 'a': after.push(cmd.text); break;
            case 'i': out.push(cmd.text); break;
            case 'c': line = cmd.text; break;
            case 'G': line += '\n'; break;
            case 'q': quit = true; break;
          }
          if (deleted) break;
        }
        if (!deleted && !f.n) out.push(line);
        out.push(...after);
      }
      return out.length ? out.join('\n') + '\n' : '';
    };
    if (f.i) {
      for (const p of files) { try { const segs = c.path(p); c.vfs.writeFile(segs, process(c.vfs.readFile(segs, { user: c.user })), { user: c.user }); } catch (e) { c.err(`sed: can't read ${p}: ${FS_MSG[e.code]}\n`); return 2; } }
      return 0;
    }
    let code = 0;
    for (const inp of c.input(files)) { if (inp.text === null) { code = 2; continue; } c.out(process(inp.text)); }
    return code;
  });
  def('awk gawk mawk', (c) => {
    const { f, rest } = getopt(c.args, 'F:v:f:');
    let prog = rest.shift();
    if (f.f) { try { prog = c.vfs.readFile(c.path(f.f)); rest.unshift(prog); prog = rest.shift(); } catch (e) { return c.fail(`fatal: can't open source file \`${f.f}'`, 2); } }
    if (prog === undefined) { c.err('usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]\n'); return 2; }
    const vars = {};
    if (f.v) { const [k, v] = String(f.v).split('='); vars[k] = v; }
    try {
      const inputs = c.input(rest);
      const out = TX.awk(prog, inputs.filter((x) => x.text !== null), { FS: f.F !== undefined ? TX.escapes(f.F) : ' ', vars, write: (s) => c.out(s) });
      return out;
    } catch (e) { c.err(`awk: ${e.message}\n`); return 2; }
  });
  def('tee', (c) => {
    const { f, rest } = getopt(c.args, 'a', { append: 'a' });
    const t = c.stdin || '';
    let code = 0;
    rest.forEach((p) => { try { c.vfs.writeFile(c.path(p), t, { append: !!f.a, user: c.user, owner: c.user }); } catch (e) { c.err(`tee: ${p}: ${FS_MSG[e.code]}\n`); code = 1; } });
    c.out(t);
    return code;
  });
  def('xargs', async (c) => {
    const { f, rest } = getopt(c.args, 'n:I:0tr');
    const cmd = rest.length ? rest : ['echo'];
    const items = f[0] ? (c.stdin || '').split('\0').filter(Boolean) : (c.stdin || '').match(/"[^"]*"|'[^']*'|\S+/g) || [];
    const clean = items.map((x) => x.replace(/^["']|["']$/g, ''));
    let code = 0;
    const io = Object.assign({}, c.io, { stdin: null });
    const run = async (argv) => { if (f.t) c.err(argv.join(' ') + '\n'); const r = await c.sh.invoke(argv, io); if (r) code = 123; };
    if (f.I) { const lines2 = (c.stdin || '').split('\n').filter(Boolean); for (const l of lines2) await run(cmd.map((a) => a.split(f.I).join(l))); return code; }
    if (!clean.length && f.r) return 0;
    const n = f.n ? parseInt(f.n, 10) : clean.length || 1;
    for (let i = 0; i < Math.max(clean.length, 1); i += n) await run(cmd.concat(clean.slice(i, i + n)));
    return code;
  });
  def('diff', (c) => {
    const { f, rest } = getopt(c.args, 'uqyiwbBr', { unified: 'u', brief: 'q', 'side-by-side': 'y' });
    if (rest.length < 2) return c.fail(`missing operand after '${rest[0] || 'diff'}'`, 2);
    const [a, b] = c.input(rest.slice(0, 2));
    if (a.text === null || b.text === null) return 2;
    let at = a.text, bt = b.text;
    if (f.i) { at = at.toLowerCase(); bt = bt.toLowerCase(); }
    if (at === bt) return 0;
    if (f.q) { c.outln(`Files ${rest[0]} and ${rest[1]} differ`); return 1; }
    const color = c.tty && c.args.includes('--color');
    if (f.u) {
      c.outln(`--- ${rest[0]}\t${TX.isoDate(Date.now())}.000000000 -0400\n+++ ${rest[1]}\t${TX.isoDate(Date.now())}.000000000 -0400`);
      TX.unifiedDiff(a.text, b.text).forEach((h) => { c.outln(color ? C.cyan(h.header) : h.header); h.lines.forEach((l) => c.outln(color && l.op !== ' ' ? (l.op === '+' ? C.green : C.red)(l.op + l.line) : l.op + l.line)); });
      return 1;
    }
    // normal diff format
    const d = TX.diffLines(lines(a.text), lines(b.text));
    let ai = 0, bi = 0, i = 0;
    while (i < d.length) {
      if (d[i].op === ' ') { ai++; bi++; i++; continue; }
      const dels = [], adds = [];
      while (i < d.length && d[i].op !== ' ') { if (d[i].op === '-') dels.push(d[i].line); else adds.push(d[i].line); i++; }
      const r = (s, n) => (n <= 1 ? String(s + (n ? 1 : 0)) : (s + 1) + ',' + (s + n));
      const op = dels.length && adds.length ? 'c' : dels.length ? 'd' : 'a';
      c.outln((op === 'a' ? String(ai) : r(ai, dels.length)) + op + (op === 'd' ? String(bi) : r(bi, adds.length)));
      dels.forEach((l) => c.outln('< ' + l));
      if (op === 'c') c.outln('---');
      adds.forEach((l) => c.outln('> ' + l));
      ai += dels.length; bi += adds.length;
    }
    return 1;
  });
  def('cmp', (c) => {
    const [a, b] = c.input(c.args.slice(0, 2));
    if (!a || !b || a.text === null || b.text === null) return 2;
    for (let i = 0, line = 1; i < Math.max(a.text.length, b.text.length); i++) {
      if (a.text[i] !== b.text[i]) { if (i >= a.text.length || i >= b.text.length) { c.err(`cmp: EOF on ${i >= a.text.length ? c.args[0] : c.args[1]}\n`); return 1; } c.outln(`${c.args[0]} ${c.args[1]} differ: byte ${i + 1}, line ${line}`); return 1; }
      if (a.text[i] === '\n') line++;
    }
    return 0;
  });
  def('comm', (c) => {
    const { f, rest } = getopt(c.args, '123');
    const [a, b] = c.input(rest.slice(0, 2));
    const A = lines(a.text || ''), B = lines(b.text || '');
    let i = 0, j = 0;
    const col = (n, s) => { if (f[n]) return; const pre = [1, 2, 3].slice(0, n - 1).filter((k) => !f[k]).length; c.outln('\t'.repeat(pre) + s); };
    while (i < A.length || j < B.length) {
      if (j >= B.length || (i < A.length && A[i] < B[j])) col(1, A[i++]);
      else if (i >= A.length || B[j] < A[i]) col(2, B[j++]);
      else { col(3, A[i]); i++; j++; }
    }
  });
  def('column', (c) => {
    const { f, rest } = getopt(c.args, 'ts:o:');
    const inp = c.input(rest)[0];
    const L = lines(inp.text || '');
    if (f.t) { const sep = f.s ? new RegExp('[' + f.s.replace(/[\]\\]/g, '\\$&') + ']') : /\s+/; c.outln(TX.table(L.map((l) => l.split(sep)), [], f.o || '  ')); return; }
    c.outln(TX.columns(L, c.cols));
  });
  def('paste', (c) => {
    const { f, rest } = getopt(c.args, 'd:s');
    const d = f.d ? TX.escapes(f.d) : '\t';
    const inputs = c.input(rest).map((x) => lines(x.text || ''));
    if (f.s) { inputs.forEach((L) => c.outln(L.join(d))); return; }
    const n = Math.max(0, ...inputs.map((L) => L.length));
    for (let i = 0; i < n; i++) c.outln(inputs.map((L) => L[i] || '').join(d));
  });
  def('fold', (c) => { const { f, rest } = getopt(c.args, 'w:sb'); const w = parseInt(f.w || 80, 10); for (const inp of c.input(rest)) lines(inp.text || '').forEach((l) => { if (!l) c.outln(''); for (let i = 0; i < l.length; i += w) c.outln(l.slice(i, i + w)); }); });
  def('split', (c) => { const { f, rest } = getopt(c.args, 'l:b:d'); const n = parseInt(f.l || 1000, 10); const inp = c.input(rest.slice(0, 1))[0]; const pre = rest[1] || 'x'; const L = lines(inp.text || ''); let k = 0; for (let i = 0; i < L.length; i += n, k++) { const suf = String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26)); c.vfs.writeFile(c.path(pre + suf), L.slice(i, i + n).join('\n') + '\n', { user: c.user, owner: c.user }); } });
  def('seq', (c) => {
    const { f, rest } = getopt(c.args, 's:w');
    const nums = rest.map(Number);
    if (!nums.length || nums.some(isNaN)) return c.fail('missing operand');
    const [a, st, b] = nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums;
    const out = [];
    const dec = Math.max(...rest.map((x) => (x.split('.')[1] || '').length));
    for (let x = a; st > 0 ? x <= b + 1e-9 : x >= b - 1e-9; x += st) { out.push(dec ? x.toFixed(dec) : String(Math.round(x))); if (out.length > 100000) break; }
    const w = f.w ? Math.max(...out.map((x) => x.length)) : 0;
    c.out(out.map((x) => x.padStart(w, '0')).join(f.s !== undefined ? TX.escapes(f.s) : '\n') + '\n');
  });
  def('shuf', (c) => {
    const { f, rest } = getopt(c.args, 'n:i:e');
    let L;
    if (f.i) { const [a, b] = f.i.split('-').map(Number); L = []; for (let x = a; x <= b; x++) L.push(String(x)); }
    else if (f.e) L = rest; else L = lines(c.input(rest)[0].text || '');
    for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
    if (f.n) L = L.slice(0, parseInt(f.n, 10));
    if (L.length) c.out(L.join('\n') + '\n');
  });
  def('yes', async (c) => {
    const s = c.args.length ? c.args.join(' ') : 'y';
    if (!c.tty) { c.out((s + '\n').repeat(2000)); return; }
    try { for (let k = 0; k < 20000; k++) { c.out((s + '\n').repeat(40)); await c.sleep(16); } } catch (e) { if (e.interrupt) { c.out('\n'); return 130; } throw e; }
  });
  def('factor', (c) => {
    const nums = c.args.length ? c.args : (c.stdin || '').split(/\s+/).filter(Boolean);
    for (const s of nums) {
      let n = parseInt(s, 10); if (isNaN(n) || n < 1) { c.err(`factor: '${s}' is not a valid positive integer\n`); continue; }
      const fs = []; let d = 2; const orig = n;
      while (n > 1 && d * d <= n) { while (n % d === 0) { fs.push(d); n /= d; } d++; }
      if (n > 1) fs.push(n);
      c.outln(orig + ':' + fs.map((x) => ' ' + x).join(''));
    }
  });
  def('expr', (c) => {
    const a = c.args;
    if (a.length === 3) {
      const [x, op, y] = a; const nx = parseInt(x, 10), ny = parseInt(y, 10);
      const ops = { '+': nx + ny, '-': nx - ny, '*': nx * ny, '/': ny ? Math.trunc(nx / ny) : null, '%': ny ? nx % ny : null, '=': x === y ? 1 : 0, '!=': x !== y ? 1 : 0, '<': nx < ny ? 1 : 0, '>': nx > ny ? 1 : 0, '<=': nx <= ny ? 1 : 0, '>=': nx >= ny ? 1 : 0 };
      if (op === ':') { const m = new RegExp('^' + TX.bre(y)).exec(x); c.outln(m ? (m[1] !== undefined ? m[1] : String(m[0].length)) : '0'); return m ? 0 : 1; }
      if (!(op in ops)) return c.fail('syntax error', 2);
      if (ops[op] === null) return c.fail('division by zero', 2);
      if (['+', '-', '*', '/', '%'].includes(op) && (isNaN(nx) || isNaN(ny))) return c.fail('non-integer argument', 2);
      c.outln(String(ops[op])); return ops[op] === 0 ? 1 : 0;
    }
    if (a[0] === 'length') { c.outln(String((a[1] || '').length)); return 0; }
    if (a.length === 1) { c.outln(a[0]); return 0; }
    return c.fail('syntax error', 2);
  });
  def('bc', async (c) => {
    const { f } = getopt(c.args, 'lq');
    const scale = { v: f.l ? 20 : 0 };
    const vars = {};
    const evalLine = (l) => {
      l = l.trim();
      if (!l || l.startsWith('#')) return null;
      let m;
      if ((m = /^scale\s*=\s*(\d+)$/.exec(l))) { scale.v = +m[1]; return null; }
      if ((m = /^([a-z_]\w*)\s*=\s*(.+)$/.exec(l))) { vars[m[1]] = evalExpr(m[2]); return null; }
      return evalExpr(l);
    };
    const evalExpr = (e) => {
      const js = e.replace(/\^/g, '**').replace(/\bsqrt\(/g, 'Math.sqrt(').replace(/\bs\(/g, 'Math.sin(').replace(/\bc\(/g, 'Math.cos(').replace(/\bl\(/g, 'Math.log(').replace(/\be\(/g, 'Math.exp(').replace(/\ba\(/g, 'Math.atan(').replace(/\b([a-z_]\w*)\b(?!\()/g, (m) => (m === 'Math' ? m : String(vars[m] || 0)));
      if (!/^[\d\s+\-*/%().,*A-Za-z]*$/.test(js)) throw new Error('syntax error');
      // eslint-disable-next-line no-new-func
      let v = Function('"use strict";return (' + js + ')')();
      if (!isFinite(v)) throw new Error('Runtime error: divide by zero');
      if (scale.v === 0 && !/[.]/.test(e)) v = Math.trunc(v);
      return scale.v ? String(Number(v.toFixed(scale.v))) : String(v);
    };
    const run = (text) => { for (const l of text.split(/[\n;]/)) { try { const r = evalLine(l); if (r !== null) c.outln(r); } catch (e) { c.err(`(standard_in) 1: ${e.message}\n`); } } };
    if (c.stdin != null) { run(c.stdin); return; }
    if (!f.q) c.outln('bc 1.07.1\nCopyright 1991-1994, 1997, 1998, 2000, 2004, 2006, 2008, 2012-2017 Free Software Foundation, Inc.\nThis is free software with ABSOLUTELY NO WARRANTY.\nFor details type `warranty\'. Type quit or Ctrl+C to exit.');
    while (true) {
      const l = await c.term.readLine({ prompt: '' });
      if (l === null || l.trim() === 'quit') return 0;
      run(l);
    }
  });
  def('md5sum sha1sum sha256sum shasum md5', (c) => {
    const algo = c.name === 'md5sum' || c.name === 'md5' ? TX.md5 : c.name === 'sha1sum' || (c.name === 'shasum' && !c.args.includes('256')) ? TX.sha1 : TX.sha256;
    const files = c.args.filter((a) => !a.startsWith('-') && a !== '256');
    for (const inp of c.input(files)) {
      if (inp.text === null) continue;
      const h = algo(inp.text);
      c.outln(c.name === 'md5' ? `MD5 (${inp.name}) = ${h}` : h + '  ' + inp.name);
    }
  });
  def('base64', (c) => {
    const { f, rest } = getopt(c.args, 'dw:', { decode: 'd' });
    const inp = c.input(rest)[0];
    if (inp.text === null) return 1;
    try { if (f.d || c.args.includes('-D')) c.out(TX.b64decode(inp.text)); else c.outln(TX.b64encode(inp.text).replace(/(.{76})/g, '$1\n').replace(/\n$/, '')); }
    catch (e) { return c.fail('invalid input'); }
  });
  def('xxd hexdump od', (c) => {
    const inp = c.input(c.args.filter((a) => !a.startsWith('-')))[0];
    if (inp.text === null) return 1;
    const b = new TextEncoder().encode(inp.text);
    for (let i = 0; i < Math.min(b.length, 4096); i += 16) {
      const chunk = [...b.slice(i, i + 16)];
      const hex = chunk.map((x) => x.toString(16).padStart(2, '0'));
      const pairs = []; for (let k = 0; k < hex.length; k += 2) pairs.push(hex[k] + (hex[k + 1] || ''));
      c.outln(i.toString(16).padStart(8, '0') + ': ' + pairs.join(' ').padEnd(40) + ' ' + chunk.map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join(''));
    }
  });
  def('strings', (c) => { const inp = c.input(c.args)[0]; (inp.text || '').split(/[^\x20-\x7e]+/).filter((s) => s.length >= 4).forEach((s) => c.outln(s)); });

  // ------------------------------------------------------------------ archives (mock but functional)
  function packTree(vfs, segs, base) {
    const out = [];
    vfs.walk(segs, (n, s) => { out.push({ p: base.concat(s.slice(segs.length)).join('/'), t: n.t, c: n.t === 'f' ? vfs.content(n) : undefined, sz: n.sz, mode: n.mode }); });
    return out;
  }
  function unpack(c, text, destSegs, verbose, listOnly) {
    let entries;
    try { entries = JSON.parse(text.replace(/^TXARCHIVE\n/, '')); } catch (e) { throw new Error('This does not look like a tar archive'); }
    for (const e of entries) {
      if (verbose || listOnly) c.outln(listOnly && verbose ? `${e.t === 'd' ? 'drwxr-xr-x' : '-rw-r--r--'} ${c.user}/${c.user} ${String(e.sz || (e.c || '').length).padStart(8)} ${TX.isoDate(Date.now()).slice(0, 16)} ${e.p}${e.t === 'd' ? '/' : ''}` : e.p + (e.t === 'd' ? '/' : ''));
      if (listOnly) continue;
      const segs = destSegs.concat(e.p.split('/'));
      if (e.t === 'd') c.vfs.mkdir(segs, { parents: true, user: c.user, owner: c.user });
      else { c.vfs.mkdir(segs.slice(0, -1), { parents: true, user: c.user, owner: c.user }); const n = c.vfs.writeFile(segs, e.c || '', { user: c.user, owner: c.user }); if (e.sz) n.sz = e.sz; if (e.mode) n.mode = e.mode; }
    }
  }
  def('tar', (c) => {
    let a = c.args.slice();
    if (a[0] && !a[0].startsWith('-') && /^[cxtvzfjJ]+$/.test(a[0])) a[0] = '-' + a[0];
    const { f, rest } = getopt(a, 'cxtvzjJf:C:', { create: 'c', extract: 'x', list: 't', verbose: 'v', gzip: 'z', file: 'f', directory: 'C' });
    if (!f.c && !f.x && !f.t) return c.fail('You must specify one of the \'-Acdtrux\', \'--delete\' or \'--test-label\' options\nTry \'tar --help\' or \'tar --usage\' for more information.', 2);
    if (!f.f) return c.fail('Refusing to write archive contents to terminal (missing -f option?)', 2);
    try {
      if (f.c) {
        if (!rest.length) return c.fail('Cowardly refusing to create an empty archive', 2);
        let entries = [];
        for (const p of rest) {
          const segs = c.path(p);
          if (!c.vfs.get(segs)) { c.err(`tar: ${p}: Cannot stat: No such file or directory\n`); continue; }
          const packed = packTree(c.vfs, segs, p.replace(/\/$/, '').split('/').filter((x) => x && x !== '.' && x !== '..').slice(-1));
          if (f.v) packed.forEach((e) => c.outln(e.p + (e.t === 'd' ? '/' : '')));
          entries = entries.concat(packed);
        }
        const text = 'TXARCHIVE\n' + JSON.stringify(entries);
        const n = c.vfs.writeFile(c.path(f.f), text, { user: c.user, owner: c.user });
        const raw = entries.reduce((s, e) => s + (e.sz || (e.c || '').length) + 512, 0);
        n.sz = Math.max(text.length, f.z || f.j || f.J ? Math.floor(raw * 0.35) : raw + 10240);
        return 0;
      }
      const text = c.vfs.readFile(c.path(f.f), { user: c.user });
      unpack(c, text, f.C ? c.path(f.C) : c.sh.cwd, f.v, f.t);
    } catch (e) {
      if (e instanceof TX.FsError) return c.fail(`${f.f}: Cannot open: ${FS_MSG[e.code]}`, 2);
      return c.fail(e.message, 2);
    }
  });
  def('zip', (c) => {
    const { f, rest } = getopt(c.args, 'rqv9');
    const zipName = rest.shift();
    if (!zipName || !rest.length) { c.outln('zip error: Nothing to do! (' + (zipName || '') + ')'); return 12; }
    const out = zipName.endsWith('.zip') ? zipName : zipName + '.zip';
    let entries = [];
    for (const p of rest) {
      const segs = c.path(p); const n = c.vfs.get(segs);
      if (!n) { c.outln(`\tzip warning: name not matched: ${p}`); continue; }
      if (n.t === 'd' && !f.r) { entries.push({ p, t: 'd' }); c.outln(`  adding: ${p}/ (stored 0%)`); continue; }
      const packed = packTree(c.vfs, segs, [p.replace(/\/$/, '')]);
      packed.forEach((e) => { if (!f.q) c.outln(`  adding: ${e.p}${e.t === 'd' ? '/ (stored 0%)' : ` (deflated ${TX.randInt(20, 75)}%)`}`); });
      entries = entries.concat(packed);
    }
    const node = c.vfs.writeFile(c.path(out), 'TXARCHIVE\n' + JSON.stringify(entries), { user: c.user, owner: c.user });
    node.sz = Math.floor(entries.reduce((s, e) => s + (e.sz || (e.c || '').length), 0) * 0.5) + 200;
  });
  def('unzip', (c) => {
    const { f, rest } = getopt(c.args, 'lod:q');
    const p = rest[0];
    if (!p) { c.outln('UnZip 6.00 of 20 April 2009. Usage: unzip [-opts] file[.zip]'); return 0; }
    let text;
    try { text = c.vfs.readFile(c.path(p), { user: c.user }); } catch (e) { c.outln(`unzip:  cannot find or open ${p}, ${p}.zip or ${p}.ZIP.`); return 9; }
    if (!text.startsWith('TXARCHIVE')) { c.outln(`Archive:  ${p}\n  (this mock file has no real contents to extract — try zipping a folder yourself first!)`); return 0; }
    c.outln(`Archive:  ${p}`);
    try {
      const entries = JSON.parse(text.replace(/^TXARCHIVE\n/, ''));
      if (f.l) { c.outln('  Length      Date    Time    Name\n---------  ---------- -----   ----'); let t = 0; entries.forEach((e) => { const s = e.sz || (e.c || '').length; t += s; c.outln(String(s).padStart(9) + '  ' + TX.isoDate(Date.now()).slice(0, 16) + '   ' + e.p + (e.t === 'd' ? '/' : '')); }); c.outln(`---------                     -------\n${String(t).padStart(9)}                     ${entries.length} files`); return 0; }
      entries.forEach((e) => { if (!f.q) c.outln(e.t === 'd' ? `   creating: ${e.p}/` : `  inflating: ${e.p}`); });
      unpack(c, text, f.d ? c.path(f.d) : c.sh.cwd, false, false);
    } catch (e) { return c.fail(e.message); }
  });
  def('gzip gunzip', (c) => {
    const { f, rest } = getopt(c.args, 'dkcv9');
    const decompress = c.name === 'gunzip' || f.d;
    for (const p of rest) {
      const segs = c.path(p);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`gzip: ${p}: No such file or directory\n`); continue; }
      if (decompress) {
        if (!p.endsWith('.gz')) { c.err(`gzip: ${p}: unknown suffix -- ignored\n`); continue; }
        const txt = c.vfs.content(n);
        const orig = txt.startsWith('TXGZ\n') ? txt.slice(5) : txt;
        c.vfs.writeFile(segs.slice(0, -1).concat(n.name.slice(0, -3)), orig, { user: c.user, owner: c.user });
        if (!f.k) c.vfs.remove(segs, { user: c.user });
      } else {
        const txt = c.vfs.content(n);
        const nn = c.vfs.writeFile(segs.slice(0, -1).concat(n.name + '.gz'), 'TXGZ\n' + txt, { user: c.user, owner: c.user });
        nn.sz = Math.max(30, Math.floor((n.sz || txt.length) * 0.4));
        if (f.v) c.err(`${p}:\t${TX.randInt(40, 70)}.${TX.randInt(0, 9)}% -- replaced with ${p}.gz\n`);
        if (!f.k) c.vfs.remove(segs, { user: c.user });
      }
    }
  });
  def('zcat', (c) => { for (const inp of c.input(c.args)) if (inp.text !== null) c.out(inp.text.replace(/^TXGZ\n/, '')); });
})();
