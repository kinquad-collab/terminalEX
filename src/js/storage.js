/* TerminalEX — disks and RAID.
 * Every machine that has RAID tools gets two blank "lab" disks to practice on, so nothing a student does can touch the
 * system disk:
 *   Linux     mdadm (RAID 0/1/5), /proc/mdstat, mkfs.ext4, mount, and failing/replacing a disk
 *   Windows   diskpart (online/offline, attributes, mirror/stripe volumes) and PowerShell Storage Spaces
 *             (Get-Disk, Set-Disk, Initialize-Disk, Get-PhysicalDisk, New-StoragePool, New-VirtualDisk ...)
 *   Solaris / FreeBSD   zpool create mirror|raidz, offline/online a disk; FreeBSD gmirror */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const G = TX.gb;
  const cmds = TX.posixCmds;
  const def = TX.defPosix;
  const isRoot = (c) => c.user === 'root';
  const human = (b) => TX.human(b);

  // ------------------------------------------------------------------ the lab disks
  TX.DISKS.linux.push(
    { dev: 'sdc', model: 'WDC WD10EZEX (lab disk 1)', size: G(931.5), type: 'disk', tran: 'sata', rota: 1, serial: 'WD-LAB0001', lab: true, parts: [] },
    { dev: 'sdd', model: 'WDC WD10EZEX (lab disk 2)', size: G(931.5), type: 'disk', tran: 'sata', rota: 1, serial: 'WD-LAB0002', lab: true, parts: [] });
  TX.DISKS.windows.push(
    { num: 3, model: 'WDC WD10EZEX-00BBHA0 (lab disk 1)', size: G(931.51), bus: 'SATA', media: 'HDD', health: 'Healthy', style: 'RAW', serial: 'WD-WCC6Y4KX0001', lab: true, offline: true, parts: [] },
    { num: 4, model: 'WDC WD10EZEX-00BBHA0 (lab disk 2)', size: G(931.51), bus: 'SATA', media: 'HDD', health: 'Healthy', style: 'RAW', serial: 'WD-WCC6Y4KX0002', lab: true, offline: true, parts: [] });
  TX.DISKS.solaris.push({ dev: 'c2t0d0', model: 'HGST HUS726T4TALA6L4 (lab)', size: G(3726), lab: true }, { dev: 'c2t1d0', model: 'HGST HUS726T4TALA6L4 (lab)', size: G(3726), lab: true });
  TX.DISKS.freebsd.push({ dev: 'ada1', model: 'WDC WD10EZEX (lab disk 1)', size: G(931.5), lab: true }, { dev: 'ada2', model: 'WDC WD10EZEX (lab disk 2)', size: G(931.5), lab: true });

  // ================================================================== Linux: mdadm
  const arrays = (m) => (m.extra.md = m.extra.md || {});
  const devName = (s) => String(s || '').replace(/^\/dev\//, '');
  const RESYNC_MS = 45000;
  function mdProgress(a) { return a.syncStart ? Math.min(1, (Date.now() - a.syncStart) / RESYNC_MS) : 1; }
  function mdState(a) {
    const bad = a.devices.filter((d) => d.state === 'faulty').length;
    if (a.level === 0 && bad) return 'FAILED';
    const need = a.level === 5 ? a.n - 1 : a.level === 1 ? 1 : a.n;
    if (a.devices.filter((d) => d.state === 'active').length < need) return 'FAILED';
    const degraded = a.devices.filter((d) => d.state === 'active').length < a.n;
    const p = mdProgress(a);
    return (degraded ? 'clean, degraded' : 'clean') + (p < 1 ? (a.recovering ? ', recovering' : ', resyncing') : '');
  }
  const blocks = (a) => Math.round((a.level === 0 ? a.size * a.n : a.level === 5 ? a.size * (a.n - 1) : a.size) / 1024);
  const prevGens = TX.MACHINE_KINDS.linux.gens;
  TX.MACHINE_KINDS.linux.gens = (m) => {
    const g = prevGens ? prevGens(m) : TX.machineGens('linux', m);
    g.mdstat = () => {
      const A = Object.values(arrays(m));
      let s = 'Personalities : ' + [...new Set(A.map((a) => '[raid' + a.level + ']'))].join(' ') + '\n';
      A.forEach((a) => {
        const st = mdState(a);
        s += `${a.name} : ${st === 'FAILED' ? 'inactive' : 'active'} raid${a.level} ${a.devices.map((d, i) => `${d.dev}[${i}]${d.state === 'faulty' ? '(F)' : d.state === 'spare' ? '(S)' : ''}`).reverse().join(' ')}\n`;
        s += `      ${blocks(a)} blocks super 1.2 ${a.level === 0 ? '512k chunks' : `[${a.n}/${a.devices.filter((d) => d.state === 'active').length}] [${a.devices.slice(0, a.n).map((d) => (d.state === 'active' ? 'U' : '_')).join('')}]`}\n`;
        const p = mdProgress(a);
        if (p < 1 && a.level !== 0) { const w = 20, k = Math.floor(p * w); s += `      [${'='.repeat(k)}>${'.'.repeat(w - k)}]  ${a.recovering ? 'recovery' : 'resync'} = ${(p * 100).toFixed(1)}% (${Math.round(blocks(a) * p)}/${blocks(a)}) finish=${((1 - p) * RESYNC_MS / 60000).toFixed(1)}min speed=187520K/sec\n`; }
        s += '\n';
      });
      return s + 'unused devices: <none>\n';
    };
    return g;
  };
  def('mdadm', async (c) => {
    const a = c.args;
    const A = arrays(c.m);
    const opt = (long, short) => { const i = a.findIndex((x) => x === long || x === short || x.startsWith(long + '=') || (short && x.startsWith(short) && x.length > 2 && !x.startsWith('--'))); if (i < 0) return undefined; const x = a[i]; if (x.includes('=')) return x.split('=')[1]; if (short && x.startsWith(short) && x !== short) return x.slice(short.length); return a[i + 1]; };
    const has = (...f) => a.some((x) => f.includes(x));
    if (!a.length || has('--help', '-h')) { c.outln('Usage: mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdc /dev/sdd\n       mdadm --detail /dev/md0\n       mdadm /dev/md0 --fail /dev/sdc     (pretend a disk broke)\n       mdadm /dev/md0 --remove /dev/sdc\n       mdadm /dev/md0 --add /dev/sdc      (put a new disk in: it rebuilds)\n       mdadm --stop /dev/md0\n       cat /proc/mdstat                    (watch the arrays)\n' + C.dim('Practice disks: /dev/sdc and /dev/sdd (both blank). The system disk is protected.')); return 0; }
    const needRoot = () => { if (isRoot(c)) return false; c.err('mdadm: must be super-user to perform this action\n' + C.dim('(try  sudo mdadm ... )') + '\n'); return true; };
    if (has('--detail', '-D')) {
      const name = devName(a.find((x) => /md\d+/.test(x)));
      const r = A[name];
      if (!r) { c.err(`mdadm: cannot open /dev/${name || 'md0'}: No such file or directory\n`); return 1; }
      const act = r.devices.filter((d) => d.state === 'active').length;
      c.outln(`/dev/${r.name}:\n           Version : 1.2\n     Creation Time : ${TX.unixDate(r.created)}\n        Raid Level : raid${r.level}\n        Array Size : ${blocks(r)} (${human(blocks(r) * 1024)} ${(blocks(r) * 1024 / 1e9).toFixed(2)} GB)\n${r.level ? `     Used Dev Size : ${Math.round(r.size / 1024)} (${human(r.size)})\n` : ''}      Raid Devices : ${r.n}\n     Total Devices : ${r.devices.length}\n\n             State : ${mdState(r)}\n    Active Devices : ${act}\n   Working Devices : ${r.devices.filter((d) => d.state !== 'faulty').length}\n    Failed Devices : ${r.devices.filter((d) => d.state === 'faulty').length}\n     Spare Devices : ${r.devices.filter((d) => d.state === 'spare').length}\n${mdProgress(r) < 1 ? `\n    ${r.recovering ? 'Rebuild' : 'Resync'} Status : ${Math.floor(mdProgress(r) * 100)}% complete\n` : ''}\n    Number   Major   Minor   RaidDevice State`);
      r.devices.forEach((d, i) => c.outln(`       ${i}       8       ${String(32 + i * 16).padEnd(7)} ${String(d.state === 'faulty' ? '-' : i).padStart(2)}        ${d.state === 'active' ? 'active sync' : d.state === 'faulty' ? 'faulty' : 'spare rebuilding'}   /dev/${d.dev}`));
      return 0;
    }
    if (has('--create', '-C')) {
      if (needRoot()) return 1;
      const name = devName(opt('--create', '-C'));
      const level = parseInt(String(opt('--level', '-l') || '').replace(/^raid/, ''), 10);
      const n = parseInt(opt('--raid-devices', '-n'), 10);
      const devs = a.filter((x) => /^\/dev\/sd[a-z]+$/.test(x)).map(devName);
      if (!/^md\d+$/.test(name)) { c.err('mdadm: an md device must be given in this mode (like /dev/md0)\n'); return 2; }
      if (A[name]) { c.err(`mdadm: /dev/${name} is already in use.\n`); return 1; }
      if (![0, 1, 5].includes(level)) { c.err('mdadm: a RAID level is needed to create an array: --level=0 (stripe), 1 (mirror) or 5 (parity).\n'); return 2; }
      if (!n || n !== devs.length) { c.err(`mdadm: You have listed ${devs.length} devices but --raid-devices=${n || '?'}. They must match.\n`); return 2; }
      if (level === 5 && n < 3) { c.err('mdadm: at least 3 raid-devices needed for level 5\n' + C.dim('(RAID 5 stores parity across 3+ disks. This lab has two spare disks, so try RAID 1 or RAID 0.)') + '\n'); return 2; }
      if (n < 2) { c.err(`mdadm: at least 2 raid-devices needed for level ${level}\n`); return 2; }
      for (const d of devs) {
        const disk = c.m.disks.find((x) => x.dev === d);
        if (!disk) { c.err(`mdadm: cannot open /dev/${d}: No such file or directory\n`); return 1; }
        if (!disk.lab) { c.err(`mdadm: cannot open /dev/${d}: Device or resource busy\n` + C.dim(`(/dev/${d} holds this computer's files! Use the blank lab disks /dev/sdc and /dev/sdd.)`) + '\n'); return 1; }
        if (Object.values(A).some((r) => r.devices.some((x) => x.dev === d))) { c.err(`mdadm: /dev/${d} is already part of an array.\n`); return 1; }
      }
      if (level === 1) {
        c.outln('mdadm: Note: this array has metadata at the start and\n    may not be suitable as a boot device.  If you plan to\n    store \'/boot\' on this device please ensure that\n    your boot-loader understands md/v1.x metadata, or use\n    --metadata=0.90');
        c.outln(`mdadm: size set to ${Math.round(c.m.disks.find((x) => x.dev === devs[0]).size / 1024)}K`);
        if (c.tty && !has('--run', '-R')) { let ans = 'y'; try { ans = await c.readLine('Continue creating array? '); } catch (e) { ans = 'n'; } if (!/^y/i.test(ans)) { c.err('mdadm: create aborted.\n'); return 1; } }
      }
      const size = Math.min(...devs.map((d) => c.m.disks.find((x) => x.dev === d).size));
      A[name] = { name, level, n, size, devices: devs.map((d) => ({ dev: d, state: 'active' })), created: Date.now(), syncStart: level === 0 ? 0 : Date.now(), fs: '', mount: '' };
      c.outln('mdadm: Defaulting to version 1.2 metadata\nmdadm: array /dev/' + name + ' started.');
      c.err(C.dim(level === 1 ? '(RAID 1 = mirror: every write goes to BOTH disks. Watch it copy with  cat /proc/mdstat )' : '(RAID 0 = stripe: twice the space and speed, but if ONE disk dies, EVERYTHING is lost.)') + '\n');
      c.vfs.changed();
      return 0;
    }
    if (has('--stop', '-S')) {
      if (needRoot()) return 1;
      const name = devName(a.find((x) => /md\d+/.test(x)));
      if (!A[name]) { c.err(`mdadm: error opening /dev/${name}: No such file or directory\n`); return 1; }
      if (A[name].mount) { c.err(`mdadm: Cannot get exclusive access to /dev/${name}:Perhaps a running process, mounted filesystem or active volume group?\n` + C.dim('(unmount it first: sudo umount ' + A[name].mount + ')') + '\n'); return 1; }
      delete A[name]; c.outln(`mdadm: stopped /dev/${name}`); c.vfs.changed(); return 0;
    }
    // manage mode: mdadm /dev/md0 --fail /dev/sdc   (also --manage)
    const name = devName(a.find((x) => /md\d+/.test(x)));
    const r = A[name];
    const dev = devName(a.find((x) => /^\/dev\/sd[a-z]+$/.test(x)));
    if (has('--fail', '-f', '--remove', '-r', '--add', '-a')) {
      if (needRoot()) return 1;
      if (!r) { c.err(`mdadm: cannot open /dev/${name || 'md0'}: No such file or directory\n`); return 1; }
      const d = r.devices.find((x) => x.dev === dev);
      if (has('--fail', '-f')) { if (!d) { c.err(`mdadm: ${dev}: not a member of /dev/${name}\n`); return 1; } d.state = 'faulty'; c.outln(`mdadm: set /dev/${dev} faulty in /dev/${name}`); c.err(C.dim(r.level === 0 ? '(RAID 0 has no copy: the whole array is now FAILED and its files are gone.)' : '(The mirror keeps working on the other disk. That is the whole point of RAID 1. Check: cat /proc/mdstat)') + '\n'); }
      else if (has('--remove', '-r')) { if (!d || d.state !== 'faulty') { c.err(`mdadm: hot remove failed for /dev/${dev}: Device or resource busy\n` + C.dim('(you can only remove a disk marked faulty: --fail it first)') + '\n'); return 1; } r.devices.splice(r.devices.indexOf(d), 1); c.outln(`mdadm: hot removed /dev/${dev} from /dev/${name}`); }
      else { if (d) { c.err(`mdadm: /dev/${dev} is already in /dev/${name}\n`); return 1; } r.devices.push({ dev, state: 'active' }); r.syncStart = Date.now(); r.recovering = true; c.outln(`mdadm: added /dev/${dev}`); c.err(C.dim('(Rebuilding: the mirror copies everything onto the new disk. Watch with  cat /proc/mdstat )') + '\n'); }
      c.vfs.changed();
      return 0;
    }
    c.err('mdadm: unrecognised word or option. Try  mdadm --help\n'); return 1;
  }, { only: ['linux'] });
  def('mkfs mkfs.ext4 mke2fs mkfs.xfs', (c) => {
    const dev = c.args.find((x) => x.startsWith('/dev/'));
    if (!dev) { c.err(`Usage: ${c.name} /dev/DEVICE\n`); return 1; }
    if (!isRoot(c)) { c.err(`${c.name}: Permission denied while trying to determine filesystem size\n` + C.dim('(try sudo)') + '\n'); return 1; }
    const md = arrays(c.m)[devName(dev)];
    const disk = c.m.disks.find((x) => x.dev === devName(dev));
    if (!md && !(disk && disk.lab)) { c.err(`${c.name}: ${dev} contains a mounted filesystem or is not a practice disk\n` + C.dim('(TerminalEX only formats the RAID array /dev/md0 or the lab disks /dev/sdc, /dev/sdd.)') + '\n'); return 1; }
    const size = md ? blocks(md) * 1024 : disk.size;
    c.outln(`mke2fs 1.47.0 (5-Feb-2023)\nCreating filesystem with ${Math.round(size / 4096)} 4k blocks and ${Math.round(size / 16384)} inodes\nFilesystem UUID: ${TX.sha1(dev + Date.now()).slice(0, 8)}-${TX.sha1(dev).slice(8, 12)}-4c1e-9d55-${TX.sha1(dev).slice(12, 24)}\nSuperblock backups stored on blocks: \n\t32768, 98304, 163840, 229376, 294912, 819200, 884736, 1605632\n\nAllocating group tables: done                            \nWriting inode tables: done                            \nCreating journal (262144 blocks): done\nWriting superblocks and filesystem accounting information: done`);
    if (md) md.fs = 'ext4'; else disk.fs = 'ext4';
    c.vfs.changed();
  }, { only: ['linux'] });
  const mountOrig = cmds.mount;
  cmds.mount = Object.assign({}, mountOrig, { fn: (c) => {
    if (c.m.kind !== 'linux' || !c.args[0] || !/^\/dev\/(md\d+|sd[cd])$/.test(c.args[0])) return mountOrig.fn(c);
    if (!isRoot(c)) { c.err('mount: only root can do that\n'); return 1; }
    const dev = devName(c.args[0]), target = c.args[1];
    const md = arrays(c.m)[dev];
    const disk = c.m.disks.find((x) => x.dev === dev);
    if (!target) { c.err(`mount: ${c.args[0]}: can't find in /etc/fstab.\n`); return 1; }
    if (!(md ? md.fs : disk && disk.fs)) { c.err(`mount: ${target}: wrong fs type, bad option, bad superblock on ${c.args[0]}, missing codepage or helper program, or other error.\n` + C.dim(`(there is no file system on it yet: sudo mkfs.ext4 ${c.args[0]})`) + '\n'); return 32; }
    const segs = c.path(target);
    if (!c.vfs.get(segs)) { c.err(`mount: ${target}: mount point does not exist.\n` + C.dim(`(make it first: sudo mkdir ${target})`) + '\n'); return 32; }
    if (md) md.mount = c.fmt(segs); else disk.mount = c.fmt(segs);
    const n = c.vfs.get(segs); n.mode = 0o777; c.vfs.changed();
    return 0;
  } });
  const umountOrig = cmds.umount;
  cmds.umount = Object.assign({}, umountOrig, { fn: (c) => {
    const md = c.m.kind === 'linux' && Object.values(arrays(c.m)).find((r) => r.mount && (r.mount === c.fmt(c.path(c.args[0] || '/')) || '/dev/' + r.name === c.args[0]));
    if (!md) return umountOrig.fn(c);
    if (!isRoot(c)) { c.err(`umount: ${md.mount}: must be superuser to unmount.\n`); return 32; }
    md.mount = ''; c.vfs.changed(); return 0;
  } });
  // lsblk: show md arrays under their member disks
  const lsblkOrig = cmds.lsblk;
  cmds.lsblk = Object.assign({}, lsblkOrig, { fn: (c) => {
    let buf = '';
    const r = lsblkOrig.fn(Object.assign({}, c, { out: (s) => { buf += s; }, outln: (s = '') => { buf += s + '\n'; } }));
    const A = Object.values(arrays(c.m));
    const lines = buf.split('\n');
    const out = [];
    lines.forEach((l) => {
      out.push(l);
      const m = /^(sd[cd])\s/.exec(l);
      if (m && !c.args.includes('-f')) A.filter((a) => a.devices.some((d) => d.dev === m[1] && d.state !== 'faulty')).forEach((a, i) => out.push(`└─${a.name}`.padEnd(m[1].length + 5) + `   9:${i}    0 ${human(blocks(a) * 1024).padStart(5)}  0 raid${a.level} ${a.mount || ''}`));
    });
    c.out(out.join('\n'));
    return r;
  } });

  // ================================================================== Windows: diskpart and Storage Spaces
  const winPools = (m) => (m.extra.pools = m.extra.pools || []);
  const winVdisks = (m) => (m.extra.vdisks = m.extra.vdisks || []);
  TX.diskpartExtra = (c, line, sel) => {
    // returns true when handled. sel = { disk }
    const a = line.trim().toLowerCase().split(/\s+/);
    const d = sel.disk;
    const needDisk = () => { if (!d) { c.outln('There is no disk selected.\nPlease select a disk and try again.\n'); return true; } return false; };
    const guard = () => { if (!d.lab) { c.outln(C.red(`DiskPart has refused to modify Disk ${d.num}.`) + '\n' + C.dim('(TerminalEX protects the system and data disks. Practice on the lab disks: Disk 3 and Disk 4.)') + '\n'); return true; } return false; };
    if (a[0] === 'online' && a[1] === 'disk') { if (needDisk() || guard()) return true; d.offline = false; c.outln('DiskPart successfully onlined the selected disk.\n'); c.vfs.changed(); return true; }
    if (a[0] === 'offline' && a[1] === 'disk') { if (needDisk() || guard()) return true; d.offline = true; c.outln('DiskPart successfully offlined the selected disk.\n'); c.vfs.changed(); return true; }
    if (a[0] === 'attributes' && a[1] === 'disk') {
      if (needDisk()) return true;
      if (a[2] === 'clear' || a[2] === 'set') { if (guard()) return true; if (a[3] === 'readonly') d.readonly = a[2] === 'set'; c.outln(`Disk attributes ${a[2] === 'set' ? 'set' : 'cleared'} successfully.\n`); c.vfs.changed(); return true; }
      c.outln(`Current Read-only State : ${d.readonly ? 'Yes' : 'No'}\nRead-only  : ${d.readonly ? 'Yes' : 'No'}\nBoot Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nPagefile Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nHibernation File Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nCrashdump Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nClustered Disk  : No\n`);
      return true;
    }
    if (a[0] === 'convert' && ['gpt', 'mbr', 'dynamic', 'basic'].includes(a[1])) {
      if (needDisk() || guard()) return true;
      if (d.offline) { c.outln('Virtual Disk Service error:\nThe disk is offline.\n' + C.dim('(type: online disk)') + '\n'); return true; }
      if (a[1] === 'dynamic') d.dynamic = true; else if (a[1] === 'basic') d.dynamic = false; else d.style = a[1].toUpperCase();
      c.outln(`DiskPart successfully converted the selected disk to ${a[1] === 'gpt' ? 'GPT' : a[1] === 'mbr' ? 'MBR' : a[1]} format.\n`); c.vfs.changed(); return true;
    }
    if (a[0] === 'create' && a[1] === 'volume' && ['mirror', 'stripe', 'simple'].includes(a[2])) {
      const nums = ((/disk=([\d,]+)/.exec(line.toLowerCase()) || [])[1] || (d ? String(d.num) : '')).split(',').filter(Boolean).map(Number);
      const disks = nums.map((n) => c.m.disks.find((x) => x.num === n));
      if (disks.some((x) => !x)) { c.outln('The disk you specified is not valid.\n'); return true; }
      if (disks.some((x) => !x.lab)) { c.outln(C.red('DiskPart has refused: only the lab disks (3 and 4) can be used.') + '\n'); return true; }
      if (a[2] !== 'simple' && disks.length < 2) { c.outln(`Virtual Disk Service error:\nA ${a[2]} needs at least two disks: create volume ${a[2]} disk=3,4\n`); return true; }
      if (disks.some((x) => x.offline)) { c.outln('Virtual Disk Service error:\nThe disk is offline.\n' + C.dim('(select each disk and type: online disk)') + '\n'); return true; }
      disks.forEach((x) => { x.dynamic = true; x.style = x.style === 'RAW' ? 'GPT' : x.style; x.parts = [{ num: 1, type: a[2] === 'mirror' ? 'Mirror' : a[2] === 'stripe' ? 'Stripe' : 'Simple', size: x.size - 1048576, fs: '', label: '', letter: '', used: 0 }]; });
      const letter = 'F';
      disks[0].parts[0].letter = '';
      sel.newVol = { kind: a[2], disks: nums, letter };
      c.outln(`DiskPart successfully created the volume.\n`);
      c.err(C.dim(a[2] === 'mirror' ? '(A mirror = RAID 1: the same data on both disks. Now: format fs=ntfs quick label=Mirror  and  assign letter=F)' : a[2] === 'stripe' ? '(A stripe = RAID 0: both disks joined for speed and space, but no safety copy.)' : '') + '\n');
      c.vfs.changed();
      return true;
    }
    return false;
  };
  const gbStr = (v) => (v >= 1099511627776 ? (v / 1099511627776).toFixed(2) + ' TB' : Math.round(v / 1073741824) + ' GB');
  const PS = TX.psCmdlets, VIEWS = TX.PS_VIEWS;
  const def2 = (name, params, fn) => { PS[name.toLowerCase()] = { name, params, fn }; };
  const num = (v) => TX.psNum(v);
  const tru = (v) => TX.psTruthy(v);
  const T_DISK = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_Disk';
  const T_PD = 'Microsoft.Management.Infrastructure.CimInstance#ROOT/Microsoft/Windows/Storage/MSFT_PhysicalDisk';
  const pooled = (m, d) => winPools(m).some((p) => p.disks.includes(d.num));
  const diskObj = (d) => ({ __type: T_DISK, Number: d.num, FriendlyName: d.model, SerialNumber: d.serial, HealthStatus: d.health, OperationalStatus: d.offline ? 'Offline' : 'Online', Size: Math.round(d.size), PartitionStyle: d.style, BusType: d.bus, IsOffline: !!d.offline, IsReadOnly: !!d.readonly, IsBoot: d.num === 0, IsSystem: d.num === 0, NumberOfPartitions: d.parts.length });
  def2('Get-Disk', { Number: { pos: 0 } }, async (p, input, ctx) => ctx.rt.shell.m.disks.filter((d) => p.Number === undefined || d.num === num(p.Number)).map(diskObj));
  def2('Get-PhysicalDisk', { FriendlyName: { pos: 0 }, CanPool: {} }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    let L = m.disks.map((d) => ({ __type: T_PD, DeviceId: String(d.num), Number: d.num, FriendlyName: d.model, SerialNumber: String(d.serial).slice(0, 16), MediaType: d.media === 'Removable' ? 'Unspecified' : d.media, CanPool: !!d.lab && !pooled(m, d) && !d.parts.length, OperationalStatus: 'OK', HealthStatus: d.health, Usage: pooled(m, d) ? 'Auto-Select' : 'Auto-Select', Size: Math.round(d.size), BusType: d.bus }));
    if (p.CanPool !== undefined) L = L.filter((x) => x.CanPool === tru(p.CanPool));
    return L;
  });
  VIEWS[T_PD] = { table: [{ label: 'Number', name: 'Number' }, { label: 'FriendlyName', name: 'FriendlyName' }, { label: 'MediaType', name: 'MediaType' }, { label: 'CanPool', name: 'CanPool' }, { label: 'OperationalStatus', name: 'OperationalStatus' }, { label: 'HealthStatus', name: 'HealthStatus' }, { label: 'Size', name: 'Size', fmt: gbStr, align: 'right' }] };
  def2('Set-Disk', { Number: { pos: 0 }, IsOffline: {}, IsReadOnly: {} }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    const nums = p.Number !== undefined ? [num(p.Number)] : (input || []).map((x) => x.Number);
    for (const n of nums) {
      const d = m.disks.find((x) => x.num === n);
      if (!d) throw new Error(`Set-Disk : No MSFT_Disk objects found with property 'Number' equal to '${n}'.`);
      if (!d.lab && (p.IsOffline !== undefined || p.IsReadOnly !== undefined)) throw new Error(`Set-Disk : Access to a CIM resource was not available to the client. (TerminalEX protects Disk ${n}: practice on lab disks 3 and 4.)`);
      if (p.IsOffline !== undefined) d.offline = tru(p.IsOffline);
      if (p.IsReadOnly !== undefined) d.readonly = tru(p.IsReadOnly);
    }
    ctx.rt.shell.vfs.changed();
    return [];
  });
  def2('Initialize-Disk', { Number: { pos: 0 }, PartitionStyle: {} }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    const d = m.disks.find((x) => x.num === num(p.Number));
    if (!d) throw new Error(`Initialize-Disk : No MSFT_Disk objects found with property 'Number' equal to '${p.Number}'.`);
    if (!d.lab) throw new Error('Initialize-Disk : The disk has already been initialized.');
    if (d.offline) throw new Error('Initialize-Disk : The disk is offline. Bring it online first: Set-Disk -Number ' + d.num + ' -IsOffline $false');
    d.style = String(p.PartitionStyle || 'GPT').toUpperCase();
    ctx.rt.shell.vfs.changed();
    return [];
  });
  def2('Get-StoragePool', { FriendlyName: { pos: 0 } }, async (p, input, ctx) => [{ __type: 'StoragePool', FriendlyName: 'Primordial', OperationalStatus: 'OK', HealthStatus: 'Healthy', IsPrimordial: true, IsReadOnly: false, Size: Math.round(ctx.rt.shell.m.disks.reduce((a, d) => a + d.size, 0)), AllocatedSize: 0 }].concat(winPools(ctx.rt.shell.m).map((x) => ({ __type: 'StoragePool', FriendlyName: x.name, OperationalStatus: 'OK', HealthStatus: 'Healthy', IsPrimordial: false, IsReadOnly: false, Size: Math.round(x.size), AllocatedSize: Math.round(winVdisks(ctx.rt.shell.m).filter((v) => v.pool === x.name).reduce((a, v) => a + v.footprint, 0)) }))).filter((x) => !p.FriendlyName || x.FriendlyName.toLowerCase() === String(p.FriendlyName).toLowerCase()));
  VIEWS.StoragePool = { table: [{ label: 'FriendlyName', name: 'FriendlyName' }, { label: 'OperationalStatus', name: 'OperationalStatus' }, { label: 'HealthStatus', name: 'HealthStatus' }, { label: 'IsPrimordial', name: 'IsPrimordial' }, { label: 'IsReadOnly', name: 'IsReadOnly' }, { label: 'Size', name: 'Size', fmt: gbStr, align: 'right' }, { label: 'AllocatedSize', name: 'AllocatedSize', fmt: gbStr, align: 'right' }] };
  def2('New-StoragePool', { FriendlyName: {}, PhysicalDisks: {}, StorageSubSystemFriendlyName: {} }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    if (!p.FriendlyName) throw new Error('New-StoragePool : Cannot process command because of one or more missing mandatory parameters: FriendlyName.');
    const disks = [].concat(p.PhysicalDisks || []).map((x) => (typeof x === 'object' ? x.Number : num(x)));
    if (disks.length < 1) throw new Error('New-StoragePool : Not enough physical disks were specified. Try: -PhysicalDisks (Get-PhysicalDisk -CanPool $true)');
    for (const n of disks) { const d = m.disks.find((x) => x.num === n); if (!d || !d.lab || pooled(m, d) || d.parts.length) throw new Error(`New-StoragePool : One of the physical disks specified is not supported by this operation. (Disk ${n} cannot be pooled.)`); if (d.offline) d.offline = false; }
    const pool = { name: String(p.FriendlyName), disks, size: disks.reduce((a, n) => a + m.disks.find((x) => x.num === n).size, 0) - 268435456 * disks.length };
    winPools(m).push(pool);
    ctx.rt.shell.vfs.changed();
    return [{ __type: 'StoragePool', FriendlyName: pool.name, OperationalStatus: 'OK', HealthStatus: 'Healthy', IsPrimordial: false, IsReadOnly: false, Size: Math.round(pool.size), AllocatedSize: 0 }];
  });
  def2('New-VirtualDisk', { StoragePoolFriendlyName: {}, FriendlyName: {}, ResiliencySettingName: {}, Size: {}, UseMaximumSize: { sw: true } }, async (p, input, ctx) => {
    const m = ctx.rt.shell.m;
    const pool = winPools(m).find((x) => x.name.toLowerCase() === String(p.StoragePoolFriendlyName || (input && input[0] && input[0].FriendlyName) || '').toLowerCase());
    if (!pool) throw new Error(`New-VirtualDisk : No MSFT_StoragePool objects found with property 'FriendlyName' equal to '${p.StoragePoolFriendlyName || ''}'.`);
    const res = String(p.ResiliencySettingName || 'Mirror');
    if (!/^(simple|mirror|parity)$/i.test(res)) throw new Error('New-VirtualDisk : ResiliencySettingName must be Simple (like RAID 0), Mirror (like RAID 1) or Parity (like RAID 5).');
    if (/parity/i.test(res) && pool.disks.length < 3) throw new Error('New-VirtualDisk : Not enough available capacity. Parity needs at least 3 physical disks.');
    if (/mirror/i.test(res) && pool.disks.length < 2) throw new Error('New-VirtualDisk : A mirror needs at least 2 physical disks in the pool.');
    const usable = /simple/i.test(res) ? pool.size : pool.size / 2;
    const size = p.UseMaximumSize ? usable : Math.min(usable, num(p.Size || usable));
    const v = { name: String(p.FriendlyName || 'VirtualDisk1'), pool: pool.name, res: res[0].toUpperCase() + res.slice(1).toLowerCase(), size, footprint: /simple/i.test(res) ? size : size * 2 };
    winVdisks(m).push(v);
    ctx.rt.shell.vfs.changed();
    return [{ __type: 'VirtualDisk', FriendlyName: v.name, ResiliencySettingName: v.res, FootprintOnPool: Math.round(v.footprint), Size: Math.round(v.size), OperationalStatus: 'OK', HealthStatus: 'Healthy' }];
  });
  def2('Get-VirtualDisk', { FriendlyName: { pos: 0 } }, async (p, input, ctx) => winVdisks(ctx.rt.shell.m).filter((v) => !p.FriendlyName || v.name.toLowerCase() === String(p.FriendlyName).toLowerCase()).map((v) => ({ __type: 'VirtualDisk', FriendlyName: v.name, ResiliencySettingName: v.res, FootprintOnPool: Math.round(v.footprint), Size: Math.round(v.size), OperationalStatus: 'OK', HealthStatus: 'Healthy' })));
  VIEWS.VirtualDisk = { table: [{ label: 'FriendlyName', name: 'FriendlyName' }, { label: 'ResiliencySettingName', name: 'ResiliencySettingName' }, { label: 'FootprintOnPool', name: 'FootprintOnPool', fmt: gbStr, align: 'right' }, { label: 'StorageEfficiency', name: 'ResiliencySettingName', fmt: (r) => (r === 'Simple' ? '100.00%' : r === 'Mirror' ? '50.00%' : '66.67%'), align: 'right' }, { label: 'Size', name: 'Size', fmt: gbStr, align: 'right' }] };
  def2('Remove-StoragePool', { FriendlyName: { pos: 0 } }, async (p, input, ctx) => { const m = ctx.rt.shell.m; const n = String(p.FriendlyName || '').toLowerCase(); if (winVdisks(m).some((v) => v.pool.toLowerCase() === n)) throw new Error('Remove-StoragePool : The storage pool contains virtual disks. Remove them first (Remove-VirtualDisk).'); m.extra.pools = winPools(m).filter((x) => x.name.toLowerCase() !== n); ctx.rt.shell.vfs.changed(); return []; });
  def2('Remove-VirtualDisk', { FriendlyName: { pos: 0 } }, async (p, input, ctx) => { const m = ctx.rt.shell.m; m.extra.vdisks = winVdisks(m).filter((v) => v.name.toLowerCase() !== String(p.FriendlyName || '').toLowerCase()); ctx.rt.shell.vfs.changed(); return []; });

  // ================================================================== Solaris & FreeBSD: zpool pools and gmirror
  const pools = (m) => { if (!m.extra.pools) m.extra.pools = m.extra.pool ? [m.extra.pool] : []; return m.extra.pools; };
  const zpoolOrig = cmds.zpool;
  cmds.zpool = Object.assign({}, zpoolOrig, { fn: (c) => {
    const P = pools(c.m), sub = c.args[0];
    const labs = c.m.disks.filter((d) => d.lab).map((d) => d.dev);
    const inUse = (d) => P.some((p) => p.disks.includes(d)) || ((c.m.extra.gmirrors || []).some((g) => g.disks.includes(d)));
    const need = () => { if (isRoot(c)) return false; c.err(`cannot ${sub}: permission denied\n` + C.dim(`(${c.m.kind === 'solaris' ? 'try  pfexec zpool ...' : 'become root with su first'})`) + '\n'); return true; };
    const find = (n) => P.find((p) => p.name === n);
    if (!sub || sub === 'list') {
      c.outln('NAME    SIZE  ALLOC   FREE  CAP  DEDUP  HEALTH  ALTROOT');
      P.forEach((p) => { const z = (c.m.extra.zfs || []).find((d) => d.name === p.name); const used = z ? z.used : 0; c.outln(`${p.name.padEnd(7)} ${human(p.size).padStart(5)}  ${human(used || 98304).padStart(5)}  ${human(p.size - used).padStart(5)}  ${String(Math.round(100 * used / p.size)).padStart(2)}%  1.00x  ${health(p).padEnd(7)} -`); });
      return 0;
    }
    if (sub === 'status') {
      const list = c.args[1] ? [find(c.args[1])].filter(Boolean) : P;
      if (c.args[1] && !list.length) { c.err(`cannot open '${c.args[1]}': no such pool\n`); return 1; }
      list.forEach((p, i) => {
        const h = health(p);
        const st = (d) => ((p.offline || []).includes(d) ? 'OFFLINE' : 'ONLINE');
        const devs = p.mirror || p.raidz ? `\t  ${p.raidz ? 'raidz1-0' : 'mirror-0'}  ${h.padEnd(9)}    0     0     0\n${p.disks.map((d) => `\t    ${d.padEnd(8)}${st(d).padEnd(9)}    0     0     0`).join('\n')}` : p.disks.map((d) => `\t  ${d.padEnd(10)}${st(d).padEnd(9)}    0     0     0`).join('\n');
        c.outln(`${i ? '\n' : ''}  pool: ${p.name}\n state: ${h}${h === 'DEGRADED' ? '\nstatus: One or more devices has been taken offline by the administrator.\n\tSufficient replicas exist for the pool to continue functioning in a\n\tdegraded state.\naction: Online the device using \'zpool online\' or replace the device with\n\t\'zpool replace\'.' : ''}\n  scan: ${p.scrubbed ? 'scrub repaired 0 in 0h3m with 0 errors on ' + TX.unixDate(p.scrubbed) : 'none requested'}\nconfig:\n\n\tNAME        STATE     READ WRITE CKSUM\n\t${p.name.padEnd(12)}${h.padEnd(9)}    0     0     0\n${devs}\n\nerrors: No known data errors`);
      });
      return 0;
    }
    if (sub === 'create') {
      if (need()) return 1;
      const rest = c.args.slice(1).filter((x) => x !== '-f');
      const name = rest[0];
      let kind = rest[1];
      const devs = rest.slice(kind === 'mirror' || kind === 'raidz' || kind === 'raidz1' ? 2 : 1).map((x) => x.replace(/^\/dev\/(dsk\/)?/, ''));
      if (!name || !devs.length) { c.err(`usage:\n\tcreate [-f] <pool> [mirror|raidz] <vdev> ...\n${C.dim('Lab disks on this machine: ' + labs.join(' '))}\n`); return 2; }
      if (find(name)) { c.err(`cannot create '${name}': pool already exists\n`); return 1; }
      for (const d of devs) {
        if (!c.m.disks.some((x) => x.dev === d)) { c.err(`cannot open '${d}': no such device in /dev/${c.m.kind === 'solaris' ? 'dsk' : ''}\nmust be a full path or shorthand device name\n${C.dim('Lab disks: ' + labs.join(' '))}\n`); return 1; }
        if (!labs.includes(d) || inUse(d)) { c.err(`invalid vdev specification\nthe following errors must be manually repaired:\n/dev/${d} is part of active pool '${P.find((p) => p.disks.includes(d)) ? P.find((p) => p.disks.includes(d)).name : 'rpool'}'\n`); return 1; }
      }
      if (kind === 'mirror' && devs.length < 2) { c.err('invalid vdev specification: mirror requires at least 2 devices\n'); return 1; }
      if (/raidz/.test(kind) && devs.length < 3) { c.err('invalid vdev specification: raidz requires at least 3 devices\n' + C.dim('(this lab has two spare disks: try a mirror)') + '\n'); return 1; }
      const each = Math.min(...devs.map((d) => c.m.disks.find((x) => x.dev === d).size));
      const size = kind === 'mirror' ? each : each * devs.length;
      P.push({ name, size, health: 'ONLINE', disks: devs, mirror: kind === 'mirror', raidz: /raidz/.test(kind) });
      (c.m.extra.zfs = c.m.extra.zfs || []).push({ name, used: 98304, avail: size * 0.96, refer: 24576, mount: '/' + name });
      try { c.vfs.mkdir([name], { owner: 'root' }); c.vfs.get([name]).mode = 0o777; } catch (e) { /* exists */ }
      c.vfs.changed();
      return 0;
    }
    if (sub === 'destroy') {
      if (need()) return 1;
      const p = find(c.args.filter((x) => !x.startsWith('-'))[1]);
      if (!p || p.name === 'rpool' || p.name === 'zroot') { c.err(p ? `cannot destroy '${p.name}': pool is busy (it holds the operating system)\n` : `cannot open '${c.args[1]}': no such pool\n`); return 1; }
      P.splice(P.indexOf(p), 1);
      c.m.extra.zfs = (c.m.extra.zfs || []).filter((d) => d.name !== p.name && !d.name.startsWith(p.name + '/'));
      try { c.vfs.remove([p.name], { recursive: true, force: true }); } catch (e) { /* gone */ }
      c.vfs.changed(); return 0;
    }
    if (sub === 'offline' || sub === 'online') {
      if (need()) return 1;
      const p = find(c.args[1]), d = (c.args[2] || '').replace(/^\/dev\//, '');
      if (!p) { c.err(`cannot open '${c.args[1] || ''}': no such pool\n`); return 1; }
      if (!p.disks.includes(d)) { c.err(`cannot ${sub} ${d}: no such device in pool\n`); return 1; }
      p.offline = p.offline || [];
      if (sub === 'offline') { if (!p.mirror && !p.raidz) { c.err(`cannot offline ${d}: no valid replicas\n` + C.dim('(a pool with no mirror has no copy to fall back on)') + '\n'); return 1; } if (!p.offline.includes(d)) p.offline.push(d); }
      else p.offline = p.offline.filter((x) => x !== d);
      c.vfs.changed(); return 0;
    }
    return zpoolOrig.fn(c);
  } });
  function health(p) { return (p.offline || []).length ? 'DEGRADED' : 'ONLINE'; }
  def('gmirror', (c) => {
    const G2 = (c.m.extra.gmirrors = c.m.extra.gmirrors || []);
    const sub = c.args[0];
    if (sub === 'status' || sub === 'list' || !sub) {
      if (!G2.length) { if (sub) c.outln(''); else c.err('usage: gmirror label [-v] name prov ...\n       gmirror status\n' + C.dim('(lab disks: ada1 ada2)') + '\n'); return sub ? 0 : 1; }
      c.outln('      Name    Status  Components');
      G2.forEach((g) => g.disks.forEach((d, i) => c.outln(`${i ? '          ' : ('mirror/' + g.name).padEnd(10)}  ${i ? '        ' : 'COMPLETE'}  ${d} (ACTIVE)`)));
      return 0;
    }
    if (sub === 'label') {
      if (!isRoot(c)) { c.err('gmirror: Operation not permitted\n' + C.dim('(become root with su first)') + '\n'); return 1; }
      const rest = c.args.slice(1).filter((x) => !x.startsWith('-'));
      const name = rest[0], devs = rest.slice(1).map((x) => x.replace(/^\/dev\//, ''));
      if (!name || devs.length < 2) { c.err('usage: gmirror label [-v] name prov prov\n'); return 1; }
      for (const d of devs) if (!['ada1', 'ada2'].includes(d) || pools(c.m).some((p) => p.disks.includes(d))) { c.err(`gmirror: Can't store metadata on ${d}: Operation not permitted.\n` + C.dim('(use the free lab disks ada1 and ada2)') + '\n'); return 1; }
      G2.push({ name, disks: devs });
      if (c.args.includes('-v')) c.outln(`Metadata value stored on ${devs.join(', ')}.\nDone.`);
      c.vfs.changed(); return 0;
    }
    c.err(`gmirror: Unknown command: ${sub}.\n`); return 1;
  }, { only: ['freebsd'] });
  // camcontrol / gpart / format: show the lab disks too
  const camOrig = cmds.camcontrol;
  cmds.camcontrol = Object.assign({}, camOrig, { fn: (c) => { camOrig.fn(c); c.outln('<WDC WD10EZEX-00BBHA0 01.01A01>      at scbus1 target 0 lun 0 (pass2,ada1)\n<WDC WD10EZEX-00BBHA0 01.01A01>      at scbus2 target 0 lun 0 (pass3,ada2)'); } });
})();
