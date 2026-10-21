const test = require('node:test');
const assert = require('node:assert');
const CL = require('../page/lib.js');

test('Startbefehl: ohne Auftrag nur „claude“, mit Auftrag sicher in Anführungszeichen', () => {
  assert.strictEqual(CL.startCommand(''), 'claude');
  assert.strictEqual(CL.startCommand('Baue "X"\nund Y'), 'claude "Baue \'X\' und Y"');
  assert.ok(CL.startCommand('Fix', { connected: true }).includes('gedankennetz_lesen'));
  assert.ok(CL.startCommand('Fix', { connected: true, lang: 'en' }).includes('read what I decided'));
});

test('Startbefehl für jede KI: Codex mit Auftrag als Argument, Gemini CLI mit -i, Unbekanntes → Claude Code', () => {
  assert.deepStrictEqual(CL.AGENTS.map((a) => a.id), ['claude', 'codex', 'gemini']);
  assert.strictEqual(CL.startCommand('', { agent: 'codex' }), 'codex');
  assert.strictEqual(CL.startCommand('Fix it', { agent: 'codex' }), 'codex "Fix it"');
  assert.strictEqual(CL.startCommand('Fix it', { agent: 'gemini' }), 'gemini -i "Fix it"');
  assert.ok(CL.startCommand('Fix', { agent: 'gemini', connected: true }).includes('gedankennetz_lesen'));
  assert.strictEqual(CL.startCommand('', { agent: 'gibt-es-nicht' }), 'claude');
});

test('Tipps: Claude-eigene sind gekennzeichnet, allgemeine nennen Claude nicht als einzige KI', () => {
  assert.ok(CL.TIPS.some((x) => x.only === 'claude') && CL.TIPS.some((x) => !x.only));
  for (const x of CL.TIPS.filter((y) => !y.only)) {
    for (const l of ['de', 'en']) assert.ok(!/\bClaude\b/.test(x[l][1].replace(/Claude Code/g, '')), `${x.id}/${l} nennt nur Claude`);
  }
});

test('Verbrauch: Summen, Schnitt und Trend', () => {
  const days = [{ total: 100, input: 50, output: 10, cacheRead: 40 }, { total: 100 }, { total: 50 }, { total: 50 }];
  const s = CL.usageSummary(days);
  assert.strictEqual(s.total, 300); assert.strictEqual(s.max, 100); assert.strictEqual(s.avg, 75); assert.strictEqual(s.trend, -50);
  assert.deepStrictEqual(CL.usageSummary([]).trend, null);
});

test('Jeder Tipp hat Deutsch und Englisch und eine bekannte Kategorie', () => {
  const cats = new Set(CL.CATS.map((c) => c.id));
  const ids = new Set();
  for (const x of CL.TIPS) {
    assert.ok(cats.has(x.cat), x.id); assert.ok(!ids.has(x.id), `doppelt: ${x.id}`); ids.add(x.id);
    for (const l of ['de', 'en']) { assert.strictEqual(x[l].length, 2, `${x.id}/${l}`); assert.ok(x[l][0] && x[l][1].length > 20, `${x.id}/${l}`); }
  }
  for (const x of CL.TASKS) for (const l of ['de', 'en']) assert.strictEqual(x[l].length, 2);
});

test('Tipps filtern nach Bereich und Suchtext (auch im Befehl)', () => {
  assert.ok(CL.filterTips(CL.TIPS, { cat: 'keys' }).every((x) => x.cat === 'keys'));
  assert.ok(CL.filterTips(CL.TIPS, { q: '/compact' }).some((x) => x.id === 'compact'));
  assert.ok(CL.filterTips(CL.TIPS, { q: 'subagents', lang: 'en' }).some((x) => x.id === 'agents'));
  assert.strictEqual(CL.filterTips(CL.TIPS, { q: 'gibtesnicht123' }).length, 0);
});

test('Symbole sind reines SVG ohne Skript', () => {
  for (const [k, v] of Object.entries(CL.ICON)) assert.ok(!/script|on\w+=/i.test(v), k);
  assert.ok(CL.icon('play').startsWith('<svg'));
});

test('eigene Vorlagen: säubern, teilen, einlesen', () => {
  const clean = CL.cleanTemplates([{ title: '  Review  ', text: 'Prüfe den PR' }, { title: '', text: 'x' }, { title: 'x'.repeat(60), text: 'y' }, null]);
  assert.strictEqual(clean.length, 2);
  assert.strictEqual(clean[0].title, 'Review');
  assert.strictEqual(clean[1].title.length, 40);
  assert.ok(/^t[a-z0-9]+$/.test(clean[0].id), 'stable id');
  assert.strictEqual(CL.cleanTemplates([{ title: 'Review', text: 'Prüfe den PR' }])[0].id, clean[0].id, 'same template → same id');
  const shared = CL.exportTemplates(clean);
  assert.deepStrictEqual(CL.importTemplates(shared).map((x) => x.title), ['Review', 'x'.repeat(40)]);
  assert.deepStrictEqual(CL.importTemplates('kein JSON'), []);
  assert.strictEqual(CL.importTemplates('[{"title":"A","text":"B"}]').length, 1, 'plain list works too');
});

test('Token-Tagesgrenze: heutiger Tag, Stufen 80 % und 100 %', () => {
  const now = new Date(2026, 9, 21, 15);
  const days = [{ date: '2026-10-20', total: 999999 }, { date: '2026-10-21', total: 850 }];
  assert.deepStrictEqual(CL.budgetState(days, 1000, now), { today: 850, pct: 85, level: 'warn' });
  assert.strictEqual(CL.budgetState(days, 800, now).level, 'over');
  assert.strictEqual(CL.budgetState(days, 5000, now).level, 'ok');
  assert.strictEqual(CL.budgetState([{ date: '2026-10-20', total: 1 }], 1000, now).today, null, 'nothing measured today');
  assert.strictEqual(CL.budgetState(days, 0, now).level, 'none');
});

test('KI-Apps als Daten: jede mit Weg, Anleitung und Symbol; unbekannte → allgemeiner MCP-Weg; Claude ist eine von vielen', () => {
  const ids = CL.CLIENTS.map((c) => c.id);
  assert.ok(['claude-desktop', 'claude-code', 'codex', 'gemini', 'cursor', 'vscode', 'windsurf', 'lmstudio', 'continue', 'other'].every((x) => ids.includes(x)));
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const c of CL.CLIENTS) {
    assert.ok(['desktop', 'cli', 'file'].includes(c.how), c.id);
    assert.ok(/^https:\/\//.test(c.docs), `${c.id}: Anleitung`);
    assert.ok(CL.ICON[c.icon], `${c.id}: Symbol`);
    if (c.how === 'cli') assert.ok(CL.AGENTS.some((a) => a.id === c.agent), `${c.id}: Werkzeug`);
    if (c.how === 'file') assert.ok(['mcpServers', 'servers'].includes(c.format), `${c.id}: Schreibweise`);
  }
  assert.ok(CL.CLIENTS.filter((c) => /claude/.test(c.id)).length < CL.CLIENTS.length / 3);
  assert.strictEqual(CL.clientOf('gibt-es-nicht').id, 'other');
});

test('MCP-Einstellungen je App: Claude/Cursor-Schreibweise (mcpServers) und VS Code (servers, type stdio)', () => {
  const json = JSON.stringify({ mcpServers: { hostwerk: { command: 'C:\\Programme\\Hostwerk\\Hostwerk.exe', args: ['C:\\x\\hostwerk-mcp.js', 'cfg.json'], env: { ELECTRON_RUN_AS_NODE: '1' } } } });
  const cur = JSON.parse(CL.clientConfig('cursor', json));
  assert.deepStrictEqual(cur.mcpServers.hostwerk.args, ['C:\\x\\hostwerk-mcp.js', 'cfg.json']);
  assert.strictEqual(cur.mcpServers.hostwerk.env.ELECTRON_RUN_AS_NODE, '1');
  const vs = JSON.parse(CL.clientConfig('vscode', json));
  assert.strictEqual(vs.servers.hostwerk.type, 'stdio');
  assert.strictEqual(vs.servers.hostwerk.command, 'C:\\Programme\\Hostwerk\\Hostwerk.exe');
  const other = JSON.parse(CL.clientConfig('irgendwas', { command: 'node', args: [] }));
  assert.ok(other.mcpServers.hostwerk && !other.mcpServers.hostwerk.env);
  assert.strictEqual(CL.clientConfig('cursor', 'kein json'), '');
});

test('Manifest: Seite steckt im KI-Helfer (ganze Seite als Reiter), kein eigener Eintrag in der Seitenleiste, Texte neutral', () => {
  const m = require('../manifest.json');
  const tab = m.contributes.tabs.find((x) => x.page);
  assert.ok(tab && tab.on === 'area:ai' && tab.file === m.page.file && tab.id === 'anbindung');
  assert.strictEqual(m.page.nav, false);
  for (const l of ['de', 'en']) {
    assert.ok(!/Claude/.test(m.name[l]) && !/Claude/.test(m.page.title[l]));
    for (const t of m.page.tabs) assert.ok(!/Claude/.test(t.title[l]), `Reiter ${t.id}/${l}`);
    assert.ok(/Cursor/.test(m.description[l]) && /MCP/.test(m.description[l]));
  }
  const de = require('../locales/de.json'); const en = require('../locales/en.json');
  assert.deepStrictEqual(Object.keys(de).sort(), Object.keys(en).sort());
});
