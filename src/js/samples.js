/* TerminalEX — the Automation Lab: ready-made Python scripts and small CSV files in ~/automation on every modern machine.
 * The scripts are written for students to RUN and READ, not to write from scratch: the skill is calling a script with
 * the right arguments, feeding it a file, saving its output, chaining scripts together and scheduling them. */
(function () {
  'use strict';
  const TX = window.TX;

  const DATA = {
    'grades.csv': 'name,period,unit1,unit2,unit3,final\nAvery,1,88,92,79,85\nBlake,1,95,97,99,98\nCarmen,2,72,80,85,81\nDevon,2,64,70,77,72\nElliot,3,91,85,88,90\nFarah,3,99,94,97,96\nGabe,4,55,68,74,69\nHana,4,83,88,90,87\nIsaac,5,77,79,81,80\nJordan,5,90,93,89,91\n',
    'inventory.csv': 'item,category,qty,reorder_at,price\npencils,supplies,140,50,0.25\nnotebooks,supplies,18,25,2.49\ncalculators,tech,6,5,14.99\nlaptop chargers,tech,3,4,29.00\nglue sticks,supplies,40,30,0.89\nUSB drives,tech,9,10,6.50\nhighlighters,supplies,22,20,1.10\nheadphones,tech,12,8,11.75\nrulers,supplies,15,15,0.99\nprinter paper,supplies,7,10,8.99\n',
    'attendance.csv': 'date,student,status\n2026-10-05,Avery,present\n2026-10-05,Blake,present\n2026-10-05,Carmen,absent\n2026-10-05,Devon,tardy\n2026-10-06,Avery,present\n2026-10-06,Blake,tardy\n2026-10-06,Carmen,present\n2026-10-06,Devon,absent\n2026-10-07,Avery,present\n2026-10-07,Blake,present\n2026-10-07,Carmen,absent\n2026-10-07,Devon,present\n2026-10-08,Avery,tardy\n2026-10-08,Blake,present\n2026-10-08,Carmen,absent\n2026-10-08,Devon,present\n',
    'weather.csv': 'date,city,high_f,low_f,rain_in\n2026-10-01,Cumming,82,61,0.00\n2026-10-02,Cumming,79,60,0.12\n2026-10-03,Cumming,74,55,1.05\n2026-10-04,Cumming,71,52,0.30\n2026-10-05,Cumming,76,54,0.00\n2026-10-01,Savannah,86,70,0.00\n2026-10-02,Savannah,85,71,0.45\n2026-10-03,Savannah,83,69,2.10\n2026-10-04,Savannah,80,66,0.00\n2026-10-05,Savannah,82,67,0.05\n',
    'signups.csv': 'name,email,club\n  avery JONES ,Avery.Jones@School.edu,robotics\nblake smith,blake.smith@school.edu,chess\nCARMEN diaz,carmen.diaz@school.edu , robotics\nblake smith,BLAKE.SMITH@school.edu,chess\ndevon lee,devon.lee@school.edu,coding\n Elliot  Park,elliot.park@school.edu,coding\navery jones,avery.jones@school.edu,robotics\nfarah khan,farah.khan@school.edu,chess\n',
    'sales.csv': 'date,store,item,units,price\n2026-10-01,North,hoodie,4,35.00\n2026-10-01,North,water bottle,12,9.50\n2026-10-01,South,hoodie,2,35.00\n2026-10-02,South,sticker pack,30,3.00\n2026-10-02,North,sticker pack,18,3.00\n2026-10-02,South,water bottle,7,9.50\n2026-10-03,North,hoodie,6,35.00\n2026-10-03,South,lanyard,15,4.25\n2026-10-03,North,lanyard,9,4.25\n',
  };

  const SCRIPTS = {
    'hello.py': `# hello.py - the smallest program there is.
# Run it:            python3 hello.py
# Give it a name:    python3 hello.py Ada
import sys

if len(sys.argv) > 1:
    name = sys.argv[1]
else:
    name = "world"

print("Hello, " + name + "!")
`,
    'grade_report.py': `# grade_report.py - turn a gradebook CSV into a report with letter grades.
#
# Usage:   python3 grade_report.py data/grades.csv
#          python3 grade_report.py data/grades.csv 5        (adds a 5-point curve)
#
# It prints the report AND saves it to reports/grade_report.txt
import sys
import csv
import os

if len(sys.argv) < 2:
    print("Usage: python3 grade_report.py FILE.csv [CURVE]")
    sys.exit(1)

filename = sys.argv[1]
curve = 0
if len(sys.argv) > 2:
    curve = int(sys.argv[2])

def letter(score):
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    return "F"

lines = []
total = 0
count = 0
with open(filename) as f:
    for row in csv.DictReader(f):
        score = min(100, int(row["final"]) + curve)
        total = total + score
        count = count + 1
        lines.append(f"{row['name']:<10} {score:>3}  {letter(score)}")

lines.append("-" * 18)
lines.append(f"Class average: {total / count:.1f}")
if curve:
    lines.append(f"(includes a {curve}-point curve)")

for line in lines:
    print(line)

os.makedirs("reports", exist_ok=True)
with open("reports/grade_report.txt", "w") as out:
    out.write("\\n".join(lines) + "\\n")
print("Saved reports/grade_report.txt")
`,
    'inventory_check.py': `# inventory_check.py - find school-store items that are running low.
#
# Usage:   python3 inventory_check.py data/inventory.csv
#
# Every item whose qty is at or below its reorder_at number goes into reorder.csv
import sys
import csv

if len(sys.argv) < 2:
    print("Usage: python3 inventory_check.py FILE.csv")
    sys.exit(1)

low = []
with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        if int(row["qty"]) <= int(row["reorder_at"]):
            low.append(row)

if not low:
    print("All stocked up. Nothing to order.")
else:
    print(f"ALERT: {len(low)} items need to be reordered")
    for row in low:
        print(f"  {row['item']:<16} qty {row['qty']:>3}  (reorder at {row['reorder_at']})")
    with open("reorder.csv", "w") as out:
        w = csv.writer(out)
        w.writerow(["item", "qty", "reorder_at"])
        for row in low:
            w.writerow([row["item"], row["qty"], row["reorder_at"]])
    print("Saved reorder.csv")
`,
    'clean_signups.py': `# clean_signups.py - clean up a messy club sign-up sheet.
#
# Usage:   python3 clean_signups.py data/signups.csv
#
# Fixes extra spaces, Makes Names Title Case, makes emails lowercase,
# removes duplicate people, and saves data/signups_clean.csv
import sys
import csv

if len(sys.argv) < 2:
    print("Usage: python3 clean_signups.py FILE.csv")
    sys.exit(1)

seen = []
clean = []
dupes = 0
with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        name = " ".join(row["name"].split()).title()
        email = row["email"].strip().lower()
        club = row["club"].strip().lower()
        if email in seen:
            dupes = dupes + 1
            continue
        seen.append(email)
        clean.append([name, email, club])

with open("data/signups_clean.csv", "w") as out:
    w = csv.writer(out)
    w.writerow(["name", "email", "club"])
    w.writerows(clean)

print(f"Kept {len(clean)} people, removed {dupes} duplicates.")
print("Saved data/signups_clean.csv")
`,
    'attendance_summary.py': `# attendance_summary.py - count present / absent / tardy for each student.
#
# Usage:   python3 attendance_summary.py data/attendance.csv
import sys
import csv

if len(sys.argv) < 2:
    print("Usage: python3 attendance_summary.py FILE.csv")
    sys.exit(1)

counts = {}
with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        name = row["student"]
        if name not in counts:
            counts[name] = {"present": 0, "absent": 0, "tardy": 0}
        counts[name][row["status"]] += 1

print(f"{'student':<10}{'present':>8}{'absent':>8}{'tardy':>7}")
for name in sorted(counts):
    c = counts[name]
    flag = "  <- check in" if c["absent"] >= 2 else ""
    print(f"{name:<10}{c['present']:>8}{c['absent']:>8}{c['tardy']:>7}{flag}")
`,
    'weather_stats.py': `# weather_stats.py - averages and the rainiest day from a weather log.
#
# Usage:   python3 weather_stats.py data/weather.csv            (every city)
#          python3 weather_stats.py data/weather.csv Savannah   (one city)
import sys
import csv

if len(sys.argv) < 2:
    print("Usage: python3 weather_stats.py FILE.csv [CITY]")
    sys.exit(1)

city = ""
if len(sys.argv) > 2:
    city = sys.argv[2]

rows = []
with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        if city == "" or row["city"].lower() == city.lower():
            rows.append(row)

if not rows:
    print("No rows for that city.")
    sys.exit(1)

highs = [int(r["high_f"]) for r in rows]
lows = [int(r["low_f"]) for r in rows]
wettest = max(rows, key=lambda r: float(r["rain_in"]))
print(f"Days:          {len(rows)}")
print(f"Average high:  {sum(highs) / len(highs):.1f} F")
print(f"Average low:   {sum(lows) / len(lows):.1f} F")
print(f"Rainiest day:  {wettest['date']} in {wettest['city']} ({wettest['rain_in']} in)")
`,
    'sales_total.py': `# sales_total.py - money made by each store, and the best-selling item.
#
# Usage:   python3 sales_total.py data/sales.csv
import sys
import csv

if len(sys.argv) < 2:
    print("Usage: python3 sales_total.py FILE.csv")
    sys.exit(1)

by_store = {}
by_item = {}
with open(sys.argv[1]) as f:
    for row in csv.DictReader(f):
        money = int(row["units"]) * float(row["price"])
        by_store[row["store"]] = by_store.get(row["store"], 0) + money
        by_item[row["item"]] = by_item.get(row["item"], 0) + int(row["units"])

for store in sorted(by_store):
    print(f"{store:<6} \${by_store[store]:>8.2f}")
best = max(by_item, key=lambda k: by_item[k])
print(f"Best seller: {best} ({by_item[best]} sold)")
`,
    'backup.py': `# backup.py - copy every .csv file in a folder into a backup folder.
#
# Usage:   python3 backup.py data
#
# Makes backups/data/ and copies each CSV into it. Run it, change a file,
# run it again: the backup is replaced with the new copy.
import sys
import os

if len(sys.argv) < 2:
    print("Usage: python3 backup.py FOLDER")
    sys.exit(1)

folder = sys.argv[1]
target = os.path.join("backups", folder)
os.makedirs(target, exist_ok=True)

copied = 0
for name in os.listdir(folder):
    if name.endswith(".csv"):
        with open(os.path.join(folder, name)) as src:
            text = src.read()
        with open(os.path.join(target, name), "w") as dst:
            dst.write(text)
        print("copied", name)
        copied += 1
print(f"Backed up {copied} files to {target}")
`,
    'organize_files.py': `# organize_files.py - tidy a messy folder by moving files into folders by type.
#
# Usage:   python3 organize_files.py inbox
#
# photo.jpg -> inbox/images/   song.mp3 -> inbox/audio/   notes.txt -> inbox/documents/
import sys
import os

if len(sys.argv) < 2:
    print("Usage: python3 organize_files.py FOLDER")
    sys.exit(1)

kinds = {
    ".jpg": "images", ".png": "images", ".gif": "images",
    ".mp3": "audio", ".wav": "audio",
    ".txt": "documents", ".pdf": "documents", ".docx": "documents",
    ".csv": "data",
}

folder = sys.argv[1]
moved = 0
for name in os.listdir(folder):
    path = os.path.join(folder, name)
    if os.path.isdir(path):
        continue
    ext = os.path.splitext(name)[1].lower()
    kind = kinds.get(ext, "other")
    os.makedirs(os.path.join(folder, kind), exist_ok=True)
    os.rename(path, os.path.join(folder, kind, name))
    print(f"{name:<22} -> {kind}/")
    moved += 1
print(f"Moved {moved} files.")
`,
  };

  const README = `AUTOMATION LAB
==============
These scripts are already written. Your job is to RUN them the right way:
give them the right file, save what they print, chain them, and schedule them.
That is most of what "automation" means at work.

    python3 hello.py                              start here
    python3 hello.py YourName                     a script can take ARGUMENTS
    python3 grade_report.py data/grades.csv       a script can read a CSV file
    python3 grade_report.py data/grades.csv 5     ...and take options (a 5-point curve)
    python3 inventory_check.py data/inventory.csv
    python3 clean_signups.py data/signups.csv
    python3 attendance_summary.py data/attendance.csv
    python3 weather_stats.py data/weather.csv Savannah
    python3 sales_total.py data/sales.csv
    python3 backup.py data
    python3 organize_files.py inbox

Things to try
  * cat grade_report.py              read the code: can you see where it decides A, B, C?
  * cat data/grades.csv              look at the raw data the script reads
  * python3 sales_total.py data/sales.csv > sales.txt      save the output
  * python3 inventory_check.py data/inventory.csv && cat reorder.csv
                                     run the second command only if the first worked
  * Add a row to data/inventory.csv with echo ... >> and run the check again.
  * bash run_all.sh                  one script that runs all the others (a "pipeline")
  * crontab -e                       schedule run_all.sh every morning

On Windows the command is  python  (not python3), and in Command Prompt
paths use backslashes:  python grade_report.py data\\grades.csv
`;
  const RUN_ALL_SH = `#!/bin/bash
# run_all.sh - the morning job: run every report and keep a log.
# Run it:   bash run_all.sh      (or: chmod +x run_all.sh  then  ./run_all.sh)
echo "=== Morning reports: $(date) ===" > morning.log
python3 grade_report.py data/grades.csv >> morning.log
python3 inventory_check.py data/inventory.csv >> morning.log
python3 sales_total.py data/sales.csv >> morning.log
python3 backup.py data >> morning.log
echo "Done. Read the log with:  cat morning.log"
`;
  const RUN_ALL_BAT = `@echo off
REM run_all.bat - the morning job for Windows. Run it by typing: run_all
echo === Morning reports: %DATE% === > morning.log
python grade_report.py data\\grades.csv >> morning.log
python inventory_check.py data\\inventory.csv >> morning.log
python sales_total.py data\\sales.csv >> morning.log
python backup.py data >> morning.log
echo Done. Read the log with:  type morning.log
`;
  const RUN_ALL_PS1 = `# run_all.ps1 - the morning job in PowerShell. Run it with:  .\\run_all.ps1
"=== Morning reports: $(Get-Date) ===" | Out-File morning.log
python grade_report.py data\\grades.csv | Out-File morning.log -Append
python inventory_check.py data\\inventory.csv | Out-File morning.log -Append
python sales_total.py data\\sales.csv | Out-File morning.log -Append
python backup.py data | Out-File morning.log -Append
Write-Host "Done. Read the log with:  Get-Content morning.log"
`;
  const INBOX = { 'beach-photo.jpg': { $size: 2400000 }, 'screenshot.png': { $size: 410000 }, 'favorite-song.mp3': { $size: 5200000 }, 'notes.txt': 'Remember: test on Friday!\n', 'essay.docx': { $size: 30120 }, 'field-trip-form.pdf': { $size: 184000 }, 'budget.csv': 'item,cost\nbus,120\nlunch,85\n', 'mystery.xyz': { $size: 1024 } };

  // The folder as a TX.build spec. kind: 'unix' | 'windows'
  TX.automationFolder = (kind) => {
    const exec = (t) => ({ $file: t, $mode: 0o755 });
    const spec = { 'README.txt': README, data: Object.assign({}, DATA), inbox: JSON.parse(JSON.stringify(INBOX)) };
    Object.keys(SCRIPTS).forEach((k) => { spec[k] = exec(SCRIPTS[k]); });
    if (kind === 'windows') { spec['run_all.bat'] = RUN_ALL_BAT; spec['run_all.ps1'] = RUN_ALL_PS1; spec['run_all.sh'] = exec(RUN_ALL_SH); }
    else spec['run_all.sh'] = exec(RUN_ALL_SH);
    return spec;
  };
  TX.AUTOMATION = { DATA, SCRIPTS, README };
})();
