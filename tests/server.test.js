'use strict';
/* Server part: notification at 80 % and 100 % of the daily token limit – once per day each. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createBudget } = require('../server/index');

test('daily token limit: one message per step and day', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-claude-'));
  const sent = [];
  let total = 500; let now = new Date(2026, 9, 21, 12); let limit = 1000;
  const host = { ctx: { paths: { data: dir } }, t: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s), lang: () => 'en' };
  const check = createBudget(host, {
    usage: async () => ({ days: [{ date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, total }] }),
    send: async (title, text, o) => { sent.push({ title, text, o }); },
    settings: () => ({ dailyTokens: limit }),
    now: () => now,
  });
  await check();
  assert.strictEqual(sent.length, 0, 'below 80 %');
  total = 820; await check(); await check();
  assert.strictEqual(sent.length, 1);
  assert.match(sent[0].title, /80 %/);
  assert.strictEqual(sent[0].o.kind, 'warn');
  total = 1200; await check(); await check();
  assert.strictEqual(sent.length, 2);
  assert.match(sent[1].title, /reached/);
  assert.match(sent[1].text, /1,200 of 1,000/);
  now = new Date(2026, 9, 22, 12); total = 1500; await check();
  assert.strictEqual(sent.length, 3, 'next day: straight to "reached", 80 % is skipped');
  limit = 0; total = 99999; await check();
  assert.strictEqual(sent.length, 3, 'no limit → no message');
});

// Aufräumen beim restlosen Entfernen – nur mit Testordnern, nie mit dem echten ~/.claude oder Claude Desktop
test('cleanup: removes only the marked Hostwerk sections and the MCP entry, keeps the rest (with .bak)', () => {
  const { cleanupConnections, stripSection, dropMcp } = require('../server/index');
  assert.deepStrictEqual(stripSection('kein Abschnitt'), { text: 'kein Abschnitt', changed: false, empty: false });
  const s = stripSection('# Eigenes\n\nText\n\n<!-- hostwerk:start -->\nvon Hostwerk\n<!-- hostwerk:end -->\n\n## Danach\n');
  assert.ok(s.changed && !s.empty); assert.strictEqual(s.text, '# Eigenes\n\nText\n\n## Danach\n');
  assert.ok(stripSection('<!-- hostwerk:start -->\nx\n<!-- hostwerk:end -->\n').empty);
  assert.ok(stripSection('---\ndescription: Gedankennetz aus Hostwerk\nalwaysApply: true\n---\n<!-- hostwerk:start -->\nx\n<!-- hostwerk:end -->\n').empty, 'cursor rule with only its head is empty');
  assert.strictEqual(dropMcp('{"mcpServers":{"other":{}}}'), null); assert.strictEqual(dropMcp('kaputt'), null);
  assert.deepStrictEqual(JSON.parse(dropMcp('{"a":1,"mcpServers":{"hostwerk":{"command":"node"},"other":{}}}')), { a: 1, mcpServers: { other: {} } });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-claude-clean-'));
  const proj = path.join(tmp, 'projekt'); fs.mkdirSync(path.join(proj, '.cursor', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(proj, 'CLAUDE.md'), '# Mein Projekt\n\n<!-- hostwerk:start -->\nGedächtnis\n<!-- hostwerk:end -->\n');
  fs.writeFileSync(path.join(proj, 'AGENTS.md'), '<!-- hostwerk:start -->\nnur Hostwerk\n<!-- hostwerk:end -->\n');
  fs.writeFileSync(path.join(proj, 'GEMINI.md'), '# ohne Abschnitt\n');
  fs.writeFileSync(path.join(proj, '.cursor', 'rules', 'hostwerk.mdc'), '---\nalwaysApply: true\n---\n<!-- hostwerk:start -->\nx\n<!-- hostwerk:end -->\n');
  const codeFile = path.join(tmp, 'claude.json'); fs.writeFileSync(codeFile, JSON.stringify({ projects: {}, mcpServers: { hostwerk: { command: 'node' } } }));
  let desktopOn = true;
  const r = cleanupConnections({ projects: [proj, path.join(tmp, 'gibt-es-nicht')], codeFile, desktop: { connected: () => desktopOn, off: () => { desktopOn = false; } } });
  assert.strictEqual(fs.readFileSync(path.join(proj, 'CLAUDE.md'), 'utf8'), '# Mein Projekt\n');
  assert.ok(fs.existsSync(path.join(proj, 'CLAUDE.md.bak')));
  assert.ok(!fs.existsSync(path.join(proj, 'AGENTS.md')), 'file with only the Hostwerk section is removed');
  assert.ok(!fs.existsSync(path.join(proj, '.cursor', 'rules', 'hostwerk.mdc')));
  assert.strictEqual(fs.readFileSync(path.join(proj, 'GEMINI.md'), 'utf8'), '# ohne Abschnitt\n', 'untouched');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(codeFile, 'utf8')), { projects: {}, mcpServers: {} });
  assert.ok(r.code && r.desktop && !desktopOn && r.failed.length === 0 && r.files.length === 4);
  // zweiter Lauf: nichts mehr zu tun
  const again = cleanupConnections({ projects: [proj], codeFile, desktop: { connected: () => false, off: () => { throw new Error('nie'); } } });
  assert.deepStrictEqual([again.files.length, again.code, again.desktop], [0, false, false]);
});

test('uninstall hook: only with "remove completely" (purge), otherwise everything stays connected', async () => {
  const { uninstall } = require('../server/index');
  const calls = [];
  const host = { log: () => {}, ctx: { paths: { data: os.tmpdir() }, devtools: { list: () => [] }, settings: { get: () => ({ general: {} }), save: () => calls.push('save') }, claudeCode: { desktopConnected: () => true, writeDesktop: (on) => calls.push(`desktop:${on}`) } } };
  assert.deepStrictEqual(await uninstall(host, { purge: false }), { ran: false });
  assert.deepStrictEqual(calls, []);
  // mit purge: Claude Code-Datei im Test nicht anfassen – os.homedir() auf einen Testordner umbiegen
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-claude-home-'));
  const orig = os.homedir; os.homedir = () => home;
  try { const r = await uninstall(host, { purge: true }); assert.ok(r.desktop); } finally { os.homedir = orig; }
  assert.deepStrictEqual(calls, ['save', 'desktop:false']);
});
