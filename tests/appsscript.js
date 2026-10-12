// Runs apps-script/Code.gs the way Google Apps Script does (with stand-ins for HtmlService etc.) and returns the
// page it would serve. Used by appsscript.test.js and by the browser test (APPS=1).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DIR = path.join(__dirname, '..', 'apps-script');

module.exports = function serve(classKey = 'feedfacecafebeef0123456789abcdef') {
  const props = {};
  const file = (name) => { const p = path.join(DIR, name + '.html'); if (!fs.existsSync(p)) throw new Error('Apps Script: no HTML file named ' + name); return fs.readFileSync(p, 'utf8'); };
  const output = (content) => ({ content, getContent() { return this.content; }, setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } });
  const sandbox = {
    HtmlService: {
      createHtmlOutputFromFile: (n) => output(file(n)),
      createHtmlOutput: (h) => output(h),
      // Templates: only <?!= expr ?> (force-printed) is used by Index.html.
      createTemplateFromFile: (n) => ({ evaluate: () => output(file(n).replace(/<\?!=\s*([\s\S]*?)\s*\?>/g, (_, expr) => String(vm.runInContext(expr, ctx)))) }),
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: () => classKey.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5') },
    Logger: { log() {} },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(DIR, 'Code.gs'), 'utf8'), ctx);
  return { html: vm.runInContext('doGet()', ctx).getContent(), props };
};
