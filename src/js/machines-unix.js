/* TerminalEX — three more UNIX computers: Oracle Solaris 11.4 (SPARC), FreeBSD 14.1, and Research UNIX V7 (1979, PDP-11).
 * Same student files as the other machines, so the same cheat-sheet commands and lessons work everywhere. */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const S = TX.SAMPLE;
  const G = TX.gb, M = TX.mb;

  function studentHome(extra) {
    return Object.assign({
      $uid: 'student', $gid: 'staff', $mode: 0o755,
      '.secret_message': S.SECRET,
      Documents: { 'README.txt': S.README, 'todo.txt': S.TODO, 'poem.txt': S.POEM, 'grades.csv': S.GRADES },
      projects: S.projectFiles(),
      'groceries.txt': S.GROCERIES,
    }, extra || {});
  }
  const WORDS = 'apple\nbanana\ncherry\ndragon\neagle\nfalcon\ngiraffe\nhello\nigloo\njazz\nkernel\nlinux\nmonkey\nnetwork\noctopus\npython\nquartz\nrouter\nshell\nterminal\nunix\nvector\nwindows\nxylophone\nyellow\nzebra\n';
  const day = () => { const d = new Date(); return TX.MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2); };

  // ================================================================== Oracle Solaris 11.4 on SPARC
  function buildSolaris() {
    const spec = {
      bin: { $link: './usr/bin', $tgt: ['usr', 'bin'] },
      dev: { null: '', zero: '', random: '', console: '', dsk: { c1t0d0s0: '', c1t1d0s0: '' }, rdsk: {}, zvol: {} },
      etc: {
        release: '                     Oracle Solaris 11.4 SPARC\n  Copyright (c) 1983, 2024, Oracle and/or its affiliates.\n                            Assembled 13 August 2024\n',
        nodename: 'sol-lab\n',
        hosts: { $link: './inet/hosts', $tgt: ['etc', 'inet', 'hosts'] },
        inet: { hosts: '#\n# Internet host table\n#\n::1 sol-lab localhost\n127.0.0.1 sol-lab localhost loghost\n192.168.1.60 sol-lab\n192.168.1.42 ubuntu-lab\n192.168.1.70 freebsd-lab\n' },
        passwd: 'root:x:0:0:Super-User:/root:/usr/bin/bash\ndaemon:x:1:1::/:/bin/sh\nbin:x:2:2::/:/bin/sh\nsys:x:3:3::/:/bin/sh\nadm:x:4:4:Admin:/var/adm:/bin/sh\nnobody:x:60001:60001:NFS Anonymous Access User:/:/bin/sh\nstudent:x:101:10:Student:/export/home/student:/usr/bin/ksh\nteacher:x:102:10:Teacher:/export/home/teacher:/usr/bin/bash\n',
        group: 'root::0:\nother::1:root\nbin::2:root,daemon\nsys::3:root,bin,adm\nadm::4:root,daemon\nstaff::10:student,teacher\n',
        shadow: { $file: 'root:$5$abc$...:19900::::::\nstudent:$5$def$...:19900::::::\n', $mode: 0o400 },
        vfstab: '#device\t\tdevice\t\tmount\t\tFS\tfsck\tmount\tmount\n#to mount\tto fsck\t\tpoint\t\ttype\tpass\tat boot\toptions\n/devices\t-\t\t/devices\tdevfs\t-\tno\t-\n/proc\t\t-\t\t/proc\t\tproc\t-\tno\t-\n/dev/zvol/dsk/rpool/swap\t-\t-\tswap\t-\tno\t-\nswap\t\t-\t\t/tmp\t\ttmpfs\t-\tyes\t-\n',
        shells: '/bin/bash\n/bin/csh\n/bin/ksh\n/bin/ksh93\n/bin/sh\n/bin/tcsh\n/bin/zsh\n',
        motd: '',
        'resolv.conf': 'nameserver 192.168.1.1\nsearch lan\n',
        'user_attr': 'root::::type=role\nstudent::::profiles=Software Installation;roles=root\n',
        svc: { 'repository.db': { $size: 7340032 } },
        zones: { 'index': 'global:installed:/\nwebzone:running:/zones/webzone:a1b2c3d4\n' },
        'ssh': { sshd_config: 'Port 22\nPermitRootLogin no\n' },
      },
      export: { home: { student: studentHome({ '.profile': '# ~/.profile — read by ksh at login\nexport PATH=/usr/bin:/usr/sbin:/usr/gnu/bin\nexport EDITOR=vi\n' }), teacher: { $uid: 'teacher', $mode: 0o750, 'answer-key.txt': { $file: 'Nice try! :)\n', $mode: 0o600, $uid: 'teacher' } } } },
      home: {},
      kernel: { drv: {}, fs: {} },
      opt: {},
      platform: { sun4v: { kernel: { sparcv9: { unix: { $size: 2441216 } } } } },
      proc: {},
      root: { $mode: 0o700, 'flag.txt': 'root flag: SUN-RISE-1982\n' },
      rpool: {},
      sbin: { $link: './usr/sbin', $tgt: ['usr', 'sbin'] },
      system: { volatile: {} },
      tmp: { $mode: 0o1777 },
      usr: { bin: {}, sbin: {}, gnu: { bin: {} }, lib: {}, share: { dict: { words: WORDS }, man: {} }, local: {} },
      var: {
        adm: {
          messages: `${day()} 08:02:11 sol-lab genunix: [ID 540533 kern.notice] SunOS Release 5.11 Version 11.4.72.176.1 64-bit\n${day()} 08:02:11 sol-lab genunix: [ID 877030 kern.notice] Copyright (c) 1983, 2024, Oracle and/or its affiliates.\n${day()} 08:02:14 sol-lab unix: [ID 950921 kern.info] cpu0: SPARC-M8 (chipid 0, clock 5067 MHz)\n${day()} 08:02:20 sol-lab genunix: [ID 408114 kern.info] /pseudo/zconsnex@1/zcons@0 (zcons0) online\n${day()} 08:02:31 sol-lab sshd[678]: [ID 800047 auth.info] Server listening on :: port 22.\n${day()} 09:14:02 sol-lab sshd[2211]: [ID 800047 auth.notice] Failed password for invalid user admin from 203.0.113.9 port 51022 ssh2\n${day()} 09:40:44 sol-lab fmd: [ID 377184 daemon.error] SUNW-MSG-ID: SMF-8000-YX, TYPE: defect, VER: 1, SEVERITY: major\n${day()} 09:40:44 sol-lab fmd: [ID 377184 daemon.error] EVENT-ID: 5f2c1e9a  DESC: A service failed - application/print/cups has entered the maintenance state.\n`,
          wtmpx: { $size: 1488 },
        },
        svc: { log: { 'application-print-cups:default.log': '[ ' + day() + ' 09:40:43 Executing start method ("/lib/svc/method/svc-cups start"). ]\n/etc/cups/cupsd.conf: line 12: Unknown directive "Listen 631x"\n[ ' + day() + ' 09:40:44 Method "start" exited with status 95. ]\n', 'network-ssh:default.log': '[ ' + day() + ' 08:02:30 Executing start method ("/lib/svc/method/sshd start"). ]\n[ ' + day() + ' 08:02:31 Method "start" exited with status 0. ]\n' } },
        tmp: { $mode: 0o1777 }, log: {}, 'pkg': {},
      },
      zones: { webzone: { root: { var: { apache2: { htdocs: { 'index.html': '<h1>Hello from a Solaris zone!</h1>\n' } } } } } },
    };
    return TX.build(spec, '');
  }
  const SOL_PROCS = () => TX.mkProcs([
    { pid: 0, name: 'sched', cmd: 'sched', rss: 0, vsz: 0, tty: '?', start: '08:02:11' },
    { pid: 5, name: 'zpool-rpool', cmd: 'zpool-rpool', rss: 0, vsz: 0 },
    { pid: 6, name: 'kmem_task', cmd: 'kmem_task', rss: 0, vsz: 0 },
    { pid: 1, name: 'init', cmd: '/usr/sbin/init', rss: 3200, vsz: 5100 },
    { pid: 2, name: 'pageout', cmd: 'pageout', rss: 0, vsz: 0 },
    { pid: 3, name: 'fsflush', cmd: 'fsflush', rss: 0, vsz: 0 },
    { pid: 11, name: 'svc.startd', cmd: '/lib/svc/bin/svc.startd', rss: 14200, vsz: 21000 },
    { pid: 13, name: 'svc.configd', cmd: '/lib/svc/bin/svc.configd', rss: 25600, vsz: 32000 },
    { pid: 48, name: 'dlmgmtd', cmd: '/usr/sbin/dlmgmtd', user: 'daemon', rss: 3000, vsz: 6600 },
    { pid: 64, name: 'netcfgd', cmd: '/lib/inet/netcfgd', user: 'netcfg', rss: 3300, vsz: 6000 },
    { pid: 80, name: 'ipmgmtd', cmd: '/lib/inet/ipmgmtd', user: 'netadm', rss: 4000, vsz: 7800 },
    { pid: 412, name: 'nscd', cmd: '/usr/sbin/nscd', rss: 6100, vsz: 15000 },
    { pid: 550, name: 'fmd', cmd: '/usr/lib/fm/fmd/fmd', rss: 31000, vsz: 52000, cpu: 0.2 },
    { pid: 590, name: 'syslogd', cmd: '/usr/sbin/syslogd', rss: 3100, vsz: 7700 },
    { pid: 610, name: 'cron', cmd: '/usr/sbin/cron', rss: 2600, vsz: 5000 },
    { pid: 678, name: 'sshd', cmd: '/usr/lib/ssh/sshd', rss: 6000, vsz: 12000 },
    { pid: 702, name: 'inetd', cmd: '/usr/lib/inet/inetd start', rss: 3800, vsz: 9000 },
    { pid: 810, name: 'httpd', cmd: '/usr/apache2/2.4/bin/httpd -k start', user: 'webservd', rss: 22000, vsz: 61000 },
    { pid: 901, name: 'zoneadmd', cmd: 'zoneadmd -z webzone', rss: 4000, vsz: 9000 },
    { pid: 1188, name: 'java', cmd: '/usr/jdk/latest/bin/java -jar inventory.jar', user: 'student', rss: 412000, vsz: 1800000, cpu: 18.5, tty: '?' },
    { pid: 2230, name: 'ksh', cmd: '-ksh', user: 'student', rss: 3100, vsz: 6200, tty: 'pts/1' },
  ]);
  const SOL_SERVICES = () => [
    ['online', 'svc:/system/svc/restarter:default'], ['online', 'svc:/network/loopback:default'], ['online', 'svc:/network/physical:default'],
    ['online', 'svc:/system/filesystem/root:default'], ['online', 'svc:/system/filesystem/local:default'], ['online', 'svc:/system/cron:default'],
    ['online', 'svc:/system/system-log:default'], ['online', 'svc:/network/ssh:default'], ['online', 'svc:/system/fmd:default'],
    ['online', 'svc:/system/name-service/cache:default'], ['online', 'svc:/network/inetd:default'], ['online', 'svc:/network/http:apache24'],
    ['online', 'svc:/system/zones:default'], ['online', 'svc:/system/pkgserv:default'], ['disabled', 'svc:/network/ftp:default'],
    ['disabled', 'svc:/network/telnet:default'], ['disabled', 'svc:/network/nfs/server:default'], ['disabled', 'svc:/application/database/mysql:version_80'],
    ['maintenance', 'svc:/application/print/cups:default'],
  ].map(([state, fmri]) => ({ fmri, state, stime: state === 'online' ? '8:02:31' : state === 'maintenance' ? '9:40:44' : '8:02:20' }));

  TX.defineMachine('solaris', {
    build: buildSolaris, procs: SOL_PROCS, services: SOL_SERVICES, users: ['root', 'student', 'teacher'],
    installed: ['git', 'curl', 'vim', 'python3', 'wget', 'nano'], home: ['export', 'home', 'student'], ci: false,
    net: { hostname: 'sol-lab', ip: '192.168.1.60', mac: '0:14:4f:fa:3c:21', gw: '192.168.1.1', dns: '192.168.1.1', iface: 'net0', ip6: 'fe80::214:4fff:fefa:3c21' },
    hw: { cpu: 'SPARC-M8', cores: 32, threads: 256, mhz: 5067, memTotal: 64 * 1024 * 1024, swap: 8 * 1024 * 1024, board: 'Oracle Corporation SPARC T8-1', kernel: '5.11', os: 'Oracle Solaris', ver: '11.4', build: '11.4.72.176.1', arch: 'sparc', mach: 'sun4v' },
    disks: [{ dev: 'c1t0d0', model: 'HGST H101812SFSUN1.2T', size: G(1117.6) }, { dev: 'c1t1d0', model: 'HGST H101812SFSUN1.2T', size: G(1117.6) }],
    extra: () => ({
      zfs: [
        { name: 'rpool', used: G(41.2), avail: G(1030), refer: M(73), mount: '/rpool' },
        { name: 'rpool/ROOT', used: G(12.8), avail: G(1030), refer: M(31), mount: 'legacy' },
        { name: 'rpool/ROOT/solaris', used: G(12.7), avail: G(1030), refer: G(6.1), mount: '/' },
        { name: 'rpool/VARSHARE', used: M(410), avail: G(1030), refer: M(392), mount: '/var/share' },
        { name: 'rpool/export', used: G(2.3), avail: G(1030), refer: M(32), mount: '/export' },
        { name: 'rpool/export/home', used: G(2.2), avail: G(1030), refer: M(33), mount: '/export/home' },
        { name: 'rpool/export/home/student', used: M(184), avail: G(1030), refer: M(184), mount: '/export/home/student' },
        { name: 'rpool/swap', used: G(8.25), avail: G(1030), refer: G(8), mount: '-' },
        { name: 'rpool/zones', used: G(1.9), avail: G(1030), refer: M(32), mount: '/zones' },
        { name: 'rpool/zones/webzone', used: G(1.8), avail: G(1030), refer: G(1.8), mount: '/zones/webzone' },
      ],
      snaps: [{ name: 'rpool/ROOT/solaris@install', used: M(512), refer: G(5.9), created: Date.now() - 86400000 * 40 }],
      pool: { name: 'rpool', size: G(1110), health: 'ONLINE', disks: ['c1t0d0', 'c1t1d0'], mirror: true },
      zones: [{ id: 0, name: 'global', status: 'running', path: '/', brand: 'solaris', ip: 'shared' }, { id: 1, name: 'webzone', status: 'running', path: '/zones/webzone', brand: 'solaris', ip: 'excl' }, { id: '-', name: 'testzone', status: 'installed', path: '/zones/testzone', brand: 'solaris', ip: 'excl' }],
      bes: [{ name: 'solaris', active: 'NR', mount: '/', space: G(12.7), policy: 'static', created: Date.now() - 86400000 * 40 }, { name: 'solaris-backup-1', active: '-', mount: '-', space: M(286), policy: 'static', created: Date.now() - 86400000 * 12 }],
    }),
    shellVars: (sh) => ({ SHELL: sh.flavor === 'ksh' ? '/usr/bin/ksh' : '/usr/bin/bash', PATH: '/usr/bin:/usr/sbin:/usr/gnu/bin', EDITOR: 'vi', TERM: 'xterm', LANG: 'C', UID: sh.user === 'root' ? '0' : '101', TZ: 'US/Eastern', HOSTNAME: null }),
    banner: (sh) => `Oracle Solaris 11.4.72.176.1   Assembled August 2024\nLast login: ${TX.unixDate(Date.now() - 3600000 * 20).replace(/ E[DS]T \d+$/, '')} from 192.168.1.42\n${C.dim('(TerminalEX: this is ksh93, the Korn shell, on a SPARC server. Type')} ${C.cyan('help')} ${C.dim('for commands.)')}\n`,
    rootHome: ['root'],
    pkgHint: null,
  });

  // ================================================================== FreeBSD 14.1-RELEASE
  function buildFreeBSD() {
    const spec = {
      COPYRIGHT: '# $FreeBSD$\n\nCopyright (c) 1992-2024 The FreeBSD Project.\n\nCopyright (c) 1979, 1980, 1983, 1986, 1988, 1989, 1991, 1992, 1993, 1994\n\tThe Regents of the University of California. All rights reserved.\n',
      bin: {}, sbin: {}, lib: {}, libexec: {}, media: {}, mnt: {}, proc: {}, rescue: {}, net: {},
      boot: { kernel: { kernel: { $size: 31457280 } }, 'loader.conf': 'zfs_load="YES"\nautoboot_delay="3"\n', defaults: {} },
      dev: { null: '', zero: '', random: '', ada0: '', ada0p1: '', ada0p2: '', ada0p3: '', da0: '', da0s1: '' },
      etc: {
        'rc.conf': 'hostname="freebsd-lab"\nifconfig_em0="DHCP"\nsshd_enable="YES"\nntpd_enable="YES"\nnginx_enable="YES"\nzfs_enable="YES"\ndumpdev="AUTO"\n',
        hosts: '::1\t\t\tlocalhost localhost.my.domain\n127.0.0.1\t\tlocalhost localhost.my.domain\n192.168.1.70\t\tfreebsd-lab\n',
        passwd: 'root:*:0:0:Charlie &:/root:/bin/sh\ntoor:*:0:0:Bourne-again Superuser:/root:\ndaemon:*:1:1:Owner of many system processes:/root:/usr/sbin/nologin\nwww:*:80:80:World Wide Web Owner:/nonexistent:/usr/sbin/nologin\nnobody:*:65534:65534:Unprivileged user:/nonexistent:/usr/sbin/nologin\nstudent:*:1001:1001:Student:/home/student:/bin/sh\n',
        group: 'wheel:*:0:root,student\ndaemon:*:1:\nwww:*:80:\nstaff:*:20:\nstudent:*:1001:\n',
        'master.passwd': { $file: 'root:$6$abc:0:0::0:0:Charlie &:/root:/bin/sh\n', $mode: 0o600 },
        fstab: '# Device\t\tMountpoint\tFStype\tOptions\t\tDump\tPass#\n/dev/ada0p3\t\tnone\tswap\tsw\t\t0\t0\n',
        'os-release': 'NAME=FreeBSD\nVERSION="14.1-RELEASE"\nVERSION_ID="14.1"\nID=freebsd\nANSI_COLOR="0;31"\nPRETTY_NAME="FreeBSD 14.1-RELEASE"\nCPE_NAME="cpe:/o:freebsd:freebsd:14.1"\nHOME_URL="https://FreeBSD.org/"\n',
        motd: { $link: '/var/run/motd', $tgt: ['var', 'run', 'motd'] },
        'resolv.conf': '# Generated by resolvconf\nnameserver 192.168.1.1\n',
        shells: '# List of acceptable shells for chpass(1).\n/bin/sh\n/bin/csh\n/bin/tcsh\n/usr/local/bin/bash\n',
        'sysctl.conf': '# $FreeBSD$\n#security.bsd.see_other_uids=0\n',
        crontab: 'SHELL=/bin/sh\nPATH=/etc:/bin:/sbin:/usr/bin:/usr/sbin\n*/5\t*\t*\t*\t*\troot\t/usr/libexec/atrun\n',
        jail: { 'web.conf': 'web {\n  path = "/usr/jails/web";\n  host.hostname = "web.lan";\n  ip4.addr = "192.168.1.71";\n  exec.start = "/bin/sh /etc/rc";\n}\n' },
        pkg: { 'FreeBSD.conf': 'FreeBSD: {\n  url: "pkg+http://pkg.FreeBSD.org/${ABI}/quarterly",\n  enabled: yes\n}\n' },
      },
      home: { student: studentHome({ '.shrc': '# $FreeBSD$\n#\n# .shrc - bourne shell startup file\nalias h=\'fc -l\'\nalias j=jobs\nalias m="$PAGER"\nalias ll=\'ls -laFo\'\nalias l=\'ls -l\'\n', '.profile': 'PATH=/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/usr/local/bin:$HOME/bin; export PATH\nENV=$HOME/.shrc; export ENV\n' }) },
      root: { $mode: 0o700, 'flag.txt': 'root flag: BEASTIE-1993\n', '.shrc': '# root .shrc\n' },
      tmp: { $mode: 0o1777 },
      usr: {
        bin: {}, sbin: {}, lib: {}, include: {},
        jails: { web: { usr: { local: { www: { 'index.html': '<h1>Hello from a FreeBSD jail!</h1>\n' } } } } },
        local: { bin: {}, sbin: {}, etc: { 'nginx': { 'nginx.conf': 'worker_processes 1;\nevents { worker_connections 1024; }\nhttp {\n  server { listen 80; root /usr/local/www/nginx; }\n}\n' } }, www: { nginx: { 'index.html': '<h1>Welcome to nginx on FreeBSD!</h1>\n' } } },
        ports: { 'Makefile': '# Ports collection makefile\n', 'README': 'This is the FreeBSD Ports Collection: 34,000+ programs you can build from source.\n', games: { cowsay: { Makefile: 'PORTNAME=\tcowsay\nDISTVERSION=\t3.04\nCATEGORIES=\tgames\n', 'pkg-descr': 'Configurable talking characters in ASCII art\n' }, sl: { Makefile: 'PORTNAME=\tsl\nPORTVERSION=\t5.02\nCATEGORIES=\tgames\n', 'pkg-descr': 'Steam Locomotive: corrects you if you type sl by mistake instead of ls\n' }, 'fortune-mod-freebsd-classic': { Makefile: 'PORTNAME=\tfortune-mod-freebsd-classic\nCATEGORIES=\tgames\n' } }, www: { nginx: { Makefile: 'PORTNAME=\tnginx\nPORTVERSION=\t1.26.1\nCATEGORIES=\twww\n' } }, shells: { bash: {} } },
        share: { dict: { words: WORDS }, doc: {} },
        src: {},
      },
      var: {
        log: {
          messages: `${day()} 08:01:12 freebsd-lab syslogd: kernel boot file is /boot/kernel/kernel\n${day()} 08:01:12 freebsd-lab kernel: FreeBSD 14.1-RELEASE releng/14.1-n267679-10e31f0946d8 GENERIC amd64\n${day()} 08:01:12 freebsd-lab kernel: CPU: Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz (3000.00-MHz K8-class CPU)\n${day()} 08:01:13 freebsd-lab kernel: em0: link state changed to UP\n${day()} 08:01:20 freebsd-lab sshd[610]: Server listening on 0.0.0.0 port 22.\n${day()} 09:12:44 freebsd-lab sshd[1802]: error: PAM: Authentication error for illegal user admin from 203.0.113.9\n${day()} 10:02:17 freebsd-lab kernel: ugen0.3: <SanDisk Ultra Fit> at usbus0\n${day()} 10:02:17 freebsd-lab kernel: da0: <SanDisk Ultra Fit 1.00> Removable Direct Access SCSI device\n`,
          'auth.log': `${day()} 09:12:44 freebsd-lab sshd[1802]: Invalid user admin from 203.0.113.9 port 50522\n`,
          nginx: { 'access.log': '192.168.1.42 - - [12/Oct/2026:09:01:02 -0400] "GET / HTTP/1.1" 200 615 "-" "curl/8.5.0"\n' },
        },
        run: { motd: 'FreeBSD 14.1-RELEASE (GENERIC) releng/14.1-n267679-10e31f0946d8\n\nWelcome to FreeBSD!\n\nRelease Notes, Errata: https://www.FreeBSD.org/releases/\nSecurity Advisories:   https://www.FreeBSD.org/security/\nFreeBSD Handbook:      https://www.FreeBSD.org/handbook/\nFreeBSD FAQ:           https://www.FreeBSD.org/faq/\nQuestions List:        https://www.FreeBSD.org/lists/questions/\nFreeBSD Forums:        https://forums.FreeBSD.org/\n\nShow the version of FreeBSD installed:  freebsd-version ; uname -a\nPlease include that output and any error messages when posting questions.\n\nEdit /etc/motd.template to change this login announcement.\n' },
        tmp: { $mode: 0o1777 }, db: { pkg: {} }, cache: {},
      },
    };
    return TX.build(spec, '');
  }
  const BSD_PROCS = () => TX.mkProcs([
    { pid: 0, name: 'kernel', cmd: '[kernel]', rss: 0, vsz: 0 },
    { pid: 1, name: 'init', cmd: '/sbin/init', rss: 1100, vsz: 11000 },
    { pid: 2, name: 'KTLS', cmd: '[KTLS]', rss: 0, vsz: 0 },
    { pid: 5, name: 'zfskern', cmd: '[zfskern]', rss: 0, vsz: 0 },
    { pid: 310, name: 'devd', cmd: '/sbin/devd', rss: 2900, vsz: 13000 },
    { pid: 402, name: 'syslogd', cmd: '/usr/sbin/syslogd -s', rss: 2700, vsz: 13000 },
    { pid: 520, name: 'ntpd', cmd: '/usr/sbin/ntpd -p /var/db/ntp/ntpd.pid -c /etc/ntp.conf -f /var/db/ntpd.drift', user: 'ntpd', rss: 6000, vsz: 22000 },
    { pid: 610, name: 'sshd', cmd: 'sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups', rss: 8900, vsz: 22000 },
    { pid: 640, name: 'cron', cmd: '/usr/sbin/cron -s', rss: 2600, vsz: 13000 },
    { pid: 700, name: 'nginx', cmd: 'nginx: master process /usr/local/sbin/nginx', rss: 9000, vsz: 25000 },
    { pid: 701, name: 'nginx', cmd: 'nginx: worker process (nginx)', user: 'www', rss: 9800, vsz: 25000 },
    { pid: 880, name: 'getty', cmd: '/usr/libexec/getty Pc ttyv1', rss: 2400, vsz: 13000, tty: 'v1' },
    { pid: 1240, name: 'minecraft', cmd: 'java -Xmx2G -jar minecraft_server.jar nogui', user: 'student', rss: 1980000, vsz: 4400000, cpu: 22.4 },
    { pid: 2230, name: 'sh', cmd: '-sh (sh)', user: 'student', rss: 3000, vsz: 14000, tty: '0' },
  ]);
  const BSD_SERVICES = () => [
    { name: 'sshd', enabled: true, running: true, pid: 610 }, { name: 'ntpd', enabled: true, running: true, pid: 520 }, { name: 'nginx', enabled: true, running: true, pid: 700 },
    { name: 'cron', enabled: true, running: true, pid: 640 }, { name: 'syslogd', enabled: true, running: true, pid: 402 }, { name: 'devd', enabled: true, running: true, pid: 310 },
    { name: 'zfs', enabled: true, running: true }, { name: 'sendmail', enabled: false, running: false }, { name: 'jail', enabled: false, running: false },
    { name: 'pf', enabled: false, running: false }, { name: 'mysql-server', enabled: false, running: false, pkg: 'mysql80-server' },
  ];
  TX.defineMachine('freebsd', {
    build: buildFreeBSD, procs: BSD_PROCS, services: BSD_SERVICES, users: ['root', 'toor', 'student'],
    installed: ['pkg', 'nginx', 'curl', 'git', 'nano', 'vim', 'python3'], home: ['home', 'student'], ci: false,
    net: { hostname: 'freebsd-lab', ip: '192.168.1.70', mac: '00:1b:21:3a:9c:4e', gw: '192.168.1.1', dns: '192.168.1.1', iface: 'em0', ip6: 'fe80::21b:21ff:fe3a:9c4e' },
    hw: { cpu: 'Intel(R) Core(TM) i5-8500 CPU @ 3.00GHz', cores: 6, threads: 6, mhz: 3000, memTotal: 16 * 1024 * 1024, swap: 2 * 1024 * 1024, board: 'Dell Inc. OptiPlex 7060', kernel: '14.1-RELEASE', os: 'FreeBSD', ver: '14.1-RELEASE', arch: 'amd64' },
    disks: [{ dev: 'ada0', model: 'Samsung SSD 870 EVO 500GB', size: G(465.8) }, { dev: 'da0', model: 'SanDisk Ultra Fit', size: G(28.7) }],
    extra: () => ({
      zfs: [
        { name: 'zroot', used: G(18.4), avail: G(428), refer: M(96), mount: '/zroot' },
        { name: 'zroot/ROOT', used: G(6.2), avail: G(428), refer: M(96), mount: 'none' },
        { name: 'zroot/ROOT/default', used: G(6.2), avail: G(428), refer: G(6.2), mount: '/' },
        { name: 'zroot/home', used: G(9.4), avail: G(428), refer: M(96), mount: '/home' },
        { name: 'zroot/home/student', used: G(9.3), avail: G(428), refer: G(9.3), mount: '/home/student' },
        { name: 'zroot/tmp', used: M(120), avail: G(428), refer: M(120), mount: '/tmp' },
        { name: 'zroot/usr', used: G(2.5), avail: G(428), refer: M(96), mount: '/usr' },
        { name: 'zroot/usr/ports', used: G(1.4), avail: G(428), refer: G(1.4), mount: '/usr/ports' },
        { name: 'zroot/var', used: M(310), avail: G(428), refer: M(96), mount: '/var' },
      ],
      snaps: [],
      pool: { name: 'zroot', size: G(456), health: 'ONLINE', disks: ['ada0p4'], mirror: false },
      jails: [{ jid: 1, ip: '192.168.1.71', hostname: 'web.lan', path: '/usr/jails/web' }],
      ports: true,
    }),
    shellVars: (sh) => ({ SHELL: '/bin/sh', PATH: '/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/usr/local/bin:/home/student/bin', EDITOR: 'vi', PAGER: 'less', TERM: 'xterm', CLICOLOR: '1', UID: sh.user === 'root' ? '0' : '1001', HOSTNAME: null, ENV: '/home/student/.shrc' }),
    banner: (sh) => {
      let motd = '';
      try { motd = sh.vfs.readFile(['var', 'run', 'motd']); } catch (e) { /* removed */ }
      return `Last login: ${TX.unixDate(Date.now() - 3600000 * 6).replace(/ E[DS]T \d+$/, '')} from 192.168.1.42\n` + motd + `${C.dim('(TerminalEX: FreeBSD\'s /bin/sh. Try')} ${C.cyan('freebsd-version')}${C.dim(',')} ${C.cyan('pkg search cowsay')} ${C.dim('or')} ${C.cyan('help')}${C.dim('.)')}\n`;
    },
    pkgHint: (name) => {
      const port = { cowsay: 'games/cowsay', fortune: 'games/fortune-mod-freebsd-classic', sudo: 'security/sudo', bash: 'shells/bash', htop: 'sysutils/htop', neofetch: 'sysutils/neofetch', tree: 'sysutils/tree', jq: 'textproc/jq', figlet: 'misc/figlet', sl: 'games/sl', wget: 'ftp/wget', tmux: 'sysutils/tmux' }[name];
      return port ? C.dim(`(hint: it's not in the FreeBSD base system. Install it with  pkg install ${name.replace(/^fortune$/, 'fortune-mod-freebsd-classic')}  (as root) — or build it from /usr/ports/${port})`) + '\n' : '';
    },
    rootHome: ['root'],
  });

  // ================================================================== Research UNIX Version 7 (Bell Labs, 1979) on a PDP-11/70
  const V7_TIME = new Date('1979-06-11T14:22:00').getTime();
  function buildV7() {
    const t = (s) => ({ $file: s, $mt: V7_TIME });
    const spec = {
      bin: {}, lib: {}, mnt: {}, tmp: { $mode: 0o777 },
      dev: { console: '', tty0: '', tty1: '', rp0: '', rrp0: '', mt0: '', null: '', mem: '', kmem: '', lp: '' },
      etc: {
        passwd: t('root:VwL97VCAx1Qhs:0:1::/:\ndaemon:x:1:1::/:\nsys::2:2::/usr/sys:\nbin::3:3::/bin:\nken::6:1:Ken Thompson:/usr/ken:\ndmr::7:1:Dennis Ritchie:/usr/dmr:\nstudent::101:10::/usr/student:\n'),
        group: t('other:x:1:\nsys:x:2:sys\nbin:x:3:bin,sys\nstaff:x:10:student,ken,dmr\n'),
        motd: t(''),
        rc: t('HOME=/; export HOME\nPATH=/bin:/usr/bin\n/etc/mount /dev/rp3 /usr\n/etc/update\n/etc/cron\necho Multi-user mode\n'),
        ttys: t('14console\n00tty00\n00tty01\n'),
        utmp: '',
      },
      unix: { $size: 51200, $mt: V7_TIME },
      usr: {
        bin: {}, lib: {}, spool: { mail: { student: { $file: 'From dmr Mon Jun 11 09:12 1979\nWelcome to UNIX! The shell is /bin/sh. Read "UNIX for Beginners" in /usr/doc.\nTry ls, cat, ed, who and mail. Do not rm -r / please.\n\t-- dmr\n\n', $uid: 'student', $mode: 0o600, $mt: V7_TIME } }, lpd: {} },
        dict: { words: WORDS },
        doc: { beginners: t('UNIX FOR BEGINNERS -- SECOND EDITION\n\nBrian W. Kernighan\n\nThis paper is meant to help new users get started on the UNIX operating system.\n\n  * Logging in: type your name at "login:".\n  * The shell prints "$" when it is ready for a command.\n  * ls lists the files in a directory, cat prints them, ed edits them.\n  * Mistakes: the character # erases the last character you typed, @ erases the line.\n    (TerminalEX lets you use Backspace instead.)\n  * ^D (control-d) at the shell logs you out.\n\nThe UNIX philosophy: write programs that do one thing and do it well;\nwrite programs to work together; use text streams, because that is a universal interface.\n') },
        games: { fortune: { $file: 'fortune\n', $mode: 0o755, $mt: V7_TIME }, moo: { $file: 'moo\n', $mode: 0o755, $mt: V7_TIME }, lib: { fortunes: t('It is easier to write an incorrect program than understand a correct one.\nUNIX is basically a simple operating system, but you have to be a genius to understand the simplicity. -- Dennis Ritchie\nWhen in doubt, use brute force. -- Ken Thompson\n') } },
        man: { man1: { 'ls.1': t('.TH LS 1\n') } },
        src: { cmd: { 'echo.c': t('main(argc, argv)\nint argc;\nchar *argv[];\n{\n\tregister int i, nflg;\n\n\tnflg = 0;\n\tif(argc > 1 && argv[1][0] == \'-\' && argv[1][1] == \'n\') {\n\t\tnflg++;\n\t\targc--;\n\t\targv++;\n\t}\n\tfor(i=1; i<argc; i++) {\n\t\tfputs(argv[i], stdout);\n\t\tif (i < argc-1)\n\t\t\tputchar(\' \');\n\t}\n\tif(nflg == 0)\n\t\tputchar(\'\\n\');\n\texit(0);\n}\n') } },
        student: Object.assign(studentHome({ $gid: 'staff', '.profile': { $file: 'PATH=:/bin:/usr/bin:/usr/games\nexport PATH\n', $mt: V7_TIME } }), {}),
        ken: { $uid: 'ken', $mode: 0o755, 'unix.c': t('/* nothing to see here */\n') },
        dmr: { $uid: 'dmr', $mode: 0o755, 'c.tutorial': t('The C Programming Language\n\nmain()\n{\n\tprintf("hello, world\\n");\n}\n') },
      },
    };
    const root = TX.build(spec, '');
    // Everything on this disk is from 1979.
    let k = 0;
    (function walk(n) { n.mt = V7_TIME - 86400000 * (1 + ((k++ * 7) % 40)) - 3600000 * (k % 9); if (n.ch) Object.keys(n.ch).forEach((x) => walk(n.ch[x])); })(root);
    return root;
  }
  TX.V7_TIME = V7_TIME;
  const V7_PROCS = () => TX.mkProcs([
    { pid: 0, name: 'swapper', cmd: 'swapper', rss: 0, vsz: 0, tty: '?' },
    { pid: 1, name: 'init', cmd: '/etc/init', rss: 4, vsz: 4, tty: '?' },
    { pid: 12, name: 'update', cmd: '/etc/update', rss: 2, vsz: 2, tty: '?' },
    { pid: 14, name: 'cron', cmd: '/etc/cron', rss: 5, vsz: 5, tty: '?' },
    { pid: 21, name: 'getty', cmd: '- 0 tty00', rss: 3, vsz: 3, tty: '00' },
    { pid: 34, name: 'sh', cmd: '-sh', user: 'student', rss: 12, vsz: 12, tty: 'co' },
    { pid: 40, name: 'troff', cmd: 'troff -ms paper.ms', user: 'dmr', rss: 30, vsz: 30, tty: '01', cpu: 12 },
  ]);
  // Only the programs V7 really had (and that TerminalEX simulates). Everything else: "not found".
  const V7_ALLOW = new Set(('cd chdir pwd ls cat cp mv rm ln mkdir rmdir echo ed grep egrep fgrep wc sort uniq tail tr sed awk diff cmp comm join split tee ' +
    'date cal who ps kill sleep chmod chown chgrp du df mount sync file find expr test [ true false time nice nohup tty stty su passwd write mail mesg ' +
    'od dd tar pr look spell crypt bc dc units fortune moo learn man set export read exit shift wait trap eval exec . : sh login newgrp kill ' +
    'yes help reset-machine').split(' '));
  TX.v7Check = (line) => {
    const hint = (s) => C.dim('(' + s + ')') + '\n';
    if (/\$\(/.test(line)) return 'syntax error: `(\' unexpected\n' + hint('the 1979 Bourne shell only knows `backquotes` for command substitution — $( ) came in the 1980s');
    if (/(^|\s)\[\[/.test(line)) return '[[: not found\n' + hint('[[ ]] is from the Korn shell (1983). V7 uses  test  or  [ ]');
    if (/(^|\s)~(\/|\s|$)/.test(line)) return hint('~ for "home" is a C-shell idea from Berkeley — the Bourne shell does not know it. Use $HOME instead') + '';
    if (/(^|[\s;])function\s+\w+|^\s*\w+\s*\(\)\s*\{/.test(line)) return 'syntax error: `(\' unexpected\n' + hint('shell functions arrived in System V (1984), five years after V7');
    return null;
  };
  TX.defineMachine('unix', {
    build: buildV7, procs: V7_PROCS, services: () => [], users: ['root', 'daemon', 'sys', 'bin', 'ken', 'dmr', 'student'],
    installed: ['fortune'], home: ['usr', 'student'], ci: false, allow: V7_ALLOW, noLineEditing: true, rootHome: [],
    net: { hostname: 'research', ip: '', mac: '', gw: '', dns: '', iface: '' },
    hw: { cpu: 'PDP-11/70', cores: 1, threads: 1, mhz: 0, memTotal: 256, swap: 0, board: 'Digital Equipment Corporation PDP-11/70', kernel: 'V7', os: 'UNIX', ver: 'Seventh Edition', arch: 'pdp11' },
    disks: [{ dev: 'rp0', model: 'DEC RP06', size: 176e6 }],
    extra: () => ({ year: 1979 }),
    shellVars: (sh) => ({ SHELL: null, PATH: ':/bin:/usr/bin:/usr/games', HOME: sh.user === 'root' ? '/' : '/usr/student', TERM: null, LANG: null, EDITOR: null, HOSTNAME: null, UID: null, LOGNAME: null, USER: sh.user, MAIL: '/usr/spool/mail/' + sh.user }),
    banner: () => `${C.dim('PDP-11/70 boot')}\n@boot\nNew Boot, known devices are hp ht rk rl rp tm vt\n: rp(0,0)rp/unix\nmem = 177856\n# ^D\n\nRESTRICTED RIGHTS: USE, DUPLICATION, OR DISCLOSURE\nIS SUBJECT TO RESTRICTIONS STATED IN YOUR CONTRACT WITH\nWESTERN ELECTRIC COMPANY, INC.\nMulti-user mode\n\nlogin: student\nYou have mail.\n${C.dim('(TerminalEX: it is 1979. No arrow keys, no Tab completion, no colors, no ~ and no "less".')}\n${C.dim(' Try  ls  cat  who  ed  mail  and  /usr/games/fortune . Type  help  for the full list.)')}\n`,
    title: (sh) => 'UNIX V7 — PDP-11/70 console (tty: co) — ' + sh.fmt(sh.cwd),
    gens: () => ({}),
  });
})();
