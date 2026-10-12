/* TerminalEX — lessons (groups of missions with a guide and a certification test) and the history of the command line. */
(function () {
  'use strict';
  const TX = window.TX;

  // Each lesson: practice missions (checked automatically) → 📖 guide → certification test → certificate.
  // shell = the terminal to open; missions = ids from missions.js / missions-more.js (any track).
  const LIST = [
    { id: 'linux', n: 1, title: 'Linux Foundations', shell: 'bash', icon: '🐧', missions: ['l-pwd', 'l-ls', 'l-secret', 'l-mkdir', 'l-write', 'l-cp', 'l-pipe', 'l-grep', 'l-find', 'l-sudo', 'l-apt', 'l-script', 'l-proc', 'l-net', 'l-disk'],
      skills: ['Navigate the file system with pwd, ls and cd', 'Create, copy, move and delete files', 'Chain commands with pipes and redirects', 'Search with grep and find', 'Use sudo and apt safely', 'Manage processes'],
      guide: {
        why: 'Linux runs about 96% of the world\'s top web servers, every Android phone, most of the cloud and all of the top 500 supercomputers. Every IT, cybersecurity and software job expects you to be comfortable at a bash prompt.',
        vocab: [['shell', 'the program that reads your commands and runs them (bash, zsh, ksh, cmd, PowerShell)', 'bash is the shell on Ubuntu'], ['current directory', 'the folder you are "in"; relative paths start here', 'pwd prints it'], ['path', 'directions to a file: absolute from / or relative from here', '/home/student/Documents vs Documents'], ['flag / option', 'a dash-letter that changes what a command does', 'ls -a shows hidden files'], ['pipe |', 'sends one command\'s output into the next command', 'sort groceries.txt | uniq'], ['redirect > >>', '> saves output to a file (replacing it); >> adds to the end', 'echo hi > hi.txt'], ['root / sudo', 'root is the all-powerful admin account; sudo runs ONE command as root', 'sudo apt install cowsay'], ['process / PID', 'a running program and its ID number', 'kill 2011']],
        traps: ['Linux is case-sensitive: Documents and documents are different folders.', '> REPLACES a file. Use >> to add to it.', 'rm has no Recycle Bin. rm -r on the wrong folder is permanent.', 'Spaces in names break commands: use quotes, "my file.txt".', 'sudo asks for YOUR password (student here), and types nothing on screen while you type it — that is normal.'],
      } },
    { id: 'mac', n: 2, title: 'macOS & zsh', shell: 'zsh', icon: '🍎', missions: ['m-pwd', 'm-ls', 'm-sw', 'm-disk', 'm-brew', 'm-say', 'm-pb', 'm-mkdir', 'm-grep', 'm-ssh', 'm-git'],
      skills: ['Use zsh, the default Mac shell', 'Install software with Homebrew', 'Use Mac-only commands (open, say, pbcopy, sw_vers, diskutil)', 'Connect to another computer with ssh'],
      guide: {
        why: 'Under the friendly desktop, macOS is a certified UNIX built on BSD. Developers love Macs because the same commands work on the Mac and on the Linux servers they deploy to.',
        vocab: [['zsh', 'the Z shell: macOS\'s default since 2019 (it used bash before)', 'echo $SHELL'], ['Homebrew', 'the most popular package manager for Mac', 'brew install cowsay'], ['/Users', 'where Mac home folders live (Linux uses /home)', '/Users/student'], ['open', 'opens a file or folder in its Mac app', 'open .'], ['clipboard', 'pbcopy and pbpaste connect the terminal to copy/paste', 'cat poem.txt | pbcopy']],
        traps: ['macOS commands come from BSD, so some flags differ from Linux (sed -i needs \'\' on a Mac).', 'macOS file names are case-insensitive but case-preserving: README and readme are the same file.', 'The root account is disabled. Use sudo.'],
      } },
    { id: 'cmd', n: 3, title: 'Windows Command Prompt', shell: 'cmd', icon: '🪟', missions: ['c-dir', 'c-hidden', 'c-cd', 'c-md', 'c-echo', 'c-ip', 'c-ping', 'c-task', 'c-kill', 'c-bat', 'c-color', 'c-diskpart', 'c-for'],
      skills: ['Navigate drives and folders with cd and dir', 'Read network settings with ipconfig and ping', 'Manage tasks with tasklist and taskkill', 'Write batch files with FOR loops'],
      guide: {
        why: 'cmd.exe is on every Windows PC, and help-desk and IT-support work still uses it daily: ipconfig, ping, tasklist and batch files fix real problems fast.',
        vocab: [['drive letter', 'each disk gets a letter: C: is usually Windows, D: and E: are other disks or USB drives', 'D:'], ['switch', 'Windows options start with / instead of -', 'dir /a'], ['batch file', 'a .bat file full of commands that run in order', 'hello.bat'], ['%VAR%', 'how cmd reads a variable', 'echo %USERNAME%'], ['ipconfig', 'shows your IP address, gateway and DNS', 'ipconfig /all']],
        traps: ['cmd paths use backslashes: C:\\Users\\student.', 'cd D:\\Games does NOT switch drives — type D: first (or cd /d).', 'In a batch file, FOR variables need two percent signs: %%f.', 'File names are not case-sensitive.'],
      } },
    { id: 'ps', n: 4, title: 'PowerShell', shell: 'powershell', icon: '💠', missions: ['p-loc', 'p-gci', 'p-gm', 'p-new', 'p-var', 'p-top', 'p-where', 'p-csv', 'p-disk', 'p-net', 'p-func', 'p-stop', 'p-help', 'p-script'],
      skills: ['Use Verb-Noun cmdlets', 'Filter and sort OBJECTS in the pipeline', 'Work with CSV data', 'Write functions and scripts'],
      guide: {
        why: 'PowerShell is how Windows servers, Microsoft 365 and Azure are managed at work. Its big idea — passing objects, not text — makes data jobs much easier.',
        vocab: [['cmdlet', 'a PowerShell command named Verb-Noun', 'Get-Process'], ['object', 'data with named properties instead of plain text', '(Get-Item poem.txt).Length'], ['pipeline', '| passes whole objects to the next cmdlet', 'Get-Process | Sort-Object CPU'], ['$_', 'the current object inside Where-Object / ForEach-Object', 'Where-Object { $_.CPU -gt 10 }'], ['alias', 'a short name for a cmdlet', 'ls → Get-ChildItem']],
        traps: ['Comparison uses -eq -gt -lt, not == > <.', 'Scripts need .\\ to run from the current folder: .\\sysinfo.ps1', 'Execution policy may block scripts until you allow them.', 'ls and dir work, but their options are PowerShell options, not Linux or cmd ones.'],
      } },
    { id: 'git', n: 5, title: 'Git Bash & Version Control', shell: 'gitbash', icon: '🌿', missions: ['g-where', 'g-config', 'g-clone', 'g-branch', 'g-commit', 'g-log', 'g-push', 'l-git1', 'l-git2'],
      skills: ['Use bash on Windows', 'Configure git', 'Clone, branch, commit and merge', 'Push to a (pretend) GitHub'],
      guide: {
        why: 'Every software team in the world uses git. Being able to commit, branch and merge from the command line is expected in any coding job or internship.',
        vocab: [['repository', 'a project folder whose history git tracks', 'git init'], ['commit', 'a saved snapshot with a message', 'git commit -m "Add page"'], ['branch', 'a separate line of work', 'git switch -c dark-mode'], ['merge', 'joining a branch back in', 'git merge dark-mode'], ['remote', 'the copy on a server such as GitHub', 'git push origin main']],
        traps: ['git add BEFORE git commit — commit only saves what is staged.', 'Write commit messages that say WHY.', 'A merge conflict is normal: edit the file, remove the <<<<<<< markers, add, commit.'],
      } },
    { id: 'freebsd', n: 6, title: 'FreeBSD: Berkeley UNIX Today', shell: 'freebsd', icon: '😈', missions: ['b-version', 'b-rcconf', 'b-sudo', 'b-pkg', 'b-ports', 'b-service', 'b-sysrc', 'b-sysctl', 'b-ps', 'b-jails', 'b-zfs', 'b-dmesg'],
      skills: ['Become root with su', 'Install from packages AND from source (ports)', 'Control services with service and rc.conf', 'Use BSD-style ps, sysctl and jails'],
      guide: {
        why: 'FreeBSD descends straight from the Berkeley UNIX of 1977. It runs Netflix\'s video servers, the PlayStation 4 and 5 operating systems, and much of the internet\'s plumbing. macOS borrowed many of its tools.',
        vocab: [['BSD', 'Berkeley Software Distribution: the UNIX made at UC Berkeley', 'FreeBSD, OpenBSD, NetBSD, macOS'], ['ports', 'recipes to build 34,000 programs from source', 'cd /usr/ports/games/sl && make install'], ['rc.conf', 'the one file that decides which services start at boot', 'sshd_enable="YES"'], ['jail', 'an isolated mini-system with its own IP (1999)', 'jls'], ['su', '"substitute user": become root with root\'s password', 'su']],
        traps: ['There is no sudo until you install it — use su.', 'ps aux works, ps -ef does not (BSD vs System V).', 'Starting a service needs NAME_enable="YES" in rc.conf, or use onestart.'],
      } },
    { id: 'solaris', n: 7, title: 'Solaris: The Big-Iron UNIX', shell: 'solaris', icon: '☀️', missions: ['s-uname', 's-release', 's-cpu', 's-svcs', 's-log', 's-clear', 's-prstat', 's-zfs', 's-snap', 's-rollback', 's-zones', 's-pkg', 's-messages'],
      skills: ['Diagnose and repair services with svcs and svcadm', 'Find resource hogs with prstat', 'Snapshot and roll back with ZFS', 'Understand zones (containers) and pfexec'],
      guide: {
        why: 'Sun Microsystems\' Solaris ran banks, airlines and stock exchanges, and still does. It invented ideas you will meet everywhere: ZFS snapshots, zones (the idea behind Docker containers) and DTrace.',
        vocab: [['SPARC', 'Sun\'s own CPU family — not Intel/AMD', 'uname -p → sparc'], ['SMF', 'Service Management Facility: services with states online / disabled / maintenance', 'svcs -x'], ['ZFS', 'file system + volume manager with instant snapshots', 'zfs snapshot pool/fs@name'], ['zone', 'a separate Solaris system sharing one kernel', 'zoneadm list -cv'], ['pfexec', 'run one command with your role\'s extra rights', 'pfexec svcadm restart ssh']],
        traps: ['Logs live in /var/adm and /var/svc/log, not /var/log.', 'ps -ef, not ps aux.', 'A service in "maintenance" stays down until you fix it AND run svcadm clear.', 'Rolling back a snapshot throws away everything newer — on purpose.'],
      } },
    { id: 'unix', n: 8, title: 'UNIX V7: Where It All Began (1979)', shell: 'unix', icon: '📠', missions: ['u-ls', 'u-who', 'u-mail', 'u-cat', 'u-pipe', 'u-grep', 'u-ed', 'u-backquote', 'u-home', 'u-sendmail', 'u-chmod', 'u-fortune'],
      skills: ['Work with only the original UNIX tools', 'Edit files with ed, the line editor', 'Use pipes, grep and permissions where they were invented', 'Explain which modern features did not exist yet'],
      guide: {
        why: 'Ken Thompson and Dennis Ritchie\'s UNIX is the ancestor of Linux, macOS, Android, iOS, FreeBSD and Solaris. Using the real 1979 toolset shows you which ideas are 45 years old (pipes, grep, permissions, "everything is a file") — and why they lasted.',
        vocab: [['Bell Labs', 'AT&T\'s research lab in New Jersey where UNIX and C were created', '1969–1979'], ['PDP-11', 'the DEC minicomputer UNIX ran on: a cabinet, not a desk', 'mem = 177856 (bytes!)'], ['ed', 'the line editor: no screen, you type commands', 'ed notes, a, ., w, q'], ['backquotes', 'run a command inside another (later: $( ))', 'echo Today is `date`'], ['teletype', 'a terminal that printed on paper', 'why commands are short: ls, cp, mv']],
        traps: ['No arrow keys, no Tab, no history: you type everything.', 'No ~ for home — use $HOME or plain cd.', 'No head, less, sudo, uname or nano. Ask: "what did people do instead?"', 'ed prints just ? when confused: type h to see why.'],
      } },
    { id: 'dos', n: 9, title: 'MS-DOS 6.22: The PC Era (1994)', shell: 'dos', icon: '💾', missions: ['d-ver', 'd-dir', 'd-cd', 'd-hidden', 'd-83', 'd-copycon', 'd-pipe', 'd-find', 'd-doskey', 'd-prompt', 'd-attrib', 'd-undelete', 'd-bat', 'd-floppy', 'd-path'],
      skills: ['Use COMMAND.COM and 8.3 file names', 'Explain PATH by watching DOS search it', 'Write and run batch files', 'Explain why cmd.exe looks the way it does'],
      guide: {
        why: 'MS-DOS made Microsoft and put a computer on millions of desks in the 1980s and 90s. Windows\' Command Prompt is its grandchild: DIR, CD, COPY, /W, C:\\ and batch files all come from here.',
        vocab: [['8.3 name', 'up to 8 letters, a dot, and a 3-letter extension', 'GROCERY.TXT'], ['COMMAND.COM', 'the DOS shell', 'C:\\COMMAND.COM'], ['AUTOEXEC.BAT', 'a batch file that runs every time the PC starts', 'PROMPT $P$G'], ['PATH', 'the folders DOS searches for .COM .EXE .BAT programs', 'PATH C:\\DOS;C:\\WINDOWS'], ['640K', 'the memory DOS programs had to fit in', 'MEM']],
        traps: ['"Bad command or file name" means DOS could not find a program with that name on the PATH.', 'Long names are silently cut to 8.3: MYHOMEWORK2026 becomes MYHOMEWO.', 'No & or && on one line.', 'No arrow-key history until you run DOSKEY.'],
      } },
    { id: 'automation', n: 10, title: 'Automation Lab: Scripts & Data', shell: 'bash', icon: '🤖', missions: ['a-hello', 'a-read', 'a-report', 'a-save', 'a-chain', 'a-data', 'a-clean', 'a-organize', 'a-pipeline', 'a-own'],
      skills: ['Run Python scripts with arguments', 'Feed scripts CSV data files', 'Save, chain and log script output', 'Write a small shell script that runs other scripts'],
      guide: {
        why: 'Most "automation" at work is not writing big programs — it is running the right script on the right file at the right time, saving the result, and chaining steps together. This lab gives you ready-made scripts so you can practice exactly that.',
        vocab: [['script', 'a text file of instructions a program runs', 'grade_report.py'], ['argument', 'extra words after the command that the script reads', 'python3 hello.py Ada'], ['CSV', 'comma-separated values: a spreadsheet saved as plain text', 'data/grades.csv'], ['exit code', '0 means success; anything else means failure. && checks it', 'python3 a.py && echo ok'], ['pipeline', 'several steps that run one after another', 'bash run_all.sh'], ['cron', 'the UNIX scheduler that runs jobs at set times', '0 7 * * * bash run_all.sh']],
        traps: ['Run scripts from the folder they expect (cd ~/automation first), or give full paths.', '> replaces a file, >> appends — appending to a CSV with > erases the data.', 'Read a script before you run it: cat it first.', 'On Windows the command is python, and paths use \\.'],
      } },
    { id: 'raid', n: 11, title: 'Disks & RAID', shell: 'bash', icon: '🗄️', missions: ['r-disks', 'r-mirror', 'r-mount', 'r-fail', 'r-rebuild', 'r-ps-disk', 'r-ps-pool', 'r-dp', 'r-zmirror'],
      skills: ['List disks and partitions on Linux, Windows and Solaris', 'Bring a disk online (Set-Disk, diskpart)', 'Build RAID 1 mirrors with mdadm, Storage Spaces, diskpart and ZFS', 'Survive and repair a failed disk'],
      guide: {
        why: 'Disks fail — every one, eventually. RAID lets a server keep running when a disk dies. Setting up and checking disks and arrays is everyday work for system administrators.',
        vocab: [['RAID 0 (stripe)', 'data split across disks: fast and big, no safety', '2 × 1 TB = 2 TB'], ['RAID 1 (mirror)', 'the same data on two disks: survives one failure', '2 × 1 TB = 1 TB'], ['RAID 5 (parity)', '3+ disks; parity info rebuilds any one lost disk', '3 × 1 TB = 2 TB'], ['degraded', 'an array missing a disk: still working, no longer safe', '[_U] in /proc/mdstat'], ['rebuild', 'copying data onto a replacement disk', 'mdadm --add'], ['mount', 'attach a file system to a folder', 'mount /dev/md0 /mnt/raid']],
        traps: ['RAID is NOT a backup: deleting a file deletes it on both disks instantly.', 'Double-check device names before creating arrays — the wrong disk is erased. (TerminalEX protects the system disks; the real world does not.)', 'A new disk needs a file system (mkfs / format) before you can save files on it.'],
      } },
    { id: 'history', n: 12, title: 'History & Lineage of the Terminal', shell: 'unix', icon: '🌳', missions: [], history: true,
      skills: ['Trace Linux, macOS, FreeBSD and Solaris back to UNIX', 'Trace PowerShell and cmd back to MS-DOS and CP/M', 'Explain where pipes, shells and package managers came from', 'Match commands across families'],
      guide: {
        why: 'Once you see the family tree, the command line stops looking like random spells. ls and dir, grep and findstr, sudo and pfexec are cousins with a shared history — learning one family makes the others easy.',
        vocab: [['UNIX family', 'UNIX (1969) → BSD and System V → Linux, macOS, FreeBSD, Solaris', 'ls, grep, /'], ['DOS family', 'CP/M (1974) → MS-DOS (1981) → cmd.exe → PowerShell', 'DIR, C:\\, /?'], ['POSIX', 'a 1988 standard so UNIX-like systems behave alike', 'why bash scripts run almost anywhere'], ['open source', 'code anyone can read and share', 'Linux (1991), FreeBSD (1993)'], ['shell', 'the command-line interface itself — and it can be swapped', 'sh, csh, ksh, bash, zsh']],
        traps: ['Linux is not a UNIX descendant by code — it was rewritten from scratch to behave like UNIX.', 'macOS is a certified UNIX; Windows is not (but WSL runs real Linux).', 'PowerShell came from the Windows side but now runs on Linux and macOS too.'],
      } },
  ];

  // ------------------------------------------------------------------ the family tree
  // x = column (0..), y = year. kids are drawn as lines. shell = the TerminalEX tab to open.
  const HISTORY = [
    { id: 'multics', year: 1965, name: 'Multics', fam: 'unix', x: 1, text: 'A giant time-sharing project (MIT, GE, Bell Labs). Too big and too slow — Bell Labs walked away in 1969, and two of its people built something small instead.' },
    { id: 'unix', year: 1969, name: 'UNIX', fam: 'unix', x: 1, parents: ['multics'], text: 'Ken Thompson writes a tiny OS on a spare PDP-7. Dennis Ritchie joins; by 1973 it is rewritten in their new language, C — so it can move to other computers.' },
    { id: 'pipes', year: 1973, name: 'Pipes', fam: 'idea', x: 2, parents: ['unix'], text: 'Doug McIlroy\'s idea, added in a single night: connect programs with | so small tools combine into big jobs.' },
    { id: 'v7', year: 1979, name: 'UNIX V7', fam: 'unix', x: 1, parents: ['unix'], shell: 'unix', text: 'Seventh Edition: the Bourne shell, awk, tar, make. The last "pure" research UNIX shared widely — the ancestor of almost every UNIX that followed.' },
    { id: 'bsd', year: 1977, name: 'BSD', fam: 'bsd', x: 0, parents: ['unix'], text: 'UC Berkeley students add vi, the C shell (csh, with ~ and history), job control and — in 1983 — the TCP/IP code that became the internet\'s backbone.' },
    { id: 'sysv', year: 1983, name: 'System V', fam: 'sysv', x: 2, parents: ['v7'], text: 'AT&T\'s commercial UNIX. Gave the world ps -ef, init run-levels and the shell functions you write today.' },
    { id: 'ksh', year: 1983, name: 'Korn shell', fam: 'idea', x: 3, parents: ['sysv'], text: 'David Korn\'s ksh adds $( ), [[ ]], arithmetic and command-line editing. bash and zsh borrowed heavily from it.' },
    { id: 'sunos', year: 1982, name: 'SunOS', fam: 'bsd', x: 0, parents: ['bsd'], text: 'Sun Microsystems\' BSD-based UNIX for its workstations. Sun\'s motto: "The network is the computer."' },
    { id: 'solaris', year: 1992, name: 'Solaris', fam: 'sysv', x: 2, parents: ['sysv', 'sunos'], shell: 'solaris', text: 'Sun moves to System V and renames it Solaris (SunOS 5). Later invents ZFS, zones and DTrace. Oracle bought Sun in 2010.' },
    { id: 'gnu', year: 1983, name: 'GNU', fam: 'linux', x: 4, parents: [], text: 'Richard Stallman starts writing a free UNIX-like system: gcc, bash (1989), coreutils. It has everything except a kernel...' },
    { id: 'linux', year: 1991, name: 'Linux', fam: 'linux', x: 4, parents: ['gnu'], shell: 'bash', text: 'Linus Torvalds, a 21-year-old student in Finland, writes a kernel "just a hobby, won\'t be big". GNU + Linux = a complete free system. Ubuntu arrives in 2004.' },
    { id: 'freebsd', year: 1993, name: 'FreeBSD', fam: 'bsd', x: 0, parents: ['bsd'], shell: 'freebsd', text: 'The free continuation of Berkeley UNIX. Powers Netflix\'s servers and the PlayStation.' },
    { id: 'macos', year: 2001, name: 'Mac OS X', fam: 'bsd', x: 1, parents: ['freebsd'], shell: 'zsh', text: 'Apple rebuilds the Mac on NeXTSTEP and FreeBSD code. Every Mac — and iPhone — is a UNIX underneath. zsh became the default in 2019.' },
    { id: 'android', year: 2008, name: 'Android', fam: 'linux', x: 5, parents: ['linux'], text: 'The Linux kernel in your pocket: billions of devices.' },
    { id: 'cpm', year: 1974, name: 'CP/M', fam: 'dos', x: 6, parents: [], text: 'Gary Kildall\'s OS for early microcomputers: drive letters (A:), DIR, TYPE, and 8.3 file names.' },
    { id: 'msdos', year: 1981, name: 'MS-DOS', fam: 'dos', x: 6, parents: ['cpm'], shell: 'dos', text: 'Microsoft buys QDOS (a CP/M look-alike) and ships it with the IBM PC. Version 2.0 (1983) borrows UNIX ideas: folders, pipes and > redirects — but with \\ instead of /.' },
    { id: 'windows', year: 1985, name: 'Windows', fam: 'dos', x: 7, parents: ['msdos'], text: 'Windows 1.0–3.11 and 95/98 were programs that started from DOS. Typing WIN at C:\\> launched them.' },
    { id: 'winnt', year: 1993, name: 'Windows NT & cmd.exe', fam: 'dos', x: 6, parents: ['msdos'], shell: 'cmd', text: 'A brand-new Windows core (not DOS) with cmd.exe, which keeps DOS commands working. Every Windows since XP is NT.' },
    { id: 'powershell', year: 2006, name: 'PowerShell', fam: 'dos', x: 7, parents: ['winnt', 'ksh'], shell: 'powershell', text: 'Jeffrey Snover\'s "Monad": a shell that pipes objects, not text. Borrowed ideas from UNIX shells and went open-source and cross-platform in 2016 (pwsh).' },
    { id: 'gitbash', year: 2007, name: 'Git Bash', fam: 'linux', x: 5, parents: ['linux', 'winnt'], shell: 'gitbash', text: 'Git for Windows bundles bash and UNIX tools so git works the same everywhere: the UNIX family moving onto Windows.' },
    { id: 'wsl', year: 2016, name: 'WSL', fam: 'linux', x: 6, parents: ['linux', 'winnt'], text: 'Windows Subsystem for Linux: real Linux inside Windows. The two families finally live on one computer.' },
  ];
  const FAMILIES = { unix: ['#C8B88A', 'Research UNIX'], bsd: ['#AB2B28', 'BSD family'], sysv: ['#F29111', 'System V family'], linux: ['#E95420', 'GNU / Linux'], dos: ['#2671BE', 'CP/M → DOS → Windows'], idea: ['#8a8f98', 'Big ideas'] };

  TX.lessons = {
    LIST, HISTORY, FAMILIES,
    byId: (id) => LIST.find((l) => l.id === id),
    ofMission: (mid) => LIST.find((l) => l.missions.includes(mid)),
    mission(mid) { for (const k of Object.keys(TX.missions.tracks)) { const m = TX.missions.tracks[k].list.find((x) => x.id === mid); if (m) return Object.assign({ track: k }, m); } return null; },
  };
})();
