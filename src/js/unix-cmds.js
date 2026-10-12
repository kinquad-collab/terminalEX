/* TerminalEX — commands for Solaris, FreeBSD and UNIX V7, plus per-OS versions of shared commands (uname, ps, df ...).
 * Shared commands keep their original behavior on Linux/macOS/Git Bash; override() only changes them on the listed kinds. */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const cmds = TX.posixCmds;
  const def = TX.defPosix;
  const getopt = (...a) => TX.getopt(...a);
  const SOL = ['solaris'], BSD = ['freebsd'], V7 = ['unix'], NEWUNIX = ['solaris', 'freebsd'], ALLNEW = ['solaris', 'freebsd', 'unix'];

  // Make an existing command available on more kinds of machine (keeping its output).
  function addKinds(name, kinds) { const c = cmds[name]; if (c && c.only) kinds.forEach((k) => { if (!c.only.includes(k)) c.only = c.only.concat(k); }); }
  // Replace a command's behavior on some kinds only; everywhere else the original runs.
  function override(name, kinds, fn, extra) {
    const orig = cmds[name];
    const o = Object.assign({}, orig || {}, extra || {});
    if (orig && orig.only) o.only = orig.only.concat(kinds.filter((k) => !orig.only.includes(k)));
    else if (!orig) o.only = kinds.slice();
    o.fn = (c) => (kinds.includes(c.m.kind) ? fn(c, orig) : orig.fn(c));
    if (orig && orig.pkg && kinds.length) o.pkgOn = Object.assign({}, orig.pkgOn || {});
    cmds[name] = o;
  }
  const isRoot = (c) => c.user === 'root';
  const now = () => new Date();
  const hm = (d) => TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes());
  const hms = (d) => hm(d) + ':' + TX.p2(d.getSeconds());
  const human = (b) => { if (b >= 1024 ** 4) return (b / 1024 ** 4).toFixed(2) + 'T'; if (b >= 1024 ** 3) return (b / 1024 ** 3 >= 100 ? Math.round(b / 1024 ** 3) : (b / 1024 ** 3).toFixed(1)) + 'G'; if (b >= 1024 ** 2) return (b / 1024 ** 2 >= 100 ? Math.round(b / 1024 ** 2) : (b / 1024 ** 2).toFixed(1)) + 'M'; return Math.max(1, Math.round(b / 1024)) + 'K'; };
  const table = (rows, align) => TX.table(rows.map((r) => r.map(String)), align);

  ['who', 'mount', 'top', 'ifconfig', 'netstat', 'su', 'last', 'crontab'].forEach((n) => addKinds(n, NEWUNIX));
  addKinds('who', V7); addKinds('su', V7); addKinds('mount', V7);
  addKinds('sudo', NEWUNIX); // Solaris 11 ships sudo; FreeBSD only after  pkg install sudo  (pkgOn below)
  cmds.sudo.pkgOn = { freebsd: 'sudo' };

  // ------------------------------------------------------------------ uname
  override('uname', NEWUNIX, (c) => {
    const k = c.m.kind, n = c.m.net.hostname;
    const f = {
      solaris: { s: 'SunOS', n, r: '5.11', v: '11.4.72.176.1', m: 'sun4v', p: 'sparc', i: 'sun4v' },
      freebsd: { s: 'FreeBSD', n, r: '14.1-RELEASE', v: 'FreeBSD 14.1-RELEASE releng/14.1-n267679-10e31f0946d8 GENERIC', m: 'amd64', p: 'amd64', i: 'GENERIC', K: '1401000', U: '1401000' },
    }[k];
    const a = c.args.join('').replace(/-/g, '');
    if (!a) { c.outln(f.s); return; }
    if (a.includes('a')) { c.outln(k === 'solaris' ? `${f.s} ${f.n} ${f.r} ${f.v} ${f.m} ${f.p} ${f.i}` : `${f.s} ${f.n} ${f.r} ${f.v} ${f.m}`); return; }
    const bad = [...a].find((x) => !f[x]);
    if (bad) { c.err(k === 'solaris' ? `uname: illegal option -- ${bad}\nusage: uname [-snrvmapiX]\n` : `uname: illegal option -- ${bad}\nusage: uname [-abiKmnoprsUv]\n`); return 1; }
    c.outln([...'snrvmpiKU'].filter((x) => a.includes(x)).map((x) => f[x]).join(' '));
  });

  // ------------------------------------------------------------------ ps
  override('ps', ALLNEW, (c) => {
    const m = c.m, a = c.args.join(' ');
    const self = { pid: m.nextPid, name: 'ps', cmd: 'ps ' + a, user: c.user, tty: m.kind === 'solaris' ? 'pts/1' : m.kind === 'freebsd' ? '0' : 'co', rss: 2000, vsz: 4000, cpu: 0, start: hms(now()) };
    const procs = m.procs.concat([self]);
    if (m.kind === 'unix') {
      // V7 ps: your processes; -a all terminals, -x also daemons, -l long
      const all = /a/.test(a), x = /x/.test(a), l = /l/.test(a);
      const list = procs.filter((p) => x || (p.tty && p.tty !== '?')).filter((p) => all || x || p.user === c.user || p === self);
      c.outln(l ? '  F S UID   PID  PPID CPU PRI NICE  ADDR  SZ WCHAN TTY TIME CMD' : '   PID TTY TIME CMD');
      list.forEach((p) => c.outln(l ? `  1 S ${String(p.user === 'student' ? 101 : 0).padStart(3)} ${String(p.pid).padStart(5)} ${String(p.pid < 2 ? 0 : 1).padStart(5)}   0  30   20  ${(1000 + p.pid * 7).toString(8).padStart(5)} ${String(p.rss).padStart(3)} 61234 ${p.tty.padEnd(3)} 0:00 ${p.cmd}` : `${String(p.pid).padStart(6)} ${p.tty.padEnd(3)} 0:${p.cpu ? '42' : '00'} ${p.cmd}`));
      return;
    }
    if (m.kind === 'solaris') {
      if (/-e|-A/.test(a)) {
        if (/f/.test(a)) { c.outln('     UID   PID  PPID   C    STIME TTY         TIME CMD'); procs.forEach((p) => c.outln(`${(p.user || 'root').slice(0, 8).padStart(8)} ${String(p.pid).padStart(5)} ${String(p.pid < 4 ? 0 : p.user === 'student' ? 2230 : 1).padStart(5)}   ${p.cpu > 5 ? 1 : 0} ${String(p.start || '08:02:11').padStart(8)} ${(p.tty || '?').padEnd(7)}    ${p.cpu > 5 ? '12:41' : '0:01'} ${p.cmd}`)); return; }
        c.outln('   PID TTY         TIME CMD'); procs.forEach((p) => c.outln(`${String(p.pid).padStart(6)} ${(p.tty || '?').padEnd(8)}    0:01 ${p.name}`)); return;
      }
      if (/aux/.test(a)) { c.err('ps: illegal option -- a\n' + C.dim('(Solaris uses System V options: try  ps -ef   — the BSD-style one lives at /usr/ucb/ps aux)') + '\n'); return 1; }
      c.outln('   PID TTY         TIME CMD'); c.outln('  2230 pts/1       0:00 ksh'); c.outln(String(self.pid).padStart(6) + ' pts/1       0:00 ps'); return;
    }
    // FreeBSD: BSD options
    if (/aux|ax|-a/.test(a)) {
      c.outln('USER    PID %CPU %MEM    VSZ   RSS TT  STAT STARTED     TIME COMMAND');
      procs.forEach((p) => c.outln(`${(p.user || 'root').slice(0, 7).padEnd(7)} ${String(p.pid).padStart(4)} ${(p.cpu || 0).toFixed(1).padStart(4)} ${((p.rss / m.hw.memTotal) * 100).toFixed(1).padStart(4)} ${String(p.vsz).padStart(6)} ${String(p.rss).padStart(5)} ${(p.tty === '?' ? '-' : p.tty || '-').padEnd(3)} ${p.cpu > 5 ? 'R' : 'S'}s   ${String(p.start || '08:01').slice(0, 5).padStart(7)} ${p.cpu > 5 ? '41:07.22' : ' 0:00.04'} ${p.cmd}`));
      return;
    }
    if (/-ef/.test(a)) { c.err('ps: illegal option -- f\n' + C.dim('(BSD ps: try  ps aux )') + '\n'); return 1; }
    c.outln(' PID TT  STAT    TIME COMMAND'); c.outln('2230  0  Ss   0:00.02 -sh (sh)'); c.outln(String(self.pid).padStart(4) + '  0  R+   0:00.00 ps'); return 0;
  });

  // ------------------------------------------------------------------ df / mount
  override('df', ALLNEW, (c) => {
    const { f } = getopt(c.args, 'hkT', {});
    if (c.m.kind === 'unix') { c.outln('/dev/rp0 2380\n/dev/rp3 14760'); return; }
    const z = c.m.extra.zfs || [];
    const rows = z.filter((d) => d.mount.startsWith('/')).map((d) => [d.name, d.used + d.avail, d.refer, d.avail, d.mount]);
    if (c.m.kind === 'solaris') rows.splice(1, 0, ['/devices', 0, 0, 0, '/devices'], ['/dev', 0, 0, 0, '/dev'], ['proc', 0, 0, 0, '/proc'], ['swap', 8.2e9, 2.1e6, 8.2e9, '/tmp']);
    else rows.splice(1, 0, ['devfs', 1024, 1024, 0, '/dev']);
    const sz = (b) => (f.h ? (b ? human(b) : '0K') : String(Math.round(b / 1024)));
    const hdr = c.m.kind === 'solaris' ? ['Filesystem', f.h ? 'Size' : '1024-blocks', 'Used', 'Available', 'Capacity', 'Mounted on'] : ['Filesystem', f.h ? 'Size' : '1K-blocks', 'Used', 'Avail', 'Capacity', 'Mounted on'];
    c.outln(table([hdr].concat(rows.map(([n, t, u, a, mt]) => [n, sz(t), sz(u), sz(a), (t ? Math.max(1, Math.round((u / t) * 100)) : 100) + '%', mt])), ['l', 'r', 'r', 'r', 'r', 'l']));
  });
  override('mount', ALLNEW, (c) => {
    if (c.args.length && !isRoot(c)) return c.fail(c.m.kind === 'freebsd' ? 'only root can use mount' : 'insufficient privileges', 1);
    if (c.m.kind === 'unix') { c.outln('/dev/rp3 on /usr'); return; }
    if (c.m.kind === 'freebsd') { (c.m.extra.zfs || []).filter((d) => d.mount.startsWith('/')).forEach((d) => c.outln(`${d.name} on ${d.mount} (zfs, local, noatime, nfsv4acls)`)); c.outln('devfs on /dev (devfs)'); return; }
    (c.m.extra.zfs || []).filter((d) => d.mount.startsWith('/')).forEach((d) => c.outln(`${d.mount} on ${d.name} read/write/setuid/devices/rstchown/nonbmand/exec/xattr/atime/dev=4010002 on ${TX.unixDate(c.m.boot)}`));
  });

  // ------------------------------------------------------------------ network
  override('ifconfig', NEWUNIX, (c) => {
    const n = c.m.net;
    if (c.m.kind === 'solaris') {
      c.outln(`lo0: flags=2001000849<UP,LOOPBACK,RUNNING,MULTICAST,IPv4,VIRTUAL> mtu 8232 index 1\n\tinet 127.0.0.1 netmask ff000000 \n${n.iface}: flags=100001000843<UP,BROADCAST,RUNNING,MULTICAST,IPv4,PHYSRUNNING> mtu 1500 index 2\n\tinet ${n.ip} netmask ffffff00 broadcast 192.168.1.255\n\tether ${n.mac} \nlo0: flags=2002000849<UP,LOOPBACK,RUNNING,MULTICAST,IPv6,VIRTUAL> mtu 8252 index 1\n\tinet6 ::1/128 \n${n.iface}: flags=120002004841<UP,RUNNING,MULTICAST,DHCP,IPv6,PHYSRUNNING> mtu 1500 index 2\n\tinet6 ${n.ip6}/10 `);
      if (!c.args.includes('-a')) c.err(C.dim('(Solaris needs  ifconfig -a  to list everything; the modern way is  ipadm show-addr )') + '\n');
      return;
    }
    c.outln(`${n.iface}: flags=1008843<UP,BROADCAST,RUNNING,SIMPLEX,MULTICAST,LOWER_UP> metric 0 mtu 1500\n\toptions=4e524bb<RXCSUM,TXCSUM,VLAN_MTU,VLAN_HWTAGGING,JUMBO_MTU,VLAN_HWCSUM,LRO,WOL_MAGIC,VLAN_HWFILTER,VLAN_HWTSO,RXCSUM_IPV6,TXCSUM_IPV6,HWSTATS,MEXTPG>\n\tether ${n.mac}\n\tinet ${n.ip} netmask 0xffffff00 broadcast 192.168.1.255\n\tinet6 ${n.ip6}%${n.iface} prefixlen 64 scopeid 0x1\n\tmedia: Ethernet autoselect (1000baseT <full-duplex>)\n\tstatus: active\n\tnd6 options=23<PERFORMNUD,ACCEPT_RTADV,AUTO_LINKLOCAL>\nlo0: flags=1008049<UP,LOOPBACK,RUNNING,MULTICAST,LOWER_UP> metric 0 mtu 16384\n\toptions=680003<RXCSUM,TXCSUM,LINKSTATE,RXCSUM_IPV6,TXCSUM_IPV6>\n\tinet 127.0.0.1 netmask 0xff000000\n\tinet6 ::1 prefixlen 128\n\tgroups: lo`);
  });
  override('netstat', NEWUNIX, (c) => {
    const n = c.m.net, a = c.args.join('');
    if (/r/.test(a)) {
      if (c.m.kind === 'solaris') { c.outln(`\nRouting Table: IPv4\n  Destination           Gateway           Flags  Ref     Use     Interface\n-------------------- -------------------- ----- ----- ---------- ---------\ndefault              ${n.gw.padEnd(20)} UG        2      18342 ${n.iface}\n127.0.0.1            127.0.0.1            UH        4        512 lo0\n192.168.1.0          ${n.ip.padEnd(20)} U         5       9201 ${n.iface}\n`); return; }
      c.outln(`Routing tables\n\nInternet:\nDestination        Gateway            Flags     Netif Expire\ndefault            ${n.gw.padEnd(18)} UGS         ${n.iface}\n127.0.0.1          link#2             UH          lo0\n192.168.1.0/24     link#1             U           ${n.iface}\n${n.ip.padEnd(18)} link#2             UHS         lo0`);
      return;
    }
    c.outln(c.m.kind === 'solaris' ? `\nTCP: IPv4\n   Local Address        Remote Address    Swind Send-Q Rwind Recv-Q    State\n-------------------- -------------------- ----- ------ ----- ------ -----------\nsol-lab.22           192.168.1.42.51022   64128      0 128872      0 ESTABLISHED\nsol-lab.80           192.168.1.57.60311   64128      0 128872      0 TIME_WAIT\n` : `Active Internet connections\nProto Recv-Q Send-Q Local Address          Foreign Address        (state)\ntcp4       0      0 freebsd-lab.ssh        192.168.1.42.51022     ESTABLISHED\ntcp4       0      0 freebsd-lab.http       192.168.1.57.60311     TIME_WAIT`);
  });

  // ------------------------------------------------------------------ who / date / id / uptime
  override('who', ['unix'], (c) => {
    const d = v7Now();
    const stamp = `${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${hm(d)}`;
    if (c.args.join(' ') === 'am i') { c.outln(`student  console ${stamp}`); return; }
    c.outln(`student  console ${stamp}\ndmr      tty01   ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} 09:03\nken      tty00   ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} 08:47`);
  });
  const V7_START = new Date('1979-06-11T14:22:00').getTime();
  let v7Boot = Date.now();
  function v7Now() { return new Date(V7_START + (Date.now() - v7Boot)); }
  override('date', ['unix'], (c) => {
    if (c.args.length && !c.args[0].startsWith('+')) { if (!isRoot(c)) { c.err('date: no permission\n'); return 1; } return; }
    const d = v7Now();
    c.outln(`${TX.DAY[d.getDay()]} ${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${hms(d)} EDT ${d.getFullYear()}`);
  });
  override('id', ALLNEW, (c) => {
    const u = c.args[0] || c.user;
    if (c.m.kind === 'solaris') { c.outln(u === 'root' ? 'uid=0(root) gid=0(root)' : `uid=101(${u}) gid=10(staff)`); return; }
    if (c.m.kind === 'unix') { c.err('id: not found\n'); return 1; }
    c.outln(u === 'root' ? 'uid=0(root) gid=0(wheel) groups=0(wheel),5(operator)' : `uid=1001(${u}) gid=1001(${u}) groups=1001(${u}),0(wheel)`);
  });
  override('uptime', NEWUNIX, (c) => {
    const l = c.m.load();
    c.outln(`${c.m.kind === 'solaris' ? ' ' : ''}${hm(now())}${c.m.kind === 'freebsd' ? (now().getHours() < 12 ? 'AM' : 'PM') : ''}  up ${TX.uptimeStr(c.m.boot)}, 1 user, load averages: ${l.map((x) => x.toFixed(2)).join(', ')}`);
  });

  // ------------------------------------------------------------------ V7: ls one name per line, the original way
  override('ls', ['unix'], (c) => {
    // V7 ls: one name per line (columns came later, from Berkeley), no colors, no group column in -l.
    const flags = c.args.filter((x) => /^-./.test(x)).join('').replace(/-/g, '');
    const bad = [...flags].find((x) => !'lartsdgiuf1R'.includes(x));
    if (bad) { c.err(`ls: unknown option ${bad}\n`); flags.replace(bad, ''); }
    const names = c.args.filter((x) => !/^-./.test(x));
    const vdate = (ms) => { const d = new Date(ms > 1e12 ? v7Now().getTime() : ms); const recent = true; return `${TX.MON[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${recent ? hm(d) : ' ' + d.getFullYear()}`; };
    const long = (n, name) => `${TX.permStr(n)} ${String(n.t === 'd' ? 2 + Object.values(n.ch).filter((x) => x.t === 'd').length : 1).padStart(2)} ${(n.uid || 'root').padEnd(8)}${String(n.t === 'd' ? 32 * (Object.keys(n.ch).length + 2) : c.vfs.size(n)).padStart(6)} ${vdate(n.mt)} ${name}`;
    const listDir = (segs, node) => {
      let kids = Object.keys(node.ch).map((k) => node.ch[k]).filter((x) => flags.includes('a') || x.name[0] !== '.');
      if (flags.includes('a')) kids = [Object.assign({}, node, { name: '.' }), Object.assign({}, node, { name: '..' })].concat(kids);
      kids.sort((a, b) => (flags.includes('t') ? b.mt - a.mt : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      if (flags.includes('r')) kids.reverse();
      if (flags.includes('l')) c.outln('total ' + kids.reduce((a, x) => a + Math.ceil(c.vfs.size(x) / 512), 0));
      kids.forEach((x) => c.outln(flags.includes('l') ? long(x, x.name) : x.name));
    };
    let code = 0;
    const targets = names.length ? names : ['.'];
    targets.forEach((t, i) => {
      const segs = c.path(t);
      const n = c.vfs.get(segs);
      if (!n) { c.err(`${t} not found\n`); code = 2; return; }
      if (n.t === 'd' && !flags.includes('d')) { if (targets.length > 1) c.outln((i ? '\n' : '') + t + ':'); listDir(segs, n); }
      else c.outln(flags.includes('l') ? long(n, t) : t);
    });
    return code;
  });

  // ================================================================== Solaris
  def('svcs', (c) => {
    const { f, rest } = getopt(c.args, 'axlvpH', {});
    const S = c.m.services;
    const pick = (pat) => S.filter((s) => s.fmri.includes(pat) || s.fmri.split(':')[1].split('/').pop() === pat);
    if (f.x) {
      const bad = S.filter((s) => s.state === 'maintenance');
      if (!bad.length) return;
      bad.forEach((s) => c.outln(`${C.bold(s.fmri)} (CUPS print server)\n State: ${C.red('maintenance')} since ${TX.unixDate(Date.now() - 3600000)}\nReason: Start method exited with $SMF_EXIT_ERR_CONFIG.\n   See: http://support.oracle.com/msg/SMF-8000-KS\n   See: cupsd(8)\n   See: /var/svc/log/application-print-cups:default.log\nImpact: This service is not running.`));
      return;
    }
    if (f.l) {
      const s = pick(rest[0] || '')[0];
      if (!s) return c.fail(`Pattern '${rest[0] || ''}' doesn't match any instances`);
      c.outln(`fmri         ${s.fmri}\nname         ${s.fmri.split('/').slice(-1)[0].split(':')[0]} service\nenabled      ${s.state === 'disabled' ? 'false' : 'true'}\nstate        ${s.state}\nnext_state   none\nstate_time   ${TX.unixDate(c.m.boot)}\nlogfile      /var/svc/log/${s.fmri.slice(5).replace(/\//g, '-')}.log\nrestarter    svc:/system/svc/restarter:default\ndependency   require_all/none svc:/milestone/network (online)`);
      return;
    }
    let list = rest.length ? rest.flatMap(pick) : (f.a ? S : S.filter((s) => s.state !== 'disabled'));
    if (rest.length && !list.length) return c.fail(`Pattern '${rest[0]}' doesn't match any instances`);
    if (!f.H) c.outln('STATE          STIME    FMRI');
    list.forEach((s) => c.outln(`${(s.state === 'maintenance' && c.tty ? C.red(s.state) + ' '.repeat(4) : s.state.padEnd(15))}${s.stime.padStart(7)}  ${s.fmri}`));
  }, { only: SOL });
  def('svcadm', (c) => {
    const [verb, ...rest] = c.args.filter((a) => !/^-[rst]+$/.test(a));
    if (!verb) { c.err('Usage: svcadm [-S <state>] [-v] [-Z | -z zone] [cmd [args ... ]]\n\n\tsvcadm enable [-rst] <service> ...\t- enable and online service(s)\n\tsvcadm disable [-st] <service> ...\t- disable and offline service(s)\n\tsvcadm restart <service> ...\t\t- restart specified service(s)\n\tsvcadm refresh <service> ...\t\t- re-read service configuration\n\tsvcadm clear <service> ...\t\t- clear maintenance state\n'); return 2; }
    if (!isRoot(c)) { c.err(`svcadm: ${rest[0] || ''}: Permission denied.\n` + C.dim('(services belong to root — try  pfexec svcadm ...  or  sudo svcadm ...)') + '\n'); return 1; }
    for (const p of rest) {
      const s = c.m.services.find((x) => x.fmri.includes(p));
      if (!s) { c.err(`svcadm: Pattern '${p}' doesn't match any instances\n`); return 1; }
      const t = hm(now()) + ':' + TX.p2(now().getSeconds());
      if (verb === 'enable') { if (s.state !== 'maintenance') { s.state = 'online'; s.stime = t; } }
      else if (verb === 'disable') { s.state = 'disabled'; s.stime = t; }
      else if (verb === 'clear') { if (s.state === 'maintenance') { s.state = 'online'; s.stime = t; } }
      else if (verb === 'restart' || verb === 'refresh') { if (s.state === 'online') s.stime = t; }
      else { c.err(`svcadm: unknown subcommand "${verb}"\n`); return 2; }
    }
    c.vfs.changed();
  }, { only: SOL });
  def('prstat', async (c) => {
    const procs = c.m.procs.slice().sort((a, b) => (b.cpu || 0) - (a.cpu || 0));
    const once = c.args.length && /\d/.test(c.args.join(' ')) || !c.tty;
    const draw = () => {
      c.m.tickProcs();
      const lines = ['   PID USERNAME  SIZE   RSS STATE   PRI NICE      TIME  CPU PROCESS/NLWP'];
      procs.slice(0, 15).forEach((p) => lines.push(`${String(p.pid).padStart(6)} ${(p.user || 'root').slice(0, 8).padEnd(8)} ${human(p.vsz * 1024).padStart(5)} ${human(p.rss * 1024).padStart(5)} ${(p.cpu > 1 ? 'cpu' + (p.pid % 64) : 'sleep').padEnd(7)} ${String(p.cpu > 1 ? 10 : 59).padStart(3)}    0 ${p.cpu > 5 ? '  2:41:07' : '  0:00:02'} ${(p.cpu || 0).toFixed(1).padStart(4)}% ${p.name}/${p.threads || 1}`));
      lines.push(`Total: ${c.m.procs.length + 61} processes, 1204 lwps, load averages: ${c.m.load().map((x) => x.toFixed(2)).join(', ')}`);
      return lines.join('\n');
    };
    if (once) { c.outln(draw()); return; }
    c.outln(draw());
    c.outln(C.dim('(prstat refreshes every 5 seconds — press Ctrl+C to stop. Tip: prstat 1 1 prints once.)'));
    try { for (;;) { await c.sleep(5000); c.outln('\n' + draw()); } } catch (e) { if (!e.interrupt) throw e; c.outln(''); }
  }, { only: SOL });
  def('psrinfo', (c) => {
    const hw = c.m.hw;
    if (c.args.includes('-pv') || (c.args.includes('-p') && c.args.includes('-v'))) { c.outln(`The physical processor has ${hw.cores} cores and ${hw.threads} virtual processors (0-${hw.threads - 1})\n  The core has 8 virtual processors (0-7)\n  ...\n    SPARC-M8 (chipid 0, clock ${hw.mhz} MHz)`); return; }
    if (c.args.includes('-p')) { c.outln('1'); return; }
    for (let i = 0; i < Math.min(hw.threads, 8); i++) c.outln(`${String(i).padEnd(7)} on-line   since ${TX.winDate(c.m.boot)} 08:02:14`);
    c.outln(C.dim(`... (${hw.threads - 8} more: this server has ${hw.threads} virtual CPUs)`));
  }, { only: SOL });
  def('isainfo', (c) => { c.outln(c.args.includes('-kv') || c.args.includes('-v') ? '64-bit sparcv9 kernel modules' + (c.args.includes('-v') && !c.args.includes('-kv') ? '\n64-bit sparcv9 applications\n\tcrc32c cbcond pause mont mpmul sha512 sha256 sha1 md5 camellia des aes ima hpc vis3 fmaf asi_blk_init vis2 vis popc adi' : '') : 'sparcv9 sparc'); }, { only: SOL });
  def('prtconf', (c) => {
    if (c.args.includes('-m')) { c.outln(String(c.m.hw.memTotal / 1024)); return; }
    c.outln(`System Configuration:  Oracle Corporation  sun4v\nMemory size: ${c.m.hw.memTotal / 1024} Megabytes\nSystem Peripherals (Software Nodes):\n\nORCL,SPARC-T8-1\n    scsi_vhci, instance #0\n    packages (driver not attached)\n    virtual-devices, instance #0\n        console, instance #0\n    cpu (driver not attached)\n    pci, instance #0\n        network, instance #0 (net0)\n        scsi, instance #0\n            disk, instance #0 (c1t0d0)\n            disk, instance #1 (c1t1d0)`);
  }, { only: SOL });
  def('prtdiag', (c) => { c.outln(`System Configuration:  Oracle Corporation  sun4v SPARC T8-1\nMemory size: ${c.m.hw.memTotal / 1024} Megabytes\n\n================================ Virtual CPUs ================================\n\nCPU ID Frequency Implementation         Status\n------ --------- ---------------------- -------\n0      5067 MHz  SPARC-M8               on-line\n1      5067 MHz  SPARC-M8               on-line\n... ${c.m.hw.threads - 2} more\n\n======================= Physical Memory Configuration ========================\nSegment Table:\n--------------------------------------------------------------\nBase           Segment  Interleave   Bank     Contains\nAddress        Size     Factor       Size     Modules\n--------------------------------------------------------------\n0x0            64 GB    4            16 GB    /SYS/MB/CM/CMP/MR0/BOB0/CH0/D0\n\n=========================== FRU Status ===========================\nAll FRUs are enabled.`); }, { only: SOL });
  def('zonename', (c) => { c.outln(c.sh.zone || 'global'); }, { only: SOL });
  def('zoneadm', (c) => {
    const Z = c.m.extra.zones || [];
    if (c.args[0] === 'list') {
      const v = c.args.includes('-cv') || c.args.includes('-iv') || c.args.includes('-v');
      const all = c.args.some((a) => /c|i/.test(a.replace('-', '').replace('v', '')));
      const list = all ? Z : Z.filter((z) => z.status === 'running');
      if (!v) { list.forEach((z) => c.outln(z.name)); return; }
      c.outln('  ID NAME             STATUS      PATH                         BRAND      IP');
      list.forEach((z) => c.outln(`${String(z.id).padStart(4)} ${z.name.padEnd(16)} ${z.status.padEnd(11)} ${z.path.padEnd(28)} ${z.brand.padEnd(10)} ${z.ip}`));
      return;
    }
    const zi = c.args.indexOf('-z'); const zn = zi >= 0 ? c.args[zi + 1] : null; const verb = c.args[zi >= 0 ? zi + 2 : 0];
    const z = Z.find((x) => x.name === zn);
    if (!z) { c.err(`zoneadm: ${zn || ''}: No such zone configured\n`); return 1; }
    if (!isRoot(c)) { c.err('zoneadm: You lack sufficient privilege to run this command.\n' + C.dim('(try  pfexec zoneadm ... )') + '\n'); return 1; }
    if (verb === 'boot') { z.status = 'running'; z.id = Z.filter((x) => x.status === 'running').length; }
    else if (verb === 'halt' || verb === 'shutdown') { z.status = 'installed'; z.id = '-'; }
    else if (verb === 'reboot') { /* nothing visible */ }
    else { c.err(`zoneadm: ${verb || ''}: unknown subcommand\n`); return 2; }
    c.vfs.changed();
  }, { only: SOL });
  def('zlogin', async (c) => {
    const name = c.args.filter((a) => !a.startsWith('-'))[0];
    const z = (c.m.extra.zones || []).find((x) => x.name === name);
    if (!name || !z || z.name === 'global') { c.err(`zlogin: ${name || ''}: unknown zone\n`); return 1; }
    if (!isRoot(c)) { c.err('zlogin: You lack sufficient privilege to run this command (all privs required)\n' + C.dim('(try  pfexec zlogin ' + name + ')') + '\n'); return 1; }
    if (z.status !== 'running') { c.err(`zlogin: login allowed only to running zones (${name} is '${z.status}').\n`); return 1; }
    const rest = c.args.slice(c.args.indexOf(name) + 1);
    const sh = new TX.PosixShell(c.sh.session, c.m, 'ksh', { user: 'root', cwd: ['zones', name, 'root'] });
    sh.zone = name; sh.home = ['zones', name, 'root'];
    if (rest.length) return sh.invoke(rest, c.io);
    c.outln(`[Connected to zone '${name}' pts/2]\nOracle Solaris 11.4.72.176.1      Assembled August 2024\n${C.dim("(You are inside a zone: a separate Solaris with its own processes and network, sharing one kernel. Type exit to leave.)")}`);
    sh.customTitle = 'root@' + name;
    const origPrompt = sh.prompt.bind(sh);
    sh.prompt = () => origPrompt().replace(/^root@sol-lab/, 'root@' + name);
    c.sh.session.pushShell(sh);
  }, { only: SOL });
  def('beadm', (c) => {
    const B = c.m.extra.bes || [];
    if (!c.args[0] || c.args[0] === 'list') {
      c.outln('BE Name          Flags Mountpoint Space   Policy Created\n---------------- ----- ---------- ------- ------ ----------------');
      B.forEach((b) => c.outln(`${b.name.padEnd(16)} ${b.active.padEnd(5)} ${b.mount.padEnd(10)} ${human(b.space).padEnd(7)} ${b.policy} ${TX.isoDate(b.created).slice(0, 16)}`));
      return;
    }
    if (!isRoot(c)) { c.err('be_do_create: insufficient privileges\n' + C.dim('(try  pfexec beadm ...)') + '\n'); return 1; }
    if (c.args[0] === 'create' && c.args[1]) { if (B.some((b) => b.name === c.args[1])) return c.fail(`BE ${c.args[1]} already exists.`); B.push({ name: c.args[1], active: '-', mount: '-', space: 210000, policy: 'static', created: Date.now() }); c.vfs.changed(); return; }
    if (c.args[0] === 'activate' && c.args[1]) { const b = B.find((x) => x.name === c.args[1]); if (!b) return c.fail(`Unable to activate ${c.args[1]}. BE not found.`); B.forEach((x) => { x.active = x.active.replace('R', '') || '-'; if (x.active === '') x.active = '-'; }); b.active = b.active === 'N' ? 'NR' : 'R'; c.vfs.changed(); c.outln(C.dim('(the new boot environment will be used at the next reboot — that is how Solaris makes upgrades undoable)')); return; }
    if (c.args[0] === 'destroy' && c.args[1]) { const i = B.findIndex((x) => x.name === c.args[1]); if (i < 0 || /N/.test(B[i].active)) return c.fail(`Unable to destroy ${c.args[1]}.`); B.splice(i, 1); c.vfs.changed(); return; }
    c.err('Usage:\n\tbeadm list | create <name> | activate <name> | destroy <name>\n'); return 2;
  }, { only: SOL });
  def('ipadm', (c) => {
    const n = c.m.net;
    if (c.args[0] === 'show-addr' || !c.args[0]) { c.outln(`ADDROBJ           TYPE     STATE        ADDR\nlo0/v4            static   ok           127.0.0.1/8\n${n.iface}/v4           dhcp     ok           ${n.ip}/24\nlo0/v6            static   ok           ::1/128\n${n.iface}/v6           addrconf ok           ${n.ip6}/10`); return; }
    if (c.args[0] === 'show-if') { c.outln(`IFNAME     CLASS    STATE    ACTIVE OVER\nlo0        loopback ok       yes    --\n${n.iface}       ip       ok       yes    --`); return; }
    c.err(`ipadm: unknown subcommand '${c.args[0]}'\n`); return 1;
  }, { only: SOL });
  def('dladm', (c) => {
    if (c.args[0] === 'show-phys') { c.outln('LINK            MEDIA                STATE      SPEED  DUPLEX    DEVICE\nnet0            Ethernet             up         10000  full      ixgbe0\nnet1            Ethernet             unknown    0      unknown   ixgbe1'); return; }
    c.outln('LINK                CLASS     MTU    STATE    OVER\nnet0                phys      1500   up       --\nnet1                phys      1500   unknown  --\nwebzone/net0        vnic      1500   up       net0');
  }, { only: SOL });
  def('pfexec', async (c) => {
    if (!c.args.length) { c.err('usage: pfexec [-P privset] cmd [arg ..]\n'); return 1; }
    const sh = c.sh, saved = sh.user;
    sh.user = 'root';
    try { return await sh.invoke(c.args, c.io); } finally { sh.user = saved; }
  }, { only: SOL });
  def('roles', (c) => { c.outln('root'); }, { only: SOL });
  def('profiles', (c) => { c.outln('          Software Installation\n          Basic Solaris User\n          All'); }, { only: SOL });
  def('ptree', (c) => {
    const pid = parseInt(c.args[0], 10) || 2230;
    const p = c.m.procs.find((x) => x.pid === pid);
    if (!p) return c.fail(`no such process: ${c.args[0]}`);
    c.outln(`1      /usr/sbin/init\n  678    /usr/lib/ssh/sshd\n    2201   /usr/lib/ssh/sshd\n      2229   /usr/lib/ssh/sshd\n        ${pid === 2230 ? '2230   -ksh' : '2230   -ksh\n          ' + p.pid + '   ' + p.cmd}`);
  }, { only: SOL });
  def('pargs', (c) => { const p = c.m.procs.find((x) => x.pid === parseInt(c.args[0], 10)); if (!p) return c.fail(`cannot examine ${c.args[0]}: no such process`); c.outln(`${p.pid}:\t${p.cmd}`); p.cmd.split(' ').forEach((a, i) => c.outln(`argv[${i}]: ${a}`)); }, { only: SOL });
  def('pwdx', (c) => { const p = c.m.procs.find((x) => x.pid === parseInt(c.args[0], 10)); if (!p) return c.fail(`cannot examine ${c.args[0]}: no such process`); c.outln(`${p.pid}:\t${p.user === 'student' ? '/export/home/student' : '/'}`); }, { only: SOL });
  def('format', async (c) => {
    if (!isRoot(c)) { c.outln('Searching for disks...done\n\nNo permission (or no disks found)!'); c.err(C.dim('(format talks to raw disks — try  pfexec format )') + '\n'); return 1; }
    c.outln('Searching for disks...done\n\n\nAVAILABLE DISK SELECTIONS:');
    c.m.disks.forEach((d, i) => c.outln(`       ${i}. ${d.dev} <${d.model}-A3X0-1.09TB>\n          /scsi_vhci/disk@g5000cca0${i}2a8b1c4`));
    let ans;
    try { ans = await c.readLine(`Specify disk (enter its number): `); } catch (e) { c.outln(''); return 0; }
    void ans;
    c.outln(C.dim('(TerminalEX stops here: format can repartition a real disk, so the practice version only lists them.)'));
  }, { only: SOL });
  def('dtrace', async (c) => {
    const s = c.args.join(' ');
    if (c.args[0] === '-l') { c.outln('   ID   PROVIDER            MODULE                          FUNCTION NAME\n    1     dtrace                                                     BEGIN\n    2     dtrace                                                     END\n    3     dtrace                                                     ERROR\n   ...\n89231 syscall                                                  read entry\n89232 syscall                                                  read return\n' + C.dim('(… about 89,000 probes: places in a running system you can watch)')); return; }
    if (!isRoot(c)) { c.err('dtrace: failed to initialize dtrace: DTrace requires additional privileges\n'); return 1; }
    if (!/-n/.test(s)) { c.err('Usage: dtrace [-l] [-n probe-description { action }]\n'); return 2; }
    c.outln(`dtrace: description '${(s.split('-n')[1] || '').trim().replace(/^'|'$/g, '').split('{')[0].trim()} ' matched 234 probes`);
    c.outln(C.dim('(watching every system call on the server… press Ctrl+C to stop and see the totals)'));
    try { await c.sleep(30000); } catch (e) { if (!e.interrupt) throw e; }
    c.outln('^C\n\n  sshd                                                             12\n  ksh                                                              48\n  svc.configd                                                      90\n  httpd                                                           311\n  fmd                                                             702\n  java                                                          18440');
    c.outln(C.dim('(The java process is making 18,440 system calls — that is the one slowing the server down. Find its PID with  prstat .)'));
  }, { only: SOL });

  // ------------------------------------------------------------------ ZFS (Solaris and FreeBSD)
  function zfsNode(c, ds) { return ds.mount && ds.mount.startsWith('/') ? c.vfs.get(c.vfs.canon(ds.mount.split('/').filter(Boolean))) : null; }
  def('zfs', (c) => {
    const X = c.m.extra, Z = X.zfs, sub = c.args[0];
    const need = (what) => { if (isRoot(c)) return false; c.err(`cannot ${what}: permission denied\n` + C.dim(`(ZFS changes need root: ${c.m.kind === 'solaris' ? 'pfexec zfs ...' : 'su, then zfs ...'})`) + '\n'); return true; };
    if (!sub) { c.err('usage: zfs command args ...\nwhere \'command\' is one of the following:\n\n\tcreate <filesystem>\n\tdestroy <filesystem|snapshot>\n\tsnapshot <filesystem@snapname>\n\trollback <snapshot>\n\tlist [-t filesystem|snapshot|all] [-o property[,...]]\n\tget <"all" | property[,...]> [filesystem]\n\tset <property=value> <filesystem>\n'); return 2; }
    if (sub === 'list') {
      const ti = c.args.indexOf('-t'); const type = ti >= 0 ? c.args[ti + 1] : 'filesystem';
      const name = c.args.slice(1).filter((a, i, arr) => !a.startsWith('-') && arr[i - 1] !== '-t' && arr[i - 1] !== '-o')[0];
      let rows = [];
      if (type !== 'snapshot') rows = rows.concat(Z.map((d) => [d.name, human(d.used), human(d.avail), human(d.refer), d.mount]));
      if (type === 'snapshot' || type === 'all') rows = rows.concat(X.snaps.map((s) => [s.name, human(s.used), '-', human(s.refer), '-']));
      if (name) { rows = rows.filter((r) => r[0] === name || r[0].startsWith(name + '/') || r[0].startsWith(name + '@')); if (!rows.length) return c.fail(`cannot open '${name}': dataset does not exist`); }
      if (!rows.length) { c.outln('no datasets available'); return; }
      c.outln(table([['NAME', 'USED', 'AVAIL', 'REFER', 'MOUNTPOINT']].concat(rows), ['l', 'r', 'r', 'r', 'l']));
      return;
    }
    if (sub === 'create') {
      const name = c.args.filter((a) => !a.startsWith('-'))[1];
      if (!name) { c.err('missing filesystem argument\n'); return 2; }
      if (need(`create '${name}'`)) return 1;
      if (Z.some((d) => d.name === name)) return c.fail(`cannot create '${name}': dataset already exists`);
      const parent = Z.find((d) => d.name === name.split('/').slice(0, -1).join('/'));
      if (!parent) return c.fail(`cannot create '${name}': parent does not exist`);
      const mount = parent.mount.startsWith('/') ? parent.mount.replace(/\/$/, '') + '/' + name.split('/').pop() : '/' + name;
      Z.push({ name, used: 98304, avail: parent.avail, refer: 98304, mount });
      try { c.vfs.mkdir(mount.split('/').filter(Boolean), { parents: true, owner: 'root' }); } catch (e) { /* exists */ }
      c.vfs.changed(); return;
    }
    if (sub === 'snapshot' || sub === 'snap') {
      const name = c.args[1] || '';
      const [ds, snap] = name.split('@');
      if (!snap) { c.err('missing snapshot argument\n' + C.dim('(a snapshot name looks like  dataset@name , e.g.  rpool/export/home/student@before-cleanup )') + '\n'); return 2; }
      if (need(`create snapshot '${name}'`)) return 1;
      const d = Z.find((x) => x.name === ds);
      if (!d) return c.fail(`cannot open '${ds}': dataset does not exist`);
      if (X.snaps.some((s) => s.name === name)) return c.fail(`cannot create snapshot '${name}': dataset already exists`);
      const node = zfsNode(c, d);
      X.snaps.push({ name, used: 0, refer: d.refer, created: Date.now(), tree: node ? JSON.parse(JSON.stringify(node)) : null });
      c.vfs.changed(); return;
    }
    if (sub === 'rollback') {
      const name = c.args.filter((a) => !a.startsWith('-'))[1] || '';
      if (need(`rollback to '${name}'`)) return 1;
      const s = X.snaps.find((x) => x.name === name);
      if (!s) return c.fail(`cannot open '${name}': dataset does not exist`);
      const ds = name.split('@')[0];
      const later = X.snaps.filter((x) => x.name.startsWith(ds + '@') && x.created > s.created);
      if (later.length && !c.args.includes('-r')) { c.err(`cannot rollback to '${name}': more recent snapshots or bookmarks exist\nuse '-r' to force deletion of the following snapshots and bookmarks:\n${later.map((x) => x.name).join('\n')}\n`); return 1; }
      X.snaps = X.snaps.filter((x) => !later.includes(x));
      const d = Z.find((x) => x.name === ds);
      if (d && s.tree) { const segs = c.vfs.canon(d.mount.split('/').filter(Boolean)); const parent = c.vfs.get(segs.slice(0, -1)); if (parent) parent.ch[c.vfs.childKey(parent, segs[segs.length - 1]) || segs[segs.length - 1]] = JSON.parse(JSON.stringify(s.tree)); }
      c.vfs.changed();
      return;
    }
    if (sub === 'destroy') {
      const name = c.args.filter((a) => !a.startsWith('-'))[1] || '';
      if (need(`destroy '${name}'`)) return 1;
      if (name.includes('@')) { const i = X.snaps.findIndex((x) => x.name === name); if (i < 0) return c.fail(`could not find any snapshots to destroy; check snapshot names.`); X.snaps.splice(i, 1); c.vfs.changed(); return; }
      if (Z.some((d) => d.name.startsWith(name + '/')) && !c.args.includes('-r')) return c.fail(`cannot destroy '${name}': filesystem has children\nuse '-r' to destroy the following datasets:\n${Z.filter((d) => d.name.startsWith(name + '/')).map((d) => d.name).join('\n')}`);
      if (/^(rpool|zroot)(\/ROOT.*)?$/.test(name)) return c.fail(`cannot destroy '${name}': dataset is busy`);
      const before = Z.length;
      X.zfs = Z.filter((d) => d.name !== name && !d.name.startsWith(name + '/'));
      if (X.zfs.length === before) return c.fail(`cannot open '${name}': dataset does not exist`);
      c.vfs.changed(); return;
    }
    if (sub === 'get') {
      const prop = c.args[1], name = c.args[2];
      const d = Z.find((x) => x.name === name) || Z[0];
      const props = Object.assign({ type: 'filesystem', used: human(d.used), available: human(d.avail), referenced: human(d.refer), compressratio: '1.62x', mounted: 'yes', mountpoint: d.mount, compression: 'lz4', checksum: 'on', dedup: 'off', copies: '1', atime: 'on', readonly: 'off', quota: 'none' }, d.props || {});
      const keys = !prop || prop === 'all' ? Object.keys(props) : prop.split(',');
      c.outln('NAME' + ' '.repeat(Math.max(1, d.name.length - 3)) + 'PROPERTY       VALUE    SOURCE');
      keys.forEach((k) => c.outln(`${d.name}  ${k.padEnd(14)} ${String(props[k] === undefined ? '-' : props[k]).padEnd(8)} ${d.props && d.props[k] ? 'local' : 'default'}`));
      return;
    }
    if (sub === 'set') {
      const [kv, name] = c.args.slice(1);
      if (!kv || !name || !kv.includes('=')) { c.err('usage: zfs set <property=value> <filesystem>\n'); return 2; }
      if (need(`set property for '${name}'`)) return 1;
      const d = Z.find((x) => x.name === name);
      if (!d) return c.fail(`cannot open '${name}': dataset does not exist`);
      const [k, v] = kv.split('=');
      d.props = Object.assign({}, d.props, { [k]: v });
      c.vfs.changed(); return;
    }
    c.err(`unrecognized command '${sub}'\n`); return 2;
  }, { only: NEWUNIX });
  def('zpool', (c) => {
    const p = c.m.extra.pool;
    if (!c.args[0] || c.args[0] === 'list') { c.outln(`NAME    SIZE  ALLOC   FREE  CAP  DEDUP  HEALTH  ALTROOT\n${p.name.padEnd(7)} ${human(p.size)}  ${human(c.m.extra.zfs[0].used)}  ${human(p.size - c.m.extra.zfs[0].used)}   ${Math.round(100 * c.m.extra.zfs[0].used / p.size)}%  1.00x  ${p.health}  -`); return; }
    if (c.args[0] === 'status') {
      const disks = p.mirror ? `\t  mirror-0  ONLINE       0     0     0\n${p.disks.map((d) => `\t    ${d.padEnd(8)}ONLINE       0     0     0`).join('\n')}` : p.disks.map((d) => `\t  ${d.padEnd(10)}ONLINE       0     0     0`).join('\n');
      c.outln(`  pool: ${p.name}\n state: ${p.health}\n  scan: ${p.scrubbed ? 'scrub repaired 0 in 0h3m with 0 errors on ' + TX.unixDate(p.scrubbed) : 'none requested'}\nconfig:\n\n\tNAME        STATE     READ WRITE CKSUM\n\t${p.name.padEnd(12)}ONLINE       0     0     0\n${disks}\n\nerrors: No known data errors`);
      return;
    }
    if (c.args[0] === 'scrub') { if (!isRoot(c)) return c.fail(`cannot scrub ${p.name}: permission denied`); p.scrubbed = Date.now(); c.vfs.changed(); return; }
    if (c.args[0] === 'iostat') { c.outln(`              capacity     operations    bandwidth\npool        alloc   free   read  write   read  write\n----------  -----  -----  -----  -----  -----  -----\n${p.name.padEnd(10)}  ${human(c.m.extra.zfs[0].used)}  ${human(p.size)}     12     31   410K  1.2M`); return; }
    c.err(`unrecognized command '${c.args[0]}'\n`); return 2;
  }, { only: NEWUNIX });

  // ------------------------------------------------------------------ pkg (Solaris IPS and FreeBSD pkg)
  const SOL_PKGS = { git: 'developer/versioning/git', python: 'runtime/python-311', 'python-311': 'runtime/python-311', nano: 'editor/nano', vim: 'editor/vim', gcc: 'developer/gcc', htop: 'diagnostic/htop', wget: 'web/wget', tree: 'file/tree', jq: 'text/jq', curl: 'web/curl', top: 'diagnostic/top', figlet: 'text/figlet', tmux: 'terminal/tmux' };
  const BSD_PKGS = { cowsay: '3.04_1', 'fortune-mod-freebsd-classic': '6.2.1.20231006', sudo: '1.9.15p5_4', bash: '5.2.26_1', htop: '3.3.0_1', neofetch: '7.1.0_1', tree: '2.1.1', jq: '1.7.1', figlet: '2.2.5_5', sl: '5.02_1', wget: '1.24.5', tmux: '3.4_1', nginx: '1.26.1_6,3', curl: '8.8.0', git: '2.45.2', python311: '3.11.9', vim: '9.1.0', nano: '8.0', pkg: '1.21.3', 'mysql80-server': '8.0.37', lolcat: '100.0.1', cmatrix: '2.0_1' };
  const BSD_MAP = { 'fortune-mod-freebsd-classic': 'fortune', python311: 'python3', 'mysql80-server': 'mysql' };
  def('pkg', async (c) => {
    const sub = c.args[0], names = c.args.slice(1).filter((a) => !a.startsWith('-'));
    const yes = c.args.includes('-y');
    if (c.m.kind === 'solaris') {
      if (!sub) { c.err('Usage:\n        pkg [options] command [cmd_options] [operands]\n\nBasic subcommands:\n        pkg install [-nv] [pkg_fmri_pattern ...]\n        pkg uninstall [-nv] pkg_fmri_pattern ...\n        pkg list [-Hafnsuv] [pkg_fmri_pattern ...]\n        pkg info [-lr] [pkg_fmri_pattern ...]\n        pkg search [-lr] [-o attribute ...] query\n        pkg update [-nv] [pkg_fmri_pattern ...]\n        pkg publisher\n'); return 2; }
      if (sub === 'publisher') { c.outln('PUBLISHER                   TYPE     STATUS P LOCATION\nsolaris                     origin   online F https://pkg.oracle.com/solaris/support/'); return; }
      if (sub === 'list') { const inst = [...c.m.installed].map((n) => SOL_PKGS[n] || n); c.outln('NAME (PUBLISHER)                                  VERSION                    IFO'); ['entire', 'system/kernel', 'shell/ksh93', 'system/zones', 'system/file-system/zfs'].concat(inst).filter((n) => !names.length || names.some((x) => n.includes(x))).forEach((n) => c.outln(`${n.padEnd(50)}11.4-11.4.72.0.1.176.1     i--`)); return; }
      if (sub === 'search' || sub === 'info') {
        const q = names[0] || '';
        const hits = Object.keys(SOL_PKGS).filter((n) => n.includes(q) || SOL_PKGS[n].includes(q));
        if (!hits.length) { c.err(sub === 'info' ? `pkg: info: no packages matching the following patterns you specified are installed on the system.  Try specifying -r to query remotely:\n\n        ${q}\n` : ''); return 1; }
        if (sub === 'info') { const n = hits[0]; c.outln(`          Name: ${SOL_PKGS[n]}\n       Summary: ${(TX.PKGS[n] || { desc: n }).desc}\n         State: ${c.m.installed.has(n) ? 'Installed' : 'Not installed'}\n     Publisher: solaris\n       Version: 11.4\n        Branch: 11.4.72.0.1.176.1`); return; }
        c.outln('INDEX           ACTION VALUE                         PACKAGE'); hits.forEach((n) => c.outln(`pkg.fmri        set    solaris/${SOL_PKGS[n].padEnd(22)} pkg:/${SOL_PKGS[n]}@11.4`)); return;
      }
      if (sub === 'install' || sub === 'uninstall') {
        if (!names.length) { c.err(`pkg ${sub}: at least one package name required\n`); return 2; }
        if (!isRoot(c)) { c.err(`pkg: Insufficient access to complete the requested operation.\nPlease try the operation again as a privileged user.\n` + C.dim('(try  pfexec pkg ' + sub + ' ' + names.join(' ') + ' )') + '\n'); return 1; }
        const short = names.map((n) => n.replace(/^pkg:\//, '').split('/').pop().replace(/-311$/, ''));
        const unknown = short.filter((n) => !Object.keys(SOL_PKGS).includes(n));
        if (unknown.length) { c.err(`\npkg ${sub}: The following pattern(s) did not match any allowable packages.  Try\nusing a different matching pattern, or refreshing publisher information:\n\n        ${unknown.join('\n        ')}\n`); return 1; }
        const real = short.map((n) => (n === 'python' ? 'python3' : n));
        if (sub === 'install' && real.every((n) => c.m.installed.has(n))) { c.outln(`No updates necessary for this image. (zone:global)`); return 4; }
        c.outln(`           Packages to ${sub}:   ${real.length}\n       Create boot environment:  No\nCreate backup boot environment: ${sub === 'install' ? 'No' : 'No'}\n\nDOWNLOAD                                PKGS         FILES    XFER (MB)   SPEED\nCompleted                              ${real.length}/${real.length}       ${real.length * 112}/${real.length * 112}      ${(real.length * 3.4).toFixed(1)}/${(real.length * 3.4).toFixed(1)}  4.1M/s\n\nPHASE                                          ITEMS\nInstalling new actions                     ${real.length * 140}/${real.length * 140}\nUpdating package state database                 Done\nUpdating image state                            Done\nCreating fast lookup database                   Done`);
        real.forEach((n) => (sub === 'install' ? c.m.installed.add(n) : c.m.installed.delete(n)));
        c.vfs.changed(); return;
      }
      if (sub === 'update') { if (!isRoot(c)) { c.err('pkg: Insufficient access to complete the requested operation.\n'); return 1; } c.outln('No updates available for this image. (zone:global)'); return 4; }
      c.err(`pkg: unknown subcommand '${sub}'\n`); return 2;
    }
    // ---- FreeBSD
    if (!sub) { c.err('Usage: pkg [-v] [-d] [-l] [-N] [-j <jail name or id>|-c <chroot path>|-r <rootdir>] [-C <configuration file>] [-R <repo config dir>] [-o var=value] [-4|-6] <command> [<args>]\n\nCommands supported:\n\tinstall        Installs packages from remote package repositories and local archives\n\tdelete         Deletes packages from the database and the system\n\tinfo           Displays information about installed packages\n\tsearch         Performs a search of package repository catalogues\n\tupdate         Updates package repository catalogues\n\tupgrade        Performs upgrades of packaged software distributions\n\taudit          Reports vulnerable packages\n\twhich          Displays which package installed a specific file\n'); return 1; }
    const nameOf = (n) => Object.keys(BSD_PKGS).find((k) => k === n || k.replace(/-mod-freebsd-classic$/, '') === n);
    if (sub === 'info') {
      if (names.length) { const n = nameOf(names[0]); if (!n || !c.m.installed.has(BSD_MAP[n] || n)) { c.err(`pkg: No package(s) matching ${names[0]}\n`); return 70; } c.outln(`${n}-${BSD_PKGS[n]}\nName           : ${n}\nVersion        : ${BSD_PKGS[n]}\nOrigin         : misc/${n}\nArchitecture   : FreeBSD:14:amd64\nComment        : ${(TX.PKGS[BSD_MAP[n] || n] || { desc: n }).desc}`); return; }
      Object.keys(BSD_PKGS).filter((n) => c.m.installed.has(BSD_MAP[n] || n)).forEach((n) => c.outln(`${(n + '-' + BSD_PKGS[n]).padEnd(32)}${(TX.PKGS[BSD_MAP[n] || n] || { desc: n }).desc}`));
      return;
    }
    if (sub === 'search') { const q = names[0] || ''; const hits = Object.keys(BSD_PKGS).filter((n) => n.includes(q)); if (!hits.length) { c.err(`No packages found matching '${q}'\n`); return 70; } hits.forEach((n) => c.outln(`${(n + '-' + BSD_PKGS[n]).padEnd(32)}${(TX.PKGS[BSD_MAP[n] || n] || { desc: n }).desc}`)); return; }
    if (sub === 'which') { const f = names[0] || ''; c.outln(/^\/usr\/local/.test(f) ? `${f} was installed by package nginx-1.26.1_6,3` : `${f} was not found in the database`); return; }
    if (sub === 'audit') { c.outln('0 problem(s) in 0 installed package(s) found.'); return; }
    if (!isRoot(c)) { c.err(`pkg: Insufficient privileges to ${sub === 'delete' || sub === 'remove' ? 'delete' : sub === 'update' ? 'update the repository catalogue' : 'install'} packages\n` + C.dim('(FreeBSD has no sudo out of the box: become root with  su  (password: student), then run pkg again)') + '\n'); return 77; }
    if (sub === 'update') { c.outln('Updating FreeBSD repository catalogue...\nFetching meta.conf: 100%    178 B   0.2kB/s    00:01\nFetching data.pkg: 100%    7 MiB   7.3MB/s    00:01\nProcessing entries: 100%\nFreeBSD repository update completed. 34812 packages processed.\nAll repositories are up to date.'); return; }
    if (sub === 'upgrade') { c.outln('Updating FreeBSD repository catalogue...\nFreeBSD repository is up to date.\nAll repositories are up to date.\nChecking for upgrades (12 candidates): 100%\nProcessing candidates (12 candidates): 100%\nChecking integrity... done (0 conflicting)\nYour packages are up to date.'); return; }
    if (sub === 'install' || sub === 'delete' || sub === 'remove') {
      if (!names.length) { c.err(`Usage: pkg ${sub} [-AfInFqRUy] [-r reponame] <pkg-name> ...\n`); return 64; }
      const del = sub !== 'install';
      const list = names.map((n) => [n, nameOf(n)]);
      const missing = list.filter(([, k]) => !k).map(([n]) => n);
      if (missing.length) { c.err(`pkg: No packages available to ${del ? 'delete' : 'install'} matching '${missing[0]}' have been found in the repositories\n`); return 70; }
      const todo = list.map(([, k]) => k).filter((k) => (del ? c.m.installed.has(BSD_MAP[k] || k) : !c.m.installed.has(BSD_MAP[k] || k)));
      if (!todo.length) { c.outln(del ? 'No packages to delete.' : `The most recent versions of packages are already installed`); return; }
      if (!del) c.outln('Updating FreeBSD repository catalogue...\nFreeBSD repository is up to date.\nAll repositories are up to date.');
      c.outln(`The following ${todo.length} package(s) will be affected (of 0 checked):\n\n${del ? 'Installed packages to be REMOVED' : 'New packages to be INSTALLED'}:\n${todo.map((k) => `\t${k}: ${BSD_PKGS[k]}`).join('\n')}\n\nNumber of packages to be ${del ? 'removed' : 'installed'}: ${todo.length}\n${del ? '' : '\nThe process will require 1 MiB more space.\n' + todo.length * 412 + ' KiB to be downloaded.\n'}`);
      if (!yes && c.tty) { let a; try { a = await c.readLine('Proceed with this action? [y/N]: '); } catch (e) { return 1; } if (!/^y/i.test(a)) return 1; }
      todo.forEach((k, i) => { c.outln(`[${i + 1}/${todo.length}] ${del ? 'Deinstalling' : 'Installing'} ${k}-${BSD_PKGS[k]}...${del ? '' : `\n[${i + 1}/${todo.length}] Extracting ${k}-${BSD_PKGS[k]}: 100%`}`); if (del) c.m.installed.delete(BSD_MAP[k] || k); else c.m.installed.add(BSD_MAP[k] || k); });
      c.vfs.changed(); return;
    }
    c.err(`pkg: unknown command: ${sub}\n`); return 1;
  }, { only: NEWUNIX });

  // ================================================================== FreeBSD
  def('freebsd-version', (c) => { const a = c.args.join(''); if (/k/.test(a) || /r/.test(a)) c.outln('14.1-RELEASE'); if (/u/.test(a) || !a) c.outln('14.1-RELEASE'); }, { only: BSD });
  override('service', BSD, (c) => {
    const S = c.m.services;
    if (c.args[0] === '-e') { S.filter((s) => s.enabled).forEach((s) => c.outln('/etc/rc.d/' + s.name.replace('nginx', '../../usr/local/etc/rc.d/nginx'))); return; }
    if (c.args[0] === '-l') { S.forEach((s) => c.outln(s.name)); return; }
    const [name, verb] = c.args;
    const s = S.find((x) => x.name === name);
    if (!name || !verb) { c.err('usage: service [-j <jail name or id>] -e\n       service [-j <jail name or id>] -R\n       service [-j <jail name or id>] [-v] -l | -r\n       service [-j <jail name or id>] [-v] <rc.d script> start|stop|etc.\n'); return 1; }
    if (!s) { c.err(`${name} does not exist in /etc/rc.d or the local startup\ndirectories (/usr/local/etc/rc.d), or is not executable\n`); return 1; }
    if (verb === 'status') { c.outln(s.running ? `${name} is running as pid ${s.pid || c.m.nextPid}.` : `${name} is not running.`); return s.running ? 0 : 1; }
    if (!isRoot(c)) { c.err(`${name}: Permission denied\n` + C.dim('(services are started by root — use  su  first)') + '\n'); return 1; }
    const one = /^one/.test(verb), v = verb.replace(/^one/, '');
    if (v === 'start' && !s.enabled && !one) { c.err(`Cannot 'start' ${name}. Set ${name}_enable to YES in /etc/rc.conf or use 'onestart' instead of 'start'.\n`); return 1; }
    if (v === 'start') { if (s.running) c.outln(`${name} already running? (pid=${s.pid}).`); else { s.running = true; s.pid = c.m.nextPid++; c.outln(`Starting ${name}.`); } }
    else if (v === 'stop') { if (!s.running) { c.outln(`${name} not running?`); } else { c.outln(`Stopping ${name}.\nWaiting for PIDS: ${s.pid}.`); s.running = false; } }
    else if (v === 'restart') { c.outln(`Stopping ${name}.\nWaiting for PIDS: ${s.pid}.\nStarting ${name}.`); s.pid = c.m.nextPid++; s.running = true; }
    else if (v === 'enable' || v === 'disable') { s.enabled = v === 'enable'; setRc(c, name + '_enable', s.enabled ? 'YES' : 'NO'); c.outln(`${name} ${v}d in /etc/rc.conf`); }
    else { c.err(`/etc/rc.d/${name}: unknown directive '${verb}'.\nUsage: /etc/rc.d/${name} [fast|force|one|quiet](start|stop|restart|rcvar|enable|disable|delete|enabled|describe|extracommands|status|poll)\n`); return 1; }
    c.vfs.changed();
  });
  function setRc(c, key, val) {
    const segs = ['etc', 'rc.conf'];
    let t = '';
    try { t = c.vfs.readFile(segs); } catch (e) { /* new */ }
    const re = new RegExp('^' + key + '=.*$', 'm');
    const old = (re.exec(t) || [''])[0].split('=')[1];
    t = re.test(t) ? t.replace(re, `${key}="${val}"`) : t + `${key}="${val}"\n`;
    c.vfs.writeFile(segs, t, { user: 'root' });
    return old ? old.replace(/"/g, '') : '';
  }
  def('sysrc', (c) => {
    const kv = c.args.filter((a) => !a.startsWith('-'));
    if (c.args.includes('-a') || !kv.length) { let t = ''; try { t = c.vfs.readFile(['etc', 'rc.conf']); } catch (e) { /* none */ } t.split('\n').filter((l) => l.includes('=')).forEach((l) => { const [k, v] = l.split('='); c.outln(`${k}: ${v.replace(/"/g, '')}`); }); return; }
    for (const a of kv) {
      if (a.includes('=')) {
        if (!isRoot(c)) { c.err('sysrc: /etc/rc.conf: Permission denied\n'); return 1; }
        const [k, v] = a.split('=');
        const old = setRc(c, k, v.replace(/"/g, ''));
        c.outln(`${k}: ${old} -> ${v.replace(/"/g, '')}`);
        const s = c.m.services.find((x) => x.name + '_enable' === k); if (s) s.enabled = /^yes$/i.test(v.replace(/"/g, ''));
      } else { let t = ''; try { t = c.vfs.readFile(['etc', 'rc.conf']); } catch (e) { /* none */ } const m = new RegExp('^' + a + '="?([^"\\n]*)', 'm').exec(t); if (!m) { c.err(`sysrc: unknown variable '${a}'\n`); return 1; } c.outln(`${a}: ${m[1]}`); }
    }
  }, { only: BSD });
  override('sysctl', BSD, (c) => {
    const hw = c.m.hw;
    const map = { 'kern.ostype': 'FreeBSD', 'kern.osrelease': '14.1-RELEASE', 'kern.hostname': c.m.net.hostname, 'kern.securelevel': '-1', 'hw.model': hw.cpu, 'hw.ncpu': hw.cores, 'hw.physmem': hw.memTotal * 1024, 'hw.machine': 'amd64', 'vm.loadavg': '{ ' + c.m.load().map((x) => x.toFixed(2)).join(' ') + ' }', 'kern.boottime': `{ sec = ${Math.floor(c.m.boot / 1000)}, usec = 0 } ${TX.unixDate(c.m.boot)}`, 'net.inet.ip.forwarding': '0', 'security.bsd.see_other_uids': '1', 'dev.cpu.0.temperature': (42 + Math.random() * 6).toFixed(1) + 'C' };
    const keys = c.args.filter((a) => !a.startsWith('-'));
    const n = c.args.includes('-n');
    if (c.args.includes('-a') || !keys.length) { Object.keys(map).forEach((k) => c.outln(`${k}: ${map[k]}`)); c.outln(C.dim('(… about 9,000 more kernel settings)')); return; }
    for (const k of keys) {
      if (k.includes('=')) { if (!isRoot(c)) { c.err(`sysctl: ${k.split('=')[0]}=${k.split('=')[1]}: Operation not permitted\n`); return 1; } const [a, b] = k.split('='); c.outln(`${a}: ${map[a]} -> ${b}`); continue; }
      const hits = Object.keys(map).filter((x) => x === k || x.startsWith(k + '.'));
      if (!hits.length) { c.err(`sysctl: unknown oid '${k}'\n`); return 1; }
      hits.forEach((x) => c.outln(n ? String(map[x]) : `${x}: ${map[x]}`));
    }
  });
  def('kldstat', (c) => { c.outln('Id Refs Address                Size Name\n 1   34 0xffffffff80200000  1f4a3c8 kernel\n 2    1 0xffffffff82220000   5e78c8 zfs.ko\n 3    1 0xffffffff82808000     3390 cryptodev.ko\n 4    1 0xffffffff8280c000     3220 intpm.ko\n 5    1 0xffffffff82810000     2178 smbus.ko\n 6    1 0xffffffff82813000    4d3e0 linux64.ko'); }, { only: BSD });
  def('pciconf', (c) => { c.outln('hostb0@pci0:0:0:0:\tclass=0x060000 rev=0x07 hdr=0x00 vendor=0x8086 device=0x3ec2 subvendor=0x1028 subdevice=0x0869\n    vendor     = \'Intel Corporation\'\n    device     = \'8th Gen Core Processor Host Bridge/DRAM Registers\'\n    class      = bridge\nvgapci0@pci0:0:2:0:\tclass=0x030000 rev=0x00 hdr=0x00 vendor=0x8086 device=0x3e92\n    vendor     = \'Intel Corporation\'\n    device     = \'CoffeeLake-S GT2 [UHD Graphics 630]\'\n    class      = display\nem0@pci0:0:31:6:\tclass=0x020000 rev=0x10 hdr=0x00 vendor=0x8086 device=0x15bb\n    vendor     = \'Intel Corporation\'\n    device     = \'Ethernet Connection (7) I219-LM\'\n    class      = network\n    subclass   = ethernet'); }, { only: BSD });
  def('camcontrol', (c) => { c.outln('<Samsung SSD 870 EVO 500GB SVT02B6Q>  at scbus0 target 0 lun 0 (pass0,ada0)\n<SanDisk Ultra Fit 1.00>              at scbus4 target 0 lun 0 (pass1,da0)'); }, { only: BSD });
  def('gpart', (c) => {
    if (c.args[0] !== 'show') { c.err('usage: gpart show [-l | -r] [-p] [geom ...]\n'); return 1; }
    c.outln('=>       40  976773088  ada0  GPT  (466G)\n         40     532480     1  efi  (260M)\n     532520       1024     2  freebsd-boot  (512K)\n     533544        984        - free -  (492K)\n     534528    4194304     3  freebsd-swap  (2.0G)\n    4728832  972042240     4  freebsd-zfs  (464G)\n  976771072       2056        - free -  (1.0M)\n\n=>      63  60125121  da0  MBR  (29G)\n        63  60125121    1  fat32lba  (29G)');
  }, { only: BSD });
  def('jls', (c) => { c.outln('   JID  IP Address      Hostname                      Path'); (c.m.extra.jails || []).forEach((j) => c.outln(`${String(j.jid).padStart(6)}  ${j.ip.padEnd(15)} ${j.hostname.padEnd(29)} ${j.path}`)); }, { only: BSD });
  def('jexec', async (c) => {
    const j = (c.m.extra.jails || []).find((x) => String(x.jid) === c.args[0] || x.hostname.split('.')[0] === c.args[0]);
    if (!j) { c.err(`jexec: jail "${c.args[0] || ''}" not found\n`); return 1; }
    if (!isRoot(c)) { c.err('jexec: jail_attach(1): Operation not permitted\n'); return 1; }
    const rest = c.args.slice(1);
    const segs = j.path.split('/').filter(Boolean);
    const sh = new TX.PosixShell(c.sh.session, c.m, 'sh', { user: 'root', cwd: segs });
    sh.home = segs;
    if (rest.length && !(rest.length === 1 && /sh$/.test(rest[0]))) return sh.invoke(rest, c.io);
    c.outln(C.dim(`(You are inside the jail "${j.hostname}": its own little FreeBSD with its own IP address. Type exit to leave.)`));
    const op = sh.prompt.bind(sh); sh.prompt = () => op().replace('freebsd-lab', 'web'); sh.customTitle = 'root@web (jail)';
    c.sh.session.pushShell(sh);
  }, { only: BSD });
  def('sockstat', (c) => { c.outln('USER     COMMAND    PID   FD  PROTO  LOCAL ADDRESS         FOREIGN ADDRESS\nwww      nginx      701   6   tcp4   *:80                  *:*\nroot     nginx      700   6   tcp4   *:80                  *:*\nroot     sshd       610   4   tcp4   *:22                  *:*\nntpd     ntpd       520   21  udp4   *:123                 *:*\nstudent  java       1240  45  tcp4   *:25565               *:*\nroot     syslogd    402   6   udp4   *:514                 *:*'); }, { only: BSD });
  override('dmesg', BSD, (c) => {
    c.outln(`---<<BOOT>>---\nCopyright (c) 1992-2024 The FreeBSD Project.\nCopyright (c) 1979, 1980, 1983, 1986, 1988, 1989, 1991, 1992, 1993, 1994\n\tThe Regents of the University of California. All rights reserved.\nFreeBSD is a registered trademark of The FreeBSD Foundation.\nFreeBSD 14.1-RELEASE releng/14.1-n267679-10e31f0946d8 GENERIC amd64\nFreeBSD clang version 18.1.5 (https://github.com/llvm/llvm-project.git llvmorg-18.1.5-0-g617a15a9eac9)\nCPU: ${c.m.hw.cpu} (3000.00-MHz K8-class CPU)\nreal memory  = 17179869184 (16384 MB)\navail memory = 16526397440 (15760 MB)\nada0: <Samsung SSD 870 EVO 500GB SVT02B6Q> ACS-4 ATA SATA 3.x device\nem0: Ethernet address: ${c.m.net.mac}\nTrying to mount root from zfs:zroot/ROOT/default []...\nugen0.3: <SanDisk Ultra Fit> at usbus0\nda0: <SanDisk Ultra Fit 1.00> Removable Direct Access SCSI device\nda0: 29358MB (60125184 512 byte sectors)`);
  });
  def('freebsd-update', (c) => {
    if (!isRoot(c)) { c.err('freebsd-update: Directory does not exist or is not writable: /var/db/freebsd-update\n'); return 1; }
    if (c.args[0] === 'fetch') { c.outln('Looking up update.FreeBSD.org mirrors... 3 mirrors found.\nFetching metadata signature for 14.1-RELEASE from update1.freebsd.org... done.\nFetching metadata index... done.\nInspecting system... done.\nPreparing to download files... done.\n\nNo updates needed to update system to 14.1-RELEASE-p5.'); return; }
    if (c.args[0] === 'install') { c.outln('No updates are available to install.\nRun \'/usr/sbin/freebsd-update fetch\' first.'); return 2; }
    c.err('usage: freebsd-update [options] command ... [path]\n\nCommands:\n  fetch        -- Fetch updates from server\n  install      -- Install downloaded updates\n  rollback     -- Uninstall most recently installed updates\n'); return 1;
  }, { only: BSD });
  def('make', async (c) => {
    const ci = c.args.indexOf('-C');
    const dirSegs = ci >= 0 ? c.path(c.args[ci + 1]) : c.sh.cwd;
    const dir = c.fmt(dirSegs);
    const targets = c.args.filter((a, i) => !a.startsWith('-') && c.args[i - 1] !== '-C');
    const mk = c.vfs.get(dirSegs.concat('Makefile'));
    if (!mk) { c.err('make: no target to make.\n\nmake: stopped in ' + dir + '\n'); return 2; }
    const port = /\/usr\/ports\/(\w+)\/([\w.-]+)$/.exec(dir);
    if (!port) { c.outln(C.dim('(TerminalEX simulates make only for the ports collection: try  cd /usr/ports/games/cowsay  then  make install clean  as root)')); return 0; }
    const name = port[2];
    if (targets.includes('install') && !isRoot(c)) { c.err(`===>  Installing for ${name}\n===>  Checking if ${name} is already installed\nmake: Permission denied\n` + C.dim('(installing into /usr/local needs root — run  su  first)') + '\n'); return 1; }
    const steps = [`===>  License GPLv1+ accepted by the user`, `===>   ${name}-3.04_1 depends on file: /usr/local/sbin/pkg - found`, `=> ${name}-3.04.tar.gz doesn't seem to exist in /usr/ports/distfiles/.`, `=> Attempting to fetch https://github.com/cowsay-org/cowsay/archive/v3.04.tar.gz`, `fetch: https://github.com/cowsay-org/cowsay/archive/v3.04.tar.gz: size of remote file is not known`, `v3.04.tar.gz                                            19 kB  412 kBps    00s`, `===> Fetching all distfiles required by ${name}-3.04_1 for building`, `===>  Extracting for ${name}-3.04_1`, `=> SHA256 Checksum OK for v3.04.tar.gz.`, `===>  Patching for ${name}-3.04_1`, `===>  Configuring for ${name}-3.04_1`, `===>  Building for ${name}-3.04_1`, `cc -O2 -pipe -fstack-protector-strong -fno-strict-aliasing  -o ${name} ${name}.c`];
    if (targets.includes('install')) steps.push(`===>  Staging for ${name}-3.04_1`, `===>  Installing for ${name}-3.04_1`, `===>  Checking if ${name} is already installed`, `===>   Registering installation for ${name}-3.04_1`, `Installing ${name}-3.04_1...`);
    if (targets.includes('clean')) steps.push(`===>  Cleaning for ${name}-3.04_1`);
    for (const s of steps) { c.outln(s); try { await c.sleep(120); } catch (e) { if (e.interrupt) return 130; throw e; } }
    if (targets.includes('install')) { c.m.installed.add(name); c.vfs.changed(); }
  }, { only: BSD });

  // ================================================================== UNIX V7
  def('mail', async (c) => {
    const me = c.user;
    const box = ['usr', 'spool', 'mail', me];
    if (c.args.length && c.args[0] !== '-r') {
      const to = c.args[0];
      if (!['student', 'ken', 'dmr', 'root'].includes(to)) { c.err(`Can't send to ${to}\n`); return 1; }
      const lines = [];
      if (c.stdin != null) lines.push(...c.stdin.replace(/\n$/, '').split('\n'));
      else { for (;;) { let l; try { l = await c.readLine(''); } catch (e) { break; } if (l === '.') break; lines.push(l); } }
      const d = v7Now();
      const msg = `From ${me} ${TX.DAY[d.getDay()]} ${TX.MON[d.getMonth()]} ${d.getDate()} ${hm(d)} 1979\n${lines.join('\n')}\n\n`;
      const target = ['usr', 'spool', 'mail', to];
      try { c.vfs.writeFile(target, msg, { append: true, user: 'root', owner: to }); } catch (e) { c.err(`mail: cannot deliver to ${to}\n`); return 1; }
      if (to === 'dmr' || to === 'ken') c.outln(C.dim(`(TerminalEX: ${to === 'dmr' ? 'Dennis Ritchie' : 'Ken Thompson'} will read it later. Real people really did use this to email each other in 1979.)`));
      return;
    }
    let text = '';
    try { text = c.vfs.readFile(box, { user: 'root' }); } catch (e) { /* empty */ }
    if (!text.trim()) { c.outln('No mail.'); return; }
    c.out(text);
    if (!c.tty) return;
    let a;
    try { a = await c.readLine('? '); } catch (e) { return; }
    if (/^d/.test(a)) { c.vfs.writeFile(box, '', { user: 'root' }); }
  }, { only: V7 });
  def('write', async (c) => {
    const to = c.args[0];
    if (!to) { c.err('usage: write user [ttyname]\n'); return 1; }
    if (!['ken', 'dmr', 'student'].includes(to)) { c.err(`${to} not logged in.\n`); return 1; }
    c.outln(C.dim(`(type lines to send to ${to}'s terminal; an empty line or Ctrl+C ends)`));
    for (;;) { let l; try { l = await c.readLine(''); } catch (e) { break; } if (!l) break; }
    c.outln('EOF');
    if (to === 'dmr') c.outln(`\nMessage from dmr tty01...\nhi! glad you're trying unix. -- dmr\nEOF`);
  }, { only: V7 });
  def('moo', async (c) => {
    const digits = [];
    while (digits.length < 4) { const d = Math.floor(Math.random() * 10); if (!digits.includes(d)) digits.push(d); }
    const secret = digits.join('');
    c.outln('MOO\nnew game');
    for (let turn = 1; ; turn++) {
      let g;
      try { g = (await c.readLine('? ')).trim(); } catch (e) { c.outln(''); return; }
      if (!/^\d{4}$/.test(g) || new Set(g).size !== 4) { c.outln('bad guess'); turn--; continue; }
      let bulls = 0, cows = 0;
      for (let i = 0; i < 4; i++) { if (g[i] === secret[i]) bulls++; else if (secret.includes(g[i])) cows++; }
      c.outln(`bulls = ${bulls} cows = ${cows}`);
      if (bulls === 4) { c.outln(`${turn} guesses`); return; }
    }
  }, { only: V7 });
  override('fortune', V7, (c) => {
    let t = '';
    try { t = c.vfs.readFile(['usr', 'games', 'lib', 'fortunes']); } catch (e) { /* none */ }
    const l = t.split('\n').filter(Boolean);
    c.outln(l.length ? TX.pick(l) : 'No fortunes.');
  });
  def('learn', (c) => { c.outln('These are the available courses -\n\tfiles\n\teditor\n\tmorefiles\n\tmacros\n\teqn\n\tC\n' + C.dim('(learn was the first computer-based tutorial, written in 1979. In TerminalEX, the Missions panel is its great-grandchild.)')); }, { only: V7 });

  // ------------------------------------------------------------------ ed, the standard editor (every UNIX has it; V7 had nothing else)
  def('ed', async (c) => {
    const file = c.args.filter((a) => a !== '-' && a !== '-s')[0];
    const quiet = c.args.includes('-s') || c.args.includes('-');
    let buf = [], dot = 0, dirty = false, fname = file || '', lastErr = '', help = false;
    if (file) {
      try { const t = c.vfs.readFile(c.path(file), { user: c.user }); buf = t.split('\n'); if (buf[buf.length - 1] === '') buf.pop(); dot = buf.length; if (!quiet) c.outln(String(t.length)); }
      catch (e) { if (!quiet) c.outln('?' + file); }
    }
    const q = () => { c.outln('?'); if (help) c.outln(lastErr); };
    const fail = (why) => { lastErr = why; q(); };
    const lines = c.stdin != null ? c.stdin.split('\n') : null;
    let li = 0;
    const read = async (p) => { if (lines) return li < lines.length ? lines[li++] : null; try { return await c.readLine(p); } catch (e) { return null; } };
    if (!lines && c.tty) c.err(C.dim('(ed: no screen, no cursor — you type commands. a = append text, . alone ends it, p/n print, w saves, q quits, h explains a ?)') + '\n');
    const addr = (s) => {
      // returns [rest, [a1, a2] | null]
      let m;
      const one = (t) => {
        if ((m = /^(\d+)/.exec(t))) return [t.slice(m[1].length), parseInt(m[1], 10)];
        if (t[0] === '.') return [t.slice(1), dot];
        if (t[0] === '$') return [t.slice(1), buf.length];
        if ((m = /^\/([^/]*)\/?/.exec(t))) { const re = new RegExp(m[1]); for (let k = 1; k <= buf.length; k++) { const i = ((dot + k - 1) % buf.length) + 1; if (re.test(buf[i - 1])) return [t.slice(m[0].length), i]; } return [t.slice(m[0].length), -1]; }
        if ((m = /^([+-])(\d*)/.exec(t)) && m[0]) return [t.slice(m[0].length), dot + (m[1] === '+' ? 1 : -1) * (m[2] ? parseInt(m[2], 10) : 1)];
        return [t, null];
      };
      if (s[0] === ',' || s[0] === '%') return [s.slice(1), [1, buf.length]];
      let [r, a] = one(s);
      if (a === null) return [s, null];
      if (r[0] === ',') { const [r2, b] = one(r.slice(1)); return [r2, [a, b === null ? a : b]]; }
      return [r, [a, a]];
    };
    for (;;) {
      const line = await read('');
      if (line === null) break;
      let [rest, rng] = addr(line);
      const cmd = rest[0] || '';
      const arg = rest.slice(1).trim();
      if (rng && (rng[0] < 0 || rng[1] < 0 || rng[0] > rng[1] || rng[1] > buf.length || (rng[0] === 0 && !'aqr'.includes(cmd)))) { fail('invalid address'); continue; }
      const [a1, a2] = rng || [dot, dot];
      const input = async () => { const out = []; for (;;) { const l = await read(''); if (l === null || l === '.') break; out.push(l); } return out; };
      if (cmd === '' && rng) { dot = a2; c.outln(buf[dot - 1]); continue; }
      if (cmd === '') { if (dot < buf.length) { dot++; c.outln(buf[dot - 1]); } else fail('invalid address'); continue; }
      if (cmd === 'a' || cmd === 'i') { const t = await input(); const at = cmd === 'a' ? a2 : Math.max(0, a1 - 1); buf.splice(at, 0, ...t); dot = at + t.length; dirty = dirty || t.length > 0; continue; }
      if (cmd === 'c') { const t = await input(); buf.splice(a1 - 1, a2 - a1 + 1, ...t); dot = a1 - 1 + t.length; dirty = true; continue; }
      if (cmd === 'd') { if (!buf.length) { fail('invalid address'); continue; } buf.splice(a1 - 1, a2 - a1 + 1); dot = Math.min(a1, buf.length); dirty = true; continue; }
      if (cmd === 'p' || cmd === 'n' || cmd === 'l') { if (!buf.length) { fail('invalid address'); continue; } for (let k = a1; k <= a2; k++) c.outln((cmd === 'n' ? k + '\t' : '') + buf[k - 1] + (cmd === 'l' ? '$' : '')); dot = a2; continue; }
      if (cmd === 's') {
        const m = /^(.)(.*?)\1(.*?)(?:\1(g?))?$/.exec(rest.slice(1));
        if (!m) { fail('no match'); continue; }
        const re = new RegExp(m[2], m[4] ? 'g' : '');
        let hit = false;
        for (let k = a1; k <= a2; k++) if (re.test(buf[k - 1])) { re.lastIndex = 0; buf[k - 1] = buf[k - 1].replace(re, m[3].replace(/&/g, '$&')); hit = true; dot = k; }
        if (!hit) fail('no match'); else dirty = true;
        continue;
      }
      if (cmd === 'g' && rest[1] === '/') { const m = /^g\/([^/]*)\/(.*)$/.exec(rest); if (!m) { fail('unknown command'); continue; } const re = new RegExp(m[1]); const sub = m[2] || 'p'; for (let k = (rng ? a1 : 1); k <= (rng ? a2 : buf.length); k++) if (re.test(buf[k - 1])) { if (sub === 'p') c.outln(buf[k - 1]); else if (sub === 'n') c.outln(k + '\t' + buf[k - 1]); dot = k; } continue; }
      if (cmd === '=') { c.outln(String(rng ? a2 : buf.length)); continue; }
      if (cmd === 'w' || cmd === 'W') {
        const name = arg || fname;
        if (!name) { fail('no current filename'); continue; }
        const text = buf.length ? buf.join('\n') + '\n' : '';
        try { c.vfs.writeFile(c.path(name), text, { user: c.user, owner: c.user }); } catch (e) { fail('cannot open output file'); continue; }
        fname = name; dirty = false; if (!quiet) c.outln(String(text.length));
        if (rest === 'wq' || rest.startsWith('wq ')) break;
        continue;
      }
      if (cmd === 'f') { if (arg) fname = arg; c.outln(fname || '?'); continue; }
      if (cmd === 'r') { try { const t = c.vfs.readFile(c.path(arg || fname), { user: c.user }).split('\n'); if (t[t.length - 1] === '') t.pop(); buf.splice(a2, 0, ...t); dot = a2 + t.length; dirty = true; if (!quiet) c.outln(String(t.join('\n').length + 1)); } catch (e) { fail('cannot open input file'); } continue; }
      if (cmd === 'h' || cmd === 'H') { if (cmd === 'H') help = !help; if (lastErr) c.outln(lastErr); continue; }
      if (cmd === 'q') { if (dirty && rest !== 'Q') { dirty = false; fail('warning: buffer modified (type q again to quit without saving, or w to save)'); continue; } break; }
      if (cmd === 'Q') break;
      fail('unknown command');
    }
  });
})();
