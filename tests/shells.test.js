// What makes each new computer itself: the behaviours students are taught must keep working.
const test = require('node:test');
const assert = require('node:assert');
const TX = require('./load.js')();
const run = async (shell, lines, opts = {}) => TX.sandbox.norm((await TX.sandbox.run(shell, lines, Object.assign({ echo: '> ' }, opts))).out);

test('MS-DOS: 8.3 names, PATH lookup, no &&, DOSKEY, UNDELETE, COPY CON', async () => {
  const o = await run('dos', ['VER', 'CD STUDENT', 'MD LONGFOLDERNAME', 'DIR /B /AD', 'ECHO A & ECHO B', 'DEL C:\\DOS\\MEM.EXE', 'MEM', 'DEL TODO.TXT', 'UNDELETE', 'TYPE TODO.TXT', 'COPY CON NEW.TXT', 'TYPE NEW.TXT'], { input: ['Y', 'T', 'hello 1994', '^Z'] });
  assert.match(o, /MS-DOS Version 6\.22/);
  assert.match(o, /^LONGFOLD$/m, 'long names are cut to 8.3');
  assert.match(o, /^A & ECHO B$/m, 'no & operator in DOS');
  assert.match(o, /> MEM\nBad command or file name/, 'deleting MEM.EXE removes the MEM command');
  assert.match(o, /File successfully undeleted/);
  assert.match(o, /\[ \] finish CSP create task/, 'the undeleted file is back');
  assert.match(o, /> TYPE NEW\.TXT\nhello 1994/);
});

test('UNIX V7: 1979 rules', async () => {
  const o = await run('unix', ['ls', 'head -2 groceries.txt', 'echo $(date)', 'echo `date`', 'uname', 'sed 2q groceries.txt']);
  assert.match(o, /> ls\nDocuments\ngroceries\.txt\nprojects/, 'one name per line');
  assert.match(o, /head: not found/);
  assert.match(o, /syntax error/);
  assert.match(o, /1979/);
  assert.match(o, /uname: not found/);
  assert.match(o, /> sed 2q groceries\.txt\neggs\nmilk/);
});

test('Solaris: SunOS on SPARC, SMF, ZFS snapshots roll back deleted files, pfexec', async () => {
  const o = await run('solaris', ['uname -a', 'svcs -x', 'svcadm clear cups', 'pfexec svcadm clear cups', 'svcs cups', 'pfexec zfs snapshot rpool/export/home/student@t', 'rm groceries.txt', 'pfexec zfs rollback rpool/export/home/student@t', 'cat groceries.txt | head -1', 'ps aux']);
  assert.match(o, /SunOS sol-lab 5\.11 .* sparc/);
  assert.match(o, /maintenance/);
  assert.match(o, /Permission denied/);
  assert.match(o, /online\s+\S+\s+svc:\/application\/print\/cups:default/);
  assert.match(o, /> cat groceries\.txt \| head -1\neggs/, 'rollback restored the file');
  assert.match(o, /ps -ef/, 'ps aux explains System V options');
});

test('FreeBSD: no sudo, su, pkg, ports, rc.conf', async () => {
  const o = await run('freebsd', ['sudo ls', 'pkg install cowsay', 'su', 'pkg install -y cowsay', 'cd /usr/ports/games/sl', 'make install clean', 'sysrc pf_enable=YES', 'exit', 'cowsay hi', 'grep pf_enable /etc/rc.conf'], { input: ['student'], timeout: 10000 });
  assert.match(o, /sudo: not found/);
  assert.match(o, /Insufficient privileges/);
  assert.match(o, /Installing cowsay/);
  assert.match(o, /Installing for sl/);
  assert.match(o, /< hi >/);
  assert.match(o, /pf_enable="YES"/);
});

test('RAID: mdadm mirror survives a failed disk', async () => {
  const o = await run('bash', ['sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdc /dev/sdd --run', 'sudo mkfs.ext4 /dev/md0', 'sudo mkdir /mnt/raid', 'sudo mount /dev/md0 /mnt/raid', 'echo safe > /mnt/raid/x.txt', 'sudo mdadm /dev/md0 --fail /dev/sdc', 'cat /proc/mdstat', 'cat /mnt/raid/x.txt', 'sudo mdadm --create /dev/md1 --level=1 --raid-devices=2 /dev/sda /dev/sdb'], { input: ['student'] });
  assert.match(o, /array \/dev\/md0 started/);
  assert.match(o, /\[2\/1\] \[_U\]/, 'degraded mirror');
  assert.match(o, /> cat \/mnt\/raid\/x\.txt\nsafe/);
  assert.match(o, /Device or resource busy/, 'system disks are protected');
});

test('Automation Lab: scripts read CSVs, take arguments, and set exit codes', async () => {
  const o = await run('bash', ['cd ~/automation', 'python3 grade_report.py data/grades.csv 5 | grep average', 'python3 inventory_check.py && echo NO', 'python3 inventory_check.py data/inventory.csv > /dev/null && head -2 reorder.csv']);
  assert.match(o, /Class average: 89\.5/);
  assert.doesNotMatch(o, /^NO$/m, 'a usage error stops the && chain');
  assert.match(o, /item,qty,reorder_at\nnotebooks,18,25/);
  const w = await run('cmd', ['cd automation', 'python grade_report.py data\\grades.csv | find "average"']);
  assert.match(w, /Class average: 84\.9/);
});

test('every shell starts and answers', async () => {
  for (const k of TX.SHELL_ORDER) {
    const o = await run(k, [k === 'dos' || k === 'cmd' ? 'ver' : k === 'powershell' || k === 'pwsh' ? '$PSVersionTable.PSVersion' : 'echo ok']);
    assert.doesNotMatch(o, /internal error|not found|not recognized|Bad command/, k);
  }
});
