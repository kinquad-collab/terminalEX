/* TerminalEX — PowerShell cmdlets, aliases, views, static .NET members, and the PowerShell shell */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const W = TX.Paths.win;
  const { PSHash, PSScriptBlock, PSError } = TX;
  const toStr = (v, rt) => TX.psStr(v, rt);
  const toNum = (v, s) => TX.psNum(v, s);
  const unroll = (v) => TX.psUnroll(v);
  const collapse = (a) => TX.psCollapse(a);
  const getM = (o, n, rt) => TX.psGetMember(o, n, rt);
  const truthy = (v) => TX.psTruthy(v);
  const VIEWS = TX.PS_VIEWS;

  const CMDLETS = (TX.psCmdlets = {});
  const ALIASES = (TX.psAliases = {});
  TX.psAliasesRemoved7 = ['curl', 'wget', 'sc', 'diff', 'sort', 'kill'].filter((x) => x !== 'kill' && x !== 'sort' && x !== 'diff');
  function cmdlet(name, aliases, params, fn, extra = {}) {
    const def = Object.assign({ name, params, fn }, extra);
    CMDLETS[name.toLowerCase()] = def;
    (aliases || []).forEach((a) => { ALIASES[a.toLowerCase()] = name; });
    return def;
  }
  const P = (pos, extra) => Object.assign({ pos }, extra || {});
  const SW = { sw: true };

  // ============================================================ file system objects
  function modeStr(n, pwsh) {
    const d = n.t === 'd' ? 'd' : n.t === 'l' ? 'l' : '-';
    const a = n.t === 'f' && n.arch !== false ? 'a' : '-';
    const r = n.ro ? 'r' : '-';
    const h = n.hid ? 'h' : '-';
    const s = n.sys ? 's' : '-';
    return pwsh ? d + a + r + h + s : d + a + r + h + s + '-';
  }
  function fileItem(sh, segs, node) {
    const vfs = sh.vfs;
    const isDir = node.t === 'd';
    const full = W.format(segs);
    const name = segs.length === 1 ? segs[0] + '\\' : segs[segs.length - 1];
    const ext = !isDir && name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const o = {
      __type: isDir ? 'System.IO.DirectoryInfo' : 'System.IO.FileInfo', __segs: segs, __node: node, __sh: sh,
      Mode: modeStr(node, sh.pwsh), LastWriteTime: new Date(node.mt),
    };
    if (!isDir) o.Length = vfs.size(node);
    Object.assign(o, {
      Name: name, FullName: full, Extension: ext, BaseName: isDir ? name : name.slice(0, name.length - ext.length),
      CreationTime: new Date(node.mt - 86400000 * 3), LastAccessTime: new Date(Math.max(node.mt, Date.now() - 3600000)),
      Attributes: [node.t === 'd' ? 'Directory' : 'Archive', node.hid ? 'Hidden' : null, node.sys ? 'System' : null, node.ro ? 'ReadOnly' : null].filter(Boolean).join(', '),
      PSIsContainer: isDir, Exists: true,
    });
    if (isDir) { o.Parent = segs.length > 1 ? segs[segs.length - 2] : null; o.Root = segs[0] + '\\'; }
    else { o.DirectoryName = W.format(segs.slice(0, -1)); o.Directory = W.format(segs.slice(0, -1)); o.IsReadOnly = !!node.ro; }
    o.PSPath = 'Microsoft.PowerShell.Core\\FileSystem::' + full;
    o.PSParentPath = 'Microsoft.PowerShell.Core\\FileSystem::' + W.format(segs.slice(0, -1));
    o.PSChildName = name;
    o.PSDrive = segs[0][0];
    o.__onSet = (k, v) => { if (k === 'IsReadOnly') { node.ro = truthy(v); vfs.changed(); } if (k === 'LastWriteTime' && v instanceof Date) { node.mt = v.getTime(); vfs.changed(); } };
    o.__methods = {
      Delete() { vfs.remove(segs, { recursive: true, user: sh.fsUser() }); },
      OpenText() { return vfs.content(node); },
      ReadAllText() { return vfs.content(node); },
      CopyTo(dst) { vfs.copy(segs, sh.resolve(toStr(dst)), { user: sh.fsUser() }); return null; },
      GetFiles() { return Object.values(node.ch || {}).filter((k) => k.t === 'f').map((k) => fileItem(sh, segs.concat(k.name), k)); },
      GetDirectories() { return Object.values(node.ch || {}).filter((k) => k.t === 'd').map((k) => fileItem(sh, segs.concat(k.name), k)); },
      Refresh() {},
    };
    o.__toString = () => (sh.pwsh ? full : name);
    return o;
  }
  TX.psFileItem = fileItem;
  const pwshName = (o, rt) => {
    const n = o.__node;
    if (!rt.pwsh || !n) return null;
    if (n.t === 'd') return '\x1b[44;1m';
    if (n.t === 'l') return '\x1b[36;1m';
    if (/\.(exe|bat|cmd|com)$/i.test(o.Name)) return '\x1b[32;1m';
    if (/\.(zip|tgz|gz|tar|nupkg|cab|7z)$/i.test(o.Name)) return '\x1b[31;1m';
    if (/\.(ps1|psd1|psm1|ps1xml)$/i.test(o.Name)) return '\x1b[33;1m';
    return null;
  };
  function fileTimeStr(d, pwsh) {
    const h = d.getHours() % 12 || 12, ap = d.getHours() >= 12 ? 'PM' : 'AM';
    const date = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
    return pwsh ? date + ' ' + String(h).padStart(2) + ':' + TX.p2(d.getMinutes()) + ' ' + ap : date + '  ' + String(h).padStart(2) + ':' + TX.p2(d.getMinutes()) + ' ' + ap;
  }
  const FILE_VIEW = {
    custom(items, rt) {
      const parts = [];
      let cur = null, bucket = [];
      const hdr = (s) => (rt.pwsh ? '\x1b[32;1m' + s + '\x1b[0m' : s);
      const flush = () => {
        if (!bucket.length) return;
        const lines = [(rt.pwsh ? '    \x1b[32;1mDirectory: \x1b[0m' : '    Directory: ') + cur, '', hdr('Mode                 LastWriteTime         Length Name'), hdr('----                 -------------         ------ ----')];
        bucket.forEach((o) => {
          const m = o.Mode;
          const t = fileTimeStr(o.LastWriteTime, rt.pwsh);
          const len = o.Length === undefined ? '' : String(o.Length);
          const color = pwshName(o, rt);
          let name = o.Name;
          if (o.__node && o.__node.t === 'l') name += ' -> ' + o.__node.target;
          lines.push(m.padEnd(rt.pwsh ? 5 : 6) + t.padStart(rt.pwsh ? 29 : 28) + ' ' + len.padStart(14) + ' ' + (color ? color + name + '\x1b[0m' : name));
        });
        parts.push(lines.join('\n'));
        bucket = [];
      };
      items.forEach((o) => { const parent = o.__segs ? W.format(o.__segs.slice(0, -1)) : ''; if (parent !== cur) { flush(); cur = parent; } bucket.push(o); });
      flush();
      return parts.join('\n\n');
    },
    list: ['Name', 'Length', 'CreationTime', 'LastWriteTime', 'LastAccessTime', 'Mode', 'Attributes', 'FullName'],
  };
  VIEWS['System.IO.FileInfo'] = FILE_VIEW;
  VIEWS['System.IO.DirectoryInfo'] = FILE_VIEW;

  // ============================================================ path helpers
  function resolveItems(sh, path, ctx, opts = {}) {
    // returns [{segs,node}] ; supports wildcards in last segment
    path = toStr(path);
    const segs = sh.resolve(path);
    const last = segs[segs.length - 1] || '';
    if (TX.hasGlob(last) && !opts.literal) {
      const hits = sh.vfs.glob(segs.slice(0, -1), [last], true).map((s) => ({ segs: s, node: sh.vfs.get(s) })).filter((x) => opts.force || !x.node.hid);
      if (!hits.length && !opts.quietEmpty) { /* no error for empty wildcard matches */ }
      return hits;
    }
    const node = sh.vfs.get(segs);
    if (!node) { if (ctx) ctx.error(`Cannot find path '${W.format(segs)}' because it does not exist.`, { category: 'ObjectNotFound', id: 'PathNotFound', target: W.format(segs) }); return []; }
    return [{ segs: sh.vfs.canon(segs), node }];
  }
  const inputPaths = (input) => (input || []).map((x) => (x && typeof x === 'object' && x.FullName ? x.FullName : x && x.Path ? x.Path : toStr(x)));

  // ============================================================ Location / navigation
  cmdlet('Get-Location', ['pwd', 'gl'], {}, async (p, input, ctx) => [ctx.rt.shell.pathInfo()]);
  VIEWS['System.Management.Automation.PathInfo'] = { table: [{ label: 'Path', name: 'Path' }] };
  cmdlet('Set-Location', ['cd', 'sl', 'chdir'], { Path: P(0, { alias: ['LiteralPath'] }), PassThru: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    let target = p.Path !== undefined ? toStr(p.Path) : (input && input[0] ? inputPaths(input)[0] : null);
    if (target === null || target === undefined || target === '') target = '~';
    if (target === '-') { if (!sh.prevCwd) return []; target = W.format(sh.prevCwd); }
    if (/^(env|alias|variable|function|hklm|hkcu|cert):\\?$/i.test(target)) { sh.provider = target.replace(/[:\\]/g, '').toLowerCase(); return []; }
    const segs = sh.resolve(target);
    const n = sh.vfs.get(segs);
    if (!n) { ctx.error(`Cannot find path '${W.format(segs)}' because it does not exist.`, { category: 'ObjectNotFound', id: 'PathNotFound', target: W.format(segs) }); return []; }
    if (n.t !== 'd') { ctx.error(`Cannot find path '${W.format(segs)}' because it does not exist.`, { category: 'ObjectNotFound', id: 'PathNotFound' }); return []; }
    sh.prevCwd = sh.cwd;
    sh.cwd = sh.vfs.canon(segs);
    sh.provider = null;
    return p.PassThru ? [sh.pathInfo()] : [];
  });
  cmdlet('cd..', [], {}, async (p, input, ctx) => CMDLETS['set-location'].fn({ Path: '..' }, null, ctx), { kind: 'Function' });
  cmdlet('cd\\', [], {}, async (p, input, ctx) => CMDLETS['set-location'].fn({ Path: '\\' }, null, ctx), { kind: 'Function' });
  cmdlet('Push-Location', ['pushd'], { Path: P(0) }, async (p, input, ctx) => { const sh = ctx.rt.shell; sh.stack = sh.stack || []; sh.stack.push(sh.cwd.slice()); if (p.Path !== undefined) return CMDLETS['set-location'].fn({ Path: p.Path }, null, ctx); return []; });
  cmdlet('Pop-Location', ['popd'], {}, async (p, input, ctx) => { const sh = ctx.rt.shell; const d = (sh.stack || []).pop(); if (d) sh.cwd = d; return []; });

  // ============================================================ Get-ChildItem
  cmdlet('Get-ChildItem', ['gci', 'ls', 'dir'], { Path: P(0, { alias: ['LiteralPath', 'PSPath'] }), Filter: P(1), Recurse: SW, Force: SW, File: SW, Directory: SW, Name: SW, Include: {}, Exclude: {}, Depth: {}, Hidden: SW, ReadOnly: SW, System: SW, Attributes: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path).map((x) => toStr(x)) : input && input.length ? inputPaths(input) : [null];
    const out = [];
    for (const path of paths) {
      const prov = /^(env|alias|variable|function):\\?(.*)$/i.exec(path || (sh.provider ? sh.provider + ':' : ''));
      if (prov) { out.push(...providerItems(ctx.rt, prov[1].toLowerCase(), prov[2])); continue; }
      if (/^hk(lm|cu):/i.test(path || '')) { out.push(...registryItems(path)); continue; }
      const items = resolveItems(sh, path === null ? '.' : path, ctx, { force: p.Force || p.Hidden });
      const filterRe = p.Filter ? TX.likeToRegex(toStr(p.Filter)) : null;
      const incl = p.Include ? unroll(p.Include).map((x) => TX.likeToRegex(toStr(x))) : null;
      const excl = p.Exclude ? unroll(p.Exclude).map((x) => TX.likeToRegex(toStr(x))) : null;
      const maxDepth = p.Depth !== undefined ? toNum(p.Depth) : p.Recurse ? Infinity : 0;
      const keep = (n) => {
        if (n.hid && !p.Force && !p.Hidden) return false;
        if (p.Hidden && !n.hid) return false;
        if (p.File && n.t !== 'f') return false;
        if (p.Directory && n.t !== 'd') return false;
        if (filterRe && !filterRe.test(n.name)) return false;
        if (incl && !incl.some((r) => r.test(n.name))) return false;
        if (excl && excl.some((r) => r.test(n.name))) return false;
        return true;
      };
      for (const { segs, node } of items) {
        if (node.t !== 'd' || (TX.hasGlob((path || '').split(/[\\/]/).pop() || '') && !p.Recurse)) {
          if (keep(node) || node.t === 'd') out.push(p.Name ? node.name : fileItem(sh, segs, node));
          continue;
        }
        if (node.uid === 'SYSTEM' && /config|System Volume/i.test(node.name) && !sh.isAdmin) { ctx.error(`Access to the path '${W.format(segs)}' is denied.`, { category: 'PermissionDenied', id: 'DirUnauthorizedAccessError' }); continue; }
        const walk = (n, s, depth, rel) => {
          const kids = Object.values(n.ch).sort((a, b) => (a.t === 'd' ? 0 : 1) - (b.t === 'd' ? 0 : 1) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
          kids.forEach((k) => { if (keep(k)) out.push(p.Name ? (rel ? rel + '\\' : '') + k.name : fileItem(sh, s.concat(k.name), k)); });
          if (depth < maxDepth) kids.filter((k) => k.t === 'd' && (!k.hid || p.Force)).forEach((k) => walk(k, s.concat(k.name), depth + 1, (rel ? rel + '\\' : '') + k.name));
        };
        walk(node, segs, 0, '');
      }
    }
    return out;
  });
  function providerItems(rt, prov, filter) {
    const re = filter ? TX.likeToRegex(filter) : null;
    let rows = [];
    if (prov === 'env') rows = Object.keys(rt.shell.env).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).map((k) => ({ __type: 'System.Collections.DictionaryEntry', Name: k, Value: rt.shell.env[k], Key: k }));
    if (prov === 'alias') return Object.keys(ALIASES).concat([...rt.aliases.keys()]).sort().filter((k) => !re || re.test(k)).map((k) => aliasInfo(k, rt.aliases.get(k) || ALIASES[k]));
    if (prov === 'variable') rows = rt.allVars().map((v) => ({ __type: 'System.Management.Automation.PSVariable', Name: v.name, Value: v.value })).sort((a, b) => a.Name.localeCompare(b.Name));
    if (prov === 'function') rows = [...rt.functions.values()].map((f) => ({ __type: 'System.Management.Automation.FunctionInfo', CommandType: 'Function', Name: f.name, Version: '', Source: '' }));
    return rows.filter((r) => !re || re.test(r.Name));
  }
  VIEWS['System.Collections.DictionaryEntry'] = { table: [{ label: 'Name', name: 'Name' }, { label: 'Value', name: 'Value' }] };
  VIEWS['System.Management.Automation.PSVariable'] = { table: [{ label: 'Name', name: 'Name' }, { label: 'Value', name: 'Value' }] };
  function registryItems(path) {
    if (/currentversion/i.test(path)) return [{ __type: 'Registry', ProductName: 'Windows 10 Education', DisplayVersion: '23H2', CurrentBuild: '22631', EditionID: 'Education', RegisteredOwner: 'student', InstallDate: 1785590042 }];
    return [{ __type: 'Microsoft.Win32.RegistryKey', Name: 'SOFTWARE', SubKeyCount: 42, ValueCount: 0 }, { __type: 'Microsoft.Win32.RegistryKey', Name: 'SYSTEM', SubKeyCount: 18, ValueCount: 0 }, { __type: 'Microsoft.Win32.RegistryKey', Name: 'HARDWARE', SubKeyCount: 4, ValueCount: 0 }];
  }

  // ============================================================ items
  cmdlet('Get-Item', ['gi'], { Path: P(0, { alias: ['LiteralPath'] }), Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    const out = [];
    paths.forEach((path) => { const pv = /^env:\\?(.+)$/i.exec(toStr(path)); if (pv) { out.push(...providerItems(ctx.rt, 'env', pv[1])); return; } resolveItems(sh, path, ctx, { force: true }).forEach(({ segs, node }) => out.push(fileItem(sh, segs, node))); });
    return out;
  });
  cmdlet('Get-ItemProperty', ['gp'], { Path: P(0), Name: P(1) }, async (p, input, ctx) => {
    const path = toStr(p.Path);
    if (/^hk/i.test(path)) return registryItems(path);
    const items = await CMDLETS['get-item'].fn({ Path: p.Path }, null, ctx);
    return p.Name ? items.map((o) => getM(o, toStr(p.Name))) : items;
  });
  cmdlet('Test-Path', [], { Path: P(0, { alias: ['LiteralPath'] }), PathType: {}, IsValid: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    return paths.map((path) => {
      const s = toStr(path);
      if (/^env:(.+)$/i.test(s)) { const k = /^env:(.+)$/i.exec(s)[1]; return Object.keys(sh.env).some((x) => x.toLowerCase() === k.toLowerCase()); }
      if (/^variable:(.+)$/i.test(s)) return ctx.rt.hasVar(/^variable:(.+)$/i.exec(s)[1]);
      const segs = sh.resolve(s);
      const n = TX.hasGlob(segs[segs.length - 1]) ? (sh.vfs.glob(segs.slice(0, -1), [segs[segs.length - 1]], true).length ? { t: 'x' } : null) : sh.vfs.get(segs);
      if (!n) return false;
      if (p.PathType) { const t = toStr(p.PathType).toLowerCase(); if (t === 'leaf') return n.t === 'f'; if (t === 'container') return n.t === 'd'; }
      return true;
    });
  });
  cmdlet('New-Item', ['ni'], { Path: P(0), Name: {}, ItemType: { alias: ['Type'] }, Value: P(1), Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const bases = p.Path !== undefined ? unroll(p.Path).map((x) => toStr(x)) : ['.'];
    const out = [];
    for (const b of bases) {
      let segs = sh.resolve(b);
      if (p.Name) segs = segs.concat(toStr(p.Name));
      const type = toStr(p.ItemType || 'File').toLowerCase();
      if (/^(env):(.+)/i.test(b)) { sh.env[/^env:(.+)/i.exec(b)[1]] = toStr(p.Value); continue; }
      if (ctx.whatIf(`Create ${type === 'directory' ? 'Directory' : 'File'}`, `Destination: ${W.format(segs)}`)) continue;
      const exists = sh.vfs.get(segs);
      if (exists && !p.Force) { ctx.error(`An item with the specified name ${W.format(segs)} already exists.`, { category: 'ResourceExists', id: 'DirectoryExist' }); continue; }
      try {
        if (type === 'directory' || type === 'd' || type === 'dir') sh.vfs.mkdir(segs, { parents: true, user: sh.fsUser(), owner: 'student' });
        else if (type === 'symboliclink' || type === 'junction') { const tgt = toStr(p.Value || p.Target); sh.vfs.symlink(tgt, sh.resolve(tgt), segs, {}); }
        else {
          if (!sh.vfs.get(segs.slice(0, -1))) { if (p.Force) sh.vfs.mkdir(segs.slice(0, -1), { parents: true, owner: 'student' }); else { ctx.error(`Could not find a part of the path '${W.format(segs)}'.`, { category: 'WriteError', id: 'NewItemIOError' }); continue; } }
          sh.vfs.writeFile(segs, p.Value !== undefined ? toStr(p.Value, ctx.rt) : '', { user: sh.fsUser(), owner: 'student' });
        }
      } catch (e) { if (e instanceof TX.FsError) { ctx.error(e.code === 'EACCES' ? `Access to the path '${W.format(segs)}' is denied.` : TX.psFsMsg(e), { category: 'PermissionDenied' }); continue; } throw e; }
      out.push(fileItem(sh, segs, sh.vfs.get(segs)));
    }
    return out;
  });
  cmdlet('mkdir', ['md'], { Path: P(0), Force: SW }, async (p, input, ctx) => CMDLETS['new-item'].fn({ Path: p.Path, ItemType: 'Directory', Force: p.Force }, null, ctx), { kind: 'Function' });
  cmdlet('Remove-Item', ['rm', 'del', 'erase', 'rd', 'rmdir', 'ri'], { Path: P(0, { alias: ['LiteralPath'] }), Recurse: SW, Force: SW, Include: {}, Exclude: {}, Filter: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    let yesAll = false;
    for (const path of paths) {
      if (/^env:(.+)$/i.test(toStr(path))) { const k = /^env:(.+)$/i.exec(toStr(path))[1]; const key = Object.keys(sh.env).find((x) => x.toLowerCase() === k.toLowerCase()); if (key) delete sh.env[key]; continue; }
      if (/^variable:(.+)$/i.test(toStr(path))) { ctx.rt.removeVar(/^variable:(.+)$/i.exec(toStr(path))[1]); continue; }
      for (const { segs, node } of resolveItems(sh, path, ctx, { force: p.Force })) {
        if (ctx.whatIf(node.t === 'd' ? 'Remove Directory' : 'Remove File', W.format(segs))) continue;
        if (sh.vfs.isSubPath(segs, sh.cwd)) { ctx.error(`Cannot remove item ${W.format(segs)}: The process cannot access the file '${W.format(segs)}' because it is being used by another process.`, { category: 'WriteError' }); continue; }
        if (node.t === 'd' && Object.keys(node.ch).length && !p.Recurse && !yesAll) {
          ctx.rt.host(`\n${ctx.rt.pwsh ? '\x1b[1m' : ''}Confirm${ctx.rt.pwsh ? '\x1b[0m' : ''}\nThe item at ${W.format(segs)} has children and the Recurse parameter was not specified. If you continue, all children will be removed with the item. Are you sure you want to continue?\n`);
          const ans = await ctx.rt.shell.readLine('[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "Y"): ');
          if (/^[nl]/i.test(ans)) continue;
          if (/^a/i.test(ans)) yesAll = true;
        }
        if ((node.ro || node.hid || node.sys) && !p.Force && node.t === 'f') { ctx.error(`Cannot remove item ${W.format(segs)}: You do not have sufficient access rights to perform this operation.`, { category: 'PermissionDenied', id: 'RemoveFileSystemItemUnAuthorizedAccess' }); continue; }
        try { sh.vfs.remove(segs, { recursive: true, user: sh.fsUser(), force: true }); }
        catch (e) { ctx.error(`Cannot remove item ${W.format(segs)}: Access to the path '${W.format(segs)}' is denied.`, { category: 'PermissionDenied' }); }
      }
    }
    return [];
  });
  cmdlet('Copy-Item', ['copy', 'cp', 'cpi'], { Path: P(0), Destination: P(1), Recurse: SW, Force: SW, PassThru: SW, Filter: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    const dst = sh.resolve(p.Destination !== undefined ? toStr(p.Destination) : '.');
    const out = [];
    for (const path of paths) {
      for (const { segs, node } of resolveItems(sh, path, ctx)) {
        if (ctx.whatIf('Copy File', `Item: ${W.format(segs)} Destination: ${W.format(dst)}`)) continue;
        if (sh.vfs.get(dst) && sh.vfs.get(dst).t === 'f' && !p.Force && sh.vfs.samePath(segs, dst)) { ctx.error(`Cannot overwrite the item ${W.format(segs)} with itself.`, { category: 'WriteError' }); continue; }
        try {
          if (node.t === 'd' && !p.Recurse) { const target = sh.vfs.get(dst) && sh.vfs.get(dst).t === 'd' ? dst.concat(node.name) : dst; sh.vfs.mkdir(target, { parents: true, owner: 'student', user: sh.fsUser() }); }
          else { const t = sh.vfs.copy(segs, dst, { recursive: true, user: sh.fsUser() }); if (p.PassThru) out.push(fileItem(sh, t, sh.vfs.get(t))); }
        } catch (e) { ctx.error(e.code === 'ENOENT' ? `Could not find a part of the path '${W.format(dst)}'.` : TX.psFsMsg(e), { category: 'WriteError' }); }
      }
    }
    return out;
  });
  cmdlet('Move-Item', ['move', 'mv', 'mi'], { Path: P(0), Destination: P(1), Force: SW, PassThru: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    const dst = sh.resolve(p.Destination !== undefined ? toStr(p.Destination) : '.');
    for (const path of paths) for (const { segs } of resolveItems(sh, path, ctx)) {
      if (ctx.whatIf('Move File', `Item: ${W.format(segs)} Destination: ${W.format(dst)}`)) continue;
      if (sh.vfs.get(dst) && sh.vfs.get(dst).t === 'f' && !p.Force) { ctx.error('Cannot create a file when that file already exists.', { category: 'WriteError', id: 'MoveFileInfoItemIOError' }); continue; }
      try { sh.vfs.move(segs, dst, { user: sh.fsUser() }); } catch (e) { ctx.error(TX.psFsMsg(e), { category: 'WriteError' }); }
    }
    return [];
  });
  cmdlet('Rename-Item', ['ren', 'rni'], { Path: P(0), NewName: P(1), Force: SW, PassThru: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const path = p.Path !== undefined ? p.Path : inputPaths(input)[0];
    if (p.NewName === undefined) throw new PSError("Missing an argument for parameter 'NewName'.");
    for (const { segs } of resolveItems(sh, path, ctx)) {
      const nn = toStr(p.NewName);
      if (/[\\/]/.test(nn)) { ctx.error('Cannot rename the specified target, because it represents a path or device name.', { category: 'InvalidArgument' }); continue; }
      const dst = segs.slice(0, -1).concat(nn);
      if (sh.vfs.get(dst) && !sh.vfs.samePath(segs, dst)) { ctx.error('Cannot create a file when that file already exists.', { category: 'WriteError' }); continue; }
      if (ctx.whatIf('Rename File', `Item: ${W.format(segs)} Destination: ${W.format(dst)}`)) continue;
      sh.vfs.move(segs, dst, { user: sh.fsUser() });
      if (p.PassThru) return [fileItem(sh, dst, sh.vfs.get(dst))];
    }
    return [];
  });
  cmdlet('Invoke-Item', ['ii'], { Path: P(0) }, async (p) => { if (TX.app) TX.app.toast(`(pretend) Opened ${toStr(p.Path)} in its default app`); return []; });
  cmdlet('Resolve-Path', ['rvpa'], { Path: P(0), Relative: SW }, async (p, input, ctx) => resolveItems(ctx.rt.shell, p.Path, ctx).map(({ segs }) => (p.Relative ? '.\\' + segs.slice(ctx.rt.shell.cwd.length).join('\\') : Object.assign(ctx.rt.shell.pathInfo(segs)))));
  cmdlet('Split-Path', [], { Path: P(0), Leaf: SW, Parent: SW, Qualifier: SW, NoQualifier: SW, Extension: SW, LeafBase: SW, IsAbsolute: SW }, async (p, input) => {
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    return paths.map((x) => {
      const s = toStr(x).replace(/\//g, '\\');
      const leaf = s.replace(/\\+$/, '').split('\\').pop();
      if (p.Leaf) return leaf;
      if (p.LeafBase) return leaf.replace(/\.[^.]*$/, '');
      if (p.Extension) return /\.[^.]*$/.exec(leaf) ? /\.[^.]*$/.exec(leaf)[0] : '';
      if (p.Qualifier) return /^[a-z]:/i.test(s) ? s.slice(0, 2) : '';
      if (p.NoQualifier) return s.replace(/^[a-z]:/i, '');
      if (p.IsAbsolute) return /^[a-z]:\\|^\\/i.test(s);
      const i = s.replace(/\\+$/, '').lastIndexOf('\\');
      return i < 0 ? '' : i === 2 && /^[a-z]:/i.test(s) ? s.slice(0, 3) : s.slice(0, i);
    });
  });
  cmdlet('Join-Path', [], { Path: P(0), ChildPath: P(1), AdditionalChildPath: {} }, async (p) => unroll(p.Path).map((b) => [toStr(b)].concat(unroll(p.ChildPath).map((x) => toStr(x))).concat(p._rest || []).join('\\').replace(/\\{2,}/g, '\\')), { rest: true });

  // ============================================================ content
  cmdlet('Get-Content', ['gc', 'cat', 'type'], { Path: P(0, { alias: ['LiteralPath', 'PSPath'] }), TotalCount: { alias: ['Head', 'First'] }, Tail: { alias: ['Last'] }, Raw: SW, Encoding: {}, Wait: SW, Delimiter: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const paths = p.Path !== undefined ? unroll(p.Path) : inputPaths(input);
    const out = [];
    for (const path of paths) {
      if (/^env:(.+)$/i.test(toStr(path))) { const k = /^env:(.+)$/i.exec(toStr(path))[1]; out.push(sh.env[Object.keys(sh.env).find((x) => x.toLowerCase() === k.toLowerCase())]); continue; }
      for (const { segs, node } of resolveItems(sh, path, ctx)) {
        if (node.t === 'd') { ctx.error(`Unable to get content because it is a directory: '${W.format(segs)}'. Please use 'Get-ChildItem' instead.`, { category: 'InvalidOperation', id: 'GetContentReaderUnauthorizedAccessError' }); continue; }
        let text = sh.vfs.content(node);
        if (node.sz) text = '\u00ef\u00bb\u00bf\u0000\u0000binary\u0000\u0000...';
        if (p.Raw) { out.push(text); continue; }
        let L = TX.splitLines(text);
        if (p.TotalCount !== undefined) L = L.slice(0, toNum(p.TotalCount));
        if (p.Tail !== undefined) L = L.slice(Math.max(0, L.length - toNum(p.Tail)));
        out.push(...L);
      }
    }
    return out;
  });
  async function writeContent(p, input, ctx, append) {
    const sh = ctx.rt.shell;
    const vals = p.Value !== undefined ? unroll(p.Value) : input || [];
    const text = vals.map((v) => toStr(v, ctx.rt)).join('\n') + (vals.length && !p.NoNewline ? '\n' : '');
    const paths = unroll(p.Path);
    for (const path of paths) {
      const segs = sh.resolve(toStr(path));
      if (ctx.whatIf(append ? 'Add Content' : 'Set Content', `Path: ${W.format(segs)}`)) continue;
      const node = sh.vfs.get(segs);
      if (node && node.t === 'd') { ctx.error(`Access to the path '${W.format(segs)}' is denied.`, { category: 'PermissionDenied' }); continue; }
      if (!sh.vfs.get(segs.slice(0, -1))) { ctx.error(`Could not find a part of the path '${W.format(segs)}'.`, { category: 'ObjectNotFound' }); continue; }
      try {
        let prefix = '';
        if (append && node) { const cur = sh.vfs.content(node); if (cur && !cur.endsWith('\n')) prefix = '\n'; }
        sh.vfs.writeFile(segs, prefix + text, { append, user: sh.fsUser(), owner: 'student' });
      } catch (e) { ctx.error(`Access to the path '${W.format(segs)}' is denied.`, { category: 'PermissionDenied' }); }
    }
    return [];
  }
  cmdlet('Set-Content', [], { Path: P(0), Value: P(1), NoNewline: SW, Encoding: {}, Force: SW }, (p, i, c) => writeContent(p, i, c, false));
  cmdlet('Add-Content', ['ac'], { Path: P(0), Value: P(1), NoNewline: SW, Encoding: {}, Force: SW }, (p, i, c) => writeContent(p, i, c, true));
  cmdlet('Clear-Content', ['clc'], { Path: P(0) }, async (p, i, ctx) => { const sh = ctx.rt.shell; resolveItems(sh, p.Path, ctx).forEach(({ segs }) => sh.vfs.writeFile(segs, '', { user: sh.fsUser() })); return []; });
  cmdlet('Out-File', [], { FilePath: P(0, { alias: ['Path'] }), Append: SW, Encoding: P(1), InputObject: {}, NoClobber: SW, Width: {}, Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const data = p.InputObject !== undefined ? unroll(p.InputObject) : input || [];
    const text = TX.stripAnsi(TX.psFormatForHost(data, Object.assign(Object.create(ctx.rt), { pwsh: false }))).replace(/^\n/, '');
    const segs = sh.resolve(toStr(p.FilePath));
    if (p.NoClobber && sh.vfs.get(segs)) { ctx.error(`The file '${W.format(segs)}' already exists.`, { category: 'ResourceExists' }); return []; }
    try { sh.vfs.writeFile(segs, text, { append: !!p.Append, user: sh.fsUser(), owner: 'student' }); } catch (e) { ctx.error(e.code === 'ENOENT' ? `Could not find a part of the path '${W.format(segs)}'.` : `Access to the path '${W.format(segs)}' is denied.`, { category: 'WriteError' }); }
    return [];
  });
  cmdlet('Get-FileHash', [], { Path: P(0), Algorithm: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const algo = toStr(p.Algorithm || 'SHA256').toUpperCase();
    const f = algo === 'MD5' ? TX.md5 : algo === 'SHA1' ? TX.sha1 : TX.sha256;
    return (p.Path !== undefined ? unroll(p.Path) : inputPaths(input)).flatMap((path) => resolveItems(sh, path, ctx).map(({ segs, node }) => ({ __type: 'Microsoft.Powershell.Utility.FileHash', Algorithm: algo, Hash: f(sh.vfs.content(node) + (node.sz || '')).toUpperCase(), Path: W.format(segs) })));
  });
  VIEWS['Microsoft.Powershell.Utility.FileHash'] = { table: [{ label: 'Algorithm', name: 'Algorithm' }, { label: 'Hash', name: 'Hash' }, { label: 'Path', name: 'Path' }] };
  cmdlet('Compress-Archive', [], { Path: P(0), DestinationPath: P(1), Force: SW, Update: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const entries = [];
    for (const path of unroll(p.Path)) for (const { segs, node } of resolveItems(sh, path, ctx)) sh.vfs.walk(segs, (n, s) => { entries.push({ p: [node.name].concat(s.slice(segs.length)).join('/'), t: n.t, c: n.t === 'f' ? sh.vfs.content(n) : undefined, sz: n.sz }); });
    let dest = toStr(p.DestinationPath); if (!/\.zip$/i.test(dest)) dest += '.zip';
    const ds = sh.resolve(dest);
    if (sh.vfs.get(ds) && !p.Force && !p.Update) { ctx.error(`The archive file ${W.format(ds)} already exists. Use the -Update parameter to update the existing archive file or use the -Force parameter to overwrite the existing archive file.`, { category: 'InvalidArgument' }); return []; }
    const n = sh.vfs.writeFile(ds, 'TXARCHIVE\n' + JSON.stringify(entries), { user: sh.fsUser(), owner: 'student' });
    n.sz = Math.floor(entries.reduce((a, e) => a + (e.sz || (e.c || '').length), 0) * 0.5) + 200;
    return [];
  });
  cmdlet('Expand-Archive', [], { Path: P(0), DestinationPath: P(1), Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const [it] = resolveItems(sh, p.Path, ctx);
    if (!it) return [];
    const text = sh.vfs.content(it.node);
    const dest = p.DestinationPath !== undefined ? sh.resolve(toStr(p.DestinationPath)) : sh.cwd.concat(it.node.name.replace(/\.zip$/i, ''));
    if (!text.startsWith('TXARCHIVE')) { sh.vfs.mkdir(dest, { parents: true, owner: 'student' }); sh.vfs.writeFile(dest.concat('README.txt'), 'This pretend archive had no real contents.\n', { owner: 'student' }); return []; }
    JSON.parse(text.slice(10)).forEach((e) => { const s = dest.concat(e.p.split('/')); if (e.t === 'd') sh.vfs.mkdir(s, { parents: true, owner: 'student' }); else { sh.vfs.mkdir(s.slice(0, -1), { parents: true, owner: 'student' }); const nn = sh.vfs.writeFile(s, e.c || '', { owner: 'student' }); if (e.sz) nn.sz = e.sz; } });
    return [];
  });

  // ============================================================ output & host
  const COLORS = { black: 30, darkblue: 34, darkgreen: 32, darkcyan: 36, darkred: 31, darkmagenta: 35, darkyellow: 33, gray: 37, darkgray: 90, blue: 94, green: 92, cyan: 96, red: 91, magenta: 95, yellow: 93, white: 97 };
  cmdlet('Write-Host', [], { Object: P(0, { alias: ['Msg', 'Message'] }), ForegroundColor: { alias: ['fore', 'fg'] }, BackgroundColor: { alias: ['back', 'bg'] }, NoNewline: SW, Separator: {} }, async (p, input, ctx) => {
    const items = (p.Object !== undefined ? [p.Object] : input && input.length ? input : []).concat(p._rest || []);
    let s = items.map((x) => (Array.isArray(x) ? x.map((y) => toStr(y, ctx.rt)).join(p.Separator !== undefined ? toStr(p.Separator) : ' ') : toStr(x, ctx.rt))).join(p.Separator !== undefined ? toStr(p.Separator) : ' ');
    const codes = [];
    if (p.ForegroundColor) { const c = COLORS[toStr(p.ForegroundColor).toLowerCase()]; if (c === undefined) throw new PSError(`Cannot bind parameter 'ForegroundColor'. Cannot convert value "${toStr(p.ForegroundColor)}" to type "System.ConsoleColor". Error: "Unable to match the identifier name ${toStr(p.ForegroundColor)} to a valid enumerator name. Specify one of the following enumerator names and try again:\nBlack, DarkBlue, DarkGreen, DarkCyan, DarkRed, DarkMagenta, DarkYellow, Gray, DarkGray, Blue, Green, Cyan, Red, Magenta, Yellow, White"`, { category: 'InvalidArgument' }); codes.push(c); }
    if (p.BackgroundColor) { const c = COLORS[toStr(p.BackgroundColor).toLowerCase()]; if (c !== undefined) codes.push(c + 10); }
    if (codes.length) s = s.split('\n').map((l) => '\x1b[' + codes.join(';') + 'm' + l + '\x1b[0m').join('\n');
    ctx.rt.host(s + (p.NoNewline ? '' : '\n'));
    return [];
  }, { rest: true });
  cmdlet('Write-Output', ['echo', 'write'], { InputObject: P(0), NoEnumerate: SW }, async (p, input) => (p.InputObject !== undefined ? unroll(p.InputObject) : input || []).concat(p._rest || []), { rest: true });
  cmdlet('Write-Error', [], { Message: P(0), Category: {}, ErrorId: {} }, async (p, input, ctx) => { ctx.error(toStr(p.Message), { category: p.Category ? toStr(p.Category) : 'NotSpecified', id: 'Microsoft.PowerShell.Commands.WriteErrorException' }); return []; });
  cmdlet('Write-Warning', [], { Message: P(0) }, async (p, input, ctx) => { ctx.warn(toStr(p.Message)); return []; });
  cmdlet('Write-Verbose', [], { Message: P(0) }, async (p, input, ctx) => { if (p.Verbose || /continue/i.test(toStr(ctx.rt.getVar('VerbosePreference')))) ctx.rt.host(C.yellow('VERBOSE: ' + toStr(p.Message)) + '\n'); return []; });
  cmdlet('Write-Debug', [], { Message: P(0) }, async () => []);
  cmdlet('Write-Information', [], { MessageData: P(0) }, async (p, i, ctx) => { ctx.rt.host(toStr(p.MessageData) + '\n'); return []; });
  cmdlet('Write-Progress', [], { Activity: P(0), Status: P(1), PercentComplete: {}, Completed: SW, Id: {} }, async (p, i, ctx) => { if (p.Completed) return []; const pct = toNum(p.PercentComplete || 0); const w = 40; ctx.rt.host(`\x1b[36m${toStr(p.Activity)}\x1b[0m [${'o'.repeat(Math.round(pct / 100 * w)).padEnd(w)}] ${pct}% ${toStr(p.Status || '')}\n`); return []; });
  cmdlet('Read-Host', [], { Prompt: P(0), AsSecureString: SW, MaskInput: SW }, async (p, input, ctx) => {
    const v = await ctx.rt.shell.readLine(p.Prompt !== undefined ? toStr(p.Prompt) + ': ' : '', { hidden: !!(p.AsSecureString || p.MaskInput) });
    return [p.AsSecureString ? { __type: 'System.Security.SecureString', Length: v.length, __toString() { return 'System.Security.SecureString'; } } : v];
  });
  cmdlet('Clear-Host', ['cls', 'clear'], {}, async (p, input, ctx) => { ctx.rt.term.clear(); return []; });
  // TerminalEX-only helper so "reset-machine" works in every shell.
  cmdlet('Reset-Machine', ['reset-machine'], { Force: SW }, async (p, input, ctx) => {
    if (!p.Force) { const a = await ctx.rt.shell.readLine('Reset this pretend PC to factory settings? All your files will be lost. [Y] Yes  [N] No (default is "N"): '); if (!/^y/i.test(a)) return []; }
    TX.app.resetMachine('windows');
    return [];
  });
  cmdlet('Out-Null', [], { InputObject: {} }, async () => []);
  cmdlet('Out-Host', ['oh'], { Paging: SW, InputObject: {} }, async (p, input, ctx) => { ctx.rt.host(TX.psFormatForHost(input || [], ctx.rt)); return []; });
  cmdlet('Out-Default', [], {}, async (p, input, ctx) => { ctx.rt.host(TX.psFormatForHost(input || [], ctx.rt)); return []; });
  cmdlet('Out-String', [], { Stream: SW, Width: {}, InputObject: {} }, async (p, input, ctx) => {
    const text = TX.stripAnsi(TX.psFormatForHost(p.InputObject !== undefined ? unroll(p.InputObject) : input || [], Object.assign(Object.create(ctx.rt), { pwsh: false })));
    return p.Stream ? TX.splitLines(text) : [text];
  });
  cmdlet('Out-GridView', ['ogv'], { Title: {}, PassThru: SW }, async (p, input, ctx) => { ctx.warn('Out-GridView opens a graphical window on a real PC. Showing a table instead.'); return [{ __format: true, text: TX.psFormatGroup(input || [], ctx.rt, true) }]; });

  // ============================================================ formatting cmdlets
  function propList(props, rt) {
    return unroll(props).map((pr) => {
      if (pr instanceof PSHash) {
        const label = toStr(pr.get('Name') || pr.get('Label') || pr.get('n') || pr.get('l'));
        const ex = pr.get('Expression') || pr.get('e');
        return { label, async: ex instanceof PSScriptBlock, ex, fmtStr: pr.get('FormatString') };
      }
      return { label: toStr(pr), name: toStr(pr) };
    });
  }
  async function evalProps(objs, props, rt) {
    // returns objects with computed values for calculated props
    const out = [];
    for (const o of objs) {
      const row = { __type: 'Selected.' + TX.psTypeName(o) };
      for (const pr of props) {
        if (pr.ex !== undefined) row[pr.label] = pr.async ? collapse(await rt.invokeBlockAsync(pr.ex, [], o)) : getM(o, toStr(pr.ex), rt);
        else if (TX.hasGlob(pr.name)) { const re = TX.likeToRegex(pr.name); TX.psVisibleKeys(o).forEach((k) => { if (re.test(k)) row[k] = o[k]; }); }
        else { const v = getM(o, pr.name, rt); row[realKey(o, pr.name)] = v === undefined ? null : v; }
      }
      out.push(row);
    }
    return out;
  }
  function realKey(o, name) { if (!o || typeof o !== 'object' || o instanceof PSHash) return name; const k = Object.keys(o).find((x) => x.toLowerCase() === String(name).toLowerCase()); return k || name; }
  cmdlet('Format-Table', ['ft'], { Property: P(0), AutoSize: SW, Wrap: SW, HideTableHeaders: SW, GroupBy: {} }, async (p, input, ctx) => {
    const items = input || [];
    if (!items.length) return [];
    let text;
    if (p.Property !== undefined) {
      const props = propList(p.Property, ctx.rt);
      const rows = await evalProps(items, props, ctx.rt);
      const cols = Object.keys(rows[0]).filter((k) => !k.startsWith('__')).map((k) => ({ label: k, name: k }));
      text = TX.psRenderTable(rows, cols, ctx.rt, { auto: true });
    } else {
      const first = items[0];
      if (first && typeof first === 'object' && !(first instanceof Date)) {
        const view = VIEWS[TX.psTypeName(first)];
        if (view && (view.table || view.custom)) text = TX.psFormatGroup(items, ctx.rt);
        else if (first instanceof PSHash) text = TX.psFormatGroup(items, ctx.rt);
        else { const keys = TX.psVisibleKeys(first).slice(0, 10); text = TX.psRenderTable(items, keys.map((k) => ({ label: k, name: k })), ctx.rt, { auto: true }); }
      } else text = items.map((x) => toStr(x, ctx.rt)).join('\n');
    }
    if (p.HideTableHeaders) text = text.split('\n').slice(2).join('\n');
    return [{ __format: true, text }];
  });
  cmdlet('Format-List', ['fl'], { Property: P(0), GroupBy: {} }, async (p, input, ctx) => {
    const items = input || [];
    if (!items.length) return [];
    let text;
    if (p.Property !== undefined) {
      const props = propList(p.Property, ctx.rt);
      if (props.length === 1 && props[0].name === '*') text = TX.psRenderList(items.map((o) => o), null, ctx.rt).replace(/\n/g, '\n');
      else { const rows = await evalProps(items, props, ctx.rt); text = TX.psRenderList(rows, null, ctx.rt); }
      if (props.length === 1 && props[0].name === '*') text = TX.psRenderList(items, null, ctx.rt);
    } else {
      text = items.map((o) => (o && typeof o === 'object' && !(o instanceof Date) && !(o instanceof PSHash) ? TX.psRenderList([o], (VIEWS[TX.psTypeName(o)] || {}).list || null, ctx.rt) : o instanceof PSHash ? o.entries().map(([k, v]) => `Name  : ${k}\nValue : ${toStr(v)}`).join('\n\n') : toStr(o, ctx.rt))).join('\n\n');
    }
    return [{ __format: true, text }];
  });
  cmdlet('Format-Wide', ['fw'], { Property: P(0), Column: {}, AutoSize: SW }, async (p, input, ctx) => {
    const items = input || [];
    const names = items.map((o) => { const v = p.Property !== undefined ? getM(o, toStr(p.Property)) : o && o.Name !== undefined ? o.Name : toStr(o); return o && o.__node && o.__node.t === 'd' ? '[' + toStr(v) + ']' : toStr(v); });
    const cols = p.Column ? toNum(p.Column) : null;
    let text;
    if (cols) { const w = Math.floor((ctx.rt.term.cols - 1) / cols); const rows = []; for (let i = 0; i < names.length; i += cols) rows.push(names.slice(i, i + cols).map((n) => TX.padR(n, w)).join('').replace(/\s+$/, '')); text = rows.join('\n'); }
    else text = TX.columns(names, ctx.rt.term.cols - 1, 2);
    return [{ __format: true, text }];
  });

  // ============================================================ object pipeline cmdlets
  cmdlet('Where-Object', ['where', '?'], {}, async (p, input, ctx) => {
    const args = p._positional;
    const items = input || [];
    if (args[0] instanceof PSScriptBlock) {
      const out = [];
      for (const it of items) { ctx.rt.shell.checkAbort(); if (truthy(collapse(await ctx.rt.invokeBlockAsync(args[0], [], it)))) out.push(it); }
      return out;
    }
    if (typeof args[0] === 'string' && args[0].toLowerCase() === '-filterscript') return CMDLETS['where-object'].fn({ _positional: args.slice(1) }, input, ctx);
    // simplified syntax: Where-Object Prop -op Value   /  Where-Object -Property Prop -EQ Value
    let a = args.slice();
    let prop = null, op = null, value;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (typeof x === 'string' && /^-/.test(x)) {
        const k = x.slice(1).toLowerCase();
        if (k === 'property') { prop = toStr(a[++i]); continue; }
        if (k === 'value') { value = a[++i]; continue; }
        op = k; continue;
      }
      if (prop === null) prop = toStr(x); else value = x;
    }
    if (prop === null) return items;
    const out = [];
    for (const it of items) {
      const v = getM(it, prop, ctx.rt);
      const hit = op ? truthy(TX.psBinary(op, v, value === undefined ? null : value, ctx.rt)) : truthy(v);
      if (hit) out.push(it);
    }
    return out;
  }, { rawParams: true });
  cmdlet('ForEach-Object', ['foreach', '%'], { Process: P(0), Begin: {}, End: {}, MemberName: {}, ArgumentList: {}, Parallel: {} }, async (p, input, ctx) => {
    const rt = ctx.rt;
    const out = [];
    const items = input || [];
    let proc = p.Process !== undefined ? p.Process : p.Parallel;
    if (p.MemberName !== undefined) proc = toStr(p.MemberName);
    const extra = p._rest || [];
    if (p.Begin instanceof PSScriptBlock) out.push(...(await rt.invokeBlockAsync(p.Begin, [], null)));
    let blocks = [proc];
    if (extra.length && extra.every((x) => x instanceof PSScriptBlock)) { blocks = [proc].concat(extra); }
    if (blocks.length === 3 && !p.Begin) { out.push(...(await rt.invokeBlockAsync(blocks[0], [], null))); blocks = [blocks[1], blocks[2]]; }
    const endBlock = blocks.length === 2 ? blocks[1] : p.End;
    proc = blocks[0];
    for (const it of items) {
      rt.shell.checkAbort();
      if (proc instanceof PSScriptBlock) out.push(...(await rt.invokeBlockAsync(proc, [], it)));
      else if (typeof proc === 'string') {
        const m = getM(it, proc, rt);
        if (m !== undefined && m !== null) out.push(...unroll(m));
        else { try { out.push(...unroll(TX.psCallMethod(it, proc, extra, rt))); } catch (e) { if (m === null) continue; throw e; } }
      }
    }
    if (endBlock instanceof PSScriptBlock) out.push(...(await rt.invokeBlockAsync(endBlock, [], null)));
    return out.filter((x) => x !== undefined);
  }, { rest: true });
  cmdlet('Select-Object', ['select'], { Property: P(0), First: {}, Last: {}, Skip: {}, SkipLast: {}, Unique: SW, ExpandProperty: {}, Index: {}, ExcludeProperty: {}, InputObject: {} }, async (p, input, ctx) => {
    let items = p.InputObject !== undefined ? unroll(p.InputObject) : input || [];
    if (p.Unique) { const seen = new Set(); items = items.filter((x) => { const k = TX.psTypeName(x) + toStr(x); if (seen.has(k)) return false; seen.add(k); return true; }); }
    if (p.Skip !== undefined) items = items.slice(toNum(p.Skip));
    if (p.SkipLast !== undefined) items = items.slice(0, Math.max(0, items.length - toNum(p.SkipLast)));
    if (p.Index !== undefined) items = unroll(p.Index).map((i) => items[toNum(i)]).filter((x) => x !== undefined);
    if (p.First !== undefined && p.Last !== undefined) items = items.slice(0, toNum(p.First)).concat(items.slice(-toNum(p.Last)));
    else if (p.First !== undefined) items = items.slice(0, toNum(p.First));
    else if (p.Last !== undefined) items = items.slice(Math.max(0, items.length - toNum(p.Last)));
    if (p.ExpandProperty !== undefined) {
      const name = toStr(p.ExpandProperty);
      const out = [];
      items.forEach((o) => { const v = getM(o, name, ctx.rt); if (v === null || v === undefined) { if (!(o && typeof o === 'object' && Object.keys(o).some((k) => k.toLowerCase() === name.toLowerCase()))) ctx.error(`Property "${name}" cannot be found.`, { category: 'InvalidArgument', id: 'ExpandPropertyNotFound' }); return; } out.push(...unroll(v)); });
      return out;
    }
    if (p.Property !== undefined) {
      let props = propList(p.Property, ctx.rt);
      if (props.length === 1 && props[0].name === '*') return items;
      const rows = await evalProps(items, props, ctx.rt);
      if (p.ExcludeProperty) { const ex = unroll(p.ExcludeProperty).map((x) => toStr(x).toLowerCase()); rows.forEach((r) => Object.keys(r).forEach((k) => { if (ex.includes(k.toLowerCase())) delete r[k]; })); }
      return rows;
    }
    return items;
  });
  function sortKeyFns(p, rt) {
    if (p.Property === undefined) return [{ fn: async (o) => o, desc: !!p.Descending }];
    return unroll(p.Property).map((pr) => {
      if (pr instanceof PSScriptBlock) return { fn: async (o) => collapse(await rt.invokeBlockAsync(pr, [], o)), desc: !!p.Descending };
      if (pr instanceof PSHash) { const ex = pr.get('Expression') || pr.get('e'); const d = pr.has('Descending') ? truthy(pr.get('Descending')) : pr.has('Ascending') ? !truthy(pr.get('Ascending')) : !!p.Descending; return { fn: async (o) => (ex instanceof PSScriptBlock ? collapse(await rt.invokeBlockAsync(ex, [], o)) : getM(o, toStr(ex), rt)), desc: d }; }
      return { fn: async (o) => getM(o, toStr(pr), rt), desc: !!p.Descending };
    });
  }
  cmdlet('Sort-Object', ['sort'], { Property: P(0), Descending: SW, Unique: SW, CaseSensitive: SW, Top: {}, Bottom: {} }, async (p, input, ctx) => {
    const items = input || [];
    const keys = sortKeyFns(p, ctx.rt);
    const withKeys = [];
    for (const o of items) { const ks = []; for (const k of keys) ks.push(await k.fn(o)); withKeys.push({ o, ks }); }
    withKeys.sort((a, b) => { for (let i = 0; i < keys.length; i++) { const x = a.ks[i], y = b.ks[i]; let c; if (x === null || x === undefined) c = y === null || y === undefined ? 0 : -1; else if (y === null || y === undefined) c = 1; else c = TX.psCompare(x, y, p.CaseSensitive); if (c) return keys[i].desc ? -c : c; } return 0; });
    let out = withKeys.map((x) => x.o);
    if (p.Unique) { const seen = new Set(); out = out.filter((o, i) => { const k = withKeys[i].ks.map((x) => toStr(x).toLowerCase()).join('\u0000'); if (seen.has(k)) return false; seen.add(k); return true; }); }
    if (p.Top !== undefined) out = out.slice(0, toNum(p.Top));
    if (p.Bottom !== undefined) out = out.slice(-toNum(p.Bottom));
    return out;
  });
  cmdlet('Group-Object', ['group'], { Property: P(0), NoElement: SW, AsHashTable: SW }, async (p, input, ctx) => {
    const groups = new Map();
    for (const o of input || []) {
      let key;
      const props = unroll(p.Property);
      const vals = [];
      for (const pr of props) vals.push(pr instanceof PSScriptBlock ? collapse(await ctx.rt.invokeBlockAsync(pr, [], o)) : getM(o, toStr(pr), ctx.rt));
      key = props.length ? vals.map((v) => toStr(v)).join(', ') : toStr(o);
      const lk = key.toLowerCase();
      if (!groups.has(lk)) groups.set(lk, { __type: 'Microsoft.PowerShell.Commands.GroupInfo', Count: 0, Name: key, Group: [] });
      const g = groups.get(lk); g.Count++; g.Group.push(o);
    }
    let out = [...groups.values()];
    if (p.NoElement) out.forEach((g) => delete g.Group);
    if (p.AsHashTable) { const h = new PSHash(); out.forEach((g) => h.set(g.Name, collapse(g.Group))); return [h]; }
    return out;
  });
  VIEWS['Microsoft.PowerShell.Commands.GroupInfo'] = { table: [{ label: 'Count', name: 'Count', align: 'right' }, { label: 'Name', name: 'Name' }, { label: 'Group', name: 'Group', fmt: (v, o, rt) => (v ? '{' + v.slice(0, 4).map((x) => (x && x.Name !== undefined ? toStr(x.Name) : toStr(x, rt))).join(', ') + (v.length > 4 ? '…' : '') + '}' : '') }] };
  cmdlet('Measure-Object', ['measure'], { Property: P(0), Sum: SW, Average: SW, Maximum: SW, Minimum: SW, Line: SW, Word: SW, Character: SW, AllStats: SW, InputObject: {} }, async (p, input, ctx) => {
    const items = p.InputObject !== undefined ? unroll(p.InputObject) : input || [];
    if (p.Line || p.Word || p.Character) {
      const text = items.map((x) => toStr(x)).join('\n');
      const o = { __type: 'Microsoft.PowerShell.Commands.TextMeasureInfo' };
      if (p.Line) o.Lines = items.length; if (p.Word) o.Words = (text.match(/\S+/g) || []).length; if (p.Character) o.Characters = items.reduce((a, x) => a + toStr(x).length, 0); o.Property = null;
      return [o];
    }
    const props = p.Property !== undefined ? unroll(p.Property).map((x) => toStr(x)) : [null];
    return props.map((pr) => {
      const vals = items.map((o) => (pr ? getM(o, pr, ctx.rt) : o)).filter((v) => v !== null && v !== undefined);
      const nums = vals.map((v) => toNum(v));
      const all = p.AllStats;
      const o = { __type: 'Microsoft.PowerShell.Commands.GenericMeasureInfo', Count: pr ? vals.length : items.length, Average: (p.Average || all) && nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null, Sum: (p.Sum || all) ? nums.reduce((a, b) => a + b, 0) : null, Maximum: (p.Maximum || all) && nums.length ? (nums.some(isNaN) ? vals.map((v) => toStr(v)).sort().pop() : Math.max(...nums)) : null, Minimum: (p.Minimum || all) && nums.length ? (nums.some(isNaN) ? vals.map((v) => toStr(v)).sort()[0] : Math.min(...nums)) : null };
      if (ctx.rt.pwsh) { const avg = nums.reduce((a, b) => a + b, 0) / (nums.length || 1); o.StandardDeviation = all && nums.length > 1 ? Math.sqrt(nums.reduce((a, b) => a + (b - avg) ** 2, 0) / (nums.length - 1)) : null; }
      o.Property = pr;
      return o;
    });
  });
  VIEWS['Microsoft.PowerShell.Commands.GenericMeasureInfo'] = { list: null };
  VIEWS['Microsoft.PowerShell.Commands.TextMeasureInfo'] = {};
  cmdlet('Tee-Object', ['tee'], { FilePath: P(0, { alias: ['Path'] }), Variable: {}, Append: SW, InputObject: {} }, async (p, input, ctx) => {
    if (p.InputObject !== undefined) input = unroll(p.InputObject);
    if (p.Variable) ctx.rt.setVar(toStr(p.Variable), collapse(input || []));
    if (p.FilePath) await CMDLETS['out-file'].fn({ FilePath: p.FilePath, Append: p.Append }, input, ctx);
    return input || [];
  });
  cmdlet('Get-Unique', ['gu'], { AsString: SW }, async (p, input) => (input || []).filter((x, i, a) => i === 0 || toStr(x) !== toStr(a[i - 1])));
  cmdlet('Compare-Object', ['compare', 'diff'], { ReferenceObject: P(0), DifferenceObject: P(1), IncludeEqual: SW, ExcludeDifferent: SW, Property: {}, PassThru: SW }, async (p, input, ctx) => {
    const ref = unroll(p.ReferenceObject), dif = unroll(p.DifferenceObject);
    const key = (o) => (p.Property ? toStr(getM(o, toStr(p.Property), ctx.rt)) : toStr(o)).toLowerCase();
    const rk = ref.map(key), dk = dif.map(key);
    const out = [];
    const mk = (o, ind) => { const r = { __type: 'System.Management.Automation.PSCustomObject' }; if (p.Property) r[toStr(p.Property)] = getM(o, toStr(p.Property), ctx.rt); else r.InputObject = o; r.SideIndicator = ind; return r; };
    if (p.IncludeEqual) ref.forEach((o, i) => { if (dk.includes(rk[i])) out.push(mk(o, '==')); });
    if (!p.ExcludeDifferent) { dif.forEach((o, i) => { if (!rk.includes(dk[i])) out.push(mk(o, '=>')); }); ref.forEach((o, i) => { if (!dk.includes(rk[i])) out.push(mk(o, '<=')); }); }
    return out;
  });
  cmdlet('Select-String', ['sls'], { Pattern: P(0), Path: P(1), SimpleMatch: SW, CaseSensitive: SW, NotMatch: SW, AllMatches: SW, Context: {}, Quiet: SW, List: SW, InputObject: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const pats = unroll(p.Pattern).map((x) => toStr(x));
    const re = new RegExp(pats.map((x) => (p.SimpleMatch ? x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : x)).join('|'), (p.CaseSensitive ? '' : 'i') + 'g');
    const out = [];
    const color = (line) => (ctx.rt.pwsh ? line.replace(re, (m) => '\x1b[7m' + m + '\x1b[0m') : line);
    const test = (line) => { re.lastIndex = 0; return re.test(line) !== !!p.NotMatch; };
    const mkInfo = (line, n, file) => ({ __type: 'Microsoft.PowerShell.Commands.MatchInfo', LineNumber: n, Line: line, Filename: file ? file.split('\\').pop() : 'InputStream', Path: file || 'InputStream', Pattern: pats.join(','), IgnoreCase: !p.CaseSensitive, Matches: (() => { re.lastIndex = 0; const m = line.match(re); return m ? m.map((x) => ({ __type: 'System.Text.RegularExpressions.Match', Value: x, Success: true, __toString() { return x; } })) : []; })(), __toString: () => (file ? `${sh.relPath(file)}:${n}:${line}` : line), __hl: color(line) });
    if (p.Path !== undefined) {
      for (const path of unroll(p.Path)) for (const { segs, node } of resolveItems(sh, path, ctx)) {
        if (node.t !== 'f') continue;
        TX.splitLines(sh.vfs.content(node)).forEach((l, i) => { if (test(l)) out.push(mkInfo(l, i + 1, W.format(segs))); });
      }
    } else {
      for (const it of p.InputObject !== undefined ? unroll(p.InputObject) : input || []) {
        if (it && it.__type === 'System.IO.FileInfo') { TX.splitLines(sh.vfs.content(it.__node)).forEach((l, i) => { if (test(l)) out.push(mkInfo(l, i + 1, it.FullName)); }); continue; }
        const s = toStr(it, ctx.rt);
        if (test(s)) out.push(mkInfo(s, out.length + 1, null));
      }
    }
    if (p.Quiet) return [out.length > 0];
    return out;
  });
  VIEWS['Microsoft.PowerShell.Commands.MatchInfo'] = { custom: (items, rt) => items.map((m) => (m.Path === 'InputStream' ? m.__hl : `${rt.shell.relPath(m.Path)}:${m.LineNumber}:${m.__hl}`)).join('\n') };

  // ============================================================ conversion
  function toPlain(v, depth, rt) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v;
    if (v instanceof Date) return rt.pwsh ? TX.psFmtDate(v, "yyyy-MM-dd'T'HH:mm:ss.fffffffK") : '\\/Date(' + v.getTime() + ')\\/';
    if (Array.isArray(v)) return depth <= 0 ? toStr(v, rt) : v.map((x) => toPlain(x, depth - 1, rt));
    if (v instanceof PSHash) { const o = {}; v.entries().forEach(([k, x]) => { o[k] = depth <= 0 ? toStr(x, rt) : toPlain(x, depth - 1, rt); }); return o; }
    if (v instanceof PSScriptBlock) return v.toString();
    if (depth <= 0) return toStr(v, rt);
    const o = {};
    TX.psVisibleKeys(v).forEach((k) => { if (typeof v[k] !== 'function') o[k] = toPlain(v[k], depth - 1, rt); });
    return o;
  }
  function fromPlain(v) {
    if (Array.isArray(v)) return v.map(fromPlain);
    if (v && typeof v === 'object') { const o = { __type: 'System.Management.Automation.PSCustomObject' }; Object.keys(v).forEach((k) => { o[k] = fromPlain(v[k]); }); return o; }
    return v;
  }
  cmdlet('ConvertTo-Json', [], { InputObject: P(0), Depth: {}, Compress: SW, AsArray: SW }, async (p, input, ctx) => {
    let items = p.InputObject !== undefined ? [p.InputObject] : input || [];
    const depth = p.Depth !== undefined ? toNum(p.Depth) : 2;
    const data = items.length === 1 && !p.AsArray ? toPlain(items[0], depth, ctx.rt) : items.map((x) => toPlain(x, depth, ctx.rt));
    let s = JSON.stringify(data, null, p.Compress ? 0 : ctx.rt.pwsh ? 2 : 4);
    if (!ctx.rt.pwsh && !p.Compress) s = s.replace(/": /g, '":  ');
    return [s];
  });
  cmdlet('ConvertFrom-Json', [], { InputObject: P(0), AsHashtable: SW }, async (p, input, ctx) => {
    const text = p.InputObject !== undefined ? toStr(p.InputObject) : (input || []).map((x) => toStr(x)).join('\n');
    let v;
    try { v = JSON.parse(text); } catch (e) { throw new PSError(`Conversion from JSON failed with error: ${e.message}`, { category: 'NotSpecified', id: 'System.ArgumentException' }); }
    if (p.AsHashtable) { const toH = (x) => { if (Array.isArray(x)) return x.map(toH); if (x && typeof x === 'object') { const h = new PSHash(); Object.keys(x).forEach((k) => h.set(k, toH(x[k]))); return h; } return x; }; return unroll(toH(v)); }
    const r = fromPlain(v);
    return Array.isArray(r) ? r : [r];
  });
  function csvRows(items, rt, delim, noType, noHeader) {
    if (!items.length) return [];
    const first = items[0];
    const keys = first instanceof PSHash ? ['IsReadOnly', 'IsFixedSize', 'IsSynchronized', 'Keys', 'Values', 'SyncRoot', 'Count'] : typeof first === 'object' ? TX.psVisibleKeys(first) : ['Length'];
    const q = (s) => '"' + toStr(s, rt).replace(/"/g, '""') + '"';
    const lines = [];
    if (!noType) lines.push('#TYPE ' + TX.psTypeName(first));
    if (!noHeader) lines.push(keys.map(q).join(delim));
    items.forEach((o) => lines.push(keys.map((k) => q(typeof o === 'object' ? getM(o, k, rt) : toStr(o).length)).join(delim)));
    return lines;
  }
  function parseCsv(text, delim, header) {
    const rows = [];
    let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"') { q = true; continue; }
      if (ch === delim) { row.push(cur); cur = ''; continue; }
      if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; continue; }
      cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const data = rows.filter((r) => !(r[0] || '').startsWith('#TYPE'));
    const hdr = header ? unroll(header).map((x) => toStr(x)) : data.shift() || [];
    return data.map((r) => { const o = { __type: 'System.Management.Automation.PSCustomObject' }; hdr.forEach((h, i) => { o[h] = r[i] === undefined ? null : r[i]; }); return o; });
  }
  cmdlet('ConvertTo-Csv', [], { InputObject: P(0), NoTypeInformation: SW, Delimiter: {}, IncludeTypeInformation: SW, NoHeader: SW }, async (p, input, ctx) => csvRows(p.InputObject !== undefined ? unroll(p.InputObject) : input || [], ctx.rt, p.Delimiter ? toStr(p.Delimiter) : ',', ctx.rt.pwsh ? !p.IncludeTypeInformation : !!p.NoTypeInformation, p.NoHeader));
  cmdlet('Export-Csv', ['epcsv'], { Path: P(0), NoTypeInformation: SW, Delimiter: {}, Append: SW, IncludeTypeInformation: SW, InputObject: {}, Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const lines = csvRows(p.InputObject !== undefined ? unroll(p.InputObject) : input || [], ctx.rt, p.Delimiter ? toStr(p.Delimiter) : ',', ctx.rt.pwsh ? !p.IncludeTypeInformation : !!p.NoTypeInformation);
    const segs = sh.resolve(toStr(p.Path));
    sh.vfs.writeFile(segs, (p.Append ? lines.slice(1) : lines).join('\n') + '\n', { append: !!p.Append, user: sh.fsUser(), owner: 'student' });
    return [];
  });
  cmdlet('ConvertFrom-Csv', [], { InputObject: P(0), Delimiter: {}, Header: {} }, async (p, input) => parseCsv((p.InputObject !== undefined ? unroll(p.InputObject) : input || []).map((x) => toStr(x)).join('\n'), p.Delimiter ? toStr(p.Delimiter) : ',', p.Header));
  cmdlet('Import-Csv', ['ipcsv'], { Path: P(0), Delimiter: {}, Header: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const out = [];
    for (const path of p.Path !== undefined ? unroll(p.Path) : inputPaths(input)) for (const { node } of resolveItems(sh, path, ctx)) out.push(...parseCsv(sh.vfs.content(node), p.Delimiter ? toStr(p.Delimiter) : ',', p.Header));
    return out;
  });
  cmdlet('ConvertTo-Html', [], { Property: P(0), Title: {}, Fragment: SW }, async (p, input, ctx) => {
    const items = input || [];
    const keys = p.Property ? unroll(p.Property).map((x) => toStr(x)) : items[0] && typeof items[0] === 'object' ? TX.psVisibleKeys(items[0]) : ['*'];
    const rows = ['<table>', '<colgroup>' + keys.map(() => '<col/>').join('') + '</colgroup>', '<tr>' + keys.map((k) => `<th>${k}</th>`).join('') + '</tr>'].concat(items.map((o) => '<tr>' + keys.map((k) => `<td>${TX.escapeHtml(toStr(typeof o === 'object' ? getM(o, k, ctx.rt) : o, ctx.rt))}</td>`).join('') + '</tr>'), ['</table>']);
    if (p.Fragment) return rows;
    return ['<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">', '<html xmlns="http://www.w3.org/1999/xhtml">', '<head>', `<title>${toStr(p.Title || 'HTML TABLE')}</title>`, '</head><body>'].concat(rows, ['</body></html>']);
  });
  cmdlet('New-Object', [], { TypeName: P(0), ArgumentList: P(1), Property: {} }, async (p, input, ctx) => {
    const t = toStr(p.TypeName || 'PSObject').toLowerCase();
    if (t === 'psobject' || t === 'pscustomobject' || t === 'system.management.automation.psobject') { const o = { __type: 'System.Management.Automation.PSCustomObject' }; if (p.Property instanceof PSHash) p.Property.entries().forEach(([k, v]) => { o[k] = v; }); return [o]; }
    if (/collections\.arraylist|list/.test(t)) { const arr = []; return [arr]; }
    if (/hashtable/.test(t)) return [new PSHash()];
    if (t === 'system.random' || t === 'random') return [{ __type: 'System.Random', __methods: { Next(a, b) { return b === undefined ? Math.floor(Math.random() * (a === undefined ? 2147483647 : toNum(a))) : toNum(a) + Math.floor(Math.random() * (toNum(b) - toNum(a))); } } }];
    if (/datetime/.test(t)) { const a = unroll(p.ArgumentList).map(toNum); return [new Date(a[0], (a[1] || 1) - 1, a[2] || 1, a[3] || 0, a[4] || 0, a[5] || 0)]; }
    if (/net\.webclient/.test(t)) return [{ __type: 'System.Net.WebClient', __methods: { DownloadString(u) { const r = TX.http(toStr(u)); if (!r) throw new PSError('Exception calling "DownloadString" with "1" argument(s): "No such host is known."'); return r.body; } } }];
    throw new PSError(`Cannot find type [${toStr(p.TypeName)}]: verify that the assembly containing this type is loaded.`, { category: 'InvalidType', id: 'TypeNotFound' });
  });
  cmdlet('Add-Member', [], { InputObject: {}, MemberType: P(0), Name: P(1), Value: P(2), NotePropertyName: {}, NotePropertyValue: {}, PassThru: SW, Force: SW }, async (p, input) => {
    const targets = p.InputObject !== undefined ? unroll(p.InputObject) : input || [];
    const name = toStr(p.NotePropertyName || p.Name);
    const val = p.NotePropertyValue !== undefined ? p.NotePropertyValue : p.Value;
    targets.forEach((o) => { if (o instanceof PSHash) o.set(name, val); else if (o && typeof o === 'object') o[name] = val; });
    return p.PassThru ? targets : [];
  });
  cmdlet('Get-Member', ['gm'], { Name: P(0), MemberType: {}, Static: SW, InputObject: {} }, async (p, input, ctx) => {
    const items = p.InputObject !== undefined ? [p.InputObject] : input || [];
    if (!items.length) throw new PSError('You must specify an object for the Get-Member cmdlet.', { category: 'CloseError', id: 'NoObjectInGetMember' });
    const seen = new Set();
    const out = [];
    items.forEach((o) => {
      const tn = TX.psTypeName(o);
      if (seen.has(tn)) return;
      seen.add(tn);
      membersOf(o).filter((m) => !p.Name || unroll(p.Name).some((n) => TX.likeToRegex(toStr(n)).test(m.Name))).filter((m) => !p.MemberType || new RegExp(unroll(p.MemberType).map((x) => toStr(x)).join('|'), 'i').test(m.MemberType))
        .forEach((m) => out.push(Object.assign({ __type: 'Microsoft.PowerShell.Commands.MemberDefinition', TypeName: tn }, m)));
    });
    return out;
  });
  VIEWS['Microsoft.PowerShell.Commands.MemberDefinition'] = {
    custom(items, rt) {
      const parts = [];
      let cur = null, bucket = [];
      const flush = () => { if (bucket.length) parts.push(`   ${rt.pwsh ? '\x1b[32;1mTypeName: \x1b[0m' : 'TypeName: '}${cur}\n\n` + TX.psRenderTable(bucket, [{ label: 'Name', name: 'Name' }, { label: 'MemberType', name: 'MemberType' }, { label: 'Definition', name: 'Definition' }], rt, { auto: true })); bucket = []; };
      items.forEach((m) => { if (m.TypeName !== cur) { flush(); cur = m.TypeName; } bucket.push(m); });
      flush();
      return parts.join('\n\n');
    },
  };
  function netType(v) {
    if (typeof v === 'string') return 'string'; if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double'; if (typeof v === 'boolean') return 'bool';
    if (v instanceof Date) return 'datetime'; if (Array.isArray(v)) return 'Object[]'; if (v === null) return 'System.Object';
    return TX.psTypeName(v).split('.').pop();
  }
  function membersOf(o) {
    const M = (Name, MemberType, Definition) => ({ Name, MemberType, Definition });
    const common = [M('Equals', 'Method', 'bool Equals(System.Object obj)'), M('GetHashCode', 'Method', 'int GetHashCode()'), M('GetType', 'Method', 'type GetType()'), M('ToString', 'Method', 'string ToString()')];
    if (typeof o === 'string') return [M('Clone', 'Method', 'System.Object Clone()'), M('CompareTo', 'Method', 'int CompareTo(System.Object value)'), M('Contains', 'Method', 'bool Contains(string value)'), M('EndsWith', 'Method', 'bool EndsWith(string value)')].concat(common.slice(0, 3), [M('IndexOf', 'Method', 'int IndexOf(string value)'), M('Insert', 'Method', 'string Insert(int startIndex, string value)'), M('PadLeft', 'Method', 'string PadLeft(int totalWidth)'), M('PadRight', 'Method', 'string PadRight(int totalWidth)'), M('Replace', 'Method', 'string Replace(string oldValue, string newValue)'), M('Split', 'Method', 'string[] Split(Params char[] separator)'), M('StartsWith', 'Method', 'bool StartsWith(string value)'), M('Substring', 'Method', 'string Substring(int startIndex)'), M('ToCharArray', 'Method', 'char[] ToCharArray()'), M('ToLower', 'Method', 'string ToLower()'), common[3], M('ToUpper', 'Method', 'string ToUpper()'), M('Trim', 'Method', 'string Trim()'), M('TrimEnd', 'Method', 'string TrimEnd()'), M('TrimStart', 'Method', 'string TrimStart()'), M('Length', 'Property', 'int Length {get;}')]);
    if (typeof o === 'number') return [M('CompareTo', 'Method', 'int CompareTo(System.Object value)')].concat(common, [M('ToString', 'Method', 'string ToString(string format)')]);
    if (o instanceof Date) return [M('AddDays', 'Method', 'datetime AddDays(double value)'), M('AddHours', 'Method', 'datetime AddHours(double value)'), M('AddMinutes', 'Method', 'datetime AddMinutes(double value)'), M('AddMonths', 'Method', 'datetime AddMonths(int months)'), M('AddYears', 'Method', 'datetime AddYears(int value)')].concat(common, [M('ToLongDateString', 'Method', 'string ToLongDateString()'), M('ToShortDateString', 'Method', 'string ToShortDateString()'), M('Date', 'Property', 'datetime Date {get;}'), M('Day', 'Property', 'int Day {get;}'), M('DayOfWeek', 'Property', 'System.DayOfWeek DayOfWeek {get;}'), M('DayOfYear', 'Property', 'int DayOfYear {get;}'), M('Hour', 'Property', 'int Hour {get;}'), M('Minute', 'Property', 'int Minute {get;}'), M('Month', 'Property', 'int Month {get;}'), M('Second', 'Property', 'int Second {get;}'), M('Year', 'Property', 'int Year {get;}')]);
    if (o instanceof PSHash) return [M('Add', 'Method', 'void Add(System.Object key, System.Object value)'), M('Clear', 'Method', 'void Clear()'), M('ContainsKey', 'Method', 'bool ContainsKey(System.Object key)'), M('Remove', 'Method', 'void Remove(System.Object key)')].concat(common, [M('Count', 'Property', 'int Count {get;}'), M('Keys', 'Property', 'System.Collections.ICollection Keys {get;}'), M('Values', 'Property', 'System.Collections.ICollection Values {get;}')]);
    if (Array.isArray(o)) return membersOf(o[0]);
    const methods = Object.keys(o.__methods || {}).map((k) => M(k, 'Method', `${k}()`));
    const props = TX.psVisibleKeys(o).map((k) => M(k, o.__type === 'System.Management.Automation.PSCustomObject' ? 'NoteProperty' : 'Property', `${netType(o[k])} ${k}${o.__type === 'System.Management.Automation.PSCustomObject' ? '=' + toStr(o[k]).slice(0, 30) : ' {get;}'}`));
    return methods.concat(common, props).sort((a, b) => (a.MemberType === b.MemberType ? a.Name.localeCompare(b.Name) : a.MemberType < b.MemberType ? -1 : 1));
  }

  // ============================================================ utility
  cmdlet('Get-Random', [], { Minimum: {}, Maximum: P(0), InputObject: {}, Count: {}, SetSeed: {}, Shuffle: SW }, async (p, input) => {
    let pool = p.InputObject !== undefined ? unroll(p.InputObject) : input && input.length ? input : null;
    if (pool) { const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, p.Shuffle ? a.length : p.Count ? toNum(p.Count) : 1); }
    const mn = p.Minimum !== undefined ? toNum(p.Minimum) : 0, mx = p.Maximum !== undefined ? toNum(p.Maximum) : 2147483647;
    if (mn >= mx) throw new PSError(`The Minimum value (${mn}) cannot be greater than or equal to the Maximum value (${mx}).`, { category: 'InvalidArgument' });
    const isInt = Number.isInteger(mn) && Number.isInteger(mx);
    const n = p.Count ? toNum(p.Count) : 1;
    return Array.from({ length: n }, () => (isInt ? mn + Math.floor(Math.random() * (mx - mn)) : mn + Math.random() * (mx - mn)));
  });
  cmdlet('Get-Date', ['date'], { Date: P(0), Format: {}, UFormat: {}, Year: {}, Month: {}, Day: {}, Hour: {}, Minute: {}, Second: {}, DisplayHint: {} }, async (p) => {
    let d = p.Date !== undefined ? (p.Date instanceof Date ? new Date(p.Date) : new Date(toStr(p.Date))) : new Date();
    if (isNaN(d)) throw new PSError(`Cannot bind parameter 'Date'. Cannot convert value "${toStr(p.Date)}" to type "System.DateTime".`, { category: 'InvalidArgument' });
    if (p.Year !== undefined) d.setFullYear(toNum(p.Year)); if (p.Month !== undefined) d.setMonth(toNum(p.Month) - 1); if (p.Day !== undefined) d.setDate(toNum(p.Day));
    if (p.Hour !== undefined) d.setHours(toNum(p.Hour)); if (p.Minute !== undefined) d.setMinutes(toNum(p.Minute)); if (p.Second !== undefined) d.setSeconds(toNum(p.Second));
    if (p.Format !== undefined) return [TX.psFmtDate(d, toStr(p.Format))];
    if (p.UFormat !== undefined) { const f = toStr(p.UFormat); return [f.replace(/%([a-zA-Z%])/g, (_, k) => ({ Y: d.getFullYear(), y: String(d.getFullYear()).slice(2), m: TX.p2(d.getMonth() + 1), d: TX.p2(d.getDate()), H: TX.p2(d.getHours()), M: TX.p2(d.getMinutes()), S: TX.p2(d.getSeconds()), A: TX.DAYS[d.getDay()], a: TX.DAY[d.getDay()], B: TX.MONTHS[d.getMonth()], b: TX.MON[d.getMonth()], j: String(Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)).padStart(3, '0'), s: Math.floor(d / 1000), Z: '-04', p: d.getHours() >= 12 ? 'PM' : 'AM', '%': '%' }[k] ?? '%' + k))]; }
    if (p.DisplayHint && /date/i.test(toStr(p.DisplayHint))) return [TX.psFmtDate(d, 'D')];
    return [d];
  });
  cmdlet('Get-Uptime', [], { Since: SW }, async (p, input, ctx) => [p.Since ? new Date(ctx.rt.shell.m.boot) : TX.psTimeSpan(Date.now() - ctx.rt.shell.m.boot)]);
  VIEWS['System.TimeSpan'] = { list: ['Days', 'Hours', 'Minutes', 'Seconds', 'Milliseconds', 'Ticks', 'TotalDays', 'TotalHours', 'TotalMinutes', 'TotalSeconds', 'TotalMilliseconds'] };
  cmdlet('New-TimeSpan', [], { Start: P(0), End: P(1), Days: {}, Hours: {}, Minutes: {}, Seconds: {} }, async (p) => {
    if (p.Start !== undefined || p.End !== undefined) { const s = p.Start !== undefined ? new Date(p.Start instanceof Date ? p.Start : toStr(p.Start)) : new Date(); const e = p.End !== undefined ? new Date(p.End instanceof Date ? p.End : toStr(p.End)) : new Date(); return [TX.psTimeSpan(e - s)]; }
    return [TX.psTimeSpan(((toNum(p.Days || 0) * 24 + toNum(p.Hours || 0)) * 60 + toNum(p.Minutes || 0)) * 60000 + toNum(p.Seconds || 0) * 1000)];
  });
  cmdlet('Start-Sleep', ['sleep'], { Seconds: P(0, { alias: ['s'] }), Milliseconds: { alias: ['ms'] } }, async (p, input, ctx) => { const ms = p.Milliseconds !== undefined ? toNum(p.Milliseconds) : toNum(p.Seconds || 0) * 1000; await TX.sleep(Math.min(ms, 600000), ctx.rt.term.signal); return []; });
  cmdlet('Measure-Command', [], { Expression: P(0) }, async (p, input, ctx) => { const t0 = performance.now(); if (p.Expression instanceof PSScriptBlock) await ctx.rt.invokeBlockAsync(p.Expression, [], null); return [TX.psTimeSpan(performance.now() - t0)]; });
  cmdlet('New-Guid', [], {}, async () => { const h = TX.sha1(String(Math.random()) + Date.now()); return [{ __type: 'System.Guid', Guid: `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`, __toString() { return this.Guid; } }]; });
  cmdlet('Get-Culture', [], {}, async () => [{ __type: 'System.Globalization.CultureInfo', LCID: 1033, Name: 'en-US', DisplayName: 'English (United States)' }]);
  cmdlet('Get-TimeZone', [], {}, async () => [{ __type: 'System.TimeZoneInfo', Id: 'Eastern Standard Time', DisplayName: '(UTC-05:00) Eastern Time (US & Canada)', StandardName: 'Eastern Standard Time', DaylightName: 'Eastern Daylight Time', BaseUtcOffset: '-05:00:00', SupportsDaylightSavingTime: true }]);
  cmdlet('Get-Host', [], {}, async (p, i, ctx) => [ctx.rt.getVar('Host')]);
  cmdlet('Get-Clipboard', ['gcb'], { Raw: SW }, async () => { let t = TX.clip || ''; try { t = await navigator.clipboard.readText(); } catch (e) { /* ignore */ } return TX.splitLines(t); });
  cmdlet('Set-Clipboard', ['scb'], { Value: P(0), Append: SW }, async (p, input, ctx) => { const v = (p.Value !== undefined ? unroll(p.Value) : input || []).map((x) => toStr(x, ctx.rt)).join('\n'); TX.clip = v; try { await navigator.clipboard.writeText(v); } catch (e) { /* ignore */ } return []; });
  cmdlet('Get-ExecutionPolicy', [], { List: SW, Scope: {} }, async (p, input, ctx) => (p.List ? [['MachinePolicy', 'Undefined'], ['UserPolicy', 'Undefined'], ['Process', 'Undefined'], ['CurrentUser', ctx.rt.shell.execPolicy === 'Restricted' ? 'Undefined' : ctx.rt.shell.execPolicy], ['LocalMachine', ctx.rt.pwsh ? 'RemoteSigned' : 'Restricted']].map(([s, e]) => ({ __type: 'ExecPolicy', Scope: s, ExecutionPolicy: e })) : [ctx.rt.shell.execPolicy]));
  cmdlet('Set-ExecutionPolicy', [], { ExecutionPolicy: P(0), Scope: {}, Force: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const pol = toStr(p.ExecutionPolicy);
    if (!p.Force) {
      ctx.rt.host(`\nExecution Policy Change\nThe execution policy helps protect you from scripts that you do not trust. Changing the execution policy might expose\nyou to the security risks described in the about_Execution_Policies help topic at\nhttps:/go.microsoft.com/fwlink/?LinkID=135170. Do you want to change the execution policy?\n`);
      const ans = await sh.readLine('[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"): ');
      if (!/^[ya]/i.test(ans)) return [];
    }
    if (!sh.isAdmin && !/currentuser|process/i.test(toStr(p.Scope || ''))) { ctx.error(`Access to the registry key 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\PowerShell\\1\\ShellIds\\Microsoft.PowerShell' is denied. To change the execution policy for the default (LocalMachine) scope, start PowerShell with the "Run as administrator" option. To change the execution policy for the current user, run "Set-ExecutionPolicy -Scope CurrentUser".`, { category: 'PermissionDenied', id: 'System.UnauthorizedAccessException,Microsoft.PowerShell.Commands.SetExecutionPolicyCommand' }); return []; }
    TX.psExecPolicy = sh.execPolicy = pol;
    return [];
  });
  cmdlet('Get-Verb', [], { Verb: P(0) }, async () => [['Add', 'a', 'Common'], ['Clear', 'cl', 'Common'], ['Copy', 'cp', 'Common'], ['Get', 'g', 'Common'], ['Move', 'm', 'Common'], ['New', 'n', 'Common'], ['Remove', 'r', 'Common'], ['Rename', 'rn', 'Common'], ['Select', 'sc', 'Common'], ['Set', 's', 'Common'], ['Start', 'sa', 'Lifecycle'], ['Stop', 'sp', 'Lifecycle'], ['Test', 't', 'Diagnostic'], ['Invoke', 'i', 'Lifecycle'], ['Out', 'o', 'Data'], ['Export', 'ep', 'Data'], ['Import', 'ip', 'Data'], ['ConvertTo', 'ct', 'Data'], ['ConvertFrom', 'cf', 'Data'], ['Write', 'wr', 'Communications'], ['Read', 'rd', 'Communications']].map(([v, a, g]) => ({ __type: 'System.Management.Automation.VerbInfo', Verb: v, AliasPrefix: a, Group: g, Description: `${v} verb` })));
  VIEWS['System.Management.Automation.VerbInfo'] = { table: [{ label: 'Verb', name: 'Verb' }, { label: 'AliasPrefix', name: 'AliasPrefix' }, { label: 'Group', name: 'Group' }, { label: 'Description', name: 'Description' }] };
  cmdlet('Get-Module', ['gmo'], { Name: P(0), ListAvailable: SW }, async (p, input, ctx) => [['Microsoft.PowerShell.Management', '7.0.0.0'], ['Microsoft.PowerShell.Utility', '7.0.0.0'], ['PSReadLine', '2.3.5'], ['NetTCPIP', '1.0.0.0'], ['Storage', '2.0.0.0']].map(([n, v]) => ({ __type: 'System.Management.Automation.PSModuleInfo', ModuleType: n === 'PSReadLine' ? 'Script' : 'Manifest', Version: v, PreRelease: '', Name: n, ExportedCommands: '{...}' })));
  VIEWS['System.Management.Automation.PSModuleInfo'] = { table: [{ label: 'ModuleType', name: 'ModuleType' }, { label: 'Version', name: 'Version' }, { label: 'PreRelease', name: 'PreRelease' }, { label: 'Name', name: 'Name' }, { label: 'ExportedCommands', name: 'ExportedCommands' }] };
  cmdlet('Import-Module', ['ipmo'], { Name: P(0) }, async () => []);
  cmdlet('Install-Module', [], { Name: P(0), Scope: {}, Force: SW }, async (p, input, ctx) => {
    ctx.rt.host(`\nUntrusted repository\nYou are installing the modules from an untrusted repository. If you trust this repository, change its InstallationPolicy value by running the Set-PSRepository cmdlet. Are you sure you want to install the modules from 'PSGallery'?\n`);
    const ans = p.Force ? 'y' : await ctx.rt.shell.readLine('[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"): ');
    if (!/^[ya]/i.test(ans)) return [];
    for (let i = 0; i <= 100; i += 25) { ctx.rt.host(`\r\x1b[36mInstalling package '${toStr(p.Name)}'\x1b[0m [${'o'.repeat(i / 5).padEnd(20)}]`); await TX.sleep(150); }
    ctx.rt.host('\r\x1b[2K');
    return [];
  });
  cmdlet('Get-History', ['h', 'history', 'ghy'], { Count: P(0) }, async (p, input, ctx) => {
    const H = ctx.rt.shell.history;
    const start = p.Count !== undefined ? Math.max(0, H.length - toNum(p.Count) - 1) : 0;
    return H.slice(start, H.length - 1).map((c, i) => ({ __type: 'Microsoft.PowerShell.Commands.HistoryInfo', Id: start + i + 1, Duration: '0.' + String(TX.randInt(10, 900)).padStart(3, '0'), CommandLine: c }));
  });
  VIEWS['Microsoft.PowerShell.Commands.HistoryInfo'] = { table: (rt) => (rt.pwsh ? [{ label: 'Id', name: 'Id', align: 'right' }, { label: 'Duration', name: 'Duration', align: 'right' }, { label: 'CommandLine', name: 'CommandLine' }] : [{ label: 'Id', name: 'Id', align: 'right' }, { label: 'CommandLine', name: 'CommandLine' }]) };
  cmdlet('Clear-History', ['clhy'], {}, async (p, input, ctx) => { ctx.rt.shell.history.length = 0; return []; });
  cmdlet('Invoke-History', ['r', 'ihy'], { Id: P(0) }, async (p, input, ctx) => {
    const H = ctx.rt.shell.history;
    const cmd = p.Id !== undefined ? H[toNum(p.Id) - 1] : H[H.length - 2];
    if (!cmd) throw new PSError('Cannot locate history.');
    ctx.rt.host(cmd + '\n');
    return ctx.rt.shell.evaluate(cmd);
  });

  // ============================================================ commands, help, aliases, variables
  function aliasInfo(k, target) { return { __type: 'System.Management.Automation.AliasInfo', CommandType: 'Alias', Name: `${k} -> ${target}`, Version: '', Source: '', Definition: target, __name: k }; }
  VIEWS['System.Management.Automation.AliasInfo'] = { table: [{ label: 'CommandType', name: 'CommandType', width: 11 }, { label: 'Name', name: 'Name' }, { label: 'Version', name: 'Version' }, { label: 'Source', name: 'Source' }] };
  VIEWS['System.Management.Automation.CmdletInfo'] = VIEWS['System.Management.Automation.AliasInfo'];
  VIEWS['System.Management.Automation.ApplicationInfo'] = VIEWS['System.Management.Automation.AliasInfo'];
  VIEWS['System.Management.Automation.FunctionInfo'] = VIEWS['System.Management.Automation.AliasInfo'];
  cmdlet('Get-Alias', ['gal'], { Name: P(0), Definition: {} }, async (p, input, ctx) => {
    const re = p.Name !== undefined ? TX.likeToRegex(toStr(p.Name)) : null;
    const def = p.Definition !== undefined ? TX.likeToRegex(toStr(p.Definition)) : null;
    const all = Object.assign({}, ALIASES); ctx.rt.aliases.forEach((v, k) => { all[k] = v; });
    if (ctx.rt.pwsh) TX.psAliasesRemoved7.forEach((k) => delete all[k]);
    const out = Object.keys(all).sort().filter((k) => (!re || re.test(k)) && (!def || def.test(all[k]))).map((k) => aliasInfo(k, all[k]));
    if (re && !TX.hasGlob(toStr(p.Name)) && !out.length) ctx.error(`This command cannot find a matching alias because an alias with the name '${toStr(p.Name)}' does not exist.`, { category: 'ObjectNotFound', id: 'ItemNotFoundException' });
    return out;
  });
  cmdlet('Set-Alias', ['sal'], { Name: P(0), Value: P(1) }, async (p, input, ctx) => { ctx.rt.aliases.set(toStr(p.Name).toLowerCase(), toStr(p.Value)); return []; });
  cmdlet('New-Alias', ['nal'], { Name: P(0), Value: P(1) }, async (p, input, ctx) => { ctx.rt.aliases.set(toStr(p.Name).toLowerCase(), toStr(p.Value)); return []; });
  cmdlet('Get-Command', ['gcm'], { Name: P(0), Verb: {}, Noun: {}, CommandType: {}, Module: {} }, async (p, input, ctx) => {
    const out = [];
    const names = p.Name !== undefined ? unroll(p.Name).map((x) => toStr(x)) : ['*'];
    const vre = p.Verb ? TX.likeToRegex(toStr(p.Verb)) : null, nre = p.Noun ? TX.likeToRegex(toStr(p.Noun)) : null;
    for (const nm of names) {
      const re = TX.likeToRegex(nm);
      const exact = !TX.hasGlob(nm);
      const before = out.length;
      if (!p.Verb && !p.Noun && (p.CommandType === undefined || /alias/i.test(toStr(p.CommandType)))) Object.keys(ALIASES).filter((k) => re.test(k) && (!exact || true)).forEach((k) => { if (!ctx.rt.pwsh || !TX.psAliasesRemoved7.includes(k)) out.push(aliasInfo(k, ALIASES[k])); });
      [...ctx.rt.functions.values()].filter((f) => re.test(f.name)).forEach((f) => out.push({ __type: 'System.Management.Automation.FunctionInfo', CommandType: 'Function', Name: f.name, Version: '', Source: '' }));
      Object.values(CMDLETS).filter((c) => re.test(c.name) && (!vre || vre.test(c.name.split('-')[0])) && (!nre || nre.test(c.name.split('-').slice(1).join('-')))).forEach((c) => out.push({ __type: 'System.Management.Automation.CmdletInfo', CommandType: c.kind || 'Cmdlet', Name: c.name, Version: c.kind ? '' : ctx.rt.pwsh ? '7.0.0.0' : '3.1.0.0', Source: c.kind ? '' : moduleOf(c.name) }));
      if (!p.Verb && !p.Noun) Object.keys(TX.winExe).concat(['git', 'curl', 'tar', 'ssh', 'wsl']).filter((k) => re.test(k) || re.test(k + '.exe')).forEach((k) => out.push({ __type: 'System.Management.Automation.ApplicationInfo', CommandType: 'Application', Name: k + '.exe', Version: '10.0.22621.1', Source: k === 'git' ? 'C:\\Program Files\\Git\\cmd\\git.exe' : 'C:\\Windows\\system32\\' + k + '.exe' }));
      if (exact && out.length === before) ctx.error(`The term '${nm}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`, { category: 'ObjectNotFound', id: 'CommandNotFoundException' });
      if (exact && out.length > before + 1) out.splice(before + 1);
    }
    return out.sort((a, b) => (a.CommandType === 'Alias' ? 0 : a.CommandType === 'Function' ? 1 : a.CommandType === 'Cmdlet' ? 2 : 3) - (b.CommandType === 'Alias' ? 0 : b.CommandType === 'Function' ? 1 : b.CommandType === 'Cmdlet' ? 2 : 3) || a.Name.localeCompare(b.Name));
  });
  function moduleOf(n) {
    if (/Item|Location|Content|ChildItem|Path|Process|Service|Computer|Clipboard/.test(n)) return 'Microsoft.PowerShell.Management';
    if (/Net|DnsName|Connection/.test(n)) return /Connection$/.test(n) && n.startsWith('Test-Connection') ? 'Microsoft.PowerShell.Management' : 'NetTCPIP';
    if (/Disk|Volume|Partition/.test(n)) return 'Storage';
    if (/Local/.test(n)) return 'Microsoft.PowerShell.LocalAccounts';
    if (/Cim/.test(n)) return 'CimCmdlets';
    return 'Microsoft.PowerShell.Utility';
  }
  cmdlet('Get-Help', ['help', 'man'], { Name: P(0), Examples: SW, Detailed: SW, Full: SW, Online: SW, Parameter: {} }, async (p, input, ctx) => {
    const name = p.Name !== undefined ? toStr(p.Name) : null;
    const text = TX.docs.psHelp(name, ctx.rt, { examples: p.Examples, full: p.Full || p.Detailed });
    if (p.Online) { ctx.rt.host(C.dim('(TerminalEX) The online help would open in your browser.') + '\n'); }
    if (ctx.flags.streamToHost && ctx.rt.term && text.split('\n').length > ctx.rt.term.rows) { await TX.apps.pager(ctx.rt.term, text, '-- More --  (space: next page, q: quit)'); return []; }
    return [{ __format: true, text }];
  });
  cmdlet('Update-Help', [], {}, async (p, input, ctx) => { ctx.rt.host(C.dim('(TerminalEX) Help is already up to date.') + '\n'); return []; });
  cmdlet('Get-Variable', ['gv'], { Name: P(0), ValueOnly: SW }, async (p, input, ctx) => {
    const re = p.Name !== undefined ? TX.likeToRegex(toStr(p.Name)) : null;
    const vars = ctx.rt.allVars().filter((v) => !re || re.test(v.name)).sort((a, b) => a.name.localeCompare(b.name));
    if (re && !TX.hasGlob(toStr(p.Name)) && !vars.length) ctx.error(`Cannot find a variable with the name '${toStr(p.Name)}'.`, { category: 'ObjectNotFound', id: 'VariableNotFound' });
    return p.ValueOnly ? vars.map((v) => v.value) : vars.map((v) => ({ __type: 'System.Management.Automation.PSVariable', Name: v.name, Value: v.value }));
  });
  cmdlet('Set-Variable', ['set'], { Name: P(0), Value: P(1), Scope: {}, Option: {} }, async (p, input, ctx) => { ctx.rt.setVar(toStr(p.Name), p.Value !== undefined ? p.Value : collapse(input || [])); return []; });
  cmdlet('New-Variable', ['nv'], { Name: P(0), Value: P(1), Option: {} }, async (p, input, ctx) => { if (ctx.rt.hasVar(toStr(p.Name))) { ctx.error(`A variable with name '${toStr(p.Name)}' already exists.`, { category: 'ResourceExists' }); return []; } ctx.rt.setVar(toStr(p.Name), p.Value === undefined ? null : p.Value); return []; });
  cmdlet('Remove-Variable', ['rv'], { Name: P(0) }, async (p, input, ctx) => { unroll(p.Name).forEach((n) => { if (!ctx.rt.removeVar(toStr(n))) ctx.error(`Cannot find a variable with the name '${toStr(n)}'.`, { category: 'ObjectNotFound' }); }); return []; });
  cmdlet('Clear-Variable', ['clv'], { Name: P(0) }, async (p, input, ctx) => { unroll(p.Name).forEach((n) => ctx.rt.setVar(toStr(n), null)); return []; });
  cmdlet('Invoke-Expression', ['iex'], { Command: P(0) }, async (p, input, ctx) => ctx.rt.shell.evaluate(toStr(p.Command !== undefined ? p.Command : (input || []).join('\n'))));
  cmdlet('Invoke-Command', ['icm'], { ScriptBlock: P(0), ComputerName: {}, ArgumentList: {} }, async (p, input, ctx) => (p.ScriptBlock instanceof PSScriptBlock ? ctx.rt.invokeBlockAsync(p.ScriptBlock, unroll(p.ArgumentList), null) : []));
  cmdlet('Start-Transcript', [], { Path: P(0) }, async (p, input, ctx) => { const path = toStr(p.Path || 'C:\\Users\\student\\Documents\\PowerShell_transcript.txt'); ctx.rt.host(`Transcript started, output file is ${path}\n`); return []; });
  cmdlet('Stop-Transcript', [], {}, async (p, input, ctx) => { ctx.rt.host('Transcript stopped, output file is C:\\Users\\student\\Documents\\PowerShell_transcript.txt\n'); return []; });

  // ============================================================ processes & services
  function procObj(pr, m) {
    const cpu = Math.round(((pr.cpu || 0) * 3.7 + (pr.pid % 17) * 0.13) * 100) / 100;
    return { __type: 'System.Diagnostics.Process', Handles: pr.handles || 100 + (pr.pid % 900), NPM: Math.round((pr.rss || 0) / 200) + 5, PM: (pr.rss || 1000) * 1024 * 0.8, WS: (pr.rss || 1000) * 1024, CPU: cpu, Id: pr.pid, SI: pr.session === 'Services' ? 0 : 1, ProcessName: pr.name, Name: pr.name, Path: pr.session === 'Services' ? null : `C:\\Program Files\\${pr.name}\\${pr.name}.exe`, Company: pr.session === 'Services' ? 'Microsoft Corporation' : pr.desc ? 'Microsoft Corporation' : null, Description: pr.desc || pr.name, StartTime: new Date(m.boot + (pr.pid % 400) * 60000), Responding: true, __pr: pr };
  }
  VIEWS['System.Diagnostics.Process'] = {
    custom(items, rt) {
      const hdr = (s) => (rt.pwsh ? '\x1b[32;1m' + s + '\x1b[0m' : s);
      if (rt.pwsh) {
        const lines = [hdr(' NPM(K)    PM(M)      WS(M)     CPU(s)      Id  SI ProcessName'), hdr(' ------    -----      -----     ------      --  -- -----------')];
        items.forEach((o) => lines.push(`${String(o.NPM).padStart(7)} ${(o.PM / 1048576).toFixed(2).padStart(8)} ${(o.WS / 1048576).toFixed(2).padStart(10)} ${o.CPU.toFixed(2).padStart(10)} ${String(o.Id).padStart(7)} ${String(o.SI).padStart(3)} ${o.ProcessName}`));
        return lines.join('\n');
      }
      const lines = [hdr('Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName'), hdr('-------  ------    -----      -----     ------     --  -- -----------')];
      items.forEach((o) => lines.push(`${String(o.Handles).padStart(7)} ${String(o.NPM).padStart(7)} ${String(Math.round(o.PM / 1024)).padStart(8)} ${String(Math.round(o.WS / 1024)).padStart(10)} ${o.CPU.toFixed(2).padStart(10)} ${String(o.Id).padStart(6)} ${String(o.SI).padStart(3)} ${o.ProcessName}`));
      return lines.join('\n');
    },
    list: ['Id', 'Handles', 'CPU', 'SI', 'Name'],
  };
  cmdlet('Get-Process', ['ps', 'gps'], { Name: P(0, { alias: ['ProcessName'] }), Id: {}, IncludeUserName: SW }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    let list = m.procs.slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.pid - b.pid);
    if (p.Id !== undefined) { const ids = unroll(p.Id).map((x) => toNum(x)); const out = []; ids.forEach((id) => { const pr = list.find((x) => x.pid === id); if (pr) out.push(procObj(pr, m)); else ctx.error(`Cannot find a process with the process identifier ${id}.`, { category: 'ObjectNotFound', id: 'NoProcessFoundForGivenId' }); }); return out; }
    if (p.Name !== undefined) {
      const out = [];
      unroll(p.Name).forEach((n) => { const re = TX.likeToRegex(toStr(n)); const hits = list.filter((x) => re.test(x.name)); if (!hits.length && !TX.hasGlob(toStr(n))) ctx.error(`Cannot find a process with the name "${toStr(n)}". Verify the process name and call the cmdlet again.`, { category: 'ObjectNotFound', id: 'NoProcessFoundForGivenName', target: toStr(n) }); hits.forEach((h) => out.push(procObj(h, m))); });
      return out;
    }
    return list.map((x) => procObj(x, m));
  });
  cmdlet('Stop-Process', ['kill', 'spps'], { Id: P(0), Name: {}, Force: SW, PassThru: SW }, async (p, input, ctx) => {
    const sh = ctx.rt.shell, m = sh.m;
    let targets = [];
    if (input && input.length) targets = input.map((o) => o.__pr || m.procs.find((x) => x.pid === toNum(getM(o, 'Id')))).filter(Boolean);
    if (p.Id !== undefined) unroll(p.Id).forEach((id) => { const pr = m.procs.find((x) => x.pid === toNum(id)); if (pr) targets.push(pr); else ctx.error(`Cannot find a process with the process identifier ${toNum(id)}.`, { category: 'ObjectNotFound', id: 'NoProcessFoundForGivenId' }); });
    if (p.Name !== undefined) unroll(p.Name).forEach((n) => { const re = TX.likeToRegex(toStr(n)); const hits = m.procs.filter((x) => re.test(x.name)); if (!hits.length) ctx.error(`Cannot find a process with the name "${toStr(n)}". Verify the process name and call the cmdlet again.`, { category: 'ObjectNotFound', id: 'NoProcessFoundForGivenName' }); targets.push(...hits); });
    for (const pr of targets) {
      if (ctx.whatIf('Stop-Process', `${pr.name} (${pr.pid})`)) continue;
      if ((pr.session === 'Services' && !sh.isAdmin) || pr.pid <= 4) { ctx.error(`Cannot stop process "${pr.name} (${pr.pid})" because of the following error: Access is denied.`, { category: 'CloseError', id: 'CouldNotStopProcess' }); continue; }
      m.kill(pr.pid);
    }
    return [];
  });
  cmdlet('Start-Process', ['start', 'saps'], { FilePath: P(0), ArgumentList: P(1), Verb: {}, Wait: SW, NoNewWindow: SW, PassThru: SW, WindowStyle: {} }, async (p, input, ctx) => {
    const f = toStr(p.FilePath).toLowerCase().replace(/\.exe$/, '');
    const admin = p.Verb && /runas/i.test(toStr(p.Verb));
    if (['powershell', 'pwsh', 'cmd', 'wt'].includes(f)) {
      if (admin) ctx.rt.host(C.dim('(A User Account Control prompt would appear here. TerminalEX clicked "Yes" for you.)') + '\n');
      TX.app.newTab(f === 'cmd' ? 'cmd' : f === 'pwsh' ? 'pwsh' : 'powershell', { admin });
      return [];
    }
    if (f === 'notepad') { await TX.apps.nano(ctx.rt.term, ctx.rt.shell.vfs, p.ArgumentList ? ctx.rt.shell.resolve(toStr(unroll(p.ArgumentList)[0])) : null, { user: ctx.rt.shell.fsUser(), name: p.ArgumentList ? toStr(unroll(p.ArgumentList)[0]) : null, notepad: true }); return []; }
    if (/^https?:/.test(toStr(p.FilePath))) { try { window.open(toStr(p.FilePath), '_blank', 'noopener'); } catch (e) { /* blocked */ } return []; }
    const proc = ctx.rt.shell.m.spawn(toStr(p.FilePath).replace(/\.exe$/i, ''), { session: 'Console' });
    if (TX.app) TX.app.toast(`(pretend) Started ${toStr(p.FilePath)}${admin ? ' as Administrator' : ''} (PID ${proc.pid})`);
    return p.PassThru ? [procObj(proc, ctx.rt.shell.m)] : [];
  });
  cmdlet('Wait-Process', [], { Name: P(0), Id: {} }, async () => []);
  function svcObj(s) { return { __type: 'System.ServiceProcess.ServiceController', Status: s.status, Name: s.name, DisplayName: s.display, StartType: s.startType, ServiceName: s.name, CanStop: s.status === 'Running', ServiceType: 'Win32OwnProcess', __s: s }; }
  VIEWS['System.ServiceProcess.ServiceController'] = { table: [{ label: 'Status', name: 'Status', width: 8 }, { label: 'Name', name: 'Name', width: 18 }, { label: 'DisplayName', name: 'DisplayName' }], list: ['Name', 'DisplayName', 'Status', 'StartType', 'ServiceType', 'CanStop'] };
  cmdlet('Get-Service', ['gsv'], { Name: P(0, { alias: ['ServiceName'] }), DisplayName: {} }, async (p, input, ctx) => {
    const svcs = ctx.rt.shell.m.services.slice().sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    if (p.Name !== undefined) { const out = []; unroll(p.Name).forEach((n) => { const re = TX.likeToRegex(toStr(n)); const hits = svcs.filter((s) => re.test(s.name)); if (!hits.length && !TX.hasGlob(toStr(n))) ctx.error(`Cannot find any service with service name '${toStr(n)}'.`, { category: 'ObjectNotFound', id: 'NoServiceFoundForGivenName', target: toStr(n) }); out.push(...hits.map(svcObj)); }); return out; }
    if (p.DisplayName !== undefined) { const re = TX.likeToRegex(toStr(p.DisplayName)); return svcs.filter((s) => re.test(s.display)).map(svcObj); }
    return svcs.map(svcObj);
  });
  async function svcAction(p, input, ctx, action) {
    const sh = ctx.rt.shell;
    const names = p.Name !== undefined ? unroll(p.Name).map((x) => toStr(x)) : (input || []).map((o) => toStr(getM(o, 'Name')));
    for (const n of names) {
      const s = sh.m.services.find((x) => x.name.toLowerCase() === n.toLowerCase() || x.display.toLowerCase() === n.toLowerCase());
      if (!s) { ctx.error(`Cannot find any service with service name '${n}'.`, { category: 'ObjectNotFound', id: 'NoServiceFoundForGivenName' }); continue; }
      if (ctx.whatIf(`${action}-Service`, `${s.display} (${s.name})`)) continue;
      if (!sh.isAdmin) { ctx.error(`Service '${s.display} (${s.name})' cannot be ${action === 'Stop' ? 'stopped' : 'started'} due to the following error: Cannot open ${s.name} service on computer '.'.`, { category: 'OpenError', id: `CouldNotStartService,Microsoft.PowerShell.Commands.${action}ServiceCommand` }); continue; }
      if (action === 'Restart') ctx.warn(`Waiting for service '${s.display} (${s.name})' to start...`);
      s.status = action === 'Stop' ? 'Stopped' : 'Running';
    }
    return [];
  }
  cmdlet('Start-Service', ['sasv'], { Name: P(0) }, (p, i, c) => svcAction(p, i, c, 'Start'));
  cmdlet('Stop-Service', ['spsv'], { Name: P(0), Force: SW }, (p, i, c) => svcAction(p, i, c, 'Stop'));
  cmdlet('Restart-Service', [], { Name: P(0), Force: SW }, (p, i, c) => svcAction(p, i, c, 'Restart'));
  cmdlet('Set-Service', [], { Name: P(0), StartupType: {}, Status: {} }, async (p, input, ctx) => { const sh = ctx.rt.shell; if (!sh.isAdmin) { ctx.error(`Service '${toStr(p.Name)}' cannot be configured due to the following error: Access is denied`, { category: 'PermissionDenied' }); return []; } const s = sh.m.services.find((x) => x.name.toLowerCase() === toStr(p.Name).toLowerCase()); if (s && p.StartupType) s.startType = toStr(p.StartupType); if (s && p.Status) s.status = toStr(p.Status); return []; });
  cmdlet('Stop-Computer', [], { Force: SW }, async (p, input, ctx) => { ctx.rt.host(C.dim('(TerminalEX) Nice try! The pretend PC stays on.') + '\n'); return []; });
  cmdlet('Restart-Computer', [], { Force: SW }, async (p, input, ctx) => { ctx.rt.host(C.dim('(TerminalEX) Restart skipped — the pretend PC never needs updates. ;)') + '\n'); return []; });

  // ============================================================ system information
  cmdlet('Get-ComputerInfo', ['gin'], { Property: P(0) }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m, hw = m.hw, mem = m.memory();
    const o = { __type: 'Microsoft.PowerShell.Commands.ComputerInfo', WindowsBuildLabEx: '22621.1.amd64fre.ni_release.220506-1250', WindowsCurrentVersion: '6.3', WindowsEditionId: 'Education', WindowsInstallationType: 'Client', WindowsProductName: 'Windows 10 Education', WindowsRegisteredOwner: 'student', WindowsVersion: '2009', BiosManufacturer: 'LENOVO', BiosName: 'KWCN34WW', BiosSerialNumber: 'PF4XK2ZB', CsManufacturer: 'LENOVO', CsModel: '82Y9', CsName: m.net.hostname, CsNumberOfLogicalProcessors: hw.threads, CsNumberOfProcessors: 1, CsProcessors: hw.cpu, CsTotalPhysicalMemory: hw.memTotal * 1024, CsSystemType: 'x64-based PC', CsUserName: m.net.hostname + '\\student', CsWorkgroup: 'WORKGROUP', OsName: hw.os, OsType: 'WINNT', OsVersion: hw.ver, OsBuildNumber: hw.build, OsArchitecture: '64-bit', OsLanguage: 'en-US', OsLastBootUpTime: new Date(m.boot), OsUptime: TX.psTimeSpan(Date.now() - m.boot), OsTotalVisibleMemorySize: mem.total, OsFreePhysicalMemory: mem.free, TimeZone: '(UTC-05:00) Eastern Time (US & Canada)', LogonServer: '\\\\' + m.net.hostname, PowerPlatformRole: 'Mobile' };
    if (p.Property !== undefined) { const props = unroll(p.Property).map((x) => toStr(x)); const r = { __type: 'Microsoft.PowerShell.Commands.ComputerInfo' }; Object.keys(o).forEach((k) => { if (props.some((x) => TX.likeToRegex(x).test(k))) r[k] = o[k]; }); return [r]; }
    return [o];
  });
  VIEWS['Microsoft.PowerShell.Commands.ComputerInfo'] = { list: null };
  function cim(cls, ctx) {
    const m = ctx.rt.shell.m, hw = m.hw, mem = m.memory();
    const c = cls.toLowerCase().replace(/^win32_/, '');
    const mk = (type, o) => Object.assign({ __type: 'Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_' + type }, o);
    switch (c) {
      case 'operatingsystem': return [mk('OperatingSystem', { SystemDirectory: 'C:\\Windows\\system32', Organization: '', BuildNumber: hw.build, RegisteredUser: 'student', SerialNumber: '00328-10000-00001-AA123', Version: hw.ver, Caption: hw.os, OSArchitecture: '64-bit', LastBootUpTime: new Date(m.boot), TotalVisibleMemorySize: mem.total, FreePhysicalMemory: mem.free, InstallDate: new Date(2026, 7, 1, 9, 14) })];
      case 'logicaldisk': { const out = []; m.disks.forEach((d) => d.parts.forEach((pp) => { if (pp.letter) out.push(mk('LogicalDisk', { DeviceID: pp.letter + ':', DriveType: pp.removable ? 2 : 3, ProviderName: '', VolumeName: pp.label, Size: Math.round(pp.size), FreeSpace: Math.round(pp.size - pp.used), FileSystem: pp.fs })); })); return out; }
      case 'processor': return [mk('Processor', { DeviceID: 'CPU0', Name: hw.cpu, Caption: 'AMD64 Family 25 Model 116 Stepping 1', MaxClockSpeed: hw.mhz, SocketDesignation: 'FP7', NumberOfCores: hw.cores, NumberOfLogicalProcessors: hw.threads, LoadPercentage: TX.randInt(2, 25) })];
      case 'bios': return [mk('BIOS', { SMBIOSBIOSVersion: 'KWCN34WW', Manufacturer: 'LENOVO', Name: 'KWCN34WW', SerialNumber: 'PF4XK2ZB', Version: 'LENOVO - 1340' })];
      case 'computersystem': return [mk('ComputerSystem', { Name: m.net.hostname, PrimaryOwnerName: 'student', Domain: 'WORKGROUP', TotalPhysicalMemory: hw.memTotal * 1024, Model: '82Y9', Manufacturer: 'LENOVO', UserName: m.net.hostname + '\\student' })];
      case 'diskdrive': return m.disks.map((d) => mk('DiskDrive', { DeviceID: '\\\\.\\PHYSICALDRIVE' + d.num, Caption: d.model, Partitions: d.parts.length, Size: Math.round(d.size), Model: d.model, InterfaceType: d.bus === 'USB' ? 'USB' : 'SCSI', MediaType: d.media === 'Removable' ? 'Removable Media' : 'Fixed hard disk media', SerialNumber: d.serial }));
      case 'physicalmemory': return [0, 1].map((i) => mk('PhysicalMemory', { Manufacturer: 'Samsung', Banklabel: 'P0 CHANNEL ' + 'AB'[i], Configuredclockspeed: 5600, Devicelocator: 'DIMM ' + i, Capacity: 17179869184, Serialnumber: '0000000' + i }));
      case 'networkadapterconfiguration': return [mk('NetworkAdapterConfiguration', { Index: 1, IPAddress: [m.net.ip, m.net.ip6.replace(/%\d+$/, '')], DefaultIPGateway: [m.net.gw], DHCPEnabled: true, DNSServerSearchOrder: [m.net.dns], Description: 'Realtek PCIe GbE Family Controller', MACAddress: m.net.mac.replace(/-/g, ':'), ServiceName: 'rt640x64' })];
      case 'process': return m.procs.map((pr) => mk('Process', { ProcessId: pr.pid, Name: pr.name + '.exe', HandleCount: pr.handles || 200, WorkingSetSize: (pr.rss || 0) * 1024, VM: (pr.vsz || 0) * 1024 }));
      case 'service': return m.services.map((s) => mk('Service', { ProcessId: s.status === 'Running' ? TX.randInt(800, 6000) : 0, Name: s.name, StartMode: s.startType === 'Automatic' ? 'Auto' : 'Manual', State: s.status, Status: 'OK', ExitCode: 0 }));
      case 'useraccount': return m.users.map((u) => mk('UserAccount', { AccountType: 512, Caption: m.net.hostname + '\\' + u, Domain: m.net.hostname, SID: 'S-1-5-21-3623811015-3361044348-30300820-' + (u === 'Administrator' ? 500 : u === 'Guest' ? 501 : 1001), FullName: u === 'student' ? 'Student' : '', Name: u }));
      case 'videocontroller': return [mk('VideoController', { Name: hw.gpu, AdapterRAM: 536870912, DriverVersion: '31.0.24027.1012', VideoModeDescription: '2560 x 1600 x 4294967296 colors', CurrentRefreshRate: 165 })];
      case 'battery': return [mk('Battery', { Caption: 'Internal Battery', EstimatedChargeRemaining: TX.randInt(40, 100), BatteryStatus: 2, Name: 'L22M4PC0' })];
    }
    throw new PSError(`Invalid class "${cls}"`, { category: 'MetadataError', id: 'HRESULT 0x80041010,Microsoft.Management.Infrastructure.CimCmdlets.GetCimInstanceCommand' });
  }
  const cimView = (cols) => ({ table: cols.map((c) => ({ label: c, name: c })) });
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_OperatingSystem'] = cimView(['SystemDirectory', 'Organization', 'BuildNumber', 'RegisteredUser', 'SerialNumber', 'Version']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_LogicalDisk'] = cimView(['DeviceID', 'DriveType', 'ProviderName', 'VolumeName', 'Size', 'FreeSpace']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_Processor'] = cimView(['DeviceID', 'Name', 'Caption', 'MaxClockSpeed', 'SocketDesignation']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_BIOS'] = { list: ['SMBIOSBIOSVersion', 'Manufacturer', 'Name', 'SerialNumber', 'Version'] };
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_ComputerSystem'] = cimView(['Name', 'PrimaryOwnerName', 'Domain', 'TotalPhysicalMemory', 'Model', 'Manufacturer']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_DiskDrive'] = cimView(['DeviceID', 'Caption', 'Partitions', 'Size', 'Model']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_PhysicalMemory'] = cimView(['Manufacturer', 'Banklabel', 'Configuredclockspeed', 'Devicelocator', 'Capacity', 'Serialnumber']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_Process'] = cimView(['ProcessId', 'Name', 'HandleCount', 'WorkingSetSize', 'VM']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_Service'] = cimView(['ProcessId', 'Name', 'StartMode', 'State', 'Status', 'ExitCode']);
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#root/cimv2/Win32_UserAccount'] = cimView(['Name', 'Caption', 'AccountType', 'SID', 'Domain']);
  cmdlet('Get-CimInstance', ['gcim'], { ClassName: P(0, { alias: ['Class'] }), Filter: {}, Property: {}, ComputerName: {} }, async (p, input, ctx) => cim(toStr(p.ClassName), ctx));
  cmdlet('Get-WmiObject', ['gwmi'], { Class: P(0, { alias: ['ClassName'] }), Filter: {}, ComputerName: {} }, async (p, input, ctx) => { if (ctx.rt.pwsh) throw new PSError("The term 'Get-WmiObject' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.\n(Get-WmiObject was removed in PowerShell 7 — use Get-CimInstance instead.)", { category: 'ObjectNotFound' }); return cim(toStr(p.Class), ctx); });
  cmdlet('Get-HotFix', [], { Id: P(0) }, async () => [['KB5043080', 'Security Update'], ['KB5027397', 'Update'], ['KB5043937', 'Update'], ['KB5043113', 'Security Update']].map(([id, d], i) => ({ __type: 'System.Management.ManagementObject#root\\cimv2\\Win32_QuickFixEngineering', Source: 'DESKTOP-LAB42', Description: d, HotFixID: id, InstalledBy: 'NT AUTHORITY\\SYSTEM', InstalledOn: new Date(2026, 8, 10 - i * 7) })));
  VIEWS['System.Management.ManagementObject#root\\cimv2\\Win32_QuickFixEngineering'] = cimView(['Source', 'Description', 'HotFixID', 'InstalledBy', 'InstalledOn']);
  cmdlet('Get-LocalUser', ['glu'], { Name: P(0) }, async (p, input, ctx) => ctx.rt.shell.m.users.filter((u) => !p.Name || TX.likeToRegex(toStr(p.Name)).test(u)).map((u) => ({ __type: 'Microsoft.PowerShell.Commands.LocalUser', Name: u, Enabled: !['Guest', 'DefaultAccount', 'WDAGUtilityAccount', 'Administrator'].includes(u), Description: { Administrator: 'Built-in account for administering the computer/domain', Guest: 'Built-in account for guest access to the computer/domain', DefaultAccount: 'A user account managed by the system.', WDAGUtilityAccount: 'A user account managed and used by the system for Windows Defender Application Guard scenarios.' }[u] || '' })));
  VIEWS['Microsoft.PowerShell.Commands.LocalUser'] = cimView(['Name', 'Enabled', 'Description']);
  cmdlet('New-LocalUser', [], { Name: P(0), Password: {}, NoPassword: SW, FullName: {}, Description: {} }, async (p, input, ctx) => { const sh = ctx.rt.shell; if (!sh.isAdmin) { ctx.error('Access denied.', { category: 'PermissionDenied', id: 'AccessDenied,Microsoft.PowerShell.Commands.NewLocalUserCommand' }); return []; } sh.m.users.push(toStr(p.Name)); return [{ __type: 'Microsoft.PowerShell.Commands.LocalUser', Name: toStr(p.Name), Enabled: true, Description: toStr(p.Description || '') }]; });
  cmdlet('Get-LocalGroup', ['glg'], { Name: P(0) }, async () => [['Administrators', 'Administrators have complete and unrestricted access to the computer/domain'], ['Guests', 'Guests have the same access as members of the Users group by default, except for the Guest account which is further restricted'], ['Remote Desktop Users', 'Members in this group are granted the right to logon remotely'], ['Users', 'Users are prevented from making accidental or intentional system-wide changes and can run most applications']].map(([n, d]) => ({ __type: 'Microsoft.PowerShell.Commands.LocalGroup', Name: n, Description: d })));
  VIEWS['Microsoft.PowerShell.Commands.LocalGroup'] = cimView(['Name', 'Description']);
  cmdlet('Get-LocalGroupMember', ['glgm'], { Group: P(0, { alias: ['Name'] }) }, async (p, input, ctx) => (/admin/i.test(toStr(p.Group)) ? ['Administrator', 'student'] : ['student']).map((u) => ({ __type: 'Microsoft.PowerShell.Commands.LocalPrincipal', ObjectClass: 'User', Name: ctx.rt.shell.m.net.hostname + '\\' + u, PrincipalSource: 'Local' })));
  VIEWS['Microsoft.PowerShell.Commands.LocalPrincipal'] = cimView(['ObjectClass', 'Name', 'PrincipalSource']);
  cmdlet('Get-EventLog', [], { LogName: P(0), Newest: {}, EntryType: {} }, async (p, input, ctx) => {
    if (ctx.rt.pwsh) throw new PSError("The term 'Get-EventLog' is not recognized as a name of a cmdlet, function, script file, or executable program.\n(Get-EventLog was removed in PowerShell 7 — use Get-WinEvent instead.)", { category: 'ObjectNotFound' });
    return eventRows(toNum(p.Newest || 10));
  });
  cmdlet('Get-WinEvent', [], { LogName: P(0), MaxEvents: {} }, async (p) => eventRows(toNum(p.MaxEvents || 10)));
  function eventRows(n) {
    const msgs = [['Information', 'Service Control Manager', 7036, 'The Windows Update service entered the stopped state.'], ['Warning', 'DCOM', 10016, 'The application-specific permission settings do not grant Local Activation permission...'], ['Information', 'Microsoft-Windows-Kernel-General', 16, 'The access history in hive \\??\\C:\\Users\\student\\NTUSER.DAT was cleared.'], ['Error', 'Application Error', 1000, 'Faulting application name: Minecraft.exe, version: 1.21.0.0'], ['Information', 'Microsoft-Windows-Winlogon', 7001, 'User Logon Notification for Customer Experience Improvement Program'], ['Information', 'EventLog', 6013, 'The system uptime is 18342 seconds.']];
    return Array.from({ length: Math.min(n, 30) }, (_, i) => { const m2 = msgs[i % msgs.length]; return { __type: 'System.Diagnostics.EventLogEntry', Index: 9000 - i, Time: new Date(Date.now() - i * 1800000), EntryType: m2[0], Source: m2[1], InstanceID: m2[2], Message: m2[3] }; });
  }
  VIEWS['System.Diagnostics.EventLogEntry'] = { table: [{ label: 'Index', name: 'Index', align: 'right' }, { label: 'Time', name: 'Time', fmt: (v) => TX.MON[v.getMonth()] + ' ' + TX.p2(v.getDate()) + ' ' + TX.p2(v.getHours()) + ':' + TX.p2(v.getMinutes()) }, { label: 'EntryType', name: 'EntryType' }, { label: 'Source', name: 'Source' }, { label: 'InstanceID', name: 'InstanceID', align: 'right' }, { label: 'Message', name: 'Message' }] };

  // ============================================================ storage
  const gbStr = (b) => (b >= 1073741824 * 1000 ? (b / 1099511627776).toFixed(2) + ' TB' : b >= 1073741824 ? (b / 1073741824).toFixed(2).replace(/0$/, '').replace(/\.$/, '') + ' GB' : b >= 1048576 ? Math.round(b / 1048576) + ' MB' : b + ' B');
  cmdlet('Get-Volume', [], { DriveLetter: P(0), FileSystemLabel: {} }, async (p, input, ctx) => {
    const out = [];
    ctx.rt.shell.m.disks.forEach((d) => d.parts.forEach((pp) => { if (!pp.fs) return; out.push({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Volume', DriveLetter: pp.letter || null, FriendlyName: pp.label, FileSystemLabel: pp.label, FileSystemType: pp.fs, DriveType: pp.removable ? 'Removable' : 'Fixed', HealthStatus: 'Healthy', OperationalStatus: 'OK', SizeRemaining: Math.round(pp.size - (pp.used || pp.size * 0.3)), Size: Math.round(pp.size), __disk: d.num }); }));
    out.sort((a, b) => (a.DriveLetter ? 0 : 1) - (b.DriveLetter ? 0 : 1) || String(a.DriveLetter).localeCompare(String(b.DriveLetter)));
    if (p.DriveLetter !== undefined) { const L = unroll(p.DriveLetter).map((x) => toStr(x).toUpperCase().replace(':', '')); const r = out.filter((v) => L.includes(v.DriveLetter)); if (!r.length) ctx.error(`No MSFT_Volume objects found with property 'DriveLetter' equal to '${L.join(',')}'.  Verify the value of the property and retry.`, { category: 'ObjectNotFound' }); return r; }
    if (p.FileSystemLabel !== undefined) return out.filter((v) => TX.likeToRegex(toStr(p.FileSystemLabel)).test(v.FileSystemLabel));
    return out;
  });
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Volume'] = { table: [{ label: 'DriveLetter', name: 'DriveLetter' }, { label: 'FriendlyName', name: 'FriendlyName' }, { label: 'FileSystemType', name: 'FileSystemType' }, { label: 'DriveType', name: 'DriveType' }, { label: 'HealthStatus', name: 'HealthStatus' }, { label: 'OperationalStatus', name: 'OperationalStatus' }, { label: 'SizeRemaining', name: 'SizeRemaining', fmt: (v) => gbStr(v), align: 'right' }, { label: 'Size', name: 'Size', fmt: (v) => gbStr(v), align: 'right' }] };
  cmdlet('Get-Disk', [], { Number: P(0) }, async (p, input, ctx) => ctx.rt.shell.m.disks.filter((d) => p.Number === undefined || d.num === toNum(p.Number)).map((d) => ({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Disk', Number: d.num, FriendlyName: d.model, SerialNumber: d.serial, HealthStatus: d.health, OperationalStatus: 'Online', Size: Math.round(d.size), PartitionStyle: d.style, BusType: d.bus, IsBoot: d.num === 0, IsSystem: d.num === 0, NumberOfPartitions: d.parts.length })));
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Disk'] = { table: [{ label: 'Number', name: 'Number' }, { label: 'Friendly Name', name: 'FriendlyName' }, { label: 'Serial Number', name: 'SerialNumber' }, { label: 'HealthStatus', name: 'HealthStatus' }, { label: 'OperationalStatus', name: 'OperationalStatus' }, { label: 'Total Size', name: 'Size', fmt: (v) => gbStr(v), align: 'right' }, { label: 'Partition', label2: 'Style', name: 'PartitionStyle' }] };
  cmdlet('Get-PhysicalDisk', [], { FriendlyName: P(0) }, async (p, input, ctx) => ctx.rt.shell.m.disks.map((d) => ({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_PhysicalDisk', Number: d.num, FriendlyName: d.model, SerialNumber: d.serial.slice(0, 16), MediaType: d.media === 'Removable' ? 'Unspecified' : d.media, CanPool: false, OperationalStatus: 'OK', HealthStatus: d.health, Usage: 'Auto-Select', Size: Math.round(d.size), BusType: d.bus })));
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_PhysicalDisk'] = { table: [{ label: 'Number', name: 'Number' }, { label: 'FriendlyName', name: 'FriendlyName' }, { label: 'SerialNumber', name: 'SerialNumber' }, { label: 'MediaType', name: 'MediaType' }, { label: 'CanPool', name: 'CanPool' }, { label: 'OperationalStatus', name: 'OperationalStatus' }, { label: 'HealthStatus', name: 'HealthStatus' }, { label: 'Usage', name: 'Usage' }, { label: 'Size', name: 'Size', fmt: (v) => gbStr(v), align: 'right' }] };
  cmdlet('Get-Partition', [], { DiskNumber: P(0), DriveLetter: {} }, async (p, input, ctx) => {
    const out = [];
    ctx.rt.shell.m.disks.forEach((d) => { if (p.DiskNumber !== undefined && d.num !== toNum(p.DiskNumber)) return; let off = 1048576; d.parts.forEach((pp) => { if (p.DriveLetter !== undefined && toStr(p.DriveLetter).toUpperCase() !== pp.letter) return; out.push({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Partition', DiskNumber: d.num, PartitionNumber: pp.num, DriveLetter: pp.letter || null, Offset: off, Size: Math.round(pp.size), Type: pp.type === 'Primary' ? (d.style === 'GPT' ? 'Basic' : 'IFS') : pp.type, IsBoot: pp.info === 'Boot', __disk: d }); off += Math.round(pp.size); }); });
    return out;
  });
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Partition'] = { table: [{ label: 'PartitionNumber', name: 'PartitionNumber' }, { label: 'DriveLetter', name: 'DriveLetter' }, { label: 'Offset', name: 'Offset', align: 'right' }, { label: 'Size', name: 'Size', fmt: (v) => gbStr(v), align: 'right' }, { label: 'Type', name: 'Type' }], groupBy: (o) => o.DiskNumber, groupLabel: (n, rt) => `   ${rt.pwsh ? '\x1b[32;1mDiskPath: \x1b[0m' : 'DiskPath: '}\\\\?\\scsi#disk&ven_${n === 0 ? 'nvme&prod_samsung_ssd_980' : n === 1 ? 'wdc&prod_wd10ezex-08wn4a0' : 'sandisk&prod_ultra_usb_3.0'}#${n}&${TX.sha1(String(n)).slice(0, 7)}&0&000000#{53f56307-b6bf-11d0-94f2-00a0c91efb8b}` };
  cmdlet('Get-PSDrive', ['gdr'], { Name: P(0), PSProvider: {} }, async (p, input, ctx) => {
    const sh = ctx.rt.shell;
    const out = [];
    const cur = sh.cwd;
    sh.m.disks.forEach((d) => d.parts.forEach((pp) => { if (pp.letter) out.push({ __type: 'System.Management.Automation.PSDriveInfo', Name: pp.letter, Used: pp.used, Free: pp.size - pp.used, Provider: 'FileSystem', Root: pp.letter + ':\\', CurrentLocation: cur[0] === pp.letter + ':' ? cur.slice(1).join('\\') : '' }); }));
    ['Alias', 'Cert', 'Env', 'Function', 'HKCU', 'HKLM', 'Temp', 'Variable', 'WSMan'].forEach((n) => out.push({ __type: 'System.Management.Automation.PSDriveInfo', Name: n, Used: null, Free: null, Provider: n === 'Cert' ? 'Certificate' : n === 'Env' ? 'Environment' : n.startsWith('HK') ? 'Registry' : n === 'Temp' ? 'FileSystem' : n, Root: n.startsWith('HK') ? (n === 'HKCU' ? 'HKEY_CURRENT_USER' : 'HKEY_LOCAL_MACHINE') : n === 'Temp' ? 'C:\\Users\\student\\AppData\\Local\\Temp\\' : '\\', CurrentLocation: '' }));
    out.sort((a, b) => a.Name.localeCompare(b.Name));
    return out.filter((d) => (p.Name === undefined || TX.likeToRegex(toStr(p.Name)).test(d.Name)) && (p.PSProvider === undefined || TX.likeToRegex(toStr(p.PSProvider)).test(d.Provider)));
  });
  VIEWS['System.Management.Automation.PSDriveInfo'] = { table: [{ label: 'Name', name: 'Name' }, { label: 'Used (GB)', name: 'Used', fmt: (v) => (v === null || v === undefined ? '' : (v / 1073741824).toFixed(2)), align: 'right' }, { label: 'Free (GB)', name: 'Free', fmt: (v) => (v === null || v === undefined ? '' : (v / 1073741824).toFixed(2)), align: 'right' }, { label: 'Provider', name: 'Provider' }, { label: 'Root', name: 'Root' }, { label: 'CurrentLocation', name: 'CurrentLocation', align: 'right' }] };

  // ============================================================ networking
  cmdlet('Get-NetIPAddress', ['gip4'], { AddressFamily: {}, InterfaceAlias: {} }, async (p, input, ctx) => {
    const n = ctx.rt.shell.m.net;
    const rows = [[n.ip6.replace(/%\d+$/, ''), 12, 'Ethernet', 'IPv6', 64, 'WellKnown', 'Link', 'Preferred'], ['::1', 1, 'Loopback Pseudo-Interface 1', 'IPv6', 128, 'WellKnown', 'WellKnown', 'Preferred'], [n.ip, 12, 'Ethernet', 'IPv4', 24, 'Dhcp', 'Dhcp', 'Preferred'], ['169.254.113.20', 17, 'Wi-Fi', 'IPv4', 16, 'WellKnown', 'Link', 'Tentative'], ['127.0.0.1', 1, 'Loopback Pseudo-Interface 1', 'IPv4', 8, 'WellKnown', 'WellKnown', 'Preferred']];
    return rows.filter((r) => (!p.AddressFamily || toStr(p.AddressFamily).toLowerCase() === r[3].toLowerCase()) && (!p.InterfaceAlias || TX.likeToRegex(toStr(p.InterfaceAlias)).test(r[2]))).map((r) => ({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetIPAddress', IPAddress: r[0], InterfaceIndex: r[1], InterfaceAlias: r[2], AddressFamily: r[3], Type: 'Unicast', PrefixLength: r[4], PrefixOrigin: r[5], SuffixOrigin: r[6], AddressState: r[7], ValidLifetime: r[5] === 'Dhcp' ? '23:12:45' : 'Infinite ([TimeSpan]::MaxValue)', PreferredLifetime: r[5] === 'Dhcp' ? '23:12:45' : 'Infinite ([TimeSpan]::MaxValue)', SkipAsSource: false, PolicyStore: 'ActiveStore' }));
  });
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetIPAddress'] = { list: ['IPAddress', 'InterfaceIndex', 'InterfaceAlias', 'AddressFamily', 'Type', 'PrefixLength', 'PrefixOrigin', 'SuffixOrigin', 'AddressState', 'ValidLifetime', 'PreferredLifetime', 'SkipAsSource', 'PolicyStore'] };
  cmdlet('Get-NetAdapter', [], { Name: P(0), Physical: SW }, async (p, input, ctx) => {
    const n = ctx.rt.shell.m.net;
    return [['Ethernet', 'Realtek PCIe GbE Family Controller', 12, 'Up', n.mac, '1 Gbps'], ['Wi-Fi', 'Intel(R) Wi-Fi 6E AX211 160MHz', 17, 'Disconnected', '3C-A9-F4-21-7B-0E', '0 bps'], ['Bluetooth Network Connection', 'Bluetooth Device (Personal Area Network)', 9, 'Disconnected', '3C-A9-F4-21-7B-12', '3 Mbps']]
      .filter((r) => p.Name === undefined || TX.likeToRegex(toStr(p.Name)).test(r[0]))
      .map((r) => ({ __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetAdapter', Name: r[0], InterfaceDescription: r[1], ifIndex: r[2], Status: r[3], MacAddress: r[4], LinkSpeed: r[5] }));
  });
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetAdapter'] = { table: [{ label: 'Name', name: 'Name' }, { label: 'InterfaceDescription', name: 'InterfaceDescription' }, { label: 'ifIndex', name: 'ifIndex', align: 'right' }, { label: 'Status', name: 'Status' }, { label: 'MacAddress', name: 'MacAddress' }, { label: 'LinkSpeed', name: 'LinkSpeed', align: 'right' }] };
  cmdlet('Get-NetIPConfiguration', ['gip'], { Detailed: SW }, async (p, input, ctx) => {
    const n = ctx.rt.shell.m.net;
    return [{ __type: 'NetIPConfiguration', InterfaceAlias: 'Ethernet', InterfaceIndex: 12, InterfaceDescription: 'Realtek PCIe GbE Family Controller', NetProfileName: 'SchoolNet', IPv6LinkLocalAddress: n.ip6, IPv4Address: n.ip, IPv4DefaultGateway: n.gw, DNSServer: n.dns }];
  });
  VIEWS.NetIPConfiguration = { list: ['InterfaceAlias', 'InterfaceIndex', 'InterfaceDescription', 'NetProfileName', 'IPv6LinkLocalAddress', 'IPv4Address', 'IPv4DefaultGateway', 'DNSServer'] };
  cmdlet('Get-NetTCPConnection', [], { State: {}, LocalPort: {} }, async (p, input, ctx) => TX.winConns(ctx.rt.shell.m).filter((r) => r[0] === 'TCP').map((r) => { const [la, lp] = r[1].split(/:(?=\d+$)/); const [ra, rp] = r[2].split(/:(?=\d+$)/); return { __type: 'Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetTCPConnection', LocalAddress: la, LocalPort: +lp, RemoteAddress: ra, RemotePort: +rp, State: r[3] === 'LISTENING' ? 'Listen' : r[3] === 'ESTABLISHED' ? 'Established' : 'TimeWait', AppliedSetting: r[3] === 'ESTABLISHED' ? 'Internet' : '', OwningProcess: r[4] }; }).filter((o) => (!p.State || toStr(p.State).toLowerCase() === o.State.toLowerCase()) && (p.LocalPort === undefined || o.LocalPort === toNum(p.LocalPort))));
  VIEWS['Microsoft.Management.Infrastructure.CimInstance#ROOT/StandardCimv2/MSFT_NetTCPConnection'] = { table: [{ label: 'LocalAddress', name: 'LocalAddress' }, { label: 'LocalPort', name: 'LocalPort', align: 'right' }, { label: 'RemoteAddress', name: 'RemoteAddress' }, { label: 'RemotePort', name: 'RemotePort', align: 'right' }, { label: 'State', name: 'State' }, { label: 'AppliedSetting', name: 'AppliedSetting' }, { label: 'OwningProcess', name: 'OwningProcess', align: 'right' }] };
  cmdlet('Test-Connection', [], { TargetName: P(0, { alias: ['ComputerName', 'Destination'] }), Count: {}, Quiet: SW, Ping: SW, TcpPort: {}, Delay: {} }, async (p, input, ctx) => {
    const rt = ctx.rt, sh = rt.shell;
    const targets = unroll(p.TargetName).map((x) => toStr(x));
    const count = p.Count !== undefined ? toNum(p.Count) : 4;
    const out = [];
    for (const host of targets) {
      const ip = TX.resolve(host);
      if (p.TcpPort !== undefined) { const ok = !!ip && [80, 443, 22, 53].includes(toNum(p.TcpPort)); out.push(ok); continue; }
      if (!ip) { ctx.error(rt.pwsh ? `Testing connection to computer '${host}' failed: No such host is known.` : `Testing connection to computer '${host}' failed: No such host is known`, { category: 'ResourceUnavailable', id: 'TestConnectionException,Microsoft.PowerShell.Commands.TestConnectionCommand' }); if (p.Quiet) out.push(false); continue; }
      const stream = ctx.flags.streamToHost && !p.Quiet;
      if (stream && rt.pwsh) rt.host(`\n   \x1b[32;1mDestination: \x1b[0m${host}\n\n\x1b[32;1mPing Source           Address                   Latency BufferSize Status\x1b[0m\n\x1b[32;1m                                                   (ms)        (B)\x1b[0m\n\x1b[32;1m---- ------           -------                   ------- ---------- ------\x1b[0m\n`);
      else if (stream) rt.host(`\nSource        Destination     IPV4Address      IPV6Address                              Bytes    Time(ms)\n------        -----------     -----------      -----------                              -----    --------\n`);
      let okAny = false;
      try {
        for (let i = 1; i <= count; i++) {
          const rtt = Math.max(0, Math.round(TX.latency(host)));
          await TX.sleep(Math.max(rtt, 30) + (i > 1 ? 900 : 0), rt.term.signal);
          okAny = true;
          const obj = rt.pwsh ? { __type: 'Microsoft.PowerShell.Commands.TestConnectionCommand+PingStatus', Ping: i, Source: sh.m.net.hostname, Address: ip, Latency: rtt, BufferSize: 32, Status: 'Success', Destination: host } : { __type: 'System.Management.ManagementObject#root\\cimv2\\Win32_PingStatus', Source: sh.m.net.hostname, Destination: host, IPV4Address: ip, IPV6Address: '', Bytes: 32, 'Time(ms)': rtt, ResponseTime: rtt, StatusCode: 0 };
          if (stream) rt.host(rt.pwsh ? `${String(i).padStart(4)} ${sh.m.net.hostname.padEnd(16)} ${ip.padEnd(25)} ${String(rtt).padStart(7)} ${'32'.padStart(10)} Success\n` : `${sh.m.net.hostname.padEnd(13)} ${host.padEnd(15)} ${ip.padEnd(16)} ${''.padEnd(40)} ${'32'.padEnd(8)} ${rtt}\n`);
          else if (!p.Quiet) out.push(obj);
        }
      } catch (e) { if (!e.interrupt) throw e; }
      if (stream) rt.host('\n');
      if (p.Quiet) out.push(okAny);
    }
    return out;
  });
  VIEWS['Microsoft.PowerShell.Commands.TestConnectionCommand+PingStatus'] = { table: [{ label: 'Ping', name: 'Ping', align: 'right' }, { label: 'Source', name: 'Source' }, { label: 'Address', name: 'Address' }, { label: 'Latency', label2: '(ms)', name: 'Latency', align: 'right' }, { label: 'BufferSize', label2: '(B)', name: 'BufferSize', align: 'right' }, { label: 'Status', name: 'Status' }] };
  VIEWS['System.Management.ManagementObject#root\\cimv2\\Win32_PingStatus'] = { table: [{ label: 'Source', name: 'Source' }, { label: 'Destination', name: 'Destination' }, { label: 'IPV4Address', name: 'IPV4Address' }, { label: 'IPV6Address', name: 'IPV6Address' }, { label: 'Bytes', name: 'Bytes' }, { label: 'Time(ms)', name: 'Time(ms)' }] };
  cmdlet('Test-NetConnection', ['tnc'], { ComputerName: P(0), Port: P(1), InformationLevel: {}, CommonTCPPort: {}, TraceRoute: SW }, async (p, input, ctx) => {
    const rt = ctx.rt, n = rt.shell.m.net;
    const host = toStr(p.ComputerName || 'internetbeacon.msedge.net');
    const ip = TX.resolve(host) || (host === 'internetbeacon.msedge.net' ? '13.107.4.52' : null);
    const port = p.Port !== undefined ? toNum(p.Port) : p.CommonTCPPort ? { http: 80, rdp: 3389, smb: 445, winrm: 5985 }[toStr(p.CommonTCPPort).toLowerCase()] : null;
    await TX.sleep(600, rt.term.signal);
    if (!ip) { ctx.warn(`Name resolution of ${host} failed`); return [{ __type: 'TestNetConnectionResult', ComputerName: host, RemoteAddress: '', InterfaceAlias: '', SourceAddress: '', PingSucceeded: false }]; }
    if (p.InformationLevel && /quiet/i.test(toStr(p.InformationLevel))) return [port ? [80, 443, 22].includes(port) : true];
    const o = { __type: 'TestNetConnectionResult', ComputerName: host, RemoteAddress: ip };
    if (port) { o.RemotePort = port; o.InterfaceAlias = 'Ethernet'; o.SourceAddress = n.ip; o.TcpTestSucceeded = [80, 443, 22, 53].includes(port); if (!o.TcpTestSucceeded) { ctx.warn(`TCP connect to (${ip} : ${port}) failed`); } }
    else { o.InterfaceAlias = 'Ethernet'; o.SourceAddress = n.ip; o.PingSucceeded = true; o['PingReplyDetails (RTT)'] = Math.round(TX.latency(host)) + ' ms'; }
    if (p.TraceRoute) o.TraceRoute = (TX.hops(host) || []).map((h) => h[1]);
    return [o];
  });
  VIEWS.TestNetConnectionResult = { list: null };
  cmdlet('Resolve-DnsName', [], { Name: P(0), Type: P(1), Server: {} }, async (p, input, ctx) => {
    const name = toStr(p.Name);
    const recs = TX.DNS[name.toLowerCase()];
    if (!recs) { ctx.error(`${name} : DNS name does not exist`, { category: 'ResourceUnavailable', id: 'DNS_ERROR_RCODE_NAME_ERROR,Microsoft.DnsClient.Commands.ResolveDnsName' }); return []; }
    const type = p.Type ? toStr(p.Type).toUpperCase() : null;
    return recs.filter((r) => !type || (type === 'A' ? !r.includes(':') : type === 'AAAA' ? r.includes(':') : true)).map((r) => ({ __type: 'Microsoft.DnsClient.Commands.DnsRecord_A', Name: name, Type: r.includes(':') ? 'AAAA' : 'A', TTL: TX.randInt(60, 300), Section: 'Answer', IPAddress: r }));
  });
  VIEWS['Microsoft.DnsClient.Commands.DnsRecord_A'] = { table: [{ label: 'Name', name: 'Name' }, { label: 'Type', name: 'Type' }, { label: 'TTL', name: 'TTL', align: 'right' }, { label: 'Section', name: 'Section' }, { label: 'IPAddress', name: 'IPAddress' }] };
  cmdlet('Invoke-WebRequest', ['iwr', 'curl', 'wget'], { Uri: P(0), OutFile: {}, Method: {}, UseBasicParsing: SW, Headers: {}, Body: {} }, async (p, input, ctx) => {
    const url = toStr(p.Uri);
    const full = /^https?:/.test(url) ? url : 'http://' + url;
    const host = full.replace(/^https?:\/\//, '').split('/')[0];
    if (!TX.resolve(host)) throw new PSError(`No such host is known. (${host}:443)`, { category: 'NotSpecified', id: 'System.Net.Http.HttpRequestException,Microsoft.PowerShell.Commands.InvokeWebRequestCommand' });
    await TX.sleep(TX.latency(host) * 3 + 120, ctx.rt.term.signal);
    const res = TX.http(full);
    if (p.OutFile) { ctx.rt.shell.vfs.writeFile(ctx.rt.shell.resolve(toStr(p.OutFile)), res.body, { user: ctx.rt.shell.fsUser(), owner: 'student' }); return []; }
    const headers = new PSHash(); headers.set('Content-Type', res.type); headers.set('Date', new Date().toUTCString()); headers.set('Content-Length', String(res.body.length));
    return [{ __type: 'Microsoft.PowerShell.Commands.BasicHtmlWebResponseObject', StatusCode: res.status, StatusDescription: 'OK', Content: res.body, RawContent: `HTTP/1.1 200 OK\nContent-Type: ${res.type}\nContent-Length: ${res.body.length}\n\n${res.body.slice(0, 200)}...`, Headers: headers, Images: [], InputFields: [], Links: [], RawContentLength: res.body.length }];
  });
  VIEWS['Microsoft.PowerShell.Commands.BasicHtmlWebResponseObject'] = { list: ['StatusCode', 'StatusDescription', 'Content', 'RawContent', 'Headers', 'Images', 'InputFields', 'Links', 'RawContentLength'] };
  cmdlet('Invoke-RestMethod', ['irm'], { Uri: P(0), Method: {}, Headers: {}, Body: {}, OutFile: {} }, async (p, input, ctx) => {
    const r = await CMDLETS['invoke-webrequest'].fn(p, input, ctx);
    if (!r.length) return [];
    const body = r[0].Content;
    try { const v = JSON.parse(body); const conv = (x) => (Array.isArray(x) ? x.map(conv) : x && typeof x === 'object' ? Object.assign({ __type: 'System.Management.Automation.PSCustomObject' }, Object.fromEntries(Object.entries(x).map(([k, y]) => [k, conv(y)]))) : x); const c = conv(v); return Array.isArray(c) ? c : [c]; } catch (e) { return [body]; }
  });

  // ============================================================ static .NET members
  TX.psResolveTypeName = (t) => ({ int: 'System.Int32', string: 'System.String', double: 'System.Double', bool: 'System.Boolean', datetime: 'System.DateTime', math: 'System.Math', array: 'System.Array', hashtable: 'System.Collections.Hashtable', pscustomobject: 'System.Management.Automation.PSObject' }[t.toLowerCase()] || (t.includes('.') ? t : 'System.' + t));
  TX.psStatic = (type, member, args, rt) => {
    const t = type.toLowerCase().replace(/^system\./, '');
    const m = String(member).toLowerCase();
    const a = (args || []).map((x) => x);
    const num = (i) => toNum(a[i]);
    const S = {
      math: { pi: Math.PI, e: Math.E, round: () => (a.length > 1 ? Number(num(0).toFixed(num(1))) : bankers(num(0))), floor: () => Math.floor(num(0)), ceiling: () => Math.ceil(num(0)), truncate: () => Math.trunc(num(0)), sqrt: () => Math.sqrt(num(0)), pow: () => Math.pow(num(0), num(1)), abs: () => Math.abs(num(0)), max: () => Math.max(num(0), num(1)), min: () => Math.min(num(0), num(1)), log: () => (a.length > 1 ? Math.log(num(0)) / Math.log(num(1)) : Math.log(num(0))), log10: () => Math.log10(num(0)), log2: () => Math.log2(num(0)), exp: () => Math.exp(num(0)), sin: () => Math.sin(num(0)), cos: () => Math.cos(num(0)), tan: () => Math.tan(num(0)), atan: () => Math.atan(num(0)), sign: () => Math.sign(num(0)), clamp: () => Math.min(Math.max(num(0), num(1)), num(2)) },
      datetime: { now: () => new Date(), today: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, utcnow: () => new Date(Date.now() + 4 * 3600000), parse: () => new Date(toStr(a[0])), daysinmonth: () => new Date(num(0), num(1), 0).getDate(), isleapyear: () => { const y = num(0); return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; } },
      environment: { machinename: () => rt.shell.m.net.hostname, username: () => 'student', osversion: () => ({ __type: 'System.OperatingSystem', Platform: 'Win32NT', ServicePack: '', Version: '10.0.22631.0', VersionString: 'Microsoft Windows NT 10.0.22631.0', __toString() { return 'Microsoft Windows NT 10.0.22631.0'; } }), processorcount: () => rt.shell.m.hw.threads, currentdirectory: () => W.format(rt.shell.cwd), newline: '\n', is64bitoperatingsystem: true, tickcount: () => Date.now() - rt.shell.m.boot, getenvironmentvariable: () => rt.getVar('env:' + toStr(a[0])), setenvironmentvariable: () => { rt.setVar('env:' + toStr(a[0]), a[1]); }, getfolderpath: () => ({ desktop: 'C:\\Users\\student\\Desktop', mydocuments: 'C:\\Users\\student\\Documents', userprofile: 'C:\\Users\\student' }[toStr(a[0]).toLowerCase()] || 'C:\\Users\\student'), version: '8.0.8' },
      string: { empty: '', isnullorempty: () => a[0] === null || a[0] === undefined || toStr(a[0]) === '', isnullorwhitespace: () => a[0] === null || a[0] === undefined || toStr(a[0]).trim() === '', join: () => unroll(a.slice(1).length === 1 ? a[1] : a.slice(1)).map((x) => toStr(x)).join(toStr(a[0])), concat: () => a.map((x) => toStr(x)).join(''), format: () => TX.psFormat(toStr(a[0]), a.slice(1)), new: () => toStr(a[0]).repeat(num(1)) },
      int: { maxvalue: 2147483647, minvalue: -2147483648, parse: () => { const v = parseInt(toStr(a[0]), 10); if (isNaN(v)) throw new PSError(`Exception calling "Parse" with "1" argument(s): "The input string '${toStr(a[0])}' was not in a correct format."`); return v; }, tryparse: () => !isNaN(parseInt(toStr(a[0]), 10)) },
      int32: null, long: { maxvalue: 9223372036854775807, minvalue: -9223372036854775808 },
      double: { maxvalue: Number.MAX_VALUE, minvalue: -Number.MAX_VALUE, nan: NaN, parse: () => parseFloat(toStr(a[0])), positiveinfinity: Infinity },
      char: { isdigit: () => /\d/.test(toStr(a[0])), isletter: () => /[a-z]/i.test(toStr(a[0])), isupper: () => /[A-Z]/.test(toStr(a[0])), islower: () => /[a-z]/.test(toStr(a[0])), iswhitespace: () => /\s/.test(toStr(a[0])), toupper: () => toStr(a[0]).toUpperCase() },
      console: { writeline: () => { rt.host(a.length ? TX.psFormat(toStr(a[0]), a.slice(1)) + '\n' : '\n'); return undefined; }, write: () => { rt.host(toStr(a[0])); return undefined; }, readline: () => '', beep: () => { rt.term.bell(); return undefined; }, clear: () => { rt.term.clear(); return undefined; }, title: 'Windows PowerShell', windowwidth: () => rt.term.cols, windowheight: () => rt.term.rows, foregroundcolor: 'Gray', backgroundcolor: 'Black' },
      guid: { newguid: () => { const h = TX.sha1(String(Math.random())); return { __type: 'System.Guid', Guid: `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`, __toString() { return this.Guid; } }; }, empty: '00000000-0000-0000-0000-000000000000' },
      'io.path': { getextension: () => { const s = toStr(a[0]); const i = s.lastIndexOf('.'); return i > s.lastIndexOf('\\') ? s.slice(i) : ''; }, getfilename: () => toStr(a[0]).split(/[\\/]/).pop(), getfilenamewithoutextension: () => toStr(a[0]).split(/[\\/]/).pop().replace(/\.[^.]*$/, ''), getdirectoryname: () => toStr(a[0]).replace(/[\\/][^\\/]*$/, ''), combine: () => a.map((x) => toStr(x)).join('\\').replace(/\\{2,}/g, '\\'), gettemppath: () => 'C:\\Users\\student\\AppData\\Local\\Temp\\', gettempfilename: () => 'C:\\Users\\student\\AppData\\Local\\Temp\\tmp' + TX.randInt(1000, 9999).toString(16).toUpperCase() + '.tmp', directoryseparatorchar: '\\', getrandomfilename: () => TX.sha1(String(Math.random())).slice(0, 8) + '.' + TX.sha1(String(Math.random())).slice(0, 3) },
      'io.file': { exists: () => { const n = rt.shell.vfs.get(rt.shell.resolve(toStr(a[0]))); return !!n && n.t === 'f'; }, readalltext: () => rt.shell.vfs.readFile(rt.shell.resolve(toStr(a[0]))), readalllines: () => TX.splitLines(rt.shell.vfs.readFile(rt.shell.resolve(toStr(a[0])))), writealltext: () => { rt.shell.vfs.writeFile(rt.shell.resolve(toStr(a[0])), toStr(a[1]), { user: rt.shell.fsUser(), owner: 'student' }); }, appendalltext: () => { rt.shell.vfs.writeFile(rt.shell.resolve(toStr(a[0])), toStr(a[1]), { append: true, user: rt.shell.fsUser(), owner: 'student' }); } },
      'io.directory': { exists: () => { const n = rt.shell.vfs.get(rt.shell.resolve(toStr(a[0]))); return !!n && n.t === 'd'; }, getcurrentdirectory: () => W.format(rt.shell.cwd), createdirectory: () => { rt.shell.vfs.mkdir(rt.shell.resolve(toStr(a[0])), { parents: true, owner: 'student' }); } },
      'net.dns': { gethostaddresses: () => (TX.DNS[toStr(a[0]).toLowerCase()] || []).map((ip) => ({ __type: 'System.Net.IPAddress', IPAddressToString: ip, AddressFamily: ip.includes(':') ? 'InterNetworkV6' : 'InterNetwork', __toString() { return ip; } })), gethostname: () => rt.shell.m.net.hostname },
      convert: { tobase64string: () => TX.b64encode(unroll(a[0]).map((x) => (typeof x === 'number' ? String.fromCharCode(x) : toStr(x))).join('')), frombase64string: () => [...TX.b64decode(toStr(a[0]))].map((ch) => ch.charCodeAt(0)), toint32: () => (a.length > 1 ? parseInt(toStr(a[0]), num(1)) : Math.round(num(0))), tostring: () => (a.length > 1 ? (num(0) >>> 0).toString(num(1)) : toStr(a[0])), todouble: () => num(0), toboolean: () => truthy(a[0]) },
      'text.encoding': { utf8: { __type: 'System.Text.UTF8Encoding', __methods: { GetBytes(s) { return [...new TextEncoder().encode(toStr(s))]; }, GetString(b) { return new TextDecoder().decode(new Uint8Array(unroll(b).map(toNum))); } } }, ascii: { __type: 'System.Text.ASCIIEncoding', __methods: { GetBytes(s) { return [...toStr(s)].map((c) => c.charCodeAt(0) & 127); }, GetString(b) { return unroll(b).map((x) => String.fromCharCode(toNum(x))).join(''); } } } },
      'management.automation.psobject': null,
      timespan: { fromseconds: () => TX.psTimeSpan(num(0) * 1000), fromminutes: () => TX.psTimeSpan(num(0) * 60000), fromhours: () => TX.psTimeSpan(num(0) * 3600000), fromdays: () => TX.psTimeSpan(num(0) * 86400000), zero: TX.psTimeSpan(0) },
      'io.driveinfo': { getdrives: () => rt.shell.m.disks.flatMap((d) => d.parts.filter((pp) => pp.letter).map((pp) => ({ __type: 'System.IO.DriveInfo', Name: pp.letter + ':\\', DriveType: pp.removable ? 'Removable' : 'Fixed', DriveFormat: pp.fs, IsReady: true, AvailableFreeSpace: pp.size - pp.used, TotalFreeSpace: pp.size - pp.used, TotalSize: pp.size, RootDirectory: pp.letter + ':\\', VolumeLabel: pp.label }))) },
      'diagnostics.process': { getcurrentprocess: () => ({ __type: 'System.Diagnostics.Process', Id: rt.getVar('PID'), ProcessName: rt.pwsh ? 'pwsh' : 'powershell', Name: rt.pwsh ? 'pwsh' : 'powershell' }) },
      'security.principal.windowsidentity': { getcurrent: () => ({ __type: 'System.Security.Principal.WindowsIdentity', Name: rt.shell.m.net.hostname + '\\student', IsAuthenticated: true, AuthenticationType: 'NTLM' }) },
      'threading.thread': { sleep: () => undefined },
      regex: { matches: () => { const re = new RegExp(toStr(a[1]), 'g'); return [...toStr(a[0]).matchAll(re)].map((mm) => ({ __type: 'System.Text.RegularExpressions.Match', Value: mm[0], Index: mm.index, Length: mm[0].length, Success: true, __toString() { return mm[0]; } })); }, replace: () => toStr(a[0]).replace(new RegExp(toStr(a[1]), 'g'), toStr(a[2])), ismatch: () => new RegExp(toStr(a[1])).test(toStr(a[0])), escape: () => toStr(a[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), split: () => toStr(a[0]).split(new RegExp(toStr(a[1]))) },
      enum: { getnames: () => (/consolecolor/i.test(toStr(a[0] && a[0].name ? a[0].name : a[0])) ? ['Black', 'DarkBlue', 'DarkGreen', 'DarkCyan', 'DarkRed', 'DarkMagenta', 'DarkYellow', 'Gray', 'DarkGray', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Yellow', 'White'] : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) },
      consolecolor: Object.fromEntries(['Black', 'DarkBlue', 'DarkGreen', 'DarkCyan', 'DarkRed', 'DarkMagenta', 'DarkYellow', 'Gray', 'DarkGray', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Yellow', 'White'].map((c) => [c.toLowerCase(), c])),
      dayofweek: Object.fromEntries(TX.DAYS.map((d) => [d.toLowerCase(), d])),
    };
    S.int32 = S.int; S.int64 = S.long; S['management.automation.psobject'] = {};
    S['io.path'] = S['io.path']; S.path = S['io.path']; S.file = S['io.file']; S.directory = S['io.directory']; S.dns = S['net.dns'];
    const cls = S[t];
    if (!cls) throw new PSError(`Unable to find type [${type}].`, { category: 'InvalidOperation', id: 'TypeNotFound' });
    if (!(m in cls)) throw new PSError(args ? `Method invocation failed because [${TX.psResolveTypeName(type)}] does not contain a method named '${member}'.` : `The property '${member}' cannot be found on type '${TX.psResolveTypeName(type)}'.`, { category: 'InvalidOperation', id: 'MethodNotFound' });
    const v = cls[m];
    if (typeof v === 'function') return args || m !== 'pi' ? v() : v();
    return v;
  };
  function bankers(n) { const f = Math.floor(n); const d = n - f; if (d === 0.5) return f % 2 === 0 ? f : f + 1; return Math.round(n); }

  // extra aliases common in PowerShell
  Object.assign(ALIASES, { gcm: 'Get-Command', ogv: 'Out-GridView', iex: 'Invoke-Expression', icm: 'Invoke-Command', sls: 'Select-String', rvpa: 'Resolve-Path', ft: 'Format-Table', fl: 'Format-List', fw: 'Format-Wide', gm: 'Get-Member', measure: 'Measure-Object', diff: 'Compare-Object', sort: 'Sort-Object', select: 'Select-Object', where: 'Where-Object', foreach: 'ForEach-Object', sc: 'Set-Content' });

  // ============================================================ the PowerShell shell
  class PowerShell {
    constructor(session, machine, opts = {}) {
      this.session = session; this.term = session.term; this.m = machine; this.vfs = machine.vfs;
      this.kind = 'ps'; this.pwsh = !!opts.pwsh; this.name = this.pwsh ? 'pwsh' : 'powershell';
      this.isAdmin = !!opts.admin;
      this.home = machine.home.slice();
      this.cwd = opts.cwd ? opts.cwd.slice() : this.isAdmin ? ['C:', 'Windows', 'System32'] : this.home.slice();
      this.provider = null;
      this.history = session.historyFor(this.pwsh ? 'pwsh' : 'powershell');
      this.noBanner = !!opts.noBanner;
      this.execPolicy = TX.psExecPolicy || (this.pwsh ? 'RemoteSigned' : 'RemoteSigned');
      this.env = {
        ALLUSERSPROFILE: 'C:\\ProgramData', APPDATA: 'C:\\Users\\student\\AppData\\Roaming', COMPUTERNAME: machine.net.hostname, ComSpec: 'C:\\WINDOWS\\system32\\cmd.exe', HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\student', LOCALAPPDATA: 'C:\\Users\\student\\AppData\\Local', NUMBER_OF_PROCESSORS: String(machine.hw.threads), OS: 'Windows_NT',
        Path: 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Windows\\System32\\OpenSSH\\;C:\\Program Files\\Git\\cmd;C:\\Program Files\\PowerShell\\7\\;C:\\Users\\student\\AppData\\Local\\Microsoft\\WindowsApps;',
        PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL', PROCESSOR_ARCHITECTURE: 'AMD64', ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)', PSModulePath: 'C:\\Users\\student\\Documents\\WindowsPowerShell\\Modules;C:\\Program Files\\WindowsPowerShell\\Modules;C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\Modules', PUBLIC: 'C:\\Users\\Public', SystemDrive: 'C:', SystemRoot: 'C:\\WINDOWS', TEMP: 'C:\\Users\\student\\AppData\\Local\\Temp', TMP: 'C:\\Users\\student\\AppData\\Local\\Temp', USERDOMAIN: machine.net.hostname, USERNAME: 'student', USERPROFILE: 'C:\\Users\\student', windir: 'C:\\WINDOWS',
      };
      this.rt = new TX.PSRuntime(this);
    }
    fsUser() { return this.isAdmin ? '__admin' : 'student'; }
    title() { return (this.isAdmin ? 'Administrator: ' : '') + (this.pwsh ? 'PowerShell' : 'Windows PowerShell'); }
    resolve(p) {
      p = String(p).replace(/^["']|["']$/g, '');
      if (/^Microsoft\.PowerShell\.Core\\FileSystem::/i.test(p)) p = p.replace(/^Microsoft\.PowerShell\.Core\\FileSystem::/i, '');
      if (/^temp:/i.test(p)) p = p.replace(/^temp:\\?/i, 'C:\\Users\\student\\AppData\\Local\\Temp\\');
      return this.vfs.canon(W.parse(p, this.cwd, this.home));
    }
    relPath(full) { const c = W.format(this.cwd); return full.toLowerCase().startsWith(c.toLowerCase() + '\\') ? full.slice(c.length + 1) : full; }
    pathInfo(segs) {
      segs = segs || this.cwd;
      const path = this.provider ? this.provider[0].toUpperCase() + this.provider.slice(1) + ':\\' : W.format(segs);
      return { __type: 'System.Management.Automation.PathInfo', Drive: segs[0][0], Provider: 'Microsoft.PowerShell.Core\\FileSystem', ProviderPath: path, Path: path, __toString() { return path; } };
    }
    prompt() { return (this.pwsh ? '' : '') + 'PS ' + (this.provider ? this.provider[0].toUpperCase() + this.provider.slice(1) + ':\\' : W.format(this.cwd)) + '> '; }
    banner() {
      if (this.noBanner) return '';
      if (this.pwsh) return 'PowerShell 7.4.5\n' + (this.isAdmin ? '' : '') + '\n';
      return 'Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\nInstall the latest PowerShell for new features and improvements! https://aka.ms/PSWindows\n\n';
    }
    checkAbort() { if (this.term.signal.aborted) throw new TX.Interrupt(); }
    async readLine(prompt, o = {}) { const l = await this.term.readLine(Object.assign({ prompt }, o)); if (l === null) throw new TX.Interrupt(); return l; }
    async evaluate(src) { const ast = TX.psParse(src); return this.rt.execBlock(ast); }
    async exec(line, io) {
      if (!line.trim()) return 0;
      const out = io ? io.out : (s) => this.term.write(s);
      let ast;
      try { ast = TX.psParse(line); }
      catch (e) {
        if (!e.psSyntax) throw e;
        const col = (e.pos || 0) + 1;
        if (this.pwsh) out(`\x1b[31;1mParserError: \x1b[0m\n\x1b[31;1mLine |\x1b[0m\n\x1b[31;1m\x1b[0m\x1b[36;1m   1 | \x1b[0m ${line}\n\x1b[31;1m\x1b[0m\x1b[36;1m     | \x1b[31;1m ${' '.repeat(Math.max(0, col - 1))}~\x1b[0m\n\x1b[31;1m\x1b[0m\x1b[36;1m     | \x1b[31;1m${e.message}\x1b[0m\n`);
        else out(C.red(`At line:1 char:${col}\n+ ${line}\n+ ${' '.repeat(Math.max(0, col - 1))}~\n${e.message}\n    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException\n    + FullyQualifiedErrorId : ParserError`) + '\n');
        this.rt.lastOk = false;
        return 1;
      }
      const rt = this.rt;
      try {
        for (const st of ast) {
          let res;
          try {
            res = st.t === 'pipeline' ? await rt.runPipeline(st, null, { toHost: !io }) : await rt.execStatement(st);
          } catch (e) {
            if (e instanceof TX.PSSig) {
              if (e.kind === 'exit') throw new TX.ExitShell(toNum(e.value) || 0);
              if (e.kind === 'return') res = e.value || [];
              else res = [];
            } else if (e.ps || e instanceof TX.FsError) {
              rt.writeError(e instanceof TX.FsError ? TX.psFsMsg(e) : e.thrown ? e.message : e.message, { cmd: e.thrown ? '' : e.cmd || '', category: e.category, id: e.id });
              rt.lastOk = false;
              continue;
            } else throw e;
          }
          if (res && res.length) {
            const text = TX.psFormatForHost(res, rt);
            out(io ? TX.stripAnsi(text) : text);
          }
        }
      } catch (e) {
        if (e.interrupt || e.exitShell) throw e;
        console.error(e);
        rt.writeError(String(e.message || e), {});
      }
      return rt.lastOk ? 0 : 1;
    }
    highlight(line) {
      const kw = /^(if|elseif|else|foreach|for|while|do|until|switch|function|return|break|continue|exit|throw|try|catch|finally|param|in)$/i;
      const out = [];
      const re = /(#.*$)|("(?:[^"`]|`.)*"?|'[^']*'?)|(\$[\w:]+|\$\{[^}]*\}?)|(\s-[A-Za-z][\w-]*)|(\[[\w.]+\])|(\b\d+(?:\.\d+)?(?:kb|mb|gb)?\b)|([|;{}()=,])|([^\s|;{}()"'$=,]+)|(\s+)/gi;
      let m, cmdPos = true;
      while ((m = re.exec(line))) {
        if (m[1]) out.push(C.green(m[1]));
        else if (m[2]) { out.push(C.cyan(m[2])); cmdPos = false; }
        else if (m[3]) { out.push(C.brightGreen(m[3])); cmdPos = false; }
        else if (m[4]) out.push(C.gray(m[4]));
        else if (m[5]) { out.push(C.gray(m[5])); }
        else if (m[6]) { out.push(cmdPos ? C.brightYellow(m[6]) : m[6]); cmdPos = false; }
        else if (m[7]) { out.push(m[7] === '|' || m[7] === ';' || m[7] === '{' || m[7] === '(' ? C.gray(m[7]) : m[7]); if ('|;{('.includes(m[7])) cmdPos = true; }
        else if (m[8]) {
          const w = m[8];
          if (kw.test(w)) { out.push(C.green(w)); cmdPos = /^(if|elseif|foreach|while|switch|return|throw|else|try|catch|finally|do)$/i.test(w) ? false : cmdPos; continue; }
          if (cmdPos) { const ok = this.rt.resolveCommand(w) || /^[.\\/]/.test(w); out.push(ok ? C.brightYellow(w) : C.red(w)); cmdPos = false; }
          else out.push(w);
        } else out.push(m[0]);
      }
      return out.join('');
    }
    completer(buf, pos) {
      const left = buf.slice(0, pos);
      const m = /(\S*)$/.exec(left);
      const word = m[1];
      const start = pos - word.length;
      const before = left.slice(0, start).trim();
      const cmdPos = !before || /[|;({]$/.test(before);
      // variables
      if (word.startsWith('$')) {
        const w = word.slice(1).toLowerCase();
        if (w.startsWith('env:')) { const k = w.slice(4); return { start, mode: 'cycle', cands: Object.keys(this.env).filter((x) => x.toLowerCase().startsWith(k)).sort().map((x) => '$env:' + x) }; }
        const names = this.rt.allVars().map((v) => v.name).concat(['env:']).filter((n) => n.toLowerCase().startsWith(w)).sort();
        return { start, mode: 'cycle', cands: names.map((n) => '$' + n) };
      }
      // parameters
      if (word.startsWith('-') && !cmdPos) {
        const cmdName = (/(?:^|[|;{(]\s*)([\w-]+)[^|;{(]*$/.exec(before) || [])[1];
        const res = cmdName ? this.rt.resolveCommand(cmdName) : null;
        if (res && res.kind === 'cmdlet') {
          const ps = Object.keys(res.def.params || {}).concat(['ErrorAction', 'WarningAction', 'Verbose', 'WhatIf', 'OutVariable']);
          return { start, mode: 'cycle', cands: ps.filter((x) => x.toLowerCase().startsWith(word.slice(1).toLowerCase())).map((x) => '-' + x) };
        }
      }
      if (cmdPos && !/[\\/.]/.test(word)) {
        const lw = word.toLowerCase();
        const cands = new Set();
        Object.values(CMDLETS).forEach((c) => { if (c.name.toLowerCase().startsWith(lw)) cands.add(c.name); });
        [...this.rt.functions.values()].forEach((f) => { if (f.name.toLowerCase().startsWith(lw)) cands.add(f.name); });
        if (word.length >= 1) Object.keys(ALIASES).forEach((a) => { if (a.startsWith(lw) && a.length > 1) cands.add(a); });
        Object.keys(TX.winExe).forEach((x) => { if (x.startsWith(lw)) cands.add(x + '.exe'); });
        const list = [...cands].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        if (list.length) return { start, mode: 'cycle', cands: list };
      }
      // paths
      const quoted = word.startsWith("'") || word.startsWith('"');
      const w = word.replace(/^['"]/, '');
      const sep = Math.max(w.lastIndexOf('\\'), w.lastIndexOf('/'));
      const dirPart = sep >= 0 ? w.slice(0, sep + 1) : '';
      const base = sep >= 0 ? w.slice(sep + 1) : w;
      const dirSegs = dirPart ? this.resolve(dirPart) : this.cwd;
      const node = this.vfs.get(dirSegs);
      if (!node || node.t !== 'd') return null;
      const dirsOnly = /^(cd|set-location|sl|chdir|pushd|push-location)$/i.test(before);
      const cands = Object.keys(node.ch).filter((n) => n.toLowerCase().startsWith(base.toLowerCase()) && (!dirsOnly || node.ch[n].t === 'd') && (!node.ch[n].hid || base.startsWith('.'))).sort((a, b) => (node.ch[a].t === 'd' ? 0 : 1) - (node.ch[b].t === 'd' ? 0 : 1) || a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((n) => { let full = (dirPart || (quoted ? '' : '.\\')) + n + (node.ch[n].t === 'd' ? '\\' : ''); if (/\s/.test(full) || quoted) full = "'" + full + "'"; return full; });
      return { start, mode: 'cycle', cands };
    }
  }
  TX.PowerShell = PowerShell;
})();
