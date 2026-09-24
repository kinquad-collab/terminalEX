/* TerminalEX — built-in documentation: man pages, cmd help, Get-Help, cheat sheet */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;

  // [name, summary, synopsis, description, options[[flag, desc]], examples[[cmd, desc]]]
  const MAN = [
    ['ls', 'list directory contents', 'ls [OPTION]... [FILE]...', 'List information about the FILEs (the current directory by default). Entries are sorted alphabetically.', [['-a, --all', 'do not ignore entries starting with .'], ['-l', 'use a long listing format (permissions, owner, size, date)'], ['-h', 'with -l, print sizes like 1K 234M 2G'], ['-R', 'list subdirectories recursively'], ['-t', 'sort by time, newest first'], ['-S', 'sort by file size, largest first'], ['-r', 'reverse order while sorting'], ['-1', 'list one file per line'], ['-d', 'list directories themselves, not their contents'], ['-F', 'append indicator (one of */=>@|) to entries']], [['ls -la', 'show everything, including hidden files, in long format'], ['ls -lh ~/Downloads', 'human-readable sizes'], ['ls *.txt', 'only files ending in .txt']]],
    ['cd', 'change the working directory', 'cd [DIR]', 'Change the current directory to DIR. With no DIR, go to your home directory. "cd -" returns to the previous directory. ".." means the parent directory and "~" means your home directory.', [], [['cd Documents', 'go into Documents'], ['cd ..', 'go up one level'], ['cd ~', 'go home'], ['cd /', 'go to the root of the filesystem'], ['cd -', 'jump back to where you were']]],
    ['pwd', 'print name of current/working directory', 'pwd', 'Print the full filename of the current working directory.', [], [['pwd', 'where am I?']]],
    ['cat', 'concatenate files and print on the standard output', 'cat [OPTION]... [FILE]...', 'Concatenate FILE(s) to standard output. With no FILE, read standard input.', [['-n', 'number all output lines'], ['-A', 'show tabs as ^I and line ends as $']], [['cat notes.txt', 'print a file'], ['cat a.txt b.txt > both.txt', 'join two files into a new one']]],
    ['mkdir', 'make directories', 'mkdir [OPTION]... DIRECTORY...', 'Create the DIRECTORY(ies), if they do not already exist.', [['-p', 'no error if existing, make parent directories as needed'], ['-v', 'print a message for each created directory']], [['mkdir projects', 'make one folder'], ['mkdir -p school/2026/cs', 'make a whole path at once']]],
    ['touch', 'change file timestamps (or create empty files)', 'touch FILE...', 'Update the modification time of each FILE. A FILE that does not exist is created empty.', [], [['touch index.html', 'create an empty file']]],
    ['rm', 'remove files or directories', 'rm [OPTION]... [FILE]...', 'Remove each specified file. By default, it does not remove directories. There is NO recycle bin — removed files are gone.', [['-r, -R', 'remove directories and their contents recursively'], ['-f', 'ignore nonexistent files, never prompt'], ['-i', 'prompt before every removal'], ['-v', 'explain what is being done']], [['rm old.txt', 'delete a file'], ['rm -r build/', 'delete a folder and everything in it'], ['rm -i *.log', 'ask before deleting each log']]],
    ['rmdir', 'remove empty directories', 'rmdir DIRECTORY...', 'Remove the DIRECTORY(ies), if they are empty.', [], [['rmdir empty-folder', '']]],
    ['cp', 'copy files and directories', 'cp [OPTION]... SOURCE... DEST', 'Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.', [['-r', 'copy directories recursively'], ['-i', 'prompt before overwrite'], ['-v', 'explain what is being done'], ['-n', 'do not overwrite an existing file']], [['cp notes.txt notes-backup.txt', 'make a copy'], ['cp -r projects/ /mnt/data/backups/', 'copy a folder']]],
    ['mv', 'move (rename) files', 'mv [OPTION]... SOURCE... DEST', 'Rename SOURCE to DEST, or move SOURCE(s) to DIRECTORY.', [['-i', 'prompt before overwrite'], ['-v', 'explain what is being done']], [['mv draft.txt final.txt', 'rename a file'], ['mv *.jpg Pictures/', 'move all jpgs into Pictures']]],
    ['echo', 'display a line of text', 'echo [-neE] [STRING]...', 'Echo the STRING(s) to standard output.', [['-n', 'do not output the trailing newline'], ['-e', 'enable interpretation of backslash escapes like \\n and \\t']], [['echo Hello', ''], ['echo "Name: $USER"', 'variables are expanded in double quotes'], ['echo hi > file.txt', 'write text into a file (overwrites!)'], ['echo more >> file.txt', 'append to a file']]],
    ['grep', 'print lines that match patterns', 'grep [OPTION...] PATTERNS [FILE...]', 'Search for PATTERNS in each FILE and print each line that matches. PATTERNS are regular expressions.', [['-i', 'ignore case'], ['-v', 'invert match: print lines that do NOT match'], ['-n', 'prefix each line with its line number'], ['-c', 'print only a count of matching lines'], ['-r', 'search directories recursively'], ['-l', 'print only names of files with matches'], ['-w', 'match whole words only'], ['-E', 'extended regular expressions'], ['-o', 'print only the matched parts']], [['grep apples groceries.txt', 'find lines containing apples'], ['grep -i error /var/log/syslog', 'case-insensitive search'], ['grep -rn "TODO" projects/', 'search a whole folder'], ['ps aux | grep firefox', 'filter another command\'s output']]],
    ['find', 'search for files in a directory hierarchy', 'find [starting-point...] [expression]', 'Walk the file tree rooted at each starting-point and print files matching the expression.', [['-name PATTERN', 'file name matches shell PATTERN (quote it!)'], ['-iname PATTERN', 'like -name but case-insensitive'], ['-type f|d', 'regular file / directory'], ['-size +10M', 'bigger than 10 megabytes'], ['-mtime -1', 'modified in the last day'], ['-maxdepth N', 'descend at most N levels'], ['-exec CMD {} \\;', 'run CMD on each match'], ['-delete', 'delete matches (careful!)']], [['find . -name "*.txt"', 'all text files under here'], ['find ~ -type d -name projects', 'find a folder'], ['find / -name flag.txt 2>/dev/null', 'search everywhere, hide permission errors']]],
    ['wc', 'print newline, word, and byte counts', 'wc [OPTION]... [FILE]...', 'Print newline, word, and byte counts for each FILE.', [['-l', 'lines'], ['-w', 'words'], ['-c', 'bytes']], [['wc -l groceries.txt', 'how many lines?'], ['ls | wc -l', 'how many files here?']]],
    ['sort', 'sort lines of text files', 'sort [OPTION]... [FILE]...', 'Write sorted concatenation of all FILE(s) to standard output.', [['-r', 'reverse'], ['-n', 'numeric sort'], ['-u', 'unique lines only'], ['-k N', 'sort by field N'], ['-t SEP', 'use SEP as field separator']], [['sort groceries.txt', ''], ['sort -n numbers.txt', 'sort numbers correctly'], ['sort -t, -k6 -n grades.csv', 'sort CSV by 6th column']]],
    ['uniq', 'report or omit repeated lines', 'uniq [OPTION]... [INPUT]', 'Filter adjacent matching lines. Usually used after sort.', [['-c', 'prefix lines by number of occurrences'], ['-d', 'only print duplicate lines']], [['sort groceries.txt | uniq -c', 'count each item']]],
    ['head', 'output the first part of files', 'head [-n NUM] [FILE]...', 'Print the first 10 lines of each FILE.', [['-n NUM', 'print the first NUM lines']], [['head -n 3 grades.csv', '']]],
    ['tail', 'output the last part of files', 'tail [-n NUM] [-f] [FILE]...', 'Print the last 10 lines of each FILE.', [['-n NUM', 'print the last NUM lines'], ['-f', 'follow: keep printing new lines as the file grows (Ctrl+C to stop)']], [['tail -f /var/log/syslog', 'watch a log live']]],
    ['chmod', 'change file mode bits', 'chmod MODE FILE...', 'Change the permissions of each FILE. MODE is symbolic (u+x, go-w) or octal (755, 644). r=4 w=2 x=1 for user, group, others.', [['-R', 'change files and directories recursively']], [['chmod +x script.sh', 'make a script executable'], ['chmod 600 secret.txt', 'only you can read/write'], ['chmod 755 app', 'rwxr-xr-x']]],
    ['chown', 'change file owner and group', 'chown OWNER[:GROUP] FILE...', 'Change the owner and/or group of each FILE. Usually requires sudo.', [['-R', 'recursive']], [['sudo chown student:student file', '']]],
    ['sudo', 'execute a command as another user', 'sudo COMMAND', 'Run COMMAND as the superuser (root). You will be asked for YOUR password. In TerminalEX the student password is: student', [['-i', 'start a root login shell'], ['-k', 'forget the cached password']], [['sudo apt update', 'refresh package lists'], ['sudo -i', 'become root (type exit to leave)']]],
    ['apt', 'command-line package manager', 'apt [install|remove|update|upgrade|search|list|show] ...', 'Install, remove and upgrade software packages on Debian/Ubuntu. Most actions require sudo.', [['update', 'download fresh package lists'], ['upgrade', 'install available upgrades'], ['install PKG', 'install a package'], ['remove PKG', 'remove a package'], ['search WORD', 'search package descriptions'], ['list --installed', 'show installed packages']], [['sudo apt install cowsay', 'then try: cowsay moo'], ['apt search game', '']]],
    ['ps', 'report a snapshot of the current processes', 'ps [aux|-ef]', 'Display information about running processes.', [['aux', 'all processes, BSD style, with CPU/MEM usage'], ['-ef', 'all processes, full format']], [['ps aux', ''], ['ps aux | grep bash', 'find a process']]],
    ['top', 'display Linux processes', 'top', 'A live, updating view of running processes. Press q to quit, P/M to sort by CPU/memory, k to kill.', [], [['top', '']]],
    ['kill', 'send a signal to a process', 'kill [-SIGNAL] PID...', 'Send a signal (default TERM) to the process with the given PID. -9 (KILL) cannot be ignored.', [['-l', 'list signal names'], ['-9', 'force kill']], [['kill 2011', 'politely stop process 2011'], ['kill -9 2011', 'force it']]],
    ['df', 'report file system disk space usage', 'df [-h] [-T]', 'Show how much space is used and available on each mounted filesystem.', [['-h', 'human-readable sizes'], ['-T', 'print filesystem type']], [['df -h', '']]],
    ['du', 'estimate file space usage', 'du [-h] [-s] [FILE]...', 'Summarize disk usage of each FILE, recursively for directories.', [['-h', 'human-readable'], ['-s', 'display only a total for each argument'], ['-d N', 'max depth']], [['du -sh ~/Downloads', 'how big is Downloads?'], ['du -h -d 1 ~', 'size of each folder in home']]],
    ['lsblk', 'list block devices', 'lsblk [-f]', 'List information about disks and partitions in a tree.', [['-f', 'show filesystems, labels and UUIDs']], [['lsblk', ''], ['lsblk -f', '']]],
    ['free', 'display amount of free and used memory', 'free [-h]', 'Display the total amount of free and used physical and swap memory.', [['-h', 'human-readable']], [['free -h', '']]],
    ['uname', 'print system information', 'uname [-a]', 'Print certain system information.', [['-a', 'print all information'], ['-r', 'kernel release']], [['uname -a', '']]],
    ['ping', 'send ICMP ECHO_REQUEST to network hosts', 'ping [-c COUNT] HOST', 'Check whether a host is reachable and measure round-trip time. On Linux it runs until you press Ctrl+C.', [['-c N', 'stop after N packets']], [['ping -c 4 google.com', ''], ['ping 192.168.1.1', 'is the router reachable?']]],
    ['ip', 'show / manipulate routing, network devices', 'ip [addr|route|link]', 'Show network interfaces, addresses and routes.', [['addr', 'IP addresses on each interface'], ['route', 'routing table (default gateway)']], [['ip addr', 'what is my IP?'], ['ip route', 'who is my gateway?']]],
    ['curl', 'transfer a URL', 'curl [options] URL', 'Download data from a URL and print it (or save with -o).', [['-I', 'show response headers only'], ['-o FILE', 'save to FILE'], ['-s', 'silent'], ['-v', 'verbose (see the HTTP request)']], [['curl wttr.in', 'weather report!'], ['curl -I https://github.com', 'just the headers'], ['curl https://api.github.com/users/octocat', 'JSON from an API']]],
    ['ssh', 'OpenSSH remote login client', 'ssh [user@]host', 'Log in to a remote machine. Try: ssh student@ubuntu-lab (password: student). Type exit to disconnect.', [], [['ssh student@ubuntu-lab', '']]],
    ['git', 'the stupid content tracker', 'git <command> [<args>]', 'Git is a distributed version control system. Common commands: init, status, add, commit, log, branch, switch, merge, diff, clone, push, pull.', [['status', 'what changed?'], ['add FILE', 'stage changes'], ['commit -m MSG', 'save a snapshot'], ['log --oneline', 'history'], ['switch -c NAME', 'create and switch to a branch'], ['merge NAME', 'merge a branch into the current one']], [['git init', 'start a repository'], ['git add . && git commit -m "first commit"', ''], ['git log --oneline --graph --all', 'see all branches']]],
    ['nano', 'Nano\'s ANOther editor', 'nano [FILE]', 'A small, friendly text editor. Shortcuts are shown at the bottom (^ means Ctrl): ^O save, ^X exit, ^K cut line, ^U paste, ^W search. You can also click the shortcut buttons.', [], [['nano notes.txt', '']]],
    ['vim', 'Vi IMproved, a programmer\'s text editor', 'vim [FILE]', 'A powerful modal editor. Press i to insert text, Esc to return to normal mode, then :w to save, :q to quit, :wq for both, :q! to quit without saving.', [], [['vim notes.txt', '']]],
    ['less', 'opposite of more (a pager)', 'less FILE', 'View a file one screen at a time. Space/b page down/up, arrows scroll, /word searches, q quits.', [], [['less /var/log/syslog', '']]],
    ['man', 'an interface to the system reference manuals', 'man COMMAND', 'Display the manual page for COMMAND. Press q to quit.', [], [['man ls', '']]],
    ['history', 'display the command history', 'history [N]', 'List previously typed commands. Re-run one with !N, or the last with !!. Press Ctrl+R to search.', [], [['history', ''], ['!!', 'repeat the last command'], ['sudo !!', 'repeat it with sudo']]],
    ['tar', 'an archiving utility', 'tar [-c|-x|-t] [-z] [-v] -f ARCHIVE [FILES]', 'Pack many files into one archive, or unpack them.', [['-c', 'create'], ['-x', 'extract'], ['-t', 'list'], ['-z', 'gzip compress'], ['-v', 'verbose'], ['-f FILE', 'archive file name']], [['tar -czvf backup.tar.gz Documents/', 'compress a folder'], ['tar -xzvf backup.tar.gz', 'extract it']]],
    ['awk', 'pattern scanning and processing language', "awk [-F sep] 'program' [file]", 'Process text line by line. Fields are $1, $2, ... ($0 is the whole line). NR is the line number, NF the number of fields.', [['-F SEP', 'field separator (e.g. -F, for CSV)']], [["awk '{print $1}' file", 'first word of each line'], ["awk -F, 'NR>1 {sum+=$6} END {print sum/(NR-1)}' grades.csv", 'average of column 6']]],
    ['sed', 'stream editor for filtering and transforming text', "sed [-n] [-i] 'script' [file]", 'Apply editing commands to each line. The most common is s/old/new/g (substitute).', [['-i', 'edit the file in place'], ['-n', 'only print lines explicitly printed with p']], [["sed 's/apples/oranges/g' groceries.txt", 'replace text'], ["sed -n '2,4p' file", 'print lines 2-4']]],
    ['cut', 'remove sections from each line of files', 'cut -d DELIM -f LIST [FILE]', 'Print selected parts of lines.', [['-d', 'delimiter'], ['-f', 'fields to select']], [['cut -d, -f1 grades.csv', 'first column of a CSV']]],
    ['tr', 'translate or delete characters', 'tr SET1 SET2', 'Translate characters from standard input.', [['-d', 'delete characters in SET1']], [["echo hello | tr a-z A-Z", 'uppercase']]],
    ['alias', 'define or display aliases', "alias name='command'", 'Create a shortcut name for a longer command.', [], [["alias ll='ls -la'", ''], ['alias', 'list all aliases']]],
    ['export', 'set environment variables', 'export NAME=value', 'Create or change a variable and make it available to programs you run.', [], [['export GREETING=hi', ''], ['echo $GREETING', '']]],
    ['which', 'locate a command', 'which COMMAND', 'Show the full path of the program that would run.', [], [['which python3', '']]],
    ['neofetch', 'a command-line system information tool', 'neofetch', 'Show system info next to a logo. Install it first: sudo apt install neofetch', [], []],
    ['cowsay', 'configurable speaking/thinking cow', 'cowsay [-f cow] MESSAGE', 'A cow says your message. Try -f tux or -f dragon. Install: sudo apt install cowsay', [], [['cowsay Hello', ''], ['fortune | cowsay', '']]],
    ['diff', 'compare files line by line', 'diff [-u] FILE1 FILE2', 'Show the differences between two files.', [['-u', 'unified format (like git)']], [['diff old.txt new.txt', '']]],
    ['systemctl', 'control the systemd system and service manager', 'systemctl [status|start|stop|restart|enable|disable] UNIT', 'Inspect and control background services.', [], [['systemctl status nginx', ''], ['sudo systemctl stop nginx', '']]],
    ['chmod', '', '', '', [], []],
    ['whoami', 'print effective user name', 'whoami', 'Print the user name associated with the current user ID.', [], []],
    ['date', 'print or set the system date and time', 'date [+FORMAT]', 'Display the current date and time.', [], [['date', ''], ['date +%Y-%m-%d', 'custom format']]],
    ['xargs', 'build and execute command lines from standard input', 'xargs [COMMAND]', 'Run COMMAND with arguments read from standard input.', [], [["find . -name '*.log' | xargs rm", 'delete all logs']]],
    ['tee', 'read from standard input and write to standard output and files', 'tee [-a] FILE', 'Copy input to a file and to the screen.', [], [['ls | tee listing.txt', '']]],
    ['python3', 'an interpreted, interactive, object-oriented programming language', 'python3 [script.py]', 'Start an interactive Python session (TerminalEX includes a mini Python), or run a script.', [], [['python3', 'type exit() to leave'], ['python3 hello.py', '']]],
  ];
  const DB = {};
  MAN.forEach(([name, summary, synopsis, desc, options, examples]) => { if (summary) DB[name] = { name, summary, synopsis, desc, options, examples }; });

  function manPage(name, sh) {
    const d = DB[name];
    const cmd = TX.posixCmds[name];
    if (!d && !cmd) return null;
    const U = name.toUpperCase() + '(1)';
    const title = U + TX.center('User Commands', 60) + U;
    const B = (s) => C.bold(s);
    if (!d) return `${title}\n\n${B('NAME')}\n       ${name} - (TerminalEX has no detailed manual for this command yet)\n\n${B('SYNOPSIS')}\n       ${name} [OPTION]... [ARG]...\n\n${B('SEE ALSO')}\n       Try  ${name} --help  or search the web for "man ${name}".\n`;
    const L = [title, '', B('NAME'), `       ${name} - ${d.summary}`, '', B('SYNOPSIS'), `       ${C.bold(name)}${d.synopsis.slice(name.length)}`, '', B('DESCRIPTION')];
    wrapText(d.desc, 65).forEach((l) => L.push('       ' + l));
    if (d.options.length) { L.push(''); d.options.forEach(([o, t]) => { L.push('       ' + B(o)); L.push('              ' + t); L.push(''); }); }
    if (d.examples.length) { L.push(B('EXAMPLES')); d.examples.forEach(([e, t]) => { L.push('       ' + C.cyan(e)); if (t) L.push('              ' + t); L.push(''); }); }
    L.push(B('SEE ALSO'), '       ' + (d.see || 'help, info'), '', `TerminalEX${' '.repeat(40)}${TX.MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}${' '.repeat(10)}${U}`);
    void sh;
    return L.join('\n') + '\n';
  }
  function wrapText(s, w) { const out = []; let cur = ''; s.split(/\s+/).forEach((word) => { if ((cur + ' ' + word).trim().length > w) { out.push(cur); cur = word; } else cur = (cur + ' ' + word).trim(); }); if (cur) out.push(cur); return out; }

  const CATS = [
    ['Navigation', ['pwd', 'ls', 'cd', 'tree', 'find', 'du', 'stat', 'file']],
    ['Files', ['cat', 'less', 'head', 'tail', 'touch', 'mkdir', 'cp', 'mv', 'rm', 'rmdir', 'ln', 'chmod', 'chown', 'nano', 'vim']],
    ['Text', ['echo', 'grep', 'sort', 'uniq', 'wc', 'cut', 'tr', 'sed', 'awk', 'diff', 'tee', 'xargs', 'jq']],
    ['System', ['whoami', 'id', 'uname', 'hostname', 'uptime', 'date', 'cal', 'ps', 'top', 'htop', 'kill', 'free', 'df', 'lsblk', 'fdisk', 'mount', 'lscpu', 'systemctl', 'journalctl', 'history', 'clear']],
    ['Network', ['ip', 'ifconfig', 'ping', 'traceroute', 'dig', 'nslookup', 'curl', 'wget', 'ss', 'netstat', 'ssh', 'nmap']],
    ['Packages & users', ['sudo', 'su', 'apt', 'brew', 'pip', 'passwd', 'useradd']],
    ['Archives', ['tar', 'zip', 'unzip', 'gzip', 'md5sum', 'sha256sum', 'base64']],
    ['Developer', ['git', 'python3', 'node', 'bash']],
    ['Fun', ['cowsay', 'fortune', 'sl', 'cmatrix', 'figlet', 'lolcat', 'neofetch', 'say']],
    ['macOS', ['open', 'pbcopy', 'pbpaste', 'sw_vers', 'system_profiler', 'diskutil', 'caffeinate', 'networksetup']],
    ['Windows (Git Bash)', ['cmd', 'powershell', 'ipconfig', 'systeminfo', 'tasklist', 'notepad', 'start', 'clip']],
  ];
  function posixHelp(sh) {
    const L = [C.bold(sh.flavor === 'zsh' ? 'zsh on macOS — TerminalEX' : sh.flavor === 'gitbash' ? 'Git Bash (MINGW64) — TerminalEX' : 'GNU bash on Ubuntu Linux — TerminalEX'), C.dim('Commands available here (✗ = needs installing first). Type  man NAME  for details.'), ''];
    CATS.forEach(([cat, names]) => {
      const avail = names.filter((n) => TX.posixCmds[n] && (!TX.posixCmds[n].only || TX.posixCmds[n].only.includes(sh.flavor === 'gitbash' ? 'gitbash' : sh.m.kind)));
      if (!avail.length) return;
      L.push(C.style(['bold', 'cyan'], cat.padEnd(18)) + avail.map((n) => (sh.available(n) ? n : C.dim(n + '✗'))).join('  '));
    });
    L.push('', C.dim('Shell features: pipes |, redirects > >> 2> <, && ||, ; , $VARS, $(cmd), globbing *.txt, {a,b} braces,'), C.dim('for/while/if, functions, aliases, history (!!, Ctrl+R), Tab completion, Ctrl+C / Ctrl+L.'));
    if (sh.m.kind === 'linux') L.push(C.dim('The password for sudo is: ') + C.yellow('student'));
    return L.join('\n') + '\n';
  }

  const CMD_HELP = {
    assoc: 'Displays or modifies file extension associations.', attrib: 'Displays or changes file attributes.', cd: 'Displays the name of or changes the current directory.', chdir: 'Displays the name of or changes the current directory.', chkdsk: 'Checks a disk and displays a status report.', cls: 'Clears the screen.', cmd: 'Starts a new instance of the Windows command interpreter.', color: 'Sets the default console foreground and background colors.', copy: 'Copies one or more files to another location.', date: 'Displays or sets the date.', del: 'Deletes one or more files.', dir: 'Displays a list of files and subdirectories in a directory.', diskpart: 'Displays or configures Disk Partition properties.', driverquery: 'Displays current device driver status and properties.', echo: 'Displays messages, or turns command echoing on or off.', erase: 'Deletes one or more files.', exit: 'Quits the CMD.EXE program (command interpreter).', fc: 'Compares two files or sets of files, and displays the differences between them.', find: 'Searches for a text string in a file or files.', findstr: 'Searches for strings in files.', for: 'Runs a specified command for each file in a set of files.', goto: 'Directs the Windows command interpreter to a labeled line in a batch program.', help: 'Provides Help information for Windows commands.', if: 'Performs conditional processing in batch programs.', ipconfig: 'Displays all current TCP/IP network configuration values.', label: 'Creates, changes, or deletes the volume label of a disk.', md: 'Creates a directory.', mkdir: 'Creates a directory.', mklink: 'Creates Symbolic Links and Hard Links', more: 'Displays output one screen at a time.', move: 'Moves one or more files from one directory to another directory.', netstat: 'Displays protocol statistics and current TCP/IP network connections.', path: 'Displays or sets a search path for executable files.', pause: 'Suspends processing of a batch file and displays a message.', ping: 'Sends ICMP echo requests to test whether a host is reachable.', popd: 'Restores the previous value of the current directory saved by PUSHD.', prompt: 'Changes the Windows command prompt.', pushd: 'Saves the current directory then changes it.', rd: 'Removes a directory.', rem: 'Records comments (remarks) in batch files or CONFIG.SYS.', ren: 'Renames a file or files.', rename: 'Renames a file or files.', rmdir: 'Removes a directory.', robocopy: 'Advanced utility to copy files and directory trees', set: 'Displays, sets, or removes Windows environment variables.', sc: 'Displays or configures services (background processes).', shutdown: 'Allows proper local or remote shutdown of machine.', sort: 'Sorts input.', start: 'Starts a separate window to run a specified program or command.', systeminfo: 'Displays machine specific properties and configuration.', tasklist: 'Displays all currently running tasks including services.', taskkill: 'Kill or stop a running process or application.', time: 'Displays or sets the system time.', title: 'Sets the window title for a CMD.EXE session.', tracert: 'Traces the route packets take to a network host.', tree: 'Graphically displays the directory structure of a drive or path.', type: 'Displays the contents of a text file.', ver: 'Displays the Windows version.', vol: 'Displays a disk volume label and serial number.', where: 'Displays the location of files that match a pattern.', whoami: 'Displays user, group and privileges information.', wmic: 'Displays WMI information inside interactive command shell.', xcopy: 'Copies files and directory trees.',
  };
  const CMD_DETAIL = {
    dir: 'Displays a list of files and subdirectories in a directory.\n\nDIR [drive:][path][filename] [/A[[:]attributes]] [/B] [/O[[:]sortorder]] [/S] [/W]\n\n  /A          Displays files with specified attributes.\n  attributes   D  Directories                R  Read-only files\n               H  Hidden files               A  Files ready for archiving\n               S  System files               -  Prefix meaning not\n  /B          Uses bare format (no heading information or summary).\n  /O          List by files in sorted order.\n  sortorder    N  By name (alphabetic)       S  By size (smallest first)\n               E  By extension (alphabetic)  D  By date/time (oldest first)\n               -  Prefix to reverse order\n  /S          Displays files in specified directory and all subdirectories.\n  /W          Uses wide list format.\n\nExamples:\n  dir /a        show hidden files too\n  dir *.txt /s  every .txt file here and below',
    cd: 'Displays the name of or changes the current directory.\n\nCHDIR [/D] [drive:][path]\nCHDIR [..]\nCD [/D] [drive:][path]\nCD [..]\n\n  ..   Specifies that you want to change to the parent directory.\n\nType CD drive: to display the current directory in the specified drive.\nType CD without parameters to display the current drive and directory.\n\nUse the /D switch to change current drive in addition to changing current\ndirectory for a drive.',
    copy: 'Copies one or more files to another location.\n\nCOPY [/Y] source [+ source [+ ...]] [destination]\n\n  source       Specifies the file or files to be copied.\n  destination  Specifies the directory and/or filename for the new file(s).\n  /Y           Suppresses prompting to confirm you want to overwrite an\n               existing destination file.\n\nTo append files, specify a single file for destination, but multiple files\nfor source (using wildcards or file1+file2+file3 format).\n\nTip: "copy con file.txt" lets you type a file; finish with Ctrl+Z then Enter (or Ctrl+D here).',
    del: 'Deletes one or more files.\n\nDEL [/P] [/F] [/S] [/Q] names\nERASE [/P] [/F] [/S] [/Q] names\n\n  names         Specifies a list of one or more files or directories.\n  /P            Prompts for confirmation before deleting each file.\n  /F            Force deleting of read-only files.\n  /S            Delete specified files from all subdirectories.\n  /Q            Quiet mode, do not ask if ok to delete on global wildcard',
    set: 'Displays, sets, or removes cmd.exe environment variables.\n\nSET [variable=[string]]\nSET /A expression\nSET /P variable=[promptString]\n\n  variable  Specifies the environment-variable name.\n  string    Specifies a series of characters to assign to the variable.\n\nType SET without parameters to display the current environment variables.\nUse %NAME% to read a variable, e.g.  echo %USERNAME%\nSET /A does arithmetic:  set /a total=5*8+2',
    for: 'Runs a specified command for each file in a set of files.\n\nFOR %variable IN (set) DO command [command-parameters]\nFOR /L %variable IN (start,step,end) DO command\nFOR /D %variable IN (set) DO command\nFOR /F %variable IN (file | "string" | \'command\') DO command\n\nIn a batch file use %%variable instead of %variable.\n\nExamples:\n  for %f in (*.txt) do type %f\n  for /l %i in (1,1,5) do echo %i',
    if: 'Performs conditional processing in batch programs.\n\nIF [NOT] ERRORLEVEL number command\nIF [NOT] string1==string2 command\nIF [NOT] EXIST filename command\nIF [/I] string1 compare-op string2 command\n\n  compare-op may be one of:\n    EQU - equal       NEQ - not equal\n    LSS - less than   LEQ - less than or equal\n    GTR - greater     GEQ - greater than or equal\n\nExample:\n  if exist notes.txt (echo found it) else (echo nope)',
    ipconfig: 'USAGE:\n    ipconfig [/allcompartments] [/? | /all |\n                                 /renew [adapter] | /release [adapter] |\n                                 /flushdns | /displaydns ]\n\nwhere\n    /all             Display full configuration information.\n    /release         Release the IPv4 address for the specified adapter.\n    /renew           Renew the IPv4 address for the specified adapter.\n    /flushdns        Purges the DNS Resolver cache.\n    /displaydns      Display the contents of the DNS Resolver Cache.',
    ping: 'Usage: ping [-t] [-n count] [-l size] target_name\n\nOptions:\n    -t             Ping the specified host until stopped.\n                   To stop - type Control-C.\n    -n count       Number of echo requests to send.\n    -l size        Send buffer size.',
    tasklist: 'TASKLIST [/SVC] [/FI filter]\n\nDescription:\n    This tool displays a list of currently running processes on\n    either a local or remote machine.\n\nExamples:\n    TASKLIST\n    TASKLIST /SVC\n    TASKLIST /FI "IMAGENAME eq msedge.exe"',
    taskkill: 'TASKKILL [/F] [/PID processid | /IM imagename]\n\nDescription:\n    This tool is used to terminate tasks by process id (PID) or image name.\n\nExamples:\n    TASKKILL /IM notepad.exe\n    TASKKILL /PID 1230 /F',
    mkdir: 'Creates a directory.\n\nMKDIR [drive:]path\nMD [drive:]path\n\nMKDIR creates any intermediate directories in the path, if needed.',
    tree: 'Graphically displays the folder structure of a drive or path.\n\nTREE [drive:][path] [/F] [/A]\n\n   /F   Display the names of the files in each folder.\n   /A   Use ASCII instead of extended characters.',
    type: 'Displays the contents of a text file or files.\n\nTYPE [drive:][path]filename',
    echo: 'Displays messages, or turns command-echoing on or off.\n\n  ECHO [ON | OFF]\n  ECHO [message]\n\nType ECHO without parameters to display the current echo setting.\nUse ECHO. to print an empty line.',
    color: 'Sets the default console foreground and background colors.\n\nCOLOR [attr]\n\n  attr        Specifies color attribute of console output\n\nColor attributes are specified by TWO hex digits -- the first\ncorresponds to the background; the second the foreground.  Each digit\ncan be any of the following values:\n\n    0 = Black       8 = Gray\n    1 = Blue        9 = Light Blue\n    2 = Green       A = Light Green\n    3 = Aqua        B = Light Aqua\n    4 = Red         C = Light Red\n    5 = Purple      D = Light Purple\n    6 = Yellow      E = Light Yellow\n    7 = White       F = Bright White\n\nExample: "COLOR 0A" produces light green on black (hacker mode!)\nType COLOR with no argument to restore the original colors.',
  };
  function cmdHelp(name) {
    name = name.replace(/^\//, '').toLowerCase();
    if (CMD_DETAIL[name]) return CMD_DETAIL[name];
    if (CMD_HELP[name]) return CMD_HELP[name] + '\n\n' + name.toUpperCase() + ' [options]\n\n(For more detail, search "' + name + ' command" on Microsoft Learn.)';
    return `This command is not supported by the help utility.  Try "${name} /?".`;
  }
  function cmdHelpAll() {
    return 'For more information on a specific command, type HELP command-name\n' + Object.keys(CMD_HELP).sort().filter((k, i, a) => a.indexOf(k) === i).map((k) => k.toUpperCase().padEnd(15) + CMD_HELP[k]).join('\n') + '\n\nFor more information on tools see the command-line reference in the online help.';
  }

  // ------------------------------------------------------------------ PowerShell help
  const PSH = {
    'get-childitem': ['Gets the items and child items in one or more specified locations.', 'The Get-ChildItem cmdlet gets the items in one or more specified locations. If the item is a container, it gets the items inside the container, known as child items. You can use the Recurse parameter to get items in all child containers and use the Depth parameter to limit the number of levels to recurse.', [['Get-ChildItem', 'List the current folder.'], ['Get-ChildItem -Path C:\\Users\\student\\Documents -Filter *.txt', 'Only .txt files.'], ['Get-ChildItem -Recurse -File | Sort-Object Length -Descending | Select-Object -First 5', 'The five biggest files anywhere below here.'], ['Get-ChildItem -Force', 'Include hidden files.']]],
    'set-location': ['Sets the current working location to a specified location.', 'The Set-Location cmdlet sets the working location to a specified location. That location could be a directory, a subdirectory, a registry location, or any provider path.', [['Set-Location C:\\Windows', ''], ['cd ..', 'Go up one level (cd is an alias of Set-Location).'], ['Set-Location Env:', 'Browse environment variables like a drive!']]],
    'get-content': ['Gets the content of the item at the specified location.', 'The Get-Content cmdlet gets the content of the item at the location specified by the path, such as the text in a file. It reads the content one line at a time and returns a collection of objects, each representing a line of content.', [['Get-Content .\\notes.txt', ''], ['Get-Content .\\grades.csv -TotalCount 3', 'First three lines.'], ['(Get-Content .\\poem.txt).Count', 'How many lines?']]],
    'get-process': ['Gets the processes that are running on the local computer.', 'The Get-Process cmdlet gets the processes on a local computer. Without parameters, this cmdlet gets all of the processes. You can also specify a particular process by process name or process ID (PID).', [['Get-Process', ''], ['Get-Process msedge', ''], ['Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', 'Top five CPU users.']]],
    'stop-process': ['Stops one or more running processes.', 'The Stop-Process cmdlet stops one or more running processes. You can specify a process by process name or process ID (PID), or pass a process object through the pipeline.', [['Stop-Process -Name Spotify', ''], ['Get-Process Teams | Stop-Process', '']]],
    'get-service': ['Gets the services on a computer.', 'The Get-Service cmdlet gets objects that represent the services on a computer, including running and stopped services.', [['Get-Service', ''], ['Get-Service | Where-Object Status -eq Running', ''], ['Get-Service -Name W*', '']]],
    'where-object': ['Selects objects from a collection based on their property values.', 'The Where-Object cmdlet selects objects that have particular property values from the collection of objects that are passed to it. You can use a script block with $_ (the current object), or the simplified syntax: Where-Object Property -Operator Value.', [['Get-Process | Where-Object { $_.CPU -gt 5 }', ''], ['Get-Service | Where-Object Status -eq Stopped', 'Simplified syntax.'], ['1..20 | ? { $_ % 2 -eq 0 }', 'Even numbers.']]],
    'select-object': ['Selects objects or object properties.', 'The Select-Object cmdlet selects specified properties of an object or set of objects. It can also select unique objects, a specified number of objects, or objects in a specified position in an array.', [['Get-Process | Select-Object Name, Id, CPU', ''], ['Get-ChildItem | Select-Object -First 3', ''], ['Get-ChildItem | Select-Object Name, @{Name="KB"; Expression={ $_.Length / 1KB }}', 'A calculated property.']]],
    'sort-object': ['Sorts objects by property values.', 'The Sort-Object cmdlet sorts objects in ascending or descending order based on object property values.', [['Get-ChildItem | Sort-Object Length -Descending', ''], ['"pear","apple","fig" | Sort-Object', '']]],
    'foreach-object': ['Performs an operation against each item in a collection of input objects.', 'The ForEach-Object cmdlet performs an operation on each item in a collection of input objects. Inside the script block, $_ is the current object.', [['1..5 | ForEach-Object { $_ * $_ }', 'Squares.'], ['Get-ChildItem | % Name', 'Just the names (member name shortcut).']]],
    'get-member': ['Gets the properties and methods of objects.', 'The Get-Member cmdlet gets the members, the properties and methods, of objects. This is the best way to discover what you can do with an object!', [['Get-Process | Get-Member', ''], ['"hello" | Get-Member', ''], ['Get-Date | gm -MemberType Property', '']]],
    'get-command': ['Gets all commands.', 'The Get-Command cmdlet gets all commands that are installed on the computer, including cmdlets, aliases, functions, and applications. Use wildcards to search.', [['Get-Command *-Item', ''], ['Get-Command -Verb Get -Noun *Net*', ''], ['Get-Command ls', 'Find out what ls really is.']]],
    'get-help': ['Displays information about PowerShell commands and concepts.', 'The Get-Help cmdlet displays information about PowerShell concepts and commands, including cmdlets, functions, and aliases.', [['Get-Help Get-ChildItem', ''], ['Get-Help Get-Process -Examples', ''], ['help *Service*', 'Search help.']]],
    'write-host': ['Writes customized output to a host.', 'The Write-Host cmdlet customizes output. You can specify the color of text by using the ForegroundColor parameter. Note: Write-Host writes straight to the screen, NOT to the pipeline.', [['Write-Host "Hello!" -ForegroundColor Green', ''], ['Write-Host "No newline" -NoNewline', '']]],
    'new-item': ['Creates a new item.', 'The New-Item cmdlet creates a new item and sets its value. The types of items that can be created depend on the location of the item — for the file system, files and directories.', [['New-Item notes.txt', 'Empty file.'], ['New-Item -ItemType Directory -Name Projects', 'A folder.'], ['New-Item hello.txt -Value "Hi there"', 'File with content.']]],
    'remove-item': ['Deletes the specified items.', 'The Remove-Item cmdlet deletes one or more items. Use -Recurse to delete a folder and its contents and -WhatIf to preview what would happen.', [['Remove-Item old.txt', ''], ['Remove-Item .\\build -Recurse', ''], ['Remove-Item *.log -WhatIf', 'Safe preview!']]],
    'copy-item': ['Copies an item from one location to another.', 'The Copy-Item cmdlet copies an item from one location to another location in the same namespace.', [['Copy-Item notes.txt notes.bak', ''], ['Copy-Item .\\Documents D:\\Backups -Recurse', '']]],
    'move-item': ['Moves an item from one location to another.', 'The Move-Item cmdlet moves an item, including its properties, contents, and child items, from one location to another location.', [['Move-Item report.txt .\\Documents\\', '']]],
    'test-connection': ['Sends ICMP echo request packets (pings) to one or more computers.', 'The Test-Connection cmdlet sends ping packets to remote computers and returns responses as objects you can filter.', [['Test-Connection google.com -Count 2', ''], ['Test-Connection github.com -Quiet', 'Just True or False.']]],
    'get-netipaddress': ['Gets the IP address configuration.', 'The Get-NetIPAddress cmdlet gets the IP address configuration, such as IPv4 addresses, IPv6 addresses and the IP interfaces with which addresses are associated.', [['Get-NetIPAddress -AddressFamily IPv4', '']]],
    'get-volume': ['Gets the specified Volume object, or all Volume objects if no filter is provided.', 'Shows each volume (drive) with its file system, health, and free space.', [['Get-Volume', ''], ['Get-Volume -DriveLetter C', '']]],
    'get-disk': ['Gets one or more disks visible to the operating system.', 'Shows each physical disk with its size, health, and partition style (GPT or MBR).', [['Get-Disk', ''], ['Get-Disk | Get-Partition', '']]],
    'get-date': ['Gets the current date and time.', 'The Get-Date cmdlet gets a DateTime object that represents the current date or a date that you specify.', [['Get-Date', ''], ['Get-Date -Format "yyyy-MM-dd"', ''], ['(Get-Date).AddDays(100)', 'One hundred days from now.']]],
    'measure-object': ['Calculates the numeric properties of objects, and the characters, words, and lines in string objects.', 'Counts objects and can compute Sum, Average, Maximum and Minimum of a property.', [['Get-ChildItem | Measure-Object -Property Length -Sum', 'Total size.'], ['1..100 | Measure-Object -Sum -Average', '']]],
    'import-csv': ['Creates table-like custom objects from the items in a character-separated value (CSV) file.', 'Each row becomes an object whose properties are the column names.', [['Import-Csv .\\Documents\\grades.csv | Sort-Object final -Descending', ''], ['Import-Csv grades.csv | Where-Object { [int]$_.final -ge 90 }', '']]],
    'invoke-webrequest': ['Gets content from a web page on the internet.', 'Sends an HTTP or HTTPS request to a web page or web service.', [['Invoke-WebRequest https://example.com', ''], ['(iwr https://example.com).StatusCode', '']]],
  };
  function psHelp(name, rt, opts = {}) {
    if (!name) return `\nTOPIC\n    PowerShell Help System\n\nSHORT DESCRIPTION\n    Displays help about PowerShell cmdlets and concepts.\n\nLONG DESCRIPTION\n  PowerShell Help describes PowerShell cmdlets, functions, scripts, and\n  modules, and explains concepts, including the elements of the PowerShell\n  language.\n\n  To get help for a cmdlet, type: Get-Help <cmdlet-name>\n      Example: Get-Help Get-Process\n\n  To see examples, type: Get-Help <cmdlet-name> -Examples\n\n  To discover commands, type: Get-Command\n      Example: Get-Command *-Service\n\n  To see what an object can do, pipe it to Get-Member:\n      Example: Get-Date | Get-Member\n`;
    const res = rt.resolveCommand(name);
    if (!res && TX.hasGlob(name)) {
      const re = TX.likeToRegex(name);
      const rows = Object.values(TX.psCmdlets).filter((c) => re.test(c.name)).map((c) => ({ __type: 'HelpInfoShort', Name: c.name, Category: 'Cmdlet', Module: '', Synopsis: (PSH[c.name.toLowerCase()] || [''])[0] }));
      return TX.psRenderTable(rows, [{ label: 'Name', name: 'Name' }, { label: 'Category', name: 'Category' }, { label: 'Module', name: 'Module' }, { label: 'Synopsis', name: 'Synopsis' }], rt, { auto: true });
    }
    if (!res) return C.red(`Get-Help: Get-Help could not find ${name} in a help file in this session.`);
    const cn = res.name;
    const h = PSH[cn.toLowerCase()];
    const def = res.def;
    const params = def && def.params ? Object.keys(def.params).map((k) => { const p = def.params[k]; const t = p.sw ? '' : ' <Object>'; return p.pos !== undefined ? `[[-${k}]${t}]` : `[-${k}${t}]`; }).join(' ') : '[<CommonParameters>]';
    const L = ['', 'NAME', '    ' + cn, '', 'SYNOPSIS', '    ' + (h ? h[0] : `${cn} (TerminalEX has a short help entry for this command.)`), '', '', 'SYNTAX', `    ${cn} ${params} [<CommonParameters>]`, '', ''];
    if (opts.examples && h) { L.length = 0; L.push('', 'NAME', '    ' + cn, '', 'SYNOPSIS', '    ' + h[0], ''); h[2].forEach(([ex, d], i) => L.push(`    -------------------------- Example ${i + 1} --------------------------`, '', '    PS C:\\> ' + ex, '', d ? '    ' + d : '', '')); return L.join('\n'); }
    L.push('DESCRIPTION');
    wrapText(h ? h[1] : 'No detailed description is available in TerminalEX yet.', 76).forEach((l) => L.push('    ' + l));
    if (h && (opts.full || true)) { L.push('', '', 'EXAMPLES'); h[2].forEach(([ex, d]) => { L.push('    PS C:\\> ' + ex); if (d) L.push('        ' + d); }); }
    const aliases = Object.keys(TX.psAliases).filter((a) => TX.psAliases[a].toLowerCase() === cn.toLowerCase());
    L.push('', '', 'RELATED LINKS', `    Online Version: https://learn.microsoft.com/powershell/module/${cn.toLowerCase()}`, '', 'REMARKS', `    To see the examples, type: "Get-Help ${cn} -Examples".`, aliases.length ? `    Aliases: ${aliases.join(', ')}` : '', '');
    return L.join('\n');
  }

  // ------------------------------------------------------------------ cheat sheet (task -> each shell)
  const CHEAT = [
    ['Where am I?', 'pwd', 'cd', 'Get-Location  (pwd)'],
    ['List files', 'ls -la', 'dir', 'Get-ChildItem  (ls, dir)'],
    ['Show hidden files', 'ls -a', 'dir /a', 'Get-ChildItem -Force'],
    ['Change folder', 'cd Documents', 'cd Documents', 'Set-Location Documents  (cd)'],
    ['Go up one level', 'cd ..', 'cd ..', 'cd ..'],
    ['Make a folder', 'mkdir notes', 'mkdir notes', 'New-Item -ItemType Directory notes  (mkdir)'],
    ['Make an empty file', 'touch a.txt', 'type nul > a.txt', 'New-Item a.txt'],
    ['Show a file', 'cat a.txt', 'type a.txt', 'Get-Content a.txt  (cat)'],
    ['Copy', 'cp a.txt b.txt', 'copy a.txt b.txt', 'Copy-Item a.txt b.txt  (cp)'],
    ['Move / rename', 'mv a.txt b.txt', 'move a.txt b.txt / ren', 'Move-Item / Rename-Item'],
    ['Delete a file', 'rm a.txt', 'del a.txt', 'Remove-Item a.txt  (rm)'],
    ['Delete a folder', 'rm -r folder', 'rmdir /s folder', 'Remove-Item folder -Recurse'],
    ['Search in files', 'grep -r "word" .', 'findstr /s "word" *', 'Select-String "word" *.txt'],
    ['Find files by name', 'find . -name "*.txt"', 'dir /s *.txt', 'Get-ChildItem -Recurse -Filter *.txt'],
    ['Write text to a file', 'echo hi > a.txt', 'echo hi > a.txt', '"hi" | Out-File a.txt  (or > a.txt)'],
    ['Count lines', 'wc -l a.txt', 'find /c /v "" a.txt', '(Get-Content a.txt).Count'],
    ['Sort lines', 'sort a.txt', 'sort a.txt', 'Get-Content a.txt | Sort-Object'],
    ['Clear the screen', 'clear  (Ctrl+L)', 'cls', 'Clear-Host  (cls)'],
    ['Command help', 'man ls  /  ls --help', 'dir /?  /  help dir', 'Get-Help Get-ChildItem'],
    ['Variables', 'NAME=Kinny; echo $NAME', 'set NAME=Kinny & echo %NAME%', '$name = "Kinny"; $name'],
    ['Environment variable', 'echo $HOME', 'echo %USERPROFILE%', '$env:USERPROFILE'],
    ['Running processes', 'ps aux  /  top', 'tasklist', 'Get-Process  (ps)'],
    ['Stop a process', 'kill 1234', 'taskkill /PID 1234', 'Stop-Process -Id 1234'],
    ['Services', 'systemctl status ssh', 'sc query', 'Get-Service'],
    ['Disk space', 'df -h', 'wmic logicaldisk get size,freespace', 'Get-Volume'],
    ['Disks & partitions', 'lsblk  /  sudo fdisk -l', 'diskpart → list disk', 'Get-Disk / Get-Partition'],
    ['Memory', 'free -h', 'systeminfo', 'Get-CimInstance Win32_OperatingSystem'],
    ['My IP address', 'ip addr', 'ipconfig', 'Get-NetIPAddress'],
    ['Test a connection', 'ping -c 4 google.com', 'ping google.com', 'Test-Connection google.com'],
    ['Trace the route', 'traceroute google.com', 'tracert google.com', 'Test-NetConnection google.com -TraceRoute'],
    ['DNS lookup', 'dig google.com', 'nslookup google.com', 'Resolve-DnsName google.com'],
    ['Download a page', 'curl https://example.com', 'curl https://example.com', 'Invoke-WebRequest https://example.com'],
    ['Who am I?', 'whoami', 'whoami', 'whoami  /  $env:USERNAME'],
    ['System info', 'uname -a', 'systeminfo', 'Get-ComputerInfo'],
    ['Run as admin', 'sudo command', '(Run as administrator)', 'Start-Process powershell -Verb RunAs'],
    ['Install software', 'sudo apt install x  /  brew install x', 'winget install x', 'winget install x'],
    ['Command history', 'history  (Ctrl+R)', 'doskey /history  (F7)', 'Get-History  (Ctrl+R)'],
    ['Pipe output', 'ls | grep txt', 'dir | find "txt"', 'ls | Where-Object Name -like "*txt*"'],
  ];

  TX.docs = {
    get: (n) => DB[n],
    all: () => Object.values(DB),
    manPage,
    posixHelp,
    cmdHelp,
    cmdHelpAll,
    psHelp,
    CHEAT,
    CATS,
  };
})();
