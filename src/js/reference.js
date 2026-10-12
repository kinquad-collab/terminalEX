/* TerminalEX — the Interactive Cheat Sheet: everyday tasks, answered side by side for eight systems, each with ▶ Run.
 * Cell format: 'command'  |  '!why there is no equivalent'  |  { c: 'command', n: 'note', setup: [...], input: [...], run: false }.
 * Every runnable cell is executed by the test suite on a fresh machine and must not fail with "command not found". */
(function () {
  'use strict';
  const TX = window.TX;

  const PLATS = [
    { k: 'bash', label: 'Linux', sub: 'bash · Ubuntu', shell: 'bash' },
    { k: 'zsh', label: 'macOS', sub: 'zsh', shell: 'zsh' },
    { k: 'freebsd', label: 'FreeBSD', sub: 'sh', shell: 'freebsd' },
    { k: 'solaris', label: 'Solaris', sub: 'ksh93', shell: 'solaris' },
    { k: 'unix', label: 'UNIX V7', sub: 'Bourne sh, 1979', shell: 'unix' },
    { k: 'cmd', label: 'Windows cmd', sub: 'cmd.exe', shell: 'cmd' },
    { k: 'powershell', label: 'PowerShell', sub: '5.1 / 7', shell: 'powershell' },
    { k: 'dos', label: 'MS-DOS', sub: '6.22, 1994', shell: 'dos' },
  ];
  // Commands run from the home folder. DOS has no home folder, so its examples start in C:\STUDENT.
  const SETUP = { dos: ['CD STUDENT'] };
  const NO_V7 = (what, when) => '!' + what + ' did not exist yet' + (when ? ' (' + when + ')' : '') + '.';
  const NO_DOS = (what) => '!MS-DOS had no ' + what + '.';

  const CATS = [
    ['nav', '🧭', 'Getting around'], ['files', '📁', 'Files & folders'], ['read', '📖', 'Reading files'], ['text', '🔎', 'Search & text'],
    ['pipes', '🔀', 'Pipes & redirection'], ['vars', '💲', 'Variables & PATH'], ['sys', '🖥️', 'System info'], ['proc', '⚙️', 'Processes'],
    ['net', '🌐', 'Networking'], ['perm', '🔐', 'Users & permissions'], ['pkg', '📦', 'Installing software'], ['disk', '💾', 'Disks & storage'],
    ['svc', '🛎️', 'Services'], ['script', '📜', 'Scripts & automation'], ['help', '🛟', 'Help & history'], ['arch', '🗜️', 'Archives & hashes'], ['git', '🌿', 'Git'],
  ];

  const T = [];
  const add = (cat, id, task, why, cells, tags) => T.push({ cat, id, task, why, cells, tags: tags || '' });

  // ------------------------------------------------------------------ Getting around
  add('nav', 'pwd', 'Where am I?', 'Every terminal has a current directory (folder). Relative paths start from here.', {
    bash: 'pwd', zsh: 'pwd', freebsd: 'pwd', solaris: 'pwd', unix: 'pwd', cmd: 'cd', powershell: 'Get-Location', dos: { c: 'CD', n: 'CD with nothing after it prints the current folder. The prompt $P$G also shows it.' },
  }, 'current directory folder location');
  add('nav', 'ls', 'List the files here', 'The first command almost everyone types.', {
    bash: 'ls', zsh: 'ls', freebsd: 'ls', solaris: 'ls', unix: { c: 'ls', n: 'One name per line: listing in columns came later, from Berkeley.' }, cmd: 'dir', powershell: { c: 'Get-ChildItem', n: 'ls and dir also work: they are aliases.' }, dos: 'DIR',
  }, 'list directory dir');
  add('nav', 'lsl', 'List with sizes and dates', 'The long listing shows permissions, owner, size and date.', {
    bash: 'ls -l', zsh: 'ls -l', freebsd: 'ls -l', solaris: 'ls -l', unix: 'ls -l', cmd: 'dir', powershell: 'Get-ChildItem | Format-Table Name, Length, LastWriteTime', dos: 'DIR',
  }, 'long details size date');
  add('nav', 'hidden', 'Show hidden files', 'UNIX hides names that start with a dot. Windows and DOS hide files with a "hidden" attribute instead.', {
    bash: 'ls -a', zsh: 'ls -a', freebsd: 'ls -a', solaris: 'ls -a', unix: 'ls -a', cmd: 'dir /a', powershell: 'Get-ChildItem -Force', dos: 'DIR /A',
  }, 'dot files attribute');
  add('nav', 'wide', 'List in columns (wide)', 'Fit more names on the screen.', {
    bash: 'ls -C', zsh: 'ls -C', freebsd: 'ls -C', solaris: 'ls -C', unix: '!V7 ls printed one name per line. ls -C (columns) came with BSD UNIX.', cmd: 'dir /w', powershell: 'Get-ChildItem | Format-Wide', dos: 'DIR /W',
  }, 'columns');
  add('nav', 'cd', 'Go into a folder', 'Change the current directory.', {
    bash: 'cd Documents', zsh: 'cd Documents', freebsd: 'cd Documents', solaris: 'cd Documents', unix: 'cd Documents', cmd: 'cd Documents', powershell: 'Set-Location Documents', dos: { c: 'CD REPORTS', n: 'DOS can\'t use the name DOCUMENTS (more than 8 letters), so the example folder is REPORTS.' },
  }, 'change directory');
  add('nav', 'up', 'Go up one folder', '.. always means "the folder above this one".', {
    bash: 'cd ..', zsh: 'cd ..', freebsd: 'cd ..', solaris: 'cd ..', unix: 'cd ..', cmd: 'cd ..', powershell: 'Set-Location ..', dos: { c: 'CD..', n: 'DOS accepts CD.. with no space.' },
  }, 'parent');
  add('nav', 'home', 'Go to your home folder', 'Your personal folder.', {
    bash: 'cd ~', zsh: 'cd ~', freebsd: 'cd ~', solaris: 'cd ~', unix: { c: 'cd', n: 'No ~ in 1979: that shortcut came from the C shell at Berkeley. Plain cd (or cd $HOME) goes home.' }, cmd: 'cd %USERPROFILE%', powershell: 'Set-Location ~', dos: '!MS-DOS was a one-person system with no home folder. CD \\ goes to the top of the disk.',
  }, 'tilde home');
  add('nav', 'back', 'Go back to the previous folder', 'Jump back and forth between two folders.', {
    bash: { c: 'cd /tmp\ncd -', n: 'cd - jumps back and prints where you landed.' }, zsh: 'cd /tmp\ncd -', freebsd: 'cd /tmp\ncd -', solaris: 'cd /tmp\ncd -', unix: NO_V7('cd -', 'it came with the Korn shell, 1983'), cmd: { c: 'pushd C:\\Windows\npopd', n: 'pushd remembers where you were; popd goes back.' }, powershell: 'Push-Location C:\\Windows\nPop-Location', dos: NO_DOS('way to remember the previous folder'),
  }, 'previous pushd popd');
  add('nav', 'root', 'Go to the top of the disk', 'UNIX has one tree starting at /. Windows and DOS have one tree per drive letter.', {
    bash: 'cd /', zsh: 'cd /', freebsd: 'cd /', solaris: 'cd /', unix: 'cd /', cmd: 'cd \\', powershell: 'Set-Location \\', dos: 'CD \\',
  }, 'root slash');
  add('nav', 'drive', 'Switch to another drive', 'UNIX attaches ("mounts") every disk somewhere in the one tree; Windows and DOS give each disk a letter.', {
    bash: { c: 'cd /mnt/data', n: 'The second disk is mounted at /mnt/data.' }, zsh: { c: 'cd /Volumes/STUDENT_USB', n: 'macOS mounts disks under /Volumes.' }, freebsd: { c: 'ls /media', n: 'FreeBSD mounts removable disks under /media.' }, solaris: { c: 'cd /export/home', n: 'Solaris mounts ZFS file systems into the one tree.' }, unix: { c: 'cd /usr', n: 'In V7, /usr was literally a second disk (mount shows /dev/rp3 on /usr).' }, cmd: 'D:', powershell: 'Set-Location D:\\', dos: { c: 'D:', n: 'D: is the CD-ROM. A: is the floppy (type INSERT first).' },
  }, 'mount drive letter');
  add('nav', 'tree', 'Show folders as a tree', 'See the shape of a folder at a glance.', {
    bash: { c: 'find . -type d', n: 'tree is not installed by default: sudo apt install tree' }, zsh: 'find . -type d', freebsd: 'find . -type d', solaris: 'find . -type d', unix: 'find . -type d -print', cmd: 'tree', powershell: 'tree', dos: 'TREE',
  }, 'tree structure');
  add('nav', 'clear', 'Clear the screen', 'Start with a clean screen.', {
    bash: 'clear', zsh: 'clear', freebsd: 'clear', solaris: 'clear', unix: '!V7 had no clear command — on a paper terminal there was no screen to clear!', cmd: 'cls', powershell: 'Clear-Host', dos: 'CLS',
  }, 'cls');

  // ------------------------------------------------------------------ Files & folders
  add('files', 'mkdir', 'Make a folder', '', {
    bash: 'mkdir practice', zsh: 'mkdir practice', freebsd: 'mkdir practice', solaris: 'mkdir practice', unix: 'mkdir practice', cmd: 'mkdir practice', powershell: 'New-Item -ItemType Directory practice', dos: 'MD PRACTICE',
  }, 'create directory md');
  add('files', 'mkdirp', 'Make nested folders in one go', 'Create a folder and any missing parent folders.', {
    bash: 'mkdir -p a/b/c', zsh: 'mkdir -p a/b/c', freebsd: 'mkdir -p a/b/c', solaris: 'mkdir -p a/b/c', unix: { c: 'mkdir a\nmkdir a/b\nmkdir a/b/c', n: 'No -p in V7: make each level yourself.' }, cmd: { c: 'mkdir a\\b\\c', n: 'cmd makes the parents automatically.' }, powershell: 'New-Item -ItemType Directory a\\b\\c -Force', dos: 'MD A\nMD A\\B\nMD A\\B\\C',
  }, 'parents');
  add('files', 'touch', 'Make an empty file', '', {
    bash: 'touch notes.txt', zsh: 'touch notes.txt', freebsd: 'touch notes.txt', solaris: 'touch notes.txt', unix: { c: '> notes.txt', n: 'A redirect with no command creates an empty file.' }, cmd: 'type nul > notes.txt', powershell: 'New-Item notes.txt', dos: { c: 'TYPE NUL > NOTES.TXT', n: 'NUL is DOS\'s "nothing" device.' },
  }, 'create empty');
  add('files', 'write', 'Write text into a file', '> creates (or replaces!) a file with a command\'s output.', {
    bash: 'echo "Hello" > hello.txt', zsh: 'echo "Hello" > hello.txt', freebsd: 'echo "Hello" > hello.txt', solaris: 'echo "Hello" > hello.txt', unix: 'echo Hello > hello.txt', cmd: 'echo Hello > hello.txt', powershell: '"Hello" | Set-Content hello.txt', dos: 'ECHO Hello > HELLO.TXT',
  }, 'echo redirect create');
  add('files', 'append', 'Add a line to the end of a file', '>> appends instead of replacing.', {
    bash: 'echo "milk" >> groceries.txt', zsh: 'echo "milk" >> groceries.txt', freebsd: 'echo "milk" >> groceries.txt', solaris: 'echo "milk" >> groceries.txt', unix: 'echo milk >> groceries.txt', cmd: 'echo milk >> groceries.txt', powershell: 'Add-Content groceries.txt "milk"', dos: 'ECHO milk >> GROCERY.TXT',
  }, 'append');
  add('files', 'typein', 'Type a file in by hand (no editor)', 'Old-school: send the keyboard straight into a file.', {
    bash: { c: 'cat > note.txt', input: ['first line', 'second line'], n: 'Type lines, then press Ctrl+D on an empty line to finish.' }, zsh: { c: 'cat > note.txt', input: ['first line'], n: 'Ctrl+D finishes.' }, freebsd: { c: 'cat > note.txt', input: ['first line'] }, solaris: { c: 'cat > note.txt', input: ['first line'] }, unix: { c: 'cat > note', input: ['first line'], n: 'Ctrl+D finishes.' }, cmd: { c: 'copy con note.txt', run: false, n: 'Type lines, then Ctrl+Z and Enter.' }, powershell: { c: 'Read-Host "Text" | Set-Content note.txt', input: ['first line'] }, dos: { c: 'COPY CON NOTE.TXT', input: ['first line', '^Z'], n: 'Type lines, then ^Z (or F6) and Enter. "CON" is the console: your keyboard.' },
  }, 'copy con heredoc keyboard');
  add('files', 'cp', 'Copy a file', '', {
    bash: 'cp groceries.txt shopping.txt', zsh: 'cp groceries.txt shopping.txt', freebsd: 'cp groceries.txt shopping.txt', solaris: 'cp groceries.txt shopping.txt', unix: 'cp groceries.txt shopping.txt', cmd: 'copy groceries.txt shopping.txt', powershell: 'Copy-Item groceries.txt shopping.txt', dos: 'COPY GROCERY.TXT SHOPPING.TXT',
  }, 'duplicate');
  add('files', 'cpr', 'Copy a whole folder', 'Copying folders needs a "recursive" option.', {
    bash: 'cp -r Documents backup', zsh: 'cp -R Documents backup', freebsd: 'cp -R Documents backup', solaris: 'cp -r Documents backup', unix: { c: 'cp -r Documents backup', run: false, n: '!' }, cmd: 'xcopy Documents backup /E /I', powershell: 'Copy-Item Documents backup -Recurse', dos: 'XCOPY REPORTS BACKUP /S',
  }, 'recursive xcopy');
  T[T.length - 1].cells.unix = '!V7 cp copied files only. People used  tar  or  cpio  to copy folders.';
  add('files', 'mv', 'Rename a file', 'Renaming is moving a file to a new name in the same place.', {
    bash: 'mv poem.txt verse.txt', zsh: 'mv poem.txt verse.txt', freebsd: 'mv poem.txt verse.txt', solaris: 'mv poem.txt verse.txt', unix: 'mv groceries.txt list', cmd: 'ren groceries.txt list.txt', powershell: 'Rename-Item groceries.txt list.txt', dos: 'REN POEM.TXT VERSE.TXT',
  }, 'rename move ren');
  T[T.length - 1].cells.bash = 'mv groceries.txt list.txt'; T[T.length - 1].cells.zsh = 'mv groceries.txt list.txt'; T[T.length - 1].cells.freebsd = 'mv groceries.txt list.txt'; T[T.length - 1].cells.solaris = 'mv groceries.txt list.txt';
  add('files', 'mvdir', 'Move a file into a folder', '', {
    bash: 'mv groceries.txt Documents/', zsh: 'mv groceries.txt Documents/', freebsd: 'mv groceries.txt Documents/', solaris: 'mv groceries.txt Documents/', unix: 'mv groceries.txt Documents', cmd: 'move groceries.txt Documents', powershell: 'Move-Item groceries.txt Documents', dos: 'MOVE GROCERY.TXT REPORTS',
  }, 'move');
  add('files', 'rm', 'Delete a file', 'There is no Recycle Bin in a terminal: deleted is gone.', {
    bash: 'rm groceries.txt', zsh: 'rm groceries.txt', freebsd: 'rm groceries.txt', solaris: 'rm groceries.txt', unix: 'rm groceries.txt', cmd: 'del groceries.txt', powershell: 'Remove-Item groceries.txt', dos: { c: 'DEL GROCERY.TXT', n: 'DOS only erased the first letter of the name, so UNDELETE could often bring it back.' },
  }, 'remove erase delete');
  add('files', 'rmdir', 'Delete an empty folder', '', {
    bash: 'mkdir old\nrmdir old', zsh: 'mkdir old\nrmdir old', freebsd: 'mkdir old\nrmdir old', solaris: 'mkdir old\nrmdir old', unix: 'mkdir old\nrmdir old', cmd: 'mkdir old\nrmdir old', powershell: 'New-Item -ItemType Directory old\nRemove-Item old', dos: 'MD OLD\nRD OLD',
  }, 'rd remove directory');
  add('files', 'rmrf', 'Delete a folder and everything in it', 'Powerful and dangerous. Read it twice before you press Enter.', {
    bash: 'rm -r projects', zsh: 'rm -r projects', freebsd: 'rm -r projects', solaris: 'rm -r projects', unix: 'rm -r projects', cmd: 'rmdir /s /q projects', powershell: 'Remove-Item projects -Recurse -Force', dos: { c: 'DELTREE /Y BASIC', n: 'DELTREE arrived in MS-DOS 6.0 (1993). Before that: delete every file, then RD.' },
  }, 'deltree recursive');
  add('files', 'glob', 'Work with every .txt file', 'Wildcards: * matches anything, ? matches one character.', {
    bash: 'ls *.txt', zsh: 'ls *.txt', freebsd: 'ls *.txt', solaris: 'ls *.txt', unix: 'ls *.txt', cmd: 'dir *.txt', powershell: 'Get-ChildItem *.txt', dos: 'DIR *.TXT',
  }, 'wildcard star pattern');
  add('files', 'size', 'How big is a file?', '', {
    bash: 'ls -lh groceries.txt', zsh: 'ls -lh groceries.txt', freebsd: 'ls -lh groceries.txt', solaris: 'ls -l groceries.txt', unix: 'ls -l groceries.txt', cmd: 'dir groceries.txt', powershell: '(Get-Item groceries.txt).Length', dos: 'DIR GROCERY.TXT',
  }, 'bytes length');
  add('files', 'du', 'How big is a folder?', '', {
    bash: 'du -sh Documents', zsh: 'du -sh Documents', freebsd: 'du -sh Documents', solaris: 'du -sh Documents', unix: { c: 'du -s Documents', n: 'Sizes are in 512-byte blocks: -h (human-readable) did not exist.' }, cmd: 'dir /s Documents', powershell: '(Get-ChildItem Documents -Recurse | Measure-Object Length -Sum).Sum', dos: 'DIR /S REPORTS',
  }, 'disk usage folder size');
  add('files', 'file', 'What kind of file is this?', 'file looks inside the file instead of trusting its extension.', {
    bash: 'file Documents/grades.csv', zsh: 'file Documents/grades.csv', freebsd: 'file Documents/grades.csv', solaris: 'file Documents/grades.csv', unix: 'file Documents/grades.csv', cmd: '!cmd trusts the extension: grades.csv is whatever program is set to open .csv files. (assoc .csv shows it.)', powershell: '(Get-Item Documents\\grades.csv).Extension', dos: '!DOS only knew the 3-letter extension: COM, EXE and BAT run; everything else is data.',
  }, 'type');
  add('files', 'edit', 'Edit a file', 'Open a text editor in the terminal.', {
    bash: { c: 'nano groceries.txt', run: false, n: 'nano shows its shortcuts at the bottom. Ctrl+O saves, Ctrl+X exits.' }, zsh: { c: 'nano groceries.txt', run: false }, freebsd: { c: 'vi groceries.txt', run: false, n: 'vi is always there on BSD. Press i to type, Esc then :wq to save and quit.' }, solaris: { c: 'vi groceries.txt', run: false }, unix: { c: 'ed groceries.txt', run: false, n: 'ed is a LINE editor: no screen. vi was written later (1976) at Berkeley.' }, cmd: { c: 'notepad groceries.txt', run: false }, powershell: { c: 'notepad groceries.txt', run: false }, dos: { c: 'EDIT GROCERY.TXT', run: false, n: 'The blue MS-DOS Editor, new in DOS 5 (1991).' },
  }, 'editor nano vi ed notepad');

  // ------------------------------------------------------------------ Reading files
  add('read', 'cat', 'Print a file', '', {
    bash: 'cat Documents/poem.txt', zsh: 'cat Documents/poem.txt', freebsd: 'cat Documents/poem.txt', solaris: 'cat Documents/poem.txt', unix: 'cat Documents/poem.txt', cmd: 'type Documents\\poem.txt', powershell: 'Get-Content Documents\\poem.txt', dos: 'TYPE POEM.TXT',
  }, 'type show print');
  add('read', 'head', 'First 3 lines of a file', 'Peek at the start of a big file.', {
    bash: 'head -n 3 groceries.txt', zsh: 'head -n 3 groceries.txt', freebsd: 'head -n 3 groceries.txt', solaris: 'head -n 3 groceries.txt', unix: { c: 'sed 3q groceries.txt', n: 'No head in V7 (it came from BSD). sed 3q prints 3 lines then quits.' }, cmd: '!cmd has no head. PowerShell does: Get-Content -TotalCount 3', powershell: 'Get-Content groceries.txt -TotalCount 3', dos: NO_DOS('way to show only the first lines'),
  }, 'head top start');
  add('read', 'tail', 'Last 3 lines of a file', 'Logs grow at the bottom, so tail is how you read them.', {
    bash: 'tail -n 3 groceries.txt', zsh: 'tail -n 3 groceries.txt', freebsd: 'tail -n 3 groceries.txt', solaris: 'tail -3 groceries.txt', unix: 'tail -3 groceries.txt', cmd: '!cmd has no tail. Use PowerShell: Get-Content -Tail 3', powershell: 'Get-Content groceries.txt -Tail 3', dos: NO_DOS('tail command'),
  }, 'end bottom log');
  add('read', 'page', 'Read a long file one screen at a time', 'A "pager".', {
    bash: { c: 'less /var/log/syslog', run: false, n: 'Space = next page, q = quit, / = search.' }, zsh: { c: 'less Documents/README.txt', run: false }, freebsd: { c: 'less /var/log/messages', run: false }, solaris: { c: 'more /var/adm/messages', run: false, n: 'more is the classic Solaris pager.' }, unix: '!V7 had no pager: on a printing terminal you just read the paper. (more came from Berkeley in 1978.)', cmd: { c: 'more Documents\\README.txt', run: false }, powershell: { c: 'Get-Content Documents\\README.txt | more', run: false }, dos: 'MORE < README.TXT',
  }, 'more less pager');
  add('read', 'wc', 'Count lines, words and characters', '', {
    bash: 'wc groceries.txt', zsh: 'wc groceries.txt', freebsd: 'wc groceries.txt', solaris: 'wc groceries.txt', unix: 'wc groceries.txt', cmd: 'find /c /v "" groceries.txt', powershell: 'Get-Content groceries.txt | Measure-Object -Line -Word -Character', dos: { c: 'FIND /C /V "" GROCERY.TXT', n: 'A trick: count the lines that do NOT contain "" (the empty string) — that is every line.' },
  }, 'count lines words measure');
  add('read', 'nl', 'Show line numbers', '', {
    bash: 'cat -n groceries.txt', zsh: 'cat -n groceries.txt', freebsd: 'cat -n groceries.txt', solaris: 'cat -n groceries.txt', unix: { c: 'grep -n "" groceries.txt', n: 'grep -n numbers every line that matches "" — all of them.' }, cmd: 'findstr /n "^" groceries.txt', powershell: 'Get-Content groceries.txt | ForEach-Object { "{0} {1}" -f $_.ReadCount, $_ }', dos: 'FIND /N /V "" GROCERY.TXT',
  }, 'numbers');
  add('read', 'diff', 'Compare two files', 'Show what changed between two versions.', {
    bash: 'cp groceries.txt old.txt\necho tea >> groceries.txt\ndiff old.txt groceries.txt', zsh: 'cp groceries.txt old.txt\necho tea >> groceries.txt\ndiff old.txt groceries.txt', freebsd: 'cp groceries.txt old.txt\necho tea >> groceries.txt\ndiff old.txt groceries.txt', solaris: 'cp groceries.txt old.txt\necho tea >> groceries.txt\ndiff old.txt groceries.txt', unix: 'cp groceries.txt old\necho tea >> groceries.txt\ndiff old groceries.txt', cmd: 'copy groceries.txt old.txt\necho tea >> groceries.txt\nfc old.txt groceries.txt', powershell: 'Copy-Item groceries.txt old.txt\nAdd-Content groceries.txt tea\nCompare-Object (Get-Content old.txt) (Get-Content groceries.txt)', dos: 'COPY GROCERY.TXT OLD.TXT\nECHO tea >> GROCERY.TXT\nFC OLD.TXT GROCERY.TXT',
  }, 'fc compare-object difference');

  // ------------------------------------------------------------------ Search & text
  add('text', 'grep', 'Find lines containing a word', 'grep is named after the ed command g/re/p: Global, Regular Expression, Print.', {
    bash: 'grep apple groceries.txt', zsh: 'grep apple groceries.txt', freebsd: 'grep apple groceries.txt', solaris: 'grep apple groceries.txt', unix: 'grep apple groceries.txt', cmd: 'findstr apple groceries.txt', powershell: 'Select-String apple groceries.txt', dos: { c: 'FIND "apple" GROCERY.TXT', n: 'The quotes are required.' },
  }, 'search findstr select-string');
  add('text', 'grepi', 'Search ignoring UPPER/lower case', '', {
    bash: 'grep -i APPLE groceries.txt', zsh: 'grep -i APPLE groceries.txt', freebsd: 'grep -i APPLE groceries.txt', solaris: 'grep -i APPLE groceries.txt', unix: { c: 'grep -y APPLE groceries.txt', n: 'V7 grep used -y for "ignore case". -i came later.' }, cmd: 'findstr /i APPLE groceries.txt', powershell: { c: 'Select-String APPLE groceries.txt', n: 'PowerShell ignores case by default. -CaseSensitive turns it on.' }, dos: 'FIND /I "APPLE" GROCERY.TXT',
  }, 'case insensitive');
  T[T.length - 1].cells.unix = { c: 'grep -i APPLE groceries.txt', run: false, n: 'V7 grep used -y for "ignore case"; -i came later. (TerminalEX\'s grep only knows -i.)' };
  add('text', 'grepc', 'Count matching lines', '', {
    bash: 'grep -c coffee groceries.txt', zsh: 'grep -c coffee groceries.txt', freebsd: 'grep -c coffee groceries.txt', solaris: 'grep -c coffee groceries.txt', unix: 'grep -c coffee groceries.txt', cmd: 'find /c "coffee" groceries.txt', powershell: '(Select-String coffee groceries.txt).Count', dos: 'FIND /C "coffee" GROCERY.TXT',
  }, 'count');
  add('text', 'grepv', 'Show lines that do NOT match', '', {
    bash: 'grep -v apple groceries.txt', zsh: 'grep -v apple groceries.txt', freebsd: 'grep -v apple groceries.txt', solaris: 'grep -v apple groceries.txt', unix: 'grep -v apple groceries.txt', cmd: 'findstr /v apple groceries.txt', powershell: 'Select-String -NotMatch apple groceries.txt', dos: 'FIND /V "apple" GROCERY.TXT',
  }, 'invert');
  add('text', 'grepr', 'Search inside every file in a folder', '', {
    bash: 'grep -r Hello projects', zsh: 'grep -r Hello projects', freebsd: 'grep -r Hello projects', solaris: 'grep -r Hello projects', unix: { c: 'find projects -type f -exec grep Hello {} ;', run: false, n: 'No grep -r: find runs grep on each file.' }, cmd: 'findstr /s Hello projects\\*', powershell: 'Get-ChildItem projects -Recurse -File | Select-String Hello', dos: NO_DOS('way to search many folders at once (FIND only reads the files you name)'),
  }, 'recursive');
  add('text', 'findname', 'Find files by name', 'Search the folder tree for a name or pattern.', {
    bash: 'find ~ -name "*.py"', zsh: 'find ~ -name "*.py"', freebsd: 'find ~ -name "*.py"', solaris: 'find ~ -name "*.py"', unix: 'find . -name "*.py" -print', cmd: 'dir /s /b *.py', powershell: 'Get-ChildItem -Recurse -Filter *.py', dos: { c: 'DIR \\*.BAS /S /B', n: 'The 8.3 world: there are .BAS (BASIC) files, not .py.' },
  }, 'locate search name');
  add('text', 'sort', 'Sort lines A→Z', '', {
    bash: 'sort groceries.txt', zsh: 'sort groceries.txt', freebsd: 'sort groceries.txt', solaris: 'sort groceries.txt', unix: 'sort groceries.txt', cmd: 'sort groceries.txt', powershell: 'Get-Content groceries.txt | Sort-Object', dos: 'SORT < GROCERY.TXT',
  }, 'order');
  add('text', 'sortr', 'Sort lines Z→A', '', {
    bash: 'sort -r groceries.txt', zsh: 'sort -r groceries.txt', freebsd: 'sort -r groceries.txt', solaris: 'sort -r groceries.txt', unix: 'sort -r groceries.txt', cmd: 'sort /r groceries.txt', powershell: 'Get-Content groceries.txt | Sort-Object -Descending', dos: 'SORT /R < GROCERY.TXT',
  }, 'reverse');
  add('text', 'sortn', 'Sort numbers by value', 'Text sorting puts 100 before 7. Numeric sort fixes that.', {
    bash: 'sort -n projects/python-practice/numbers.txt', zsh: 'sort -n projects/python-practice/numbers.txt', freebsd: 'sort -n projects/python-practice/numbers.txt', solaris: 'sort -n projects/python-practice/numbers.txt', unix: 'sort -n projects/python-practice/numbers.txt', cmd: '!cmd sort only sorts text.', powershell: 'Get-Content projects\\python-practice\\numbers.txt | Sort-Object { [int]$_ }', dos: '!DOS SORT only sorted text.',
  }, 'numeric');
  add('text', 'uniq', 'Remove duplicate lines', 'uniq only removes duplicates that are next to each other, so sort first.', {
    bash: 'sort groceries.txt | uniq', zsh: 'sort groceries.txt | uniq', freebsd: 'sort groceries.txt | uniq', solaris: 'sort groceries.txt | uniq', unix: 'sort groceries.txt | uniq', cmd: '!cmd has no uniq. PowerShell: Sort-Object -Unique', powershell: 'Get-Content groceries.txt | Sort-Object -Unique', dos: NO_DOS('uniq'),
  }, 'unique duplicates');
  add('text', 'uniqc', 'Count how many unique lines', 'A classic three-command pipeline.', {
    bash: 'sort groceries.txt | uniq | wc -l', zsh: 'sort groceries.txt | uniq | wc -l', freebsd: 'sort groceries.txt | uniq | wc -l', solaris: 'sort groceries.txt | uniq | wc -l', unix: 'sort groceries.txt | uniq | wc -l', cmd: '!No uniq in cmd.', powershell: '(Get-Content groceries.txt | Sort-Object -Unique).Count', dos: NO_DOS('uniq'),
  }, 'pipeline');
  add('text', 'freq', 'Count how often each line appears', '', {
    bash: 'sort groceries.txt | uniq -c | sort -rn', zsh: 'sort groceries.txt | uniq -c | sort -rn', freebsd: 'sort groceries.txt | uniq -c | sort -rn', solaris: 'sort groceries.txt | uniq -c | sort -rn', unix: 'sort groceries.txt | uniq -c | sort -rn', cmd: '!No uniq in cmd.', powershell: 'Get-Content groceries.txt | Group-Object | Sort-Object Count -Descending', dos: NO_DOS('uniq'),
  }, 'frequency group');
  add('text', 'sed', 'Replace a word everywhere', 'sed (stream editor, 1974) edits text as it flows past.', {
    bash: 'sed "s/apples/pears/g" groceries.txt', zsh: 'sed "s/apples/pears/g" groceries.txt', freebsd: 'sed "s/apples/pears/g" groceries.txt', solaris: 'sed "s/apples/pears/g" groceries.txt', unix: 'sed s/apples/pears/g groceries.txt', cmd: '!cmd cannot replace text in a file. Use PowerShell.', powershell: '(Get-Content groceries.txt) -replace "apples", "pears"', dos: NO_DOS('find-and-replace command (you used EDIT)'),
  }, 'substitute replace');
  add('text', 'cut', 'Get one column from a CSV', 'Pull the name column out of grades.csv.', {
    bash: 'cut -d, -f1 Documents/grades.csv', zsh: 'cut -d, -f1 Documents/grades.csv', freebsd: 'cut -d, -f1 Documents/grades.csv', solaris: 'cut -d, -f1 Documents/grades.csv', unix: { c: 'awk -F, \'{print $1}\' Documents/grades.csv', n: 'cut came in System III (1981). awk (1977) could do it.' }, cmd: 'for /f "delims=," %a in (Documents\\grades.csv) do @echo %a', powershell: 'Import-Csv Documents\\grades.csv | Select-Object name', dos: { c: 'FOR %A IN (GRADES.CSV) DO TYPE %A', run: false, n: 'DOS FOR could not split lines. People wrote a QBASIC program instead.' },
  }, 'column csv awk');
  add('text', 'awk', 'Average a column of numbers', 'awk (Aho, Weinberger, Kernighan, 1977) is a small language for columns of text.', {
    bash: 'awk -F, \'NR>1 {s+=$6} END {print s/(NR-1)}\' Documents/grades.csv', zsh: 'awk -F, \'NR>1 {s+=$6} END {print s/(NR-1)}\' Documents/grades.csv', freebsd: 'awk -F, \'NR>1 {s+=$6} END {print s/(NR-1)}\' Documents/grades.csv', solaris: 'awk -F, \'NR>1 {s+=$6} END {print s/(NR-1)}\' Documents/grades.csv', unix: 'awk -F, \'NR>1 {s+=$6} END {print s/(NR-1)}\' Documents/grades.csv', cmd: '!cmd cannot do math on file columns.', powershell: '(Import-Csv Documents\\grades.csv | Measure-Object final -Average).Average', dos: NO_DOS('way to add up a column (people used Lotus 1-2-3)'),
  }, 'average sum math');
  add('text', 'tr', 'Make text UPPERCASE', '', {
    bash: 'tr a-z A-Z < groceries.txt', zsh: 'tr a-z A-Z < groceries.txt', freebsd: 'tr a-z A-Z < groceries.txt', solaris: 'tr a-z A-Z < groceries.txt', unix: 'tr a-z A-Z < groceries.txt', cmd: '!cmd has no tr.', powershell: '(Get-Content groceries.txt).ToUpper()', dos: NO_DOS('tr'),
  }, 'upper case translate');

  // ------------------------------------------------------------------ Pipes & redirection
  add('pipes', 'pipe', 'Send one command\'s output into another', 'The pipe | was added to UNIX in 1973. DOS and Windows copied it.', {
    bash: 'ls | sort -r', zsh: 'ls | sort -r', freebsd: 'ls | sort -r', solaris: 'ls | sort -r', unix: 'ls | sort -r', cmd: 'dir /b | sort /r', powershell: { c: 'Get-ChildItem | Sort-Object Name -Descending', n: 'PowerShell pipes OBJECTS, not text.' }, dos: 'DIR /B | SORT /R',
  }, 'pipe |');
  add('pipes', 'save', 'Save a command\'s output to a file', '', {
    bash: 'ls > files.txt', zsh: 'ls > files.txt', freebsd: 'ls > files.txt', solaris: 'ls > files.txt', unix: 'ls > files', cmd: 'dir /b > files.txt', powershell: 'Get-ChildItem | Out-File files.txt', dos: 'DIR /B > FILES.TXT',
  }, 'redirect output');
  add('pipes', 'null', 'Throw output away', 'Every system has a "black hole" device.', {
    bash: 'ls > /dev/null', zsh: 'ls > /dev/null', freebsd: 'ls > /dev/null', solaris: 'ls > /dev/null', unix: 'ls > /dev/null', cmd: 'dir > nul', powershell: 'Get-ChildItem | Out-Null', dos: 'DIR > NUL',
  }, 'dev null discard');
  add('pipes', 'stderr', 'Save only the error messages', 'Programs have two outputs: normal (1) and errors (2).', {
    bash: 'ls nothing 2> errors.txt\ncat errors.txt', zsh: 'ls nothing 2> errors.txt\ncat errors.txt', freebsd: 'ls nothing 2> errors.txt\ncat errors.txt', solaris: 'ls nothing 2> errors.txt\ncat errors.txt', unix: 'ls nothing 2> errors\ncat errors', cmd: 'dir nothing 2> errors.txt\ntype errors.txt', powershell: 'Get-ChildItem nothing 2> errors.txt\nGet-Content errors.txt', dos: '!COMMAND.COM could not redirect error messages: they always went to the screen.',
  }, 'stderr errors 2>');
  add('pipes', 'and', 'Run the next command only if the first worked', '&& means "and then, if that succeeded".', {
    bash: 'mkdir demo && cd demo', zsh: 'mkdir demo && cd demo', freebsd: 'mkdir demo && cd demo', solaris: 'mkdir demo && cd demo', unix: '!The Bourne shell in V7 had && — try it — but not on one line with cd... it does! mkdir demo && cd demo', cmd: 'mkdir demo && cd demo', powershell: { c: 'New-Item -ItemType Directory demo; if ($?) { Set-Location demo }', n: 'PowerShell 7 also understands &&.' }, dos: '!COMMAND.COM had no && or & at all: one command per line (or a batch file).',
  }, 'and chain conditional');
  T[T.length - 1].cells.unix = 'mkdir demo && cd demo';
  add('pipes', 'seq', 'Run several commands on one line', '', {
    bash: 'date; whoami', zsh: 'date; whoami', freebsd: 'date; whoami', solaris: 'date; whoami', unix: 'date; who am i', cmd: 'date /t & whoami', powershell: 'Get-Date; whoami', dos: '!One command per line in DOS. Put several lines in a .BAT file instead.',
  }, 'semicolon');
  add('pipes', 'tee', 'See output AND save it', 'tee is a T-shaped pipe fitting: output goes two ways.', {
    bash: 'ls | tee files.txt', zsh: 'ls | tee files.txt', freebsd: 'ls | tee files.txt', solaris: 'ls | tee files.txt', unix: 'ls | tee files', cmd: '!cmd has no tee.', powershell: 'Get-ChildItem | Tee-Object files.txt', dos: NO_DOS('tee'),
  }, 'tee');
  add('pipes', 'subst', 'Put a command\'s output inside another command', 'Command substitution.', {
    bash: 'echo "Today is $(date)"', zsh: 'echo "Today is $(date)"', freebsd: 'echo "Today is $(date)"', solaris: 'echo "Today is $(date)"', unix: { c: 'echo Today is `date`', n: 'Backquotes only. $( ) arrived with the Korn shell.' }, cmd: 'for /f "delims=" %d in (\'date /t\') do @echo Today is %d', powershell: '"Today is $(Get-Date)"', dos: NO_DOS('command substitution'),
  }, 'backquote dollar paren');

  // ------------------------------------------------------------------ Variables & PATH
  add('vars', 'echovar', 'Show a variable', '', {
    bash: 'echo $HOME', zsh: 'echo $HOME', freebsd: 'echo $HOME', solaris: 'echo $HOME', unix: 'echo $HOME', cmd: 'echo %USERPROFILE%', powershell: '$env:USERPROFILE', dos: 'ECHO %PATH%',
  }, 'environment variable');
  add('vars', 'setvar', 'Set a variable', '', {
    bash: 'name=Ada\necho "Hi $name"', zsh: 'name=Ada\necho "Hi $name"', freebsd: 'name=Ada\necho "Hi $name"', solaris: 'name=Ada\necho "Hi $name"', unix: 'name=Ada\necho Hi $name', cmd: 'set name=Ada\necho Hi %name%', powershell: '$name = "Ada"\n"Hi $name"', dos: 'SET NAME=Ada\nECHO Hi %NAME%',
  }, 'assign');
  add('vars', 'env', 'List every environment variable', '', {
    bash: 'env', zsh: 'env', freebsd: 'env', solaris: 'env', unix: { c: 'set', n: 'No env command in V7: set lists the shell\'s variables.' }, cmd: 'set', powershell: 'Get-ChildItem Env:', dos: 'SET',
  }, 'printenv');
  add('vars', 'path', 'Show the PATH', 'PATH is the list of folders the shell searches for programs.', {
    bash: 'echo $PATH', zsh: 'echo $PATH', freebsd: 'echo $PATH', solaris: 'echo $PATH', unix: { c: 'echo $PATH', n: 'The empty first entry (:/bin) means "the current folder first".' }, cmd: 'path', powershell: '$env:Path', dos: 'PATH',
  }, 'path');
  add('vars', 'which', 'Which program will run?', 'Find where a command lives.', {
    bash: 'which python3', zsh: 'which python3', freebsd: 'which python3', solaris: 'which python3', unix: { c: 'ls -l /bin/ls', n: 'No which in V7. Programs lived in /bin and /usr/bin.' }, cmd: 'where python', powershell: 'Get-Command python', dos: { c: 'DIR C:\\DOS\\MEM.*', n: 'Look in the PATH folders yourself.' },
  }, 'where get-command type');

  // ------------------------------------------------------------------ System info
  add('sys', 'os', 'Which operating system and version?', '', {
    bash: 'cat /etc/os-release', zsh: 'sw_vers', freebsd: 'freebsd-version', solaris: 'cat /etc/release', unix: { c: 'ls -l /unix', n: 'No uname in V7. The kernel was simply the file /unix.' }, cmd: 'ver', powershell: '$PSVersionTable', dos: 'VER',
  }, 'version release');
  add('sys', 'uname', 'Kernel and CPU type', '', {
    bash: 'uname -a', zsh: 'uname -a', freebsd: 'uname -a', solaris: 'uname -a', unix: NO_V7('uname', 'it came with System III, 1981'), cmd: 'systeminfo', powershell: 'Get-ComputerInfo', dos: 'MSD',
  }, 'kernel architecture');
  add('sys', 'host', 'Computer name', '', {
    bash: 'hostname', zsh: 'hostname', freebsd: 'hostname', solaris: 'hostname', unix: '!V7 had no hostname: the computer was not on a network.', cmd: 'hostname', powershell: '$env:COMPUTERNAME', dos: '!DOS PCs had no network name (unless you added network software).',
  }, 'hostname');
  add('sys', 'whoami', 'Who am I logged in as?', '', {
    bash: 'whoami', zsh: 'whoami', freebsd: 'whoami', solaris: 'whoami', unix: 'who am i', cmd: 'whoami', powershell: 'whoami', dos: '!Nobody logged in to DOS: one computer, one person, no passwords.',
  }, 'user');
  add('sys', 'who', 'Who else is logged in?', 'UNIX was built for many people using one computer at once.', {
    bash: 'who', zsh: 'who', freebsd: 'who', solaris: 'who', unix: 'who', cmd: 'query user', powershell: 'query user', dos: '!Single-user: only you.',
  }, 'users');
  T[T.length - 1].cells.cmd = '!Windows desktops have one person signed in at the keyboard; query user exists on servers.'; T[T.length - 1].cells.powershell = '!Same as cmd: one person at the keyboard.';
  add('sys', 'date', 'Date and time', '', {
    bash: 'date', zsh: 'date', freebsd: 'date', solaris: 'date', unix: { c: 'date', n: 'Look at the year!' }, cmd: 'echo %date% %time%', powershell: 'Get-Date', dos: { c: 'DATE', input: [''], n: 'DOS asks if you want to change it — press Enter to keep it.' },
  }, 'time clock');
  add('sys', 'cal', 'Show a calendar', '', {
    bash: 'cal', zsh: 'cal', freebsd: 'cal', solaris: 'cal', unix: 'cal', cmd: '!No calendar in cmd.', powershell: '!No calendar cmdlet.', dos: NO_DOS('calendar'),
  }, 'calendar');
  add('sys', 'uptime', 'How long has it been running?', '', {
    bash: 'uptime', zsh: 'uptime', freebsd: 'uptime', solaris: 'uptime', unix: '!No uptime in V7.', cmd: 'systeminfo | find "Boot Time"', powershell: 'Get-Uptime', dos: '!DOS did not keep track.',
  }, 'boot');
  add('sys', 'cpu', 'What CPU is inside?', '', {
    bash: 'lscpu', zsh: 'sysctl -n machdep.cpu.brand_string', freebsd: 'sysctl hw.model', solaris: 'psrinfo -pv', unix: '!The CPU was a whole cabinet: a PDP-11/70.', cmd: 'wmic cpu get name', powershell: 'Get-CimInstance Win32_Processor', dos: 'MSD',
  }, 'processor');
  add('sys', 'mem', 'How much memory (RAM)?', '', {
    bash: 'free -h', zsh: 'sysctl hw.memsize', freebsd: 'sysctl hw.physmem', solaris: 'prtconf -m', unix: '!256 KB on a big PDP-11 — your phone has about 30,000 times more.', cmd: 'systeminfo | find "Memory"', powershell: 'Get-CimInstance Win32_ComputerSystem', dos: { c: 'MEM', n: 'Only the first 640 KB ("conventional memory") could run normal programs.' },
  }, 'ram memory free');
  add('sys', 'df', 'Free disk space', '', {
    bash: 'df -h', zsh: 'df -h', freebsd: 'df -h', solaris: 'df -h', unix: { c: 'df', n: 'Free space in blocks.' }, cmd: 'wmic logicaldisk get caption,freespace,size', powershell: 'Get-Volume', dos: { c: 'DIR', n: 'The last line of DIR says "bytes free".' },
  }, 'disk free space');
  add('sys', 'logs', 'Read the system log', 'Where the system writes what happened.', {
    bash: 'tail /var/log/syslog', zsh: { c: 'log show --last 5m', run: false, n: 'macOS keeps logs in a database.' }, freebsd: 'tail /var/log/messages', solaris: { c: 'tail /var/adm/messages', n: 'Solaris uses /var/adm, not /var/log.' }, unix: '!V7 printed kernel messages on the console paper.', cmd: { c: 'eventvwr', run: false, n: 'Event Viewer.' }, powershell: 'Get-EventLog -LogName System -Newest 5', dos: '!No system log in DOS.',
  }, 'syslog messages eventlog');

  // ------------------------------------------------------------------ Processes
  add('proc', 'ps', 'List running programs', 'A running program is a "process", and each one has an ID number (PID).', {
    bash: 'ps aux', zsh: 'ps aux', freebsd: 'ps aux', solaris: { c: 'ps -ef', n: 'Solaris speaks System V: ps -ef. (ps aux is BSD style.)' }, unix: 'ps -ax', cmd: 'tasklist', powershell: 'Get-Process', dos: '!DOS ran ONE program at a time — there was nothing to list.',
  }, 'tasklist get-process');
  add('proc', 'pgrep', 'Find a program\'s ID (PID)', '', {
    bash: 'ps aux | grep firefox', zsh: 'ps aux | grep Safari', freebsd: 'ps aux | grep nginx', solaris: 'ps -ef | grep java', unix: 'ps -ax | grep troff', cmd: 'tasklist | findstr chrome', powershell: 'Get-Process chrome', dos: '!One program at a time.',
  }, 'pid grep');
  add('proc', 'kill', 'Stop a program', 'Send a process the signal to quit.', {
    bash: 'kill 2011', zsh: { c: 'killall Spotify', n: 'killall stops a program by name.' }, freebsd: { c: 'kill 1240', n: 'The Minecraft server.' }, solaris: { c: 'kill 1188', n: 'The java process prstat found.' }, unix: { c: 'kill 40', run: false, n: 'That troff belongs to dmr — you are not allowed to kill other people\'s processes.' }, cmd: 'taskkill /im notepad.exe', powershell: 'Stop-Process -Name notepad', dos: '!Ctrl+C or Ctrl+Break stopped the one running program. If it hung, you pressed Ctrl+Alt+Del to restart the whole PC.',
  }, 'taskkill stop-process');
  add('proc', 'top', 'Live view of the busiest programs', '', {
    bash: { c: 'top', run: false, n: 'q to quit. htop is a friendlier version.' }, zsh: { c: 'top', run: false }, freebsd: { c: 'top', run: false }, solaris: 'prstat 1 1', unix: '!No top: printing a live view on paper would use up the roll!', cmd: { c: 'taskmgr', run: false, n: 'Task Manager.' }, powershell: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', dos: '!One program at a time.',
  }, 'prstat htop task manager');
  add('proc', 'bg', 'Run a program in the background', 'Keep using the shell while it runs.', {
    bash: 'sleep 30 &\njobs', zsh: 'sleep 30 &\njobs', freebsd: 'sleep 30 &\njobs', solaris: 'sleep 30 &\njobs', unix: { c: 'sleep 30 &', n: 'V7 had & but no jobs command (job control came from Berkeley).' }, cmd: 'start notepad', powershell: 'Start-Job { Start-Sleep 30 }', dos: '!Impossible: DOS could only run one program at a time. (TSR "terminate and stay resident" programs were the clever trick.)',
  }, 'background jobs &');
  T[T.length - 1].cells.powershell = { c: 'Start-Process notepad', n: 'Start-Job also runs a script block in the background.' }; T[T.length - 1].cells.cmd = { c: 'start notepad', run: false };

  // ------------------------------------------------------------------ Networking
  add('net', 'ip', 'My IP address', '', {
    bash: 'ip addr', zsh: 'ifconfig en0', freebsd: 'ifconfig em0', solaris: 'ipadm show-addr', unix: '!No network: V7 talked to other computers by phone line with uucp.', cmd: 'ipconfig', powershell: 'Get-NetIPAddress', dos: '!No networking built in.',
  }, 'ipconfig ifconfig address');
  add('net', 'ping', 'Is a computer reachable?', 'ping sends tiny "are you there?" packets and times the reply.', {
    bash: 'ping -c 3 google.com', zsh: 'ping -c 3 google.com', freebsd: 'ping -c 3 google.com', solaris: { c: 'ping google.com', n: 'Solaris ping just says "google.com is alive". ping -s shows timings.' }, unix: '!No network.', cmd: 'ping -n 3 google.com', powershell: 'Test-Connection google.com -Count 3', dos: '!No network.',
  }, 'ping reach');
  add('net', 'dns', 'Look up a name\'s IP (DNS)', 'DNS turns names like google.com into IP addresses.', {
    bash: 'nslookup google.com', zsh: 'nslookup google.com', freebsd: 'nslookup google.com', solaris: 'nslookup google.com', unix: '!No DNS until 1983.', cmd: 'nslookup google.com', powershell: 'Resolve-DnsName google.com', dos: '!No network.',
  }, 'nslookup dig resolve');
  add('net', 'route', 'The path packets take', '', {
    bash: 'traceroute google.com', zsh: 'traceroute google.com', freebsd: 'traceroute google.com', solaris: 'traceroute google.com', unix: '!No network.', cmd: 'tracert google.com', powershell: 'Test-NetConnection google.com -TraceRoute', dos: '!No network.',
  }, 'traceroute tracert hops');
  add('net', 'routes', 'Routing table (where is the gateway?)', '', {
    bash: 'ip route', zsh: 'netstat -rn', freebsd: 'netstat -rn', solaris: 'netstat -rn', unix: '!No network.', cmd: 'route print', powershell: 'Get-NetIPConfiguration', dos: '!No network.',
  }, 'gateway netstat');
  add('net', 'conns', 'Open network connections', '', {
    bash: 'ss -tuln', zsh: 'netstat -an', freebsd: 'sockstat -4l', solaris: 'netstat -an', unix: '!No network.', cmd: 'netstat -an', powershell: 'Get-NetTCPConnection', dos: '!No network.',
  }, 'ports listening sockstat');
  add('net', 'curl', 'Download a web page', '', {
    bash: 'curl example.com', zsh: 'curl example.com', freebsd: 'curl example.com', solaris: 'curl example.com', unix: '!The web was invented in 1989.', cmd: 'curl example.com', powershell: 'Invoke-WebRequest example.com', dos: '!The web did not reach DOS until add-on software in the mid-1990s.',
  }, 'http web wget');
  add('net', 'ssh', 'Log in to another computer', 'ssh (1995) encrypts everything. Before it, telnet sent passwords in plain text.', {
    bash: { c: 'ssh student@MacBook-Pro', run: false }, zsh: { c: 'ssh student@ubuntu-lab', run: false, n: 'The password is student.' }, freebsd: { c: 'ssh student@ubuntu-lab', run: false }, solaris: { c: 'ssh student@ubuntu-lab', run: false }, unix: '!You walked to another terminal. (Or dialed in with cu.)', cmd: { c: 'ssh student@ubuntu-lab', run: false }, powershell: { c: 'ssh student@ubuntu-lab', run: false }, dos: '!No network.',
  }, 'remote login');

  // ------------------------------------------------------------------ Users & permissions
  add('perm', 'chmod', 'Make a file private', 'rw------- means only the owner can read and write.', {
    bash: 'chmod 600 groceries.txt\nls -l groceries.txt', zsh: 'chmod 600 groceries.txt\nls -l groceries.txt', freebsd: 'chmod 600 groceries.txt\nls -l groceries.txt', solaris: 'chmod 600 groceries.txt\nls -l groceries.txt', unix: 'chmod 600 groceries.txt\nls -l groceries.txt', cmd: { c: 'icacls groceries.txt', run: false, n: 'Windows uses access control lists (ACLs) instead of rwx.' }, powershell: 'Get-Acl groceries.txt', dos: { c: 'ATTRIB +R GROCERY.TXT', n: 'DOS only had attributes: read-only, hidden, system, archive. No users, so no privacy.' },
  }, 'permissions rwx acl attrib');
  T[T.length - 1].cells.powershell = { c: 'Get-Acl groceries.txt', run: false, n: 'Windows uses access control lists (ACLs).' };
  add('perm', 'exec', 'Make a script runnable', '', {
    bash: 'chmod +x scripts/backup.sh', zsh: 'echo "echo hi" > hi.sh\nchmod +x hi.sh\n./hi.sh', freebsd: 'echo "echo hi" > hi.sh\nchmod +x hi.sh\n./hi.sh', solaris: 'echo "echo hi" > hi.sh\nchmod +x hi.sh\n./hi.sh', unix: 'echo echo hi > hi\nchmod 755 hi\nhi', cmd: { c: 'echo echo hi > hi.bat\nhi', n: 'Windows decides by the extension: .bat, .cmd, .exe run.' }, powershell: { c: 'Set-Content hi.ps1 \'"hi"\'\n.\\hi.ps1', n: 'Scripts may need: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser' }, dos: { c: 'ECHO ECHO hi > HI.BAT\nHI', n: 'Any file ending in .BAT runs.' },
  }, 'executable chmod +x');
  add('perm', 'admin', 'Run one command as the administrator', 'Admin = root = superuser: allowed to change anything.', {
    bash: { c: 'sudo cat /root/flag.txt', input: ['student'], n: 'Password: student' }, zsh: { c: 'sudo whoami', input: ['student'] }, freebsd: { c: 'su -m root -c whoami', run: false, n: 'No sudo by default: su (root password student), or install sudo with pkg.' }, solaris: 'pfexec cat /root/flag.txt', unix: { c: 'su', input: ['student'], n: 'Become root (password student). Type Ctrl+D to stop.' }, cmd: { c: 'runas /user:Administrator cmd', run: false, n: 'Or right-click → Run as administrator.' }, powershell: { c: 'Start-Process powershell -Verb RunAs', run: false }, dos: '!No users and no admin: every program could change anything — which is also why viruses spread so easily.',
  }, 'sudo root pfexec administrator');
  add('perm', 'su', 'Become another user', '', {
    bash: { c: 'su teacher', input: ['teacher'] }, zsh: { c: 'su teacher', run: false }, freebsd: { c: 'su', input: ['student'], n: 'Root\'s password is student in TerminalEX.' }, solaris: { c: 'su', input: ['student'] }, unix: { c: 'su', input: ['student'] }, cmd: { c: 'runas /user:teacher cmd', run: false }, powershell: { c: 'Start-Process powershell -Credential teacher', run: false }, dos: '!No users.',
  }, 'switch user');
  add('perm', 'id', 'My user ID and groups', '', {
    bash: 'id', zsh: 'id', freebsd: 'id', solaris: 'id', unix: '!No id in V7.', cmd: 'whoami /groups', powershell: 'whoami /groups', dos: '!No users.',
  }, 'uid groups');
  T[T.length - 1].cells.unix = { c: 'grep student /etc/passwd', n: 'No id command: your user number is in /etc/passwd.' };
  add('perm', 'passwd', 'The list of user accounts', '', {
    bash: 'cat /etc/passwd', zsh: { c: 'dscl . list /Users', run: false }, freebsd: 'cat /etc/passwd', solaris: 'cat /etc/passwd', unix: { c: 'cat /etc/passwd', n: 'In 1979 the (scrambled) passwords were in this file. They moved to /etc/shadow later because anyone could read it.' }, cmd: 'net user', powershell: 'Get-LocalUser', dos: '!No users.',
  }, 'accounts users list');

  // ------------------------------------------------------------------ Installing software
  add('pkg', 'install', 'Install a program', 'A package manager downloads and installs software for you.', {
    bash: { c: 'sudo apt install cowsay', input: ['student', 'y'] }, zsh: 'brew install cowsay', freebsd: { c: 'su -m root -c "pkg install -y cowsay"', run: false, n: 'As root: pkg install cowsay' }, solaris: 'pfexec pkg install tree', unix: '!You got software on magnetic tape — and compiled it yourself.', cmd: 'winget install Python.Python.3.12', powershell: 'winget install Python.Python.3.12', dos: '!You bought floppy disks in a box, put Disk 1 in drive A: and typed A:\\INSTALL or A:\\SETUP.',
  }, 'apt brew pkg winget install');
  add('pkg', 'search', 'Search for a program to install', '', {
    bash: 'apt search cowsay', zsh: 'brew search cowsay', freebsd: 'pkg search cowsay', solaris: 'pkg search tree', unix: '!No package manager.', cmd: 'winget search python', powershell: 'winget search python', dos: '!No package manager: read a magazine.',
  }, 'find package');
  add('pkg', 'list', 'List installed programs', '', {
    bash: 'apt list --installed', zsh: 'brew list', freebsd: 'pkg info', solaris: 'pkg list', unix: 'ls /bin /usr/bin', cmd: 'winget list', powershell: 'winget list', dos: 'DIR C:\\ /AD',
  }, 'installed');
  add('pkg', 'source', 'Build a program from source code', 'Before package managers, you compiled everything yourself.', {
    bash: { c: 'make', run: false, n: 'Usually: ./configure && make && sudo make install' }, zsh: { c: 'make', run: false }, freebsd: { c: 'cd /usr/ports/games/sl\nmake', n: 'The Ports Collection: 34,000 programs as recipes. make install clean (as root) installs.' }, solaris: { c: 'make', run: false }, unix: { c: 'cc hello.c', run: false, n: 'cc was the C compiler — C was invented on this system.' }, cmd: '!Windows programs come already built (.exe).', powershell: '!Windows programs come already built (.exe).', dos: '!You bought programs already built.',
  }, 'ports compile make');
  add('pkg', 'update', 'Update everything', '', {
    bash: { c: 'sudo apt update && sudo apt upgrade', run: false }, zsh: 'brew upgrade', freebsd: { c: 'freebsd-update fetch install', run: false, n: 'Base system; packages: pkg upgrade (both as root).' }, solaris: { c: 'pfexec pkg update', n: 'Solaris makes a new boot environment first, so a bad update can be undone (beadm).' }, unix: '!You waited for the next edition on tape.', cmd: { c: 'winget upgrade --all', run: false }, powershell: { c: 'winget upgrade --all', run: false }, dos: '!You bought the next version.',
  }, 'upgrade');

  // ------------------------------------------------------------------ Disks & storage
  add('disk', 'disks', 'List disks and partitions', '', {
    bash: 'lsblk', zsh: 'diskutil list', freebsd: 'gpart show', solaris: { c: 'pfexec format', input: [''], n: 'format lists the disks (then lets you repartition: careful!).' }, unix: 'df', cmd: { c: 'diskpart', run: false, n: 'Then type: list disk' }, powershell: 'Get-Disk', dos: 'FDISK',
  }, 'partitions lsblk gpart');
  add('disk', 'mounts', 'What is mounted where?', '', {
    bash: 'mount', zsh: 'mount', freebsd: 'mount', solaris: 'mount', unix: 'mount', cmd: 'wmic logicaldisk get caption,volumename', powershell: 'Get-PSDrive -PSProvider FileSystem', dos: { c: 'VOL', n: 'Each drive letter has a volume label.' },
  }, 'mount volumes');
  add('disk', 'snapshot', 'Take a snapshot (instant backup)', 'ZFS snapshots copy a whole file system in an instant, for free.', {
    bash: '!Ubuntu\'s default ext4 file system has no snapshots (ZFS and Btrfs do).', zsh: { c: 'tmutil localsnapshot', run: false, n: 'Time Machine snapshots.' }, freebsd: { c: 'zfs list -t snapshot', n: 'Taking one needs root: zfs snapshot zroot/home/student@monday' }, solaris: 'pfexec zfs snapshot rpool/export/home/student@before\nzfs list -t snapshot', unix: '!Backups went to magnetic tape: tar c . (tar = Tape ARchive).', cmd: { c: 'wmic shadowcopy list brief', run: false, n: 'Volume Shadow Copies.' }, powershell: { c: 'Checkpoint-Computer -Description Before', run: false, n: 'A System Restore point.' }, dos: '!COPY *.* A: onto a stack of floppy disks.',
  }, 'zfs backup restore');
  add('disk', 'format', 'Format a disk', 'Formatting erases a disk and prepares it for files.', {
    bash: { c: 'sudo mkfs.ext4 /dev/sdb1', run: false, n: 'Erases the USB stick! Always check the name with lsblk first.' }, zsh: { c: 'diskutil eraseDisk FAT32 USB /dev/disk4', run: false }, freebsd: { c: 'newfs_msdos /dev/da0s1', run: false }, solaris: { c: 'pfexec zpool create', run: false, n: 'With ZFS you make pools instead.' }, unix: { c: 'mkfs /dev/rp1 20000', run: false }, cmd: { c: 'format E: /FS:FAT32', run: false }, powershell: { c: 'Format-Volume -DriveLetter E -FileSystem FAT32', run: false }, dos: { c: 'FORMAT A:', input: ['', 'MYDISK'], n: 'TerminalEX only lets you format the floppy — FORMAT C: asks first, and we pretend you said no.' },
  }, 'erase mkfs');

  add('disk', 'setdisk', 'Bring a new disk online', 'A brand-new disk shows up blank and (on Windows) offline. You bring it online and give it a partition style before you can use it.', {
    bash: { c: 'lsblk\nsudo fdisk -l /dev/sdc', input: ['student'], n: 'Linux disks are always "online"; you partition, format and mount them. The lab disks are /dev/sdc and /dev/sdd.' }, zsh: { c: 'diskutil list', n: 'macOS mounts new disks by itself.' }, freebsd: { c: 'camcontrol devlist', n: 'The lab disks are ada1 and ada2.' }, solaris: { c: 'pfexec format', input: [''], n: 'format lists every disk, including the lab disks c2t0d0 and c2t1d0.' }, unix: '!Disks were washing-machine-sized packs you loaded by hand.', cmd: { c: 'diskpart', input: ['list disk', 'select disk 3', 'online disk', 'exit'], n: 'Inside diskpart: list disk, select disk 3, online disk.' }, powershell: 'Set-Disk -Number 3 -IsOffline $false\nInitialize-Disk -Number 3 -PartitionStyle GPT\nGet-Disk', dos: { c: 'FDISK', n: 'FDISK was how you set up a new hard disk in DOS.' },
  }, 'online offline initialize set-disk diskpart');
  add('disk', 'readonly', 'Make a disk read-only', 'Protect a disk from changes.', {
    bash: { c: 'sudo blockdev --setro /dev/sdc', run: false }, zsh: '!Use Disk Utility.', freebsd: '!Mount it read-only: mount -r', solaris: '!Mount it read-only, or zfs set readonly=on POOL.', unix: '!Flip the write-protect switch on the disk pack.', cmd: { c: 'diskpart', input: ['select disk 4', 'attributes disk set readonly', 'attributes disk', 'exit'] }, powershell: 'Set-Disk -Number 4 -IsReadOnly $true\nGet-Disk -Number 4 | Select-Object Number, IsReadOnly', dos: { c: 'ATTRIB +R GROCERY.TXT', n: 'DOS could only protect single files. A floppy had a sliding write-protect tab.' },
  }, 'readonly protect attributes');
  add('disk', 'raid1', 'Make a mirror (RAID 1)', 'RAID 1 writes everything to two disks, so the computer keeps working when one dies.', {
    bash: { c: 'sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdc /dev/sdd --run\ncat /proc/mdstat', input: ['student'] }, zsh: { c: 'diskutil appleRAID create mirror Mirror JHFS+ disk4 disk5', run: false, n: 'macOS calls it AppleRAID.' }, freebsd: { c: 'su\ngmirror label -v gm0 ada1 ada2\ngmirror status', input: ['student'], n: 'gmirror is FreeBSD\'s mirror. ZFS works too: zpool create tank mirror ada1 ada2' }, solaris: 'pfexec zpool create tank mirror c2t0d0 c2t1d0\nzpool status tank', unix: '!No RAID until 1987 (the word was invented in a paper that year).', cmd: { c: 'diskpart', input: ['select disk 3', 'online disk', 'select disk 4', 'online disk', 'create volume mirror disk=3,4', 'exit'] }, powershell: { c: 'New-StoragePool -FriendlyName Pool1 -PhysicalDisks (Get-PhysicalDisk -CanPool $true) -StorageSubSystemFriendlyName "Windows Storage*"\nNew-VirtualDisk -StoragePoolFriendlyName Pool1 -FriendlyName Mirror1 -ResiliencySettingName Mirror -UseMaximumSize', n: 'Storage Spaces: Simple ≈ RAID 0, Mirror ≈ RAID 1, Parity ≈ RAID 5.' }, dos: '!No RAID in DOS.',
  }, 'raid mirror mdadm zpool storage spaces gmirror');
  add('disk', 'raid0', 'Join disks for speed (RAID 0 stripe)', 'RAID 0 spreads data across disks: faster and bigger, but ONE dead disk loses everything.', {
    bash: { c: 'sudo mdadm --create /dev/md0 --level=0 --raid-devices=2 /dev/sdc /dev/sdd\ncat /proc/mdstat', input: ['student'] }, zsh: { c: 'diskutil appleRAID create stripe Stripe JHFS+ disk4 disk5', run: false }, freebsd: { c: 'su\nzpool create fast ada1 ada2\nzpool status fast', input: ['student'] }, solaris: 'pfexec zpool create fast c2t0d0 c2t1d0\nzpool list', unix: '!No RAID.', cmd: { c: 'diskpart', input: ['select disk 3', 'online disk', 'select disk 4', 'online disk', 'create volume stripe disk=3,4', 'exit'] }, powershell: 'New-StoragePool -FriendlyName Pool1 -PhysicalDisks (Get-PhysicalDisk -CanPool $true) -StorageSubSystemFriendlyName "Windows Storage*"\nNew-VirtualDisk -StoragePoolFriendlyName Pool1 -FriendlyName Fast -ResiliencySettingName Simple -UseMaximumSize', dos: '!No RAID.',
  }, 'stripe raid0');
  add('disk', 'raidcheck', 'Check RAID health', 'Admins check this every day.', {
    bash: { c: 'sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdc /dev/sdd --run\nsudo mdadm --detail /dev/md0', input: ['student'], n: 'cat /proc/mdstat is the quick version.' }, zsh: { c: 'diskutil appleRAID list', run: false }, freebsd: 'zpool status', solaris: 'zpool status', unix: '!No RAID.', cmd: { c: 'diskpart', input: ['list volume', 'exit'] }, powershell: 'Get-StoragePool\nGet-VirtualDisk', dos: '!No RAID.',
  }, 'status health mdstat');
  add('disk', 'raidfail', 'Pretend a disk died', 'The best way to trust a mirror is to break it on purpose (on practice disks!).', {
    bash: { c: 'sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdc /dev/sdd --run\nsudo mdadm /dev/md0 --fail /dev/sdc\ncat /proc/mdstat', input: ['student'], n: 'Then --remove it and --add it back: watch it rebuild.' }, zsh: '!Not simulated on macOS.', freebsd: { c: 'su\nzpool create tank mirror ada1 ada2\nzpool offline tank ada1\nzpool status tank', input: ['student'] }, solaris: 'pfexec zpool create tank mirror c2t0d0 c2t1d0\npfexec zpool offline tank c2t0d0\nzpool status tank', unix: '!No RAID.', cmd: '!Not simulated in diskpart.', powershell: '!Not simulated: in real life you would pull a cable and run Repair-VirtualDisk.', dos: '!No RAID.',
  }, 'degraded fail offline rebuild');

  // ------------------------------------------------------------------ Services
  add('svc', 'list', 'List background services', 'Services (daemons) run in the background: web servers, ssh, printing.', {
    bash: 'systemctl list-units --type=service', zsh: 'launchctl list', freebsd: 'service -e', solaris: 'svcs', unix: { c: 'cat /etc/rc', n: 'Daemons (update, cron) were started by the shell script /etc/rc at boot.' }, cmd: 'sc query', powershell: 'Get-Service', dos: '!No services: one program at a time.',
  }, 'daemons systemctl svcs');
  add('svc', 'status', 'Is the web server running?', '', {
    bash: 'systemctl status nginx', zsh: { c: 'brew services list', run: false }, freebsd: 'service nginx status', solaris: 'svcs http', unix: '!No web servers yet.', cmd: 'sc query wuauserv', powershell: 'Get-Service wuauserv', dos: '!No services.',
  }, 'status');
  add('svc', 'restart', 'Restart a service', 'Needs administrator rights everywhere.', {
    bash: { c: 'sudo systemctl restart nginx', input: ['student'] }, zsh: { c: 'sudo launchctl kickstart -k system/com.openssh.sshd', run: false }, freebsd: { c: 'service nginx restart', run: false, n: 'As root (su first).' }, solaris: 'pfexec svcadm restart ssh', unix: '!Kill it and start it again by hand (or reboot).', cmd: { c: 'net stop spooler && net start spooler', run: false }, powershell: { c: 'Restart-Service spooler', run: false }, dos: '!Reboot (Ctrl+Alt+Del).',
  }, 'restart');
  add('svc', 'broken', 'Which services are broken?', '', {
    bash: 'systemctl --failed', zsh: '!macOS has no single command for this.', freebsd: '!Look in /var/log/messages.', solaris: { c: 'svcs -x', n: 'Solaris explains what is wrong and which log to read.' }, unix: '!Read the console paper.', cmd: '!Use Event Viewer.', powershell: 'Get-Service | Where-Object Status -eq Stopped', dos: '!No services.',
  }, 'failed maintenance');
  add('svc', 'boot', 'Start a service automatically at boot', '', {
    bash: { c: 'sudo systemctl enable nginx', input: ['student'] }, zsh: { c: 'sudo launchctl load -w /Library/LaunchDaemons/x.plist', run: false }, freebsd: { c: 'sysrc nginx_enable=YES', run: false, n: 'Writes nginx_enable="YES" into /etc/rc.conf (as root).' }, solaris: 'pfexec svcadm enable ssh', unix: { c: 'ed /etc/rc', run: false, n: 'Add a line to the boot script /etc/rc.' }, cmd: { c: 'sc config wuauserv start= auto', run: false }, powershell: { c: 'Set-Service wuauserv -StartupType Automatic', run: false }, dos: { c: 'EDIT C:\\AUTOEXEC.BAT', run: false, n: 'Every line of AUTOEXEC.BAT runs when the PC starts. Try editing it, then open a new MS-DOS tab.' },
  }, 'enable autostart rc.conf autoexec');

  // ------------------------------------------------------------------ Scripts & automation
  add('script', 'run', 'Run a script file', '', {
    bash: 'bash scripts/backup.sh', zsh: 'echo "echo hi from a script" > hi.sh\nsh hi.sh', freebsd: 'echo "echo hi from a script" > hi.sh\nsh hi.sh', solaris: 'echo "echo hi from a script" > hi.sh\nksh hi.sh', unix: 'echo echo hi from a script > hi\nsh hi', cmd: 'Documents\\hello.bat', powershell: { c: '.\\Documents\\sysinfo.ps1', n: 'The .\\ is required: PowerShell will not run scripts from the current folder by name alone.' }, dos: 'HELLO',
  }, 'bash bat ps1');
  add('script', 'py', 'Run a Python program', 'Python programs are text files ending in .py. You run them by handing the file to python3.', {
    bash: 'cd automation\npython3 hello.py', zsh: 'cd automation\npython3 hello.py', freebsd: 'cd automation\npython3 hello.py', solaris: 'cd automation\npython3 hello.py', unix: '!Python was created in 1991.', cmd: { c: 'cd automation\npython hello.py', n: 'On Windows the command is python (or py).' }, powershell: 'Set-Location automation\npython hello.py', dos: { c: 'QBASIC /RUN BASIC\\HELLO.BAS', n: 'In 1994 the beginner\'s language was BASIC.' },
  }, 'python py');
  add('script', 'pywrite', 'Make your own .py file', 'Write a one-line program without an editor, then run it.', {
    bash: 'echo \'print("Hello, world!")\' > hi.py\npython3 hi.py', zsh: 'echo \'print("Hello, world!")\' > hi.py\npython3 hi.py', freebsd: 'echo \'print("Hello, world!")\' > hi.py\npython3 hi.py', solaris: 'echo \'print("Hello, world!")\' > hi.py\npython3 hi.py', unix: '!No Python in 1979. The "hello, world" program itself was written in C at Bell Labs.', cmd: 'echo print("Hello, world!") > hi.py\npython hi.py', powershell: 'Set-Content hi.py \'print("Hello, world!")\'\npython hi.py', dos: { c: 'ECHO 10 PRINT "HELLO, WORLD" > HI.BAS\nQBASIC /RUN HI.BAS', n: 'A one-line BASIC program.' },
  }, 'python create hello world');
  add('script', 'pyargs', 'Give a script a file to work on', 'Most automation scripts take the data file as an ARGUMENT after the script name.', {
    bash: 'cd automation\npython3 grade_report.py data/grades.csv', zsh: 'cd automation\npython3 grade_report.py data/grades.csv', freebsd: 'cd automation\npython3 grade_report.py data/grades.csv', solaris: 'cd automation\npython3 grade_report.py data/grades.csv', unix: { c: 'awk -F, \'NR>1 {print $1, $6}\' Documents/grades.csv', n: 'In 1979, awk was the scripting language for data files.' }, cmd: 'cd automation\npython grade_report.py data\\grades.csv', powershell: 'Set-Location automation\npython grade_report.py data\\grades.csv', dos: NO_DOS('Python'),
  }, 'arguments csv automation sys.argv');
  add('script', 'pysave', 'Save a script\'s report to a file', '', {
    bash: 'cd automation\npython3 sales_total.py data/sales.csv > sales.txt\ncat sales.txt', zsh: 'cd automation\npython3 sales_total.py data/sales.csv > sales.txt\ncat sales.txt', freebsd: 'cd automation\npython3 sales_total.py data/sales.csv > sales.txt\ncat sales.txt', solaris: 'cd automation\npython3 sales_total.py data/sales.csv > sales.txt\ncat sales.txt', unix: '!No Python.', cmd: 'cd automation\npython sales_total.py data\\sales.csv > sales.txt\ntype sales.txt', powershell: 'Set-Location automation\npython sales_total.py data\\sales.csv | Out-File sales.txt\nGet-Content sales.txt', dos: NO_DOS('Python'),
  }, 'redirect report');
  add('script', 'pipeline', 'Run a whole pipeline of scripts', 'One script that runs the others in order and keeps a log: the start of real automation.', {
    bash: 'cd automation\nbash run_all.sh\ncat morning.log', zsh: 'cd automation\nbash run_all.sh\ntail -5 morning.log', freebsd: 'cd automation\nsh run_all.sh\ntail -5 morning.log', solaris: 'cd automation\nbash run_all.sh\ntail -5 morning.log', unix: '!No Python.', cmd: 'cd automation\nrun_all\ntype morning.log', powershell: 'Set-Location automation\n.\\run_all.ps1\nGet-Content morning.log -Tail 5', dos: { c: 'MENU', input: ['2', '3'], n: 'A DOS batch menu: the 1990s way to automate. (Here it picks 2 = MEM, then 3 = quit.)' },
  }, 'automation batch log');

  add('script', 'loop', 'Repeat for every file', 'A loop runs the same command on many things.', {
    bash: 'for f in *.txt; do echo "File: $f"; done', zsh: 'for f in *.txt; do echo "File: $f"; done', freebsd: 'for f in *.txt; do echo "File: $f"; done', solaris: 'for f in *.txt; do echo "File: $f"; done', unix: 'for f in *.txt; do echo File: $f; done', cmd: 'for %f in (*.txt) do @echo File: %f', powershell: 'foreach ($f in Get-ChildItem *.txt) { "File: $($f.Name)" }', dos: 'FOR %F IN (*.TXT) DO ECHO File: %F',
  }, 'for each');
  add('script', 'count', 'Count from 1 to 5', '', {
    bash: 'for i in 1 2 3 4 5; do echo $i; done', zsh: 'for i in {1..5}; do echo $i; done', freebsd: 'for i in 1 2 3 4 5; do echo $i; done', solaris: 'for i in 1 2 3 4 5; do echo $i; done', unix: 'for i in 1 2 3 4 5; do echo $i; done', cmd: 'for /l %i in (1,1,5) do @echo %i', powershell: '1..5', dos: 'FOR %I IN (1 2 3 4 5) DO ECHO %I',
  }, 'loop numbers');
  add('script', 'if', 'Do something only if a file exists', '', {
    bash: 'if [ -f groceries.txt ]; then echo "found it"; fi', zsh: 'if [ -f groceries.txt ]; then echo "found it"; fi', freebsd: 'if [ -f groceries.txt ]; then echo "found it"; fi', solaris: 'if [ -f groceries.txt ]; then echo "found it"; fi', unix: 'if test -f groceries.txt; then echo found it; fi', cmd: 'if exist groceries.txt echo found it', powershell: 'if (Test-Path groceries.txt) { "found it" }', dos: 'IF EXIST GROCERY.TXT ECHO found it',
  }, 'condition exists test');
  add('script', 'math', 'Do some arithmetic', '', {
    bash: 'echo $((7 * 6))', zsh: 'echo $((7 * 6))', freebsd: 'echo $((7 * 6))', solaris: 'echo $((7 * 6))', unix: { c: 'expr 7 \\* 6', n: '$(( )) did not exist: expr did the math. The * needs a backslash so the shell does not expand it.' }, cmd: 'set /a 7*6', powershell: '7 * 6', dos: { c: 'QBASIC', input: ['PRINT 7 * 6', 'SYSTEM'], n: 'SET /A arrived later in cmd.exe. DOS users opened QBASIC.' },
  }, 'math calculate expr');
  add('script', 'read', 'Ask the user a question', '', {
    bash: { c: 'read -p "Name? " n; echo "Hi $n"', input: ['Ada'] }, zsh: { c: 'read "n?Name? "; echo "Hi $n"', input: ['Ada'] }, freebsd: { c: 'read -p "Name? " n; echo "Hi $n"', input: ['Ada'] }, solaris: { c: 'read n?"Name? "; echo "Hi $n"', input: ['Ada'] }, unix: { c: 'read n; echo Hi $n', input: ['Ada'] }, cmd: { c: 'set /p n=Name? \necho Hi %n%', input: ['Ada'] }, powershell: { c: '$n = Read-Host "Name?"; "Hi $n"', input: ['Ada'] }, dos: { c: 'CHOICE /C:YN Continue', input: ['Y'], n: 'DOS batch files could only ask single-key questions with CHOICE.' },
  }, 'input prompt');
  add('script', 'comment', 'Write a comment in a script', '', {
    bash: '# this is a comment', zsh: '# this is a comment', freebsd: '# this is a comment', solaris: '# this is a comment', unix: { c: ': this is a comment', n: 'The V7 Bourne shell used the do-nothing command : for comments. (# also works in scripts.)' }, cmd: 'rem this is a comment', powershell: '# this is a comment', dos: 'REM this is a comment',
  }, 'rem #');
  add('script', 'alias', 'Make a shortcut for a command', '', {
    bash: 'alias ll="ls -l"\nll', zsh: 'alias ll="ls -l"\nll', freebsd: 'alias ll="ls -l"\nll', solaris: 'alias ll="ls -l"\nll', unix: '!No aliases in the Bourne shell (they came from csh). Write a tiny script instead.', cmd: { c: 'doskey ll=dir /w', run: false }, powershell: 'Set-Alias ll Get-ChildItem\nll', dos: { c: 'DOSKEY LL=DIR /W', n: 'DOSKEY macros (DOS 5+).' },
  }, 'alias macro shortcut');
  add('script', 'cron', 'Run something every day automatically', '', {
    bash: 'crontab -l', zsh: 'crontab -l', freebsd: 'cat /etc/crontab', solaris: 'crontab -l', unix: { c: 'ps -ax', n: 'cron was already here in 1979 (look for /etc/cron in the list).' }, cmd: { c: 'schtasks /query', run: false }, powershell: { c: 'Get-ScheduledTask', run: false }, dos: '!Nothing ran while you were not there — put it in AUTOEXEC.BAT to run at every start.',
  }, 'schedule crontab schtasks');

  // ------------------------------------------------------------------ Help & history
  add('help', 'man', 'Read the manual for a command', '', {
    bash: { c: 'man ls', n: 'q quits.' }, zsh: 'man ls', freebsd: 'man zfs', solaris: 'man svcs', unix: { c: 'man ls', n: 'The UNIX Programmer\'s Manual was printed in two big binders — man was already here in 1979.' }, cmd: 'help dir', powershell: 'Get-Help Get-ChildItem', dos: 'HELP DIR',
  }, 'manual documentation');
  add('help', 'flag', 'Quick help for one command', '', {
    bash: 'ls --help', zsh: { c: 'man ls', n: 'BSD commands have no --help: use man.' }, freebsd: { c: 'man ls', n: 'BSD commands have no --help.' }, solaris: { c: 'man ls', n: 'Solaris\' own commands have no --help either.' }, unix: 'man ls', cmd: 'dir /?', powershell: 'Get-ChildItem -?', dos: 'DIR /?',
  }, 'help /?');
  add('help', 'all', 'List all the commands', '', {
    bash: 'help', zsh: 'help', freebsd: 'help', solaris: 'help', unix: { c: 'ls /bin /usr/bin', n: 'Every command was a file in /bin or /usr/bin.' }, cmd: 'help', powershell: 'Get-Command', dos: 'HELP',
  }, 'commands');
  add('help', 'history', 'Show commands I typed earlier', '', {
    bash: 'history', zsh: 'history', freebsd: { c: 'fc -l', n: 'The FreeBSD .shrc also makes  h  an alias for it.' }, solaris: 'fc -l', unix: '!No history in 1979 — it was on the paper in front of you.', cmd: 'doskey /history', powershell: 'Get-History', dos: { c: 'DOSKEY\nDOSKEY /HISTORY', n: 'Only after loading DOSKEY.' },
  }, 'previous commands');
  add('help', 'complete', 'Finish a long name for me', '', {
    bash: { c: 'cd Docu', run: false, n: 'Press Tab: the shell completes it to Documents/.' }, zsh: { c: 'cd Docu', run: false, n: 'Press Tab.' }, freebsd: { c: 'cd Docu', run: false, n: 'Press Tab.' }, solaris: { c: 'cd Docu', run: false, n: 'Press Tab.' }, unix: '!No Tab completion: you typed every letter.', cmd: { c: 'cd Docu', run: false, n: 'Press Tab (cycles through matches).' }, powershell: { c: 'Set-Location Docu', run: false, n: 'Press Tab.' }, dos: '!No completion: you typed every letter (8.3 names helped!).',
  }, 'tab');

  // ------------------------------------------------------------------ Archives & hashes
  add('arch', 'tar', 'Pack a folder into one file', 'tar = Tape ARchive: made in 1979 for magnetic tape.', {
    bash: 'tar -czf docs.tar.gz Documents', zsh: 'tar -czf docs.tar.gz Documents', freebsd: 'tar -czf docs.tar.gz Documents', solaris: 'tar -cf docs.tar Documents', unix: { c: 'tar cf docs.tar Documents', n: 'No dash and no compression in 1979.' }, cmd: 'tar -cf docs.tar Documents', powershell: 'Compress-Archive Documents docs.zip', dos: { c: 'XCOPY REPORTS A:\\REPORTS /S', run: false, n: 'People used PKZIP (shareware, 1989): PKZIP DOCS.ZIP *.*' },
  }, 'zip compress archive');
  add('arch', 'zip', 'Make a .zip file', '', {
    bash: 'zip -r docs.zip Documents', zsh: 'zip -r docs.zip Documents', freebsd: 'zip -r docs.zip Documents', solaris: 'zip -r docs.zip Documents', unix: '!ZIP was invented in 1989.', cmd: 'tar -a -cf docs.zip Documents', powershell: 'Compress-Archive Documents docs.zip', dos: '!PKZIP was extra software you downloaded from a BBS.',
  }, 'zip');
  add('arch', 'hash', 'Fingerprint a file (checksum)', 'A hash proves a download was not changed.', {
    bash: 'sha256sum groceries.txt', zsh: 'shasum -a 256 groceries.txt', freebsd: 'sha256sum groceries.txt', solaris: 'sha256sum groceries.txt', unix: { c: 'sum groceries.txt', run: false, n: 'A simple checksum: sum.' }, cmd: 'certutil -hashfile groceries.txt SHA256', powershell: 'Get-FileHash groceries.txt', dos: '!No checksum tool.',
  }, 'sha256 checksum md5');
  T[T.length - 1].cells.cmd = { c: 'certutil -hashfile groceries.txt SHA256', run: false };

  // ------------------------------------------------------------------ Git
  const gitAll = (c, extra) => Object.assign({ bash: c, zsh: c, freebsd: c, solaris: c, cmd: c, powershell: c, unix: '!Version control in 1979 was SCCS. Git arrived in 2005.', dos: '!No git for DOS.' }, extra || {});
  add('git', 'gstatus', 'What changed in my project?', 'git status is the command you will type most.', gitAll('cd projects/hello-web\ngit status', { cmd: 'cd projects\\hello-web\ngit status', powershell: 'Set-Location projects\\hello-web\ngit status' }), 'git status');
  add('git', 'glog', 'Show the history', '', gitAll('cd projects/hello-web\ngit log --oneline', { cmd: 'cd projects\\hello-web\ngit log --oneline', powershell: 'Set-Location projects\\hello-web\ngit log --oneline' }), 'git log');
  add('git', 'gbranch', 'List branches', '', gitAll('cd projects/hello-web\ngit branch -a', { cmd: 'cd projects\\hello-web\ngit branch -a', powershell: 'Set-Location projects\\hello-web\ngit branch -a' }), 'git branch');
  add('git', 'gcommit', 'Save a snapshot (commit)', '', gitAll({ c: 'cd projects/hello-web\necho "<p>new</p>" >> index.html\ngit add index.html\ngit commit -m "Add a paragraph"', n: 'git may ask you to set user.name and user.email first.' }, { cmd: { c: 'cd projects\\hello-web\necho new >> index.html\ngit add index.html\ngit commit -m "Add text"' }, powershell: { c: 'Set-Location projects\\hello-web\nAdd-Content index.html "new"\ngit add index.html\ngit commit -m "Add text"' } }), 'git commit add');

  // ------------------------------------------------------------------ lookup + runner
  const norm = (cell) => (cell == null ? { none: 'No equivalent.' } : typeof cell === 'string' ? (cell[0] === '!' ? { none: cell.slice(1) } : { c: cell }) : cell.c === undefined && cell.none === undefined ? { none: 'No equivalent.' } : cell);
  const cell = (task, plat) => norm(task.cells[plat]);
  // Runs one cell on a fresh sandbox machine and returns the output text.
  async function runCell(task, plat, opts = {}) {
    const p = PLATS.find((x) => x.k === plat);
    const c = cell(task, plat);
    if (!c.c || c.run === false) return null;
    const lines = (SETUP[plat] || []).concat((c.setup || []), c.c.split('\n'));
    const r = await TX.sandbox.run(p.shell, lines, { echo: opts.echo === undefined ? true : opts.echo, input: c.input || [], timeout: opts.timeout || 4000, seed: opts.seed });
    let out = r.out;
    // hide the setup lines from the display
    (SETUP[plat] || []).concat(c.setup || []).forEach((l) => { out = out.replace((typeof opts.echo === 'string' ? opts.echo : '$ ') + l + '\n', ''); });
    return { out, code: r.code, timedOut: r.timedOut };
  }
  function search(q) {
    q = String(q || '').toLowerCase().trim();
    if (!q) return T.slice();
    const words = q.split(/\s+/);
    return T.filter((t) => {
      const hay = (t.task + ' ' + t.why + ' ' + t.tags + ' ' + PLATS.map((p) => { const c = cell(t, p.k); return (c.c || '') + ' ' + (c.n || '') + ' ' + (c.none || ''); }).join(' ')).toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  TX.reference = { PLATS, CATS, TASKS: T, SETUP, cell, runCell, search };
})();
