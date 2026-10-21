const test = require('node:test');
const assert = require('node:assert');
const CL = require('../page/lib.js');

test('Startbefehl: ohne Auftrag nur „claude“, mit Auftrag sicher in Anführungszeichen', () => {
  assert.strictEqual(CL.startCommand(''), 'claude');
  assert.strictEqual(CL.startCommand('Baue "X"\nund Y'), 'claude "Baue \'X\' und Y"');
  assert.ok(CL.startCommand('Fix', { connected: true }).includes('gedankennetz_lesen'));
  assert.ok(CL.startCommand('Fix', { connected: true, lang: 'en' }).includes('read what I decided'));
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
