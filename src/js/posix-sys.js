/* TerminalEX — POSIX system, network, package, user, and fun commands */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const def = TX.defPosix;
  const getopt = (...a) => TX.getopt(...a);
  const LX = ['linux'], MAC = ['mac'], GB = ['gitbash'], UNIX = ['linux', 'mac'];

  // ------------------------------------------------------------------ packages
  TX.PKGS = {
    cowsay: { ver: '3.03+dfsg2-8', kb: 18.6, desc: 'configurable talking cow' },
    fortune: { ver: '1:1.99.1-7.3', kb: 38.2, desc: 'provides fortune cookies on demand', alias: ['fortune-mod', 'fortunes'] },
    sl: { ver: '5.02-1', kb: 12.4, desc: 'Correct you if you type `sl\' by mistake' },
    figlet: { ver: '2.2.5-3', kb: 133, desc: 'Make large character ASCII banners out of ordinary text' },
    cmatrix: { ver: '2.0-6', kb: 16.9, desc: 'simulates the display from "The Matrix"' },
    neofetch: { ver: '7.1.0-4', kb: 84.1, desc: 'Shows Linux System Information with Distribution Logo' },
    tree: { ver: '2.1.1-2', kb: 47.6, desc: 'displays an indented directory tree, in color' },
    lolcat: { ver: '100.0.1-3', kb: 8.1, desc: 'colorful `cat`' },
    htop: { ver: '3.3.0-4', kb: 171, desc: 'interactive processes viewer' },
    node: { ver: '18.19.1+dfsg-6ubuntu5', kb: 13800, desc: 'evented I/O for V8 javascript - runtime executable', alias: ['nodejs'] },
    'net-tools': { ver: '2.10-0.1ubuntu4', kb: 204, desc: 'NET-3 networking toolkit (ifconfig, netstat, arp, route)' },
    traceroute: { ver: '1:2.1.5-1', kb: 45.3, desc: 'Traces the route taken by packets over an IPv4/IPv6 network' },
    python3: { ver: '3.12.3-0ubuntu2', kb: 25.9, desc: 'interactive high-level object-oriented language (default python3 version)', alias: ['python'] },
    git: { ver: '1:2.43.0-1ubuntu7.1', kb: 3680, desc: 'fast, scalable, distributed revision control system' },
    curl: { ver: '8.5.0-2ubuntu10.4', kb: 227, desc: 'command line tool for transferring data with URL syntax' },
    wget: { ver: '1.21.4-1ubuntu4.1', kb: 334, desc: 'retrieves files from the web' },
    nano: { ver: '7.2-2build1', kb: 280, desc: 'small, friendly text editor inspired by Pico' },
    vim: { ver: '2:9.1.0016-1ubuntu7.3', kb: 1750, desc: 'Vi IMproved - enhanced vi editor' },
    jq: { ver: '1.7.1-3build1', kb: 65.6, desc: 'lightweight and flexible command-line JSON processor' },
    nmap: { ver: '7.94+git20230807.3be01efb1+dfsg-3build2', kb: 1690, desc: 'The Network Mapper' },
    whois: { ver: '5.5.22', kb: 51.2, desc: 'intelligent WHOIS client' },
    tmux: { ver: '3.4-1build1', kb: 440, desc: 'terminal multiplexer' },
  };
  TX.pkgName = (n) => { if (TX.PKGS[n]) return n; for (const k in TX.PKGS) if ((TX.PKGS[k].alias || []).includes(n)) return k; return null; };

  // ------------------------------------------------------------------ identity & system info
  def('whoami', (c) => { c.outln(c.user); });
  def('id', (c) => {
    const u = c.args[0] || c.user;
    if (c.m.kind === 'mac') { c.outln(u === 'root' ? 'uid=0(root) gid=0(wheel) groups=0(wheel),1(daemon),2(kmem),3(sys),4(tty),5(operator),8(procview),9(procmod),12(everyone),20(staff),29(certusers),61(localaccounts),80(admin)' : 'uid=501(student) gid=20(staff) groups=20(staff),12(everyone),61(localaccounts),79(_appserverusr),80(admin),81(_appserveradm),98(_lpadmin),701(com.apple.sharepoint.group.1),33(_appstore),100(_lpoperator),204(_developer),250(_analyticsusers),395(com.apple.access_ftp),398(com.apple.access_screensharing),399(com.apple.access_ssh)'); return; }
    if (c.sh.flavor === 'gitbash') { c.outln('uid=197609(student) gid=197121(None) groups=197121(None),545(Users),4(INTERACTIVE),66049(CONSOLE LOGON),11(Authenticated Users),15(This Organization),113(Local account),4095(CurrentSession),66048(LOCAL),262154(NTLM Authentication),401408(Medium Mandatory Level)'); return; }
    if (u === 'root') c.outln('uid=0(root) gid=0(root) groups=0(root)');
    else if (u === 'teacher') c.outln('uid=1001(teacher) gid=1001(teacher) groups=1001(teacher),27(sudo)');
    else if (u === 'student') c.outln('uid=1000(student) gid=1000(student) groups=1000(student),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),100(users),999(docker)');
    else { const known = c.m.users.includes(u); if (!known) return c.fail(`'${u}': no such user`); c.outln(`uid=1002(${u}) gid=1002(${u}) groups=1002(${u})`); }
  }, { only: ['linux', 'mac', 'gitbash'] });
  def('groups', (c) => { const u = c.args[0] || c.user; c.outln(c.m.kind === 'mac' ? 'staff everyone localaccounts _appserverusr admin' : u === 'root' ? 'root' : u === 'teacher' ? 'teacher sudo' : 'student adm cdrom sudo dip plugdev users docker'); });
  def('hostname', (c) => {
    if (c.args[0] === '-I') { c.outln(c.m.net.ip + ' '); return; }
    if (c.args[0] === '-i') { c.outln('127.0.1.1'); return; }
    if (c.args[0] && !c.args[0].startsWith('-')) { if (c.user !== 'root') return c.fail('you must be root to change the host name'); c.m.net.hostname = c.args[0]; return; }
    c.outln(c.m.net.hostname);
  });
  def('uname', (c) => {
    const { f } = getopt(c.args, 'asnrvmpio', { all: 'a', 'kernel-name': 's', 'kernel-release': 'r' });
    const k = c.m.kind, gb = c.sh.flavor === 'gitbash';
    const info = gb ? { s: 'MINGW64_NT-10.0-22631', n: c.m.net.hostname, r: '3.5.4-395fda67.x86_64', v: '2024-08-25 09:47 UTC', m: 'x86_64', o: 'Msys' }
      : k === 'mac' ? { s: 'Darwin', n: c.m.net.hostname + '.local', r: '24.0.0', v: 'Darwin Kernel Version 24.0.0: Mon Aug 12 20:52:12 PDT 2024; root:xnu-11215.1.10~2/RELEASE_ARM64_T6030', m: 'arm64', o: 'Darwin' }
        : { s: 'Linux', n: c.m.net.hostname, r: c.m.hw.kernel, v: '#45-Ubuntu SMP PREEMPT_DYNAMIC Fri Aug 30 12:02:04 UTC 2024', m: 'x86_64', o: 'GNU/Linux' };
    if (f.a) { c.outln(k === 'mac' ? `${info.s} ${info.n} ${info.r} ${info.v} ${info.m}` : `${info.s} ${info.n} ${info.r} ${info.v} ${info.m} ${info.m} ${info.m} ${info.o}`); return; }
    const parts = [];
    if (f.s || !Object.keys(f).length) parts.push(info.s);
    if (f.n) parts.push(info.n); if (f.r) parts.push(info.r); if (f.v) parts.push(info.v); if (f.m || f.p || f.i) parts.push(info.m); if (f.o) parts.push(info.o);
    c.outln(parts.join(' '));
  });
  def('arch', (c) => { c.outln(c.m.kind === 'mac' ? 'arm64' : 'x86_64'); });
  def('nproc', (c) => { c.outln(String(c.m.hw.threads)); });
  def('lsb_release', (c) => {
    const { f } = getopt(c.args, 'aidrcs');
    if (f.d && f.s) { c.outln('Ubuntu 24.04.1 LTS'); return; }
    if (f.a || !Object.keys(f).length) c.err('No LSB modules are available.\n');
    const rows = [['Distributor ID:', 'Ubuntu'], ['Description:', 'Ubuntu 24.04.1 LTS'], ['Release:', '24.04'], ['Codename:', 'noble']];
    const pick = f.a || !Object.keys(f).length ? rows : rows.filter((_, i) => [f.i, f.d, f.r, f.c][i]);
    pick.forEach(([a, b]) => c.outln(a + '\t' + b));
  }, { only: LX });
  def('uptime', (c) => {
    const l = c.m.load();
    if (c.args[0] === '-p') { const s = Math.floor((Date.now() - c.m.boot) / 1000); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); c.outln('up ' + (h ? h + ' hour' + (h > 1 ? 's' : '') + ', ' : '') + m + ' minute' + (m !== 1 ? 's' : '')); return; }
    if (c.args[0] === '-s') { c.outln(TX.isoDate(c.m.boot)); return; }
    const d = new Date();
    c.outln(` ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} up ${TX.uptimeStr(c.m.boot)},  1 user,  load average${c.m.kind === 'mac' ? 's:' : ':'} ${l.map((x) => x.toFixed(2)).join(c.m.kind === 'mac' ? ' ' : ', ')}`);
  });
  def('date', (c) => {
    const a = c.args.filter((x) => x !== '-u');
    const d = new Date();
    if (a[0] === '-s' || a[0] === '--set') { if (c.user !== 'root') return c.fail('cannot set date: Operation not permitted'); }
    if (a[0] === '+%s' || a[0] === '+%s%N') { c.outln(String(Math.floor(Date.now() / 1000))); return; }
    if (a[0] && a[0].startsWith('+')) {
      const fmt = a[0].slice(1);
      const pad = TX.p2;
      const start = new Date(d.getFullYear(), 0, 0);
      const doy = Math.floor((d - start) / 86400000);
      c.outln(fmt.replace(/%([a-zA-Z%])/g, (_, k) => ({ Y: d.getFullYear(), y: String(d.getFullYear()).slice(2), m: pad(d.getMonth() + 1), d: pad(d.getDate()), e: String(d.getDate()).padStart(2), H: pad(d.getHours()), I: pad(d.getHours() % 12 || 12), M: pad(d.getMinutes()), S: pad(d.getSeconds()), p: d.getHours() >= 12 ? 'PM' : 'AM', A: TX.DAYS[d.getDay()], a: TX.DAY[d.getDay()], B: TX.MONTHS[d.getMonth()], b: TX.MON[d.getMonth()], h: TX.MON[d.getMonth()], j: String(doy).padStart(3, '0'), u: d.getDay() || 7, w: d.getDay(), Z: 'EDT', z: '-0400', s: Math.floor(d / 1000), F: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, T: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, D: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${String(d.getFullYear()).slice(2)}`, R: `${pad(d.getHours())}:${pad(d.getMinutes())}`, n: '\n', t: '\t', '%': '%', N: '000000000', V: pad(Math.ceil(doy / 7)) }[k] ?? '%' + k)));
      return;
    }
    if (c.m.kind === 'linux') { let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; c.outln(`${TX.DAY[d.getDay()]} ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${TX.p2(h)}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} ${ap} EDT ${d.getFullYear()}`); }
    else c.outln(TX.unixDate(Date.now()));
  });
  def('cal ncal', (c) => {
    const d = new Date();
    let month = d.getMonth(), year = d.getFullYear();
    const nums = c.args.filter((a) => /^\d+$/.test(a)).map(Number);
    if (nums.length === 2) { month = nums[0] - 1; year = nums[1]; }
    else if (nums.length === 1) {
      year = nums[0];
      const blocks = [];
      for (let m = 0; m < 12; m++) blocks.push(calMonth(m, year, false).split('\n'));
      const out = [TX.center(String(year), 64)];
      for (let r = 0; r < 12; r += 3) { for (let ln = 0; ln < 8; ln++) out.push([0, 1, 2].map((k) => (blocks[r + k][ln] || '').padEnd(20)).join('  ')); }
      c.outln(out.join('\n'));
      return;
    }
    c.outln(calMonth(month, year, c.tty && month === d.getMonth() && year === d.getFullYear()));
  });
  function calMonth(month, year, hl) {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const lines = [TX.center(TX.MONTHS[month] + ' ' + year, 20).replace(/\s+$/, ''), 'Su Mo Tu We Th Fr Sa'];
    let line = '   '.repeat(first);
    for (let dd = 1; dd <= days; dd++) {
      let s = String(dd).padStart(2);
      if (hl && dd === today.getDate()) s = '\x1b[7m' + s + '\x1b[0m';
      line += s + ' ';
      if ((first + dd) % 7 === 0) { lines.push(line.replace(/\s+$/, '')); line = ''; }
    }
    if (line) lines.push(line.replace(/\s+$/, ''));
    while (lines.length < 8) lines.push('');
    return lines.join('\n');
  }
  def('who users', (c) => {
    if (c.name === 'users') { c.outln('student'); return; }
    const d = new Date(Date.now() - 1000 * 60 * 60 * 3);
    if (c.args[0] === '-b') { c.outln('         system boot  ' + TX.isoDate(c.m.boot).slice(0, 16)); return; }
    c.outln(c.m.kind === 'mac' ? `student          console      ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} 08:02\nstudent          ttys000      ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}` : `student  tty2         ${TX.isoDate(c.m.boot).slice(0, 16)} (tty2)\nstudent  pts/0        ${TX.isoDate(d.getTime()).slice(0, 16)} (192.168.1.57)`);
  }, { only: UNIX });
  def('w', (c) => {
    const l = c.m.load(), d = new Date();
    c.outln(` ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:${TX.p2(d.getSeconds())} up ${TX.uptimeStr(c.m.boot)},  2 users,  load average: ${l.map((x) => x.toFixed(2)).join(', ')}\nUSER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\nstudent  tty2     tty2             08:12    5:02m  3:41   0.10s /usr/libexec/gnome-session-binary\nstudent  pts/0    192.168.1.57     ${TX.p2(d.getHours())}:${TX.p2(Math.max(0, d.getMinutes() - 7))}    0.00s  0.04s  0.00s w`);
  }, { only: LX });
  def('last', (c) => {
    const rows = [['student', 'pts/0', '192.168.1.57', 'still logged in'], ['student', 'tty2', 'tty2', 'still logged in'], ['reboot', 'system boot', c.m.hw.kernel || '', 'still running'], ['teacher', 'pts/1', '192.168.1.20', '(01:12)'], ['student', 'pts/0', '10.0.0.8', '(00:43)']];
    rows.forEach(([u, t, from, st], i) => { const d = new Date(Date.now() - i * 86400000 * 0.7 - 3600000 * 3); c.outln(`${u.padEnd(8)} ${t.padEnd(12)} ${from.padEnd(16)} ${TX.DAY[d.getDay()]} ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}   ${st}`); });
    c.outln('\nwtmp begins ' + TX.unixDate(Date.now() - 86400000 * 30).replace(/ EDT/, ''));
  }, { only: UNIX });

  // ------------------------------------------------------------------ memory, disks
  def('free', (c) => {
    const { f } = getopt(c.args, 'hmgkbtw', { human: 'h' });
    const m = c.m.memory();
    const conv = (kb) => (f.h ? humanKiB(kb) : f.m ? Math.round(kb / 1024) : f.g ? Math.round(kb / 1048576) : kb);
    const rows = [['', 'total', 'used', 'free', 'shared', 'buff/cache', 'available'], ['Mem:', conv(m.total), conv(m.used), conv(m.free), conv(m.shared), conv(m.cache + m.buffers), conv(m.avail)], ['Swap:', conv(m.swapTotal), conv(m.swapUsed), conv(m.swapTotal - m.swapUsed)]];
    c.outln(rows.map((r) => r.map((x, i) => (i === 0 ? String(x).padEnd(8) : String(x).padStart(i === 1 ? 11 : 12))).join('')).join('\n'));
  }, { only: ['linux', 'gitbash'] });
  function humanKiB(kb) { if (!kb) return '0B'; const u = ['Ki', 'Mi', 'Gi', 'Ti']; let v = kb, i = 0; while (v >= 1024 && i < 3) { v /= 1024; i++; } return (v < 10 ? v.toFixed(1) : Math.round(v)) + u[i]; }
  function mountsLinux(m) {
    const out = [];
    m.disks.forEach((d) => d.parts.forEach((p) => { if (p.mount && p.mounted !== false) out.push({ fs: '/dev/' + p.dev, type: p.fs, size: p.size, used: p.used, mount: p.mount }); }));
    return [{ fs: 'tmpfs', type: 'tmpfs', size: TX.gb(1.6), used: TX.mb(2.3), mount: '/run' }].concat(out.slice(0, 1).concat(out.slice(1))).concat([{ fs: 'tmpfs', type: 'tmpfs', size: TX.gb(7.8), used: TX.mb(34), mount: '/dev/shm' }, { fs: 'tmpfs', type: 'tmpfs', size: TX.mb(5), used: TX.mb(0.008), mount: '/run/lock' }, { fs: 'tmpfs', type: 'tmpfs', size: TX.gb(1.6), used: TX.mb(0.1), mount: '/run/user/1000' }]);
  }
  def('df', (c) => {
    const { f, rest } = getopt(c.args, 'hTiHkma', { 'human-readable': 'h', 'print-type': 'T' });
    if (c.m.kind === 'mac') {
      const hdr = ['Filesystem', f.h ? 'Size' : '512-blocks', 'Used', f.h ? 'Avail' : 'Available', 'Capacity', 'iused', 'ifree', '%iused', 'Mounted on'];
      const total = 494.4e9, free = total - 11.2e9 - 187.6e9 - 2.1e9;
      const sz = (b) => (f.h ? (b / 1073741824 >= 10 ? Math.round(b / 1073741824) + 'Gi' : (b / 1073741824).toFixed(1) + 'Gi') : String(Math.round(b / 512)));
      const rows = [['/dev/disk3s1s1', total, 11.2e9, free, '/'], ['devfs', 207e3, 207e3, 0, '/dev'], ['/dev/disk3s6', total, 2.1e9, free, '/System/Volumes/VM'], ['/dev/disk3s5', total, 187.6e9, free, '/System/Volumes/Data'], ['map auto_home', 0, 0, 0, '/System/Volumes/Data/home']];
      c.m.disks[2].parts.forEach((p) => { if (p.mounted !== false) rows.push(['/dev/' + p.id, p.size, p.used, p.size - p.used, p.mount]); });
      const tbl = [hdr].concat(rows.map(([n, t, u, a, mnt]) => [n, sz(t), sz(u), sz(a), (t ? Math.round((u / (u + a)) * 100) : 100) + '%', String(TX.randInt(400, 500000)), String(TX.randInt(1e6, 4e9)), '0%', mnt]));
      c.outln(TX.table(tbl, ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'l']));
      return;
    }
    if (c.sh.flavor === 'gitbash') {
      const rows = [f.h ? ['Filesystem', 'Size', 'Used', 'Avail', 'Use%', 'Mounted on'] : ['Filesystem', '1K-blocks', 'Used', 'Available', 'Use%', 'Mounted on']];
      c.m.disks.forEach((d) => d.parts.forEach((p) => { if (!p.letter) return; const kb = Math.round(p.size / 1024), u = Math.round(p.used / 1024); rows.push([p.letter + ':', f.h ? TX.human(p.size) : kb, f.h ? TX.human(p.used) : u, f.h ? TX.human(p.size - p.used) : kb - u, Math.round((p.used / p.size) * 100) + '%', '/' + p.letter.toLowerCase()]); }));
      rows.splice(1, 0, ['C:/Program Files/Git', rows[1][1], rows[1][2], rows[1][3], rows[1][4], '/']);
      c.outln(TX.table(rows.map((r) => r.map(String)), ['l', 'r', 'r', 'r', 'r', 'l']));
      return;
    }
    let mounts = mountsLinux(c.m);
    if (rest.length) { const target = c.fmt(c.path(rest[0])); mounts = [mounts.filter((x) => target.startsWith(x.mount)).sort((a, b) => b.mount.length - a.mount.length)[0]].filter(Boolean); }
    const hdr = ['Filesystem'].concat(f.T ? ['Type'] : []).concat(f.h ? ['Size', 'Used', 'Avail'] : ['1K-blocks', 'Used', 'Available']).concat([f.i ? 'IUse%' : 'Use%', 'Mounted on']);
    const rows = [hdr].concat(mounts.map((x) => {
      const avail = Math.max(0, x.size * 0.95 - x.used);
      const s = (b) => (f.h ? TX.human(b) : String(Math.round(b / 1024)));
      return [x.fs].concat(f.T ? [x.type] : []).concat([s(x.size), s(x.used), s(avail), Math.max(1, Math.ceil((x.used / (x.used + avail)) * 100)) + '%', x.mount]);
    }));
    c.outln(TX.table(rows, ['l'].concat(f.T ? ['l'] : []).concat(['r', 'r', 'r', 'r', 'l'])));
  });
  def('lsblk', (c) => {
    const { f } = getopt(c.args, 'fapdmo:', { fs: 'f' });
    const rows = [];
    const d0 = c.m.disks;
    if (f.f) {
      rows.push(['NAME', 'FSTYPE', 'FSVER', 'LABEL', 'UUID', 'FSAVAIL', 'FSUSE%', 'MOUNTPOINTS']);
      d0.forEach((d) => { rows.push([d.dev, '', '', '', '', '', '', '']); d.parts.forEach((p, i) => { const last = i === d.parts.length - 1; rows.push([(last ? '└─' : '├─') + p.dev, p.fs, p.fs === 'vfat' ? 'FAT32' : '1.0', p.label || '', p.uuid, p.mount && p.mounted !== false ? TX.human(p.size - p.used) : '', p.mount && p.mounted !== false ? Math.round((p.used / p.size) * 100) + '%' : '', p.mounted !== false ? p.mount || '' : '']); }); });
      c.outln(TX.table(rows));
      return;
    }
    rows.push(['NAME', 'MAJ:MIN', 'RM', 'SIZE', 'RO', 'TYPE', 'MOUNTPOINTS']);
    rows.push(['loop0', '7:0', '0', '4K', '1', 'loop', '/snap/bare/5']);
    rows.push(['loop1', '7:1', '0', '74.3M', '1', 'loop', '/snap/core22/1612']);
    d0.forEach((d, di) => {
      const maj = d.tran === 'nvme' ? 259 : 8;
      rows.push([d.dev, `${maj}:${d.tran === 'nvme' ? 0 : di * 16 - 16}`, String(d.rm || 0), TX.human(d.size), '0', 'disk', '']);
      if (f.d) return;
      d.parts.forEach((p, i) => { const last = i === d.parts.length - 1; rows.push([(last ? '└─' : '├─') + p.dev, `${maj}:${d.tran === 'nvme' ? i + 1 : di * 16 - 16 + i + 1}`, String(d.rm || 0), TX.human(p.size), '0', 'part', p.mounted !== false ? p.mount || '' : '']); });
    });
    c.outln(TX.table(rows, ['l', 'r', 'r', 'r', 'r', 'l', 'l']));
  }, { only: LX });
  def('blkid', (c) => {
    if (c.user !== 'root') { return 2; }
    c.m.disks.forEach((d) => d.parts.forEach((p) => c.outln(`/dev/${p.dev}: ${p.label ? `LABEL="${p.label}" ` : ''}UUID="${p.uuid}" BLOCK_SIZE="4096" TYPE="${p.fs}" PARTUUID="${TX.sha1(p.dev).slice(0, 8)}-${TX.sha1(p.dev).slice(8, 12)}"`)));
  }, { only: LX });
  def('fdisk', (c) => {
    if (!c.args.includes('-l')) return c.fail('bad usage\nTry \'fdisk --help\' for more information.');
    if (c.user !== 'root') { c.m.disks.forEach((d) => c.err(`fdisk: cannot open /dev/${d.dev}: Permission denied\n`)); return 1; }
    c.m.disks.forEach((d, di) => {
      const sectors = Math.round(d.size / 512);
      c.outln(`${di ? '\n' : ''}Disk /dev/${d.dev}: ${TX.human(d.size).replace(/([KMGT])$/, ' $1iB')}, ${d.size} bytes, ${sectors} sectors\nDisk model: ${d.model}\nUnits: sectors of 1 * 512 = 512 bytes\nSector size (logical/physical): 512 bytes / 512 bytes\nI/O size (minimum/optimal): 512 bytes / 512 bytes\nDisklabel type: ${d.tran === 'usb' ? 'dos' : 'gpt'}\nDisk identifier: ${TX.sha1(d.dev).slice(0, 8).toUpperCase()}-${TX.sha1(d.dev).slice(8, 12).toUpperCase()}\n`);
      const rows = [['Device', 'Start', 'End', 'Sectors', 'Size', 'Type']];
      let start = 2048;
      d.parts.forEach((p) => { const sec = Math.round(p.size / 512); rows.push(['/dev/' + p.dev, String(start), String(start + sec - 1), String(sec), TX.human(p.size), p.type]); start += sec; });
      c.outln(TX.table(rows, ['l', 'r', 'r', 'r', 'r', 'l']));
    });
  }, { only: LX });
  def('mount', (c) => {
    if (c.args.length >= 2) {
      if (c.user !== 'root') return c.fail('only root can do that', 1);
      const dev = c.args[0].replace('/dev/', '');
      let found = null; c.m.disks.forEach((d) => d.parts.forEach((p) => { if (p.dev === dev) found = p; }));
      if (!found) return c.fail(`${c.args[1]}: special device ${c.args[0]} does not exist.`, 32);
      found.mount = c.fmt(c.path(c.args[1])); found.mounted = true;
      try { c.vfs.mkdir(c.path(c.args[1]), { parents: true }); } catch (e) { /* exists */ }
      return;
    }
    if (c.m.kind === 'mac') { c.outln('/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)\ndevfs on /dev (devfs, local, nobrowse)\n/dev/disk3s6 on /System/Volumes/VM (apfs, local, noexec, journaled, noatime, nobrowse)\n/dev/disk3s5 on /System/Volumes/Data (apfs, local, journaled, nobrowse, protect)\n/dev/disk4s1 on /Volumes/STUDENT_USB (msdos, local, nodev, nosuid, noowners, noatime, fskit)'); return; }
    mountsLinux(c.m).forEach((x) => c.outln(`${x.fs} on ${x.mount} type ${x.type} (${x.type === 'tmpfs' ? 'rw,nosuid,nodev,noexec,relatime' : x.type === 'vfat' ? 'rw,nosuid,nodev,relatime,uid=1000,gid=1000,fmask=0022,dmask=0022,codepage=437,iocharset=iso8859-1,shortname=mixed,showexec,utf8,flush,errors=remount-ro,uhelper=udisks2' : 'rw,relatime'})`));
  }, { only: UNIX });
  def('umount eject', (c) => {
    const t = c.args[0];
    if (!t) return c.fail('bad usage');
    if (c.user !== 'root' && c.m.kind === 'linux') return c.fail(`${t}: must be superuser to unmount.`, 32);
    let found = null;
    c.m.disks.forEach((d) => d.parts.forEach((p) => { if (p.mount === t || '/dev/' + p.dev === t || p.mount === c.fmt(c.path(t))) found = p; }));
    if (!found) return c.fail(`${t}: not mounted.`, 32);
    if (found.mount === '/') return c.fail('/: target is busy.', 32);
    found.mounted = false;
  }, { only: LX });
  def('lscpu', (c) => {
    const hw = c.m.hw;
    c.outln(`Architecture:             x86_64\n  CPU op-mode(s):         32-bit, 64-bit\n  Address sizes:          39 bits physical, 48 bits virtual\n  Byte Order:             Little Endian\nCPU(s):                   ${hw.threads}\n  On-line CPU(s) list:    0-${hw.threads - 1}\nVendor ID:                GenuineIntel\n  Model name:             ${hw.cpu}\n    CPU family:           6\n    Model:                154\n    Thread(s) per core:   2\n    Core(s) per socket:   ${hw.cores}\n    Socket(s):            1\n    Stepping:             3\n    CPU(s) scaling MHz:   ${TX.randInt(18, 40)}%\n    CPU max MHz:          4700.0000\n    CPU min MHz:          400.0000\n    BogoMIPS:             5376.00\nVirtualization features:\n  Virtualization:         VT-x\nCaches (sum of all):\n  L1d:                    544 KiB (14 instances)\n  L1i:                    704 KiB (14 instances)\n  L2:                     11.5 MiB (8 instances)\n  L3:                     24 MiB (1 instance)\nNUMA:\n  NUMA node(s):           1\n  NUMA node0 CPU(s):      0-${hw.threads - 1}`);
  }, { only: LX });
  def('lsusb', (c) => { c.outln('Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub\nBus 001 Device 002: ID 046d:c52b Logitech, Inc. Unifying Receiver\nBus 001 Device 003: ID 0bda:5634 Realtek Semiconductor Corp. Integrated_Webcam_HD\nBus 001 Device 004: ID 8087:0033 Intel Corp. AX211 Bluetooth\nBus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub\nBus 002 Device 002: ID 0781:5583 SanDisk Corp. Ultra Fit'); }, { only: LX });
  def('lspci', (c) => { c.outln('00:00.0 Host bridge: Intel Corporation Alder Lake Host and DRAM Controller (rev 02)\n00:02.0 VGA compatible controller: Intel Corporation Alder Lake-P GT2 [Iris Xe Graphics] (rev 0c)\n00:04.0 Signal processing controller: Intel Corporation Alder Lake Innovation Platform Framework Processor Participant (rev 02)\n00:14.0 USB controller: Intel Corporation Alder Lake PCH USB 3.2 xHCI Host Controller (rev 01)\n00:14.3 Network controller: Intel Corporation Alder Lake-P PCH CNVi WiFi (rev 01)\n00:1f.3 Audio device: Intel Corporation Alder Lake PCH-P High Definition Audio Controller (rev 01)\n01:00.0 3D controller: NVIDIA Corporation GA107M [GeForce RTX 3050 Ti Mobile] (rev a1)\n02:00.0 Non-Volatile memory controller: Samsung Electronics Co Ltd NVMe SSD Controller PM9A1/PM9A3/980PRO'); }, { only: LX });
  def('dmesg', (c) => {
    if (c.user !== 'root') return c.fail('read kernel buffer failed: Operation not permitted');
    c.outln(`[    0.000000] Linux version ${c.m.hw.kernel} (buildd@lcy02-amd64-010) (x86_64-linux-gnu-gcc-13 (Ubuntu 13.2.0-23ubuntu4) 13.2.0, GNU ld (GNU Binutils for Ubuntu) 2.42) #45-Ubuntu SMP PREEMPT_DYNAMIC\n[    0.000000] Command line: BOOT_IMAGE=/vmlinuz-${c.m.hw.kernel} root=UUID=1f6c3b8e-52aa-4d7e-b1a4-9a0f3e2c7d55 ro quiet splash\n[    0.102334] Memory: 16207464K/16617472K available\n[    1.204551] nvme nvme0: 16/0/0 default/read/poll queues\n[    1.211093]  nvme0n1: p1 p2 p3\n[    2.412551] EXT4-fs (nvme0n1p3): mounted filesystem 1f6c3b8e-52aa-4d7e-b1a4-9a0f3e2c7d55 ro with ordered data mode.\n[    5.883120] iwlwifi 0000:00:14.3: loaded firmware version 83.e8f84e98.0\n[ 1843.004112] usb 2-1: new SuperSpeed USB device number 2 using xhci_hcd\n[ 1843.211553] usb-storage 2-1:1.0: USB Mass Storage device detected\n[ 1844.290118] sd 2:0:0:0: [sdb] 60088320 512-byte logical blocks: (30.8 GB/28.7 GiB)\n[ 1844.301876]  sdb: sdb1\n[ 1844.301932] sd 2:0:0:0: [sdb] Attached SCSI removable disk`);
  }, { only: LX });

  // ------------------------------------------------------------------ processes
  function psTime(p) { const s = Math.floor((p.cpu || 0) * 7 + p.pid % 60); return TX.p2(Math.floor(s / 3600)) + ':' + TX.p2(Math.floor(s / 60) % 60) + ':' + TX.p2(s % 60); }
  def('ps', (c) => {
    const a = c.args.join(' ');
    const m = c.m;
    const memTotal = m.hw.memTotal;
    const self = { pid: m.nextPid, name: 'ps', cmd: 'ps ' + a, user: c.user, tty: c.m.kind === 'mac' ? 'ttys000' : 'pts/0', rss: 3900, vsz: 11000, stat: 'R+', cpu: 0 };
    const procs = m.procs.concat([self]);
    if (c.sh.flavor === 'gitbash') {
      c.outln('      PID    PPID    PGID     WINPID   TTY         UID    STIME COMMAND');
      c.outln(`     1612       1    1612      13640  pty0     197609 ${TX.p2(new Date().getHours())}:${TX.p2(new Date().getMinutes())}:02 /usr/bin/bash`);
      c.outln(`     ${self.pid}    1612    ${self.pid}      21880  pty0     197609 ${TX.p2(new Date().getHours())}:${TX.p2(new Date().getMinutes())}:09 /usr/bin/ps`);
      return;
    }
    if (/aux|-aux|au|-e[fF]|-A|-e\b|ax/.test(a)) {
      if (/-e[fF]|-ef/.test(a) || a === '-e' || a === '-A') {
        if (a === '-e' || a === '-A') { c.outln('    PID TTY          TIME CMD'); procs.forEach((p) => c.outln(String(p.pid).padStart(7) + ' ' + (p.tty || '?').padEnd(8) + ' ' + psTime(p) + ' ' + p.name)); return; }
        c.outln('UID          PID    PPID  C STIME TTY          TIME CMD');
        procs.forEach((p) => c.outln(`${(p.user || 'root').padEnd(8)} ${String(p.pid).padStart(7)} ${String(p.pid < 3 ? 0 : p.user === 'student' ? 1403 : 1).padStart(7)}  0 ${p.start} ${(p.tty || '?').padEnd(8)} ${psTime(p)} ${p.cmd}`));
        return;
      }
      c.outln('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND');
      procs.forEach((p) => c.outln(`${(p.user || 'root').slice(0, 8).padEnd(8)} ${String(p.pid).padStart(7)} ${(p.cpu || 0).toFixed(1).padStart(4)} ${((p.rss / memTotal) * 100).toFixed(1).padStart(4)} ${String(p.vsz || 0).padStart(6)} ${String(p.rss || 0).padStart(5)} ${(p.tty || '?').padEnd(8)} ${(p.stat || 'S').padEnd(4)} ${p.start}   ${psTime(p).slice(3)} ${c.tty ? TX.trunc(p.cmd, Math.max(20, c.cols - 66)) : p.cmd}`));
      return;
    }
    if (c.m.kind === 'mac') {
      c.outln('  PID TTY           TIME CMD');
      procs.filter((p) => p.tty === 'ttys000' || p === self).forEach((p) => c.outln(String(p.pid).padStart(5) + ' ttys000    0:00.02 ' + (p === self ? 'ps' : '-zsh')));
      return;
    }
    c.outln('    PID TTY          TIME CMD');
    c.outln(String(c.sh.session.pid || 2230).padStart(7) + ' pts/0    00:00:00 bash');
    c.m.procs.filter((p) => p.tty === 'pts/0' && p.pid !== 2230 && p.name !== 'bash').forEach((p) => c.outln(String(p.pid).padStart(7) + ' pts/0    00:00:00 ' + p.name));
    c.outln(String(self.pid).padStart(7) + ' pts/0    00:00:00 ps');
  });
  def('pgrep pidof', (c) => {
    const { f, rest } = getopt(c.args, 'lafu:');
    const pat = rest[0];
    if (!pat) return c.fail('no matching criteria specified', 2);
    const re = new RegExp(c.name === 'pidof' ? '^' + pat + '$' : pat);
    const hits = c.m.procs.filter((p) => re.test(f.f ? p.cmd : p.name));
    if (c.name === 'pidof') { if (hits.length) c.outln(hits.map((p) => p.pid).reverse().join(' ')); return hits.length ? 0 : 1; }
    hits.forEach((p) => c.outln(f.l || f.a ? p.pid + ' ' + (f.a ? p.cmd : p.name) : String(p.pid)));
    return hits.length ? 0 : 1;
  });
  function killPid(c, pid, sig) {
    const p = c.m.procs.find((x) => x.pid === pid);
    if (!p) { c.err(`${c.sh.flavor === 'zsh' ? 'kill: kill ' + pid + ' failed: no such process' : `${c.sh.name}: kill: (${pid}) - No such process`}\n`); return 1; }
    if (p.user !== c.user && c.user !== 'root') { c.err(c.sh.flavor === 'zsh' ? `kill: kill ${pid} failed: operation not permitted\n` : `${c.sh.name}: kill: (${pid}) - Operation not permitted\n`); return 1; }
    if (pid === 1) { c.err(c.sh.name + ': kill: (1) - Operation not permitted\n'); return 1; }
    if (sig === 'STOP' || sig === '19') { p.stat = 'T'; return 0; }
    if (sig === 'CONT' || sig === '18') { p.stat = 'S'; return 0; }
    c.m.kill(pid);
    const svc = c.m.services.find((s) => s.pid === pid);
    if (svc) svc.active = false;
    return 0;
  }
  def('kill', (c) => {
    if (c.args[0] === '-l' || c.args[0] === '-L') { c.outln(' 1) SIGHUP\t 2) SIGINT\t 3) SIGQUIT\t 4) SIGILL\t 5) SIGTRAP\n 6) SIGABRT\t 7) SIGBUS\t 8) SIGFPE\t 9) SIGKILL\t10) SIGUSR1\n11) SIGSEGV\t12) SIGUSR2\t13) SIGPIPE\t14) SIGALRM\t15) SIGTERM\n17) SIGCHLD\t18) SIGCONT\t19) SIGSTOP\t20) SIGTSTP\t21) SIGTTIN'); return; }
    let sig = 'TERM';
    const pids = [];
    for (const a of c.args) {
      if (/^-(\d+|[A-Z]+)$/.test(a)) sig = a.slice(1).replace(/^SIG/, '');
      else if (a === '-s') continue;
      else if (/^%\d+$/.test(a)) { const j = c.sh.jobs.find((x) => x.id === +a.slice(1)); if (j) { pids.push(j.pid); j.done = true; j.code = 143; } else c.err(`${c.sh.name}: kill: ${a}: no such job\n`); }
      else if (/^\d+$/.test(a)) pids.push(+a);
      else { c.err(`${c.sh.name}: kill: ${a}: arguments must be process or job IDs\n`); return 1; }
    }
    if (!pids.length) { c.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n'); return 2; }
    let code = 0;
    pids.forEach((p) => { code |= killPid(c, p, sig); });
    return code;
  });
  def('killall pkill', (c) => {
    const { rest } = getopt(c.args, 'fiu:9s:');
    const pat = rest[0];
    if (!pat) return c.fail('no process name specified');
    const re = c.name === 'killall' ? new RegExp('^' + pat + '$', 'i') : new RegExp(pat);
    const hits = c.m.procs.filter((p) => re.test(p.name));
    if (!hits.length) { if (c.name === 'killall') c.err(`${pat}: no process found\n`); return 1; }
    let code = 0;
    hits.forEach((p) => { if (p.user !== c.user && c.user !== 'root') { c.err(`${c.name}: killing pid ${p.pid} failed: Operation not permitted\n`); code = 1; } else c.m.kill(p.pid); });
    return code;
  });
  def('top', async (c) => {
    const batch = c.args.some((a) => /^-(l|b|bn\d*)/.test(a));
    if (batch || !c.tty) { if (!batch) return c.fail('failed tty get'); c.outln(TX.apps.top(null, c.m, { batch: true, mac: c.m.kind === 'mac', cols: c.cols, rows: 30 })); return; }
    await TX.apps.top(c.term, c.m, { htop: false, mac: c.m.kind === 'mac' });
  }, { only: UNIX });
  def('htop', async (c) => { if (!c.tty) return c.fail('stdout is not a TTY'); await TX.apps.top(c.term, c.m, { htop: true }); }, { pkg: 'htop' });
  def('watch', async (c) => {
    const { f, rest } = getopt(c.args, 'n:td');
    if (!rest.length) return c.fail('usage: watch [options] command');
    await TX.apps.watch(c.term, c.sh, rest.join(' '), parseFloat(f.n || 2), !f.t);
  });

  // ------------------------------------------------------------------ services
  function svcStatus(c, s) {
    const d = new Date(c.m.boot);
    const since = `${TX.DAY[d.getDay()]} ${TX.isoDate(c.m.boot)} EDT; ${TX.relTime(c.m.boot).replace(' ago', '')} ago`;
    const dot = s.active ? C.style(['bold', 'green'], '●') : '○';
    const lines = [`${dot} ${s.name}.service - ${s.desc}`, `     Loaded: loaded (/usr/lib/systemd/system/${s.name}.service; ${s.enabled ? 'enabled' : 'disabled'}; preset: enabled)`, `     Active: ${s.active ? C.style(['bold', 'green'], 'active (running)') : 'inactive (dead)'}${s.active ? ' since ' + since : ''}`];
    if (s.active) {
      lines.push(`       Docs: man:${s.name}(8)`, `   Main PID: ${s.pid} (${s.name})`, `      Tasks: ${TX.randInt(1, 40)} (limit: 18898)`, `     Memory: ${(Math.random() * 40 + 2).toFixed(1)}M (peak: ${(Math.random() * 60 + 5).toFixed(1)}M)`, `        CPU: ${TX.randInt(20, 3000)}ms`, `     CGroup: /system.slice/${s.name}.service`, `             └─${s.pid} ${c.m.procs.find((p) => p.pid === s.pid) ? c.m.procs.find((p) => p.pid === s.pid).cmd : '/usr/sbin/' + s.name}`);
      lines.push('', `${TX.MON[d.getMonth()]} ${d.getDate()} ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:02 ${c.m.net.hostname} systemd[1]: Starting ${s.name}.service - ${s.desc}...`, `${TX.MON[d.getMonth()]} ${d.getDate()} ${TX.p2(d.getHours())}:${TX.p2(d.getMinutes())}:03 ${c.m.net.hostname} systemd[1]: Started ${s.name}.service - ${s.desc}.`);
    }
    return lines.join('\n');
  }
  def('systemctl', (c) => {
    const [sub, ...rest] = c.args.filter((a) => !a.startsWith('--'));
    const name = (rest[0] || '').replace(/\.service$/, '');
    const svc = c.m.services.find((s) => s.name === name);
    switch (sub || 'list-units') {
      case 'status':
        if (!name) { c.outln(`${C.style(['bold', 'green'], '●')} ${c.m.net.hostname}\n    State: running\n    Units: 318 loaded (incl. loaded aliases)\n     Jobs: 0 queued\n   Failed: 0 units\n    Since: ${TX.isoDate(c.m.boot)} EDT; ${TX.relTime(c.m.boot)}`); return; }
        if (!svc) { c.err(`Unit ${name}.service could not be found.\n`); return 4; }
        c.outln(svcStatus(c, svc)); return svc.active ? 0 : 3;
      case 'start': case 'stop': case 'restart': case 'enable': case 'disable': case 'reload': {
        if (!svc) { c.err(`Failed to ${sub} ${name}.service: Unit ${name}.service not found.\n`); return 5; }
        if (c.user !== 'root') { c.err(`${C.style(['bold', 'red'], '==== AUTHENTICATING FOR org.freedesktop.systemd1.manage-units ====')}\nAuthentication is required to ${sub} '${name}.service'.\nAuthenticating as: Student,,, (student)\n${C.dim('(tip: use  sudo systemctl ' + sub + ' ' + name + ')')}\n`); c.err(`Failed to ${sub} ${name}.service: Access denied\n`); return 1; }
        if (sub === 'start' || sub === 'restart') { if (!svc.active || sub === 'restart') { if (svc.pid) c.m.kill(svc.pid); svc.pid = c.m.spawn(name, { user: 'root', cmd: '/usr/sbin/' + name, tty: '?' }).pid; } svc.active = true; }
        if (sub === 'stop') { svc.active = false; if (svc.pid) c.m.kill(svc.pid); svc.pid = null; }
        if (sub === 'enable') { svc.enabled = true; c.err(`Synchronizing state of ${name}.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.\nExecuting: /usr/lib/systemd/systemd-sysv-install enable ${name}\n`); }
        if (sub === 'disable') { svc.enabled = false; c.err(`Removed "/etc/systemd/system/multi-user.target.wants/${name}.service".\n`); }
        return 0;
      }
      case 'is-active': if (!svc) { c.outln('inactive'); return 3; } c.outln(svc.active ? 'active' : 'inactive'); return svc.active ? 0 : 3;
      case 'is-enabled': if (!svc) return 1; c.outln(svc.enabled ? 'enabled' : 'disabled'); return 0;
      case 'list-units': case 'list-unit-files': {
        const rows = [['UNIT', 'LOAD', 'ACTIVE', 'SUB', 'DESCRIPTION']].concat(c.m.services.filter((s) => s.active || c.args.includes('--all')).map((s) => [s.name + '.service', 'loaded', s.active ? 'active' : 'inactive', s.active ? 'running' : 'dead', s.desc]));
        c.outln(TX.table(rows, [], '  ') + `\n\nLegend: LOAD   → Reflects whether the unit definition was properly loaded.\n        ACTIVE → The high-level unit activation state, i.e. generalization of SUB.\n        SUB    → The low-level unit activation state, values depend on unit type.\n\n${rows.length - 1} loaded units listed.`);
        return 0;
      }
      case 'reboot': case 'poweroff': return cmdsShutdown(c);
      default: c.err(`Unknown command verb '${sub}'.\n`); return 1;
    }
  }, { only: LX });
  def('service', (c) => {
    const [name, action] = c.args;
    if (c.args[0] === '--status-all') { c.m.services.forEach((s) => c.outln(` [ ${s.active ? '+' : '-'} ]  ${s.name}`)); return; }
    return TX.posixCmds.systemctl.fn(Object.assign({}, c, { args: [action || 'status', name] }));
  }, { only: LX });
  def('journalctl', (c) => {
    const { f } = getopt(c.args, 'u:n:fxeb', { unit: 'u', lines: 'n' });
    let text = c.vfs.content(c.vfs.get(['var', 'log', 'syslog']));
    let L = TX.splitLines(text);
    if (f.u) L = L.filter((l) => l.toLowerCase().includes(String(f.u).replace('.service', '').toLowerCase())).concat([`${TX.MON[new Date().getMonth()]} ${new Date().getDate()} 08:12:03 ${c.m.net.hostname} systemd[1]: Started ${f.u}.service.`]);
    if (f.n) L = L.slice(-parseInt(f.n, 10));
    c.outln(L.join('\n'));
  }, { only: LX });
  def('crontab', (c) => {
    if (c.args[0] === '-l') { const n = c.vfs.get(['var', 'spool', 'cron', c.user]); if (!n) { c.err(`no crontab for ${c.user}\n`); return 1; } c.out(c.vfs.content(n)); return; }
    if (c.args[0] === '-e') { c.vfs.mkdir(['var', 'spool', 'cron'], { parents: true }); const segs = ['var', 'spool', 'cron', c.user]; if (!c.vfs.get(segs)) c.vfs.writeFile(segs, '# Edit this file to introduce tasks to be run by cron.\n#\n# m h  dom mon dow   command\n# 0 7 * * 1-5 echo "Good morning!"\n'); return TX.apps.nano(c.term, c.vfs, segs, { title: '/tmp/crontab.' + TX.randInt(1000, 9999) + '/crontab' }).then(() => { c.err('crontab: installing new crontab\n'); }); }
    return c.fail('usage error: file name or - (for stdin) must be specified');
  }, { only: UNIX });
  function cmdsShutdown(c) {
    if (c.user !== 'root' && c.m.kind !== 'mac') { c.err('Call to PowerOff failed: Access denied\n' + C.dim('(and TerminalEX won\'t let you turn off the pretend computer anyway!)') + '\n'); return 1; }
    c.outln(`\nBroadcast message from ${c.user}@${c.m.net.hostname} on pts/0 (${TX.unixDate(Date.now())}):\n\nThe system will ${c.name === 'reboot' ? 'reboot' : 'power off'} now!\n`);
    return c.sleep(1200).then(() => { c.term.clear(); c.m.boot = Date.now(); c.out(C.dim('[ TerminalEX: pretend reboot complete ]\n')); });
  }
  def('shutdown reboot poweroff halt', cmdsShutdown, { only: UNIX });

  // ------------------------------------------------------------------ network
  const netT = (c) => c.m.net;
  def('ip', (c) => {
    const n = netT(c);
    const [obj, sub] = c.args.filter((a) => !a.startsWith('-'));
    const color = c.args.includes('-c') || c.args.includes('-color');
    const brief = c.args.includes('-br') || c.args.includes('-brief');
    const cg = (s) => (color && c.tty ? C.green(s) : s), cb = (s) => (color && c.tty ? C.blue(s) : s), cm = (s) => (color && c.tty ? C.magenta(s) : s);
    if (!obj) { c.err('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\nwhere  OBJECT := { address | link | route | neigh | ... }\n'); return 255; }
    if ('address'.startsWith(obj) || obj === 'a' || obj === 'addr') {
      if (brief) { c.outln(`lo               UNKNOWN        127.0.0.1/8 ::1/128\n${n.iface.padEnd(16)} UP             ${n.ip}/24 ${n.ip6}/64\n${n.wifi.padEnd(16)} DOWN           `); return; }
      c.outln(`1: ${cb('lo')}: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet ${cm('127.0.0.1')}/8 scope host lo\n       valid_lft forever preferred_lft forever\n    inet6 ::1/128 scope host noprefixroute \n       valid_lft forever preferred_lft forever\n2: ${cb(n.iface)}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state ${cg('UP')} group default qlen 1000\n    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff\n    inet ${cm(n.ip)}/24 brd 192.168.1.255 scope global dynamic noprefixroute ${n.iface}\n       valid_lft 85672sec preferred_lft 85672sec\n    inet6 ${n.ip6}/64 scope link noprefixroute \n       valid_lft forever preferred_lft forever\n3: ${cb(n.wifi)}: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default qlen 1000\n    link/ether 3c:a9:f4:21:7b:0e brd ff:ff:ff:ff:ff:ff`);
      return;
    }
    if ('route'.startsWith(obj) || obj === 'r') { c.outln(`default via ${n.gw} dev ${n.iface} proto dhcp src ${n.ip} metric 100 \n192.168.1.0/24 dev ${n.iface} proto kernel scope link src ${n.ip} metric 100 `); return; }
    if ('link'.startsWith(obj) || obj === 'l') { c.outln(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n2: ${n.iface}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000\n    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff\n3: ${n.wifi}: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DORMANT group default qlen 1000\n    link/ether 3c:a9:f4:21:7b:0e brd ff:ff:ff:ff:ff:ff`); return; }
    if ('neighbour'.startsWith(obj) || obj === 'n') { c.outln(`${n.gw} dev ${n.iface} lladdr 44:d9:e7:0a:1b:2c REACHABLE\n192.168.1.57 dev ${n.iface} lladdr a4:83:e7:1c:9b:20 STALE\n192.168.1.105 dev ${n.iface} lladdr 3c:52:82:5a:10:fe STALE`); return; }
    void sub;
    c.err(`Object "${obj}" is unknown, try "ip help".\n`); return 1;
  }, { only: LX });
  def('ifconfig', (c) => {
    const want = c.args.find((a) => !a.startsWith('-'));
    if (want) {
      let buf = '';
      const sub = Object.assign({}, c, { outln: (s) => { buf += s + '\n'; }, out: (s) => { buf += s; } });
      TX.posixCmds.ifconfig.fn(Object.assign(sub, { args: [] }));
      const blocks = buf.split(/\n(?=\S)/);
      const hit = blocks.find((b) => b.startsWith(want + ':'));
      if (!hit) { c.err(`ifconfig: interface ${want} does not exist\n`); return 1; }
      c.outln(hit.replace(/\n+$/, ''));
      return 0;
    }
    const n = netT(c);
    if (c.m.kind === 'mac') {
      c.outln(`lo0: flags=8049<UP,LOOPBACK,RUNNING,MULTICAST> mtu 16384\n\toptions=1203<RXCSUM,TXCSUM,TXSTATUS,SW_TIMESTAMP>\n\tinet 127.0.0.1 netmask 0xff000000\n\tinet6 ::1 prefixlen 128 \n\tinet6 fe80::1%lo0 prefixlen 64 scopeid 0x1 \n\tnd6 options=201<PERFORMNUD,DAD>\ngif0: flags=8010<POINTOPOINT,MULTICAST> mtu 1280\nstf0: flags=0<> mtu 1280\nen0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500\n\toptions=6460<TSO4,TSO6,CHANNEL_IO,PARTIAL_CSUM,ZEROINVERT_CSUM>\n\tether ${n.mac}\n\tinet6 ${n.ip6}%en0 prefixlen 64 secured scopeid 0xb \n\tinet ${n.ip} netmask 0xffffff00 broadcast 192.168.1.255\n\tnd6 options=201<PERFORMNUD,DAD>\n\tmedia: autoselect\n\tstatus: active\nawdl0: flags=8843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST> mtu 1500\n\tether 12:3f:88:0e:4a:71\n\tmedia: autoselect\n\tstatus: active\nutun0: flags=8051<UP,POINTOPOINT,RUNNING,MULTICAST> mtu 1380`);
      return;
    }
    c.outln(`${n.iface}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet ${n.ip}  netmask 255.255.255.0  broadcast 192.168.1.255\n        inet6 ${n.ip6}  prefixlen 64  scopeid 0x20<link>\n        ether ${n.mac}  txqueuelen 1000  (Ethernet)\n        RX packets 1284311  bytes 1693325128 (1.6 GB)\n        RX errors 0  dropped 0  overruns 0  frame 0\n        TX packets 402117  bytes 61231881 (61.2 MB)\n        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0\n\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        inet6 ::1  prefixlen 128  scopeid 0x10<host>\n        loop  txqueuelen 1000  (Local Loopback)\n        RX packets 20331  bytes 2121098 (2.1 MB)\n        RX errors 0  dropped 0  overruns 0  frame 0\n        TX packets 20331  bytes 2121098 (2.1 MB)\n        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0\n\n${n.wifi}: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500\n        ether 3c:a9:f4:21:7b:0e  txqueuelen 1000  (Ethernet)`);
  }, { only: UNIX, pkgLinux: 'net-tools' });
  def('ping', async (c) => {
    const { f, rest } = getopt(c.args, 'c:i:W:w:s:t:qn46');
    const host = rest[0];
    const mac = c.m.kind === 'mac';
    if (!host) { c.err(mac ? 'usage: ping [-AaDdfnoQqRrv] [-c count] [-G sweepmaxsize] host\n' : 'ping: usage error: Destination address required\n'); return mac ? 64 : 1; }
    const ip = TX.resolve(host);
    if (!ip) { c.err(mac ? `ping: cannot resolve ${host}: Unknown host\n` : `ping: ${host}: ${/\./.test(host) ? 'Name or service not known' : 'Temporary failure in name resolution'}\n`); return 2; }
    const count = f.c ? parseInt(f.c, 10) : Infinity;
    const size = parseInt(f.s || 56, 10);
    const ttl = ip.startsWith('192.168') || ip.startsWith('127') ? 64 : ip.startsWith('142') ? 117 : 54;
    const rtts = [];
    const t0 = Date.now();
    c.outln(mac ? `PING ${host} (${ip}): ${size} data bytes` : `PING ${host} (${ip}) ${size}(${size + 28}) bytes of data.`);
    let seq = mac ? 0 : 1, sent = 0;
    const rname = host === ip ? ip : (/google/.test(host) ? `lga34s32-in-f14.1e100.net (${ip})` : `${host} (${ip})`);
    try {
      while (sent < count) {
        const rtt = TX.latency(host) * (0.9 + Math.random() * 0.25);
        sent++;
        await c.sleep(Math.max(rtt, 30));
        const lost = Math.random() < 0.02 && ip.startsWith('9');
        if (!lost) { rtts.push(rtt); if (!f.q) c.outln(mac ? `${size + 8} bytes from ${ip}: icmp_seq=${seq} ttl=${ttl} time=${rtt.toFixed(3)} ms` : `${size + 8} bytes from ${rname}: icmp_seq=${seq} ttl=${ttl} time=${rtt < 10 ? rtt.toFixed(2) : rtt.toFixed(1)} ms`); }
        seq++;
        if (sent < count) await c.sleep(Math.max(100, parseFloat(f.i || 1) * 1000 - rtt));
      }
    } catch (e) { if (!e.interrupt) throw e; c.out('\n'); }
    const loss = sent ? Math.round(((sent - rtts.length) / sent) * 100) : 0;
    const mn = Math.min(...rtts), mx = Math.max(...rtts), avg = rtts.reduce((a, b) => a + b, 0) / (rtts.length || 1);
    const mdev = Math.sqrt(rtts.reduce((a, b) => a + (b - avg) ** 2, 0) / (rtts.length || 1));
    c.outln(`\n--- ${host} ping statistics ---\n${sent} packets transmitted, ${rtts.length} ${mac ? 'packets received' : 'received'}, ${mac ? loss.toFixed(1) : loss}% packet loss${mac ? '' : `, time ${Date.now() - t0}ms`}`);
    if (rtts.length) c.outln(`${mac ? 'round-trip' : 'rtt'} min/avg/max/${mac ? 'stddev' : 'mdev'} = ${mn.toFixed(3)}/${avg.toFixed(3)}/${mx.toFixed(3)}/${mdev.toFixed(3)} ms`);
    return rtts.length ? 0 : 1;
  });
  def('traceroute tracepath', async (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!host) return c.fail('missing host operand');
    const hops = TX.hops(host);
    if (!hops) { c.err(`${host}: Name or service not known\nCannot handle "host" cmdline arg \`${host}' on position 1 (argc 1)\n`); return 2; }
    c.outln(`traceroute to ${host} (${TX.resolve(host)}), ${c.m.kind === 'mac' ? '64 hops max, 40 byte packets' : '30 hops max, 60 byte packets'}`);
    try {
      for (let i = 0; i < hops.length; i++) {
        const [h, ip, ms] = hops[i];
        await c.sleep(250 + ms * 8);
        if (h === '*') { c.outln(`${String(i + 1).padStart(2)}  * * *`); continue; }
        const t = [ms, ms * (0.95 + Math.random() * 0.1), ms * (0.95 + Math.random() * 0.12)].map((x) => x.toFixed(3) + ' ms');
        c.outln(`${String(i + 1).padStart(2)}  ${h} (${ip})  ${t.join('  ')}`);
      }
    } catch (e) { if (!e.interrupt) throw e; c.out('\n'); return 130; }
  }, { pkgLinux: 'traceroute' });
  def('dig', (c) => {
    const args = c.args.filter((a) => !a.startsWith('@'));
    const short = args.includes('+short');
    const host = args.filter((a) => !a.startsWith('+') && !a.startsWith('-') && !['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'ANY'].includes(a.toUpperCase()))[0] || '.';
    const type = (args.find((a) => ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'ANY'].includes(a.toUpperCase())) || 'A').toUpperCase();
    const recs = TX.DNS[host.toLowerCase()];
    let answers = [];
    if (recs) {
      if (type === 'A') answers = recs.filter((x) => x.includes('.')).map((x) => [host + '.', TX.randInt(60, 300), 'IN', 'A', x]);
      if (type === 'AAAA') answers = recs.filter((x) => x.includes(':')).map((x) => [host + '.', TX.randInt(60, 300), 'IN', 'AAAA', x]);
      if (type === 'MX') answers = [[host + '.', 300, 'IN', 'MX', '10 mail.' + host + '.']];
      if (type === 'NS') answers = [1, 2].map((k) => [host + '.', 86400, 'IN', 'NS', `ns${k}.${host}.`]);
      if (type === 'TXT') answers = [[host + '.', 3600, 'IN', 'TXT', '"v=spf1 include:_spf.' + host + ' ~all"']];
    }
    if (short) { answers.forEach((a) => c.outln(a[4])); return; }
    const server = c.m.kind === 'mac' ? '192.168.1.1' : '127.0.0.53';
    c.outln(`\n; <<>> DiG 9.18.28-0ubuntu0.24.04.1-Ubuntu <<>> ${c.args.join(' ')}\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ${recs ? 'NOERROR' : 'NXDOMAIN'}, id: ${TX.randInt(1000, 65000)}\n;; flags: qr rd ra; QUERY: 1, ANSWER: ${answers.length}, AUTHORITY: 0, ADDITIONAL: 1\n\n;; OPT PSEUDOSECTION:\n; EDNS: version: 0, flags:; udp: 65494\n;; QUESTION SECTION:\n;${host}.\t\t\tIN\t${type}\n` + (answers.length ? `\n;; ANSWER SECTION:\n${answers.map((a) => a.join('\t')).join('\n')}\n` : '') + `\n;; Query time: ${TX.randInt(2, 40)} msec\n;; SERVER: ${server}#53(${server}) (UDP)\n;; WHEN: ${TX.unixDate(Date.now())}\n;; MSG SIZE  rcvd: ${TX.randInt(40, 120)}\n`);
  }, { only: ['linux', 'mac'] });
  def('nslookup', (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!host) { c.outln('> (interactive mode is not supported in TerminalEX; try: nslookup google.com)'); return; }
    const recs = TX.DNS[host.toLowerCase()];
    const server = c.sh.flavor === 'gitbash' ? null : c.m.kind === 'mac' ? '192.168.1.1' : '127.0.0.53';
    if (server) c.outln(`Server:\t\t${server}\nAddress:\t${server}#53\n`);
    else c.outln(`Server:  router.lan\nAddress:  192.168.1.1\n`);
    if (!recs) { c.outln(`** server can't find ${host}: NXDOMAIN\n`); return 1; }
    c.outln('Non-authoritative answer:');
    recs.forEach((ip) => c.outln(`Name:\t${host}\nAddress: ${ip}`));
    c.outln('');
  });
  def('host', (c) => {
    const host = c.args[0];
    if (!host) return c.fail('Usage: host [-aCdilrTvVw] [-c class] [-N ndots] [-t type] [-W time]\n            [-R number] [-m flag] [-p port] hostname [server]');
    const recs = TX.DNS[host.toLowerCase()];
    if (!recs) { c.outln(`Host ${host} not found: 3(NXDOMAIN)`); return 1; }
    recs.forEach((ip) => c.outln(`${host} has ${ip.includes(':') ? 'IPv6 ' : ''}address ${ip}`));
    c.outln(`${host} mail is handled by 10 mail.${host}.`);
  }, { only: UNIX });
  def('curl', async (c) => {
    const { f, rest } = getopt(c.args, 'IsSLvo:OX:H:d:A:ikfu:w:', { head: 'I', silent: 's', location: 'L', verbose: 'v', output: 'o', 'remote-name': 'O', request: 'X', header: 'H', data: 'd', include: 'i', insecure: 'k' });
    const url = rest[0];
    if (!url) { c.err("curl: try 'curl --help' or 'curl --manual' for more information\n"); return 2; }
    const host = url.replace(/^https?:\/\//, '').split('/')[0];
    if (!TX.resolve(host)) { c.err(`curl: (6) Could not resolve host: ${host}\n`); return 6; }
    await c.sleep(TX.latency(host) * 3 + 80);
    const res = TX.http(url);
    const headers = `HTTP/2 ${res.status}\r\ncontent-type: ${res.type}; charset=utf-8\r\ndate: ${new Date().toUTCString()}\r\nserver: ${/github/.test(host) ? 'github.com' : /google/.test(host) ? 'gws' : 'nginx'}\r\ncontent-length: ${res.body.length}\r\ncache-control: max-age=600\r\n\r\n`;
    if (f.v) c.err(`*   Trying ${TX.resolve(host)}:443...\n* Connected to ${host} (${TX.resolve(host)}) port 443\n* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / X25519 / RSASSA-PSS\n> GET /${url.replace(/^https?:\/\//, '').split('/').slice(1).join('/')} HTTP/2\n> Host: ${host}\n> User-Agent: curl/8.5.0\n> Accept: */*\n>\n< ${headers.replace(/\r\n$/, '').replace(/\r\n/g, '\n< ')}\n`);
    if (f.I) { c.out(headers.replace(/\r/g, '')); return; }
    const out = (f.i ? headers.replace(/\r/g, '') : '') + res.body + (res.type === 'application/json' || res.body.endsWith('\n') ? '' : '');
    if (f.o || f.O) {
      const name = f.o || url.split('/').filter(Boolean).pop() || 'index.html';
      c.vfs.writeFile(c.path(name), res.body, { user: c.user, owner: c.user });
      if (!f.s) c.err(`  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current\n                                 Dload  Upload   Total   Spent    Left  Speed\n100  ${String(res.body.length).padStart(5)}  100  ${String(res.body.length).padStart(5)}    0     0  ${TX.randInt(20, 90)}k      0 --:--:-- --:--:-- --:--:-- ${TX.randInt(20, 90)}k\n`);
      return;
    }
    c.out(out);
  });
  def('wget', async (c) => {
    const { f, rest } = getopt(c.args, 'qO:c', { quiet: 'q', 'output-document': 'O' });
    const url = rest[0];
    if (!url) { c.err('wget: missing URL\nUsage: wget [OPTION]... [URL]...\n'); return 1; }
    const full = /^https?:/.test(url) ? url : 'http://' + url;
    const host = full.replace(/^https?:\/\//, '').split('/')[0];
    const ip = TX.resolve(host);
    if (!f.q) c.err(`--${TX.isoDate(Date.now())}--  ${full}\nResolving ${host} (${host})... `);
    if (!ip) { c.err(`failed: Name or service not known.\nwget: unable to resolve host address ‘${host}’\n`); return 4; }
    const res = TX.http(full);
    const name = f.O || full.split('/').slice(3).filter(Boolean).pop() || 'index.html';
    if (!f.q) c.err(`${ip}\nConnecting to ${host} (${host})|${ip}|:443... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: ${res.body.length} (${TX.human(res.body.length)}) [${res.type}]\nSaving to: ‘${name}’\n\n`);
    for (let p = 0; p <= 100; p += 20) { if (!f.q) c.err(`\r${name.padEnd(20).slice(0, 20)}${String(p).padStart(4)}%[${'='.repeat(Math.floor(p / 5)).padEnd(20).replace(/=( )/, '>$1')}]  ${TX.human(res.body.length * p / 100).padStart(6)}  --.-KB/s    in 0s`); await c.sleep(60); }
    if (f.O === '-') { c.out(res.body); return; }
    c.vfs.writeFile(c.path(name), res.body, { user: c.user, owner: c.user });
    if (!f.q) c.err(`\n\n${TX.isoDate(Date.now())} (${TX.randInt(2, 30)}.${TX.randInt(0, 9)} MB/s) - ‘${name}’ saved [${res.body.length}/${res.body.length}]\n\n`);
  }, { pkg: 'wget' });
  function listening(m) {
    const svc = (n) => m.services.find((s) => s.name === n && s.active);
    const out = [['udp', 'UNCONN', '127.0.0.53%lo:53', '0.0.0.0:*', 'systemd-resolve'], ['udp', 'UNCONN', '0.0.0.0:5353', '0.0.0.0:*', 'avahi-daemon']];
    if (svc('ssh')) out.push(['tcp', 'LISTEN', '0.0.0.0:22', '0.0.0.0:*', 'sshd'], ['tcp', 'LISTEN', '[::]:22', '[::]:*', 'sshd']);
    if (svc('nginx')) out.push(['tcp', 'LISTEN', '0.0.0.0:80', '0.0.0.0:*', 'nginx']);
    if (svc('mysql')) out.push(['tcp', 'LISTEN', '127.0.0.1:3306', '0.0.0.0:*', 'mysqld'], ['tcp', 'LISTEN', '127.0.0.1:33060', '0.0.0.0:*', 'mysqld']);
    if (svc('cups')) out.push(['tcp', 'LISTEN', '127.0.0.1:631', '0.0.0.0:*', 'cupsd']);
    out.push(['tcp', 'ESTAB', m.net.ip + ':22', '192.168.1.57:52814', 'sshd'], ['tcp', 'ESTAB', m.net.ip + ':41822', '140.82.112.3:443', 'firefox']);
    return out;
  }
  def('ss', (c) => {
    const { f } = getopt(c.args, 'tulnpa');
    let rows = listening(c.m);
    if (f.l) rows = rows.filter((r) => r[1] !== 'ESTAB');
    if (f.t && !f.u) rows = rows.filter((r) => r[0] === 'tcp');
    if (f.u && !f.t) rows = rows.filter((r) => r[0] === 'udp');
    c.outln(TX.table([['Netid', 'State', 'Recv-Q', 'Send-Q', 'Local Address:Port', 'Peer Address:Port', 'Process']].concat(rows.map((r) => [r[0], r[1], '0', r[1] === 'LISTEN' ? '4096' : '0', r[2], r[3], f.p ? (c.user === 'root' ? `users:(("${r[4]}",pid=${TX.randInt(500, 3000)},fd=${TX.randInt(3, 12)}))` : '') : ''])), ['l', 'l', 'r', 'r', 'r', 'l', 'l']));
  }, { only: LX });
  def('netstat', (c) => {
    if (c.m.kind === 'mac' || c.args.includes('-r') || c.args.includes('-rn')) {
      if (c.args.join('').includes('r')) { c.outln(`Kernel IP routing table\nDestination     Gateway         Genmask         Flags   MSS Window  irtt Iface\n0.0.0.0         ${c.m.net.gw}     0.0.0.0         UG        0 0          0 ${c.m.net.iface}\n192.168.1.0     0.0.0.0         255.255.255.0   U         0 0          0 ${c.m.net.iface}`); return; }
    }
    const rows = listening(c.m).filter((r) => !c.args.join('').includes('l') || r[1] !== 'ESTAB');
    c.outln('Active Internet connections' + (c.args.join('').includes('l') ? ' (only servers)' : ' (servers and established)'));
    c.outln(TX.table([['Proto', 'Recv-Q', 'Send-Q', 'Local Address', 'Foreign Address', 'State']].concat(rows.map((r) => [r[0], '0', '0', r[2].replace(/%lo/, '').replace(/:(\d+)$/, ':$1'), r[3], r[1] === 'ESTAB' ? 'ESTABLISHED' : r[1] === 'UNCONN' ? '' : r[1]]))));
  }, { pkgLinux: 'net-tools', only: UNIX });
  def('arp', (c) => {
    c.outln(c.m.kind === 'mac' ? `router.lan (192.168.1.1) at 44:d9:e7:a:1b:2c on en0 ifscope [ethernet]\nubuntu-lab.lan (192.168.1.42) at 8:0:27:4e:66:a1 on en0 ifscope [ethernet]\ndesktop-lab42.lan (192.168.1.105) at 3c:52:82:5a:10:fe on en0 ifscope [ethernet]` : `Address                  HWtype  HWaddress           Flags Mask            Iface\n_gateway                 ether   44:d9:e7:0a:1b:2c   C                     ${c.m.net.iface}\nmacbook-pro.lan          ether   a4:83:e7:1c:9b:20   C                     ${c.m.net.iface}\ndesktop-lab42.lan        ether   3c:52:82:5a:10:fe   C                     ${c.m.net.iface}`);
  }, { pkgLinux: 'net-tools', only: UNIX });
  def('nmcli', (c) => {
    const a = c.args.join(' ');
    if (/wifi/.test(a)) { c.outln(`IN-USE  BSSID              SSID              MODE   CHAN  RATE        SIGNAL  BARS  SECURITY\n        44:D9:E7:0A:1B:30  SchoolNet-Students Infra  36    540 Mbit/s  82      ▂▄▆█  WPA2 802.1X\n        44:D9:E7:0A:1B:31  SchoolNet-Guest   Infra  6     130 Mbit/s  74      ▂▄▆_  WPA2\n        9C:3D:CF:11:22:33  Kinny's iPhone    Infra  11    130 Mbit/s  41      ▂▄__  WPA3\n        F0:9F:C2:AA:BB:CC  xfinitywifi       Infra  1     65 Mbit/s   22      ▂___  --`); return; }
    c.outln(`${c.m.net.iface}: connected to Wired connection 1\n        "Intel Ethernet I219-LM"\n        ethernet (e1000e), ${c.m.net.mac.toUpperCase()}, hw, mtu 1500\n        ip4 default\n        inet4 ${c.m.net.ip}/24\n        route4 192.168.1.0/24 metric 100\n        route4 default via ${c.m.net.gw} metric 100\n\n${c.m.net.wifi}: disconnected\n        "Intel Alder Lake-P PCH CNVi WiFi"\n        wifi (iwlwifi), 3C:A9:F4:21:7B:0E, hw, mtu 1500\n\nlo: connected (externally) to lo\n        "lo"\n        loopback (unknown), 00:00:00:00:00:00, sw, mtu 65536\n\nDNS configuration:\n        servers: ${c.m.net.dns}\n        domains: lan\n        interface: ${c.m.net.iface}`);
  }, { only: LX });
  def('ufw', (c) => {
    if (c.user !== 'root') return c.fail('ERROR: You need to be root to run this script');
    c.outln('Status: active\n\nTo                         Action      From\n--                         ------      ----\n22/tcp                     ALLOW       Anywhere\n80/tcp                     ALLOW       Anywhere\n22/tcp (v6)                ALLOW       Anywhere (v6)\n80/tcp (v6)                ALLOW       Anywhere (v6)');
  }, { only: LX });
  def('nmap', async (c) => {
    const target = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!target) { c.outln('Nmap 7.94SVN ( https://nmap.org )\nUsage: nmap [Scan Type(s)] [Options] {target specification}'); return; }
    const t0 = Date.now();
    c.outln(`Starting Nmap 7.94SVN ( https://nmap.org ) at ${TX.isoDate(Date.now()).slice(0, 16)} EDT`);
    const hosts = /\/24$|\*$/.test(target) ? [['router.lan', '192.168.1.1', ['53/tcp   open  domain', '80/tcp   open  http', '443/tcp  open  https']], ['ubuntu-lab.lan', '192.168.1.42', ['22/tcp   open  ssh', '80/tcp   open  http']], ['macbook-pro.lan', '192.168.1.57', ['5000/tcp open  upnp', '7000/tcp open  afs3-fileserver']], ['desktop-lab42.lan', '192.168.1.105', ['135/tcp  open  msrpc', '139/tcp  open  netbios-ssn', '445/tcp  open  microsoft-ds']]] : (() => { const ip = TX.resolve(target); if (!ip) return null; return [[target, ip, ip === '192.168.1.42' || /ubuntu/.test(target) ? ['22/tcp   open  ssh', '80/tcp   open  http'] : ['80/tcp   open  http', '443/tcp  open  https']]]; })();
    if (!hosts) { c.outln(`Failed to resolve "${target}".\nWARNING: No targets were specified, so 0 hosts scanned.\nNmap done: 0 IP addresses (0 hosts up) scanned in 0.04 seconds`); return; }
    for (const [h, ip, ports] of hosts) {
      await c.sleep(600);
      c.outln(`Nmap scan report for ${h} (${ip})\nHost is up (0.00${TX.randInt(10, 90)}s latency).\nNot shown: ${1000 - ports.length} closed tcp ports (conn-refused)\nPORT     STATE SERVICE\n${ports.join('\n')}\n`);
    }
    c.outln(`Nmap done: ${/\/24$/.test(target) ? 256 : 1} IP address${/\/24$/.test(target) ? 'es' : ''} (${hosts.length} host${hosts.length > 1 ? 's' : ''} up) scanned in ${((Date.now() - t0) / 1000 + 1.3).toFixed(2)} seconds`);
    c.err(C.dim('Reminder: only scan networks you own or have permission to test!\n'));
  }, { pkg: 'nmap' });
  def('whois', (c) => {
    const d = c.args[0];
    if (!d) return c.fail('Usage: whois [OPTION]... OBJECT...');
    if (!TX.DNS[d.toLowerCase()]) { c.outln(`No match for "${d.toUpperCase()}".`); return 1; }
    c.outln(`   Domain Name: ${d.toUpperCase()}\n   Registry Domain ID: ${TX.randInt(1e6, 9e6)}_DOMAIN_COM-VRSN\n   Registrar WHOIS Server: whois.markmonitor.com\n   Registrar URL: http://www.markmonitor.com\n   Updated Date: 2024-08-02T02:17:33Z\n   Creation Date: 1997-09-15T04:00:00Z\n   Registry Expiry Date: 2028-09-14T04:00:00Z\n   Registrar: MarkMonitor Inc.\n   Domain Status: clientDeleteProhibited\n   Name Server: NS1.${d.toUpperCase()}\n   Name Server: NS2.${d.toUpperCase()}\n   DNSSEC: unsigned`);
  }, { pkg: 'whois' });
  def('ssh', async (c) => {
    const target = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!target) { c.err('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [-b bind_address]\n           destination [command [argument ...]]\n'); return 255; }
    let [user, host] = target.includes('@') ? target.split('@') : [c.user === 'root' ? 'root' : 'student', target];
    const ip = TX.resolve(host);
    if (!ip) { c.err(`ssh: Could not resolve hostname ${host}: ${c.m.kind === 'mac' ? 'nodename nor servname provided, or not known' : 'Name or service not known'}\n`); return 255; }
    const kinds = { '192.168.1.42': 'linux', '192.168.1.57': 'mac', '192.168.1.105': 'windows' };
    const kind = kinds[ip];
    await c.sleep(300);
    if (!kind) { await c.sleep(1500); c.err(`ssh: connect to host ${host} port 22: ${ip.startsWith('192') ? 'Connection refused' : 'Connection timed out'}\n`); return 255; }
    if (kind === 'windows') { c.err(`ssh: connect to host ${host} port 22: Connection refused\n${C.dim('(the OpenSSH Server service is stopped on DESKTOP-LAB42)')}\n`); return 255; }
    if (kind === 'linux') { const svc = TX.app.machine('linux').services.find((s) => s.name === 'ssh'); if (svc && !svc.active) { c.err(`ssh: connect to host ${host} port 22: Connection refused\n`); return 255; } }
    const known = c.sh.session.knownHosts = c.sh.session.knownHosts || new Set();
    if (!known.has(host)) {
      c.outln(`The authenticity of host '${host} (${ip})' can't be established.\nED25519 key fingerprint is SHA256:${TX.b64encode(TX.sha256(host)).slice(0, 43)}.\nThis key is not known by any other names.`);
      const ans = await c.readLine('Are you sure you want to continue connecting (yes/no/[fingerprint])? ');
      if (ans.trim() !== 'yes') { c.err('Host key verification failed.\n'); return 255; }
      c.err(`Warning: Permanently added '${host}' (ED25519) to the list of known hosts.\n`);
      known.add(host);
    }
    const valid = { student: 'student', teacher: 'teacher' };
    for (let tries = 0; tries < 3; tries++) {
      const pw = await c.readLine(`${user}@${host}'s password: `, { hidden: true });
      if (valid[user] && pw === valid[user]) {
        const target2 = TX.app.machine(kind);
        const sh2 = new TX.PosixShell(c.sh.session, target2, kind === 'mac' ? 'zsh' : 'bash', { user });
        sh2.sshFrom = host;
        c.sh.session.pushShell(sh2, true);
        return 0;
      }
      c.err('Permission denied, please try again.\n');
    }
    c.err(`${user}@${host}: Permission denied (publickey,password).\n`);
    return 255;
  }, { only: ['linux', 'mac', 'gitbash'] });

  // ------------------------------------------------------------------ users & privilege
  async function askSudo(c) {
    const sh = c.sh;
    if (sh.user === 'root' || Date.now() < sh.sudoUntil) return true;
    if (sh.user !== 'student' && sh.user !== 'teacher') { c.err(`${sh.user} is not in the sudoers file.\n`); return false; }
    for (let i = 0; i < 3; i++) {
      const pw = await c.readLine(c.m.kind === 'mac' ? 'Password:' : `[sudo] password for ${sh.user}: `, { hidden: true });
      if (pw === sh.user) { sh.sudoUntil = Date.now() + 15 * 60 * 1000; return true; }
      c.err(i < 2 ? 'Sorry, try again.\n' : `sudo: 3 incorrect password attempts\n`);
    }
    return false;
  }
  def('sudo', async (c) => {
    const sh = c.sh;
    const args = c.args.slice();
    if (!args.length) { c.err('usage: sudo -h | -K | -k | -V\nusage: sudo -v [-ABknS] [-g group] [-h host] [-p prompt] [-u user]\nusage: sudo [-ABbEHknPS] [-C num] [-D directory] [-g group] [-h host] [-p prompt] [-R directory] [-T timeout] [-u user] [VAR=value] [-i | -s] [command [arg ...]]\n'); return 1; }
    if (args[0] === '-k' || args[0] === '-K') { sh.sudoUntil = 0; return 0; }
    if (!(await askSudo(c))) return 1;
    if (args[0] === '-v') return 0;
    if (args[0] === '-l') { c.outln(`Matching Defaults entries for ${sh.user} on ${c.m.net.hostname}:\n    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\\:/snap/bin, use_pty\n\nUser ${sh.user} may run the following commands on ${c.m.net.hostname}:\n    (ALL : ALL) ALL`); return 0; }
    if (args[0] === '-i' || args[0] === '-s' || (args[0] === 'su' && args.length <= 2) || (args[0] === 'bash' && args.length === 1)) {
      sh.session.pushShell(new TX.PosixShell(sh.session, c.m, sh.flavor, { user: 'root', cwd: args[0] === '-s' ? sh.cwd : null }));
      return 0;
    }
    let runArgs = args;
    let as = 'root';
    if (args[0] === '-u') { as = args[1]; runArgs = args.slice(2); }
    const saved = sh.user;
    sh.user = as;
    try { return await sh.invoke(runArgs, c.io); } finally { sh.user = saved; }
  }, { only: UNIX });
  def('su', async (c) => {
    const target = c.args.filter((a) => a !== '-' && a !== '-l')[0] || 'root';
    if (c.user === 'root') { c.sh.session.pushShell(new TX.PosixShell(c.sh.session, c.m, c.sh.flavor, { user: target })); return 0; }
    const pw = await c.readLine('Password: ', { hidden: true });
    // FreeBSD, Solaris and old UNIX give root a real password (here: student); Ubuntu and macOS lock it.
    const rootPw = ['freebsd', 'solaris', 'unix'].includes(c.m.kind);
    const ok = (target === 'teacher' && pw === 'teacher') || (target === 'student' && pw === 'student') || (target === 'root' && rootPw && pw === 'student');
    if (!ok) { await c.sleep(1500); c.err(c.m.kind === 'unix' ? 'Sorry\n' : 'su: Authentication failure\n'); if (target === 'root') c.err(C.dim(rootPw ? '(hint: in TerminalEX the root password is  student )\n' : c.m.kind === 'mac' ? '(hint: macOS disables root. Try  sudo -i  instead.)\n' : '(hint: Ubuntu locks the root password. Try  sudo -i  instead.)\n')); return 1; }
    c.sh.session.pushShell(new TX.PosixShell(c.sh.session, c.m, c.sh.flavor, { user: target }));
    return 0;
  }, { only: UNIX });
  def('passwd', async (c) => {
    const who = c.args[0] || c.user;
    if (who !== c.user && c.user !== 'root') return c.fail(`You may not view or modify password information for ${who}.`);
    c.outln(`Changing password for ${who}.`);
    if (c.user !== 'root') await c.readLine('Current password: ', { hidden: true });
    const a = await c.readLine('New password: ', { hidden: true });
    const b = await c.readLine('Retype new password: ', { hidden: true });
    if (a !== b) { c.err('Sorry, passwords do not match.\npasswd: Authentication token manipulation error\npasswd: password unchanged\n'); return 10; }
    if (a.length < 8) { c.err('BAD PASSWORD: The password is shorter than 8 characters\n'); }
    c.outln('passwd: password updated successfully');
    c.err(C.dim('(TerminalEX keeps the practice password as "student" so you never get locked out.)\n'));
  }, { only: LX });
  def('useradd adduser', async (c) => {
    const name = c.args.filter((a) => !a.startsWith('-')).pop();
    if (!name) return c.fail('Usage: useradd [options] LOGIN');
    if (c.user !== 'root') return c.fail('Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.');
    if (c.m.users.includes(name)) return c.fail(`user '${name}' already exists`, 9);
    c.m.users.push(name);
    const uid = 1000 + c.m.users.length;
    const pw = c.vfs.get(['etc', 'passwd']);
    pw.c += `${name}:x:${uid}:${uid}::/home/${name}:/bin/bash\n`;
    if (c.name === 'adduser' || c.args.includes('-m')) {
      c.vfs.mkdir(['home', name], { parents: true, owner: name });
      if (c.name === 'adduser') c.outln(`info: Adding user \`${name}' ...\ninfo: Selecting UID/GID from range 1000 to 59999 ...\ninfo: Adding new group \`${name}' (${uid}) ...\ninfo: Adding new user \`${name}' (${uid}) with group \`${name} (${uid})' ...\ninfo: Creating home directory \`/home/${name}' ...\ninfo: Copying files from \`/etc/skel' ...`);
    }
    c.vfs.changed();
  }, { only: LX });
  def('userdel deluser', (c) => {
    const name = c.args.filter((a) => !a.startsWith('-')).pop();
    if (c.user !== 'root') return c.fail('Permission denied.');
    if (!c.m.users.includes(name)) return c.fail(`user '${name}' does not exist`, 6);
    if (['root', 'student'].includes(name)) return c.fail(`user ${name} is currently used by process 1`, 8);
    c.m.users = c.m.users.filter((u) => u !== name);
    const pw = c.vfs.get(['etc', 'passwd']);
    pw.c = pw.c.split('\n').filter((l) => !l.startsWith(name + ':')).join('\n');
    if (c.args.includes('-r')) try { c.vfs.remove(['home', name], { recursive: true }); } catch (e) { /* none */ }
    c.vfs.changed();
  }, { only: LX });
  def('usermod', (c) => { if (c.user !== 'root') return c.fail('Permission denied.'); }, { only: LX });

  // ------------------------------------------------------------------ packages
  async function aptInstall(c, names, remove) {
    const sh = c.sh;
    if (c.user !== 'root') { c.err(`E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n`); return 100; }
    c.outln('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done');
    const todo = [];
    for (const n of names) {
      const p = TX.pkgName(n);
      if (!p) { c.err(`E: Unable to locate package ${n}\n`); return 100; }
      if (!remove && c.m.installed.has(p)) { c.outln(`${n} is already the newest version (${TX.PKGS[p].ver}).`); continue; }
      if (remove && !c.m.installed.has(p)) { c.outln(`Package '${n}' is not installed, so not removed`); continue; }
      todo.push(p);
    }
    if (!todo.length) { c.outln(`0 upgraded, 0 newly installed, 0 to remove and 12 not upgraded.`); return 0; }
    const kb = todo.reduce((s, p) => s + TX.PKGS[p].kb, 0);
    if (remove) {
      c.outln(`The following packages will be REMOVED:\n  ${todo.join(' ')}\n0 upgraded, 0 newly installed, ${todo.length} to remove and 12 not upgraded.\nAfter this operation, ${(kb * 4.2).toFixed(1)} kB disk space will be freed.`);
      const ans = c.args.includes('-y') ? 'y' : await c.readLine('Do you want to continue? [Y/n] ');
      if (/^n/i.test(ans)) { c.outln('Abort.'); return 1; }
      c.outln('(Reading database ... 203512 files and directories currently installed.)');
      for (const p of todo) { c.outln(`Removing ${p} (${TX.PKGS[p].ver}) ...`); c.m.installed.delete(p); await c.sleep(250); }
      c.outln('Processing triggers for man-db (2.12.0-4build2) ...');
      TX.app.save();
      return 0;
    }
    c.outln(`The following NEW packages will be installed:\n  ${todo.join(' ')}\n0 upgraded, ${todo.length} newly installed, 0 to remove and 12 not upgraded.\nNeed to get ${kb.toFixed(1)} kB of archives.\nAfter this operation, ${(kb * 4.2).toFixed(1)} kB of additional disk space will be used.`);
    if (todo.length > 1 || kb > 500) {
      const ans = c.args.includes('-y') ? 'y' : await c.readLine('Do you want to continue? [Y/n] ');
      if (/^n/i.test(ans)) { c.outln('Abort.'); return 1; }
    }
    let k = 1;
    for (const p of todo) { await c.sleep(300); c.outln(`Get:${k++} http://archive.ubuntu.com/ubuntu noble/universe amd64 ${p} amd64 ${TX.PKGS[p].ver} [${TX.PKGS[p].kb} kB]`); }
    c.outln(`Fetched ${kb.toFixed(1)} kB in 1s (${TX.randInt(200, 900)} kB/s)`);
    for (const p of todo) {
      c.outln(`Selecting previously unselected package ${p}.\n(Reading database ... 203512 files and directories currently installed.)\nPreparing to unpack .../${p}_${TX.PKGS[p].ver}_amd64.deb ...`);
      for (let pct = 0; pct <= 100; pct += 25) { c.out(`\r\x1b[42m\x1b[30mProgress: [${String(pct).padStart(3)}%]\x1b[0m [${'#'.repeat(pct / 2.5).padEnd(40, '.')}] `); await c.sleep(120); }
      c.out('\r\x1b[2K');
      c.outln(`Unpacking ${p} (${TX.PKGS[p].ver}) ...`);
      c.outln(`Setting up ${p} (${TX.PKGS[p].ver}) ...`);
      c.m.installed.add(p);
    }
    c.outln('Processing triggers for man-db (2.12.0-4build2) ...');
    TX.app.save();
    void sh;
    return 0;
  }
  def('apt apt-get', async (c) => {
    const args = c.args.filter((a) => !a.startsWith('-'));
    const sub = args[0];
    switch (sub) {
      case 'update': {
        if (c.user !== 'root') { c.err('Reading package lists... Done\nE: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/\n'); return 100; }
        const repos = ['http://archive.ubuntu.com/ubuntu noble InRelease', 'http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]', 'http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]', 'http://archive.ubuntu.com/ubuntu noble-backports InRelease [126 kB]', 'http://archive.ubuntu.com/ubuntu noble-updates/main amd64 Packages [541 kB]', 'http://security.ubuntu.com/ubuntu noble-security/main amd64 Packages [372 kB]'];
        for (let i = 0; i < repos.length; i++) { await c.sleep(TX.randInt(150, 500)); c.outln((i === 0 ? 'Hit:' : 'Get:') + (i + 1) + ' ' + repos[i]); }
        c.outln(`Fetched 1,291 kB in 2s (${TX.randInt(500, 900)} kB/s)\nReading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n12 packages can be upgraded. Run 'apt list --upgradable' to see them.`);
        return 0;
      }
      case 'upgrade': case 'full-upgrade': case 'dist-upgrade': {
        if (c.user !== 'root') { c.err('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?\n'); return 100; }
        const up = ['firefox', 'libssl3t64', 'openssl', 'linux-firmware', 'python3.12', 'snapd', 'tzdata', 'vim-common', 'curl', 'libcurl4t64', 'git', 'git-man'];
        c.outln(`Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\nCalculating upgrade... Done\nThe following packages will be upgraded:\n  ${up.join(' ')}\n12 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\nNeed to get 312 MB of archives.\nAfter this operation, 4,112 kB of additional disk space will be used.`);
        const ans = c.args.includes('-y') ? 'y' : await c.readLine('Do you want to continue? [Y/n] ');
        if (/^n/i.test(ans)) { c.outln('Abort.'); return 1; }
        for (const p of up) { await c.sleep(180); c.outln(`Unpacking ${p} ... Setting up ${p} ...`); }
        c.outln('Processing triggers for libc-bin (2.39-0ubuntu8.3) ...');
        return 0;
      }
      case 'install': case 'reinstall': return aptInstall(c, args.slice(1), false);
      case 'remove': case 'purge': case 'autoremove': return sub === 'autoremove' ? (c.outln('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\n0 upgraded, 0 newly installed, 0 to remove and 12 not upgraded.'), 0) : aptInstall(c, args.slice(1), true);
      case 'search': { const q = (args[1] || '').toLowerCase(); c.outln('Sorting... Done\nFull Text Search... Done'); Object.keys(TX.PKGS).filter((p) => p.includes(q) || TX.PKGS[p].desc.toLowerCase().includes(q)).forEach((p) => c.outln(`${C.green(p)}/noble ${TX.PKGS[p].ver} amd64${c.m.installed.has(p) ? ' [installed]' : ''}\n  ${TX.PKGS[p].desc}\n`)); return 0; }
      case 'list': {
        c.outln('Listing... Done');
        const inst = c.args.includes('--installed');
        const up = c.args.includes('--upgradable');
        if (up) { ['firefox', 'openssl', 'git', 'curl'].forEach((p) => c.outln(`${C.green(p)}/noble-updates 2.0.1 amd64 [upgradable from: 2.0.0]`)); return 0; }
        Object.keys(TX.PKGS).filter((p) => !inst || c.m.installed.has(p)).forEach((p) => c.outln(`${C.green(p)}/noble,now ${TX.PKGS[p].ver} amd64${c.m.installed.has(p) ? ' [installed]' : ''}`));
        return 0;
      }
      case 'show': { const p = TX.pkgName(args[1] || ''); if (!p) { c.err(`E: No packages found\n`); return 100; } c.outln(`Package: ${p}\nVersion: ${TX.PKGS[p].ver}\nPriority: optional\nSection: universe/misc\nOrigin: Ubuntu\nMaintainer: Ubuntu Developers <ubuntu-devel-discuss@lists.ubuntu.com>\nInstalled-Size: ${Math.round(TX.PKGS[p].kb * 4.2)} kB\nDownload-Size: ${TX.PKGS[p].kb} kB\nAPT-Sources: http://archive.ubuntu.com/ubuntu noble/universe amd64 Packages\nDescription: ${TX.PKGS[p].desc}`); return 0; }
      default: c.outln(`apt 2.7.14 (amd64)\nUsage: apt [options] command\n\nMost used commands:\n  list - list packages based on package names\n  search - search in package descriptions\n  show - show package details\n  install - install packages\n  remove - remove packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages`); return sub ? 1 : 0;
    }
  }, { only: LX });
  def('dpkg', (c) => {
    if (c.args[0] === '-l' || c.args[0] === '--list') {
      c.outln('Desired=Unknown/Install/Remove/Purge/Hold\n| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend\n|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)\n||/ Name           Version                        Architecture Description\n+++-==============-==============================-============-=====================================');
      [...c.m.installed].sort().forEach((p) => c.outln(`ii  ${p.padEnd(14)} ${(TX.PKGS[p] || { ver: '1.0' }).ver.slice(0, 30).padEnd(30)} amd64        ${(TX.PKGS[p] || { desc: '' }).desc.slice(0, 40)}`));
      return;
    }
    return c.fail('need an action option');
  }, { only: LX });
  def('snap', (c) => { if (c.args[0] === 'list') { c.outln('Name               Version          Rev    Tracking         Publisher   Notes\nbare               1.0              5      latest/stable    canonical✓  base\ncore22             20240809         1612   latest/stable    canonical✓  base\nfirefox            130.0-2          4793   latest/stable/…  mozilla✓    -\nspotify            1.2.42.290.g242  80     latest/stable    spotify✓    -\ncode               4849ca9b         170    latest/stable    vscode✓     classic'); return; } c.outln('The snap command lets you install, configure, refresh and remove snaps.'); }, { only: LX });
  def('brew', async (c) => {
    const [sub, ...rest] = c.args;
    switch (sub) {
      case 'install': case 'reinstall': {
        for (const n of rest.filter((a) => !a.startsWith('-'))) {
          const p = TX.pkgName(n);
          if (!p) { c.err(`${C.red('Error:')} No available formula or cask with the name "${n}".\n`); return 1; }
          if (c.m.installed.has(p) && sub === 'install') { c.err(`${C.yellow('Warning:')} ${p} ${TX.PKGS[p].ver.replace(/^\d+:/, '').split(/[-+~]/)[0]} is already installed and up-to-date.\nTo reinstall, run:\n  brew reinstall ${p}\n`); continue; }
          const ver = TX.PKGS[p].ver.replace(/^\d+:/, '').split(/[-+~]/)[0];
          c.outln(`${C.style(['bold', 'green'], '==>')} ${C.bold('Downloading https://ghcr.io/v2/homebrew/core/' + p + '/manifests/' + ver)}`);
          for (let pct = 0; pct <= 100; pct += 20) { c.out(`\r${'#'.repeat(Math.round(pct * 0.7)).padEnd(70)} ${pct.toFixed(1)}%`); await c.sleep(90); }
          c.outln(`\n${C.style(['bold', 'green'], '==>')} ${C.bold('Pouring ' + p + '--' + ver + '.arm64_sequoia.bottle.tar.gz')}\n🍺  /opt/homebrew/Cellar/${p}/${ver}: ${TX.randInt(8, 120)} files, ${TX.human(TX.PKGS[p].kb * 4200)}B`);
          c.m.installed.add(p);
        }
        TX.app.save();
        return 0;
      }
      case 'uninstall': case 'remove': rest.forEach((n) => { const p = TX.pkgName(n); if (p && c.m.installed.has(p)) { c.m.installed.delete(p); c.outln(`Uninstalling /opt/homebrew/Cellar/${p}/${TX.PKGS[p].ver.split(/[-+]/)[0]}... (${TX.randInt(8, 120)} files, ${TX.human(TX.PKGS[p].kb * 4200)}B)`); } else c.err(`${C.red('Error:')} No such keg: /opt/homebrew/Cellar/${n}\n`); }); TX.app.save(); return 0;
      case 'list': case 'ls': c.outln(C.style(['bold', 'blue'], '==> Formulae')); c.outln(TX.columns([...c.m.installed].sort(), c.cols)); return 0;
      case 'search': { const q = rest[0] || ''; c.outln(C.style(['bold', 'green'], '==> Formulae')); c.outln(Object.keys(TX.PKGS).filter((p) => p.includes(q)).join('\n')); return 0; }
      case 'update': c.outln('==> Updating Homebrew...\nAlready up-to-date.'); return 0;
      case 'upgrade': c.outln('==> Upgrading 0 outdated packages'); return 0;
      case 'info': { const p = TX.pkgName(rest[0] || ''); if (!p) { c.err('Error: No available formula\n'); return 1; } c.outln(`${C.style(['bold', 'green'], '==>')} ${C.bold(p)}: stable ${TX.PKGS[p].ver.split(/[-+]/)[0]} (bottled)\n${TX.PKGS[p].desc}\n${c.m.installed.has(p) ? 'Installed' : 'Not installed'}`); return 0; }
      case 'doctor': c.outln('Your system is ready to brew.'); return 0;
      case '--version': case '-v': c.outln('Homebrew 4.3.24'); return 0;
      default: c.outln('Example usage:\n  brew search TEXT|/REGEX/\n  brew info [FORMULA|CASK...]\n  brew install FORMULA|CASK...\n  brew update\n  brew upgrade [FORMULA|CASK...]\n  brew uninstall FORMULA|CASK...\n  brew list [FORMULA|CASK...]'); return 0;
    }
  }, { only: MAC });
  def('pip pip3', async (c) => {
    const [sub, ...rest] = c.args;
    if (sub === 'install') {
      if (c.m.kind === 'linux' && !c.args.includes('--break-system-packages')) { c.err(`${C.style(['bold', 'red'], 'error')}: ${C.bold('externally-managed-environment')}\n\n× This environment is externally managed\n╰─> To install Python packages system-wide, try apt install\n    python3-xyz, where xyz is the package you are trying to\n    install.\n\n    If you wish to install a non-Debian-packaged Python package,\n    create a virtual environment using python3 -m venv path/to/venv.\n`); return 1; }
      for (const p of rest.filter((a) => !a.startsWith('-'))) { c.outln(`Collecting ${p}\n  Downloading ${p}-2.3.1-py3-none-any.whl (${TX.randInt(40, 900)} kB)\n     ${'━'.repeat(40)} ${TX.randInt(40, 900)}/${TX.randInt(40, 900)} kB ${TX.randInt(2, 9)}.${TX.randInt(0, 9)} MB/s eta 0:00:00`); await c.sleep(400); }
      c.outln(`Successfully installed ${rest.filter((a) => !a.startsWith('-')).map((p) => p + '-2.3.1').join(' ')}`); return 0;
    }
    if (sub === 'list') { c.outln('Package    Version\n---------- -------\npip        24.0\nsetuptools 68.1.2\nwheel      0.42.0'); return 0; }
    if (sub === '--version' || sub === '-V') { c.outln('pip 24.0 from /usr/lib/python3/dist-packages/pip (python 3.12)'); return 0; }
    c.outln('\nUsage:\n  pip <command> [options]\n\nCommands:\n  install    Install packages.\n  list       List installed packages.\n');
  }, { pkg: 'python3' });
  def('npm', async (c) => {
    const [sub, ...rest] = c.args;
    if (sub === 'install' || sub === 'i') { await c.sleep(900); c.outln(`\nadded ${TX.randInt(1, 300)} packages, and audited ${TX.randInt(1, 300)} packages in ${TX.randInt(1, 9)}s\n\n${TX.randInt(10, 90)} packages are looking for funding\n  run \`npm fund\` for details\n\nfound ${C.style(['bold', 'green'], '0')} vulnerabilities`); return 0; }
    if (sub === '-v' || sub === '--version') { c.outln('10.8.2'); return 0; }
    if (sub === 'init') { c.vfs.writeFile(c.path('package.json'), JSON.stringify({ name: c.sh.cwd[c.sh.cwd.length - 1] || 'app', version: '1.0.0', main: 'index.js', scripts: { test: 'echo "Error: no test specified" && exit 1' }, license: 'ISC' }, null, 2) + '\n', { user: c.user, owner: c.user }); c.outln('Wrote to package.json'); return 0; }
    c.outln('npm <command>\n\nUsage:\n\nnpm install        install all the dependencies in your project\nnpm init           create a package.json file\nnpm run <foo>      run the script named <foo>');
    void rest;
  }, { pkg: 'node' });

  // ------------------------------------------------------------------ fun
  function bubble(text, width = 40, think = false) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const L = [];
    let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > width) { L.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur || !L.length) L.push(cur);
    const w = Math.max(...L.map((l) => l.length));
    const out = [' ' + '_'.repeat(w + 2)];
    if (L.length === 1) out.push((think ? '( ' : '< ') + L[0] + (think ? ' )' : ' >'));
    else L.forEach((l, i) => out.push((think ? '( ' : i === 0 ? '/ ' : i === L.length - 1 ? '\\ ' : '| ') + l.padEnd(w) + (think ? ' )' : i === 0 ? ' \\' : i === L.length - 1 ? ' /' : ' |')));
    out.push(' ' + '-'.repeat(w + 2));
    return out.join('\n');
  }
  const COWS = {
    default: (t) => `        ${t}   ^__^\n         ${t}  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`,
    tux: (t) => `   ${t}\n    ${t}\n        .--.\n       |o_o |\n       |:_/ |\n      //   \\ \\\n     (|     | )\n    /'\\_   _/\`\\\n    \\___)=(___/`,
    dragon: (t) => `      ${t}                    / \\  //\\\n       ${t}    |\\___/|      /   \\//  \\\\\n            /0  0  \\__  /    //  | \\ \\\n           /     /  \\/_/    //   |  \\  \\\n           @_^_@'/   \\/_   //    |   \\   \\\n           //_^_/     \\/_ //     |    \\    \\\n        ( //) |        \\///      |     \\     \\\n      ( / /) _|_ /   )  //       |      \\     _\\\n    ( // /) '/,_ _ _/  ( ; -.    |    _ _\\.-~        .-~~~^-.\n  (( / / )) ,-{        _      \`-.|.-~-.           .~         \`.\n (( // / ))  '/\\      /                 ~-. _ .-~      .-~^-.  \\\n (( /// ))      \`.   {            }                   /      \\  \\\n  (( / ))     .----~-.\\        \\-'                 .~         \\  \`. \\^-.\n             ///.----..>        \\             _ -~             \`.  ^-\`  ^-_\n               ///-._ _ _ _ _ _ _}^ - - - - ~                     ~-- ,.-~\n                                                                  /.-~`,
    stegosaurus: (t) => `${t}                             .       .\n ${t}                           / \`.   .' "\n  ${t}                  .---.  <    > <    >  .---.\n   ${t}                 |    \\  \\ - ~ ~ - /  /    |\n         _____          ..-~             ~-..-~\n        |     |   \\~~~\\.'                    \`./~~~/\n       ---------   \\__/                        \\__/\n      .'  O    \\     /               /       \\  "\n     (_____,    \`._.'               |         }  \\/~~~/\n      \`----.          /       }     |        /    \\__/\n            \`-.      |       /      |       /      \`. ,~~|\n                ~-.__|      /_ - ~ ^|      /- _      \`..-'\n                     |     /        |     /     ~-.     \`-. _  _  _\n                     |_____|        |_____|         ~ - . _ _ _ _ _>`,
  };
  def('cowsay cowthink', (c) => {
    const { f, rest } = getopt(c.args, 'f:lW:ebdgpstwy');
    if (f.l) { c.outln('Cow files in /usr/share/cowsay/cows:\n' + Object.keys(COWS).join(' ')); return; }
    const text = rest.length ? rest.join(' ') : (c.stdin || '').trim() || 'Moo!';
    const think = c.name === 'cowthink';
    const cow = COWS[f.f] || COWS.default;
    let body = cow(think ? 'o' : '\\');
    if (f.d) body = body.replace('(oo)', '(xx)'); if (f.e) body = body.replace('(oo)', '(==)'); if (f.p) body = body.replace('(oo)', '(@@)'); if (f.s) body = body.replace('(oo)', '(**)');
    c.outln(bubble(text, parseInt(f.W || 40, 10), think) + '\n' + body);
  }, { pkg: 'cowsay' });
  const FORTUNES = [
    'The best way to predict the future is to invent it.\n\t\t-- Alan Kay',
    'Talk is cheap. Show me the code.\n\t\t-- Linus Torvalds',
    'Programs must be written for people to read, and only incidentally for machines to execute.\n\t\t-- Harold Abelson',
    'Any sufficiently advanced technology is indistinguishable from magic.\n\t\t-- Arthur C. Clarke',
    'First, solve the problem. Then, write the code.\n\t\t-- John Johnson',
    'It\'s not a bug, it\'s an undocumented feature.',
    'There are only two hard things in Computer Science: cache invalidation and naming things.\n\t\t-- Phil Karlton',
    'Simplicity is prerequisite for reliability.\n\t\t-- Edsger W. Dijkstra',
    'The computer was born to solve problems that did not exist before.\n\t\t-- Bill Gates',
    'Unix is user-friendly. It\'s just very selective about who its friends are.',
    'In theory, there is no difference between theory and practice. But, in practice, there is.\n\t\t-- Jan L. A. van de Snepscheut',
    'Code never lies, comments sometimes do.\n\t\t-- Ron Jeffries',
    'You miss 100% of the commits you don\'t push.',
    'A good plan violently executed now is better than a perfect plan executed next week.\n\t\t-- George S. Patton',
    'The expert in anything was once a beginner.\n\t\t-- Helen Hayes',
  ];
  def('fortune', (c) => { c.outln(TX.pick(FORTUNES)); }, { pkg: 'fortune' });
  def('sl', async (c) => { await TX.apps.sl(c.term); }, { pkg: 'sl' });
  def('cmatrix', async (c) => { await TX.apps.cmatrix(c.term); }, { pkg: 'cmatrix' });
  def('figlet banner toilet', (c) => { const text = c.args.filter((a) => !a.startsWith('-')).join(' ') || (c.stdin || '').trim(); c.outln(TX.figlet(text)); }, { pkg: 'figlet' });
  def('lolcat', (c) => {
    const text = c.args.length ? c.input(c.args).map((x) => x.text || '').join('') : c.stdin || '';
    let i = 0;
    const seed = Math.random() * 10;
    c.out(text.split('\n').map((l, li) => [...l].map((ch) => { const t = seed + (li * 0.3 + (i++) * 0.1) * 0.8; const r = Math.round(Math.sin(t) * 127 + 128), g = Math.round(Math.sin(t + 2.094) * 127 + 128), b = Math.round(Math.sin(t + 4.188) * 127 + 128); return C.rgb(r, g, b, ch); }).join('')).join('\n'));
  }, { pkg: 'lolcat' });
  def('neofetch fastfetch screenfetch', (c) => { c.outln(TX.neofetch(c.sh)); }, { pkg: 'neofetch' });
  def('reset-machine', async (c) => {
    const ans = await c.readLine(C.yellow('Reset this pretend computer to factory settings? All your files will be lost. [y/N] '));
    if (!/^y/i.test(ans)) { c.outln('Cancelled.'); return 1; }
    TX.app.resetMachine(c.m.kind);
    return 0;
  });
  def('tput', (c) => { const a = c.args[0]; if (a === 'cols') c.outln(String(c.term.cols)); else if (a === 'lines') c.outln(String(c.term.rows)); else if (a === 'clear') c.term.clear(); else if (a === 'bold') c.out('\x1b[1m'); else if (a === 'sgr0') c.out('\x1b[0m'); else if (a === 'setaf') c.out('\x1b[3' + (c.args[1] || '7') + 'm'); });
  def('stty', (c) => { if (c.args[0] === 'size') c.outln(c.term.rows + ' ' + c.term.cols); });
  def('tty', (c) => { c.outln(c.m.kind === 'mac' ? '/dev/ttys000' : c.sh.flavor === 'gitbash' ? '/dev/pty0' : '/dev/pts/0'); });
  def('jq', (c) => {
    const filter = c.args.filter((a) => !a.startsWith('-'))[0] || '.';
    const raw = c.args.includes('-r');
    const compact = c.args.includes('-c');
    let data;
    try { data = JSON.parse(c.stdin || c.input(c.args.filter((a) => !a.startsWith('-')).slice(1))[0].text || 'null'); } catch (e) { return c.fail('parse error: Invalid numeric literal at line 1, column 2', 2); }
    let results;
    try { results = TX.jq(filter, data); } catch (e) { return c.fail('error: ' + e.message, 3); }
    const color = c.tty && !raw;
    results.forEach((r) => { if (raw && typeof r === 'string') c.outln(r); else c.outln(color ? TX.jsonColor(r, compact) : JSON.stringify(r, null, compact ? 0 : 2)); });
  }, { pkg: 'jq' });

  // ------------------------------------------------------------------ editors
  async function editFile(c, which) {
    const p = c.args.filter((a) => !a.startsWith('-') && !a.startsWith('+'))[0];
    let segs = p ? c.path(p) : null;
    if (segs) {
      const n = c.vfs.get(segs);
      if (n && n.t === 'd') { if (which === 'nano') { c.err(`"${p}" is a directory\n`); } else c.err(`"${p}" is a directory\n`); if (which === 'nano') return 1; }
    }
    if (which === 'vim') return TX.apps.vim(c.term, c.vfs, segs, { user: c.user, name: p });
    return TX.apps.nano(c.term, c.vfs, segs, { user: c.user, name: p });
  }
  def('nano pico', (c) => editFile(c, 'nano'), { pkg: 'nano' });
  def('vim vi view nvim', (c) => editFile(c, 'vim'), { pkg: 'vim' });
  def('emacs', (c) => { c.err(c.m.kind === 'linux' ? `Command 'emacs' not found, but can be installed with:\nsudo snap install emacs\n${C.dim('(emacs is not simulated in TerminalEX — try nano or vim)')}\n` : `zsh: command not found: emacs\n`); return 127; });
  def('code', (c) => { c.outln(C.dim(`(TerminalEX) Pretending to open Visual Studio Code${c.args[0] ? ' in ' + c.args[0] : ''}... try nano or vim to edit files here.`)); });

  // ------------------------------------------------------------------ macOS
  def('open', (c) => {
    const t = c.args.filter((a) => !a.startsWith('-'))[0];
    if (!t) { c.err('Usage: open [-e] [-t] [-f] [-W] [-R] [-n] [-g] [-h] [-s <partial SDK name>][-b <bundle identifier>] [-a <application>] [-u URL] [filenames] [--args arguments]\n'); return 1; }
    if (/^https?:/.test(t)) { try { window.open(t, '_blank', 'noopener'); } catch (e) { /* blocked */ } return 0; }
    const n = c.vfs.get(c.path(t));
    if (!n && !c.args.includes('-a')) { c.err(`The file ${c.fmt(c.path(t))} does not exist.\n`); return 1; }
    c.outln(C.dim(`(TerminalEX) Opened "${t}" in ${c.args.includes('-a') ? t : n.t === 'd' ? 'Finder' : /\.(png|jpe?g)$/i.test(t) ? 'Preview' : 'TextEdit'}.`));
  }, { only: MAC });
  def('pbcopy', async (c) => { try { await navigator.clipboard.writeText(c.stdin || ''); } catch (e) { TX.clip = c.stdin || ''; } TX.clip = c.stdin || ''; }, { only: MAC });
  def('pbpaste', async (c) => { let t = TX.clip || ''; try { t = await navigator.clipboard.readText(); } catch (e) { /* no permission */ } c.out(t); }, { only: MAC });
  def('say espeak', async (c) => {
    const text = c.args.filter((a) => !a.startsWith('-')).join(' ') || c.stdin || '';
    if (!('speechSynthesis' in window)) return;
    await new Promise((res) => { const u = new SpeechSynthesisUtterance(text); u.onend = res; u.onerror = res; speechSynthesis.speak(u); setTimeout(res, 15000); c.signal.on(() => { speechSynthesis.cancel(); res(); }); });
  }, { only: ['mac', 'linux'] });
  def('sw_vers', (c) => { c.outln('ProductName:\t\tmacOS\nProductVersion:\t\t15.0\nBuildVersion:\t\t24A335'); }, { only: MAC });
  def('system_profiler', (c) => {
    const t = c.args[0] || 'SPHardwareDataType';
    if (/Storage/i.test(t)) { c.outln(`Storage:\n\n    Macintosh HD - Data:\n\n      Free: 293.54 GB (293,540,122,624 bytes)\n      Capacity: 494.38 GB (494,384,795,648 bytes)\n      Mount Point: /System/Volumes/Data\n      File System: APFS\n      Writable: Yes\n      Physical Drive:\n          Device Name: APPLE SSD AP0512Z\n          Media Name: AppleAPFSMedia\n          Medium Type: SSD\n          Protocol: Apple Fabric\n          Internal: Yes\n          S.M.A.R.T. Status: Verified\n\n    STUDENT_USB:\n\n      Free: 28.6 GB\n      Capacity: 32.0 GB\n      Mount Point: /Volumes/STUDENT_USB\n      File System: MS-DOS FAT32\n      Writable: Yes`); return; }
    if (/Network/i.test(t)) { c.outln(`Network:\n\n    Wi-Fi:\n\n      Type: AirPort\n      Hardware: AirPort\n      BSD Device Name: en0\n      IPv4 Addresses: ${c.m.net.ip}\n      IPv4:\n          Configuration Method: DHCP\n          Router: 192.168.1.1\n          Subnet Masks: 255.255.255.0\n      DNS:\n          Server Addresses: 192.168.1.1\n      Ethernet:\n          MAC Address: ${c.m.net.mac}`); return; }
    c.outln(`Hardware:\n\n    Hardware Overview:\n\n      Model Name: MacBook Pro\n      Model Identifier: Mac15,6\n      Model Number: MRX33LL/A\n      Chip: Apple M3 Pro\n      Total Number of Cores: 12 (6 performance and 6 efficiency)\n      Memory: 18 GB\n      System Firmware Version: 11881.1.1\n      OS Loader Version: 11881.1.1\n      Serial Number (system): ${c.m.hw.serial}\n      Hardware UUID: 7C1B2E44-1A2B-5C3D-9E8F-00112233AABB\n      Provisioning UDID: 00006030-001A2B3C4D5E6F70\n      Activation Lock Status: Disabled`);
  }, { only: MAC });
  def('diskutil', (c) => {
    const sub = c.args[0];
    if (sub === 'list') {
      c.m.disks.forEach((d) => {
        c.outln(`/dev/${d.dev} (${d.type}):\n   #:                       TYPE NAME                    SIZE       IDENTIFIER`);
        c.outln(`   0:      ${d.dev === 'disk3' ? '  APFS Container Scheme -' : d.dev === 'disk4' ? 'FDisk_partition_scheme  ' : '     GUID_partition_scheme'}                        ${d.dev === 'disk3' ? '+' : '*'}${(d.size / 1e9).toFixed(1)} GB   ${d.dev}`);
        d.parts.forEach((p, i) => c.outln(`   ${i + 1}:${p.type.padStart(27)} ${p.name.padEnd(23)} ${(p.size / 1e9).toFixed(1).padStart(5)} GB   ${p.id}`));
        c.outln('');
      });
      return;
    }
    if (sub === 'info') { const id = (c.args[1] || '').replace('/dev/', ''); c.outln(`   Device Identifier:         ${id || 'disk3s1'}\n   Device Node:               /dev/${id || 'disk3s1'}\n   Whole:                     No\n   Part of Whole:             ${(id || 'disk3').replace(/s\d+.*/, '')}\n\n   Volume Name:               Macintosh HD\n   Mounted:                   Yes\n   Mount Point:               /\n\n   File System Personality:   APFS\n   Type (Bundle):             apfs\n   Name (User Visible):       APFS\n\n   Media Type:                Generic\n   Protocol:                  Apple Fabric\n   SMART Status:              Verified\n   Solid State:               Yes`); return; }
    if (sub === 'eject' || sub === 'unmount' || sub === 'unmountDisk') { const d = c.m.disks[2]; d.parts[0].mounted = false; c.outln(sub === 'eject' ? 'Disk /dev/disk4 ejected' : `Volume STUDENT_USB on disk4s1 unmounted`); return; }
    if (sub === 'eraseDisk' || sub === 'eraseVolume') { c.err(C.red('TerminalEX: erasing disks is disabled — but on a real Mac this command would wipe the drive! Always double-check the disk identifier.\n')); return 1; }
    c.outln('Disk Utility Tool\nUtility to manage local disks and volumes\nMost commands require an administrator or root user\n\nUsage:  diskutil [quiet] <verb> <options>, where <verb> is as follows:\n\n     list                 (List the partitions of a disk)\n     info[rmation]        (Get information on a specific disk or partition)\n     unmount              (Unmount a single volume)\n     eject                (Eject a disk)');
  }, { only: MAC });
  def('defaults', (c) => { const [sub, dom, key] = c.args; if (sub === 'read') { c.outln(dom ? `{\n    AppleInterfaceStyle = Dark;\n    AppleShowAllExtensions = 1;\n    NSTableViewDefaultSizeMode = 2;\n}` : '(huge output of every preference domain)'); return; } if (sub === 'write') { c.err(C.dim(`(TerminalEX) Saved ${dom} ${key}. You may need to restart the app (killall Finder).\n`)); return; } c.outln('Command line interface to a user\'s defaults.\nSyntax:\n\n\'defaults\' [-currentHost | -host <hostname>] followed by one of the following:\n\n  read                                 shows all defaults'); }, { only: MAC });
  def('caffeinate', async (c) => { try { while (true) await c.sleep(1000); } catch (e) { if (e.interrupt) { c.out('\n'); return 130; } throw e; } }, { only: MAC });
  def('networksetup', (c) => {
    const a = c.args[0];
    if (a === '-listallhardwareports') { c.outln(`\nHardware Port: Wi-Fi\nDevice: en0\nEthernet Address: ${c.m.net.mac}\n\nHardware Port: Thunderbolt Bridge\nDevice: bridge0\nEthernet Address: 36:18:5d:b2:0a:40\n\nVLAN Configurations\n===================`); return; }
    if (a === '-getairportnetwork') { c.outln('Current Wi-Fi Network: SchoolNet-Students'); return; }
    if (a === '-getinfo') { c.outln(`DHCP Configuration\nIP address: ${c.m.net.ip}\nSubnet mask: 255.255.255.0\nRouter: 192.168.1.1\nClient ID:\nIPv6: Automatic\nIPv6 IP address: none\nIPv6 Router: none\nWi-Fi ID: ${c.m.net.mac}`); return; }
    c.outln('networksetup Help Information\n-------------------------------\nUsage: networksetup -listallhardwareports\n       networksetup -getairportnetwork en0\n       networksetup -getinfo Wi-Fi');
  }, { only: MAC });
  def('softwareupdate', async (c) => { if (c.args.includes('-l') || c.args.includes('--list')) { c.outln('Software Update Tool\n\nFinding available software'); await c.sleep(1800); c.outln('Software Update found the following new or updated software:\n* Label: macOS Sequoia 15.0.1-24A348\n\tTitle: macOS Sequoia 15.0.1, Version: 15.0.1, Size: 1437440KiB, Recommended: YES, Action: restart,'); return; } c.outln('usage: softwareupdate <cmd> [<args> ...]\n\n** Manage Updates:\n\t-l | --list\t\tList all appropriate update labels'); }, { only: MAC });
  def('mdfind', (c) => { const q = (c.args.filter((a) => !a.startsWith('-'))[0] || '').toLowerCase(); const out = []; c.vfs.walk(c.m.home, (n, s) => { if (n.name.toLowerCase().includes(q)) out.push(c.fmt(s)); }); c.out(out.join('\n') + (out.length ? '\n' : '')); }, { only: MAC });
  def('launchctl', (c) => { if (c.args[0] === 'list') { c.outln('PID\tStatus\tLabel\n' + c.m.procs.slice(0, 10).map((p) => `${p.pid}\t0\tcom.apple.${p.name.toLowerCase().replace(/\s/g, '')}`).join('\n')); return; } c.outln('Usage: launchctl <subcommand> ... | help [subcommand]'); }, { only: MAC });
  def('osascript', (c) => { const s = c.args.join(' '); const m = /display notification "([^"]*)"/.exec(s); if (m) { TX.app.toast(m[1]); return; } const d = /display dialog "([^"]*)"/.exec(s); if (d) { alert(d[1]); c.outln('button returned:OK'); return; } c.err('osascript: only "display notification" and "display dialog" are simulated\n'); return 1; }, { only: MAC });
  def('pmset', (c) => { c.outln(`Now drawing from 'AC Power'\n -InternalBattery-0 (id=${TX.randInt(1e6, 9e6)})\t${TX.randInt(40, 100)}%; charging; 1:12 remaining present: true`); }, { only: MAC });
  def('sysctl', (c) => { const k = c.args.filter((a) => !a.startsWith('-'))[0]; const map = { 'hw.ncpu': 12, 'hw.memsize': 19327352832, 'machdep.cpu.brand_string': 'Apple M3 Pro', 'kern.ostype': 'Darwin', 'kern.hostname': c.m.net.hostname }; if (k && map[k] !== undefined) c.outln(c.args.includes('-n') ? String(map[k]) : `${k}: ${map[k]}`); else Object.keys(map).forEach((x) => c.outln(`${x}: ${map[x]}`)); }, { only: ['mac', 'linux'] });

  // ------------------------------------------------------------------ Git Bash (Windows integration)
  def('start explorer', (c) => { c.outln(C.dim(`(TerminalEX) Pretending to open ${c.args[0] || 'File Explorer'} in Windows...`)); }, { only: GB });
  def('notepad', (c) => TX.apps.nano(c.term, c.vfs, c.args[0] ? c.path(c.args[0]) : null, { user: c.user, name: c.args[0], notepad: true }), { only: GB });
  def('clip', async (c) => { TX.clip = c.stdin || ''; try { await navigator.clipboard.writeText(TX.clip); } catch (e) { /* ignore */ } }, { only: GB });
  def('winpty', (c) => c.sh.invoke(c.args, c.io), { only: GB });
  def('cmd', async (c) => {
    if (c.args[0] && /^[/-]c$/i.test(c.args[0].replace(/^\/\//, '/'))) {
      const shell = new TX.CmdShell(c.sh.session, c.m, { cwd: c.sh.cwd, noBanner: true });
      await shell.exec(c.args.slice(1).join(' '));
      return shell.lastCode || 0;
    }
    c.sh.session.pushShell(new TX.CmdShell(c.sh.session, c.m, { cwd: c.sh.cwd }));
  }, { only: GB });
  def('powershell pwsh', (c) => { c.sh.session.pushShell(new TX.PowerShell(c.sh.session, c.m, { cwd: c.sh.cwd })); }, { only: GB });
  // Windows programs reachable from Git Bash's PATH
  ['ipconfig', 'systeminfo', 'tasklist', 'taskkill', 'where', 'getmac', 'ver', 'driverquery', 'wmic', 'chkdsk', 'tracert', 'whoami.exe', 'hostname.exe'].forEach((n) => {
    def(n, async (c) => {
      const shell = new TX.CmdShell(c.sh.session, c.m, { cwd: c.sh.cwd, noBanner: true, io: c.io });
      await shell.exec([n.replace(/\.exe$/, '')].concat(c.args.map((a) => (/\s/.test(a) ? `"${a}"` : a))).join(' '), c.io);
      return shell.lastCode || 0;
    }, { only: GB });
  });

  // ------------------------------------------------------------------ helpers: figlet, neofetch, jq
  const FONT = (() => {
    // 5-line block font (subset of "standard"-like glyphs)
    const g = {
      A: [' ___ ', '|   |', '|___|', '|   |', '|   |'], B: [' ___ ', '|   )', '|__/ ', '|   )', '|__/ '], C: [' ___ ', '|    ', '|    ', '|    ', '|___ '], D: [' ___ ', '|   \\', '|   |', '|   |', '|__/ '],
      E: [' ___ ', '|    ', '|___ ', '|    ', '|___ '], F: [' ___ ', '|    ', '|___ ', '|    ', '|    '], G: [' ___ ', '|    ', '| __ ', '|   |', '|___|'], H: ['     ', '|   |', '|___|', '|   |', '|   |'],
      I: [' ___ ', '  |  ', '  |  ', '  |  ', ' _|_ '], J: ['  ___', '    |', '    |', '|   |', '|___|'], K: ['     ', '|  / ', '|_/  ', '| \\  ', '|  \\ '], L: ['     ', '|    ', '|    ', '|    ', '|___ '],
      M: ['     ', '|\\ /|', '| V |', '|   |', '|   |'], N: ['     ', '|\\  |', '| \\ |', '|  \\|', '|   |'], O: [' ___ ', '/   \\', '|   |', '|   |', '\\___/'], P: [' ___ ', '|   |', '|___|', '|    ', '|    '],
      Q: [' ___ ', '/   \\', '|   |', '|  \\|', '\\__\\/'], R: [' ___ ', '|   |', '|___|', '| \\  ', '|  \\ '], S: [' ___ ', '|    ', '|___ ', '    |', ' ___|'], T: ['_____', '  |  ', '  |  ', '  |  ', '  |  '],
      U: ['     ', '|   |', '|   |', '|   |', '|___|'], V: ['     ', '|   |', '|   |', ' \\ / ', '  V  '], W: ['     ', '|   |', '|   |', '| A |', '|/ \\|'], X: ['     ', '\\   /', ' \\ / ', ' / \\ ', '/   \\'],
      Y: ['     ', '\\   /', ' \\ / ', '  |  ', '  |  '], Z: ['_____', '   / ', '  /  ', ' /   ', '/____'], ' ': ['   ', '   ', '   ', '   ', '   '], '!': [' _ ', '| |', '| |', '|_|', '(_)'],
      0: [' ___ ', '/  /\\', '| / |', '|/  |', '\\___/'], 1: ['  _ ', ' / |', '  | |', '  | |', '  |_|'], 2: [' ___ ', '    |', ' ___|', '|    ', '|___ '], 3: [' ___ ', '    |', ' ___|', '    |', ' ___|'], 4: ['     ', '|   |', '|___|', '    |', '    |'],
      5: [' ___ ', '|    ', '|___ ', '    |', ' ___|'], 6: [' ___ ', '|    ', '|___ ', '|   |', '|___|'], 7: ['_____', '    /', '   / ', '  /  ', ' /   '], 8: [' ___ ', '|   |', '|___|', '|   |', '|___|'], 9: [' ___ ', '|   |', '|___|', '    |', ' ___|'],
      '.': ['  ', '  ', '  ', '  ', '()'], '-': ['     ', '     ', ' ___ ', '     ', '     '], '?': [' ___ ', '    )', '  _/ ', '     ', '  o  '], ':': ['  ', '()', '  ', '()', '  '],
    };
    return g;
  })();
  TX.figlet = (text) => {
    const rows = ['', '', '', '', ''];
    for (const ch of text.toUpperCase()) { const gl = FONT[ch] || FONT['?']; for (let r = 0; r < 5; r++) rows[r] += gl[r] + ' '; }
    return rows.map((r) => r.replace(/\s+$/, '')).join('\n');
  };
  TX.neofetch = (sh) => {
    const m = sh.m, k = m.kind, gb = sh.flavor === 'gitbash';
    const mem = m.memory();
    const info = gb || k === 'windows'
      ? [['OS', 'Windows 11 Education x86_64'], ['Host', m.hw.board], ['Kernel', 'WIN32_NT 10.0.22631.4169'], ['Uptime', TX.uptimeStr(m.boot).replace(/:/, ' hours, ') + ' mins'], ['Shell', 'bash 5.2.26'], ['Terminal', 'TerminalEX'], ['CPU', m.hw.cpu + ' (16) @ 3.80 GHz'], ['GPU', m.hw.gpu], ['Memory', `${Math.round(mem.used / 1024)}MiB / ${Math.round(mem.total / 1024)}MiB`], ['Disk (C:)', '198.6 GiB / 475.3 GiB (42%)']]
      : k === 'mac'
        ? [['OS', 'macOS Sequoia 15.0 arm64'], ['Host', m.hw.model], ['Kernel', 'Darwin 24.0.0'], ['Uptime', TX.uptimeStr(m.boot)], ['Packages', `${m.installed.size + 40} (brew)`], ['Shell', 'zsh 5.9'], ['Resolution', '3024x1964'], ['Terminal', 'TerminalEX'], ['CPU', 'Apple M3 Pro'], ['GPU', 'Apple M3 Pro'], ['Memory', `${Math.round(mem.used / 1024)}MiB / ${Math.round(mem.total / 1024)}MiB`]]
        : [['OS', 'Ubuntu 24.04.1 LTS x86_64'], ['Host', m.hw.board], ['Kernel', m.hw.kernel], ['Uptime', TX.uptimeStr(m.boot)], ['Packages', `${1843 + m.installed.size} (dpkg), 5 (snap)`], ['Shell', 'bash 5.2.21'], ['Resolution', '1920x1080'], ['DE', 'GNOME 46.0'], ['Terminal', 'TerminalEX'], ['CPU', m.hw.cpu + ' (20) @ 4.700GHz'], ['GPU', m.hw.gpu], ['Memory', `${Math.round(mem.used / 1024)}MiB / ${Math.round(mem.total / 1024)}MiB`]];
    const logos = {
      linux: ['            .-/+oossssoo+/-.', '        `:+ssssssssssssssssss+:`', '      -+ssssssssssssssssssyyssss+-', '    .ossssssssssssssssssdMMMNysssso.', '   /ssssssssssshdmmNNmmyNMMMMhssssss/', '  +ssssssssshmydMMMMMMMNddddyssssssss+', ' /sssssssshNMMMyhhyyyyhmNMMMNhssssssss/', '.ssssssssdMMMNhsssssssssshNMMMdssssssss.', '+sssshhhyNMMNyssssssssssssyNMMMysssssss+', 'ossyNMMMNyMMhsssssssssssssshmmmhssssssso', 'ossyNMMMNyMMhsssssssssssssshmmmhssssssso', '+sssshhhyNMMNyssssssssssssyNMMMysssssss+', '.ssssssssdMMMNhsssssssssshNMMMdssssssss.', ' /sssssssshNMMMyhhyyyyhdNMMMNhssssssss/', '  +sssssssssdmydMMMMMMMMddddyssssssss+', '   /ssssssssssshdmNNNNmyNMMMMhssssss/', '    .ossssssssssssssssssdMMMNysssso.', '      -+sssssssssssssssssyyyssss+-', '        `:+ssssssssssssssssss+:`', '            .-/+oossssoo+/-.'].map((l) => C.style(['bold', 'red'], l)),
      mac: ['                    \'c.', '                 ,xNMM.', '               .OMMMMo', '               OMMM0,', '     .;loddo:\' loolloddol;.', '   cKMMMMMMMMMMNWMMMMMMMMMM0:', ' .KMMMMMMMMMMMMMMMMMMMMMMMWd.', ' XMMMMMMMMMMMMMMMMMMMMMMMX.', ';MMMMMMMMMMMMMMMMMMMMMMMM:', ':MMMMMMMMMMMMMMMMMMMMMMMM:', '.MMMMMMMMMMMMMMMMMMMMMMMMX.', ' kMMMMMMMMMMMMMMMMMMMMMMMMWd.', ' .XMMMMMMMMMMMMMMMMMMMMMMMMMMk', '  .XMMMMMMMMMMMMMMMMMMMMMMMMK.', '    kMMMMMMMMMMMMMMMMMMMMMMd', '     ;KMMMMMMMWXXWMMMMMMMk.', '       .cooc,.    .,coo:.'].map((l, i) => [C.green, C.green, C.green, C.green, C.yellow, C.yellow, C.brightRed, C.brightRed, C.red, C.red, C.red, C.magenta, C.magenta, C.blue, C.blue, C.blue, C.blue][i](l)),
      windows: ['################  ################', '################  ################', '################  ################', '################  ################', '################  ################', '################  ################', '################  ################', '', '################  ################', '################  ################', '################  ################', '################  ################', '################  ################', '################  ################', '################  ################'].map((l) => C.style(['bold', 'cyan'], l)),
    };
    const logo = logos[gb ? 'windows' : k];
    const user = sh.user + '@' + m.net.hostname;
    const lines = [C.style(['bold', k === 'mac' ? 'green' : gb ? 'cyan' : 'red'], sh.user) + '@' + C.style(['bold', k === 'mac' ? 'green' : gb ? 'cyan' : 'red'], m.net.hostname), '-'.repeat(user.length)].concat(info.map(([a, b]) => C.style(['bold', k === 'mac' ? 'yellow' : gb ? 'cyan' : 'red'], a) + ': ' + b));
    lines.push('', [0, 1, 2, 3, 4, 5, 6, 7].map((n) => '\x1b[4' + n + 'm   \x1b[0m').join(''), [0, 1, 2, 3, 4, 5, 6, 7].map((n) => '\x1b[10' + n + 'm   \x1b[0m').join(''));
    const w = Math.max(...logo.map((l) => TX.visLen(l))) + 3;
    const out = [];
    for (let i = 0; i < Math.max(logo.length, lines.length); i++) out.push(TX.padR(logo[i] || '', w) + (lines[i] || ''));
    return out.join('\n');
  };
  TX.jsonColor = (v, compact, ind = '') => {
    const nl = compact ? '' : '\n', sp = compact ? '' : '  ';
    if (v === null) return C.gray('null');
    if (typeof v === 'string') return C.green(JSON.stringify(v));
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) { if (!v.length) return C.bold('[]'); return C.bold('[') + nl + v.map((x) => ind + sp + TX.jsonColor(x, compact, ind + sp)).join(',' + nl) + nl + ind + C.bold(']'); }
    const ks = Object.keys(v); if (!ks.length) return C.bold('{}');
    return C.bold('{') + nl + ks.map((k) => ind + sp + C.style(['bold', 'blue'], JSON.stringify(k)) + ':' + (compact ? '' : ' ') + TX.jsonColor(v[k], compact, ind + sp)).join(',' + nl) + nl + ind + C.bold('}');
  };
  TX.jq = (filter, data) => {
    const stages = filter.split('|').map((s) => s.trim());
    let vals = [data];
    for (const st of stages) {
      const next = [];
      for (const v of vals) {
        if (st === '.' || st === '') { next.push(v); continue; }
        if (st === 'keys') { next.push(Object.keys(v || {}).sort()); continue; }
        if (st === 'length') { next.push(Array.isArray(v) || typeof v === 'string' ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0); continue; }
        if (st === 'type') { next.push(v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v); continue; }
        let cur = [v];
        const re = /\.([A-Za-z_][\w]*)|\[(\d*)\]|\["([^"]+)"\]/g;
        let m, any = false;
        while ((m = re.exec(st))) {
          any = true;
          const nx = [];
          for (const x of cur) {
            if (m[1] !== undefined) nx.push(x == null ? null : x[m[1]] === undefined ? null : x[m[1]]);
            else if (m[3] !== undefined) nx.push(x == null ? null : x[m[3]] ?? null);
            else if (m[2] === '') { if (Array.isArray(x)) nx.push(...x); else if (x && typeof x === 'object') nx.push(...Object.values(x)); else throw new Error(`Cannot iterate over ${x === null ? 'null' : typeof x}`); }
            else nx.push(Array.isArray(x) ? x[+m[2]] ?? null : null);
          }
          cur = nx;
        }
        if (!any) throw new Error(`${st}/0 is not defined`);
        next.push(...cur);
      }
      vals = next;
    }
    return vals;
  };

  // ------------------------------------------------------------------ git
  TX.gitCtx = (base) => Object.assign({
    editor: (segs) => (/vi/.test(base.editorName || '') ? TX.apps.vim(base.term, base.vfs, segs, { user: base.user, name: 'COMMIT_EDITMSG' }) : TX.apps.nano(base.term, base.vfs, segs, { user: base.user, name: '.git/COMMIT_EDITMSG' })),
  }, base);
  def('git', (c) => TX.git.run(TX.gitCtx({
    vfs: c.vfs, cwd: c.sh.cwd, home: c.sh.home, resolve: (p) => c.sh.resolve(p), fmt: (s) => c.sh.fmt(s), out: c.out, err: c.err,
    readLine: c.readLine, tty: c.tty, term: c.term, m: c.m, user: c.user, session: c.sh.session, sleep: c.sleep, editorName: c.sh.vars.GIT_EDITOR || c.sh.vars.EDITOR || 'vim', shellKind: 'posix',
  }), c.args), { pkg: 'git' });

  // apply Linux-only package requirement for net-tools style commands
  Object.keys(TX.posixCmds).forEach((k) => { const c = TX.posixCmds[k]; if (c.pkgLinux) { const orig = c.fn; c.fn = (ctx) => orig(ctx); c.linuxPkg = c.pkgLinux; } });
})();
