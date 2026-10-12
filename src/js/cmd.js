/* TerminalEX — Windows Command Prompt (cmd.exe) and shared Windows programs */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const W = TX.Paths.win;

  const NOT_RECOGNIZED = (n) => `'${n}' is not recognized as an internal or external command,\noperable program or batch file.\n`;
  const ERR = { ENOENT: 'The system cannot find the file specified.', ENOTDIR: 'The directory name is invalid.', EISDIR: 'Access is denied.', EEXIST: 'A duplicate file name exists, or the file\ncannot be found.', ENOTEMPTY: 'The directory is not empty.', EACCES: 'Access is denied.', EINVAL: 'The parameter is incorrect.' };
  TX.WIN_ERR = ERR;
  const fmtN = TX.fmtNum;

  function volumeFor(m, drive) {
    for (const d of m.disks) for (const p of d.parts) if (p.letter && p.letter + ':' === drive.toUpperCase()) return p;
    return null;
  }
  TX.volumeFor = volumeFor;

  // ================================================================ Windows programs (shared by cmd & PowerShell)
  // ctx: { args, out, err, outln, readLine, sleep, m, vfs, cwd, resolve, fmt, term, session, shell, tty, stdin, isAdmin }
  const X = (TX.winExe = {});
  const flag = (args, f) => args.some((a) => a.toLowerCase() === f.toLowerCase() || a.toLowerCase() === f.toLowerCase().replace('/', '-'));
  const flagVal = (args, f) => { const i = args.findIndex((a) => a.toLowerCase() === f.toLowerCase() || a.toLowerCase() === f.toLowerCase().replace('/', '-')); return i >= 0 ? args[i + 1] : undefined; };

  X.ipconfig = (c) => {
    const n = c.m.net, all = flag(c.args, '/all');
    if (flag(c.args, '/flushdns')) { c.outln('\nWindows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.'); return 0; }
    if (flag(c.args, '/release')) { c.outln('\nWindows IP Configuration\n\n' + (c.isAdmin ? 'Released.' : 'The requested operation requires elevation.')); return c.isAdmin ? 0 : 1; }
    if (flag(c.args, '/renew')) { c.outln('\nWindows IP Configuration\n\n' + (c.isAdmin ? 'Renewed. IPv4 Address: ' + n.ip : 'The requested operation requires elevation.')); return 0; }
    if (flag(c.args, '/displaydns')) { c.outln('\nWindows IP Configuration\n'); ['google.com', 'github.com', 'collegeboard.org'].forEach((h) => c.outln(`    ${h}\n    ----------------------------------------\n    Record Name . . . . . : ${h}\n    Record Type . . . . . : 1\n    Time To Live  . . . . : ${TX.randInt(30, 300)}\n    Data Length . . . . . : 4\n    Section . . . . . . . : Answer\n    A (Host) Record . . . : ${TX.DNS[h][0]}\n`)); return 0; }
    let s = '\nWindows IP Configuration\n\n';
    if (all) s += `   Host Name . . . . . . . . . . . . : ${n.hostname}\n   Primary Dns Suffix  . . . . . . . :\n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . . : No\n   WINS Proxy Enabled. . . . . . . . : No\n   DNS Suffix Search List. . . . . . : lan\n\n`;
    s += `Ethernet adapter ${n.iface}:\n\n   Connection-specific DNS Suffix  . : lan\n`;
    if (all) s += `   Description . . . . . . . . . . . : Realtek PCIe GbE Family Controller\n   Physical Address. . . . . . . . . : ${n.mac}\n   DHCP Enabled. . . . . . . . . . . : Yes\n   Autoconfiguration Enabled . . . . : Yes\n`;
    s += `   Link-local IPv6 Address . . . . . : ${n.ip6}${all ? '(Preferred)' : ''}\n   IPv4 Address. . . . . . . . . . . : ${n.ip}${all ? '(Preferred)' : ''}\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n`;
    if (all) { const d = new Date(Date.now() - 3600000 * 5); const e = new Date(Date.now() + 3600000 * 19); s += `   Lease Obtained. . . . . . . . . . : ${TX.psLongDate(d.getTime())}\n   Lease Expires . . . . . . . . . . : ${TX.psLongDate(e.getTime())}\n`; }
    s += `   Default Gateway . . . . . . . . . : ${n.gw}\n`;
    if (all) s += `   DHCP Server . . . . . . . . . . . : ${n.gw}\n   DHCPv6 IAID . . . . . . . . . . . : 104877698\n   DNS Servers . . . . . . . . . . . : ${n.dns}\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n`;
    s += `\nWireless LAN adapter ${n.wifi}:\n\n   Media State . . . . . . . . . . . : Media disconnected\n   Connection-specific DNS Suffix  . :\n`;
    if (all) s += `   Description . . . . . . . . . . . : Intel(R) Wi-Fi 6E AX211 160MHz\n   Physical Address. . . . . . . . . : 3C-A9-F4-21-7B-0E\n   DHCP Enabled. . . . . . . . . . . : Yes\n   Autoconfiguration Enabled . . . . : Yes\n`;
    s += `\nEthernet adapter Bluetooth Network Connection:\n\n   Media State . . . . . . . . . . . : Media disconnected\n   Connection-specific DNS Suffix  . :\n`;
    c.out(s);
    return 0;
  };
  X.ping = async (c) => {
    const host = c.args.filter((a) => !/^[-/]/.test(a) && !/^\d+$/.test(a))[0];
    if (!host) { c.outln('\nUsage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS]\n            [-r count] [-s count] [[-j host-list] | [-k host-list]]\n            [-w timeout] [-R] [-S srcaddr] [-c compartment] [-p]\n            [-4] [-6] target_name\n\nOptions:\n    -t             Ping the specified host until stopped.\n                   To see statistics and continue - type Control-Break;\n                   To stop - type Control-C.\n    -n count       Number of echo requests to send.\n    -l size        Send buffer size.'); return 1; }
    const ip = TX.resolve(host);
    if (!ip) { c.outln(`Ping request could not find host ${host}. Please check the name and try again.`); return 1; }
    const forever = flag(c.args, '-t');
    const n = forever ? Infinity : parseInt(flagVal(c.args, '-n') || '4', 10);
    const size = parseInt(flagVal(c.args, '-l') || '32', 10);
    const ttl = ip.startsWith('192.168') || ip.startsWith('127') ? 128 : ip.startsWith('142') ? 117 : 54;
    c.outln(`\nPinging ${host === ip ? ip : host + ' [' + ip + ']'} with ${size} bytes of data:`);
    const rtts = [];
    let sent = 0;
    try {
      while (sent < n) {
        const rtt = TX.latency(host) * (0.9 + Math.random() * 0.25);
        sent++;
        await c.sleep(Math.max(rtt, 40));
        rtts.push(rtt);
        c.outln(`Reply from ${ip}: bytes=${size} time${rtt < 1 ? '<1' : '=' + Math.round(rtt)}ms TTL=${ttl}`);
        if (sent < n) await c.sleep(Math.max(200, 1000 - rtt));
      }
    } catch (e) { if (!e.interrupt) throw e; c.out('\n'); }
    const mn = Math.round(Math.min(...rtts)), mx = Math.round(Math.max(...rtts)), avg = Math.round(rtts.reduce((a, b) => a + b, 0) / (rtts.length || 1));
    c.outln(`\nPing statistics for ${ip}:\n    Packets: Sent = ${sent}, Received = ${rtts.length}, Lost = ${sent - rtts.length} (${sent ? Math.round(((sent - rtts.length) / sent) * 100) : 0}% loss),`);
    if (rtts.length) c.outln(`Approximate round trip times in milli-seconds:\n    Minimum = ${mn}ms, Maximum = ${mx}ms, Average = ${avg}ms`);
    if (sent < n && forever) c.outln('Control-C');
    return 0;
  };
  X.tracert = async (c) => {
    const host = c.args.filter((a) => !/^[-/]/.test(a))[0];
    if (!host) { c.outln('\nUsage: tracert [-d] [-h maximum_hops] [-j host-list] [-w timeout]\n               [-R] [-S srcaddr] [-4] [-6] target_name'); return 1; }
    const hops = TX.hops(host);
    if (!hops) { c.outln(`Unable to resolve target system name ${host}.`); return 1; }
    c.outln(`\nTracing route to ${host} [${TX.resolve(host)}]\nover a maximum of 30 hops:\n`);
    try {
      for (let i = 0; i < hops.length; i++) {
        const [h, ip, ms] = hops[i];
        await c.sleep(300 + ms * 10);
        if (h === '*') { c.outln(`${String(i + 1).padStart(3)}     *        *        *     Request timed out.`); continue; }
        const t = [ms, ms * 1.05, ms * 0.97].map((x) => (x < 1 ? '<1 ms' : Math.round(x) + ' ms').padStart(8));
        c.outln(`${String(i + 1).padStart(3)} ${t.join(' ')}  ${h === ip ? ip : h + ' [' + ip + ']'}`);
      }
    } catch (e) { if (!e.interrupt) throw e; c.outln('^C'); return 1; }
    c.outln('\nTrace complete.');
    return 0;
  };
  X.nslookup = (c) => {
    const host = c.args.filter((a) => !a.startsWith('-'))[0];
    c.outln(`Server:  router.lan\nAddress:  ${c.m.net.dns}\n`);
    if (!host) { c.outln('> (interactive mode not simulated — try: nslookup google.com)'); return 0; }
    const recs = TX.DNS[host.toLowerCase()];
    if (!recs) { c.outln(`*** router.lan can't find ${host}: Non-existent domain`); return 1; }
    c.outln(`Non-authoritative answer:\nName:    ${host}\n${recs.length > 1 ? 'Addresses:  ' + recs.slice().reverse().join('\n          ') : 'Address:  ' + recs[0]}\n`);
    return 0;
  };
  function winConns(m) {
    const svc = (n) => m.services.find((s) => s.name === n && s.status === 'Running');
    const L = [['TCP', '0.0.0.0:135', '0.0.0.0:0', 'LISTENING', 1188], ['TCP', '0.0.0.0:445', '0.0.0.0:0', 'LISTENING', 4], ['TCP', '0.0.0.0:5040', '0.0.0.0:0', 'LISTENING', 1320], ['TCP', '0.0.0.0:7680', '0.0.0.0:0', 'LISTENING', 1044]];
    if (svc('sshd')) L.push(['TCP', '0.0.0.0:22', '0.0.0.0:0', 'LISTENING', 3004]);
    if (svc('TermService')) L.push(['TCP', '0.0.0.0:3389', '0.0.0.0:0', 'LISTENING', 1400]);
    L.push(['TCP', '127.0.0.1:49670', '0.0.0.0:0', 'LISTENING', 5012], ['TCP', m.net.ip + ':139', '0.0.0.0:0', 'LISTENING', 4], ['TCP', m.net.ip + ':52814', '140.82.112.3:443', 'ESTABLISHED', 4120], ['TCP', m.net.ip + ':52901', '142.250.72.14:443', 'ESTABLISHED', 4120], ['TCP', m.net.ip + ':53011', '52.112.100.22:443', 'ESTABLISHED', 5540], ['TCP', m.net.ip + ':53100', '35.186.224.25:443', 'TIME_WAIT', 0], ['UDP', '0.0.0.0:5353', '*:*', '', 3388], ['UDP', '0.0.0.0:5355', '*:*', '', 1320]);
    return L;
  }
  TX.winConns = winConns;
  X.netstat = (c) => {
    const a = c.args.join('').toLowerCase().replace(/[-/]/g, '');
    if (a.includes('r')) { X.route(Object.assign({}, c, { args: ['print'] })); return 0; }
    const numeric = a.includes('n'), pid = a.includes('o'), all = a.includes('a');
    let L = winConns(c.m);
    if (!all) L = L.filter((r) => r[3] !== 'LISTENING' && r[0] === 'TCP');
    const nm = (x) => (numeric ? x : x.replace(/^0\.0\.0\.0/, '0.0.0.0').replace(c.m.net.ip, c.m.net.hostname).replace('140.82.112.3:443', 'lb-140-82-112-3-iad:https').replace('142.250.72.14:443', 'lga34s32-in-f14:https').replace(/:443$/, ':https'));
    c.outln('\nActive Connections\n\n  Proto  Local Address          Foreign Address        State' + (pid ? '           PID' : ''));
    L.forEach((r) => c.outln(`  ${r[0].padEnd(6)} ${nm(r[1]).padEnd(22)} ${nm(r[2]).padEnd(22)} ${r[3].padEnd(pid ? 15 : 0)}${pid ? String(r[4]).padStart(6) : ''}`.replace(/\s+$/, '')));
    return 0;
  };
  X.arp = (c) => { c.outln(`\nInterface: ${c.m.net.ip} --- 0xc\n  Internet Address      Physical Address      Type\n  192.168.1.1           44-d9-e7-0a-1b-2c     dynamic\n  192.168.1.42          08-00-27-4e-66-a1     dynamic\n  192.168.1.57          a4-83-e7-1c-9b-20     dynamic\n  192.168.1.255         ff-ff-ff-ff-ff-ff     static\n  224.0.0.22            01-00-5e-00-00-16     static\n  239.255.255.250       01-00-5e-7f-ff-fa     static`); return 0; };
  X.route = (c) => {
    if ((c.args[0] || '').toLowerCase() !== 'print') { c.outln('\nManipulates network routing tables.\n\nROUTE [-f] [-p] [-4|-6] command [destination]\n                  [MASK netmask]  [gateway] [METRIC metric]  [IF interface]\n\n  command      One of these:\n                 PRINT     Prints  a route'); return 0; }
    c.outln(`===========================================================================\nInterface List\n 12...${c.m.net.mac.toLowerCase().replace(/-/g, ' ')} ......Realtek PCIe GbE Family Controller\n 17...3c a9 f4 21 7b 0e ......Intel(R) Wi-Fi 6E AX211 160MHz\n  1...........................Software Loopback Interface 1\n===========================================================================\n\nIPv4 Route Table\n===========================================================================\nActive Routes:\nNetwork Destination        Netmask          Gateway       Interface  Metric\n          0.0.0.0          0.0.0.0      ${c.m.net.gw}    ${c.m.net.ip}     25\n        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331\n      192.168.1.0    255.255.255.0         On-link     ${c.m.net.ip}    281\n===========================================================================\nPersistent Routes:\n  None`);
    return 0;
  };
  X.getmac = (c) => { c.outln(`\nPhysical Address    Transport Name\n=================== ==========================================================\n${c.m.net.mac}   \\Device\\Tcpip_{4E1C7B2A-9D3F-4C6A-8B21-7A0E5D3C2F19}\n3C-A9-F4-21-7B-0E   Media disconnected`); return 0; };
  X.hostname = (c) => { c.outln(c.m.net.hostname); return 0; };
  X.whoami = (c) => {
    const u = (c.m.net.hostname + '\\' + (c.isAdmin ? 'student' : 'student')).toLowerCase();
    if (flag(c.args, '/upn')) { c.outln('ERROR: Unable to get User Principal Name (UPN) as the current logged-on user\n       is not a domain user.'); return 1; }
    if (flag(c.args, '/user') || flag(c.args, '/all')) c.outln(`\nUSER INFORMATION\n----------------\n\nUser Name            SID\n==================== ==============================================\n${u.padEnd(20)} S-1-5-21-3623811015-3361044348-30300820-1001\n`);
    if (flag(c.args, '/groups') || flag(c.args, '/all')) c.outln(`\nGROUP INFORMATION\n-----------------\n\nGroup Name                             Type             SID          Attributes\n====================================== ================ ============ ==================================================\nEveryone                               Well-known group S-1-1-0      Mandatory group, Enabled by default, Enabled group\nBUILTIN\\Administrators                  Alias            S-1-5-32-544 ${c.isAdmin ? 'Mandatory group, Enabled by default, Enabled group, Group owner' : 'Group used for deny only'}\nBUILTIN\\Users                          Alias            S-1-5-32-545 Mandatory group, Enabled by default, Enabled group\nNT AUTHORITY\\INTERACTIVE               Well-known group S-1-5-4      Mandatory group, Enabled by default, Enabled group\nMandatory Label\\${c.isAdmin ? 'High' : 'Medium'} Mandatory Level       Label            S-1-16-${c.isAdmin ? '12288' : '8192'}\n`);
    if (flag(c.args, '/priv') || flag(c.args, '/all')) c.outln(`\nPRIVILEGES INFORMATION\n----------------------\n\nPrivilege Name                Description                          State\n============================= ==================================== ========\nSeShutdownPrivilege           Shut down the system                 Disabled\nSeChangeNotifyPrivilege       Bypass traverse checking             Enabled\nSeUndockPrivilege             Remove computer from docking station Disabled\nSeIncreaseWorkingSetPrivilege Increase a process working set       Disabled\nSeTimeZonePrivilege           Change the time zone                 Disabled`);
    if (!c.args.length) c.outln(u);
    return 0;
  };
  X.systeminfo = async (c) => {
    c.out('Loading Operating System Information ...');
    await c.sleep(700);
    c.out('\r\x1b[2K');
    const m = c.m, hw = m.hw, mem = m.memory();
    const boot = new Date(m.boot);
    c.outln(`\nHost Name:                     ${m.net.hostname}\nOS Name:                       ${hw.os}\nOS Version:                    ${hw.ver} N/A Build ${hw.build}\nOS Manufacturer:               Microsoft Corporation\nOS Configuration:              Standalone Workstation\nOS Build Type:                 Multiprocessor Free\nRegistered Owner:              student\nRegistered Organization:       Forsyth County Schools\nProduct ID:                    00328-10000-00001-AA123\nOriginal Install Date:         8/1/2026, 9:14:02 AM\nSystem Boot Time:              ${boot.getMonth() + 1}/${boot.getDate()}/${boot.getFullYear()}, ${TX.winTime(m.boot).replace(/^0/, '')}\nSystem Manufacturer:           LENOVO\nSystem Model:                  82Y9\nSystem Type:                   x64-based PC\nProcessor(s):                  1 Processor(s) Installed.\n                               [01]: AMD64 Family 25 Model 116 Stepping 1 AuthenticAMD ~3801 Mhz\nBIOS Version:                  ${hw.bios}\nWindows Directory:             C:\\Windows\nSystem Directory:              C:\\Windows\\system32\nBoot Device:                   \\Device\\HarddiskVolume1\nSystem Locale:                 en-us;English (United States)\nInput Locale:                  en-us;English (United States)\nTime Zone:                     (UTC-05:00) Eastern Time (US & Canada)\nTotal Physical Memory:         ${fmtN(Math.round(mem.total / 1024))} MB\nAvailable Physical Memory:     ${fmtN(Math.round(mem.avail / 1024))} MB\nVirtual Memory: Max Size:      ${fmtN(Math.round(mem.total / 1024) + 4864)} MB\nVirtual Memory: Available:     ${fmtN(Math.round(mem.avail / 1024) + 2100)} MB\nVirtual Memory: In Use:        ${fmtN(Math.round(mem.used / 1024) + 2764)} MB\nPage File Location(s):         C:\\pagefile.sys\nDomain:                        WORKGROUP\nLogon Server:                  \\\\${m.net.hostname}\nHotfix(s):                     4 Hotfix(s) Installed.\n                               [01]: KB5043080\n                               [02]: KB5027397\n                               [03]: KB5043937\n                               [04]: KB5043113\nNetwork Card(s):               2 NIC(s) Installed.\n                               [01]: Realtek PCIe GbE Family Controller\n                                     Connection Name: Ethernet\n                                     DHCP Enabled:    Yes\n                                     DHCP Server:     ${m.net.gw}\n                                     IP address(es)\n                                     [01]: ${m.net.ip}\n                                     [02]: ${m.net.ip6.replace(/%\d+$/, '')}\n                               [02]: Intel(R) Wi-Fi 6E AX211 160MHz\n                                     Connection Name: Wi-Fi\n                                     Status:          Media disconnected\nHyper-V Requirements:          A hypervisor has been detected. Features required for Hyper-V will not be displayed.`);
    return 0;
  };
  X.tasklist = (c) => {
    let P = c.m.procs.slice();
    const fi = flagVal(c.args, '/fi');
    if (fi) { const m = /imagename\s+eq\s+(\S+)/i.exec(fi); if (m) P = P.filter((p) => (p.name + '.exe').toLowerCase() === m[1].toLowerCase().replace(/\.exe$/, '') + '.exe' || p.name.toLowerCase() === m[1].toLowerCase()); const pm = /pid\s+eq\s+(\d+)/i.exec(fi); if (pm) P = P.filter((p) => p.pid === +pm[1]); }
    if (!P.length) { c.outln('INFO: No tasks are running which match the specified criteria.'); return 0; }
    if (flag(c.args, '/svc')) { c.outln('\nImage Name                     PID Services\n========================= ======== ============================================'); P.forEach((p) => c.outln(`${(p.name.includes(' ') ? p.name : p.name + '.exe').padEnd(25).slice(0, 25)} ${String(p.pid).padStart(8)} ${p.name === 'svchost' ? 'BrokerInfrastructure, DcomLaunch, PlugPlay' : 'N/A'}`)); return 0; }
    c.outln('\nImage Name                     PID Session Name        Session#    Mem Usage\n========================= ======== ================ =========== ============');
    P.forEach((p) => c.outln(`${(p.name.includes(' ') ? p.name : p.name + '.exe').padEnd(25).slice(0, 25)} ${String(p.pid).padStart(8)} ${(p.session || 'Console').padEnd(16)} ${String(p.session === 'Services' ? 0 : 1).padStart(11)} ${(fmtN(p.rss || 0) + ' K').padStart(12)}`));
    return 0;
  };
  X.taskkill = (c) => {
    const im = flagVal(c.args, '/im'), pid = flagVal(c.args, '/pid');
    if (!im && !pid) { c.err('ERROR: Invalid syntax. Neither /FI nor /PID nor /IM were specified.\nType "TASKKILL /?" for usage.\n'); return 1; }
    const targets = pid ? c.m.procs.filter((p) => p.pid === +pid) : c.m.procs.filter((p) => TX.likeToRegex(im.replace(/\.exe$/i, '')).test(p.name));
    if (!targets.length) { c.err(`ERROR: The process ${pid ? `"${pid}"` : `"${im}"`} not found.\n`); return 128; }
    let code = 0;
    targets.forEach((p) => {
      if (p.session === 'Services' && !c.isAdmin) { c.err(`ERROR: The process with PID ${p.pid} could not be terminated.\nReason: Access is denied.\n`); code = 1; return; }
      if (p.pid <= 4) { c.err(`ERROR: The process with PID ${p.pid} could not be terminated.\nReason: This is critical system process. Taskkill cannot end this process.\n`); code = 1; return; }
      c.m.kill(p.pid);
      c.outln(flag(c.args, '/f') ? `SUCCESS: The process "${p.name}.exe" with PID ${p.pid} has been terminated.` : `SUCCESS: Sent termination signal to the process "${p.name}.exe" with PID ${p.pid}.`);
    });
    return code;
  };
  X.driverquery = (c) => { c.outln('\nModule Name  Display Name           Driver Type   Link Date\n============ ====================== ============= ======================\n1394ohci     1394 OHCI Compliant Ho Kernel\n3ware        3ware                  Kernel        5/18/2015 6:28:03 PM\nACPI         Microsoft ACPI Driver  Kernel\namdgpio2     AMD GPIO Client Driver Kernel        11/6/2023 3:12:44 AM\nbthserv      Bluetooth Support Serv Kernel\ndisk         Disk Driver            Kernel\nkbdclass     Keyboard Class Driver  Kernel\nmouclass     Mouse Class Driver     Kernel\nNdis         NDIS System Driver     Kernel\nnvme         Microsoft NVMe Driver  Kernel\nrt640x64     Realtek RT640 NT Drive Kernel        3/2/2024 1:02:11 AM\nUSBSTOR      USB Mass Storage Drive Kernel'); return 0; };
  X.chkdsk = async (c) => {
    const drive = (c.args.find((a) => /^[a-z]:$/i.test(a)) || c.cwd[0] || 'C:').toUpperCase();
    const vol = volumeFor(c.m, drive);
    if (!vol) { c.outln('The type of the file system is RAW.\nCHKDSK is not available for RAW drives.'); return 1; }
    if ((flag(c.args, '/f') || flag(c.args, '/r')) && !c.isAdmin) { c.outln('Access Denied as you do not have sufficient privileges or\nthe disk may be locked by another process.\nYou have to invoke this utility running in elevated mode\nand make sure the disk is unlocked.'); return 1; }
    c.outln(`The type of the file system is ${vol.fs}.\nVolume label is ${vol.label}.\n\nWARNING!  /F parameter not specified.\nRunning CHKDSK in read-only mode.\n`);
    const stages = [['Stage 1: Examining basic file system structure ...', '  ' + fmtN(TX.randInt(300000, 900000)) + ' file records processed.'], ['Stage 2: Examining file name linkage ...', '  ' + fmtN(TX.randInt(5000, 40000)) + ' reparse records processed.'], ['Stage 3: Examining security descriptors ...', '  Security descriptor verification completed.']];
    try {
      for (const [a, b] of stages) { c.outln(a); for (let p = 0; p <= 100; p += 20) { c.out(`\rProgress: ${fmtN(p * 7000)} of ${fmtN(700000)} done; Stage: ${String(p).padStart(3)}%; Total:  ${String(Math.round(p / 3)).padStart(3)}%; ETA:   0:00:0${9 - Math.floor(p / 12)} ...`); await c.sleep(150); } c.out('\r\x1b[2K'); c.outln(b); }
    } catch (e) { if (e.interrupt) return 1; throw e; }
    const total = Math.round(vol.size / 1024), used = Math.round(vol.used / 1024);
    c.outln(`\nWindows has scanned the file system and found no problems.\nNo further action is required.\n\n${fmtN(total).padStart(15)} KB total disk space.\n${fmtN(used).padStart(15)} KB in ${fmtN(TX.randInt(200000, 400000))} files.\n${fmtN(TX.randInt(100000, 300000)).padStart(15)} KB in ${fmtN(TX.randInt(60000, 90000))} indexes.\n${'0'.padStart(15)} KB in bad sectors.\n${fmtN(total - used).padStart(15)} KB available on disk.\n\n${'4096'.padStart(15)} bytes in each allocation unit.`);
    return 0;
  };
  X.sfc = async (c) => {
    if (!flag(c.args, '/scannow') && !flag(c.args, '/verifyonly')) { c.outln('\nMicrosoft (R) Windows (R) Resource Checker Version 6.0\nCopyright (C) Microsoft Corporation. All rights reserved.\n\nScans the integrity of all protected system files and replaces incorrect versions with\ncorrect Microsoft versions.\n\nSFC [/SCANNOW] [/VERIFYONLY] [/SCANFILE=<file>] [/VERIFYFILE=<file>]'); return 0; }
    if (!c.isAdmin) { c.outln('You must be an administrator running a console\nsession in order to use the sfc utility.'); return 1; }
    c.outln('\nBeginning system scan.  This process will take some time.\n\nBeginning verification phase of system scan.');
    try { for (let p = 0; p <= 100; p += 5) { c.out(`\rVerification ${p}% complete.`); await c.sleep(90); } } catch (e) { if (e.interrupt) return 1; throw e; }
    c.outln('\n\nWindows Resource Protection did not find any integrity violations.');
    return 0;
  };
  X.shutdown = (c) => {
    const a = c.args.map((x) => x.toLowerCase());
    if (a.includes('/a')) { c.outln(''); c.err('Unable to abort the system shutdown because no shutdown was in progress.(1116)\n'); return 1; }
    if (a.includes('/s') || a.includes('/r') || a.includes('/l')) { c.outln(C.dim('(TerminalEX) Nice try! The pretend PC stays on. On a real computer: shutdown /s /t 0 powers off, /r restarts, /a cancels.')); TX.app && TX.app.toast('You\'re about to be signed out — Windows will shut down in less than a minute. (Just kidding: TerminalEX)'); return 0; }
    c.outln('Usage: shutdown [/i | /l | /s | /sg | /r | /g | /a | /p | /h | /e | /o] [/hybrid] [/soft] [/fw] [/f]\n    [/m \\\\computer][/t xxx][/d [p|u:]xx:yy [/c "comment"]]\n\n    No args    Display help. This is the same as typing /?.\n    /s         Shutdown the computer.\n    /r         Full shutdown and restart the computer.\n    /a         Abort a system shutdown.\n    /t xxx     Set the time-out period before shutdown to xxx seconds.');
    return 0;
  };
  X.net = (c) => {
    const sub = (c.args[0] || '').toLowerCase();
    const done = 'The command completed successfully.\n';
    if (sub === 'user') {
      if (c.args[1]) { const u = c.args[1]; if (!c.m.users.map((x) => x.toLowerCase()).includes(u.toLowerCase())) { if (c.args[2]) { if (!c.isAdmin) { c.err('System error 5 has occurred.\n\nAccess is denied.\n\n'); return 2; } c.m.users.push(u); c.outln(done); return 0; } c.err('The user name could not be found.\n\nMore help is available by typing NET HELPMSG 2221.\n\n'); return 2; } c.outln(`User name                    ${u}\nFull Name                    ${u === 'student' ? 'Student' : ''}\nComment                      \nAccount active               ${u === 'Guest' ? 'No' : 'Yes'}\nAccount expires              Never\n\nPassword last set            8/1/2026 9:20:14 AM\nPassword expires             Never\nPassword changeable          8/1/2026 9:20:14 AM\nPassword required            Yes\nUser may change password     Yes\n\nWorkstations allowed         All\nLogon script\nUser profile\nHome directory\nLast logon                   ${TX.psDate(Date.now() - 3600000 * 4)}\n\nLocal Group Memberships      *${u === 'Administrator' || u === 'student' ? 'Administrators       *Users' : 'Users'}\nGlobal Group memberships     *None\n${done}`); return 0; }
      c.outln(`\nUser accounts for \\\\${c.m.net.hostname}\n\n-------------------------------------------------------------------------------\n${TX.columns(c.m.users.slice().sort((a, b) => a.localeCompare(b)), 78, 6)}\n${done}`);
      return 0;
    }
    if (sub === 'localgroup') { c.outln(`\nAliases for \\\\${c.m.net.hostname}\n\n-------------------------------------------------------------------------------\n*Administrators\n*Backup Operators\n*Device Owners\n*Guests\n*Hyper-V Administrators\n*Network Configuration Operators\n*Performance Log Users\n*Remote Desktop Users\n*Users\n${done}`); return 0; }
    if (sub === 'share') { c.outln(`\nShare name   Resource                        Remark\n\n-------------------------------------------------------------------------------\nC$           C:\\                             Default share\nD$           D:\\                             Default share\nIPC$                                         Remote IPC\nADMIN$       C:\\WINDOWS                      Remote Admin\n${done}`); return 0; }
    if (sub === 'view') { c.outln(`Server Name            Remark\n\n-------------------------------------------------------------------------------\n\\\\DESKTOP-LAB42\n\\\\UBUNTU-LAB           Samba 4.19.5-Ubuntu\n${done}`); return 0; }
    if (sub === 'start' || sub === 'stop') {
      if (!c.args[1]) { c.outln('These Windows services are started:\n\n' + c.m.services.filter((s) => s.status === 'Running').map((s) => '   ' + s.display).join('\n') + '\n\n' + done); return 0; }
      const s = c.m.services.find((x) => x.name.toLowerCase() === c.args[1].toLowerCase() || x.display.toLowerCase() === c.args.slice(1).join(' ').replace(/"/g, '').toLowerCase());
      if (!s) { c.err('The service name is invalid.\n\nMore help is available by typing NET HELPMSG 2185.\n\n'); return 2; }
      if (!c.isAdmin) { c.err('System error 5 has occurred.\n\nAccess is denied.\n\n'); return 2; }
      if (sub === 'start' && s.status === 'Running') { c.err('The requested service has already been started.\n\n'); return 2; }
      s.status = sub === 'start' ? 'Running' : 'Stopped';
      c.outln(`The ${s.display} service ${sub === 'start' ? 'is starting.\nThe ' + s.display + ' service was started successfully.' : 'is stopping.\nThe ' + s.display + ' service was stopped successfully.'}\n`);
      return 0;
    }
    if (sub === 'use') { c.outln('New connections will be remembered.\n\nThere are no entries in the list.\n'); return 0; }
    c.outln('The syntax of this command is:\n\nNET\n    [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |\n      HELPMSG | LOCALGROUP | PAUSE | SESSION | SHARE | START |\n      STATISTICS | STOP | TIME | USE | USER | VIEW ]\n');
    return 1;
  };
  X.sc = (c) => {
    const sub = (c.args[0] || '').toLowerCase();
    const s = c.args[1] ? c.m.services.find((x) => x.name.toLowerCase() === c.args[1].toLowerCase()) : null;
    const show = (x) => `\nSERVICE_NAME: ${x.name}\n        TYPE               : 30  WIN32\n        STATE              : ${x.status === 'Running' ? '4  RUNNING' : '1  STOPPED'}\n                                (${x.status === 'Running' ? 'STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN' : 'NOT_STOPPABLE, NOT_PAUSABLE, IGNORES_SHUTDOWN'})\n        WIN32_EXIT_CODE    : 0  (0x0)\n        SERVICE_EXIT_CODE  : 0  (0x0)\n        CHECKPOINT         : 0x0\n        WAIT_HINT          : 0x0`;
    if (sub === 'query') { if (c.args[1] && !s) { c.outln('[SC] EnumQueryServicesStatus:OpenService FAILED 1060:\n\nThe specified service does not exist as an installed service.\n'); return 1060; } (s ? [s] : c.m.services.filter((x) => x.status === 'Running')).forEach((x) => c.outln(show(x))); return 0; }
    if (sub === 'start' || sub === 'stop') { if (!s) { c.outln('[SC] OpenService FAILED 1060:\n\nThe specified service does not exist as an installed service.\n'); return 1060; } if (!c.isAdmin) { c.outln(`[SC] OpenService FAILED 5:\n\nAccess is denied.\n`); return 5; } s.status = sub === 'start' ? 'Running' : 'Stopped'; c.outln(show(s).replace(/RUNNING|STOPPED/, sub === 'start' ? 'START_PENDING' : 'STOP_PENDING')); return 0; }
    c.outln('DESCRIPTION:\n        SC is a command line program used for communicating with the\n        Service Control Manager and services.\nUSAGE:\n        sc <server> [command] [service name] <option1> <option2>...');
    return 0;
  };
  X.netsh = (c) => {
    const a = c.args.join(' ').toLowerCase();
    if (/wlan show profiles?\b/.test(a) && !/name=/.test(a)) { c.outln('\nProfiles on interface Wi-Fi:\n\nGroup policy profiles (read only)\n---------------------------------\n    SchoolNet-Students\n\nUser profiles\n-------------\n    All User Profile     : SchoolNet-Guest\n    All User Profile     : Home-WiFi-5G\n    All User Profile     : Starbucks WiFi\n'); return 0; }
    if (/wlan show profile.*name=/.test(a)) { const nm = /name="?([^"]+)"?/.exec(c.args.join(' '))[1].replace(/ key=clear/i, ''); c.outln(`\nProfile ${nm} on interface Wi-Fi:\n=======================================================================\n\nProfile information\n-------------------\n    Version                : 1\n    Type                   : Wireless LAN\n    Name                   : ${nm}\n\nSecurity settings\n-----------------\n    Authentication         : WPA2-Personal\n    Cipher                 : CCMP\n    Security key           : Present\n${/key=clear/.test(a) ? (c.isAdmin ? '    Key Content            : correct-horse-battery-staple\n' : '') : ''}`); return 0; }
    if (/wlan show interfaces?/.test(a)) { c.outln('\nThere is 1 interface on the system:\n\n    Name                   : Wi-Fi\n    Description            : Intel(R) Wi-Fi 6E AX211 160MHz\n    Physical address       : 3c:a9:f4:21:7b:0e\n    State                  : disconnected\n    Radio status           : Hardware On\n                             Software On\n'); return 0; }
    if (/interface (ip )?show (interface|config)/.test(a)) { c.outln(`\nAdmin State    State          Type             Interface Name\n-------------------------------------------------------------------------\nEnabled        Connected      Dedicated        Ethernet\nEnabled        Disconnected   Dedicated        Wi-Fi\nEnabled        Disconnected   Dedicated        Bluetooth Network Connection\n`); return 0; }
    if (/advfirewall show (currentprofile|allprofiles)/.test(a)) { c.outln('\nPrivate Profile Settings:\n----------------------------------------------------------------------\nState                                 ON\nFirewall Policy                       BlockInbound,AllowOutbound\nLocalFirewallRules                    N/A (GPO-store only)\nInboundUserNotification               Enable\nRemoteManagement                      Disable\nUnicastResponseToMulticast            Enable\n\nOk.\n'); return 0; }
    c.outln('\nUsage: netsh [-a AliasFile] [-c Context] [-r RemoteMachine] [-u [DomainName\\]UserName] [-p Password | *]\n             [Command | -f ScriptFile]\n\nThe following commands are available:\n\nCommands in this context:\n?              - Displays a list of commands.\nadvfirewall    - Changes to the `netsh advfirewall\' context.\ninterface      - Changes to the `netsh interface\' context.\nwlan           - Changes to the `netsh wlan\' context.\n');
    return 0;
  };
  X.wmic = (c) => {
    const a = c.args.join(' ').toLowerCase().replace(/,\s+/g, ',');
    const gm = /\bget\s+([\w,]+)/i.exec(c.args.join(' '));
    const want = gm ? gm[1].toLowerCase().split(',').filter(Boolean) : null;
    const tbl = (rows) => {
      if (want) { const idx = rows[0].map((h, i) => (want.includes(String(h).toLowerCase()) ? i : -1)).filter((i) => i >= 0); if (idx.length) rows = rows.map((r) => idx.map((i) => r[i])); }
      c.outln(TX.table(rows.map((r) => r.map(String)), [], '  ')); c.outln('');
    };
    c.err(C.dim('WMIC is deprecated. Use PowerShell\'s Get-CimInstance instead.\n'));
    if (a.startsWith('logicaldisk')) { const rows = [['Caption', 'Description', 'FileSystem', 'FreeSpace', 'Size', 'VolumeName']]; c.m.disks.forEach((d) => d.parts.forEach((p) => { if (p.letter) rows.push([p.letter + ':', p.removable ? 'Removable Disk' : 'Local Fixed Disk', p.fs, Math.round(p.size - p.used), Math.round(p.size), p.label]); })); tbl(rows); return 0; }
    if (a.startsWith('diskdrive')) { tbl([['Index', 'InterfaceType', 'MediaType', 'Model', 'Size']].concat(c.m.disks.map((d) => [d.num, d.bus === 'NVMe' ? 'SCSI' : d.bus === 'USB' ? 'USB' : 'IDE', d.media === 'Removable' ? 'Removable Media' : 'Fixed hard disk media', d.model, Math.round(d.size)]))); return 0; }
    if (a.startsWith('cpu')) { tbl([['Name', 'NumberOfCores', 'NumberOfLogicalProcessors', 'MaxClockSpeed'], [c.m.hw.cpu, c.m.hw.cores, c.m.hw.threads, c.m.hw.mhz]]); return 0; }
    if (a.startsWith('os')) { tbl([['Caption', 'Version', 'OSArchitecture', 'BuildNumber'], [c.m.hw.os, c.m.hw.ver, '64-bit', c.m.hw.build]]); return 0; }
    if (a.startsWith('bios')) { tbl([['Manufacturer', 'SerialNumber', 'SMBIOSBIOSVersion'], ['LENOVO', 'PF4XK2ZB', 'KWCN34WW']]); return 0; }
    if (a.startsWith('memorychip')) { tbl([['BankLabel', 'Capacity', 'Speed', 'Manufacturer'], ['P0 CHANNEL A', 17179869184, 5600, 'Samsung'], ['P0 CHANNEL B', 17179869184, 5600, 'Samsung']]); return 0; }
    if (a.startsWith('process')) { tbl([['HandleCount', 'Name', 'Priority', 'ProcessId', 'ThreadCount', 'WorkingSetSize']].concat(c.m.procs.map((p) => [p.handles || TX.randInt(100, 900), p.name + '.exe', 8, p.pid, p.threads || 4, (p.rss || 0) * 1024]))); return 0; }
    if (a.startsWith('computersystem')) { tbl([['Domain', 'Manufacturer', 'Model', 'Name', 'TotalPhysicalMemory'], ['WORKGROUP', 'LENOVO', '82Y9', c.m.net.hostname, c.m.hw.memTotal * 1024]]); return 0; }
    if (a.startsWith('useraccount')) { tbl([['Name', 'Disabled', 'LocalAccount']].concat(c.m.users.map((u) => [u, u === 'Guest' || u === 'DefaultAccount' ? 'TRUE' : 'FALSE', 'TRUE']))); return 0; }
    c.outln('wmic:root\\cli>' + (c.args.length ? '\n' + c.args[0] + ' - Alias not found.' : ''));
    return 1;
  };
  X.winget = async (c) => {
    const sub = (c.args[0] || '').toLowerCase();
    const catalog = [['Git', 'Git.Git', '2.46.0'], ['Python 3.12', 'Python.Python.3.12', '3.12.6'], ['Visual Studio Code', 'Microsoft.VisualStudioCode', '1.93.1'], ['Google Chrome', 'Google.Chrome', '129.0.6668.59'], ['Node.js LTS', 'OpenJS.NodeJS.LTS', '20.17.0'], ['PowerShell', 'Microsoft.PowerShell', '7.4.5'], ['7-Zip', '7zip.7zip', '24.08'], ['Spotify', 'Spotify.Spotify', '1.2.46.462'], ['Discord', 'Discord.Discord', '1.0.9163']];
    if (sub === 'search' || sub === 'install' || sub === 'show') {
      const q = (c.args[1] || '').toLowerCase();
      const hits = catalog.filter(([n, id]) => n.toLowerCase().includes(q) || id.toLowerCase().includes(q));
      if (!hits.length) { c.outln('No package found matching input criteria.'); return 1; }
      if (sub === 'search') { c.outln(TX.table([['Name', 'Id', 'Version', 'Source'], ['-'.repeat(20), '-'.repeat(28), '-'.repeat(12), '------']].concat(hits.map(([n, id, v]) => [n, id, v, 'winget'])), [], ' ')); return 0; }
      const [n, id, v] = hits[0];
      c.outln(`Found ${n} [${id}] Version ${v}\nThis application is licensed to you by its owner.\nMicrosoft is not responsible for, nor does it grant any licenses to, third-party packages.\nDownloading https://example.com/${id}-${v}.exe`);
      for (let p = 0; p <= 100; p += 10) { c.out(`\r  ${'█'.repeat(p / 5).padEnd(20, '▒')}  ${(p * 0.94).toFixed(1)} MB / 94.0 MB`); await c.sleep(80); }
      c.outln('\nSuccessfully verified installer hash\nStarting package install...\nSuccessfully installed');
      return 0;
    }
    if (sub === 'list') { c.outln(TX.table([['Name', 'Id', 'Version', 'Source']].concat(catalog.slice(0, 6).map(([n, id, v]) => [n, id, v, 'winget'])))); return 0; }
    if (sub === 'upgrade') { c.outln('Name               Id                          Version Available Source\n-----------------------------------------------------------------------\nGoogle Chrome      Google.Chrome               128.0   129.0     winget\nSpotify            Spotify.Spotify             1.2.44  1.2.46    winget\n2 upgrades available.'); return 0; }
    c.outln('Windows Package Manager v1.8.1911\nCopyright (c) Microsoft Corporation. All rights reserved.\n\nThe winget command line utility enables installing applications and other packages from the command line.\n\nusage: winget  [<command>] [<options>]\n\nThe following commands are available:\n  install    Installs the given package\n  show       Shows information about a package\n  search     Find and show basic info of packages\n  list       Display installed packages\n  upgrade    Shows and performs available upgrades');
    return 0;
  };
  X.where = (c) => {
    let code = 0;
    const known = { cmd: 'C:\\Windows\\System32\\cmd.exe', notepad: 'C:\\Windows\\System32\\notepad.exe\nC:\\Windows\\notepad.exe', ping: 'C:\\Windows\\System32\\PING.EXE', ipconfig: 'C:\\Windows\\System32\\ipconfig.exe', git: 'C:\\Program Files\\Git\\cmd\\git.exe', powershell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', pwsh: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', python: 'C:\\Users\\student\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe', curl: 'C:\\Windows\\System32\\curl.exe', tar: 'C:\\Windows\\System32\\tar.exe', ssh: 'C:\\Windows\\System32\\OpenSSH\\ssh.exe', code: 'C:\\Program Files\\Microsoft VS Code\\bin\\code', wsl: 'C:\\Windows\\System32\\wsl.exe' };
    c.args.filter((a) => !a.startsWith('/')).forEach((n) => { const k = n.toLowerCase().replace(/\.exe$/, ''); if (known[k] || X[k]) c.outln(known[k] || 'C:\\Windows\\System32\\' + k + '.exe'); else { c.err('INFO: Could not find files for the given pattern(s).\n'); code = 1; } });
    return code;
  };
  X.tree = (c) => {
    const files = flag(c.args, '/f');
    const ascii = flag(c.args, '/a');
    const target = c.args.find((a) => !a.startsWith('/'));
    const segs = target ? c.resolve(target) : c.cwd;
    const root = c.vfs.get(segs);
    const vol = volumeFor(c.m, segs[0] || 'C:');
    c.outln(`Folder PATH listing for volume ${vol ? vol.label : ''}\nVolume serial number is ${vol ? TX.sha1(vol.label).slice(0, 4).toUpperCase() + '-' + TX.sha1(vol.label).slice(4, 8).toUpperCase() : '0000-0000'}`);
    if (!root || root.t !== 'd') { c.outln('Invalid path - ' + (target || '')); return 1; }
    c.outln(W.format(segs).replace(/\\$/, segs.length === 1 ? '\\' : '').toUpperCase());
    const [T, L, I, S] = ascii ? ['+---', '\\---', '|   ', '    '] : ['├───', '└───', '│   ', '    '];
    let nd = 0;
    const rec = (node, prefix) => {
      const kids = Object.values(node.ch).filter((k) => !k.hid).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      const dirs = kids.filter((k) => k.t === 'd'), fls = kids.filter((k) => k.t !== 'd');
      if (files) fls.forEach((f) => c.outln(prefix + (dirs.length ? I : S) + f.name));
      if (files && fls.length) c.outln(prefix + (dirs.length ? I : S).replace(/\s+$/, ''));
      dirs.forEach((d, i) => { nd++; const last = i === dirs.length - 1; c.outln(prefix + (last ? L : T) + d.name); if (nd < 400) rec(d, prefix + (last ? S : I)); });
    };
    rec(root, '');
    if (!Object.values(root.ch).some((k) => k.t === 'd')) c.outln('No subfolders exist \n');
    return 0;
  };
  X.robocopy = async (c) => {
    const [src, dst] = c.args.filter((a) => !a.startsWith('/'));
    if (!src || !dst) { c.outln('\n-------------------------------------------------------------------------------\n   ROBOCOPY     ::     Robust File Copy for Windows\n-------------------------------------------------------------------------------\n\n  Started : ' + TX.psLongDate(Date.now()) + '\n              Usage :: ROBOCOPY source destination [file [file]...] [options]\n\n             source :: Source Directory (drive:\\path or \\\\server\\share\\path).\n        destination :: Destination Dir  (drive:\\path or \\\\server\\share\\path).'); return 16; }
    const s = c.resolve(src), d = c.resolve(dst);
    const sn = c.vfs.get(s);
    if (!sn || sn.t !== 'd') { c.outln(`\n${TX.isoDate(Date.now()).replace(/-/g, '/')} ERROR 2 (0x00000002) Accessing Source Directory ${W.format(s)}\\\nThe system cannot find the file specified.`); return 16; }
    c.outln(`\n-------------------------------------------------------------------------------\n   ROBOCOPY     ::     Robust File Copy for Windows\n-------------------------------------------------------------------------------\n\n  Started : ${TX.psLongDate(Date.now())}\n   Source : ${W.format(s)}\\\n     Dest : ${W.format(d)}\\\n\n    Files : *.*\n\n  Options : *.* ${flag(c.args, '/e') ? '/S /E ' : ''}/DCOPY:DA /COPY:DAT /R:1000000 /W:30\n\n------------------------------------------------------------------------------\n`);
    let files = 0, dirs = 0, bytes = 0;
    const recurse = flag(c.args, '/e') || flag(c.args, '/s') || flag(c.args, '/mir');
    const walk = (node, from, to) => {
      c.vfs.mkdir(to, { parents: true, user: c.user, owner: 'student' }); dirs++;
      c.outln(`\t  New Dir  ${String(Object.values(node.ch).filter((k) => k.t === 'f').length).padStart(10)}\t${W.format(from)}\\`);
      for (const k of Object.values(node.ch)) {
        if (k.t === 'f') { const sz = c.vfs.size(k); c.outln(`\t    New File  \t\t${String(sz).padStart(10)}\t${k.name}`); c.vfs.copy(from.concat(k.name), to.concat(k.name), { user: c.user }); files++; bytes += sz; }
        else if (k.t === 'd' && recurse) walk(k, from.concat(k.name), to.concat(k.name));
      }
    };
    try { walk(sn, s, d); } catch (e) { c.outln(`ERROR 5 (0x00000005) ${ERR[e.code] || e.message}`); return 16; }
    await c.sleep(300);
    c.outln(`\n------------------------------------------------------------------------------\n\n               Total    Copied   Skipped  Mismatch    FAILED    Extras\n    Dirs :  ${String(dirs).padStart(9)} ${String(dirs).padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)}\n   Files :  ${String(files).padStart(9)} ${String(files).padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)}\n   Bytes :  ${TX.human(bytes).padStart(9)} ${TX.human(bytes).padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)} ${'0'.padStart(9)}\n   Times :   0:00:00   0:00:00                       0:00:00   0:00:00\n   Ended : ${TX.psLongDate(Date.now())}\n`);
    return 1;
  };
  X.xcopy = (c) => {
    const [src, dst] = c.args.filter((a) => !a.startsWith('/'));
    if (!src) { c.outln('Invalid number of parameters'); return 4; }
    const s = c.resolve(src), d = dst ? c.resolve(dst) : c.cwd;
    const sn = c.vfs.get(s);
    if (!sn) { c.outln(`File not found - ${src}\n0 File(s) copied`); return 4; }
    let n = 0;
    const rec = flag(c.args, '/s') || flag(c.args, '/e');
    try {
      if (sn.t === 'f') { c.vfs.copy(s, d, { user: c.user }); c.outln(W.format(s)); n = 1; }
      else {
        const walk = (node, from, to) => { c.vfs.mkdir(to, { parents: true, user: c.user, owner: 'student' }); for (const k of Object.values(node.ch)) { if (k.t === 'f') { c.vfs.copy(from.concat(k.name), to.concat(k.name), { user: c.user }); c.outln(W.format(from.concat(k.name))); n++; } else if (rec && k.t === 'd') walk(k, from.concat(k.name), to.concat(k.name)); } };
        walk(sn, s, d);
      }
    } catch (e) { c.outln(ERR[e.code] || e.message); return 4; }
    c.outln(`${n} File(s) copied`);
    return 0;
  };
  X.attrib = (c) => {
    const ops = c.args.filter((a) => /^[+-][rhsa]$/i.test(a));
    const targets = c.args.filter((a) => !/^[+-][rhsa]$/i.test(a) && !a.startsWith('/'));
    const list = [];
    if (!targets.length) { const dir = c.vfs.get(c.cwd); Object.values(dir.ch).filter((n) => n.t === 'f').forEach((n) => list.push([c.cwd.concat(n.name), n])); }
    targets.forEach((t) => {
      if (TX.hasGlob(t)) { const base = c.cwd; c.vfs.glob(base, [t], true).forEach((segs) => list.push([segs, c.vfs.get(segs)])); return; }
      const segs = c.resolve(t); const n = c.vfs.get(segs); if (!n) { c.outln(`File not found - ${W.format(segs)}`); return; } list.push([segs, n]);
    });
    list.forEach(([segs, n]) => {
      if (ops.length) {
        ops.forEach((o) => { const on = o[0] === '+'; const k = o[1].toLowerCase(); if (k === 'h') n.hid = on; if (k === 's') n.sys = on; if (k === 'r') n.ro = on; if (k === 'a') n.arch = on; });
        c.vfs.changed();
      } else c.outln(`${n.arch !== false && n.t === 'f' ? 'A' : ' '}    ${n.sys ? 'S' : ' '}${n.hid ? 'H' : ' '}${n.ro ? 'R' : ' '}                  ${W.format(segs)}`);
    });
    return 0;
  };
  X.fc = (c) => {
    const [a, b] = c.args.filter((x) => !x.startsWith('/'));
    if (!a || !b) { c.outln('FC: Insufficient number of file specifications'); return 2; }
    let ta, tb;
    try { ta = c.vfs.readFile(c.resolve(a)); } catch (e) { c.outln(`FC: cannot open ${a.toUpperCase()} - No such file or folder`); return 2; }
    try { tb = c.vfs.readFile(c.resolve(b)); } catch (e) { c.outln(`FC: cannot open ${b.toUpperCase()} - No such file or folder`); return 2; }
    const A = W.format(c.resolve(a)).toUpperCase(), B = W.format(c.resolve(b)).toUpperCase();
    c.outln(`Comparing files ${A} and ${B}`);
    if (flag(c.args, '/i') ? ta.toLowerCase() === tb.toLowerCase() : ta === tb) { c.outln('FC: no differences encountered\n'); return 0; }
    const d = TX.diffLines(TX.splitLines(ta), TX.splitLines(tb));
    let i = 0;
    while (i < d.length) {
      if (d[i].op === ' ') { i++; continue; }
      const dels = [], adds = [];
      const ctxBefore = i > 0 ? d[i - 1].line : null;
      while (i < d.length && d[i].op !== ' ') { (d[i].op === '-' ? dels : adds).push(d[i].line); i++; }
      const after = i < d.length ? d[i].line : null;
      c.outln(`***** ${A}` + (ctxBefore !== null ? '\n' + ctxBefore : '') + (dels.length ? '\n' + dels.join('\n') : '') + (after !== null ? '\n' + after : ''));
      c.outln(`***** ${B}` + (ctxBefore !== null ? '\n' + ctxBefore : '') + (adds.length ? '\n' + adds.join('\n') : '') + (after !== null ? '\n' + after : ''));
      c.outln('*****\n');
    }
    return 1;
  };
  X.findstr = (c) => {
    const opts = c.args.filter((a) => /^\/[a-z]+$/i.test(a) || /^\/c:/i.test(a)).map((a) => a.toLowerCase());
    const pos = c.args.filter((a) => !(/^\/[a-z]+$/i.test(a) || /^\/c:/i.test(a)));
    const lit = c.args.find((a) => /^\/c:/i.test(a));
    const pattern = lit ? lit.slice(3) : pos.shift();
    if (pattern === undefined) { c.outln('FINDSTR: Bad command line'); return 2; }
    const ci = opts.includes('/i'), num = opts.includes('/n'), inv = opts.includes('/v'), rec = opts.includes('/s'), onlyNames = opts.includes('/m');
    const terms = lit ? [pattern] : pattern.split(' ');
    const re = opts.includes('/r') ? terms.map((t) => new RegExp(t, ci ? 'i' : '')) : terms.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ci ? 'i' : ''));
    const test = (l) => re.some((r) => r.test(l)) !== inv;
    let found = false;
    if (!pos.length) { TX.splitLines(c.stdin || '').forEach((l, i) => { if (test(l)) { found = true; c.outln((num ? i + 1 + ':' : '') + l); } }); return found ? 0 : 1; }
    const files = [];
    pos.forEach((p) => {
      if (rec || TX.hasGlob(p)) { const rx = TX.globToRegex(p.split('\\').pop(), true); c.vfs.walk(c.cwd, (n, s) => { if (n.t === 'f' && rx.test(n.name) && !n.sz) files.push([s.slice(c.cwd.length).join('\\'), s]); if (!rec && s.length > c.cwd.length) return n.t === 'd' ? false : undefined; return undefined; }); }
      else files.push([p, c.resolve(p)]);
    });
    const multi = files.length > 1 || rec;
    files.forEach(([name, segs]) => {
      let t; try { t = c.vfs.readFile(segs); } catch (e) { c.err(`FINDSTR: Cannot open ${name}\n`); return; }
      let hit = false;
      TX.splitLines(t).forEach((l, i) => { if (test(l)) { found = true; hit = true; if (!onlyNames) c.outln((multi ? name + ':' : '') + (num ? i + 1 + ':' : '') + l); } });
      if (onlyNames && hit) c.outln(name);
    });
    return found ? 0 : 1;
  };
  X.find = (c) => {
    const opts = c.args.filter((a) => /^\/[a-z]$/i.test(a)).map((a) => a.toLowerCase());
    const pos = c.args.filter((a) => !/^\/[a-z]$/i.test(a));
    const q = pos.shift();
    if (q === undefined) { c.err('FIND: Parameter format not correct\n'); return 2; }
    const ci = opts.includes('/i'), inv = opts.includes('/v'), count = opts.includes('/c'), num = opts.includes('/n');
    const test = (l) => (ci ? l.toLowerCase().includes(q.toLowerCase()) : l.includes(q)) !== inv;
    let any = false;
    const run = (name, text) => {
      const L = TX.splitLines(text);
      const hits = L.map((l, i) => [l, i]).filter(([l]) => test(l));
      if (hits.length) any = true;
      if (name) c.out(`\n---------- ${name.toUpperCase()}`);
      if (count) c.outln((name ? ': ' : '') + hits.length);
      else { if (name) c.outln(''); hits.forEach(([l, i]) => c.outln((num ? `[${i + 1}]` : '') + l)); }
    };
    if (!pos.length) run(null, c.stdin || '');
    pos.forEach((p) => { try { run(p, c.vfs.readFile(c.resolve(p))); } catch (e) { c.err(`File not found - ${p.toUpperCase()}\n`); } });
    return any ? 0 : 1;
  };
  X.sort = (c) => {
    const rev = flag(c.args, '/r');
    const files = c.args.filter((a) => !a.startsWith('/'));
    let text = c.stdin || '';
    if (files.length) try { text = c.vfs.readFile(c.resolve(files[0])); } catch (e) { c.err('The system cannot find the file specified.\n'); return 1; }
    const L = TX.splitLines(text).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    if (rev) L.reverse();
    if (L.length) c.out(L.join('\n') + '\n');
    return 0;
  };
  X.more = async (c) => {
    const files = c.args.filter((a) => !a.startsWith('/'));
    let text = c.stdin || '';
    if (files.length) try { text = c.vfs.readFile(c.resolve(files[0])); } catch (e) { c.err(`Cannot access file ${W.format(c.resolve(files[0]))}\n`); return 1; }
    if (!c.tty || !c.term) { c.out(text); return 0; }
    const L = text.split('\n');
    const page = c.term.rows - 1;
    if (L.length <= page) { c.out(text); return 0; }
    for (let i = 0; i < L.length; i += page) {
      c.out(L.slice(i, i + page).join('\n') + '\n');
      if (i + page < L.length) { c.out(`-- More (${Math.round(((i + page) / L.length) * 100)}%) -- `); const k = await c.term.readKey(); c.out('\r\x1b[2K'); if (k === 'q' || k === '\x03') break; }
    }
    return 0;
  };
  X.clip = async (c) => { TX.clip = c.stdin || ''; try { await navigator.clipboard.writeText(TX.clip); } catch (e) { /* ignore */ } return 0; };
  X.timeout = async (c) => {
    const t = parseInt(flagVal(c.args, '/t') || c.args.find((a) => /^\d+$/.test(a)) || '0', 10);
    if (isNaN(t)) { c.err('ERROR: Invalid value for timeout (/T) specified. Valid range is -1 to 99999.\n'); return 1; }
    try {
      for (let s = t; s > 0; s--) { c.out(`\rWaiting for ${String(s).padStart(2)} seconds, press a key to continue ...`); await c.sleep(1000); }
      c.out(`\rWaiting for  0 seconds, press a key to continue ...\n`);
    } catch (e) { if (e.interrupt) { c.out('\n'); return 1; } throw e; }
    return 0;
  };
  X.notepad = (c) => TX.apps.nano(c.term, c.vfs, c.args[0] ? c.resolve(c.args[0].replace(/^"|"$/g, '')) : null, { user: c.user, name: c.args[0], notepad: true });
  X.edit = (c) => TX.apps.nano(c.term, c.vfs, c.args[0] ? c.resolve(c.args[0]) : null, { user: c.user, name: c.args[0], notepad: true, edit: true });
  ['calc', 'mspaint', 'explorer', 'control', 'taskmgr', 'msinfo32', 'regedit', 'winver', 'devmgmt.msc', 'diskmgmt.msc', 'services.msc', 'ncpa.cpl', 'start', 'code', 'msedge', 'chrome'].forEach((n) => {
    X[n] = (c) => { const names = { calc: 'Calculator', mspaint: 'Paint', explorer: 'File Explorer', control: 'Control Panel', taskmgr: 'Task Manager', msinfo32: 'System Information', regedit: 'Registry Editor', winver: 'About Windows', 'devmgmt.msc': 'Device Manager', 'diskmgmt.msc': 'Disk Management', 'services.msc': 'Services', 'ncpa.cpl': 'Network Connections', start: c.args[0] || 'a new window', code: 'Visual Studio Code', msedge: 'Microsoft Edge', chrome: 'Google Chrome' }; if (/^https?:/.test(c.args[0] || '')) { try { window.open(c.args[0], '_blank', 'noopener'); } catch (e) { /* ignore */ } } else if (TX.app) TX.app.toast(`(pretend) Opened ${names[n]}`); return 0; };
  });
  X.diskpart = async (c) => {
    if (!c.isAdmin) { c.outln(C.dim('(A User Account Control prompt would appear here. TerminalEX says: Yes.)')); }
    c.outln(`\nMicrosoft DiskPart version 10.0.22621.1\n\nCopyright (C) Microsoft Corporation.\nOn computer: ${c.m.net.hostname}\n`);
    let selDisk = null, selVol = null, selPart = null;
    const vols = () => { const v = []; c.m.disks.forEach((d) => d.parts.forEach((p) => { if (p.fs || p.letter) v.push({ d, p }); })); return v; };
    while (true) {
      const line = await c.readLine('DISKPART> ');
      const a = line.trim().toLowerCase().split(/\s+/);
      c.outln('');
      if (!a[0]) continue;
      if (a[0] === 'exit') { c.outln('Leaving DiskPart...'); return 0; }
      if (a[0] === 'help' || a[0] === '?') { c.outln('Microsoft DiskPart version 10.0.22621.1\n\nCLEAN       - Clear the configuration information, or all information, off the\n              disk.\nCREATE      - Create a volume, partition or virtual disk.\nDETAIL      - Provide details about an object.\nEXIT        - Exit DiskPart.\nFORMAT      - Format the volume or partition.\nLIST        - Display a list of objects.\nSELECT      - Shift the focus to an object.\n'); continue; }
      if (a[0] === 'list' && a[1] === 'disk') {
        c.outln('  Disk ###  Status         Size     Free     Dyn  Gpt\n  --------  -------------  -------  -------  ---  ---');
        c.m.disks.forEach((d) => c.outln(`${selDisk === d ? '*' : ' '} Disk ${d.num}    Online       ${(Math.round(d.size / 1073741824) + ' GB').padStart(8)}  ${(d.parts.length ? (d.style === 'GPT' ? '1024 KB' : '   0 B') : Math.round(d.size / 1073741824) + ' GB').padStart(7)}        ${d.style === 'GPT' ? '*' : ' '}`));
        c.outln(''); continue;
      }
      if (a[0] === 'list' && (a[1] === 'volume' || a[1] === 'vol')) {
        c.outln('  Volume ###  Ltr  Label        Fs     Type        Size     Status     Info\n  ----------  ---  -----------  -----  ----------  -------  ---------  --------');
        vols().forEach(({ d, p }, i) => c.outln(`${selVol === p ? '*' : ' '} Volume ${String(i).padEnd(3)}  ${(p.letter || ' ').padEnd(3)}  ${(p.label || '').padEnd(11).slice(0, 11)}  ${(p.fs || 'RAW').padEnd(5)}  ${(p.removable ? 'Removable' : 'Partition').padEnd(10)}  ${(p.size >= 1073741824 ? Math.round(p.size / 1073741824) + ' GB' : Math.round(p.size / 1048576) + ' MB').padStart(7)}  Healthy    ${p.info || ''}`));
        c.outln(''); continue;
      }
      if (a[0] === 'select' && a[1] === 'disk') { const d = c.m.disks.find((x) => x.num === +a[2]); if (!d) { c.outln('The disk you specified is not valid.\n\nThere is no disk selected.\n'); continue; } selDisk = d; c.outln(`Disk ${d.num} is now the selected disk.\n`); continue; }
      if (a[0] === 'select' && (a[1] === 'volume' || a[1] === 'vol')) { const v = vols()[+a[2]]; if (!v) { c.outln('The volume you selected is not valid or does not exist.\n'); continue; } selVol = v.p; selDisk = v.d; c.outln(`Volume ${a[2]} is the selected volume.\n`); continue; }
      if (a[0] === 'select' && a[1] === 'partition') { if (!selDisk) { c.outln('There is no disk selected.\n'); continue; } selPart = selDisk.parts[+a[2] - 1]; c.outln(selPart ? `Partition ${a[2]} is now the selected partition.\n` : 'The specified partition is not valid.\n'); continue; }
      if (a[0] === 'list' && a[1] === 'partition') { if (!selDisk) { c.outln('There is no disk selected to list partitions.\nPlease select a disk and try again.\n'); continue; } c.outln('  Partition ###  Type              Size     Offset\n  -------------  ----------------  -------  -------'); selDisk.parts.forEach((p, i) => c.outln(`${selPart === p ? '*' : ' '} Partition ${i + 1}    ${p.type.padEnd(16)}  ${(p.size >= 1073741824 ? Math.round(p.size / 1073741824) + ' GB' : Math.round(p.size / 1048576) + ' MB').padStart(7)}  ${i ? Math.round(i * 117) + ' MB' : '1024 KB'}`)); c.outln(''); continue; }
      if (a[0] === 'detail' && a[1] === 'disk') { if (!selDisk) { c.outln('There is no disk selected.\n'); continue; } const d = selDisk; c.outln(`${d.model}\nDisk ID: {${TX.sha1(d.model).slice(0, 8).toUpperCase()}-${TX.sha1(d.model).slice(8, 12).toUpperCase()}}\nType   : ${d.bus}\nStatus : Online\nPath   : 0\nTarget : 0\nLUN ID : 0\nLocation Path : PCIROOT(0)#PCI(0200)#NVME(P00T00L00)\nCurrent Read-only State : No\nRead-only  : No\nBoot Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nPagefile Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nHibernation File Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nCrashdump Disk  : ${d.num === 0 ? 'Yes' : 'No'}\nClustered Disk  : No\n`); continue; }
      if (a[0] === 'clean' || a[0] === 'format' || (a[0] === 'create' && a[1] === 'partition') || a[0] === 'delete' || a[0] === 'assign') {
        if (!selDisk) { c.outln('There is no disk selected.\nPlease select a disk and try again.\n'); continue; }
        if (selDisk.num !== 2) { c.outln(C.red(`DiskPart has refused to modify Disk ${selDisk.num}.`) + '\n' + C.dim('(TerminalEX protects the system and data disks. On a real PC, "clean" would erase EVERYTHING on this disk! Only the USB drive (Disk 2) can be changed here.)') + '\n'); continue; }
        if (a[0] === 'clean') { selDisk.parts = []; c.outln('DiskPart succeeded in cleaning the disk.\n'); const e = c.vfs.root.ch['E:']; if (e) e.ch = {}; c.vfs.changed(); continue; }
        if (a[0] === 'create') { selDisk.parts = [{ num: 1, type: 'Primary', size: selDisk.size - 1048576, fs: '', label: '', letter: '', used: 0, removable: true }]; selPart = selDisk.parts[0]; c.outln('DiskPart succeeded in creating the specified partition.\n'); continue; }
        if (a[0] === 'format') { const p = selPart || selDisk.parts[0]; if (!p) { c.outln('There is no volume selected.\n'); continue; } const fs = ((/fs=(\w+)/.exec(line.toLowerCase()) || [])[1] || 'ntfs').toUpperCase(); const label = (/label="?([^"\s]+)"?/i.exec(line) || [])[1] || ''; for (let pct = 0; pct <= 100; pct += 10) { c.out(`\r  ${pct} percent completed`); await c.sleep(60); } p.fs = fs; p.label = label.toUpperCase(); p.used = 0; c.outln('\n\nDiskPart successfully formatted the volume.\n'); const e = c.vfs.root.ch['E:']; if (e) { e.ch = {}; c.vfs.changed(); } continue; }
        if (a[0] === 'assign') { const p = selPart || selDisk.parts[0]; if (!p) { c.outln('There is no volume selected.\n'); continue; } p.letter = ((/letter=(\w)/.exec(line.toLowerCase()) || [])[1] || 'e').toUpperCase(); if (!c.vfs.root.ch[p.letter + ':']) c.vfs.root.ch[p.letter + ':'] = TX.VFS.dir(p.letter + ':', { uid: 'student' }); c.outln('DiskPart successfully assigned the drive letter or mount point.\n'); continue; }
        if (a[0] === 'delete') { selDisk.parts = selDisk.parts.filter((p) => p !== selPart); selPart = null; c.outln('DiskPart successfully deleted the selected partition.\n'); continue; }
      }
      c.outln('Microsoft DiskPart version 10.0.22621.1\n\nThe arguments specified for this command are not valid.\nFor more information on the command, type: HELP\n');
    }
  };
  X.ver = (c) => { c.outln('\nMicrosoft Windows [Version 10.0.22631.4169]'); return 0; };

  // ================================================================ cmd.exe
  class CmdShell {
    constructor(session, machine, opts = {}) {
      this.session = session; this.term = session.term; this.m = machine; this.vfs = machine.vfs;
      this.kind = 'cmd'; this.name = 'cmd';
      this.home = machine.home.slice();
      this.cwd = opts.cwd ? opts.cwd.slice() : this.home.slice();
      this.driveCwd = { [this.cwd[0]]: this.cwd.slice() };
      this.history = session.historyFor('cmd');
      this.lastCode = 0;
      this.echo = true;
      this.dirStack = [];
      this.isAdmin = !!opts.admin;
      this.noBanner = !!opts.noBanner;
      this.vars = {
        ALLUSERSPROFILE: 'C:\\ProgramData', APPDATA: 'C:\\Users\\student\\AppData\\Roaming', CommonProgramFiles: 'C:\\Program Files\\Common Files', COMPUTERNAME: machine.net.hostname, ComSpec: 'C:\\Windows\\system32\\cmd.exe', HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\student', LOCALAPPDATA: 'C:\\Users\\student\\AppData\\Local', LOGONSERVER: '\\\\' + machine.net.hostname, NUMBER_OF_PROCESSORS: String(machine.hw.threads), OS: 'Windows_NT',
        Path: 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\;C:\\Windows\\System32\\OpenSSH\\;C:\\Program Files\\Git\\cmd;C:\\Program Files\\PowerShell\\7\\;C:\\Users\\student\\AppData\\Local\\Microsoft\\WindowsApps;',
        PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC', PROCESSOR_ARCHITECTURE: 'AMD64', PROCESSOR_IDENTIFIER: 'AMD64 Family 25 Model 116 Stepping 1, AuthenticAMD', ProgramData: 'C:\\ProgramData', ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)', PROMPT: '$P$G', PUBLIC: 'C:\\Users\\Public', SystemDrive: 'C:', SystemRoot: 'C:\\Windows', TEMP: 'C:\\Users\\student\\AppData\\Local\\Temp', TMP: 'C:\\Users\\student\\AppData\\Local\\Temp', USERDOMAIN: machine.net.hostname, USERNAME: 'student', USERPROFILE: 'C:\\Users\\student', windir: 'C:\\Windows',
      };
    }
    getVar(name) {
      const k = Object.keys(this.vars).find((x) => x.toLowerCase() === name.toLowerCase());
      if (k) return this.vars[k];
      switch (name.toUpperCase()) {
        case 'CD': return W.format(this.cwd);
        case 'DATE': { const d = new Date(); return TX.DAY[d.getDay()] + ' ' + TX.winDate(Date.now()); }
        case 'TIME': { const d = new Date(); return String(d.getHours()).padStart(2) + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds()) + '.' + TX.p2(Math.floor(d.getMilliseconds() / 10)); }
        case 'RANDOM': return String(Math.floor(Math.random() * 32768));
        case 'ERRORLEVEL': return String(this.lastCode);
        case 'CMDCMDLINE': return '"C:\\Windows\\system32\\cmd.exe"';
      }
      return undefined;
    }
    setVar(name, val) {
      const k = Object.keys(this.vars).find((x) => x.toLowerCase() === name.toLowerCase()) || name;
      if (val === '' || val === undefined) delete this.vars[k]; else this.vars[k] = val;
    }
    get env() { return this.vars; }
    resolve(p) { return this.vfs.canon(W.parse(String(p).replace(/^"|"$/g, ''), this.cwd, this.home)); }
    fmt(segs) { return W.format(segs); }
    title() { return (this.isAdmin ? 'Administrator: ' : '') + 'Command Prompt'; }
    prompt() {
      const blank = this.needBlank ? '\n' : '';
      this.needBlank = false;
      return blank + this.promptText();
    }
    promptText() {
      const p = this.vars.PROMPT || '$P$G';
      const d = new Date();
      return p.replace(/\$(.)/g, (_, k) => ({ P: W.format(this.cwd), p: W.format(this.cwd), G: '>', g: '>', L: '<', l: '<', B: '|', b: '|', Q: '=', q: '=', $: '$', _: '\n', N: this.cwd[0][0], n: this.cwd[0][0], D: TX.DAY[d.getDay()] + ' ' + TX.winDate(Date.now()), d: TX.DAY[d.getDay()] + ' ' + TX.winDate(Date.now()), T: this.getVar('TIME'), t: this.getVar('TIME'), S: ' ', s: ' ', V: 'Microsoft Windows [Version 10.0.22631.4169]', v: 'Microsoft Windows [Version 10.0.22631.4169]', E: '\x1b', e: '\x1b', H: '\b', h: '\b', A: '&', a: '&', C: '(', c: '(', F: ')', f: ')', '+': '+'.repeat(this.dirStack.length) }[k] ?? ''));
    }
    banner() { return this.noBanner ? '' : 'Microsoft Windows [Version 10.0.22631.4169]\n(c) Microsoft Corporation. All rights reserved.\n\n'; }
    highlight(line) {
      const m = /^(\s*)(@?)([^\s&|<>]+)(.*)$/s.exec(line);
      if (!m) return line;
      const ok = this.isCommand(m[3]);
      return m[1] + m[2] + (ok ? C.brightYellow(m[3]) : m[3]) + m[4].replace(/"[^"]*"?/g, (x) => C.cyan(x)).replace(/(\s)(\/[A-Za-z?:]+)/g, (_, s, f) => s + C.gray(f));
    }
    isCommand(name) {
      const n = name.toLowerCase().replace(/\.(exe|com)$/, '');
      return !!INTERNAL[n] || !!X[n] || ['git', 'powershell', 'pwsh', 'cmd', 'wsl', 'bash', 'curl', 'tar', 'ssh', 'python', 'python3', 'node'].includes(n) || /^[a-z]:$/.test(n) || /^cd[.\\]/.test(n);
    }
    completer(buf, pos) {
      const left = buf.slice(0, pos);
      let start, word;
      const q = left.lastIndexOf('"');
      const qc = (left.match(/"/g) || []).length;
      if (qc % 2 === 1) { start = q; word = left.slice(q + 1); }
      else { const m = /(\S*)$/.exec(left); start = pos - m[1].length; word = m[1]; }
      const sep = Math.max(word.lastIndexOf('\\'), word.lastIndexOf('/'));
      const dirPart = sep >= 0 ? word.slice(0, sep + 1) : '';
      const base = sep >= 0 ? word.slice(sep + 1) : word;
      const dirSegs = dirPart ? this.resolve(dirPart) : this.cwd;
      const node = this.vfs.get(dirSegs);
      if (!node || node.t !== 'd') return null;
      const before = left.slice(0, start).trim().toLowerCase();
      const dirsOnly = /^(cd|chdir|rd|rmdir|pushd)$/.test(before);
      const cands = Object.keys(node.ch).filter((n) => n.toLowerCase().startsWith(base.toLowerCase()) && (!dirsOnly || node.ch[n].t === 'd')).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((n) => { const full = dirPart + n; return /\s/.test(full) ? '"' + full + '"' : full; });
      return { start, cands, mode: 'cycle' };
    }

    // ---------------------------------------------------------- parsing
    expandVars(line, extra) {
      return line.replace(/%(~?[0-9*])|%([^%\s][^%]*?)(?::~(-?\d+)(?:,(-?\d+))?|:([^=%]+)=([^%]*))?%/g, (all, pos, name, s, len, from, to) => {
        if (pos !== undefined) { if (!extra) return all; if (pos === '*') return (extra.args || []).join(' '); const i = parseInt(pos.replace('~', ''), 10); const v = i === 0 ? extra.arg0 : (extra.args || [])[i - 1]; return v === undefined ? '' : (pos.startsWith('~') ? v.replace(/^"|"$/g, '') : v); }
        let v = this.getVar(name);
        if (v === undefined) return extra && extra.batch ? '' : all;
        if (s !== undefined) { let st = parseInt(s, 10); if (st < 0) st = Math.max(0, v.length + st); let l = len === undefined ? undefined : parseInt(len, 10); v = l === undefined ? v.slice(st) : l < 0 ? v.slice(st, v.length + l) : v.substr(st, l); }
        if (from !== undefined) v = v.split(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(to);
        return v;
      });
    }
    splitTop(line) {
      // split on & && || at top level, honoring quotes, ^ escapes and parentheses
      const out = [];
      let cur = '', q = false, depth = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '^' && !q) { cur += ch + (line[i + 1] || ''); i++; continue; }
        if (ch === '"') { q = !q; cur += ch; continue; }
        if (!q) {
          if (ch === '(') depth++;
          if (ch === ')') depth = Math.max(0, depth - 1);
          if (depth === 0 && (ch === '&' || (ch === '|' && line[i + 1] === '|'))) {
            if (/^\s*(if|for)\b/i.test(cur)) { cur += ch; continue; }
            const two = line.slice(i, i + 2);
            const op = two === '&&' ? '&&' : two === '||' ? '||' : '&';
            out.push({ text: cur, op });
            cur = '';
            i += op.length - 1;
            continue;
          }
        }
        cur += ch;
      }
      out.push({ text: cur, op: null });
      return out.filter((x) => x.text.trim() || x.op);
    }
    splitPipe(text) {
      if (/^\s*(if|for)\b/i.test(text)) return [text];
      const out = []; let cur = '', q = false, depth = 0;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '^' && !q) { cur += ch + (text[i + 1] || ''); i++; continue; }
        if (ch === '"') q = !q;
        if (!q && ch === '(') depth++;
        if (!q && ch === ')') depth--;
        if (!q && depth === 0 && ch === '|') { out.push(cur); cur = ''; continue; }
        cur += ch;
      }
      out.push(cur);
      return out;
    }
    extractRedirs(text) {
      const redirs = [];
      let out = '', q = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '^' && !q) { out += ch + (text[i + 1] || ''); i++; continue; }
        if (ch === '"') { q = !q; out += ch; continue; }
        if (!q && (ch === '>' || ch === '<')) {
          let fd = ch === '<' ? '0' : '1';
          if (/[12]$/.test(out) && /(^|\s)[12]$/.test(out)) { fd = out[out.length - 1]; out = out.slice(0, -1); }
          let op = ch;
          if (text[i + 1] === '>' && ch === '>') { op = '>>'; i++; }
          if (text[i + 1] === '&') { const t = text[i + 2]; i += 2; redirs.push({ op: 'dup', fd, to: t }); continue; }
          let j = i + 1;
          while (text[j] === ' ') j++;
          let target = '';
          if (text[j] === '"') { const k = text.indexOf('"', j + 1); target = text.slice(j + 1, k < 0 ? undefined : k); j = k < 0 ? text.length : k + 1; }
          else { while (j < text.length && !/[\s<>|&]/.test(text[j])) target += text[j++]; }
          redirs.push({ op, fd, target });
          i = j - 1;
          continue;
        }
        out += ch;
      }
      return { text: out, redirs };
    }
    tokenize(s) {
      const out = [];
      let i = 0;
      while (i < s.length) {
        while (i < s.length && /\s/.test(s[i])) i++;
        if (i >= s.length) break;
        let tok = '', q = false, quoted = false;
        while (i < s.length && (q || !/\s/.test(s[i]))) {
          const ch = s[i];
          if (ch === '^' && !q && i + 1 < s.length) { tok += s[i + 1]; i += 2; continue; }
          if (ch === '"') { q = !q; quoted = true; i++; continue; }
          tok += ch; i++;
        }
        if (!quoted) {
          // split attached switches: dir/w/s  -> dir /w /s
          const parts = tok.split(/(?=\/)/).filter(Boolean);
          if (parts.length > 1 && !/^[a-z]:/i.test(tok) && !/^https?:/i.test(tok) && !tok.includes('\\')) { parts.forEach((p) => out.push({ v: p, q: false })); continue; }
        }
        out.push({ v: tok, q: quoted });
      }
      return out;
    }

    // ---------------------------------------------------------- execution
    ttyIO() { return { tty: true, stdin: null, out: (s) => this.term.write(s), err: (s) => this.term.write(s) }; }
    async exec(line, io, batch) {
      if (!io && !batch && line.trim()) this.needBlank = true;
      io = io || this.ttyIO();
      line = this.expandVars(line, batch);
      const trimmed = line.trim();
      if (!trimmed) return this.lastCode;
      if (/^@?\s*(rem\b|::)/i.test(trimmed)) return this.lastCode;
      const parts = this.splitTop(line);
      let code = this.lastCode;
      let skip = false;
      for (let i = 0; i < parts.length; i++) {
        const { text } = parts[i];
        const prevOp = i > 0 ? parts[i - 1].op : null;
        if (prevOp === '&&' && code !== 0) skip = true;
        else if (prevOp === '||' && code === 0) skip = true;
        else if (prevOp === '&' || prevOp === null) skip = false;
        if (skip) continue;
        code = await this.execPipeline(text, io, batch);
        this.lastCode = code;
      }
      return code;
    }
    async execPipeline(text, io, batch) {
      const cmds = this.splitPipe(text);
      let input = io.stdin;
      let code = 0;
      for (let k = 0; k < cmds.length; k++) {
        const last = k === cmds.length - 1;
        let buf = '';
        const sub = last ? Object.assign({}, io, { stdin: input }) : { tty: false, stdin: input, out: (s) => { buf += s; }, err: io.err };
        code = await this.execSimple(cmds[k], sub, batch);
        input = buf;
      }
      return code;
    }
    async execSimple(text, io, batch) {
      const { text: body, redirs } = /^\s*(if|for)\b/i.test(text) ? { text, redirs: [] } : this.extractRedirs(text);
      let out = null, err = null;
      const nio = Object.assign({}, io);
      const finishers = [];
      for (const r of redirs) {
        if (r.op === 'dup') { if (r.fd === '2' && r.to === '1') nio.err = (s) => nio.out(s); continue; }
        if (r.op === '<') { try { nio.stdin = this.vfs.readFile(this.resolve(r.target)); } catch (e) { io.err('The system cannot find the file specified.\n'); return 1; } continue; }
        if (/^nul$/i.test(r.target)) { if (r.fd === '2') nio.err = () => {}; else { nio.out = () => {}; nio.tty = false; } continue; }
        const segs = this.resolve(r.target);
        try { if (r.op === '>' || !this.vfs.get(segs)) this.vfs.writeFile(segs, '', { user: this.isAdmin ? '__admin' : 'student', owner: 'student' }); }
        catch (e) { io.err(e.code === 'ENOENT' ? 'The system cannot find the path specified.\n' : 'Access is denied.\n'); return 1; }
        let buf = '';
        if (r.fd === '2') { nio.err = (s) => { buf += s; }; err = true; } else { nio.out = (s) => { buf += s; }; nio.tty = false; out = true; }
        finishers.push(() => this.vfs.writeFile(segs, buf.replace(/\x1b\[[0-9;]*m/g, ''), { append: true, owner: 'student' }));
      }
      void out; void err;
      const code = await this.runCommand(body.trim(), nio, batch);
      finishers.forEach((f) => f());
      return code;
    }
    async runCommand(text, io, batch) {
      if (!text) return 0;
      let t = text.replace(/^@/, '');
      if (/^\(.*\)$/s.test(t.trim())) { // grouped block
        let code = 0;
        for (const part of t.trim().slice(1, -1).split(/\n/)) code = await this.exec(part, io, batch);
        return code;
      }
      // cd.. / cd\ / echo. forms
      let m = /^(cd|chdir|md|mkdir|rd|rmdir|dir|echo|type)([.\\/:;,(].*)?$/i.exec(t.split(/\s/)[0]);
      let name, restRaw;
      if (m && m[2] && !/^\//.test(m[2])) { name = m[1]; restRaw = m[2] + t.slice(t.split(/\s/)[0].length); if (/^echo$/i.test(name)) restRaw = m[2].slice(1) + t.slice(t.split(/\s/)[0].length); }
      else { const sp = /^(\S+)(\s?)(.*)$/s.exec(t); name = sp[1]; restRaw = sp[3]; if (/\//.test(name) && !/^[a-z]:/i.test(name) && !/[\\]/.test(name)) { const k = name.indexOf('/'); if (k > 0) { restRaw = name.slice(k) + ' ' + restRaw; name = name.slice(0, k); } } }
      const lname = name.toLowerCase();
      const tokens = this.tokenize(restRaw);
      const args = tokens.map((x) => x.v);
      const ctx = this.makeCtx(name, args, restRaw, io, batch);
      if (/^[a-z]:$/i.test(name)) {
        const drive = name.toUpperCase();
        if (!this.vfs.root.ch[drive] && !this.vfs.child(this.vfs.root, drive)) { io.err('The system cannot find the drive specified.\n'); return 1; }
        this.driveCwd[this.cwd[0]] = this.cwd.slice();
        this.cwd = (this.driveCwd[drive] || [drive]).slice();
        return 0;
      }
      if (lname === '/?' || args[0] === '/?') { io.out(this.helpFor(lname) + '\n'); return 0; }
      const fn = this.internal(lname);
      try {
        if (fn) { const r = await fn.call(this, ctx); return typeof r === 'number' ? r : 0; }
        const ext = this.external(lname.replace(/\.(exe|com)$/, ''));
        if (ext) { const r = await ext(ctx); return typeof r === 'number' ? r : 0; }
        // batch file / script by path
        return await this.runExternal(name, args, restRaw, io, ctx);
      } catch (e) {
        if (e.interrupt) { io.out('^C\n'); return 1; }
        if (e.exitShell) throw e;
        if (e instanceof TX.FsError) { io.err(this.errText(e) + '\n'); return 1; }
        console.error(e);
        io.err(String(e.message || e) + '\n');
        return 1;
      }
    }
    internal(n) { return INTERNAL[n]; }
    external(n) { return X[n]; }
    helpFor(n) { return TX.docs.cmdHelp(n); }
    errText(e) { return ERR[e.code] || e.message; }
    async runExternal(name, args, restRaw, io, ctx) {
      const lname = name.toLowerCase().replace(/^"|"$/g, '');
      const bridges = { git: 1, curl: 1, tar: 1, ssh: 1 };
      if (bridges[lname.replace(/\.exe$/, '')]) return TX.winBridge(this, lname.replace(/\.exe$/, ''), args, io);
      if (lname === 'powershell' || lname === 'pwsh' || lname === 'powershell.exe' || lname === 'pwsh.exe') {
        const ci = args.findIndex((a) => /^-(c|command)$/i.test(a));
        if (ci >= 0) { const ps = new TX.PowerShell(this.session, this.m, { cwd: this.cwd, noBanner: true, pwsh: lname.startsWith('pwsh') }); await ps.exec(args.slice(ci + 1).join(' '), io); return ps.lastCode ? 1 : 0; }
        this.session.pushShell(new TX.PowerShell(this.session, this.m, { cwd: this.cwd, pwsh: lname.startsWith('pwsh') }));
        return 0;
      }
      if (lname === 'cmd' || lname === 'cmd.exe') {
        if (args[0] && /^\/[ck]$/i.test(args[0])) { const sub = new CmdShell(this.session, this.m, { cwd: this.cwd, noBanner: true }); await sub.exec(restRaw.replace(/^\s*\/[ck]\s*/i, ''), io); return sub.lastCode; }
        this.session.pushShell(new CmdShell(this.session, this.m, { cwd: this.cwd }));
        return 0;
      }
      if (lname === 'wsl' || lname === 'bash' || lname === 'wsl.exe' || lname === 'ubuntu') {
        const linux = TX.app.machine('linux');
        const sh = new TX.PosixShell(this.session, linux, 'bash', {});
        sh.wsl = true;
        if (args.length && lname !== 'ubuntu') { await sh.run(args.join(' '), io); return sh.lastCode; }
        this.session.pushShell(sh, true);
        return 0;
      }
      if (/^(python3?|py)(\.exe)?$/.test(lname)) return TX.langs ? TX.langs.python(ctx, args) : 9009;
      if (/^node(\.exe)?$/.test(lname)) return TX.langs ? TX.langs.node(ctx, args) : 9009;
      // file path: .bat / .cmd / .ps1 / .txt
      const segs = this.resolve(name);
      let node = this.vfs.get(segs);
      let real = segs;
      if (!node) { for (const ext of ['.bat', '.cmd', '.exe']) { const s2 = this.resolve(name + ext); if (this.vfs.get(s2)) { node = this.vfs.get(s2); real = s2; break; } } }
      if (node && node.t === 'f') {
        if (/\.(bat|cmd)$/i.test(node.name)) return this.runBatch(this.vfs.content(node), [W.format(real)].concat(args), io);
        if (/\.ps1$/i.test(node.name)) { const ps = new TX.PowerShell(this.session, this.m, { cwd: this.cwd, noBanner: true }); await ps.exec('& ' + JSON.stringify(W.format(real)), io); return 0; }
        if (/\.exe$/i.test(node.name)) { io.err(C.dim(`(TerminalEX) ${node.name} is a pretend program — it can't actually run here.\n`)); return 0; }
        if (TX.app) TX.app.toast(`(pretend) Opened ${node.name} in its default app`);
        return 0;
      }
      io.err(NOT_RECOGNIZED(name));
      return 9009;
    }
    async runBatch(text, argv, io) {
      const lines = text.replace(/\r/g, '').split('\n');
      const labels = {};
      lines.forEach((l, i) => { const m = /^\s*:(\w+)/.exec(l); if (m) labels[m[1].toLowerCase()] = i; });
      const savedEcho = this.echo;
      const extra = { batch: true, arg0: argv[0], args: argv.slice(1) };
      let code = 0;
      let guard = 0;
      for (let i = 0; i < lines.length; i++) {
        if (++guard > 20000) { io.err('Batch loop stopped (TerminalEX safety limit)\n'); break; }
        if (this.term.signal.aborted) { const ans = await this.term.readLine({ prompt: 'Terminate batch job (Y/N)? ' }); if (/^y/i.test(ans || 'y')) break; this.term.signal = new TX.Signal(); }
        let l = lines[i];
        // join block lines for multi-line ( ... )
        let depth = (l.match(/\(/g) || []).length - (l.match(/\)/g) || []).length;
        while (depth > 0 && i + 1 < lines.length) { i++; l += '\n' + lines[i]; depth += (lines[i].match(/\(/g) || []).length - (lines[i].match(/\)/g) || []).length; }
        const t = l.trim();
        if (!t || /^:/.test(t) || /^@?rem\b/i.test(t)) continue;
        const gm = /^@?goto\s+:?(\w+)/i.exec(t);
        if (gm) { if (gm[1].toLowerCase() === 'eof') break; const target = labels[gm[1].toLowerCase()]; if (target === undefined) { io.err('The system cannot find the batch label specified - ' + gm[1] + '\n'); break; } i = target; continue; }
        if (/^@?exit\s+\/b/i.test(t)) { code = parseInt(t.split(/\s+/)[2] || '0', 10); break; }
        if (this.echo && !t.startsWith('@')) io.out('\n' + this.promptText() + t + '\n');
        const expanded = t.replace(/%%/g, '%');
        code = await this.exec(expanded.includes('\n') ? expanded : expanded, io, Object.assign({}, extra, { lines: t }));
      }
      this.echo = savedEcho || this.echo;
      if (!this.echo) this.echo = true;
      return code;
    }
    makeCtx(name, args, raw, io, batch) {
      const sh = this;
      return {
        sh, name, args, raw, io, stdin: io.stdin, tty: io.tty, term: this.term, m: this.m, vfs: this.vfs, session: this.session, batch,
        cwd: this.cwd, home: this.home, user: this.isAdmin ? '__admin' : 'student', isAdmin: this.isAdmin,
        out: (s) => io.out(s), outln: (s = '') => io.out(s + '\n'), err: (s) => io.err(s),
        resolve: (p) => sh.resolve(p), fmt: (s) => W.format(s),
        sleep: (ms) => TX.sleep(ms, sh.term.signal),
        signal: this.term.signal,
        async readLine(prompt, o = {}) { const l = await sh.term.readLine(Object.assign({ prompt }, o)); if (l === null) throw new TX.Interrupt(); return l; },
      };
    }
    fileDate(ms) { return TX.winDate(ms) + '  ' + TX.winTime(ms); }
  }

  // ------------------------------------------------------------------ internal commands
  const INTERNAL = (TX.cmdInternal = {});
  const lower = (a) => a.map((x) => x.toLowerCase());
  INTERNAL.cls = function (c) { c.term.clear(); this.needBlank = false; };
  INTERNAL.echo = function (c) {
    const r = c.raw;
    if (/^\s*$/.test(r)) { c.outln(`ECHO is ${this.echo ? 'on' : 'off'}.`); return; }
    if (/^\s*off\s*$/i.test(r)) { this.echo = false; return; }
    if (/^\s*on\s*$/i.test(r)) { this.echo = true; return; }
    c.outln(r.replace(/\^(.)/g, '$1'));
  };
  INTERNAL['echo.'] = function (c) { c.outln(''); };
  INTERNAL.cd = INTERNAL.chdir = function (c) {
    let a = c.raw.trim();
    const d = /^\/d\s+/i.test(a);
    a = a.replace(/^\/d\s+/i, '').replace(/^"|"$/g, '');
    if (!a) { c.outln(W.format(this.cwd)); return 0; }
    const segs = this.resolve(a);
    const n = this.vfs.get(segs);
    if (!n) { c.err('The system cannot find the path specified.\n'); return 1; }
    if (n.t !== 'd') { c.err('The directory name is invalid.\n'); return 1; }
    if (segs[0].toUpperCase() !== this.cwd[0].toUpperCase() && !d) { this.driveCwd[segs[0]] = segs; return 0; }
    this.cwd = segs;
    this.driveCwd[segs[0]] = segs;
    return 0;
  };
  INTERNAL.dir = function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const paths = c.args.filter((a) => !a.startsWith('/'));
    const bare = sw.includes('/b'), wide = sw.includes('/w'), rec = sw.includes('/s'), showOwner = sw.includes('/q');
    const aSw = sw.find((s) => s.startsWith('/a'));
    const attrFilter = aSw ? aSw.replace(/^\/a:?/, '') : null;
    const oSw = sw.find((s) => s.startsWith('/o'));
    const order = oSw ? oSw.replace(/^\/o:?/, '') : '';
    const target = paths[0] || '.';
    let segs = this.resolve(target);
    let pattern = null;
    let node = this.vfs.get(segs);
    if (!node && TX.hasGlob(segs[segs.length - 1])) { pattern = TX.globToRegex(segs[segs.length - 1], true); segs = segs.slice(0, -1); node = this.vfs.get(segs); }
    const vol = volumeFor(this.m, segs[0]);
    if (!node) { if (!bare) c.outln(` Volume in drive ${segs[0][0]} is ${vol ? vol.label : ''}\n Volume Serial Number is 8C2A-1F3B\n\n Directory of ${W.format(segs.slice(0, -1))}\n`); c.outln('File Not Found'); return 1; }
    if (node.t !== 'd') { pattern = new RegExp('^' + node.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'); segs = segs.slice(0, -1); node = this.vfs.get(segs); }
    let totalFiles = 0, totalBytes = 0, totalDirs = 0;
    const listDir = (dnode, dsegs, top) => {
      let entries = Object.values(dnode.ch);
      if (pattern) entries = entries.filter((e) => pattern.test(e.name));
      if (attrFilter !== null) {
        if (attrFilter === '') { /* all */ } else {
          entries = entries.filter((e) => [...attrFilter.replace(/-./g, (x) => '!' + x[1])].every(() => true) && attrMatch(e, attrFilter));
        }
      } else entries = entries.filter((e) => !e.hid && !e.sys);
      const sorter = { n: (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }), s: (a, b) => this.vfs.size(a) - this.vfs.size(b), d: (a, b) => a.mt - b.mt, e: (a, b) => (a.name.split('.').pop()).localeCompare(b.name.split('.').pop()), g: (a, b) => (a.t === 'd' ? 0 : 1) - (b.t === 'd' ? 0 : 1) };
      if (order) { const rev = order.startsWith('-'); const k = order.replace('-', '')[0]; entries.sort(sorter[k] || sorter.n); if (rev) entries.reverse(); }
      else entries.sort(sorter.n);
      const isRoot = dsegs.length === 1;
      let files = 0, bytes = 0, dirs = 0;
      const lines = [];
      if (!isRoot && !pattern && (attrFilter === null || attrFilter === '' || attrFilter.includes('d'))) {
        lines.push([dnode, '.'], [this.vfs.get(dsegs.slice(0, -1)) || dnode, '..']);
      }
      entries.forEach((e) => lines.push([e, e.name]));
      if (bare) {
        entries.forEach((e) => c.outln(rec ? W.format(dsegs.concat(e.name)) : e.name));
      } else {
        if (!lines.length && !rec) { if (top) c.outln('File Not Found'); return; }
        if (!lines.length) return;
        c.outln(`\n Directory of ${W.format(dsegs)}\n`);
        if (wide) {
          c.outln(TX.columns(lines.map(([n, nm]) => (n.t === 'd' ? '[' + nm + ']' : nm)), 79, 1).replace(/ +$/gm, ''));
        } else {
          lines.forEach(([n, nm]) => c.outln(`${this.fileDate(n.mt)}    ${n.t === 'd' ? '<DIR>         ' : n.t === 'l' ? '<SYMLINK>     ' : fmtN(this.vfs.size(n)).padStart(14)}${showOwner ? ' ' + (n.uid === 'SYSTEM' ? 'NT AUTHORITY\\SYSTEM' : this.m.net.hostname + '\\student').padEnd(23) : ''} ${nm}${n.t === 'l' ? ' [' + n.target + ']' : ''}`));
        }
        lines.forEach(([n, nm]) => { if (n.t === 'd') dirs++; else { files++; bytes += this.vfs.size(n); } });
        if (wide) void 0;
        c.outln(`${String(files).padStart(16)} File(s) ${fmtN(bytes).padStart(14)} bytes`);
        if (!rec) c.outln(`${String(dirs).padStart(16)} Dir(s) ${fmtN(Math.round(vol ? vol.size - vol.used : 0)).padStart(15)} bytes free`);
      }
      totalFiles += files; totalBytes += bytes; totalDirs += dirs;
      if (rec) entries.filter((e) => e.t === 'd').forEach((e) => listDir(e, dsegs.concat(e.name), false));
    };
    const attrMatch = (e, f) => {
      let ok = true;
      for (let i = 0; i < f.length; i++) {
        let neg = false; let k = f[i];
        if (k === '-') { neg = true; k = f[++i]; }
        const has = k === 'd' ? e.t === 'd' : k === 'h' ? !!e.hid : k === 's' ? !!e.sys : k === 'r' ? !!e.ro : k === 'a' ? e.t === 'f' : k === 'l' ? e.t === 'l' : true;
        if (neg ? has : !has) ok = false;
      }
      return ok;
    };
    if (!bare) c.outln(` Volume in drive ${segs[0][0]} is ${vol ? vol.label : ''}\n Volume Serial Number is ${vol ? TX.sha1(vol.label).slice(0, 4).toUpperCase() + '-' + TX.sha1(vol.label).slice(4, 8).toUpperCase() : '0000-0000'}`);
    listDir(node, segs, true);
    if (rec && !bare) c.outln(`\n     Total Files Listed:\n${String(totalFiles).padStart(16)} File(s) ${fmtN(totalBytes).padStart(14)} bytes\n${String(totalDirs).padStart(16)} Dir(s) ${fmtN(Math.round(vol ? vol.size - vol.used : 0)).padStart(15)} bytes free`);
    return 0;
  };
  INTERNAL.type = function (c) {
    if (!c.args.length) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    let code = 0;
    const multi = c.args.length > 1;
    c.args.forEach((a) => {
      const segs = this.resolve(a);
      const n = this.vfs.get(segs);
      if (!n) { c.err('The system cannot find the file specified.\n'); code = 1; return; }
      if (n.t === 'd') { c.err('Access is denied.\n'); code = 1; return; }
      if (multi) c.err(`\n${a}\n\n\n`);
      if (n.sz) { c.out('\u00b0\u00d8\u00ff\u00e0 JFIF (binary data)...\n'); return; }
      c.out(this.vfs.content(n));
    });
    return code;
  };
  INTERNAL.md = INTERNAL.mkdir = function (c) {
    if (!c.args.length) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    let code = 0;
    c.args.forEach((a) => {
      const segs = this.resolve(a);
      if (this.vfs.get(segs)) { c.err(`A subdirectory or file ${a} already exists.\n`); code = 1; return; }
      try { this.vfs.mkdir(segs, { parents: true, user: c.user, owner: 'student' }); } catch (e) { c.err((e.code === 'EACCES' ? 'Access is denied.' : ERR[e.code] || e.message) + '\n'); code = 1; }
    });
    return code;
  };
  INTERNAL.rd = INTERNAL.rmdir = async function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const paths = c.args.filter((a) => !a.startsWith('/'));
    let code = 0;
    for (const a of paths) {
      const segs = this.resolve(a);
      const n = this.vfs.get(segs);
      if (!n) { c.err('The system cannot find the file specified.\n'); code = 2; continue; }
      if (n.t !== 'd') { c.err('The directory name is invalid.\n'); code = 267; continue; }
      if (this.vfs.isSubPath(segs, this.cwd)) { c.err('The process cannot access the file because it is being used by another process.\n'); code = 32; continue; }
      if (Object.keys(n.ch).length && !sw.includes('/s')) { c.err('The directory is not empty.\n'); code = 145; continue; }
      if (sw.includes('/s') && !sw.includes('/q')) { const ans = await c.readLine(`${a}, Are you sure (Y/N)? `); if (!/^y/i.test(ans)) continue; }
      try { this.vfs.remove(segs, { recursive: true, user: c.user }); } catch (e) { c.err('Access is denied.\n'); code = 5; }
    }
    return code;
  };
  INTERNAL.del = INTERNAL.erase = async function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const paths = c.args.filter((a) => !a.startsWith('/'));
    if (!paths.length) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    let code = 0;
    for (const a of paths) {
      let segs = this.resolve(a);
      let targets = [];
      const n = this.vfs.get(segs);
      if (n && n.t === 'd') {
        if (!sw.includes('/q')) { const ans = await c.readLine(`${W.format(segs)}\\*, Are you sure (Y/N)? `); if (!/^y/i.test(ans)) continue; }
        targets = Object.values(n.ch).filter((k) => k.t === 'f').map((k) => segs.concat(k.name));
      } else if (TX.hasGlob(segs[segs.length - 1])) {
        const pat = segs[segs.length - 1];
        const dir = segs.slice(0, -1);
        if ((pat === '*' || pat === '*.*') && !sw.includes('/q')) { const ans = await c.readLine(`${W.format(dir)}\\*, Are you sure (Y/N)? `); if (!/^y/i.test(ans)) continue; }
        const walk = (d) => { const dn = this.vfs.get(d); if (!dn) return; this.vfs.glob(d, [pat], true).forEach((s) => { if (this.vfs.get(s).t === 'f') targets.push(s); }); if (sw.includes('/s')) Object.values(dn.ch).filter((k) => k.t === 'd').forEach((k) => walk(d.concat(k.name))); };
        walk(dir);
        if (!targets.length) { c.err(`Could Not Find ${W.format(segs)}\n`); code = 1; continue; }
      } else if (!n) { c.err(`Could Not Find ${W.format(segs)}\n`); code = 1; continue; }
      else targets = [segs];
      for (const t of targets) {
        const tn = this.vfs.get(t);
        if (tn.ro && !sw.includes('/f')) { c.err(`${W.format(t)}\nAccess is denied.\n`); code = 1; continue; }
        if (sw.includes('/p')) { const ans = await c.readLine(`${W.format(t)}, Delete (Y/N)? `); if (!/^y/i.test(ans)) continue; }
        try { this.vfs.remove(t, { user: c.user, force: true }); if (sw.includes('/s')) c.outln(`Deleted file - ${W.format(t)}`); } catch (e) { c.err('Access is denied.\n'); code = 1; }
      }
    }
    return code;
  };
  INTERNAL.copy = async function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const paths = c.args.filter((a) => !a.startsWith('/'));
    if (!paths.length) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    if (/^con$/i.test(paths[0])) {
      const dst = this.resolve(paths[1]);
      const lines = [];
      while (true) { const l = await c.term.readLine({ prompt: '', onEOF: true }); if (l === null || l === '\x04' || /\x1a|\^Z$/.test(l)) { if (l && l !== '\x04') lines.push(l.replace(/\^Z$|\x1a/, '')); break; } lines.push(l); }
      this.vfs.writeFile(dst, lines.join('\n') + '\n', { user: c.user, owner: 'student' });
      c.outln('        1 file(s) copied.');
      return 0;
    }
    const src = paths[0], dst = paths[1] || '.';
    // concatenation a+b c
    if (src.includes('+')) {
      const parts = src.split('+');
      let text = '';
      for (const p of parts) { try { text += this.vfs.readFile(this.resolve(p)); } catch (e) { c.err('The system cannot find the file specified.\n'); return 1; } }
      this.vfs.writeFile(this.resolve(dst), text, { user: c.user, owner: 'student' });
      parts.forEach((p) => c.outln(p));
      c.outln('        1 file(s) copied.');
      return 0;
    }
    let ssegs = this.resolve(src);
    let sources = [];
    if (TX.hasGlob(ssegs[ssegs.length - 1])) sources = this.vfs.glob(ssegs.slice(0, -1), [ssegs[ssegs.length - 1]], true).filter((s) => this.vfs.get(s).t === 'f');
    else { const n = this.vfs.get(ssegs); if (!n) { c.err('The system cannot find the file specified.\n        0 file(s) copied.\n'); return 1; } if (n.t === 'd') sources = Object.values(n.ch).filter((k) => k.t === 'f').map((k) => ssegs.concat(k.name)); else sources = [ssegs]; }
    const dsegs = this.resolve(dst);
    const dn = this.vfs.get(dsegs);
    let n = 0;
    for (const s of sources) {
      const final = dn && dn.t === 'd' ? dsegs.concat(s[s.length - 1]) : dsegs;
      if (this.vfs.samePath(s, final)) { c.err('The file cannot be copied onto itself.\n        0 file(s) copied.\n'); return 1; }
      if (this.vfs.get(final) && !sw.includes('/y')) { const ans = await c.readLine(`Overwrite ${W.format(final)}? (Yes/No/All): `); if (/^n/i.test(ans)) continue; if (/^a/i.test(ans)) sw.push('/y'); }
      try { this.vfs.copy(s, dsegs, { user: c.user }); n++; if (sources.length > 1) c.outln(W.format(s).split('\\').pop()); } catch (e) { c.err((e.code === 'EACCES' ? 'Access is denied.' : ERR[e.code] || e.message) + '\n'); }
    }
    c.outln(`${String(n).padStart(9)} file(s) copied.`);
    return n ? 0 : 1;
  };
  INTERNAL.move = async function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const paths = c.args.filter((a) => !a.startsWith('/'));
    if (paths.length < 2) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    const s = this.resolve(paths[0]), d = this.resolve(paths[1]);
    const sn = this.vfs.get(s);
    if (!sn) { c.err('The system cannot find the file specified.\n'); return 1; }
    const dn = this.vfs.get(d);
    if (dn && dn.t === 'f' && !sw.includes('/y')) { const ans = await c.readLine(`Overwrite ${W.format(d)}? (Yes/No/All): `); if (/^n/i.test(ans)) { c.outln('        0 file(s) moved.'); return 0; } }
    try { this.vfs.move(s, d, { user: c.user }); } catch (e) { c.err((e.code === 'EACCES' ? 'Access is denied.' : ERR[e.code] || e.message) + '\n'); return 1; }
    c.outln(sn.t === 'd' ? '        1 dir(s) moved.' : '        1 file(s) moved.');
    return 0;
  };
  INTERNAL.ren = INTERNAL.rename = function (c) {
    if (c.args.length < 2) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    if (/[\\/]/.test(c.args[1])) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    const s = this.resolve(c.args[0]);
    const pat = s[s.length - 1];
    if (TX.hasGlob(pat)) {
      // ren *.txt *.bak
      const newPat = c.args[1];
      const hits = this.vfs.glob(s.slice(0, -1), [pat], true);
      hits.forEach((h) => { const nm = h[h.length - 1]; const base = nm.replace(/\.[^.]*$/, ''); const nn = newPat.replace(/\*/, base); this.vfs.move(h, h.slice(0, -1).concat(nn), { user: c.user }); });
      return 0;
    }
    if (!this.vfs.get(s)) { c.err('The system cannot find the file specified.\n'); return 1; }
    const d = s.slice(0, -1).concat(c.args[1]);
    if (this.vfs.get(d) && !this.vfs.samePath(s, d)) { c.err('A duplicate file name exists, or the file\ncannot be found.\n'); return 1; }
    try { this.vfs.move(s, d, { user: c.user }); } catch (e) { c.err('Access is denied.\n'); return 1; }
    return 0;
  };
  INTERNAL.set = async function (c) {
    const r = c.raw.trim();
    if (/^\/a\s*/i.test(r)) {
      const expr = r.replace(/^\/a\s*/i, '').replace(/^"|"$/g, '');
      let last = 0;
      try {
        for (const part of expr.split(',')) {
          const m = /^\s*([A-Za-z_]\w*)\s*([+\-*/%]?=)\s*(.+)$/.exec(part);
          const ev = (e) => TX.arith(e.replace(/\b([A-Za-z_]\w*)\b/g, (x) => String(parseInt(this.getVar(x) || '0', 10) || 0)), () => '0', () => {});
          if (m) { const cur = parseInt(this.getVar(m[1]) || '0', 10) || 0; const v = ev(m[3]); const res = m[2] === '=' ? v : m[2] === '+=' ? cur + v : m[2] === '-=' ? cur - v : m[2] === '*=' ? cur * v : m[2] === '/=' ? Math.trunc(cur / v) : cur % v; this.setVar(m[1], String(res)); last = res; }
          else last = ev(part);
        }
      } catch (e) { c.err((/division/.test(e.message) ? 'Divide by zero error.' : 'Missing operand.') + '\n'); return 1; }
      if (!c.batch && c.tty) c.outln(String(last));
      return 0;
    }
    if (/^\/p\s*/i.test(r)) {
      const m = /^\/p\s*"?([^=]+)=(.*?)"?$/i.exec(r);
      if (!m) { c.err('The syntax of the command is incorrect.\n'); return 1; }
      const v = c.stdin != null ? (c.stdin.split('\n')[0] || '') : await c.readLine(m[2]);
      this.setVar(m[1].trim(), v);
      return 0;
    }
    if (!r || !r.includes('=')) {
      const keys = Object.keys(this.vars).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).filter((k) => !r || k.toLowerCase().startsWith(r.toLowerCase()));
      if (!keys.length) { c.err(`Environment variable ${r} not defined\n`); return 1; }
      keys.forEach((k) => c.outln(`${k}=${this.vars[k]}`));
      return 0;
    }
    const eq = r.indexOf('=');
    this.setVar(r.slice(0, eq).replace(/^"/, ''), r.slice(eq + 1).replace(/"$/, ''));
    return 0;
  };
  INTERNAL.setx = function (c) { if (c.args.length < 2) { c.err('ERROR: Invalid syntax.\n'); return 1; } c.outln('\nSUCCESS: Specified value was saved.'); return 0; };
  INTERNAL.path = function (c) { if (c.raw.trim()) { this.setVar('Path', c.raw.trim().replace(/^=/, '')); return; } c.outln('PATH=' + this.vars.Path); };
  INTERNAL.vol = function (c) { const d = (c.args[0] || this.cwd[0]).toUpperCase(); const v = volumeFor(this.m, d); if (!v) { c.err('The system cannot find the drive specified.\n'); return 1; } c.outln(` Volume in drive ${d[0]} is ${v.label}\n Volume Serial Number is ${TX.sha1(v.label).slice(0, 4).toUpperCase()}-${TX.sha1(v.label).slice(4, 8).toUpperCase()}`); };
  INTERNAL.label = function (c) { if (!this.isAdmin) { c.err('Access Denied as you do not have sufficient privileges.\nYou have to invoke this utility running in elevated mode.\n'); return 1; } const v = volumeFor(this.m, this.cwd[0]); if (v && c.args[0]) v.label = c.args.join(' ').toUpperCase(); };
  INTERNAL.date = async function (c) { const d = new Date(); if (lower(c.args).includes('/t')) { c.outln(TX.DAY[d.getDay()] + ' ' + TX.winDate(Date.now())); return; } c.outln('The current date is: ' + TX.DAY[d.getDay()] + ' ' + TX.winDate(Date.now())); const l = await c.readLine('Enter the new date: (mm-dd-yy) '); if (l.trim()) c.err('A required privilege is not held by the client.\n'); };
  INTERNAL.time = async function (c) { if (lower(c.args).includes('/t')) { c.outln(TX.winTime(Date.now()).replace(/ [AP]M/, '')); return; } c.outln('The current time is: ' + this.getVar('TIME')); const l = await c.readLine('Enter the new time: '); if (l.trim()) c.err('A required privilege is not held by the client.\n'); };
  INTERNAL.title = function (c) { this.customTitle = c.raw.trim(); this.session.refreshTitle(); };
  INTERNAL.color = function (c) {
    const a = (c.args[0] || '').toLowerCase();
    const map = { 0: 0, 1: 4, 2: 2, 3: 6, 4: 1, 5: 5, 6: 3, 7: 7, 8: 8, 9: 12, a: 10, b: 14, c: 9, d: 13, e: 11, f: 15 };
    if (!a) { this.session.setColors(null, null); return 0; }
    if (!/^[0-9a-f]{1,2}$/.test(a) || (a.length === 2 && a[0] === a[1])) { this.lastCode = 1; return 1; }
    const bg = a.length === 2 ? map[a[0]] : null, fg = map[a[a.length - 1]];
    this.session.setColors(bg, fg);
    return 0;
  };
  INTERNAL.prompt = function (c) { this.vars.PROMPT = c.raw || '$P$G'; };
  INTERNAL.exit = function (c) { const code = parseInt(c.args.filter((a) => a.toLowerCase() !== '/b')[0] || '0', 10); if (lower(c.args).includes('/b') && c.batch) return code; throw new TX.ExitShell(code); };
  INTERNAL.pause = async function (c) { c.out('Press any key to continue . . . '); const k = await c.term.readKey(); c.out('\n'); if (k === '\x03') throw new TX.Interrupt(); };
  INTERNAL.help = function (c) { if (c.args[0]) { c.outln(TX.docs.cmdHelp(c.args[0].toLowerCase())); return; } c.outln(TX.docs.cmdHelpAll()); };
  INTERNAL.ver = function (c) { return X.ver(c); };
  INTERNAL.pushd = function (c) { this.dirStack.push(this.cwd.slice()); if (c.args[0]) return INTERNAL.cd.call(this, Object.assign({}, c, { raw: '/d ' + c.raw })); };
  INTERNAL.popd = function () { const d = this.dirStack.pop(); if (d) this.cwd = d; };
  INTERNAL.doskey = function (c) { if (lower(c.args).includes('/history')) this.history.forEach((h) => c.outln(h)); };
  INTERNAL.rem = function () {};
  INTERNAL.mklink = function (c) {
    const sw = lower(c.args.filter((a) => a.startsWith('/')));
    const [link, target] = c.args.filter((a) => !a.startsWith('/'));
    if (!link || !target) { c.outln('Creates a symbolic link.\n\nMKLINK [[/D] | [/H] | [/J]] Link Target\n\n        /D      Creates a directory symbolic link.  Default is a file\n                symbolic link.\n        /H      Creates a hard link instead of a symbolic link.\n        /J      Creates a Directory Junction.'); return 1; }
    if (!this.isAdmin && !sw.includes('/j') && !sw.includes('/h')) { c.err('You do not have sufficient privilege to perform this operation.\n'); return 1; }
    const ls = this.resolve(link), ts = this.resolve(target);
    this.vfs.symlink(target, ts, ls, {});
    c.outln(`${sw.includes('/j') ? 'Junction' : 'symbolic link'} created for ${link} <<===>> ${target}`);
    return 0;
  };
  INTERNAL.assoc = function (c) { const m = { '.txt': 'txtfile', '.bat': 'batfile', '.ps1': 'Microsoft.PowerShellScript.1', '.html': 'htmlfile', '.py': 'Python.File', '.png': 'pngfile', '.jpg': 'jpegfile' }; if (c.args[0]) c.outln(m[c.args[0].toLowerCase()] ? `${c.args[0]}=${m[c.args[0].toLowerCase()]}` : `File association not found for extension ${c.args[0]}`); else Object.keys(m).forEach((k) => c.outln(`${k}=${m[k]}`)); };
  INTERNAL.call = async function (c) {
    const target = c.args[0];
    if (!target) return 0;
    const segs = this.resolve(target);
    const n = this.vfs.get(segs) || this.vfs.get(this.resolve(target + '.bat'));
    if (!n) { c.err(NOT_RECOGNIZED(target)); return 1; }
    return this.runBatch(this.vfs.content(n), [target].concat(c.args.slice(1)), c.io);
  };
  INTERNAL.start = function (c) { const t = c.args.filter((a) => !a.startsWith('/'))[0]; if (!t || /^cmd$/i.test(t)) { if (TX.app) TX.app.newTab('cmd'); return 0; } if (/^(powershell|pwsh)$/i.test(t)) { TX.app.newTab('powershell'); return 0; } return X.start(c); };
  INTERNAL.if = async function (c) {
    let s = c.raw.trim();
    let neg = false, ci = false;
    if (/^\/i\s+/i.test(s)) { ci = true; s = s.replace(/^\/i\s+/i, ''); }
    if (/^not\s+/i.test(s)) { neg = true; s = s.replace(/^not\s+/i, ''); }
    let cond, rest;
    let m;
    if ((m = /^exist\s+("[^"]+"|\S+)\s+(.*)$/is.exec(s))) { cond = !!this.vfs.get(this.resolve(m[1].replace(/"/g, ''))); rest = m[2]; }
    else if ((m = /^defined\s+(\S+)\s+(.*)$/is.exec(s))) { cond = this.getVar(m[1]) !== undefined; rest = m[2]; }
    else if ((m = /^errorlevel\s+(\d+)\s+(.*)$/is.exec(s))) { cond = this.lastCode >= parseInt(m[1], 10); rest = m[2]; }
    else if ((m = /^("[^"]*"|[^\s=]+)\s*(==|\s(?:equ|neq|lss|leq|gtr|geq)\s)\s*("[^"]*"|\S+)\s+(.*)$/is.exec(s))) {
      let [a, op, b] = [m[1], m[2].trim().toLowerCase(), m[3]];
      if (ci) { a = a.toLowerCase(); b = b.toLowerCase(); }
      const na = parseFloat(a.replace(/"/g, '')), nb = parseFloat(b.replace(/"/g, ''));
      const num = !isNaN(na) && !isNaN(nb);
      const cmp = num ? na - nb : a.replace(/"/g, '').localeCompare(b.replace(/"/g, ''));
      cond = op === '==' ? a === b : op === 'equ' ? cmp === 0 : op === 'neq' ? cmp !== 0 : op === 'lss' ? cmp < 0 : op === 'leq' ? cmp <= 0 : op === 'gtr' ? cmp > 0 : cmp >= 0;
      rest = m[4];
    } else { c.err('The syntax of the command is incorrect.\n'); return 1; }
    if (neg) cond = !cond;
    // then/else
    let thenPart = rest, elsePart = null;
    const em = /^\((.*?)\)\s*else\s*\(?(.*?)\)?\s*$/is.exec(rest.trim());
    if (em) { thenPart = em[1]; elsePart = em[2]; }
    else { const pm = /^\((.*)\)\s*$/s.exec(rest.trim()); if (pm) thenPart = pm[1]; }
    const run = cond ? thenPart : elsePart;
    if (!run) return 0;
    let code = 0;
    for (const l of run.split('\n')) code = await this.exec(l, c.io, c.batch);
    return code;
  };
  INTERNAL.for = async function (c) {
    const s = c.raw.trim();
    const m = /^(\/[ldrf]\s+(?:"[^"]*"\s+)?)?(%%?\w)\s+in\s*\((.*?)\)\s*do\s+(.*)$/is.exec(s);
    if (!m) { c.err('The syntax of the command is incorrect.\n'); return 1; }
    const sw = (m[1] || '').trim().toLowerCase();
    const v = m[2];
    const set = m[3];
    let body = m[4].trim();
    if (/^\(.*\)$/s.test(body)) body = body.slice(1, -1);
    let items = [];
    if (sw.startsWith('/l')) { const [a, st, b] = set.split(/[,\s]+/).map(Number); for (let i = a; st > 0 ? i <= b : i >= b; i += st) { items.push(String(i)); if (items.length > 10000) break; } }
    else if (sw.startsWith('/d')) { this.vfs.glob(this.cwd, [set.trim()], false).forEach((segs) => { if (this.vfs.get(segs).t === 'd') items.push(segs[segs.length - 1]); }); }
    else if (sw.startsWith('/f')) {
      const src = set.trim();
      let text;
      if (/^'.*'$/.test(src)) { let buf = ''; await this.exec(src.slice(1, -1), { tty: false, stdin: null, out: (x) => { buf += x; }, err: c.err }); text = buf; }
      else if (/^".*"$/.test(src)) text = src.slice(1, -1);
      else { try { text = this.vfs.readFile(this.resolve(src)); } catch (e) { c.err(`The system cannot find the file ${src}.\n`); return 1; } }
      items = TX.splitLines(text).map((l) => l.split(/[ \t]/)[0]).filter(Boolean);
    } else {
      set.split(/\s+/).filter(Boolean).forEach((it) => {
        if (TX.hasGlob(it)) { const segs = this.resolve(it); this.vfs.glob(segs.slice(0, -1), [segs[segs.length - 1]], false).forEach((x) => { if (this.vfs.get(x).t === 'f') items.push(it.includes('\\') ? W.format(x) : x[x.length - 1]); }); }
        else items.push(it);
      });
    }
    const re = new RegExp(v.replace(/%/g, '%') + '\\b', 'g');
    const reTilde = new RegExp(v.replace('%', '%~') + '(?=\\W|$)', 'g');
    let code = 0;
    for (const it of items) {
      if (this.term.signal.aborted) throw new TX.Interrupt();
      const cmdText = body.replace(reTilde, it.replace(/^"|"$/g, '')).replace(re, it);
      if (this.echo && !c.batch && !cmdText.startsWith('@')) c.out('\n' + this.promptText() + cmdText + '\n');
      for (const l of cmdText.split('\n')) code = await this.exec(l, c.io, c.batch);
    }
    return code;
  };
  INTERNAL.goto = function (c) { c.err('No batch label specified to GOTO command.\n'); return 1; };
  INTERNAL.shift = function () {};
  INTERNAL.setlocal = INTERNAL.endlocal = function () {};
  INTERNAL['reset-machine'] = async function (c) { const ans = await c.readLine('Reset this pretend PC to factory settings? All your files will be lost. (Y/N) '); if (!/^y/i.test(ans)) return 1; TX.app.resetMachine('windows'); return 0; };
  TX.cmdInternal = INTERNAL;
  TX.cmdNames = Object.keys(INTERNAL).concat(Object.keys(X));

  // bridge Windows-native binaries that behave like their Unix versions (git, curl, tar, ssh)
  TX.winBridge = async (shell, name, args, io) => {
    if (name === 'git') {
      const ctx = TX.gitCtx({
        vfs: shell.vfs, cwd: shell.cwd, home: shell.home, resolve: (p) => shell.resolve(p), fmt: (s) => W.format(s), out: io.out, err: io.err,
        readLine: async (p, o) => { const l = await shell.term.readLine(Object.assign({ prompt: p }, o || {})); if (l === null) throw new TX.Interrupt(); return l; },
        tty: io.tty, term: shell.term, m: shell.m, user: 'student', session: shell.session, sleep: (ms) => TX.sleep(ms, shell.term.signal), editorName: 'vim', shellKind: 'win',
      });
      return TX.git.run(ctx, args);
    }
    const ps = new TX.PosixShell(shell.session, shell.m, 'gitbash', { cwd: shell.cwd });
    return ps.invoke([name].concat(args), io);
  };

  TX.CmdShell = CmdShell;
})();
