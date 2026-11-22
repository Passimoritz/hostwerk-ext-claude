'use strict';
/*
 * AI Connect – small server part (runs as part of Hostwerk for the official package): watches the daily token limit of
 * Claude Code (setting "dailyTokens") and tells the user through Hostwerk's notifications (push, Discord, ntfy, mail –
 * Go live → Monitoring → Messages) at 80 % and when the limit is reached – once per day each. The page itself stays in its frame.
 * Usage comes from Hostwerk's own measurement (ccusage, cached by Hostwerk) and is only read while a limit is set.
 * Data: data/claude-budget.json ({ day, sent: [80, 100] })
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { budgetState } = require('../page/lib.js');

/* ---------------- Aufräumen beim restlosen Entfernen ----------------
 * Was „KI-Anbindung“ über Hostwerk angelegt hat: der MCP-Eintrag „hostwerk“ in Claude Desktop und Claude Code
 * (~/.claude.json) und die markierten Abschnitte <!-- hostwerk:start … end --> in den Anweisungsdateien der Projekte.
 * Nur diese Teile – der Rest jeder Datei bleibt, vorher eine .bak-Kopie wie beim Schreiben.
 */
const START = '<!-- hostwerk:start -->';
const END = '<!-- hostwerk:end -->';
const TARGET_FILES = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', path.join('.github', 'copilot-instructions.md'), path.join('.cursor', 'rules', 'hostwerk.mdc')];
/** Text ohne den Hostwerk-Abschnitt → { text, changed, empty } (empty: außer Kopf/Leerraum nichts mehr übrig). */
function stripSection(text) {
  const s = String(text || '');
  const a = s.indexOf(START); const b = s.indexOf(END, a);
  if (a < 0 || b < 0) return { text: s, changed: false, empty: false };
  const out = `${s.slice(0, a).replace(/\s*$/, '')}${s.slice(b + END.length).replace(/^\s*/, s.slice(0, a).trim() ? '\n\n' : '')}`.replace(/^\s+/, '');
  const rest = out.replace(/^---[\s\S]*?---\s*/, '').trim(); // Cursor-Regel: nur der Kopf übrig = leer
  return { text: out.trim() ? `${out.replace(/\s*$/, '')}\n` : '', changed: true, empty: !rest };
}
/** JSON-Einstellungen ohne mcpServers.hostwerk → neuer Text oder null (nichts zu tun / kein gültiges JSON). */
function dropMcp(raw) {
  let j; try { j = JSON.parse(String(raw || '')); } catch { return null; }
  if (!j || !j.mcpServers || !j.mcpServers.hostwerk) return null;
  delete j.mcpServers.hostwerk;
  return JSON.stringify(j, null, 2);
}
/**
 * Alles aufräumen. deps: { projects: [Pfade], codeFile, desktop: { connected(), off() } } – fs aus Node.
 * → { files: [geänderte/gelöschte Dateien], desktop: bool, code: bool, failed: [{ file, error }] }
 */
function cleanupConnections({ projects = [], codeFile = null, desktop = null } = {}) {
  const out = { files: [], desktop: false, code: false, failed: [] };
  const keep = (f, raw) => { try { fs.writeFileSync(`${f}.bak`, raw); } catch { /* ohne Kopie weiter */ } };
  for (const dir of projects) {
    for (const rel of TARGET_FILES) {
      const f = path.join(dir, rel);
      let raw; try { raw = fs.readFileSync(f, 'utf8'); } catch { continue; }
      const r = stripSection(raw);
      if (!r.changed) continue;
      try { keep(f, raw); if (r.empty) fs.unlinkSync(f); else fs.writeFileSync(f, r.text); out.files.push(f); } catch (e) { out.failed.push({ file: f, error: e.message }); }
    }
  }
  if (codeFile) {
    try { const raw = fs.readFileSync(codeFile, 'utf8'); const next = dropMcp(raw); if (next) { keep(codeFile, raw); fs.writeFileSync(codeFile, next); out.code = true; out.files.push(codeFile); } } catch (e) { if (e.code !== 'ENOENT') out.failed.push({ file: codeFile, error: e.message }); }
  }
  if (desktop) { try { if (desktop.connected()) { desktop.off(); out.desktop = true; } } catch (e) { out.failed.push({ file: 'Claude Desktop', error: e.message }); } }
  return out;
}

const HOUR = 3600000;

/** One check – deps: { usage() → { days }, send(title, text, opts), settings() → { dailyTokens, budgetNotify }, now() } */
function createBudget(host, deps) {
  const file = path.join(host.ctx.paths.data, 'claude-budget.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { day: null, sent: [] }; } };
  const write = (v) => { try { fs.writeFileSync(file, JSON.stringify(v)); } catch { /* next hour */ } };
  return async function check() {
    const s = deps.settings();
    const limit = Number(s.dailyTokens) || 0;
    if (!limit || s.budgetNotify === false) return null;
    const u = await deps.usage();
    if (!u || u.error || !Array.isArray(u.days)) return null;
    const now = deps.now();
    const b = budgetState(u.days, limit, now);
    if (b.today == null) return b;
    const day = b.today != null ? `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}` : null;
    const st = read();
    if (st.day !== day) { st.day = day; st.sent = []; }
    const step = b.pct >= 100 ? 100 : b.pct >= 80 ? 80 : 0;
    if (step && !st.sent.includes(step)) {
      st.sent.push(step);
      if (step === 100) st.sent.push(80);
      const title = step === 100 ? host.t('Claude Code: daily token limit reached') : host.t('Claude Code: 80 % of the daily token limit used');
      const text = host.t('{used} of {limit} tokens today.', { used: b.today.toLocaleString(host.lang && host.lang() === 'en' ? 'en' : 'de'), limit: limit.toLocaleString(host.lang && host.lang() === 'en' ? 'en' : 'de') });
      try { await deps.send(title, text, { kind: step === 100 ? 'error' : 'warn', event: 'claude-budget', force: true }); } catch { /* notifications are optional */ }
      write(st);
    }
    return b;
  };
}

let timer = null;

function activate(host) {
  const { ctx } = host;
  if (!ctx || !ctx.paths) return; // sandboxed (not from the Hostwerk catalogue): no access to the measurement
  const check = createBudget(host, {
    usage: () => (ctx.claudeTools ? ctx.claudeTools.usage() : null),
    send: (title, text, o) => (ctx.monitor && ctx.monitor.send ? ctx.monitor.send(title, text, o) : null),
    settings: () => { try { return ctx.extMarket.settingsFor(host.id) || {}; } catch { return {}; } },
    now: () => new Date(),
  });
  if (process.env.HW_TEST) return;
  const loop = (ms) => { timer = setTimeout(async () => { await check().catch(() => {}); loop(HOUR); }, ms); if (timer.unref) timer.unref(); };
  loop(5 * 60000);
  host.on('shutdown', () => clearTimeout(timer));
}

function deactivate() { clearTimeout(timer); timer = null; }

/**
 * Entfernen-Haken (SDK 3.3, nur beim Entfernen): bei „Restlos entfernen“ die Anbindungen wieder austragen – Claude Desktop
 * (Einstellung aus, damit Hostwerks Wache ihn nicht wieder einträgt), Claude Code und die Abschnitte in den Projekten.
 * Ohne „Restlos“ bleibt alles verbunden (die Verbindung selbst gehört zu Hostwerk und funktioniert weiter).
 */
async function uninstall(host, { purge = false } = {}) {
  const ctx = host && host.ctx;
  if (!purge || !ctx || !ctx.paths) return { ran: false };
  let projects = [];
  try { projects = (ctx.devtools && typeof ctx.devtools.list === 'function' ? ctx.devtools.list() : []).map((p) => p && p.path).filter(Boolean); } catch { projects = []; }
  const cc = ctx.claudeCode;
  const desktop = cc && typeof cc.desktopConnected === 'function' && typeof cc.writeDesktop === 'function' ? {
    connected: () => cc.desktopConnected(),
    off: () => { try { const g = ctx.settings.get().general; g.claude = { ...(g.claude || {}), desktop: false }; ctx.settings.save(); } catch { /* Einstellung bleibt */ } cc.writeDesktop(false); },
  } : null;
  const r = cleanupConnections({ projects, codeFile: path.join(os.homedir(), '.claude.json'), desktop });
  host.log(`uninstall: ${r.files.length} file(s) cleaned, desktop ${r.desktop ? 'disconnected' : 'unchanged'}, code ${r.code ? 'disconnected' : 'unchanged'}${r.failed.length ? `, ${r.failed.length} failed` : ''}`);
  return r;
}

module.exports = { activate, deactivate, uninstall, createBudget, cleanupConnections, stripSection, dropMcp };
