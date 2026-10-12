/* TerminalEX — missions for the four new computers: MS-DOS 6.22, UNIX V7, Oracle Solaris 11.4 and FreeBSD 14.1.
 * Same format as missions.js: each one is checked automatically after every command the student types. */
(function () {
  'use strict';
  const TX = window.TX;
  const H = TX.missions.H;
  const node = (c, segs) => c.vfs.get(segs);

  // MS-DOS ------------------------------------------------------------------------------------
  const ST = ['C:', 'STUDENT'];
  const dos = [
    { id: 'd-ver', title: 'What year is it?', xp: 10, text: 'Ask the computer which version of MS-DOS it is running.', hint: 'The command is three letters: VERsion.', answer: 'VER', check: (c) => H.ran(c, /^ver\b/i) },
    { id: 'd-dir', title: 'Wide listing', xp: 10, text: 'List the files in C:\\ in the WIDE format, five names per row.', hint: 'DIR takes a switch. DOS switches start with a slash: /W', answer: 'DIR /W', check: (c) => H.ran(c, /^dir\b.*\/w/i) },
    { id: 'd-cd', title: 'Your folder', xp: 10, text: 'Move into the STUDENT directory.', hint: 'CD means change directory.', answer: 'CD STUDENT', check: (c) => H.ran(c, /^(cd|chdir)\s*(c:)?\\?student\\?$/i) },
    { id: 'd-hidden', title: 'The hidden file', xp: 15, text: 'There is a hidden file in C:\\STUDENT. Show hidden files, then print the secret file.', hint: 'DIR /A shows files with ALL attributes, even hidden ones. Then TYPE the file.', answer: 'TYPE SECRET.TXT', check: (c) => H.ran(c, /^dir\b.*\/a/i) && H.ran(c, /^type\s+.*secret\.txt/i) },
    { id: 'd-83', title: 'Eight dot three', xp: 15, text: 'Make a directory called MYHOMEWORK2026 inside STUDENT. Then list the folder. What did DOS actually name it — and why?', hint: 'MD MYHOMEWORK2026 then DIR. DOS names can only be 8 characters plus a 3-letter extension.', answer: 'MD MYHOMEWORK2026', check: (c) => H.isDir(c, ST.concat('MYHOMEWO')) },
    { id: 'd-copycon', title: 'Write a file the 1994 way', xp: 20, text: 'With no editor at all, create C:\\STUDENT\\NOTES.TXT using COPY CON. Type a line or two, then a line with just ^Z.', hint: 'COPY CON NOTES.TXT copies from the CONsole (your keyboard) into the file. Finish with ^Z (or F6) and Enter.', answer: 'COPY CON NOTES.TXT', check: (c) => H.fileHas(c, ST.concat('NOTES.TXT'), /\S/) },
    { id: 'd-pipe', title: 'Sorted shopping list', xp: 20, text: 'Send GROCERY.TXT through SORT and save the result as SORTED.TXT, in one command.', hint: 'TYPE GROCERY.TXT | SORT > SORTED.TXT   — the pipe | and the redirect > came to DOS from UNIX.', answer: 'TYPE GROCERY.TXT | SORT > SORTED.TXT', check: (c) => H.fileHas(c, ST.concat('SORTED.TXT'), /^apples\napples\nbananas/) },
    { id: 'd-find', title: 'Find a word', xp: 15, text: 'Show every line of GROCERY.TXT that contains "coffee".', hint: 'FIND "coffee" GROCERY.TXT   — the quotes are required in DOS.', answer: 'FIND "coffee" GROCERY.TXT', check: (c) => H.ran(c, /^find\s+(\/\w\s+)*"coffee"/i) },
    { id: 'd-doskey', title: 'Get your arrow keys back', xp: 15, text: 'Press the up arrow. Nothing! In 1994 you had to load a program to get command history. Load it.', hint: 'The program is DOSKEY.', answer: 'DOSKEY', check: (c) => H.ran(c, /^doskey\b/i) },
    { id: 'd-prompt', title: 'Change your prompt', xp: 15, text: 'Make the prompt show the time before the folder. (Then type PROMPT $P$G to put it back.)', hint: 'PROMPT codes: $T = time, $P = path, $G = the > sign.', answer: 'PROMPT $T $P$G', check: (c) => H.ran(c, /^prompt\s+.*\$t/i) },
    { id: 'd-attrib', title: 'Lock a file', xp: 20, text: 'Make POEM.TXT read-only, then try to DEL it. What happens?', hint: 'ATTRIB +R POEM.TXT sets the Read-only attribute.', answer: 'ATTRIB +R POEM.TXT', check: (c) => { const n = node(c, ST.concat('POEM.TXT')); return !!n && !!n.ro && H.ran(c, /^(del|erase)\s+.*poem/i); } },
    { id: 'd-undelete', title: 'Oops — UNDELETE', xp: 25, text: 'Delete TODO.TXT, then get it back with UNDELETE. (DOS only erased the first letter of the name!)', hint: 'DEL TODO.TXT, then UNDELETE, answer Y and type T.', answer: 'UNDELETE', check: (c) => H.ran(c, /^undelete\b/i) && !!node(c, ST.concat('TODO.TXT')) },
    { id: 'd-bat', title: 'Your first batch file', xp: 25, text: 'Create a batch file called HI.BAT that ECHOes a message, then run it by typing HI.', hint: 'ECHO ECHO Hi there! > HI.BAT   then   HI', answer: 'ECHO ECHO Hi there! > HI.BAT', check: (c) => H.fileHas(c, ST.concat('HI.BAT'), /echo/i) && H.ran(c, /^hi(\.bat)?$/i) },
    { id: 'd-floppy', title: 'Save it to a floppy', xp: 20, text: 'Put a floppy disk in drive A: (type INSERT), then copy GRADES.CSV onto it.', hint: 'INSERT, then COPY GRADES.CSV A:', answer: 'COPY GRADES.CSV A:', check: (c) => !!node(c, ['A:', 'GRADES.CSV']) },
    { id: 'd-path', title: 'Where do programs live?', xp: 20, text: 'Show the PATH. Then find MEM.EXE in one of those folders with DIR.', hint: 'PATH shows the list. DIR C:\\DOS\\MEM.EXE', answer: 'PATH', check: (c) => H.ran(c, /^path$/i) && H.ran(c, /^dir\s+.*mem/i) },
  ];

  // UNIX V7 -------------------------------------------------------------------------------------
  const UH = ['usr', 'student'];
  const v7 = [
    { id: 'u-ls', title: 'Hello, 1979', xp: 10, text: 'List the files in your home directory. Notice: one name per line, no colors.', hint: 'ls', answer: 'ls', check: (c) => H.ran(c, /^ls\b/) },
    { id: 'u-who', title: 'Who is logged in?', xp: 10, text: 'UNIX was built for many people sharing one computer. See who else is on.', hint: 'who', answer: 'who', check: (c) => H.ran(c, /^who\b/) },
    { id: 'u-mail', title: 'You have mail', xp: 15, text: 'The login message said "You have mail". Read it.', hint: 'mail', answer: 'mail', check: (c) => H.ran(c, /^mail$/) },
    { id: 'u-cat', title: 'Read a file', xp: 10, text: 'Print Documents/poem.txt.', hint: 'cat Documents/poem.txt', answer: 'cat Documents/poem.txt', check: (c) => H.ran(c, /^cat\s+.*poem/) },
    { id: 'u-pipe', title: 'Pipes were invented here', xp: 20, text: 'Doug McIlroy added pipes to UNIX in 1973. Count the unique items in groceries.txt with sort, uniq and wc joined by pipes.', hint: 'sort groceries.txt | uniq | wc -l', answer: 'sort groceries.txt | uniq | wc -l', check: (c) => H.ran(c, /sort.*\|\s*uniq.*\|\s*wc/) },
    { id: 'u-grep', title: 'grep was born here too', xp: 15, text: 'Show only the lines of groceries.txt that contain "apple".', hint: 'grep apple groceries.txt  (the name comes from the ed command g/re/p: global, regular expression, print)', answer: 'grep apple groceries.txt', check: (c) => H.ran(c, /^grep\s+.*apple/) },
    { id: 'u-ed', title: 'The standard editor', xp: 30, text: 'Use ed to create a file called notes with one line of text. (a to append, a line with only . to stop, w to write, q to quit.)', hint: 'ed notes  →  a  →  type a line  →  .  →  w  →  q', answer: 'ed notes', check: (c) => H.fileHas(c, UH.concat('notes'), /\S/) },
    { id: 'u-backquote', title: 'Backquotes', xp: 15, text: 'Print "Today is" followed by the date, using command substitution the 1979 way.', hint: 'echo Today is `date`   — the key is ` (backquote), not \' (quote). $( ) did not exist yet.', answer: 'echo Today is `date`', check: (c) => H.ran(c, /`date`/) },
    { id: 'u-home', title: 'No ~ yet', xp: 15, text: 'Go to the root directory /, then come back home WITHOUT typing ~ (that came later from Berkeley).', hint: 'cd /   then   cd $HOME   (or just cd)', answer: 'cd $HOME', check: (c) => H.ran(c, /^cd\s+\/$/) && H.ran(c, /^cd(\s+\$HOME)?$/) },
    { id: 'u-sendmail', title: 'Email, 1979 style', xp: 20, text: 'Send a message to dmr (Dennis Ritchie, co-creator of UNIX and C). End your message with a line that is just a period.', hint: 'mail dmr   →  type your message  →  .', answer: 'mail dmr', check: (c) => H.fileHas(c, ['usr', 'spool', 'mail', 'dmr'], /From student/) },
    { id: 'u-chmod', title: 'Permissions were invented here', xp: 20, text: 'Make groceries.txt readable and writable only by you (rw-------), then check with ls -l.', hint: 'chmod 600 groceries.txt', answer: 'chmod 600 groceries.txt', check: (c) => { const n = node(c, UH.concat('groceries.txt')); return !!n && (n.mode & 0o777) === 0o600; } },
    { id: 'u-fortune', title: 'Games in /usr/games', xp: 10, text: 'Run the fortune program in /usr/games.', hint: '/usr/games/fortune', answer: '/usr/games/fortune', check: (c) => H.ran(c, /fortune/) },
  ];

  // Solaris -------------------------------------------------------------------------------------
  const SH = ['export', 'home', 'student'];
  const sol = [
    { id: 's-uname', title: 'What machine is this?', xp: 10, text: 'Print everything uname knows. Solaris still calls itself SunOS 5.11 — and the CPU is not an Intel chip.', hint: 'uname -a', answer: 'uname -a', check: (c) => H.ran(c, /^uname\s+-a/) },
    { id: 's-release', title: 'Which Solaris?', xp: 10, text: 'Print the file that names the exact Solaris release.', hint: 'cat /etc/release', answer: 'cat /etc/release', check: (c) => H.ran(c, /^(cat|more|less|head)\s+\/etc\/release/) },
    { id: 's-cpu', title: 'Count the CPUs', xp: 15, text: 'How many processors does this SPARC server have? Ask psrinfo.', hint: 'psrinfo -pv  (p = physical, v = verbose)', answer: 'psrinfo -pv', check: (c) => H.ran(c, /^psrinfo/) },
    { id: 's-svcs', title: 'Something is broken', xp: 20, text: 'Solaris\' Service Management Facility can explain broken services. Ask it which services have a problem.', hint: 'svcs -x', answer: 'svcs -x', check: (c) => H.ran(c, /^svcs\s+-x/) },
    { id: 's-log', title: 'Read the service log', xp: 20, text: 'svcs -x pointed at a log file. Read it to find the typo in the configuration.', hint: 'cat /var/svc/log/application-print-cups:default.log', answer: 'cat /var/svc/log/application-print-cups:default.log', check: (c) => H.ran(c, /(cat|tail|more|less|head)\s+.*cups.*\.log/) },
    { id: 's-clear', title: 'Fix the service', xp: 25, text: 'Pretend you fixed the typo. Clear the maintenance state so cups starts again. Services belong to root, so use pfexec.', hint: 'pfexec svcadm clear cups', answer: 'pfexec svcadm clear cups', check: (c) => (c.m.services || []).some((s) => /cups/.test(s.fmri) && s.state === 'online') },
    { id: 's-prstat', title: 'Who is hogging the CPU?', xp: 20, text: 'Find the process using the most CPU with prstat, then stop it with kill.', hint: 'prstat 1 1  shows one screen. The java process is yours (student), so  kill 1188  works without root.', answer: 'kill 1188', check: (c) => H.ran(c, /^prstat/) && H.procGone(c, 'java') },
    { id: 's-zfs', title: 'ZFS datasets', xp: 15, text: 'List the ZFS file systems. Your home directory is one of them.', hint: 'zfs list', answer: 'zfs list', check: (c) => H.ran(c, /^(pfexec\s+)?zfs\s+list/) },
    { id: 's-snap', title: 'Take a snapshot', xp: 25, text: 'Take a ZFS snapshot of your home directory called safe. (A snapshot is an instant, free copy of the files as they are right now.)', hint: 'pfexec zfs snapshot rpool/export/home/student@safe', answer: 'pfexec zfs snapshot rpool/export/home/student@safe', check: (c) => ((c.m.extra && c.m.extra.snaps) || []).some((s) => s.name === 'rpool/export/home/student@safe') },
    { id: 's-rollback', title: 'Undo a disaster', xp: 30, text: 'Delete groceries.txt on purpose. Then roll your home directory back to the safe snapshot and check the file is back.', hint: 'rm groceries.txt  →  pfexec zfs rollback rpool/export/home/student@safe  →  ls', answer: 'pfexec zfs rollback rpool/export/home/student@safe', check: (c) => H.ran(c, /zfs\s+rollback/) && !!node(c, SH.concat('groceries.txt')) },
    { id: 's-zones', title: 'Computers inside the computer', xp: 20, text: 'Solaris zones are separate little Solaris systems sharing one kernel (the idea behind containers like Docker). List all of them.', hint: 'zoneadm list -cv', answer: 'zoneadm list -cv', check: (c) => H.ran(c, /^(pfexec\s+)?zoneadm\s+list/) },
    { id: 's-pkg', title: 'Install software', xp: 20, text: 'Install the tree package with the Image Packaging System, then run tree.', hint: 'pfexec pkg install tree   then   tree', answer: 'pfexec pkg install tree', check: (c) => H.installed(c, 'tree') && H.ran(c, /^tree\b/) },
    { id: 's-messages', title: 'Where are the logs?', xp: 15, text: 'Linux keeps its main log in /var/log. Solaris keeps it somewhere else. Look at the last lines of /var/adm/messages.', hint: 'tail /var/adm/messages', answer: 'tail /var/adm/messages', check: (c) => H.ran(c, /\/var\/adm\/messages/) },
  ];

  // FreeBSD -------------------------------------------------------------------------------------
  const BH = ['home', 'student'];
  const bsd = [
    { id: 'b-version', title: 'Which FreeBSD?', xp: 10, text: 'FreeBSD has its own command to print the version. Run it, then compare with uname -a.', hint: 'freebsd-version', answer: 'freebsd-version', check: (c) => H.ran(c, /^freebsd-version/) },
    { id: 'b-rcconf', title: 'One file to configure them all', xp: 15, text: 'FreeBSD turns services on and off in one file: /etc/rc.conf. Read it.', hint: 'cat /etc/rc.conf', answer: 'cat /etc/rc.conf', check: (c) => H.ran(c, /(cat|less|more|head)\s+\/etc\/rc\.conf/) },
    { id: 'b-sudo', title: 'No sudo here', xp: 15, text: 'Try sudo ls. FreeBSD does not include sudo! Become root the classic way instead.', hint: 'su   (root\'s password in TerminalEX is student). Type exit to stop being root.', answer: 'su', check: (c) => H.ran(c, /^sudo\b/) && H.ran(c, /^su(\s+-)?$/) },
    { id: 'b-pkg', title: 'Install a package', xp: 20, text: 'As root, install cowsay with pkg, then make the cow say something.', hint: 'su  →  pkg install cowsay  →  exit  →  cowsay hello', answer: 'pkg install cowsay', check: (c) => H.installed(c, 'cowsay') && H.ran(c, /^cowsay\b/) },
    { id: 'b-ports', title: 'Build it from source', xp: 30, text: 'The Ports Collection builds programs from source code. As root, build and install sl from /usr/ports/games/sl.', hint: 'su  →  cd /usr/ports/games/sl  →  make install clean', answer: 'make install clean', check: (c) => H.installed(c, 'sl') && H.ran(c, /^make\b.*install/) },
    { id: 'b-service', title: 'Is the web server running?', xp: 15, text: 'Check whether nginx is running.', hint: 'service nginx status', answer: 'service nginx status', check: (c) => H.ran(c, /^service\s+nginx\s+status/) },
    { id: 'b-sysrc', title: 'Turn on the firewall at boot', xp: 25, text: 'As root, use sysrc to set pf_enable to YES in /etc/rc.conf.', hint: 'su  →  sysrc pf_enable=YES', answer: 'sysrc pf_enable=YES', check: (c) => H.fileHas(c, ['etc', 'rc.conf'], /pf_enable="YES"/i) },
    { id: 'b-sysctl', title: 'Ask the kernel', xp: 15, text: 'sysctl reads settings straight from the running kernel. Ask for the CPU model (hw.model).', hint: 'sysctl hw.model', answer: 'sysctl hw.model', check: (c) => H.ran(c, /^sysctl\s+(-n\s+)?hw\.model/) },
    { id: 'b-ps', title: 'BSD-style ps', xp: 20, text: 'List every process the BSD way, find the Minecraft server you left running, and stop it.', hint: 'ps aux  (no dash!) then  kill 1240', answer: 'kill 1240', check: (c) => H.ran(c, /^ps\s+-?aux/) && H.procGone(c, 'minecraft') },
    { id: 'b-jails', title: 'Jails', xp: 15, text: 'FreeBSD jails (from 1999) are a much older cousin of containers. List the running jails.', hint: 'jls', answer: 'jls', check: (c) => H.ran(c, /^jls/) },
    { id: 'b-zfs', title: 'ZFS on FreeBSD', xp: 25, text: 'As root, snapshot your home directory dataset (zroot/home/student) with a name you choose.', hint: 'su  →  zfs snapshot zroot/home/student@monday', answer: 'zfs snapshot zroot/home/student@monday', check: (c) => ((c.m.extra && c.m.extra.snaps) || []).some((s) => s.name.startsWith('zroot/home/student@')) },
    { id: 'b-dmesg', title: 'Who plugged in a USB stick?', xp: 20, text: 'Search the kernel messages for the USB disk da0.', hint: 'dmesg | grep da0', answer: 'dmesg | grep da0', check: (c) => H.ran(c, /^dmesg\s*\|\s*grep/) },
  ];
  void BH;

  Object.assign(TX.missions.tracks, {
    dos: { name: 'MS-DOS', list: dos },
    unix: { name: 'UNIX V7', list: v7 },
    solaris: { name: 'Solaris', list: sol },
    freebsd: { name: 'FreeBSD', list: bsd },
  });
})();
