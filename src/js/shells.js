/* TerminalEX — the list of shells students can open, and how to start each one.
 * Shared by the app, the sandbox (cheat sheet ▶ Run, certification tests) and the test suite. */
(function () {
  'use strict';
  const TX = window.TX;

  // era: today | windows | retro  (how the home page groups them)
  const SHELLS = {
    bash: { label: 'Ubuntu', sub: 'bash 5.2 · Ubuntu 24.04 LTS', machine: 'linux', os: 'linux', theme: 'ubuntu', font: "'Ubuntu Mono', 'DejaVu Sans Mono', 'Liberation Mono', monospace", fontScale: 1.12, badge: '$_', color: '#E95420', era: 'today', year: 1991,
      blurb: 'Linux runs most of the internet: web servers, the cloud, Android, supercomputers.' },
    zsh: { label: 'macOS', sub: 'zsh 5.9 · macOS Sequoia 15', machine: 'mac', os: 'mac', theme: 'macos', font: "'SF Mono', Menlo, Monaco, monospace", fontScale: 1, badge: '%', color: '#A2AAAD', era: 'today', year: 2001,
      blurb: 'A certified UNIX underneath. Its command line comes from BSD.' },
    freebsd: { label: 'FreeBSD', sub: 'sh · FreeBSD 14.1-RELEASE', machine: 'freebsd', os: 'bsd', theme: 'freebsd', font: "'DejaVu Sans Mono', 'Liberation Mono', Menlo, Consolas, monospace", fontScale: 1, badge: '😈', color: '#AB2B28', era: 'today', year: 1993,
      blurb: 'Berkeley UNIX, still alive. Runs Netflix\'s video servers and the PlayStation 5.' },
    solaris: { label: 'Solaris', sub: 'ksh93 · Oracle Solaris 11.4', machine: 'solaris', os: 'solaris', theme: 'solaris', font: "'DejaVu Sans Mono', 'Liberation Mono', Menlo, Consolas, monospace", fontScale: 1, badge: '☀', color: '#F29111', era: 'today', year: 1992,
      blurb: 'Sun Microsystems\' UNIX for big servers. Gave the world ZFS, zones and DTrace.' },
    cmd: { label: 'Command Prompt', sub: 'cmd.exe · Windows 11', machine: 'windows', os: 'windows', theme: 'campbell', font: "'Cascadia Mono', Consolas, 'Lucida Console', monospace", fontScale: 1, badge: 'C:\\', color: '#9E9E9E', era: 'windows', year: 1993,
      blurb: 'The grandchild of MS-DOS. Still on every Windows PC.' },
    powershell: { label: 'Windows PowerShell', sub: 'PowerShell 5.1 · Windows 11', machine: 'windows', os: 'windows', theme: 'powershell', font: "'Cascadia Mono', Consolas, 'Lucida Console', monospace", fontScale: 1, badge: '>_', color: '#2671BE', era: 'windows', year: 2006,
      blurb: 'Pipes objects instead of text. How Windows is managed at work.' },
    pwsh: { label: 'PowerShell 7', sub: 'pwsh 7.4 · cross-platform', machine: 'windows', os: 'windows', theme: 'campbell', font: "'Cascadia Mono', Consolas, 'Lucida Console', monospace", fontScale: 1, badge: '❯_', color: '#5391FE', era: 'windows', year: 2016,
      blurb: 'Open-source PowerShell that also runs on Linux and macOS.' },
    gitbash: { label: 'Git Bash', sub: 'MINGW64 · Git for Windows 2.46', machine: 'windows', os: 'gitbash', theme: 'mintty', font: "Consolas, 'Lucida Console', 'Cascadia Mono', monospace", fontScale: 1, badge: '◆', color: '#F05032', era: 'windows', year: 2007,
      blurb: 'bash and git on Windows. Linux commands on a C: drive.' },
    dos: { label: 'MS-DOS', sub: 'COMMAND.COM · MS-DOS 6.22 (1994)', machine: 'dos', os: 'dos', theme: 'dos', font: "'Px437 IBM VGA8', 'Perfect DOS VGA 437', 'Lucida Console', Consolas, 'Courier New', monospace", fontScale: 1.05, badge: 'A>', color: '#00A8A8', era: 'retro', year: 1981,
      blurb: 'One user, one program at a time, 8.3 file names, 640K of memory. Where cmd.exe came from.' },
    unix: { label: 'UNIX V7', sub: 'Bourne sh · Bell Labs, 1979 · PDP-11', machine: 'unix', os: 'tty', theme: 'teletype', font: "'Courier New', Courier, 'Liberation Mono', monospace", fontScale: 1.05, badge: '#', color: '#C8B88A', era: 'retro', year: 1979,
      blurb: 'The ancestor of Linux, macOS, FreeBSD and Solaris. No arrow keys, no tab, no colors.' },
  };
  // Lesson tracks: pwsh shares PowerShell's track.
  const TRACK = (kind) => (kind === 'pwsh' ? 'powershell' : kind);
  const ORDER = ['bash', 'zsh', 'freebsd', 'solaris', 'cmd', 'powershell', 'pwsh', 'gitbash', 'dos', 'unix'];
  // keyboard shortcut Alt+N opens ORDER[N-1]; Alt+0 opens the tenth
  const ERAS = [['today', 'UNIX & Linux today'], ['windows', 'Windows'], ['retro', 'Retro computers']];

  function makeShell(kind, session, m, opts = {}) {
    switch (kind) {
      case 'bash': return new TX.PosixShell(session, m, 'bash', opts);
      case 'zsh': return new TX.PosixShell(session, m, 'zsh', opts);
      case 'gitbash': return new TX.PosixShell(session, m, 'gitbash', opts);
      case 'freebsd': return new TX.PosixShell(session, m, 'sh', opts);
      case 'solaris': return new TX.PosixShell(session, m, 'ksh', opts);
      case 'unix': return new TX.PosixShell(session, m, 'v7', opts);
      case 'cmd': return new TX.CmdShell(session, m, opts);
      case 'powershell': return new TX.PowerShell(session, m, opts);
      case 'pwsh': return new TX.PowerShell(session, m, Object.assign({ pwsh: true }, opts));
      case 'dos': return new TX.DosShell(session, m, opts);
    }
    return null;
  }

  TX.SHELLS = SHELLS;
  TX.SHELL_ORDER = ORDER;
  TX.SHELL_ERAS = ERAS;
  TX.trackOf = TRACK;
  TX.makeShell = makeShell;
})();
