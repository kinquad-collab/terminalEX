# TerminalEX — Terminal Explorer (v2)

A classroom terminal simulator. Students open **ten real-feeling terminals from 1979 to today**, practice real commands
with no risk to a real computer, and work through **12 lessons** that end in **certification tests and certificates**.
It is built the same way as SheetEX: one self-contained page, served by Google Apps Script and embedded in Canvas, with
**no student data collected**.

## The ten terminals

| Terminal | Emulates | Pretend computer | What it teaches |
|---|---|---|---|
| **Ubuntu** | bash 5.2, Ubuntu 24.04 | `ubuntu-lab` | Linux: files, pipes, grep, sudo, apt, processes, git, RAID with mdadm |
| **macOS** | zsh 5.9, macOS Sequoia | `MacBook-Pro` | BSD tools, Homebrew, `open`, `pbcopy`, `say`, `diskutil` |
| **FreeBSD** *(new)* | `/bin/sh`, FreeBSD 14.1 | `freebsd-lab` | No sudo (use `su`), `pkg` vs the Ports Collection (`make install clean`), `service`/`sysrc`/`rc.conf`, `sysctl`, jails, ZFS, `gmirror`, BSD `ps aux` |
| **Solaris** *(new)* | ksh93, Oracle Solaris 11.4 on **SPARC** | `sol-lab` | SMF services (`svcs -x`, `svcadm clear`), `prstat`, ZFS snapshots that really roll back deleted files, zones (`zoneadm`, `zlogin`), boot environments, IPS `pkg`, `pfexec`, `/var/adm` logs, `dtrace` |
| **Command Prompt** | cmd.exe, Windows 11 | `DESKTOP-LAB42` | Drives, `dir`, batch files, `ipconfig`, `tasklist`, `diskpart` |
| **Windows PowerShell** | 5.1 | same Windows PC | Objects in the pipeline, 146 cmdlets, CSV data, Storage Spaces |
| **PowerShell 7** | pwsh 7.4 | same Windows PC | 5.1 vs 7 differences |
| **Git Bash** | MINGW64 | same Windows PC | bash and git on Windows |
| **MS-DOS** *(new)* | COMMAND.COM, MS-DOS 6.22 (1994) | a 486 PC with A: C: D: | 8.3 names, `Bad command or file name`, programs found through `PATH` (delete `FORMAT.COM` and `FORMAT` is gone), `AUTOEXEC.BAT` really runs at boot, no arrow-key history until `DOSKEY`, `COPY CON`, `UNDELETE`, `DELTREE`, `CHOICE` batch menus, a floppy in A: (`INSERT`), the blue `EDIT`, **QBASIC** with line-numbered BASIC |
| **UNIX V7** *(new)* | Bourne shell, Bell Labs 1979, PDP-11 | `research` | Only the commands that existed: no `less`, `head`, `uname`, `sudo`; no `~`, no `$( )` (use backquotes), no arrow keys or Tab; `ed`, `mail` (write to dmr), `who`, `/usr/games/fortune`, `moo`; a clock set to 1979 |

cmd, PowerShell and Git Bash share one Windows disk. Every machine has the same student files (grocery list, grades CSV,
poem…) so the same exercise works everywhere. Window chrome matches each era (CDE for Solaris, a Windows 3.1
"MS-DOS Prompt", a DEC VT100 on paper-colored "teletype" for V7).

## What's new in v2

- **Interactive Cheat Sheet** — 144 everyday tasks in 17 categories, answered **side by side on eight systems**
  (Linux, macOS, FreeBSD, Solaris, UNIX V7, cmd, PowerShell, MS-DOS), with notes on what each system does
  differently and *why* old systems had no equivalent. Every one of the 928 runnable examples has a **▶ Run** button
  that runs it on a brand-new pretend computer and shows the real output, and **⤵ Type it** puts it into the student's
  own terminal. The test suite runs all 928 and fails if any of them breaks.
- **Automation Lab** — `~/automation` on every modern machine holds ready-made, commented Python scripts and small CSV
  files. Students don't have to write the programs: the skill is *calling* them correctly, which is most of what
  automation is at work.

  | Script | Run it with | What it does |
  |---|---|---|
  | `hello.py` | `python3 hello.py Ada` | arguments |
  | `grade_report.py` | `python3 grade_report.py data/grades.csv 5` | letter grades, class average, optional curve; saves `reports/grade_report.txt` |
  | `inventory_check.py` | `python3 inventory_check.py data/inventory.csv` | low-stock alert; writes `reorder.csv` |
  | `clean_signups.py` | `python3 clean_signups.py data/signups.csv` | trims spaces, fixes case, removes duplicate people |
  | `attendance_summary.py` | `python3 attendance_summary.py data/attendance.csv` | present/absent/tardy per student |
  | `weather_stats.py` | `python3 weather_stats.py data/weather.csv Savannah` | averages and the rainiest day |
  | `sales_total.py` | `python3 sales_total.py data/sales.csv` | money per store, best seller |
  | `backup.py` | `python3 backup.py data` | copies every CSV into `backups/` |
  | `organize_files.py` | `python3 organize_files.py inbox` | sorts a messy folder into images/audio/documents |
  | `run_all.sh` / `.bat` / `.ps1` | `bash run_all.sh` | a pipeline that runs the others and keeps `morning.log` |

  Scripts set real exit codes (`python3 x.py && cat report.txt` stops on a usage error). Students change the data with
  `echo ... >> data/inventory.csv`, chain scripts with `&&`, save output with `>`, and write their own `mine.sh`.
  The built-in mini-Python now supports `csv` (`reader`, `DictReader`, `writer`), `with open(...) as f`, `sys.argv`,
  `sys.exit(code)`, `os.path`, `os.makedirs`/`listdir`/`rename`, and `max(..., key=...)`.
- **Disks & RAID** — two blank **lab disks** on Linux, Windows, Solaris and FreeBSD (the system disks are protected):
  `lsblk`, `fdisk -l`, `mdadm --create` (RAID 0/1; RAID 5 explains why it needs three disks), `cat /proc/mdstat` with a
  live resync bar, `mkfs.ext4`, `mount`, `mdadm --fail` → degraded `[_U]` → `--remove` / `--add` → rebuild;
  `diskpart` (`list disk`, `select disk`, `online disk`, `attributes disk`, `create volume mirror|stripe`);
  PowerShell `Get-Disk`, `Set-Disk -IsOffline/-IsReadOnly`, `Initialize-Disk`, `Get-PhysicalDisk -CanPool`,
  `New-StoragePool`, `New-VirtualDisk -ResiliencySettingName Mirror|Simple|Parity`; ZFS `zpool create tank mirror …`,
  `zpool offline` → DEGRADED; FreeBSD `gmirror`. Networking: `ping`, `tracert`/`traceroute` and `nslookup` on every system that had a network (DOS and V7 explain why they did not).
- **History & Lineage page** — an interactive family tree (21 systems, 1965–2016): Multics → UNIX → BSD and System V →
  Solaris, FreeBSD, macOS; GNU + Linux → Android, Git Bash, WSL; CP/M → MS-DOS → Windows NT/cmd → PowerShell. Click a
  system to read its story; ▶ opens that terminal. Plus the eras of the command line and a "same job, different
  families" table.
- **12 lessons, 133 missions, a guide for each lesson** (why it matters, vocabulary with examples, common traps):

  | # | Lesson | Terminal |
  |---|---|---|
  | 1 | Linux Foundations | Ubuntu |
  | 2 | macOS & zsh | macOS |
  | 3 | Windows Command Prompt | cmd |
  | 4 | PowerShell | PowerShell |
  | 5 | Git Bash & Version Control | Git Bash |
  | 6 | FreeBSD: Berkeley UNIX Today | FreeBSD |
  | 7 | Solaris: The Big-Iron UNIX | Solaris |
  | 8 | UNIX V7: Where It All Began (1979) | UNIX V7 |
  | 9 | MS-DOS 6.22: The PC Era (1994) | MS-DOS |
  | 10 | Automation Lab: Scripts & Data | Ubuntu |
  | 11 | Disks & RAID | Ubuntu, PowerShell, cmd, Solaris |
  | 12 | History & Lineage of the Terminal | the family tree |

- **XP, 10 levels** (Keyboard Rookie → UNIX Greybeard) and **15 badges**. A mission hint costs 20% of its XP; showing
  the answer costs 30% more (teachers can hide answers in Settings).

## Certification tests

When every practice mission in a lesson is done, its test unlocks (Lesson 12: after exploring 6 systems on the tree).

- **10 questions drawn at random** from the lesson's bank (11–14 per lesson, **147 in total**), about **half hands-on**.
  **8 of 10 to pass.** No hints, no cheat sheet, no terminal tabs.
- **Hands-on answers are run, not pattern-matched.** The student's command runs on a fresh pretend computer **and** on a
  second one whose files are changed (lines reversed, numbers shifted, extra lines and rows added). The output must
  match the reference answer's on both, so *any* command that works is right (`sort -u` or `sort | uniq`), while typing
  the expected output with `echo` fails. Students can **▶ Try it** to see what their command prints.
- **The answers are not in the app.** It ships only fingerprints (hashes) of correct results; the answers live in
  `src/banks/questions.js`, which is never shipped. The build refuses a question whose answer could be faked.
- **An attempt counts as soon as it starts**; closing the page counts as a fail; a failed attempt has a 2-minute review
  break; results list topics to review, never answers.
- Passing earns a **certificate** (locked name, lesson, skills, score, attempt, missions, hints used, date):
  🖨 print / save as PDF, or ⬇ download an image.

## One progress file: the proof and the way back

Same design as SheetEX. On the first visit a student types a first and last name and **locks** it. The student menu
(name button, top right) has **⬇ Download my progress file** → `TerminalEX-First-Last.json`, holding the name, XP,
missions, tests, certificates **and every file on every pretend computer**. Loading it on any computer restores
everything. The file is **sealed (HMAC-SHA-256)** with a program key plus a **class key** from your Apps Script
deployment: changing a single character, or bringing a file from another copy of TerminalEX, gets it refused.
**Teachers:** *Check a progress file (view only)* on the home page shows ✓ Genuine with a summary, or why it was refused.
If downloads are blocked, the file's text appears with a Copy button and can be pasted back in.

## Student data (FERPA)

**TerminalEX makes no network requests at all.** There are no API calls, no accounts, no analytics, no fonts or scripts
from the internet. `curl`, `ping`, `ssh`, `git push` and "GitHub" are simulated inside the page. The browser test loads
the app, opens all ten terminals, runs a cheat-sheet example, takes a certification test, and **fails if the page makes a
single request**. The Apps Script (`apps-script/Code.gs`, ~40 lines) only serves the page and keeps one random class key
in Script Properties; it has no gradebook and no function the page can call. Progress stays in each student's browser
(`localStorage`) and in the file they choose to hand in through Canvas.

## Deploy on Google Apps Script and embed in Canvas

The Apps Script copy is split into small files (none over 350 KB) because pasting one huge file into the Apps Script
editor is unreliable. Everything you need is in [`apps-script/`](apps-script/):

| File in the repo | Create in Apps Script as | Type |
|---|---|---|
| `Code.gs` | `Code` (replace what is there) | Script |
| `Index.html` | `Index` | HTML |
| `Styles.html` | `Styles` | HTML |
| `Js1.html` … `Js6.html` | `Js1` … `Js6` | HTML |

1. <https://script.google.com> → **New project**, name it `TerminalEX`.
2. Replace everything in `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs).
3. For each HTML file: **＋ → HTML**, type the name **exactly** (`Index`, `Styles`, `Js1`, `Js2` … — Apps Script adds
   `.html` itself), delete the placeholder text, paste the file's whole contents, save. All of them are required; a missing
   or misnamed one shows an error naming it.
4. **Deploy → New deployment → ⚙ Web app** · *Execute as:* **Me** · *Who has access:* **Anyone** (or your school domain).
   Approve the permission prompt (it only asks to store the class key in the script's own properties).
5. Copy the **Web app URL** (ends in `/exec`) and **open it once yourself** — that creates your class key.
6. In Canvas: Page → **HTML Editor**:

   ```html
   <iframe src="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
           width="100%" height="820" style="border:0" allow="clipboard-write; fullscreen"
           title="TerminalEX"></iframe>
   ```

If it doesn't load: open the `/exec` URL directly (not the `/dev` URL and not the editor's Run button), and check that
every file name matches the table above exactly. The test suite runs `Code.gs` with stand-ins for Apps Script and
loads the page it serves in a browser, so the files in the repo are known to assemble correctly.

**Updating:** paste the new versions of the HTML files (the build may change how many `Js` files there are — delete any extra old ones), then **Deploy → Manage deployments → ✏️ → Version: New version**. The URL and
class key stay the same, so students keep their progress. **New semester:** run `newClassKey` once in the editor; every
old progress file stops being accepted.

**Other hosting:** any static host or GitHub Pages serves `dist/index.html` (the root `index.html` redirects there), or
open `dist/index.html` straight from disk.

## Credentials inside the simulator

| What | Value |
|---|---|
| `sudo` (Ubuntu, macOS, Solaris), `ssh` | `student` |
| root password (`su` on FreeBSD, Solaris, UNIX V7) | `student` |
| `su teacher` | `teacher` |
| GitHub push "token" | anything starting with `ghp_` |

## Development

Plain JavaScript, no frameworks, no runtime dependencies.

```
src/index.html            page template
src/css/style.css         all styles
src/js/
  util.js seal.js vfs.js  helpers, HMAC sealing, in-memory file system
  samples.js              the Automation Lab: scripts and CSV data
  machines.js             Ubuntu, Mac and Windows + the machine registry
  machines-unix.js        Solaris, FreeBSD, UNIX V7 machines
  posix*.js unix-cmds.js  bash/zsh/sh/ksh and their commands; Solaris/FreeBSD/V7 commands, ed, mail, ZFS, pkg
  cmd.js dos.js basic.js  cmd.exe; MS-DOS 6.22 on the same engine; QBASIC
  ps-*.js                 PowerShell parser, runtime, cmdlets
  storage.js              lab disks, mdadm, diskpart extras, Storage Spaces, zpool, gmirror
  git.js lang.js awk.js   git, Python and Node, awk
  docs.js docs-more.js    man pages and help screens (including DOS HELP)
  missions*.js            133 auto-checked missions
  shells.js               the ten terminals and how to start them
  sandbox.js              run commands on a fresh, seeded pretend computer with no screen
  reference.js            Interactive Cheat Sheet data and runner
  lessons.js              12 lessons, guides, the family tree data
  certtest.js             certification-test engine (run-based grading)
  ui-*.js                 home, lessons, history page, cheat sheet page, tests, certificates, progress file
  app.js                  tabs, terminals, drawer, settings
src/banks/questions.js    test questions WITH answers (never shipped)
src/banks/build-bank.js   runs every answer, ships fingerprints
build.js                  inlines everything into dist/index.html and apps-script/Index.html
tests/                    node:test suites + Playwright browser test
```

```bash
npm run build          # build dist/index.html and apps-script/Index.html
npm test               # every mission is completed by a reference solution on a fresh machine;
                       # all 928 runnable cheat-sheet examples run without errors;
                       # every certification answer is accepted and faked answers are rejected; no answers ship;
                       # DOS / V7 / Solaris / FreeBSD / RAID / Automation behaviours
npm run test:browser   # Chromium: name lock, all 10 terminals, a mission, ▶ Run, history tree, a certification test
                       # and certificate, hands-on grading in the browser, the progress-file seal, ZERO network requests
```

**Add a mission:** add it to `src/js/missions*.js` and to a lesson in `lessons.js`; add its solution to
`tests/solutions.js` (the suite fails if any mission can't be completed). **Add a test question:** add it to
`src/banks/questions.js`; the build runs it and refuses broken or fakeable questions. **Add a cheat-sheet task:** add it
to `reference.js`; the suite runs every cell.

## Honest limits

- **A simulator, not a virtual machine.** Commands are hand-built to match the real tools: coverage is broad, not
  complete, and some output (process lists, network timings) is mock data. A command that behaves differently from the
  real thing is a bug worth reporting.
- **Historical systems are simplified.** MS-DOS and V7 show the ideas, limits and messages of the era, not every switch.
  QBASIC is a small line-numbered BASIC, not the full IDE. Solaris and FreeBSD run on the same simulated tools as Linux
  where the commands are the same.
- **Sealed is not unbreakable** (same as SheetEX): edited files and saves are refused, but a student who reads the
  page's JavaScript could re-implement the signing. Treat a certificate as strong evidence, not cryptographic proof.
  Multiple-choice answers can be found by hashing each option; hands-on questions (half of each test) cannot.
- **Open-browser tests:** the test hides hints and the cheat sheet; supervision does the rest.

TerminalEX is not affiliated with Canonical, Apple, the FreeBSD Foundation, Oracle, Microsoft or Nokia Bell Labs.
Product names identify the software being taught.
