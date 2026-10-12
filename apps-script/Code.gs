/**
 * TerminalEX — Google Apps Script web app.
 *
 * This script ONLY serves the page. It collects, receives and stores NO student data: there is no gradebook,
 * no cloud save, and no call from the page back to this script. Student progress lives in each student's own
 * browser and in the sealed progress file (.json) each student saves.
 *
 * The one thing it keeps is a random CLASS KEY in this project's Script Properties (created on the first visit).
 * It is injected into the page so progress files are sealed with a key that belongs to YOUR deployment:
 * files made by any other copy of TerminalEX (including the public source files) are rejected by yours.
 * To invalidate every progress file ever saved (for example at the start of a new semester), run newClassKey() once.
 */
var MARKER = '__TX_' + 'CLASS_KEY__';

function doGet() {
  // Index is a small page that pulls in Styles and Js1, Js2, ... with include() below.
  // (Only Index is a template; the included files are inserted as plain text, never run as scriptlets.)
  var html = HtmlService.createTemplateFromFile('Index').evaluate().getContent();
  var parts = html.split(MARKER);
  if (parts.length === 2) html = parts[0] + classKey_() + parts[1];
  return HtmlService.createHtmlOutput(html)
    .setTitle('TerminalEX — Terminal Explorer')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Used by Index.html: returns another HTML file's text exactly as it is. */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** The deployment's class key: 32 random hex characters, created once. */
function classKey_() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('TERMINALEX_CLASS_KEY');
  if (key) return key;
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    key = props.getProperty('TERMINALEX_CLASS_KEY');
    if (!key) { key = Utilities.getUuid().replace(/-/g, ''); props.setProperty('TERMINALEX_CLASS_KEY', key); }
    return key;
  } finally { lock.releaseLock(); }
}

/** Run from the editor to start fresh: every existing progress file stops working. */
function newClassKey() {
  PropertiesService.getScriptProperties().deleteProperty('TERMINALEX_CLASS_KEY');
  var key = classKey_();
  Logger.log('New class key created. Old progress files are no longer accepted.');
  return key.length;
}
