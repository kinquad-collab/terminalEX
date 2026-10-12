/* TerminalEX — mock machines: filesystems, disks, processes, services, network */
(function () {
  'use strict';
  const TX = window.TX;
  const G = TX.gb, M = TX.mb;

  // ------------------------------------------------------------ shared content
  const README = `# Welcome to TerminalEX!

This is a safe practice computer. Nothing you do here can break a real machine,
so experiment freely. If you mess everything up, type:  reset-machine

Useful first commands:
  pwd        where am I?
  ls         what is here?        (Windows: dir)
  cd NAME    move into a folder
  cat FILE   print a file         (Windows: type)
  help       list commands
  man CMD    manual page for a command (Linux/macOS)

Try the Missions panel (the flag button at the top right) for guided challenges.
`;
  const HELLO_PY = `#!/usr/bin/env python3
"""A tiny program for practicing with files and git."""

def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("world"))
`;
  const HELLO_JS = `// Tiny web app used for git practice
function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("world"));
`;
  const GROCERIES = `eggs
milk
bread
coffee
apples
bananas
chicken
rice
spinach
cheese
apples
coffee
tortillas
`;
  const GRADES = `name,period,unit1,unit2,unit3,final
Avery,1,88,92,79,85
Blake,1,95,97,99,98
Carmen,2,72,80,85,81
Devon,2,64,70,77,72
Elliot,3,91,85,88,90
Farah,3,99,94,97,96
Gabe,4,55,68,74,69
Hana,4,83,88,90,87
Isaac,5,77,79,81,80
Jordan,5,90,93,89,91
`;
  const POEM = `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;
`;
  const SERVER_LOG = (() => {
    const ips = ['192.168.1.14', '10.0.0.8', '172.16.4.22', '192.168.1.77', '203.0.113.9', '198.51.100.23'];
    const paths = ['/', '/index.html', '/login', '/api/users', '/api/grades', '/images/logo.png', '/admin', '/favicon.ico', '/robots.txt'];
    const codes = [200, 200, 200, 200, 304, 404, 200, 500, 401, 200, 403];
    const agents = ['Mozilla/5.0', 'curl/8.5.0', 'python-requests/2.32', 'Googlebot/2.1'];
    const out = [];
    let t = Date.now() - 1000 * 60 * 60 * 5;
    for (let i = 0; i < 60; i++) {
      t += TX.randInt(5000, 400000);
      const d = new Date(t);
      const stamp = TX.p2(d.getDate()) + '/' + TX.MON[d.getMonth()] + '/' + d.getFullYear() + ':' + TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds()) + ' -0400';
      const ip = TX.pick(ips), p = TX.pick(paths), c = p === '/admin' ? TX.pick([401, 403]) : TX.pick(codes);
      out.push(`${ip} - - [${stamp}] "GET ${p} HTTP/1.1" ${c} ${TX.randInt(120, 48000)} "-" "${TX.pick(agents)}"`);
    }
    return out.join('\n') + '\n';
  })();
  const SECRET = `You found the hidden file! Hidden files start with a dot on Linux/macOS.
Use  ls -a  to see them. (Windows hides files with an attribute instead: dir /a)
Secret code: TUX-4815-1623
`;
  const TODO = `[ ] finish CSP create task
[x] practice cd and ls
[ ] learn git branching
[ ] figure out what grep does
[x] customize my prompt
`;
  const SCRIPT_SH = `#!/bin/bash
# A tiny bash script. Run it with:  bash backup.sh   or  ./backup.sh
echo "Backing up Documents..."
mkdir -p ~/backup
cp -r ~/Documents/* ~/backup/
echo "Done! Files in backup:"
ls ~/backup
`;
  const BATCH = `@echo off
REM A tiny batch file. Run it by typing: hello.bat
echo Hello from a batch file!
echo Today is %DATE%
echo You are %USERNAME% on %COMPUTERNAME%
`;
  const PS1 = `# A tiny PowerShell script. Run it with:  .\\sysinfo.ps1
Write-Host "=== System Summary ===" -ForegroundColor Cyan
Write-Host "Computer: $env:COMPUTERNAME"
Write-Host "User:     $env:USERNAME"
Get-Volume | Where-Object { $_.DriveLetter } | Format-Table DriveLetter, FileSystemLabel, SizeRemaining, Size
`;

  function homeDocs(sep) {
    return {
      'README.txt': README,
      'todo.txt': TODO,
      'poem.txt': POEM,
      'grades.csv': GRADES,
    };
  }

  // hello-world git repo (created by git module later, placeholder dir)
  function projectFiles() {
    return {
      'hello-web': { 'index.html': '<!DOCTYPE html>\n<html>\n  <head><title>Hello</title></head>\n  <body>\n    <h1>Hello, world!</h1>\n    <script src="app.js"><\/script>\n  </body>\n</html>\n', 'app.js': HELLO_JS, 'style.css': 'body {\n  font-family: sans-serif;\n  background: #fafafa;\n}\n' },
      'python-practice': { 'hello.py': HELLO_PY, 'numbers.txt': '42\n7\n19\n3\n88\n15\n61\n7\n23\n' },
    };
  }

  // ------------------------------------------------------------ processes
  function mkProcs(list) {
    let pid = 1;
    return list.map((p) => Object.assign({ pid: p.pid || (pid += TX.randInt(1, 40)), cpu: 0, mem: 0.1, user: 'root', stat: 'S', start: '08:12', tty: '?', threads: 1 }, p));
  }

  const LINUX_PROCS = () => mkProcs([
    { pid: 1, name: 'systemd', cmd: '/sbin/init splash', rss: 13200, vsz: 168000 },
    { pid: 2, name: 'kthreadd', cmd: '[kthreadd]', rss: 0, vsz: 0 },
    { pid: 312, name: 'systemd-journald', cmd: '/lib/systemd/systemd-journald', rss: 24000, vsz: 49000 },
    { pid: 355, name: 'systemd-udevd', cmd: '/lib/systemd/systemd-udevd', rss: 7000, vsz: 25000 },
    { pid: 601, name: 'systemd-resolved', cmd: '/lib/systemd/systemd-resolved', user: 'systemd+', rss: 13000, vsz: 25000 },
    { pid: 702, name: 'cron', cmd: '/usr/sbin/cron -f -P', rss: 2800, vsz: 9000 },
    { pid: 718, name: 'NetworkManager', cmd: '/usr/sbin/NetworkManager --no-daemon', rss: 19000, vsz: 330000 },
    { pid: 731, name: 'sshd', cmd: 'sshd: /usr/sbin/sshd -D [listener]', rss: 8000, vsz: 15000 },
    { pid: 760, name: 'rsyslogd', cmd: '/usr/sbin/rsyslogd -n -iNONE', user: 'syslog', rss: 5000, vsz: 222000 },
    { pid: 812, name: 'nginx', cmd: 'nginx: master process /usr/sbin/nginx', rss: 3000, vsz: 55000 },
    { pid: 813, name: 'nginx', cmd: 'nginx: worker process', user: 'www-data', rss: 5400, vsz: 56000 },
    { pid: 905, name: 'mysqld', cmd: '/usr/sbin/mysqld', user: 'mysql', rss: 390000, vsz: 2400000, cpu: 0.7, threads: 38 },
    { pid: 1120, name: 'gdm3', cmd: '/usr/sbin/gdm3', rss: 9000, vsz: 245000 },
    { pid: 1403, name: 'gnome-shell', cmd: '/usr/bin/gnome-shell', user: 'student', rss: 310000, vsz: 4700000, cpu: 2.3, tty: 'tty2' },
    { pid: 1650, name: 'firefox', cmd: '/snap/firefox/4793/usr/lib/firefox/firefox', user: 'student', rss: 520000, vsz: 3100000, cpu: 4.1, threads: 92 },
    { pid: 1702, name: 'code', cmd: '/usr/share/code/code --type=renderer', user: 'student', rss: 280000, vsz: 1200000, cpu: 1.2 },
    { pid: 2011, name: 'spotify', cmd: '/snap/spotify/80/usr/share/spotify/spotify', user: 'student', rss: 210000, vsz: 990000, cpu: 0.9 },
    { pid: 2230, name: 'bash', cmd: '-bash', user: 'student', rss: 5200, vsz: 11000, tty: 'pts/0', stat: 'Ss' },
  ]);
  const MAC_PROCS = () => mkProcs([
    { pid: 1, name: 'launchd', cmd: '/sbin/launchd', rss: 15000, vsz: 409000 },
    { pid: 88, name: 'logd', cmd: '/usr/libexec/logd', rss: 9000, vsz: 409000 },
    { pid: 95, name: 'WindowServer', cmd: '/System/Library/PrivateFrameworks/SkyLight.framework/Resources/WindowServer -daemon', user: '_windowserver', rss: 190000, vsz: 4200000, cpu: 3.4 },
    { pid: 120, name: 'mds', cmd: '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Support/mds', rss: 40000, vsz: 409000, cpu: 0.4 },
    { pid: 150, name: 'bluetoothd', cmd: '/usr/sbin/bluetoothd', rss: 11000, vsz: 409000 },
    { pid: 410, name: 'Finder', cmd: '/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder', user: 'student', rss: 98000, vsz: 4400000 },
    { pid: 422, name: 'Dock', cmd: '/System/Library/CoreServices/Dock.app/Contents/MacOS/Dock', user: 'student', rss: 60000, vsz: 4300000 },
    { pid: 530, name: 'Safari', cmd: '/Applications/Safari.app/Contents/MacOS/Safari', user: 'student', rss: 330000, vsz: 5100000, cpu: 2.7 },
    { pid: 611, name: 'Music', cmd: '/System/Applications/Music.app/Contents/MacOS/Music', user: 'student', rss: 120000, vsz: 4600000, cpu: 0.8 },
    { pid: 720, name: 'Code Helper', cmd: '/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper.app', user: 'student', rss: 250000, vsz: 1300000, cpu: 1.4 },
    { pid: 801, name: 'Terminal', cmd: '/System/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal', user: 'student', rss: 70000, vsz: 4300000 },
    { pid: 809, name: 'zsh', cmd: '-zsh', user: 'student', rss: 3400, vsz: 409000, tty: 'ttys000', stat: 'Ss' },
  ]);
  const WIN_PROCS = () => mkProcs([
    { pid: 0, name: 'System Idle Process', rss: 8, session: 'Services' },
    { pid: 4, name: 'System', rss: 3100, session: 'Services', handles: 4221 },
    { pid: 128, name: 'Registry', rss: 71000, session: 'Services' },
    { pid: 540, name: 'smss', rss: 1200, session: 'Services' },
    { pid: 712, name: 'csrss', rss: 5900, session: 'Services' },
    { pid: 804, name: 'wininit', rss: 6700, session: 'Services' },
    { pid: 880, name: 'services', rss: 11000, session: 'Services' },
    { pid: 900, name: 'lsass', rss: 24000, session: 'Services' },
    { pid: 1044, name: 'svchost', rss: 30000, session: 'Services', handles: 1400 },
    { pid: 1188, name: 'svchost', rss: 18000, session: 'Services' },
    { pid: 1320, name: 'svchost', rss: 22000, session: 'Services' },
    { pid: 1604, name: 'MsMpEng', rss: 210000, session: 'Services', cpu: 1.1, desc: 'Antimalware Service Executable' },
    { pid: 2280, name: 'spoolsv', rss: 12000, session: 'Services' },
    { pid: 3120, name: 'explorer', rss: 140000, session: 'Console', user: 'student', cpu: 0.6, desc: 'Windows Explorer' },
    { pid: 3388, name: 'SearchHost', rss: 90000, session: 'Console', user: 'student' },
    { pid: 4120, name: 'msedge', rss: 260000, session: 'Console', user: 'student', cpu: 3.2, desc: 'Microsoft Edge' },
    { pid: 4188, name: 'msedge', rss: 120000, session: 'Console', user: 'student' },
    { pid: 5012, name: 'Code', rss: 230000, session: 'Console', user: 'student', cpu: 1.5, desc: 'Visual Studio Code' },
    { pid: 5540, name: 'Teams', rss: 330000, session: 'Console', user: 'student', cpu: 2.2, desc: 'Microsoft Teams' },
    { pid: 6020, name: 'Spotify', rss: 180000, session: 'Console', user: 'student', cpu: 0.7 },
    { pid: 6444, name: 'WindowsTerminal', rss: 75000, session: 'Console', user: 'student', desc: 'Windows Terminal' },
    { pid: 6690, name: 'OpenConsole', rss: 9000, session: 'Console', user: 'student' },
  ]);

  // ------------------------------------------------------------ services
  const LINUX_SERVICES = () => [
    { name: 'ssh', desc: 'OpenBSD Secure Shell server', active: true, enabled: true, pid: 731 },
    { name: 'nginx', desc: 'A high performance web server and a reverse proxy server', active: true, enabled: true, pid: 812 },
    { name: 'mysql', desc: 'MySQL Community Server', active: true, enabled: true, pid: 905 },
    { name: 'cron', desc: 'Regular background program processing daemon', active: true, enabled: true, pid: 702 },
    { name: 'NetworkManager', desc: 'Network Manager', active: true, enabled: true, pid: 718 },
    { name: 'rsyslog', desc: 'System Logging Service', active: true, enabled: true, pid: 760 },
    { name: 'cups', desc: 'CUPS Scheduler', active: false, enabled: false },
    { name: 'docker', desc: 'Docker Application Container Engine', active: false, enabled: false },
    { name: 'bluetooth', desc: 'Bluetooth service', active: true, enabled: true, pid: 699 },
    { name: 'ufw', desc: 'Uncomplicated firewall', active: true, enabled: true },
  ];
  const WIN_SERVICES = () => [
    ['AudioSrv', 'Windows Audio', 'Running'], ['BITS', 'Background Intelligent Transfer Service', 'Running'],
    ['Dhcp', 'DHCP Client', 'Running'], ['Dnscache', 'DNS Client', 'Running'], ['EventLog', 'Windows Event Log', 'Running'],
    ['LanmanServer', 'Server', 'Running'], ['LanmanWorkstation', 'Workstation', 'Running'], ['mpssvc', 'Windows Defender Firewall', 'Running'],
    ['Spooler', 'Print Spooler', 'Running'], ['sshd', 'OpenSSH SSH Server', 'Stopped'], ['Themes', 'Themes', 'Running'],
    ['W32Time', 'Windows Time', 'Running'], ['WinDefend', 'Microsoft Defender Antivirus Service', 'Running'],
    ['wuauserv', 'Windows Update', 'Stopped'], ['WSearch', 'Windows Search', 'Running'], ['XboxGipSvc', 'Xbox Accessory Management Service', 'Stopped'],
    ['bthserv', 'Bluetooth Support Service', 'Running'], ['WlanSvc', 'WLAN AutoConfig', 'Running'], ['TermService', 'Remote Desktop Services', 'Stopped'],
  ].map(([name, display, status]) => ({ name, display, status, startType: status === 'Running' ? 'Automatic' : 'Manual' }));

  // ------------------------------------------------------------ network
  const NET = {
    linux: {
      hostname: 'ubuntu-lab', ip: '192.168.1.42', mac: '08:00:27:4e:66:a1', gw: '192.168.1.1', dns: '192.168.1.1', iface: 'enp0s3', wifi: 'wlp2s0', wifiIp: '192.168.1.43', ip6: 'fe80::a00:27ff:fe4e:66a1',
    },
    mac: {
      hostname: 'MacBook-Pro', ip: '192.168.1.57', mac: 'a4:83:e7:1c:9b:20', gw: '192.168.1.1', dns: '192.168.1.1', iface: 'en0', ip6: 'fe80::1c8a:4df2:77b1:9e10',
    },
    windows: {
      hostname: 'DESKTOP-LAB42', ip: '192.168.1.105', mac: '3C-52-82-5A-10-FE', gw: '192.168.1.1', dns: '192.168.1.1', iface: 'Ethernet', wifi: 'Wi-Fi', wifiIp: '192.168.1.106', ip6: 'fe80::5d1b:c2e0:8a31:4f7e%12',
    },
  };

  // ------------------------------------------------------------ disks
  const DISKS = {
    linux: [
      { dev: 'nvme0n1', model: 'Samsung SSD 980 PRO 512GB', size: G(476.9), type: 'disk', tran: 'nvme', rota: 0, serial: 'S5GXNF0R412345',
        parts: [
          { dev: 'nvme0n1p1', size: G(1), fs: 'vfat', mount: '/boot/efi', used: M(6.1), label: '', uuid: '8C2A-1F3B', type: 'EFI System' },
          { dev: 'nvme0n1p2', size: G(2), fs: 'ext4', mount: '/boot', used: M(260), uuid: 'b4d2e2a1-7c1f-4a3e-9d55-0e1c8e3b6a10', type: 'Linux filesystem' },
          { dev: 'nvme0n1p3', size: G(473.9), fs: 'ext4', mount: '/', used: G(87.4), uuid: '1f6c3b8e-52aa-4d7e-b1a4-9a0f3e2c7d55', type: 'Linux filesystem' },
        ] },
      { dev: 'sda', model: 'ST1000DM010-2EP102', size: G(931.5), type: 'disk', tran: 'sata', rota: 1, serial: 'ZN1A2B3C',
        parts: [{ dev: 'sda1', size: G(931.5), fs: 'ext4', mount: '/mnt/data', used: G(412.8), label: 'data', uuid: 'e3a1c9d2-6b4f-4f0e-8a77-3d2b1c0f9e84', type: 'Linux filesystem' }] },
      { dev: 'sdb', model: 'SanDisk Ultra Fit', size: G(28.7), type: 'disk', tran: 'usb', rota: 0, serial: '4C530001230918', rm: 1,
        parts: [{ dev: 'sdb1', size: G(28.7), fs: 'vfat', mount: '/media/student/STUDENT_USB', used: G(3.2), label: 'STUDENT_USB', uuid: '5E21-9A0C', type: 'W95 FAT32 (LBA)' }] },
    ],
    mac: [
      { dev: 'disk0', model: 'APPLE SSD AP0512Z', size: 500.3e9, type: 'internal, physical', parts: [
        { id: 'disk0s1', type: 'Apple_APFS_ISC', name: '', size: 524.3e6 },
        { id: 'disk0s2', type: 'Apple_APFS', name: 'Container disk3', size: 494.4e9 },
        { id: 'disk0s3', type: 'Apple_APFS_Recovery', name: '', size: 5.4e9 },
      ] },
      { dev: 'disk3', model: 'APFS Container', size: 494.4e9, type: 'synthesized', parts: [
        { id: 'disk3s1', type: 'APFS Volume', name: 'Macintosh HD', size: 11.2e9, mount: '/', used: 11.2e9 },
        { id: 'disk3s1s1', type: 'APFS Snapshot', name: 'com.apple.os.update-...', size: 11.2e9 },
        { id: 'disk3s5', type: 'APFS Volume', name: 'Data', size: 187.6e9, mount: '/System/Volumes/Data', used: 187.6e9 },
        { id: 'disk3s6', type: 'APFS Volume', name: 'VM', size: 2.1e9, mount: '/System/Volumes/VM', used: 2.1e9 },
      ] },
      { dev: 'disk4', model: 'SanDisk Cruzer', size: 32.0e9, type: 'external, physical', parts: [
        { id: 'disk4s1', type: 'DOS_FAT_32', name: 'STUDENT_USB', size: 32.0e9, mount: '/Volumes/STUDENT_USB', used: 3.4e9 },
      ] },
    ],
    windows: [
      { num: 0, model: 'Samsung SSD 980 PRO 512GB', size: G(476.94), bus: 'NVMe', media: 'SSD', health: 'Healthy', style: 'GPT', serial: '0025_3852_1150_A1B2.',
        parts: [
          { num: 1, type: 'System', size: M(100), fs: 'FAT32', label: 'SYSTEM', letter: '', info: 'System' },
          { num: 2, type: 'Reserved', size: M(16), fs: '', label: '', letter: '' },
          { num: 3, type: 'Primary', size: G(475.3), fs: 'NTFS', label: 'Windows', letter: 'C', used: G(198.6), info: 'Boot' },
          { num: 4, type: 'Recovery', size: M(750), fs: 'NTFS', label: 'Recovery', letter: '', info: 'Hidden' },
        ] },
      { num: 1, model: 'WDC WD10EZEX-08WN4A0', size: G(931.51), bus: 'SATA', media: 'HDD', health: 'Healthy', style: 'GPT', serial: 'WD-WCC6Y4KX1234',
        parts: [{ num: 1, type: 'Primary', size: G(931.5), fs: 'NTFS', label: 'Data', letter: 'D', used: G(402.3) }] },
      { num: 2, model: 'SanDisk Ultra USB 3.0', size: G(28.64), bus: 'USB', media: 'Removable', health: 'Healthy', style: 'MBR', serial: '4C530001230918102',
        parts: [{ num: 1, type: 'Primary', size: G(28.63), fs: 'FAT32', label: 'STUDENT_USB', letter: 'E', used: G(3.1), removable: true }] },
    ],
  };

  const HW = {
    linux: { cpu: 'Intel(R) Core(TM) i7-12700H', cores: 14, threads: 20, mhz: 2688, memTotal: 16 * 1024 * 1024, swap: 2 * 1024 * 1024, gpu: 'Intel Corporation Alder Lake-P GT2 [Iris Xe Graphics]', board: 'Dell Inc. XPS 15 9520', kernel: '6.8.0-45-generic', os: 'Ubuntu 24.04.1 LTS', codename: 'noble' },
    mac: { cpu: 'Apple M3 Pro', cores: 12, threads: 12, memTotal: 18 * 1024 * 1024, model: 'MacBook Pro (14-inch, Nov 2023)', modelId: 'Mac15,6', os: 'macOS', ver: '15.0', build: '24A335', kernel: 'Darwin 24.0.0', serial: 'C02XK1ABMD6T' },
    windows: { cpu: 'AMD Ryzen 7 7840HS w/ Radeon 780M Graphics', cores: 8, threads: 16, mhz: 3801, memTotal: 32 * 1024 * 1024, gpu: 'AMD Radeon 780M Graphics', board: 'LENOVO 82Y9 Legion Slim 5', os: 'Microsoft Windows 11 Education', ver: '10.0.22631', build: '22631', bios: 'LENOVO KWCN34WW, 3/14/2024' },
  };

  // ------------------------------------------------------------ build Linux
  function buildLinux() {
    const home = {
      $uid: 'student', $mode: 0o750,
      '.bashrc': `# ~/.bashrc: executed by bash for interactive shells.
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
export EDITOR=nano
`,
      '.profile': '# ~/.profile\nif [ -n "$BASH_VERSION" ]; then\n    . "$HOME/.bashrc"\nfi\n',
      '.secret_message': SECRET,
      '.config': { 'git': {} },
      Desktop: {},
      Documents: Object.assign(homeDocs(), { 'essay-draft.txt': 'The Impact of Computing on Society\n\nComputing innovations have changed how we communicate...\n' }),
      Downloads: { 'ubuntu-24.04-desktop-amd64.iso': { $size: 6114656256 }, 'lecture-notes.pdf': { $size: 2481233 }, 'cat.jpg': { $size: 184320 } },
      Music: { 'lofi-beats.mp3': { $size: 5242880 } },
      Pictures: { 'wallpaper.png': { $size: 3145728 }, 'screenshot-01.png': { $size: 412551 } },
      Videos: {},
      projects: projectFiles(),
      scripts: { 'backup.sh': { $file: SCRIPT_SH, $mode: 0o755 } },
      automation: TX.automationFolder('unix'),
      'groceries.txt': GROCERIES,
    };
    const spec = {
      bin: { $link: '/usr/bin', $tgt: ['usr', 'bin'] },
      sbin: { $link: '/usr/sbin', $tgt: ['usr', 'sbin'] },
      lib: { $link: '/usr/lib', $tgt: ['usr', 'lib'] },
      boot: { 'vmlinuz-6.8.0-45-generic': { $size: 14928264 }, 'initrd.img-6.8.0-45-generic': { $size: 71301120 }, grub: { 'grub.cfg': '# GRUB2 config (generated)\nset default="0"\nset timeout=5\n' }, efi: {} },
      dev: { null: '', zero: '', random: '', sda: '', sda1: '', sdb: '', sdb1: '', nvme0n1: '', nvme0n1p1: '', nvme0n1p2: '', nvme0n1p3: '', tty: '' },
      etc: {
        hostname: 'ubuntu-lab\n',
        hosts: '127.0.0.1\tlocalhost\n127.0.1.1\tubuntu-lab\n192.168.1.1\trouter.lan\n192.168.1.57\tmacbook-pro.lan\n192.168.1.105\tdesktop-lab42.lan\n\n# The following lines are desirable for IPv6 capable hosts\n::1     ip6-localhost ip6-loopback\n',
        passwd: 'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsyslog:x:104:110::/home/syslog:/usr/sbin/nologin\nmysql:x:112:118:MySQL Server,,,:/nonexistent:/bin/false\nstudent:x:1000:1000:Student,,,:/home/student:/bin/bash\nteacher:x:1001:1001:Teacher,,,:/home/teacher:/bin/bash\n',
        group: 'root:x:0:\nadm:x:4:syslog,student\nsudo:x:27:student,teacher\nwww-data:x:33:\nstudent:x:1000:\nteacher:x:1001:\ndocker:x:999:student\n',
        shadow: { $file: 'root:*:19000:0:99999:7:::\nstudent:$y$j9T$Fa9...:19900:0:99999:7:::\n', $mode: 0o640 },
        'os-release': 'PRETTY_NAME="Ubuntu 24.04.1 LTS"\nNAME="Ubuntu"\nVERSION_ID="24.04"\nVERSION="24.04.1 LTS (Noble Numbat)"\nVERSION_CODENAME=noble\nID=ubuntu\nID_LIKE=debian\nHOME_URL="https://www.ubuntu.com/"\n',
        fstab: '# <file system> <mount point> <type> <options> <dump> <pass>\nUUID=1f6c3b8e-52aa-4d7e-b1a4-9a0f3e2c7d55 /          ext4  errors=remount-ro 0 1\nUUID=b4d2e2a1-7c1f-4a3e-9d55-0e1c8e3b6a10 /boot      ext4  defaults 0 2\nUUID=8C2A-1F3B                            /boot/efi  vfat  umask=0077 0 1\nUUID=e3a1c9d2-6b4f-4f0e-8a77-3d2b1c0f9e84 /mnt/data  ext4  defaults 0 2\n/swapfile none swap sw 0 0\n',
        'resolv.conf': 'nameserver 127.0.0.53\noptions edns0 trust-ad\nsearch lan\n',
        shells: '/bin/sh\n/bin/bash\n/usr/bin/bash\n/bin/zsh\n/usr/bin/zsh\n',
        timezone: 'America/New_York\n',
        motd: '',
        crontab: '# /etc/crontab: system-wide crontab\nSHELL=/bin/sh\n17 *\t* * *\troot\tcd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || run-parts --report /etc/cron.daily\n',
        nginx: { 'nginx.conf': 'user www-data;\nworker_processes auto;\nevents { worker_connections 768; }\nhttp {\n    include /etc/nginx/sites-enabled/*;\n}\n', 'sites-enabled': { default: 'server {\n    listen 80 default_server;\n    root /var/www/html;\n    index index.html;\n}\n' } },
        ssh: { sshd_config: 'Port 22\nPermitRootLogin prohibit-password\nPasswordAuthentication yes\n' },
        apt: { 'sources.list': 'deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse\ndeb http://security.ubuntu.com/ubuntu noble-security main restricted\n' },
      },
      home: { student: home, teacher: { $uid: 'teacher', $mode: 0o750, 'gradebook.xlsx': { $size: 48213 }, 'answer-key.txt': { $file: 'Nice try! :)\n', $mode: 0o600, $uid: 'teacher' } } },
      media: { student: { STUDENT_USB: { $uid: 'student', 'project-backup.zip': { $size: 3355443 }, 'resume.docx': { $size: 30120 } } } },
      mnt: { data: { $mode: 0o777, 'backups': {}, 'movies': { 'nature-doc.mkv': { $size: 4294967296 } }, 'shared-notes.txt': 'Shared drive for the lab.\n' } },
      opt: {},
      proc: { mdstat: { $gen: 'mdstat' }, cpuinfo: { $gen: 'cpuinfo' }, meminfo: { $gen: 'meminfo' }, uptime: { $gen: 'uptime' }, version: { $gen: 'version' }, loadavg: { $gen: 'loadavg' } },
      root: { $mode: 0o700, '.bashrc': '# root bashrc\n', 'flag.txt': 'root flag: SUDO-POWER-42\n' },
      run: {},
      srv: {},
      sys: {},
      tmp: { $mode: 0o777 },
      usr: {
        bin: {}, sbin: {}, lib: {}, local: { bin: {}, share: {} },
        share: { dict: { words: 'apple\nbanana\ncherry\ndragon\neagle\nfalcon\ngiraffe\nhello\nigloo\njazz\nkernel\nlinux\nmonkey\nnetwork\noctopus\npython\nquartz\nrouter\nshell\nterminal\nubuntu\nvector\nwindows\nxylophone\nyellow\nzebra\n' } },
      },
      var: {
        log: {
          syslog: { $file: '', $gen: 'syslog', $mode: 0o640, $uid: 'syslog' },
          'auth.log': { $file: `${TX.MON[new Date().getMonth()]} ${new Date().getDate()} 08:14:02 ubuntu-lab sshd[731]: Server listening on 0.0.0.0 port 22.\n${TX.MON[new Date().getMonth()]} ${new Date().getDate()} 09:01:44 ubuntu-lab sshd[2211]: Failed password for invalid user admin from 203.0.113.9 port 51022 ssh2\n${TX.MON[new Date().getMonth()]} ${new Date().getDate()} 09:01:47 ubuntu-lab sshd[2211]: Failed password for invalid user admin from 203.0.113.9 port 51022 ssh2\n${TX.MON[new Date().getMonth()]} ${new Date().getDate()} 09:02:03 ubuntu-lab sudo:  student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/apt update\n`, $mode: 0o640, $uid: 'syslog' },
          nginx: { 'access.log': SERVER_LOG, 'error.log': '2026/09/24 10:02:11 [error] 813#813: *44 open() "/var/www/html/admin" failed (2: No such file or directory)\n' },
          'dpkg.log': 'startup packages configure\n',
        },
        www: { html: { 'index.html': '<!DOCTYPE html>\n<html><body><h1>It works!</h1><p>nginx on ubuntu-lab</p></body></html>\n' } },
        tmp: {}, cache: {}, lib: {},
      },
    };
    return TX.build(spec, '');
  }

  // ------------------------------------------------------------ build macOS
  function buildMac() {
    const home = {
      $uid: 'student', $gid: 'staff', $mode: 0o750,
      '.zshrc': '# ~/.zshrc\nexport PATH="/opt/homebrew/bin:$PATH"\nalias ll="ls -lah"\nalias gs="git status"\n',
      '.zsh_history': '',
      '.secret_message': SECRET,
      Applications: {},
      Desktop: { 'Screenshot 2026-09-20 at 3.14.15 PM.png': { $size: 1048576 } },
      Documents: Object.assign(homeDocs(), { 'Keynote Presentation.key': { $size: 8388608 } }),
      Downloads: { 'VSCode-darwin-universal.zip': { $size: 199229440 }, 'syllabus.pdf': { $size: 184201 } },
      Library: { Preferences: {}, 'Application Support': {} },
      Movies: {}, Music: { 'playlist.m3u': '#EXTM3U\n' }, Pictures: { 'Photos Library.photoslibrary': {} }, Public: {},
      projects: projectFiles(),
      automation: TX.automationFolder('unix'),
      'groceries.txt': GROCERIES,
    };
    const spec = {
      Applications: {
        'Safari.app': {}, 'Visual Studio Code.app': {}, 'Google Chrome.app': {}, 'Spotify.app': {}, 'Xcode.app': {},
        Utilities: { 'Terminal.app': {}, 'Activity Monitor.app': {}, 'Disk Utility.app': {} },
      },
      Library: { Preferences: {}, Fonts: {} },
      System: { Library: { CoreServices: { 'SystemVersion.plist': '<?xml version="1.0"?>\n<plist version="1.0"><dict><key>ProductName</key><string>macOS</string><key>ProductVersion</key><string>15.0</string></dict></plist>\n' } }, Volumes: { Data: {} } },
      Users: { student: home, Shared: { $mode: 0o777 } },
      Volumes: { 'Macintosh HD': { $link: '/', $tgt: [] }, STUDENT_USB: { $uid: 'student', 'project-backup.zip': { $size: 3355443 }, 'resume.docx': { $size: 30120 } } },
      bin: { bash: { $size: 1310000 }, zsh: { $size: 1360000 }, ls: { $size: 154000 }, cat: { $size: 118000 } },
      cores: {},
      dev: { null: '', zero: '', random: '', disk0: '', disk3: '', disk4: '' },
      etc: { $link: 'private/etc', $tgt: ['private', 'etc'] },
      opt: { homebrew: { bin: {}, Cellar: {} } },
      private: { etc: { hosts: '##\n# Host Database\n##\n127.0.0.1\tlocalhost\n255.255.255.255\tbroadcasthost\n::1             localhost\n', shells: '/bin/bash\n/bin/csh\n/bin/dash\n/bin/ksh\n/bin/sh\n/bin/tcsh\n/bin/zsh\n', passwd: 'nobody:*:-2:-2:Unprivileged User:/var/empty:/usr/bin/false\nroot:*:0:0:System Administrator:/var/root:/bin/sh\n_windowserver:*:88:88:WindowServer:/var/empty:/usr/bin/false\n' }, tmp: { $mode: 0o777 }, var: { log: { 'system.log': { $gen: 'syslog' }, 'install.log': 'installd: Installed "macOS Sequoia 15.0"\n' } } },
      sbin: {},
      tmp: { $link: 'private/tmp', $tgt: ['private', 'tmp'] },
      usr: { bin: {}, local: { bin: {} }, share: {} },
      var: { $link: 'private/var', $tgt: ['private', 'var'] },
    };
    return TX.build(spec, '');
  }

  // ------------------------------------------------------------ build Windows
  function buildWindows() {
    const userDocs = Object.assign(homeDocs(), { 'Essay Draft.docx': { $size: 24576 }, 'hello.bat': BATCH, 'sysinfo.ps1': PS1 });
    const profile = {
      $uid: 'student',
      '.gitconfig': '[user]\n\tname = Student\n\temail = student@school.edu\n',
      '.bash_history': '',
      '.secret_message': { $file: SECRET.replace('Hidden files start with a dot on Linux/macOS.\nUse  ls -a  to see them. (Windows hides files with an attribute instead: dir /a)', 'Windows hides files with the "hidden" attribute.\nUse  dir /a  (cmd) or  Get-ChildItem -Force  (PowerShell) to see them.'), $hidden: true },
      AppData: { $hidden: true, Local: { Temp: {}, Microsoft: {} }, Roaming: { Microsoft: { Windows: { 'Start Menu': {} } } } },
      Contacts: {}, Desktop: { 'Minecraft Launcher.lnk': { $size: 2140 }, 'Google Chrome.lnk': { $size: 2311 } },
      Documents: userDocs,
      Downloads: { 'Git-2.46.0-64-bit.exe': { $size: 66115584 }, 'python-3.12.6-amd64.exe': { $size: 26214400 }, 'homework.pdf': { $size: 385024 } },
      Favorites: {}, Links: {}, Music: { 'study-playlist.m3u': '#EXTM3U\n' }, OneDrive: { 'Shared with me': {} },
      Pictures: { 'Screenshots': { 'Screenshot 2026-09-18 101512.png': { $size: 402811 } }, 'wallpaper.jpg': { $size: 2940000 } },
      'Saved Games': {}, Searches: {}, Videos: { 'Captures': {} },
      projects: projectFiles(),
      automation: TX.automationFolder('windows'),
      'groceries.txt': GROCERIES,
      'NTUSER.DAT': { $size: 3145728, $hidden: true, $sys: true },
    };
    const sys32 = { $uid: 'SYSTEM', drivers: { etc: { hosts: '# Copyright (c) 1993-2009 Microsoft Corp.\n#\n# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.\n#\n127.0.0.1       localhost\n::1             localhost\n' } }, config: {}, LogFiles: {} };
    ['cmd.exe', 'notepad.exe', 'calc.exe', 'ipconfig.exe', 'ping.exe', 'tasklist.exe', 'taskkill.exe', 'whoami.exe', 'systeminfo.exe', 'hostname.exe', 'tracert.exe', 'netstat.exe', 'nslookup.exe', 'diskpart.exe', 'chkdsk.exe', 'sfc.exe', 'shutdown.exe', 'robocopy.exe', 'xcopy.exe', 'where.exe', 'findstr.exe', 'sort.exe', 'tree.com', 'more.com', 'attrib.exe', 'wsl.exe', 'winver.exe', 'mspaint.exe', 'regedit.exe'].forEach((f) => { sys32[f] = { $size: TX.randInt(20000, 900000), $uid: 'SYSTEM' }; });
    sys32.WindowsPowerShell = { v1_0: { 'powershell.exe': { $size: 452608 } } };
    const spec = {
      'C:': {
        $uid: 'SYSTEM',
        '$Recycle.Bin': { $hidden: true, $sys: true },
        'Program Files': {
          $uid: 'SYSTEM',
          Git: { $uid: 'SYSTEM', bin: { 'bash.exe': { $size: 46000 }, 'git.exe': { $size: 46000 } }, usr: { bin: {} }, etc: { 'bash.bashrc': '# System-wide .bashrc file for interactive bash(1) shells.\n', profile: '# Git for Windows profile\n' }, tmp: { $mode: 0o777 }, 'git-bash.exe': { $size: 140000 }, dev: {}, mingw64: { bin: {} } },
          PowerShell: { 7: { 'pwsh.exe': { $size: 287000 } } },
          'Microsoft Office': { root: {} }, 'Mozilla Firefox': {}, 'Windows Defender': {}, 'Common Files': {},
          'Microsoft VS Code': { 'Code.exe': { $size: 158000000 } },
        },
        'Program Files (x86)': { $uid: 'SYSTEM', 'Microsoft': { Edge: {} }, 'Steam': {}, 'Common Files': {} },
        ProgramData: { $hidden: true, $uid: 'SYSTEM', Microsoft: {} },
        Users: {
          $uid: 'SYSTEM',
          student: profile,
          Public: { $mode: 0o777, 'Public Documents': {}, 'Public Desktop': {} },
          Default: { $hidden: true },
        },
        Windows: {
          $uid: 'SYSTEM',
          System32: sys32,
          SysWOW64: {}, Fonts: { 'arial.ttf': { $size: 1036584 }, 'consola.ttf': { $size: 459180 }, 'CascadiaMono.ttf': { $size: 638840 } },
          Temp: {}, Logs: { CBS: { 'CBS.log': 'Info CBS Loaded Servicing Stack v10.0.22621.3880\n' } },
          'explorer.exe': { $size: 5451776 }, 'notepad.exe': { $size: 201216 }, 'win.ini': '; for 16-bit app support\n[fonts]\n[extensions]\n[mci extensions]\n[files]\n[Mail]\nMAPI=1\n',
        },
        'pagefile.sys': { $size: 5100273664, $hidden: true, $sys: true },
        'hiberfil.sys': { $size: 6853820416, $hidden: true, $sys: true },
        'swapfile.sys': { $size: 16777216, $hidden: true, $sys: true },
      },
      'D:': {
        $uid: 'student',
        Backups: { 'laptop-backup-2026-08.zip': { $size: 8589934592 } },
        Games: { 'Minecraft': { saves: { 'Survival World': {} } }, 'Steam Library': {} },
        Media: { Photos: { 'field-trip.jpg': { $size: 4194304 } }, Videos: { 'robotics-competition.mp4': { $size: 1717986918 } } },
        'Class Projects': { 'Create Task': { 'written-response.docx': { $size: 29801 }, 'program-code.pdf': { $size: 118200 } } },
      },
      'E:': { $uid: 'student', 'project-backup.zip': { $size: 3355443 }, 'resume.docx': { $size: 30120 }, 'portable-apps': {} },
    };
    return TX.build(spec, '');
  }

  // ------------------------------------------------------------ dynamic content
  function gens(kind, m) {
    const hw = HW[kind];
    return {
      cpuinfo() {
        let s = '';
        for (let i = 0; i < Math.min(hw.threads, 4); i++) s += `processor\t: ${i}\nvendor_id\t: GenuineIntel\ncpu family\t: 6\nmodel\t\t: 154\nmodel name\t: ${hw.cpu}\ncpu MHz\t\t: ${(hw.mhz + Math.random() * 400).toFixed(3)}\ncache size\t: 24576 KB\ncpu cores\t: ${hw.cores}\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov sse sse2 ht avx avx2\n\n`;
        return s + `... (${hw.threads - 4} more processors)\n`;
      },
      meminfo() {
        const mem = m.memory();
        return `MemTotal:       ${String(mem.total).padStart(8)} kB\nMemFree:        ${String(mem.free).padStart(8)} kB\nMemAvailable:   ${String(mem.avail).padStart(8)} kB\nBuffers:        ${String(mem.buffers).padStart(8)} kB\nCached:         ${String(mem.cache).padStart(8)} kB\nSwapTotal:      ${String(mem.swapTotal).padStart(8)} kB\nSwapFree:       ${String(mem.swapTotal - mem.swapUsed).padStart(8)} kB\n`;
      },
      uptime() { const s = (Date.now() - m.boot) / 1000; return s.toFixed(2) + ' ' + (s * 7.3).toFixed(2) + '\n'; },
      version() { return `Linux version ${hw.kernel} (buildd@lcy02-amd64-010) (x86_64-linux-gnu-gcc-13 (Ubuntu 13.2.0-23ubuntu4) 13.2.0) #45-Ubuntu SMP PREEMPT_DYNAMIC\n`; },
      loadavg() { const l = m.load(); return l.map((x) => x.toFixed(2)).join(' ') + ' 2/' + (m.procs.length + 380) + ' ' + (m.nextPid - 1) + '\n'; },
      syslog() {
        const base = Date.now() - 1000 * 60 * 40;
        const lines = ['systemd[1]: Started Daily apt download activities.', 'kernel: [ 0.000000] Linux version ' + (hw.kernel || '') , 'NetworkManager[718]: <info>  device (enp0s3): state change: activated', 'CRON[2201]: (root) CMD (command -v debian-sa1 > /dev/null && debian-sa1 1 1)', 'kernel: usb 3-1: new high-speed USB device number 4 using xhci_hcd', 'kernel: sd 2:0:0:0: [sdb] 60088320 512-byte logical blocks: (30.8 GB/28.7 GiB)', 'systemd[1]: Mounted /media/student/STUDENT_USB.', 'systemd[1]: Starting Cleanup of Temporary Directories...', 'gnome-shell[1403]: Window manager warning: Overwriting existing binding', 'systemd-resolved[601]: Clock change detected. Flushing caches.', 'kernel: [UFW BLOCK] IN=enp0s3 OUT= SRC=203.0.113.9 DST=192.168.1.42 PROTO=TCP DPT=23', 'sudo: student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/apt update'];
        return lines.map((l, i) => { const d = new Date(base + i * 190000); return TX.MON[d.getMonth()] + ' ' + String(d.getDate()).padStart(2) + ' ' + TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds()) + ' ' + (m.net.hostname) + ' ' + l; }).join('\n') + '\n';
      },
    };
  }

  // ------------------------------------------------------------ Machine
  // Each kind of computer is described once here; new computers (MS-DOS, Solaris, FreeBSD, UNIX V7) register
  // themselves with TX.defineMachine from their own files.
  const KINDS = (TX.MACHINE_KINDS = TX.MACHINE_KINDS || {});
  TX.defineMachine = (kind, d) => { KINDS[kind] = d; NET[kind] = d.net; HW[kind] = d.hw; DISKS[kind] = d.disks || []; };
  KINDS.linux = { build: buildLinux, procs: LINUX_PROCS, services: LINUX_SERVICES, users: ['root', 'student', 'teacher'], installed: ['git', 'curl', 'nano', 'vim', 'htop', 'python3', 'wget'], home: ['home', 'student'], ci: false };
  KINDS.mac = { build: buildMac, procs: MAC_PROCS, services: LINUX_SERVICES, users: ['root', 'student', 'teacher'], installed: ['git', 'curl', 'nano', 'vim', 'python3', 'net-tools', 'traceroute'], home: ['Users', 'student'], ci: true };
  KINDS.windows = { build: buildWindows, procs: WIN_PROCS, services: WIN_SERVICES, users: ['student', 'Administrator', 'Guest', 'DefaultAccount', 'WDAGUtilityAccount'], installed: ['git', 'curl', 'nano', 'vim', 'python3', 'node'], home: ['C:', 'Users', 'student'], ci: true };

  class Machine {
    constructor(kind, savedRoot) {
      const d = KINDS[kind];
      if (!d) throw new Error('Unknown machine kind: ' + kind);
      this.kind = kind; // linux | mac | windows | dos | solaris | freebsd | unix
      this.def = d;
      this.family = d.family || (kind === 'windows' || kind === 'dos' ? 'windows' : 'unix');
      this.hw = HW[kind];
      this.net = Object.assign({}, NET[kind]);
      this.disks = JSON.parse(JSON.stringify(DISKS[kind] || []));
      this.boot = Date.now() - 1000 * 60 * TX.randInt(90, 60 * 30);
      this.procs = d.procs();
      this.nextPid = Math.max(...this.procs.map((p) => p.pid)) + 100;
      this.services = d.services();
      this.users = d.users.slice();
      this.installed = new Set(d.installed);
      const root = savedRoot || d.build();
      this.vfs = new TX.VFS(root, { ci: d.ci, gens: null });
      this.vfs.gens = d.gens ? d.gens(this) : gens(kind, this);
      this.home = d.home.slice();
      this.extra = d.extra ? d.extra() : {};
      this.env = {};
      this.memCache = null;
    }
    memory() {
      const total = this.hw.memTotal;
      const used = Math.floor(total * (0.38 + Math.random() * 0.04));
      const cache = Math.floor(total * 0.22), buffers = Math.floor(total * 0.02);
      return { total, used, free: total - used - cache - buffers, cache, buffers, avail: total - used, swapTotal: this.hw.swap || 2097148, swapUsed: 0, shared: Math.floor(total * 0.03) };
    }
    load() { const b = 0.4 + this.procs.reduce((a, p) => a + p.cpu, 0) / 40; return [b + Math.random() * 0.3, b * 0.9, b * 0.8]; }
    tickProcs() { this.procs.forEach((p) => { p.cpu = Math.max(0, (p.cpu || 0) * 0.6 + (Math.random() < 0.3 ? Math.random() * (p.user === 'root' ? 1.5 : 6) : 0)); }); }
    spawn(name, extra = {}) { const p = Object.assign({ pid: this.nextPid++, name, cmd: name, user: 'student', cpu: 0.1, rss: TX.randInt(3000, 90000), vsz: TX.randInt(10000, 400000), stat: 'S', start: TX.p2(new Date().getHours()) + ':' + TX.p2(new Date().getMinutes()), tty: 'pts/0' }, extra); this.procs.push(p); return p; }
    kill(pid) { const i = this.procs.findIndex((p) => p.pid === pid); if (i < 0) return false; this.procs.splice(i, 1); return true; }
  }
  TX.Machine = Machine;
  TX.machineGens = gens;
  TX.mkProcs = mkProcs;
  TX.SAMPLE = { README, HELLO_PY, GROCERIES, GRADES, POEM, SECRET, TODO, projectFiles };
  TX.HW = HW;
  TX.DISKS = DISKS;

  // hosts known to the mock internet
  TX.DNS = {
    'google.com': ['142.250.72.14', '2607:f8b0:4004:c1b::64'], 'www.google.com': ['142.250.72.36'],
    'github.com': ['140.82.112.3'], 'api.github.com': ['140.82.112.6'], 'example.com': ['93.184.215.14', '2606:2800:21f:cb07:6820:80da:af6b:8b2c'], 'www.example.com': ['93.184.215.14'],
    'wikipedia.org': ['208.80.154.224'], 'en.wikipedia.org': ['208.80.154.224'], 'cloudflare.com': ['104.16.132.229'], 'one.one.one.one': ['1.1.1.1'],
    'microsoft.com': ['20.70.246.20'], 'apple.com': ['17.253.144.10'], 'ubuntu.com': ['185.125.190.20'], 'archive.ubuntu.com': ['91.189.91.82'],
    'collegeboard.org': ['104.18.12.33'], 'apstudents.collegeboard.org': ['104.18.13.33'], 'code.org': ['52.84.150.18'], 'khanacademy.org': ['151.101.1.195'],
    'youtube.com': ['142.250.64.78'], 'amazon.com': ['205.251.242.103'], 'openai.com': ['104.18.33.45'], 'anthropic.com': ['160.79.104.10'], 'claude.ai': ['160.79.104.10'],
    'wttr.in': ['5.9.243.187'], 'ifconfig.me': ['34.160.111.145'], 'localhost': ['127.0.0.1'], 'router.lan': ['192.168.1.1'], 'fcps.edu': ['198.51.100.50'], 'forsyth.k12.ga.us': ['198.51.100.60'],
    'ubuntu-lab': ['192.168.1.42'], 'ubuntu-lab.lan': ['192.168.1.42'], 'macbook-pro.lan': ['192.168.1.57'], 'desktop-lab42': ['192.168.1.105'], 'desktop-lab42.lan': ['192.168.1.105'],
    '8.8.8.8': ['8.8.8.8'], '1.1.1.1': ['1.1.1.1'], '192.168.1.1': ['192.168.1.1'], '127.0.0.1': ['127.0.0.1'],
  };
  TX.resolve = (host) => {
    host = String(host).toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    if (TX.DNS[host]) return TX.DNS[host][0];
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
    return null;
  };
  TX.latency = (host) => {
    const ip = TX.resolve(host) || '';
    if (ip.startsWith('127.')) return TX.rand(0.02, 0.08);
    if (ip.startsWith('192.168.')) return TX.rand(0.5, 3.5);
    if (/github|google|cloudflare|1\.1\.1\.1|8\.8\.8\.8/.test(host)) return TX.rand(9, 22);
    return TX.rand(18, 70);
  };
  // hop list for traceroute
  TX.hops = (host) => {
    const ip = TX.resolve(host);
    const base = [['router.lan', '192.168.1.1', 1], ['10.20.0.1', '10.20.0.1', 6], ['ae-4.core1.atl.comcast.net', '68.86.94.21', 10], ['be-3104-cs01.atlanta.ga.ibone.comcast.net', '96.110.40.25', 12], ['ix-ae-12.atlanta.level3.net', '4.68.110.93', 14]];
    if (!ip) return null;
    if (ip.startsWith('192.168.') || ip.startsWith('127.')) return [[host, ip, TX.latency(host)]];
    const n = 5 + (host.length % 4);
    const hops = base.slice(0, Math.min(base.length, n - 1)).map(([h, i, l]) => [h, i, l + Math.random() * 3]);
    if (n > 6) hops.push(['*', '*', 0]);
    hops.push([host, ip, TX.latency(host) + 3]);
    return hops;
  };

  // mock HTTP responses
  TX.http = (url) => {
    const u = String(url).replace(/^https?:\/\//, '');
    const host = u.split('/')[0].toLowerCase(), path = '/' + u.split('/').slice(1).join('/');
    if (!TX.resolve(host)) return null;
    if (host === 'wttr.in') {
      const t = TX.randInt(68, 84);
      return { status: 200, type: 'text/plain', body: `Weather report: Cumming, Georgia\n\n     \\  /       Partly cloudy\n   _ /"".-.     ${t}(${t + 3}) °F\n     \\_(   ).   ↗ 7 mph\n     /(___(__)  9 mi\n                0.0 in\n` };
    }
    if (host === 'ifconfig.me') return { status: 200, type: 'text/plain', body: '73.184.22.197' };
    if (host === 'api.github.com') {
      if (path.startsWith('/users/')) { const name = path.split('/')[2] || 'octocat'; return { status: 200, type: 'application/json', body: JSON.stringify({ login: name, id: 583231, type: 'User', name: name === 'octocat' ? 'The Octocat' : name, public_repos: TX.randInt(3, 40), followers: TX.randInt(10, 20000), created_at: '2011-01-25T18:44:36Z' }, null, 2) }; }
      return { status: 200, type: 'application/json', body: JSON.stringify({ current_user_url: 'https://api.github.com/user', repository_url: 'https://api.github.com/repos/{owner}/{repo}', user_url: 'https://api.github.com/users/{user}' }, null, 2) };
    }
    if (/joke/.test(path) || host === 'icanhazdadjoke.com') return { status: 200, type: 'text/plain', body: TX.pick(['Why do programmers prefer dark mode? Because light attracts bugs.', 'There are 10 kinds of people: those who understand binary and those who don\'t.', 'I would tell you a UDP joke, but you might not get it.']) };
    const title = host.replace(/^www\./, '');
    return { status: 200, type: 'text/html', body: `<!doctype html>\n<html>\n<head>\n    <title>${title}</title>\n    <meta charset="utf-8" />\n</head>\n<body>\n<div>\n    <h1>${title}</h1>\n    <p>This is a simulated response from ${host}${path} inside TerminalEX.</p>\n    <p>No real network traffic left your browser.</p>\n</div>\n</body>\n</html>\n` };
  };
})();
