/* TerminalEX — guided missions with automatic checking */
(function () {
  'use strict';
  const TX = window.TX;

  // helpers ---------------------------------------------------------------
  const H = {
    ran(ctx, re) { return ctx.log.some((c) => re.test(c)); },
    exists(ctx, segs) { return !!ctx.vfs.get(segs); },
    isDir(ctx, segs) { const n = ctx.vfs.get(segs); return !!n && n.t === 'd'; },
    fileHas(ctx, segs, re) { const n = ctx.vfs.get(segs); return !!n && n.t === 'f' && re.test(ctx.vfs.content(n)); },
    installed(ctx, p) { return ctx.m.installed.has(p); },
    procGone(ctx, name) { return !ctx.m.procs.some((p) => p.name.toLowerCase() === name.toLowerCase()); },
    commits(ctx, segs) { const g = ctx.vfs.get(segs.concat('.git')); if (!g || !g.gitdb) return 0; return Object.keys(g.gitdb.objects || {}).length; },
    repo(ctx, segs) { const g = ctx.vfs.get(segs.concat('.git')); return g && g.gitdb; },
  };

  // Linux / bash -------------------------------------------------------------
  const HOME_L = ['home', 'student'];
  const linux = [
    { id: 'l-pwd', title: 'Where am I?', xp: 10, text: 'Every terminal has a "current directory". Print yours.', hint: 'The command is three letters: print working directory.', answer: 'pwd', check: (c) => H.ran(c, /^\s*pwd\b/) },
    { id: 'l-ls', title: 'Look around (even hidden stuff)', xp: 10, text: 'List ALL files in your home folder, including hidden ones (names that start with a dot).', hint: 'ls takes a flag that means "all".', answer: 'ls -a', check: (c) => H.ran(c, /^\s*ls\b.*\s-\w*a/) },
    { id: 'l-secret', title: 'Read the secret message', xp: 15, text: 'There is a hidden file in your home folder with a secret code. Print its contents.', hint: 'Use cat on the file you found with ls -a.', answer: 'cat .secret_message', check: (c) => H.ran(c, /(cat|less|more|head|tail|nano|vim?)\s+.*secret_message/) },
    { id: 'l-mkdir', title: 'Build a workspace', xp: 15, text: 'Create the folder  ~/projects/terminal-practice  (in one command).', hint: 'mkdir has a flag that creates parent folders if needed... though projects already exists.', answer: 'mkdir -p ~/projects/terminal-practice', check: (c) => H.isDir(c, HOME_L.concat('projects', 'terminal-practice')) },
    { id: 'l-write', title: 'Write a file without an editor', xp: 15, text: 'Inside terminal-practice, create hello.txt containing the word Hello — using echo and a redirect.', hint: 'echo "Hello" > FILE  writes text into FILE.', answer: 'echo "Hello" > ~/projects/terminal-practice/hello.txt', check: (c) => H.fileHas(c, HOME_L.concat('projects', 'terminal-practice', 'hello.txt'), /hello/i) },
    { id: 'l-cp', title: 'Copy and rename', xp: 15, text: 'Copy ~/groceries.txt into ~/Documents and name the copy shopping.txt.', hint: 'cp SOURCE DESTINATION', answer: 'cp ~/groceries.txt ~/Documents/shopping.txt', check: (c) => H.exists(c, HOME_L.concat('Documents', 'shopping.txt')) },
    { id: 'l-pipe', title: 'Plumbing 101: pipes', xp: 20, text: 'groceries.txt has duplicates. Using pipes, count how many UNIQUE items it has.', hint: 'sort the file, pipe it to uniq, then pipe to wc -l', answer: 'sort groceries.txt | uniq | wc -l', check: (c) => H.ran(c, /sort.*\|.*uniq.*\|.*wc/) || H.ran(c, /sort\s+-u.*\|.*wc/) },
    { id: 'l-grep', title: 'Log detective', xp: 20, text: 'Find every "404 Not Found" request in /var/log/nginx/access.log. How many are there?', hint: 'grep for " 404 " in the file. Add -c to count.', answer: 'grep " 404 " /var/log/nginx/access.log', check: (c) => H.ran(c, /grep.*404.*access\.log/) },
    { id: 'l-find', title: 'Needle in a haystack', xp: 20, text: 'Use find to locate every .py file under your home directory.', hint: 'find ~ -name "*.py"', answer: 'find ~ -name "*.py"', check: (c) => H.ran(c, /find\s.*-i?name\s+["']?\*\.py/) },
    { id: 'l-sudo', title: 'With great power...', xp: 25, text: 'The file /root/flag.txt is only readable by root. Read it using sudo. (Password: student)', hint: 'Put sudo in front of the command.', answer: 'sudo cat /root/flag.txt', check: (c) => H.ran(c, /sudo.*flag\.txt/) },
    { id: 'l-apt', title: 'Install software', xp: 25, text: 'Install the cowsay package, then make the cow say something.', hint: 'sudo apt install cowsay   then   cowsay hi', answer: 'sudo apt install cowsay', check: (c) => H.installed(c, 'cowsay') && H.ran(c, /^\s*(fortune\s*\|\s*)?cowsay/) },
    { id: 'l-script', title: 'Your first script', xp: 30, text: 'Create hello.sh containing  echo "I made a script!" , make it executable with chmod, and run it with ./hello.sh', hint: 'echo \'echo "I made a script!"\' > hello.sh  →  chmod +x hello.sh  →  ./hello.sh', answer: 'chmod +x hello.sh && ./hello.sh', check: (c) => H.ran(c, /\.\/hello\.sh/) && H.ran(c, /chmod/) },
    { id: 'l-proc', title: 'Process hunter', xp: 25, text: 'Spotify is hogging resources. Find its PID and stop it.', hint: 'ps aux | grep spotify   then   kill PID', answer: 'kill 2011', check: (c) => H.procGone(c, 'spotify') },
    { id: 'l-net', title: 'Network scout', xp: 20, text: 'Find your IP address, then check that google.com is reachable.', hint: 'ip addr  and  ping -c 3 google.com', answer: 'ip addr; ping -c 3 google.com', check: (c) => H.ran(c, /^\s*(ip\s+(a|addr)|hostname\s+-I|ifconfig)/) && H.ran(c, /^\s*ping\b/) },
    { id: 'l-disk', title: 'Disk inspector', xp: 20, text: 'Show all disks and partitions as a tree, then show free space in human-readable units.', hint: 'lsblk  and  df -h', answer: 'lsblk; df -h', check: (c) => H.ran(c, /^\s*lsblk/) && H.ran(c, /^\s*df\s+.*-\w*h/) },
    { id: 'l-git1', title: 'Git: first commit', xp: 30, text: 'Turn ~/projects/terminal-practice into a git repository and commit hello.txt.', hint: 'git init  →  git add .  →  git commit -m "first commit"   (git may ask you to set user.name and user.email first!)', answer: 'git init && git add . && git commit -m "first commit"', check: (c) => H.commits(c, HOME_L.concat('projects', 'terminal-practice')) >= 1 },
    { id: 'l-git2', title: 'Git: merge a branch', xp: 35, text: 'In ~/projects/hello-web there is a branch called feature/dark-mode. Merge it into main.', hint: 'cd ~/projects/hello-web  →  git branch -a  →  git merge feature/dark-mode', answer: 'git merge feature/dark-mode', check: (c) => { const r = H.repo(c, HOME_L.concat('projects', 'hello-web')); if (!r) return false; const main = r.refs.main, feat = r.refs['feature/dark-mode']; if (!main || !feat) return false; const seen = new Set(); const q = [main]; while (q.length) { const x = q.shift(); if (!x || seen.has(x)) continue; seen.add(x); if (r.objects[x]) q.push(...r.objects[x].parents); } return seen.has(feat); } },
  ];

  // macOS / zsh ---------------------------------------------------------------
  const HOME_M = ['Users', 'student'];
  const mac = [
    { id: 'm-pwd', title: 'Home sweet home', xp: 10, text: 'Print your current directory. Notice macOS keeps homes in /Users, not /home.', hint: 'pwd', answer: 'pwd', check: (c) => H.ran(c, /^\s*pwd\b/) },
    { id: 'm-ls', title: 'Long listing', xp: 10, text: 'List everything in your home folder in long format, including hidden files, with human-readable sizes.', hint: 'Combine three flags: -l -a -h', answer: 'ls -lah', check: (c) => H.ran(c, /^\s*(ls\s+.*-\w*[la]\w*[la]|ll\b)/) },
    { id: 'm-sw', title: 'Which macOS?', xp: 10, text: 'Show the macOS product version from the command line.', hint: 'sw_vers', answer: 'sw_vers', check: (c) => H.ran(c, /^\s*sw_vers/) },
    { id: 'm-disk', title: 'Disk Utility, terminal edition', xp: 20, text: 'List all disks and APFS volumes.', hint: 'diskutil list', answer: 'diskutil list', check: (c) => H.ran(c, /^\s*diskutil\s+list/) },
    { id: 'm-brew', title: 'Homebrew', xp: 25, text: 'Install the "tree" tool with Homebrew and use it to show your projects folder.', hint: 'brew install tree   then   tree ~/projects', answer: 'brew install tree', check: (c) => H.installed(c, 'tree') && H.ran(c, /^\s*tree\b/) },
    { id: 'm-say', title: 'Make it talk', xp: 10, text: 'Make your Mac speak a sentence out loud.', hint: 'say "hello from the terminal"', answer: 'say hello', check: (c) => H.ran(c, /^\s*say\s+\S/) },
    { id: 'm-pb', title: 'Clipboard power', xp: 15, text: 'Copy the contents of poem.txt to the clipboard using a pipe.', hint: 'cat ~/Documents/poem.txt | pbcopy', answer: 'cat ~/Documents/poem.txt | pbcopy', check: (c) => H.ran(c, /\|\s*pbcopy/) },
    { id: 'm-mkdir', title: 'Organize', xp: 15, text: 'Create ~/Documents/CSP with subfolders unit1, unit2 and unit3 — in ONE command.', hint: 'Brace expansion: mkdir -p ~/Documents/CSP/unit{1,2,3}', answer: 'mkdir -p ~/Documents/CSP/unit{1,2,3}', check: (c) => [1, 2, 3].every((n) => H.isDir(c, HOME_M.concat('Documents', 'CSP', 'unit' + n))) },
    { id: 'm-grep', title: 'Search inside files', xp: 20, text: 'Find which files under ~/Documents mention "coffee", ignoring case.', hint: 'grep -ril coffee ~/Documents  (or search ~ for groceries)', answer: 'grep -ri coffee ~', check: (c) => H.ran(c, /grep\s.*-\w*[ri]\w*.*coffee/i) },
    { id: 'm-ssh', title: 'Remote control', xp: 30, text: 'SSH from the Mac into the Linux lab machine (ubuntu-lab) as student, run hostname, then exit.', hint: 'ssh student@ubuntu-lab   (password: student)', answer: 'ssh student@ubuntu-lab', check: (c) => H.ran(c, /^\s*ssh\s+\S*ubuntu-lab/) },
    { id: 'm-git', title: 'Clone from GitHub', xp: 30, text: 'Clone https://github.com/terminalex/cs-principles.git into your home folder and view its history.', hint: 'git clone URL   then   cd cs-principles && git log --oneline', answer: 'git clone https://github.com/terminalex/cs-principles.git', check: (c) => H.commits(c, HOME_M.concat('cs-principles')) > 0 && H.ran(c, /git\s+log/) },
  ];

  // Windows cmd ---------------------------------------------------------------
  const HOME_W = ['C:', 'Users', 'student'];
  const cmd = [
    { id: 'c-dir', title: 'What\'s in here?', xp: 10, text: 'List the files in your user folder.', hint: 'dir', answer: 'dir', check: (c) => H.ran(c, /^\s*dir\b/i) },
    { id: 'c-hidden', title: 'Hidden files', xp: 15, text: 'Windows hides some files with an attribute. Show ALL files including hidden ones, and read the secret message.', hint: 'dir /a   then   type .secret_message', answer: 'dir /a', check: (c) => H.ran(c, /^\s*dir.*\/a/i) && H.ran(c, /(type|more).*secret_message/i) },
    { id: 'c-cd', title: 'Drive hopping', xp: 15, text: 'Switch to the D: drive and look at the Class Projects folder.', hint: 'D:   then   cd "Class Projects"  (quotes because of the space!)', answer: 'D: & cd "Class Projects"', check: (c) => H.ran(c, /^\s*d:\s*$/i) && H.ran(c, /cd\s+"?class projects/i) },
    { id: 'c-md', title: 'Make a folder', xp: 15, text: 'Create a folder called CSP inside C:\\Users\\student.', hint: 'mkdir C:\\Users\\student\\CSP', answer: 'mkdir C:\\Users\\student\\CSP', check: (c) => H.isDir(c, HOME_W.concat('CSP')) },
    { id: 'c-echo', title: 'Redirect output', xp: 15, text: 'Save the output of the dir command into a file named listing.txt inside CSP.', hint: 'dir > C:\\Users\\student\\CSP\\listing.txt', answer: 'dir > CSP\\listing.txt', check: (c) => H.fileHas(c, HOME_W.concat('CSP', 'listing.txt'), /Directory of/) },
    { id: 'c-ip', title: 'Network settings', xp: 15, text: 'Show your full network configuration, including your MAC (physical) address.', hint: 'ipconfig /all', answer: 'ipconfig /all', check: (c) => H.ran(c, /^\s*ipconfig\s+\/all/i) },
    { id: 'c-ping', title: 'Ping!', xp: 15, text: 'Send exactly 2 pings to github.com.', hint: 'ping -n 2 github.com', answer: 'ping -n 2 github.com', check: (c) => H.ran(c, /^\s*ping\s.*-n\s*2/i) },
    { id: 'c-task', title: 'Task Manager (text edition)', xp: 20, text: 'List running tasks, but only show lines containing "msedge".', hint: 'tasklist | findstr msedge', answer: 'tasklist | findstr msedge', check: (c) => H.ran(c, /tasklist.*\|\s*(findstr|find)/i) },
    { id: 'c-kill', title: 'End task', xp: 20, text: 'Force-close Spotify from the command line.', hint: 'taskkill /IM Spotify.exe /F', answer: 'taskkill /IM Spotify.exe /F', check: (c) => H.procGone(c, 'Spotify') },
    { id: 'c-bat', title: 'Batch files', xp: 20, text: 'Run the hello.bat batch file in your Documents folder.', hint: 'cd Documents   then   hello.bat', answer: 'hello.bat', check: (c) => H.ran(c, /hello(\.bat)?\s*$/i) },
    { id: 'c-color', title: 'Hacker mode', xp: 10, text: 'Change the console to green text on a black background. (Type color alone to reset.)', hint: 'color 0a', answer: 'color 0a', check: (c) => H.ran(c, /^\s*color\s+0a/i) },
    { id: 'c-diskpart', title: 'DiskPart', xp: 25, text: 'Open DiskPart and list the disks and volumes on this PC. Type exit when done.', hint: 'diskpart  →  list disk  →  list volume  →  exit', answer: 'diskpart', check: (c) => H.ran(c, /^\s*diskpart/i) },
    { id: 'c-for', title: 'Loops in cmd', xp: 25, text: 'Use a FOR /L loop to print the numbers 1 through 5.', hint: 'for /l %i in (1,1,5) do echo %i', answer: 'for /l %i in (1,1,5) do echo %i', check: (c) => H.ran(c, /^\s*for\s+\/l/i) },
  ];

  // PowerShell ---------------------------------------------------------------
  const ps = [
    { id: 'p-loc', title: 'Verb-Noun', xp: 10, text: 'PowerShell commands are named Verb-Noun. Get your current location using the full cmdlet name.', hint: 'Get-Location', answer: 'Get-Location', check: (c) => H.ran(c, /^\s*get-location/i) },
    { id: 'p-gci', title: 'Objects, not text', xp: 15, text: 'List your files with Get-ChildItem, including hidden ones.', hint: 'Get-ChildItem -Force', answer: 'Get-ChildItem -Force', check: (c) => H.ran(c, /(get-childitem|gci|ls|dir)\s.*-force/i) },
    { id: 'p-gm', title: 'Get-Member', xp: 20, text: 'Discover what properties a file object has by piping Get-ChildItem into Get-Member.', hint: 'Get-ChildItem | Get-Member', answer: 'Get-ChildItem | Get-Member', check: (c) => H.ran(c, /\|\s*(get-member|gm)\b/i) },
    { id: 'p-new', title: 'New-Item', xp: 15, text: 'Create a folder named PowerShellPractice in your home, and a file notes.txt inside it.', hint: 'New-Item -ItemType Directory PowerShellPractice  then  New-Item PowerShellPractice\\notes.txt', answer: 'New-Item -ItemType Directory PowerShellPractice', check: (c) => H.exists(c, HOME_W.concat('PowerShellPractice', 'notes.txt')) },
    { id: 'p-var', title: 'Variables & math', xp: 15, text: 'Store your age in a variable $age and print how many days old you are (roughly $age * 365).', hint: '$age = 15; $age * 365', answer: '$age = 15; $age * 365', check: (c) => H.ran(c, /\$\w+\s*=\s*\d+/) && H.ran(c, /\$\w+\s*\*\s*365/) },
    { id: 'p-top', title: 'Top 5 processes', xp: 25, text: 'Show the 5 processes using the most CPU, highest first.', hint: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', answer: 'Get-Process | Sort-Object CPU -Descending | Select-Object -First 5', check: (c) => H.ran(c, /(get-process|ps|gps)\s*\|.*sort.*cpu.*-desc.*\|.*select.*-first\s*5/i) },
    { id: 'p-where', title: 'Filter with Where-Object', xp: 20, text: 'List only the services that are Stopped.', hint: 'Get-Service | Where-Object Status -eq Stopped', answer: 'Get-Service | Where-Object Status -eq Stopped', check: (c) => H.ran(c, /(get-service|gsv).*\|\s*(where-object|where|\?).*stopped/i) },
    { id: 'p-csv', title: 'Data science, PowerShell style', xp: 30, text: 'Import Documents\\grades.csv and calculate the average of the "final" column.', hint: 'Import-Csv .\\Documents\\grades.csv | Measure-Object final -Average', answer: 'Import-Csv .\\Documents\\grades.csv | Measure-Object final -Average', check: (c) => H.ran(c, /import-csv.*grades.*\|.*measure.*-av/i) },
    { id: 'p-disk', title: 'Storage report', xp: 20, text: 'Show all disks, then all volumes with their free space.', hint: 'Get-Disk   and   Get-Volume', answer: 'Get-Disk; Get-Volume', check: (c) => H.ran(c, /^\s*get-disk/i) && H.ran(c, /^\s*get-volume/i) },
    { id: 'p-net', title: 'Test the network', xp: 20, text: 'Test whether you can reach google.com with Test-Connection using 2 pings.', hint: 'Test-Connection google.com -Count 2', answer: 'Test-Connection google.com -Count 2', check: (c) => H.ran(c, /test-connection.*-count\s*2/i) },
    { id: 'p-func', title: 'Write a function', xp: 30, text: 'Define a function Get-Greeting that takes a -Name parameter and returns "Hello, <Name>!". Then call it.', hint: 'function Get-Greeting { param($Name) "Hello, $Name!" }   then   Get-Greeting -Name Ada', answer: 'function Get-Greeting { param($Name) "Hello, $Name!" }', check: (c) => H.ran(c, /function\s+get-greeting/i) && H.ran(c, /^\s*get-greeting\b/i) },
    { id: 'p-stop', title: 'Stop-Process', xp: 20, text: 'Stop the Spotify process using a PowerShell cmdlet.', hint: 'Stop-Process -Name Spotify', answer: 'Stop-Process -Name Spotify', check: (c) => H.procGone(c, 'Spotify') && H.ran(c, /stop-process|kill/i) },
    { id: 'p-help', title: 'Help yourself', xp: 10, text: 'Show usage examples for Get-ChildItem.', hint: 'Get-Help Get-ChildItem -Examples', answer: 'Get-Help Get-ChildItem -Examples', check: (c) => H.ran(c, /(get-help|help|man)\s+\S+.*-ex/i) },
    { id: 'p-script', title: 'Run a script', xp: 25, text: 'Run the sysinfo.ps1 script in your Documents folder.', hint: 'cd Documents   then   .\\sysinfo.ps1', answer: '.\\Documents\\sysinfo.ps1', check: (c) => H.ran(c, /sysinfo\.ps1/i) },
  ];

  // Git Bash -----------------------------------------------------------------
  const gb = [
    { id: 'g-where', title: 'Linux commands on Windows', xp: 10, text: 'Git Bash maps C:\\ to /c. Print your working directory the Linux way.', hint: 'pwd', answer: 'pwd', check: (c) => H.ran(c, /^\s*pwd/) },
    { id: 'g-config', title: 'Introduce yourself to git', xp: 15, text: 'Set your global git user.name (and check it with git config --list).', hint: 'git config --global user.name "Your Name"', answer: 'git config --global user.name "Ada Lovelace"', check: (c) => H.ran(c, /git\s+config\s+--global\s+user\.name/) },
    { id: 'g-clone', title: 'Clone a repository', xp: 20, text: 'Clone https://github.com/terminalex/hello-world.git', hint: 'git clone https://github.com/terminalex/hello-world.git', answer: 'git clone https://github.com/terminalex/hello-world.git', check: (c) => H.commits(c, HOME_W.concat('hello-world')) > 0 },
    { id: 'g-branch', title: 'Create a branch', xp: 20, text: 'Inside hello-world, create and switch to a new branch called add-spanish.', hint: 'cd hello-world   then   git switch -c add-spanish', answer: 'git switch -c add-spanish', check: (c) => { const r = H.repo(c, HOME_W.concat('hello-world')); return !!r && !!r.refs['add-spanish']; } },
    { id: 'g-commit', title: 'Make a commit', xp: 25, text: 'Edit (or create) a file, stage it, and commit it on your branch.', hint: 'echo \'print("Hola")\' >> hello.py  →  git add hello.py  →  git commit -m "Add Spanish"', answer: 'git commit -am "Add Spanish"', check: (c) => { const r = H.repo(c, HOME_W.concat('hello-world')); return !!r && r.refs['add-spanish'] && r.refs['add-spanish'] !== r.refs.main; } },
    { id: 'g-log', title: 'Visualize history', xp: 15, text: 'Show the history of all branches as a compact graph.', hint: 'git log --oneline --graph --all', answer: 'git log --oneline --graph --all', check: (c) => H.ran(c, /git\s+log.*--graph/) },
    { id: 'g-push', title: 'Push to GitHub', xp: 30, text: 'Push your branch to origin and set it as the upstream. (GitHub wants a token — in TerminalEX any value starting with ghp_ works.)', hint: 'git push -u origin add-spanish', answer: 'git push -u origin add-spanish', check: (c) => { const r = H.repo(c, HOME_W.concat('hello-world')); return !!r && !!r.remoteRefs && !!r.remoteRefs['origin/add-spanish']; } },
  ];

  TX.missions = {
    tracks: {
      bash: { name: 'Linux Bash', list: linux },
      zsh: { name: 'macOS zsh', list: mac },
      cmd: { name: 'Command Prompt', list: cmd },
      powershell: { name: 'PowerShell', list: ps },
      pwsh: { name: 'PowerShell', list: ps },
      gitbash: { name: 'Git Bash', list: gb },
    },
    H,
  };
})();
