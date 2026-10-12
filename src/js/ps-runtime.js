/* TerminalEX — PowerShell runtime: values, operators, formatting, evaluation */
(function () {
  'use strict';
  const TX = window.TX;
  const C = TX.C;

  // ============================================================ value model
  class PSHash {
    constructor(ordered) { this.m = new Map(); this.ordered = !!ordered; }
    get(k) { const e = this.m.get(String(k).toLowerCase()); return e ? e[1] : undefined; }
    set(k, v) { const lk = String(k).toLowerCase(); const e = this.m.get(lk); if (e) e[1] = v; else this.m.set(lk, [k, v]); }
    has(k) { return this.m.has(String(k).toLowerCase()); }
    del(k) { this.m.delete(String(k).toLowerCase()); }
    keys() { return [...this.m.values()].map((e) => e[0]); }
    values() { return [...this.m.values()].map((e) => e[1]); }
    entries() { return [...this.m.values()]; }
    get size() { return this.m.size; }
  }
  class PSScriptBlock {
    constructor(node, rt) { this.node = node; this.rt = rt; }
    toString() { return this.node.text || ''; }
  }
  class PSError extends Error {
    constructor(msg, opts = {}) { super(msg); this.ps = true; Object.assign(this, opts); }
  }
  class Sig { constructor(kind, value) { this.kind = kind; this.value = value; } }
  TX.PSHash = PSHash; TX.PSScriptBlock = PSScriptBlock; TX.PSError = PSError;

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof PSHash) && !(v instanceof PSScriptBlock) && !(v instanceof RegExp);
  const visibleKeys = (o) => Object.keys(o).filter((k) => !k.startsWith('__'));
  TX.psVisibleKeys = visibleKeys;
  function typeName(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return 'System.String';
    if (typeof v === 'number') return Number.isInteger(v) && Math.abs(v) < 2147483648 ? 'System.Int32' : Number.isInteger(v) ? 'System.Int64' : 'System.Double';
    if (typeof v === 'boolean') return 'System.Boolean';
    if (Array.isArray(v)) return 'System.Object[]';
    if (v instanceof Date) return 'System.DateTime';
    if (v instanceof PSHash) return v.ordered ? 'System.Collections.Specialized.OrderedDictionary' : 'System.Collections.Hashtable';
    if (v instanceof PSScriptBlock) return 'System.Management.Automation.ScriptBlock';
    if (v.__type) return v.__type;
    return 'System.Management.Automation.PSCustomObject';
  }
  TX.psTypeName = typeName;

  function numStr(n) {
    if (!isFinite(n)) return isNaN(n) ? 'NaN' : n > 0 ? '∞' : '-∞';
    if (Number.isInteger(n)) return String(n);
    let s = String(Number(n.toPrecision(15)));
    if (/e/.test(s)) s = n.toExponential(14).replace(/\.?0+e/, 'E').replace('E+', 'E+').replace(/E(-?)(\d)$/, 'E$10$2');
    return s;
  }
  function dateStr(d) { return TX.p2(d.getMonth() + 1) + '/' + TX.p2(d.getDate()) + '/' + d.getFullYear() + ' ' + TX.p2(d.getHours()) + ':' + TX.p2(d.getMinutes()) + ':' + TX.p2(d.getSeconds()); }
  function toStr(v, rt) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return numStr(v);
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (Array.isArray(v)) return v.map((x) => toStr(x, rt)).join(rt && rt.getVar('OFS') != null ? toStr(rt.getVar('OFS')) : ' ');
    if (v instanceof Date) return dateStr(v);
    if (v instanceof PSHash) return typeName(v);
    if (v instanceof PSScriptBlock) return v.toString();
    if (v.__toString) return v.__toString();
    if (v.__type === 'System.IO.FileInfo' || v.__type === 'System.IO.DirectoryInfo') return v.FullName;
    if (v.__type === 'System.Diagnostics.Process') return `System.Diagnostics.Process (${v.ProcessName})`;
    if (v.__type === 'System.TimeSpan') return tsStr(v);
    if (v.__type && v.__type !== 'System.Management.Automation.PSCustomObject') return v.__type;
    return '@{' + visibleKeys(v).map((k) => `${k}=${toStr(v[k], rt)}`).join('; ') + '}';
  }
  function tsStr(t) { const neg = t.Ticks < 0; const a = Math.abs(t.TotalMilliseconds); const d = Math.floor(a / 86400000), h = Math.floor(a / 3600000) % 24, m = Math.floor(a / 60000) % 60, s = Math.floor(a / 1000) % 60, ms = Math.round(a % 1000); return (neg ? '-' : '') + (d ? d + '.' : '') + TX.p2(h) + ':' + TX.p2(m) + ':' + TX.p2(s) + (ms ? '.' + String(ms).padStart(3, '0') + '0000' : ''); }
  TX.psStr = toStr;
  TX.psNumStr = numStr;

  function timespan(ms) {
    const o = { __type: 'System.TimeSpan', Ticks: ms * 10000, Days: Math.trunc(ms / 86400000), Hours: Math.trunc(ms / 3600000) % 24, Minutes: Math.trunc(ms / 60000) % 60, Seconds: Math.trunc(ms / 1000) % 60, Milliseconds: Math.round(ms % 1000), TotalDays: ms / 86400000, TotalHours: ms / 3600000, TotalMinutes: ms / 60000, TotalSeconds: ms / 1000, TotalMilliseconds: ms };
    return o;
  }
  TX.psTimeSpan = timespan;

  function toNum(v, strict) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined || v === '') return 0;
    if (Array.isArray(v) && v.length === 1) return toNum(v[0], strict);
    if (v instanceof Date) return v.getTime();
    const s = String(v).trim();
    const m = /^(-?)(0x[0-9a-f]+|\d*\.?\d+(?:e[+-]?\d+)?)(kb|mb|gb|tb|pb)?$/i.exec(s.replace(/,/g, ''));
    if (m) { let n = /^0x/i.test(m[2]) ? parseInt(m[2], 16) : parseFloat(m[2]); if (m[3]) n *= Math.pow(1024, ['kb', 'mb', 'gb', 'tb', 'pb'].indexOf(m[3].toLowerCase()) + 1); return m[1] ? -n : n; }
    if (strict) throw new PSError(`Cannot convert value "${toStr(v)}" to type "System.Int32". Error: "The input string '${toStr(v)}' was not in a correct format."`, { category: 'InvalidArgument', id: 'InvalidCastFromStringToInteger' });
    return NaN;
  }
  TX.psNum = toNum;
  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length === 0 ? false : v.length === 1 ? truthy(v[0]) : true;
    return true;
  }
  TX.psTruthy = truthy;
  const unroll = (v) => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const collapse = (arr) => (arr.length === 0 ? null : arr.length === 1 ? arr[0] : arr);
  TX.psCollapse = collapse;

  // ------------------------------------------------------------ .NET-style format strings
  function fmtNumber(v, spec) {
    const n = toNum(v);
    if (!spec) return toStr(v);
    const m = /^([NnFfCcPpDdXxEeGg])(\d*)$/.exec(spec);
    if (m) {
      const p = m[2] === '' ? null : parseInt(m[2], 10);
      switch (m[1].toUpperCase()) {
        case 'N': return n.toLocaleString('en-US', { minimumFractionDigits: p ?? 2, maximumFractionDigits: p ?? 2 });
        case 'F': return n.toFixed(p ?? 2);
        case 'C': return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: p ?? 2, maximumFractionDigits: p ?? 2 });
        case 'P': return (n * 100).toLocaleString('en-US', { minimumFractionDigits: p ?? 2, maximumFractionDigits: p ?? 2 }) + '%';
        case 'D': return (n < 0 ? '-' : '') + String(Math.abs(Math.trunc(n))).padStart(p || 0, '0');
        case 'X': { const s = (Math.trunc(n) >>> 0).toString(16).padStart(p || 0, '0'); return m[1] === 'X' ? s.toUpperCase() : s; }
        case 'E': return n.toExponential(p ?? 6).replace(/e([+-])(\d)$/, 'E$1' + '00$2').replace(/e([+-])(\d\d)$/, 'E$10$2');
        case 'G': return numStr(n);
      }
    }
    // custom: 0.00, #,##0.0, 00000
    if (/^[#0,.%]+$/.test(spec)) {
      const pct = spec.includes('%'); const val = pct ? n * 100 : n;
      const [ip, fp = ''] = spec.replace('%', '').split('.');
      const minFrac = (fp.match(/0/g) || []).length, maxFrac = fp.length;
      const minInt = (ip.replace(/,/g, '').match(/0/g) || []).length;
      let s = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac, useGrouping: ip.includes(',') });
      const [si, sf] = s.split('.');
      const padded = si.replace(/,/g, '').length < minInt ? si.padStart(minInt, '0') : si;
      s = padded + (sf !== undefined ? '.' + sf : '');
      return (val < 0 ? '-' : '') + s + (pct ? '%' : '');
    }
    return toStr(v);
  }
  function fmtDate(d, spec) {
    if (!(d instanceof Date)) d = new Date(d);
    const std = { d: 'M/d/yyyy', D: 'dddd, MMMM d, yyyy', t: 'h:mm tt', T: 'h:mm:ss tt', g: 'M/d/yyyy h:mm tt', G: 'M/d/yyyy h:mm:ss tt', f: 'dddd, MMMM d, yyyy h:mm tt', F: 'dddd, MMMM d, yyyy h:mm:ss tt', s: "yyyy-MM-dd'T'HH:mm:ss", u: "yyyy-MM-dd HH:mm:ss'Z'", o: "yyyy-MM-dd'T'HH:mm:ss.fffffffK", M: 'MMMM d', m: 'MMMM d', Y: 'MMMM yyyy', y: 'MMMM yyyy' };
    if (!spec) spec = 'G';
    if (std[spec]) spec = std[spec];
    let out = '';
    const re = /(dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|HH|H|hh|h|mm|m|ss|s|fffffff|fff|ff|f|tt|t|zzz|zz|K|'[^']*'|\\.|.)/g;
    let m;
    const h12 = d.getHours() % 12 || 12;
    while ((m = re.exec(spec))) {
      const k = m[1];
      switch (k) {
        case 'dddd': out += TX.DAYS[d.getDay()]; break; case 'ddd': out += TX.DAY[d.getDay()]; break;
        case 'dd': out += TX.p2(d.getDate()); break; case 'd': out += d.getDate(); break;
        case 'MMMM': out += TX.MONTHS[d.getMonth()]; break; case 'MMM': out += TX.MON[d.getMonth()]; break;
        case 'MM': out += TX.p2(d.getMonth() + 1); break; case 'M': out += d.getMonth() + 1; break;
        case 'yyyy': out += d.getFullYear(); break; case 'yy': out += String(d.getFullYear()).slice(2); break;
        case 'HH': out += TX.p2(d.getHours()); break; case 'H': out += d.getHours(); break;
        case 'hh': out += TX.p2(h12); break; case 'h': out += h12; break;
        case 'mm': out += TX.p2(d.getMinutes()); break; case 'm': out += d.getMinutes(); break;
        case 'ss': out += TX.p2(d.getSeconds()); break; case 's': out += d.getSeconds(); break;
        case 'fffffff': out += String(d.getMilliseconds()).padStart(3, '0') + '0000'; break;
        case 'fff': out += String(d.getMilliseconds()).padStart(3, '0'); break; case 'ff': out += String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0'); break; case 'f': out += Math.floor(d.getMilliseconds() / 100); break;
        case 'tt': out += d.getHours() >= 12 ? 'PM' : 'AM'; break; case 't': out += d.getHours() >= 12 ? 'P' : 'A'; break;
        case 'zzz': case 'K': out += '-04:00'; break; case 'zz': out += '-04'; break;
        default: out += k.startsWith("'") ? k.slice(1, -1) : k.startsWith('\\') ? k[1] : k;
      }
    }
    return out;
  }
  TX.psFmtDate = fmtDate;
  function formatOp(fmt, args) {
    args = unroll(args);
    return String(fmt).replace(/\{\{|\}\}|\{(\d+)(?:,(-?\d+))?(?::([^}]*))?\}/g, (all, i, w, spec) => {
      if (all === '{{') return '{'; if (all === '}}') return '}';
      const v = args[+i];
      let s;
      if (v instanceof Date) s = fmtDate(v, spec);
      else if (spec && (typeof v === 'number' || /^[\d.-]+$/.test(String(v)))) s = fmtNumber(v, spec);
      else s = toStr(v);
      if (w) { const n = parseInt(w, 10); s = n < 0 ? s.padEnd(-n) : s.padStart(n); }
      return s;
    });
  }
  TX.psFormat = formatOp;

  // ------------------------------------------------------------ member access
  function findKey(o, name) { const ln = String(name).toLowerCase(); return Object.keys(o).find((k) => k.toLowerCase() === ln); }
  function getMember(v, name, rt) {
    const ln = String(name).toLowerCase();
    if (v === null || v === undefined) return null;
    if (typeof v === 'string') { if (ln === 'length') return v.length; return undefined; }
    if (Array.isArray(v)) {
      if (ln === 'count' || ln === 'length') return v.length;
      if (ln === 'rank') return 1;
      // member enumeration
      const out = [];
      v.forEach((x) => { const r = getMember(x, name, rt); if (r !== undefined && r !== null) out.push(...(Array.isArray(r) ? r : [r])); });
      return collapse(out);
    }
    if (v instanceof Date) {
      const map = { year: v.getFullYear(), month: v.getMonth() + 1, day: v.getDate(), hour: v.getHours(), minute: v.getMinutes(), second: v.getSeconds(), millisecond: v.getMilliseconds(), dayofweek: TX.DAYS[v.getDay()], dayofyear: Math.floor((v - new Date(v.getFullYear(), 0, 0)) / 86400000), date: new Date(v.getFullYear(), v.getMonth(), v.getDate()), ticks: v.getTime() * 10000 + 621355968000000000, timeofday: timespan(v - new Date(v.getFullYear(), v.getMonth(), v.getDate())), kind: 'Local' };
      return map[ln];
    }
    if (v instanceof PSHash) {
      if (ln === 'keys') return v.keys(); if (ln === 'values') return v.values(); if (ln === 'count') return v.size;
      return v.has(name) ? v.get(name) : null;
    }
    if (typeof v === 'number') return undefined;
    if (v instanceof PSScriptBlock) return undefined;
    if (typeof v === 'object') {
      const k = findKey(v, name);
      if (k !== undefined && !k.startsWith('__')) { const val = v[k]; return typeof val === 'function' ? val.call(v) : val; }
      if (v.__getters && v.__getters[ln]) return v.__getters[ln](v);
      return null;
    }
    return undefined;
  }
  TX.psGetMember = getMember;
  function setMember(v, name, val) {
    if (v instanceof PSHash) { v.set(name, val); return; }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const k = findKey(v, name);
      if (k === undefined) throw new PSError(`The property '${name}' cannot be found on this object. Verify that the property exists and can be set.`, { id: 'PropertyNotFound' });
      v[k] = val;
      if (v.__onSet) v.__onSet(k, val);
      return;
    }
    throw new PSError(`The property '${name}' cannot be found on this object. Verify that the property exists and can be set.`, { id: 'PropertyNotFound' });
  }
  function callMethod(v, name, args, rt) {
    const ln = String(name).toLowerCase();
    const a = args;
    if (v === null || v === undefined) throw new PSError('You cannot call a method on a null-valued expression.', { id: 'InvokeMethodOnNull', category: 'InvalidOperation' });
    if (ln === 'tostring') {
      if (v instanceof Date) return a.length ? fmtDate(v, toStr(a[0])) : dateStr(v);
      if (typeof v === 'number' && a.length) return fmtNumber(v, toStr(a[0]));
      return toStr(v, rt);
    }
    if (ln === 'gettype') return { __type: 'System.RuntimeType', IsPublic: true, IsSerial: true, Name: typeName(v).split('.').pop(), BaseType: typeName(v).startsWith('System.Int') || typeName(v) === 'System.Double' ? 'System.ValueType' : 'System.Object', FullName: typeName(v), __toString() { return typeName(v); } };
    if (ln === 'equals') return toStr(v).toLowerCase() === toStr(a[0]).toLowerCase();
    if (ln === 'gethashcode') return Math.abs(parseInt(TX.sha1(toStr(v)).slice(0, 7), 16));
    if (typeof v === 'string') {
      const s = v;
      switch (ln) {
        case 'toupper': case 'toupperinvariant': return s.toUpperCase();
        case 'tolower': case 'tolowerinvariant': return s.toLowerCase();
        case 'trim': return a.length ? trimChars(s, toStr(a[0]), 3) : s.trim();
        case 'trimstart': return a.length ? trimChars(s, toStr(a[0]), 1) : s.replace(/^\s+/, '');
        case 'trimend': return a.length ? trimChars(s, toStr(a[0]), 2) : s.replace(/\s+$/, '');
        case 'split': { if (!a.length) return s.split(/\s/); const seps = unroll(a[0]).map((x) => toStr(x)); const chars = seps.length === 1 && seps[0].length > 1 && typeof a[0] === 'string' ? [...seps[0]] : seps; return s.split(new RegExp(chars.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'))); }
        case 'replace': return s.split(toStr(a[0])).join(toStr(a[1]));
        case 'contains': return s.includes(toStr(a[0]));
        case 'startswith': return a[1] && /ignore/i.test(toStr(a[1])) ? s.toLowerCase().startsWith(toStr(a[0]).toLowerCase()) : s.startsWith(toStr(a[0]));
        case 'endswith': return a[1] && /ignore/i.test(toStr(a[1])) ? s.toLowerCase().endsWith(toStr(a[0]).toLowerCase()) : s.endsWith(toStr(a[0]));
        case 'indexof': return s.indexOf(toStr(a[0]), a[1] !== undefined ? toNum(a[1]) : 0);
        case 'lastindexof': return s.lastIndexOf(toStr(a[0]));
        case 'substring': { const st = toNum(a[0]); if (st > s.length) throw new PSError('Exception calling "Substring" with "1" argument(s): "startIndex cannot be larger than length of string. (Parameter \'startIndex\')"'); return a.length > 1 ? s.substr(st, toNum(a[1])) : s.slice(st); }
        case 'padleft': return s.padStart(toNum(a[0]), a[1] !== undefined ? toStr(a[1]) : ' ');
        case 'padright': return s.padEnd(toNum(a[0]), a[1] !== undefined ? toStr(a[1]) : ' ');
        case 'insert': return s.slice(0, toNum(a[0])) + toStr(a[1]) + s.slice(toNum(a[0]));
        case 'remove': return a.length > 1 ? s.slice(0, toNum(a[0])) + s.slice(toNum(a[0]) + toNum(a[1])) : s.slice(0, toNum(a[0]));
        case 'tochararray': return [...s];
        case 'normalize': return s.normalize();
        case 'compareto': return s.localeCompare(toStr(a[0]));
      }
    }
    if (typeof v === 'number') {
      if (ln === 'compareto') return Math.sign(v - toNum(a[0]));
    }
    if (Array.isArray(v)) {
      switch (ln) {
        case 'contains': return v.some((x) => looseEq(x, a[0]));
        case 'indexof': return v.findIndex((x) => looseEq(x, a[0]));
        case 'where': { const sb = a[0]; return v.filter((x) => truthy(rt.invokeBlock(sb, [], x))); }
        case 'foreach': { const sb = a[0]; if (sb instanceof PSScriptBlock) return v.map((x) => collapse(unroll(rt.invokeBlock(sb, [], x)))); return v.map((x) => getMember(x, toStr(sb), rt)); }
        case 'add': throw new PSError('Exception calling "Add" with "1" argument(s): "Collection was of a fixed size."');
        case 'clone': return v.slice();
      }
    }
    if (v instanceof Date) {
      const add = (ms) => new Date(v.getTime() + ms);
      switch (ln) {
        case 'adddays': return add(toNum(a[0]) * 86400000); case 'addhours': return add(toNum(a[0]) * 3600000); case 'addminutes': return add(toNum(a[0]) * 60000); case 'addseconds': return add(toNum(a[0]) * 1000); case 'addmilliseconds': return add(toNum(a[0]));
        case 'addmonths': { const d = new Date(v); d.setMonth(d.getMonth() + toNum(a[0])); return d; }
        case 'addyears': { const d = new Date(v); d.setFullYear(d.getFullYear() + toNum(a[0])); return d; }
        case 'toshortdatestring': return fmtDate(v, 'd'); case 'tolongdatestring': return fmtDate(v, 'D');
        case 'toshorttimestring': return fmtDate(v, 't'); case 'tolongtimestring': return fmtDate(v, 'T');
        case 'touniversaltime': return add(4 * 3600000); case 'tolocaltime': return v;
        case 'subtract': return a[0] instanceof Date ? timespan(v - a[0]) : add(-toNum(getMember(a[0], 'TotalMilliseconds')));
        case 'isdaylightsavingtime': return true;
      }
    }
    if (v instanceof PSHash) {
      switch (ln) {
        case 'add': if (v.has(a[0])) throw new PSError(`Exception calling "Add" with "2" argument(s): "Item has already been added. Key in dictionary: '${toStr(a[0])}'  Key being added: '${toStr(a[0])}'"`); v.set(a[0], a[1]); return undefined;
        case 'remove': v.del(a[0]); return undefined;
        case 'containskey': return v.has(a[0]);
        case 'containsvalue': return v.values().some((x) => looseEq(x, a[0]));
        case 'clear': v.m.clear(); return undefined;
        case 'getenumerator': return v.entries().map(([k, val]) => ({ __type: 'System.Collections.DictionaryEntry', Name: k, Key: k, Value: val }));
        case 'clone': { const h = new PSHash(v.ordered); v.entries().forEach(([k, val]) => h.set(k, val)); return h; }
      }
    }
    if (v instanceof PSScriptBlock && ln === 'invoke') return collapse(unroll(rt.invokeBlock(v, a)));
    if (v && typeof v === 'object' && v.__methods) {
      const k = Object.keys(v.__methods).find((x) => x.toLowerCase() === ln);
      if (k) return v.__methods[k].apply(v, a);
    }
    throw new PSError(`Method invocation failed because [${typeName(v)}] does not contain a method named '${name}'.`, { id: 'MethodNotFound', category: 'InvalidOperation' });
  }
  function trimChars(s, chars, mode) { const set = new Set([...chars]); let a = 0, b = s.length; if (mode & 1) while (a < b && set.has(s[a])) a++; if (mode & 2) while (b > a && set.has(s[b - 1])) b--; return s.slice(a, b); }
  TX.psCallMethod = callMethod;
  TX.psSetMember = setMember;

  // ------------------------------------------------------------ operators
  function looseEq(a, b, cs) {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    if (typeof a === 'number') { const nb = typeof b === 'string' ? toNum(b) : toNum(b); return a === nb; }
    if (typeof a === 'boolean') return a === truthy(b);
    if (a instanceof Date) return b instanceof Date ? a.getTime() === b.getTime() : false;
    if (typeof a === 'string') { const sb = toStr(b); return cs ? a === sb : a.toLowerCase() === sb.toLowerCase(); }
    return a === b;
  }
  function compare(a, b, cs) {
    if (typeof a === 'number' || typeof b === 'number' && (a === null || /^\s*-?[\d.]+\s*$/.test(String(a)))) { const x = toNum(a), y = toNum(b); return x < y ? -1 : x > y ? 1 : 0; }
    if (a instanceof Date) { const y = b instanceof Date ? b.getTime() : new Date(toStr(b)).getTime(); return a.getTime() - y; }
    const x = cs ? toStr(a) : toStr(a).toLowerCase(), y = cs ? toStr(b) : toStr(b).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  TX.psCompare = compare;
  TX.psLooseEq = looseEq;
  function binaryOp(op, l, r, rt) {
    let cs = false;
    let o = op;
    if (/^c(eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|in|notin|replace|split)$/.test(o)) { cs = true; o = o.slice(1); }
    else if (/^i(eq|ne|gt|ge|lt|le|like|notlike|match|notmatch|contains|notcontains|in|notin|replace|split)$/.test(o)) o = o.slice(1);
    const scalarCmp = (fn) => {
      if (Array.isArray(l)) return l.filter((x) => fn(x));
      return fn(l);
    };
    switch (o) {
      case '+':
        if (l === null || l === undefined) return r;
        if (Array.isArray(l)) return l.concat(Array.isArray(r) ? r : [r]);
        if (typeof l === 'string') return l + toStr(r, rt);
        if (l instanceof PSHash) { const h = new PSHash(l.ordered); l.entries().forEach(([k, v]) => h.set(k, v)); if (r instanceof PSHash) r.entries().forEach(([k, v]) => { if (h.has(k)) throw new PSError(`Item has already been added. Key in dictionary: '${k}'  Key being added: '${k}'`); h.set(k, v); }); return h; }
        if (l instanceof Date) return new Date(l.getTime() + (r && r.__type === 'System.TimeSpan' ? r.TotalMilliseconds : toNum(r) / 10000));
        return toNum(l, true) + toNum(r, true);
      case '-':
        if (l instanceof Date) return r instanceof Date ? timespan(l - r) : new Date(l.getTime() - (r && r.__type === 'System.TimeSpan' ? r.TotalMilliseconds : toNum(r)));
        return toNum(l, true) - toNum(r, true);
      case '*':
        if (typeof l === 'string') return l.repeat(Math.max(0, toNum(r)));
        if (Array.isArray(l)) { let out = []; for (let i = 0; i < toNum(r); i++) out = out.concat(l); return out; }
        return toNum(l, true) * toNum(r, true);
      case '/': { const d = toNum(r, true); if (d === 0) throw new PSError('Attempted to divide by zero.', { id: 'RuntimeException', category: 'NotSpecified' }); return toNum(l, true) / d; }
      case '%': return toNum(l, true) % toNum(r, true);
      case 'eq': return scalarCmp((x) => looseEq(x, r, cs));
      case 'ne': return scalarCmp((x) => !looseEq(x, r, cs));
      case 'gt': return scalarCmp((x) => compare(x, r, cs) > 0);
      case 'ge': return scalarCmp((x) => compare(x, r, cs) >= 0);
      case 'lt': return scalarCmp((x) => compare(x, r, cs) < 0);
      case 'le': return scalarCmp((x) => compare(x, r, cs) <= 0);
      case 'like': { const re = TX.likeToRegex(toStr(r), cs); return scalarCmp((x) => re.test(toStr(x))); }
      case 'notlike': { const re = TX.likeToRegex(toStr(r), cs); return scalarCmp((x) => !re.test(toStr(x))); }
      case 'match': case 'notmatch': {
        const re = new RegExp(toStr(r), cs ? '' : 'i');
        if (Array.isArray(l)) return l.filter((x) => re.test(toStr(x)) === (o === 'match'));
        const m = re.exec(toStr(l));
        if (m) { const h = new PSHash(); m.forEach((g, i) => { if (g !== undefined) h.set(i, g); }); if (m.groups) Object.keys(m.groups).forEach((k) => h.set(k, m.groups[k])); rt.setVar('Matches', h); }
        return o === 'match' ? !!m : !m;
      }
      case 'contains': return unroll(l).some((x) => looseEq(x, r, cs));
      case 'notcontains': return !unroll(l).some((x) => looseEq(x, r, cs));
      case 'in': return unroll(r).some((x) => looseEq(x, l, cs));
      case 'notin': return !unroll(r).some((x) => looseEq(x, l, cs));
      case 'replace': {
        const [pat, rep] = Array.isArray(r) ? r : [r, ''];
        const re = new RegExp(toStr(pat), 'g' + (cs ? '' : 'i'));
        const f = (x) => toStr(x).replace(re, toStr(rep).replace(/\$(\d)/g, '$$$1'));
        return Array.isArray(l) ? l.map(f) : f(l);
      }
      case 'split': { const [pat, max] = Array.isArray(r) ? r : [r]; const re = new RegExp(toStr(pat), cs ? '' : 'i'); const res = []; unroll(l).forEach((x) => { let parts = toStr(x).split(re); if (max) { const n = toNum(max); if (parts.length > n) parts = parts.slice(0, n - 1).concat([parts.slice(n - 1).join(toStr(pat))]); } res.push(...parts); }); return res; }
      case 'join': return unroll(l).map((x) => toStr(x, rt)).join(toStr(r));
      case 'f': return formatOp(toStr(l), r);
      case 'and': return truthy(l) && truthy(r);
      case 'or': return truthy(l) || truthy(r);
      case 'xor': return truthy(l) !== truthy(r);
      case 'band': return toNum(l) & toNum(r); case 'bor': return toNum(l) | toNum(r); case 'bxor': return toNum(l) ^ toNum(r);
      case 'shl': return toNum(l) << toNum(r); case 'shr': return toNum(l) >> toNum(r);
      case 'is': case 'isnot': { const t = r && r.__isType ? r.name : toStr(r); const ok = isType(l, t); return o === 'is' ? ok : !ok; }
      case 'as': { try { return castTo(r && r.__isType ? r.name : toStr(r), l, rt); } catch (e) { return null; } }
    }
    throw new PSError(`Unexpected token '-${op}' in expression or statement.`);
  }
  TX.psBinary = binaryOp;
  function isType(v, t) {
    t = t.toLowerCase().replace(/^system\./, '');
    const tn = typeName(v).toLowerCase().replace(/^system\./, '');
    const map = { int: ['int32', 'int64'], int32: ['int32'], long: ['int64', 'int32'], double: ['double'], string: ['string'], bool: ['boolean'], boolean: ['boolean'], array: ['object[]'], 'object[]': ['object[]'], datetime: ['datetime'], hashtable: ['collections.hashtable'], scriptblock: ['management.automation.scriptblock'], pscustomobject: ['management.automation.pscustomobject'], object: [tn], valuetype: ['int32', 'int64', 'double', 'boolean', 'datetime'] };
    if (t === 'int' || t === 'int32') return typeof v === 'number' && Number.isInteger(v);
    if (t === 'double' || t === 'float' || t === 'decimal') return typeof v === 'number';
    if (t === 'io.fileinfo' || t === 'fileinfo') return tn === 'io.fileinfo';
    if (t === 'io.directoryinfo') return tn === 'io.directoryinfo';
    return (map[t] || [t]).includes(tn);
  }
  function castTo(type, v, rt) {
    const t = type.toLowerCase().replace(/^system\./, '').trim();
    const arr = /\[\]$/.test(t);
    if (arr) { const inner = t.slice(0, -2); return unroll(v).map((x) => castTo(inner, x, rt)); }
    switch (t) {
      case 'int': case 'int32': case 'int64': case 'long': case 'byte': case 'int16': case 'uint32': case 'uint64': {
        if (typeof v === 'string' && !/^\s*[-+]?[\d.]+(e\d+)?\s*$|^0x/i.test(v)) throw new PSError(`Cannot convert value "${v}" to type "System.Int32". Error: "The input string '${v}' was not in a correct format."`, { id: 'InvalidCastFromStringToInteger', category: 'InvalidArgument' });
        const n = toNum(v); return Math.round(n) === n + 0.5 && Math.floor(n) % 2 === 0 ? Math.floor(n) : Math.round(n);
      }
      case 'double': case 'float': case 'single': case 'decimal': { const n = toNum(v); if (isNaN(n)) throw new PSError(`Cannot convert value "${toStr(v)}" to type "System.Double". Error: "The input string '${toStr(v)}' was not in a correct format."`); return n; }
      case 'string': return toStr(v, rt);
      case 'bool': case 'boolean': return truthy(v);
      case 'char': return typeof v === 'number' ? String.fromCharCode(v) : toStr(v)[0];
      case 'array': case 'object[]': return unroll(v);
      case 'datetime': { if (v instanceof Date) return v; const d = new Date(toStr(v)); if (isNaN(d)) throw new PSError(`Cannot convert value "${toStr(v)}" to type "System.DateTime". Error: "String '${toStr(v)}' was not recognized as a valid DateTime."`); return d; }
      case 'pscustomobject': case 'psobject': case 'management.automation.pscustomobject': {
        if (v instanceof PSHash) { const o = { __type: 'System.Management.Automation.PSCustomObject' }; v.entries().forEach(([k, val]) => { o[k] = val; }); return o; }
        return v;
      }
      case 'ordered': { if (v instanceof PSHash) { v.ordered = true; return v; } return v; }
      case 'hashtable': case 'collections.hashtable': return v instanceof PSHash ? v : new PSHash();
      case 'regex': return new RegExp(toStr(v));
      case 'scriptblock': return v;
      case 'math': case 'console': return v;
      case 'guid': return toStr(v);
      case 'version': return toStr(v);
      case 'xml': return v;
      case 'void': return undefined;
      case 'ipaddress': case 'net.ipaddress': return { __type: 'System.Net.IPAddress', IPAddressToString: toStr(v), AddressFamily: 'InterNetwork', __toString() { return toStr(v); } };
    }
    return v;
  }
  TX.psCast = castTo;

  // ============================================================ formatting (Out-Default)
  const PS7_HDR = (s, rt) => (rt && rt.pwsh ? '\x1b[32;1m' + s + '\x1b[0m' : s);
  function cellStr(v, rt) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return numStr(v);
    if (v instanceof Date) return TX.psDate(v.getTime()).replace(/ +/g, ' ').replace(/(\d+:\d+) ([AP]M)/, '$1:' + TX.p2(v.getSeconds()) + ' $2');
    if (Array.isArray(v)) { const s = '{' + v.slice(0, 4).map((x) => cellStr(x, rt)).join(', ') + (v.length > 4 ? '…' : '') + '}'; return s; }
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (v instanceof PSHash) return '{' + v.keys().slice(0, 3).join(', ') + (v.size > 3 ? '…' : '') + '}';
    return toStr(v, rt);
  }
  TX.psCellStr = cellStr;
  function renderTable(objs, cols, rt, opts = {}) {
    const W = (rt && rt.term ? rt.term.cols : 120) - 1;
    const rows = objs.map((o) => cols.map((c) => { const raw = c.get ? c.get(o, rt) : getMember(o, c.name, rt); return { raw, s: c.fmt ? c.fmt(raw, o, rt) : cellStr(raw, rt), color: c.color ? c.color(raw, o, rt) : null }; }));
    const widths = cols.map((c, i) => {
      if (c.width && !opts.auto) return c.width;
      let w = TX.visLen(c.label);
      rows.forEach((r) => { w = Math.max(w, TX.visLen(r[i].s)); });
      return w;
    });
    const right = cols.map((c, i) => c.align === 'right' || (c.align !== 'left' && rows.length && rows.every((r) => r[i].raw === null || r[i].raw === undefined || r[i].raw === '' || typeof r[i].raw === 'number')));
    // fit to width: shrink the last column / truncate
    let total = widths.reduce((a, b) => a + b + 1, -1);
    if (total > W) {
      const lastI = widths.length - 1;
      const other = total - widths[lastI];
      widths[lastI] = Math.max(8, W - other - 1);
      total = widths.reduce((a, b) => a + b + 1, -1);
      if (total > W) { let k = widths.length - 1; while (total > W && k >= 0) { const cut = Math.min(widths[k] - 4, total - W); if (cut > 0) { widths[k] -= cut; total -= cut; } k--; } }
    }
    const ell = rt && rt.pwsh ? '…' : '...';
    const fit = (s, w, r) => { const len = TX.visLen(s); if (len > w) s = TX.stripAnsi(s).slice(0, Math.max(0, w - ell.length)) + ell; return r ? TX.padL(s, w) : TX.padR(s, w); };
    const lines = [];
    const hdr = cols.map((c, i) => fit(c.label, widths[i], right[i])).join(' ').replace(/\s+$/, '');
    const dash = cols.map((c, i) => fit('-'.repeat(Math.min(TX.visLen(c.label), widths[i])), widths[i], right[i])).join(' ').replace(/\s+$/, '');
    if (cols.some((c) => c.label2)) {
      lines.push(PS7_HDR(cols.map((c, i) => fit(c.label, widths[i], right[i])).join(' ').replace(/\s+$/, ''), rt));
      lines.push(PS7_HDR(cols.map((c, i) => fit(c.label2 || '', widths[i], right[i])).join(' ').replace(/\s+$/, ''), rt));
    } else lines.push(PS7_HDR(hdr, rt));
    lines.push(PS7_HDR(dash, rt));
    rows.forEach((r) => {
      lines.push(r.map((cell, i) => { let s = fit(cell.s, widths[i], right[i]); if (cell.color && rt && rt.pwsh) { const t = s.replace(/\s+$/, ''); s = cell.color + t + '\x1b[0m' + s.slice(t.length); } return s; }).join(' ').replace(/\s+$/, ''));
    });
    return lines.join('\n');
  }
  function renderList(objs, props, rt) {
    const out = [];
    objs.forEach((o) => {
      const ps = props || listProps(o);
      const w = Math.max(...ps.map((p) => (typeof p === 'string' ? p : p.label).length));
      const lines = ps.map((p) => {
        const label = typeof p === 'string' ? p : p.label;
        const v = typeof p === 'string' ? getMember(o, p, rt) : p.get(o, rt);
        let s = cellStr(v, rt);
        if (Array.isArray(v)) s = '{' + v.map((x) => cellStr(x, rt)).join(', ') + '}';
        const indent = ' '.repeat(w + 3);
        s = String(s).split('\n').join('\n' + indent);
        return (rt && rt.pwsh ? '\x1b[32;1m' + label.padEnd(w) + ' : \x1b[0m' : label.padEnd(w) + ' : ') + s;
      });
      out.push(lines.join('\n'));
    });
    return out.join('\n\n');
  }
  function listProps(o) {
    const view = VIEWS[typeName(o)];
    if (view && view.list) return view.list;
    return visibleKeys(o);
  }
  const VIEWS = (TX.PS_VIEWS = {});
  function formatForHost(items, rt) {
    const out = [];
    let i = 0;
    const flat = [];
    items.forEach((x) => { if (Array.isArray(x)) flat.push(...x); else flat.push(x); });
    while (i < flat.length) {
      const v = flat[i];
      if (v === null || v === undefined) { i++; continue; }
      if (v && v.__format) { out.push({ text: v.text, block: true }); i++; continue; }
      if (typeof v !== 'object' || v instanceof Date) {
        if (v instanceof Date) out.push({ text: '\n' + TX.psLongDate(v.getTime()) + '\n' });
        else out.push({ text: toStr(v, rt) });
        i++; continue;
      }
      // group consecutive items of the same type
      const gk = (x) => VIEWS[typeName(x)] || typeName(x);
      const tn = gk(v);
      const group = [];
      while (i < flat.length && flat[i] !== null && typeof flat[i] === 'object' && !(flat[i] instanceof Date) && !flat[i].__format && gk(flat[i]) === tn) group.push(flat[i++]);
      out.push({ text: formatGroup(group, rt), block: true });
    }
    // join: blocks are surrounded by blank lines
    let s = '';
    out.forEach((o, k) => {
      if (o.block) { if (s && !s.endsWith('\n\n')) s += '\n'; s += (k === 0 ? '\n' : '') + o.text.replace(/^\n+/, '') + '\n\n'; }
      else s += o.text + '\n';
    });
    return s;
  }
  function formatGroup(group, rt, force) {
    const v = group[0];
    if (v instanceof PSHash) {
      const rows = [];
      group.forEach((h) => h.entries().forEach(([k, val]) => rows.push({ Name: k, Value: val })));
      return renderTable(rows, [{ label: 'Name', name: 'Name', width: Math.max(30, ...rows.map((r) => toStr(r.Name).length)) }, { label: 'Value', name: 'Value' }], rt, {});
    }
    if (v instanceof PSScriptBlock) return group.map((x) => x.toString()).join('\n');
    const view = VIEWS[typeName(v)];
    if (view && !force) {
      if (view.custom) return view.custom(group, rt);
      if (view.table) {
        const cols = typeof view.table === 'function' ? view.table(rt) : view.table;
        if (view.groupBy) {
          const parts = [];
          let cur = null, bucket = [];
          const flush = () => { if (bucket.length) parts.push(view.groupLabel(cur, rt) + '\n\n' + renderTable(bucket, cols, rt, { auto: true })); bucket = []; };
          group.forEach((o) => { const g = view.groupBy(o); if (g !== cur) { flush(); cur = g; } bucket.push(o); });
          flush();
          return parts.join('\n\n');
        }
        return renderTable(group, cols, rt, { auto: true });
      }
      if (view.list) return renderList(group, view.list, rt);
    }
    const keys = visibleKeys(v);
    if (keys.length <= 4) return renderTable(group, keys.map((k) => ({ label: k, name: k })), rt, { auto: true });
    return renderList(group, null, rt);
  }
  TX.psFormatForHost = formatForHost;
  TX.psRenderTable = renderTable;
  TX.psRenderList = renderList;
  TX.psFormatGroup = formatGroup;

  // ============================================================ runtime
  class Runtime {
    constructor(shell) {
      this.shell = shell;
      this.term = shell.term;
      this.pwsh = shell.pwsh;
      this.scopes = [new Map()];
      this.functions = new Map();
      this.aliases = new Map();
      this.errors = [];
      this.lastOk = true;
      this.initVars();
    }
    initVars() {
      const s = this.shell;
      const set = (k, v) => this.scopes[0].set(k.toLowerCase(), { name: k, value: v });
      set('true', true); set('false', false); set('null', null);
      set('HOME', 'C:\\Users\\student'); set('PID', 6444 + (this.pwsh ? 12 : 0)); set('PSHOME', this.pwsh ? 'C:\\Program Files\\PowerShell\\7' : 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0');
      set('PROFILE', this.pwsh ? 'C:\\Users\\student\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1' : 'C:\\Users\\student\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1');
      set('ErrorActionPreference', 'Continue'); set('WarningPreference', 'Continue'); set('VerbosePreference', 'SilentlyContinue'); set('ConfirmPreference', 'High');
      set('MaximumHistoryCount', 4096); set('OFS', null); set('IsWindows', true); set('IsLinux', false); set('IsMacOS', false); set('IsCoreCLR', !!this.pwsh);
      set('LASTEXITCODE', 0);
      const ver = this.pwsh ? '7.4.5' : '5.1.22621.4111';
      const vt = new PSHash();
      if (this.pwsh) { vt.set('PSVersion', ver); vt.set('PSEdition', 'Core'); vt.set('GitCommitId', ver); vt.set('OS', 'Microsoft Windows 10.0.22631'); vt.set('Platform', 'Win32NT'); vt.set('PSCompatibleVersions', ['1.0', '2.0', '3.0', '4.0', '5.0', '5.1', '6.0', '7.0']); vt.set('PSRemotingProtocolVersion', '2.3'); vt.set('SerializationVersion', '1.1.0.1'); vt.set('WSManStackVersion', '3.0'); }
      else { vt.set('PSVersion', ver); vt.set('PSEdition', 'Desktop'); vt.set('PSCompatibleVersions', ['1.0', '2.0', '3.0', '4.0', '5.0', '5.1.22621.4111']); vt.set('BuildVersion', '10.0.22621.4111'); vt.set('CLRVersion', '4.0.30319.42000'); vt.set('WSManStackVersion', '3.0'); vt.set('PSRemotingProtocolVersion', '2.3'); vt.set('SerializationVersion', '1.1.0.1'); }
      set('PSVersionTable', vt);
      set('Host', { __type: 'System.Management.Automation.Internal.Host.InternalHost', Name: 'ConsoleHost', Version: ver, InstanceId: 'c1a2b3d4-5e6f-4a1b-9c8d-7e6f5a4b3c2d', UI: 'System.Management.Automation.Internal.Host.InternalHostUserInterface', CurrentCulture: 'en-US', CurrentUICulture: 'en-US', PrivateData: 'Microsoft.PowerShell.ConsoleHost+ConsoleColorProxy', DebuggerEnabled: true, IsRunspacePushed: false, Runspace: 'System.Management.Automation.Runspaces.LocalRunspace' });
      if (this.pwsh) set('PSStyle', { __type: 'System.Management.Automation.PSStyle', Reset: '\x1b[0m', Bold: '\x1b[1m', Italic: '\x1b[3m', Underline: '\x1b[4m', Foreground: { __type: 'ForegroundColor', Red: '\x1b[31m', Green: '\x1b[32m', Yellow: '\x1b[33m', Blue: '\x1b[34m', Magenta: '\x1b[35m', Cyan: '\x1b[36m', White: '\x1b[37m', BrightRed: '\x1b[91m', BrightGreen: '\x1b[92m', BrightYellow: '\x1b[93m', BrightBlue: '\x1b[94m', BrightMagenta: '\x1b[95m', BrightCyan: '\x1b[96m' }, OutputRendering: 'Host' });
    }
    // ---------- variables
    getVar(name) {
      const ln = name.toLowerCase().replace(/^(global|script|local|private):/, '');
      if (ln.startsWith('env:')) { const k = ln.slice(4); const vars = this.shell.env; const key = Object.keys(vars).find((x) => x.toLowerCase() === k); return key ? vars[key] : null; }
      if (ln === 'pwd') return this.shell.pathInfo();
      if (ln === '?') return this.lastOk;
      if (ln === 'error') return this.errors.slice().reverse();
      if (ln === 'executioncontext') return { __type: 'System.Management.Automation.EngineIntrinsics' };
      if (ln === 'psitem') return this.getVar('_');
      for (let i = this.scopes.length - 1; i >= 0; i--) { const e = this.scopes[i].get(ln); if (e) return e.value; }
      if (ln.startsWith('variable:')) return this.getVar(ln.slice(9));
      return null;
    }
    hasVar(name) { const ln = name.toLowerCase(); return this.scopes.some((s) => s.has(ln)); }
    setVar(name, value, local) {
      let ln = name.toLowerCase();
      let scope = null;
      const sm = /^(global|script|local|private):(.*)$/.exec(ln);
      if (sm) { ln = sm[2]; name = name.split(':')[1]; scope = sm[1] === 'global' ? this.scopes[0] : this.scopes[this.scopes.length - 1]; }
      if (ln.startsWith('env:')) { const k = name.slice(4); const vars = this.shell.env; const key = Object.keys(vars).find((x) => x.toLowerCase() === k.toLowerCase()) || k; if (value === null || value === '') delete vars[key]; else vars[key] = toStr(value); return; }
      if (['true', 'false', 'null'].includes(ln)) throw new PSError(`Cannot overwrite variable ${name} because it is read-only or constant.`, { id: 'VariableNotWritable', category: 'WriteError' });
      if (!scope) {
        if (!local) for (let i = this.scopes.length - 1; i >= 0; i--) { if (this.scopes[i].has(ln)) { scope = this.scopes[i]; break; } }
        if (!scope) scope = this.scopes[this.scopes.length - 1];
      }
      const e = scope.get(ln);
      if (e) e.value = value; else scope.set(ln, { name, value });
    }
    removeVar(name) { const ln = name.toLowerCase(); for (let i = this.scopes.length - 1; i >= 0; i--) if (this.scopes[i].delete(ln)) return true; return false; }
    allVars() { const m = new Map(); this.scopes.forEach((s) => s.forEach((v, k) => m.set(k, v))); return [...m.values()]; }

    // ---------- evaluation
    async execBlock(stmts) {
      const out = [];
      for (const st of stmts) {
        const r = await this.execStatement(st);
        if (r && r.length) out.push(...r);
      }
      return out;
    }
    async execStatement(st) {
      this.shell.checkAbort();
      switch (st.t) {
        case 'pipeline': return this.runPipeline(st, null);
        case 'chain': {
          const l = await this.execStatement(st.left);
          const ok = this.lastOk;
          if ((st.op === '&&' && ok) || (st.op === '||' && !ok)) return l.concat(await this.execStatement(st.right));
          return l;
        }
        case 'assign': {
          let rhs = await this.execStatement(st.value);
          let v = st.value.t === 'pipeline' && st.value.elements.length === 1 && st.value.elements[0].t === 'expr' && st.value.elements[0].e.t === 'array' ? rhs : collapse(rhs);
          if (st.value.t === 'pipeline' && st.value.elements[0].t === 'expr' && ['arrsub', 'array'].includes(st.value.elements[0].e.t)) v = rhs;
          if (st.op !== '=') {
            const cur = await this.evalLValueGet(st.target);
            v = binaryOp(st.op[0], cur, v, this);
          }
          if (st.target.t === 'cast') { v = castTo(st.target.type, v, this); await this.assignTo(st.target.e, v); }
          else await this.assignTo(st.target, v);
          return [];
        }
        case 'incr': { await this.evalExpr(st); return []; }
        case 'if': {
          for (const cl of st.clauses) {
            const c = await this.execStatement(cl.cond);
            if (truthy(collapse(c))) return this.execBlock(cl.body.body);
          }
          if (st.els) return this.execBlock(st.els.body);
          return [];
        }
        case 'foreach': {
          const coll = unroll(collapse(await this.execStatement(st.coll)));
          const out = [];
          for (const item of coll) {
            this.shell.checkAbort();
            this.setVar(st.v, item);
            try { out.push(...(await this.execBlock(st.body.body))); } catch (e) { if (e instanceof Sig && e.kind === 'break') break; if (e instanceof Sig && e.kind === 'continue') continue; throw e; }
          }
          return out;
        }
        case 'for': {
          const out = [];
          if (st.init) await this.execStatement(st.init);
          let guard = 0;
          while (!st.cond || truthy(collapse(await this.execStatement(st.cond)))) {
            this.shell.checkAbort();
            if (++guard > 1e6) throw new PSError('Loop stopped after 1,000,000 iterations (TerminalEX safety limit).');
            try { out.push(...(await this.execBlock(st.body.body))); } catch (e) { if (e instanceof Sig && e.kind === 'break') break; if (!(e instanceof Sig && e.kind === 'continue')) throw e; }
            if (st.step) await this.execStatement(st.step);
            if (guard % 200 === 0) await new Promise((r) => setTimeout(r, 0));
          }
          return out;
        }
        case 'while': case 'do': {
          const out = [];
          let guard = 0;
          const test = async () => { const c = truthy(collapse(await this.execStatement(st.cond))); return st.until ? !c : c; };
          if (st.t === 'while' && !(await test())) return out;
          do {
            this.shell.checkAbort();
            if (++guard > 1e6) throw new PSError('Loop stopped after 1,000,000 iterations (TerminalEX safety limit).');
            try { out.push(...(await this.execBlock(st.body.body))); } catch (e) { if (e instanceof Sig && e.kind === 'break') break; if (!(e instanceof Sig && e.kind === 'continue')) throw e; }
            if (guard % 200 === 0) await new Promise((r) => setTimeout(r, 0));
          } while (await test());
          return out;
        }
        case 'switch': {
          const vals = unroll(collapse(await this.execStatement(st.val)));
          const out = [];
          for (const v of vals) {
            let matched = false;
            try {
              for (const cs of st.cases) {
                if (cs.test.t === 'default') continue;
                let hit;
                if (cs.test.t === 'sb') { this.setVar('_', v); hit = truthy(collapse(await this.execBlock(cs.test.block.body))); }
                else {
                  const tv = cs.test.t === 'str' ? cs.test.v : await this.evalExpr(cs.test);
                  if (st.opts.wildcard) hit = TX.likeToRegex(toStr(tv)).test(toStr(v));
                  else if (st.opts.regex) hit = new RegExp(toStr(tv), 'i').test(toStr(v));
                  else hit = looseEq(v, tv, st.opts.casesensitive);
                }
                if (hit) { matched = true; this.setVar('_', v); out.push(...(await this.execBlock(cs.body.body))); }
              }
              if (!matched) { const d = st.cases.find((c) => c.test.t === 'default'); if (d) { this.setVar('_', v); out.push(...(await this.execBlock(d.body.body))); } }
            } catch (e) { if (e instanceof Sig && e.kind === 'break') break; if (!(e instanceof Sig && e.kind === 'continue')) throw e; }
          }
          return out;
        }
        case 'function': this.functions.set(st.name.toLowerCase(), { name: st.name, params: st.params, block: st.block }); return [];
        case 'return': throw new Sig('return', st.v ? await this.execStatement(st.v) : []);
        case 'break': throw new Sig('break');
        case 'continue': throw new Sig('continue');
        case 'exit': throw new Sig('exit', st.v ? toNum(await this.evalExpr(st.v)) : 0);
        case 'throw': { const v = st.v ? collapse(await this.execStatement(st.v)) : 'ScriptHalted'; const e = new PSError(toStr(v), { id: toStr(v), category: 'OperationStopped', thrown: true, value: v }); throw e; }
        case 'try': {
          let out = [];
          try { out = await this.execBlock(st.body.body); }
          catch (e) {
            if (e instanceof Sig || e.interrupt || e.exitShell) throw e;
            const rec = this.errorRecord(e);
            const handler = st.catches.find((c) => !c.type || new RegExp(c.type.split('.').pop(), 'i').test(e.exType || 'RuntimeException') || /Exception$/.test(c.type) && c.type === 'System.Exception');
            if (!handler) throw e;
            this.scopes.push(new Map());
            this.setVar('_', rec, true);
            try { out = out.concat(await this.execBlock(handler.body.body)); } finally { this.scopes.pop(); }
          } finally { if (st.fin) out = out.concat(await this.execBlock(st.fin.body)); }
          return out;
        }
        case 'param': return [];
      }
      throw new PSError('Unsupported statement: ' + st.t);
    }
    errorRecord(e) {
      const msg = e.message || String(e);
      return { __type: 'System.Management.Automation.ErrorRecord', Exception: { __type: 'System.Management.Automation.RuntimeException', Message: msg, __toString() { return msg; } }, TargetObject: e.target || null, CategoryInfo: (e.category || 'NotSpecified') + ': (:) [], RuntimeException', FullyQualifiedErrorId: e.id || 'RuntimeException', InvocationInfo: null, ScriptStackTrace: 'at <ScriptBlock>, <No file>: line 1', __toString() { return msg; } };
    }
    async assignTo(target, v) {
      if (target.t === 'var') { this.setVar(target.name, v); return; }
      if (target.t === 'member') { const obj = await this.evalExpr(target.obj); const name = typeof target.name === 'string' ? target.name : toStr(await this.evalExpr(target.name)); setMember(obj, name, v); return; }
      if (target.t === 'index') {
        const obj = await this.evalExpr(target.obj);
        const idx = await this.evalExpr(target.idx);
        if (obj instanceof PSHash) { obj.set(idx, v); return; }
        if (Array.isArray(obj)) { let i = toNum(idx); if (i < 0) i += obj.length; if (i >= obj.length || i < 0) throw new PSError('Index was outside the bounds of the array.', { id: 'System.IndexOutOfRangeException', category: 'OperationStopped' }); obj[i] = v; return; }
        if (obj && typeof obj === 'object') { setMember(obj, toStr(idx), v); return; }
        throw new PSError('Unable to index into an object of type ' + typeName(obj) + '.');
      }
      throw new PSError('The assignment expression is not valid. The input to an assignment operator must be an object that is able to accept assignments, such as a variable or a property.', { id: 'InvalidLeftHandSide' });
    }
    async evalLValueGet(t) { return this.evalExpr(t); }
    async evalExpr(e) {
      switch (e.t) {
        case 'num': return e.v;
        case 'str': return e.v;
        case 'expstr': { let s = ''; for (const p of e.parts) { if (p.t === 'str') s += p.v; else if (p.t === 'var') s += toStr(this.getVar(p.name), this); else if (p.t === 'subexpr') s += toStr(collapse(await this.execBlock(p.body)), this); } return s; }
        case 'concat': { let s = ''; for (const p of e.parts) s += toStr(await this.evalExpr(p), this); return s; }
        case 'var': {
          if (!this.hasVar(e.name) && !/^(env:|_$|psitem$|pwd$|\?$|error$|home$|host$|args$|input$|matches$)/i.test(e.name) && this.strict) throw new PSError(`The variable '$${e.name}' cannot be retrieved because it has not been set.`);
          return this.getVar(e.name);
        }
        case 'array': { const out = []; for (const it of e.items) out.push(await this.evalExpr(it)); return out; }
        case 'arrsub': { const r = await this.execBlock(e.body); return r; }
        case 'subexpr': return collapse(await this.execBlock(e.body));
        case 'paren': { const r = await this.execStatement(e.e); if (e.e.t === 'assign') { return collapse(unroll(await this.evalExpr(e.e.target))); } return e.e.t === 'pipeline' && e.e.elements.length === 1 && e.e.elements[0].t === 'expr' && e.e.elements[0].e.t === 'array' ? r : collapse(r); }
        case 'hash': { const h = new PSHash(); for (const en of e.entries) { const k = await this.evalExpr(en.key); const v = en.value.t === 'pipeline' && en.value.elements.length === 1 && en.value.elements[0].t === 'expr' ? await this.evalExpr(en.value.elements[0].e) : collapse(await this.execStatement(en.value)); h.set(toStr(k), v); } return h; }
        case 'sb': return new PSScriptBlock(e, this);
        case 'range': { const a = Math.trunc(toNum(await this.evalExpr(e.l), true)), b = Math.trunc(toNum(await this.evalExpr(e.r), true)); const out = []; if (Math.abs(b - a) > 1e6) throw new PSError('The range is too large.'); for (let i = a; a <= b ? i <= b : i >= b; a <= b ? i++ : i--) out.push(i); return out; }
        case 'not': return !truthy(await this.evalExpr(e.e));
        case 'neg': { const v = await this.evalExpr(e.e); return e.op === '-' ? -toNum(v, true) : toNum(v, true); }
        case 'unop': { const v = await this.evalExpr(e.e); if (e.op === 'split') return unroll(v).flatMap((x) => toStr(x).trim().split(/\s+/)); if (e.op === 'join') return unroll(v).map((x) => toStr(x)).join(''); if (e.op === 'bnot') return ~toNum(v); break; }
        case 'bin': {
          if (e.op === 'and') { const l = truthy(await this.evalExpr(e.l)); return l ? truthy(await this.evalExpr(e.r)) : false; }
          if (e.op === 'or') { const l = truthy(await this.evalExpr(e.l)); return l ? true : truthy(await this.evalExpr(e.r)); }
          const l = await this.evalExpr(e.l);
          const r = e.r.t === 'type' ? { __isType: true, name: e.r.type } : await this.evalExpr(e.r);
          return binaryOp(e.op, l, r, this);
        }
        case 'incr': {
          const cur = toNum(await this.evalExpr(e.target));
          const nv = e.op === '++' ? cur + 1 : cur - 1;
          await this.assignTo(e.target, nv);
          return e.prefix ? nv : cur;
        }
        case 'cast': return castTo(e.type, await this.evalExpr(e.e), this);
        case 'type': return { __isType: true, name: e.type, __type: 'System.RuntimeType', __toString() { return TX.psResolveTypeName(e.type); } };
        case 'static': return TX.psStatic(e.type, e.member, null, this);
        case 'member': {
          const obj = await this.evalExpr(e.obj);
          const name = typeof e.name === 'string' ? e.name : toStr(await this.evalExpr(e.name));
          if (e.static || (obj && obj.__isType)) return TX.psStatic(obj.name || e.obj.type, name, null, this);
          if (obj === null && e.nullSafe) return null;
          const r = getMember(obj, name, this);
          return r === undefined ? null : r;
        }
        case 'call': {
          const obj = e.obj.t === 'type' ? { __isType: true, name: e.obj.type } : await this.evalExpr(e.obj);
          const args = [];
          for (const a of e.args) args.push(await this.evalExpr(a));
          const name = typeof e.name === 'string' ? e.name : toStr(await this.evalExpr(e.name));
          if (e.static || (obj && obj.__isType)) return TX.psStatic(obj.name, name, args, this);
          if (obj === null && e.nullSafe) return null;
          const lname = name.toLowerCase();
          if (Array.isArray(obj) && (lname === 'where' || lname === 'foreach') && args[0] instanceof PSScriptBlock) {
            const res = [];
            for (const x of obj) { const r = collapse(await this.invokeBlockAsync(args[0], [], x)); if (lname === 'where') { if (truthy(r)) res.push(x); } else res.push(...unroll(r)); }
            return res;
          }
          if (obj instanceof PSScriptBlock && (lname === 'invoke' || lname === 'invokereturnasis')) return collapse(await this.invokeBlockAsync(obj, args, null));
          return callMethod(obj, name, args, this);
        }
        case 'index': {
          const obj = await this.evalExpr(e.obj);
          const idx = await this.evalExpr(e.idx);
          const one = (i) => {
            if (obj === null || obj === undefined) throw new PSError('Cannot index into a null array.', { id: 'NullArray', category: 'InvalidOperation' });
            if (obj instanceof PSHash) return obj.get(i) ?? null;
            if (typeof obj === 'string') { let k = toNum(i); if (k < 0) k += obj.length; return obj[k] ?? null; }
            if (Array.isArray(obj)) { let k = toNum(i); if (k < 0) k += obj.length; return obj[k] ?? null; }
            if (typeof obj === 'object') { const r = getMember(obj, toStr(i), this); if (r !== null && r !== undefined) return r; if (toNum(i) === 0) return obj; return null; }
            if (toNum(i) === 0) return obj;
            return null;
          };
          if (Array.isArray(idx)) return idx.map(one);
          return one(idx);
        }
        case 'splat': return this.getVar(e.name);
        case 'paramdef': return null;
        case 'incrstmt': return null;
      }
      if (e.t === 'pipeline' || e.t === 'assign' || e.t === 'if' || e.t === 'chain') return collapse(await this.execStatement(e));
      throw new PSError('Unsupported expression: ' + e.t);
    }

    // ---------- pipelines & commands
    async runPipeline(pl, input, opts = {}) {
      const n = pl.elements.length;
      let data = input;
      const redirs = pl.redirs || [];
      const toFile = redirs.find((r) => /^>>?$|^1>>?$/.test(r.op));
      const errFile = redirs.find((r) => /^2>>?$/.test(r.op));
      const allFile = redirs.find((r) => /^\*>>?$/.test(r.op));
      const mergeErr = redirs.some((r) => r.op === '2>&1');
      const savedSink = this.errSink;
      let errBuf = null;
      if (errFile || allFile) { errBuf = []; this.errSink = (rec) => errBuf.push(rec); }
      else if (mergeErr) this.errSink = (rec) => { this.mergedErrors = this.mergedErrors || []; this.mergedErrors.push(rec); };
      let result;
      try {
        for (let i = 0; i < n; i++) {
          const el = pl.elements[i];
          const last = i === n - 1;
          if (el.t === 'expr') {
            if (i > 0) throw new PSError('Expressions are only allowed as the first element of a pipeline.', { id: 'ExpressionsMustBeFirstInPipeline', category: 'ParserError' });
            const v = await this.evalExpr(el.e);
            data = el.e.t === 'arrsub' || el.e.t === 'array' ? v : unroll(v);
            if (!(v === null || v === undefined) && !Array.isArray(v)) data = [v];
            if (el.e.t === 'paren' && Array.isArray(v)) data = v;
            this.lastOk = true;
          } else {
            data = await this.invoke(el, i === 0 ? null : data, { last, streamToHost: last && opts.toHost && !toFile && !allFile, first: i === 0 });
          }
        }
        if (this.mergedErrors) { data = (data || []).concat(this.mergedErrors.map((r) => r.text)); this.mergedErrors = null; }
        result = data || [];
      } finally { this.errSink = savedSink; }
      const writeTarget = async (r, content) => {
        const target = toStr(await this.evalExpr(r.target), this);
        if (/^\$null$|^null$/i.test(target)) return;
        const segs = this.shell.resolve(target);
        try { this.shell.vfs.writeFile(segs, content, { append: r.op.endsWith('>>'), user: this.shell.fsUser(), owner: 'student' }); }
        catch (e) { this.writeError(e.code === 'ENOENT' ? `Could not find a part of the path '${TX.Paths.win.format(segs)}'.` : `Access to the path '${TX.Paths.win.format(segs)}' is denied.`, { cmd: 'out-file' }); }
      };
      if (errFile) await writeTarget(errFile, errBuf.map((r) => r.plain + '\n').join(''));
      if (toFile || allFile) {
        const text = TX.stripAnsi(formatForHost(result, Object.assign(Object.create(this), { pwsh: false }))).replace(/^\n/, '');
        await writeTarget(toFile || allFile, text + (allFile && errBuf ? errBuf.map((r) => r.plain + '\n').join('') : ''));
        return [];
      }
      return result;
    }
    resolveCommand(name) {
      let n = name.toLowerCase();
      const seen = new Set();
      while (this.aliases.has(n) && !seen.has(n)) { seen.add(n); n = this.aliases.get(n).toLowerCase(); }
      if (!seen.size && TX.psAliases[n] && !(this.pwsh && TX.psAliasesRemoved7.includes(n))) n = TX.psAliases[n].toLowerCase();
      else if (seen.size && TX.psAliases[n]) n = TX.psAliases[n].toLowerCase();
      if (this.functions.has(n)) return { kind: 'function', def: this.functions.get(n), name: this.functions.get(n).name };
      if (TX.psCmdlets[n]) return { kind: 'cmdlet', def: TX.psCmdlets[n], name: TX.psCmdlets[n].name };
      const exe = n.replace(/\.exe$/, '');
      if (TX.winExe[exe] || ['git', 'curl', 'tar', 'ssh', 'cmd', 'powershell', 'pwsh', 'wsl', 'bash', 'python', 'python3', 'py', 'node', 'where'].includes(exe)) return { kind: 'native', name: exe };
      return null;
    }
    async evalArgs(args) {
      const out = [];
      for (const a of args) {
        if (a.param !== undefined) {
          if (a.value !== undefined) out.push({ param: a.param, value: await this.argValue(a.value), colon: true });
          else out.push({ param: a.param });
        } else if (a.value.t === 'splat') {
          const h = this.getVar(a.value.name);
          if (h instanceof PSHash) h.entries().forEach(([k, v]) => out.push({ param: k, value: v, colon: true }));
          else unroll(h).forEach((v) => out.push({ value: v }));
        } else out.push({ value: await this.argValue(a.value), raw: a.value });
      }
      return out;
    }
    async argValue(node) {
      if (node.t === 'str') return node.v;
      if (node.t === 'array') { const r = []; for (const it of node.items) r.push(await this.argValue(it)); return r; }
      return this.evalExpr(node);
    }
    async invoke(el, input, flags) {
      let nameVal = el.name.t === 'str' ? el.name.v : await this.evalExpr(el.name);
      const args = await this.evalArgs(el.args);
      if (nameVal instanceof PSScriptBlock) return this.invokeScriptBlockCmd(nameVal, args, input, el.callOp === '.');
      const name = toStr(nameVal);
      const res = this.resolveCommand(name);
      this.currentCmd = el;
      if (!res) {
        // script / exe path?
        if (/[\\/]/.test(name) || /\.(ps1|bat|cmd|exe|txt|py)$/i.test(name)) return this.invokePath(name, args, input, flags, el);
        const segs = this.shell.resolve(name);
        const node = this.shell.vfs.get(segs);
        if (node && node.t === 'f' && /\.ps1$/i.test(name)) {
          this.writeError(`The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.\n\nSuggestion [3,General]: The command "${name}" was not found, but does exist in the current location. PowerShell does not load commands from the current location by default. If you trust this command, instead type: ".\\${name}". See "get-help about_Command_Precedence" for more details.`, { cmd: name, notFound: true });
          return [];
        }
        const s = TX.suggest(name, Object.values(TX.psCmdlets).map((c) => c.name).concat(Object.keys(TX.psAliases)), 2);
        this.writeError(`The term '${name}' is not recognized as ${this.pwsh ? 'a name of a' : 'the name of a'} cmdlet, function, script file, or ${this.pwsh ? 'executable' : 'operable'} program.${this.pwsh ? '\n' : ' '}Check the spelling of the name, or if a path was included, verify that the path is correct and try again.${s && this.pwsh ? `\n\n\x1b[0mSuggestion [4,General]: Did you mean: ${s}?` : ''}`, { cmd: name, notFound: true, category: 'ObjectNotFound', id: 'CommandNotFoundException' });
        this.lastOk = false;
        return [];
      }
      if (res.kind === 'function') return this.invokeFunction(res.def, args, input);
      if (res.kind === 'native') return this.invokeNative(res.name, args, input, flags);
      return this.invokeCmdlet(res.def, args, input, flags, el);
    }
    bind(def, args) {
      const spec = def.params || {};
      const names = Object.keys(spec);
      const p = { _positional: [] };
      const common = { erroraction: 'ErrorAction', ea: 'ErrorAction', warningaction: 'WarningAction', wa: 'WarningAction', verbose: 'Verbose', vb: 'Verbose', debug: 'Debug', whatif: 'WhatIf', wi: 'WhatIf', confirm: 'Confirm', cf: 'Confirm', outvariable: 'OutVariable', ov: 'OutVariable', errorvariable: 'ErrorVariable', ev: 'ErrorVariable', informationaction: 'InformationAction', outbuffer: 'OutBuffer', pipelinevariable: 'PipelineVariable' };
      const findParam = (nm) => {
        const ln = nm.toLowerCase();
        const exact = names.find((k) => k.toLowerCase() === ln || (spec[k].alias || []).some((a) => a.toLowerCase() === ln));
        if (exact) return exact;
        if (common[ln]) return '@' + common[ln];
        const pref = names.filter((k) => k.toLowerCase().startsWith(ln));
        if (pref.length === 1) return pref[0];
        if (pref.length > 1) throw new PSError(`Parameter cannot be processed because the parameter name '${nm}' is ambiguous. Possible matches include: ${pref.map((x) => '-' + x).join(' ')}.`, { id: 'AmbiguousParameter', category: 'InvalidArgument' });
        const cm = Object.keys(common).filter((k) => k.startsWith(ln));
        if (cm.length) return '@' + common[cm[0]];
        return null;
      };
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a.param !== undefined) {
          if (def.rawParams) { p._positional.push('-' + a.param); if (a.colon) p._positional.push(a.value); continue; }
          const k = findParam(a.param);
          if (!k) {
            if (def.freeParams) { p._free = p._free || []; p._free.push({ param: a.param, value: a.colon ? a.value : undefined }); if (!a.colon && args[i + 1] && args[i + 1].param === undefined && def.freeParams === 'value') { p._free[p._free.length - 1].value = args[++i].value; } continue; }
            throw new PSError(`A parameter cannot be found that matches parameter name '${a.param}'.`, { id: 'NamedParameterNotFound', category: 'InvalidArgument' });
          }
          if (k.startsWith('@')) { const cn = k.slice(1); if (a.colon) p[cn] = a.value; else if (['Verbose', 'Debug', 'WhatIf', 'Confirm'].includes(cn)) p[cn] = true; else { p[cn] = args[i + 1] ? args[++i].value : null; } continue; }
          if (spec[k].sw) { p[k] = a.colon ? truthy(a.value) : true; continue; }
          if (a.colon) { p[k] = a.value; continue; }
          const nx = args[i + 1];
          if (!nx || nx.param !== undefined) throw new PSError(`Missing an argument for parameter '${k}'. Specify a parameter of type '${spec[k].type || 'System.Object'}' and try again.`, { id: 'MissingArgument', category: 'InvalidArgument' });
          p[k] = nx.value; i++;
          continue;
        }
        p._positional.push(a.value);
      }
      // positional binding
      const posParams = names.filter((k) => spec[k].pos !== undefined && p[k] === undefined).sort((a, b) => spec[a].pos - spec[b].pos);
      const rest = [];
      p._positional.forEach((v) => { const k = posParams.shift(); if (k) p[k] = v; else rest.push(v); });
      if (rest.length && !def.rest && !def.rawParams) throw new PSError(`A positional parameter cannot be found that accepts argument '${toStr(rest[0])}'.`, { id: 'PositionalParameterNotFound', category: 'InvalidArgument' });
      p._rest = rest;
      return p;
    }
    async invokeCmdlet(def, args, input, flags, el) {
      let p;
      try { p = this.bind(def, args); }
      catch (e) { this.writeError(e.message, { cmd: def.name, category: e.category, id: e.id }); this.lastOk = false; return []; }
      const ea = p.ErrorAction ? toStr(p.ErrorAction).toLowerCase() : toStr(this.getVar('ErrorActionPreference')).toLowerCase();
      const savedEA = this.ea;
      this.ea = ea;
      let hadError = false;
      const ctx = {
        rt: this, cmd: def.name, flags, el,
        error: (msg, o = {}) => { hadError = true; if (ea === 'stop') throw new PSError(msg, Object.assign({ cmd: def.name }, o)); if (ea === 'silentlycontinue' || ea === 'ignore') { this.errors.push(this.errorRecord(new PSError(msg, o))); return; } this.writeError(msg, Object.assign({ cmd: def.name }, o)); },
        warn: (msg) => { if (p.WarningAction && /silently/i.test(toStr(p.WarningAction))) return; this.host(C.style(['yellow'], (this.pwsh ? 'WARNING: ' : 'WARNING: ') + msg) + '\n'); },
        whatIf: (op, target) => { if (p.WhatIf) { this.host(`What if: Performing the operation "${op}" on target "${target}".\n`); return true; } return false; },
      };
      try {
        const out = await def.fn(p, input, ctx);
        this.lastOk = !hadError;
        if (p.OutVariable) this.setVar(toStr(p.OutVariable), collapse(out || []));
        return out || [];
      } catch (e) {
        if (e instanceof Sig || e.interrupt || e.exitShell) throw e;
        if (e instanceof TX.FsError) { ctx.error(TX.psFsMsg(e)); this.lastOk = false; return []; }
        if (e.ps && !e.thrown && ea !== 'stop') { this.writeError(e.message, { cmd: def.name, category: e.category, id: e.id }); this.lastOk = false; return []; }
        throw e;
      } finally { this.ea = savedEA; }
    }
    async invokeFunction(fn, args, input) {
      const scope = new Map();
      this.scopes.push(scope);
      try {
        let body = fn.block.body;
        let params = fn.params;
        if (!params) { const ps = body.find((s) => s.t === 'param'); if (ps) params = ps.params; }
        const named = {}, positional = [];
        for (let i = 0; i < args.length; i++) {
          const a = args[i];
          if (a.param !== undefined) {
            const k = (params || []).find((pp) => pp.name.toLowerCase() === a.param.toLowerCase() || pp.name.toLowerCase().startsWith(a.param.toLowerCase()));
            if (!k) { if (!params) { positional.push('-' + a.param); continue; } throw new PSError(`A parameter cannot be found that matches parameter name '${a.param}'.`, { id: 'NamedParameterNotFound', category: 'InvalidArgument' }); }
            if (/switch/i.test(k.type || '')) named[k.name] = a.colon ? truthy(a.value) : true;
            else named[k.name] = a.colon ? a.value : (args[i + 1] ? args[++i].value : null);
          } else positional.push(a.value);
        }
        const argsLeft = [];
        for (const pp of params || []) {
          let v;
          if (named[pp.name] !== undefined) v = named[pp.name];
          else if (positional.length && !/switch/i.test(pp.type || '')) v = positional.shift();
          else if (pp.def) v = await this.evalExpr(pp.def);
          else v = /switch/i.test(pp.type || '') ? false : null;
          if (pp.type && v !== null) { try { v = castTo(pp.type, v, this); } catch (e) { throw new PSError(`Cannot process argument transformation on parameter '${pp.name}'. ${e.message}`, { id: 'ParameterArgumentTransformationError', category: 'InvalidData' }); } }
          this.setVar(pp.name, v, true);
        }
        argsLeft.push(...positional);
        this.setVar('args', argsLeft, true);
        this.setVar('input', input || [], true);
        if (input && input.length && fn.isFilter !== false) this.setVar('_', input[input.length - 1], true);
        try { return await this.execBlock(body); }
        catch (e) { if (e instanceof Sig && e.kind === 'return') return e.value.concat ? e.value : [e.value]; throw e; }
      } finally { this.scopes.pop(); }
    }
    async invokeScriptBlockCmd(sb, args, input, dot) {
      if (dot) return this.execBlock(sb.node.body);
      return this.invokeFunction({ block: { body: sb.node.body }, params: sb.node.params }, args, input);
    }
    // used by Where-Object/ForEach-Object & friends: run sb with $_ bound
    async invokeBlockAsync(sb, args, item) {
      // script blocks run by Where-Object/ForEach-Object/Sort-Object execute in the caller's scope ($_ is temporary)
      const top = this.scopes[this.scopes.length - 1];
      const saved = ['_', 'psitem', 'args'].map((k) => [k, top.get(k)]);
      top.set('_', { name: '_', value: item });
      top.set('psitem', { name: 'PSItem', value: item });
      top.set('args', { name: 'args', value: args || [] });
      let pushed = false;
      if (sb.node.params && sb.node.params.length) { this.scopes.push(new Map()); pushed = true; sb.node.params.forEach((pp, i) => this.setVar(pp.name, args && args[i] !== undefined ? args[i] : null, true)); }
      try { return await this.execBlock(sb.node.body); }
      catch (e) { if (e instanceof Sig && e.kind === 'return') return e.value; throw e; }
      finally {
        if (pushed) this.scopes.pop();
        saved.forEach(([k, v]) => { if (v) top.set(k, v); else top.delete(k); });
      }
    }
    invokeBlock() { throw new PSError('Synchronous script block invocation (.Where/.ForEach methods) is not supported in TerminalEX — use Where-Object / ForEach-Object instead.'); }
    async invokeNative(name, args, input, flags) {
      const strArgs = [];
      args.forEach((a) => { if (a.param !== undefined) { strArgs.push('-' + a.param + (a.colon ? ':' + toStr(a.value) : '')); } else unroll(a.value).forEach((v) => strArgs.push(toStr(v, this))); });
      const stdinText = input ? input.map((x) => toStr(x, this)).join('\n') + '\n' : null;
      let buf = '';
      const stream = flags.streamToHost;
      const io = { tty: stream, stdin: stdinText, out: stream ? (s) => this.term.write(s) : (s) => { buf += s; }, err: (s) => this.term.write(this.pwsh ? s : s) };
      let code = 0;
      const sh = this.shell;
      if (['git', 'curl', 'tar', 'ssh'].includes(name)) {
        if (name === 'curl' && !this.pwsh) { return TX.psCmdlets['invoke-webrequest'] ? this.invokeCmdlet(TX.psCmdlets['invoke-webrequest'], [{ value: strArgs.find((x) => !x.startsWith('-')) }], input, flags) : []; }
        code = await TX.winBridge(sh, name, strArgs, io);
      } else if (name === 'cmd') {
        if (strArgs[0] && /^\/[ck]$/i.test(strArgs[0])) { const c2 = new TX.CmdShell(sh.session, sh.m, { cwd: sh.cwd, noBanner: true }); await c2.exec(strArgs.slice(1).join(' '), io); code = c2.lastCode; }
        else { sh.session.pushShell(new TX.CmdShell(sh.session, sh.m, { cwd: sh.cwd })); return []; }
      } else if (name === 'powershell' || name === 'pwsh') {
        const ci = strArgs.findIndex((a) => /^-(c|command)$/i.test(a));
        if (ci >= 0) { const p2 = new TX.PowerShell(sh.session, sh.m, { cwd: sh.cwd, noBanner: true, pwsh: name === 'pwsh' }); await p2.exec(strArgs.slice(ci + 1).join(' '), io); }
        else sh.session.pushShell(new TX.PowerShell(sh.session, sh.m, { cwd: sh.cwd, pwsh: name === 'pwsh' }));
        return [];
      } else if (name === 'wsl' || name === 'bash') {
        const lsh = new TX.PosixShell(sh.session, TX.app.machine('linux'), 'bash', {});
        if (strArgs.length) { await lsh.run(strArgs.join(' '), io); code = lsh.lastCode; }
        else { sh.session.pushShell(lsh, true); return []; }
      } else if (/^(python3?|py)$/.test(name)) { code = await (TX.langs ? TX.langs.python(this.nativeCtx(strArgs, io), strArgs) : 0); }
      else if (name === 'node') { code = await (TX.langs ? TX.langs.node(this.nativeCtx(strArgs, io), strArgs) : 0); }
      else {
        const fn = TX.winExe[name];
        const r = await fn(this.nativeCtx(strArgs, io));
        code = typeof r === 'number' ? r : 0;
      }
      this.setVar('LASTEXITCODE', code, false);
      this.scopes[0].set('lastexitcode', { name: 'LASTEXITCODE', value: code });
      this.lastOk = code === 0;
      if (stream) return [];
      return TX.splitLines(TX.stripAnsi(buf));
    }
    nativeCtx(args, io) {
      const sh = this.shell;
      return {
        args, io, stdin: io.stdin, tty: io.tty, term: this.term, m: sh.m, vfs: sh.vfs, session: sh.session, cwd: sh.cwd, home: sh.home, user: sh.fsUser(), isAdmin: sh.isAdmin,
        out: io.out, outln: (s = '') => io.out(s + '\n'), err: io.err, resolve: (p) => sh.resolve(p), fmt: (s) => TX.Paths.win.format(s),
        sleep: (ms) => TX.sleep(ms, sh.term.signal), signal: sh.term.signal,
        readLine: async (prompt, o = {}) => { const l = await sh.term.readLine(Object.assign({ prompt }, o)); if (l === null) throw new TX.Interrupt(); return l; },
      };
    }
    async invokePath(name, args, input, flags, el) {
      const sh = this.shell;
      const segs = sh.resolve(name);
      const node = sh.vfs.get(segs);
      if (!node) {
        this.writeError(`The term '${name}' is not recognized as ${this.pwsh ? 'a name of a' : 'the name of a'} cmdlet, function, script file, or ${this.pwsh ? 'executable' : 'operable'} program.${this.pwsh ? '\n' : ' '}Check the spelling of the name, or if a path was included, verify that the path is correct and try again.`, { cmd: name, notFound: true, category: 'ObjectNotFound', id: 'CommandNotFoundException' });
        this.lastOk = false;
        return [];
      }
      if (/\.ps1$/i.test(node.name)) {
        if (sh.execPolicy === 'Restricted') { this.writeError(`File ${TX.Paths.win.format(segs)} cannot be loaded because running scripts is disabled on this system. For more information, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.`, { cmd: name, category: 'SecurityError', id: 'UnauthorizedAccess' }); return []; }
        let ast;
        try { ast = TX.psParse(sh.vfs.content(node)); } catch (e) { this.writeError(e.message, { cmd: name, category: 'ParserError' }); return []; }
        const fnDef = { block: { body: ast }, params: null };
        this.setVar('PSScriptRoot', TX.Paths.win.format(segs.slice(0, -1)));
        if (el && el.callOp === '.') return this.execBlock(ast);
        return this.invokeFunction(fnDef, args, input);
      }
      if (/\.(bat|cmd)$/i.test(node.name)) {
        const c = new TX.CmdShell(sh.session, sh.m, { cwd: sh.cwd, noBanner: true });
        let buf = '';
        const io = flags.streamToHost ? { tty: true, stdin: null, out: (s) => this.term.write(s), err: (s) => this.term.write(s) } : { tty: false, stdin: null, out: (s) => { buf += s; }, err: (s) => this.term.write(s) };
        await c.runBatch(sh.vfs.content(node), [TX.Paths.win.format(segs)], io);
        return flags.streamToHost ? [] : TX.splitLines(buf);
      }
      if (/\.exe$/i.test(node.name)) { const base = node.name.replace(/\.exe$/i, '').toLowerCase(); if (TX.winExe[base]) return this.invokeNative(base, args, input, flags); this.host(C.dim(`(TerminalEX) ${node.name} is a pretend program — it can't actually run here.`) + '\n'); return []; }
      if (/\.py$/i.test(node.name) && TX.langs) { await TX.langs.python(this.nativeCtx([TX.Paths.win.format(segs)], { tty: true, out: (s) => this.term.write(s), err: (s) => this.term.write(s) }), [TX.Paths.win.format(segs)]); return []; }
      if (TX.app) TX.app.toast(`(pretend) Opened ${node.name} in its default app`);
      return [];
    }

    // ---------- output
    host(s) { this.term.write(s); }
    writeError(msg, o = {}) {
      const cmd = o.cmd || '';
      let text;
      const el = this.currentCmd;
      if (this.pwsh) {
        text = '\x1b[31;1m' + (cmd ? cmd + ': ' : '') + msg.split('\n').join('\n\x1b[31;1m') + '\x1b[0m';
      } else {
        const line = el && el.text ? el.text : cmd;
        const cat = o.category || (o.notFound ? 'ObjectNotFound' : 'NotSpecified');
        const id = o.id || (o.notFound ? 'CommandNotFoundException' : 'System.Exception');
        text = C.red((cmd ? cmd + ' : ' : '') + msg.replace(/\n\n/g, '\n') + `\nAt line:1 char:1\n+ ${line}\n+ ${'~'.repeat(Math.max(1, line.length))}\n    + CategoryInfo          : ${cat}: (${o.target || cmd}:String) [${o.notFound ? '' : cmd}], ${o.notFound ? 'CommandNotFoundException' : 'Exception'}\n    + FullyQualifiedErrorId : ${id}${o.notFound || String(id).includes(',') ? '' : ',Microsoft.PowerShell.Commands.' + (cmd || 'Command').replace(/-/g, '') + 'Command'}`);
      }
      const rec = { text, plain: TX.stripAnsi(text) };
      const errObj = this.errorRecord(new PSError(msg, o));
      this.errors.push(errObj);
      if (this.errors.length > 256) this.errors.shift();
      if (this.errSink) { this.errSink(rec); return; }
      this.host(text + '\n');
    }
  }
  TX.PSRuntime = Runtime;
  TX.PSSig = Sig;
  TX.psUnroll = unroll;
  TX.psFsMsg = (e) => {
    const p = e.path ? TX.Paths.win.format(String(e.path).split('/')) : '';
    switch (e.code) {
      case 'ENOENT': return `Cannot find path '${p}' because it does not exist.`;
      case 'EACCES': return `Access to the path '${p}' is denied.`;
      case 'EEXIST': return `An item with the specified name ${p} already exists.`;
      case 'ENOTEMPTY': return `The directory is not empty. : '${p}'`;
      default: return e.message;
    }
  };
})();
