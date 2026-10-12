/* TerminalEX — MS-DOS 6.22 (1994): the machine and COMMAND.COM.
 * Built on the cmd.exe engine (batch files, IF, FOR, GOTO, pipes, redirects) with DOS's own rules:
 * 8.3 UPPERCASE file names, "Bad command or file name", programs found through PATH (delete FORMAT.COM and FORMAT is gone),
 * no command history until you load DOSKEY, no && or &, drives A: (floppy) C: (hard disk) D: (CD-ROM). */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const W = TX.Paths.win;
  const S = TX.SAMPLE;
  const INTERNAL = TX.cmdInternal;

  // ------------------------------------------------------------------ the machine
  const DOS_TIME = new Date('1994-05-31T06:22:00').getTime();
  const sys = (size, extra) => Object.assign({ $size: size, $mt: DOS_TIME }, extra || {});
  const crlf = (s) => s;
  const AUTOEXEC = crlf('@ECHO OFF\nPROMPT $P$G\nPATH C:\\DOS;C:\\WINDOWS\nSET TEMP=C:\\DOS\nSET BLASTER=A220 I5 D1 T4\nLH C:\\DOS\\SMARTDRV.EXE /X\nLH C:\\DOS\\MSCDEX.EXE /D:MSCD001 /L:D\n');
  const CONFIG = crlf('DEVICE=C:\\DOS\\HIMEM.SYS\nDEVICE=C:\\DOS\\EMM386.EXE NOEMS\nDOS=HIGH,UMB\nFILES=40\nBUFFERS=20\nDEVICEHIGH=C:\\DOS\\SETVER.EXE\nDEVICEHIGH=C:\\CDROM\\OAKCDROM.SYS /D:MSCD001\nSTACKS=9,256\n');
  const HELLO_BAT = crlf('@ECHO OFF\nREM A tiny batch file. Run it by typing: HELLO\nECHO Hello from a 1994 batch file!\nECHO You are in %TEMP% ... no wait, that is the TEMP folder.\nECHO Your PATH is %PATH%\n');
  const MENU_BAT = crlf('@ECHO OFF\n:MENU\nECHO.\nECHO  1. Show files\nECHO  2. Show memory\nECHO  3. Quit\nCHOICE /C:123 Pick one\nIF ERRORLEVEL 3 GOTO END\nIF ERRORLEVEL 2 GOTO MEM\nDIR /W\nGOTO MENU\n:MEM\nMEM\nGOTO MENU\n:END\nECHO Bye!\n');
  const HELLO_BAS = crlf('10 PRINT "HELLO FROM QBASIC"\n20 FOR I = 1 TO 5\n30 PRINT I; "SQUARED IS"; I * I\n40 NEXT I\n50 END\n');
  function buildDos() {
    const dosExe = {};
    [['ATTRIB.EXE', 11165], ['CHKDSK.EXE', 12241], ['CHOICE.COM', 1754], ['DEFRAG.EXE', 75033], ['DELTREE.EXE', 11113], ['DISKCOPY.COM', 13335], ['DOSKEY.COM', 5883],
      ['EDIT.COM', 413], ['EMM386.EXE', 120926], ['FC.EXE', 18650], ['FDISK.EXE', 29336], ['FIND.EXE', 6770], ['FORMAT.COM', 22974], ['HELP.COM', 413], ['HIMEM.SYS', 29136],
      ['LABEL.EXE', 9390], ['MEM.EXE', 32150], ['MORE.COM', 2618], ['MOVE.EXE', 17823], ['MSCDEX.EXE', 25377], ['MSD.EXE', 158470], ['QBASIC.EXE', 194309], ['SCANDISK.EXE', 124262],
      ['SETVER.EXE', 12015], ['SMARTDRV.EXE', 45145], ['SORT.EXE', 6922], ['SYS.COM', 9432], ['TREE.COM', 6898], ['UNDELETE.EXE', 26420], ['XCOPY.EXE', 16930], ['DOSHELP.HLP', 5651], ['QBASIC.HLP', 130810]]
      .forEach(([n, s]) => { dosExe[n] = sys(s); });
    const spec = {
      // DOS had no users or permissions: everything belongs to whoever sits at the keyboard.
      'C:': {
        $uid: 'student',
        'IO.SYS': sys(40774, { $hidden: true, $sys: true, $ro: true }),
        'MSDOS.SYS': sys(38138, { $hidden: true, $sys: true, $ro: true }),
        'COMMAND.COM': sys(54645),
        'WINA20.386': sys(9349),
        'CONFIG.SYS': { $file: CONFIG, $mt: DOS_TIME + 86400000 * 120 },
        'AUTOEXEC.BAT': { $file: AUTOEXEC, $mt: DOS_TIME + 86400000 * 120 },
        DOS: dosExe,
        WINDOWS: { 'WIN.COM': sys(50904), 'WIN.INI': { $file: '[windows]\nload=\nrun=\n[Desktop]\nWallpaper=CASTLE.BMP\n', $mt: DOS_TIME }, 'SYSTEM.INI': { $file: '[boot]\nshell=progman.exe\n', $mt: DOS_TIME }, 'PROGMAN.EXE': sys(115312), 'SOL.EXE': sys(180688), 'WINMINE.EXE': sys(27776), 'CASTLE.BMP': sys(778), SYSTEM: { 'KRNL386.EXE': sys(75490) } },
        CDROM: { 'OAKCDROM.SYS': sys(41302) },
        GAMES: { KEEN: { 'KEEN1.EXE': sys(99300), 'README.TXT': { $file: 'Commander Keen in Invasion of the Vorticons\nRun KEEN1 to play. (TerminalEX can only pretend.)\n', $mt: DOS_TIME } }, OREGON: { 'OREGON.EXE': sys(141112) }, DOOM: { 'DOOM.EXE': sys(715493), 'DOOM1.WAD': sys(4196020) } },
        STUDENT: {
          'README.TXT': S.README.replace(/\(Windows: dir\)/, '(DOS: DIR)').replace('man CMD    manual page for a command (Linux/macOS)', 'HELP CMD   help for a DOS command'),
          'TODO.TXT': S.TODO, 'POEM.TXT': S.POEM, 'GRADES.CSV': S.GRADES, 'GROCERY.TXT': S.GROCERIES,
          'HELLO.BAT': HELLO_BAT, 'MENU.BAT': MENU_BAT, 'SECRET.TXT': { $file: 'You found the hidden file! DOS hides files with the H (hidden) attribute.\nUse  DIR /A  to see hidden files, and  ATTRIB  to change attributes.\nSecret code: DOS-1981-6022\n', $hidden: true },
          BASIC: { 'HELLO.BAS': HELLO_BAS },
          REPORTS: { 'BOOK.TXT': 'My book report: The Hobbit by J.R.R. Tolkien.\n', 'SCIENCE.TXT': 'Science fair: Does music help plants grow?\n' },
        },
      },
      'D:': { $uid: 'student', 'README.TXT': { $file: 'TerminalEX Encyclopedia CD-ROM (1995)\nThis drive is read-only, like a real CD.\n', $ro: true, $mt: DOS_TIME }, 'SETUP.EXE': sys(310000, { $ro: true }), DATA: { 'ENCYCLO.DAT': sys(512000000, { $ro: true }) } },
    };
    const root = TX.build(spec, '');
    // MS-DOS, Windows and the games were installed in 1994-95; only STUDENT holds recent files.
    let k = 0;
    (function walk(n, keep) { if (!keep && !n.mtFixed && (n.t === 'd' || n.mt > DOS_TIME + 86400000 * 400)) n.mt = DOS_TIME + 86400000 * (30 + ((k++ * 13) % 300)) + 3600000 * (k % 10); if (n.ch) Object.keys(n.ch).forEach((x) => walk(n.ch[x], keep || x === 'STUDENT')); })(root, false);
    return root;
  }
  TX.defineMachine('dos', {
    build: buildDos,
    procs: () => TX.mkProcs([{ pid: 1, name: 'COMMAND.COM', cmd: 'C:\\COMMAND.COM', rss: 4, vsz: 4 }]),
    services: () => [], users: ['student'], installed: [], home: ['C:'], ci: true, family: 'windows',
    net: { hostname: 'DOS-PC', ip: '', mac: '', gw: '', dns: '', iface: '' },
    hw: { cpu: 'Intel 486DX2-66', cores: 1, threads: 1, mhz: 66, memTotal: 8 * 1024, swap: 0, board: 'Gateway 2000 4DX2-66V', kernel: '6.22', os: 'MS-DOS', ver: '6.22' },
    disks: [{ dev: 'C:', model: 'Western Digital Caviar AC2420', size: 420413440 }],
    extra: () => ({ floppy: false, labels: { 'C:': 'MS-DOS_6', 'D:': 'ENCYCLO_95', 'A:': '' }, serial: { 'C:': '1A2B-3C4D', 'D:': '0C21-0995', 'A:': '2F11-07AC' }, deleted: [] }),
    gens: () => ({}),
  });

  // ------------------------------------------------------------------ helpers
  const INVALID = /[^A-Z0-9_$~!#%&{}()@'`^\-*?]/g;
  function dosName(s) {
    if (s === '.' || s === '..' || /^[A-Z]:$/i.test(s)) return s.toUpperCase();
    s = String(s).toUpperCase();
    const i = s.indexOf('.');
    const base = (i < 0 ? s : s.slice(0, i)).replace(INVALID, '').slice(0, 8);
    const ext = i < 0 ? '' : s.slice(i + 1).replace(/\./g, '').replace(INVALID, '').slice(0, 3);
    return ext ? base + '.' + ext : base;
  }
  TX.dosName = dosName;
  const split83 = (n) => { const i = n.lastIndexOf('.'); return i <= 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 1)]; };
  const fmtN = (n) => Number(n).toLocaleString('en-US');
  const dDate = (ms) => { const d = new Date(ms); return TX.p2(d.getMonth() + 1) + '-' + TX.p2(d.getDate()) + '-' + String(d.getFullYear()).slice(2); };
  const dTime = (ms) => { const d = new Date(ms); let h = d.getHours(); const ap = h >= 12 ? 'p' : 'a'; h = h % 12 || 12; return String(h).padStart(2) + ':' + TX.p2(d.getMinutes()) + ap; };
  const wildRe = (pat) => {
    const [b, e] = pat.includes('.') ? split83(pat) : [pat, pat === '*' ? '*' : ''];
    const part = (p) => p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.?');
    return new RegExp('^' + part(b) + (e === '*' ? '(\\..*)?' : e ? '\\.' + part(e) : '') + '$', 'i');
  };
  const hasWild = (s) => /[*?]/.test(s);
  const sizeOf = (vfs, n) => (n.t === 'd' ? 0 : vfs.size(n));
  const DRIVE_TOTAL = { 'C:': 420413440, 'D:': 618954752, 'A:': 1457664 };
  function freeBytes(sh, drive) {
    const root = sh.vfs.get([drive]);
    if (!root) return 0;
    if (drive === 'D:') return 0;
    let used = 0;
    sh.vfs.walk([drive], (n) => { if (n.t === 'f') used += sh.vfs.size(n); });
    return Math.max(0, DRIVE_TOTAL[drive] - used - (drive === 'C:' ? 96000000 : 0));
  }

  // ------------------------------------------------------------------ COMMAND.COM
  class DosShell extends TX.CmdShell {
    constructor(session, machine, opts = {}) {
      super(session, machine, Object.assign({}, opts, { noBanner: true }));
      this.dos = true;
      this.name = 'command';
      this.cwd = opts.cwd ? opts.cwd.slice() : ['C:'];
      this.home = ['C:'];
      this.driveCwd = { 'C:': this.cwd.slice() };
      this.history = session.historyFor('dos');
      this.vars = { COMSPEC: 'C:\\COMMAND.COM' };
      this.doskey = false;
      this.nested = !!opts.nested;
    }
    get noLineEditing() { return !this.doskey; }
    title() { return 'MS-DOS Prompt'; }
    banner() { return this.nested ? '\nMicrosoft(R) MS-DOS(R) Version 6.22\n             (C)Copyright Microsoft Corp 1981-1994.\n\n' : ''; }
    // Boot: CONFIG.SYS, then AUTOEXEC.BAT really runs — edit it and the next boot changes.
    async boot(io) {
      io = io || this.ttyIO();
      io.out('Starting MS-DOS...\n\n');
      io.out('HIMEM is testing extended memory...done.\n');
      let cfg = '';
      try { cfg = this.vfs.readFile(['C:', 'CONFIG.SYS']); } catch (e) { /* none */ }
      if (/EMM386/i.test(cfg)) io.out('\nMICROSOFT Expanded Memory Manager 386  Version 4.49\nCopyright Microsoft Corporation 1986, 1994\n\n      EMM386 successfully installed.\n');
      if (/OAKCDROM/i.test(cfg)) io.out('\nOAK Technology CD-ROM driver version 3.2\n   Drive MSCD001 ready\n');
      const ae = this.vfs.get(['C:', 'AUTOEXEC.BAT']);
      io.out('\n');
      if (ae) { this.needBlank = false; await this.runBatch(this.vfs.content(ae), ['C:\\AUTOEXEC.BAT'], io); }
      else { io.out('Current date is ' + this.dateLine() + '\nEnter new date (mm-dd-yy): \nCurrent time is ' + this.timeLine() + '\nEnter new time: \n\n'); }
      io.out(TX.C.dim('(TerminalEX: MS-DOS 6.22 from 1994. File names are 8.3 and UPPERCASE. Arrow-key history only works after you run DOSKEY. Type HELP for commands.)') + '\n');
      this.needBlank = true;
    }
    dateLine() { const d = new Date(); return TX.DAY[d.getDay()] + ' ' + TX.p2(d.getMonth() + 1) + '-' + TX.p2(d.getDate()) + '-' + d.getFullYear(); }
    timeLine() { const d = new Date(); return d.getHours() + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds()) + '.' + TX.p2(Math.floor(d.getMilliseconds() / 10)); }
    promptText() {
      const p = this.vars.PROMPT === undefined ? '$N$G' : this.vars.PROMPT;
      const d = new Date();
      return p.replace(/\$(.)/g, (_, k) => ({ P: W.format(this.cwd), p: W.format(this.cwd), G: '>', g: '>', L: '<', l: '<', B: '|', b: '|', Q: '=', q: '=', $: '$', _: '\n', N: this.cwd[0][0], n: this.cwd[0][0], D: this.dateLine(), d: this.dateLine(), T: this.timeLine(), t: this.timeLine(), V: 'MS-DOS Version 6.22', v: 'MS-DOS Version 6.22', H: '\b', h: '\b', E: '\x1b', e: '\x1b' }[k] ?? ''));
    }
    getVar(name) {
      const k = Object.keys(this.vars).find((x) => x.toUpperCase() === name.toUpperCase());
      return k ? this.vars[k] : undefined;
    }
    setVar(name, val) {
      const k = Object.keys(this.vars).find((x) => x.toUpperCase() === name.toUpperCase()) || name.toUpperCase();
      if (val === '' || val === undefined) delete this.vars[k]; else this.vars[k] = val;
    }
    // DOS has no & && || — the whole line is one command.
    splitTop(line) { return [{ text: line, op: null }]; }
    resolve(p) {
      const segs = W.parse(String(p).replace(/^"|"$/g, ''), this.cwd, this.home);
      return this.vfs.canon(segs.map((s, i) => (i === 0 ? s.toUpperCase() : dosName(s))));
    }
    errText(e) { return { ENOENT: 'File not found', ENOTDIR: 'Invalid directory', EISDIR: 'Access denied', EEXIST: 'Unable to create directory', ENOTEMPTY: 'Invalid path, not directory,\nor directory not empty', EACCES: 'Access denied', EINVAL: 'Invalid parameter' }[e.code] || e.message; }
    helpFor(n) { return (TX.docs.dosHelp && TX.docs.dosHelp(n)) || TX.docs.cmdHelp(n); }
    highlight(line) { return line; }
    isCommand(name) { return !!this.internal(name.toLowerCase()) || !!this.findProgram(name); }
    completer() { return null; }
    internal(n) { return DOS_INT[n]; }
    // External commands are real files: they work only if found in the current directory or on the PATH.
    findProgram(name) {
      if (/[\\:]/.test(name)) {
        // a path like C:\DOS\MEM.EXE or ..\HELLO: look only there
        const segs = this.resolve(name);
        const base = segs[segs.length - 1];
        for (const cand of /\.(COM|EXE|BAT)$/i.test(base) ? [base] : ['COM', 'EXE', 'BAT'].map((e) => base + '.' + e)) {
          const full = segs.slice(0, -1).concat(cand);
          const node = this.vfs.get(full);
          if (node && node.t === 'f') return { node, segs: full, ext: cand.split('.').pop(), name: cand.split('.')[0].toLowerCase() };
        }
        return null;
      }
      const n = dosName(name.replace(/\.(COM|EXE|BAT)$/i, ''));
      const dirs = [this.cwd].concat(String(this.getVar('PATH') || '').split(';').filter(Boolean).map((d) => this.resolve(d)));
      for (const d of dirs) for (const ext of ['COM', 'EXE', 'BAT']) {
        if (/\.(COM|EXE|BAT)$/i.test(name) && !name.toUpperCase().endsWith('.' + ext)) continue;
        const node = this.vfs.get(d.concat(n + '.' + ext));
        if (node && node.t === 'f') return { node, segs: d.concat(n + '.' + ext), ext, name: n.toLowerCase() };
      }
      return null;
    }
    external() { return null; }
    async runCommand(text, io, batch) {
      const t = text.replace(/^@/, '').trim();
      // drive change with no floppy in A:
      if (/^[a-z]:$/i.test(t)) {
        const drive = t.toUpperCase();
        if (drive === 'A:' && !this.m.extra.floppy) return this.notReady(io, drive);
        if (!this.vfs.get([drive])) { io.err('Invalid drive specification\n'); return 1; }
        this.driveCwd[this.cwd[0]] = this.cwd.slice();
        this.cwd = (this.driveCwd[drive] || [drive]).slice();
        return 0;
      }
      if (/(^|\s)a:/i.test(t) && !this.m.extra.floppy && !/^(format|insert|eject)\b/i.test(t)) { const r = await this.notReady(io, 'A:'); if (r) return r; }
      return super.runCommand(text, io, batch);
    }
    async notReady(io, drive) {
      io.err(`\nNot ready reading drive ${drive[0]}\nAbort, Retry, Fail?`);
      let a = null;
      try { a = await this.term.readLine({ prompt: '' }); } catch (e) { a = null; }
      io.err(C.dim('(TerminalEX: there is no floppy disk in drive A:. Type  INSERT  to put one in.)') + '\n');
      void a;
      return 1;
    }
    async runExternal(name, args, restRaw, io, ctx) {
      const prog = this.findProgram(name);
      if (!prog) { io.err('Bad command or file name\n'); return 1; }
      if (prog.ext === 'BAT') return this.runBatch(this.vfs.content(prog.node), [W.format(prog.segs)].concat(args), io);
      const fn = DOS_EXT[prog.name];
      if (fn) { const r = await fn.call(this, ctx); return typeof r === 'number' ? r : 0; }
      const game = { keen1: 'Commander Keen', doom: 'DOOM', oregon: 'The Oregon Trail', sol: 'Solitaire (needs Windows)', winmine: 'Minesweeper (needs Windows)' }[prog.name];
      if (game) { io.out(C.dim(`(TerminalEX: ${game} would take over the whole screen here. It's a pretend copy, but kids really did type its name at this prompt in 1993!)`) + '\n'); return 0; }
      if (/^(himem|emm386|setver|oakcdrom)$/.test(prog.name)) { io.err(prog.name === 'himem' || prog.name === 'emm386' ? `${prog.name.toUpperCase()} is a device driver. Load it from CONFIG.SYS with DEVICE=\n` : 'This program requires Microsoft Windows.\n'); return 1; }
      io.out(C.dim(`(TerminalEX: ${prog.name.toUpperCase()}.${prog.ext} is a pretend program.)`) + '\n');
      return 0;
    }
    makeCtx(name, args, raw, io, batch) {
      const c = super.makeCtx(name, args, raw, io, batch);
      c.dos = true;
      return c;
    }
  }
  TX.DosShell = DosShell;

  // ------------------------------------------------------------------ listing helpers
  // Split "C:\STUDENT\*.TXT" into the directory to list and the pattern inside it.
  function target(sh, arg) {
    if (!arg) return { dir: sh.cwd, pat: '*.*' };
    const segs = sh.resolve(arg);
    const n = sh.vfs.get(segs);
    if (n && n.t === 'd') return { dir: segs, pat: '*.*' };
    const raw = String(arg).replace(/\//g, '\\');
    const last = raw.split('\\').pop();
    if (hasWild(last) || !n) return { dir: segs.slice(0, -1).length ? segs.slice(0, -1) : [segs[0]], pat: last.includes(':') ? last.split(':').pop() || '*.*' : last.toUpperCase() };
    return { dir: segs.slice(0, -1), pat: segs[segs.length - 1], file: true };
  }
  function entries(sh, dir, pat, opts = {}) {
    const node = sh.vfs.get(dir);
    if (!node || node.t !== 'd') return null;
    const re = wildRe(pat === '*.*' ? '*' : pat);
    let list = Object.keys(node.ch).map((k) => node.ch[k]).filter((n) => re.test(n.name) || (pat === '*.*'));
    if (!opts.all) list = list.filter((n) => !n.hid && !n.sys);
    if (opts.attr) list = opts.attr(list);
    return list;
  }
  function row83(n) {
    const [b, e] = n.t === 'd' ? [n.name, ''] : split83(n.name);
    return b.padEnd(8) + ' ' + e.padEnd(3);
  }

  // ------------------------------------------------------------------ internal commands (inside COMMAND.COM)
  const DOS_INT = {};
  ['echo', 'set', 'if', 'for', 'call', 'pause', 'rem', 'goto', 'shift', 'cls', 'path'].forEach((k) => { DOS_INT[k] = INTERNAL[k]; });
  DOS_INT['reset-machine'] = INTERNAL['reset-machine'];
  DOS_INT.lh = DOS_INT.loadhigh = async function (c) { if (!c.args.length) return 0; return this.exec(c.raw.trim(), c.io, c.batch); };
  DOS_INT.break = DOS_INT.verify = function (c) { c.outln(`${c.name.toUpperCase()} is ${c.args[0] ? c.args[0].toLowerCase() : 'off'}`); };
  DOS_INT.chcp = function (c) { c.outln('Active code page: 437'); };
  DOS_INT.ctty = function (c) { c.err('Invalid device\n'); return 1; };
  DOS_INT.ver = function (c) { c.outln('\nMS-DOS Version 6.22\n'); };
  DOS_INT.prompt = function (c) { if (c.raw.trim()) this.vars.PROMPT = c.raw.trim().replace(/^=/, ''); else delete this.vars.PROMPT; };
  DOS_INT.exit = function (c) { if (this.nested) throw new TX.ExitShell(0); void c; };
  DOS_INT.cd = DOS_INT.chdir = function (c) {
    const a = c.raw.trim().replace(/^"|"$/g, '');
    if (!a) { c.outln(W.format(this.cwd)); return 0; }
    if (/^[a-z]:$/i.test(a)) { const d = a.toUpperCase(); c.outln(W.format(d === this.cwd[0] ? this.cwd : (this.driveCwd[d] || [d]))); return 0; }
    const segs = this.resolve(a);
    const n = this.vfs.get(segs);
    if (!n || n.t !== 'd') { c.err('Invalid directory\n'); return 1; }
    if (segs[0] !== this.cwd[0]) { this.driveCwd[segs[0]] = segs; return 0; } // CD D:\X changes D:'s directory but not the current drive
    this.cwd = segs;
    return 0;
  };
  DOS_INT.md = DOS_INT.mkdir = function (c) {
    if (!c.args[0]) { c.err('Required parameter missing\n'); return 1; }
    const segs = this.resolve(c.args[0]);
    if (this.vfs.get(segs)) { c.err('Unable to create directory\n'); return 1; }
    if (this.vfs.get(segs.slice(0, -1)) === null || !this.vfs.get(segs.slice(0, -1))) { c.err('Unable to create directory\n'); return 1; }
    if (segs[0] === 'D:') { c.err('Write protect error writing drive D\nAbort, Retry, Fail?F\n'); return 1; }
    this.vfs.mkdir(segs, { owner: 'student' });
    return 0;
  };
  DOS_INT.rd = DOS_INT.rmdir = function (c) {
    if (!c.args[0]) { c.err('Required parameter missing\n'); return 1; }
    const segs = this.resolve(c.args[0]);
    const n = this.vfs.get(segs);
    if (!n || n.t !== 'd' || Object.keys(n.ch).length || this.vfs.samePath(segs, this.cwd)) { c.err(this.vfs.samePath(segs, this.cwd) ? 'Attempt to remove current directory - ' + c.args[0].toUpperCase() + '\n' : 'Invalid path, not directory,\nor directory not empty\n'); return 1; }
    this.vfs.remove(segs, { dirOk: true });
    return 0;
  };
  DOS_INT.dir = function (c) {
    const sw = c.args.filter((a) => a.startsWith('/')).map((a) => a.toUpperCase());
    const has = (s) => sw.some((x) => x.startsWith(s));
    const bad = sw.find((x) => !/^\/(W|P|S|B|L|A(:?[DHSRA-]*)?|O(:?[NESDG-]*)?|C|CH)$/.test(x));
    if (bad) { c.err(`Invalid switch - ${bad}\n`); return 1; }
    const arg = c.args.find((a) => !a.startsWith('/'));
    if (arg && /^a:/i.test(arg) && !this.m.extra.floppy) return 1;
    const { dir, pat } = target(this, arg);
    const drive = dir[0];
    const aSw = sw.find((x) => x.startsWith('/A'));
    const attrs = aSw ? aSw.replace(/^\/A:?/, '') : null;
    const oSw = sw.find((x) => x.startsWith('/O'));
    const order = oSw ? (oSw.replace(/^\/O:?/, '') || 'GN') : '';
    const filter = (list) => {
      if (attrs === null) return list.filter((n) => !n.hid && !n.sys);
      if (!attrs) return list;
      return list.filter((n) => [...attrs.replace(/-(.)/g, (m, k) => k.toLowerCase())].every((k) => ({ D: n.t === 'd', H: !!n.hid, S: !!n.sys, R: !!n.ro, A: n.t === 'f', d: n.t !== 'd', h: !n.hid, s: !n.sys, r: !n.ro, a: n.t !== 'f' }[k])));
    };
    const sortL = (list) => {
      if (!order) return list;
      const out = list.slice();
      out.sort((a, b) => {
        for (const k of order.replace(/-(.)/g, (m, x) => x.toLowerCase())) {
          let r = 0;
          const K = k.toUpperCase(), rev = k !== K ? -1 : 1;
          if (K === 'N') r = a.name.localeCompare(b.name);
          else if (K === 'E') r = split83(a.name)[1].localeCompare(split83(b.name)[1]);
          else if (K === 'S') r = sizeOf(this.vfs, a) - sizeOf(this.vfs, b);
          else if (K === 'D') r = a.mt - b.mt;
          else if (K === 'G') r = (a.t === 'd' ? 0 : 1) - (b.t === 'd' ? 0 : 1);
          if (r) return r * rev;
        }
        return 0;
      });
      return out;
    };
    const lc = has('/L') ? (s) => s.toLowerCase() : (s) => s;
    let totalFiles = 0, totalBytes = 0, found = false;
    const listDir = (segs, top) => {
      let list = entries(this, segs, pat, { all: true, attr: filter });
      if (list === null) return;
      list = sortL(list);
      if (top && segs.length > 1) { const dotted = attrs === null || /D/.test(attrs || ''); if (dotted && pat === '*.*' && !has('/B')) list = [{ t: 'd', name: '.', mt: this.vfs.get(segs).mt, dot: true }, { t: 'd', name: '..', mt: this.vfs.get(segs).mt, dot: true }].concat(list); }
      if (list.length) found = true;
      if (has('/B')) { list.filter((n) => !n.dot).forEach((n) => c.outln(lc(has('/S') ? W.format(segs.concat(n.name)) : n.name))); }
      else if (list.length) {
        if (!top || has('/S')) c.outln(` Directory of ${W.format(segs)}\n`);
        let bytes = 0, files = 0;
        if (has('/W')) {
          const cells = list.map((n) => (n.t === 'd' ? '[' + n.name + ']' : n.name).padEnd(16));
          for (let i = 0; i < cells.length; i += 5) c.outln(lc(cells.slice(i, i + 5).join('').trimEnd()));
          list.forEach((n) => { if (n.t === 'f') { bytes += sizeOf(this.vfs, n); } files++; });
        } else {
          list.forEach((n) => {
            const nm = n.dot ? n.name.padEnd(12) : row83(n);
            if (n.t === 'd') c.outln(lc(nm) + ' <DIR>        ' + dDate(n.mt) + '  ' + dTime(n.mt));
            else { const s = sizeOf(this.vfs, n); bytes += s; c.outln(lc(nm) + fmtN(s).padStart(14) + ' ' + dDate(n.mt) + '  ' + dTime(n.mt)); }
            files++;
          });
        }
        c.outln(String(files).padStart(9) + ' file(s)' + fmtN(bytes).padStart(15) + ' bytes');
        if (has('/S')) c.outln('');
        totalFiles += files; totalBytes += bytes;
      }
      if (has('/S')) { const node = this.vfs.get(segs); Object.keys(node.ch).map((k) => node.ch[k]).filter((n) => n.t === 'd').forEach((n) => listDir(segs.concat(n.name), false)); }
    };
    if (!has('/B')) c.outln(` Volume in drive ${drive[0]} ${this.m.extra.labels[drive] ? 'is ' + this.m.extra.labels[drive] : 'has no label'}\n Volume Serial Number is ${this.m.extra.serial[drive] || '0000-0000'}\n Directory of ${W.format(dir)}\n`);
    if (!this.vfs.get(dir)) { c.err(has('/B') ? 'File not found\n' : 'Path not found\n'); return 1; }
    listDir(dir, true);
    if (!found) { c.err('File not found\n'); return 1; }
    if (!has('/B')) {
      if (has('/S')) c.outln(`     Total files listed:\n${String(totalFiles).padStart(9)} file(s)${fmtN(totalBytes).padStart(15)} bytes`);
      c.outln(fmtN(freeBytes(this, drive)).padStart(30) + ' bytes free');
    }
    return 0;
  };
  DOS_INT.type = function (c) {
    const a = c.args[0];
    if (!a) { c.err('Required parameter missing\n'); return 1; }
    if (hasWild(a)) { c.err('Invalid filename or file not found\n'); return 1; }
    const segs = this.resolve(a);
    const n = this.vfs.get(segs);
    if (!n || n.t !== 'f') { c.err(`File not found - ${a.toUpperCase()}\n`); return 1; }
    c.out(this.vfs.content(n));
    return 0;
  };
  DOS_INT.del = DOS_INT.erase = async function (c) {
    const a = c.args.find((x) => !x.startsWith('/'));
    if (!a) { c.err('Required parameter missing\n'); return 1; }
    const prompt = c.args.some((x) => /^\/p$/i.test(x));
    const { dir, pat, file } = target(this, a);
    const segs = this.resolve(a);
    const asDir = this.vfs.get(segs);
    const list = file ? [this.vfs.get(segs)] : entries(this, asDir && asDir.t === 'd' ? segs : dir, asDir && asDir.t === 'd' ? '*.*' : pat);
    const base = asDir && asDir.t === 'd' ? segs : dir;
    const files = (list || []).filter((n) => n && n.t === 'f');
    if (!files.length) { c.err('File not found\n'); return 1; }
    if ((pat === '*.*' || (asDir && asDir.t === 'd')) && !prompt) {
      const ans = await c.readLine('All files in directory will be deleted!\nAre you sure (Y/N)?');
      if (!/^y/i.test(ans)) return 0;
    }
    for (const n of files) {
      if (prompt) { const ans = await c.readLine(`${W.format(base.concat(n.name))},    Delete (Y/N)?`); if (!/^y/i.test(ans)) continue; }
      if (n.ro) { c.err('Access denied\n'); continue; }
      this.m.extra.deleted.push({ dir: base.slice(), name: n.name, node: JSON.parse(JSON.stringify(n)), at: Date.now() });
      if (this.m.extra.deleted.length > 30) this.m.extra.deleted.shift();
      this.vfs.remove(base.concat(n.name));
    }
    return 0;
  };
  DOS_INT.ren = DOS_INT.rename = function (c) {
    const [a, b] = c.args;
    if (!a || !b) { c.err('Required parameter missing\n'); return 1; }
    if (/[\\:]/.test(b)) { c.err('Invalid parameter\n'); return 1; }
    const { dir, pat, file } = target(this, a);
    const list = file ? [this.vfs.get(this.resolve(a))] : (entries(this, dir, pat) || []);
    if (!list.length || !list[0]) { c.err('Duplicate file name or file not found\n'); return 1; }
    let bad = false;
    list.forEach((n) => {
      let nn = dosName(b);
      if (hasWild(b)) { const [ob, oe] = split83(n.name); const [pb, pe] = b.toUpperCase().includes('.') ? split83(b.toUpperCase()) : [b.toUpperCase(), '']; const fill = (p, o) => [...p].map((ch, i) => (ch === '?' ? o[i] || '' : ch)).join('').replace(/\*.*$/, o.slice(p.indexOf('*'))); nn = fill(pb, ob) + (pe || oe ? '.' + (pe ? fill(pe, oe) : oe) : ''); }
      if (this.vfs.get(dir.concat(nn))) { bad = true; return; }
      this.vfs.move(dir.concat(n.name), dir.concat(nn));
    });
    if (bad) { c.err('Duplicate file name or file not found\n'); return 1; }
    return 0;
  };
  DOS_INT.copy = async function (c) {
    const args = c.args.filter((a) => !a.startsWith('/'));
    if (!args.length) { c.err('Required parameter missing\n'); return 1; }
    const [src, dst] = args;
    // COPY CON FILE: type lines, end with Ctrl+Z (F6)
    if (/^con$/i.test(src)) {
      if (!dst) { c.err('Required parameter missing\n'); return 1; }
      const lines = [];
      c.err(C.dim('(type your lines; finish with a line that is just ^Z — or press F6 — then Enter)') + '\n');
      for (;;) {
        let l;
        try { l = await c.readLine(''); } catch (e) { return 1; }
        if (/\^z$|\x1a$/i.test(l)) { const pre = l.replace(/\^z$|\x1a$/i, ''); if (pre) lines.push(pre); break; }
        lines.push(l);
      }
      this.vfs.writeFile(this.resolve(dst), lines.join('\n') + (lines.length ? '\n' : ''), { owner: 'student' });
      c.outln('        1 file(s) copied');
      return 0;
    }
    // A+B C : join files
    if (src.includes('+')) {
      const parts = src.split('+').filter(Boolean);
      let text = '';
      for (const p of parts) { const n = this.vfs.get(this.resolve(p)); if (!n || n.t !== 'f') { c.err(`File not found - ${p.toUpperCase()}\n`); return 1; } text += this.vfs.content(n); c.outln(W.format(this.resolve(p))); }
      this.vfs.writeFile(this.resolve(dst || parts[0]), text, { owner: 'student' });
      c.outln('        1 file(s) copied');
      return 0;
    }
    const { dir, pat, file } = target(this, src);
    const files = (file ? [this.vfs.get(this.resolve(src))] : (entries(this, dir, pat) || [])).filter((n) => n && n.t === 'f');
    if (!files.length) { c.err(`File not found - ${src.toUpperCase()}\n        0 file(s) copied\n`); return 1; }
    const dsegs = dst ? this.resolve(dst) : this.cwd;
    if (dsegs[0] === 'D:') { c.err('Write protect error writing drive D\nAbort, Retry, Fail?F\n        0 file(s) copied\n'); return 1; }
    const dnode = this.vfs.get(dsegs);
    let n = 0;
    for (const f of files) {
      const to = dnode && dnode.t === 'd' ? dsegs.concat(f.name) : dsegs;
      if (this.vfs.samePath(to, dir.concat(f.name))) { c.err('File cannot be copied onto itself\n'); continue; }
      if (files.length > 1 || hasWild(src)) c.outln(f.name);
      if (this.vfs.get(to) && c.tty && !c.args.some((a) => /^\/y$/i.test(a))) { const ans = await c.readLine(`Overwrite ${W.format(to)} (Yes/No/All)?`); if (!/^[ya]/i.test(ans)) continue; }
      if (!this.vfs.get(to.slice(0, -1))) { c.err('Invalid directory\n'); break; }
      this.vfs.copy(dir.concat(f.name), to);
      n++;
    }
    c.outln(String(n).padStart(9) + ' file(s) copied');
    return n ? 0 : 1;
  };
  DOS_INT.date = async function (c) {
    if (c.args[0]) { c.err(C.dim('(TerminalEX keeps the real date)') + '\n'); return 0; }
    c.outln('Current date is ' + this.dateLine());
    try { await c.readLine('Enter new date (mm-dd-yy): '); } catch (e) { /* keep */ }
  };
  DOS_INT.time = async function (c) {
    if (c.args[0]) { c.err(C.dim('(TerminalEX keeps the real time)') + '\n'); return 0; }
    c.outln('Current time is ' + this.timeLine());
    try { await c.readLine('Enter new time: '); } catch (e) { /* keep */ }
  };
  DOS_INT.vol = function (c) {
    const d = (c.args[0] || this.cwd[0]).toUpperCase().slice(0, 2);
    if (!this.vfs.get([d])) { c.err('Invalid drive specification\n'); return 1; }
    const L = this.m.extra.labels[d];
    c.outln(`\n Volume in drive ${d[0]} ${L ? 'is ' + L : 'has no label'}\n Volume Serial Number is ${this.m.extra.serial[d]}`);
  };

  // ------------------------------------------------------------------ external commands (programs in C:\DOS)
  const DOS_EXT = {};
  DOS_EXT.doskey = function (c) {
    if (c.args.some((a) => /^\/h(istory)?$/i.test(a))) { this.history.forEach((h) => c.outln(h)); return; }
    if (c.args.some((a) => /^\/reinstall$/i.test(a)) || !this.doskey) { this.doskey = true; c.outln('DOSKey installed.'); return; }
    const m = /^(\w+)=(.*)$/.exec(c.raw.trim());
    if (m) { this.macros = Object.assign({}, this.macros, { [m[1].toLowerCase()]: m[2] }); return; }
  };
  DOS_EXT.mem = function (c) {
    if (c.args.some((a) => /^\/c/i.test(a))) {
      c.outln('\nModules using memory below 1 MB:\n\n  Name           Total  =   Conventional   +   Upper Memory\n  --------  ----------------   ----------------   ----------------\n  MSDOS       17,469   (17K)     17,469   (17K)          0    (0K)\n  HIMEM        1,168    (1K)      1,168    (1K)          0    (0K)\n  EMM386       3,200    (3K)      3,200    (3K)          0    (0K)\n  COMMAND      2,912    (3K)      2,912    (3K)          0    (0K)\n  SMARTDRV    29,024   (28K)          0    (0K)     29,024   (28K)\n  MSCDEX      27,952   (27K)          0    (0K)     27,952   (27K)\n  Free       618,864  (604K)    618,864  (604K)          0    (0K)');
      return;
    }
    c.outln('\nMemory Type        Total  =   Used   +   Free\n----------------  -------   -------   -------\nConventional         640K       36K      604K\nUpper                155K       57K       98K\nReserved             384K      384K        0K\nExtended (XMS)     7,013K    2,165K    4,848K\n----------------  -------   -------   -------\nTotal memory       8,192K    2,642K    5,550K\n\nTotal under 1 MB     795K       93K      702K\n\nLargest executable program size       604K (618,864 bytes)\nLargest free upper memory block        98K (100,352 bytes)\nMS-DOS is resident in the high memory area.');
    c.outln(C.dim('(Programs had to fit in the first 640K. Every "K" mattered — that is why CONFIG.SYS loads things "high".)'));
  };
  DOS_EXT.smartdrv = function (c) { if (c.args.some((a) => /^\/s$/i.test(a))) c.outln('Microsoft SMARTDrive Disk Cache version 5.0\nCopyright 1991,1993 Microsoft Corp.\n\nRoom for 256 elements of 8,192 bytes each\nThere have been 4,112 cache hits\nand 902 cache misses\n\nCache size: 2,097,152 bytes\nCache size while running Windows: 2,097,152 bytes'); };
  DOS_EXT.mscdex = function (c) { c.outln('MSCDEX Version 2.23\nCopyright (C) Microsoft Corp. 1986-1993. All rights reserved.\n        Drive D: = Driver MSCD001 unit 0'); };
  DOS_EXT.attrib = function (c) {
    const flags = c.args.filter((a) => /^[+-][rahs]$/i.test(a));
    const sub = c.args.some((a) => /^\/s$/i.test(a));
    const a = c.args.find((x) => !/^[+-][rahs]$/i.test(x) && !x.startsWith('/'));
    const { dir, pat, file } = target(this, a || '*.*');
    const list = (file ? [this.vfs.get(this.resolve(a))] : (entries(this, dir, pat, { all: true }) || [])).filter((n) => n && n.t === 'f');
    if (!list.length) { c.err(`File not found - ${(a || '*.*').toUpperCase()}\n`); return 1; }
    void sub;
    list.forEach((n) => {
      if (flags.length) {
        flags.forEach((f) => { const on = f[0] === '+', k = f[1].toLowerCase(); if (k === 'r') n.ro = on || undefined; if (k === 'h') n.hid = on || undefined; if (k === 's') n.sys = on || undefined; if (k === 'a') n.arc = on ? undefined : true; });
        this.vfs.changed();
      } else c.outln(`  ${n.arc ? ' ' : 'A'}  ${n.sys ? 'S' : ' '}${n.hid ? 'H' : ' '}${n.ro ? 'R' : ' '}     ${W.format(dir.concat(n.name))}`);
    });
  };
  DOS_EXT.tree = function (c) {
    const files = c.args.some((a) => /^\/f$/i.test(a));
    const ascii = c.args.some((a) => /^\/a$/i.test(a));
    const a = c.args.find((x) => !x.startsWith('/'));
    const root = a ? this.resolve(a) : this.cwd;
    if (!this.vfs.get(root) || this.vfs.get(root).t !== 'd') { c.err('Invalid path - ' + (a || '').toUpperCase() + '\nNo subdirectories exist\n'); return 1; }
    const [T, L, V] = ascii ? ['+---', '\\---', '|   '] : ['├───', '└───', '│   '];
    c.outln(`Directory PATH listing for Volume ${this.m.extra.labels[root[0]] || ''}\nVolume Serial Number is ${this.m.extra.serial[root[0]]}\n${root.length === 1 ? root[0] + '.' : W.format(root)}`);
    let any = false;
    const walk = (segs, prefix) => {
      const n = this.vfs.get(segs);
      const kids = Object.keys(n.ch).map((k) => n.ch[k]).filter((x) => !x.hid && !x.sys);
      const dirs = kids.filter((x) => x.t === 'd'), fl = kids.filter((x) => x.t === 'f');
      if (files) { fl.forEach((f) => c.outln(prefix + (dirs.length ? V : '    ') + f.name)); if (fl.length) c.outln(prefix + (dirs.length ? V : '    ')); }
      dirs.forEach((d, i) => { any = true; const last = i === dirs.length - 1; c.outln(prefix + (last ? L : T) + d.name); walk(segs.concat(d.name), prefix + (last ? '    ' : V)); });
    };
    walk(root, '');
    if (!any) c.outln('No subdirectories exist\n');
  };
  DOS_EXT.deltree = async function (c) {
    const yes = c.args.some((a) => /^\/y$/i.test(a));
    const targets = c.args.filter((a) => !a.startsWith('/'));
    if (!targets.length) { c.err('Required parameter missing\n'); return 1; }
    for (const t of targets) {
      const segs = this.resolve(t);
      const n = this.vfs.get(segs);
      if (!n) continue;
      if (this.vfs.isSubPath(segs, this.cwd)) { c.err('Cannot delete the current directory or one of its parents\n'); return 1; }
      if (segs.length === 1) { c.err('Invalid path\n'); return 1; }
      if (!yes) { let ans; try { ans = await c.readLine(`Delete ${n.t === 'd' ? 'directory' : 'file'} "${W.format(segs)}" and all its subdirectories? [yn] `); } catch (e) { return 1; } if (!/^y/i.test(ans)) continue; }
      c.outln(`Deleting ${W.format(segs)}...`);
      this.vfs.remove(segs, { recursive: true, force: true });
    }
  };
  DOS_EXT.move = function (c) {
    const args = c.args.filter((a) => !a.startsWith('/'));
    if (args.length < 2) { c.err('Required parameter missing\n'); return 1; }
    const dst = args.pop();
    const dsegs = this.resolve(dst);
    const dn = this.vfs.get(dsegs);
    for (const src of args) {
      const { dir, pat, file } = target(this, src);
      const list = file ? [this.vfs.get(this.resolve(src))] : (entries(this, dir, pat) || []);
      if (!list.length || !list[0]) { c.err(`File not found - ${src.toUpperCase()}\n`); return 1; }
      list.forEach((n) => {
        const to = dn && dn.t === 'd' ? dsegs.concat(n.name) : dsegs;
        this.vfs.move(dir.concat(n.name), to);
        c.outln(`${W.format(dir.concat(n.name)).toLowerCase()} => ${W.format(to).toLowerCase()} [ok]`);
      });
    }
  };
  DOS_EXT.xcopy = function (c) {
    const sub = c.args.some((a) => /^\/[se]$/i.test(a));
    const args = c.args.filter((a) => !a.startsWith('/'));
    if (!args.length) { c.err('Invalid number of parameters\n'); return 1; }
    const src = this.resolve(args[0]), dst = args[1] ? this.resolve(args[1]) : this.cwd;
    const sn = this.vfs.get(src);
    if (!sn) { c.err(`File not found - ${args[0].toUpperCase()}\n`); return 1; }
    c.outln('Reading source file(s)...');
    let n = 0;
    const copyIn = (from, to) => {
      const node = this.vfs.get(from);
      if (node.t === 'f') { if (!this.vfs.get(to.slice(0, -1))) this.vfs.mkdir(to.slice(0, -1), { parents: true, owner: 'student' }); this.vfs.copy(from, to); c.outln(W.format(from)); n++; return; }
      Object.keys(node.ch).forEach((k) => { const ch = node.ch[k]; if (ch.t === 'd' && !sub) return; copyIn(from.concat(ch.name), to.concat(ch.name)); });
    };
    if (sn.t === 'f') copyIn(src, this.vfs.get(dst) && this.vfs.get(dst).t === 'd' ? dst.concat(sn.name) : dst);
    else { if (!this.vfs.get(dst)) this.vfs.mkdir(dst, { parents: true, owner: 'student' }); copyIn(src, dst); }
    c.outln(String(n).padStart(9) + ' File(s) copied');
  };
  DOS_EXT.find = function (c) {
    const sw = c.args.filter((a) => /^\/[vcni]$/i.test(a)).map((a) => a.toLowerCase());
    const m = /"([^"]*)"/.exec(c.raw);
    if (!m) { c.err('FIND: Parameter format not correct\n'); return 2; }
    const needle = m[1];
    const files = c.raw.slice(m.index + m[0].length).trim().split(/\s+/).filter((a) => a && !a.startsWith('/'));
    const test = (l) => { const hit = sw.includes('/i') ? l.toLowerCase().includes(needle.toLowerCase()) : l.includes(needle); return sw.includes('/v') ? !hit : hit; };
    const report = (lines) => { const hits = lines.map((l, i) => [l, i + 1]).filter(([l]) => test(l)); if (sw.includes('/c')) return hits.length; hits.forEach(([l, i]) => c.outln((sw.includes('/n') ? '[' + i + ']' : '') + l)); return hits.length; };
    if (!files.length) { const n = report((c.stdin || '').replace(/\n$/, '').split('\n')); if (sw.includes('/c')) c.outln(String(n)); return n ? 0 : 1; }
    let any = 0;
    for (const f of files) {
      const node = this.vfs.get(this.resolve(f));
      if (!node || node.t !== 'f') { c.err(`File not found - ${f.toUpperCase()}\n`); continue; }
      c.out('\n---------- ' + W.format(this.resolve(f)).split('\\').pop() + (sw.includes('/c') ? ': ' : '\n'));
      const n = report(this.vfs.content(node).replace(/\n$/, '').split('\n'));
      if (sw.includes('/c')) c.outln(String(n));
      any += n;
    }
    return any ? 0 : 1;
  };
  DOS_EXT.sort = function (c) {
    const rev = c.args.some((a) => /^\/r$/i.test(a));
    const f = c.args.find((a) => !a.startsWith('/') && !/^\/\+\d+$/.test(a));
    let text = c.stdin;
    if (f) { const n = this.vfs.get(this.resolve(f)); if (!n) { c.err('File not found\n'); return 1; } text = this.vfs.content(n); }
    const lines = String(text || '').replace(/\n$/, '').split('\n');
    lines.sort((a, b) => a.toUpperCase().localeCompare(b.toUpperCase()));
    if (rev) lines.reverse();
    if (lines.length && lines.join('')) c.outln(lines.join('\n'));
  };
  DOS_EXT.more = async function (c) {
    const f = c.args[0];
    let text = c.stdin;
    if (f) { const n = this.vfs.get(this.resolve(f)); if (!n) { c.err(`File not found - ${f.toUpperCase()}\n`); return 1; } text = this.vfs.content(n); }
    const lines = String(text || '').replace(/\n$/, '').split('\n');
    const page = Math.max(5, (c.term.rows || 25) - 2);
    for (let i = 0; i < lines.length; i++) {
      c.outln(lines[i]);
      if (c.tty && (i + 1) % page === 0 && i + 1 < lines.length) { c.out('-- More --'); const k = await c.term.readKey(); c.out('\r          \r'); if (k === '\x03' || k === 'q') return; }
    }
  };
  DOS_EXT.fc = function (c) {
    const [a, b] = c.args.filter((x) => !x.startsWith('/'));
    if (!a || !b) { c.err('FC: Insufficient number of file specifications\n'); return 2; }
    const na = this.vfs.get(this.resolve(a)), nb = this.vfs.get(this.resolve(b));
    if (!na || !nb) { c.err(`FC: cannot open ${(!na ? a : b).toUpperCase()} - No such file or directory\n`); return 2; }
    c.outln(`Comparing files ${W.format(this.resolve(a)).split('\\').pop()} and ${W.format(this.resolve(b)).split('\\').pop()}`);
    const A = this.vfs.content(na).split('\n'), B = this.vfs.content(nb).split('\n');
    if (A.join('\n') === B.join('\n')) { c.outln('FC: no differences encountered\n'); return 0; }
    const i = A.findIndex((l, k) => l !== B[k]);
    c.outln(`***** ${W.format(this.resolve(a)).split('\\').pop()}\n${A.slice(Math.max(0, i - 1), i + 2).join('\n')}\n***** ${W.format(this.resolve(b)).split('\\').pop()}\n${B.slice(Math.max(0, i - 1), i + 2).join('\n')}\n*****\n`);
    return 1;
  };
  DOS_EXT.choice = async function (c) {
    const cm = /\/c:?(\S+)/i.exec(c.raw);
    const keys = (cm ? cm[1] : 'YN').toUpperCase();
    const text = c.raw.replace(/\/\S+/g, '').trim().replace(/^"|"$/g, '');
    c.out(`${text}[${keys.split('').join(',')}]?`);
    for (let tries = 0; ; tries++) {
      if (tries > 40) { c.outln(keys[0]); return 1; }
      const k = (await c.term.readKey()) || keys[0];
      if (k === '\x03') throw new TX.Interrupt();
      const i = keys.indexOf(String(k).toUpperCase());
      if (i >= 0) { c.outln(keys[i]); return i + 1; }
      if (c.term.bell) c.term.bell();
    }
  };
  DOS_EXT.label = async function (c) {
    const d = (c.args[0] && /^[a-z]:/i.test(c.args[0]) ? c.args[0].slice(0, 2) : this.cwd[0]).toUpperCase();
    const rest = c.args.filter((a) => !/^[a-z]:$/i.test(a)).join(' ');
    if (d === 'D:') { c.err('Cannot make label on a CD-ROM drive\n'); return 1; }
    let name = rest;
    if (!rest) {
      c.outln(` Volume in drive ${d[0]} ${this.m.extra.labels[d] ? 'is ' + this.m.extra.labels[d] : 'has no label'}\n Volume Serial Number is ${this.m.extra.serial[d]}\n`);
      try { name = await c.readLine('Volume label (11 characters, ENTER for none)? '); } catch (e) { return 1; }
    }
    this.m.extra.labels[d] = name.toUpperCase().slice(0, 11);
    this.vfs.changed();
  };
  DOS_EXT.chkdsk = function (c) {
    const d = this.cwd[0];
    let files = 0, dirs = 0, used = 0, hidden = 0;
    this.vfs.walk([d], (n) => { if (n.t === 'd') dirs++; else { files++; used += this.vfs.size(n); if (n.hid) hidden++; } });
    const free = freeBytes(this, d), total = DRIVE_TOTAL[d];
    c.outln(`Volume ${this.m.extra.labels[d]}    created ${dDate(DOS_TIME)} ${dTime(DOS_TIME)}\nVolume Serial Number is ${this.m.extra.serial[d]}\n\n${fmtN(total).padStart(13)} bytes total disk space\n${fmtN(73728).padStart(13)} bytes in ${hidden} hidden files\n${fmtN(dirs * 2048).padStart(13)} bytes in ${dirs} directories\n${fmtN(used).padStart(13)} bytes in ${files} user files\n${fmtN(free).padStart(13)} bytes available on disk\n\n        2,048 bytes in each allocation unit\n${fmtN(Math.round(total / 2048)).padStart(13)} total allocation units on disk\n${fmtN(Math.round(free / 2048)).padStart(13)} available allocation units on disk\n\n      655,360 total bytes memory\n      618,864 bytes free\n\nInstead of using CHKDSK, try using SCANDISK. SCANDISK can reliably detect\nand fix a much wider range of disk problems. For more information,\ntype HELP SCANDISK from the command prompt.`);
  };
  DOS_EXT.scandisk = async function (c) {
    const d = (c.args.find((a) => /^[a-z]:/i.test(a)) || this.cwd[0]).toUpperCase().slice(0, 2);
    c.outln(`Microsoft ScanDisk\n\nScanDisk is now checking the following areas of drive ${d}:\n`);
    for (const s of ['Media descriptor', 'File allocation tables', 'Directory structure', 'File system', 'Surface scan']) { try { await c.sleep(350); } catch (e) { return 1; } c.outln(`   ${C.green('√')}  ${s}`); }
    c.outln(`\nScanDisk did not find any problems on drive ${d}.`);
  };
  DOS_EXT.defrag = async function (c) {
    c.outln('Microsoft Defrag\n');
    const W2 = 50;
    let row = '';
    for (let i = 0; i <= 10; i++) { row = '█'.repeat(Math.round((W2 * i) / 10)) + '░'.repeat(W2 - Math.round((W2 * i) / 10)); try { await c.sleep(200); } catch (e) { return 1; } c.out('\r' + row + ' ' + i * 10 + '%'); }
    c.outln('\n\nFinished condensing.\n' + C.dim('(Defragmenting moved the pieces of each file next to each other so the disk head moved less. SSDs today do not need this.)'));
  };
  DOS_EXT.format = async function (c) {
    const d = (c.args.find((a) => /^[a-z]:/i.test(a)) || '').toUpperCase().slice(0, 2);
    if (!d) { c.err('Required parameter missing\n'); return 1; }
    if (d === 'C:') {
      let ans;
      try { ans = await c.readLine('\nWARNING, ALL DATA ON NON-REMOVABLE DISK\nDRIVE C: WILL BE LOST!\nProceed with Format (Y/N)?'); } catch (e) { return 1; }
      if (/^y/i.test(ans)) c.outln(C.yellow('\n(TerminalEX: whoa! On a real 1994 PC that just erased every file on the hard disk. We will pretend you said N.)'));
      return 1;
    }
    if (d === 'D:') { c.err('Cannot format a CD-ROM drive.\n'); return 1; }
    if (d !== 'A:') { c.err('Invalid drive specification\n'); return 1; }
    try { await c.readLine('Insert new diskette for drive A:\nand press ENTER when ready...'); } catch (e) { return 1; }
    c.outln('\nChecking existing disk format.\nFormatting 1.44M');
    for (let p = 0; p <= 100; p += 20) { try { await c.sleep(150); } catch (e) { return 1; } c.out(`\r${p} percent completed.`); }
    this.m.extra.floppy = true;
    if (this.vfs.get(['A:'])) this.vfs.remove(['A:'], { recursive: true, force: true });
    this.vfs.root.ch['A:'] = TX.build({ $uid: 'student' }, 'A:');
    c.outln('\nFormat complete.\n');
    let label = '';
    try { label = await c.readLine('Volume label (11 characters, ENTER for none)? '); } catch (e) { /* none */ }
    this.m.extra.labels['A:'] = String(label || '').toUpperCase().slice(0, 11);
    c.outln('\n    1,457,664 bytes total disk space\n    1,457,664 bytes available on disk\n\n          512 bytes in each allocation unit.\n        2,847 allocation units available on disk.\n\nVolume Serial Number is 2F11-07AC');
    this.vfs.changed();
  };
  DOS_EXT.fdisk = function (c) {
    c.outln('                         MS-DOS Version 6\n                     Fixed Disk Setup Program\n            (C)Copyright Microsoft Corp. 1983 - 1993\n\nDisplay Partition Information\n\nCurrent fixed disk drive: 1\n\nPartition Status   Type    Volume Label  Mbytes   System   Usage\n C: 1         A    PRI DOS  MS-DOS_6         401   FAT16     100%\n\nTotal disk space is  401 Mbytes (1 Mbyte = 1048576 bytes)');
    c.outln(C.dim('(TerminalEX shows FDISK\'s partition table and stops: on a real PC this menu could erase the whole disk.)'));
  };
  DOS_EXT.sys = function (c) { c.outln('System transferred'); };
  DOS_EXT.diskcopy = async function (c) { c.outln('\nInsert SOURCE diskette in drive A:\n'); try { await c.readLine('Press any key to continue . . .'); } catch (e) { return 1; } if (!this.m.extra.floppy) return this.notReady(c.io, 'A:'); c.outln('\nCopying 80 tracks\n18 sectors per track, 2 side(s)\n\nInsert TARGET diskette in drive A:\n' + C.dim('(TerminalEX has only one pretend floppy, so the copy stops here.)')); return 0; };
  DOS_EXT.undelete = async function (c) {
    const D = this.m.extra.deleted.filter((x) => this.vfs.samePath(x.dir, this.cwd));
    c.outln(`\nUNDELETE - A delete protection facility\nCopyright (C) 1987-1993 Central Point Software, Inc.\nAll rights reserved.\n\nDirectory: ${W.format(this.cwd)}\nFile Specifications: *.*\n\n    Deletion-tracking file not found.\n    MS-DOS directory contains    ${D.length} deleted files.\n    Of those,    ${D.length} files may be recovered.\n\nUsing the MS-DOS directory method.\n`);
    for (const x of D.slice()) {
      const shown = '?' + x.name.slice(1);
      const [b, e] = split83(shown);
      c.outln(`      ${b.padEnd(8)} ${e.padEnd(3)} ${fmtN(this.vfs.size(x.node)).padStart(9)}  ${dDate(x.node.mt)}  ${dTime(x.node.mt)}  ...A  Undelete (Y/N)?`);
      let ans;
      try { ans = await c.readLine(''); } catch (e2) { return 1; }
      if (!/^y/i.test(ans)) continue;
      let first;
      try { first = await c.readLine(`      Please type the first character for ${shown}: `); } catch (e2) { return 1; }
      const nm = (String(first || 'X')[0] + x.name.slice(1)).toUpperCase();
      x.node.name = nm;
      const dir = this.vfs.get(x.dir);
      if (dir) { dir.ch[nm] = x.node; this.m.extra.deleted.splice(this.m.extra.deleted.indexOf(x), 1); this.vfs.changed(); c.outln('\n      File successfully undeleted.\n'); }
    }
    if (!D.length) c.outln('No entries found.');
    c.outln(C.dim('(DOS really only erased the FIRST letter of a deleted file\'s name, which is why you had to type it back.)'));
  };
  DOS_EXT.edit = async function (c) {
    const a = c.args[0];
    await TX.apps.nano(c.term, this.vfs, a ? this.resolve(a) : null, { user: 'student', name: a ? dosName(a.split('\\').pop()) : '', notepad: true, dosEdit: true });
  };
  DOS_EXT.help = function (c) {
    if (c.args[0]) { c.outln(this.helpFor(c.args[0].toLowerCase())); return; }
    c.outln(TX.docs.dosHelpAll ? TX.docs.dosHelpAll() : 'HELP');
  };
  DOS_EXT.msd = function (c) {
    c.outln('Microsoft Diagnostics version 2.13\n\n  Computer: Gateway 2000 / Phoenix\n Processor: 486DX2-66\n    Memory: 640K, 7168K Ext, 384K XMS\n     Video: VGA, Cirrus Logic\n   Network: No Network\nOS Version: MS-DOS Version 6.22\n     Mouse: Serial Mouse 8.20\n Other Adapters: Game Adapter, Sound Blaster 16 (A220 I5 D1)\nDisk Drives: A: C: D:\n  LPT Ports: 1\n  COM Ports: 2');
  };
  DOS_EXT.command = function (c) {
    const sh = new DosShell(this.session, this.m, { cwd: this.cwd, nested: true });
    sh.vars = Object.assign({}, this.vars);
    sh.doskey = this.doskey;
    if (c.args.some((a) => /^\/c$/i.test(a))) return sh.exec(c.raw.replace(/^\s*\/c\s*/i, ''), c.io);
    this.session.pushShell(sh);
    c.out(sh.banner());
  };
  DOS_EXT.win = async function (c) {
    c.outln('\n' + C.bgBlue(C.brightWhite('                                                            ')) + '\n' + C.bgBlue(C.brightWhite('     Microsoft Windows for Workgroups  Version 3.11         ')) + '\n' + C.bgBlue(C.brightWhite('     Copyright (C) Microsoft Corp. 1985-1993                 ')) + '\n' + C.bgBlue(C.brightWhite('                                                            ')));
    try { await c.sleep(1500); } catch (e) { /* ok */ }
    c.outln(C.dim('\n(TerminalEX: Windows 3.11 was just a program you started from DOS by typing WIN. When you quit it, you came right back to this C:\\> prompt.)'));
  };
  DOS_EXT.qbasic = async function (c) { return TX.basic ? TX.basic(c, this) : 0; };

  // A TerminalEX helper: put a floppy disk in drive A:
  DOS_INT.insert = function (c) {
    if (this.m.extra.floppy) { c.outln('There is already a disk in drive A:.'); return; }
    this.m.extra.floppy = true;
    if (!this.vfs.get(['A:'])) this.vfs.root.ch['A:'] = TX.build({ $uid: 'student', 'README.TXT': 'This is a 3.5" floppy disk. It holds 1.44 MB — about one photo from a phone today.\n' }, 'A:');
    this.m.extra.labels['A:'] = 'STUDENT';
    this.vfs.changed();
    c.outln(C.dim('(TerminalEX: *click* — a 1.44 MB floppy disk is now in drive A:. Type A: to switch to it, EJECT to take it out.)'));
  };
  DOS_INT.eject = function (c) {
    if (this.cwd[0] === 'A:') this.cwd = ['C:'];
    this.m.extra.floppy = false;
    this.vfs.changed();
    c.outln(C.dim('(TerminalEX: the floppy disk pops out. Its files stay on it for next time.)'));
  };
  TX.dosInternal = DOS_INT;
  TX.dosExternal = DOS_EXT;
  TX.dosNames = Object.keys(DOS_INT).concat(Object.keys(DOS_EXT));
})();
