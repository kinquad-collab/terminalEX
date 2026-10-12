/* TerminalEX — manual pages and help screens for MS-DOS, UNIX V7, Solaris and FreeBSD. */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;
  const add = TX.docs.add;

  // [name, summary, synopsis, description, options, examples, see also]
  [
    ['svcs', 'report service status (Solaris SMF)', 'svcs [-a | -x | -l FMRI]', 'Lists the services managed by the Service Management Facility (SMF) and their state: online, disabled or maintenance. -x explains every service that has a problem and where its log file is. Linux\'s nearest equivalent is systemctl.', [['-a', 'show all services, including disabled ones'], ['-x', 'explain services that are not running and why'], ['-l FMRI', 'long details for one service']], [['svcs', 'running services'], ['svcs -x', 'what is broken, and where is its log?'], ['svcs -l ssh', 'details about the ssh service']], 'svcadm, prstat'],
    ['svcadm', 'manipulate service instances (Solaris SMF)', 'svcadm enable|disable|restart|refresh|clear SERVICE', 'Starts, stops and repairs SMF services. clear takes a service out of the maintenance state after you fix the problem. Needs root: use pfexec or sudo.', [], [['pfexec svcadm restart ssh', 'restart the ssh server'], ['pfexec svcadm clear cups', 'clear a service in maintenance']], 'svcs'],
    ['prstat', 'report active process statistics (Solaris)', 'prstat [INTERVAL [COUNT]]', 'Solaris\' version of top: processes sorted by CPU use, refreshed every few seconds. prstat 1 1 prints one screen and exits.', [], [['prstat', 'live view (Ctrl+C to stop)'], ['prstat 1 1', 'one snapshot']], 'ps, top, kill'],
    ['psrinfo', 'display information about processors (Solaris)', 'psrinfo [-p] [-v]', 'Lists the processors. -p counts physical chips; -pv describes each chip and its cores and hardware threads.', [], [['psrinfo -pv', 'what CPU is this?']], 'prtdiag, isainfo'],
    ['zfs', 'configure ZFS file systems', 'zfs list | create | snapshot | rollback | destroy | get | set', 'ZFS (from Sun, 2005) combines a file system and a volume manager. Snapshots are instant, free copies of a dataset as it is right now; rollback returns the dataset to a snapshot. Used on Solaris, FreeBSD and many Linux servers.', [['list [-t snapshot|all]', 'list datasets (and snapshots)'], ['snapshot DATASET@NAME', 'take a snapshot'], ['rollback DATASET@NAME', 'go back to a snapshot'], ['get PROPERTY DATASET', 'read a setting such as compression']], [['zfs list', 'every file system'], ['pfexec zfs snapshot rpool/export/home/student@safe', 'snapshot your home (Solaris)'], ['zfs list -t snapshot', 'list snapshots']], 'zpool'],
    ['zpool', 'configure ZFS storage pools', 'zpool list | status | scrub POOL', 'A pool is the set of disks ZFS stores data on. status shows the disks and any errors; scrub reads every block to check it.', [], [['zpool status', 'health of the disks']], 'zfs'],
    ['zoneadm', 'administer zones (Solaris)', 'zoneadm list -cv | -z ZONE boot|halt|reboot', 'Zones are separate Solaris systems that share one kernel — the idea later used by containers like Docker.', [], [['zoneadm list -cv', 'all zones and their state'], ['pfexec zoneadm -z testzone boot', 'start a zone']], 'zlogin, zonename'],
    ['zlogin', 'enter a zone (Solaris)', 'zlogin ZONE [COMMAND]', 'Opens a root shell inside a running zone, or runs one command there.', [], [['pfexec zlogin webzone', 'enter the web zone']], 'zoneadm'],
    ['beadm', 'manage boot environments (Solaris)', 'beadm list | create NAME | activate NAME', 'A boot environment is a bootable copy of the whole system. Solaris upgrades into a new one, so a bad upgrade can be undone by booting the old one.', [], [['beadm list', 'show boot environments']], 'zfs'],
    ['pfexec', 'run a command with your profile\'s privileges (Solaris)', 'pfexec COMMAND [ARGS]', 'Runs one command with the extra rights your role or profile gives you. On Solaris it plays the part sudo plays on Linux.', [], [['pfexec svcadm restart ssh', '']], 'sudo, roles, profiles'],
    ['pkg', 'install, update and remove software packages', 'pkg install|uninstall|delete|search|info|list|update NAME', 'On Solaris this is the Image Packaging System (IPS); on FreeBSD it is pkg(8), which installs pre-built packages. Both need root.', [], [['pfexec pkg install tree', 'Solaris'], ['pkg search cowsay', 'FreeBSD: find a package'], ['pkg install cowsay', 'FreeBSD (as root)']], 'make (ports), apt, brew'],
    ['ipadm', 'configure IP interfaces (Solaris)', 'ipadm show-addr | show-if', 'Shows and sets IP addresses. Replaces ifconfig for configuration on Solaris 11.', [], [['ipadm show-addr', 'my IP addresses']], 'dladm, ifconfig'],
    ['dladm', 'configure data links (Solaris)', 'dladm show-link | show-phys', 'Shows the network links: physical ports and virtual NICs.', [], [['dladm show-phys', 'network cards']], 'ipadm'],
    ['dtrace', 'dynamic tracing (Solaris, FreeBSD, macOS)', 'dtrace -l | -n \'PROBE { ACTION }\'', 'Watches what a running system is doing — every system call, function or disk read — without stopping it. Invented at Sun in 2003.', [], [['pfexec dtrace -n \'syscall:::entry { @[execname] = count(); }\'', 'which programs make the most system calls?']], 'prstat'],
    ['freebsd-version', 'print the version of FreeBSD', 'freebsd-version [-kru]', 'Prints the version of the installed userland (-u), installed kernel (-k) or running kernel (-r).', [], [['freebsd-version -kru', '']], 'uname'],
    ['service', 'control system services', 'service NAME start|stop|restart|status|enable', 'On FreeBSD, runs the rc.d script for a service. A service only starts at boot if NAME_enable="YES" is in /etc/rc.conf.', [], [['service nginx status', ''], ['service sshd restart', 'as root']], 'sysrc, rc.conf'],
    ['sysrc', 'safely edit /etc/rc.conf (FreeBSD)', 'sysrc NAME=VALUE | NAME | -a', 'Reads or changes settings in /etc/rc.conf, the file that decides what FreeBSD starts at boot.', [], [['sysrc -a', 'show every setting'], ['sysrc pf_enable=YES', 'start the firewall at boot (as root)']], 'service'],
    ['sysctl', 'get or set kernel state', 'sysctl [-n] NAME | -a', 'Reads values straight from the running kernel: CPU model, memory, hostname, network settings.', [], [['sysctl hw.model', 'CPU name'], ['sysctl -n hw.ncpu', 'number of CPUs']], 'uname'],
    ['jls', 'list jails (FreeBSD)', 'jls', 'Lists running jails. A jail (FreeBSD, 1999) is an isolated mini-system with its own files, users and IP address.', [], [['jls', '']], 'jexec'],
    ['jexec', 'run a command inside a jail (FreeBSD)', 'jexec JAIL [COMMAND]', 'Runs a command, or a shell, inside a jail. Needs root.', [], [['jexec web sh', 'enter the web jail']], 'jls'],
    ['make', 'build programs (and FreeBSD ports)', 'make [-C DIR] [TARGET...]', 'Runs the build steps in a Makefile. In the FreeBSD Ports Collection, "make install clean" downloads, compiles and installs a program from source.', [], [['cd /usr/ports/games/sl && make install clean', 'as root']], 'pkg'],
    ['ed', 'the standard text editor', 'ed [FILE]', 'A line editor from 1969: no screen, just commands. a appends lines (end with a line containing only .), p prints, n prints with numbers, d deletes, s/old/new/ substitutes, w writes, q quits. When ed is confused it prints ? — type h to see why.', [['a', 'append text after the current line'], ['1,$p', 'print every line'], ['s/old/new/', 'substitute on the current line'], ['w', 'write the file'], ['q', 'quit']], [['ed notes', 'edit the file notes']], 'sed, vi'],
    ['mail', 'send and read mail (UNIX V7)', 'mail [USER]', 'With no user, prints your mail. With a user, sends a message: type it, then a line with only a period. In 1979 this was email between people on the same computer.', [], [['mail', 'read your mail'], ['mail dmr', 'write to Dennis Ritchie']], 'write, who'],
    ['write', 'write to another user\'s terminal', 'write USER', 'Types straight onto someone else\'s screen — the first chat.', [], [], 'mail, who'],
    ['moo', 'guessing game (UNIX V7 /usr/games)', 'moo', 'Guess the secret 4-digit number. Bulls are right digits in the right place, cows are right digits in the wrong place.', [], [], 'fortune'],
  ].forEach(add);

  // ------------------------------------------------------------------ per-OS help screens
  const OS_CATS = {
    solaris: [['Solaris only', ['svcs', 'svcadm', 'prstat', 'psrinfo', 'prtconf', 'prtdiag', 'isainfo', 'zfs', 'zpool', 'zoneadm', 'zlogin', 'zonename', 'beadm', 'pkg', 'ipadm', 'dladm', 'pfexec', 'roles', 'profiles', 'ptree', 'pargs', 'pwdx', 'format', 'dtrace']]],
    freebsd: [['FreeBSD only', ['freebsd-version', 'pkg', 'service', 'sysrc', 'sysctl', 'kldstat', 'pciconf', 'camcontrol', 'gpart', 'jls', 'jexec', 'sockstat', 'zfs', 'zpool', 'freebsd-update', 'make']]],
  };
  const baseHelp = TX.docs.posixHelp;
  TX.docs.posixHelp = function (sh) {
    const k = sh.m.kind;
    if (k === 'unix') {
      const names = [...sh.m.def.allow].filter((n) => sh.available(n)).sort();
      const L = [C.bold('UNIX Seventh Edition (1979) — TerminalEX'), C.dim('These are the commands that existed. Many you know (less, head, nano, sudo, uname, history) did not exist yet.'), ''];
      const shown = names.filter((n) => n !== 'reset-machine');
      for (let i = 0; i < shown.length; i += 10) L.push('  ' + shown.slice(i, i + 10).map((n) => n.padEnd(8)).join(''));
      L.push(C.dim('  (and the TerminalEX helper reset-machine)'));
      L.push('', C.dim('No arrow-key history, no Tab completion, no ~, no $( ). Use `backquotes`. The editor is ed. Type man NAME for help.'));
      return L.join('\n') + '\n';
    }
    if (!OS_CATS[k]) return baseHelp(sh);
    const L = [C.bold(k === 'solaris' ? 'ksh93 on Oracle Solaris 11.4 (SPARC) — TerminalEX' : '/bin/sh on FreeBSD 14.1 — TerminalEX'), C.dim('Commands available here. Type  man NAME  for details.'), ''];
    OS_CATS[k].concat(TX.docs.CATS.filter(([cat]) => !/macOS|Windows/.test(cat))).forEach(([cat, names]) => {
      const avail = names.filter((n) => TX.posixCmds[n] && sh.available(n));
      if (avail.length) L.push(C.style(['bold', 'cyan'], cat.padEnd(18)) + avail.join('  '));
    });
    L.push('', C.dim(k === 'solaris' ? 'Become root for one command with  pfexec  (or sudo). The root password is: student' : 'There is no sudo: become root with  su  (password: student), then  exit  when done.'));
    return L.join('\n') + '\n';
  };

  // ------------------------------------------------------------------ MS-DOS HELP
  const DOS = {
    attrib: ['Displays or changes file attributes.', 'ATTRIB [+R | -R] [+A | -A] [+S | -S] [+H | -H] [filename]\n\n  +   Sets an attribute.      -   Clears an attribute.\n  R   Read-only file attribute.\n  A   Archive file attribute.\n  S   System file attribute.\n  H   Hidden file attribute.'],
    cd: ['Displays the name of or changes the current directory.', 'CHDIR [drive:][path]\nCHDIR[..]\nCD [drive:][path]\nCD[..]\n\n  ..   Specifies that you want to change to the parent directory.\n\nType CD drive: to display the current directory in the specified drive.\nType CD without parameters to display the current drive and directory.'],
    choice: ['Waits for you to choose one of a set of choices (in batch files).', 'CHOICE [/C[:]choices] [text]\n\nERRORLEVEL is set to the position of the key you press: 1 for the first, 2 for the second...'],
    cls: ['Clears the screen.', 'CLS'],
    copy: ['Copies one or more files to another location.', 'COPY source [destination]\nCOPY CON filename     (type text, end with Ctrl+Z / F6)\nCOPY file1+file2 file3   (joins files)\n\n  /Y   Suppresses prompting to confirm you want to overwrite a file.'],
    date: ['Displays or sets the date.', 'DATE [date]'],
    defrag: ['Reorganizes the files on a disk to optimize the disk.', 'DEFRAG [drive:]'],
    del: ['Deletes one or more files.', 'DEL [drive:][path]filename [/P]\nERASE [drive:][path]filename [/P]\n\n  /P   Prompts for confirmation before deleting each file.\n\nDEL *.* asks "Are you sure (Y/N)?" first.'],
    deltree: ['Deletes a directory and all the subdirectories and files in it.', 'DELTREE [/Y] [drive:]path\n\n  /Y   Suppresses prompting to confirm you want to delete the subdirectory.'],
    dir: ['Displays a list of files and subdirectories in a directory.', 'DIR [drive:][path][filename] [/P] [/W] [/A[[:]attribs]] [/O[[:]sortorder]] [/S] [/B] [/L]\n\n  /P   Pauses after each screenful of information.\n  /W   Uses wide list format.\n  /A   Displays files with specified attributes (D directories, H hidden, S system, R read-only).\n  /O   List by files in sorted order (N name, E extension, D date, S size, G directories first; - reverses).\n  /S   Displays files in specified directory and all subdirectories.\n  /B   Uses bare format (no heading information or summary).\n  /L   Uses lowercase.'],
    doskey: ['Edits command lines, recalls MS-DOS commands, and creates macros.', 'DOSKEY [/REINSTALL] [/HISTORY] [macroname=[text]]\n\nAfter DOSKEY is loaded, UP ARROW and DOWN ARROW recall commands.'],
    echo: ['Displays messages, or turns command-echoing on or off.', 'ECHO [ON | OFF]\nECHO [message]\nECHO.     (prints an empty line)'],
    edit: ['Starts MS-DOS Editor, which creates and changes ASCII files.', 'EDIT [[drive:][path]filename]'],
    fc: ['Compares two files and displays the differences between them.', 'FC file1 file2'],
    fdisk: ['Configures a hard disk for use with MS-DOS.', 'FDISK'],
    find: ['Searches for a text string in a file or files.', 'FIND [/V] [/C] [/N] [/I] "string" [[drive:][path]filename[ ...]]\n\n  /V   Displays all lines NOT containing the specified string.\n  /C   Displays only the count of lines containing the string.\n  /N   Displays line numbers with the displayed lines.\n  /I   Ignores the case of characters when searching for the string.'],
    for: ['Runs a specified command for each file in a set of files.', 'FOR %variable IN (set) DO command\n\nUse %%variable in a batch file.'],
    format: ['Formats a disk for use with MS-DOS.', 'FORMAT drive:\n\n(TerminalEX only formats the floppy in A:.)'],
    goto: ['Directs MS-DOS to a labelled line in a batch program.', 'GOTO label'],
    help: ['Provides help information for MS-DOS commands.', 'HELP [command]'],
    if: ['Performs conditional processing in batch programs.', 'IF [NOT] ERRORLEVEL number command\nIF [NOT] string1==string2 command\nIF [NOT] EXIST filename command'],
    label: ['Creates, changes, or deletes the volume label of a disk.', 'LABEL [drive:][label]'],
    md: ['Creates a directory.', 'MKDIR [drive:]path\nMD [drive:]path'],
    mem: ['Displays the amount of used and free memory in your system.', 'MEM [/C]\n\n  /C   Lists the programs that are loaded into memory.'],
    more: ['Displays output one screen at a time.', 'MORE < [drive:][path]filename\ncommand-name | MORE'],
    move: ['Moves files and renames files and directories.', 'MOVE [drive:][path]filename[,...] destination'],
    path: ['Displays or sets a search path for executable files.', 'PATH [[drive:]path[;...]]\n\nMS-DOS looks in the current directory, then in each PATH directory, for .COM, .EXE and .BAT files.'],
    pause: ['Suspends processing of a batch program and displays the message "Press any key to continue...."', 'PAUSE'],
    prompt: ['Changes the MS-DOS command prompt.', 'PROMPT [text]\n\n  $P  Current drive and path      $G  > (greater-than sign)\n  $N  Current drive                $T  Current time\n  $D  Current date                 $V  MS-DOS version number\n  $_  Carriage return and linefeed $$  $ (dollar sign)\n\nType PROMPT without parameters to reset the prompt to the default (C>).'],
    rd: ['Removes (deletes) an empty directory.', 'RMDIR [drive:]path\nRD [drive:]path'],
    rem: ['Records comments (remarks) in a batch file.', 'REM [comment]'],
    ren: ['Renames a file or files.', 'RENAME [drive:][path]filename1 filename2\nREN [drive:][path]filename1 filename2\n\nWildcards work: REN *.TXT *.BAK'],
    scandisk: ['Checks a drive for errors and repairs any problems it finds.', 'SCANDISK [drive:]'],
    set: ['Displays, sets, or removes MS-DOS environment variables.', 'SET [variable=[string]]'],
    sort: ['Reads input, sorts data, and writes the results to the screen, a file, or another device.', 'SORT [/R] [[drive1:][path1]filename1] [> [drive2:][path2]filename2]\n[command |] SORT [/R] [> [drive2:][path2]filename2]\n\n  /R   Reverses the sort order.'],
    time: ['Displays or sets the system time.', 'TIME [time]'],
    tree: ['Graphically displays the directory structure of a drive or path.', 'TREE [drive:][path] [/F] [/A]\n\n  /F   Displays the names of the files in each directory.\n  /A   Uses ASCII instead of extended characters.'],
    type: ['Displays the contents of a text file.', 'TYPE [drive:][path]filename'],
    undelete: ['Restores files which have been deleted.', 'UNDELETE [[drive:][path]filename]\n\nMS-DOS marks a deleted file by replacing the first letter of its name, so UNDELETE asks you for that letter.'],
    ver: ['Displays the MS-DOS version.', 'VER'],
    vol: ['Displays a disk volume label and serial number, if they exist.', 'VOL [drive:]'],
    xcopy: ['Copies files (except hidden and system files) and directory trees.', 'XCOPY source [destination] [/S] [/E]\n\n  /S   Copies directories and subdirectories except empty ones.\n  /E   Copies any subdirectories, even if empty.'],
  };
  DOS.chdir = DOS.cd; DOS.erase = DOS.del; DOS.mkdir = DOS.md; DOS.rmdir = DOS.rd; DOS.rename = DOS.ren;
  TX.docs.dosHelp = (n) => { const d = DOS[String(n).toLowerCase()]; return d ? d[0] + '\n\n' + d[1] + '\n' : null; };
  TX.docs.dosHelpAll = () => 'MS-DOS 6.22 commands. Type HELP command-name, or command-name /? for details.\n\n' + Object.keys(DOS).filter((k) => !['chdir', 'erase', 'mkdir', 'rmdir', 'rename'].includes(k)).sort().map((k) => k.toUpperCase().padEnd(10) + DOS[k][0]).join('\n') +
    '\n\n' + C.dim('TerminalEX extras: INSERT / EJECT put a floppy disk in drive A:. Also try MEM /C, MSD, WIN, QBASIC, DOSKEY.');
})();
