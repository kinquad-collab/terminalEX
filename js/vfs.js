/* TerminalEX — in-memory virtual filesystem shared by all shells */
(function () {
  'use strict';
  const TX = window.TX;

  class FsError extends Error {
    constructor(code, path) { super(code + ': ' + path); this.code = code; this.path = path; }
  }
  TX.FsError = FsError;

  const now = () => Date.now();

  class VFS {
    constructor(root, opts = {}) {
      this.root = root;
      this.ci = !!opts.ci; // case-insensitive (Windows, macOS)
      this.gens = opts.gens || {}; // dynamic content generators e.g. /proc/cpuinfo
      this.onChange = null;
    }

    static dir(name, extra = {}) { return Object.assign({ t: 'd', name, ch: {}, mode: 0o755, uid: 'root', gid: 'root', mt: now() }, extra); }
    static file(name, content = '', extra = {}) { return Object.assign({ t: 'f', name, c: content, mode: 0o644, uid: 'root', gid: 'root', mt: now() }, extra); }

    key(name) { return this.ci ? name.toLowerCase() : name; }
    child(dir, name) {
      if (!dir || dir.t !== 'd') return null;
      if (!this.ci) return dir.ch[name] || null;
      const k = name.toLowerCase();
      for (const n in dir.ch) if (n.toLowerCase() === k) return dir.ch[n];
      return null;
    }
    childKey(dir, name) {
      if (!this.ci) return dir.ch[name] ? name : null;
      const k = name.toLowerCase();
      for (const n in dir.ch) if (n.toLowerCase() === k) return n;
      return null;
    }

    // Resolve segments to a node. follow: follow final symlink.
    get(segs, follow = true, depth = 0) {
      if (depth > 20) throw new FsError('ELOOP', segs.join('/'));
      let node = this.root;
      for (let i = 0; i < segs.length; i++) {
        if (node.t === 'l') node = this.get(node.tgt, true, depth + 1);
        if (!node || node.t !== 'd') return null;
        node = this.child(node, segs[i]);
        if (!node) return null;
      }
      if (follow && node && node.t === 'l') return this.get(node.tgt, true, depth + 1);
      return node;
    }
    // canonical (real-cased) path of an existing node
    canon(segs) {
      const out = [];
      let node = this.root;
      for (const s of segs) {
        if (!node || node.t !== 'd') return segs.slice();
        const k = this.childKey(node, s);
        if (!k) return out.concat(segs.slice(out.length));
        out.push(k);
        node = node.ch[k];
        if (node.t === 'l') node = this.get(node.tgt);
      }
      return out;
    }
    exists(segs) { return !!this.get(segs); }
    isDir(segs) { const n = this.get(segs); return !!n && n.t === 'd'; }
    isFile(segs) { const n = this.get(segs); return !!n && n.t === 'f'; }
    parent(segs) { return this.get(segs.slice(0, -1)); }

    content(node) {
      if (node.gen && this.gens[node.gen]) return this.gens[node.gen]();
      return node.c || '';
    }
    size(node) {
      if (node.t === 'd') return 4096;
      if (node.t === 'l') return (node.target || '').length;
      if (node.sz != null) return node.sz;
      if (node.gen) return 0;
      return new TextEncoder().encode(node.c || '').length;
    }
    // recursive size of a tree
    du(node) {
      if (!node) return 0;
      if (node.t !== 'd') return this.size(node);
      let s = 4096;
      for (const k in node.ch) s += this.du(node.ch[k]);
      return s;
    }

    checkWrite(segs, user) {
      if (!user || user === 'root' || user === '__admin') return;
      // nearest existing ancestor (the dir we will write into)
      let p = segs.slice(0, -1), n = this.get(p);
      while (!n && p.length) { p = p.slice(0, -1); n = this.get(p); }
      if (!n) return;
      const target = this.get(segs, false);
      const check = (node) => {
        if (!node) return true;
        if (node.uid === user) return true;
        if (node.mode & 0o002) return true;
        if (node.gid === user && (node.mode & 0o020)) return true;
        return false;
      };
      if (!check(n) || (target && target.t === 'f' && target.ro)) throw new FsError('EACCES', segs.join('/'));
    }
    checkRead(node, user) {
      if (!user || user === 'root' || user === '__admin' || !node) return;
      if (node.uid === user) return;
      if (node.mode & 0o004) return;
      if (node.gid === user && (node.mode & 0o040)) return;
      throw new FsError('EACCES', node.name);
    }

    checkTraverse(segs, user) {
      if (!user || user === 'root' || user === '__admin') return;
      let node = this.root;
      for (let i = 0; i < segs.length - 1; i++) {
        node = this.child(node, segs[i]);
        if (node && node.t === 'l') node = this.get(node.tgt);
        if (!node || node.t !== 'd') return;
        if (node.uid === user || (node.mode & 0o001) || (node.gid === user && (node.mode & 0o010))) continue;
        throw new FsError('EACCES', segs.join('/'));
      }
    }
    readFile(segs, opts = {}) {
      this.checkTraverse(segs, opts.user);
      const n = this.get(segs);
      if (!n) throw new FsError('ENOENT', segs.join('/'));
      if (n.t === 'd') throw new FsError('EISDIR', segs.join('/'));
      this.checkRead(n, opts.user);
      return this.content(n);
    }
    writeFile(segs, content, opts = {}) {
      if (!segs.length) throw new FsError('EISDIR', '/');
      this.checkTraverse(segs, opts.user);
      const dir = this.get(segs.slice(0, -1));
      if (!dir) throw new FsError('ENOENT', segs.join('/'));
      if (dir.t !== 'd') throw new FsError('ENOTDIR', segs.join('/'));
      this.checkWrite(segs, opts.user);
      let n = this.get(segs);
      if (n && n.t === 'd') throw new FsError('EISDIR', segs.join('/'));
      if (n && n.gen) throw new FsError('EACCES', segs.join('/'));
      if (n) {
        n.c = opts.append ? this.content(n) + content : content;
        delete n.sz;
        n.mt = now();
      } else {
        const name = segs[segs.length - 1];
        n = VFS.file(name, content, { uid: opts.owner || opts.user || 'root', gid: opts.owner || opts.user || 'root', mode: opts.mode || 0o644 });
        dir.ch[name] = n;
        dir.mt = now();
      }
      this.changed();
      return n;
    }
    touch(segs, opts = {}) {
      const n = this.get(segs);
      if (n) { n.mt = now(); this.changed(); return n; }
      return this.writeFile(segs, '', opts);
    }
    mkdir(segs, opts = {}) {
      let cur = this.root;
      for (let i = 0; i < segs.length; i++) {
        let nx = this.child(cur, segs[i]);
        if (nx && nx.t === 'l') nx = this.get(nx.tgt);
        if (!nx) {
          if (i < segs.length - 1 && !opts.parents) throw new FsError('ENOENT', segs.join('/'));
          this.checkWrite(segs.slice(0, i + 1), opts.user);
          nx = VFS.dir(segs[i], { uid: opts.owner || opts.user || 'root', gid: opts.owner || opts.user || 'root' });
          cur.ch[segs[i]] = nx;
          cur.mt = now();
        } else if (nx.t !== 'd') throw new FsError('ENOTDIR', segs.slice(0, i + 1).join('/'));
        else if (i === segs.length - 1 && !opts.parents) throw new FsError('EEXIST', segs.join('/'));
        cur = nx;
      }
      this.changed();
      return cur;
    }
    remove(segs, opts = {}) {
      const dir = this.get(segs.slice(0, -1));
      const n = this.get(segs, false);
      if (!n || !dir) throw new FsError('ENOENT', segs.join('/'));
      if (n.t === 'd' && !opts.recursive) {
        if (opts.dirOk) { if (Object.keys(n.ch).length) throw new FsError('ENOTEMPTY', segs.join('/')); }
        else throw new FsError('EISDIR', segs.join('/'));
      }
      this.checkWrite(segs, opts.user);
      if (n.ro && !opts.force) throw new FsError('EACCES', segs.join('/'));
      delete dir.ch[this.childKey(dir, segs[segs.length - 1])];
      dir.mt = now();
      this.changed();
    }
    clone(node) { return JSON.parse(JSON.stringify(node)); }
    copy(src, dst, opts = {}) {
      const n = this.get(src);
      if (!n) throw new FsError('ENOENT', src.join('/'));
      if (n.t === 'd' && !opts.recursive) throw new FsError('EISDIR', src.join('/'));
      let target = dst;
      const dn = this.get(dst);
      if (dn && dn.t === 'd') target = dst.concat(n.name);
      const pdir = this.get(target.slice(0, -1));
      if (!pdir || pdir.t !== 'd') throw new FsError('ENOENT', dst.join('/'));
      this.checkWrite(target, opts.user);
      if (this.isSubPath(src, target)) throw new FsError('EINVAL', dst.join('/'));
      const c = this.clone(n);
      c.name = target[target.length - 1];
      const stamp = (x) => { x.mt = now(); if (opts.user && opts.user !== 'root') { x.uid = opts.user; x.gid = opts.user; } if (x.ch) Object.values(x.ch).forEach(stamp); };
      if (!opts.preserve) stamp(c);
      if (n.gen) { c.c = this.content(n); delete c.gen; }
      const existingKey = this.childKey(pdir, c.name);
      if (existingKey) delete pdir.ch[existingKey];
      pdir.ch[c.name] = c;
      this.changed();
      return target;
    }
    move(src, dst, opts = {}) {
      const n = this.get(src, false);
      if (!n) throw new FsError('ENOENT', src.join('/'));
      let target = dst;
      const dn = this.get(dst);
      if (dn && dn.t === 'd' && !this.samePath(src, dst)) target = dst.concat(n.name);
      const pdir = this.get(target.slice(0, -1));
      if (!pdir || pdir.t !== 'd') throw new FsError('ENOENT', dst.join('/'));
      if (this.isSubPath(src, target) && !this.samePath(src, target)) throw new FsError('EINVAL', dst.join('/'));
      this.checkWrite(src, opts.user);
      this.checkWrite(target, opts.user);
      const existing = this.get(target, false);
      if (existing && existing !== n && existing.t === 'd') {
        if (n.t !== 'd') throw new FsError('EISDIR', target.join('/'));
        if (Object.keys(existing.ch).length) throw new FsError('ENOTEMPTY', target.join('/'));
      }
      if (existing && existing !== n && opts.noClobber) throw new FsError('EEXIST', target.join('/'));
      const sdir = this.get(src.slice(0, -1));
      delete sdir.ch[this.childKey(sdir, src[src.length - 1])];
      const ek = this.childKey(pdir, target[target.length - 1]);
      if (ek) delete pdir.ch[ek];
      n.name = target[target.length - 1];
      pdir.ch[n.name] = n;
      sdir.mt = pdir.mt = now();
      this.changed();
      return target;
    }
    symlink(targetStr, targetSegs, linkSegs, opts = {}) {
      const dir = this.get(linkSegs.slice(0, -1));
      if (!dir) throw new FsError('ENOENT', linkSegs.join('/'));
      if (this.get(linkSegs, false)) throw new FsError('EEXIST', linkSegs.join('/'));
      this.checkWrite(linkSegs, opts.user);
      const name = linkSegs[linkSegs.length - 1];
      dir.ch[name] = { t: 'l', name, target: targetStr, tgt: targetSegs, mode: 0o777, uid: opts.user || 'root', gid: opts.user || 'root', mt: now() };
      this.changed();
    }
    list(segs) {
      const n = this.get(segs);
      if (!n) throw new FsError('ENOENT', segs.join('/'));
      if (n.t !== 'd') return [n];
      return Object.values(n.ch).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    }
    samePath(a, b) { return a.length === b.length && a.every((s, i) => this.key(s) === this.key(b[i])); }
    isSubPath(parent, p) { return p.length >= parent.length && parent.every((s, i) => this.key(s) === this.key(p[i])); }

    // walk tree: cb(node, segs)
    walk(segs, cb, maxDepth = 64) {
      const n = this.get(segs);
      if (!n) return;
      const rec = (node, path, d) => {
        if (cb(node, path) === false) return;
        if (node.t === 'd' && d < maxDepth) {
          Object.values(node.ch).sort((a, b) => a.name.localeCompare(b.name)).forEach((c) => rec(c, path.concat(c.name), d + 1));
        }
      };
      rec(n, segs, 0);
    }

    // glob expansion of a single pattern given as segment list (segments may contain wildcards)
    glob(baseSegs, patSegs, showHidden) {
      let results = [baseSegs];
      for (const p of patSegs) {
        const next = [];
        for (const r of results) {
          if (p === '.' ) { next.push(r); continue; }
          if (p === '..') { next.push(r.slice(0, -1)); continue; }
          if (!TX.hasGlob(p)) { if (this.get(r.concat(p), false)) next.push(r.concat(this.childKey(this.get(r), p) || p)); continue; }
          const n = this.get(r);
          if (!n || n.t !== 'd') continue;
          const re = TX.globToRegex(p, this.ci);
          Object.keys(n.ch).sort().forEach((name) => {
            if (name[0] === '.' && p[0] !== '.' && !showHidden) return;
            if (re.test(name)) next.push(r.concat(name));
          });
        }
        results = next;
      }
      return results;
    }

    changed() { if (this.onChange) this.onChange(); }
    serialize() { return JSON.stringify(this.root); }
  }
  TX.VFS = VFS;

  // --------------------------------------------------------------- tree builder
  // spec: string => file, object => dir, {$file, $mode, $uid, $size, $link, $hidden, $gen}
  let clock = Date.now() - 1000 * 60 * 60 * 24 * 40;
  TX.build = (spec, name = '', defaults = {}) => {
    const own = defaults.uid || 'root';
    const tick = () => { clock += Math.floor(Math.random() * 1000 * 60 * 60 * 9); if (clock > Date.now() - 60000) clock = Date.now() - 1000 * 60 * 60 * 24 * 30; return clock; };
    if (typeof spec === 'string') return { t: 'f', name, c: spec, mode: defaults.fmode || 0o644, uid: own, gid: defaults.gid || own, mt: tick() };
    if (spec.$link) return { t: 'l', name, target: spec.$link, tgt: spec.$tgt, mode: 0o777, uid: own, gid: own, mt: tick() };
    if (spec.$file !== undefined || spec.$size !== undefined || spec.$gen) {
      const n = { t: 'f', name, c: spec.$file || '', mode: spec.$mode || defaults.fmode || 0o644, uid: spec.$uid || own, gid: spec.$gid || spec.$uid || defaults.gid || own, mt: spec.$mt || tick() };
      if (spec.$size !== undefined) n.sz = spec.$size;
      if (spec.$gen) n.gen = spec.$gen;
      if (spec.$hidden) n.hid = true;
      if (spec.$sys) n.sys = true;
      if (spec.$ro) n.ro = true;
      return n;
    }
    const uid = spec.$uid || own;
    const d = { t: 'd', name, ch: {}, mode: spec.$mode || 0o755, uid, gid: spec.$gid || uid, mt: 0 };
    if (spec.$hidden) d.hid = true;
    if (spec.$sys) d.sys = true;
    const childDefaults = Object.assign({}, defaults, { uid, gid: spec.$gid || uid });
    if (spec.$fmode) childDefaults.fmode = spec.$fmode;
    for (const k of Object.keys(spec)) {
      if (k[0] === '$') continue;
      d.ch[k] = TX.build(spec[k], k, childDefaults);
    }
    d.mt = tick();
    return d;
  };

  // --------------------------------------------------------------- path styles
  function normalize(segs) {
    const out = [];
    for (const s of segs) {
      if (s === '' || s === '.') continue;
      if (s === '..') { out.pop(); continue; }
      out.push(s);
    }
    return out;
  }
  TX.normalize = normalize;

  TX.Paths = {
    posix: {
      sep: '/',
      parse(str, cwd, home) {
        str = String(str);
        if (str === '~' || str.startsWith('~/')) return normalize(home.concat(str.slice(1).split('/')));
        if (str.startsWith('/')) return normalize(str.split('/'));
        return normalize(cwd.concat(str.split('/')));
      },
      format(segs) { return '/' + segs.join('/'); },
      pretty(segs, home) {
        const f = '/' + segs.join('/'), h = '/' + home.join('/');
        if (f === h) return '~';
        if (f.startsWith(h + '/')) return '~' + f.slice(h.length);
        return f;
      },
    },
    win: {
      sep: '\\',
      parse(str, cwd, home) {
        str = String(str).replace(/\//g, '\\');
        if (str === '~' || str.startsWith('~\\')) return normalize(home.concat(str.slice(1).split('\\')));
        const m = /^([a-zA-Z]):(.*)$/.exec(str);
        if (m) {
          const drive = m[1].toUpperCase() + ':';
          let rest = m[2];
          if (rest.startsWith('\\')) return [drive].concat(normalize(rest.split('\\')));
          const base = cwd[0] && cwd[0].toUpperCase() === drive ? cwd.slice(1) : [];
          return [drive].concat(normalize(base.concat(rest.split('\\'))));
        }
        if (str.startsWith('\\')) return [cwd[0] || 'C:'].concat(normalize(str.split('\\')));
        const r = normalize(cwd.concat(str.split('\\')));
        if (!r.length) return [cwd[0] || 'C:'];
        return [cwd[0]].concat(normalize(cwd.slice(1).concat(str.split('\\'))));
      },
      format(segs) { if (!segs.length) return 'C:\\'; return segs.length === 1 ? segs[0] + '\\' : segs.join('\\'); },
      pretty(segs) { return TX.Paths.win.format(segs); },
    },
    gitbash: {
      sep: '/',
      gitRoot: ['C:', 'Program Files', 'Git'],
      parse(str, cwd, home) {
        str = String(str);
        if (/^[a-zA-Z]:[\\/]/.test(str) || /^[a-zA-Z]:$/.test(str)) return TX.Paths.win.parse(str, cwd, home);
        if (str === '~' || str.startsWith('~/')) return normalize(home.concat(str.slice(1).split('/')));
        if (str.startsWith('/')) {
          const parts = str.split('/').filter((x) => x !== '');
          if (parts.length && /^[a-zA-Z]$/.test(parts[0])) return [parts[0].toUpperCase() + ':'].concat(normalize(parts.slice(1)));
          if (parts[0] === 'tmp') return normalize(home.concat(['AppData', 'Local', 'Temp']).concat(parts.slice(1)));
          return normalize(this.gitRoot.concat(parts));
        }
        const r = normalize(cwd.concat(str.split('/')));
        return r.length ? r : [cwd[0]];
      },
      format(segs) {
        const g = this.gitRoot;
        if (segs.length >= g.length && g.every((s, i) => s.toLowerCase() === (segs[i] || '').toLowerCase())) return '/' + segs.slice(g.length).join('/');
        if (!segs.length) return '/';
        return '/' + segs[0][0].toLowerCase() + (segs.length > 1 ? '/' + segs.slice(1).join('/') : '');
      },
      pretty(segs, home) {
        const f = this.format(segs), h = this.format(home);
        if (f === h) return '~';
        if (f.toLowerCase().startsWith(h.toLowerCase() + '/')) return '~' + f.slice(h.length);
        return f;
      },
    },
  };
})();
