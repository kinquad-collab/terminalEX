# TerminalEX

A browser-based terminal simulator for teaching the command line. Students pick a shell, get a realistic
prompt on a mock computer, and practice real commands with no risk to a real machine.

No install, no server, no build step. Open `index.html` in a browser.

## Shells

| Tab | Emulates | Mock machine |
|---|---|---|
| Ubuntu | bash 5.2 on Ubuntu 24.04 | `ubuntu-lab` (192.168.1.42) |
| macOS | zsh 5.9 on macOS Sequoia | `MacBook-Pro` (192.168.1.57) |
| Command Prompt | cmd.exe on Windows 11 | `DESKTOP-LAB42` (192.168.1.105) |
| Windows PowerShell | PowerShell 5.1 | same Windows machine |
| PowerShell 7 | pwsh 7.4 | same Windows machine |
| Git Bash | MINGW64 / Git for Windows | same Windows machine (`/c/`, `/d/`) |

The three Windows shells share one file system, so a file made in cmd shows up in PowerShell and Git Bash.

## What works

- **Shell languages.** bash/zsh: pipes, redirects, `&&`/`||`, variables and `${...}` expansions, globs, brace
  expansion, `$(...)`, `if`/`for`/`while`/`case`, functions, aliases, heredocs, arithmetic, jobs. cmd: `%VAR%`,
  `for`, `if`, `goto`, `.bat` files. PowerShell: objects in the pipeline, hashtables, script blocks, `try/catch`,
  `switch`, formatting views, about 150 cmdlets, `[math]`/`[datetime]`/`[System.IO.Path]` statics, 5.1 vs 7
  differences in error style and aliases.
- **Mock data.** Disks and partitions (`lsblk`, `fdisk -l`, `diskutil list`, `Get-Disk`, `diskpart`, `wmic`),
  processes, services, network interfaces, DNS, routing, users and groups, installed packages, sample files
  (grades CSV, poems, scripts, a hidden secret file).
- **Networking (simulated).** `ping`, `traceroute`/`tracert`, `curl`, `wget`, `nslookup`, `ssh` between the mock
  machines, `Invoke-RestMethod`, `Test-NetConnection`. Nothing leaves the browser.
- **Packages.** `apt`, `brew`, `winget`, `pip`, `npm` — installing a package makes its commands available.
- **git.** init, add, commit, branch, switch, merge (fast-forward, three-way, real conflict markers), stash, tag,
  reset, revert, restore, log `--graph`, blame, and clone/push/pull against a mock GitHub.
- **Full-screen programs.** nano, vim, Notepad-style editor, `top`/`htop`, `less`/`more`, `watch`, `sl`, `cmatrix`.
- **Languages.** A small Python 3 interpreter (`python3`, REPL or scripts) and a Node REPL.
- **Help built in.** `man`, `help`, `Get-Help`, `/?`, a searchable cheat sheet, and "did you mean" suggestions.
- **Missions.** 62 guided exercises across the tracks, checked automatically as students type, with XP.
- **Look and feel.** Per-OS window chrome and color schemes, 13 themes, font and size settings, multiple tabs,
  keyboard shortcuts, a touch key row on phones and tablets.

## Credentials in the simulator

| What | Value |
|---|---|
| `sudo`, `ssh` password | `student` |
| `su teacher` password | `teacher` |
| GitHub push "token" | anything starting with `ghp_` |

These are fake and exist only inside the page.

## Saving and resetting

Each student's work is saved in their own browser (`localStorage`): files, history, open tabs, missions, settings.
It does not sync between devices or students. Run `reset-machine` in any shell, or use the reset buttons in
Settings, to restore a machine to its starting state.

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Alt+T / Alt+W | shell picker / close tab |
| Alt+1 … Alt+6 | open Ubuntu, macOS, cmd, PowerShell 5.1, PowerShell 7, Git Bash |
| Alt+← / Alt+→ | previous / next tab |
| Alt+= / Alt+- | font size |
| Alt+M | missions panel |
| Alt+C | cheat sheet |
| Alt+Enter | full screen |
| Tab, ↑/↓, Ctrl+R, Ctrl+C, Ctrl+L | completion, history, history search, interrupt, clear |

## Hosting for a class

Any static host works. With GitHub Pages: repository Settings → Pages → deploy from the branch, root folder.
Students then need only the URL.

## Limits

This is a simulator, not a virtual machine. Commands and output are hand-built to match the real tools, so
coverage is broad but not complete: uncommon flags may be missing, and some output (process lists, network
results) is randomized mock data. If a student finds a command that behaves differently from the real thing,
that is a bug worth reporting.

## Files

```
index.html          page shell
css/style.css       UI and terminal styling
js/util.js          ANSI, formatting, hashing helpers
js/vfs.js           in-memory file system
js/machines.js      the three mock computers and their data
js/terminal.js      terminal renderer and line editor
js/apps.js          full-screen programs (editors, top, pager)
js/awk.js           awk interpreter
js/posix*.js        bash/zsh/Git Bash shell and commands
js/git.js           git engine and mock GitHub
js/cmd.js           cmd.exe and shared Windows programs
js/ps-*.js          PowerShell parser, runtime, cmdlets
js/lang.js          Python and Node
js/docs.js          man pages and help text
js/missions.js      guided exercises
js/app.js           tabs, themes, settings, missions UI
```
