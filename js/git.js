/* TerminalEX — a working git: staging, commits, branches, merges w/ conflicts, stash, tags, mock GitHub remotes */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;

  const BIN = '\u0000binary\u0000';
  // ------------------------------------------------------------ mock GitHub
  const REMOTES = (TX.gitRemotes = TX.gitRemotes || {}); // url -> {objects, refs}
  function normUrl(u) { return String(u).replace(/\/+$/, '').replace(/\.git$/, '') + '.git'; }
  function remoteSeed(url) {
    const u = normUrl(url);
    if (REMOTES[u]) return REMOTES[u];
    const m = /^(?:https?:\/\/|git@)(github\.com|gitlab\.com)[/:]([^/]+)\/([^/]+?)\.git$/.exec(u);
    if (!m) return null;
    const [, , owner, name] = m;
    const db = { objects: {}, refs: {} };
    const t0 = Date.now() - 86400000 * 14;
    const commits = SEEDS[name] ? SEEDS[name](owner) : [
      { msg: 'Initial commit', files: { 'README.md': `# ${name}\n\nA project by @${owner}.\n`, LICENSE: 'MIT License\n\nCopyright (c) 2026 ' + owner + '\n', '.gitignore': 'node_modules/\n.DS_Store\n*.log\n' } },
    ];
    let parent = null;
    let tree = {};
    commits.forEach((c, i) => {
      tree = Object.assign({}, tree, c.files);
      (c.del || []).forEach((p) => delete tree[p]);
      const obj = { tree: Object.assign({}, tree), parents: parent ? [parent] : [], msg: c.msg, author: c.author || owner, email: (c.author || owner) + '@users.noreply.github.com', time: t0 + i * 86400000 * 2 };
      const id = TX.sha1(JSON.stringify(obj) + u);
      db.objects[id] = obj;
      parent = id;
    });
    db.refs.main = parent;
    REMOTES[u] = db;
    return db;
  }
  const SEEDS = {
    'hello-world': (owner) => [
      { msg: 'Initial commit', files: { 'README.md': '# Hello World\n\nMy first repository on GitHub.\n' }, author: owner },
      { msg: 'Add hello.py', files: { 'hello.py': 'print("Hello, world!")\n' }, author: owner },
      { msg: 'Add greeting in three languages', files: { 'hello.py': 'print("Hello, world!")\nprint("Hola, mundo!")\nprint("Bonjour, le monde!")\n' }, author: owner },
    ],
    'cs-principles': (owner) => [
      { msg: 'Initial commit', files: { 'README.md': '# AP CS Principles\n\nNotes and projects for the course.\n' }, author: owner },
      { msg: 'Add unit 1 notes: digital information', files: { 'notes/unit1.md': '# Unit 1 — Digital Information\n\n- Bits and bytes\n- Binary numbers: 1011 = 11\n- Overflow and rounding errors\n- Lossy vs lossless compression\n' }, author: owner },
      { msg: 'Add unit 2 notes: the internet', files: { 'notes/unit2.md': '# Unit 2 — The Internet\n\n- IP addresses and packets\n- TCP vs UDP\n- DNS translates names to IP addresses\n- Fault tolerance and redundancy\n' }, author: owner },
      { msg: 'Add sorting algorithm example', files: { 'code/bubble_sort.py': 'def bubble_sort(nums):\n    for i in range(len(nums)):\n        for j in range(len(nums) - 1 - i):\n            if nums[j] > nums[j + 1]:\n                nums[j], nums[j + 1] = nums[j + 1], nums[j]\n    return nums\n\nprint(bubble_sort([5, 2, 9, 1, 7]))\n' }, author: owner },
    ],
    'hello-web': (owner) => HELLO_WEB_COMMITS(owner),
  };
  function HELLO_WEB_COMMITS(owner) {
    return [
      { msg: 'Initial commit: add index.html', files: { 'index.html': '<!DOCTYPE html>\n<html>\n  <head><title>Hello</title></head>\n  <body>\n    <h1>Hello, world!</h1>\n  </body>\n</html>\n' }, author: owner },
      { msg: 'Add app.js with greet function', files: { 'app.js': '// Tiny web app used for git practice\nfunction greet(name) {\n  return "Hello, " + name + "!";\n}\n\nconsole.log(greet("world"));\n', 'index.html': '<!DOCTYPE html>\n<html>\n  <head><title>Hello</title></head>\n  <body>\n    <h1>Hello, world!</h1>\n    <script src="app.js"></script>\n  </body>\n</html>\n' }, author: owner },
      { msg: 'Add basic styles', files: { 'style.css': 'body {\n  font-family: sans-serif;\n  background: #fafafa;\n}\n' }, author: owner },
    ];
  }

  // ------------------------------------------------------------ repo helpers
  function findRepo(vfs, cwd) {
    for (let i = cwd.length; i >= 0; i--) {
      const segs = cwd.slice(0, i);
      const g = vfs.get(segs.concat('.git'));
      if (g && g.t === 'd' && g.gitdb) return { root: segs, gitSegs: segs.concat('.git'), node: g, db: g.gitdb };
    }
    return null;
  }
  function headId(db) { return db.detached || db.refs[db.head] || null; }
  function headTree(db) { const id = headId(db); return id ? db.objects[id].tree : {}; }
  function short(id) { return id ? id.slice(0, 7) : '0000000'; }
  function readWork(vfs, repo) {
    const out = {};
    const walk = (node, rel) => {
      for (const name of Object.keys(node.ch)) {
        const n = node.ch[name];
        const p = rel ? rel + '/' + name : name;
        if (!rel && name === '.git') continue;
        if (n.t === 'd') walk(n, p);
        else if (n.t === 'f') out[p] = n.sz ? BIN + n.sz : vfs.content(n);
        else if (n.t === 'l') out[p] = '\u0000link:' + n.target;
      }
    };
    const root = vfs.get(repo.root);
    if (root) walk(root, '');
    return out;
  }
  function ignoreMatcher(vfs, repo) {
    const n = vfs.get(repo.root.concat('.gitignore'));
    const pats = n ? vfs.content(n).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')) : [];
    const res = pats.map((p) => {
      const neg = p.startsWith('!'); if (neg) p = p.slice(1);
      const dir = p.endsWith('/'); p = p.replace(/\/$/, '');
      const anchored = p.includes('/');
      const re = TX.globToRegex(p.replace(/^\//, ''), false);
      return { neg, dir, anchored, re, raw: p };
    });
    return (path) => {
      let ign = false;
      const parts = path.split('/');
      for (const r of res) {
        let hit = false;
        if (r.anchored) hit = r.re.test(path) || parts.some((_, i) => r.re.test(parts.slice(0, i + 1).join('/')) && i < parts.length - 1);
        else hit = parts.some((seg, i) => r.re.test(seg) && (!r.dir || i < parts.length - 1));
        if (hit) ign = !r.neg;
      }
      return ign;
    };
  }
  function writeTree(vfs, repo, tree, prevTree, user) {
    // remove tracked files that are not in new tree
    Object.keys(prevTree || {}).forEach((p) => { if (!(p in tree)) { try { vfs.remove(repo.root.concat(p.split('/')), {}); } catch (e) { /* gone */ } pruneDirs(vfs, repo, p); } });
    Object.keys(tree).forEach((p) => {
      const segs = repo.root.concat(p.split('/'));
      vfs.mkdir(segs.slice(0, -1), { parents: true, owner: user });
      const v = tree[p];
      if (v.startsWith(BIN)) { const n = vfs.writeFile(segs, '', { owner: user }); n.sz = parseInt(v.slice(BIN.length), 10) || 0; }
      else vfs.writeFile(segs, v, { owner: user });
    });
  }
  function pruneDirs(vfs, repo, p) {
    const parts = p.split('/');
    for (let i = parts.length - 1; i > 0; i--) {
      const segs = repo.root.concat(parts.slice(0, i));
      const n = vfs.get(segs);
      if (n && n.t === 'd' && !Object.keys(n.ch).length) vfs.remove(segs, { dirOk: true }); else break;
    }
  }
  function ancestors(db, id) {
    const seen = new Set(), q = [id];
    while (q.length) { const x = q.shift(); if (!x || seen.has(x)) continue; seen.add(x); const o = db.objects[x]; if (o) q.push(...o.parents); }
    return seen;
  }
  function mergeBase(db, a, b) {
    const A = ancestors(db, a);
    const q = [b], seen = new Set();
    while (q.length) { const x = q.shift(); if (!x || seen.has(x)) continue; seen.add(x); if (A.has(x)) return x; const o = db.objects[x]; if (o) q.push(...o.parents); }
    return null;
  }
  function resolveRev(db, rev) {
    if (!rev) return null;
    let m = /^(.*?)((?:[~^]\d*)*)$/.exec(rev);
    let base = m[1], suffix = m[2];
    let id = null;
    if (base === 'HEAD' || base === '@') id = headId(db);
    else if (db.refs[base]) id = db.refs[base];
    else if (db.tags && db.tags[base]) id = db.tags[base];
    else if (db.remoteRefs && db.remoteRefs[base]) id = db.remoteRefs[base];
    else if (db.remoteRefs && db.remoteRefs['origin/' + base.replace(/^remotes\//, '')] && base.startsWith('remotes/')) id = db.remoteRefs[base.replace(/^remotes\//, '')];
    else if (/^[0-9a-f]{4,40}$/.test(base)) { const hits = Object.keys(db.objects).filter((k) => k.startsWith(base)); if (hits.length === 1) id = hits[0]; }
    if (!id) return null;
    const re = /([~^])(\d*)/g;
    let s;
    while ((s = re.exec(suffix))) {
      const n = s[2] === '' ? 1 : parseInt(s[2], 10);
      if (s[1] === '~') { for (let k = 0; k < n; k++) { const o = db.objects[id]; if (!o || !o.parents.length) return null; id = o.parents[0]; } }
      else { const o = db.objects[id]; if (!o || !o.parents[n - 1]) return null; id = o.parents[n - 1]; }
    }
    return id;
  }
  function diffStat(a, b) {
    const files = [];
    let ins = 0, del = 0;
    const paths = [...new Set(Object.keys(a).concat(Object.keys(b)))].sort();
    for (const p of paths) {
      if (a[p] === b[p]) continue;
      const bin = (a[p] || '').startsWith(BIN) || (b[p] || '').startsWith(BIN);
      if (bin) { files.push({ p, ins: 0, del: 0, bin: true, created: !(p in a), deleted: !(p in b) }); continue; }
      const d = TX.diffLines(TX.splitLines(a[p] || ''), TX.splitLines(b[p] || ''));
      const i = d.filter((x) => x.op === '+').length, dl = d.filter((x) => x.op === '-').length;
      ins += i; del += dl;
      files.push({ p, ins: i, del: dl, created: !(p in a), deleted: !(p in b) });
    }
    return { files, ins, del };
  }
  function statSummary(st) {
    const n = st.files.length;
    let s = ` ${n} file${n === 1 ? '' : 's'} changed`;
    if (st.ins || !st.del) s += `, ${st.ins} insertion${st.ins === 1 ? '' : 's'}(+)`;
    if (st.del) s += `, ${st.del} deletion${st.del === 1 ? '' : 's'}(-)`;
    return s;
  }
  function parseIni(text) {
    const out = {};
    let sec = '';
    text.split('\n').forEach((l) => {
      l = l.trim();
      let m;
      if ((m = /^\[([^\]\s]+)(?:\s+"([^"]+)")?\]$/.exec(l))) sec = m[1] + (m[2] ? '.' + m[2] : '');
      else if ((m = /^([\w.-]+)\s*=\s*(.*)$/.exec(l))) out[(sec ? sec + '.' : '') + m[1].toLowerCase()] = m[2].replace(/^"|"$/g, '');
    });
    return out;
  }
  function writeIni(obj) {
    const secs = {};
    Object.keys(obj).forEach((k) => { const i = k.lastIndexOf('.'); const s = k.slice(0, i), key = k.slice(i + 1); (secs[s] = secs[s] || []).push([key, obj[k]]); });
    return Object.keys(secs).map((s) => { const [a, ...b] = s.split('.'); return `[${a}${b.length ? ` "${b.join('.')}"` : ''}]\n` + secs[s].map(([k, v]) => `\t${k} = ${v}`).join('\n'); }).join('\n') + '\n';
  }

  // ------------------------------------------------------------ git command
  async function git(ctx, args) {
    const { vfs } = ctx;
    const tty = ctx.tty;
    const col = (fn, s) => (tty ? fn(s) : s);
    const out = (s) => ctx.out(s), outln = (s = '') => ctx.out(s + '\n'), err = (s) => ctx.err(s + '\n');
    const globalPath = ctx.home.concat('.gitconfig');
    const gconf = () => { const n = vfs.get(globalPath); return n ? parseIni(vfs.content(n)) : {}; };
    let sub = args[0];
    const rest = args.slice(1);
    const isWin = ctx.m.kind === 'windows';
    const ver = ctx.m.kind === 'mac' ? 'git version 2.39.5 (Apple Git-154)' : isWin ? 'git version 2.46.0.windows.1' : 'git version 2.43.0';
    if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
      outln('usage: git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]\n           <command> [<args>]\n\nThese are common Git commands used in various situations:\n\nstart a working area (see also: git help tutorial)\n   clone     Clone a repository into a new directory\n   init      Create an empty Git repository or reinitialize an existing one\n\nwork on the current change (see also: git help everyday)\n   add       Add file contents to the index\n   mv        Move or rename a file, a directory, or a symlink\n   restore   Restore working tree files\n   rm        Remove files from the working tree and from the index\n\nexamine the history and state (see also: git help revisions)\n   diff      Show changes between commits, commit and working tree, etc\n   log       Show commit logs\n   show      Show various types of objects\n   status    Show the working tree status\n\ngrow, mark and tweak your common history\n   branch    List, create, or delete branches\n   commit    Record changes to the repository\n   merge     Join two or more development histories together\n   reset     Reset current HEAD to the specified state\n   switch    Switch branches\n   tag       Create, list, delete or verify a tag object signed with GPG\n\ncollaborate (see also: git help workflows)\n   fetch     Download objects and refs from another repository\n   pull      Fetch from and integrate with another repository or a local branch\n   push      Update remote refs along with associated objects\n\n\'git help -a\' and \'git help -g\' list available subcommands and some\nconcept guides. See \'git help <command>\' or \'git help <concept>\'\nto read about a specific subcommand or concept.');
      return sub ? 0 : 1;
    }
    if (sub === '--version' || sub === '-v' || sub === 'version') { outln(ver); return 0; }
    if (sub === 'config') return config();
    if (sub === 'init') return init();
    if (sub === 'clone') return clone();
    const aliases = { co: 'checkout', br: 'branch', ci: 'commit', st: 'status' };
    sub = aliases[sub] || sub;

    const repo = findRepo(vfs, ctx.cwd);
    if (!repo) { err('fatal: not a git repository (or any of the parent directories): .git'); return 128; }
    const db = repo.db;
    db.index = db.index || {}; db.refs = db.refs || {}; db.objects = db.objects || {}; db.tags = db.tags || {}; db.remotes = db.remotes || {}; db.remoteRefs = db.remoteRefs || {}; db.stash = db.stash || []; db.upstream = db.upstream || {};
    const save = () => { const h = vfs.get(repo.gitSegs.concat('HEAD')); if (h) h.c = db.detached ? db.detached + '\n' : `ref: refs/heads/${db.head}\n`; vfs.changed(); };
    const relRoot = () => ctx.cwd.slice(repo.root.length).join('/');
    const toRepoPath = (p) => {
      const segs = ctx.resolve(p);
      if (!vfs.isSubPath(repo.root, segs)) return null;
      return vfs.canon(segs).slice(repo.root.length).join('/');
    };
    const display = (p) => {
      const base = relRoot();
      if (!base) return p;
      if (p.startsWith(base + '/')) return p.slice(base.length + 1);
      const up = base.split('/').length;
      return '../'.repeat(up) + p;
    };
    const conf = () => Object.assign({}, gconf(), db.config || {});
    const whoami = () => { const c = conf(); return { name: c['user.name'], email: c['user.email'] }; };
    const branchName = () => db.head;
    const ignored = ignoreMatcher(vfs, repo);
    const matchSpec = (specs) => {
      if (!specs.length) return () => true;
      const rps = specs.map((s) => ({ s, rp: toRepoPath(s), glob: TX.hasGlob(s) ? TX.globToRegex(s) : null }));
      return (p) => rps.some(({ rp, glob }) => (glob ? glob.test(p.split('/').pop()) || glob.test(p) : rp === '' || p === rp || p.startsWith(rp + '/')));
    };
    const makeCommit = (tree, parents, msg) => {
      const w = whoami();
      const obj = { tree: Object.assign({}, tree), parents, msg, author: w.name, email: w.email, time: Date.now() };
      const id = TX.sha1(JSON.stringify(obj));
      db.objects[id] = obj;
      if (db.detached) db.detached = id; else db.refs[db.head] = id;
      save();
      return id;
    };
    const needIdentity = () => {
      const w = whoami();
      if (w.name && w.email) return false;
      err(`Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"\n\nto set your account's default identity.\nOmit --global to set the identity only in this repository.\n\nfatal: unable to auto-detect email address (${ctx.user}@${ctx.m.net.hostname}.(none))`);
      return true;
    };
    const decorations = (id) => {
      const d = [];
      if (headId(db) === id) d.push(db.detached ? col(C.style.bind(null, ['bold', 'cyan']), 'HEAD') : col(C.style.bind(null, ['bold', 'cyan']), 'HEAD -> ') + col(C.style.bind(null, ['bold', 'green']), db.head));
      Object.keys(db.refs).forEach((b) => { if (db.refs[b] === id && !(b === db.head && !db.detached && headId(db) === id)) d.push(col(C.style.bind(null, ['bold', 'green']), b)); });
      Object.keys(db.remoteRefs).forEach((r) => { if (db.remoteRefs[r] === id) d.push(col(C.style.bind(null, ['bold', 'red']), r)); });
      Object.keys(db.tags).forEach((t) => { if (db.tags[t] === id) d.push(col(C.style.bind(null, ['bold', 'yellow']), 'tag: ' + t)); });
      return d.length ? ' ' + col(C.yellow, '(') + d.join(col(C.yellow, ', ')) + col(C.yellow, ')') : '';
    };
    const printDiff = (a, b, opts = {}) => {
      const paths = [...new Set(Object.keys(a).concat(Object.keys(b)))].sort().filter(opts.filter || (() => true));
      for (const p of paths) {
        if (a[p] === b[p]) continue;
        outln(col(C.bold, `diff --git a/${p} b/${p}`));
        if (!(p in a)) outln(col(C.bold, 'new file mode 100644'));
        if (!(p in b)) outln(col(C.bold, 'deleted file mode 100644'));
        outln(col(C.bold, `index ${TX.sha1(a[p] || '').slice(0, 7)}..${TX.sha1(b[p] || '').slice(0, 7)}${p in a && p in b ? ' 100644' : ''}`));
        if ((a[p] || '').startsWith(BIN) || (b[p] || '').startsWith(BIN)) { outln(`Binary files ${p in a ? 'a/' + p : '/dev/null'} and ${p in b ? 'b/' + p : '/dev/null'} differ`); continue; }
        outln(col(C.bold, `--- ${p in a ? 'a/' + p : '/dev/null'}`));
        outln(col(C.bold, `+++ ${p in b ? 'b/' + p : '/dev/null'}`));
        TX.unifiedDiff(a[p] || '', b[p] || '').forEach((h) => {
          outln(col(C.cyan, h.header));
          h.lines.forEach((l) => outln(l.op === '+' ? col(C.green, '+' + l.line) : l.op === '-' ? col(C.red, '-' + l.line) : ' ' + l.line));
        });
      }
    };
    const workTree = () => { const w = readWork(vfs, repo); return w; };
    const changes = () => {
      const head = headTree(db), idx = db.index, work = workTree();
      const staged = [], unstaged = [], untracked = [];
      const all = [...new Set(Object.keys(head).concat(Object.keys(idx)))].sort();
      for (const p of all) {
        if (!(p in head) && p in idx) staged.push(['new file', p]);
        else if (p in head && !(p in idx)) staged.push(['deleted', p]);
        else if (head[p] !== idx[p]) staged.push(['modified', p]);
      }
      for (const p of Object.keys(idx).sort()) {
        if (!(p in work)) unstaged.push(['deleted', p]);
        else if (work[p] !== idx[p]) unstaged.push(['modified', p]);
      }
      const untrackedDirs = new Set();
      for (const p of Object.keys(work).sort()) {
        if (p in idx || ignored(p)) continue;
        // collapse fully-untracked directories
        const parts = p.split('/');
        let shown = p;
        for (let i = 1; i < parts.length; i++) {
          const dir = parts.slice(0, i).join('/');
          if (!Object.keys(idx).some((x) => x.startsWith(dir + '/'))) { shown = dir + '/'; break; }
        }
        if (!untrackedDirs.has(shown)) { untrackedDirs.add(shown); untracked.push(shown); }
      }
      return { staged, unstaged, untracked, work };
    };
    const conflicts = () => db.merge ? db.merge.conflicts.filter((p) => { const w = workTree()[p]; return !(db.merge.resolved || []).includes(p) || (w && /^<<<<<<< /m.test(w) && false); }) : [];
    const trackingLine = () => {
      const up = db.upstream[db.head];
      if (!up || db.detached) return null;
      const remoteId = db.remoteRefs[up];
      const local = headId(db);
      if (!remoteId) return `Your branch is based on '${up}', but the upstream is gone.\n  (use "git branch --unset-upstream" to fixup)`;
      if (remoteId === local) return `Your branch is up to date with '${up}'.`;
      const A = ancestors(db, local), R = ancestors(db, remoteId);
      const ahead = [...A].filter((x) => !R.has(x)).length, behind = [...R].filter((x) => !A.has(x)).length;
      if (ahead && !behind) return `Your branch is ahead of '${up}' by ${ahead} commit${ahead > 1 ? 's' : ''}.\n  (use "git push" to publish your local commits)`;
      if (behind && !ahead) return `Your branch is behind '${up}' by ${behind} commit${behind > 1 ? 's' : ''}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)`;
      return `Your branch and '${up}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)`;
    };
    const authRemote = async (url) => {
      if (!/github\.com/.test(url)) return true;
      const sess = ctx.session;
      if (sess && sess.gitCreds) return true;
      if (isWin) { outln(col(C.dim, 'info: please complete authentication in your browser...  (TerminalEX: pretending Git Credential Manager signed you in)')); if (sess) sess.gitCreds = true; return true; }
      const u = await ctx.readLine(`Username for 'https://github.com': `);
      const p = await ctx.readLine(`Password for 'https://${u}@github.com': `, { hidden: true });
      if (!/^(ghp_|github_pat_|gho_)/.test(p)) {
        err(`remote: Support for password authentication was removed on August 13, 2021.\nremote: Please see https://docs.github.com/get-started/getting-started-with-git/about-remote-repositories#cloning-with-https-urls for information on currently recommended modes of authentication.\nfatal: Authentication failed for '${url.replace(/\.git$/, '')}/'`);
        err(col(C.dim, '(TerminalEX hint: GitHub wants a Personal Access Token instead of your password. Any value starting with ghp_ works here.)'));
        return false;
      }
      if (sess) sess.gitCreds = true;
      return true;
    };

    switch (sub) {
      case 'status': {
        const shortFmt = rest.includes('-s') || rest.includes('--short') || rest.includes('--porcelain');
        const { staged, unstaged, untracked } = changes();
        const cf = db.merge ? db.merge.conflicts.slice() : [];
        if (shortFmt) {
          if (rest.includes('-b') || rest.includes('--branch')) outln(`## ${db.head}${db.upstream[db.head] ? '...' + db.upstream[db.head] : ''}`);
          const map = {};
          staged.forEach(([k, p]) => { map[p] = map[p] || [' ', ' ']; map[p][0] = k === 'new file' ? 'A' : k === 'deleted' ? 'D' : 'M'; });
          unstaged.forEach(([k, p]) => { map[p] = map[p] || [' ', ' ']; map[p][1] = k === 'deleted' ? 'D' : 'M'; });
          Object.keys(map).sort().forEach((p) => outln(col(C.green, map[p][0]) + col(C.red, map[p][1]) + ' ' + display(p)));
          untracked.forEach((p) => outln(col(C.red, '??') + ' ' + display(p)));
          return 0;
        }
        outln(db.detached ? col(C.red, `HEAD detached at ${short(db.detached)}`) : `On branch ${db.head}`);
        const tl = trackingLine();
        if (tl) outln(tl);
        if (!headId(db)) outln('\nNo commits yet');
        if (db.merge) {
          if (cf.length) outln('You have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)');
          else outln('All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
        }
        if (staged.length) {
          outln('\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)');
          staged.filter(([, p]) => !cf.includes(p)).forEach(([k, p]) => outln('\t' + col(C.green, (k + ':').padEnd(12) + display(p))));
        }
        if (cf.length) { outln('\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)'); cf.forEach((p) => outln('\t' + col(C.red, 'both modified:   ' + display(p)))); }
        const uns = unstaged.filter(([, p]) => !cf.includes(p));
        if (uns.length) {
          outln('\nChanges not staged for commit:\n  (use "git add' + (uns.some(([k]) => k === 'deleted') ? '/rm' : '') + ' <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)');
          uns.forEach(([k, p]) => outln('\t' + col(C.red, (k + ':').padEnd(12) + display(p))));
        }
        if (untracked.length) {
          outln('\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)');
          untracked.forEach((p) => outln('\t' + col(C.red, display(p))));
        }
        if (!staged.length && !uns.length && !untracked.length && !cf.length) outln(headId(db) ? '\nnothing to commit, working tree clean' : '\nnothing to commit (create/copy files and use "git add" to track)');
        else if (!staged.length && !cf.length) outln(uns.length ? '\nno changes added to commit (use "git add" and/or "git commit -a")' : '\nnothing added to commit but untracked files present (use "git add" to track)');
        else outln('');
        return 0;
      }
      case 'add': {
        const all = rest.includes('-A') || rest.includes('--all') || rest.includes('-u');
        const specs = rest.filter((a) => !a.startsWith('-'));
        if (!specs.length && !all) { outln('Nothing specified, nothing added.\nhint: Maybe you wanted to say \'git add .\'?\nhint: Disable this message with "git config advice.addEmptyPathspec false"'); return 0; }
        const work = workTree();
        for (const s of specs) {
          const rp = toRepoPath(s);
          if (rp === null) { err(`fatal: ${s}: '${s}' is outside repository at '${ctx.fmt(repo.root)}'`); return 128; }
          const exists = TX.hasGlob(s) || rp === '' || Object.keys(work).some((p) => p === rp || p.startsWith(rp + '/')) || Object.keys(db.index).some((p) => p === rp || p.startsWith(rp + '/'));
          if (!exists) { err(`fatal: pathspec '${s}' did not match any files`); return 128; }
          if (rp && ignored(rp) && !rest.includes('-f')) { err(`The following paths are ignored by one of your .gitignore files:\n${s}\nhint: Use -f if you really want to add them.`); return 1; }
        }
        const match = matchSpec(all && !specs.length ? [] : specs);
        let n = 0;
        for (const p of Object.keys(work)) if (match(p) && !ignored(p) && (!rest.includes('-u') || p in db.index)) { if (db.index[p] !== work[p]) n++; db.index[p] = work[p]; }
        for (const p of Object.keys(db.index)) if (match(p) && !(p in work)) { delete db.index[p]; n++; }
        if (db.merge) { db.merge.resolved = (db.merge.resolved || []).concat(db.merge.conflicts.filter((p) => match(p))); db.merge.conflicts = db.merge.conflicts.filter((p) => !match(p)); }
        if (rest.includes('-v')) outln(`${n} path(s) updated`);
        save();
        return 0;
      }
      case 'rm': {
        const cached = rest.includes('--cached');
        const rec = rest.includes('-r');
        const specs = rest.filter((a) => !a.startsWith('-'));
        for (const s of specs) {
          const rp = toRepoPath(s);
          const hits = Object.keys(db.index).filter((p) => p === rp || (rec && p.startsWith(rp + '/')));
          if (!hits.length) { err(`fatal: pathspec '${s}' did not match any files`); return 128; }
          if (!rec && hits.length === 1 && hits[0] !== rp) { err(`fatal: not removing '${s}' recursively without -r`); return 128; }
          hits.forEach((p) => { delete db.index[p]; if (!cached) { try { vfs.remove(repo.root.concat(p.split('/')), {}); pruneDirs(vfs, repo, p); } catch (e) { /* already gone */ } } outln(`rm '${p}'`); });
        }
        save();
        return 0;
      }
      case 'mv': {
        const [a, b] = rest.filter((x) => !x.startsWith('-'));
        const ra = toRepoPath(a);
        if (!(ra in db.index)) { err(`fatal: not under version control, source=${a}, destination=${b}`); return 128; }
        const dst = ctx.resolve(b);
        try { vfs.move(ctx.resolve(a), dst, {}); } catch (e) { err(`fatal: bad source, source=${a}, destination=${b}`); return 128; }
        const dn = vfs.get(dst);
        const rb = dn && dn.t === 'd' ? toRepoPath(b) + '/' + ra.split('/').pop() : toRepoPath(b);
        db.index[rb] = db.index[ra]; delete db.index[ra];
        save();
        return 0;
      }
      case 'commit': {
        let msg = null, all = false, amend = false, allowEmpty = false;
        for (let i = 0; i < rest.length; i++) {
          const a = rest[i];
          if (a === '-m' || a === '--message') msg = (msg ? msg + '\n\n' : '') + rest[++i];
          else if (/^-m./.test(a)) msg = a.slice(2);
          else if (a === '-a' || a === '--all') all = true;
          else if (a === '-am' || a === '-ma') { all = true; msg = rest[++i]; }
          else if (a === '--amend') amend = true;
          else if (a === '--allow-empty') allowEmpty = true;
          else if (a === '--no-edit') msg = msg || (amend ? db.objects[headId(db)].msg : db.merge ? db.merge.msg : '');
        }
        if (needIdentity()) return 128;
        if (db.merge && db.merge.conflicts.length) { err(`error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\nU\t${db.merge.conflicts.join('\nU\t')}`); return 128; }
        if (all) { const work = workTree(); Object.keys(db.index).forEach((p) => { if (p in work) db.index[p] = work[p]; else delete db.index[p]; }); }
        const head = headTree(db);
        const st = diffStat(head, db.index);
        if (!st.files.length && !amend && !allowEmpty && !db.merge) {
          const c = changes();
          outln(db.detached ? `HEAD detached at ${short(db.detached)}` : `On branch ${db.head}`);
          if (c.unstaged.length) { outln('Changes not staged for commit:'); c.unstaged.forEach(([k, p]) => outln('\t' + col(C.red, (k + ':').padEnd(12) + display(p)))); }
          if (c.untracked.length) { outln('\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)'); c.untracked.forEach((p) => outln('\t' + col(C.red, display(p)))); }
          outln(c.unstaged.length ? '\nno changes added to commit (use "git add" and/or "git commit -a")' : c.untracked.length ? '\nnothing added to commit but untracked files present (use "git add" to track)' : 'nothing to commit, working tree clean');
          return 1;
        }
        if (msg === null) {
          // open the editor, just like real git
          const edSegs = repo.gitSegs.concat('COMMIT_EDITMSG');
          const def = db.merge ? db.merge.msg : amend ? db.objects[headId(db)].msg : '';
          vfs.writeFile(edSegs, `${def}\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n# On branch ${db.head}\n# Changes to be committed:\n${st.files.map((f) => `#\t${f.created ? 'new file' : f.deleted ? 'deleted' : 'modified'}:   ${f.p}`).join('\n')}\n#\n`);
          if (!ctx.editor) { err('Aborting commit due to empty commit message.'); return 1; }
          outln(col(C.dim, `hint: Waiting for your editor to close the file... (${ctx.editorName || 'nano'})`));
          await ctx.editor(edSegs);
          msg = vfs.content(vfs.get(edSegs)).split('\n').filter((l) => !l.startsWith('#')).join('\n').trim();
          if (!msg) { err('Aborting commit due to empty commit message.'); return 1; }
        }
        const root = !headId(db);
        let parents = headId(db) ? [headId(db)] : [];
        if (amend && headId(db)) parents = db.objects[headId(db)].parents.slice();
        if (db.merge) parents.push(db.merge.theirs);
        const id = makeCommit(db.index, parents, msg);
        const wasMerge = !!db.merge;
        db.merge = null;
        outln(`[${db.detached ? 'detached HEAD' : db.head}${root ? ' (root-commit)' : ''} ${short(id)}] ${msg.split('\n')[0]}`);
        if (amend) outln(` Date: ${TX.gitDate(Date.now())}`);
        if (!wasMerge) {
          outln(statSummary(st));
          st.files.forEach((f) => { if (f.created) outln(` create mode 100644 ${f.p}`); else if (f.deleted) outln(` delete mode 100644 ${f.p}`); });
        }
        return 0;
      }
      case 'log': case 'shortlog': case 'reflog': {
        let n = Infinity;
        const oneline = rest.includes('--oneline') || sub === 'reflog';
        const graph = rest.includes('--graph');
        const all = rest.includes('--all');
        const stat = rest.includes('--stat');
        const patch = rest.includes('-p') || rest.includes('--patch');
        rest.forEach((a, i) => { if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10); if (a === '-n') n = parseInt(rest[i + 1], 10); if (/^--max-count=/.test(a)) n = parseInt(a.split('=')[1], 10); });
        const revArg = rest.find((a) => !a.startsWith('-') && !/^\d+$/.test(a));
        const start = revArg ? resolveRev(db, revArg) : headId(db);
        if (revArg && !start) { err(`fatal: ambiguous argument '${revArg}': unknown revision or path not in the working tree.`); return 128; }
        if (!start) { err(`fatal: your current branch '${db.head}' does not have any commits yet`); return 128; }
        const starts = all ? [...new Set([start].concat(Object.values(db.refs), Object.values(db.remoteRefs)))] : [start];
        const seen = new Set();
        let list = [];
        const q = starts.slice();
        while (q.length) { const id = q.shift(); if (!id || seen.has(id) || !db.objects[id]) continue; seen.add(id); list.push(id); q.push(...db.objects[id].parents); }
        list.sort((a, b) => db.objects[b].time - db.objects[a].time);
        list = list.slice(0, n);
        if (sub === 'shortlog') { const by = {}; list.forEach((id) => { const o = db.objects[id]; (by[o.author] = by[o.author] || []).push(o.msg.split('\n')[0]); }); Object.keys(by).forEach((a) => { outln(`${a} (${by[a].length}):`); by[a].forEach((m) => outln('      ' + m)); outln(''); }); return 0; }
        const lines = [];
        list.forEach((id, i) => {
          const o = db.objects[id];
          const g = graph ? (o.parents.length > 1 ? '*   ' : '* ') : '';
          if (sub === 'reflog') { lines.push(col(C.yellow, short(id)) + decorations(id) + ` HEAD@{${i}}: ${i === list.length - 1 ? 'commit (initial)' : 'commit'}: ${o.msg.split('\n')[0]}`); return; }
          if (oneline) { lines.push(g + col(C.yellow, short(id)) + decorations(id) + ' ' + o.msg.split('\n')[0]); return; }
          lines.push(g + col(C.yellow, 'commit ' + id) + decorations(id));
          const bar = graph ? '| ' : '';
          if (o.parents.length > 1) lines.push(bar + 'Merge: ' + o.parents.map(short).join(' '));
          lines.push(bar + `Author: ${o.author} <${o.email}>`);
          lines.push(bar + `Date:   ${TX.gitDate(o.time)}`);
          lines.push(bar);
          o.msg.split('\n').forEach((l) => lines.push(bar + '    ' + l));
          if (stat || patch) {
            const parent = o.parents[0] ? db.objects[o.parents[0]].tree : {};
            if (stat) { lines.push(bar); const st = diffStat(parent, o.tree); st.files.forEach((f) => lines.push(bar + ` ${f.p} | ${f.ins + f.del} ${col(C.green, '+'.repeat(Math.min(f.ins, 30)))}${col(C.red, '-'.repeat(Math.min(f.del, 30)))}`)); lines.push(bar + statSummary(st)); }
          }
          if (i < list.length - 1) lines.push(graph ? '|' : '');
        });
        const text = lines.join('\n') + '\n';
        if (ctx.tty && ctx.term && lines.length > ctx.term.rows - 2 && !oneline) { await TX.apps.pager(ctx.term, text, ':'); return 0; }
        out(text);
        return 0;
      }
      case 'diff': {
        const staged = rest.includes('--staged') || rest.includes('--cached');
        const statOnly = rest.includes('--stat');
        const nameOnly = rest.includes('--name-only');
        const revs = rest.filter((a) => !a.startsWith('-') && a !== '--');
        let a, b;
        const specs = [];
        if (revs.length >= 2 && resolveRev(db, revs[0]) && resolveRev(db, revs[1])) { a = db.objects[resolveRev(db, revs[0])].tree; b = db.objects[resolveRev(db, revs[1])].tree; }
        else if (revs.length >= 1 && /\.\./.test(revs[0])) { const [x, y] = revs[0].split('..'); a = db.objects[resolveRev(db, x)].tree; b = db.objects[resolveRev(db, y || 'HEAD')].tree; }
        else if (revs.length >= 1 && resolveRev(db, revs[0])) { a = db.objects[resolveRev(db, revs[0])].tree; b = staged ? db.index : workTree(); specs.push(...revs.slice(1)); }
        else if (staged) { a = headTree(db); b = db.index; specs.push(...revs); }
        else { a = db.index; const w = workTree(); b = {}; Object.keys(db.index).forEach((p) => { if (p in w) b[p] = w[p]; }); specs.push(...revs); }
        const m = matchSpec(specs);
        if (statOnly || nameOnly) { const st = diffStat(a, b); st.files.filter((f) => m(f.p)).forEach((f) => outln(nameOnly ? f.p : ` ${f.p} | ${f.ins + f.del} ${col(C.green, '+'.repeat(f.ins))}${col(C.red, '-'.repeat(f.del))}`)); if (statOnly && st.files.length) outln(statSummary(st)); return 0; }
        printDiff(a, b, { filter: m });
        return 0;
      }
      case 'show': {
        const rev = rest.find((a) => !a.startsWith('-')) || 'HEAD';
        if (rev.includes(':')) { const [r, p] = rev.split(':'); const id = resolveRev(db, r || 'HEAD'); const t = id && db.objects[id].tree; if (!t || !(p in t)) { err(`fatal: path '${p}' does not exist in '${r}'`); return 128; } out(t[p]); return 0; }
        const id = resolveRev(db, rev);
        if (!id) { err(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.`); return 128; }
        const o = db.objects[id];
        outln(col(C.yellow, 'commit ' + id) + decorations(id));
        if (o.parents.length > 1) outln('Merge: ' + o.parents.map(short).join(' '));
        outln(`Author: ${o.author} <${o.email}>\nDate:   ${TX.gitDate(o.time)}\n\n${o.msg.split('\n').map((l) => '    ' + l).join('\n')}\n`);
        if (!rest.includes('--stat')) printDiff(o.parents[0] ? db.objects[o.parents[0]].tree : {}, o.tree);
        else { const st = diffStat(o.parents[0] ? db.objects[o.parents[0]].tree : {}, o.tree); st.files.forEach((f) => outln(` ${f.p} | ${f.ins + f.del} ${col(C.green, '+'.repeat(f.ins))}${col(C.red, '-'.repeat(f.del))}`)); outln(statSummary(st)); }
        return 0;
      }
      case 'branch': {
        const del = rest.includes('-d') || rest.includes('-D') || rest.includes('--delete');
        const force = rest.includes('-D');
        const mv = rest.includes('-m') || rest.includes('-M');
        const showAll = rest.includes('-a') || rest.includes('--all');
        const showRemote = rest.includes('-r');
        const verbose = rest.includes('-v') || rest.includes('-vv');
        const names = rest.filter((a) => !a.startsWith('-'));
        if (rest.includes('--show-current')) { outln(db.detached ? '' : db.head); return 0; }
        if (rest.some((a) => a.startsWith('--set-upstream-to') || a === '-u')) { const up = (rest.find((a) => a.startsWith('--set-upstream-to=')) || '').split('=')[1] || names[0]; db.upstream[db.head] = up; outln(`branch '${db.head}' set up to track '${up}'.`); save(); return 0; }
        if (del) {
          let code = 0;
          for (const n of names) {
            if (!db.refs[n]) { err(`error: branch '${n}' not found`); code = 1; continue; }
            if (n === db.head && !db.detached) { err(`error: cannot delete branch '${n}' used by worktree at '${ctx.fmt(repo.root)}'`); code = 1; continue; }
            if (!force && !ancestors(db, headId(db)).has(db.refs[n])) { err(`error: the branch '${n}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${n}'`); code = 1; continue; }
            outln(`Deleted branch ${n} (was ${short(db.refs[n])}).`);
            delete db.refs[n];
          }
          save();
          return code;
        }
        if (mv) {
          const [a, b] = names.length === 1 ? [db.head, names[0]] : names;
          if (!db.refs[a] && a !== db.head) { err(`error: refname refs/heads/${a} not found\nfatal: Branch rename failed`); return 128; }
          if (db.refs[b]) { err(`fatal: a branch named '${b}' already exists`); return 128; }
          if (db.refs[a]) { db.refs[b] = db.refs[a]; delete db.refs[a]; }
          if (db.head === a) db.head = b;
          if (db.upstream[a]) { db.upstream[b] = db.upstream[a]; delete db.upstream[a]; }
          save();
          return 0;
        }
        if (names.length) {
          const n = names[0];
          if (!/^[\w./-]+$/.test(n) || n.endsWith('/') || n.includes('..')) { err(`fatal: '${n}' is not a valid branch name`); return 128; }
          if (db.refs[n]) { err(`fatal: a branch named '${n}' already exists`); return 128; }
          const from = names[1] ? resolveRev(db, names[1]) : headId(db);
          if (!from) { err(`fatal: not a valid object name: '${names[1] || db.head}'`); return 128; }
          db.refs[n] = from;
          save();
          return 0;
        }
        const list = Object.keys(db.refs).sort();
        if (!showRemote) {
          if (db.detached) outln('* ' + col(C.green, `(HEAD detached at ${short(db.detached)})`));
          list.forEach((b) => {
            const cur = b === db.head && !db.detached;
            const o = db.objects[db.refs[b]];
            const info = verbose ? ' ' + col(C.yellow, short(db.refs[b])) + (rest.includes('-vv') && db.upstream[b] ? ' [' + col(C.blue, db.upstream[b]) + ']' : '') + ' ' + (o ? o.msg.split('\n')[0] : '') : '';
            outln((cur ? '* ' + col(C.green, b) : '  ' + b) + info);
          });
        }
        if (showAll || showRemote) Object.keys(db.remoteRefs).sort().forEach((r) => outln('  ' + col(C.red, (showAll ? 'remotes/' : '') + r)));
        return 0;
      }
      case 'checkout': case 'switch': {
        let create = null;
        const force = rest.includes('-f') || rest.includes('--force');
        const args2 = [];
        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === '-b' || rest[i] === '-c' || rest[i] === '-B' || rest[i] === '-C') create = rest[++i];
          else if (!rest[i].startsWith('-') || rest[i] === '--' || rest[i] === '-') args2.push(rest[i]);
        }
        const dd = args2.indexOf('--');
        if (sub === 'checkout' && (dd >= 0 || (args2.length && !create && !resolveRev(db, args2[0]) && !db.refs[args2[0]] && !(db.remoteRefs['origin/' + args2[0]])))) {
          // checkout -- file : restore from index
          const specs = dd >= 0 ? args2.slice(dd + 1) : args2;
          const m = matchSpec(specs);
          const hits = Object.keys(db.index).filter(m);
          if (!hits.length) { err(`error: pathspec '${specs[0]}' did not match any file(s) known to git`); return 1; }
          hits.forEach((p) => writeTree(vfs, repo, { [p]: db.index[p] }, {}, ctx.user));
          if (hits.length > 1 || specs[0] === '.') outln(`Updated ${hits.length} path${hits.length > 1 ? 's' : ''} from the index`);
          return 0;
        }
        const target = args2[0];
        if (!create && !target) { err(sub === 'switch' ? 'fatal: missing branch or commit argument' : ''); return 128; }
        const curTree = headTree(db);
        const c = changes();
        let destId;
        let newHead = null, detach = null;
        if (create) {
          if (db.refs[create]) { err(`fatal: a branch named '${create}' already exists`); return 128; }
          destId = target ? resolveRev(db, target) : headId(db);
          if (target && !destId) { err(`fatal: '${target}' is not a commit and a branch '${create}' cannot be created from it`); return 128; }
          newHead = create;
        } else if (db.refs[target] !== undefined || (target === db.head && !headId(db))) { destId = db.refs[target]; newHead = target; }
        else if (db.remoteRefs['origin/' + target]) { destId = db.remoteRefs['origin/' + target]; newHead = target; db.refs[target] = destId; db.upstream[target] = 'origin/' + target; outln(`branch '${target}' set up to track 'origin/${target}'.`); }
        else if (target === '-') { const prev = db.prevHead; if (!prev) { err('error: pathspec \'-\' did not match any file(s) known to git'); return 1; } destId = db.refs[prev]; newHead = prev; }
        else {
          const id = resolveRev(db, target);
          if (!id) { err(sub === 'switch' ? `fatal: invalid reference: ${target}` : `error: pathspec '${target}' did not match any file(s) known to git`); return sub === 'switch' ? 128 : 1; }
          if (sub === 'switch' && !rest.includes('--detach') && !rest.includes('-d')) { err(`fatal: a branch is expected, got commit '${target}'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.`); return 128; }
          destId = id; detach = id;
        }
        if (!create && newHead === db.head && !db.detached) { outln(`Already on '${newHead}'`); const tl = trackingLine(); if (tl) outln(tl); return 0; }
        const destTree = destId ? db.objects[destId].tree : {};
        // conflict check: local changes to files that differ between trees
        const dirty = c.staged.map(([, p]) => p).concat(c.unstaged.map(([, p]) => p));
        const clobber = dirty.filter((p) => curTree[p] !== destTree[p]);
        if (clobber.length && !force) { err(`error: Your local changes to the following files would be overwritten by checkout:\n\t${clobber.join('\n\t')}\nPlease commit your changes or stash them before you switch branches.\nAborting`); return 1; }
        const untrackedClobber = c.untracked.filter((p) => p in destTree);
        if (untrackedClobber.length && !force) { err(`error: The following untracked working tree files would be overwritten by checkout:\n\t${untrackedClobber.join('\n\t')}\nPlease move or remove them before you switch branches.\nAborting`); return 1; }
        // update working tree: apply dest tree, but keep local modifications of files unchanged between trees
        const newTree = Object.assign({}, destTree);
        const keep = {};
        dirty.forEach((p) => { if (curTree[p] === destTree[p] && p in c.work) keep[p] = c.work[p]; });
        writeTree(vfs, repo, newTree, curTree, ctx.user);
        writeTree(vfs, repo, keep, {}, ctx.user);
        const newIndex = Object.assign({}, destTree);
        c.staged.forEach(([, p]) => { if (curTree[p] === destTree[p]) { if (p in db.index) newIndex[p] = db.index[p]; else delete newIndex[p]; } });
        db.index = newIndex;
        if (!db.detached) db.prevHead = db.head;
        if (detach) {
          db.detached = detach;
          err(`Note: switching to '${target}'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nIf you want to create a new branch to retain commits you create, you may\ndo so (now or later) by using -c with the switch command. Example:\n\n  git switch -c <new-branch-name>\n\nOr undo this operation with:\n\n  git switch -\n\nHEAD is now at ${short(detach)} ${db.objects[detach].msg.split('\n')[0]}`);
        } else {
          db.detached = null;
          if (create) db.refs[create] = destId;
          if (create && !destId) delete db.refs[create];
          db.head = newHead;
          Object.keys(keep).forEach((p) => outln('M\t' + p));
          err(create ? `Switched to a new branch '${newHead}'` : `Switched to branch '${newHead}'`);
          const tl = trackingLine(); if (tl && !create) outln(tl);
        }
        save();
        return 0;
      }
      case 'restore': {
        const stagedOpt = rest.includes('--staged') || rest.includes('-S');
        const worktree = rest.includes('--worktree') || rest.includes('-W') || !stagedOpt;
        let source = null;
        const specs = [];
        for (let i = 0; i < rest.length; i++) { if (rest[i] === '--source' || rest[i] === '-s') source = rest[++i]; else if (rest[i].startsWith('--source=')) source = rest[i].split('=')[1]; else if (!rest[i].startsWith('-')) specs.push(rest[i]); }
        if (!specs.length) { err('fatal: you must specify path(s) to restore'); return 128; }
        const m = matchSpec(specs);
        const srcTree = source ? db.objects[resolveRev(db, source)].tree : null;
        let hit = false;
        if (stagedOpt) { const head = headTree(db); const paths = [...new Set(Object.keys(db.index).concat(Object.keys(head)))].filter(m); paths.forEach((p) => { hit = true; if (p in head) db.index[p] = head[p]; else delete db.index[p]; }); }
        if (worktree && !stagedOpt) {
          const from = srcTree || db.index;
          const paths = Object.keys(from).filter(m);
          paths.forEach((p) => { hit = true; writeTree(vfs, repo, { [p]: from[p] }, {}, ctx.user); });
        }
        if (!hit) { err(`error: pathspec '${specs[0]}' did not match any file(s) known to git`); return 1; }
        save();
        return 0;
      }
      case 'reset': {
        const mode = rest.includes('--hard') ? 'hard' : rest.includes('--soft') ? 'soft' : 'mixed';
        const nonOpt = rest.filter((a) => !a.startsWith('-'));
        let rev = 'HEAD', specs = [];
        if (nonOpt.length && resolveRev(db, nonOpt[0])) { rev = nonOpt[0]; specs = nonOpt.slice(1); } else specs = nonOpt;
        const id = resolveRev(db, rev);
        if (specs.length) {
          const t = id ? db.objects[id].tree : {};
          const m = matchSpec(specs);
          [...new Set(Object.keys(db.index).concat(Object.keys(t)))].filter(m).forEach((p) => { if (p in t) db.index[p] = t[p]; else delete db.index[p]; });
          const c = changes();
          if (c.unstaged.length) { outln('Unstaged changes after reset:'); c.unstaged.forEach(([k, p]) => outln((k === 'deleted' ? 'D' : 'M') + '\t' + p)); }
          save();
          return 0;
        }
        if (!id) { if (!headId(db)) { db.index = {}; save(); return 0; } err(`fatal: ambiguous argument '${rev}': unknown revision or path not in the working tree.`); return 128; }
        const prev = headTree(db);
        if (db.detached) db.detached = id; else db.refs[db.head] = id;
        const t = db.objects[id].tree;
        if (mode !== 'soft') db.index = Object.assign({}, t);
        if (mode === 'hard') { const work = workTree(); const tracked = Object.assign({}, prev); Object.keys(work).forEach((p) => { if (!(p in t) && p in prev) tracked[p] = 1; }); writeTree(vfs, repo, t, tracked, ctx.user); db.merge = null; outln(`HEAD is now at ${short(id)} ${db.objects[id].msg.split('\n')[0]}`); }
        else if (mode === 'mixed') { const c = changes(); if (c.unstaged.length) { outln('Unstaged changes after reset:'); c.unstaged.forEach(([k, p]) => outln((k === 'deleted' ? 'D' : 'M') + '\t' + p)); } }
        save();
        return 0;
      }
      case 'merge': {
        if (rest.includes('--abort')) {
          if (!db.merge) { err('fatal: There is no merge to abort (MERGE_HEAD missing).'); return 128; }
          const t = headTree(db);
          writeTree(vfs, repo, t, Object.assign({}, db.index, workTree()), ctx.user);
          db.index = Object.assign({}, t);
          db.merge = null; save();
          return 0;
        }
        if (db.merge) { err('error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.'); return 128; }
        const name = rest.find((a) => !a.startsWith('-'));
        if (!name) { err('fatal: No remote for the current branch.'); return 128; }
        const theirs = resolveRev(db, name);
        if (!theirs) { err(`merge: ${name} - not something we can merge`); return 1; }
        const msgIdx = rest.indexOf('-m');
        return doMerge(theirs, name, msgIdx >= 0 ? rest[msgIdx + 1] : null, rest.includes('--no-ff'));
      }
      case 'stash': {
        const op = rest[0] && !rest[0].startsWith('-') ? rest[0] : 'push';
        if (op === 'push' || op === 'save') {
          const c = changes();
          const includeUntracked = rest.includes('-u') || rest.includes('--include-untracked');
          if (!c.staged.length && !c.unstaged.length && !(includeUntracked && c.untracked.length)) { outln('No local changes to save'); return 0; }
          const head = headTree(db);
          const entry = { index: Object.assign({}, db.index), work: {}, base: headId(db), branch: db.head, msg: (rest.includes('-m') ? rest[rest.indexOf('-m') + 1] : null) || (headId(db) ? `${short(headId(db))} ${db.objects[headId(db)].msg.split('\n')[0]}` : 'WIP') };
          Object.keys(c.work).forEach((p) => { if (p in db.index || p in head || (includeUntracked && !ignored(p))) entry.work[p] = c.work[p]; });
          db.stash.unshift(entry);
          const removeUntracked = includeUntracked ? Object.keys(entry.work).filter((p) => !(p in head) && !(p in db.index)) : [];
          const prevTracked = Object.assign({}, db.index, head); removeUntracked.forEach((p) => { prevTracked[p] = 1; });
          writeTree(vfs, repo, head, prevTracked, ctx.user);
          db.index = Object.assign({}, head);
          outln(`Saved working directory and index state ${entry.msg.startsWith('WIP') || rest.includes('-m') ? '' : 'WIP '}on ${db.head}: ${entry.msg}`);
          save();
          return 0;
        }
        if (op === 'list') { db.stash.forEach((s, i) => outln(`stash@{${i}}: ${s.msg.startsWith('On ') ? s.msg : 'WIP on ' + s.branch + ': ' + s.msg}`)); return 0; }
        if (op === 'show') { const s = db.stash[0]; if (!s) { err('error: No stash entries found.'); return 1; } const st = diffStat(s.base ? db.objects[s.base].tree : {}, s.work); st.files.forEach((f) => outln(` ${f.p} | ${f.ins + f.del} ${col(C.green, '+'.repeat(f.ins))}${col(C.red, '-'.repeat(f.del))}`)); outln(statSummary(st)); return 0; }
        if (op === 'pop' || op === 'apply') {
          const s = db.stash[0];
          if (!s) { err('error: No stash entries found.'); return 1; }
          const c = changes();
          const clash = Object.keys(s.work).filter((p) => c.unstaged.some(([, q]) => q === p));
          if (clash.length) { err(`error: Your local changes to the following files would be overwritten by merge:\n\t${clash.join('\n\t')}\nPlease commit your changes or stash them before you merge.\nAborting\nThe stash entry is kept in case you need it again.`); return 1; }
          writeTree(vfs, repo, s.work, {}, ctx.user);
          Object.keys(s.index).forEach((p) => { if (s.index[p] !== headTree(db)[p]) db.index[p] = s.index[p]; });
          if (op === 'pop') { db.stash.shift(); }
          await git(ctx, ['status']);
          if (op === 'pop') outln(`Dropped refs/stash@{0} (${TX.sha1(JSON.stringify(s)).slice(0, 40)})`);
          save();
          return 0;
        }
        if (op === 'drop') { if (!db.stash.length) { err('error: No stash entries found.'); return 1; } const s = db.stash.shift(); outln(`Dropped refs/stash@{0} (${TX.sha1(JSON.stringify(s))})`); save(); return 0; }
        if (op === 'clear') { db.stash = []; save(); return 0; }
        err(`error: unknown subcommand: ${op}`); return 1;
      }
      case 'tag': {
        const del = rest.includes('-d');
        const names = [];
        for (let i = 0; i < rest.length; i++) { if (rest[i] === '-m') i++; else if (!rest[i].startsWith('-')) names.push(rest[i]); }
        if (del) { names.forEach((n) => { if (db.tags[n]) { outln(`Deleted tag '${n}' (was ${short(db.tags[n])})`); delete db.tags[n]; } else err(`error: tag '${n}' not found.`); }); save(); return 0; }
        if (!names.length) { Object.keys(db.tags).sort().forEach((t) => outln(t)); return 0; }
        if (db.tags[names[0]]) { err(`fatal: tag '${names[0]}' already exists`); return 128; }
        const id = names[1] ? resolveRev(db, names[1]) : headId(db);
        if (!id) { err('fatal: Failed to resolve \'HEAD\' as a valid ref.'); return 128; }
        db.tags[names[0]] = id; save();
        return 0;
      }
      case 'revert': {
        const rev = rest.find((a) => !a.startsWith('-'));
        const id = resolveRev(db, rev);
        if (!id) { err(`fatal: bad revision '${rev}'`); return 128; }
        if (needIdentity()) return 128;
        const o = db.objects[id];
        const parent = o.parents[0] ? db.objects[o.parents[0]].tree : {};
        const cur = headTree(db);
        const next = Object.assign({}, cur);
        const paths = [...new Set(Object.keys(parent).concat(Object.keys(o.tree)))];
        for (const p of paths) { if (parent[p] === o.tree[p]) continue; if (cur[p] !== o.tree[p]) { err(`error: could not revert ${short(id)}... ${o.msg.split('\n')[0]}\nhint: after resolving the conflicts, mark the corrected paths\nhint: with 'git add <paths>' or 'git rm <paths>'`); return 1; } if (p in parent) next[p] = parent[p]; else delete next[p]; }
        writeTree(vfs, repo, next, cur, ctx.user);
        db.index = Object.assign({}, next);
        const msg = `Revert "${o.msg.split('\n')[0]}"\n\nThis reverts commit ${id}.`;
        const nid = makeCommit(next, [headId(db)], msg);
        const st = diffStat(cur, next);
        outln(`[${db.head} ${short(nid)}] Revert "${o.msg.split('\n')[0]}"\n${statSummary(st)}`);
        return 0;
      }
      case 'remote': {
        const op = rest[0];
        if (!op || op === '-v') { Object.keys(db.remotes).forEach((r) => { if (op === '-v') { outln(`${r}\t${db.remotes[r]} (fetch)`); outln(`${r}\t${db.remotes[r]} (push)`); } else outln(r); }); return 0; }
        if (op === 'add') { const [, name, url] = rest; if (!name || !url) { err('usage: git remote add [<options>] <name> <url>'); return 129; } if (db.remotes[name]) { err(`error: remote ${name} already exists.`); return 3; } db.remotes[name] = url; save(); return 0; }
        if (op === 'remove' || op === 'rm') { const name = rest[1]; if (!db.remotes[name]) { err(`error: No such remote: '${name}'`); return 2; } delete db.remotes[name]; Object.keys(db.remoteRefs).forEach((k) => { if (k.startsWith(name + '/')) delete db.remoteRefs[k]; }); save(); return 0; }
        if (op === 'set-url') { db.remotes[rest[1]] = rest[2]; save(); return 0; }
        if (op === 'get-url') { outln(db.remotes[rest[1]] || ''); return db.remotes[rest[1]] ? 0 : 2; }
        if (op === 'show') { const name = rest[1] || 'origin'; outln(`* remote ${name}\n  Fetch URL: ${db.remotes[name]}\n  Push  URL: ${db.remotes[name]}\n  HEAD branch: main`); return 0; }
        err(`error: unknown subcommand: \`${op}'`); return 129;
      }
      case 'fetch': return fetch(rest.find((a) => !a.startsWith('-')) || 'origin', false);
      case 'pull': {
        const remote = rest.find((a) => !a.startsWith('-')) || (db.upstream[db.head] || 'origin/').split('/')[0] || 'origin';
        const r = await fetch(remote, true);
        if (r) return r;
        const up = db.upstream[db.head] || remote + '/' + db.head;
        const theirs = db.remoteRefs[up];
        if (!theirs) { err(`There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\nSee git-pull(1) for details.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/<branch> ${db.head}\n`); return 1; }
        return doMerge(theirs, up, null, false, true);
      }
      case 'push': {
        const setUp = rest.includes('-u') || rest.includes('--set-upstream');
        const force = rest.includes('-f') || rest.includes('--force');
        const pos = rest.filter((a) => !a.startsWith('-'));
        if (!Object.keys(db.remotes).length) { err('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>\n'); return 128; }
        const remote = pos[0] || (db.upstream[db.head] || '').split('/')[0] || (pos.length ? pos[0] : null);
        if (!pos.length && !db.upstream[db.head]) { err(`fatal: The current branch ${db.head} has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream origin ${db.head}\n\nTo have this happen automatically for branches without a tracking\nupstream, see 'push.autoSetupRemote' in 'git help config'.\n`); return 128; }
        const url = db.remotes[remote];
        if (!url) { err(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`); return 128; }
        const branch = (pos[1] || db.head).split(':')[0];
        const local = db.refs[branch];
        if (!local) { err(`error: src refspec ${branch} does not match any\nerror: failed to push some refs to '${url}'`); return 1; }
        const rdb = remoteSeed(url) || (REMOTES[normUrl(url)] = /^\/|^[A-Z]:|^file:/.test(url) ? { objects: {}, refs: {} } : null);
        if (!rdb) { err(`fatal: unable to access '${url}': Could not resolve host: ${url.replace(/^https?:\/\//, '').split('/')[0]}`); return 128; }
        if (!(await authRemote(url))) return 128;
        const remoteHead = rdb.refs[branch];
        if (remoteHead && !force && !ancestors(db, local).has(remoteHead)) {
          err(`To ${url}\n ${col(C.red, '! [rejected]')}        ${branch} -> ${branch} (fetch first)\nerror: failed to push some refs to '${url}'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.\nhint: See the 'Note about fast-forwards' in 'git push --help' for details.`);
          return 1;
        }
        if (remoteHead === local) { err('Everything up-to-date'); if (setUp) { db.upstream[branch] = remote + '/' + branch; outln(`branch '${branch}' set up to track '${remote}/${branch}'.`); save(); } return 0; }
        const newObjs = [...ancestors(db, local)].filter((id) => !rdb.objects[id]);
        newObjs.forEach((id) => { rdb.objects[id] = JSON.parse(JSON.stringify(db.objects[id])); });
        const n = newObjs.length * 3;
        err(`Enumerating objects: ${n + 2}, done.\nCounting objects: 100% (${n + 2}/${n + 2}), done.\nDelta compression using up to ${ctx.m.hw.threads} threads\nCompressing objects: 100% (${n}/${n}), done.\nWriting objects: 100% (${n}/${n}), ${TX.randInt(300, 2000)} bytes | ${TX.randInt(300, 900)}.00 KiB/s, done.\nTotal ${n} (delta ${Math.floor(n / 3)}), reused 0 (delta 0), pack-reused 0${ctx.m.kind === 'mac' ? '' : ' (from 0)'}`);
        if (!remoteHead) err(`remote: \nremote: Create a pull request for '${branch}' on GitHub by visiting:\nremote:      ${url.replace(/\.git$/, '')}/pull/new/${branch}\nremote: `);
        rdb.refs[branch] = local;
        db.remoteRefs[remote + '/' + branch] = local;
        err(`To ${url}\n ${remoteHead ? (force ? '+ ' : '  ') + short(remoteHead) + (force ? '...' : '..') + short(local) : '* [new branch]     '}  ${branch} -> ${branch}${force && remoteHead ? ' (forced update)' : ''}`);
        if (setUp) { db.upstream[branch] = remote + '/' + branch; outln(`branch '${branch}' set up to track '${remote}/${branch}'.`); }
        save(); TX.app && TX.app.save();
        return 0;
      }
      case 'rev-parse': {
        if (rest.includes('--show-toplevel')) { outln(ctx.fmt(repo.root)); return 0; }
        if (rest.includes('--abbrev-ref')) { outln(db.detached ? 'HEAD' : db.head); return 0; }
        if (rest.includes('--is-inside-work-tree')) { outln('true'); return 0; }
        if (rest.includes('--git-dir')) { outln('.git'); return 0; }
        const id = resolveRev(db, rest.find((a) => !a.startsWith('-')) || 'HEAD');
        if (!id) { err('fatal: ambiguous argument'); return 128; }
        outln(rest.includes('--short') ? short(id) : id);
        return 0;
      }
      case 'ls-files': Object.keys(db.index).sort().forEach((p) => outln(display(p))); return 0;
      case 'blame': {
        const p = toRepoPath(rest.find((a) => !a.startsWith('-')) || '');
        const id = headId(db);
        if (!id || !(p in db.objects[id].tree)) { err(`fatal: no such path '${p}' in HEAD`); return 128; }
        // naive blame: find the oldest commit in the first-parent chain where each line appears
        const chain = []; let x = id; while (x) { chain.push(x); x = db.objects[x].parents[0]; }
        TX.splitLines(db.objects[id].tree[p]).forEach((line, i) => {
          let who = id; for (const cid of chain) { const t = db.objects[cid].tree[p]; if (t && TX.splitLines(t).includes(line)) who = cid; else break; }
          const o = db.objects[who];
          outln(`${short(who).slice(0, 8)} (${(o.author || '').padEnd(10).slice(0, 10)} ${TX.isoDate(o.time)} -0400 ${String(i + 1).padStart(2)}) ${line}`);
        });
        return 0;
      }
      case 'cherry-pick': case 'rebase': case 'bisect': case 'worktree': case 'submodule': case 'gc': case 'fsck':
        err(`TerminalEX: 'git ${sub}' is not simulated yet. Try merge, reset, or revert instead.`); return 1;
      case 'clean': {
        const c = changes();
        if (!rest.includes('-f') && !rest.includes('-n')) { err('fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean'); return 128; }
        c.untracked.forEach((p) => { outln((rest.includes('-n') ? 'Would remove ' : 'Removing ') + p); if (rest.includes('-f')) try { vfs.remove(repo.root.concat(p.replace(/\/$/, '').split('/')), { recursive: true }); } catch (e) { /* ignore */ } });
        return 0;
      }
      default: {
        const known = ['add', 'branch', 'checkout', 'clone', 'commit', 'config', 'diff', 'fetch', 'init', 'log', 'merge', 'mv', 'pull', 'push', 'remote', 'reset', 'restore', 'revert', 'rm', 'show', 'stash', 'status', 'switch', 'tag'];
        const s = TX.suggest(sub, known);
        err(`git: '${sub}' is not a git command. See 'git --help'.${s ? `\n\nThe most similar command is\n\t${s}` : ''}`);
        return 1;
      }
    }

    async function fetch(remote, quietIfNone) {
      const url = db.remotes[remote];
      if (!url) { err(`fatal: '${remote}' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.`); return 128; }
      const rdb = REMOTES[normUrl(url)] || remoteSeed(url);
      if (!rdb) { err(`fatal: unable to access '${url}': Could not resolve host`); return 128; }
      let newCount = 0;
      Object.keys(rdb.objects).forEach((id) => { if (!db.objects[id]) { db.objects[id] = JSON.parse(JSON.stringify(rdb.objects[id])); newCount++; } });
      const updates = [];
      Object.keys(rdb.refs).forEach((b) => { const k = remote + '/' + b; if (db.remoteRefs[k] !== rdb.refs[b]) updates.push([b, db.remoteRefs[k], rdb.refs[b]]); db.remoteRefs[k] = rdb.refs[b]; });
      if (newCount) err(`remote: Enumerating objects: ${newCount * 3}, done.\nremote: Counting objects: 100% (${newCount * 3}/${newCount * 3}), done.\nremote: Total ${newCount * 3} (delta 0), reused ${newCount * 3} (delta 0), pack-reused 0\nUnpacking objects: 100% (${newCount * 3}/${newCount * 3}), done.`);
      if (updates.length) { err(`From ${url.replace(/\.git$/, '')}`); updates.forEach(([b, a, z]) => err(a ? `   ${short(a)}..${short(z)}  ${b.padEnd(10)} -> ${remote}/${b}` : ` * [new branch]      ${b.padEnd(10)} -> ${remote}/${b}`)); }
      void quietIfNone;
      save();
      return 0;
    }
    function doMerge(theirs, name, msg, noff, fromPull) {
      const ours = headId(db);
      if (!ours) { const t = db.objects[theirs].tree; writeTree(vfs, repo, t, {}, ctx.user); db.index = Object.assign({}, t); db.refs[db.head] = theirs; save(); return 0; }
      const c = changes();
      if (ancestors(db, ours).has(theirs)) { outln('Already up to date.'); return 0; }
      const base = mergeBase(db, ours, theirs);
      const oursT = db.objects[ours].tree, theirsT = db.objects[theirs].tree, baseT = base ? db.objects[base].tree : {};
      const dirty = c.staged.map(([, p]) => p).concat(c.unstaged.map(([, p]) => p));
      const touched = Object.keys(Object.assign({}, oursT, theirsT)).filter((p) => theirsT[p] !== oursT[p]);
      const clobber = dirty.filter((p) => touched.includes(p));
      if (clobber.length) { err(`error: Your local changes to the following files would be overwritten by merge:\n\t${clobber.join('\n\t')}\nPlease commit your changes or stash them before you merge.\nAborting`); return 1; }
      if (base === ours && !noff) {
        const st = diffStat(oursT, theirsT);
        writeTree(vfs, repo, theirsT, oursT, ctx.user);
        db.index = Object.assign({}, theirsT);
        if (db.detached) db.detached = theirs; else db.refs[db.head] = theirs;
        outln(`Updating ${short(ours)}..${short(theirs)}\nFast-forward`);
        const w = Math.max(...st.files.map((f) => f.p.length), 1);
        st.files.forEach((f) => outln(` ${f.p.padEnd(w)} | ${String(f.ins + f.del).padStart(2)} ${col(C.green, '+'.repeat(Math.min(f.ins, 40)))}${col(C.red, '-'.repeat(Math.min(f.del, 40)))}`));
        outln(statSummary(st));
        st.files.forEach((f) => { if (f.created) outln(` create mode 100644 ${f.p}`); else if (f.deleted) outln(` delete mode 100644 ${f.p}`); });
        save();
        return 0;
      }
      if (needIdentity()) return 128;
      const result = {};
      const conflictsList = [];
      const paths = [...new Set(Object.keys(baseT).concat(Object.keys(oursT), Object.keys(theirsT)))].sort();
      for (const p of paths) {
        const b = baseT[p], o = oursT[p], t = theirsT[p];
        if (o === t) { if (o !== undefined) result[p] = o; continue; }
        if (o === b) { if (t !== undefined) result[p] = t; continue; }
        if (t === b) { if (o !== undefined) result[p] = o; continue; }
        // both changed differently -> try line merge, else conflict markers
        const merged = mergeText(b || '', o || '', t || '', name);
        result[p] = merged.text;
        if (merged.conflict) conflictsList.push(p);
      }
      writeTree(vfs, repo, result, oursT, ctx.user);
      const mmsg = msg || (fromPull ? `Merge branch '${db.head}' of ${db.remotes.origin ? db.remotes.origin.replace(/\.git$/, '') : name}` : `Merge branch '${name}'` + (db.head !== 'main' && db.head !== 'master' ? ` into ${db.head}` : ''));
      paths.forEach((p) => { if (!conflictsList.includes(p)) { if (p in result) db.index[p] = result[p]; else delete db.index[p]; } });
      const autoMerged = paths.filter((p) => oursT[p] !== theirsT[p] && oursT[p] !== baseT[p] && theirsT[p] !== baseT[p]);
      autoMerged.forEach((p) => outln(`Auto-merging ${p}`));
      if (conflictsList.length) {
        db.merge = { theirs, conflicts: conflictsList, msg: mmsg, resolved: [] };
        conflictsList.forEach((p) => outln(`CONFLICT (content): Merge conflict in ${p}`));
        outln('Automatic merge failed; fix conflicts and then commit the result.');
        save();
        return 1;
      }
      const id = makeCommit(result, [ours, theirs], mmsg);
      const st = diffStat(oursT, result);
      outln(`Merge made by the 'ort' strategy.`);
      const w = Math.max(...st.files.map((f) => f.p.length), 1);
      st.files.forEach((f) => outln(` ${f.p.padEnd(w)} | ${String(f.ins + f.del).padStart(2)} ${col(C.green, '+'.repeat(Math.min(f.ins, 40)))}${col(C.red, '-'.repeat(Math.min(f.del, 40)))}`));
      if (st.files.length) outln(statSummary(st));
      void id;
      return 0;
    }
    function mergeText(base, ours, theirs, name) {
      const B = TX.splitLines(base), O = TX.splitLines(ours), T = TX.splitLines(theirs);
      // simple approach: if one side only appended/changed a disjoint region, combine via diff3-lite; else conflict whole block
      const dO = TX.diffLines(B, O), dT = TX.diffLines(B, T);
      const changedO = new Set(), changedT = new Set();
      let bi = 0; dO.forEach((x) => { if (x.op === ' ') bi++; else if (x.op === '-') changedO.add(bi++); else changedO.add(bi - 0.5); });
      bi = 0; dT.forEach((x) => { if (x.op === ' ') bi++; else if (x.op === '-') changedT.add(bi++); else changedT.add(bi - 0.5); });
      const overlap = [...changedO].some((k) => [...changedT].some((j) => Math.abs(k - j) <= 1));
      if (!overlap) {
        // apply theirs' hunks onto ours by replaying: rebuild from base with both edits
        const out = [];
        const addsO = {}, addsT = {}, delO = new Set(), delT = new Set();
        bi = 0; dO.forEach((x) => { if (x.op === ' ') bi++; else if (x.op === '-') delO.add(bi++); else (addsO[bi] = addsO[bi] || []).push(x.line); });
        bi = 0; dT.forEach((x) => { if (x.op === ' ') bi++; else if (x.op === '-') delT.add(bi++); else (addsT[bi] = addsT[bi] || []).push(x.line); });
        for (let i = 0; i <= B.length; i++) {
          (addsO[i] || []).forEach((l) => out.push(l));
          (addsT[i] || []).forEach((l) => out.push(l));
          if (i < B.length && !delO.has(i) && !delT.has(i)) out.push(B[i]);
        }
        return { text: out.join('\n') + (out.length ? '\n' : ''), conflict: false };
      }
      // conflict: common prefix/suffix + marked middle
      let pre = 0; while (pre < O.length && pre < T.length && O[pre] === T[pre]) pre++;
      let suf = 0; while (suf < O.length - pre && suf < T.length - pre && O[O.length - 1 - suf] === T[T.length - 1 - suf]) suf++;
      const lines = O.slice(0, pre).concat(['<<<<<<< HEAD'], O.slice(pre, O.length - suf), ['======='], T.slice(pre, T.length - suf), ['>>>>>>> ' + name], O.slice(O.length - suf));
      return { text: lines.join('\n') + '\n', conflict: true };
    }
    // eslint-disable-next-line no-unreachable
    return 0;

    // ---------------- commands that do not need an existing repo
    function config() {
      const isGlobal = rest.includes('--global') || rest.includes('--system');
      const list = rest.includes('--list') || rest.includes('-l');
      const unset = rest.includes('--unset');
      const pos = rest.filter((a) => !a.startsWith('--') && a !== '-l');
      const repo2 = findRepo(vfs, ctx.cwd);
      if (list) {
        const g = gconf();
        const l = Object.keys(g).map((k) => `${k}=${g[k]}`);
        if (repo2 && !isGlobal) { l.push('core.repositoryformatversion=0', 'core.filemode=true', 'core.bare=false'); Object.keys(repo2.db.remotes || {}).forEach((r) => l.push(`remote.${r}.url=${repo2.db.remotes[r]}`, `remote.${r}.fetch=+refs/heads/*:refs/remotes/${r}/*`)); Object.keys(repo2.db.config || {}).forEach((k) => l.push(`${k}=${repo2.db.config[k]}`)); }
        outln(l.join('\n'));
        return 0;
      }
      const key = (pos[0] || '').toLowerCase();
      if (!key) { err('usage: git config [<options>]'); return 129; }
      if (pos.length === 1 && !unset) {
        const v = (repo2 && !isGlobal && repo2.db.config && repo2.db.config[key]) || gconf()[key];
        if (v === undefined) return 1;
        outln(v);
        return 0;
      }
      if (isGlobal || !repo2) {
        if (!isGlobal && !repo2) { err('fatal: not in a git directory'); return 128; }
        const g = gconf();
        if (unset) delete g[key]; else g[key] = pos.slice(1).join(' ');
        vfs.writeFile(globalPath, writeIni(g), { owner: ctx.user });
      } else {
        repo2.db.config = repo2.db.config || {};
        if (unset) delete repo2.db.config[key]; else repo2.db.config[key] = pos.slice(1).join(' ');
        vfs.changed();
      }
      return 0;
    }
    function init() {
      const dir = rest.find((a) => !a.startsWith('-'));
      const target = dir ? ctx.resolve(dir) : ctx.cwd;
      try { vfs.mkdir(target, { parents: true, user: ctx.user, owner: ctx.user }); } catch (e) { if (e.code !== 'EEXIST') { err(`fatal: cannot mkdir ${dir}: ${TX.FS_MSG[e.code]}`); return 128; } }
      const existing = vfs.get(target.concat('.git'));
      const branch = (rest.find((a) => a.startsWith('--initial-branch=')) || '').split('=')[1] || (rest.includes('-b') ? rest[rest.indexOf('-b') + 1] : null) || gconf()['init.defaultbranch'] || 'main';
      if (existing && existing.gitdb) { outln(`Reinitialized existing Git repository in ${ctx.fmt(target.concat('.git'))}${isWin ? '' : '/'}`); return 0; }
      try { vfs.mkdir(target.concat('.git'), { user: ctx.user, owner: ctx.user }); } catch (e) { err(`fatal: ${TX.FS_MSG[e.code] || e.message}`); return 128; }
      const g = vfs.get(target.concat('.git'));
      g.gitdb = { head: branch, refs: {}, objects: {}, index: {}, remotes: {}, remoteRefs: {}, tags: {}, stash: [], upstream: {} };
      if (isWin) g.hid = true;
      vfs.writeFile(target.concat('.git', 'HEAD'), `ref: refs/heads/${branch}\n`, { owner: ctx.user });
      vfs.writeFile(target.concat('.git', 'config'), '[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n', { owner: ctx.user });
      vfs.writeFile(target.concat('.git', 'description'), "Unnamed repository; edit this file 'description' to name the repository.\n", { owner: ctx.user });
      ['objects', 'refs', 'hooks', 'info'].forEach((d) => vfs.mkdir(target.concat('.git', d), { owner: ctx.user }));
      vfs.mkdir(target.concat('.git', 'refs', 'heads'), { owner: ctx.user });
      outln(`Initialized empty Git repository in ${ctx.fmt(target.concat('.git'))}${isWin && ctx.shellKind !== 'posix' ? '\\' : '/'}`);
      return 0;
    }
    async function clone() {
      const pos = rest.filter((a) => !a.startsWith('-'));
      const url = pos[0];
      if (!url) { err('fatal: You must specify a repository to clone.\n\nusage: git clone [<options>] [--] <repo> [<dir>]'); return 129; }
      const name = pos[1] || url.replace(/\.git$/, '').replace(/\/+$/, '').split(/[/:]/).pop();
      const target = ctx.resolve(name);
      const ex = vfs.get(target);
      if (ex && (ex.t !== 'd' || Object.keys(ex.ch).length)) { err(`fatal: destination path '${name}' already exists and is not an empty directory.`); return 128; }
      const host = url.replace(/^https?:\/\//, '').replace(/^git@/, '').split(/[/:]/)[0];
      if (!/^\/|^\.|^[A-Z]:/.test(url) && !TX.resolve(host)) { err(`Cloning into '${name}'...\nfatal: unable to access '${url}/': Could not resolve host: ${host}`); return 128; }
      const rdb = remoteSeed(url);
      if (!rdb) { err(`Cloning into '${name}'...\nremote: Repository not found.\nfatal: repository '${url}/' not found`); return 128; }
      err(`Cloning into '${name}'...`);
      const n = Object.keys(rdb.objects).length * 3;
      if (ctx.sleep) await ctx.sleep(400);
      err(`remote: Enumerating objects: ${n}, done.\nremote: Counting objects: 100% (${n}/${n}), done.\nremote: Compressing objects: 100% (${Math.ceil(n * 0.6)}/${Math.ceil(n * 0.6)}), done.\nremote: Total ${n} (delta ${Math.floor(n / 4)}), reused ${n - 2} (delta ${Math.floor(n / 6)}), pack-reused 0 (from 0)`);
      if (ctx.sleep) await ctx.sleep(300);
      err(`Receiving objects: 100% (${n}/${n}), ${(n * 0.21).toFixed(2)} KiB | ${TX.randInt(2, 9)}.${TX.randInt(10, 99)} MiB/s, done.\nResolving deltas: 100% (${Math.floor(n / 4)}/${Math.floor(n / 4)}), done.`);
      vfs.mkdir(target, { parents: true, user: ctx.user, owner: ctx.user });
      vfs.mkdir(target.concat('.git'), { owner: ctx.user });
      const g = vfs.get(target.concat('.git'));
      const db = { head: 'main', refs: {}, objects: JSON.parse(JSON.stringify(rdb.objects)), index: {}, remotes: { origin: url }, remoteRefs: {}, tags: {}, stash: [], upstream: { main: 'origin/main' } };
      Object.keys(rdb.refs).forEach((b) => { db.remoteRefs['origin/' + b] = rdb.refs[b]; });
      db.refs.main = rdb.refs.main;
      g.gitdb = db;
      if (isWin) g.hid = true;
      vfs.writeFile(target.concat('.git', 'HEAD'), 'ref: refs/heads/main\n', { owner: ctx.user });
      vfs.writeFile(target.concat('.git', 'config'), `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n`, { owner: ctx.user });
      const tree = db.objects[db.refs.main].tree;
      writeTree(vfs, { root: target }, tree, {}, ctx.user);
      db.index = Object.assign({}, tree);
      vfs.changed();
      return 0;
    }
  }

  // seed a repository in the VFS (used for the pre-made practice project)
  function seedRepo(vfs, segs, owner, url) {
    const rdb = remoteSeed(url);
    const g = vfs.get(segs.concat('.git')) || vfs.mkdir(segs.concat('.git'), { owner });
    const db = { head: 'main', refs: { main: rdb.refs.main }, objects: JSON.parse(JSON.stringify(rdb.objects)), index: {}, remotes: { origin: url }, remoteRefs: { 'origin/main': rdb.refs.main }, tags: {}, stash: [], upstream: { main: 'origin/main' } };
    // feature branch for merge practice
    const tip = db.objects[db.refs.main];
    const featTree = Object.assign({}, tip.tree, { 'style.css': 'body {\n  font-family: sans-serif;\n  background: #1e1e2e;\n  color: #cdd6f4;\n}\n' });
    const fobj = { tree: featTree, parents: [db.refs.main], msg: 'Add dark mode colors', author: 'Jordan', email: 'jordan@school.edu', time: Date.now() - 86400000 * 3 };
    const fid = TX.sha1(JSON.stringify(fobj));
    db.objects[fid] = fobj;
    db.refs['feature/dark-mode'] = fid;
    db.index = Object.assign({}, tip.tree);
    g.gitdb = db;
    if (vfs.ci) g.hid = true;
    vfs.writeFile(segs.concat('.git', 'HEAD'), 'ref: refs/heads/main\n', { owner });
    vfs.writeFile(segs.concat('.git', 'config'), `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n`, { owner });
    writeTree(vfs, { root: segs }, tip.tree, {}, owner);
  }

  TX.git = {
    run: git,
    seedRepo,
    findRepo,
    branchFor(vfs, cwd) {
      const r = findRepo(vfs, cwd);
      if (!r) return null;
      const db = r.db;
      if (db.detached) return short(db.detached) + '...';
      return db.merge ? db.head + '|MERGING' : db.head;
    },
    branches(vfs, cwd) { const r = findRepo(vfs, cwd); return r ? Object.keys(r.db.refs || {}) : []; },
    remotes: REMOTES,
  };
})();
